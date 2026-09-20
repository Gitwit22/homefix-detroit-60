import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  DataTable,
  DemoFlag,
  Metric,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { getPartnerAnalytics, type PartnerAnalytics } from "@/lib/homefix-api";
import {
  capacityStatusLabels,
  caseStatusLabels,
  matchStatusLabels,
  priorityLabels,
} from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/")({
  head: () => ({
    meta: [
      { title: "Partner Intelligence — HomeFix 313" },
      {
        name: "description",
        content:
          "Synthetic Detroit repair demand, program capacity, and unmet-needs planning data.",
      },
      { property: "og:title", content: "Partner Intelligence — HomeFix 313" },
      {
        property: "og:description",
        content: "A civic operations view of synthetic Detroit home repair demand.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const analytics: PartnerAnalytics = Route.useLoaderData();
  const maximumDemand = Math.max(...analytics.byRepairType.map((metric) => metric.repairNeeds), 1);
  const maximumZipDemand = Math.max(...analytics.byZipCode.map((metric) => metric.repairNeeds), 1);

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="HomeFix Partner Intelligence"
        title="Detroit Repair Demand"
        description="A synthetic planning dataset showing repair demand, possible program coverage, and where help is missing."
      />
      <section className="grid grid-cols-2 gap-y-8 border-b border-foreground py-8 sm:grid-cols-3 xl:grid-cols-6">
        <Metric value={analytics.totals.homes} label="Homes represented" />
        <Metric value={analytics.totals.repairNeeds} label="Repair needs identified" />
        <Metric value={analytics.totals.highPriorityRepairs} label="High-priority repairs" />
        <Metric
          value={analytics.totals.potentiallyCoveredRepairs}
          label="Potential resource matches"
        />
        <Metric value={analytics.totals.verificationNeeded} label="Verification needed" />
        <Metric value={analytics.totals.unmatchedNeeds} label="Unmatched repair needs" accent />
      </section>

      <section className="grid gap-10 py-10 xl:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionLabel number="01">Repair demand</SectionLabel>
          <div className="mt-6 space-y-4">
            {analytics.byRepairType.map((metric) => (
              <div key={metric.repairType}>
                <div className="flex justify-between text-sm">
                  <b>{metric.label}</b>
                  <span>{metric.repairNeeds}</span>
                </div>
                <div className="mt-2 h-2 bg-muted">
                  <span
                    className="block h-full bg-primary"
                    style={{ width: `${(metric.repairNeeds / maximumDemand) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel number="02">Demand by Detroit ZIP</SectionLabel>
          <div className="blueprint-grid relative mt-6 grid min-h-92.5 grid-cols-2 place-items-center gap-4 border border-foreground bg-secondary/30 p-6 pb-16 sm:grid-cols-4">
            {analytics.byZipCode.map((metric) => {
              const size = 64 + Math.round((metric.repairNeeds / maximumZipDemand) * 54);
              return (
                <div
                  key={metric.zipCode}
                  className="grid place-items-center rounded-full border border-primary bg-primary/80 text-center text-primary-foreground shadow-lg"
                  style={{ width: size, height: size }}
                >
                  <b>{metric.zipCode}</b>
                  <small>{metric.repairNeeds} needs</small>
                </div>
              );
            })}
            <div className="absolute bottom-3 left-3 bg-background/90 px-3 py-2 text-[10px] font-bold uppercase">
              Relative demand · not a geographic map
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground bg-rust/8 py-9">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <SectionLabel number="03">Where help is missing</SectionLabel>
            <h2 className="mt-2 text-4xl">
              {analytics.totals.unmatchedNeeds} repair needs have no identified assistance resource.
            </h2>
          </div>
          <Link
            to="/partner/unmet-needs"
            className="flex shrink-0 items-center gap-2 self-start border-b border-foreground pb-1 font-bold"
          >
            Explore unmet needs
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {analytics.unmetNeeds.slice(0, 4).map((metric) => (
            <div className="bg-background p-4" key={metric.repairType}>
              <strong className="font-display text-4xl font-normal text-rust">
                {metric.unmatched}
              </strong>
              <span className="mt-1 block text-xs font-bold uppercase">{metric.label}</span>
              <small className="text-muted-foreground">{metric.gapRate}% gap rate</small>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10">
        <SectionLabel number="04">High priority homes</SectionLabel>
        <div className="mt-5">
          <DataTable
            headers={["Property", "ZIP", "Repair", "Priority", "Program Match", "Case Status"]}
            rows={analytics.highPriorityCases.slice(0, 8).map((item) => [
              <Link
                to="/partner/cases/$caseId"
                params={{ caseId: item.caseId }}
                className="font-bold text-primary"
              >
                {item.propertyLabel}
              </Link>,
              item.zipCode,
              item.repairLabel,
              <PriorityBadge priority={priorityLabels[item.priority]} />,
              matchStatusLabels[item.matchStatus],
              caseStatusLabels[item.caseStatus],
            ])}
          />
        </div>
      </section>

      <section className="border-t border-foreground py-10">
        <SectionLabel number="05">Program capacity</SectionLabel>
        <div className="mt-6 grid gap-px bg-border sm:grid-cols-3">
          {analytics.programCapacity.map((program) => (
            <div className="bg-background p-5" key={program.programId}>
              <StatusBadge
                tone={
                  program.status === "open"
                    ? "positive"
                    : program.status === "limited" || program.status === "waitlist"
                      ? "warning"
                      : "danger"
                }
              >
                {capacityStatusLabels[program.status]}
              </StatusBadge>
              <h3 className="mt-4 text-xl">{program.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {program.matchedNeeds} matched needs · {program.simulatedCapacity} modeled capacity
              </p>
              <strong className="mt-3 block text-rust">
                {program.excessDemand} repairs exceed modeled capacity
              </strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
