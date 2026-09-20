import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronRight, Clock3 } from "lucide-react";

import { DemoFlag, PageIntro, SectionLabel, StatusBadge } from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerInspectionQueue } from "@/lib/homefix-api";

export const Route = createFileRoute("/partner/inspections")({
  head: () => ({
    meta: [
      { title: "Inspection Queue - HomeFix 313" },
      { name: "description", content: "Schedule and monitor professional repair inspections." },
    ],
  }),
  loader: () => getPartnerInspectionQueue(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: InspectionQueue,
});

function InspectionQueue() {
  const queue = Route.useLoaderData();
  const awaitingSchedule = queue.items.filter((item) => item.status === "availability_submitted");
  const scheduled = queue.items.filter((item) => item.status === "scheduled");
  const completed = queue.items.filter((item) => item.status === "completed");

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Field operations"
        title="Inspection Queue"
        description="Turn resident availability into confirmed visits and verified repair scopes."
        action={
          <StatusBadge tone={awaitingSchedule.length > 0 ? "warning" : "positive"}>
            {awaitingSchedule.length} awaiting schedule
          </StatusBadge>
        }
      />

      <section className="mt-8 grid gap-px bg-border sm:grid-cols-3">
        <QueueStat label="Awaiting schedule" value={awaitingSchedule.length} />
        <QueueStat label="Scheduled" value={scheduled.length} />
        <QueueStat label="Completed" value={completed.length} />
      </section>

      <section className="mt-10">
        <SectionLabel number="01">Active requests</SectionLabel>
        {queue.items.length === 0 ? (
          <div className="mt-5 border-y border-border py-10 text-center">
            <CalendarCheck className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 font-semibold">No inspection requests in this data source.</p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border border-y border-border">
            {queue.items.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 py-5 md:grid-cols-[1.2fr_0.8fr_1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="eyebrow">{item.caseNumber}</p>
                  <h2 className="mt-2 text-2xl">{item.streetAddress}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Detroit, MI {item.zipCode}</p>
                </div>
                <div>
                  <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.availabilityWindows.length} resident window
                    {item.availabilityWindows.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Scheduling contact</p>
                  <p className="mt-2 font-semibold">{item.primaryContact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[item.primaryContact.relationship, item.primaryContact.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.primaryContact.assistingWithApplication && (
                    <small className="mt-1 block text-primary">Assisting with application</small>
                  )}
                </div>
                <div className="flex gap-2 text-sm">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <strong className="block">
                      {item.appointmentStart
                        ? formatDateTime(item.appointmentStart)
                        : item.availabilityWindows[0]
                          ? formatDateTime(item.availabilityWindows[0].start)
                          : "No active window"}
                    </strong>
                    <small className="text-muted-foreground">
                      {item.providerName ?? (item.appointmentStart ? "Provider pending" : "Next offered window")}
                    </small>
                  </span>
                </div>
                <Link
                  to="/partner/cases/$caseId"
                  params={{ caseId: item.caseId }}
                  className="inline-flex min-h-11 items-center justify-center border border-foreground px-3 font-bold"
                  aria-label={`Open ${item.caseNumber}`}
                >
                  <ChevronRight className="size-5" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background p-5">
      <strong className="font-display text-4xl font-normal text-primary">{value}</strong>
      <span className="ml-3 text-xs font-bold uppercase">{label}</span>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "availability_submitted") return "Needs scheduling";
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  return "Availability requested";
}

function statusTone(status: string): "warning" | "info" | "positive" | "neutral" {
  if (status === "availability_submitted") return "warning";
  if (status === "scheduled") return "info";
  if (status === "completed") return "positive";
  return "neutral";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
  }).format(new Date(value));
}