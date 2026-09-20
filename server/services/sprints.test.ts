import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { detroitProgramCatalog } from "../data/detroitPrograms.js";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost/test";

const { buildTriageWebhookPayload, fallbackTriage } = await import("./triage.js");
const { triageResponseSchema } = await import("../validation/triage.js");
const { triageRepairCategories, triageUrgencies } = await import("../domain/repair.js");
const { demoSessionSchema } = await import("./demoSession.js");
const {
  contractorRegistrationSchema,
  contractorSignInSchema,
  hashContractorPin,
  verifyContractorPin,
} = await import("./contractorAccess.js");
const { evaluateProgramRules } = await import("./eligibility.js");
const { createOverflowWorkOrderSchema, submitOverflowBidSchema } = await import("./overflow.js");
const {
  applyInspectionQuestionResponses,
  buildInspectionQuestionSnapshot,
  inspectionAvailabilitySchema,
  inspectionFindingsSchema,
} = await import("./inspection.js");
const { loadSavedDemoAssessment, loadSavedDemoMatch } = await import("../demo/deniseScenario.js");

test("saved Denise assessments are deterministic and isolated per call", () => {
  const first = loadSavedDemoAssessment("roof_water_intrusion");
  const second = loadSavedDemoAssessment("roof_water_intrusion");

  assert.ok(first);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.repairCategory, "roof_water_intrusion");
  assert.equal(first.urgency, "high");
  assert.ok(first.observations.some((observation) => /water/i.test(observation)));
  assert.equal(loadSavedDemoAssessment("plumbing"), null);
  for (const category of ["roof_water_intrusion", "hvac", "electrical"] as const) {
    const assessment = loadSavedDemoAssessment(category);
    assert.ok(assessment);
    assert.equal(triageResponseSchema.safeParse(assessment).success, true);
    assert.ok(assessment.followUpQuestions.every((question) => /^Verify\b/.test(question)));
  }
});

test("saved Denise matches produce two covered needs and an electrical funding gap", () => {
  const categories = ["roof_water_intrusion", "hvac", "electrical"] as const;
  const matches = categories.map((category) => loadSavedDemoMatch(category));

  assert.equal(matches.filter(Boolean).length, 2);
  assert.equal(Math.round((matches.filter(Boolean).length / categories.length) * 100), 67);
  assert.deepEqual(matches[0], {
    programSlug: "critical-home-repair",
    matchStatus: "strong_match",
    approvalStatus: "pending",
  });
  assert.equal(matches[2], null);
});

test("Overflow requests enforce the minimal job and bid contract", () => {
  assert.equal(
    createOverflowWorkOrderSchema.safeParse({ repairNeedId: "not-a-uuid" }).success,
    false,
  );
  assert.equal(
    submitOverflowBidSchema.safeParse({
      contractorName: "Detroit Roofing Cooperative",
      estimatedPrice: 18_500,
      estimatedDurationDays: 14,
      notes: "Can begin within five business days.",
    }).success,
    true,
  );
  assert.equal(
    submitOverflowBidSchema.safeParse({
      contractorName: "D",
      estimatedPrice: -1,
      estimatedDurationDays: 0,
      notes: "",
    }).success,
    false,
  );
});

test("fallback triage remains conservative and honors resident safety answers", () => {
  const result = fallbackTriage({
    category: "electrical",
    gettingWorse: false,
    safetyStatus: "unsafe",
  });

  assert.equal(result.repairCategory, "electrical");
  assert.equal(result.urgency, "high");
  assert.match(result.observations[0]!, /possible electrical safety concern/i);
  assert.equal(result.safetyFlags.length, 1);
  assert.ok(result.followUpQuestions.some((question) => question.includes("breaker")));

  const unsure = fallbackTriage({
    category: "electrical",
    gettingWorse: false,
    safetyStatus: "unsure",
  });
  assert.equal(unsure.urgency, "high");
  assert.match(unsure.safetyFlags[0]!, /unsure/i);
  assert.deepEqual(unsure.trainingOpportunity, {
    status: "requires_inspection",
    reason:
      "Training suitability cannot be determined from the available information and requires professional inspection.",
    possibleSkills: [],
  });
});

test("triage webhook payload uses the exact n8n contract", () => {
  const payload = buildTriageWebhookPayload({
    caseId: "11111111-1111-4111-8111-111111111111",
    repairNeedId: "22222222-2222-4222-8222-222222222222",
    category: "carpentry",
    description: "Damaged framing near the rear door.",
    gettingWorse: true,
    safetyStatus: "unsure",
    imageUrls: [],
  });

  assert.deepEqual(Object.keys(payload), [
    "caseId",
    "repairNeedId",
    "reportedCategory",
    "description",
    "gettingWorse",
    "safeToOccupy",
    "imageUrls",
  ]);
  assert.equal(payload.reportedCategory, "other");
  assert.equal(payload.safeToOccupy, false);
  assert.equal(
    buildTriageWebhookPayload({ ...payload, category: "hvac", safetyStatus: "safe" }).safeToOccupy,
    true,
  );
});

