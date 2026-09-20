import { z } from "zod";
import { triageRepairCategories, triageUrgencies } from "../domain/repair.js";

export const trainingOpportunitySchema = z
  .object({
    status: z.enum(["not_suitable", "potential", "requires_inspection"]),
    reason: z.string().min(1),
    possibleSkills: z.array(z.string()).max(8),
  })
  .strict();

export const triageResponseSchema = z
  .object({
    repairCategory: z.enum(triageRepairCategories),
    urgency: z.enum(triageUrgencies),
    summary: z.string().min(1),
    observations: z.array(z.string().min(1)).max(6),
    safetyFlags: z.array(z.string().min(1)).max(6),
    followUpQuestions: z.array(z.string().min(1)).max(5),
    confidence: z.number().min(0).max(1),
    trainingOpportunity: trainingOpportunitySchema,
  })
  .strict();

export type TriageResponse = z.infer<typeof triageResponseSchema>;
export type TrainingOpportunity = TriageResponse["trainingOpportunity"];
