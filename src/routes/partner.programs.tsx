import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { DemoFlag, PageIntro, StatusBadge } from "@/components/homefix";
import { programs } from "@/lib/demo-data";
import { getPartnerAnalytics } from "@/lib/homefix-api";
import { capacityStatusLabels } from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/programs")({
  head: () => ({
    meta: [
      { title: "Programs — HomeFix 313 Partner" },
      { name: "description", content: "Synthetic program pipeline and capacity overview." },
      { property: "og:title", content: "Programs — HomeFix 313 Partner" },
      { property: "og:description", content: "Program status and repair coverage planning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPartnerAnalytics(),
  component: Programs,
});

function Programs() {
  const analytics = Route.useLoaderData();
  const capacityByProgram = new Map(
    analytics.programCapacity.map((capacity) => [capacity.programId, capacity]),
  );

  return (
    <>
      <DemoFlag />
      <PageIntro
        eyebrow="Modeled program capacity"
        title="Home Repair Programs"
        description="Synthetic demand compared with simulated capacity. This is planning data, not current operational availability."
      />
      <div className="mt-8 divide-y divide-border border-y border-border">
        {programs.map((program, index) => {
          const capacity = capacityByProgram.get(program.id);
          if (!capacity) return null;
          const tone =
            capacity.status === "open"
              ? "positive"
              : capacity.status === "closed"
                ? "danger"
                : "warning";
          return (
            <article
              key={program.id}
              className="grid gap-4 py-6 md:grid-cols-[60px_1.2fr_1fr_auto] md:items-center"
            >
              <b className="font-display text-3xl font-normal text-rust">
                {String(index + 1).padStart(2, "0")}
              </b>
              <div>
                <h2 className="text-2xl">{program.name}</h2>
                <p className="text-sm text-muted-foreground">{program.organization}</p>
                <p className="mt-2 text-sm text-muted-foreground">{program.types}</p>
              </div>
              <div>
                <StatusBadge tone={tone}>{capacityStatusLabels[capacity.status]}</StatusBadge>
                <p className="mt-3 text-sm">
                  <strong>{capacity.matchedNeeds}</strong> matched needs ·{" "}
                  <strong>{capacity.simulatedCapacity}</strong> modeled capacity
                </p>
                <p className="mt-1 text-sm font-semibold text-rust">
                  {capacity.excessDemand} repairs exceed modeled capacity
                </p>
              </div>
              <Link
                to="/programs/$programId"
                params={{ programId: program.id }}
                className="flex items-center gap-2 font-bold text-primary"
              >
                Details
                <ArrowRight className="size-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
