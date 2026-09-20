import { eq, inArray, ne } from "drizzle-orm";

import { ensureOverflowDemoData } from "../demo/overflowDemo.js";
import { db } from "../db/index.js";
import {
  demoControl,
  demoSessions,
  homes,
  repairCases,
  repairNeeds,
  repairPhotos,
  residents,
} from "../db/schema.js";
import { deleteRepairPhotoObject } from "./photos.js";

const partnerDemoControlId = "partner";

export async function getPartnerDemoControl() {
  const rows = await db
    .insert(demoControl)
    .values({ id: partnerDemoControlId })
    .onConflictDoNothing()
    .returning({ baselineEnabled: demoControl.baselineEnabled });
  if (rows[0]) return rows[0];

  const existing = await db
    .select({ baselineEnabled: demoControl.baselineEnabled })
    .from(demoControl)
    .where(eq(demoControl.id, partnerDemoControlId))
    .limit(1);
  return existing[0] ?? { baselineEnabled: true };
}

async function setPartnerBaselineEnabled(baselineEnabled: boolean) {
  await db
    .insert(demoControl)
    .values({ id: partnerDemoControlId, baselineEnabled })
    .onConflictDoUpdate({
      target: demoControl.id,
      set: { baselineEnabled, updatedAt: new Date() },
    });
}

export async function resetPartnerDemoData() {
  await setPartnerBaselineEnabled(false);
  const mockCases = await db
    .select({
      caseId: repairCases.id,
      homeId: repairCases.homeId,
      residentId: homes.residentId,
    })
    .from(repairCases)
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .where(ne(repairCases.provenance, "resident"));

  if (mockCases.length === 0) {
    await db.delete(demoSessions);
    return { baselineEnabled: false, deletedCases: 0, deletedPhotos: 0 };
  }

  const caseIds = mockCases.map((item) => item.caseId);
  const needs = await db
    .select({ id: repairNeeds.id })
    .from(repairNeeds)
    .where(inArray(repairNeeds.repairCaseId, caseIds));
  const photos =
    needs.length === 0
      ? []
      : await db
          .select({ imageUrl: repairPhotos.imageUrl, publicId: repairPhotos.publicId })
          .from(repairPhotos)
          .where(inArray(repairPhotos.repairNeedId, needs.map((need) => need.id)));
  const objectKeys = photos.flatMap((photo) =>
    photo.publicId && photo.imageUrl.startsWith("r2://") ? [photo.publicId] : [],
  );
  for (const objectKey of objectKeys) await deleteRepairPhotoObject(objectKey);

  const homeIds = [...new Set(mockCases.map((item) => item.homeId))];
  const residentIds = [...new Set(mockCases.map((item) => item.residentId))];
  await db.transaction(async (transaction) => {
    await transaction.delete(repairCases).where(inArray(repairCases.id, caseIds));
    await transaction.delete(homes).where(inArray(homes.id, homeIds));
    await transaction.delete(residents).where(inArray(residents.id, residentIds));
    await transaction.delete(demoSessions);
  });

  return {
    baselineEnabled: false,
    deletedCases: caseIds.length,
    deletedPhotos: objectKeys.length,
  };
}

export async function restorePartnerDemoData() {
  await ensureOverflowDemoData();
  await setPartnerBaselineEnabled(true);
  return { baselineEnabled: true };
}