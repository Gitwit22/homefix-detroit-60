import assert from "node:assert/strict";
import test from "node:test";

import { detroitProgramCatalog } from "../data/detroitPrograms.js";

process.env.DATABASE_URL ||= "postgresql://test:test@localhost/test";

const { fallbackTriage } = await import("./triage.js");

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
  assert.equal(detroitProgramCatalog.length, 5);
  assert.equal(new Set(detroitProgramCatalog.map((program) => program.id)).size, 5);
  assert.equal(new Set(detroitProgramCatalog.map((program) => program.slug)).size, 5);

  for (const program of detroitProgramCatalog) {
    assert.match(program.id, /^[0-9a-f-]{36}$/i);
    assert.match(program.sourceUrl, /^https:\/\//);
    assert.ok(program.repairTypes.length > 0);
    assert.ok(program.rules.some((rule) => rule.ruleType === "application_status"));
    assert.ok(program.requiredDocuments.length > 0);
  }
});
