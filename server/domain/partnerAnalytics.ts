export const repairTypes = [
  "roof_water_intrusion",
  "hvac",
  "plumbing",
  "electrical",
  "accessibility",
  "structural",
  "lead_environmental",
  "windows_doors",
  "carpentry",
  "drywall_plaster",
  "concrete_masonry",
  "flooring",
  "painting_finishing",
  "other",
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
export const workforceDisciplines = [
  "painting_finish",
  "weatherization",
  "basic_carpentry",
  "accessibility_work",
  "needs_review",
] as const;
export type WorkforceDiscipline = (typeof workforceDisciplines)[number];

export const workforceDisciplineLabels: Record<WorkforceDiscipline, string> = {
  painting_finish: "Painting / Finish",
  weatherization: "Weatherization",
  basic_carpentry: "Basic Carpentry",
  accessibility_work: "Accessibility Work",
  needs_review: "Other / Needs Review",
};

export const repairTypeLabels: Record<RepairType, string> = {
  roof_water_intrusion: "Roof / Water",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  accessibility: "Accessibility",
  structural: "Structural",
  lead_environmental: "Lead / Environmental",
  windows_doors: "Windows / Doors",
  carpentry: "Carpentry",
  drywall_plaster: "Drywall / Plaster",
  concrete_masonry: "Concrete / Masonry",
  flooring: "Flooring",
  painting_finishing: "Painting / Finishing",
  other: "Other",
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

export type PartnerRepairFact = {
  homeId: string;
  caseId: string;
  caseNumber: string;
  repairNeedId: string;
  propertyLabel: string;
  zipCode: string;
  repairType: RepairType;
  priority: Priority;
  matchStatus: MatchStatus;
  coverageStatus: CoverageStatus;
  caseStatus: CaseStatus;
  programId?: string;
  trainingOpportunity?: {
    status: "not_suitable" | "potential" | "requires_inspection";
    reason: string;
    possibleSkills: string[];
  } | null;
  createdAt: string;
  synthetic: boolean;
};

export type SyntheticRepairFact = PartnerRepairFact & { synthetic: true };

export type ProgramCapacityModel = {
  programId: string;
  name: string;
  status: CapacityStatus;
  simulatedCapacity: number;
  synthetic: boolean;
};

export type SyntheticProgramCapacity = ProgramCapacityModel & { synthetic: true };

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
  caseNumber: string;
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
  inspectionPackage?: {
    status: string;
    availabilityWindows: Array<{ start: string; end: string }>;
    confirmedStart: string | null;
    confirmedEnd: string | null;
    providerName: string | null;
    providerPhone: string | null;
    questions: Array<{
      id: string;
      repairNeedId: string;
      question: string;
      answer: string | null;
      unableToVerify: boolean;
    }>;
    needs: Array<{
      repairNeedId: string;
      description: string;
      reportedCategory: string;
      urgency: string;
      photos: Array<{ id: string; imageUrl: string }>;
      assessment: {
        summary: string | null;
        urgency: string | null;
        confidence: string | null;
        safetyFlags: string[];
        trainingOpportunity: {
          status: "not_suitable" | "potential" | "requires_inspection";
          reason: string;
          possibleSkills: string[];
        } | null;
      } | null;
      finding: {
        confirmedCategory: string;
        urgency: string;
        condition: string;
        notes: string | null;
        verifiedScope: string;
        estimatedCostCents: number | null;
      } | null;
    }>;
  } | null;
  overflow?: {
    eligible: boolean;
    programId?: string;
    fundingStatus?: string;
    fundingStatusLabel?: string;
    capacityStatus?: string;
    capacityStatusLabel?: string;
    explanation?: string;
    existingWorkOrder?: {
      id: string;
      workOrderNumber: string;
      status: string;
      statusLabel: string;
    } | null;
  };
};

export type ProgramCapacityMetric = ProgramCapacityModel & {
  matchedNeeds: number;
  excessDemand: number;
};

export type WorkforceOpportunity = {
  caseId: string;
  caseNumber: string;
  repairNeedId: string;
  zipCode: string;
  repairType: RepairType;
  repairLabel: string;
  status: "potential" | "requires_inspection";
  reason: string;
  possibleSkills: string[];
  discipline: WorkforceDiscipline;
  createdAt: string;
};

export type PartnerAnalytics = {
  generatedAt: string;
  seed: number;
  synthetic: boolean;
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
  workforceOpportunities: {
    total: number;
    byDiscipline: Array<{
      discipline: WorkforceDiscipline;
      label: string;
      count: number;
    }>;
    opportunities: WorkforceOpportunity[];
  };
  coverage: {
    potentiallyCoveredPercentage: number;
    unmatchedPercentage: number;
  };
};
