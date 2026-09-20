import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Check, Clock3, Plus } from "lucide-react";

import { DemoFlag, PageIntro, StatusBadge } from "@/components/homefix";
import { Button } from "@/components/ui/button";
import { ResidentCaseRequired } from "@/components/resident-case-required";
import { getCase, submitInspectionAvailability } from "@/lib/homefix-api";
import { resolveResidentCaseId } from "@/lib/resident-case";

export const Route = createFileRoute("/inspection")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search.caseId === "string" ? search.caseId : "",
  }),
  head: () => ({
    meta: [
      { title: "Schedule Inspection — HomeFix 313" },
      {
        name: "description",
        content: "Submit acceptable windows for a professional home repair inspection.",
      },
    ],
  }),
  component: InspectionPage,
});

type AvailabilityWindow = { start: string; end: string };

const detroitTimeZone = "America/Detroit";
const minimumAvailabilityWindows = 3;
const initialVisibleWeekdays = 7;
const weekdaysPerAddedWeek = 5;

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: detroitTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function detroitOffset(date: Date) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: detroitTimeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return value?.replace("GMT", "") || "-05:00";
}

function nextWeekdayWindows(weekdayCount: number, now = new Date()): AvailabilityWindow[] {
  const current = dateParts(now);
  const year = Number(current.year);
  const month = Number(current.month);
  const day = Number(current.day);
  const windows: AvailabilityWindow[] = [];

  for (let offset = 1; windows.length < weekdayCount * 2; offset += 1) {
    const calendarDate = new Date(Date.UTC(year, month - 1, day + offset, 12));
    const weekday = calendarDate.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const date = calendarDate.toISOString().slice(0, 10);
    const utcOffset = detroitOffset(calendarDate);
    windows.push(
      { start: `${date}T09:00:00${utcOffset}`, end: `${date}T12:00:00${utcOffset}` },
      { start: `${date}T13:00:00${utcOffset}`, end: `${date}T17:00:00${utcOffset}` },
    );
  }

  return windows;
}

