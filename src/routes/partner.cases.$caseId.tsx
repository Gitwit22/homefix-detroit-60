import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  FileCheck,
  FileWarning,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DemoFlag,
  PageIntro,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { PartnerRouteLoading } from "@/components/partner-route-state";
import {
  assignInspectionProvider,
  confirmInspectionAppointment,
  createOverflowJob,
  getPartnerCase,
  rescheduleInspectionAppointment,
  reviewCaseDocument,
  saveInspectionFindings,
  type PartnerCaseDetail,
} from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";
import { repairCategories } from "../../server/domain/repair";
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
      { name: "description", content: "Partner case details and repair workflow." },
      { property: "og:title", content: `Repair Case ${params.caseId} — HomeFix 313` },
      { property: "og:description", content: "A HomeFix partner case dossier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ params }) => {
    try {
      return await getPartnerCase(params.caseId);
    } catch (error) {
      const baseError = error instanceof Error ? error : new Error("Case load failed");
      const statusMatch = /returned (\d{3})/.exec(baseError.message);
      const errorStatus = "status" in baseError ? baseError.status : undefined;
      const status =
        typeof errorStatus === "number"
          ? errorStatus
          : statusMatch
            ? Number(statusMatch[1])
            : undefined;
      throw Object.assign(baseError, { status });
    }
  },
  pendingComponent: PartnerRouteLoading,
  errorComponent: CaseLoadError,
  component: CaseDetail,
});

function CaseDetail() {
  const item = Route.useLoaderData();
  const router = useRouter();
  const [createdJob, setCreatedJob] = useState(item.overflow?.existingWorkOrder ?? null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const overflowNeed = useMemo(
    () =>
      item.needs.find(
        (need) =>
          need.programId === item.overflow?.programId &&
          need.coverageStatus === "potentially_covered",
      ) ?? null,
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
        description={`${item.zipCode} · Submitted repair assessment`}
        action={<PriorityBadge priority={priorityLabels[item.priority]} />}
      />
      <div className="mt-8 grid gap-10 xl:grid-cols-[1fr_360px]">
        <div>
          <section className="grid gap-px bg-border sm:grid-cols-3">
            <Info label="Repair needs" value={String(item.repairNeeds)} />
            <Info label="Coverage" value={coverageStatusLabels[item.coverageStatus]} />
            <Info label="Case status" value={caseStatusLabels[item.caseStatus]} />
          </section>
          {item.resident && (
            <section className="mt-10 border-y border-border py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="eyebrow">Resident</p>
                  <h2 className="mt-2 text-2xl">{item.resident.name}</h2>
                  {item.resident.phone && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.resident.phone}</p>
                  )}
                </div>
                <div>
                  <p className="eyebrow">Primary contact</p>
                  <h2 className="mt-2 text-2xl">
                    {item.primaryContact?.name ?? item.resident.name}
                  </h2>
                  {item.primaryContact?.relationship && (
                    <p className="mt-1 font-semibold">{item.primaryContact.relationship}</p>
                  )}
                  {(item.primaryContact?.phone ?? item.resident.phone) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.primaryContact?.phone ?? item.resident.phone}
                    </p>
                  )}
                  {item.primaryContact?.assistingWithApplication && (
                    <p className="mt-3 text-sm font-semibold text-primary">
                      Assisting with application
                    </p>
                  )}
                </div>
              </div>
              {item.assistant && !item.assistant.isPrimaryContact && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="eyebrow">Authorized assisting contact</p>
                  <p className="mt-2 font-semibold">{item.assistant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[item.assistant.relationship, item.assistant.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              )}
            </section>
          )}
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
            <SectionLabel number="02">Professional inspection</SectionLabel>
            <InspectionWorkspace
              caseId={item.caseId}
              inspectionPackage={item.inspectionPackage ?? null}
              onUpdated={() => router.invalidate()}
            />
          </section>
          <section className="mt-10">
            <SectionLabel number="03">Case documents</SectionLabel>
            <DocumentReviewWorkspace
              caseId={item.caseId}
              documents={item.documents ?? []}
              onUpdated={() => router.invalidate()}
            />
          </section>
          <section className="mt-10">
            <SectionLabel number="04">Overflow capacity</SectionLabel>
            <div className="mt-5 border border-border p-6">
              <span className="eyebrow">Delivery capacity</span>
              <h2 className="mt-2 text-3xl">
                {item.overflow?.programId
                  ? programNames[item.overflow.programId]
                  : "Not configured"}
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
                  "No overflow pathway is configured for this repair case."}
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
                ) : item.overflow?.eligible && overflowNeed ? (
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
            <SectionLabel number="05">Case history</SectionLabel>
            <ol className="mt-5 divide-y divide-border border-y border-border">
              <li className="grid grid-cols-[130px_1fr] py-4 text-sm">
                <b>{reportedDate}</b>
                <span>Repair assessment submitted to HomeFix</span>
              </li>
              {createdJob && (
                <li className="grid grid-cols-[130px_1fr] py-4 text-sm">
                  <b>Current</b>
                  <span>{`${createdJob.workOrderNumber} opened for contractor response`}</span>
                </li>
              )}
              {(item.events ?? [])
                .filter((event) =>
                  ["inspection_scheduled", "inspection_rescheduled"].includes(event.eventType),
                )
                .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
                .map((event) => (
                  <li key={event.id} className="grid grid-cols-[130px_1fr] py-4 text-sm">
                    <b>{formatHistoryDate(event.createdAt)}</b>
                    <span>{event.description ?? event.title}</span>
                  </li>
                ))}
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
              Planning guidance based on the current case status and resource matches.
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
        </aside>
      </div>
    </>
  );
}

