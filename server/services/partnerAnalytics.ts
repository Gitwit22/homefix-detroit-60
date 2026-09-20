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
  type PartnerRepairFact,
  type ProgramCapacityModel,
  type UnmetNeedMetric,
  type WorkforceDiscipline,
  type WorkforceOpportunity,
  type ZipMetric,
  workforceDisciplineLabels,
  workforceDisciplines,
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

function isHighPriority(fact: PartnerRepairFact): boolean {
  return fact.priority === "high" || fact.priority === "critical";
}

function metricForFacts(facts: PartnerRepairFact[]) {
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

function buildCases(facts: PartnerRepairFact[]): {
  summaries: PartnerCaseSummary[];
  details: PartnerCaseDetail[];
} {
  const grouped = new Map<string, PartnerRepairFact[]>();
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
        caseNumber: first.caseNumber,
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

export function classifyWorkforceDiscipline(fact: PartnerRepairFact): WorkforceDiscipline {
  const searchable = fact.trainingOpportunity?.possibleSkills.join(" ").toLowerCase() ?? "";
  if (/accessib|ramp|handrail|grab bar/.test(searchable) || fact.repairType === "accessibility") {
    return "accessibility_work";
  }
  if (/weather|seal|caulk|insulat|air leak/.test(searchable)) return "weatherization";
  if (/paint|finish|drywall|plaster/.test(searchable)) return "painting_finish";
  if (/carpentry|trim|framing|wood|cabinet|door/.test(searchable)) return "basic_carpentry";
  return "needs_review";
}

function buildWorkforceOpportunities(facts: PartnerRepairFact[]) {
  const opportunities: WorkforceOpportunity[] = facts
    .filter(
      (fact) =>
        fact.trainingOpportunity?.status === "potential" ||
        fact.trainingOpportunity?.status === "requires_inspection",
    )
    .map((fact) => ({
      caseId: fact.caseId,
      caseNumber: fact.caseNumber,
      repairNeedId: fact.repairNeedId,
      zipCode: fact.zipCode,
      repairType: fact.repairType,
      repairLabel: repairTypeLabels[fact.repairType],
      status: fact.trainingOpportunity!.status as "potential" | "requires_inspection",
      reason: fact.trainingOpportunity!.reason,
      possibleSkills: fact.trainingOpportunity!.possibleSkills,
      discipline: classifyWorkforceDiscipline(fact),
      createdAt: fact.createdAt,
    }))
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        left.caseNumber.localeCompare(right.caseNumber) ||
        left.repairNeedId.localeCompare(right.repairNeedId),
    );

  return {
    total: opportunities.length,
    byDiscipline: workforceDisciplines
      .map((discipline) => ({
        discipline,
        label: workforceDisciplineLabels[discipline],
        count: opportunities.filter((item) => item.discipline === discipline).length,
      }))
      .filter((metric) => metric.discipline !== "needs_review" || metric.count > 0),
    opportunities,
  };
}

export function mergePartnerFacts(
  syntheticFacts: PartnerRepairFact[],
  persistedFacts: PartnerRepairFact[],
): PartnerRepairFact[] {
  const persistedCaseNumbers = new Set(persistedFacts.map((fact) => fact.caseNumber));
  return [
    ...syntheticFacts.filter((fact) => !persistedCaseNumbers.has(fact.caseNumber)),
    ...persistedFacts,
  ];
}

export function calculatePartnerAnalytics(
  facts: PartnerRepairFact[],
  capacities: ProgramCapacityModel[],
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
  const workforceOpportunities = buildWorkforceOpportunities(facts);
  const synthetic = facts.length > 0 && facts.every((fact) => fact.synthetic);
  const hasSyntheticFacts = facts.some((fact) => fact.synthetic);
  const hasPersistedFacts = facts.some((fact) => !fact.synthetic);

  return {
    source: hasSyntheticFacts && hasPersistedFacts ? "combined" : synthetic ? "demo" : "live",
    generatedAt,
    seed,
    synthetic,
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
    workforceOpportunities,
    coverage: {
      potentiallyCoveredPercentage: percentage(totalsMetric.potentiallyCovered, facts.length),
      unmatchedPercentage: percentage(totalsMetric.unmatched, facts.length),
    },
  };
}

export function getPartnerCaseDetail(
  facts: PartnerRepairFact[],
  caseId: string,
): PartnerCaseDetail | undefined {
  return buildCases(facts).details.find((item) => item.caseId === caseId);
}
