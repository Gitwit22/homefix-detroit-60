import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, BarChart3, BriefcaseBusiness, Building2, Camera, Check, ChevronRight, CircleDot, ClipboardList, FileCheck2, FileText, Gauge, Hammer, Home, LayoutDashboard, MapPin, Menu, Search, ShieldCheck, Upload, Users, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const residentLinks = [
  { to: "/", label: "Home", icon: Home }, { to: "/intake", label: "My Repair", icon: Wrench },
  { to: "/passport", label: "Repair Passport", icon: FileText }, { to: "/coverage", label: "Coverage Plan", icon: ShieldCheck },
  { to: "/status", label: "Case Status", icon: ClipboardList },
] as const;

export const partnerLinks = [
  { to: "/partner", label: "Overview", icon: LayoutDashboard }, { to: "/partner/cases", label: "Repair Cases", icon: ClipboardList },
  { to: "/partner/unmet-needs", label: "Unmet Needs", icon: AlertTriangle }, { to: "/partner/programs", label: "Programs", icon: Building2 },
  { to: "/partner/overflow", label: "Overflow Jobs", icon: BriefcaseBusiness }, { to: "/partner/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function DemoFlag() { return <span className="demo-flag"><CircleDot aria-hidden="true" /> Synthetic Demo Data</span>; }

export function ViewSwitcher() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const partner = path.startsWith("/partner");
  return <div className="view-switcher" aria-label="Demo view switcher">
    <Link to="/" className={cn(!partner && "is-active")}>Resident View</Link>
    <Link to="/partner" className={cn(partner && "is-active")}>Partner View</Link>
  </div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const partner = path.startsWith("/partner");
  return <div className="min-h-screen bg-background text-foreground">
    <header className="app-header">
      <Link to="/" className="brand-mark" aria-label="HomeFix 313 home"><span className="brand-number">313</span><span><strong>HomeFix</strong><small>Detroit repair passport</small></span></Link>
      {!partner && <nav className="resident-nav" aria-label="Resident navigation">{residentLinks.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} activeProps={{ className: "is-active" }}>{item.label}</Link>)}</nav>}
      <ViewSwitcher />
    </header>
    {partner ? <div className="partner-layout"><aside className="partner-sidebar"><div className="sidebar-title"><span>Partner workspace</span><strong>Detroit Repair<br/>Intelligence</strong></div><nav aria-label="Partner navigation">{partnerLinks.map(({to,label,icon:Icon}) => <Link key={to} to={to} activeOptions={{ exact: to === "/partner" }} activeProps={{ className: "is-active" }}><Icon aria-hidden="true" />{label}</Link>)}</nav><div className="sidebar-foot"><DemoFlag /><p>Planning view for community partners.</p></div></aside><main className="partner-main">{children}</main></div> : <main>{children}</main>}
    {!partner && <nav className="mobile-nav" aria-label="Resident mobile navigation">{residentLinks.map(({to,label,icon:Icon}) => <Link key={to} to={to} activeOptions={{ exact: to === "/" }} activeProps={{ className: "is-active" }}><Icon aria-hidden="true" /><span>{label.replace("Repair ", "")}</span></Link>)}</nav>}
  </div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "positive" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={cn("status-badge", `status-${tone}`)}><CircleDot aria-hidden="true" />{children}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === "Critical" || priority === "High" ? "danger" : "warning";
  return <StatusBadge tone={tone}>{priority} priority</StatusBadge>;
}

export function SectionLabel({ number, children }: { number?: string; children: ReactNode }) { return <div className="section-label">{number && <b>{number}</b>}<span>{children}</span></div>; }

export function BlueprintButton({ to, children, variant = "primary" }: { to: string; children: ReactNode; variant?: "primary" | "secondary" | "rust" }) {
  return <Button asChild className={cn("blueprint-button", `button-${variant}`)}><Link to={to}>{children}<ArrowRight aria-hidden="true" /></Link></Button>;
}

export function Disclaimer() { return <div className="disclaimer"><ShieldCheck aria-hidden="true" /><p><strong>Preliminary guidance only.</strong> HomeFix does not replace a licensed professional inspection or guarantee eligibility, funding, or approval.</p></div>; }

export function ProgressRail({ current }: { current: number }) {
  const steps = ["Property", "Household", "Repair", "Photos", "Review"];
  return <ol className="progress-rail" aria-label={`Step ${current} of 5`}>{steps.map((step,i) => <li key={step} className={cn(i + 1 < current && "complete", i + 1 === current && "current")}><span>{i + 1 < current ? <Check aria-hidden="true" /> : String(i + 1).padStart(2,"0")}</span><b>{step}</b></li>)}</ol>;
}

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="form-field"><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>; }

export function ChoiceGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="choice-group"><legend>{label}</legend><div>{options.map(option => <button type="button" key={option} onClick={() => onChange(option)} className={cn(value === option && "selected")} aria-pressed={value === option}>{value === option && <Check aria-hidden="true" />}{option}</button>)}</div></fieldset>;
}

export const repairCategories = [
  ["Roof / Water", Home], ["Heating", Gauge], ["Plumbing", Wrench], ["Electrical", CircleDot], ["Accessibility", Users], ["Structural", Building2], ["Environmental", ShieldCheck], ["Other", Menu],
] as const;

export function RepairCategoryGrid({ selected, onChange }: { selected: string; onChange: (value: string) => void }) {
  return <fieldset><legend className="field-legend">What type of repair do you need help with?</legend><div className="repair-grid">{repairCategories.map(([name,Icon],i) => <button key={name} type="button" className={cn(selected === name && "selected")} onClick={() => onChange(name)} aria-pressed={selected === name}><span>{String(i+1).padStart(2,"0")}</span><Icon aria-hidden="true"/><b>{name}</b>{selected === name && <Check className="check" aria-hidden="true"/>}</button>)}</div></fieldset>;
}

export function PhotoUploader({ hasPhotos, onUpload }: { hasPhotos: boolean; onUpload: () => void }) {
  return <div>{!hasPhotos ? <button type="button" className="photo-drop" onClick={onUpload}><Upload aria-hidden="true"/><strong>Add photos of the repair</strong><span>Take a photo or choose images from your device</span><small>JPG, PNG · Multiple photos welcome</small></button> : <div className="photo-previews"><div className="mock-damage-photo"><div className="water-mark"/><span>Ceiling water damage</span></div><div className="mock-damage-photo second"><div className="water-mark"/><span>Wall near roofline</span></div><button type="button" onClick={onUpload} aria-label="Remove uploaded photos"><X aria-hidden="true"/></button></div>}<Button type="button" variant="outline" className="mt-4 min-h-12" onClick={onUpload}><Camera aria-hidden="true"/>{hasPhotos ? "Replace mock photos" : "Use camera"}</Button></div>;
}

export function CoverageMeter({ value = 67 }: { value?: number }) { return <div className="coverage-meter"><div className="meter-number"><strong>{value}%</strong><span>of identified repair needs<br/>have a potential resource</span></div><div className="meter-track"><span style={{ width: `${value}%` }} /></div></div>; }

export function Metric({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) { return <div className={cn("metric", accent && "accent")}><strong>{value}</strong><span>{label}</span></div>; }

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) { return <div className="data-table-wrap"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }

export function NextAction({ children, to = "/passport" }: { children: ReactNode; to?: string }) { return <section className="next-action"><div><span className="eyebrow">Next best action</span><h2>{children}</h2></div><BlueprintButton to={to}>Continue</BlueprintButton></section>; }