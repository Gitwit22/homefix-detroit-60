import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  caseEvents,
  documents,
  inspectionFindings,
  inspections,
  programMatches,
  repairAssessments,
  repairCases,
  repairNeeds,
  workOrders,
} from "../db/schema.js";
import { deriveCaseLifecycle, type ProgramApprovalStatus } from "../domain/lifecycle.js";

export async function getCaseLifecycle(caseId: string) {
  const needs = await db
    .select({ id: repairNeeds.id })
    .from(repairNeeds)
    .where(eq(repairNeeds.repairCaseId, caseId));
  const needIds = needs.map((need) => need.id);
  const [assessments, matches, caseDocuments, inspectionRows, orders, matchingEvents] =
    await Promise.all([
      needIds.length
        ? db
            .select({ repairNeedId: repairAssessments.repairNeedId })
            .from(repairAssessments)
            .where(inArray(repairAssessments.repairNeedId, needIds))
        : [],
      needIds.length
        ? db
            .select({ approvalStatus: programMatches.approvalStatus })
            .from(programMatches)
            .where(inArray(programMatches.repairNeedId, needIds))
        : [],
      db
        .select({ status: documents.status })
        .from(documents)
        .where(eq(documents.repairCaseId, caseId)),
      db.select().from(inspections).where(eq(inspections.repairCaseId, caseId)).limit(1),
      db
        .select({ status: workOrders.status, verificationStatus: workOrders.verificationStatus })
        .from(workOrders)
        .where(eq(workOrders.repairCaseId, caseId)),
      db
        .select({ id: caseEvents.id })
        .from(caseEvents)
        .where(
          and(
            eq(caseEvents.repairCaseId, caseId),
            eq(caseEvents.eventType, "program_matching_completed"),
          ),
        )
        .limit(1),
    ]);
  const inspection = inspectionRows[0] ?? null;
  const findings = inspection
    ? await db
        .select({
          repairNeedId: inspectionFindings.repairNeedId,
          verifiedScope: inspectionFindings.verifiedScope,
        })
        .from(inspectionFindings)
        .where(eq(inspectionFindings.inspectionId, inspection.id))
    : [];
  const assessedNeedIds = new Set(assessments.map((assessment) => assessment.repairNeedId));
  const findingNeedIds = new Set(findings.map((finding) => finding.repairNeedId));

  return deriveCaseLifecycle({
    reportComplete: needs.length > 0,
    screeningComplete:
      needs.length > 0 &&
      assessedNeedIds.size === needs.length &&
      (matchingEvents.length > 0 || matches.length > 0),
    viablePathwayCount: matches.length,
    inspectionRequested: Boolean(inspection),
    inspectionCompleted: inspection?.status === "completed",
    scopeVerified:
      needs.length > 0 &&
      findingNeedIds.size === needs.length &&
      findings.every((finding) => finding.verifiedScope.trim().length > 0),
    documentsVerified:
      caseDocuments.length === 0 ||
      caseDocuments.every((document) => document.status === "verified"),
    approvalStatuses: matches.map((match) => match.approvalStatus as ProgramApprovalStatus),
    workOrderCreated: orders.length > 0,
    workCompleted: orders.length > 0 && orders.every((order) => order.status === "completed"),
    completionVerified:
      orders.length > 0 && orders.every((order) => order.verificationStatus === "verified"),
  });
}

export async function syncCaseLifecycle(caseId: string) {
  const lifecycle = await getCaseLifecycle(caseId);
  await db
    .update(repairCases)
    .set({
      status: lifecycle.complete ? "completed" : lifecycle.stage,
      currentStep: lifecycle.stage,
      nextAction: lifecycle.nextAction,
      updatedAt: new Date(),
    })
    .where(eq(repairCases.id, caseId));
  return lifecycle;
}
