import assert from "node:assert/strict";
import test from "node:test";

import { deriveCaseLifecycle, type CaseLifecycleFacts } from "./lifecycle.js";

const reportedFacts: CaseLifecycleFacts = {
  reportComplete: true,
  screeningComplete: false,
  viablePathwayCount: 0,
  inspectionRequested: false,
  inspectionStatus: null,
  inspectionCompleted: false,
  scopeVerified: false,
  documentsVerified: false,
  approvalStatuses: [],
  workOrderCreated: false,
  workCompleted: false,
  completionVerified: false,
};

test("lifecycle stops at potential programs when screening finds no pathway", () => {
  const lifecycle = deriveCaseLifecycle({ ...reportedFacts, screeningComplete: true });

  assert.equal(lifecycle.stage, "potential_programs");
  assert.match(lifecycle.nextAction, /other resources/i);
  assert.equal(lifecycle.steps[2]?.status, "current");
  assert.equal(lifecycle.steps[3]?.status, "pending");
});

test("lifecycle exposes each inspection request state on the repair case", () => {
  const baseInspectionFacts = {
    ...reportedFacts,
    screeningComplete: true,
    viablePathwayCount: 2,
    inspectionRequested: true,
  };
  const expected = [
    ["availability_requested", "inspection_availability_needed", /submit availability/i],
    ["availability_submitted", "awaiting_inspector_assignment", /assign a provider/i],
    ["assigned", "inspector_assigned", /confirm an appointment/i],
    ["scheduled", "inspection_scheduled", /perform the professional inspection/i],
  ] as const;

  for (const [inspectionStatus, caseStatus, nextAction] of expected) {
    const lifecycle = deriveCaseLifecycle({ ...baseInspectionFacts, inspectionStatus });
    assert.equal(lifecycle.stage, "inspection");
    assert.equal(lifecycle.caseStatus, caseStatus);
    assert.match(lifecycle.nextAction, nextAction);
  }

  const scope = deriveCaseLifecycle({
    ...baseInspectionFacts,
    inspectionStatus: "completed",
    inspectionCompleted: true,
  });

  assert.equal(scope.stage, "repair_scope");
  assert.equal(scope.caseStatus, "inspection_completed");
});

test("lifecycle keeps non-approved final outcomes in program review", () => {
  const lifecycle = deriveCaseLifecycle({
    ...reportedFacts,
    screeningComplete: true,
    viablePathwayCount: 2,
    inspectionRequested: true,
    inspectionCompleted: true,
    scopeVerified: true,
    documentsVerified: true,
    approvalStatuses: ["denied", "waitlisted"],
  });

  assert.equal(lifecycle.stage, "program_approval");
  assert.match(lifecycle.nextAction, /waitlist/i);
});

test("lifecycle advances approved work through repair and verified completion", () => {
  const approvedFacts: CaseLifecycleFacts = {
    ...reportedFacts,
    screeningComplete: true,
    viablePathwayCount: 1,
    inspectionRequested: true,
    inspectionCompleted: true,
    scopeVerified: true,
    documentsVerified: true,
    approvalStatuses: ["approved"],
  };

  assert.equal(deriveCaseLifecycle(approvedFacts).stage, "repair");
  assert.match(deriveCaseLifecycle(approvedFacts).nextAction, /create a work order/i);

  const awaitingVerification = deriveCaseLifecycle({
    ...approvedFacts,
    workOrderCreated: true,
    workCompleted: true,
  });
  assert.equal(awaitingVerification.stage, "completion");
  assert.equal(awaitingVerification.complete, false);

  const closed = deriveCaseLifecycle({
    ...approvedFacts,
    workOrderCreated: true,
    workCompleted: true,
    completionVerified: true,
  });
  assert.equal(closed.stage, "completion");
  assert.equal(closed.complete, true);
  assert.ok(closed.steps.every((step) => step.status === "complete"));
});
