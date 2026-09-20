import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  caseContacts,
  caseEvents,
  homes,
  inspectionAppointments,
  inspectionAssignments,
  inspectionAvailability,
  inspectionFindings,
  inspectionRequests,
  programMatches,
  repairAssessments,
  repairCases,
  repairNeeds,
  repairPhotos,
  residents,
  type InspectionCaseSnapshot,
  type InspectionQuestion,
} from "../db/schema.js";
import { resolvePrimaryCaseContact } from "../domain/caseContact.js";
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
  .object({ windows: z.array(availabilityWindowSchema).min(3) })
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
});

export const assignInspectionSchema = z.object({
  providerOrganizationId: z.string().uuid().optional(),
  providerOrganizationName: z.string().trim().min(2).max(160),
  assignedWorkerName: z.string().trim().min(2).max(120),
  assignedWorkerPhone: z.string().trim().max(40).optional(),
});

export type InspectionConfirmationActor = {
  id: string;
  displayName: string;
};

export function requireInspectionConfirmationState(status: string) {
  if (status === "assigned") return;
  throw new Error(
    status === "scheduled"
      ? "Inspection is already scheduled. Use reschedule to change the appointment."
      : "Inspection cannot be scheduled in its current state",
  );
}

export function requireInspectionAssignmentState(status: string) {
  if (status === "availability_submitted") return;
  throw new Error(
    status === "assigned" || status === "scheduled" || status === "completed"
      ? "Inspection already has an assigned provider."
      : "Inspection cannot be assigned in its current state",
  );
}

export function requireInspectionRescheduleState(status: string) {
  if (status === "scheduled") return;
  throw new Error(
    status === "completed"
      ? "A completed inspection cannot be rescheduled"
      : "Confirm the inspection before rescheduling it",
  );
}

export function findOfferedInspectionWindow<T extends { start: Date; end: Date }>(
  windows: T[],
  start: string,
  end: string,
) {
  return windows.find(
    (window) =>
      window.start.getTime() === new Date(start).getTime() &&
      window.end.getTime() === new Date(end).getTime(),
  );
}

function isAppointmentConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

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
        trainingSuitability: z.enum(["not_suitable", "potential", "suitable"]),
      }),
    )
    .min(1)
    .max(8),
  questionResponses: z.array(inspectionQuestionResponseSchema).max(40),
});

