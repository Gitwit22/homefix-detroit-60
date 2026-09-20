import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { DemoFlag, Metric, PageIntro, SectionLabel, StatusBadge } from "@/components/homefix";
import { PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerAnalytics } from "@/lib/homefix-api";

export const Route = createFileRoute("/partner/unmet-needs")({
  head: () => ({
    meta: [
      { title: "Unmet Repair Needs — HomeFix 313" },
      {
        name: "description",
        content: "Explore synthetic Detroit repair needs without identified assistance resources.",
      },
      { property: "og:title", content: "Unmet Repair Needs — HomeFix 313" },
      { property: "og:description", content: "Planning intelligence for repair assistance gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: Unmet,
});

function Unmet() {
  const analytics = Route.useLoaderData();
  const affectedZipCodes = analytics.byZipCode.filter((metric) => metric.unmatched > 0).length;
  const leading = analytics.unmetNeeds.slice(0, 2);
  const leadingShare =
    analytics.totals.unmatchedNeeds === 0
      ? 0
      : Math.round(
          (leading.reduce((sum, metric) => sum + metric.unmatched, 0) /
            analytics.totals.unmatchedNeeds) *
            100,
        );

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Planning intelligence"
        title="Where Help Is Missing"
        description="Repair demand without a currently identified assistance resource. All records are synthetic."
      />
      <div className="grid grid-cols-2 gap-y-6 border-b border-foreground py-8 sm:grid-cols-4">
        <Metric value={analytics.totals.unmatchedNeeds} label="Unmatched needs" accent />
        <Metric value={`${analytics.coverage.unmatchedPercentage}%`} label="Overall gap rate" />
        <Metric value={affectedZipCodes} label="ZIP codes affected" />
        <Metric value={analytics.unmetNeeds.length} label="Repair types affected" />
      </div>
      <section className="py-10">
        <SectionLabel number="01">Unmatched demand by repair type</SectionLabel>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {analytics.unmetNeeds.map((metric, index) => (
            <div
              key={metric.repairType}
              className="grid items-center gap-4 py-6 sm:grid-cols-[70px_1fr_120px_120px_auto]"
            >
              <b className="font-display text-4xl font-normal text-rust">
                {String(index + 1).padStart(2, "0")}
              </b>
              <div>
                <h2 className="text-2xl">{metric.label}</h2>
                <small className="text-muted-foreground">
                  Leading ZIPs:{" "}
                  {metric.leadingZipCodes.map((zip, zipIndex) => (
                    <span key={zip}>
                      {zipIndex > 0 ? ", " : ""}
                      <Link
                        to="/partner/cases"
                        search={{ zip, coverage: "funding_gap" }}
                        className="font-semibold text-primary"
                      >
                        {zip}
                      </Link>
                    </span>
                  ))}
                </small>
              </div>
              <strong>{metric.unmatched} needs</strong>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  Gap rate
                </span>
                <p>{metric.gapRate}%</p>
              </div>
              <div className="justify-self-start sm:justify-self-end">
                <StatusBadge tone="danger">No resource</StatusBadge>
                <Link
                  to="/partner/cases"
                  search={{ repairType: metric.repairType, coverage: "funding_gap" }}
                  className="mt-3 block font-bold text-primary"
                >
                  View Affected Cases
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-6 bg-navy p-6 text-primary-foreground sm:grid-cols-[auto_1fr] sm:p-8">
        <AlertTriangle className="size-8 text-warning" />
        <div>
          <p className="eyebrow text-warning">Planning signal</p>
          <h2 className="mt-2 text-3xl">
            {leading.map((metric) => metric.label).join(" and ")} account for {leadingShare}% of the
            unmatched queue.
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-primary-foreground/65">
            This synthetic view helps partners explore where new funding, referral pathways, or
            modeled program capacity may have the greatest effect.
          </p>
        </div>
      </section>
    </>
  );
}
