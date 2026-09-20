import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { DataTable, DemoFlag, PageIntro, PriorityBadge, StatusBadge } from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getOverflowJobs } from "@/lib/homefix-api";

export const Route = createFileRoute("/partner/overflow/")({
  head: () => ({
    meta: [
      { title: "Overflow Network — HomeFix 313" },
      {
        name: "description",
        content: "Future demo feature for program-funded repair capacity coordination.",
      },
      { property: "og:title", content: "Overflow Network — HomeFix 313" },
      {
        property: "og:description",
        content: "A future capacity-management concept for eligible repair jobs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getOverflowJobs(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: Overflow,
});

function Overflow() {
  const jobs = Route.useLoaderData();

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="HomeFix Overflow Network · Demo Feature"
        title="Program-funded work, prepared for delivery-capacity support."
        description="When an approved repair cannot be fulfilled immediately, HomeFix can create a structured job package for qualified contractor review. All data shown here is synthetic demonstration data."
      />
      <div className="mt-8 border-l-4 border-warning bg-warning/15 p-4 text-sm">
        <strong>Demo feature.</strong> This workflow is a concept for capacity support and is not
        official government procurement.
      </div>
      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-sm">
            <p>No overflow jobs have been created yet.</p>
            <p className="mt-2 text-muted-foreground">
              Create one from an eligible repair case.
            </p>
          </div>
        ) : (
          <DataTable
            headers={[
              "Job",
              "Repair Type",
              "Location",
              "Priority",
              "Program Funding",
              "Job Status",
              "Responses",
            ]}
            rows={jobs.map((job) => [
              <Link
                to="/partner/overflow/$jobId"
                params={{ jobId: job.workOrderNumber }}
                className="flex items-center gap-2 font-bold text-primary"
              >
                {job.workOrderNumber}
                <ArrowRight className="size-4" />
              </Link>,
              job.repairLabel,
              `${job.city}, ${job.state} ${job.zipCode}`,
              <PriorityBadge priority={job.priorityLabel} />,
              <StatusBadge tone="positive">{job.fundingStatusLabel}</StatusBadge>,
              <StatusBadge tone={job.status === "open" ? "warning" : "positive"}>
                {job.statusLabel}
              </StatusBadge>,
              `${job.responseCount} Responses`,
            ])}
          />
        )}
      </div>
    </>
  );
}
