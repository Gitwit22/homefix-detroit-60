import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  caseEvents,
  repairAssessments,
  repairCases,
  repairNeeds,
  repairPhotos,
} from "../db/schema.js";
import { normalizeRepairCategory } from "../domain/repair.js";
import { triageResponseSchema, type TriageResponse } from "../validation/triage.js";

const triageWebhookUrl = process.env.N8N_TRIAGE_WEBHOOK_URL;
const triageSecret = process.env.N8N_HOMEFIX_SECRET;

async function callTriageWebhook(payload: unknown): Promise<TriageResponse> {
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
  });

  if (!response.ok) {
    throw new Error(`Triage webhook returned ${response.status}`);
  }

  const body = await response.json();
  return triageResponseSchema.parse(body);
}

function fallbackTriage(category: string): TriageResponse {
  const normalized = normalizeRepairCategory(category);
  return {
    repairCategory: normalized,
    urgency: "moderate",
    summary:
      "The reported conditions appear consistent with a possible repair issue that warrants professional evaluation.",
    observations: ["Resident-reported issue captured", "Photo and text need follow-up review"],
    safetyFlags: [],
    followUpQuestions: [
      "Has the condition changed recently?",
      "Are there immediate safety concerns?",
    ],
    confidence: 0.35,
  };
}

export async function runRepairTriage(input: { caseId: string; repairNeedId: string }) {
  const { caseId, repairNeedId } = input;

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

  const webhookPayload = {
    caseId,
    repairNeedId,
    description: need.description,
    reportedCategory: normalizeRepairCategory(need.category),
    gettingWorse: need.gettingWorse,
    safeToOccupy: need.safeToOccupy,
    imageUrls: photos.map((photo) => photo.imageUrl),
  };

  let triage: TriageResponse;
  let model = "homefix-triage-v1";
  try {
    triage = await callTriageWebhook(webhookPayload);
  } catch (error) {
    triage = fallbackTriage(need.category);
    model = "homefix-triage-fallback-v1";
    console.error(error);
  }

  await db.delete(repairAssessments).where(eq(repairAssessments.repairNeedId, repairNeedId));

  await db.insert(repairAssessments).values({
    repairNeedId,
    predictedCategory: triage.repairCategory,
    urgency: triage.urgency,
    summary: triage.summary,
    observations: triage.observations,
    safetyFlags: triage.safetyFlags,
    followUpQuestions: triage.followUpQuestions,
    confidence: String(triage.confidence),
    model,
  });

  await db
    .update(repairNeeds)
    .set({
      category: triage.repairCategory,
      urgency: triage.urgency,
      status: "assessed",
    })
    .where(eq(repairNeeds.id, repairNeedId));

  await db.insert(caseEvents).values({
    repairCaseId: caseId,
    eventType: "repair_assessed",
    title: "Preliminary repair assessment completed",
    description: triage.summary,
    metadata: {
      urgency: triage.urgency,
      repairCategory: triage.repairCategory,
      confidence: triage.confidence,
      model,
    },
  });

  await db
    .update(repairCases)
    .set({
      status: "assessment_completed",
      currentStep: "assessment",
      nextAction: "Review potential program matches",
    })
    .where(eq(repairCases.id, caseId));

  return {
    repairNeedId,
    model,
    ...triage,
  };
}
