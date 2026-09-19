import {
  repairTypes,
  repairTypeLabels,
  type CoverageStatus,
  type HighPriorityCase,
  type MatchStatus,
  type PartnerAnalytics,
  type PartnerCaseDetail,
  type PartnerCaseSummary,
  type Priority,
  type ProgramCapacityMetric,
  type RepairTypeMetric,
  type SyntheticProgramCapacity,
  type SyntheticRepairFact,
  type UnmetNeedMetric,
  type ZipMetric,
} from "../domain/partnerAnalytics.js";

const priorityRank: Record<Priority, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
const matchRank: Record<MatchStatus, number> = {
  strong_match: 0,
  potential_match: 1,
  verification_needed: 2,
  not_eligible: 3,
  no_match: 4,
};
const coverageRank: Record<CoverageStatus, number> = {
  potentially_covered: 0,
  verification_needed: 1,
  funding_gap: 2,
};

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

function isHighPriority(fact: SyntheticRepairFact): boolean {
  return fact.priority === "high" || fact.priority === "critical";
}

function metricForFacts(facts: SyntheticRepairFact[]) {
  const potentiallyCovered = facts.filter(
    (fact) => fact.matchStatus === "strong_match" || fact.matchStatus === "potential_match",
  ).length;
  const verificationNeeded = facts.filter(
    (fact) => fact.matchStatus === "verification_needed",
  ).length;
  const unmatched = facts.filter((fact) => fact.coverageStatus === "funding_gap").length;
  return {
    repairNeeds: facts.length,
    highPriority: facts.filter(isHighPriority).length,
    potentiallyCovered,
    verificationNeeded,
    unmatched,
    gapRate: percentage(unmatched, facts.length),
  };
}

function buildCases(facts: SyntheticRepairFact[]): {
  summaries: PartnerCaseSummary[];
  details: PartnerCaseDetail[];
} {
  const grouped = new Map<string, SyntheticRepairFact[]>();
  for (const fact of facts) grouped.set(fact.caseId, [...(grouped.get(fact.caseId) ?? []), fact]);

  const details = [...grouped.values()]
    .map((caseFacts): PartnerCaseDetail => {
      const first = caseFacts[0]!;
      const priority = caseFacts.reduce(
        (current, fact) =>
          priorityRank[fact.priority] > priorityRank[current] ? fact.priority : current,
        first.priority,
      );
      const matchStatus = caseFacts.reduce(
        (current, fact) =>
          matchRank[fact.matchStatus] > matchRank[current] ? fact.matchStatus : current,
        first.matchStatus,
      );
      const coverageStatus = caseFacts.reduce(
        (current, fact) =>
          coverageRank[fact.coverageStatus] > coverageRank[current] ? fact.coverageStatus : current,
        first.coverageStatus,
      );
      const programIds = [
        ...new Set(caseFacts.flatMap((fact) => (fact.programId ? [fact.programId] : []))),
      ];
      return {
        caseId: first.caseId,
        homeId: first.homeId,
        propertyLabel: first.propertyLabel,
        zipCode: first.zipCode,
        priority,
        matchStatus,
        coverageStatus,
        caseStatus: first.caseStatus,
        repairNeeds: caseFacts.length,
        repairLabels: caseFacts.map((fact) => repairTypeLabels[fact.repairType]),
        programIds,
        createdAt: first.createdAt,
        needs: caseFacts.map((fact) => {
          const need = {
            repairNeedId: fact.repairNeedId,
            repairType: fact.repairType,
            repairLabel: repairTypeLabels[fact.repairType],
            priority: fact.priority,
            matchStatus: fact.matchStatus,
            coverageStatus: fact.coverageStatus,
          };
          return fact.programId ? { ...need, programId: fact.programId } : need;
        }),
      };
    })
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) || left.caseId.localeCompare(right.caseId),
    );

  const summaries = details.map(({ needs: _needs, ...summary }) => summary);
  return { summaries, details };
}

function highPrioritySort(left: HighPriorityCase, right: HighPriorityCase): number {
  return (
    priorityRank[right.priority] - priorityRank[left.priority] ||
    Number(right.coverageStatus === "funding_gap") -
      Number(left.coverageStatus === "funding_gap") ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.repairNeedId.localeCompare(right.repairNeedId)
  );
}

