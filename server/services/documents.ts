import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { documents, repairCases } from "../db/schema.js";
import {
  deletePrivateObject,
  getSignedObjectUrl,
  privateObjectReference,
  putPrivateObject,
} from "../storage/r2.js";

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export const documentReviewSchema = z.object({
  status: z.enum(["uploaded", "approved", "rejected"]),
  reviewNotes: z.string().trim().max(2_000).nullable().optional(),
});

function extensionForDocument(filename: string, mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension?.replace(/[^a-z0-9]/g, "") || "bin";
}

function storedObjectKey(document: { objectKey: string | null; fileUrl: string | null }) {
  if (document.objectKey) return document.objectKey;
  if (!document.fileUrl?.startsWith("r2://")) return null;
  const bucketEnd = document.fileUrl.indexOf("/", 5);
  return bucketEnd >= 0 ? document.fileUrl.slice(bucketEnd + 1) : null;
}

export async function caseExists(caseId: string) {
  const rows = await db
    .select({ id: repairCases.id, demoSessionId: repairCases.demoSessionId })
    .from(repairCases)
    .where(eq(repairCases.id, caseId))
    .limit(1);
  return rows[0] ?? null;
}

export async function presentDocument(document: typeof documents.$inferSelect) {
  const objectKey = storedObjectKey(document);
  let downloadUrl: string | null = null;
  if (objectKey) {
    try {
      downloadUrl = await getSignedObjectUrl(objectKey);
    } catch (error) {
      console.error("Unable to sign document URL", error);
    }
  } else if (document.fileUrl && !document.fileUrl.startsWith("r2://")) {
    downloadUrl = document.fileUrl;
  }
  return {
    id: document.id,
    repairCaseId: document.repairCaseId,
    documentType: document.documentType,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    bytes: document.bytes,
    status: document.status,
    reviewNotes: document.reviewNotes,
    downloadUrl,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function uploadCaseDocument(input: {
  caseId: string;
  documentType: string;
  filepath: string;
  originalFilename: string;
  mimeType: string;
}) {
  const documentType = input.documentType.trim();
  if (!documentType || documentType.length > 120) throw new Error("Document type is required");
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new Error("Only PDF, JPEG, PNG, and WebP documents are supported");
  }
  if (!(await caseExists(input.caseId))) throw new Error("Case not found");

  const body = await readFile(input.filepath);
  const objectKey = `homefix/cases/${input.caseId}/documents/${randomUUID()}.${extensionForDocument(input.originalFilename, input.mimeType)}`;
  await putPrivateObject({ objectKey, body, contentType: input.mimeType });

  try {
    const existingRows = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.repairCaseId, input.caseId), eq(documents.documentType, documentType)),
      )
      .limit(1);
    const existing = existingRows[0];
    const values = {
      fileUrl: privateObjectReference(objectKey),
      objectKey,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      bytes: body.byteLength,
      status: "uploaded",
      reviewNotes: null,
      reviewedAt: null,
      updatedAt: new Date(),
    };
    const rows = existing
      ? await db.update(documents).set(values).where(eq(documents.id, existing.id)).returning()
      : await db
          .insert(documents)
          .values({ repairCaseId: input.caseId, documentType, ...values })
          .returning();
    const saved = rows[0];
    if (!saved) throw new Error("Document could not be saved");

    const previousObjectKey = existing ? storedObjectKey(existing) : null;
    if (previousObjectKey && previousObjectKey !== objectKey) {
      await deletePrivateObject(previousObjectKey).catch((error) =>
        console.error("Unable to delete replaced document object", error),
      );
    }
    return presentDocument(saved);
  } catch (error) {
    await deletePrivateObject(objectKey);
    throw error;
  }
}

export async function rollbackCaseDocument(documentId: string) {
  const rows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  const document = rows[0];
  if (!document) return;
  const objectKey = storedObjectKey(document);
  if (objectKey) await deletePrivateObject(objectKey);
  await db.delete(documents).where(eq(documents.id, documentId));
}

export async function reviewCaseDocument(
  caseId: string,
  documentId: string,
  input: unknown,
) {
  const review = documentReviewSchema.parse(input);
  const rows = await db
    .update(documents)
    .set({
      status: review.status,
      reviewNotes: review.reviewNotes ?? null,
      reviewedAt: review.status === "uploaded" ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(documents.id, documentId), eq(documents.repairCaseId, caseId)))
    .returning();
  const document = rows[0];
  if (!document) throw new Error("Document not found");
  return presentDocument(document);
}