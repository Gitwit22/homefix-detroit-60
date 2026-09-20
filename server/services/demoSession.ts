import { and, desc, eq, inArray } from "drizzle-orm";
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
import { DENISE_DEMO_SCENARIO } from "../demo/deniseScenario.js";
import { deleteRepairPhotoObject } from "./photos.js";

export const demoSessionSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export async function openDemoSession(displayName: string) {
  const normalizedName = displayName.trim().toLocaleLowerCase("en-US");
  const rows = await db
    .insert(demoSessions)
    .values({ displayName: displayName.trim(), normalizedName })
    .onConflictDoUpdate({
      target: demoSessions.normalizedName,
      set: { displayName: displayName.trim(), updatedAt: new Date() },
    })
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
    .where(
      and(
        eq(repairCases.demoSessionId, sessionId),
        eq(repairCases.demoScenario, DENISE_DEMO_SCENARIO),
      ),
    )
    .orderBy(desc(repairCases.createdAt));
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
    .where(
      and(
        eq(repairCases.demoSessionId, sessionId),
        eq(repairCases.demoScenario, DENISE_DEMO_SCENARIO),
      ),
    );

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