type InspectionPackage = NonNullable<PartnerCaseDetail["inspectionPackage"]>;

function DocumentReviewWorkspace({
  caseId,
  documents,
  onUpdated,
}: {
  caseId: string;
  documents: NonNullable<PartnerCaseDetail["documents"]>;
  onUpdated: () => Promise<void>;
}) {
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(documents.map((document) => [document.id, document.reviewNotes ?? ""])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <p className="mt-5 border-y border-border py-6 text-sm text-muted-foreground">
        No document requirements are attached to this case.
      </p>
    );
  }

  const saveReview = async (documentId: string, status: "approved" | "rejected") => {
    setSavingId(documentId);
    try {
      await reviewCaseDocument(caseId, documentId, {
        status,
        reviewNotes: notes[documentId]?.trim() || null,
      });
      await onUpdated();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to review document.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mt-5 divide-y divide-border border-y border-border">
      {documents.map((document) => (
        <article
          key={document.id}
          className="grid gap-4 py-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
        >
          <div>
            <p className="eyebrow">{document.status}</p>
            <h3 className="mt-2 text-xl">{document.documentType}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {document.originalFilename ?? "No file uploaded"}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-semibold">
            Review notes
            <textarea
              className="min-h-20 border border-input bg-background p-3 font-normal"
              value={notes[document.id] ?? ""}
              disabled={!document.downloadUrl || savingId === document.id}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [document.id]: event.target.value }))
              }
              maxLength={2000}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {document.downloadUrl && (
              <Button asChild variant="outline" className="rounded-none">
                <a href={document.downloadUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-none"
              disabled={!document.downloadUrl || savingId === document.id}
              onClick={() => saveReview(document.id, "rejected")}
            >
              <FileWarning /> Reject
            </Button>
            <Button
              className="rounded-none"
              disabled={!document.downloadUrl || savingId === document.id}
              onClick={() => saveReview(document.id, "approved")}
            >
              <FileCheck /> Approve
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function InspectionWorkspace({
  caseId,
  inspectionPackage,
  onUpdated,
}: {
  caseId: string;
  inspectionPackage: InspectionPackage | null;
  onUpdated: () => Promise<void>;
}) {
  const [organizationName, setOrganizationName] = useState(
    inspectionPackage?.providerOrganizationName ?? "",
  );
  const [workerName, setWorkerName] = useState(inspectionPackage?.assignedWorkerName ?? "");
  const [workerPhone, setWorkerPhone] = useState(inspectionPackage?.assignedWorkerPhone ?? "");
  const [selectedStart, setSelectedStart] = useState(
    inspectionPackage?.confirmedStart ?? inspectionPackage?.availabilityWindows[0]?.start ?? "",
  );
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { answer: string; unable: boolean }>>(() =>
    Object.fromEntries(
      (inspectionPackage?.questions ?? []).map((question) => [
        question.id,
        { answer: question.answer ?? "", unable: question.unableToVerify },
      ]),
    ),
  );
  const [findings, setFindings] = useState<
    Record<
      string,
      {
        confirmedCategory: string;
        urgency: string;
        condition: string;
        notes: string;
        verifiedScope: string;
        estimatedCost: string;
        trainingSuitability: "" | "not_suitable" | "potential" | "suitable";
      }
    >
  >(() =>
    Object.fromEntries(
      (inspectionPackage?.needs ?? []).map((need) => [
        need.repairNeedId,
        {
          confirmedCategory: need.finding?.confirmedCategory ?? need.reportedCategory,
          urgency: need.finding?.urgency ?? need.assessment?.urgency ?? need.urgency,
          condition: need.finding?.condition ?? "",
          notes: need.finding?.notes ?? "",
          verifiedScope: need.finding?.verifiedScope ?? "",
          estimatedCost: need.finding?.estimatedCostCents
            ? String(need.finding.estimatedCostCents / 100)
            : "",
          trainingSuitability: need.finding?.trainingSuitability ?? "",
        },
      ]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!inspectionPackage) {
    return (
      <div className="mt-5 border-y border-border py-6">
        <StatusBadge tone="neutral">Not requested</StatusBadge>
        <p className="mt-3 text-sm text-muted-foreground">
          The resident has not submitted inspection availability for this case.
        </p>
      </div>
    );
  }

  const saveAssignment = async () => {
    if (organizationName.trim().length < 2 || workerName.trim().length < 2) {
      setError("Enter the provider organization and assigned worker.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await assignInspectionProvider(caseId, {
        providerOrganizationName: organizationName.trim(),
        assignedWorkerName: workerName.trim(),
        ...(workerPhone.trim() ? { assignedWorkerPhone: workerPhone.trim() } : {}),
      });
      await onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to assign inspector.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAppointment = async () => {
    const window = inspectionPackage.availabilityWindows.find(
      (candidate) => candidate.start === selectedStart,
    );
    if (!window) {
      setError("Choose a resident-provided appointment window.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const save = isRescheduling ? rescheduleInspectionAppointment : confirmInspectionAppointment;
      await save(caseId, {
        start: window.start,
        end: window.end,
      });
      setIsRescheduling(false);
      await onUpdated();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isRescheduling
            ? "Unable to reschedule inspection."
            : "Unable to confirm inspection.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const completeInspection = async () => {
    const incompleteQuestion = inspectionPackage.questions.some((question) => {
      const response = answers[question.id];
      return !response || (!response.unable && !response.answer.trim());
    });
    const incompleteFinding = inspectionPackage.needs.some((need) => {
      const finding = findings[need.repairNeedId];
      return (
        !finding?.condition.trim() || !finding.verifiedScope.trim() || !finding.trainingSuitability
      );
    });
    if (incompleteQuestion || incompleteFinding) {
      setError(
        incompleteQuestion
          ? "Answer every inspection question or mark it unable to verify."
          : "Record condition, scope, and training suitability for every repair need.",
      );
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await saveInspectionFindings(
        caseId,
        inspectionPackage.needs.map((need) => {
          const finding = findings[need.repairNeedId]!;
          const estimatedCost = Number(finding.estimatedCost);
          return {
            repairNeedId: need.repairNeedId,
            confirmedCategory: finding.confirmedCategory,
            urgency: finding.urgency,
            condition: finding.condition.trim(),
            ...(finding.notes.trim() ? { notes: finding.notes.trim() } : {}),
            verifiedScope: finding.verifiedScope.trim(),
            trainingSuitability: finding.trainingSuitability as
              "not_suitable" | "potential" | "suitable",
            ...(finding.estimatedCost && estimatedCost > 0
              ? { estimatedCostCents: Math.round(estimatedCost * 100) }
              : {}),
          };
        }),
        inspectionPackage.questions.map((question) => ({
          id: question.id,
          repairNeedId: question.repairNeedId,
          answer: answers[question.id]!.unable ? null : answers[question.id]!.answer.trim(),
          unableToVerify: answers[question.id]!.unable,
        })),
      );
      await onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to complete inspection.");
    } finally {
      setIsSaving(false);
    }
  };

  if (inspectionPackage.status === "availability_submitted") {
    return (
      <div className="mt-5 border-y border-border py-6">
        <StatusBadge tone="warning">Assignment required</StatusBadge>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Provider organization
            <input
              className="min-h-11 border border-input bg-background px-3"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              maxLength={160}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Assigned worker
            <input
              className="min-h-11 border border-input bg-background px-3"
              value={workerName}
              onChange={(event) => setWorkerName(event.target.value)}
              maxLength={120}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Worker phone (optional)
            <input
              className="min-h-11 border border-input bg-background px-3"
              value={workerPhone}
              onChange={(event) => setWorkerPhone(event.target.value)}
              maxLength={40}
            />
          </label>
        </div>
        {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
        <Button className="mt-5 min-h-12 rounded-none" disabled={isSaving} onClick={saveAssignment}>
          <ClipboardCheck />
          {isSaving ? "Assigning..." : "Assign Inspector"}
        </Button>
      </div>
    );
  }

  if (inspectionPackage.status === "assigned" || isRescheduling) {
    return (
      <div className="mt-5 border-y border-border py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge tone="warning">
            {isRescheduling ? "Reschedule appointment" : "Scheduling required"}
          </StatusBadge>
          <span className="text-sm text-muted-foreground">
            {inspectionPackage.availabilityWindows.length} resident windows
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Appointment window
            <select
              className="min-h-11 border border-input bg-background px-3"
              value={selectedStart}
              onChange={(event) => setSelectedStart(event.target.value)}
            >
              {inspectionPackage.availabilityWindows.map((window) => (
                <option key={window.start} value={window.start}>
                  {formatInspectionWindow(window)}
                </option>
              ))}
            </select>
          </label>
          <div className="border-l-4 border-primary px-4 py-2 text-sm">
            <span className="eyebrow">Assigned inspector</span>
            <strong className="mt-1 block">{inspectionPackage.assignedWorkerName}</strong>
            <span className="text-muted-foreground">
              {inspectionPackage.providerOrganizationName}
            </span>
          </div>
        </div>
        {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
        <Button
          className="mt-5 min-h-12 rounded-none"
          disabled={isSaving}
          onClick={saveAppointment}
        >
          <CalendarDays />
          {isSaving
            ? isRescheduling
              ? "Rescheduling..."
              : "Confirming..."
            : isRescheduling
              ? "Confirm Reschedule"
              : "Confirm Appointment"}
        </Button>
        {isRescheduling && (
          <Button
            className="mt-5 min-h-12 rounded-none"
            variant="outline"
            disabled={isSaving}
            onClick={() => {
              setSelectedStart(
                inspectionPackage.confirmedStart ??
                  inspectionPackage.availabilityWindows[0]?.start ??
                  "",
              );
              setError("");
              setIsRescheduling(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    );
  }

  const completed = inspectionPackage.status === "completed";
  return (
    <div className="mt-5 border-y border-border py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <StatusBadge tone={completed ? "positive" : "info"}>
            {completed ? "Inspection completed" : "Inspection scheduled"}
          </StatusBadge>
          <h2 className="mt-3 text-2xl">
            {inspectionPackage.confirmedStart
              ? formatInspectionWindow({
                  start: inspectionPackage.confirmedStart,
                  end: inspectionPackage.confirmedEnd ?? inspectionPackage.confirmedStart,
                })
              : "Appointment pending"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {inspectionPackage.providerName}
            {inspectionPackage.providerPhone ? ` · ${inspectionPackage.providerPhone}` : ""}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Confirmed by {inspectionPackage.confirmedByDisplayName ?? "a HomeFix partner"}
            {inspectionPackage.confirmedAt
              ? ` on ${formatHistoryDate(inspectionPackage.confirmedAt)}`
              : ""}
          </p>
          {!completed && (
            <Button
              className="mt-5 min-h-11 rounded-none"
              variant="outline"
              onClick={() => {
                setError("");
                setIsRescheduling(true);
              }}
            >
              <CalendarDays />
              Reschedule Appointment
            </Button>
          )}
        </div>
        <ClipboardCheck className="size-7 text-primary" />
      </div>

      <div className="mt-8 space-y-10">
        {inspectionPackage.needs.map((need, needIndex) => {
          const finding = findings[need.repairNeedId]!;
          const questions = inspectionPackage.questions.filter(
            (question) => question.repairNeedId === need.repairNeedId,
          );
          return (
            <section key={need.repairNeedId} className="border-t border-border pt-6">
              <p className="eyebrow">Repair {needIndex + 1}</p>
              <h3 className="mt-2 text-3xl">{toRepairCategoryLabel(need.reportedCategory)}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed">{need.description}</p>
              {need.photos.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {need.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.imageUrl}
                      alt={`Resident report for ${toRepairCategoryLabel(need.reportedCategory)}`}
                      className="aspect-video w-full border border-border object-cover"
                    />
                  ))}
                </div>
              )}
              {need.assessment && (
                <div className="mt-5 grid gap-4 border-l-4 border-primary pl-4 md:grid-cols-3">
                  <div>
                    <p className="eyebrow">Preliminary HomeFix triage</p>
                    <p className="mt-2 text-sm leading-relaxed">{need.assessment.summary}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Safety considerations</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {need.assessment.safetyFlags.length > 0 ? (
                        need.assessment.safetyFlags.map((flag) => <li key={flag}>{flag}</li>)
                      ) : (
                        <li>No preliminary safety flags.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow">Preliminary workforce signal</p>
                    {need.assessment.trainingOpportunity ? (
                      <>
                        <p className="mt-2 text-sm font-semibold">
                          {need.assessment.trainingOpportunity.status === "not_suitable"
                            ? "Not currently identified"
                            : "Pending inspector review"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {need.assessment.trainingOpportunity.reason}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No preliminary signal.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-7">
                <p className="eyebrow">Questions to verify</p>
                {questions.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No additional triage questions were generated for this repair.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-border border-y border-border">
                    {questions.map((question) => {
                      const response = answers[question.id]!;
                      return (
                        <div key={question.id} className="py-5">
                          <p className="font-semibold">{question.question}</p>
                          {completed ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {question.unableToVerify
                                ? "Unable to verify during visit"
                                : question.answer}
                            </p>
                          ) : (
                            <>
                              <textarea
                                className="mt-3 min-h-24 w-full border border-input bg-background p-3 text-sm"
                                value={response.answer}
                                disabled={response.unable}
                                onChange={(event) =>
                                  setAnswers((current) => ({
                                    ...current,
                                    [question.id]: { ...response, answer: event.target.value },
                                  }))
                                }
                                maxLength={4000}
                              />
                              <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
                                <input
                                  type="checkbox"
                                  checked={response.unable}
                                  onChange={(event) =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [question.id]: {
                                        answer: event.target.checked ? "" : response.answer,
                                        unable: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Unable to verify during this visit
                              </label>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <InspectionField label="Confirmed repair category">
                  <select
                    className="min-h-11 border border-input bg-background px-3"
                    value={finding.confirmedCategory}
                    disabled={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: {
                          ...finding,
                          confirmedCategory: event.target.value,
                        },
                      }))
                    }
                  >
                    {repairCategories.map((category) => (
                      <option key={category} value={category}>
                        {toRepairCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </InspectionField>
                <InspectionField label="Confirmed priority">
                  <select
                    className="min-h-11 border border-input bg-background px-3"
                    value={finding.urgency}
                    disabled={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: { ...finding, urgency: event.target.value },
                      }))
                    }
                  >
                    {(["low", "moderate", "high", "critical"] as const).map((urgency) => (
                      <option key={urgency} value={urgency}>
                        {urgency[0]!.toUpperCase() + urgency.slice(1)}
                      </option>
                    ))}
                  </select>
                </InspectionField>
                <InspectionField label="Observed condition">
                  <textarea
                    className="min-h-28 border border-input bg-background p-3"
                    value={finding.condition}
                    readOnly={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: { ...finding, condition: event.target.value },
                      }))
                    }
                    maxLength={2000}
                  />
                </InspectionField>
                <InspectionField label="Recommended scope">
                  <textarea
                    className="min-h-28 border border-input bg-background p-3"
                    value={finding.verifiedScope}
                    readOnly={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: { ...finding, verifiedScope: event.target.value },
                      }))
                    }
                    maxLength={8000}
                  />
                </InspectionField>
                <InspectionField label="Professional notes (optional)">
                  <textarea
                    className="min-h-24 border border-input bg-background p-3"
                    value={finding.notes}
                    readOnly={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: { ...finding, notes: event.target.value },
                      }))
                    }
                    maxLength={4000}
                  />
                </InspectionField>
                <InspectionField label="Estimated cost (optional)">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="min-h-11 border border-input bg-background px-3"
                    value={finding.estimatedCost}
                    readOnly={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: { ...finding, estimatedCost: event.target.value },
                      }))
                    }
                  />
                </InspectionField>
                <InspectionField label="Training suitability">
                  <select
                    className="min-h-11 border border-input bg-background px-3"
                    value={finding.trainingSuitability}
                    disabled={completed}
                    onChange={(event) =>
                      setFindings((current) => ({
                        ...current,
                        [need.repairNeedId]: {
                          ...finding,
                          trainingSuitability: event.target
                            .value as typeof finding.trainingSuitability,
                        },
                      }))
                    }
                  >
                    <option value="">Select inspector finding</option>
                    <option value="not_suitable">Not suitable</option>
                    <option value="potential">Potential with supervision</option>
                    <option value="suitable">Suitable training scope</option>
                  </select>
                </InspectionField>
              </div>
            </section>
          );
        })}
      </div>
      {!completed && (
        <>
          {error && <p className="mt-5 text-sm font-semibold text-destructive">{error}</p>}
          <Button
            className="mt-6 min-h-12 rounded-none"
            disabled={isSaving}
            onClick={completeInspection}
          >
            <ClipboardCheck />
            {isSaving ? "Saving inspection..." : "Complete Inspection"}
          </Button>
        </>
      )}
    </div>
  );
}

function InspectionField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid content-start gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

function formatInspectionWindow(window: { start: string; end: string }) {
  const start = new Date(window.start);
  const end = new Date(window.end);
  return `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
  }).format(start)}–${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
  }).format(end)}`;
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
  }).format(new Date(value));
}

function CaseLoadError({
  error,
  reset,
}: {
  error: Error & { status?: number };
  reset: () => void;
}) {
  const router = useRouter();
  const missingCase = error.status === 404;
  const timedOut = error instanceof DOMException && error.name === "AbortError";
  console.error(error);
  return (
    <div className="py-16">
      <DemoFlag />
      <PageIntro
        eyebrow="Case unavailable"
        title={missingCase ? "Repair case not found" : "Partner data could not be loaded."}
        description={
          missingCase
            ? "This case may have been removed or is no longer available."
            : timedOut
              ? "The partner service took too long to respond. Try again in a moment."
              : "The partner service is temporarily unavailable. Try again, or return to repair cases."
        }
      />
      <Button
        className="mt-6 min-h-12 rounded-none bg-primary"
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        Try Again
      </Button>
      <Button asChild variant="outline" className="mt-3 rounded-none">
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
