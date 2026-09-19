import { z } from "zod";
import { programRuleOperators, programRuleTypes } from "../domain/eligibility.js";

export const programRuleSchema = z.object({
  ruleType: z.enum(programRuleTypes),
  operator: z.enum(programRuleOperators),
  value: z.unknown(),
  required: z.boolean().default(true),
});

export type ProgramRuleInput = z.infer<typeof programRuleSchema>;
