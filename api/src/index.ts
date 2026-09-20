import "dotenv/config";

import { rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import formidable from "formidable";

import { intakeSchema, createIntakeCase } from "../../server/services/intake.js";
import {
  claimCaseSchema,
  claimDemoSessionCase,
  demoSessionSchema,
  getDemoSession,
  listDemoSessionCases,
  openDemoSession,
  wipeDemoSessionData,
} from "../../server/services/demoSession.js";
import {
  ContractorAccessError,
  contractorRegistrationSchema,
  contractorSignInSchema,
  getContractorAccess,
  registerContractor,
  signInContractor,
} from "../../server/services/contractorAccess.js";
import { getCaseAggregate } from "../../server/services/case.js";
import {
  confirmInspection,
  listInspectionQueue,
  recordInspectionFindings,
  submitInspectionAvailability,
} from "../../server/services/inspection.js";
import { processCase, processRepair } from "../../server/services/processRepair.js";
import {
  getRepairCaseId,
  rollbackRepairPhoto,
  uploadRepairPhoto,
} from "../../server/services/photos.js";
import {
  caseExists,
  reviewCaseDocument,
  rollbackCaseDocument,
  uploadCaseDocument,
} from "../../server/services/documents.js";
import { getProgramDetail, listProgramCatalog } from "../../server/services/program.js";
import {
  getPublicOpportunity,
  listPublicOpportunities,
} from "../../server/services/opportunities.js";
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
  mergePartnerFacts,
} from "../../server/services/partnerAnalytics.js";
import { findExistingOverflowWorkOrderByCaseNumber } from "../../server/demo/overflowDemo.js";
import { loadPartnerFactsFromDatabase } from "../../server/services/partnerCaseData.js";
import {
  createOverflowJob,
  getOverflowJob,
  getWorkOrderBids,
  listOverflowJobs,
  submitBid,
} from "../../server/services/workOrders.js";
import {
  getOverflowDemoCaseConfig,
  overflowCapacityStatusLabels,
  overflowFundingStatusLabels,
  workOrderStatusLabels,
} from "../../server/domain/overflow.js";
import {
  createOverflowWorkOrder,
  createOverflowWorkOrderSchema,
  getOverflowWorkOrder,
  listOverflowCandidates,
  listOverflowWorkOrders,
  submitOverflowBid,
  submitOverflowBidSchema,
} from "../../server/services/overflow.js";
import { trainingOpportunitySchema } from "../../server/validation/triage.js";
import {
  getPartnerDemoControl,
  resetPartnerDemoData,
  restorePartnerDemoData,
} from "../../server/services/demoControl.js";
import { residentResourceForRequest } from "./accessPolicy.js";

const port = parsePort(process.env.PORT);
const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);
const maxBodyBytes = 100_000;
const demoMode = process.env.HOMEFIX_DEMO_MODE === "1";
const partnerDatabaseTimeoutMs = 5_000;
type PartnerDataSource = "live" | "demo" | "combined";

function parsePartnerDataSource(requestUrl: URL): PartnerDataSource {
  const source = requestUrl.searchParams.get("source");
  if (source === "live" || source === "demo") return source;
  return "combined";
}

async function withPartnerDatabaseDeadline<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Partner database request timed out")),
          partnerDatabaseTimeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function loadPartnerFacts(source: PartnerDataSource) {
  if (source === "demo") {
    return { facts: generateSyntheticPartnerDataset(), degraded: false };
  }

  if (source === "live") {
    return { facts: await loadPartnerFactsFromDatabase(), degraded: false };
  }

  try {
    const { baselineEnabled } = await withPartnerDatabaseDeadline(getPartnerDemoControl());
    const syntheticFacts = baselineEnabled ? generateSyntheticPartnerDataset() : [];
    const persistedFacts = await withPartnerDatabaseDeadline(loadPartnerFactsFromDatabase());
    return {
      facts: baselineEnabled ? mergePartnerFacts(syntheticFacts, persistedFacts) : persistedFacts,
      degraded: false,
    };
  } catch (error) {
    console.error(error);
    return { facts: generateSyntheticPartnerDataset(), degraded: true };
  }
}

