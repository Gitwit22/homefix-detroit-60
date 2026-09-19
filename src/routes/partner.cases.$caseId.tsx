import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, FileWarning, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DemoFlag,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { getPartnerCase } from "@/lib/homefix-api";
import {
  caseStatusLabels,
  coverageStatusLabels,
  matchStatusLabels,
  priorityLabels,
} from "../../server/domain/partnerAnalytics";

const programNames: Record<string, string> = {
  "critical-home-repair": "Critical Home Repair",
  weatherization: "Wayne Metro Weatherization",
  leadsafe: "Detroit LeadSafe Housing",
};

export const Route = createFileRoute("/partner/cases/$caseId")({
  head: ({ params }) => ({
    meta: [
      { title: `Case ${params.caseId} — HomeFix 313` },
      { name: "description", content: "Synthetic partner case details and repair workflow." },
      { property: "og:title", content: `Repair Case ${params.caseId} — HomeFix 313` },
      { property: "og:description", content: "A synthetic HomeFix partner case dossier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ params }) => getPartnerCase(params.caseId),
  errorComponent: CaseLoadError,
  component: CaseDetail,
});

function CaseDetail() {
  const item = Route.useLoaderData();
  const reportedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(item.createdAt));
  const nextAction =
    item.coverageStatus === "funding_gap"
      ? "Review for a new funding or referral pathway"
      : item.coverageStatus === "verification_needed"
        ? "Verify household and program requirements"
        : "Advance the strongest program referral";

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow={`Repair case ${item.caseId}`}
        title={item.propertyLabel}
        description={`${item.zipCode} · Synthetic demonstration property`}
        action={<PriorityBadge priority={priorityLabels[item.priority]} />}
      />
      <div className="mt-8 grid gap-10 xl:grid-cols-[1fr_360px]">
        <div>
          <section className="grid gap-px bg-border sm:grid-cols-3">
            <Info label="Repair needs" value={String(item.repairNeeds)} />
            <Info label="Coverage" value={coverageStatusLabels[item.coverageStatus]} />
            <Info label="Case status" value={caseStatusLabels[item.caseStatus]} />
          </section>
          <section className="mt-10">
            <SectionLabel number="01">Repair needs & resource alignment</SectionLabel>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {item.needs.map((need) => (
                <article
                  key={need.repairNeedId}
                  className="grid gap-5 py-6 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div>
                    <span className="eyebrow">{need.repairNeedId}</span>
                    <h2 className="mt-2 text-3xl">{need.repairLabel}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PriorityBadge priority={priorityLabels[need.priority]} />
                      <StatusBadge
                        tone={
                          need.coverageStatus === "funding_gap"
                            ? "danger"
                            : need.coverageStatus === "verification_needed"
                              ? "warning"
                              : "positive"
                        }
                      >
                        {coverageStatusLabels[need.coverageStatus]}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="min-w-56 lg:text-right">
                    <span className="eyebrow">Program match</span>
                    <p className="mt-2 font-semibold">
                      {need.programId ? programNames[need.programId] : "No resource identified"}
                    </p>
                    <small className="text-muted-foreground">
                      {matchStatusLabels[need.matchStatus]}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="mt-10">
            <SectionLabel number="02">Case history</SectionLabel>
            <ol className="mt-5 divide-y divide-border border-y border-border">
              <li className="grid grid-cols-[130px_1fr] py-4 text-sm">
                <b>{reportedDate}</b>
                <span>Repair needs entered into the synthetic planning dataset</span>
              </li>
              <li className="grid grid-cols-[130px_1fr] py-4 text-sm">
                <b>Current</b>
                <span>{caseStatusLabels[item.caseStatus]}</span>
              </li>
            </ol>
          </section>
        </div>
        <aside className="space-y-6">
          <div className="bg-navy p-6 text-primary-foreground">
            <p className="eyebrow text-warning">Current next action</p>
            <h2 className="mt-3 text-3xl">{nextAction}</h2>
            <p className="mt-3 text-sm text-primary-foreground/65">
              Planning guidance generated from synthetic case status and coverage.
            </p>
          </div>
          {item.coverageStatus !== "potentially_covered" && (
            <div>
              <p className="eyebrow">Resource attention</p>
              <div className="mt-3 flex gap-3 border border-rust/40 bg-rust/8 p-4">
                <FileWarning className="size-5 text-rust" />
                <span className="text-sm font-semibold">
                  {coverageStatusLabels[item.coverageStatus]}
                </span>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Button className="min-h-12 rounded-none bg-primary">
              <Send />
              Request Information
            </Button>
            <Button variant="outline" className="min-h-12 rounded-none">
              <Wrench />
              Review Program Pathway
            </Button>
            <Button variant="outline" className="min-h-12 rounded-none">
              <Clock />
              Mark for Review
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}

function CaseLoadError() {
  return (
    <div className="py-16">
      <DemoFlag />
      <PageIntro
        eyebrow="Case unavailable"
        title="Synthetic case not found"
        description="This case is not part of the current deterministic demonstration dataset."
      />
      <Button asChild variant="outline" className="mt-6 rounded-none">
        <Link to="/partner/cases">
          <ArrowLeft />
          Back to repair cases
        </Link>
      </Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <span className="eyebrow">{label}</span>
      <strong className="mt-2 block">{value}</strong>
    </div>
  );
}
