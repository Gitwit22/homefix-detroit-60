import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, MapPin } from "lucide-react";
import { useState } from "react";

import { DemoFlag, Metric, PageIntro, SectionLabel, StatusBadge } from "@/components/homefix";
import { PartnerDataWarning, PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerAnalytics, type PartnerAnalytics } from "@/lib/homefix-api";
import {
  workforceDisciplineLabels,
  type WorkforceDiscipline,
} from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/opportunities")({
  loader: () => getPartnerAnalytics(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  head: () => ({
    meta: [
      { title: "Workforce Opportunities — HomeFix 313" },
      {
        name: "description",
        content: "Review potential supervised training opportunities identified from repair assessments.",
      },
    ],
  }),
  component: PartnerOpportunities,
});

function PartnerOpportunities() {
  const analytics: PartnerAnalytics = Route.useLoaderData();
  const [discipline, setDiscipline] = useState<WorkforceDiscipline | "all">("all");
  const opportunities = analytics.workforceOpportunities.opportunities.filter(
    (opportunity) => discipline === "all" || opportunity.discipline === discipline,
  );
  const activeDisciplines = analytics.workforceOpportunities.byDiscipline.filter(
    (metric) => metric.count > 0,
  );

  return (
    <>
      <PartnerDataWarning warning={analytics.warning} />
      <DemoFlag />
      <PageIntro
        eyebrow="Partner workforce pipeline"
        title="Training Opportunities"
        description="Potential supervised learning experiences identified from resident repair assessments for youth programs, instructors, and emerging-trades partners."
      />

      <section className="grid grid-cols-2 gap-y-8 border-b border-foreground py-8 sm:grid-cols-3">
        <Metric value={analytics.workforceOpportunities.total} label="Potential opportunities" accent />
        <Metric value={activeDisciplines.length} label="Active disciplines" />
        <Metric
          value={opportunities.filter((item) => item.status === "requires_inspection").length}
          label="Need inspection"
        />
      </section>

      <section className="py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <SectionLabel number="01">Opportunity queue</SectionLabel>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              These are preliminary signals. A qualified professional must confirm scope and safety before training begins.
            </p>
          </div>
          <label className="grid gap-2 text-xs font-bold uppercase">
            Discipline
            <select
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value as WorkforceDiscipline | "all")}
              className="min-h-11 border border-foreground bg-background px-3 text-sm font-semibold normal-case"
            >
              <option value="all">All disciplines</option>
              {activeDisciplines.map((metric) => (
                <option key={metric.discipline} value={metric.discipline}>
                  {metric.label} ({metric.count})
                </option>
              ))}
            </select>
          </label>
        </div>

        {opportunities.length === 0 ? (
          <div className="mt-7 border border-dashed border-border p-8 text-sm text-muted-foreground">
            No potential training opportunities match this view.
          </div>
        ) : (
          <div className="mt-7 grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
            {opportunities.map((opportunity) => (
              <article key={opportunity.repairNeedId} className="flex min-h-80 flex-col bg-background p-6">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone="warning">
                    <GraduationCap className="mr-1 inline size-4" aria-hidden="true" />
                    {opportunity.status === "requires_inspection" ? "Inspection Needed" : "Potential"}
                  </StatusBadge>
                  <span className="eyebrow">{opportunity.caseNumber}</span>
                </div>
                <h2 className="mt-6 text-3xl">{opportunity.repairLabel}</h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="size-4" aria-hidden="true" /> Detroit ZIP {opportunity.zipCode}
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{opportunity.reason}</p>
                <p className="mt-5 text-xs font-bold uppercase">
                  {workforceDisciplineLabels[opportunity.discipline]}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {opportunity.possibleSkills.map((skill) => (
                    <span key={skill} className="border border-border px-2 py-1 text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
                <Link
                  to="/partner/cases/$caseId"
                  params={{ caseId: opportunity.caseId }}
                  className="mt-auto inline-flex items-center justify-end gap-2 pt-7 font-bold text-primary"
                >
                  Review Case <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}