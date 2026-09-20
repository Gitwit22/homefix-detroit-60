import type { PartnerAnalytics, PartnerCaseDetail } from "../../server/domain/partnerAnalytics";
import type { CaseLifecycle } from "../../server/domain/lifecycle";
import {
  HomeFixApiError,
  homeFixApiError,
  requestJsonWithOptionalSession,
  requestWithTimeout,
} from "./api-request";
import { clearDemoSession, getStoredDemoSession, type DemoSession } from "./demo-session";

export type { PartnerAnalytics, PartnerCaseDetail };
export { HomeFixApiError };

export type PartnerDataSource = "live" | "demo" | "combined";

export type CaseDocument = {
  id: string;
  repairCaseId: string;
  documentType: string;
  originalFilename: string | null;
  mimeType: string | null;
  bytes: number | null;
  status: string;
  reviewNotes: string | null;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerInspectionQueueItem = {
  id: string;
  caseId: string;
  caseNumber: string;
  status: string;
  streetAddress: string;
  zipCode: string;
  requestedAt: string;
  updatedAt: string;
  appointmentStart: string | null;
  appointmentEnd: string | null;
  providerName: string | null;
  providerPhone: string | null;
  availabilityWindows: Array<{ start: string; end: string }>;
};

const partnerDataSourceKey = "homefix:partner-data-source";

export function getPartnerDataSource(): PartnerDataSource {
  if (typeof window === "undefined") return "combined";
  const source = window.localStorage.getItem(partnerDataSourceKey);
  return source === "live" || source === "demo" ? source : "combined";
}

export function setPartnerDataSource(source: PartnerDataSource) {
  if (typeof window !== "undefined") window.localStorage.setItem(partnerDataSourceKey, source);
}

const validAssessmentModels = new Set([
  "homefix-triage-v1",
  "homefix-saved-demo-v1",
  "homefix-triage-fallback-v1",
]);

export function isValidAssessment(
  assessment: { model: string | null; summary: string | null } | null | undefined,
) {
  return Boolean(
    assessment?.model && assessment.summary?.trim() && validAssessmentModels.has(assessment.model),
  );
}

export type IntakePayload = {
  demoScenario?: "denise-carter-pitch-v1";
  resident: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  property: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    occupancyType: "owner" | "renter";
    primaryResidence: boolean;
    yearsAtProperty?: number;
  };
  household: {
    householdSize?: number;
    incomeRange?: string;
    applicantAge?: number;
    seniorHousehold: boolean;
    childrenInHousehold: boolean;
    accessibilityNeeds: boolean;
  };
  repairs: Array<{
    clientId: string;
    category: string;
    description: string;
    startedWhen?: string;
    gettingWorse: boolean;
    safetyStatus: "safe" | "unsafe" | "unsure";
    urgency: string;
  }>;
};

type IntakeResponse = {
  success: true;
  caseId: string;
  repairNeedId: string;
  repairs: Array<{ clientId: string; repairNeedId: string }>;
  caseNumber: string;
};

