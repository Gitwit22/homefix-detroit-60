import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PARTNER_DEMO_SEED,
  PARTNER_DEMO_GENERATED_AT,
  generateSyntheticPartnerDataset,
  syntheticProgramCapacities,
} from "../demo/partnerDataset.js";
import { calculatePartnerAnalytics, getPartnerCaseDetail } from "./partnerAnalytics.js";
import { matchesPartnerPriority, parsePartnerCaseFilters } from "../../src/lib/partner-filters.js";

test("the partner dataset is deterministic and normalized", () => {
  const first = generateSyntheticPartnerDataset();
  const second = generateSyntheticPartnerDataset();
  assert.deepEqual(first, second);
  assert.equal(first.length, 224);
  assert.equal(new Set(first.map((fact) => fact.homeId)).size, 150);
  assert.equal(new Set(first.map((fact) => fact.repairNeedId)).size, 224);
  assert.equal(new Set(first.map((fact) => fact.zipCode)).size, 8);

  for (const fact of first) {
    assert.equal(fact.synthetic, true);
    if (fact.coverageStatus === "funding_gap") assert.equal(fact.programId, undefined);
    else assert.ok(fact.programId);
  }

  const canonicalProgramIds = new Set([
    "critical-home-repair",
    "wayne-metro-weatherization",
    "detroit-leadsafe-housing",
  ]);
  for (const fact of first) {
    if (fact.programId) assert.ok(canonicalProgramIds.has(fact.programId));
    if (fact.coverageStatus === "funding_gap") {
      assert.notEqual(fact.caseStatus, "repair_scheduled");
    }
  }

  const statusesByCase = new Map<string, Set<string>>();
  for (const fact of first) {
    statusesByCase.set(fact.caseId, statusesByCase.get(fact.caseId) ?? new Set());
    statusesByCase.get(fact.caseId)!.add(fact.caseStatus);
  }
  for (const statuses of statusesByCase.values()) assert.equal(statuses.size, 1);

  const denise = first.filter((fact) => fact.caseId === "HF-313-0842");
  assert.ok(denise.length > 0);
  assert.ok(denise.every((fact) => fact.propertyLabel === "123 Main Street"));
  assert.ok(denise.every((fact) => fact.zipCode === "48205"));
});

test("high-priority drill-down includes high and critical priorities", () => {
  const filters = parsePartnerCaseFilters({ priorityGroup: "high_priority" });
  assert.equal(matchesPartnerPriority("critical", filters), true);
  assert.equal(matchesPartnerPriority("high", filters), true);
  assert.equal(matchesPartnerPriority("moderate", filters), false);
  assert.equal(matchesPartnerPriority("low", filters), false);

  const facts = generateSyntheticPartnerDataset();
  const analytics = calculatePartnerAnalytics(
    facts,
    syntheticProgramCapacities,
    DEFAULT_PARTNER_DEMO_SEED,
    PARTNER_DEMO_GENERATED_AT,
  );
  assert.equal(
    facts.filter((fact) => matchesPartnerPriority(fact.priority, filters)).length,
    analytics.totals.highPriorityRepairs,
  );
});

test("analytics totals reconcile with grouped metrics", () => {
  const facts = generateSyntheticPartnerDataset();
  const analytics = calculatePartnerAnalytics(
    facts,
    syntheticProgramCapacities,
    DEFAULT_PARTNER_DEMO_SEED,
    PARTNER_DEMO_GENERATED_AT,
  );
  assert.equal(analytics.totals.homes, 150);
  assert.equal(analytics.totals.repairNeeds, 224);
  assert.equal(analytics.cases.length, 150);
  assert.equal(
    analytics.byRepairType.reduce((sum, metric) => sum + metric.repairNeeds, 0),
    224,
  );
  assert.equal(
    analytics.byZipCode.reduce((sum, metric) => sum + metric.repairNeeds, 0),
    224,
  );
  assert.equal(
    analytics.byRepairType.reduce((sum, metric) => sum + metric.unmatched, 0),
    analytics.totals.unmatchedNeeds,
  );
  assert.equal(
    analytics.coverage.unmatchedPercentage,
    Math.round((analytics.totals.unmatchedNeeds / 224) * 100),
  );
});

test("priority queue and capacity overage follow locked definitions", () => {
  const facts = generateSyntheticPartnerDataset();
  const analytics = calculatePartnerAnalytics(
    facts,
    syntheticProgramCapacities,
    DEFAULT_PARTNER_DEMO_SEED,
    PARTNER_DEMO_GENERATED_AT,
  );
  const firstHigh = analytics.highPriorityCases.findIndex((item) => item.priority === "high");
  const lastCritical = analytics.highPriorityCases.reduce(
    (lastIndex, item, index) => (item.priority === "critical" ? index : lastIndex),
    -1,
  );
  assert.ok(firstHigh === -1 || lastCritical < firstHigh);
  for (const capacity of analytics.programCapacity) {
    assert.equal(
      capacity.excessDemand,
      Math.max(0, capacity.matchedNeeds - capacity.simulatedCapacity),
    );
  }
  const detail = getPartnerCaseDetail(facts, analytics.cases[0]!.caseId);
  assert.ok(detail);
  assert.equal(detail.needs.length, detail.repairNeeds);
});

test("preliminary workforce opportunities reconcile without exposing addresses", () => {
  const facts = generateSyntheticPartnerDataset().slice(0, 3);
  facts[0]!.trainingOpportunity = {
    status: "potential",
    reason: "Interior restoration may support supervised finish work.",
    possibleSkills: ["drywall repair", "painting and finishing"],
  };
  facts[1]!.trainingOpportunity = {
    status: "requires_inspection",
    reason: "Inspection may identify supervised accessibility work.",
    possibleSkills: ["grab bar installation"],
  };
  facts[2]!.trainingOpportunity = {
    status: "not_suitable",
    reason: "Licensed trade work is required.",
    possibleSkills: [],
  };

  const analytics = calculatePartnerAnalytics(
    facts,
    syntheticProgramCapacities,
    DEFAULT_PARTNER_DEMO_SEED,
    PARTNER_DEMO_GENERATED_AT,
  );

  assert.equal(analytics.workforceOpportunities.total, 2);
  assert.equal(
    analytics.workforceOpportunities.byDiscipline.reduce((sum, item) => sum + item.count, 0),
    2,
  );
  assert.equal(analytics.workforceOpportunities.byDiscipline[0]!.count, 1);
  assert.equal(analytics.workforceOpportunities.byDiscipline[3]!.count, 1);
  assert.equal("propertyLabel" in analytics.workforceOpportunities.opportunities[0]!, false);
});
