export const caseLifecycleStages = [
  "reported",
  "initial_eligibility",
  "potential_programs",
  "inspection",
  "repair_scope",
  "program_approval",
  "repair",
  "completion",
] as const;

export type CaseLifecycleStage = (typeof caseLifecycleStages)[number];
export type LifecycleStepStatus = "complete" | "current" | "pending";
export type ProgramApprovalStatus =
  "pending" | "approved" | "denied" | "waitlisted" | "additional_information_needed";

export const caseLifecycleLabels: Record<CaseLifecycleStage, string> = {
  reported: "Reported",
  initial_eligibility: "Initial Eligibility",
  potential_programs: "Potential Programs",
  inspection: "Inspection",
  repair_scope: "Repair Scope",
  program_approval: "Program Approval",
  repair: "Repair",
  completion: "Completion",
};

export type CaseLifecycleFacts = {
  reportComplete: boolean;
  screeningComplete: boolean;
  viablePathwayCount: number;
  inspectionRequested: boolean;
  inspectionCompleted: boolean;
  scopeVerified: boolean;
  documentsVerified: boolean;
  approvalStatuses: ProgramApprovalStatus[];
  workOrderCreated: boolean;
  workCompleted: boolean;
  completionVerified: boolean;
};

export type CaseLifecycle = {
  stage: CaseLifecycleStage;
  complete: boolean;
  nextAction: string;
  steps: Array<{
    stage: CaseLifecycleStage;
    label: string;
    status: LifecycleStepStatus;
  }>;
};

export function deriveCaseLifecycle(facts: CaseLifecycleFacts): CaseLifecycle {
  let stage: CaseLifecycleStage = "reported";
  let nextAction = "Complete and submit the repair report.";

  if (facts.reportComplete) {
    stage = "initial_eligibility";
    nextAction = "Check the report against current program requirements.";
  }

  if (facts.screeningComplete) {
    stage = "potential_programs";
    nextAction =
      facts.viablePathwayCount > 0
        ? "Submit availability for an on-site inspection."
        : "Review other resources or update the report when circumstances change.";
  }

  if (facts.viablePathwayCount > 0 && facts.inspectionRequested) {
    stage = "inspection";
    nextAction = facts.inspectionCompleted
      ? "Complete and verify the professional repair scope."
      : "Confirm and complete the on-site inspection.";
  }

  if (facts.inspectionCompleted) {
    stage = "repair_scope";
    nextAction = "Complete and verify the professional repair scope.";
  }

  if (facts.scopeVerified) {
    stage = "program_approval";
    nextAction = facts.documentsVerified
      ? "Record a final decision for each potential program pathway."
      : "Prepare the documents required for partner review and final verification.";
  }

  const finalReviewComplete =
    facts.approvalStatuses.length > 0 &&
    facts.approvalStatuses.every((status) => status !== "pending");
  const hasApprovedPathway = facts.approvalStatuses.includes("approved");

  if (facts.scopeVerified && facts.documentsVerified && finalReviewComplete) {
    if (hasApprovedPathway) {
      stage = "repair";
      nextAction = facts.workOrderCreated
        ? "Complete the approved repair work."
        : "Create a work order for the approved repair.";
    } else {
      stage = "program_approval";
      nextAction = facts.approvalStatuses.includes("additional_information_needed")
        ? "Provide the additional information requested by the program."
        : facts.approvalStatuses.includes("waitlisted")
          ? "Monitor the waitlist and other potential pathways."
          : "Review other repair-assistance pathways.";
    }
  }

  if (hasApprovedPathway && facts.workCompleted) {
    stage = "completion";
    nextAction = facts.completionVerified
      ? "No action needed. The repair is complete and verified."
      : "Verify the completed work and close the Repair Passport.";
  }

  const currentIndex = caseLifecycleStages.indexOf(stage);
  const complete = stage === "completion" && facts.completionVerified;

  return {
    stage,
    complete,
    nextAction,
    steps: caseLifecycleStages.map((item, index) => ({
      stage: item,
      label: caseLifecycleLabels[item],
      status:
        complete || index < currentIndex
          ? "complete"
          : index === currentIndex
            ? "current"
            : "pending",
    })),
  };
}
