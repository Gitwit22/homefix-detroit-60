import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { repairNeeds, repairPhotos } from "../db/schema.js";
import {
  deletePrivateObject,
  getSignedObjectUrl,
  privateObjectReference,
  putPrivateObject,
} from "../storage/r2.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function signedPhotoUrl(objectKey: string) {
  return getSignedObjectUrl(objectKey);
}

export async function deleteRepairPhotoObject(objectKey: string) {
  await deletePrivateObject(objectKey);
}

export async function rollbackRepairPhoto(photoId: string) {
  const rows = await db
    .select({ publicId: repairPhotos.publicId, imageUrl: repairPhotos.imageUrl })
    .from(repairPhotos)
    .where(eq(repairPhotos.id, photoId))
    .limit(1);
  const photo = rows[0];
  if (!photo) return;
  if (photo.publicId && photo.imageUrl.startsWith("r2://")) {
    await deleteRepairPhotoObject(photo.publicId);
  }
  await db.delete(repairPhotos).where(eq(repairPhotos.id, photoId));
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadRepairPhoto(input: {
  repairNeedId: string;
  filepath: string;
  originalFilename: string;
  mimeType: string;
  evidenceStage?: "resident_report" | "inspection" | "completion";
}) {
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new Error("Only JPEG, PNG, and WebP repair photos are supported");
  }

  const needRows = await db
    .select({ id: repairNeeds.id, repairCaseId: repairNeeds.repairCaseId })
    .from(repairNeeds)
    .where(eq(repairNeeds.id, input.repairNeedId))
    .limit(1);
  const need = needRows[0];
  if (!need) throw new Error("Repair need not found");

  const body = await readFile(input.filepath);
  const objectKey = `homefix/cases/${need.repairCaseId}/repairs/${need.id}/photos/${randomUUID()}.${extensionForMimeType(input.mimeType)}`;
  await putPrivateObject({ objectKey, body, contentType: input.mimeType });

  try {
    const rows = await db
      .insert(repairPhotos)
      .values({
        repairNeedId: need.id,
        evidenceStage: input.evidenceStage ?? "resident_report",
        imageUrl: privateObjectReference(objectKey),
        publicId: objectKey,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        bytes: body.byteLength,
        width: null,
        height: null,
      })
      .returning();
    const photo = rows[0];
    if (!photo) throw new Error("Repair photo could not be saved");

    return {
      id: photo.id,
      repairNeedId: photo.repairNeedId,
      originalFilename: photo.originalFilename,
      mimeType: photo.mimeType,
      bytes: photo.bytes,
      width: photo.width,
      height: photo.height,
      imageUrl: await signedPhotoUrl(objectKey),
    };
  } catch (error) {
    await deletePrivateObject(objectKey);
    throw error;
  }
}
