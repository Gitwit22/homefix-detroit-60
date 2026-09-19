import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  bids,
  caseEvents,
  homes,
  programMatches,
  programs,
  repairAssessments,
  repairCases,
  repairNeeds,
  repairPhotos,
  workOrders,
} from "../db/schema.js";
import {
  bidStatusLabels,
  getOverflowEligibility,
  overflowCapacityStatusLabels,
  overflowFundingStatusLabels,
  workOrderStatusLabels,
} from "../domain/overflow.js";
import {
  normalizeRepairCategory,
  repairCategoryLabels,
  type RepairCategory,
} from "../domain/repair.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OverflowWorkOrderSummary = {
  id: string;
  workOrderNumber: string;
  repairType: RepairCategory;
  repairLabel: string;
  priority: string;
  priorityLabel: string;
  fundingStatus: string;
  fundingStatusLabel: string;
  capacityStatus: string;
  capacityStatusLabel: string;
  status: string;
  statusLabel: string;
  city: string;
  state: string;
  zipCode: string;
  programName: string;
  programSlug: string | null;
  responseCount: number;
  isSynthetic: boolean;
  createdAt: Date;
};

export type OverflowBidRecord = {
  id: string;
  contractorName: string;
  companyName: string;
  estimatedPriceCents: number;
  estimatedDurationDays: number;
  notes: string | null;
  status: string;
  statusLabel: string;
  createdAt: Date;
};

export type OverflowWorkOrderDetail = OverflowWorkOrderSummary & {
  repairCaseId: string;
  caseNumber: string;
  repairNeedId: string;
  description: string;
  assessmentSummary: string | null;
  scope: string;
  photoCount: number;
  photos: Array<{ id: string; imageUrl: string }>;
  requestedAction: string;
  bids: OverflowBidRecord[];
};

export type CreateOverflowJobInput = {
  caseReference: string;
  repairNeedId?: string;
};

export type SubmitBidInput = {
  workOrderReference: string;
  contractorName: string;
  companyName: string;
  estimatedPriceCents: number;
  estimatedDurationDays: number;
  notes?: string;
};

function toPriority(urgency: string): "moderate" | "high" | "critical" {
  if (urgency === "critical") return "critical";
  if (urgency === "high") return "high";
  return "moderate";
}

function toPriorityLabel(priority: string) {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High";
  return "Moderate";
}

function buildPreliminaryScope(input: {
  description: string;
  repairType: RepairCategory;
  priority: string;
  photoCount: number;
}) {
  return [
    "REPORTED CONDITION",
    "",
    input.description,
    "",
    "PRELIMINARY CATEGORY",
    "",
    repairCategoryLabels[input.repairType],
    "",
    "PRIORITY",
    "",
    toPriorityLabel(input.priority),
    "",
    "REQUESTED CONTRACTOR ACTION",
    "",
    `Review the reported ${repairCategoryLabels[input.repairType].toLowerCase()} condition and provide an assessment and estimated repair scope.`,
    "",
    "AVAILABLE INFORMATION",
    "",
    "• Resident repair description",
    "• HomeFix preliminary assessment",
    input.photoCount > 0 ? "• Submitted photographs" : "• No submitted photographs",
    "• Program information",
  ].join("\n");
}

function generateWorkOrderNumber() {
  return `HF-WO-${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")}`;
}

async function resolveCase(caseReference: string) {
  const rows = uuidPattern.test(caseReference)
    ? await db
        .select()
        .from(repairCases)
        .where(eq(repairCases.id, caseReference))
        .limit(1)
    : await db
        .select()
        .from(repairCases)
        .where(eq(repairCases.caseNumber, caseReference))
        .limit(1);
  return rows[0] ?? null;
}

async function resolveWorkOrder(workOrderReference: string) {
  const rows = uuidPattern.test(workOrderReference)
    ? await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, workOrderReference))
        .limit(1)
    : await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.workOrderNumber, workOrderReference))
        .limit(1);
  return rows[0] ?? null;
}

async function resolveRepairNeedForOverflow(caseId: string, caseNumber: string, repairNeedId?: string) {
  const needs = await db.select().from(repairNeeds).where(eq(repairNeeds.repairCaseId, caseId));
  if (needs.length === 0) {
    throw new Error("Case has no repair needs");
  }

  if (repairNeedId) {
    const explicit = needs.find((item) => item.id === repairNeedId);
    if (!explicit) {
      throw new Error("Repair need not found for case");
    }
    return explicit;
  }

  const matches = await db
    .select({ match: programMatches, program: programs })
    .from(programMatches)
    .innerJoin(programs, eq(programs.id, programMatches.programId))
    .where(
      inArray(
        programMatches.repairNeedId,
        needs.map((need) => need.id),
      ),
    );

  const matchByNeed = new Map(matches.map((row) => [row.match.repairNeedId, row.program.slug]));
  for (const need of needs) {
    const repairType = normalizeRepairCategory(need.category);
    const eligibility = getOverflowEligibility({
      caseNumber,
      repairCategory: repairType,
      programSlug: matchByNeed.get(need.id) ?? null,
    });
    if (eligibility.eligible) return need;
  }

  return needs[0] ?? null;
}

