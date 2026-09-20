import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CoverageMeter, DemoFlag, Disclaimer, NextAction, StatusBadge } from "@/components/homefix";
import { ResidentCaseRequired } from "@/components/resident-case-required";
import { getCase, getCoverage } from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";
import { resolveResidentCaseId } from "@/lib/resident-case";
import { toMatchStatusLabel } from "../../server/domain/eligibility";

export const Route = createFileRoute("/coverage")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Repair Coverage Plan — HomeFix 313" },
      {
        name: "description",
        content: "See possible repair-program matches and remaining funding gaps.",
      },
      { property: "og:title", content: "Repair Coverage Plan — HomeFix 313" },
      {
        property: "og:description",
        content: "A visual map of possible resources for each identified repair need.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoveragePage,
});

function CoveragePage() {
  const { caseId: searchCaseId } = Route.useSearch();
  const caseId = resolveResidentCaseId(searchCaseId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Awaited<ReturnType<typeof getCoverage>> | null>(null);
  const [casePayload, setCasePayload] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);

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
        const [coverageResult, caseResult] = await Promise.all([
          getCoverage(caseId),
          getCase(caseId),
        ]);
        if (!cancelled) {
          setCoverage(coverageResult);
          setCasePayload(caseResult);
        }
      } catch (err) {
        if (!cancelled) setError("Unable to load coverage plan.");
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const repairNameMap = useMemo(() => {
    const map = new Map<string, string>();
    casePayload?.repairNeeds.forEach((need) => {
      map.set(need.id, need.category);
    });
    return map;
  }, [casePayload]);

  if (!caseId) return <ResidentCaseRequired pageName="Coverage Plan" />;
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-10">Loading coverage...</div>;
  if (error || !coverage || !casePayload)
    return <div className="mx-auto max-w-6xl px-4 py-10">{error ?? "Coverage not found."}</div>;

  const residentAction = getResidentCoverageAction(casePayload, coverage.coveredNeeds);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      <DemoFlag />
      <header className="mt-5">
        <p className="eyebrow">Your Repair Coverage Plan</p>
        <h1 className="mt-3 max-w-4xl text-5xl leading-none sm:text-7xl">
          See where help may connect—and where it doesn’t yet.
        </h1>
        <p className="mt-5 max-w-3xl text-muted-foreground">
          HomeFix compares each repair need with deterministic program rules to show potential
          resource coverage and funding gaps.
        </p>
      </header>

      <div className="mt-10">
        <CoverageMeter value={coverage.coveragePercentage} />
      </div>

      <section className="mt-12">
        <p className="eyebrow">Repair coverage map</p>
        <div className="mt-5 border-l-2 border-foreground pl-5 sm:pl-8">
          {coverage.repairs.map((repair, index) => (
            <article
              key={repair.repairNeedId}
              className="relative grid gap-5 border-b border-border py-7 sm:grid-cols-[180px_1fr_auto] sm:items-center"
            >
              <span className="absolute -left-7 top-9 size-4 bg-background ring-2 ring-foreground sm:-left-10" />
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Repair 0{index + 1}
                </span>
                <h2 className="mt-1 text-2xl">
                  {toRepairCategoryLabel(repairNameMap.get(repair.repairNeedId) ?? repair.category)}
                </h2>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Potential resource
                </span>
                <p className="mt-1 font-semibold">
                  {repair.program?.name ?? "No current resource identified"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{helperText(repair.status)}</p>
              </div>
              <MatchLink
                status={repair.status}
                programId={repair.program?.id ?? ""}
                caseId={caseId}
              />
            </article>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <NextAction
          {...(residentAction.to ? { to: residentAction.to, search: { caseId } } : {})}
          label={residentAction.label}
          actionLabel={residentAction.actionLabel}
        >
          {residentAction.message}
        </NextAction>
      </div>
      <div className="mt-5">
        <Disclaimer />
      </div>
    </div>
  );
}

function getResidentCoverageAction(
  casePayload: Awaited<ReturnType<typeof getCase>>,
  coveredNeeds: number,
) {
  const inspectionStatus = casePayload.inspection?.status;
  const missingDocuments = casePayload.documents.filter(
    (document) => document.status === "missing",
  ).length;

  if (casePayload.lifecycle.complete) {
    return {
      label: "Case status",
      message: "No action is needed. Your repair is complete and verified.",
    };
  }

  if (inspectionStatus === "availability_submitted") {
    return {
      label: "Case status",
      message:
        "No action is needed from you right now. Your availability is on file, and a HomeFix partner will contact you after confirming an inspection window.",
    };
  }

  if (inspectionStatus === "scheduled") {
    return {
      label: "Case status",
      message:
        "No action is needed from you right now. Your inspection is scheduled and the appointment details are available in your Repair Passport.",
      to: "/passport",
      actionLabel: "View Appointment",
    };
  }

  if (inspectionStatus === "completed" && missingDocuments > 0) {
    return {
      label: "Your next step",
      message: `Upload the remaining ${missingDocuments} document${missingDocuments === 1 ? "" : "s"} for partner review.`,
      to: "/passport",
      actionLabel: "Open Passport",
    };
  }

  if (casePayload.lifecycle.stage === "potential_programs" && coveredNeeds > 0) {
    return {
      label: "Your next step",
      message: "Choose acceptable times for an on-site inspection.",
      to: "/inspection",
      actionLabel: "Schedule Inspection",
    };
  }

  return {
    label: "Case status",
    message: `No action is needed from you right now. ${casePayload.lifecycle.nextAction}`,
  };
}

function helperText(status: string) {
  if (status === "strong_match")
    return "All required deterministic checks currently pass for this initial screening.";
  if (status === "potential_match") return "Likely fit; manual review or optional checks remain.";
  if (status === "verification_needed")
    return "At least one required eligibility rule needs verification.";
  return "No viable program match currently identified.";
}

function MatchLink({
  status,
  programId,
  caseId,
}: {
  status: string;
  programId: string;
  caseId: string;
}) {
  const tone =
    status === "strong_match"
      ? "positive"
      : status === "funding_gap"
        ? "danger"
        : status === "verification_needed"
          ? "warning"
          : "info";
  const label =
    status === "funding_gap" ? "Funding Gap" : toMatchStatusLabel(status);

  const badge = <StatusBadge tone={tone}>{label}</StatusBadge>;

  if (status === "funding_gap" || !programId) {
    return (
      <Link to="/status" search={{ caseId }} className="justify-self-start">
        {badge}
      </Link>
    );
  }

  return (
    <Link
      to="/programs/$programId"
      params={{ programId }}
      search={{ caseId }}
      className="justify-self-start"
    >
      {badge}
    </Link>
  );
}