async function withOverflowCaseState(caseId: string, source: PartnerDataSource) {
  const { facts: partnerFacts } = await loadPartnerFacts(source);
  const partnerCase = getPartnerCaseDetail(partnerFacts, caseId);
  if (!partnerCase) return null;

  if (partnerCase.caseId.startsWith("HF-DEMO-") || partnerCase.caseId === "HF-313-0842") {
    return {
      ...partnerCase,
      documents: [],
      inspectionPackage: null,
      overflow: { eligible: false, existingWorkOrder: null },
    };
  }

  const [existingWorkOrder, aggregate] = await Promise.all([
    findExistingOverflowWorkOrderByCaseNumber(partnerCase.caseNumber),
    getCaseAggregate(caseId),
  ]);
  const inspectionPackage = aggregate?.inspection
    ? {
        status: aggregate.inspection.status,
        availabilityWindows: aggregate.inspection.availabilityWindows,
        confirmedStart: aggregate.inspection.confirmedStart?.toISOString() ?? null,
        confirmedEnd: aggregate.inspection.confirmedEnd?.toISOString() ?? null,
        providerName: aggregate.inspection.providerName,
        providerPhone: aggregate.inspection.providerPhone,
        questions: aggregate.inspection.inspectionQuestions,
        needs: aggregate.repairNeeds.map((need) => {
          const assessment = aggregate.assessments.find((item) => item.repairNeedId === need.id);
          const finding = aggregate.inspectionFindings.find(
            (item) => item.repairNeedId === need.id,
          );
          return {
            repairNeedId: need.id,
            description: need.description,
            reportedCategory: need.category,
            urgency: need.urgency,
            photos: aggregate.photos
              .filter(
                (photo) =>
                  photo.repairNeedId === need.id && photo.evidenceStage === "resident_report",
              )
              .map((photo) => ({ id: photo.id, imageUrl: photo.imageUrl })),
            assessment: assessment
              ? {
                  summary: assessment.summary,
                  urgency: assessment.urgency,
                  confidence: assessment.confidence,
                  safetyFlags: Array.isArray(assessment.safetyFlags)
                    ? assessment.safetyFlags.filter(
                        (flag): flag is string => typeof flag === "string",
                      )
                    : [],
                  trainingOpportunity:
                    trainingOpportunitySchema.safeParse(assessment.trainingOpportunity).data ??
                    null,
                }
              : null,
            finding: finding
              ? {
                  confirmedCategory: finding.confirmedCategory,
                  urgency: finding.urgency,
                  condition: finding.condition,
                  notes: finding.notes,
                  verifiedScope: finding.verifiedScope,
                  estimatedCostCents: finding.estimatedCostCents,
                  trainingSuitability: finding.trainingSuitability,
                }
              : null,
          };
        }),
      }
    : null;

  return {
    ...partnerCase,
    resident: aggregate?.resident
      ? {
          name: `${aggregate.resident.firstName} ${aggregate.resident.lastName}`.trim(),
          phone: aggregate.resident.phone,
          email: aggregate.resident.email,
        }
      : null,
    assistant:
      aggregate?.contacts.find((contact) => contact.contactType === "assistant") ?? null,
    primaryContact: aggregate?.primaryContact ?? null,
    documents:
      aggregate?.documents.map((document) => ({
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      })) ?? [],
    inspectionPackage,
    overflow: {
      eligible: false,
      existingWorkOrder: existingWorkOrder
        ? {
            id: existingWorkOrder.id,
            workOrderNumber: existingWorkOrder.workOrderNumber,
            status: existingWorkOrder.status,
            statusLabel:
              workOrderStatusLabels[
                existingWorkOrder.status as keyof typeof workOrderStatusLabels
              ] ?? existingWorkOrder.status,
          }
        : null,
    },
  };
}

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
  const isDevelopmentLoopback =
    process.env.NODE_ENV !== "production" &&
    (() => {
      try {
        const hostname = new URL(origin).hostname;
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
      } catch {
        return false;
      }
    })();
  if (!allowedOrigins.has(origin) && !isDevelopmentLoopback) return false;

  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "content-type, x-homefix-demo-session, x-homefix-partner-session",
  );
  response.setHeader("vary", "Origin");
  return true;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function requireOperatorCode(payload: unknown) {
  const configuredCode = process.env.PARTNER_DEMO_OPERATOR_CODE;
  const suppliedCode =
    payload && typeof payload === "object" && "operatorCode" in payload
      ? (payload as { operatorCode?: unknown }).operatorCode
      : null;
  if (!configuredCode || typeof suppliedCode !== "string" || suppliedCode !== configuredCode) {
    throw new RequestError(403, "Operator code is invalid");
  }
}

