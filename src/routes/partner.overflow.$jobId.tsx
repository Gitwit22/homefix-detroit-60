import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Camera, ClipboardList, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DemoFlag,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { getOverflowJob, submitBid } from "@/lib/homefix-api";

export const Route = createFileRoute("/partner/overflow/$jobId")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "contractor" ? "contractor" : "admin",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Overflow Job ${params.jobId} — HomeFix 313` },
      {
        name: "description",
        content: "Live HomeFix overflow network job package for demonstration use.",
      },
      { property: "og:title", content: `Overflow Job ${params.jobId} — HomeFix 313` },
      {
        property: "og:description",
        content: "A HomeFix Overflow Network job package with contractor response workflow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ params }) => getOverflowJob(params.jobId),
  component: Job,
});

function Job() {
  const mode = Route.useSearch().mode;
  const initialJob = Route.useLoaderData();
  const [job, setJob] = useState(initialJob);
  const [companyName, setCompanyName] = useState("Reed Residential Services");
  const [contractorName, setContractorName] = useState("Marcus Reed");
  const [estimatedPrice, setEstimatedPrice] = useState("8400");
  const [estimatedDuration, setEstimatedDuration] = useState("5");
  const [notes, setNotes] = useState(
    "Roof inspection and moisture assessment required before final scope.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    estimatedPriceCents: number;
    estimatedDurationDays: number;
    statusLabel: string;
  } | null>(null);

  useEffect(() => {
    setJob(initialJob);
    setConfirmation(null);
  }, [initialJob]);

  const submitContractorBid = async () => {
    const estimatedPriceValue = Math.round(Number(estimatedPrice) * 100);
    const estimatedDurationValue = Number(estimatedDuration);
    if (!companyName.trim() || !contractorName.trim()) {
      window.alert("Company name and contractor name are required.");
      return;
    }
    if (!Number.isFinite(estimatedPriceValue) || estimatedPriceValue <= 0) {
      window.alert("Estimated price must be greater than zero.");
      return;
    }
    if (!Number.isInteger(estimatedDurationValue) || estimatedDurationValue <= 0) {
      window.alert("Estimated duration must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await submitBid(job.workOrderNumber, {
        companyName,
        contractorName,
        estimatedPriceCents: estimatedPriceValue,
        estimatedDurationDays: estimatedDurationValue,
        notes,
      });
      setJob(payload);
      setConfirmation({
        estimatedPriceCents: estimatedPriceValue,
        estimatedDurationDays: estimatedDurationValue,
        statusLabel: payload.bids[0]?.statusLabel ?? "Submitted for Program Review",
      });
    } catch (error) {
      console.error(error);
      window.alert("We couldn’t submit this contractor response yet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="HomeFix Overflow Network"
        title={job.workOrderNumber}
        description={`${job.repairLabel} · ${job.city}, ${job.state} ${job.zipCode}`}
        action={<PriorityBadge priority={job.priorityLabel} />}
      />
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant={mode === "admin" ? "default" : "outline"} className="rounded-none">
          <Link
            to="/partner/overflow/$jobId"
            params={{ jobId: job.workOrderNumber }}
            search={{ mode: "admin" }}
          >
            <ClipboardList />
            Admin Review
          </Link>
        </Button>
        <Button
          asChild
          variant={mode === "contractor" ? "default" : "outline"}
          className="rounded-none"
        >
          <Link
            to="/partner/overflow/$jobId"
            params={{ jobId: job.workOrderNumber }}
            search={{ mode: "contractor" }}
          >
            <Send />
            Contractor Demo
          </Link>
        </Button>
      </div>
      <div className="mt-8 grid gap-10 xl:grid-cols-[1fr_360px]">
        <div>
          <section className="grid gap-3 sm:grid-cols-3">
            <PriorityBadge priority={job.priorityLabel} />
            <StatusBadge tone="positive">{job.fundingStatusLabel}</StatusBadge>
            <StatusBadge tone={job.status === "open" ? "warning" : "positive"}>
              {job.statusLabel}
            </StatusBadge>
          </section>
          <section className="mt-10">
            <SectionLabel number="01">Repair information</SectionLabel>
            <div className="mt-5 divide-y divide-border border-y border-border">
              <Row k="Reported issue" v={job.description} />
              <Row
                k="Preliminary HomeFix assessment"
                v={job.assessmentSummary ?? "No preliminary assessment summary available."}
              />
              <Row k="Priority" v={job.priorityLabel} />
              <Row k="Photos" v={`${job.photoCount} available`} />
              <Row k="Requested action" v={job.requestedAction} />
            </div>
          </section>
          <section className="mt-10">
            <SectionLabel number="02">Job package</SectionLabel>
            <div className="mt-5 whitespace-pre-line border border-border bg-secondary/40 p-6">
              {job.scope}
            </div>
          </section>
          {mode === "admin" && (
            <section className="mt-10">
              <SectionLabel number="03">Contractor responses</SectionLabel>
              {job.bids.length === 0 ? (
                <div className="mt-5 border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No contractor responses yet.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {job.bids.map((bid) => (
                    <article key={bid.id} className="border border-border p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="eyebrow">Contractor Response</p>
                          <h3 className="mt-2 text-2xl font-semibold">{bid.companyName}</h3>
                          <p className="text-sm text-muted-foreground">{bid.contractorName}</p>
                        </div>
                        <StatusBadge tone="positive">{bid.statusLabel}</StatusBadge>
                      </div>
                      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                        <CardStat
                          label="Estimated Cost"
                          value={formatMoney(bid.estimatedPriceCents)}
                        />
                        <CardStat
                          label="Estimated Duration"
                          value={`${bid.estimatedDurationDays} Days`}
                        />
                        <CardStat
                          label="Submitted"
                          value={new Intl.DateTimeFormat("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          }).format(new Date(bid.createdAt))}
                        />
                      </dl>
                      {bid.notes && (
                        <div className="mt-4 text-sm">
                          <p className="eyebrow">Notes</p>
                          <p className="mt-2">{bid.notes}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {mode === "contractor" && (
            <section className="mt-10">
              <SectionLabel number="03">Submit assessment / bid</SectionLabel>
              {confirmation ? (
                <div className="mt-5 border border-border p-6">
                  <p className="eyebrow">Bid Submitted</p>
                  <h3 className="mt-2 text-3xl font-semibold">{job.workOrderNumber}</h3>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                    <CardStat
                      label="Estimated Cost"
                      value={formatMoney(confirmation.estimatedPriceCents)}
                    />
                    <CardStat
                      label="Estimated Duration"
                      value={`${confirmation.estimatedDurationDays} days`}
                    />
                    <CardStat label="Status" value={confirmation.statusLabel} />
                  </dl>
                  <div className="mt-6">
                    <Button asChild className="rounded-none bg-primary">
                      <Link
                        to="/partner/overflow/$jobId"
                        params={{ jobId: job.workOrderNumber }}
                        search={{ mode: "admin" }}
                      >
                        View Admin Review
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  className="mt-5 grid gap-4 border border-border p-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitContractorBid();
                  }}
                >
                  <FormField label="Company Name">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Contractor Name">
                    <input
                      type="text"
                      value={contractorName}
                      onChange={(event) => setContractorName(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Estimated Price">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="decimal"
                      value={estimatedPrice}
                      onChange={(event) => setEstimatedPrice(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Estimated Duration (days)">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={estimatedDuration}
                      onChange={(event) => setEstimatedDuration(event.target.value)}
                    />
                  </FormField>
                  <FormField label="Notes">
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </FormField>
                  <Button
                    type="submit"
                    className="min-h-12 rounded-none bg-primary"
                    disabled={isSubmitting}
                  >
                    <Send />
                    {isSubmitting ? "Submitting Bid…" : "Submit Bid"}
                  </Button>
                </form>
              )}
            </section>
          )}
        </div>
        <aside className="space-y-6">
          <div className="bg-secondary p-6">
            <p className="eyebrow">Program</p>
            <h2 className="mt-3 text-2xl">{job.programName}</h2>
            <dl className="mt-5 space-y-4">
              <Side k="Delivery status" v="Overflow capacity requested" />
              <Side k="Program funding" v={job.fundingStatusLabel} />
              <Side k="Responses" v={String(job.responseCount)} />
            </dl>
          </div>
          <div className="bg-secondary/50 p-6">
            <p className="eyebrow">Repair information</p>
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Camera className="size-4" />
              <span>{job.photoCount} photos available</span>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              HomeFix organizes this work opportunity from verified resident-submitted information
              and preliminary assessment data. Final construction scope must be confirmed by the
              contractor.
            </div>
          </div>
          <Button asChild variant="outline" className="min-h-12 rounded-none">
            <Link to="/partner/overflow">
              <ArrowLeft />
              Back to Overflow Jobs
            </Link>
          </Button>
        </aside>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[220px_1fr]">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Side({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-muted-foreground">{k}</dt>
      <dd className="mt-1 font-semibold">{v}</dd>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}
