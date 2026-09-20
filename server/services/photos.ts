import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { repairNeeds, repairPhotos } from "../db/schema.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 is not configured");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2Client() {
  const config = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function signedPhotoUrl(objectKey: string) {
  const config = getR2Config();
  const requestedTtl = Number(process.env.R2_SIGNED_URL_TTL_SECONDS ?? 3_600);
  const expiresIn = Number.isFinite(requestedTtl)
    ? Math.min(604_800, Math.max(60, Math.round(requestedTtl)))
    : 3_600;
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    { expiresIn },
  );
}

export async function deleteRepairPhotoObject(objectKey: string) {
  const config = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
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

  const config = getR2Config();
  const client = getR2Client();
  const body = await readFile(input.filepath);
  const objectKey = `homefix/${need.repairCaseId}/${need.id}/${randomUUID()}.${extensionForMimeType(input.mimeType)}`;
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: input.mimeType,
      CacheControl: "private, max-age=3600",
    }),
  );

  try {
    const rows = await db
      .insert(repairPhotos)
      .values({
        repairNeedId: need.id,
        imageUrl: `r2://${config.bucket}/${objectKey}`,
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
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
    throw error;
  }
}
