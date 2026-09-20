export type PartnerFilters = {
  zip: string | undefined;
  repairType: string | undefined;
  priority: string | undefined;
  priorityGroup: "high_priority" | undefined;
  coverage: string | undefined;
};

export type PartnerCaseFilters = PartnerFilters & {
  q: string | undefined;
};

function normalizeToken(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "all") return undefined;
  return trimmed;
}

export function parsePartnerFilters(search: Record<string, unknown>): PartnerFilters {
  return {
    zip: normalizeToken(search["zip"]),
    repairType: normalizeToken(search["repairType"]),
    priority: normalizeToken(search["priority"]),
    priorityGroup: search["priorityGroup"] === "high_priority" ? "high_priority" : undefined,
    coverage: normalizeToken(search["coverage"]),
  };
}

export function matchesPartnerPriority(
  priority: string,
  filters: Pick<PartnerFilters, "priority" | "priorityGroup">,
) {
  if (filters.priorityGroup === "high_priority") {
    return priority === "high" || priority === "critical";
  }
  return !filters.priority || priority === filters.priority;
}

export function parsePartnerCaseFilters(search: Record<string, unknown>): PartnerCaseFilters {
  return {
    ...parsePartnerFilters(search),
    q: normalizeToken(search["q"]),
  };
}
