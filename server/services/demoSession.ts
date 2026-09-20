import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  demoSessions,
  homes,
  repairCases,
  repairNeeds,
  repairPhotos,
  residents,
} from "../db/schema.js";
import { deleteRepairPhotoObject } from "./photos.js";

const scrypt = promisify(scryptCallback);

export const demoSessionSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  pin: z.string().regex(/^\d{4}$/),
});

export const claimCaseSchema = z.object({ caseId: z.string().uuid() });

async function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(pin, salt, 32)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPin(pin: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function openDemoSession(displayName: string, pin: string) {
  const normalizedName = displayName.trim().toLocaleLowerCase("en-US");
  const existingRows = await db
    .select()
    .from(demoSessions)
    .where(eq(demoSessions.normalizedName, normalizedName))
    .limit(1);
  const existing = existingRows[0];
  if (existing) {
    if (!existing.pinHash || !(await verifyPin(pin, existing.pinHash))) {
      throw new Error("INVALID_SESSION_CREDENTIALS");
    }
    await db
      .update(demoSessions)
      .set({ displayName: displayName.trim(), updatedAt: new Date() })
      .where(eq(demoSessions.id, existing.id));
    return { token: existing.id, displayName: displayName.trim() };
  }

  const rows = await db
    .insert(demoSessions)
    .values({ displayName: displayName.trim(), normalizedName, pinHash: await hashPin(pin) })
    .returning({ id: demoSessions.id, displayName: demoSessions.displayName });
  const session = rows[0];
  if (!session) throw new Error("Demo session could not be opened");
  return { token: session.id, displayName: session.displayName };
}

export async function getDemoSession(token: string) {
  if (!z.string().uuid().safeParse(token).success) return null;
  const rows = await db
    .select({ id: demoSessions.id, displayName: demoSessions.displayName })
    .from(demoSessions)
    .where(eq(demoSessions.id, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function listDemoSessionCases(sessionId: string) {
  return db
    .select({
      caseId: repairCases.id,
      caseNumber: repairCases.caseNumber,
      status: repairCases.status,
      streetAddress: homes.streetAddress,
      createdAt: repairCases.createdAt,
    })
    .from(repairCases)
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .where(eq(repairCases.demoSessionId, sessionId))
    .orderBy(desc(repairCases.createdAt));
}

export async function claimDemoSessionCase(sessionId: string, caseId: string) {
  const cases = await db
    .select({ id: repairCases.id, demoSessionId: repairCases.demoSessionId })
    .from(repairCases)
    .where(eq(repairCases.id, caseId))
    .limit(1);
  const foundCase = cases[0];
  if (!foundCase) throw new Error("CASE_NOT_FOUND");
  if (foundCase.demoSessionId && foundCase.demoSessionId !== sessionId) {
    throw new Error("CASE_ALREADY_CLAIMED");
  }
  if (!foundCase.demoSessionId) {
    await db
      .update(repairCases)
      .set({ demoSessionId: sessionId, updatedAt: new Date() })
      .where(eq(repairCases.id, caseId));
  }
  return { caseId, claimed: true as const };
}

export async function wipeDemoSessionData(sessionId: string) {
  const ownedCases = await db
    .select({
      caseId: repairCases.id,
      homeId: homes.id,
      residentId: homes.residentId,
    })
    .from(repairCases)
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .where(eq(repairCases.demoSessionId, sessionId));

  if (ownedCases.length === 0) return { deletedCases: 0, deletedPhotos: 0 };

  const caseIds = ownedCases.map((item) => item.caseId);
  const needs = await db
    .select({ id: repairNeeds.id })
    .from(repairNeeds)
    .where(inArray(repairNeeds.repairCaseId, caseIds));
  const photos =
    needs.length > 0
      ? await db
          .select({ imageUrl: repairPhotos.imageUrl, publicId: repairPhotos.publicId })
          .from(repairPhotos)
          .where(
            inArray(
              repairPhotos.repairNeedId,
              needs.map((need) => need.id),
            ),
          )
      : [];
  const objectKeys = photos.flatMap((photo) =>
    photo.publicId && photo.imageUrl.startsWith("r2://") ? [photo.publicId] : [],
  );

  for (const objectKey of objectKeys) {
    await deleteRepairPhotoObject(objectKey);
  }

  const homeIds = [...new Set(ownedCases.map((item) => item.homeId))];
  const residentIds = [...new Set(ownedCases.map((item) => item.residentId))];
  await db.transaction(async (transaction) => {
    await transaction.delete(repairCases).where(inArray(repairCases.id, caseIds));
    await transaction.delete(homes).where(inArray(homes.id, homeIds));
    await transaction.delete(residents).where(inArray(residents.id, residentIds));
  });

  return { deletedCases: caseIds.length, deletedPhotos: objectKeys.length };
}
