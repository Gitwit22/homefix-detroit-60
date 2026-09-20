import type { PartnerAnalytics, PartnerCaseDetail } from "../../server/domain/partnerAnalytics";

export type { PartnerAnalytics, PartnerCaseDetail };

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
    safeToOccupy: boolean;
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
    category: string;
    description: string;
    urgency: string;
    status: string;
  }>;
  photos: Array<{
    id: string;
    repairNeedId: string;
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
    model: string | null;
  }>;
  matches: Array<{
    id: string;
    repairNeedId: string;
    matchStatus: string;
    explanation: string | null;
    missingRequirements: unknown;
    program: { id: string; name: string };
  }>;
  documents: Array<{ id: string; documentType: string; status: string }>;
  events: Array<{ id: string; eventType: string; title: string; description: string | null }>;
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

const apiUrl = import.meta.env["VITE_HOMEFIX_API_URL"]?.replace(/\/$/, "");

export async function submitIntake(payload: IntakePayload): Promise<IntakeResponse> {
  if (!apiUrl) {
    throw new Error("VITE_HOMEFIX_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/api/v1/intakes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HomeFix API returned ${response.status}`);
  }

  return response.json() as Promise<IntakeResponse>;
}

export async function getCase(caseId: string): Promise<CaseAggregateResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/cases/${caseId}`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<CaseAggregateResponse>;
}

export async function processRepair(repairNeedId: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/repairs/${repairNeedId}/process`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{
    caseId: string;
    repairNeedId: string;
    coverage: CoveragePlanResponse;
  }>;
}

export async function uploadRepairPhotos(repairNeedId: string, files: File[]) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const body = new FormData();
  files.forEach((file) => body.append("photos", file));
  const response = await fetch(`${apiUrl}/api/v1/repairs/${repairNeedId}/photos`, {
    method: "POST",
    body,
  });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{ photos: Array<{ id: string; imageUrl: string }> }>;
}

export async function processCase(caseId: string) {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/cases/${caseId}/process`, { method: "POST" });
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<{ caseId: string; coverage: CoveragePlanResponse }>;
}

export async function getCoverage(caseId: string): Promise<CoveragePlanResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/cases/${caseId}/coverage`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<CoveragePlanResponse>;
}

export async function getPartnerAnalytics(): Promise<PartnerAnalytics> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/partner-analytics`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<PartnerAnalytics>;
}

export async function getPartnerCase(caseId: string): Promise<PartnerCaseDetail> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/partner-cases/${encodeURIComponent(caseId)}`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
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
  const response = await fetch(`${apiUrl}/api/v1/overflow-jobs`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<OverflowJobSummaryResponse[]>;
}

export async function getOverflowJob(jobId: string): Promise<OverflowJobDetailResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/overflow-jobs/${encodeURIComponent(jobId)}`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
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
  const response = await fetch(`${apiUrl}/api/v1/programs`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
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