export type CaseAggregateResponse = {
  case: {
    id: string;
    caseNumber: string;
    status: string;
    currentStep: string;
    coveragePercentage: number;
    nextAction: string | null;
  };
  resident: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  home: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    occupancyType: string;
    primaryResidence: boolean;
    yearsAtProperty: number | null;
    householdSize: number | null;
    incomeRange: string | null;
    applicantAge: number | null;
    seniorHousehold: boolean;
    childrenInHousehold: boolean;
    accessibilityNeeds: boolean;
  } | null;
  repairNeeds: Array<{
    id: string;
    repairRole: "PRIMARY" | "ACCESS" | "RESTORATION";
    parentRepairNeedId: string | null;
    category: string;
    description: string;
    urgency: string;
    status: string;
  }>;
  photos: Array<{
    id: string;
    repairNeedId: string;
    evidenceStage: string;
    imageUrl: string;
    originalFilename: string | null;
    width: number | null;
    height: number | null;
  }>;
  assessments: Array<{
    id: string;
    repairNeedId: string;
    predictedCategory: string | null;
    urgency: string | null;
    summary: string | null;
    observations: unknown;
    safetyFlags: unknown;
    followUpQuestions: unknown;
    confidence: string | null;
    trainingOpportunity: {
      status: "not_suitable" | "potential" | "requires_inspection";
      reason: string;
      possibleSkills: string[];
    } | null;
    model: string | null;
  }>;
  matches: Array<{
    id: string;
    repairNeedId: string;
    matchStatus: string;
    approvalStatus: string;
    screeningResults: Array<{
      ruleType: string;
      required: boolean;
      passed: boolean | null;
      reason: string;
    }>;
    screenedAt: string | null;
    explanation: string | null;
    missingRequirements: unknown;
    program: { id: string; name: string };
  }>;
  documents: CaseDocument[];
  events: Array<{
    id: string;
    eventType: string;
    title: string;
    description: string | null;
    createdAt: string;
  }>;
  inspection: {
    id: string;
    status: string;
    availabilityWindows: Array<{ start: string; end: string }>;
    inspectionQuestions: Array<{
      id: string;
      repairNeedId: string;
      question: string;
      answer: string | null;
      unableToVerify: boolean;
    }>;
    confirmedStart: string | null;
    confirmedEnd: string | null;
    providerName: string | null;
    providerPhone: string | null;
  } | null;
  inspectionFindings: Array<{
    id: string;
    inspectionId: string;
    repairNeedId: string;
    confirmedCategory: string;
    urgency: string;
    condition: string;
    notes: string | null;
    verifiedScope: string;
    estimatedCostCents: number | null;
    completedAt: string;
  }>;
  workOrders: Array<{
    id: string;
    repairNeedId: string;
    programId: string;
    workOrderNumber: string;
    scope: string;
    status: string;
    verificationStatus: string;
    completedAt: string | null;
    completionNotes: string | null;
  }>;
  lifecycle: CaseLifecycle;
};

export type CoveragePlanResponse = {
  caseId: string;
  coveragePercentage: number;
  coveredNeeds: number;
  totalNeeds: number;
  fundingGaps: number;
  repairs: Array<{
    repairNeedId: string;
    category: string;
    status: string;
    program: { id: string; name: string } | null;
  }>;
  nextBestAction: { type: string; message: string };
};

export type ProgramDetailResponse = {
  id: string;
  slug: string | null;
  name: string;
  organization: string;
  recordType: "resident_program" | "funding_layer";
  governmentLevel: string | null;
  fundingSource: string | null;
  description: string | null;
  sourceUrl: string | null;
  applicationUrl: string | null;
  phone: string | null;
  applicationStatus: string;
  applicationOpenDate: string | null;
  applicationCloseDate: string | null;
  active: boolean;
  matchable: boolean;
  ownerOccupiedRequired: boolean;
  rentersEligible: boolean;
  landlordsEligible: boolean;
  minimumAge: number | null;
  childRequired: boolean;
  disabilityRequired: boolean;
  pregnancyQualifier: boolean;
  incomeLimitType: string | null;
  maxAmi: number | null;
  taxesCurrentRequired: boolean;
  paymentPlanAccepted: boolean;
  geographicRestriction: string | null;
  disasterTieBackRequired: boolean;
  benefitType: string | null;
  residentEntryPoint: string | null;
  notes: string | null;
  lastVerifiedAt: string | null;
  requiredDocuments: string[];
  repairTypes: string[];
  rules: Array<{ ruleType: string; operator: string; value: unknown; required: boolean }>;
};

export type ProgramCatalogResponse = Omit<ProgramDetailResponse, "rules">[];

export type OverflowBidResponse = {
  id: string;
  contractorName: string;
  companyName: string;
  estimatedPriceCents: number;
  estimatedDurationDays: number;
  notes: string | null;
  status: string;
  statusLabel: string;
  createdAt: string;
};

