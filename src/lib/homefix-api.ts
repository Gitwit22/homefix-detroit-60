type IntakePayload = {
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
  repair: {
    category: string;
    description: string;
    startedWhen?: string;
    gettingWorse: boolean;
    safeToOccupy: boolean;
    urgency: string;
  };
};

type IntakeResponse = {
  success: true;
  caseId: string;
  repairNeedId: string;
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

export async function getCoverage(caseId: string): Promise<CoveragePlanResponse> {
  if (!apiUrl) throw new Error("VITE_HOMEFIX_API_URL is not configured");
  const response = await fetch(`${apiUrl}/api/v1/cases/${caseId}/coverage`);
  if (!response.ok) throw new Error(`HomeFix API returned ${response.status}`);
  return response.json() as Promise<CoveragePlanResponse>;
}
