import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ClipboardCheck, FileSearch, FolderCheck, Home, Wrench } from "lucide-react";
import { BlueprintButton, DemoFlag, Disclaimer, SectionLabel, StatusBadge } from "@/components/homefix";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HomeFix 313 — A path toward home repair" }, { name: "description", content: "Understand your Detroit home repair needs, build a reusable Repair Passport, and find possible assistance." },
    { property: "og:title", content: "HomeFix 313 — A path toward home repair" }, { property: "og:description", content: "Snap the problem, build your Repair Passport, and find a path toward getting it fixed." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: HomePage,
});

function HomePage() {
  const [recentCaseId, setRecentCaseId] = useState("");
  useEffect(() => {
    setRecentCaseId(localStorage.getItem("homefix:lastCaseId") ?? "");
  }, []);
  const benefits = [[FileSearch,"Understand the problem","Describe the repair and add photos to create a clear preliminary assessment."],[Wrench,"Find possible help","Compare your situation with available home-repair assistance programs."],[FolderCheck,"Keep everything together","Build a reusable Repair Passport with needs, documents, matches, and progress."]] as const;
  return <div className="pb-20 lg:pb-0">
    <section className="blueprint-grid border-b border-border"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-[1.2fr_.8fr] lg:px-10">
      <div className="flex flex-col justify-between"><div><DemoFlag/><p className="mt-7 text-xs font-bold uppercase text-rust">HomeFix 313</p><h1 className="mt-4 max-w-3xl font-display text-5xl leading-[.97] sm:text-6xl lg:text-8xl">Your home has a story.<br/><em className="font-normal text-primary">HomeFix helps you figure out what happens next.</em></h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Snap the problem, build your Repair Passport, and find a path toward getting it fixed.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><BlueprintButton to="/intake" search={{demo:"denise-carter-pitch-v1"}}>Start a Repair Assessment</BlueprintButton>{recentCaseId ? <BlueprintButton to="/passport" search={{caseId:recentCaseId}} variant="secondary">Resume Recent Case</BlueprintButton> : <BlueprintButton to="/intake" search={{demo:"denise-carter-pitch-v1"}} variant="secondary">Explore the Guided Demo</BlueprintButton>}</div></div>
      <ol className="mt-12 flex flex-wrap gap-6 border-t border-foreground pt-5 text-xs font-bold uppercase">{["Report","Assess","Match","Repair"].map((x,i)=><li key={x} className="flex items-center gap-2"><b className="font-display text-xl font-normal text-rust">{String(i+1).padStart(2,"0")}</b>{x}{i<3&&<ArrowDown className="size-3 -rotate-90 text-muted-foreground"/>}</li>)}</ol></div>
      <article className="self-center bg-paper shadow-[12px_12px_0_var(--border)]"><div className="border-b-8 border-primary p-5"><div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground"><span>HomeFix property file</span><span>HF-48221-00128</span></div><h2 className="mt-10 text-4xl uppercase leading-none">123 Main Street</h2><p className="mt-2 text-muted-foreground">Detroit, Michigan 48224</p></div><div className="grid grid-cols-2 border-b border-border"><div className="border-r border-border p-5"><span className="eyebrow">Repair status</span><strong className="mt-4 block text-xl">Roof / Water Intrusion</strong><div className="mt-3"><StatusBadge tone="danger">High priority</StatusBadge></div></div><div className="p-5"><span className="eyebrow">Potential resources</span><strong className="mt-3 block font-display text-6xl font-normal">3</strong><span className="text-xs text-muted-foreground">program paths identified</span></div></div><div className="p-5"><div className="flex items-end justify-between"><span className="text-xs font-bold uppercase">Repair coverage</span><strong className="font-display text-4xl font-normal text-primary">67%</strong></div><div className="mt-3 h-2 bg-muted"><span className="block h-full w-2/3 bg-primary"/></div></div></article>
    </div></section>
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10"><SectionLabel number="01">What HomeFix helps you do</SectionLabel><div className="mt-8 grid gap-px bg-border md:grid-cols-3">{benefits.map(([Icon,title,text])=><article key={title} className="bg-background p-7"><Icon className="size-7 text-primary"/><h2 className="mt-8 text-2xl">{title}</h2><p className="mt-3 leading-relaxed text-muted-foreground">{text}</p></article>)}</div></section>
    <section className="bg-navy text-primary-foreground"><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10"><SectionLabel number="02">How HomeFix works</SectionLabel><div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{["Tell us about your home","Describe or photograph the repair","Review possible assistance","Track your repair plan"].map((x,i)=><div key={x} className="border-t border-primary-foreground/30 pt-4"><b className="font-display text-5xl font-normal text-warning">0{i+1}</b><h3 className="mt-8 text-xl">{x}</h3></div>)}</div><div className="mt-12"><BlueprintButton to="/intake" search={{demo:"denise-carter-pitch-v1"}} variant="rust">Start My Repair Assessment</BlueprintButton></div></div></section>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10"><Disclaimer/></div>
  </div>;
}