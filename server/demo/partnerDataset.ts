import type {
  CaseStatus,
  CoverageStatus,
  MatchStatus,
  Priority,
  RepairType,
  SyntheticProgramCapacity,
  SyntheticRepairFact,
} from "../domain/partnerAnalytics.js";
import { createSeededRandom, randomInteger, shuffle, weightedChoice } from "./seededRandom.js";

export const DEFAULT_PARTNER_DEMO_SEED = 3_132_026;
export const PARTNER_DEMO_GENERATED_AT = "2026-09-19T12:00:00.000Z";

const zipCodes = [
  { value: "48205", weight: 18 },
  { value: "48224", weight: 16 },
  { value: "48227", weight: 15 },
  { value: "48214", weight: 13 },
  { value: "48210", weight: 12 },
  { value: "48204", weight: 10 },
  { value: "48208", weight: 9 },
  { value: "48213", weight: 7 },
];

const repairTypeWeights: Array<{ value: RepairType; weight: number }> = [
  { value: "roof_water_intrusion", weight: 25 },
  { value: "hvac", weight: 19 },
  { value: "plumbing", weight: 15 },
  { value: "electrical", weight: 14 },
  { value: "accessibility", weight: 9 },
  { value: "structural", weight: 8 },
  { value: "lead_environmental", weight: 6 },
  { value: "windows_doors", weight: 4 },
];

const priorityWeights: Array<{ value: Priority; weight: number }> = [
  { value: "critical", weight: 8 },
  { value: "high", weight: 29 },
  { value: "moderate", weight: 48 },
  { value: "low", weight: 15 },
];

const programByRepairType: Record<RepairType, string[]> = {
  roof_water_intrusion: ["critical-home-repair"],
  hvac: ["wayne-metro-weatherization", "critical-home-repair"],
  plumbing: ["critical-home-repair"],
  electrical: ["critical-home-repair"],
  accessibility: ["critical-home-repair"],
  structural: ["critical-home-repair"],
  lead_environmental: ["detroit-leadsafe-housing"],
  windows_doors: ["wayne-metro-weatherization"],
  carpentry: [],
  drywall_plaster: [],
  concrete_masonry: [],
  flooring: [],
  painting_finishing: [],
  other: ["critical-home-repair"],
};

function matchWeights(repairType: RepairType): Array<{ value: MatchStatus; weight: number }> {
  const gapWeight = ["electrical", "structural", "accessibility"].includes(repairType) ? 35 : 15;
  return [
    { value: "strong_match", weight: 38 },
    { value: "potential_match", weight: 28 },
    { value: "verification_needed", weight: 13 },
    { value: "not_eligible", weight: Math.round(gapWeight * 0.35) },
    { value: "no_match", weight: Math.round(gapWeight * 0.65) },
  ];
}

function coverageForMatch(matchStatus: MatchStatus): CoverageStatus {
  if (matchStatus === "strong_match" || matchStatus === "potential_match")
    return "potentially_covered";
  if (matchStatus === "verification_needed") return "verification_needed";
  return "funding_gap";
}

function caseStatusForFacts(
  random: ReturnType<typeof createSeededRandom>,
  facts: Array<{ matchStatus: MatchStatus; coverageStatus: CoverageStatus }>,
): CaseStatus {
  if (facts.some((fact) => fact.coverageStatus === "funding_gap")) {
    return weightedChoice(random, [
      { value: "assessment_complete", weight: 45 },
      { value: "program_review", weight: 35 },
      { value: "waitlisted", weight: 20 },
    ] satisfies Array<{ value: CaseStatus; weight: number }>);
  }
  if (
    facts.some(
      (fact) =>
        fact.matchStatus === "verification_needed" || fact.coverageStatus === "verification_needed",
    )
  ) {
    return weightedChoice(random, [
      { value: "documents_needed", weight: 65 },
      { value: "program_review", weight: 35 },
    ] satisfies Array<{ value: CaseStatus; weight: number }>);
  }
  return weightedChoice(random, [
    { value: "program_review", weight: 35 },
    { value: "referred", weight: 30 },
    { value: "waitlisted", weight: 20 },
    { value: "repair_scheduled", weight: 15 },
  ] satisfies Array<{ value: CaseStatus; weight: number }>);
}

