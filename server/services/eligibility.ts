import type { InferSelectModel } from "drizzle-orm";
import { homes, programRules, repairNeeds } from "../db/schema.js";
import type { MatchStatus, RuleResult } from "../domain/eligibility.js";
import { normalizeRepairCategory } from "../domain/repair.js";
import { programRuleSchema } from "../validation/program-rules.js";

type Home = InferSelectModel<typeof homes>;
type ProgramRule = InferSelectModel<typeof programRules>;
type RepairNeed = InferSelectModel<typeof repairNeeds>;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function parseIncomeRange(rangeText: string | null): { min: number; max: number } | null {
  if (!rangeText) return null;
  const numbers = rangeText
    .match(/\d+[\d,]*/g)
    ?.map((value) => Number(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
  if (!numbers || numbers.length === 0) return null;
  if (numbers.length === 1) return { min: numbers[0]!, max: numbers[0]! };
  const [first, second] = numbers;
  return { min: Math.min(first!, second!), max: Math.max(first!, second!) };
}

function evaluateIncomeLimit(home: Home, value: unknown) {
  const limit = Number(value);
  const range = parseIncomeRange(home.incomeRange);
  if (!Number.isFinite(limit)) {
    return { passed: null, reason: "Income limit could not be evaluated" };
  }
  if (!range) {
    return { passed: null, reason: "Income information is missing" };
  }
  if (range.max <= limit) {
    return { passed: true, reason: "Income range is within the program threshold" };
  }
  if (range.min > limit) {
    return { passed: false, reason: "Income range appears above the program threshold" };
  }
  return { passed: null, reason: "Income range overlaps the threshold; verification required" };
}

export function evaluateProgramRules(input: {
  home: Home;
  repairNeed: RepairNeed;
  applicationStatus: string;
  rules: ProgramRule[];
}) {
  const { home, repairNeed, applicationStatus, rules } = input;

  const evaluations: RuleResult[] = rules.map((rule) => {
    const parsed = programRuleSchema.safeParse({
      ruleType: rule.ruleType,
      operator: rule.operator,
      value: rule.value,
      required: rule.required,
    });

    if (!parsed.success) {
      return {
        passed: null,
        ruleType: "application_status",
        required: rule.required,
        reason: "Rule configuration is invalid",
      };
    }

    const { ruleType, operator, value, required } = parsed.data;

    if (ruleType === "income_limit") {
      const incomeResult = evaluateIncomeLimit(home, value);
      return { passed: incomeResult.passed, ruleType, required, reason: incomeResult.reason };
    }

    let candidate: unknown;
    switch (ruleType) {
      case "city":
        candidate = home.city;
        break;
      case "zip_code":
        candidate = home.zipCode;
        break;
      case "occupancy_type":
        candidate = home.occupancyType;
        break;
      case "primary_residence":
        candidate = home.primaryResidence;
        break;
      case "minimum_age":
        candidate = home.applicantAge;
        break;
      case "senior_household":
        candidate = home.seniorHousehold;
        break;
      case "children_in_household":
        candidate = home.childrenInHousehold;
        break;
      case "accessibility_need":
        candidate = home.accessibilityNeeds;
        break;
      case "repair_type":
        candidate = normalizeRepairCategory(repairNeed.category);
        break;
      case "application_status":
        candidate = applicationStatus;
        break;
      default:
        candidate = null;
    }

    if (candidate == null) {
      return {
        passed: null,
        ruleType,
        required,
        reason: `${ruleType} is unknown and requires verification`,
      };
    }

    const listValue = Array.isArray(value)
      ? value.map((item) => normalizeText(item))
      : [normalizeText(value)];
    const normalizedCandidate = normalizeText(candidate);

    let passed: boolean | null = null;

    switch (operator) {
      case "equals":
        passed = normalizedCandidate === normalizeText(value);
        break;
      case "not_equals":
        passed = normalizedCandidate !== normalizeText(value);
        break;
      case "in":
      case "any_of":
        passed = listValue.includes(normalizedCandidate);
        break;
      case "lte": {
        const candidateNumber = Number(candidate);
        const compareValue = Number(value);
        if (!Number.isFinite(candidateNumber) || !Number.isFinite(compareValue)) {
          passed = null;
        } else {
          passed = candidateNumber <= compareValue;
        }
        break;
      }
      case "gte": {
        const candidateNumber = Number(candidate);
        const compareValue = Number(value);
        if (!Number.isFinite(candidateNumber) || !Number.isFinite(compareValue)) {
          passed = null;
        } else {
          passed = candidateNumber >= compareValue;
        }
        break;
      }
      default:
        passed = null;
    }

    return {
      passed,
      ruleType,
      required,
      reason:
        passed === true
          ? `${ruleType} passed`
          : passed === false
            ? `${ruleType} failed`
            : `${ruleType} needs verification`,
    };
  });

  const required = evaluations.filter((result) => result.required);
  const requiredFailures = required.filter((result) => result.passed === false);
  const requiredUnknown = required.filter((result) => result.passed === null);
  const optionalUnknown = evaluations.filter(
    (result) => !result.required && result.passed !== true,
  );

  let status: MatchStatus;
  if (requiredFailures.length > 0) {
    status = "not_eligible";
  } else if (requiredUnknown.length > 0) {
    status = "verification_needed";
  } else if (optionalUnknown.length > 0) {
    status = "potential_match";
  } else {
    status = "strong_match";
  }

  return {
    status,
    evaluations,
    requiredFailures,
    requiredUnknown,
    optionalUnknown,
  };
}
