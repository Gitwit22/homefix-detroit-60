import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ExternalLink, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoSessionPanel } from "@/components/demo-session-panel";
import { DemoFlag, PriorityBadge, SectionLabel, StatusBadge } from "@/components/homefix";
import { ResidentCaseRequired } from "@/components/resident-case-required";
import { getCase, isValidAssessment, uploadCaseDocument } from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";
import { resolveResidentCaseId } from "@/lib/resident-case";

export const Route = createFileRoute("/passport")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : "",
    availabilitySaved:
      search["availabilitySaved"] === true || search["availabilitySaved"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "HomeFix Passport" },
      {
        name: "description",
        content: "A digital property dossier for repair needs, documents, and assistance progress.",
      },
      { property: "og:title", content: "HomeFix Passport" },
      { property: "og:description", content: "The HomeFix Repair Passport for your intake case." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PassportPage,
});

function PassportPage() {
  const { caseId: searchCaseId, availabilitySaved } = Route.useSearch();
  const caseId = resolveResidentCaseId(searchCaseId);
  const [isLoading, setIsLoading] = useState(true);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimVersion, setClaimVersion] = useState(0);

  useEffect(() => {
    if (!caseId) {
      setError("Missing caseId.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getCase(caseId);
        if (!cancelled) setPayload(result);
      } catch (err) {
        if (!cancelled) setError("Unable to load passport.");
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId, claimVersion]);

  const reloadPassport = async () => {
    if (caseId) setPayload(await getCase(caseId));
  };

  const completedDocuments = useMemo(
    () => payload?.documents.filter((doc) => doc.status !== "missing").length ?? 0,
    [payload],
  );
  const totalDocuments = payload?.documents.length ?? 0;
  const readiness =
    totalDocuments === 0 ? 0 : Math.round((completedDocuments / totalDocuments) * 100);
  const assessedNeedCount = useMemo(() => {
    const ids = new Set(
      (payload?.assessments ?? [])
        .filter(isValidAssessment)
        .map((assessment) => assessment.repairNeedId),
    );
    return ids.size;
  }, [payload]);
  const passportReady = Boolean(
    payload?.repairNeeds.length && assessedNeedCount === payload.repairNeeds.length,
  );

  if (!caseId) return <ResidentCaseRequired pageName="Repair Passport" />;
  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-10">Loading passport...</div>;
  if (error || !payload || !payload.home || !payload.resident)
    return <div className="mx-auto max-w-7xl px-4 py-10">{error ?? "Passport not found."}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      {availabilitySaved && (
        <div className="mb-6 flex gap-3 border-l-4 border-primary bg-positive/20 p-5" role="status">
          <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">
            Your availability has been saved. A HomeFix partner will contact you to confirm an
            inspection time.
          </p>
        </div>
      )}
      <div className="border-2 border-foreground bg-paper">
        <header className="grid gap-6 border-b-8 border-primary p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          <div>
            <DemoFlag />
            <p className="mt-8 text-xs font-bold uppercase text-rust">
              {passportReady ? "Your Repair Passport is ready" : "Repair Passport in progress"}
            </p>
            <h1 className="mt-3 text-5xl uppercase leading-none sm:text-7xl">
              {payload.home.streetAddress}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {payload.home.city}, {payload.home.state} {payload.home.zipCode}
            </p>
          </div>
          <div className="flex flex-row gap-8 border-t border-border pt-5 sm:flex-col sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <div>
              <span className="eyebrow">Case Number</span>
              <strong className="mt-2 block">{payload.case.caseNumber}</strong>
            </div>
            <div>
              <span className="eyebrow">Status</span>
              <div className="mt-2">
                <StatusBadge tone={payload.lifecycle.complete ? "positive" : "warning"}>
                  {
                    payload.lifecycle.steps.find((step) => step.stage === payload.lifecycle.stage)
                      ?.label
                  }
                </StatusBadge>
              </div>
            </div>
          </div>
        </header>

        <div className="flex gap-3 border-b border-foreground bg-positive/20 p-5 sm:px-8">
          <Check className="size-5 shrink-0" />
          <p className="text-sm">
            <strong>Your Repair Passport has been saved on this device.</strong>
            <span className="mt-1 block text-muted-foreground">
              No account is required. Return from this browser to continue your repair journey.
            </span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2">
          <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <SectionLabel number="01">Property profile</SectionLabel>
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6">
              <Item k="Occupancy" v={payload.home.occupancyType} />
              <Item
                k="Residence"
                v={payload.home.primaryResidence ? "Primary residence" : "Non-primary"}
              />
              <Item k="Location" v={`${payload.home.city} property`} />
              <Item k="Time at property" v={`${payload.home.yearsAtProperty ?? 0} years`} />
            </dl>
            <div className="mt-10">
              <SectionLabel number="02">Household profile</SectionLabel>
              <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6">
                <Item
                  k="Applicant"
                  v={`${payload.resident.firstName} ${payload.resident.lastName}`}
                />
                <Item k="Residents" v={`${payload.home.householdSize ?? 0} people`} />
                <Item k="Income range" v={payload.home.incomeRange ?? "Not provided"} />
                <Item
                  k="Accessibility"
                  v={payload.home.accessibilityNeeds ? "Needs support" : "No current need"}
                />
              </dl>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <SectionLabel number="03">Repair needs and assessment</SectionLabel>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {payload.repairNeeds.map((need) => (
                <Repair
                  key={need.id}
                  name={toRepairCategoryLabel(need.category)}
                  priority={toPriority(need.urgency)}
                />
              ))}
            </div>
          </div>
        </div>

        {payload.inspection && (
          <section className="border-t border-foreground p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionLabel number="04">Inspection</SectionLabel>
                <h2 className="mt-4 text-3xl">{inspectionHeading(payload.inspection.status)}</h2>
              </div>
              <CalendarDays className="size-7 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <span>✓ Availability Submitted</span>
              <span>
                {["assigned", "scheduled", "completed"].includes(payload.inspection.status)
                  ? "✓ Inspector Assigned"
                  : "○ Inspector Assignment"}
              </span>
              <span>
                {["scheduled", "completed"].includes(payload.inspection.status)
                  ? "✓ Inspection Scheduled"
                  : "○ Appointment Scheduling"}
              </span>
            </div>
            {payload.inspection.confirmedStart && payload.inspection.confirmedEnd ? (
              <dl className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                <Item
                  k="Status"
                  v={payload.inspection.status === "completed" ? "Completed" : "Scheduled"}
                />
                <Item k="Date" v={formatInspectionDate(payload.inspection.confirmedStart)} />
                <Item
                  k="Time"
                  v={formatInspectionTime(
                    payload.inspection.confirmedStart,
                    payload.inspection.confirmedEnd,
                  )}
                />
                <Item k="Provider" v={payload.inspection.providerName ?? "To be confirmed"} />
                <Item
                  k="Organization"
                  v={payload.inspection.providerOrganizationName ?? "To be confirmed"}
                />
                <Item k="Contact" v={payload.inspection.providerPhone ?? "Not provided"} />
              </dl>
            ) : payload.inspection.status === "assigned" ? (
              <dl className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
                <Item k="Inspector" v={payload.inspection.assignedWorkerName ?? "Assigned"} />
                <Item
                  k="Organization"
                  v={payload.inspection.providerOrganizationName ?? "HomeFix provider"}
                />
                <p className="sm:col-span-2 text-sm text-muted-foreground">
                  We are coordinating an appointment using the availability you provided.
                </p>
              </dl>
            ) : (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Your availability is on file. A HomeFix partner will contact you after selecting an
                inspection window.
              </p>
            )}
          </section>
        )}

        <section className="border-t border-foreground p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="eyebrow">Documents required before final verification</span>
              <h2 className="mt-2 text-4xl">Prepare these documents for partner review</h2>
            </div>
            <div className="w-full max-w-md">
              <div className="h-4 bg-muted">
                <span className="block h-full bg-primary" style={{ width: `${readiness}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {payload.documents.map((doc) => {
              const done = doc.status !== "missing";
              return (
                <div key={doc.id} className="flex gap-3 border-t border-border py-4 text-sm">
                  <span className={done ? "text-primary" : "text-rust"}>
                    {done ? <Check className="size-4" /> : <FileText className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong>{doc.documentType}</strong>
                    <small className="block text-muted-foreground">
                      {documentStatusLabel(doc.status)}
                    </small>
                    {doc.reviewNotes && (
                      <small className="mt-1 block text-rust">{doc.reviewNotes}</small>
                    )}
                    <span className="mt-3 flex flex-wrap gap-2">
                      <label className="blueprint-button button-secondary inline-flex cursor-pointer items-center gap-2">
                        <Upload className="size-4" />
                        {done ? "Replace" : "Upload"}
                        <input
                          type="file"
                          className="sr-only"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            try {
                              await uploadCaseDocument(caseId, doc.documentType, file);
                              await reloadPassport();
                            } catch (uploadError) {
                              window.alert(
                                uploadError instanceof Error
                                  ? uploadError.message
                                  : "Unable to upload document.",
                              );
                            } finally {
                              event.target.value = "";
                            }
                          }}
                        />
                      </label>
                      {doc.downloadUrl && (
                        <Button asChild variant="outline" className="rounded-none">
                          <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                            <ExternalLink /> View
                          </a>
                        </Button>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-px bg-border sm:grid-cols-3">
          <Stat value={String(payload.matches.length)} label="Potential Programs" />
          <Stat value={String(assessedNeedCount)} label="Assessed Repairs" />
          <Stat value={String(payload.case.coveragePercentage) + "%"} label="Potential Coverage" />
        </section>

        <section className="border-t border-foreground p-6 sm:p-8">
          <SectionLabel number={payload.inspection ? "05" : "04"}>
            Repair Passport Progress
          </SectionLabel>
          <ol className="mt-6 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {payload.lifecycle.steps.map((step) => (
              <li key={step.stage} className="flex min-h-24 items-center gap-3 bg-paper p-4">
                <span
                  className={`grid size-7 shrink-0 place-items-center ${step.status === "complete" ? "bg-primary text-primary-foreground" : step.status === "current" ? "bg-warning text-foreground" : "border border-border"}`}
                >
                  {step.status === "complete" ? <Check className="size-4" /> : null}
                </span>
                <span>
                  <strong className="block">{step.label}</strong>
                  <small className="text-muted-foreground">
                    {step.status === "complete"
                      ? "Complete"
                      : step.status === "current"
                        ? "Current"
                        : "Pending"}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="flex flex-col justify-between gap-5 border-t border-foreground p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="text-xs text-muted-foreground">Next: {payload.lifecycle.nextAction}</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="blueprint-button button-primary inline-flex items-center"
              data-guide-target="passport-next"
              to="/coverage"
              search={{ caseId }}
            >
              View Coverage Plan
            </Link>
            <Link
              className="blueprint-button button-secondary inline-flex items-center"
              to="/intake"
              search={{}}
            >
              Start New Assessment
            </Link>
          </div>
        </footer>
      </div>
      <div className="mt-8">
        <DemoSessionPanel caseId={caseId} onClaimed={() => setClaimVersion((value) => value + 1)} />
      </div>
    </div>
  );
}

function inspectionHeading(status: string) {
  if (status === "availability_requested") return "Awaiting inspection availability";
  if (status === "availability_submitted") return "Awaiting inspector assignment";
  if (status === "assigned") return "Inspector assigned";
  if (status === "completed") return "Inspection completed";
  return "Inspection scheduled";
}

function documentStatusLabel(status: string) {
  if (status === "approved") return "Approved by partner";
  if (status === "rejected") return "Needs attention";
  if (status === "uploaded") return "Available for review";
  return "Verification pending";
}

function formatInspectionDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Detroit",
  }).format(new Date(value));
}

function formatInspectionTime(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
  });
  return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
}

function toPriority(urgency: string) {
  if (urgency === "critical") return "Critical";
  if (urgency === "high") return "High";
  if (urgency === "moderate") return "Moderate";
  return "Low";
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-muted-foreground">{k}</dt>
      <dd className="mt-1 font-semibold">{v}</dd>
    </div>
  );
}

function Repair({ name, priority }: { name: string; priority: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <strong>{name}</strong>
      <PriorityBadge priority={priority} />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-paper p-6">
      <strong className="font-display text-5xl font-normal text-primary">{value}</strong>
      <span className="ml-3 text-xs font-bold uppercase">{label}</span>
    </div>
  );
}
