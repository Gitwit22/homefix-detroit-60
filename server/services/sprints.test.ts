import assert from "node:assert/strict";
import test from "node:test";

import { detroitProgramCatalog } from "../data/detroitPrograms.js";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost/test";

const { fallbackTriage } = await import("./triage.js");
const { evaluateProgramRules } = await import("./eligibility.js");

test("fallback triage remains conservative and honors resident safety answers", () => {
  const result = fallbackTriage({
    category: "electrical",
    gettingWorse: false,
    safeToOccupy: false,
  });

  assert.equal(result.repairCategory, "electrical");
  assert.equal(result.urgency, "high");
  assert.match(result.observations[0]!, /possible electrical safety concern/i);
  assert.equal(result.safetyFlags.length, 1);
  assert.ok(result.followUpQuestions.some((question) => question.includes("breaker")));
});

test("managed program catalog has stable unique records and complete matching data", () => {
  assert.equal(detroitProgramCatalog.length, 18);
  assert.equal(new Set(detroitProgramCatalog.map((program) => program.id)).size, 18);
  assert.equal(new Set(detroitProgramCatalog.map((program) => program.slug)).size, 18);
  assert.equal(
    detroitProgramCatalog.filter(
      (program) =>
        program.recordType === "resident_program" &&
        !["closed", "transitioning"].includes(program.applicationStatus),
    ).length,
    9,
  );
  assert.equal(
    detroitProgramCatalog.filter((program) =>
      ["closed", "transitioning"].includes(program.applicationStatus),
    ).length,
    7,
  );
  assert.equal(
    detroitProgramCatalog.filter((program) => program.recordType === "funding_layer").length,
    2,
  );

  for (const program of detroitProgramCatalog) {
    assert.match(program.id, /^[0-9a-f-]{36}$/i);
    assert.match(program.sourceUrl, /^https:\/\//);
    assert.ok(program.repairTypes.length > 0);
    if (program.matchable) {
      assert.equal(program.recordType, "resident_program");
      assert.ok(!["closed", "transitioning", "interest_list"].includes(program.applicationStatus));
      assert.ok(program.rules.some((rule) => rule.ruleType === "application_status"));
    }
    if (program.recordType === "funding_layer") {
      assert.equal(program.matchable, false);
      assert.equal(program.applicationUrl, null);
      assert.ok(program.residentEntryPoint);
    }
  }
});

test("Critical Home Repair handles household qualifiers conservatively", () => {
  const critical = detroitProgramCatalog.find((program) => program.slug === "critical-home-repair");
  assert.ok(critical);
  const qualifier = critical.rules.find((rule) => rule.ruleType === "household_qualifier");
  assert.ok(qualifier);

  const baseHome = {
    id: "home",
    residentId: "resident",
    streetAddress: "1 Test St",
    city: "Detroit",
    state: "MI",
    zipCode: "48201",
    occupancyType: "owner",
    primaryResidence: true,
    yearsAtProperty: 1,
    householdSize: 2,
    incomeRange: "$20,000-$30,000",
    applicantAge: 40,
    seniorHousehold: false,
    childrenInHousehold: false,
    accessibilityNeeds: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repairNeed = {
    id: "repair",
    repairCaseId: "case",
    category: "roof_water_intrusion",
    description: "Roof leak",
    startedWhen: null,
    gettingWorse: true,
    safeToOccupy: true,
    urgency: "high",
    status: "reported",
    createdAt: new Date(),
  };
  const rule = {
    id: "rule",
    programId: critical.id,
    ...qualifier,
  };

  for (const qualifyingHome of [
    { ...baseHome, seniorHousehold: true },
    { ...baseHome, applicantAge: 62 },
  ]) {
    const result = evaluateProgramRules({
      home: qualifyingHome,
      repairNeed,
      applicationStatus: "open",
      rules: [rule],
    });
    assert.equal(result.status, "strong_match");
  }

  for (const unverifiedHome of [
    { ...baseHome, childrenInHousehold: true },
    { ...baseHome, accessibilityNeeds: true },
  ]) {
    const result = evaluateProgramRules({
      home: unverifiedHome,
      repairNeed,
      applicationStatus: "open",
      rules: [rule],
    });
    assert.equal(result.status, "verification_needed");
  }

  const result = evaluateProgramRules({
    home: baseHome,
    repairNeed,
    applicationStatus: "open",
    rules: [rule],
  });
  assert.equal(result.status, "not_eligible");
});
