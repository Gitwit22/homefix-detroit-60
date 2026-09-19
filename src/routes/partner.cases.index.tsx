import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DemoFlag, PageIntro, PriorityBadge, StatusBadge } from "@/components/homefix";
import { getPartnerAnalytics } from "@/lib/homefix-api";
import {
  caseStatusLabels,
  coverageStatusLabels,
  priorityLabels,
} from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/cases/")({
  head: () => ({
    meta: [
      { title: "Repair Cases — HomeFix 313" },
      {
        name: "description",
        content: "Review synthetic HomeFix repair cases and current next actions.",
      },
      { property: "og:title", content: "Repair Cases — HomeFix 313" },
      { property: "og:description", content: "Partner repair-case operations view." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  component: Cases,
});

function Cases() {
  const analytics = Route.useLoaderData();
  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Case operations"
        title="Repair Cases"
        description={`${analytics.cases.length} synthetic homes with generated repair needs, priority, resource alignment, and workflow status.`}
      />
      <div className="mt-8">
        <DataTable
          headers={["Property", "ZIP", "Repairs", "Priority", "Coverage", "Case Status"]}
          rows={analytics.cases.map((item) => [
            <Link
              to="/partner/cases/$caseId"
              params={{ caseId: item.caseId }}
              className="font-bold text-primary"
            >
              {item.propertyLabel}
            </Link>,
            item.zipCode,
            item.repairLabels.join(", "),
            <PriorityBadge priority={priorityLabels[item.priority]} />,
            <StatusBadge
              tone={
                item.coverageStatus === "funding_gap"
                  ? "danger"
                  : item.coverageStatus === "verification_needed"
                    ? "warning"
                    : "positive"
              }
            >
              {coverageStatusLabels[item.coverageStatus]}
            </StatusBadge>,
            caseStatusLabels[item.caseStatus],
          ])}
        />
      </div>
    </>
  );
}
