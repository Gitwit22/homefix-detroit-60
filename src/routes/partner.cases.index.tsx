import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DemoFlag, PageIntro, PriorityBadge, StatusBadge } from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerAnalytics } from "@/lib/homefix-api";
import { matchesPartnerPriority, parsePartnerCaseFilters } from "@/lib/partner-filters";
import {
  caseStatusLabels,
  coverageStatusLabels,
  priorityLabels,
  repairTypeLabels,
} from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/cases/")({
  validateSearch: (search: Record<string, unknown>) => parsePartnerCaseFilters(search),
  head: () => ({
    meta: [
      { title: "Repair Cases — HomeFix 313" },
      {
        name: "description",
        content: "Review submitted HomeFix repair cases and current next actions.",
      },
      { property: "og:title", content: "Repair Cases — HomeFix 313" },
      { property: "og:description", content: "Partner repair-case operations view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: Cases,
});

function Cases() {
  const analytics = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const repairTypeByLabel = Object.fromEntries(
    Object.entries(repairTypeLabels).map(([repairType, label]) => [label.toLowerCase(), repairType]),
  );
  const casesWithTypes = analytics.cases.map((item) => ({
    ...item,
    repairTypes: [...new Set(item.repairLabels
      .map((label) => repairTypeByLabel[label.toLowerCase()])
      .filter((repairType): repairType is string => Boolean(repairType)))],
  }));
  const zipOptions = [...new Set(casesWithTypes.map((item) => item.zipCode))].sort();
  const repairTypeOptions = analytics.byRepairType.map((metric) => ({
    value: metric.repairType,
    label: metric.label,
  }));
  const priorityOptions = Object.entries(priorityLabels).map(([value, label]) => ({ value, label }));
  const coverageOptions = Object.entries(coverageStatusLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const filteredCases = casesWithTypes.filter((item) => {
    if (search.q) {
      const query = search.q.toLowerCase();
      const matchesQuery =
        item.caseNumber.toLowerCase().includes(query) ||
        item.propertyLabel.toLowerCase().includes(query) ||
        item.zipCode.toLowerCase().includes(query) ||
        item.repairLabels.some((label) => label.toLowerCase().includes(query));
      if (!matchesQuery) return false;
    }
    if (search.zip && item.zipCode !== search.zip) return false;
    if (!matchesPartnerPriority(item.priority, search)) return false;
    if (search.coverage && item.coverageStatus !== search.coverage) return false;
    if (search.repairType && !item.repairTypes.includes(search.repairType)) return false;
    return true;
  });
  const updateSearch = (next: Record<string, string | undefined>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...next,
      }),
      replace: true,
    });
  };
  const clearFilters = () =>
    navigate({
      search: {},
      replace: true,
    });

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Case operations"
        title="Repair Cases"
        description={`${filteredCases.length} of ${analytics.cases.length} submitted homes match the active filters.`}
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          type="search"
          placeholder="Search cases..."
          value={search.q ?? ""}
          onChange={(event) => updateSearch({ q: event.target.value || undefined })}
          className="h-12 border border-border px-3"
        />
        <select
          value={search.zip ?? "all"}
          onChange={(event) => updateSearch({ zip: event.target.value === "all" ? undefined : event.target.value })}
          className="h-12 border border-border px-3"
        >
          <option value="all">All ZIPs</option>
          {zipOptions.map((zip) => (
            <option key={zip} value={zip}>
              {zip}
            </option>
          ))}
        </select>
        <select
          value={search.repairType ?? "all"}
          onChange={(event) =>
            updateSearch({ repairType: event.target.value === "all" ? undefined : event.target.value })
          }
          className="h-12 border border-border px-3"
        >
          <option value="all">All Repair Types</option>
          {repairTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={search.priorityGroup ?? search.priority ?? "all"}
          onChange={(event) => {
            const priority = event.target.value;
            updateSearch({
              priority:
                priority === "all" || priority === "high_priority" ? undefined : priority,
              priorityGroup: priority === "high_priority" ? "high_priority" : undefined,
            });
          }}
          className="h-12 border border-border px-3"
        >
          <option value="all">All Priorities</option>
          <option value="high_priority">High + Critical</option>
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={search.coverage ?? "all"}
          onChange={(event) =>
            updateSearch({ coverage: event.target.value === "all" ? undefined : event.target.value })
          }
          className="h-12 border border-border px-3"
        >
          <option value="all">All Coverage</option>
          {coverageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-8">
        {filteredCases.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-sm">
            <p>
              {analytics.cases.length === 0
                ? "No repair assessments have been submitted yet."
                : "No repair cases match these filters."}
            </p>
            <button type="button" className="mt-3 font-bold text-primary" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <DataTable
            headers={["Property", "ZIP", "Repairs", "Priority", "Coverage", "Case Status"]}
            rows={filteredCases.map((item) => [
              <Link
                to="/partner/cases/$caseId"
                params={{ caseId: item.caseId }}
                className="font-bold text-primary"
              >
                {item.propertyLabel}
              </Link>,
              item.zipCode,
              item.repairLabels.join(", "),
              <PriorityBadge priority={priorityLabels[item.priority]} />,
              <StatusBadge
                tone={
                  item.coverageStatus === "funding_gap"
                    ? "danger"
                    : item.coverageStatus === "verification_needed"
                      ? "warning"
                      : "positive"
                }
              >
                {coverageStatusLabels[item.coverageStatus]}
              </StatusBadge>,
              caseStatusLabels[item.caseStatus],
            ])}
          />
        )}
      </div>
    </>
  );
}