function formatWindow(window: AvailabilityWindow) {
  const start = new Date(window.start);
  const end = new Date(window.end);
  return {
    day: new Intl.DateTimeFormat("en-US", {
      timeZone: detroitTimeZone,
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(start),
    time: `${new Intl.DateTimeFormat("en-US", { timeZone: detroitTimeZone, hour: "numeric" }).format(start)}–${new Intl.DateTimeFormat("en-US", { timeZone: detroitTimeZone, hour: "numeric" }).format(end)}`,
  };
}

function InspectionPage() {
  const { caseId: searchCaseId } = Route.useSearch();
  const caseId = resolveResidentCaseId(searchCaseId);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);
  const [selected, setSelected] = useState<AvailabilityWindow[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(caseId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [visibleWeekdays, setVisibleWeekdays] = useState(initialVisibleWeekdays);
  const generatedWindows = nextWeekdayWindows(visibleWeekdays);
  const windows = [...generatedWindows, ...selected]
    .filter(
      (window, index, allWindows) =>
        allWindows.findIndex((candidate) => candidate.start === window.start) === index,
    )
    .sort((left, right) => left.start.localeCompare(right.start));

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    getCase(caseId)
      .then((result) => {
        if (cancelled) return;
        setPayload(result);
        setSelected(result.inspection?.availabilityWindows ?? []);
      })
      .catch((loadError) => {
        console.error(loadError);
        if (!cancelled) setError("Unable to load inspection scheduling.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (!caseId) return <ResidentCaseRequired pageName="Inspection Scheduling" />;
  if (isLoading)
    return <div className="mx-auto max-w-6xl px-4 py-10">Loading inspection scheduling...</div>;
  if (!payload)
    return <div className="mx-auto max-w-6xl px-4 py-10">{error || "Case not found."}</div>;

  const toggleWindow = (window: AvailabilityWindow) => {
    setSelected((current) => {
      const isSelected = current.some((item) => item.start === window.start);
      if (isSelected) return current.filter((item) => item.start !== window.start);
      return [...current, window];
    });
    setError("");
  };

  const submit = async () => {
    if (selected.length < minimumAvailabilityWindows) {
      setError("Choose at least three acceptable inspection windows.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await submitInspectionAvailability(caseId, selected);
      setPayload(await getCase(caseId));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to submit availability.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmed =
    payload.inspection?.status === "scheduled" || payload.inspection?.status === "completed";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      <DemoFlag />
      <PageIntro
        eyebrow={`Case ${payload.case.caseNumber}`}
        title="Schedule your inspection"
        description="Your information appears to align with one or more repair-assistance programs. An on-site inspection will verify the repair condition and scope."
      />

      {payload.matches.length === 0 ? (
        <div className="mt-10 border-l-4 border-warning bg-warning/10 p-6">
          <h2 className="text-2xl">No inspection is needed yet</h2>
          <p className="mt-2 text-muted-foreground">
            HomeFix has not identified a current program pathway for this report. Review your
            Passport for other next steps.
          </p>
          <Link
            className="blueprint-button button-secondary mt-5 inline-flex"
            to="/passport"
            search={{ caseId }}
          >
            Open Repair Passport
          </Link>
        </div>
      ) : confirmed && payload.inspection?.confirmedStart && payload.inspection.confirmedEnd ? (
        <section className="mt-10 border-y border-foreground py-8">
          <StatusBadge tone="positive">Inspection Scheduled</StatusBadge>
          <h2 className="mt-5 text-3xl">
            {
              formatWindow({
                start: payload.inspection.confirmedStart,
                end: payload.inspection.confirmedEnd,
              }).day
            }
          </h2>
          <p className="mt-2 text-lg">
            {
              formatWindow({
                start: payload.inspection.confirmedStart,
                end: payload.inspection.confirmedEnd,
              }).time
            }
          </p>
          <p className="mt-3 text-muted-foreground">{payload.inspection.providerName}</p>
          <Link
            className="blueprint-button button-primary mt-6 inline-flex"
            to="/passport"
            search={{ caseId }}
          >
            View Repair Passport
          </Link>
        </section>
      ) : (
        <section className="mt-10">
          {payload.inspection?.status === "availability_submitted" && (
            <div
              className="mb-8 border-l-4 border-warning bg-warning/10 p-6"
              data-guide-target="inspection-submitted"
              role="status"
            >
              <StatusBadge tone="warning">Awaiting inspection assignment</StatusBadge>
              <h2 className="mt-4 text-3xl">Your application is submitted.</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Your inspection dates are on file. HomeFix is waiting for a partner to assign an
                inspector and confirm one of your selected windows.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground pb-5">
            <div>
              <p className="eyebrow">Choose several acceptable windows</p>
              <h2 className="mt-2 text-3xl">What times work for you?</h2>
            </div>
            <StatusBadge
              tone={selected.length >= minimumAvailabilityWindows ? "positive" : "neutral"}
            >
              {selected.length} selected
            </StatusBadge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Choose at least three windows. Select every time that works for you.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {windows.map((window) => {
              const label = formatWindow(window);
              const active = selected.some((item) => item.start === window.start);
              return (
                <button
                  key={window.start}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWindow(window)}
                  className={`grid min-h-28 grid-cols-[auto_1fr_auto] items-center gap-3 border p-4 text-left ${active ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                >
                  <CalendarDays className="size-5 text-primary" />
                  <span>
                    <strong className="block">{label.day}</strong>
                    <span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock3 className="size-4" />
                      {label.time}
                    </span>
                  </span>
                  {active && <Check className="size-5 text-primary" />}
                </button>
              );
            })}
          </div>
          <Button
            className="mt-5 rounded-none"
            variant="outline"
            type="button"
            onClick={() => setVisibleWeekdays((current) => current + weekdaysPerAddedWeek)}
          >
            <Plus className="size-4" />
            Add another week
          </Button>
          {error && (
            <p
              className="mt-5 border-l-4 border-destructive pl-4 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          {payload.inspection?.status === "availability_submitted" && (
            <p className="mt-5 text-sm font-semibold text-primary">
              You can update your availability until a partner confirms the appointment.
            </p>
          )}
          <Button
            className="mt-6 min-h-12 rounded-none"
            data-guide-target="inspection-submit"
            disabled={isSubmitting || selected.length < minimumAvailabilityWindows}
            onClick={submit}
          >
            {isSubmitting
              ? "Submitting..."
              : payload.inspection?.status === "availability_submitted"
                ? "Update Availability"
                : "Submit Availability"}
          </Button>
        </section>
      )}
    </div>
  );
}
