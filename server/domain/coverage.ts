import type { MatchStatus } from "./eligibility.js";
import type { RepairCategory } from "./repair.js";

export type CoverageStatus = MatchStatus | "funding_gap";

export type CoveragePlan = {
  caseId: string;
  coveragePercentage: number;
  coveredNeeds: number;
  totalNeeds: number;
  fundingGaps: number;
  repairs: Array<{
    repairNeedId: string;
    category: RepairCategory;
    status: CoverageStatus;
    program: { id: string; name: string } | null;
  }>;
  nextBestAction: {
    type: "document_required" | "manual_review" | "funding_gap" | "monitor";
    message: string;
  };
};
