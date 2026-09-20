import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  DemoFlag,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import {
  getOverflowWorkOrder,
  submitOverflowBid,
  type OverflowWorkOrder,
} from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";
export const Route = createFileRoute("/partner/overflow/$jobId")({
  loader: ({ params }) => getOverflowWorkOrder(params.jobId),
  head: ({ params }) => ({
    meta: [
      { title: `Overflow Job ${params.jobId} — HomeFix 313` },
      {
        name: "description",
        content: "Future demo job package for home repair capacity coordination.",
      },
      { property: "og:title", content: `Overflow Job ${params.jobId} — HomeFix 313` },
      { property: "og:description", content: "A future HomeFix Overflow Network job package." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Job,
});
function Job() {
  const initial = Route.useLoaderData();
  const [workOrder, setWorkOrder] = useState<OverflowWorkOrder>(initial);
  const [contractorName, setContractorName] = useState("Detroit Roofing Cooperative");
  const [estimatedPrice, setEstimatedPrice] = useState("18500");
  const [estimatedDurationDays, setEstimatedDurationDays] = useState("14");
  const [notes, setNotes] = useState("Can begin site assessment within five business days.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const updated = await submitOverflowBid(workOrder.id, {
        contractorName,
        estimatedPrice: Number(estimatedPrice),
        estimatedDurationDays: Number(estimatedDurationDays),
        notes,
      });
      setWorkOrder(updated);
    } catch (caught) {
      console.error(caught);
      setError("Unable to submit this bid. Check the fields and retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow={`Overflow Job ${workOrder.workOrderNumber}`}
        title={workOrder.streetAddress}
        description={`${toRepairCategoryLabel(workOrder.category)} · ${workOrder.zipCode}`}
        action={<PriorityBadge priority="High" />}
      />
      <div className="mt-8 grid gap-10 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="mock-damage-photo min-h-80">
            <span>Roof repair documentation</span>
          </div>
          <section className="mt-10">
            <SectionLabel number="01">Approved job package</SectionLabel>
            <dl className="mt-5 divide-y divide-border border-y border-border">
              <Row label="Case" value={workOrder.caseNumber} />
              <Row label="Program" value={workOrder.programName} />
              <Row label="Approval" value="Program Approved" />
              <Row label="Scope" value={workOrder.scope} />
              <Row label="Status" value={workOrder.status.replaceAll("_", " ")} />
            </dl>
          </section>
          <section className="mt-10">
            <SectionLabel number="02">Submitted bids</SectionLabel>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {workOrder.bids.length === 0 ? (
                <p className="py-6 text-muted-foreground">No contractor bids submitted yet.</p>
              ) : (
                workOrder.bids.map((bid) => (
                  <article key={bid.id} className="py-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-2xl">{bid.contractorName}</h2>
                      <StatusBadge tone="positive">Submitted</StatusBadge>
                    </div>
                    <p className="mt-3 font-semibold">
                      ${bid.estimatedPrice.toLocaleString()} · {bid.estimatedDurationDays} days
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{bid.notes}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
        <aside>
          <form onSubmit={submit} className="border border-foreground p-6">
            <p className="eyebrow">Contractor demo view</p>
            <h2 className="mt-2 text-3xl">Submit Estimate / Bid</h2>
            <Field label="Contractor name">
              <input
                required
                value={contractorName}
                onChange={(event) => setContractorName(event.target.value)}
              />
            </Field>
            <Field label="Estimated price">
              <input
                required
                min="1"
                step="0.01"
                type="number"
                value={estimatedPrice}
                onChange={(event) => setEstimatedPrice(event.target.value)}
              />
            </Field>
            <Field label="Estimated duration in days">
              <input
                required
                min="1"
                type="number"
                value={estimatedDurationDays}
                onChange={(event) => setEstimatedDurationDays(event.target.value)}
              />
            </Field>
            <Field label="Notes">
              <textarea
                required
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            {error && <p className="mt-4 text-sm font-semibold text-rust">{error}</p>}
            <Button className="mt-6 min-h-12 w-full rounded-none" disabled={isSubmitting}>
              <Send /> {isSubmitting ? "Submitting..." : "Submit Bid"}
            </Button>
          </form>
        </aside>
      </div>
    </>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[190px_1fr]">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-5 block text-sm font-bold">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
