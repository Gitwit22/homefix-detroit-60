import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink } from "lucide-react";

import { DemoFlag, Disclaimer, PageIntro, StatusBadge } from "@/components/homefix";
import { getProgram, type ProgramDetailResponse } from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";

export const Route = createFileRoute("/programs/$programId")({
  validateSearch: (search: Record<string, unknown>) => ({
    caseId: typeof search["caseId"] === "string" ? search["caseId"] : "",
    from: search["from"] === "partner" ? "partner" : "",
  }),
  loader: ({ params }) => getProgram(params.programId),
  head: ({ params }) => ({
    meta: [
      { title: `Program ${params.programId} - HomeFix 313` },
      { name: "description", content: "Verified home repair assistance program details." },
    ],
  }),
  component: ProgramPage,
});

function ProgramPage() {
  const program: ProgramDetailResponse = Route.useLoaderData();
  const { caseId, from } = Route.useSearch();
  const verified = program.lastVerifiedAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(program.lastVerifiedAt),
      )
    : "Verification needed";
  const statusTone = ["open", "current"].includes(program.applicationStatus)
    ? "positive"
    : ["closed", "transitioning"].includes(program.applicationStatus)
      ? "danger"
      : "warning";
  const canApply =
    program.recordType === "resident_program" &&
    !["closed", "transitioning"].includes(program.applicationStatus) &&
    Boolean(program.applicationUrl);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      <DemoFlag />
      <PageIntro
        eyebrow={program.organization}
        title={program.name}
        description={program.description ?? "Home repair assistance program"}
        action={
          <StatusBadge tone={statusTone}>
            {program.applicationStatus.replaceAll("_", " ")}
          </StatusBadge>
        }
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_330px]">
        <dl className="divide-y divide-border border-y border-border">
          <Info label="Program type" value={program.recordType.replaceAll("_", " ")} />
          {program.governmentLevel && (
            <Info label="Government level" value={program.governmentLevel} />
          )}
          {program.fundingSource && <Info label="Funding source" value={program.fundingSource} />}
          {program.benefitType && <Info label="Benefit" value={program.benefitType} />}
          <Info
            label="Repair types"
            value={program.repairTypes.map(toRepairCategoryLabel).join(", ")}
          />
          {program.geographicRestriction && (
            <Info label="Geography" value={program.geographicRestriction} />
          )}
          {program.incomeLimitType && (
            <Info label="Income eligibility" value={program.incomeLimitType} />
          )}
          {program.residentEntryPoint && (
            <Info label="Resident entry point" value={program.residentEntryPoint} />
          )}
          {program.applicationCloseDate && (
            <Info
              label="Application deadline"
              value={new Intl.DateTimeFormat("en-US", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "America/Detroit",
              }).format(new Date(program.applicationCloseDate))}
            />
          )}
          <Info label="Last verified" value={verified} />
          {program.notes && <Info label="Current note" value={program.notes} />}
          {program.rules.map((rule) => (
            <Info
              key={`${rule.ruleType}-${rule.operator}`}
              label={rule.ruleType.replaceAll("_", " ")}
              value={`${rule.operator.replaceAll("_", " ")} ${formatRuleValue(rule.value)}${rule.required ? " (required)" : ""}`}
            />
          ))}
        </dl>
        <aside>
          <div className="bg-secondary p-6">
            <p className="eyebrow">Program verification</p>
            <p className="mt-3 leading-relaxed">
              Program rules provide a preliminary deterministic match. The program administrator
              makes the final eligibility decision.
            </p>
            {program.sourceUrl && (
              <a
                href={program.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 font-bold text-primary"
              >
                Official source <ExternalLink className="size-4" />
              </a>
            )}
            {canApply && (
              <a
                href={program.applicationUrl!}
                target="_blank"
                rel="noreferrer"
                className="blueprint-button button-primary mt-5 inline-flex items-center gap-2"
              >
                Go to application <ExternalLink className="size-4" />
              </a>
            )}
            {program.recordType === "funding_layer" && (
              <p className="mt-5 border-t border-border pt-4 text-sm font-semibold">
                No direct application. Start through{" "}
                {program.residentEntryPoint ?? "a City repair program"}.
              </p>
            )}
          </div>
          <div className="mt-6">
            <p className="eyebrow">Required documents</p>
            {program.requiredDocuments.length > 0 ? (
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {program.requiredDocuments.map((document) => (
                  <li className="flex gap-2 py-3 text-sm" key={document}>
                    <Check className="size-4 text-primary" />
                    {document}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Documents are collected by the resident-facing program.
              </p>
            )}
          </div>
          {caseId && (
            <Link
              to="/passport"
              search={{ caseId }}
              className="blueprint-button button-primary mt-6 inline-flex items-center"
            >
              Return to Passport
            </Link>
          )}
          {from === "partner" && (
            <Link to="/partner/programs" className="blueprint-button button-primary mt-6 inline-flex items-center">
              Back to Partner Programs
            </Link>
          )}
        </aside>
      </div>
      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
}

function formatRuleValue(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[200px_1fr]">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="leading-relaxed">{value}</dd>
    </div>
  );
}