async function requireViablePathway(caseId: string) {
  const needs = await db
    .select({
      id: repairNeeds.id,
      description: repairNeeds.description,
      category: repairNeeds.category,
    })
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

export async function getInspectionState(caseId: string) {
  const requestRows = await db
    .select()
    .from(inspectionRequests)
    .where(eq(inspectionRequests.repairCaseId, caseId))
    .limit(1);
  const request = requestRows[0];
  if (!request) return null;

  const [windows, assignmentRows, appointmentRows] = await Promise.all([
    db
      .select()
      .from(inspectionAvailability)
      .where(
        and(
          eq(inspectionAvailability.inspectionRequestId, request.id),
          eq(inspectionAvailability.active, true),
        ),
      ),
    db
      .select()
      .from(inspectionAssignments)
      .where(eq(inspectionAssignments.inspectionRequestId, request.id))
      .limit(1),
    db
      .select()
      .from(inspectionAppointments)
      .where(eq(inspectionAppointments.inspectionRequestId, request.id))
      .limit(1),
  ]);
  const assignment = assignmentRows[0] ?? null;
  const appointment = appointmentRows[0] ?? null;

  return {
    ...request,
    availabilityWindows: windows
      .sort((left, right) => left.start.getTime() - right.start.getTime())
      .map((window) => ({ start: window.start.toISOString(), end: window.end.toISOString() })),
    confirmedStart: appointment?.confirmedStart ?? null,
    confirmedEnd: appointment?.confirmedEnd ?? null,
    providerOrganizationId: assignment?.providerOrganizationId ?? null,
    providerOrganizationName: assignment?.providerOrganizationName ?? null,
    assignedToAccountId: assignment?.assignedToAccountId ?? null,
    assignedWorkerName: assignment?.assignedWorkerName ?? null,
    assignedWorkerPhone: assignment?.assignedWorkerPhone ?? null,
    assignedAt: assignment?.assignedAt ?? null,
    providerName: assignment?.assignedWorkerName ?? appointment?.providerName ?? null,
    providerPhone: assignment?.assignedWorkerPhone ?? appointment?.providerPhone ?? null,
    confirmedByDisplayName: appointment?.confirmedByDisplayName ?? null,
    confirmedAt: appointment?.confirmedAt ?? null,
  };
}

export async function listInspectionQueue() {
  const requests = await db
    .select({
      id: inspectionRequests.id,
      caseId: repairCases.id,
      caseNumber: repairCases.caseNumber,
      status: inspectionRequests.status,
      streetAddress: homes.streetAddress,
      zipCode: homes.zipCode,
      residentFirstName: residents.firstName,
      residentLastName: residents.lastName,
      residentPhone: residents.phone,
      residentEmail: residents.email,
      assistantName: caseContacts.name,
      assistantPhone: caseContacts.phone,
      assistantRelationship: caseContacts.relationship,
      assistantIsPrimary: caseContacts.isPrimaryContact,
      requestedAt: inspectionRequests.createdAt,
      updatedAt: inspectionRequests.updatedAt,
      providerOrganizationId: inspectionAssignments.providerOrganizationId,
      providerOrganizationName: inspectionAssignments.providerOrganizationName,
      assignedWorkerName: inspectionAssignments.assignedWorkerName,
      assignedWorkerPhone: inspectionAssignments.assignedWorkerPhone,
      assignedAt: inspectionAssignments.assignedAt,
      appointmentStart: inspectionAppointments.confirmedStart,
      appointmentEnd: inspectionAppointments.confirmedEnd,
      providerName: inspectionAppointments.providerName,
      providerPhone: inspectionAppointments.providerPhone,
      confirmedByDisplayName: inspectionAppointments.confirmedByDisplayName,
      confirmedAt: inspectionAppointments.confirmedAt,
    })
    .from(inspectionRequests)
    .innerJoin(repairCases, eq(repairCases.id, inspectionRequests.repairCaseId))
    .innerJoin(homes, eq(homes.id, repairCases.homeId))
    .innerJoin(residents, eq(residents.id, homes.residentId))
    .leftJoin(caseContacts, eq(caseContacts.repairCaseId, repairCases.id))
    .leftJoin(
      inspectionAssignments,
      eq(inspectionAssignments.inspectionRequestId, inspectionRequests.id),
    )
    .leftJoin(
      inspectionAppointments,
      eq(inspectionAppointments.inspectionRequestId, inspectionRequests.id),
    )
    .orderBy(desc(inspectionRequests.updatedAt));
  if (requests.length === 0) return [];

  const windows = await db
    .select()
    .from(inspectionAvailability)
    .where(
      and(
        inArray(
          inspectionAvailability.inspectionRequestId,
          requests.map((request) => request.id),
        ),
        eq(inspectionAvailability.active, true),
      ),
    );
  return requests.map((request) => {
    const primaryContact = resolvePrimaryCaseContact(
      {
        firstName: request.residentFirstName,
        lastName: request.residentLastName,
        phone: request.residentPhone,
        email: request.residentEmail,
      },
      request.assistantName && request.assistantPhone
        ? {
            contactType: "assistant",
            name: request.assistantName,
            phone: request.assistantPhone,
            relationship: request.assistantRelationship,
            isPrimaryContact: request.assistantIsPrimary ?? false,
          }
        : null,
    );

    return {
      id: request.id,
      caseId: request.caseId,
      caseNumber: request.caseNumber,
      status: request.status,
      streetAddress: request.streetAddress,
      zipCode: request.zipCode,
      primaryContact,
      requestedAt: request.requestedAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      appointmentStart: request.appointmentStart?.toISOString() ?? null,
      appointmentEnd: request.appointmentEnd?.toISOString() ?? null,
      providerOrganizationId: request.providerOrganizationId,
      providerOrganizationName: request.providerOrganizationName,
      assignedWorkerName: request.assignedWorkerName,
      assignedWorkerPhone: request.assignedWorkerPhone,
      assignedAt: request.assignedAt?.toISOString() ?? null,
      providerName: request.assignedWorkerName ?? request.providerName,
      providerPhone: request.assignedWorkerPhone ?? request.providerPhone,
      confirmedByDisplayName: request.confirmedByDisplayName,
      confirmedAt: request.confirmedAt?.toISOString() ?? null,
      availabilityWindows: windows
        .filter((window) => window.inspectionRequestId === request.id)
        .sort((left, right) => left.start.getTime() - right.start.getTime())
        .map((window) => ({ start: window.start.toISOString(), end: window.end.toISOString() })),
    };
  });
}

export async function submitInspectionAvailability(caseId: string, input: unknown) {
  const parsed = inspectionAvailabilitySchema.parse(input);
  await requireViablePathway(caseId);

  const needs = await db
    .select({
      id: repairNeeds.id,
      description: repairNeeds.description,
      category: repairNeeds.category,
    })
    .from(repairNeeds)
    .where(eq(repairNeeds.repairCaseId, caseId));
  const needIds = needs.map((need) => need.id);
  const [assessments, photos] = await Promise.all([
    db.select().from(repairAssessments).where(inArray(repairAssessments.repairNeedId, needIds)),
    db.select().from(repairPhotos).where(inArray(repairPhotos.repairNeedId, needIds)),
  ]);
  const inspectionQuestions = buildInspectionQuestionSnapshot(assessments);
  const assessmentByNeed = new Map(
    assessments.map((assessment) => [assessment.repairNeedId, assessment]),
  );
  const caseSnapshot: InspectionCaseSnapshot = {
    needs: needs.map((need) => {
      const assessment = assessmentByNeed.get(need.id);
      return {
        repairNeedId: need.id,
        description: need.description,
        preliminaryCategory: assessment?.predictedCategory ?? need.category,
        safetyFlags: Array.isArray(assessment?.safetyFlags)
          ? assessment.safetyFlags.filter((flag): flag is string => typeof flag === "string")
          : [],
        trainingOpportunity: assessment?.trainingOpportunity ?? null,
        photos: photos
          .filter((photo) => photo.repairNeedId === need.id)
          .map((photo) => ({ id: photo.id, objectKey: photo.publicId })),
      };
    }),
  };

  await db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(inspectionRequests)
      .values({
        repairCaseId: caseId,
        status: "availability_submitted",
        caseSnapshot,
        inspectionQuestions,
      })
      .onConflictDoUpdate({
        target: inspectionRequests.repairCaseId,
        set: {
          status: "availability_submitted",
          caseSnapshot,
          inspectionQuestions,
          updatedAt: new Date(),
        },
      })
      .returning({ id: inspectionRequests.id });
    const request = rows[0];
    if (!request) throw new Error("Inspection request could not be saved");

    const existingAppointment = await transaction
      .select({ id: inspectionAppointments.id })
      .from(inspectionAppointments)
      .where(eq(inspectionAppointments.inspectionRequestId, request.id))
      .limit(1);
    if (existingAppointment.length > 0) {
      throw new Error("Availability cannot be changed after an appointment is confirmed");
    }

    await transaction
      .delete(inspectionAvailability)
      .where(eq(inspectionAvailability.inspectionRequestId, request.id));
    await transaction.insert(inspectionAvailability).values(
      parsed.windows.map((window) => ({
        inspectionRequestId: request.id,
        start: new Date(window.start),
        end: new Date(window.end),
      })),
    );
    await transaction.insert(caseEvents).values({
      repairCaseId: caseId,
      eventType: "inspection_availability_submitted",
      title: "Inspection availability submitted",
      description: `${parsed.windows.length} acceptable appointment windows were submitted.`,
      metadata: { windows: parsed.windows },
    });
  });
  const lifecycle = await syncCaseLifecycle(caseId);
  return { inspection: await getInspectionState(caseId), lifecycle };
}