export type OverflowJobSummaryResponse = {
  id: string;
  workOrderNumber: string;
  repairType: string;
  repairLabel: string;
  priority: string;
  priorityLabel: string;
  fundingStatus: string;
  fundingStatusLabel: string;
  capacityStatus: string;
  capacityStatusLabel: string;
  status: string;
  statusLabel: string;
  city: string;
  state: string;
  zipCode: string;
  programName: string;
  programSlug: string | null;
  responseCount: number;
  isSynthetic: boolean;
  createdAt: string;
};

export type OverflowJobDetailResponse = OverflowJobSummaryResponse & {
  repairCaseId: string;
  caseNumber: string;
  repairNeedId: string;
  description: string;
  assessmentSummary: string | null;
  scope: string;
  photoCount: number;
  photos: Array<{ id: string; imageUrl: string }>;
  requestedAction: string;
  bids: OverflowBidResponse[];
};

export type OverflowCandidate = {
  repairCaseId: string;
  caseNumber: string;
  repairNeedId: string;
  category: string;
  description: string;
  priority: string;
  streetAddress: string;
  zipCode: string;
  programId: string;
  programName: string;
  workOrderId: string | null;
  approvalStatus: "approved";
  capacity: {
    status: string;
    matchedNeeds: number;
    simulatedCapacity: number;
    excessDemand: number;
  };
  synthetic: true;
};

export type OverflowWorkOrder = {
  id: string;
  workOrderNumber: string;
  repairCaseId: string;
  repairNeedId: string;
  scope: string;
  priority: string;
  status: string;
  createdAt: string;
  caseNumber: string;
  category: string;
  description: string;
  streetAddress: string;
  zipCode: string;
  programName: string;
  bids: Array<{
    id: string;
    contractorName: string;
    estimatedPrice: number;
    estimatedDurationDays: number;
    notes: string;
    status: string;
    createdAt: string;
    synthetic: true;
  }>;
  synthetic: true;
};

export type PublicOpportunity = {
  publicNumber: string;
  type: "inspection" | "repair" | "training";
  repairCategory: string;
  priority: string;
  publicScope: string;
  city: "Detroit";
  state: "MI";
  zipCode: string;
  fundingStatus: string | null;
  trainingOpportunityStatus: string | null;
  potentialSkills: string[];
  status: "open" | "responses_received" | "assigned" | "in_progress" | "completed";
  publishedAt: string;
};

export type PublicOpportunityPage = {
  items: PublicOpportunity[];
  page: number;
  pageSize: number;
  total: number;
};

const apiUrl = import.meta.env["VITE_HOMEFIX_API_URL"]?.replace(/\/$/, "");
const requestTimeoutMs = 30_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  return requestWithTimeout((signal) => fetch(input, { ...init, signal }), requestTimeoutMs);
}

export async function getPublicOpportunities(filters: {
  type?: PublicOpportunity["type"];
  zipCode?: string;
  priority?: string;
} = {}): Promise<PublicOpportunityPage> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const search = new URLSearchParams();
  if (filters.type) search.set("type", filters.type);
  if (filters.zipCode) search.set("zipCode", filters.zipCode);
  if (filters.priority) search.set("priority", filters.priority);
  const query = search.size > 0 ? `?${search.toString()}` : "";
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/opportunities${query}`);
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<PublicOpportunityPage>;
}

export async function getPublicOpportunity(
  opportunityNumber: string,
): Promise<PublicOpportunity> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(
    `${apiUrl}/api/v1/opportunities/${encodeURIComponent(opportunityNumber)}`,
  );
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<PublicOpportunity>;
}

export type DemoSessionCase = {
  caseId: string;
  caseNumber: string;
  status: string;
  streetAddress: string;
  createdAt: string;
};

export async function submitIntake(payload: IntakePayload): Promise<IntakeResponse> {
  if (!apiUrl) {
    throw new Error("VITE_HOMEFIX_API_URL is not configured");
  }

  const demoSession = getStoredDemoSession();
  const send = (sessionToken?: string) =>
    fetchWithTimeout(`${apiUrl}/api/v1/intakes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(sessionToken ? { "x-homefix-demo-session": sessionToken } : {}),
      },
      body: JSON.stringify(payload),
    });

  return requestJsonWithOptionalSession<IntakeResponse>({
    request: send,
    ...(demoSession ? { sessionToken: demoSession.token } : {}),
    onInvalidSession: clearDemoSession,
  });
}

