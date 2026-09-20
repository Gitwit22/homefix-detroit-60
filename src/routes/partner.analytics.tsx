import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DemoFlag, Metric, PageIntro, SectionLabel } from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerAnalytics } from "@/lib/homefix-api";
import { parsePartnerFilters } from "@/lib/partner-filters";
import { repairTypeLabels } from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/analytics")({
  validateSearch: (search: Record<string, unknown>) => parsePartnerFilters(search),
  head: () => ({
    meta: [
      { title: "Repair Analytics — HomeFix 313" },
      {
        name: "description",
        content: "Synthetic trends across Detroit home repair needs and program pathways.",
      },
      { property: "og:title", content: "Repair Analytics — HomeFix 313" },
      {
        property: "og:description",
        content: "Planning trends from the HomeFix 313 synthetic dataset.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: Analytics,
});

function Analytics() {
  const analytics = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const zipOptions = [...new Set(analytics.cases.map((item) => item.zipCode))].sort();
  const repairTypeOptions = analytics.byRepairType.map((metric) => ({
    value: metric.repairType,
    label: metric.label,
  }));
  const filteredCases = analytics.cases.filter((item) => {
    if (search.zip && item.zipCode !== search.zip) return false;
    if (search.priority && item.priority !== search.priority) return false;
    if (search.repairType) {
      const label = repairTypeLabels[search.repairType as keyof typeof repairTypeLabels];
      if (!label || !item.repairLabels.includes(label)) return false;
    }
    return true;
  });
  const byRepairType = analytics.byRepairType.map((metric) => {
    const matchingCases = filteredCases.filter((item) => item.repairLabels.includes(metric.label));
    const repairNeeds = matchingCases.length;
    const highPriority = matchingCases.filter(
      (item) => item.priority === "high" || item.priority === "critical",
    ).length;
    const potentiallyCovered = matchingCases.filter(
      (item) => item.coverageStatus === "potentially_covered",
    ).length;
    const verificationNeeded = matchingCases.filter(
      (item) => item.coverageStatus === "verification_needed",
    ).length;
    const unmatched = matchingCases.filter((item) => item.coverageStatus === "funding_gap").length;
    const gapRate = repairNeeds === 0 ? 0 : Math.round((unmatched / repairNeeds) * 100);
    return {
      ...metric,
      repairNeeds,
      highPriority,
      potentiallyCovered,
      verificationNeeded,
      unmatched,
      gapRate,
    };
  });
  const totals = {
    repairNeeds: filteredCases.reduce((sum, item) => sum + item.repairNeeds, 0),
    highPriorityRepairs: filteredCases
      .filter((item) => item.priority === "high" || item.priority === "critical")
      .reduce((sum, item) => sum + item.repairNeeds, 0),
    verificationNeeded: filteredCases
      .filter((item) => item.coverageStatus === "verification_needed")
      .reduce((sum, item) => sum + item.repairNeeds, 0),
    unmatchedNeeds: filteredCases
      .filter((item) => item.coverageStatus === "funding_gap")
      .reduce((sum, item) => sum + item.repairNeeds, 0),
    potentiallyCoveredRepairs: filteredCases
      .filter((item) => item.coverageStatus === "potentially_covered")
      .reduce((sum, item) => sum + item.repairNeeds, 0),
  };
  const potentiallyCoveredPercentage =
    totals.repairNeeds === 0 ? 0 : Math.round((totals.potentiallyCoveredRepairs / totals.repairNeeds) * 100);
  const unmatchedPercentage =
    totals.repairNeeds === 0 ? 0 : Math.round((totals.unmatchedNeeds / totals.repairNeeds) * 100);
  const maximumDemand = Math.max(...byRepairType.map((metric) => metric.repairNeeds), 1);
  const highPriorityPercentage = Math.round(
    totals.repairNeeds === 0 ? 0 : (totals.highPriorityRepairs / totals.repairNeeds) * 100,
  );
  const highestDemand = byRepairType.reduce((highest, metric) =>
    metric.repairNeeds > highest.repairNeeds ? metric : highest,
  );
  const largestGap = [...byRepairType].sort((a, b) => b.unmatched - a.unmatched)[0];
  const constrainedPrograms = analytics.programCapacity.filter(
    (program) => program.status !== "open",
  ).length;
  const updateSearch = (next: Record<string, string | undefined>) =>
    navigate({
      search: (prev) => ({
        ...prev,
        ...next,
      }),
      replace: true,
    });
  const clearFilters = () => navigate({ search: {}, replace: true });

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Planning trends"
        title="Repair Analytics"
        description="Directional patterns from synthetic demo records. Not intended for operational decision-making."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
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
          value={search.priority ?? "all"}
          onChange={(event) =>
            updateSearch({ priority: event.target.value === "all" ? undefined : event.target.value })
          }
          className="h-12 border border-border px-3"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
        </select>
      </div>
      {filteredCases.length === 0 && (
        <div className="mt-6 border border-dashed border-border p-6 text-sm">
          <p>No repair cases match these filters.</p>
          <button type="button" className="mt-3 font-bold text-primary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-y-6 border-b border-foreground py-8 sm:grid-cols-4">
        <Metric value={`${potentiallyCoveredPercentage}%`} label="Needs with potential resource" />
        <Metric value={`${highPriorityPercentage}%`} label="High priority" />
        <Metric value={totals.verificationNeeded} label="Needs verification" />
        <Metric value={`${unmatchedPercentage}%`} label="Unmatched" accent />
      </div>
      <section className="py-10">
        <SectionLabel number="01">Repair volume by category</SectionLabel>
        <div className="mt-8 flex h-72 items-end gap-2 border-b border-foreground px-2">
          {byRepairType.map((metric) => (
            <div
              key={metric.repairType}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <span className="mb-2 text-center font-display text-2xl">{metric.repairNeeds}</span>
              <div
                className="bg-primary"
                style={{ height: `${(metric.repairNeeds / maximumDemand) * 80}%` }}
              />
              <small className="mt-3 min-h-8 text-center text-[10px] font-bold uppercase leading-tight">
                {metric.label}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-px bg-border sm:grid-cols-3">
        <Insight title="Highest demand">
          {highestDemand.label} represents{" "}
          {Math.round((highestDemand.repairNeeds / Math.max(totals.repairNeeds, 1)) * 100)}% of
          filtered needs.
        </Insight>
        <Insight title="Largest gap">
          {largestGap
            ? `${largestGap.label} has ${largestGap.unmatched} unmatched needs and a ${largestGap.gapRate}% gap rate.`
            : "No funding gaps are present."}
        </Insight>
        <Insight title="Pipeline risk">
          {constrainedPrograms} modeled programs show limited, waitlisted, or closed capacity.
        </Insight>
      </section>
    </>
  );
}

function Insight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-background p-6">
      <span className="eyebrow">{title}</span>
      <p className="mt-3 text-lg font-semibold">{children}</p>
    </div>
  );
}
