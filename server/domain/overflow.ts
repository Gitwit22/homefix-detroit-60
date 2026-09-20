import { repairCategoryLabels, type RepairCategory } from "./repair.js";

export type OverflowFundingStatus = "program_approved";
export type OverflowCapacityStatus = "full" | "available";
export type WorkOrderStatus = "open" | "bids_received";
export type BidStatus = "submitted";

export const overflowFundingStatusLabels: Record<OverflowFundingStatus, string> = {
  program_approved: "Program Approved",
};

export const overflowCapacityStatusLabels: Record<OverflowCapacityStatus, string> = {
  full: "Full",
  available: "Available",
};

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  open: "Open",
  bids_received: "Bids Received",
};

export const bidStatusLabels: Record<BidStatus, string> = {
  submitted: "Submitted for Program Review",
};

export type OverflowDemoCaseConfig = {
  caseNumber: string;
  selectedRepairCategory: RepairCategory;
  selectedProgramSlug: string;
  fundingStatus: OverflowFundingStatus;
  capacityStatus: OverflowCapacityStatus;
  explanation: string;
};

export const overflowDemoCaseConfigs: OverflowDemoCaseConfig[] = [
  {
    caseNumber: "HF-313-0842",
    selectedRepairCategory: "roof_water_intrusion",
    selectedProgramSlug: "critical-home-repair",
    fundingStatus: "program_approved",
    capacityStatus: "full",
    explanation:
      "This approved repair may require additional delivery capacity because the demo program capacity is full.",
  },
  {
    caseNumber: "HF-313-0911",
    selectedRepairCategory: "roof_water_intrusion",
    selectedProgramSlug: "critical-home-repair",
    fundingStatus: "program_approved",
    capacityStatus: "full",
    explanation:
      "Synthetic demonstration case for overflow contractor response after program approval.",
  },
  {
    caseNumber: "HF-313-0917",
    selectedRepairCategory: "hvac",
    selectedProgramSlug: "wayne-metro-weatherization",
    fundingStatus: "program_approved",
    capacityStatus: "full",
    explanation:
      "Synthetic demonstration case for overflow contractor response after program approval.",
  },
  {
    caseNumber: "HF-313-0924",
    selectedRepairCategory: "electrical",
    selectedProgramSlug: "zero-percent-home-repair-loan",
    fundingStatus: "program_approved",
    capacityStatus: "full",
    explanation:
      "Synthetic demonstration case for overflow contractor response after program approval.",
  },
  {
    caseNumber: "HF-313-0932",
    selectedRepairCategory: "accessibility",
    selectedProgramSlug: "zero-percent-home-repair-loan",
    fundingStatus: "program_approved",
    capacityStatus: "full",
    explanation:
      "Synthetic demonstration case for overflow contractor response after program approval.",
  },
  {
    caseNumber: "HF-313-0940",
    selectedRepairCategory: "plumbing",
    selectedProgramSlug: "zero-percent-home-repair-loan",
    fundingStatus: "program_approved",
    capacityStatus: "full",
    explanation:
      "Synthetic demonstration case for overflow contractor response after program approval.",
  },
];

const overflowDemoCaseConfigMap = new Map(
  overflowDemoCaseConfigs.map((config) => [config.caseNumber, config]),
);

export function getOverflowDemoCaseConfig(caseNumber: string) {
  return overflowDemoCaseConfigMap.get(caseNumber);
}

export function getOverflowEligibility(input: {
  caseNumber: string;
  repairCategory: RepairCategory;
  programSlug?: string | null;
}) {
  const config = getOverflowDemoCaseConfig(input.caseNumber);
  if (!config) {
    return {
      eligible: false,
      reason: "Overflow jobs are enabled only for designated demo cases.",
      config: null,
    } as const;
  }

  if (!input.programSlug) {
    return {
      eligible: false,
      reason: "No selected program is available for this repair need.",
      config,
    } as const;
  }

  if (config.selectedProgramSlug !== input.programSlug) {
    return {
      eligible: false,
      reason: "The selected program does not match the configured overflow demo pathway.",
      config,
    } as const;
  }

  if (config.selectedRepairCategory !== input.repairCategory) {
    return {
      eligible: false,
      reason: `Overflow creation is configured for ${repairCategoryLabels[config.selectedRepairCategory]}.`,
      config,
    } as const;
  }

  if (config.fundingStatus !== "program_approved") {
    return {
      eligible: false,
      reason: "Program funding is not approved for overflow creation.",
      config,
    } as const;
  }

  if (config.capacityStatus !== "full") {
    return {
      eligible: false,
      reason: "Program delivery capacity is not full.",
      config,
    } as const;
  }

  return {
    eligible: true,
    reason: config.explanation,
    config,
  } as const;
}
