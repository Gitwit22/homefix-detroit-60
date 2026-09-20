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

export const matchStatusLabels: Record<MatchStatus, string> = {
  strong_match: "Strong Match",
  potential_match: "Potential Match",
  verification_needed: "Verification Needed",
  not_eligible: "Not Eligible",
};

export function toMatchStatusLabel(status: string): string {
  return matchStatusLabels[status as MatchStatus] ?? "Not Eligible";
}

export type RuleResult = {
  passed: boolean | null;
  ruleType: ProgramRuleType;
  required: boolean;
  reason: string;
};