export function calculatePartnerAnalytics(
  facts: SyntheticRepairFact[],
  capacities: SyntheticProgramCapacity[],
  seed: number,
  generatedAt: string,
): PartnerAnalytics {
  const totalsMetric = metricForFacts(facts);
  const byRepairType: RepairTypeMetric[] = repairTypes.map((repairType) => ({
    repairType,
    label: repairTypeLabels[repairType],
    ...metricForFacts(facts.filter((fact) => fact.repairType === repairType)),
  }));
  const zipCodes = [...new Set(facts.map((fact) => fact.zipCode))].sort();
  const byZipCode: ZipMetric[] = zipCodes
    .map((zipCode) => {
      const zipFacts = facts.filter((fact) => fact.zipCode === zipCode);
      return {
        zipCode,
        homes: new Set(zipFacts.map((fact) => fact.homeId)).size,
        ...metricForFacts(zipFacts),
      };
    })
    .sort(
      (left, right) =>
        right.repairNeeds - left.repairNeeds || left.zipCode.localeCompare(right.zipCode),
    );
  const unmetNeeds: UnmetNeedMetric[] = byRepairType
    .map((metric) => {
      const leadingZipCodes = byZipCode
        .map((zip) => ({
          zipCode: zip.zipCode,
          count: facts.filter(
            (fact) =>
              fact.repairType === metric.repairType &&
              fact.zipCode === zip.zipCode &&
              fact.coverageStatus === "funding_gap",
          ).length,
        }))
        .filter((zip) => zip.count > 0)
        .sort(
          (left, right) => right.count - left.count || left.zipCode.localeCompare(right.zipCode),
        )
        .slice(0, 3)
        .map((zip) => zip.zipCode);
      return { ...metric, leadingZipCodes };
    })
    .filter((metric) => metric.unmatched > 0)
    .sort(
      (left, right) =>
        right.unmatched - left.unmatched ||
        right.gapRate - left.gapRate ||
        left.label.localeCompare(right.label),
    );

  const highPriorityCases: HighPriorityCase[] = facts
    .filter(isHighPriority)
    .map((fact) => {
      const item = {
        caseId: fact.caseId,
        repairNeedId: fact.repairNeedId,
        propertyLabel: fact.propertyLabel,
        zipCode: fact.zipCode,
        repairType: fact.repairType,
        repairLabel: repairTypeLabels[fact.repairType],
        priority: fact.priority,
        matchStatus: fact.matchStatus,
        coverageStatus: fact.coverageStatus,
        caseStatus: fact.caseStatus,
        createdAt: fact.createdAt,
      };
      return fact.programId ? { ...item, programId: fact.programId } : item;
    })
    .sort(highPrioritySort);

  const programCapacity: ProgramCapacityMetric[] = capacities.map((capacity) => {
    const matchedNeeds = facts.filter(
      (fact) =>
        fact.programId === capacity.programId && fact.coverageStatus === "potentially_covered",
    ).length;
    return {
      ...capacity,
      matchedNeeds,
      excessDemand: Math.max(0, matchedNeeds - capacity.simulatedCapacity),
    };
  });
  const { summaries } = buildCases(facts);

  return {
    generatedAt,
    seed,
    synthetic: true,
    totals: {
      homes: new Set(facts.map((fact) => fact.homeId)).size,
      repairNeeds: facts.length,
      highPriorityRepairs: totalsMetric.highPriority,
      potentiallyCoveredRepairs: totalsMetric.potentiallyCovered,
      verificationNeeded: totalsMetric.verificationNeeded,
      unmatchedNeeds: totalsMetric.unmatched,
    },
    byRepairType,
    byZipCode,
    unmetNeeds,
    highPriorityCases,
    cases: summaries,
    programCapacity,
    coverage: {
      potentiallyCoveredPercentage: percentage(totalsMetric.potentiallyCovered, facts.length),
      unmatchedPercentage: percentage(totalsMetric.unmatched, facts.length),
    },
  };
}

export function getPartnerCaseDetail(
  facts: SyntheticRepairFact[],
  caseId: string,
): PartnerCaseDetail | undefined {
  return buildCases(facts).details.find((item) => item.caseId === caseId);
}
