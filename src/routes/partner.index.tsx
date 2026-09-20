import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import {
  DataTable,
  DemoFlag,
  Metric,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerAnalytics, type PartnerAnalytics } from "@/lib/homefix-api";
import {
  capacityStatusLabels,
  caseStatusLabels,
  matchStatusLabels,
  priorityLabels,
  type WorkforceDiscipline,
} from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/")({
  head: () => ({
    meta: [
      { title: "Partner Intelligence — HomeFix 313" },
      {
        name: "description",
        content: "Detroit repair demand, program capacity, and unmet-needs planning data.",
      },
      { property: "og:title", content: "Partner Intelligence — HomeFix 313" },
      {
        property: "og:description",
        content: "A civic operations view of submitted Detroit home repair demand.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const analytics: PartnerAnalytics = Route.useLoaderData();
  const [selectedDiscipline, setSelectedDiscipline] = useState<WorkforceDiscipline>(
    () =>
      analytics.workforceOpportunities.byDiscipline.find((metric) => metric.count > 0)
        ?.discipline ?? "painting_finish",
  );
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const maximumDemand = Math.max(...analytics.byRepairType.map((metric) => metric.repairNeeds), 1);
  const maximumZipDemand = Math.max(...analytics.byZipCode.map((metric) => metric.repairNeeds), 1);
  const disciplineOpportunities = analytics.workforceOpportunities.opportunities.filter(
    (opportunity) => opportunity.discipline === selectedDiscipline,
  );
  const selectedOpportunity =
    disciplineOpportunities.find(
      (opportunity) => opportunity.repairNeedId === selectedOpportunityId,
    ) ?? disciplineOpportunities[0];

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="HomeFix Partner Intelligence"
        title="Detroit Repair Demand"
        description="Submitted repair assessments showing demand, possible program coverage, and where help is missing."
      />
      <section className="grid grid-cols-2 gap-y-8 border-b border-foreground py-8 sm:grid-cols-3 xl:grid-cols-6">
        <Link to="/partner/cases" className="block">
          <Metric value={analytics.totals.homes} label="Homes represented" />
        </Link>
        <Metric value={analytics.totals.repairNeeds} label="Repair needs identified" />
        <Link to="/partner/cases" search={{ priorityGroup: "high_priority" }} className="block">
          <Metric value={analytics.totals.highPriorityRepairs} label="High-priority repairs" />
        </Link>
        <Link to="/partner/cases" search={{ coverage: "potentially_covered" }} className="block">
          <Metric
            value={analytics.totals.potentiallyCoveredRepairs}
            label="Potential resource matches"
          />
        </Link>
        <Metric value={analytics.totals.verificationNeeded} label="Verification needed" />
        <Link to="/partner/unmet-needs" className="block">
          <Metric value={analytics.totals.unmatchedNeeds} label="Unmatched repair needs" accent />
        </Link>
      </section>

      <section className="grid gap-10 py-10 xl:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionLabel number="01">Repair demand</SectionLabel>
          <div className="mt-6 space-y-4">
            {analytics.byRepairType.map((metric) => (
              <Link
                key={metric.repairType}
                to="/partner/cases"
                search={{ repairType: metric.repairType }}
                className="block"
              >
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
              </Link>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel number="02">Demand by Detroit ZIP</SectionLabel>
          <div className="blueprint-grid relative mt-6 grid min-h-92.5 grid-cols-2 place-items-center gap-4 border border-foreground bg-secondary/30 p-6 pb-16 sm:grid-cols-4">
            {analytics.byZipCode.map((metric) => {
              const size = 64 + Math.round((metric.repairNeeds / maximumZipDemand) * 54);
              return (
                <Link
                  key={metric.zipCode}
                  to="/partner/cases"
                  search={{ zip: metric.zipCode }}
                  className="grid place-items-center rounded-full border border-primary bg-primary/80 text-center text-primary-foreground shadow-lg"
                  style={{ width: size, height: size }}
                >
                  <b>{metric.zipCode}</b>
                  <small>{metric.repairNeeds} needs</small>
                </Link>
              );
            })}
            <div className="absolute bottom-3 left-3 bg-background/90 px-3 py-2 text-[10px] font-bold uppercase">
              Relative demand · not a geographic map
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-foreground py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <SectionLabel number="03">Workforce development</SectionLabel>
            <h2 className="mt-2 text-4xl">
              {analytics.workforceOpportunities.total} Potential Workforce Opportunities
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Preliminary repair-assessment signals that may support safe, supervised trades
              training after professional inspection.
            </p>
          </div>
          <StatusBadge tone="warning">Preliminary / Pending Inspection</StatusBadge>
        </div>

        {analytics.workforceOpportunities.total === 0 ? (
          <div className="mt-7 border border-dashed border-border p-6 text-sm text-muted-foreground">
            No preliminary workforce opportunities have been identified yet.
          </div>
        ) : (
          <div className="mt-7 grid gap-px bg-border lg:grid-cols-[minmax(240px,.7fr)_1.3fr]">
            <div className="bg-background">
              {analytics.workforceOpportunities.byDiscipline.map((metric) => (
                <button
                  key={metric.discipline}
                  type="button"
                  aria-pressed={selectedDiscipline === metric.discipline}
                  onClick={() => {
                    setSelectedDiscipline(metric.discipline);
                    setSelectedOpportunityId(null);
                  }}
                  className={`flex w-full items-center justify-between border-b border-border px-5 py-4 text-left font-semibold last:border-b-0 focus-visible:outline-2 focus-visible:outline-primary ${selectedDiscipline === metric.discipline ? "bg-primary text-primary-foreground" : "bg-background"}`}
                >
                  <span>{metric.label}</span>
                  <span className="font-display text-3xl font-normal">{metric.count}</span>
                </button>
              ))}
            </div>

            <div className="bg-background p-5 sm:p-7">
              {selectedOpportunity ? (
                <div className="grid gap-7 xl:grid-cols-[180px_1fr]">
                  <div>
                    <p className="eyebrow">Opportunities</p>
                    <div className="mt-3 grid gap-2">
                      {disciplineOpportunities.map((opportunity) => (
                        <button
                          key={opportunity.repairNeedId}
                          type="button"
                          onClick={() => setSelectedOpportunityId(opportunity.repairNeedId)}
                          className={`border px-3 py-2 text-left text-sm font-bold ${selectedOpportunity.repairNeedId === opportunity.repairNeedId ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                        >
                          {opportunity.caseNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                  <article>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{selectedOpportunity.caseNumber}</p>
                        <h3 className="mt-2 text-3xl">{selectedOpportunity.repairLabel}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Detroit ZIP {selectedOpportunity.zipCode}
                        </p>
                      </div>
                      <StatusBadge tone="warning">Instructor Review Needed</StatusBadge>
                    </div>
                    <p className="mt-5 text-sm leading-relaxed">{selectedOpportunity.reason}</p>
                    <div className="mt-5">
                      <p className="eyebrow">Possible skills</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {selectedOpportunity.possibleSkills.map((skill) => (
                          <li key={skill} className="border border-border px-3 py-2 text-sm">
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      to="/partner/cases/$caseId"
                      params={{ caseId: selectedOpportunity.caseId }}
                      className="mt-6 inline-flex items-center gap-2 border-b border-foreground pb-1 font-bold"
                    >
                      View Opportunity
                      <ArrowRight className="size-4" />
                    </Link>
                  </article>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No opportunities are currently assigned to this discipline.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="border-y border-foreground bg-rust/8 py-9">
        <div className="flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <SectionLabel number="04">Where help is missing</SectionLabel>
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
        <SectionLabel number="05">High priority homes</SectionLabel>
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
        <SectionLabel number="06">Program capacity</SectionLabel>
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
