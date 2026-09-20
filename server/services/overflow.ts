import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  homes,
  overflowBids,
  overflowWorkOrders,
  programMatches,
  programs,
  repairCases,
  repairNeeds,
} from "../db/schema.js";
import {
  DEFAULT_PARTNER_DEMO_SEED,
  PARTNER_DEMO_GENERATED_AT,
  generateSyntheticPartnerDataset,
  syntheticProgramCapacities,
} from "../demo/partnerDataset.js";
import { DENISE_DEMO_SCENARIO } from "../demo/deniseScenario.js";
import { calculatePartnerAnalytics } from "./partnerAnalytics.js";

const criticalHomeRepairCapacity = calculatePartnerAnalytics(
  generateSyntheticPartnerDataset(),
  syntheticProgramCapacities,
  DEFAULT_PARTNER_DEMO_SEED,
  PARTNER_DEMO_GENERATED_AT,
).programCapacity.find((program) => program.programId === "critical-home-repair");

export const createOverflowWorkOrderSchema = z.object({
  repairNeedId: z.string().uuid(),
});

export const submitOverflowBidSchema = z.object({
  contractorName: z.string().trim().min(2).max(120),
  estimatedPrice: z.number().positive().max(1_000_000),
  estimatedDurationDays: z.number().int().min(1).max(365),
  notes: z.string().trim().min(3).max(2_000),
});

export async function listOverflowCandidates() {
  const rows = await db
    .select({
      repairCaseId: repairCases.id,
      caseNumber: repairCases.caseNumber,
      repairNeedId: repairNeeds.id,
      category: repairNeeds.category,
      description: repairNeeds.description,
      priority: repairNeeds.urgency,
      streetAddress: homes.streetAddress,
      zipCode: homes.zipCode,
      programId: programs.id,
      programName: programs.name,
    })
    .from(programMatches)
    .innerJoin(repairNeeds, eq(repairNeeds.id, programMatches.repairNeedId))
    .innerJoin(repairCases, eq(repairCases.id, repairNeeds.repairCaseId))
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .innerJoin(programs, eq(programs.id, programMatches.programId))
    .where(
      and(
        eq(programMatches.approvalStatus, "approved"),
        eq(repairCases.demoScenario, DENISE_DEMO_SCENARIO),
        eq(programs.slug, "critical-home-repair"),
      ),
    );

  const needIds = rows.map((row) => row.repairNeedId);
  const existing =
    needIds.length === 0
      ? []
      : await db
          .select({ id: overflowWorkOrders.id, repairNeedId: overflowWorkOrders.repairNeedId })
          .from(overflowWorkOrders)
          .where(inArray(overflowWorkOrders.repairNeedId, needIds));
  const workOrderByNeed = new Map(existing.map((item) => [item.repairNeedId, item.id]));

  return rows.map((row) => ({
    ...row,
    workOrderId: workOrderByNeed.get(row.repairNeedId) ?? null,
    approvalStatus: "approved" as const,
    capacity: {
      status: criticalHomeRepairCapacity?.status ?? "limited",
      matchedNeeds: criticalHomeRepairCapacity?.matchedNeeds ?? 0,
      simulatedCapacity: criticalHomeRepairCapacity?.simulatedCapacity ?? 0,
      excessDemand: criticalHomeRepairCapacity?.excessDemand ?? 0,
    },
    synthetic: true as const,
  }));
}