async function getProgramMatchForNeed(repairNeedId: string) {
  const matches = await db
    .select({ match: programMatches, program: programs })
    .from(programMatches)
    .innerJoin(programs, eq(programs.id, programMatches.programId))
    .where(eq(programMatches.repairNeedId, repairNeedId));

  const priority = ["strong_match", "potential_match", "verification_needed"];
  matches.sort(
    (left, right) => priority.indexOf(left.match.matchStatus) - priority.indexOf(right.match.matchStatus),
  );
  return matches[0] ?? null;
}

function mapSummary(row: {
  workOrder: typeof workOrders.$inferSelect;
  home: typeof homes.$inferSelect;
  program: typeof programs.$inferSelect;
  responseCount: number;
}): OverflowWorkOrderSummary {
  return {
    id: row.workOrder.id,
    workOrderNumber: row.workOrder.workOrderNumber,
    repairType: normalizeRepairCategory(row.workOrder.repairType),
    repairLabel: repairCategoryLabels[normalizeRepairCategory(row.workOrder.repairType)],
    priority: row.workOrder.priority,
    priorityLabel: toPriorityLabel(row.workOrder.priority),
    fundingStatus: row.workOrder.fundingStatus,
    fundingStatusLabel:
      overflowFundingStatusLabels[
        row.workOrder.fundingStatus as keyof typeof overflowFundingStatusLabels
      ] ?? row.workOrder.fundingStatus,
    capacityStatus: row.workOrder.capacityStatus,
    capacityStatusLabel:
      overflowCapacityStatusLabels[
        row.workOrder.capacityStatus === "overflow" ? "full" : row.workOrder.capacityStatus
      ] ?? row.workOrder.capacityStatus,
    status: row.workOrder.status,
    statusLabel:
      workOrderStatusLabels[row.workOrder.status as keyof typeof workOrderStatusLabels] ??
      row.workOrder.status,
    city: row.home.city,
    state: row.home.state,
    zipCode: row.home.zipCode,
    programName: row.program.name,
    programSlug: row.program.slug,
    responseCount: row.responseCount,
    isSynthetic: row.workOrder.isSynthetic,
    createdAt: row.workOrder.createdAt,
  };
}

export async function listOverflowJobs(): Promise<OverflowWorkOrderSummary[]> {
  const rows = await db
    .select({ workOrder: workOrders, repairCase: repairCases, home: homes, program: programs })
    .from(workOrders)
    .innerJoin(repairCases, eq(repairCases.id, workOrders.repairCaseId))
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .innerJoin(programs, eq(programs.id, workOrders.programId))
    .orderBy(desc(workOrders.createdAt));

  const bidRows = await db.select().from(bids);
  const responseCountByWorkOrderId = bidRows.reduce(
    (accumulator, bid) => accumulator.set(bid.workOrderId, (accumulator.get(bid.workOrderId) ?? 0) + 1),
    new Map<string, number>(),
  );

  return rows.map((row) =>
    mapSummary({
      workOrder: row.workOrder,
      home: row.home,
      program: row.program,
      responseCount: responseCountByWorkOrderId.get(row.workOrder.id) ?? 0,
    }),
  );
}

export async function getWorkOrderBids(workOrderReference: string): Promise<OverflowBidRecord[]> {
  const workOrder = await resolveWorkOrder(workOrderReference);
  if (!workOrder) {
    throw new Error("Work order not found");
  }

  const rows = await db
    .select()
    .from(bids)
    .where(eq(bids.workOrderId, workOrder.id))
    .orderBy(desc(bids.createdAt));

  return rows.map((row) => ({
    id: row.id,
    contractorName: row.contractorName,
    companyName: row.companyName,
    estimatedPriceCents: row.estimatedPriceCents,
    estimatedDurationDays: row.estimatedDurationDays,
    notes: row.notes,
    status: row.status,
    statusLabel: bidStatusLabels[row.status as keyof typeof bidStatusLabels] ?? row.status,
    createdAt: row.createdAt,
  }));
}