test("triage enums match the n8n contract", () => {
  assert.deepEqual(triageRepairCategories, [
    "roof_water_intrusion",
    "hvac",
    "plumbing",
    "electrical",
    "windows_doors",
    "accessibility",
    "lead_environmental",
    "structural",
    "other",
  ]);
  assert.deepEqual(triageUrgencies, ["low", "moderate", "high", "critical"]);
});

test("n8n workflow preserves auth, vision, inspector, and top-level response contracts", () => {
  const workflow = JSON.parse(readFileSync("n8n/homefix-triage.workflow.json", "utf8")) as {
    nodes: Array<{ id: string; parameters: Record<string, unknown> }>;
  };
  const node = (id: string) => {
    const match = workflow.nodes.find((item) => item.id === id);
    assert.ok(match, `Missing n8n node ${id}`);
    return match;
  };
  const webhook = node("homefix-webhook");
  const requestValidation = String(node("validate-request").parameters["jsCode"]);
  const modelRequest = String(node("structured-triage").parameters["jsonBody"]);
  const responseValidation = String(node("validate-response").parameters["jsCode"]);
  const response = node("respond");

  assert.equal(webhook.parameters["authentication"], "headerAuth");
  assert.match(requestValidation, /safeToOccupy/);
  assert.doesNotMatch(requestValidation, /safetyStatus/);
  assert.match(modelRequest, /Generate 1–5 concise questions an on-site inspector should verify\./);
  assert.match(modelRequest, /\.\.\.\$json\.imageUrls\.map/);
  assert.match(modelRequest, /type: 'image_url'/);
  assert.match(modelRequest, /safeToOccupy/);
  assert.doesNotMatch(modelRequest, /safetyStatus/);
  assert.doesNotMatch(
    responseValidation,
    /carpentry|drywall_plaster|concrete_masonry|flooring|painting_finishing/,
  );
  for (const field of [
    "repairCategory",
    "urgency",
    "summary",
    "observations",
    "safetyFlags",
    "followUpQuestions",
    "confidence",
    "trainingOpportunity",
  ]) {
    assert.match(responseValidation, new RegExp(field));
  }
  assert.equal(response.parameters["responseBody"], "={{ $json }}");
  assert.equal(
    workflow.nodes.some((item) => /postgres|neon|eligibility/i.test(item.id)),
    false,
  );
});

test("triage responses require a bounded preliminary training opportunity", () => {
  const base = fallbackTriage({
    category: "windows_doors",
    gettingWorse: false,
    safetyStatus: "safe",
  });

  assert.equal(triageResponseSchema.safeParse(base).success, true);
  assert.equal(base.trainingOpportunity.status, "requires_inspection");
  assert.equal(
    triageResponseSchema.safeParse({ ...base, trainingOpportunity: undefined }).success,
    false,
  );
  assert.equal(triageResponseSchema.safeParse({ output: base }).success, false);
  assert.equal(triageResponseSchema.safeParse({ data: base }).success, false);
  assert.equal(
    triageResponseSchema.safeParse({
      ...base,
      trainingOpportunity: {
        status: "approved",
        reason: "AI cannot approve training work.",
        possibleSkills: [],
      },
    }).success,
    false,
  );
  assert.equal(
    triageResponseSchema.safeParse({
      ...base,
      trainingOpportunity: {
        status: "potential",
        reason: "Possible supervised work.",
        possibleSkills: Array.from({ length: 9 }, (_, index) => `skill ${index}`),
      },
    }).success,
    false,
  );
});

test("inspection availability requires multiple unique future windows", () => {
  const start = new Date(Date.now() + 86_400_000);
  const valid = Array.from({ length: 7 }, (_, index) => {
    const windowStart = new Date(start.getTime() + index * 24 * 60 * 60 * 1_000);
    const windowEnd = new Date(windowStart.getTime() + 3 * 60 * 60 * 1_000);
    return { start: windowStart.toISOString(), end: windowEnd.toISOString() };
  });

  assert.equal(
    inspectionAvailabilitySchema.safeParse({ windows: valid.slice(0, 6) }).success,
    true,
  );
  assert.equal(
    inspectionAvailabilitySchema.safeParse({ windows: valid.slice(0, 1) }).success,
    false,
  );
  assert.equal(inspectionAvailabilitySchema.safeParse({ windows: valid }).success, false);
  assert.equal(
    inspectionAvailabilitySchema.safeParse({ windows: [valid[0], valid[0]] }).success,
    false,
  );
});

