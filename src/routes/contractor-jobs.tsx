import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BriefcaseBusiness, LockKeyhole, MapPin } from "lucide-react";
import { useState } from "react";

import { DemoFlag, PageIntro, PriorityBadge, StatusBadge } from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { Button } from "@/components/ui/button";
import { getPublicOpportunities, type PublicOpportunity } from "@/lib/homefix-api";

export const Route = createFileRoute("/contractor-jobs")({
  loader: () => getPublicOpportunities(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  head: () => ({
    meta: [
      { title: "Available Contractor Jobs - HomeFix 313" },
      {
        name: "description",
        content: "Browse redacted Detroit repair opportunities without creating an account.",
      },
    ],
  }),
  component: ContractorJobs,
});

const typeLabels: Record<PublicOpportunity["type"], string> = {
  inspection: "Inspection",
  repair: "Repair",
  training: "Training",
};

const statusLabels: Record<PublicOpportunity["status"], string> = {
  open: "Open",
  responses_received: "Responses received",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
};

function ContractorJobs() {
  const page = Route.useLoaderData();
  const [type, setType] = useState<PublicOpportunity["type"] | "all">("all");
  const [zipCode, setZipCode] = useState("all");
  const zipCodes = [...new Set(page.items.map((item) => item.zipCode))].sort();
  const jobs = page.items.filter(
    (item) =>
      (type === "all" || item.type === type) &&
      (zipCode === "all" || item.zipCode === zipCode),
  );

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
        <DemoFlag />
        <PageIntro
          eyebrow="Guest contractor access"
          title="Available Jobs"
          description="Review public repair opportunities before creating an account. Homeowner identity, contact information, documents, and exact street address are redacted."
          action={
            <Button asChild className="rounded-none">
              <Link to="/contractors">
                <LockKeyhole aria-hidden="true" />
                Sign In to Respond
              </Link>
            </Button>
          }
        />

        <section className="mt-8 border-y border-foreground py-5" aria-label="Job filters">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <label className="grid gap-2 text-xs font-bold uppercase">
              Work type
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as PublicOpportunity["type"] | "all")
                }
                className="min-h-12 border border-foreground bg-background px-3 text-sm font-semibold normal-case"
              >
                <option value="all">All work types</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase">
              Detroit ZIP
              <select
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="min-h-12 border border-foreground bg-background px-3 text-sm font-semibold normal-case"
              >
                <option value="all">All ZIP codes</option>
                {zipCodes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Public opportunity board</p>
            <h2 className="mt-2 text-3xl">{jobs.length} jobs available</h2>
          </div>
          <StatusBadge tone="positive">Sensitive details hidden</StatusBadge>
        </div>

        {jobs.length === 0 ? (
          <div className="mt-7 border border-dashed border-border p-8 text-sm text-muted-foreground">
            No available jobs match these filters.
          </div>
        ) : (
          <section className="mt-7 grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <article
                key={job.publicNumber}
                className="flex min-h-80 min-w-0 flex-col bg-background p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge tone={job.status === "open" ? "positive" : "warning"}>
                    {statusLabels[job.status]}
                  </StatusBadge>
                  <span className="eyebrow">{job.publicNumber}</span>
                </div>
                <BriefcaseBusiness className="mt-7 size-7 text-primary" aria-hidden="true" />
                <p className="mt-4 text-xs font-bold uppercase text-primary">
                  {typeLabels[job.type]}
                </p>
                <h3 className="mt-2 text-3xl">{job.repairCategory}</h3>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="size-4" aria-hidden="true" />
                  {job.city}, {job.state} {job.zipCode}
                </p>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">{job.publicScope}</p>
                <div className="mt-auto flex flex-col items-start gap-3 pt-7 sm:flex-row sm:items-end sm:justify-between">
                  <PriorityBadge priority={job.priority} />
                  <Button asChild variant="outline" className="rounded-none">
                    <Link to="/contractors">Sign In to Respond</Link>
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}

        <Link
          to="/contractors"
          className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to contractor access
        </Link>
      </div>
    </div>
  );
}
