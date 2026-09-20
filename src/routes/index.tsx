import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, BriefcaseBusiness, FileSearch, FolderCheck, Wrench } from "lucide-react";
import {
  BlueprintButton,
  DemoFlag,
  Disclaimer,
  SectionLabel,
} from "@/components/homefix";
import {
  DemoSessionPanel,
  SessionDataDeleteButton,
} from "@/components/demo-session-panel";
import { Button } from "@/components/ui/button";
import { startGuideDemo } from "@/lib/homefix-guide";
import { getStoredDemoSession, type DemoSession } from "@/lib/demo-session";
import { lastCaseStorageKey } from "@/lib/resident-case";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomeFix 313 — A path toward home repair" },
      {
        name: "description",
        content:
          "Understand your Detroit home repair needs, build a reusable Repair Passport, and find possible assistance.",
      },
      { property: "og:title", content: "HomeFix 313 — A path toward home repair" },
      {
        property: "og:description",
        content: "Snap the problem, build your Repair Passport, and find a path toward getting it fixed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [recentCaseId, setRecentCaseId] = useState("");
  const [session, setSession] = useState<DemoSession | null>(() => getStoredDemoSession());

  useEffect(() => {
    setRecentCaseId(localStorage.getItem(lastCaseStorageKey) ?? "");
  }, []);

  const benefits = [
    [
      FileSearch,
      "Understand the problem",
      "Describe the repair and add photos to create a clear preliminary assessment.",
    ],
    [
      Wrench,
      "Find possible help",
      "Compare your situation with available home-repair assistance programs.",
    ],
    [
      FolderCheck,
      "Keep everything together",
      "Build a reusable Repair Passport with needs, assessments, and matches.",
    ],
  ] as const;

  const pitchSteps = ["Report", "Assess", "Organize", "Match", "Cover", "Learn"] as const;

  return (
    <div className="pb-20 lg:pb-0">
      <section className="relative min-h-[min(760px,82vh)] overflow-hidden border-b border-border bg-navy text-white">
        <img
          src="/hero.jpg"
          alt="A residential Detroit neighborhood"
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,23,35,.94)_0%,rgba(8,23,35,.72)_48%,rgba(8,23,35,.18)_100%)]" />
        {session && (
          <div className="absolute right-4 top-4 z-10 sm:right-6 lg:right-10">
            <SessionDataDeleteButton
              session={session}
              className="rounded-none border border-white/60 bg-black/45 text-white hover:bg-destructive"
              onDeleted={() => setRecentCaseId("")}
            />
          </div>
        )}
        <div className="relative mx-auto flex min-h-[min(760px,82vh)] max-w-7xl flex-col justify-between px-4 py-7 sm:px-6 md:py-16 lg:px-10">
          <div className={`max-w-3xl ${session ? "pt-12 sm:pt-0" : ""}`}>
            <DemoFlag />
            <h1 className="mt-5 font-display text-5xl leading-[.9] sm:mt-8 sm:text-7xl lg:text-8xl">
              HomeFix 313
            </h1>
            <p className="mt-4 max-w-2xl font-display text-2xl leading-tight text-white sm:mt-5 sm:text-4xl">
              Your home has a story. Figure out what happens next.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:mt-6 sm:text-lg">
              Report the problem, build your Repair Passport, and find a path toward getting it fixed.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <BlueprintButton
                to="/intake"
                search={{}}
                dataGuideTarget="resident-start-assessment"
              >
                Start Repair Assessment
              </BlueprintButton>
              {recentCaseId && (
                <BlueprintButton
                  to="/passport"
                  search={{ caseId: recentCaseId }}
                  variant="secondary"
                >
                  Resume My Repair
                </BlueprintButton>
              )}
              <Button
                type="button"
                variant="outline"
                className="min-h-12 rounded-none border-white/70 bg-black/20 text-white hover:bg-white hover:text-foreground"
                onClick={() => startGuideDemo("resident")}
              >
                Take Guided Demo
              </Button>
            </div>
          </div>
          <ol className="mt-12 hidden flex-wrap gap-x-6 gap-y-3 border-t border-white/45 pt-5 text-xs font-bold uppercase sm:flex">
            {pitchSteps.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <b className="font-display text-xl font-normal text-warning">
                  {String(index + 1).padStart(2, "0")}
                </b>
                {step}
                {index < pitchSteps.length - 1 && (
                  <ArrowDown className="size-3 -rotate-90 text-white/60" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>
      <DemoSessionPanel
        onReset={() => setRecentCaseId("")}
        onSessionChange={setSession}
        showDeleteAction={false}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <SectionLabel number="01">What HomeFix helps you do</SectionLabel>
        <div className="mt-8 grid gap-px bg-border md:grid-cols-3">
          {benefits.map(([Icon, title, text]) => (
            <article key={title} className="bg-background p-7">
              <Icon className="size-7 text-primary" />
              <h2 className="mt-8 text-2xl">{title}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-navy text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          <SectionLabel number="02">How HomeFix works</SectionLabel>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ["Report", "Resident tells HomeFix what is wrong."],
              ["Assess", "AI provides preliminary repair triage."],
              ["Organize", "HomeFix builds the Repair Passport."],
              ["Match", "Deterministic rules identify potential resources."],
              ["Cover", "Coverage Plan shows what has a path and what does not."],
              ["Learn", "Partner Intelligence aggregates gaps across the city."],
            ].map(([title, text], index) => (
              <div key={title} className="border-t border-primary-foreground/30 pt-4">
                <b className="font-display text-5xl font-normal text-warning">0{index + 1}</b>
                <h3 className="mt-8 text-xl">{title}</h3>
                <p className="mt-3 text-sm text-primary-foreground/75">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <BlueprintButton to="/intake" search={{}} variant="rust">
              Start Repair Assessment
            </BlueprintButton>
          </div>
        </div>
      </section>
      <section className="border-y border-foreground bg-warning/15">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[auto_1fr_auto] md:items-center lg:px-10">
          <BriefcaseBusiness className="size-10 text-primary" aria-hidden="true" />
          <div>
            <p className="eyebrow">Contractors and repair partners</p>
            <h2 className="mt-2 text-3xl">Interested in taking available repair cases?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Open the partner workspace to review Detroit repair demand, coordinate inspections,
              and see work prepared for contractor response.
            </p>
          </div>
          <Button asChild className="min-h-12 rounded-none md:justify-self-end">
            <Link to="/contractors">
              Contractor Access
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <Disclaimer />
      </div>
    </div>
  );
}