export async function createOverflowWorkOrder(input: z.infer<typeof createOverflowWorkOrderSchema>) {
  const parsed = createOverflowWorkOrderSchema.parse(input);
  const candidate = (await listOverflowCandidates()).find(
    (item) => item.repairNeedId === parsed.repairNeedId,
  );
  if (!candidate) throw new Error("Approved synthetic overflow candidate not found");
  if (candidate.capacity.excessDemand <= 0) throw new Error("Program is not over capacity");
  if (candidate.workOrderId) return getOverflowWorkOrder(candidate.workOrderId);

  const workOrderNumber = `HF-OVF-${candidate.repairNeedId.slice(0, 8).toUpperCase()}`;
  const inserted = await db
    .insert(overflowWorkOrders)
    .values({
      repairCaseId: candidate.repairCaseId,
      repairNeedId: candidate.repairNeedId,
      programId: candidate.programId,
      workOrderNumber,
      scope: "Roof-envelope assessment, moisture review, and repair estimate.",
      priority: candidate.priority,
    })
    .onConflictDoNothing({ target: overflowWorkOrders.repairNeedId })
    .returning({ id: overflowWorkOrders.id });

  const workOrderId = inserted[0]?.id;
  if (workOrderId) return getOverflowWorkOrder(workOrderId);

  const existing = await db
    .select({ id: overflowWorkOrders.id })
    .from(overflowWorkOrders)
    .where(eq(overflowWorkOrders.repairNeedId, candidate.repairNeedId))
    .limit(1);
  if (!existing[0]) throw new Error("Overflow work order could not be created");
  return getOverflowWorkOrder(existing[0].id);
}

export async function listOverflowWorkOrders() {
  const rows = await db
    .select({ id: overflowWorkOrders.id })
    .from(overflowWorkOrders)
    .orderBy(desc(overflowWorkOrders.createdAt));
  return Promise.all(rows.map((row) => getOverflowWorkOrder(row.id)));
}

export async function getOverflowWorkOrder(workOrderId: string) {
  const rows = await db
    .select({
      id: overflowWorkOrders.id,
      workOrderNumber: overflowWorkOrders.workOrderNumber,
      repairCaseId: overflowWorkOrders.repairCaseId,
      repairNeedId: overflowWorkOrders.repairNeedId,
      scope: overflowWorkOrders.scope,
      priority: overflowWorkOrders.priority,
      status: overflowWorkOrders.status,
      createdAt: overflowWorkOrders.createdAt,
      caseNumber: repairCases.caseNumber,
      category: repairNeeds.category,
      description: repairNeeds.description,
      streetAddress: homes.streetAddress,
      zipCode: homes.zipCode,
      programName: programs.name,
    })
    .from(overflowWorkOrders)
    .innerJoin(repairCases, eq(repairCases.id, overflowWorkOrders.repairCaseId))
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .innerJoin(repairNeeds, eq(repairNeeds.id, overflowWorkOrders.repairNeedId))
    .innerJoin(programs, eq(programs.id, overflowWorkOrders.programId))
    .where(eq(overflowWorkOrders.id, workOrderId))
    .limit(1);
  const workOrder = rows[0];
  if (!workOrder) return null;

  const bids = await db
    .select()
    .from(overflowBids)
    .where(eq(overflowBids.workOrderId, workOrderId))
    .orderBy(desc(overflowBids.createdAt));

  return {
    ...workOrder,
    bids: bids.map((bid) => ({
      id: bid.id,
      contractorName: bid.contractorName,
      estimatedPrice: bid.estimatedPriceCents / 100,
      estimatedDurationDays: bid.estimatedDurationDays,
      notes: bid.notes,
      status: bid.status,
      createdAt: bid.createdAt,
      synthetic: true as const,
    })),
    synthetic: true as const,
  };
}

export async function submitOverflowBid(
  workOrderId: string,
  input: z.infer<typeof submitOverflowBidSchema>,
) {
  const parsed = submitOverflowBidSchema.parse(input);
  const workOrder = await getOverflowWorkOrder(workOrderId);
  if (!workOrder) throw new Error("Overflow work order not found");

  await db.insert(overflowBids).values({
    workOrderId,
    contractorName: parsed.contractorName,
    estimatedPriceCents: Math.round(parsed.estimatedPrice * 100),
    estimatedDurationDays: parsed.estimatedDurationDays,
    notes: parsed.notes,
  });

  return getOverflowWorkOrder(workOrderId);
}
