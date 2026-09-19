export const programRuleTypes = [
  "city",
  "zip_code",
  "occupancy_type",
  "primary_residence",
  "minimum_age",
  "senior_household",
  "children_in_household",
  "accessibility_need",
  "household_qualifier",
  "lead_household_qualifier",
  "disaster_tie_back",
  "geographic_eligibility",
  "income_limit",
  "repair_type",
  "application_status",
] as const;

export type ProgramRuleType = (typeof programRuleTypes)[number];

export const programRuleOperators = ["equals", "not_equals", "in", "lte", "gte", "any_of"] as const;
export type ProgramRuleOperator = (typeof programRuleOperators)[number];

export const matchStatuses = [
  "strong_match",
  "potential_match",
  "verification_needed",
  "not_eligible",
] as const;
export type MatchStatus = (typeof matchStatuses)[number];

export type RuleResult = {
  passed: boolean | null;
  ruleType: ProgramRuleType;
  required: boolean;
  reason: string;
};
