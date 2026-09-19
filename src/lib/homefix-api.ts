import type { PartnerAnalytics, PartnerCaseDetail } from "../../server/domain/partnerAnalytics";

export type { PartnerAnalytics, PartnerCaseDetail };

export type IntakePayload = {
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
  description: string | null;
  sourceUrl: string | null;
  applicationStatus: string;
  lastVerifiedAt: string | null;
  requiredDocuments: string[];
  repairTypes: string[];
  rules: Array<{ ruleType: string; operator: string; value: unknown; required: boolean }>;
};

const apiUrl = import.meta.env.VITE_HOMEFIX_API_URL?.replace(/\/$/, "");

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