export async function assignInspection(
  caseId: string,
  input: unknown,
  actor: InspectionConfirmationActor,
) {
  const parsed = assignInspectionSchema.parse(input);
  const requestRows = await db
    .select()
    .from(inspectionRequests)
    .where(eq(inspectionRequests.repairCaseId, caseId))
    .limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("Resident availability has not been requested");
  requireInspectionAssignmentState(request.status);

  const assignedAt = new Date();
  await db.transaction(async (transaction) => {
    await transaction.insert(inspectionAssignments).values({
      inspectionRequestId: request.id,
      providerOrganizationId: parsed.providerOrganizationId ?? null,
      providerOrganizationName: parsed.providerOrganizationName,
      assignedToAccountId: actor.id,
      assignedWorkerName: parsed.assignedWorkerName,
      assignedWorkerPhone: parsed.assignedWorkerPhone ?? null,
      assignedAt,
    });
    await transaction
      .update(inspectionRequests)
      .set({ status: "assigned", updatedAt: assignedAt })
      .where(eq(inspectionRequests.id, request.id));
    await transaction.insert(caseEvents).values({
      repairCaseId: caseId,
      eventType: "inspector_assigned",
      title: "Inspector assigned",
      description: `${parsed.assignedWorkerName} from ${parsed.providerOrganizationName} accepted the inspection.`,
      metadata: {
        providerOrganizationId: parsed.providerOrganizationId ?? null,
        providerOrganizationName: parsed.providerOrganizationName,
        assignedToAccountId: actor.id,
        assignedWorkerName: parsed.assignedWorkerName,
        assignedWorkerPhone: parsed.assignedWorkerPhone ?? null,
        assignedAt: assignedAt.toISOString(),
      },
    });
  });
  const lifecycle = await syncCaseLifecycle(caseId);
  return { inspection: await getInspectionState(caseId), lifecycle };
}