async function readPhotoFiles(request: IncomingMessage) {
  const form = formidable({
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024,
    allowEmptyFiles: false,
    filter: ({ mimetype }) => ["image/jpeg", "image/png", "image/webp"].includes(mimetype ?? ""),
  });
  const [, files] = await form.parse(request);
  return Object.values(files)
    .flat()
    .filter((file) => file != null);
}

async function readDocumentFile(request: IncomingMessage) {
  const form = formidable({
    maxFiles: 1,
    maxFileSize: 15 * 1024 * 1024,
    allowEmptyFiles: false,
    filter: ({ mimetype }) =>
      ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mimetype ?? ""),
  });
  const [fields, files] = await form.parse(request);
  const documentTypeValue = fields["documentType"];
  const documentType = Array.isArray(documentTypeValue) ? documentTypeValue[0] : documentTypeValue;
  const file = Object.values(files)
    .flat()
    .find((candidate) => candidate != null);
  return { documentType: documentType ?? "", file };
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

async function requireDemoSession(request: IncomingMessage) {
  const token = request.headers["x-homefix-demo-session"];
  if (typeof token !== "string") throw new RequestError(401, "Demo session is required");
  const session = await getDemoSession(token);
  if (!session) throw new RequestError(401, "Demo session is invalid");
  return session;
}

async function requireContractorAccess(request: IncomingMessage) {
  const token = request.headers["x-homefix-partner-session"];
  if (typeof token !== "string") throw new RequestError(401, "Partner access is required");
  const account = await getContractorAccess(token);
  if (!account) throw new RequestError(401, "Partner session is invalid");
  return account;
}

export function isPartnerProtectedRequest(pathname: string, method: string) {
  if (
    pathname.startsWith("/api/v1/partner-demo-control") ||
    pathname === "/api/v1/partner-analytics" ||
    pathname === "/api/v1/partner-inspections" ||
    pathname.startsWith("/api/v1/partner-cases/") ||
    pathname.startsWith("/api/v1/overflow-jobs") ||
    pathname.startsWith("/api/v1/overflow/candidates") ||
    pathname.startsWith("/api/v1/overflow/work-orders")
  ) {
    return true;
  }

  return (
    method === "POST" &&
    /^\/api\/v1\/cases\/[0-9a-f-]+\/inspection\/(confirm|findings)$/i.test(pathname)
  );
}

