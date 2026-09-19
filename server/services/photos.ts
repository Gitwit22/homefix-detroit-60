import { v2 as cloudinary } from "cloudinary";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { repairNeeds, repairPhotos } from "../db/schema.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export function signedPhotoUrl(publicId: string, version?: number | null) {
  ensureCloudinaryConfigured();
  return cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: "image",
    secure: true,
    sign_url: true,
    version: version ?? undefined,
  });
}

export async function uploadRepairPhoto(input: {
  repairNeedId: string;
  filepath: string;
  originalFilename: string;
  mimeType: string;
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

  ensureCloudinaryConfigured();
  const uploaded = await cloudinary.uploader.upload(input.filepath, {
    resource_type: "image",
    type: "authenticated",
    folder: `homefix/${need.repairCaseId}/${need.id}`,
    use_filename: false,
    unique_filename: true,
  });

  try {
    const rows = await db
      .insert(repairPhotos)
      .values({
        repairNeedId: need.id,
        imageUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        bytes: uploaded.bytes,
        width: uploaded.width,
        height: uploaded.height,
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
      imageUrl: signedPhotoUrl(uploaded.public_id, uploaded.version),
    };
  } catch (error) {
    await cloudinary.uploader.destroy(uploaded.public_id, {
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
    throw error;
  }
}
