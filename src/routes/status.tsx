import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Circle } from "lucide-react";
import { BlueprintButton, DemoFlag, PageIntro, StatusBadge } from "@/components/homefix";
import { ResidentCaseRequired } from "@/components/resident-case-required";
import { getCase } from "@/lib/homefix-api";
import { resolveResidentCaseId } from "@/lib/resident-case";

export const Route = createFileRoute("/status")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search.caseId === "string" ? search.caseId : "",
  }),
  head: () => ({
    meta: [
      { title: "Repair Journey — HomeFix 313" },
      {
        name: "description",
        content: "Review the current HomeFix case stage and any items still awaiting verification.",
      },
      { property: "og:title", content: "Repair Journey — HomeFix 313" },
      { property: "og:description", content: "A timeline of the current HomeFix case stage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatusPage,
});

const journeySteps = [
  "Assessment Created",
  "Repair Passport Created",
  "Potential Programs Identified",
  "Verification Review",
  "Program Referral",
  "Program Review",
  "Partner Follow-up",
  "Outcome Pending",
];

function StatusPage() {
  const { caseId: searchCaseId } = Route.useSearch();
  const caseId = resolveResidentCaseId(searchCaseId);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(caseId));

  useEffect(() => {
    if (!caseId) {
      setError("A case is required to view its repair journey.");
      return;
    }

    let cancelled = false;
    getCase(caseId)
      .then((result) => {
        if (!cancelled) setPayload(result);
      })
      .catch((loadError) => {
        console.error(loadError);
        if (!cancelled) setError("Unable to load this repair journey.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const progress = useMemo(() => {
    if (!payload) return 0;
    if (payload.matches.length > 0)
      return payload.documents.some((item) => item.status === "missing") ? 3 : 4;
    if (payload.assessments.length > 0) return 2;
    return 0;
  }, [payload]);

  if (!caseId) {
    return <ResidentCaseRequired pageName="Case Status" />;
  }
  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10">Loading repair journey...</div>;
  }
  if (error || !payload) {
    return <div className="mx-auto max-w-6xl px-4 py-10">{error ?? "Case not found."}</div>;
  }

  const missingDocuments = payload.documents.filter((item) => item.status === "missing").length;
  const assignedProgram = payload.matches[0]?.program.name ?? "No program assigned yet";
  const latestEvent = payload.events.reduce<string | null>(
    (latest, event) => (!latest || event.createdAt > latest ? event.createdAt : latest),
    null,
  );
  const lastUpdate = latestEvent
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(latestEvent))
    : "No updates recorded";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      <DemoFlag />
      <PageIntro
        eyebrow={`Case ${payload.case.caseNumber}`}
        title="Repair Journey"
        description="Review the current case stage and any items still awaiting verification."
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ol className="border-l-2 border-foreground pl-7">
          {journeySteps.map((step, index) => {
            const complete = index < progress;
            const current = index === progress;
            return (
              <li key={step} className="relative border-b border-border py-6">
                <span
                  className={`absolute -left-9.75 top-6 grid size-6 place-items-center ${complete ? "bg-primary text-primary-foreground" : current ? "bg-warning text-foreground" : "bg-background ring-1 ring-border"}`}
                >
                  {complete ? <Check className="size-4" /> : <Circle className="size-3" />}
                </span>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                    <h2 className="mt-1 text-2xl">{step}</h2>
                  </div>
                  <StatusBadge tone={complete ? "positive" : current ? "warning" : "neutral"}>
                    {complete ? "Complete" : current ? "Current stage" : "Pending"}
                  </StatusBadge>
                </div>
              </li>
            );
          })}
        </ol>
        <aside className="h-fit bg-navy p-6 text-primary-foreground lg:sticky lg:top-28">
          <p className="eyebrow text-warning">Current next action</p>
          <h2 className="mt-3 text-3xl">
            {payload.case.nextAction ?? "Review eligibility items and program fit"}
          </h2>
          <dl className="mt-8 space-y-5 text-sm">
            <Side k="Assigned program" v={assignedProgram} />
            <Side k="Last update" v={lastUpdate} />
            <Side
              k="Verification items"
              v={`${missingDocuments} item${missingDocuments === 1 ? "" : "s"} under review`}
            />
          </dl>
          <div className="mt-8">
            <BlueprintButton to="/passport" search={{ caseId }} variant="rust">
              Open Passport
            </BlueprintButton>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Side({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-t border-primary-foreground/25 pt-3">
      <dt className="text-[10px] uppercase text-primary-foreground/60">{k}</dt>
      <dd className="mt-1 font-semibold">{v}</dd>
    </div>
  );
}
