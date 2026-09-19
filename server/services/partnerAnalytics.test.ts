import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PARTNER_DEMO_SEED,
  PARTNER_DEMO_GENERATED_AT,
  generateSyntheticPartnerDataset,
  syntheticProgramCapacities,
} from "../demo/partnerDataset.js";
import { calculatePartnerAnalytics, getPartnerCaseDetail } from "./partnerAnalytics.js";

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
