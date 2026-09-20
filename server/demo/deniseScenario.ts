import type { RepairCategory } from "../domain/repair.js";
import type { TriageResponse } from "../validation/triage.js";

export const DENISE_DEMO_SCENARIO = "denise-carter-pitch-v1";

type DeniseMatch = {
  programSlug: "critical-home-repair" | "wayne-metro-weatherization";
  matchStatus: "strong_match" | "potential_match";
  approvalStatus: "approved" | "pending";
};

const savedMatches: Partial<Record<RepairCategory, DeniseMatch>> = {
  roof_water_intrusion: {
    programSlug: "critical-home-repair",
    matchStatus: "strong_match",
    approvalStatus: "approved",
  },
  hvac: {
    programSlug: "wayne-metro-weatherization",
    matchStatus: "potential_match",
    approvalStatus: "pending",
  },
};

const savedAssessments: Record<"roof_water_intrusion" | "hvac" | "electrical", TriageResponse> = {
  roof_water_intrusion: {
    repairCategory: "roof_water_intrusion",
    urgency: "high",
    summary:
      "The uploaded roof photo and resident report are consistent with active water intrusion that needs professional inspection.",
    observations: [
      "Ceiling staining and damp material are consistent with water entering from above.",
      "The reported spread after heavy rain suggests the roof envelope should be inspected promptly.",
    ],
    safetyFlags: ["Keep people and belongings away from any sagging or actively dripping ceiling area."],
    followUpQuestions: [
      "Does water enter only during rainfall?",
      "Is any part of the ceiling sagging or soft?",
    ],
    confidence: 0.91,
  },
  hvac: {
    repairCategory: "hvac",
    urgency: "high",
    summary:
      "The reported intermittent furnace failure warrants prompt evaluation by a qualified heating professional.",
    observations: [
      "The furnace is reported to stop producing heat intermittently.",
      "Loss of reliable heat can become a household safety concern in cold weather.",
    ],
    safetyFlags: ["Stop using the system and leave the home if smoke or a gas odor is present."],
    followUpQuestions: [
      "Does the thermostat remain powered when heat stops?",
      "Are there unusual odors, sounds, or visible smoke?",
    ],
    confidence: 0.86,
  },
  electrical: {
    repairCategory: "electrical",
    urgency: "high",
    summary:
      "Sparking and unreliable outlets indicate a potential electrical hazard requiring professional evaluation.",
    observations: [
      "The resident reports outlets that spark or stop working.",
      "The affected circuit should not be used until it is evaluated by a licensed electrician.",
    ],
    safetyFlags: ["Do not use an outlet that sparks, feels warm, smells burned, or shows discoloration."],
    followUpQuestions: [
      "Do breakers trip when the affected outlets are used?",
      "Are there burning odors, warm cover plates, or visible discoloration?",
    ],
    confidence: 0.94,
  },
};

export function loadSavedDemoAssessment(category: RepairCategory): TriageResponse | null {
  if (!(category in savedAssessments)) return null;
  return structuredClone(savedAssessments[category as keyof typeof savedAssessments]);
}

export function loadSavedDemoMatch(category: RepairCategory): DeniseMatch | null {
  const match = savedMatches[category];
  return match ? { ...match } : null;
}