export async function confirmInspection(
  caseId: string,
  input: unknown,
  actor: InspectionConfirmationActor,
) {
  const parsed = confirmInspectionSchema.parse(input);
  const rows = await db
    .select()
    .from(inspectionRequests)
    .where(eq(inspectionRequests.repairCaseId, caseId))
    .limit(1);
  const request = rows[0];
  if (!request) throw new Error("Resident availability has not been submitted");
  requireInspectionConfirmationState(request.status);
  const [windows, assignmentRows] = await Promise.all([
    db
      .select()
      .from(inspectionAvailability)
      .where(
        and(
          eq(inspectionAvailability.inspectionRequestId, request.id),
          eq(inspectionAvailability.active, true),
        ),
      ),
    db
      .select()
      .from(inspectionAssignments)
      .where(eq(inspectionAssignments.inspectionRequestId, request.id))
      .limit(1),
  ]);
  const assignment = assignmentRows[0];
  if (!assignment) throw new Error("Assign an inspector before confirming the appointment");
  const selectedWindow = findOfferedInspectionWindow(windows, parsed.start, parsed.end);
  if (!selectedWindow) throw new Error("Confirmed appointment must use a resident-provided window");

  const confirmedAt = new Date();
  try {
    await db.transaction(async (transaction) => {
      await transaction.insert(inspectionAppointments).values({
        inspectionRequestId: request.id,
        availabilityId: selectedWindow.id,
        status: "scheduled",
        confirmedStart: new Date(parsed.start),
        confirmedEnd: new Date(parsed.end),
        providerName: assignment.assignedWorkerName,
        providerPhone: assignment.assignedWorkerPhone,
        confirmedByContractorAccountId: actor.id,
        confirmedByDisplayName: actor.displayName,
        confirmedAt,
      });
      await transaction
        .update(inspectionRequests)
        .set({ status: "scheduled", updatedAt: confirmedAt })
        .where(eq(inspectionRequests.id, request.id));
      await transaction.insert(caseEvents).values({
        repairCaseId: caseId,
        eventType: "inspection_scheduled",
        title: "Professional inspection scheduled",
        description: `${actor.displayName} scheduled ${assignment.assignedWorkerName} for the inspection.`,
        metadata: {
          start: parsed.start,
          end: parsed.end,
          providerName: assignment.assignedWorkerName,
          providerPhone: assignment.assignedWorkerPhone,
          confirmedByContractorAccountId: actor.id,
          confirmedByDisplayName: actor.displayName,
          confirmedAt: confirmedAt.toISOString(),
        },
      });
    });
  } catch (error) {
    if (isAppointmentConflict(error)) {
      throw new Error("Inspection is already scheduled. Use reschedule to change the appointment.");
    }
    throw error;
  }
  const lifecycle = await syncCaseLifecycle(caseId);
  return { inspection: await getInspectionState(caseId), lifecycle };
}

