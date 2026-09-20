import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { caseEvents, repairCases, repairNeeds } from "../db/schema.js";
import { calculateCoveragePlan } from "./coverage.js";
import { runMatchingForCase } from "./matching.js";
import { runRepairTriage } from "./triage.js";

export async function processRepair(repairNeedId: string) {
  const needRows = await db
    .select()
    .from(repairNeeds)
    .where(eq(repairNeeds.id, repairNeedId))
    .limit(1);
  const need = needRows[0];
  if (!need) {
    throw new Error("Repair need not found");
  }

  const result = await processCase(need.repairCaseId);

  return {
    ...result,
    repairNeedId,
    triage: result.triage.find((item) => item.repairNeedId === repairNeedId),
  };
}

export async function processCase(caseId: string) {
  const needs = await db.select().from(repairNeeds).where(eq(repairNeeds.repairCaseId, caseId));
  if (needs.length === 0) {
    throw new Error("Case has no repair needs");
  }

  const triage = [];
  for (const need of needs) {
    triage.push(await runRepairTriage({ caseId, repairNeedId: need.id }));
  }

  const matches = await runMatchingForCase(caseId);
  const coverage = await calculateCoveragePlan(caseId);

  await db
    .update(repairCases)
    .set({
      status: "intelligence_completed",
      currentStep: "coverage",
      nextAction: coverage.nextBestAction.message,
    })
    .where(eq(repairCases.id, caseId));

  await db
    .delete(caseEvents)
    .where(
      and(
        eq(caseEvents.repairCaseId, caseId),
        eq(caseEvents.eventType, "intelligence_pipeline_completed"),
      ),
    );
  await db.insert(caseEvents).values({
    repairCaseId: caseId,
    eventType: "intelligence_pipeline_completed",
    title: "Repair intelligence pipeline completed",
    description: "Assessment, matching, and coverage updates are complete.",
    metadata: {
      repairNeedIds: needs.map((need) => need.id),
      matches: matches.length,
      coveragePercentage: coverage.coveragePercentage,
    },
  });

  return {
    caseId,
    triage,
    matches,
    coverage,
  };
}
