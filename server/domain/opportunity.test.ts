import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOpportunityAssignmentTransition,
  assertOpportunityResponseTransition,
  assertOpportunityTransition,
  responseTypesForOpportunity,
} from "./opportunity.js";

test("opportunities follow the approval-based fulfillment lifecycle", () => {
  assert.doesNotThrow(() => assertOpportunityTransition("open", "responses_received"));
  assert.doesNotThrow(() => assertOpportunityTransition("responses_received", "assigned"));
  assert.doesNotThrow(() => assertOpportunityTransition("assigned", "in_progress"));
  assert.doesNotThrow(() => assertOpportunityTransition("in_progress", "completed"));
  assert.throws(
    () => assertOpportunityTransition("open", "completed"),
    /Invalid opportunity status transition/,
  );
  assert.throws(
    () => assertOpportunityTransition("completed", "open"),
    /Invalid opportunity status transition/,
  );
});

test("responses cannot change after a terminal decision", () => {
  assert.doesNotThrow(() => assertOpportunityResponseTransition("submitted", "shortlisted"));
  assert.doesNotThrow(() => assertOpportunityResponseTransition("shortlisted", "accepted"));
  assert.throws(
    () => assertOpportunityResponseTransition("accepted", "withdrawn"),
    /Invalid opportunity response status transition/,
  );
});

test("assignments can only complete or be revoked while active", () => {
  assert.doesNotThrow(() => assertOpportunityAssignmentTransition("active", "completed"));
  assert.doesNotThrow(() => assertOpportunityAssignmentTransition("active", "revoked"));
  assert.throws(
    () => assertOpportunityAssignmentTransition("revoked", "active"),
    /Invalid opportunity assignment status transition/,
  );
});

test("response types are restricted by opportunity type", () => {
  assert.deepEqual(responseTypesForOpportunity("inspection"), ["inspection_interest"]);
  assert.deepEqual(responseTypesForOpportunity("repair"), ["repair_interest", "bid"]);
  assert.deepEqual(responseTypesForOpportunity("training"), ["training_interest"]);
});