import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  caseEvents,
  repairAssessments,
  repairCases,
  repairNeeds,
  repairPhotos,
} from "../db/schema.js";
import { DENISE_DEMO_SCENARIO, loadSavedDemoAssessment } from "../demo/deniseScenario.js";
import { normalizeRepairCategory, normalizeTriageRepairCategory } from "../domain/repair.js";
import { triageResponseSchema, type TriageResponse } from "../validation/triage.js";
import { signedPhotoUrl } from "./photos.js";

const triageWebhookUrl = process.env.N8N_TRIAGE_WEBHOOK_URL;
const triageSecret = process.env.N8N_HOMEFIX_SECRET;

export function buildTriageWebhookPayload(input: {
  caseId: string;
  repairNeedId: string;
  category: string;
  description: string;
  gettingWorse: boolean;
  safetyStatus: "safe" | "unsafe" | "unsure";
  imageUrls: string[];
}) {
  return {
    caseId: input.caseId,
    repairNeedId: input.repairNeedId,
    reportedCategory: normalizeTriageRepairCategory(input.category),
    description: input.description,
    gettingWorse: input.gettingWorse,
    safeToOccupy: input.safetyStatus === "safe",
    imageUrls: input.imageUrls,
  };
}

async function callTriageWebhook(payload: unknown): Promise<TriageResponse> {
  if (process.env.HOMEFIX_FORCE_AI_FAILURE === "1") {
    throw new Error("AI_REQUEST_FAILED");
  }
  if (!triageWebhookUrl || !triageSecret) {
    throw new Error("N8N triage webhook is not configured");
  }

  const response = await fetch(triageWebhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + triageSecret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(Number(process.env.HOMEFIX_TRIAGE_TIMEOUT_MS ?? 25_000)),
  });

  if (!response.ok) {
    throw new Error(`Triage webhook returned ${response.status}`);
  }

  const body = await response.json();
  return triageResponseSchema.parse(body);
}

const fallbackDetails: Record<string, { observation: string; question: string }> = {
  roof_water_intrusion: {
    observation: "The resident report appears consistent with possible water intrusion.",
    question: "Verify whether water enters during rainfall or any ceiling area is sagging.",
  },
  hvac: {
    observation: "The resident report indicates unreliable or unavailable home heating.",
    question: "Verify whether the system produces heat, unusual odors, or visible smoke.",
  },
  electrical: {
    observation: "The resident report indicates a possible electrical safety concern.",
    question: "Verify any sparks, burning odors, warm outlets, or repeated breaker trips.",
  },
};

export function fallbackTriage(input: {
  category: string;
  gettingWorse: boolean;
  safetyStatus: "safe" | "unsafe" | "unsure";
}): TriageResponse {
  const normalized = normalizeTriageRepairCategory(input.category);
  const details = fallbackDetails[normalized] ?? {
    observation: "The resident-reported condition requires professional evaluation.",
    question: "Verify whether the condition has changed or created an immediate safety concern.",
  };
  return {
    repairCategory: normalized,
    urgency: input.safetyStatus !== "safe" || input.gettingWorse ? "high" : "moderate",
    summary:
      "The reported conditions appear consistent with a possible repair issue that warrants professional evaluation.",
    observations: [details.observation, "Photo and description require professional review."],
    safetyFlags:
      input.safetyStatus === "safe"
        ? []
        : input.safetyStatus === "unsafe"
          ? ["Resident reported that the home may not be safe to occupy."]
          : ["Resident is unsure whether the home is safe to occupy; partner review is required."],
    followUpQuestions: [details.question, "Verify whether the condition has changed recently."],
    confidence: 0.35,
    trainingOpportunity: {
      status: "requires_inspection",
      reason:
        "Training suitability cannot be determined from the available information and requires professional inspection.",
      possibleSkills: [],
    },
  };
}