export async function rescheduleInspection(
  caseId: string,
  input: unknown,
  actor: InspectionConfirmationActor,
) {
  const parsed = confirmInspectionSchema.parse(input);
  const requestRows = await db
    .select()
    .from(inspectionRequests)
    .where(eq(inspectionRequests.repairCaseId, caseId))
    .limit(1);
  const request = requestRows[0];
  if (!request) throw new Error("Resident availability has not been submitted");
  requireInspectionRescheduleState(request.status);

  const [appointmentRows, windows, assignmentRows] = await Promise.all([
    db
      .select()
      .from(inspectionAppointments)
      .where(eq(inspectionAppointments.inspectionRequestId, request.id))
      .limit(1),
    db
      .select()
      .from(inspectionAvailability)
      .where(
        and(
          eq(inspectionAvailability.inspectionRequestId, request.id),
          eq(inspectionAvailability.active, true),
        ),
      ),
    db
      .select()
      .from(inspectionAssignments)
      .where(eq(inspectionAssignments.inspectionRequestId, request.id))
      .limit(1),
  ]);
  const appointment = appointmentRows[0];
  const assignment = assignmentRows[0];
  if (!appointment) throw new Error("Confirmed inspection appointment was not found");
  if (!assignment) throw new Error("Assigned inspector was not found");
  const selectedWindow = findOfferedInspectionWindow(windows, parsed.start, parsed.end);
  if (!selectedWindow)
    throw new Error("Rescheduled appointment must use a resident-provided window");

  const confirmedAt = new Date();
  await db.transaction(async (transaction) => {
    await transaction
      .update(inspectionAppointments)
      .set({
        availabilityId: selectedWindow.id,
        confirmedStart: new Date(parsed.start),
        confirmedEnd: new Date(parsed.end),
        providerName: assignment.assignedWorkerName,
        providerPhone: assignment.assignedWorkerPhone,
        confirmedByContractorAccountId: actor.id,
        confirmedByDisplayName: actor.displayName,
        confirmedAt,
        updatedAt: confirmedAt,
      })
      .where(eq(inspectionAppointments.id, appointment.id));
    await transaction
      .update(inspectionRequests)
      .set({ updatedAt: confirmedAt })
      .where(eq(inspectionRequests.id, request.id));
    await transaction.insert(caseEvents).values({
      repairCaseId: caseId,
      eventType: "inspection_rescheduled",
      title: "Professional inspection rescheduled",
      description: `${actor.displayName} rescheduled ${assignment.assignedWorkerName} for the inspection.`,
      metadata: {
        previousStart: appointment.confirmedStart.toISOString(),
        previousEnd: appointment.confirmedEnd.toISOString(),
        previousProviderName: appointment.providerName,
        previousProviderPhone: appointment.providerPhone,
        start: parsed.start,
        end: parsed.end,
        providerName: assignment.assignedWorkerName,
        providerPhone: assignment.assignedWorkerPhone,
        confirmedByContractorAccountId: actor.id,
        confirmedByDisplayName: actor.displayName,
        confirmedAt: confirmedAt.toISOString(),
      },
    });
  });
  const lifecycle = await syncCaseLifecycle(caseId);
  return { inspection: await getInspectionState(caseId), lifecycle };
}

export async function recordInspectionFindings(caseId: string, input: unknown) {
  const parsed = inspectionFindingsSchema.parse(input);
  const inspectionRows = await db
    .select()
    .from(inspectionRequests)
    .where(eq(inspectionRequests.repairCaseId, caseId))
    .limit(1);
  const request = inspectionRows[0];
  if (!request || request.status !== "scheduled") {
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
    request.inspectionQuestions,
    parsed.questionResponses,
  );

  await db.transaction(async (transaction) => {
    for (const finding of parsed.findings) {
      await transaction
        .insert(inspectionFindings)
        .values({ inspectionRequestId: request.id, ...finding, completedAt: new Date() })
        .onConflictDoUpdate({
          target: [inspectionFindings.inspectionRequestId, inspectionFindings.repairNeedId],
          set: { ...finding, completedAt: new Date(), updatedAt: new Date() },
        });
    }
    const recorded = await transaction
      .select({ repairNeedId: inspectionFindings.repairNeedId })
      .from(inspectionFindings)
      .where(eq(inspectionFindings.inspectionRequestId, request.id));
    if (new Set(recorded.map((finding) => finding.repairNeedId)).size === needs.length) {
      await transaction
        .update(inspectionRequests)
        .set({
          status: "completed",
          inspectionQuestions: answeredQuestions,
          updatedAt: new Date(),
        })
        .where(eq(inspectionRequests.id, request.id));
    } else {
      await transaction
        .update(inspectionRequests)
        .set({ inspectionQuestions: answeredQuestions, updatedAt: new Date() })
        .where(eq(inspectionRequests.id, request.id));
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
