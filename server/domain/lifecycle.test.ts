import assert from "node:assert/strict";
import test from "node:test";

import { deriveCaseLifecycle, type CaseLifecycleFacts } from "./lifecycle.js";

const reportedFacts: CaseLifecycleFacts = {
  reportComplete: true,
  screeningComplete: false,
  viablePathwayCount: 0,
  inspectionRequested: false,
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

test("lifecycle requires inspection and verified scope before final review", () => {
  const inspection = deriveCaseLifecycle({
    ...reportedFacts,
    screeningComplete: true,
    viablePathwayCount: 2,
    inspectionRequested: true,
  });
  const scope = deriveCaseLifecycle({
    ...reportedFacts,
    screeningComplete: true,
    viablePathwayCount: 2,
    inspectionRequested: true,
    inspectionCompleted: true,
  });

  assert.equal(inspection.stage, "inspection");
  assert.equal(scope.stage, "repair_scope");
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