export async function openDemoSession(displayName: string, pin: string): Promise<DemoSession> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/demo-sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName, pin }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "INVALID_SESSION_CREDENTIALS"
        : `HomeFix API returned ${response.status}`,
    );
  return response.json() as Promise<DemoSession>;
}

export async function claimDemoSessionCase(token: string, caseId: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/demo-session/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-homefix-demo-session": token },
    body: JSON.stringify({ caseId }),
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{ caseId: string; claimed: true }>;
}

export async function getDemoSessionCases(token: string): Promise<DemoSessionCase[]> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/demo-session/cases`, {
    headers: { "x-homefix-demo-session": token },
  });
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<DemoSessionCase[]>;
}

export async function wipeDemoSessionData(token: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/demo-session/data`, {
    method: "DELETE",
    headers: { "x-homefix-demo-session": token },
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{ deletedCases: number; deletedPhotos: number }>;
}

export type PartnerDemoControl = { baselineEnabled: boolean };

export async function getPartnerDemoControl(): Promise<PartnerDemoControl> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/partner-demo-control`);
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<PartnerDemoControl>;
}

export async function updatePartnerDemoControl(
  action: "reset" | "restore",
  operatorCode: string,
): Promise<PartnerDemoControl> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/partner-demo-control/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operatorCode }),
  });
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<PartnerDemoControl>;
}

export async function getCase(caseId: string): Promise<CaseAggregateResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/cases/${caseId}`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<CaseAggregateResponse>;
}

async function postCaseAction<T>(caseId: string, path: string, body: unknown): Promise<T> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const demoSession = getStoredDemoSession();
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/cases/${caseId}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(demoSession ? { "x-homefix-demo-session": demoSession.token } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `HomeFix API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function submitInspectionAvailability(
  caseId: string,
  windows: Array<{ start: string; end: string }>,
) {
  return postCaseAction<{
    inspection: CaseAggregateResponse["inspection"];
    lifecycle: CaseLifecycle;
  }>(caseId, "inspection/availability", { windows });
}

export function confirmInspectionAppointment(
  caseId: string,
  input: { start: string; end: string; providerName: string; providerPhone?: string },
) {
  return postCaseAction<{
    inspection: CaseAggregateResponse["inspection"];
    lifecycle: CaseLifecycle;
  }>(caseId, "inspection/confirm", input);
}

export function saveInspectionFindings(
  caseId: string,
  findings: Array<{
    repairNeedId: string;
    confirmedCategory: string;
    urgency: string;
    condition: string;
    notes?: string;
    verifiedScope: string;
    estimatedCostCents?: number;
    trainingSuitability: "not_suitable" | "potential" | "suitable";
  }>,
  questionResponses: Array<{
    id: string;
    repairNeedId: string;
    answer: string | null;
    unableToVerify: boolean;
  }>,
) {
  return postCaseAction<{ lifecycle: CaseLifecycle }>(caseId, "inspection/findings", {
    findings,
    questionResponses,
  });
}

export async function getPartnerInspectionQueue(
  source: PartnerDataSource = getPartnerDataSource(),
) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/partner-inspections?source=${source}`);
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<{ source: PartnerDataSource; items: PartnerInspectionQueueItem[] }>;
}

export async function processRepair(repairNeedId: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/repairs/${repairNeedId}/process`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{
    caseId: string;
    repairNeedId: string;
    coverage: CoveragePlanResponse;
  }>;
}

export async function uploadRepairPhotos(
  repairNeedId: string,
  files: File[],
  evidenceStage: "resident_report" | "inspection" | "completion" = "resident_report",
) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const body = new FormData();
  files.forEach((file) => body.append("photos", file));
  const response = await fetchWithTimeout(
    `${apiUrl}/api/v1/repairs/${repairNeedId}/photos?stage=${evidenceStage}`,
    { method: "POST", body },
  );
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{ photos: Array<{ id: string; imageUrl: string }> }>;
}

export async function uploadCaseDocument(caseId: string, documentType: string, file: File) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("document", file);
  const demoSession = getStoredDemoSession();
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/cases/${caseId}/documents`, {
    method: "POST",
    headers: demoSession ? { "x-homefix-demo-session": demoSession.token } : {},
    body,
  });
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<{ document: CaseDocument }>;
}

