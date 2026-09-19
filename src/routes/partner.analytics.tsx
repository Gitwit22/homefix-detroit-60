import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DemoFlag, Metric, PageIntro, SectionLabel } from "@/components/homefix";
import { getPartnerAnalytics } from "@/lib/homefix-api";

export const Route = createFileRoute("/partner/analytics")({
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
  component: Analytics,
});

function Analytics() {
  const analytics = Route.useLoaderData();
  const maximumDemand = Math.max(...analytics.byRepairType.map((metric) => metric.repairNeeds), 1);
  const highPriorityPercentage = Math.round(
    (analytics.totals.highPriorityRepairs / analytics.totals.repairNeeds) * 100,
  );
  const highestDemand = analytics.byRepairType.reduce((highest, metric) =>
    metric.repairNeeds > highest.repairNeeds ? metric : highest,
  );
  const largestGap = analytics.unmetNeeds[0];
  const constrainedPrograms = analytics.programCapacity.filter(
    (program) => program.status !== "open",
  ).length;

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Planning trends"
        title="Repair Analytics"
        description="Directional patterns from synthetic demo records. Not intended for operational decision-making."
      />
      <div className="grid grid-cols-2 gap-y-6 border-b border-foreground py-8 sm:grid-cols-4">
        <Metric
          value={`${analytics.coverage.potentiallyCoveredPercentage}%`}
          label="Needs with potential resource"
        />
        <Metric value={`${highPriorityPercentage}%`} label="High priority" />
        <Metric value={analytics.totals.verificationNeeded} label="Needs verification" />
        <Metric value={`${analytics.coverage.unmatchedPercentage}%`} label="Unmatched" accent />
      </div>
      <section className="py-10">
        <SectionLabel number="01">Repair volume by category</SectionLabel>
        <div className="mt-8 flex h-72 items-end gap-2 border-b border-foreground px-2">
          {analytics.byRepairType.map((metric) => (
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
          {Math.round((highestDemand.repairNeeds / analytics.totals.repairNeeds) * 100)}% of
          identified needs.
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