export function generateSyntheticPartnerDataset(
  seed = DEFAULT_PARTNER_DEMO_SEED,
): SyntheticRepairFact[] {
  const random = createSeededRandom(seed);
  const additionalNeedHomes = new Set(
    shuffle(
      random,
      Array.from({ length: 150 }, (_, index) => index + 1),
    ).slice(0, 74),
  );
  const facts: SyntheticRepairFact[] = [];
  let repairNeedNumber = 1;

  for (let homeNumber = 1; homeNumber <= 150; homeNumber += 1) {
    const paddedHome = String(homeNumber).padStart(4, "0");
    const caseId = `HF-DEMO-${paddedHome}`;
    const zipCode = weightedChoice(random, zipCodes);
    const createdDaysAgo = randomInteger(random, 8, 180);
    const createdAt = new Date(
      Date.parse(PARTNER_DEMO_GENERATED_AT) - createdDaysAgo * 86_400_000,
    ).toISOString();
    const needCount = additionalNeedHomes.has(homeNumber) ? 2 : 1;
    const homeFacts: Array<Omit<SyntheticRepairFact, "caseStatus">> = [];

    for (let needIndex = 0; needIndex < needCount; needIndex += 1) {
      const repairType = weightedChoice(random, repairTypeWeights);
      const matchStatus = weightedChoice(random, matchWeights(repairType));
      const coverageStatus = coverageForMatch(matchStatus);
      const programs = programByRepairType[repairType];
      const programId =
        coverageStatus === "funding_gap"
          ? undefined
          : programs[randomInteger(random, 0, programs.length - 1)];
      const fact: Omit<SyntheticRepairFact, "caseStatus"> = {
        homeId: `HOME-DEMO-${paddedHome}`,
        caseId,
        caseNumber: caseId,
        repairNeedId: `NEED-DEMO-${String(repairNeedNumber).padStart(4, "0")}`,
        propertyLabel: `Property ${paddedHome}`,
        zipCode,
        repairType,
        priority: weightedChoice(random, priorityWeights),
        matchStatus,
        coverageStatus,
        createdAt,
        synthetic: true,
      };
      if (programId) fact.programId = programId;
      homeFacts.push(fact);
      repairNeedNumber += 1;
    }

    const caseStatus = caseStatusForFacts(random, homeFacts);
    facts.push(...homeFacts.map((fact) => ({ ...fact, caseStatus })));
  }

  const specialCaseFacts = facts.filter((fact) => fact.homeId === "HOME-DEMO-0001");
  for (const fact of specialCaseFacts) {
    fact.caseId = "HF-313-0842";
    fact.caseNumber = "HF-313-0842";
    fact.propertyLabel = "123 Main Street";
    fact.zipCode = "48205";
    fact.createdAt = PARTNER_DEMO_GENERATED_AT;
    fact.caseStatus = "program_review";
  }

  const primaryFact = specialCaseFacts[0];
  if (primaryFact) {
    primaryFact.repairType = "roof_water_intrusion";
    primaryFact.priority = "high";
    primaryFact.matchStatus = "strong_match";
    primaryFact.coverageStatus = "potentially_covered";
    primaryFact.caseStatus = "program_review";
    primaryFact.programId = "critical-home-repair";
  }

  return facts;
}

export const syntheticProgramCapacities: SyntheticProgramCapacity[] = [
  {
    programId: "critical-home-repair",
    name: "Critical Home Repair",
    status: "limited",
    simulatedCapacity: 62,
    synthetic: true,
  },
  {
    programId: "wayne-metro-weatherization",
    name: "Wayne Metro Weatherization",
    status: "open",
    simulatedCapacity: 38,
    synthetic: true,
  },
  {
    programId: "detroit-leadsafe-housing",
    name: "Detroit LeadSafe Housing",
    status: "waitlist",
    simulatedCapacity: 8,
    synthetic: true,
  },
];
