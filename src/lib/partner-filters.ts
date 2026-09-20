export type PartnerFilters = {
  zip?: string;
  repairType?: string;
  priority?: string;
  coverage?: string;
};

export type PartnerCaseFilters = PartnerFilters & {
  q?: string;
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
    coverage: normalizeToken(search["coverage"]),
  };
}

export function parsePartnerCaseFilters(search: Record<string, unknown>): PartnerCaseFilters {
  return {
    ...parsePartnerFilters(search),
    q: normalizeToken(search["q"]),
  };
}