export async function getOverflowJob(
  workOrderReference: string,
): Promise<OverflowWorkOrderDetail | null> {
  const workOrder = await resolveWorkOrder(workOrderReference);
  if (!workOrder) return null;

  const rows = await db
    .select({ workOrder: workOrders, repairCase: repairCases, repairNeed: repairNeeds, home: homes, program: programs })
    .from(workOrders)
    .innerJoin(repairCases, eq(repairCases.id, workOrders.repairCaseId))
    .innerJoin(repairNeeds, eq(repairNeeds.id, workOrders.repairNeedId))
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .innerJoin(programs, eq(programs.id, workOrders.programId))
    .where(eq(workOrders.id, workOrder.id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const assessments = await db
    .select()
    .from(repairAssessments)
    .where(eq(repairAssessments.repairNeedId, row.repairNeed.id))
    .orderBy(desc(repairAssessments.createdAt))
    .limit(1);
  const photos = await db
    .select({ id: repairPhotos.id, imageUrl: repairPhotos.imageUrl })
    .from(repairPhotos)
    .where(eq(repairPhotos.repairNeedId, row.repairNeed.id));
  const jobBids = await getWorkOrderBids(row.workOrder.id);

  const summary = mapSummary({
    workOrder: row.workOrder,
    home: row.home,
    program: row.program,
    responseCount: jobBids.length,
  });

  return {
    ...summary,
    repairCaseId: row.repairCase.id,
    caseNumber: row.repairCase.caseNumber,
    repairNeedId: row.repairNeed.id,
    description: row.repairNeed.description,
    assessmentSummary: assessments[0]?.summary ?? null,
    scope: row.workOrder.scope,
    photoCount: photos.length,
    photos,
    requestedAction:
      "Assess the reported repair condition and submit an estimated cost, duration, and notes for program review.",
    bids: jobBids,
  };
}

export async function createOverflowJob(input: CreateOverflowJobInput) {
  const repairCase = await resolveCase(input.caseReference);
  if (!repairCase) {
    throw new Error("Case not found");
  }

  const repairNeed = await resolveRepairNeedForOverflow(
    repairCase.id,
    repairCase.caseNumber,
    input.repairNeedId,
  );
  if (!repairNeed) {
    throw new Error("Repair need not found");
  }

  const existing = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.repairNeedId, repairNeed.id))
    .limit(1);
  if (existing[0]) {
    const workOrder = await getOverflowJob(existing[0].id);
    if (!workOrder) {
      throw new Error("Existing work order could not be loaded");
    }
    return workOrder;
  }

  const match = await getProgramMatchForNeed(repairNeed.id);
  if (!match) {
    throw new Error("No program match is available for this repair need");
  }

  const repairType = normalizeRepairCategory(repairNeed.category);
  const eligibility = getOverflowEligibility({
    caseNumber: repairCase.caseNumber,
    repairCategory: repairType,
    programSlug: match.program.slug,
  });
  if (!eligibility.eligible || !eligibility.config) {
    throw new Error(eligibility.reason);
  }

  const photos = await db
    .select({ id: repairPhotos.id })
    .from(repairPhotos)
    .where(eq(repairPhotos.repairNeedId, repairNeed.id));
  const priority = toPriority(repairNeed.urgency);
  const workOrderNumber = generateWorkOrderNumber();

  const inserted = await db
    .insert(workOrders)
    .values({
      repairCaseId: repairCase.id,
      repairNeedId: repairNeed.id,
      programId: match.program.id,
      workOrderNumber,
      repairType,
      scope: buildPreliminaryScope({
        description: repairNeed.description,
        repairType,
        priority,
        photoCount: photos.length,
      }),
      priority,
      fundingStatus: eligibility.config.fundingStatus,
      capacityStatus: "overflow",
      status: "open",
      isSynthetic: true,
    })
    .returning({ id: workOrders.id });

  await db.insert(caseEvents).values({
    repairCaseId: repairCase.id,
    eventType: "overflow_job_created",
    title: "Overflow job created",
    description: `${workOrderNumber} was opened for contractor response.`,
    metadata: { workOrderNumber, repairNeedId: repairNeed.id },
  });

  const workOrder = await getOverflowJob(inserted[0]!.id);
  if (!workOrder) {
    throw new Error("Overflow job was created but could not be loaded");
  }
  return workOrder;
}

export async function submitBid(input: SubmitBidInput) {
  if (!input.companyName.trim()) throw new Error("Company name is required");
  if (!input.contractorName.trim()) throw new Error("Contractor name is required");
  if (!Number.isInteger(input.estimatedPriceCents) || input.estimatedPriceCents <= 0) {
    throw new Error("Estimated price must be greater than zero");
  }
  if (!Number.isInteger(input.estimatedDurationDays) || input.estimatedDurationDays <= 0) {
    throw new Error("Estimated duration must be greater than zero");
  }

  const workOrder = await resolveWorkOrder(input.workOrderReference);
  if (!workOrder) {
    throw new Error("Work order not found");
  }

  await db.insert(bids).values({
    workOrderId: workOrder.id,
    contractorName: input.contractorName.trim(),
    companyName: input.companyName.trim(),
    estimatedPriceCents: input.estimatedPriceCents,
    estimatedDurationDays: input.estimatedDurationDays,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    status: "submitted",
  });

  await db
    .update(workOrders)
    .set({ status: "bids_received", updatedAt: new Date() })
    .where(eq(workOrders.id, workOrder.id));

  await db.insert(caseEvents).values({
    repairCaseId: workOrder.repairCaseId,
    eventType: "contractor_bid_received",
    title: "Contractor response received",
    description: `A contractor submitted an estimate for ${workOrder.workOrderNumber}.`,
    metadata: { workOrderNumber: workOrder.workOrderNumber },
  });

  const detail = await getOverflowJob(workOrder.id);
  if (!detail) {
    throw new Error("Bid was submitted but the work order could not be loaded");
  }
  return detail;
}
