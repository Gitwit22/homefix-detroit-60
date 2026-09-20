import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost/test";

const { mapPublicOpportunity, publicOpportunityFiltersSchema } = await import("./opportunities.js");

test("public opportunity DTO contains no case identifiers, PII, or photos", () => {
  const publicOpportunity = mapPublicOpportunity({
    publicNumber: "HF-INSP-0218",
    type: "inspection",
    repairCategory: "roof_water_intrusion",
    priority: "high",
    publicScope: "Determine the source of water intrusion during rainfall.",
    zipCode: "48224",
    fundingStatus: "potential_pathway",
    trainingOpportunityStatus: "requires_inspection",
    potentialSkills: ["roof assessment", "moisture inspection"],
    status: "open",
    publishedAt: new Date("2026-09-20T12:00:00.000Z"),
  });

  assert.deepEqual(Object.keys(publicOpportunity).sort(), [
    "city",
    "fundingStatus",
    "potentialSkills",
    "priority",
    "publicNumber",
    "publicScope",
    "publishedAt",
    "repairCategory",
    "state",
    "status",
    "trainingOpportunityStatus",
    "type",
    "zipCode",
  ]);
  const serialized = JSON.stringify(publicOpportunity);
  for (const forbidden of [
    "repairCaseId",
    "repairNeedId",
    "streetAddress",
    "residentName",
    "phone",
    "email",
    "photos",
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden, "i"));
  }
});

test("public opportunity filters reject cancelled status and unbounded page sizes", () => {
  assert.equal(publicOpportunityFiltersSchema.safeParse({ status: "cancelled" }).success, false);
  assert.equal(publicOpportunityFiltersSchema.safeParse({ pageSize: 51 }).success, false);
  assert.deepEqual(publicOpportunityFiltersSchema.parse({}), { page: 1, pageSize: 20 });
});
