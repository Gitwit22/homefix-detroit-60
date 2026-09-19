import { eq } from "drizzle-orm";
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

  const triage = await runRepairTriage({ caseId: need.repairCaseId, repairNeedId });
  const matches = await runMatchingForCase(need.repairCaseId);
  const coverage = await calculateCoveragePlan(need.repairCaseId);

  await db
    .update(repairCases)
    .set({
      status: "intelligence_completed",
      currentStep: "coverage",
      nextAction: coverage.nextBestAction.message,
    })
    .where(eq(repairCases.id, need.repairCaseId));

  await db.insert(caseEvents).values({
    repairCaseId: need.repairCaseId,
    eventType: "intelligence_pipeline_completed",
    title: "Repair intelligence pipeline completed",
    description: "Assessment, matching, and coverage updates are complete.",
    metadata: {
      repairNeedId,
      matches: matches.length,
      coveragePercentage: coverage.coveragePercentage,
    },
  });

  return {
    caseId: need.repairCaseId,
    repairNeedId,
    triage,
    matches,
    coverage,
  };
}