export async function runRepairTriage(input: { caseId: string; repairNeedId: string }) {
  const { caseId, repairNeedId } = input;

  const caseRows = await db
    .select({ demoScenario: repairCases.demoScenario })
    .from(repairCases)
    .where(eq(repairCases.id, caseId))
    .limit(1);
  const foundCase = caseRows[0];
  if (!foundCase) {
    throw new Error("Case not found");
  }

  const needRows = await db
    .select()
    .from(repairNeeds)
    .where(and(eq(repairNeeds.id, repairNeedId), eq(repairNeeds.repairCaseId, caseId)))
    .limit(1);
  const need = needRows[0];

  if (!need) {
    throw new Error("Repair need not found");
  }

  const photos = await db
    .select()
    .from(repairPhotos)
    .where(eq(repairPhotos.repairNeedId, repairNeedId));

  let triage: TriageResponse;
  let model = "homefix-triage-v1";
  let failureCode: "AI_REQUEST_FAILED" | undefined;
  try {
    const imageUrls = await Promise.all(
      photos.map((photo) =>
        photo.publicId && photo.imageUrl.startsWith("r2://")
          ? signedPhotoUrl(photo.publicId)
          : photo.imageUrl,
      ),
    );
    const webhookPayload = buildTriageWebhookPayload({
      caseId,
      repairNeedId,
      category: need.category,
      description: need.description,
      gettingWorse: need.gettingWorse,
      safetyStatus: need.safetyStatus,
      imageUrls,
    });
    triage = await callTriageWebhook(webhookPayload);
  } catch (error) {
    const savedAssessment =
      foundCase.demoScenario === DENISE_DEMO_SCENARIO
        ? loadSavedDemoAssessment(normalizeRepairCategory(need.category))
        : null;
    triage =
      savedAssessment ??
      fallbackTriage({
        category: need.category,
        gettingWorse: need.gettingWorse,
        safetyStatus: need.safetyStatus,
      });
    model = savedAssessment ? "homefix-saved-demo-v1" : "homefix-triage-fallback-v1";
    failureCode = "AI_REQUEST_FAILED";
    console.error(error);
  }

  await db.transaction(async (transaction) => {
    await transaction
      .insert(repairAssessments)
      .values({
        repairNeedId,
        predictedCategory: triage.repairCategory,
        urgency: triage.urgency,
        summary: triage.summary,
        observations: triage.observations,
        safetyFlags: triage.safetyFlags,
        followUpQuestions: triage.followUpQuestions,
        confidence: String(triage.confidence),
        trainingOpportunity: triage.trainingOpportunity,
        model,
      })
      .onConflictDoUpdate({
        target: repairAssessments.repairNeedId,
        set: {
          predictedCategory: triage.repairCategory,
          urgency: triage.urgency,
          summary: triage.summary,
          observations: triage.observations,
          safetyFlags: triage.safetyFlags,
          followUpQuestions: triage.followUpQuestions,
          confidence: String(triage.confidence),
          trainingOpportunity: triage.trainingOpportunity,
          model,
        },
      });

    await transaction
      .update(repairNeeds)
      .set({
        category:
          foundCase.demoScenario === DENISE_DEMO_SCENARIO ? need.category : triage.repairCategory,
        urgency: triage.urgency,
        status: "assessed",
      })
      .where(eq(repairNeeds.id, repairNeedId));

    await transaction
      .delete(caseEvents)
      .where(
        and(
          eq(caseEvents.repairCaseId, caseId),
          eq(caseEvents.eventType, `repair_assessed:${repairNeedId}`),
        ),
      );
    await transaction.insert(caseEvents).values({
      repairCaseId: caseId,
      eventType: `repair_assessed:${repairNeedId}`,
      title: "Repair report normalized",
      description: triage.summary,
      metadata: {
        urgency: triage.urgency,
        repairCategory: triage.repairCategory,
        confidence: triage.confidence,
        model,
        ...(failureCode ? { failureCode } : {}),
      },
    });

    await transaction
      .update(repairCases)
      .set({
        status: "initial_eligibility",
        currentStep: "initial_eligibility",
        nextAction: "Check the report against current program requirements.",
      })
      .where(eq(repairCases.id, caseId));
  });

  return {
    repairNeedId,
    model,
    ...(failureCode ? { failureCode } : {}),
    ...triage,
  };
}
