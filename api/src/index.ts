import "dotenv/config";

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import formidable from "formidable";

import { intakeSchema, createIntakeCase } from "../../server/services/intake.js";
import { getCaseAggregate } from "../../server/services/case.js";
import { processCase, processRepair } from "../../server/services/processRepair.js";
import { uploadRepairPhoto } from "../../server/services/photos.js";
import { getProgramDetail } from "../../server/services/program.js";
import { calculateCoveragePlan, getCoveragePlan } from "../../server/services/coverage.js";
import {
  DEFAULT_PARTNER_DEMO_SEED,
  PARTNER_DEMO_GENERATED_AT,
  generateSyntheticPartnerDataset,
  syntheticProgramCapacities,
} from "../../server/demo/partnerDataset.js";
import {
  calculatePartnerAnalytics,
  getPartnerCaseDetail,
} from "../../server/services/partnerAnalytics.js";

const port = parsePort(process.env.PORT);
const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);
const maxBodyBytes = 100_000;
const partnerDemoSeed = Number.parseInt(
  process.env.HOMEFIX_DEMO_SEED ?? String(DEFAULT_PARTNER_DEMO_SEED),
  10,
);
const partnerFacts = generateSyntheticPartnerDataset(
  Number.isFinite(partnerDemoSeed) ? partnerDemoSeed : DEFAULT_PARTNER_DEMO_SEED,
);
const partnerAnalytics = calculatePartnerAnalytics(
  partnerFacts,
  syntheticProgramCapacities,
  Number.isFinite(partnerDemoSeed) ? partnerDemoSeed : DEFAULT_PARTNER_DEMO_SEED,
  PARTNER_DEMO_GENERATED_AT,
);

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 4000);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return parsed;
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  const origins = (value ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin");
  }
  return new Set(origins);
}

function applyCors(request: IncomingMessage, response: ServerResponse): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (!allowedOrigins.has(origin)) return false;

  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("vary", "Origin");
  return true;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readPhotoFiles(request: IncomingMessage) {
  const form = formidable({
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024,
    allowEmptyFiles: false,
    filter: ({ mimetype }) => ["image/jpeg", "image/png", "image/webp"].includes(mimetype ?? ""),
  });
  const [, files] = await form.parse(request);
  return Object.values(files).flat().filter((file) => file != null);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) {
      throw new RequestError(413, "Request body is too large");
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Request body must be valid JSON");
  }
}

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const method = (request.method ?? "").toUpperCase();

  if (!applyCors(request, response)) {
    sendJson(response, 403, { error: "Origin is not allowed" });
    return;
  }

  if (method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/health") {
    sendJson(response, 200, { status: "ok", service: "homefix-api" });
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/partner-analytics") {
    sendJson(response, 200, partnerAnalytics);
    return;
  }

  const partnerCaseMatch = requestUrl.pathname.match(/^\/api\/v1\/partner-cases\/([^/]+)$/);
  if (method === "GET" && partnerCaseMatch) {
    const caseId = decodeURIComponent(partnerCaseMatch[1]!);
    const partnerCase = getPartnerCaseDetail(partnerFacts, caseId);
    if (!partnerCase) {
      sendJson(response, 404, { error: "Synthetic partner case not found" });
      return;
    }
    sendJson(response, 200, partnerCase);
    return;
  }

  const programMatch = requestUrl.pathname.match(/^\/api\/v1\/programs\/([^/]+)$/);
  if (method === "GET" && programMatch) {
    try {
      const program = await getProgramDetail(decodeURIComponent(programMatch[1]!));
      if (!program) {
        sendJson(response, 404, { error: "Program not found" });
        return;
      }
      sendJson(response, 200, program);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load program" });
    }
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/v1/intakes") {
    try {
      const payload = intakeSchema.parse(await readJson(request));
      const result = await createIntakeCase(payload);
      sendJson(response, 201, result);
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
      if (error instanceof Error && error.name === "ZodError") {
        sendJson(response, 400, { error: "Invalid intake submission" });
        return;
      }
      console.error(error);
      sendJson(response, 500, { error: "Unable to save intake submission" });
    }
    return;
  }

  const repairPhotoMatch = requestUrl.pathname.match(
    /^\/api\/v1\/repairs\/([0-9a-f-]+)\/photos$/i,
  );
  if (method === "POST" && repairPhotoMatch) {
    try {
      const repairNeedId = repairPhotoMatch[1]!;
      const files = await readPhotoFiles(request);
      if (files.length === 0) {
        sendJson(response, 400, { error: "At least one valid image is required" });
        return;
      }
      const photos = [];
      for (const file of files) {
        photos.push(
          await uploadRepairPhoto({
            repairNeedId,
            filepath: file.filepath,
            originalFilename: file.originalFilename ?? "repair-photo",
            mimeType: file.mimetype ?? "application/octet-stream",
          }),
        );
      }
      sendJson(response, 201, { photos });
    } catch (error) {
      console.error(error);
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to upload repair photos",
      });
    }
    return;
  }

  const caseMatch = requestUrl.pathname.match(/^\/api\/v1\/cases\/([0-9a-f-]+)$/i);
  if (method === "GET" && caseMatch) {
    try {
      const caseId = caseMatch[1]!;
      const payload = await getCaseAggregate(caseId);
      if (!payload) {
        sendJson(response, 404, { error: "Case not found" });
        return;
      }
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load case" });
    }
    return;
  }

  const coverageMatch = requestUrl.pathname.match(/^\/api\/v1\/cases\/([0-9a-f-]+)\/coverage$/i);
  if (method === "GET" && coverageMatch) {
    try {
      const caseId = coverageMatch[1]!;
      const existingCase = await getCaseAggregate(caseId);
      if (!existingCase) {
        sendJson(response, 404, { error: "Case not found" });
        return;
      }
      const payload = await getCoveragePlan(caseId);
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load coverage plan" });
    }
    return;
  }

  const processMatch = requestUrl.pathname.match(/^\/api\/v1\/repairs\/([0-9a-f-]+)\/process$/i);
  if (method === "POST" && processMatch) {
    try {
      const repairNeedId = processMatch[1]!;
      const payload = await processRepair(repairNeedId);
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to process repair" });
    }
    return;
  }

  const processCaseMatch = requestUrl.pathname.match(/^\/api\/v1\/cases\/([0-9a-f-]+)\/process$/i);
  if (method === "POST" && processCaseMatch) {
    try {
      const caseId = processCaseMatch[1]!;
      const existingCase = await getCaseAggregate(caseId);
      if (!existingCase) {
        sendJson(response, 404, { error: "Case not found" });
        return;
      }
      const payload = await processCase(caseId);
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to process case" });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`HomeFix API listening on port ${port}`);
});

function shutdown(): void {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