test("inspection findings require an authoritative training suitability", () => {
  const finding = {
    repairNeedId: "11111111-1111-4111-8111-111111111111",
    confirmedCategory: "electrical",
    urgency: "high",
    condition: "Unsafe panel condition observed.",
    verifiedScope: "Replace the damaged service panel.",
  };

  assert.equal(
    inspectionFindingsSchema.safeParse({
      findings: [{ ...finding, trainingSuitability: "not_suitable" }],
      questionResponses: [],
    }).success,
    true,
  );
  assert.equal(
    inspectionFindingsSchema.safeParse({ findings: [finding], questionResponses: [] }).success,
    false,
  );
});

test("inspection questions preserve repair ownership and require a complete response set", () => {
  let id = 0;
  const questions = buildInspectionQuestionSnapshot(
    [
      { repairNeedId: "11111111-1111-4111-8111-111111111111", followUpQuestions: [" First? "] },
      {
        repairNeedId: "22222222-2222-4222-8222-222222222222",
        followUpQuestions: ["Second?", null],
      },
    ],
    () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
  );

  assert.deepEqual(
    questions.map(({ repairNeedId, question }) => ({ repairNeedId, question })),
    [
      { repairNeedId: "11111111-1111-4111-8111-111111111111", question: "First?" },
      { repairNeedId: "22222222-2222-4222-8222-222222222222", question: "Second?" },
    ],
  );

  const completed = applyInspectionQuestionResponses(questions, [
    {
      id: questions[0]!.id,
      repairNeedId: questions[0]!.repairNeedId,
      answer: "Observed during the visit.",
      unableToVerify: false,
    },
    {
      id: questions[1]!.id,
      repairNeedId: questions[1]!.repairNeedId,
      answer: null,
      unableToVerify: true,
    },
  ]);
  assert.equal(completed[0]!.answer, "Observed during the visit.");
  assert.equal(completed[1]!.unableToVerify, true);
  assert.throws(() => applyInspectionQuestionResponses(questions, []), /exactly one response/i);
  assert.throws(
    () =>
      applyInspectionQuestionResponses(questions, [
        {
          id: questions[0]!.id,
          repairNeedId: questions[0]!.repairNeedId,
          answer: "",
          unableToVerify: false,
        },
      ]),
    /answer or mark/i,
  );
});

test("demo sessions require a concise display name and four-digit PIN", () => {
  assert.equal(
    demoSessionSchema.safeParse({ displayName: "  Denise  ", pin: "3130" }).success,
    true,
  );
  assert.equal(demoSessionSchema.safeParse({ displayName: "   ", pin: "3130" }).success, false);
  assert.equal(
    demoSessionSchema.safeParse({ displayName: "D".repeat(81), pin: "3130" }).success,
    false,
  );
  assert.equal(demoSessionSchema.safeParse({ displayName: "Denise", pin: "313" }).success, false);
  assert.equal(demoSessionSchema.safeParse({ displayName: "Denise", pin: "31A0" }).success, false);
});

test("contractor sign-in requires a name and exactly four numeric digits", () => {
  assert.equal(
    contractorSignInSchema.safeParse({ displayName: "  Reed Residential Services  ", pin: "3130" })
      .success,
    true,
  );
  assert.equal(contractorSignInSchema.safeParse({ displayName: "   ", pin: "3130" }).success, false);
  assert.equal(
    contractorSignInSchema.safeParse({ displayName: "R".repeat(121), pin: "3130" }).success,
    false,
  );
  assert.equal(
    contractorSignInSchema.safeParse({ displayName: "Reed Residential", pin: "313" }).success,
    false,
  );
  assert.equal(
    contractorSignInSchema.safeParse({ displayName: "Reed Residential", pin: "31A0" }).success,
    false,
  );
});

test("contractor registration requires an explicit compliance acknowledgment", () => {
  const credentials = { displayName: "Reed Residential", pin: "3130" };
  assert.equal(
    contractorRegistrationSchema.safeParse({
      ...credentials,
      contractorComplianceConfirmed: true,
    }).success,
    true,
  );
  assert.equal(contractorRegistrationSchema.safeParse(credentials).success, false);
  assert.equal(
    contractorRegistrationSchema.safeParse({
      ...credentials,
      contractorComplianceConfirmed: false,
    }).success,
    false,
  );
});

test("contractor PIN hashes verify without storing the original code", async () => {
  const hash = await hashContractorPin("3130");
  assert.doesNotMatch(hash, /3130/);
  assert.equal(await verifyContractorPin("3130", hash), true);
  assert.equal(await verifyContractorPin("9999", hash), false);
  assert.equal(await verifyContractorPin("3130", "invalid"), false);
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
    repairRole: "PRIMARY" as const,
    parentRepairNeedId: null,
    category: "roof_water_intrusion",
    description: "Roof leak",
    startedWhen: null,
    gettingWorse: true,
    safetyStatus: "safe" as const,
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
