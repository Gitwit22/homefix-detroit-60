import assert from "node:assert/strict";
import test from "node:test";

import { residentResourceForRequest } from "./accessPolicy.js";

const caseId = "11111111-1111-4111-8111-111111111111";
const repairId = "22222222-2222-4222-8222-222222222222";

test("resident case routes are classified for ownership enforcement", () => {
  const routes: ReadonlyArray<readonly [string, string]> = [
    ["GET", `/api/v1/cases/${caseId}`],
    ["GET", `/api/v1/cases/${caseId}/coverage`],
    ["POST", `/api/v1/cases/${caseId}/process`],
    ["POST", `/api/v1/cases/${caseId}/documents`],
    ["POST", `/api/v1/cases/${caseId}/inspection/availability`],
  ];
  for (const [method, pathname] of routes) {
    assert.deepEqual(residentResourceForRequest(pathname, method), { type: "case", id: caseId });
  }
});

test("repair routes are classified for case ownership enforcement", () => {
  for (const pathname of [
    `/api/v1/repairs/${repairId}/process`,
    `/api/v1/repairs/${repairId}/photos`,
  ]) {
    assert.deepEqual(residentResourceForRequest(pathname, "POST"), {
      type: "repair",
      id: repairId,
    });
  }
});

test("public and partner operations are not classified as resident routes", () => {
  const routes: ReadonlyArray<readonly [string, string]> = [
    ["GET", "/health"],
    ["GET", "/api/v1/opportunities"],
    ["POST", `/api/v1/cases/${caseId}/inspection/confirm`],
    ["POST", `/api/v1/cases/${caseId}/inspection/reschedule`],
    ["POST", `/api/v1/cases/${caseId}/inspection/findings`],
    ["GET", `/api/v1/partner-cases/${caseId}`],
  ];
  for (const [method, pathname] of routes) {
    assert.equal(residentResourceForRequest(pathname, method), null);
  }
});

test("classification requires the expected method and a UUID-shaped identifier", () => {
  assert.equal(residentResourceForRequest(`/api/v1/cases/${caseId}`, "POST"), null);
  assert.equal(residentResourceForRequest("/api/v1/cases/not-a-case", "GET"), null);
  assert.equal(residentResourceForRequest(`/api/v1/repairs/${repairId}/photos`, "GET"), null);
});
