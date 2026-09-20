import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  caseEvents,
  inspectionFindings,
  inspections,
  programMatches,
  repairAssessments,
  repairNeeds,
  type InspectionQuestion,
} from "../db/schema.js";
import { repairCategories, triageUrgencies } from "../domain/repair.js";
import { syncCaseLifecycle } from "./lifecycle.js";

const availabilityWindowSchema = z
  .object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
  })
  .refine((window) => new Date(window.end) > new Date(window.start), {
    message: "Availability window must end after it starts",
  });

export const inspectionAvailabilitySchema = z
  .object({ windows: z.array(availabilityWindowSchema).min(2).max(6) })
  .superRefine(({ windows }, context) => {
    const starts = new Set<string>();
    for (const [index, window] of windows.entries()) {
      if (new Date(window.start) <= new Date()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["windows", index, "start"],
          message: "Availability windows must be in the future",
        });
      }
      if (starts.has(window.start)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["windows", index, "start"],
          message: "Availability windows must be unique",
        });
      }
      starts.add(window.start);
    }
  });

export const confirmInspectionSchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  providerName: z.string().trim().min(2).max(120),
  providerPhone: z.string().trim().max(40).optional(),
});

export const inspectionQuestionResponseSchema = z
  .object({
    id: z.string().uuid(),
    repairNeedId: z.string().uuid(),
    answer: z.string().trim().max(4_000).nullable(),
    unableToVerify: z.boolean(),
  })
  .superRefine((response, context) => {
    const hasAnswer = Boolean(response.answer?.trim());
    if (hasAnswer === response.unableToVerify) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "Provide an answer or mark the question unable to verify",
      });
    }
  });

export type InspectionQuestionResponse = z.infer<typeof inspectionQuestionResponseSchema>;

export function buildInspectionQuestionSnapshot(
  assessments: Array<{ repairNeedId: string; followUpQuestions: unknown }>,
  createId: () => string = () => crypto.randomUUID(),
): InspectionQuestion[] {
  return assessments.flatMap((assessment) =>
    Array.isArray(assessment.followUpQuestions)
      ? assessment.followUpQuestions.flatMap((question) =>
          typeof question === "string" && question.trim()
            ? [
                {
                  id: createId(),
                  repairNeedId: assessment.repairNeedId,
                  question: question.trim(),
                  answer: null,
                  unableToVerify: false,
                },
              ]
            : [],
        )
      : [],
  );
}

export function applyInspectionQuestionResponses(
  questions: InspectionQuestion[],
  input: unknown,
): InspectionQuestion[] {
  const responses = z.array(inspectionQuestionResponseSchema).parse(input);
  const responseById = new Map(responses.map((response) => [response.id, response]));
  if (responseById.size !== responses.length || responseById.size !== questions.length) {
    throw new Error("Every inspection question must have exactly one response");
  }

  return questions.map((question) => {
    const response = responseById.get(question.id);
    if (!response || response.repairNeedId !== question.repairNeedId) {
      throw new Error("Inspection question response does not match this inspection");
    }
    return {
      ...question,
      answer: response.unableToVerify ? null : response.answer!.trim(),
      unableToVerify: response.unableToVerify,
    };
  });
}

export const inspectionFindingsSchema = z.object({
  findings: z
    .array(
      z.object({
        repairNeedId: z.string().uuid(),
        confirmedCategory: z.enum(repairCategories),
        urgency: z.enum(triageUrgencies),
        condition: z.string().trim().min(3).max(2_000),
        notes: z.string().trim().max(4_000).optional(),
        verifiedScope: z.string().trim().min(3).max(8_000),
        estimatedCostCents: z.number().int().positive().max(100_000_000).optional(),
      }),
    )
    .min(1)
    .max(8),
  questionResponses: z.array(inspectionQuestionResponseSchema).max(40),
});

async function requireViablePathway(caseId: string) {
  const needs = await db
    .select({ id: repairNeeds.id })
    .from(repairNeeds)
    .where(eq(repairNeeds.repairCaseId, caseId));
  if (needs.length === 0) throw new Error("Case has no reported repair needs");
  const matches = await db
    .select({ id: programMatches.id })
    .from(programMatches)
    .where(
      inArray(
        programMatches.repairNeedId,
        needs.map((need) => need.id),
      ),
    )
    .limit(1);
  if (matches.length === 0)
    throw new Error("A potential program pathway is required before scheduling an inspection");
}

