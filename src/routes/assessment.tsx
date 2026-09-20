import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Droplets, HelpCircle } from "lucide-react";
import {
  DemoFlag,
  Disclaimer,
  PriorityBadge,
  SectionLabel,
  StatusBadge,
} from "@/components/homefix";
import { getCase } from "@/lib/homefix-api";
import { runTriageServer } from "@/lib/triage.server";
import { toRepairCategoryLabel } from "@/lib/repair-categories";

export const Route = createFileRoute("/assessment")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search.caseId === "string" ? search.caseId : "",
    repairNeedId: typeof search.repairNeedId === "string" ? search.repairNeedId : "",
    process: search.process === "1" ? "1" : "",
  }),
  head: () => ({
    meta: [
      { title: "Repair Assessment — HomeFix 313" },
      {
        name: "description",
        content: "Review a preliminary home repair assessment and recommended next steps.",
      },
      { property: "og:title", content: "Repair Assessment — HomeFix 313" },
      {
        property: "og:description",
        content: "Preliminary findings for a reported Detroit home repair.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { caseId, repairNeedId, process } = Route.useSearch();
  const navigate = useNavigate({ from: "/assessment" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);

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
        if (repairNeedId && process === "1") {
          await runTriageServer(repairNeedId);
        }
        const result = await getCase(caseId);
        if (!cancelled) setPayload(result);
        if (repairNeedId && process === "1") {
          if (!cancelled) {
            navigate({ to: "/assessment", replace: true, search: { caseId, repairNeedId } });
          }
        }
      } catch (err) {
        if (!cancelled) setError("Unable to load assessment.");
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId, repairNeedId, process, navigate]);

  const repairNeed = useMemo(
    () => payload?.repairNeeds.find((need) => need.id === repairNeedId) ?? payload?.repairNeeds[0],
    [payload, repairNeedId],
  );
  const assessment = useMemo(
    () =>
      payload?.assessments.find((item) => item.repairNeedId === repairNeed?.id) ??
      payload?.assessments[0],
    [payload, repairNeed],
  );
  const photos = useMemo(
    () => payload?.photos.filter((photo) => photo.repairNeedId === repairNeed?.id) ?? [],
    [payload, repairNeed],
  );

  const observations = Array.isArray(assessment?.observations) ? assessment.observations : [];
  const safetyFlags = Array.isArray(assessment?.safetyFlags) ? assessment.safetyFlags : [];
  const followUpQuestions = Array.isArray(assessment?.followUpQuestions)
    ? assessment.followUpQuestions
    : [];

  if (isLoading) {
    return <div className="mx-auto max-w-7xl px-4 py-10">Loading assessment...</div>;
  }

  if (error || !payload || !repairNeed) {
    return <div className="mx-auto max-w-7xl px-4 py-10">{error ?? "Assessment not found."}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      <DemoFlag />
      <header className="mt-6 border-b border-foreground pb-7">
        <p className="eyebrow">Preliminary field assessment</p>
        <h1 className="mt-3 text-5xl sm:text-7xl">What HomeFix noticed</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          {assessment?.summary ?? repairNeed.description}
        </p>
      </header>
      {payload.repairNeeds.length > 1 && (
        <nav className="flex flex-wrap gap-2 border-b border-foreground py-5" aria-label="Repair assessments">
          {payload.repairNeeds.map((need) => (
            <Link
              key={need.id}
              to="/assessment"
              search={{ caseId, repairNeedId: need.id }}
              className={`border px-4 py-2 text-sm font-bold ${need.id === repairNeed.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            >
              {toRepairCategoryLabel(need.category)}
            </Link>
          ))}
        </nav>
      )}
      <section className="grid border-b border-foreground lg:grid-cols-[1.1fr_.9fr]">
        <div className="min-h-105 bg-muted lg:border-r lg:border-foreground">
          {photos[0] ? (
            <img
              src={photos[0].imageUrl}
              alt={`Uploaded photo for ${toRepairCategoryLabel(repairNeed.category)}`}
              className="h-full min-h-105 w-full object-cover"
            />
          ) : (
            <div className="mock-damage-photo min-h-105">
              <span>No repair photo submitted</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 content-start">
          <Result label="Possible issue" value={toRepairCategoryLabel(repairNeed.category)} />
          <div className="border-b border-border p-6">
            <span className="eyebrow">Priority</span>
            <div className="mt-3">
              <PriorityBadge priority={toPriority(assessment?.urgency ?? repairNeed.urgency)} />
            </div>
          </div>
          <Result
            label="Confidence"
            value={
              assessment?.confidence
                ? `${Math.round(Number(assessment.confidence) * 100)}%`
                : "Preliminary"
            }
          />
          <Result
            label="Analysis source"
            value={
              assessment?.model === "homefix-saved-demo-v1"
                ? "Saved demo fallback"
                : "Live AI analysis"
            }
          />
        </div>
      </section>
      <section className="py-12">
        <SectionLabel number="01">Assessment notes</SectionLabel>
        <div className="mt-6 divide-y divide-border border-y border-border">
          <Finding icon={Droplets} title="Observations">
            <ul className="space-y-2">
              {(observations as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Finding>
          <Finding icon={AlertTriangle} title="Safety considerations">
            {(safetyFlags as string[]).length > 0 ? (
              <ul className="space-y-2">
                {(safetyFlags as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <span>No immediate safety flags detected from current information.</span>
            )}
          </Finding>
          <Finding icon={HelpCircle} title="Questions we still need answered">
            <ul className="space-y-2">
              {(followUpQuestions as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Finding>
          <Finding icon={CheckCircle2} title="Recommended next step">
            Review deterministic program matching and document requirements.
          </Finding>
        </div>
      </section>
      <section className="border-t border-foreground py-10">
        <SectionLabel number="02">Potential programs found</SectionLabel>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {payload.matches.length === 0 ? (
            <p className="py-5 text-muted-foreground">No current program paths identified.</p>
          ) : (
            payload.matches.map((match) => (
              <div
                key={match.id}
                className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <h2 className="text-xl">{match.program.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {toRepairCategoryLabel(
                      payload.repairNeeds.find((need) => need.id === match.repairNeedId)?.category ??
                        "other",
                    )}
                  </p>
                </div>
                <StatusBadge tone={match.matchStatus === "strong_match" ? "positive" : "info"}>
                  {match.matchStatus === "strong_match" ? "Strong Match" : "Potential Match"}
                </StatusBadge>
              </div>
            ))
          )}
        </div>
      </section>
      <Disclaimer />
      <div className="mt-8">
        <Link
          className="blueprint-button button-primary inline-flex items-center"
          to="/passport"
          search={{ caseId }}
        >
          Open Repair Passport
        </Link>
      </div>
    </div>
  );
}

function toPriority(urgency: string) {
  if (urgency === "critical") return "Critical";
  if (urgency === "high") return "High";
  if (urgency === "moderate") return "Moderate";
  return "Low";
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-border p-6">
      <span className="eyebrow">{label}</span>
      <strong className="mt-3 block text-lg">{value}</strong>
    </div>
  );
}

function Finding({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Droplets;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 py-6 sm:grid-cols-[180px_1fr]">
      <div className="flex items-center gap-3 font-bold">
        <Icon className="size-5 text-primary" />
        {title}
      </div>
      <div className="max-w-2xl leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
