import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { DemoFlag, PageIntro, PriorityBadge, StatusBadge } from "@/components/homefix";
import { Button } from "@/components/ui/button";
import {
  createOverflowWorkOrder,
  getOverflowCandidates,
  getOverflowWorkOrders,
} from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";
export const Route = createFileRoute("/partner/overflow/")({
  loader: async () => {
    const [candidates, workOrders] = await Promise.all([
      getOverflowCandidates(),
      getOverflowWorkOrders(),
    ]);
    return { candidates, workOrders };
  },
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
  component: Overflow,
});
function Overflow() {
  const { candidates, workOrders } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/partner/overflow/" });
  const [isCreating, setIsCreating] = useState("");
  const [error, setError] = useState("");

  async function createJob(repairNeedId: string) {
    setIsCreating(repairNeedId);
    setError("");
    try {
      const workOrder = await createOverflowWorkOrder(repairNeedId);
      navigate({ to: "/partner/overflow/$jobId", params: { jobId: workOrder.id } });
    } catch (caught) {
      console.error(caught);
      setError("Unable to create the Overflow Job. Please retry.");
    } finally {
      setIsCreating("");
    }
  }

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="HomeFix Overflow Network"
        title="Move approved repairs into available capacity."
        description="A synthetic demonstration of approved work moving from an overloaded program to contractor bids."
      />
      <section className="mt-8 border-y border-foreground py-8">
        <p className="eyebrow">Approved repair candidates</p>
        {candidates.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Complete the Denise guided assessment to create the approved roof candidate.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {candidates.map((candidate) => (
              <article
                key={candidate.repairNeedId}
                className="grid gap-5 border border-border p-5 lg:grid-cols-[1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="positive">Program Approved</StatusBadge>
                    <StatusBadge tone="danger">Program Overloaded</StatusBadge>
                    <PriorityBadge priority="High" />
                  </div>
                  <h2 className="mt-4 text-3xl">{candidate.streetAddress}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {toRepairCategoryLabel(candidate.category)} · {candidate.programName} ·{" "}
                    {candidate.zipCode}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-rust">
                    {candidate.capacity.excessDemand} repairs exceed modeled capacity
                  </p>
                </div>
                {candidate.workOrderId ? (
                  <Button asChild className="min-h-12 rounded-none">
                    <Link
                      to="/partner/overflow/$jobId"
                      params={{ jobId: candidate.workOrderId }}
                    >
                      View Overflow Job <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="min-h-12 rounded-none"
                    disabled={isCreating === candidate.repairNeedId}
                    onClick={() => createJob(candidate.repairNeedId)}
                  >
                    <Plus />
                    {isCreating === candidate.repairNeedId ? "Creating..." : "Create Overflow Job"}
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
        {error && <p className="mt-4 text-sm font-semibold text-rust">{error}</p>}
      </section>
      <section className="py-10">
        <p className="eyebrow">Created Overflow Jobs</p>
        <div className="mt-5 divide-y divide-border border-y border-border">
          {workOrders.length === 0 ? (
            <p className="py-6 text-muted-foreground">No Overflow Jobs created yet.</p>
          ) : (
            workOrders.map((job) => (
              <Link
                key={job.id}
                to="/partner/overflow/$jobId"
                params={{ jobId: job.id }}
                className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span>
                  <b>{job.workOrderNumber}</b>
                  <small className="mt-1 block text-muted-foreground">
                    {job.streetAddress} · {toRepairCategoryLabel(job.category)} · {job.bids.length}{" "}
                    bids
                  </small>
                </span>
                <ArrowRight className="size-5" />
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
