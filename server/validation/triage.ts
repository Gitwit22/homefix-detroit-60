import { z } from "zod";
import { repairCategories, triageUrgencies } from "../domain/repair.js";

export const triageResponseSchema = z.object({
  repairCategory: z.enum(repairCategories),
  urgency: z.enum(triageUrgencies),
  summary: z.string().min(1),
  observations: z.array(z.string().min(1)).max(6),
  safetyFlags: z.array(z.string().min(1)).max(6),
  followUpQuestions: z.array(z.string().min(1)).max(5),
  confidence: z.number().min(0).max(1),
});

export type TriageResponse = z.infer<typeof triageResponseSchema>;