export async function reviewCaseDocument(
  caseId: string,
  documentId: string,
  input: { status: "uploaded" | "approved" | "rejected"; reviewNotes?: string | null },
) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(
    `${apiUrl}/api/v1/partner-cases/${encodeURIComponent(caseId)}/documents/${documentId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<{ document: CaseDocument }>;
}

export async function processCase(caseId: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/cases/${caseId}/process`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{ caseId: string; coverage: CoveragePlanResponse }>;
}

export async function getCoverage(caseId: string): Promise<CoveragePlanResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/cases/${caseId}/coverage`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<CoveragePlanResponse>;
}

export async function getPartnerAnalytics(
  source: PartnerDataSource = "combined",
): Promise<PartnerAnalytics> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const query = source === "combined" ? "" : `?source=${source}`;
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/partner-analytics${query}`);
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<PartnerAnalytics>;
}

export async function getPartnerCase(
  caseId: string,
  source: PartnerDataSource = "combined",
): Promise<PartnerCaseDetail> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const query = source === "combined" ? "" : `?source=${source}`;
  const response = await fetchWithTimeout(
    `${apiUrl}/api/v1/partner-cases/${encodeURIComponent(caseId)}${query}`,
  );
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<PartnerCaseDetail>;
}

export async function getProgram(programId: string): Promise<ProgramDetailResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/programs/${encodeURIComponent(programId)}`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<ProgramDetailResponse>;
}

export async function createOverflowJob(caseId: string, repairNeedId?: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(
    `${apiUrl}/api/v1/partner-cases/${encodeURIComponent(caseId)}/overflow-jobs`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(repairNeedId ? { repairNeedId } : {}),
    },
  );
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowJobDetailResponse>;
}

export async function getOverflowJobs(): Promise<OverflowJobSummaryResponse[]> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/overflow-jobs`);
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<OverflowJobSummaryResponse[]>;
}

export async function getOverflowJob(jobId: string): Promise<OverflowJobDetailResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(
    `${apiUrl}/api/v1/overflow-jobs/${encodeURIComponent(jobId)}`,
  );
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<OverflowJobDetailResponse>;
}

export async function submitBid(
  jobId: string,
  payload: {
    contractorName: string;
    companyName: string;
    estimatedPriceCents: number;
    estimatedDurationDays: number;
    notes?: string;
  },
) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow-jobs/${encodeURIComponent(jobId)}/bids`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowJobDetailResponse>;
}

export async function getWorkOrderBids(jobId: string): Promise<OverflowBidResponse[]> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow-jobs/${encodeURIComponent(jobId)}/bids`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowBidResponse[]>;
}

export async function getPrograms(): Promise<ProgramCatalogResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetchWithTimeout(`${apiUrl}/api/v1/programs`);
  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<ProgramCatalogResponse>;
}

export async function getOverflowCandidates(): Promise<OverflowCandidate[]> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow/candidates`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowCandidate[]>;
}

export async function getOverflowWorkOrders(): Promise<OverflowWorkOrder[]> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow/work-orders`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowWorkOrder[]>;
}

export async function getOverflowWorkOrder(workOrderId: string): Promise<OverflowWorkOrder> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow/work-orders/${workOrderId}`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowWorkOrder>;
}

export async function createOverflowWorkOrder(repairNeedId: string): Promise<OverflowWorkOrder> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow/work-orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repairNeedId }),
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowWorkOrder>;
}

export async function submitOverflowBid(
  workOrderId: string,
  input: {
    contractorName: string;
    estimatedPrice: number;
    estimatedDurationDays: number;
    notes: string;
  },
): Promise<OverflowWorkOrder> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow/work-orders/${workOrderId}/bids`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowWorkOrder>;
}
