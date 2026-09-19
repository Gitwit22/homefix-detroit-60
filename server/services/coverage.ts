import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { caseEvents, programMatches, programs, repairCases, repairNeeds } from "../db/schema.js";
import type { CoveragePlan } from "../domain/coverage.js";
import { normalizeRepairCategory } from "../domain/repair.js";

const statusPriority: Record<string, number> = {
  strong_match: 0,
  potential_match: 1,
  verification_needed: 2,
  not_eligible: 3,
};

function chooseBestStatus(statuses: string[]) {
  if (statuses.includes("strong_match")) return "strong_match";
  if (statuses.includes("potential_match")) return "potential_match";
  if (statuses.includes("verification_needed")) return "verification_needed";
  return "funding_gap" as const;
}

async function buildCoveragePlan(caseId: string): Promise<CoveragePlan> {
  const needs = await db.select().from(repairNeeds).where(eq(repairNeeds.repairCaseId, caseId));
  const needIds = needs.map((need) => need.id);

  const rawMatches =
    needIds.length > 0
      ? await db
          .select({
            match: programMatches,
            program: programs,
          })
          .from(programMatches)
          .innerJoin(programs, eq(programs.id, programMatches.programId))
          .where(inArray(programMatches.repairNeedId, needIds))
      : [];

  const grouped = new Map<string, typeof rawMatches>();
  for (const row of rawMatches) {
    const list = grouped.get(row.match.repairNeedId) ?? [];
    list.push(row);
    grouped.set(row.match.repairNeedId, list);
  }

  const repairs: CoveragePlan["repairs"] = needs.map((need) => {
    const matches = grouped.get(need.id) ?? [];
    const sorted = matches.slice().sort((a, b) => {
      const aPriority = statusPriority[a.match.matchStatus] ?? 9;
      const bPriority = statusPriority[b.match.matchStatus] ?? 9;
      return aPriority - bPriority;
    });

    const bestStatus = chooseBestStatus(sorted.map((entry) => entry.match.matchStatus));
    const bestProgram = sorted[0]?.program;

    return {
      repairNeedId: need.id,
      category: normalizeRepairCategory(need.category),
      status: bestStatus,
      program: bestProgram ? { id: bestProgram.id, name: bestProgram.name } : null,
    };
  });

  const coveredNeeds = repairs.filter(
    (item) => item.status === "strong_match" || item.status === "potential_match",
  ).length;
  const totalNeeds = repairs.length;
  const fundingGaps = repairs.filter((item) => item.status === "funding_gap").length;
  const coveragePercentage = totalNeeds === 0 ? 0 : Math.round((coveredNeeds / totalNeeds) * 100);

  let nextBestAction: CoveragePlan["nextBestAction"];
  if (repairs.some((item) => item.status === "verification_needed")) {
    nextBestAction = {
      type: "document_required",
      message: "Upload missing eligibility documents to complete verification.",
    };
  } else if (fundingGaps > 0) {
    nextBestAction = {
      type: "funding_gap",
      message: "One or more repair needs have no current resource match.",
    };
  } else if (coveredNeeds > 0) {
    nextBestAction = {
      type: "manual_review",
      message: "Review strongest matches and proceed with applications.",
    };
  } else {
    nextBestAction = {
      type: "monitor",
      message: "Collect additional details to improve matching confidence.",
    };
  }

  return {
    caseId,
    coveragePercentage,
    coveredNeeds,
    totalNeeds,
    fundingGaps,
    repairs,
    nextBestAction,
  };
}

export async function getCoveragePlan(caseId: string): Promise<CoveragePlan> {
  return buildCoveragePlan(caseId);
}

export async function calculateCoveragePlan(caseId: string): Promise<CoveragePlan> {
  const plan = await buildCoveragePlan(caseId);

  await db
    .update(repairCases)
    .set({
      coveragePercentage: plan.coveragePercentage,
      status: "coverage_updated",
      currentStep: "coverage",
      nextAction: plan.nextBestAction.message,
    })
    .where(eq(repairCases.id, caseId));

  await db.insert(caseEvents).values({
    repairCaseId: caseId,
    eventType: "coverage_updated",
    title: "Repair coverage plan updated",
    description: `Potential repair coverage is ${plan.coveragePercentage}%.`,
    metadata: {
      coveredNeeds: plan.coveredNeeds,
      totalNeeds: plan.totalNeeds,
      fundingGaps: plan.fundingGaps,
      coveragePercentage: plan.coveragePercentage,
    },
  });

  return plan;
}
