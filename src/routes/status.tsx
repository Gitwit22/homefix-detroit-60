import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";
import { BlueprintButton, DemoFlag, PageIntro, StatusBadge } from "@/components/homefix";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Repair Journey — HomeFix 313" },
      {
        name: "description",
        content: "Review the current HomeFix case stage and any verification items still pending.",
      },
      { property: "og:title", content: "Repair Journey — HomeFix 313" },
      { property: "og:description", content: "A timeline of the current HomeFix case stage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const steps = [
    "Assessment Created",
    "Repair Passport Created",
    "Potential Programs Identified",
    "Verification Review",
    "Program Referral",
    "Program Review",
    "Partner Follow-up",
    "Outcome Pending",
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-24 sm:px-6 lg:px-10">
      <DemoFlag />
      <PageIntro
        eyebrow="Case HF-313-0842"
        title="Repair Journey"
        description="Review the current case stage and any items still awaiting verification."
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ol className="border-l-2 border-foreground pl-7">
          {steps.map((step, index) => (
            <li key={step} className="relative border-b border-border py-6">
              <span
                className={`absolute -left-9.75 top-6 grid size-6 place-items-center ${
                  index < 3
                    ? "bg-primary text-primary-foreground"
                    : index === 3
                      ? "bg-warning text-foreground"
                      : "bg-background ring-1 ring-border"
                }`}
              >
                {index < 3 ? <Check className="size-4" /> : <Circle className="size-3" />}
              </span>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="mt-1 text-2xl">{step}</h2>
                </div>
                <StatusBadge tone={index < 3 ? "positive" : index === 3 ? "warning" : "neutral"}>
                  {index < 3 ? "Complete" : index === 3 ? "Current stage" : "Pending"}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ol>
        <aside className="h-fit bg-navy p-6 text-primary-foreground lg:sticky lg:top-28">
          <p className="eyebrow text-warning">Current next action</p>
          <h2 className="mt-3 text-3xl">Review eligibility items and program fit</h2>
          <dl className="mt-8 space-y-5 text-sm">
            <Side k="Assigned program" v="Critical Home Repair" />
            <Side k="Last update" v="September 18, 2026" />
            <Side k="Verification items" v="1 item under review" />
          </dl>
          <div className="mt-8">
            <BlueprintButton to="/passport" variant="rust">
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