export async function submitInspectionAvailability(caseId: string, input: unknown) {
  const parsed = inspectionAvailabilitySchema.parse(input);
  await requireViablePathway(caseId);

  const needs = await db
    .select({ id: repairNeeds.id })
    .from(repairNeeds)
    .where(eq(repairNeeds.repairCaseId, caseId));
  const assessments = await db
    .select({
      repairNeedId: repairAssessments.repairNeedId,
      followUpQuestions: repairAssessments.followUpQuestions,
    })
    .from(repairAssessments)
    .where(
      inArray(
        repairAssessments.repairNeedId,
        needs.map((need) => need.id),
      ),
    );
  const inspectionQuestions = buildInspectionQuestionSnapshot(assessments);

  const rows = await db
    .insert(inspections)
    .values({
      repairCaseId: caseId,
      status: "availability_submitted",
      availabilityWindows: parsed.windows,
      inspectionQuestions,
    })
    .onConflictDoUpdate({
      target: inspections.repairCaseId,
      set: {
        status: "availability_submitted",
        availabilityWindows: parsed.windows,
        confirmedStart: null,
        confirmedEnd: null,
        providerName: null,
        providerPhone: null,
        updatedAt: new Date(),
      },
    })
    .returning();
  await db.insert(caseEvents).values({
    repairCaseId: caseId,
    eventType: "inspection_availability_submitted",
    title: "Inspection availability submitted",
    description: `${parsed.windows.length} acceptable appointment windows were submitted.`,
    metadata: { windows: parsed.windows },
  });
  const lifecycle = await syncCaseLifecycle(caseId);
  return { inspection: rows[0]!, lifecycle };
}

export async function confirmInspection(caseId: string, input: unknown) {
  const parsed = confirmInspectionSchema.parse(input);
  const rows = await db
    .select()
    .from(inspections)
    .where(eq(inspections.repairCaseId, caseId))
    .limit(1);
  const inspection = rows[0];
  if (!inspection) throw new Error("Resident availability has not been submitted");
  const selectedWindow = inspection.availabilityWindows.some(
    (window) => window.start === parsed.start && window.end === parsed.end,
  );
  if (!selectedWindow) throw new Error("Confirmed appointment must use a resident-provided window");

  const updated = await db
    .update(inspections)
    .set({
      status: "scheduled",
      confirmedStart: new Date(parsed.start),
      confirmedEnd: new Date(parsed.end),
      providerName: parsed.providerName,
      providerPhone: parsed.providerPhone ?? null,
      updatedAt: new Date(),
    })
    .where(eq(inspections.id, inspection.id))
    .returning();
  await db.insert(caseEvents).values({
    repairCaseId: caseId,
    eventType: "inspection_scheduled",
    title: "Professional inspection scheduled",
    description: `${parsed.providerName} confirmed the inspection appointment.`,
    metadata: { start: parsed.start, end: parsed.end },
  });
  const lifecycle = await syncCaseLifecycle(caseId);
  return { inspection: updated[0]!, lifecycle };
}

export async function recordInspectionFindings(caseId: string, input: unknown) {
  const parsed = inspectionFindingsSchema.parse(input);
  const inspectionRows = await db
    .select()
    .from(inspections)
    .where(eq(inspections.repairCaseId, caseId))
    .limit(1);
  const inspection = inspectionRows[0];
  if (!inspection || inspection.status !== "scheduled") {
    throw new Error("A confirmed inspection is required before recording findings");
  }
  const needs = await db
    .select({ id: repairNeeds.id })
    .from(repairNeeds)
    .where(eq(repairNeeds.repairCaseId, caseId));
  const needIds = new Set(needs.map((need) => need.id));
  if (parsed.findings.some((finding) => !needIds.has(finding.repairNeedId))) {
    throw new Error("Inspection finding does not belong to this case");
  }
  const answeredQuestions = applyInspectionQuestionResponses(
    inspection.inspectionQuestions,
    parsed.questionResponses,
  );

  await db.transaction(async (transaction) => {
    for (const finding of parsed.findings) {
      await transaction
        .insert(inspectionFindings)
        .values({ inspectionId: inspection.id, ...finding, completedAt: new Date() })
        .onConflictDoUpdate({
          target: [inspectionFindings.inspectionId, inspectionFindings.repairNeedId],
          set: { ...finding, completedAt: new Date(), updatedAt: new Date() },
        });
    }
    const recorded = await transaction
      .select({ repairNeedId: inspectionFindings.repairNeedId })
      .from(inspectionFindings)
      .where(eq(inspectionFindings.inspectionId, inspection.id));
    if (new Set(recorded.map((finding) => finding.repairNeedId)).size === needs.length) {
      await transaction
        .update(inspections)
        .set({
          status: "completed",
          inspectionQuestions: answeredQuestions,
          updatedAt: new Date(),
        })
        .where(eq(inspections.id, inspection.id));
    } else {
      await transaction
        .update(inspections)
        .set({ inspectionQuestions: answeredQuestions, updatedAt: new Date() })
        .where(eq(inspections.id, inspection.id));
    }
    await transaction.insert(caseEvents).values({
      repairCaseId: caseId,
      eventType: "inspection_findings_recorded",
      title: "Professional inspection findings recorded",
      description: `${parsed.findings.length} repair finding${parsed.findings.length === 1 ? " was" : "s were"} recorded.`,
      metadata: {
        repairNeedIds: parsed.findings.map((finding) => finding.repairNeedId),
        answeredQuestions: answeredQuestions.filter((question) => question.answer).length,
        unableToVerifyQuestions: answeredQuestions.filter((question) => question.unableToVerify)
          .length,
      },
    });
  });
  const lifecycle = await syncCaseLifecycle(caseId);
  return { lifecycle };
}
