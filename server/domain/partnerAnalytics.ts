export const repairTypes = [
  "roof_water_intrusion",
  "hvac",
  "plumbing",
  "electrical",
  "accessibility",
  "structural",
  "lead_environmental",
  "windows_doors",
] as const;

export type RepairType = (typeof repairTypes)[number];
export type Priority = "low" | "moderate" | "high" | "critical";
export type MatchStatus =
  "strong_match" | "potential_match" | "verification_needed" | "not_eligible" | "no_match";
export type CoverageStatus = "potentially_covered" | "verification_needed" | "funding_gap";
export type CaseStatus =
  | "assessment_complete"
  | "documents_needed"
  | "program_review"
  | "referred"
  | "waitlisted"
  | "repair_scheduled";
export type CapacityStatus = "open" | "limited" | "waitlist" | "closed";

export const repairTypeLabels: Record<RepairType, string> = {
  roof_water_intrusion: "Roof / Water",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  accessibility: "Accessibility",
  structural: "Structural",
  lead_environmental: "Lead / Environmental",
  windows_doors: "Windows / Doors",
};

export const priorityLabels: Record<Priority, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

export const matchStatusLabels: Record<MatchStatus, string> = {
  strong_match: "Strong Match",
  potential_match: "Potential Match",
  verification_needed: "Verification Needed",
  not_eligible: "Not Eligible",
  no_match: "No Match",
};

export const coverageStatusLabels: Record<CoverageStatus, string> = {
  potentially_covered: "Potentially Covered",
  verification_needed: "Verification Needed",
  funding_gap: "Funding Gap",
};

export const caseStatusLabels: Record<CaseStatus, string> = {
  assessment_complete: "Assessment Complete",
  documents_needed: "Documents Needed",
  program_review: "Program Review",
  referred: "Referred",
  waitlisted: "Waitlisted",
  repair_scheduled: "Repair Scheduled",
};

export const capacityStatusLabels: Record<CapacityStatus, string> = {
  open: "Open",
  limited: "Limited",
  waitlist: "Waitlist",
  closed: "Closed",
};

export type SyntheticRepairFact = {
  homeId: string;
  caseId: string;
  repairNeedId: string;
  propertyLabel: string;
  zipCode: string;
  repairType: RepairType;
  priority: Priority;
  matchStatus: MatchStatus;
  coverageStatus: CoverageStatus;
  caseStatus: CaseStatus;
  programId?: string;
  createdAt: string;
  synthetic: true;
};

export type SyntheticProgramCapacity = {
  programId: string;
  name: string;
  status: CapacityStatus;
  simulatedCapacity: number;
  synthetic: true;
};

export type RepairTypeMetric = {
  repairType: RepairType;
  label: string;
  repairNeeds: number;
  highPriority: number;
  potentiallyCovered: number;
  verificationNeeded: number;
  unmatched: number;
  gapRate: number;
};

export type ZipMetric = {
  zipCode: string;
  homes: number;
  repairNeeds: number;
  highPriority: number;
  potentiallyCovered: number;
  verificationNeeded: number;
  unmatched: number;
  gapRate: number;
};

export type UnmetNeedMetric = RepairTypeMetric & { leadingZipCodes: string[] };

export type HighPriorityCase = {
  caseId: string;
  repairNeedId: string;
  propertyLabel: string;
  zipCode: string;
  repairType: RepairType;
  repairLabel: string;
  priority: Priority;
  matchStatus: MatchStatus;
  coverageStatus: CoverageStatus;
  caseStatus: CaseStatus;
  programId?: string;
  createdAt: string;
};

export type PartnerCaseSummary = {
  caseId: string;
  homeId: string;
  propertyLabel: string;
  zipCode: string;
  priority: Priority;
  matchStatus: MatchStatus;
  coverageStatus: CoverageStatus;
  caseStatus: CaseStatus;
  repairNeeds: number;
  repairLabels: string[];
  programIds: string[];
  createdAt: string;
};

export type PartnerCaseDetail = PartnerCaseSummary & {
  needs: Array<{
    repairNeedId: string;
    repairType: RepairType;
    repairLabel: string;
    priority: Priority;
    matchStatus: MatchStatus;
    coverageStatus: CoverageStatus;
    programId?: string;
  }>;
};

export type ProgramCapacityMetric = SyntheticProgramCapacity & {
  matchedNeeds: number;
  excessDemand: number;
};

export type PartnerAnalytics = {
  generatedAt: string;
  seed: number;
  synthetic: true;
  totals: {
    homes: number;
    repairNeeds: number;
    highPriorityRepairs: number;
    potentiallyCoveredRepairs: number;
    verificationNeeded: number;
    unmatchedNeeds: number;
  };
  byRepairType: RepairTypeMetric[];
  byZipCode: ZipMetric[];
  unmetNeeds: UnmetNeedMetric[];
  highPriorityCases: HighPriorityCase[];
  cases: PartnerCaseSummary[];
  programCapacity: ProgramCapacityMetric[];
  coverage: {
    potentiallyCoveredPercentage: number;
    unmatchedPercentage: number;
  };
};
