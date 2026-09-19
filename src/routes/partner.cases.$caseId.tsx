import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, FileWarning, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DemoFlag,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { createOverflowJob, getPartnerCase } from "@/lib/homefix-api";
import {
  caseStatusLabels,
  coverageStatusLabels,
  matchStatusLabels,
  priorityLabels,
} from "../../server/domain/partnerAnalytics";

const programNames: Record<string, string> = {
  "critical-home-repair": "Critical Home Repair",
  "wayne-metro-weatherization": "Wayne Metro Weatherization",
  "zero-percent-home-repair-loan": "0% Interest Home Repair Loan",
  "detroit-leadsafe-housing": "Detroit LeadSafe Housing",
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
  const [createdJob, setCreatedJob] = useState(item.overflow?.existingWorkOrder ?? null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const overflowNeed = useMemo(
    () =>
      item.needs.find(
        (need) =>
          need.programId === item.overflow?.programId && need.coverageStatus === "potentially_covered",
      ) ?? item.needs[0],
    [item.needs, item.overflow?.programId],
  );
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

  const createJob = async () => {
    if (!overflowNeed) return;
    setIsCreatingJob(true);
    try {
      const payload = await createOverflowJob(item.caseId, overflowNeed.repairNeedId);
      setCreatedJob({
        id: payload.id,
        workOrderNumber: payload.workOrderNumber,
        status: payload.status,
        statusLabel: payload.statusLabel,
      });
    } catch (error) {
      console.error(error);
      window.alert("We couldn’t create the overflow job yet. Please try again.");
    } finally {
      setIsCreatingJob(false);
    }
  };

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
            <SectionLabel number="02">Overflow capacity</SectionLabel>
            <div className="mt-5 border border-border p-6">
              <span className="eyebrow">Delivery capacity</span>
              <h2 className="mt-2 text-3xl">
                {item.overflow?.programId ? programNames[item.overflow.programId] : "Not configured"}
              </h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <CapacityItem
                  label="Funding status"
                  value={item.overflow?.fundingStatusLabel ?? "Not available"}
                />
                <CapacityItem
                  label="Capacity"
                  value={item.overflow?.capacityStatusLabel ?? "Not available"}
                />
                <CapacityItem
                  label="Selected repair"
                  value={overflowNeed?.repairLabel ?? "Not available"}
                />
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                {item.overflow?.explanation ??
                  "Overflow creation is available only for configured demo cases with approved funding and full program capacity."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {createdJob ? (
                  <>
                    <div className="border border-border px-4 py-3">
                      <p className="eyebrow">Overflow Job Created</p>
                      <p className="mt-2 text-xl font-semibold">{createdJob.workOrderNumber}</p>
                      <p className="text-sm text-muted-foreground">{createdJob.statusLabel}</p>
                    </div>
                    <Button asChild className="min-h-12 rounded-none bg-primary">
                      <Link
                        to="/partner/overflow/$jobId"
                        params={{ jobId: createdJob.workOrderNumber }}
                      >
                        View Job Package
                        <ArrowRight />
                      </Link>
                    </Button>
                  </>
                ) : item.overflow?.eligible ? (
                  <Button
                    className="min-h-12 rounded-none bg-primary"
                    onClick={createJob}
                    disabled={isCreatingJob}
                  >
                    <Wrench />
                    {isCreatingJob ? "Creating Overflow Job…" : "Create Overflow Job"}
                  </Button>
                ) : (
                  <StatusBadge tone="warning">Overflow job not available for this case</StatusBadge>
                )}
              </div>
            </div>
          </section>
          <section className="mt-10">
            <SectionLabel number="03">Case history</SectionLabel>
            <ol className="mt-5 divide-y divide-border border-y border-border">
              <li className="grid grid-cols-[130px_1fr] py-4 text-sm">
                <b>{reportedDate}</b>
                <span>Repair needs entered into the synthetic planning dataset</span>
              </li>
              {createdJob && (
                <li className="grid grid-cols-[130px_1fr] py-4 text-sm">
                  <b>Current</b>
                  <span>{`${createdJob.workOrderNumber} opened for contractor response`}</span>
                </li>
              )}
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

function CapacityItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
