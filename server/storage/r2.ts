import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type PrivateObjectInput = {
  objectKey: string;
  body: Uint8Array;
  contentType: string;
};

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

let r2Client: S3Client | null = null;

function getR2Client() {
  if (r2Client) return r2Client;
  const config = getR2Config();
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return r2Client;
}

export function privateObjectReference(objectKey: string) {
  return `r2://${getR2Config().bucket}/${objectKey}`;
}

export async function putPrivateObject(input: PrivateObjectInput) {
  const config = getR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "private, max-age=3600",
    }),
  );
}

export async function getSignedObjectUrl(objectKey: string) {
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

export async function deletePrivateObject(objectKey: string) {
  const config = getR2Config();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
}