async function requireResidentCaseAccess(request: IncomingMessage, caseId: string) {
  const foundCase = await caseExists(caseId);
  if (!foundCase) throw new RequestError(404, "Case not found");
  if (!foundCase.demoSessionId) return;
  const session = await requireDemoSession(request);
  if (session.id !== foundCase.demoSessionId) throw new RequestError(403, "Case access is denied");
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

  if (method === "POST" && requestUrl.pathname === "/api/v1/contractor-access/register") {
    try {
      const input = contractorRegistrationSchema.parse(await readJson(request));
      sendJson(response, 201, await registerContractor(input));
    } catch (error) {
      const status =
        error instanceof RequestError
          ? error.status
          : error instanceof ContractorAccessError && error.code === "ACCOUNT_EXISTS"
            ? 409
            : error instanceof Error && error.name === "ZodError"
              ? 400
              : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error:
          error instanceof RequestError
            ? error.message
            : status === 409
              ? "An account already exists for that business or contractor name. Sign in instead."
              : status === 400
                ? "Enter a business or contractor name, a four-digit code, and confirm the compliance acknowledgment."
                : "The contractor account could not be created. Please try again.",
      });
    }
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/v1/contractor-access/sign-in") {
    try {
      const input = contractorSignInSchema.parse(await readJson(request));
      sendJson(response, 200, await signInContractor(input.displayName, input.pin));
    } catch (error) {
      const status =
        error instanceof RequestError
          ? error.status
          : error instanceof ContractorAccessError && error.code === "INVALID_CREDENTIALS"
            ? 401
            : error instanceof Error && error.name === "ZodError"
              ? 400
              : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error:
          error instanceof RequestError
            ? error.message
            : status === 401
              ? "Business or contractor name and four-digit code do not match."
              : status === 400
                ? "Enter a business or contractor name and a four-digit code."
                : "Contractor sign-in failed. Please try again.",
      });
    }
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/contractor-access") {
    try {
      sendJson(response, 200, await requireContractorAccess(request));
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to verify contractor access",
      });
    }
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/opportunities") {
    try {
      sendJson(
        response,
        200,
        await listPublicOpportunities(Object.fromEntries(requestUrl.searchParams.entries())),
      );
    } catch (error) {
      const status = error instanceof Error && error.name === "ZodError" ? 400 : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, { error: "Unable to load public opportunities" });
    }
    return;
  }

  const publicOpportunityMatch = requestUrl.pathname.match(/^\/api\/v1\/opportunities\/([^/]+)$/);
  if (method === "GET" && publicOpportunityMatch) {
    try {
      const opportunity = await getPublicOpportunity(
        decodeURIComponent(publicOpportunityMatch[1]!),
      );
      if (!opportunity) {
        sendJson(response, 404, { error: "Opportunity not found" });
        return;
      }
      sendJson(response, 200, opportunity);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load public opportunity" });
    }
    return;
  }

  if (isPartnerProtectedRequest(requestUrl.pathname, method)) {
    try {
      await requireContractorAccess(request);
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to verify partner access",
      });
      return;
    }
  }

  const residentResource = residentResourceForRequest(requestUrl.pathname, method);
  if (residentResource) {
    try {
      const caseId =
        residentResource.type === "case"
          ? residentResource.id
          : await getRepairCaseId(residentResource.id);
      if (!caseId) throw new RequestError(404, "Repair need not found");
      await requireResidentCaseAccess(request, caseId);
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to verify case access",
      });
      return;
    }
  }

  if (requestUrl.pathname === "/api/v1/demo-sessions") {
    try {
      if (method === "POST") {
        const input = demoSessionSchema.parse(await readJson(request));
        sendJson(response, 200, await openDemoSession(input.displayName, input.pin));
        return;
      }
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.status, { error: error.message });
      } else if (error instanceof Error && error.name === "ZodError") {
        sendJson(response, 400, { error: "A display name and four-digit PIN are required" });
      } else if (error instanceof Error && error.message === "INVALID_SESSION_CREDENTIALS") {
        sendJson(response, 401, { error: "Display name or PIN is incorrect" });
      } else {
        console.error(error);
        sendJson(response, 500, { error: "Unable to open demo session" });
      }
      return;
    }
  }

  if (requestUrl.pathname === "/api/v1/demo-session/cases") {
    try {
      if (method === "GET") {
        const session = await requireDemoSession(request);
        sendJson(response, 200, await listDemoSessionCases(session.id));
        return;
      }
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to load demo cases",
      });
      return;
    }
  }

  if (requestUrl.pathname === "/api/v1/demo-session/data") {
    try {
      if (method === "DELETE") {
        const session = await requireDemoSession(request);
        sendJson(response, 200, await wipeDemoSessionData(session.id));
        return;
      }
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to wipe demo data",
      });
      return;
    }
  }

  if (requestUrl.pathname === "/api/v1/partner-demo-control") {
    try {
      if (method === "GET") {
        sendJson(response, 200, await getPartnerDemoControl());
        return;
      }
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load partner demo controls" });
      return;
    }
  }

  if (
    method === "POST" &&
    (requestUrl.pathname === "/api/v1/partner-demo-control/reset" ||
      requestUrl.pathname === "/api/v1/partner-demo-control/restore")
  ) {
    try {
      requireOperatorCode(await readJson(request));
      const payload = requestUrl.pathname.endsWith("/reset")
        ? await resetPartnerDemoData()
        : await restorePartnerDemoData();
      sendJson(response, 200, payload);
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to update partner demo data",
      });
    }
    return;
  }

  if (requestUrl.pathname === "/api/v1/demo-session/claim") {
    try {
      if (method === "POST") {
        const session = await requireDemoSession(request);
        const input = claimCaseSchema.parse(await readJson(request));
        sendJson(response, 200, await claimDemoSessionCase(session.id, input.caseId));
        return;
      }
    } catch (error) {
      const status =
        error instanceof RequestError
          ? error.status
          : error instanceof Error && error.message === "CASE_NOT_FOUND"
            ? 404
            : error instanceof Error && error.message === "CASE_ALREADY_CLAIMED"
              ? 409
              : error instanceof Error && error.name === "ZodError"
                ? 400
                : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error:
          status === 409
            ? "Passport already belongs to another session"
            : "Unable to save Passport",
      });
      return;
    }
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/partner-analytics") {
    try {
      const source = parsePartnerDataSource(requestUrl);
      const { facts, degraded } = await loadPartnerFacts(source);
      const analytics = calculatePartnerAnalytics(
        facts,
        syntheticProgramCapacities,
        source === "live" ? 0 : DEFAULT_PARTNER_DEMO_SEED,
        source === "demo" ? PARTNER_DEMO_GENERATED_AT : new Date().toISOString(),
      );
      sendJson(response, 200, {
        ...analytics,
        ...(degraded
          ? {
              degraded: true,
              warning: "Resident submissions are temporarily unavailable; showing baseline data.",
            }
          : {}),
      });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load partner analytics" });
    }
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/partner-inspections") {
    try {
      const source = parsePartnerDataSource(requestUrl);
      sendJson(response, 200, {
        source,
        items: source === "demo" ? [] : await listInspectionQueue(),
      });
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load inspection queue" });
    }
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/overflow/candidates") {
    try {
      sendJson(response, 200, await listOverflowCandidates());
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load overflow candidates" });
    }
    return;
  }

  if (requestUrl.pathname === "/api/v1/overflow/work-orders") {
    try {
      if (method === "GET") {
        sendJson(response, 200, await listOverflowWorkOrders());
        return;
      }
      if (method === "POST") {
        const input = createOverflowWorkOrderSchema.parse(await readJson(request));
        sendJson(response, 201, await createOverflowWorkOrder(input));
        return;
      }
    } catch (error) {
      console.error(error);
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to create overflow work order",
      });
      return;
    }
  }

  const overflowBidMatch = requestUrl.pathname.match(
    /^\/api\/v1\/overflow\/work-orders\/([0-9a-f-]+)\/bids$/i,
  );
  if (method === "POST" && overflowBidMatch) {
    try {
      const input = submitOverflowBidSchema.parse(await readJson(request));
      const payload = await submitOverflowBid(overflowBidMatch[1]!, input);
      sendJson(response, 201, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to submit overflow bid",
      });
    }
    return;
  }

  const overflowWorkOrderMatch = requestUrl.pathname.match(
    /^\/api\/v1\/overflow\/work-orders\/([0-9a-f-]+)$/i,
  );
  if (method === "GET" && overflowWorkOrderMatch) {
    try {
      const payload = await getOverflowWorkOrder(overflowWorkOrderMatch[1]!);
      if (!payload) {
        sendJson(response, 404, { error: "Overflow work order not found" });
        return;
      }
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load overflow work order" });
    }
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/programs") {
    try {
      sendJson(response, 200, await listProgramCatalog());
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load programs" });
    }
    return;
  }

  const partnerCaseMatch = requestUrl.pathname.match(/^\/api\/v1\/partner-cases\/([^/]+)$/);
  if (method === "GET" && partnerCaseMatch) {
    try {
      const caseId = decodeURIComponent(partnerCaseMatch[1]!);
      const partnerCase = await withOverflowCaseState(caseId, parsePartnerDataSource(requestUrl));
      if (!partnerCase) {
        sendJson(response, 404, { error: "Partner case not found" });
        return;
      }
      sendJson(response, 200, partnerCase);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load partner case" });
    }
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

  const createOverflowMatch = requestUrl.pathname.match(
    /^\/api\/v1\/partner-cases\/([^/]+)\/overflow-jobs$/,
  );
  if (method === "POST" && createOverflowMatch) {
    try {
      const caseReference = decodeURIComponent(createOverflowMatch[1]!);
      const body = (await readJson(request)) as { repairNeedId?: string } | null;
      const payload = await createOverflowJob(
        body?.repairNeedId
          ? {
              caseReference,
              repairNeedId: body.repairNeedId,
            }
          : { caseReference },
      );
      sendJson(response, payload.created ? 201 : 200, {
        ...payload.workOrder,
        created: payload.created,
      });
    } catch (error) {
      console.error(error);
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to create overflow job",
      });
    }
    return;
  }

  if (method === "GET" && requestUrl.pathname === "/api/v1/overflow-jobs") {
    try {
      const payload = await listOverflowJobs();
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load overflow jobs" });
    }
    return;
  }

  const overflowJobMatch = requestUrl.pathname.match(/^\/api\/v1\/overflow-jobs\/([^/]+)$/);
  if (method === "GET" && overflowJobMatch) {
    try {
      const workOrderReference = decodeURIComponent(overflowJobMatch[1]!);
      const payload = await getOverflowJob(workOrderReference);
      if (!payload) {
        sendJson(response, 404, { error: "Overflow job not found" });
        return;
      }
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Unable to load overflow job" });
    }
    return;
  }

  const overflowJobBidsMatch = requestUrl.pathname.match(
    /^\/api\/v1\/overflow-jobs\/([^/]+)\/bids$/,
  );
  if (method === "GET" && overflowJobBidsMatch) {
    try {
      const workOrderReference = decodeURIComponent(overflowJobBidsMatch[1]!);
      const payload = await getWorkOrderBids(workOrderReference);
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to load work order bids",
      });
    }
    return;
  }

  if (method === "POST" && overflowJobBidsMatch) {
    try {
      const workOrderReference = decodeURIComponent(overflowJobBidsMatch[1]!);
      const body = (await readJson(request)) as {
        contractorName?: string;
        companyName?: string;
        estimatedPriceCents?: number;
        estimatedDurationDays?: number;
        notes?: string;
      };
      const payload = await submitBid(
        body.notes !== undefined
          ? {
              workOrderReference,
              contractorName: body.contractorName ?? "",
              companyName: body.companyName ?? "",
              estimatedPriceCents: Number(body.estimatedPriceCents),
              estimatedDurationDays: Number(body.estimatedDurationDays),
              notes: body.notes,
            }
          : {
              workOrderReference,
              contractorName: body.contractorName ?? "",
              companyName: body.companyName ?? "",
              estimatedPriceCents: Number(body.estimatedPriceCents),
              estimatedDurationDays: Number(body.estimatedDurationDays),
            },
      );
      sendJson(response, 200, payload);
    } catch (error) {
      console.error(error);
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Unable to submit contractor response",
      });
    }
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/api/v1/intakes") {
    try {
      const payload = intakeSchema.parse(await readJson(request));
      const token = request.headers["x-homefix-demo-session"];
      const session = typeof token === "string" ? await getDemoSession(token) : null;
      if (typeof token === "string" && !session) {
        sendJson(response, 401, { error: "Demo session is invalid" });
        return;
      }
      const result = await createIntakeCase(payload, session ? { demoSessionId: session.id } : {});
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

  const repairPhotoMatch = requestUrl.pathname.match(/^\/api\/v1\/repairs\/([0-9a-f-]+)\/photos$/i);
  if (method === "POST" && repairPhotoMatch) {
    let files: Awaited<ReturnType<typeof readPhotoFiles>> = [];
    const uploadedPhotoIds: string[] = [];
    try {
      const repairNeedId = repairPhotoMatch[1]!;
      const evidenceStage = requestUrl.searchParams.get("stage") ?? "resident_report";
      if (!["resident_report", "inspection", "completion"].includes(evidenceStage)) {
        sendJson(response, 400, { error: "Invalid photo evidence stage" });
        return;
      }
      files = await readPhotoFiles(request);
      if (files.length === 0) {
        sendJson(response, 400, { error: "At least one valid image is required" });
        return;
      }
      const photos = [];
      for (const file of files) {
        const photo = await uploadRepairPhoto({
          repairNeedId,
          filepath: file.filepath,
          originalFilename: file.originalFilename ?? "repair-photo",
          mimeType: file.mimetype ?? "application/octet-stream",
          evidenceStage: evidenceStage as "resident_report" | "inspection" | "completion",
        });
        photos.push(photo);
        uploadedPhotoIds.push(photo.id);
      }
      sendJson(response, 201, { photos });
    } catch (error) {
      const cleanupResults = await Promise.allSettled(
        uploadedPhotoIds.map((photoId) => rollbackRepairPhoto(photoId)),
      );
      cleanupResults.forEach((result) => {
        if (result.status === "rejected")
          console.error("Unable to roll back repair photo", result.reason);
      });
      const status = error instanceof RequestError ? error.status : 400;
      if (status >= 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof Error ? error.message : "Unable to upload repair photos",
      });
    } finally {
      await Promise.allSettled(files.map((file) => rm(file.filepath, { force: true })));
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
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to load case",
      });
    }
    return;
  }

  const caseDocumentsMatch = requestUrl.pathname.match(
    /^\/api\/v1\/cases\/([0-9a-f-]+)\/documents$/i,
  );
  if (method === "POST" && caseDocumentsMatch) {
    let filepath: string | null = null;
    let documentId: string | null = null;
    try {
      const caseId = caseDocumentsMatch[1]!;
      const { documentType, file } = await readDocumentFile(request);
      if (!file) throw new RequestError(400, "A valid document is required");
      filepath = file.filepath;
      const document = await uploadCaseDocument({
        caseId,
        documentType,
        filepath,
        originalFilename: file.originalFilename ?? "case-document",
        mimeType: file.mimetype ?? "application/octet-stream",
      });
      documentId = document.id;
      sendJson(response, 201, { document });
    } catch (error) {
      if (documentId) {
        await rollbackCaseDocument(documentId).catch((cleanupError) =>
          console.error("Unable to roll back case document", cleanupError),
        );
      }
      const status = error instanceof RequestError ? error.status : 400;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : "Unable to upload document",
      });
    } finally {
      if (filepath) await rm(filepath, { force: true });
    }
    return;
  }

  const partnerDocumentMatch = requestUrl.pathname.match(
    /^\/api\/v1\/partner-cases\/([^/]+)\/documents\/([0-9a-f-]+)$/i,
  );
  if (method === "PATCH" && partnerDocumentMatch) {
    try {
      const caseId = decodeURIComponent(partnerDocumentMatch[1]!);
      const document = await reviewCaseDocument(
        caseId,
        partnerDocumentMatch[2]!,
        await readJson(request),
      );
      sendJson(response, 200, { document });
    } catch (error) {
      const status =
        error instanceof Error && error.name === "ZodError"
          ? 400
          : error instanceof Error && error.message === "Document not found"
            ? 404
            : 400;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : "Unable to review document",
      });
    }
    return;
  }

  const inspectionAvailabilityMatch = requestUrl.pathname.match(
    /^\/api\/v1\/cases\/([0-9a-f-]+)\/inspection\/availability$/i,
  );
  if (method === "POST" && inspectionAvailabilityMatch) {
    try {
      const payload = await submitInspectionAvailability(
        inspectionAvailabilityMatch[1]!,
        await readJson(request),
      );
      sendJson(response, 200, payload);
    } catch (error) {
      const status =
        error instanceof RequestError
          ? error.status
          : error instanceof Error && error.name === "ZodError"
            ? 400
            : 409;
      sendJson(response, status, {
        error:
          error instanceof Error && error.name === "ZodError"
            ? "Choose at least three valid future inspection windows."
            : error instanceof Error
              ? error.message
              : "Unable to submit inspection availability",
      });
    }
    return;
  }

  const inspectionConfirmMatch = requestUrl.pathname.match(
    /^\/api\/v1\/cases\/([0-9a-f-]+)\/inspection\/confirm$/i,
  );
  if (method === "POST" && inspectionConfirmMatch) {
    try {
      const payload = await confirmInspection(inspectionConfirmMatch[1]!, await readJson(request));
      sendJson(response, 200, payload);
    } catch (error) {
      const status = error instanceof Error && error.name === "ZodError" ? 400 : 409;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : "Unable to confirm inspection",
      });
    }
    return;
  }

  const inspectionFindingsMatch = requestUrl.pathname.match(
    /^\/api\/v1\/cases\/([0-9a-f-]+)\/inspection\/findings$/i,
  );
  if (method === "POST" && inspectionFindingsMatch) {
    try {
      const payload = await recordInspectionFindings(
        inspectionFindingsMatch[1]!,
        await readJson(request),
      );
      sendJson(response, 200, payload);
    } catch (error) {
      const status = error instanceof Error && error.name === "ZodError" ? 400 : 409;
      sendJson(response, status, {
        error: error instanceof Error ? error.message : "Unable to record inspection findings",
      });
    }
    return;
  }

  const coverageMatch = requestUrl.pathname.match(/^\/api\/v1\/cases\/([0-9a-f-]+)\/coverage$/i);
  if (method === "GET" && coverageMatch) {
    try {
      const caseId = coverageMatch[1]!;
      const payload = await getCoveragePlan(caseId);
      sendJson(response, 200, payload);
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to load coverage plan",
      });
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
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to process repair",
      });
    }
    return;
  }

  const processCaseMatch = requestUrl.pathname.match(/^\/api\/v1\/cases\/([0-9a-f-]+)\/process$/i);
  if (method === "POST" && processCaseMatch) {
    try {
      const caseId = processCaseMatch[1]!;
      const payload = await processCase(caseId);
      sendJson(response, 200, payload);
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, {
        error: error instanceof RequestError ? error.message : "Unable to process case",
      });
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
