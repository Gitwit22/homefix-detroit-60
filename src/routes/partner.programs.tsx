import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { DemoFlag, PageIntro, StatusBadge } from "@/components/homefix";
import { PartnerDataWarning, PartnerRouteError, PartnerRouteLoading } from "@/components/partner-route-state";
import { getPartnerAnalytics, getPrograms, type ProgramCatalogResponse } from "@/lib/homefix-api";
import { toRepairCategoryLabel } from "@/lib/repair-categories";
import { capacityStatusLabels } from "../../server/domain/partnerAnalytics";

export const Route = createFileRoute("/partner/programs")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" && search["q"].trim() ? search["q"].trim() : undefined,
    repairType:
      typeof search["repairType"] === "string" && search["repairType"] !== "all"
        ? search["repairType"]
        : undefined,
    status:
      typeof search["status"] === "string" && search["status"] !== "all"
        ? search["status"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Programs - HomeFix 313 Partner" },
      { name: "description", content: "Verified repair program catalog and modeled capacity." },
    ],
  }),
  loader: async () => {
    const [catalog, analytics] = await Promise.all([getPrograms(), getPartnerAnalytics()]);
    return { catalog, analytics };
  },
  pendingComponent: PartnerRouteLoading,
  errorComponent: PartnerRouteError,
  component: Programs,
});

const groups = [
  {
    title: "Current",
    description: "Resident-facing programs with active or limited intake pathways.",
    accepts: (program: ProgramCatalogResponse[number]) =>
      program.recordType === "resident_program" &&
      ["open", "current", "limited"].includes(program.applicationStatus),
  },
  {
    title: "Interest / Upcoming",
    description: "Inquiry lists and programs whose award availability still needs confirmation.",
    accepts: (program: ProgramCatalogResponse[number]) =>
      program.applicationStatus === "interest_list",
  },
  {
    title: "Closed / Transitioning",
    description: "Historical programs retained for referrals, reporting, and successor tracking.",
    accepts: (program: ProgramCatalogResponse[number]) =>
      ["closed", "transitioning"].includes(program.applicationStatus),
  },
  {
    title: "Funding Layers",
    description:
      "Funding sources delivered through another resident-facing program, not direct applications.",
    accepts: (program: ProgramCatalogResponse[number]) => program.recordType === "funding_layer",
  },
] as const;

function Programs() {
  const { catalog, analytics } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const capacityByProgram = new Map(
    analytics.programCapacity.map((capacity) => [capacity.programId, capacity]),
  );
  const repairTypeOptions = [...new Set(catalog.flatMap((program) => program.repairTypes))]
    .filter(Boolean)
    .sort();
  const statusOptions = [...new Set(catalog.map((program) => program.applicationStatus))]
    .filter(Boolean)
    .sort();
  const matchesFilters = (program: ProgramCatalogResponse[number]) => {
    if (search.q) {
      const query = search.q.toLowerCase();
      const text = `${program.name} ${program.organization} ${program.description ?? ""}`.toLowerCase();
      if (!text.includes(query)) return false;
    }
    if (search.repairType && !program.repairTypes.includes(search.repairType)) return false;
    if (search.status && program.applicationStatus !== search.status) return false;
    return true;
  };
  const updateSearch = (next: Record<string, string | undefined>) =>
    navigate({
      search: (prev) => ({
        ...prev,
        ...next,
      }),
      replace: true,
    });
  const clearFilters = () => navigate({ search: {}, replace: true });
  const filteredTotal = catalog.filter(matchesFilters).length;

  return (
    <>
      <PartnerDataWarning warning={analytics.warning} />
      <DemoFlag />
      <PageIntro
        eyebrow="Verified Sept. 19, 2026"
        title="Home Repair Programs"
        description="Resident programs, closed initiatives, and funding layers are separated so catalog visibility never implies eligibility or open enrollment."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <input
          type="search"
          placeholder="Search programs..."
          value={search.q ?? ""}
          onChange={(event) => updateSearch({ q: event.target.value || undefined })}
          className="h-12 border border-border px-3"
        />
        <select
          value={search.repairType ?? "all"}
          onChange={(event) =>
            updateSearch({ repairType: event.target.value === "all" ? undefined : event.target.value })
          }
          className="h-12 border border-border px-3"
        >
          <option value="all">All Repair Types</option>
          {repairTypeOptions.map((repairType) => (
            <option key={repairType} value={repairType}>
              {toRepairCategoryLabel(repairType)}
            </option>
          ))}
        </select>
        <select
          value={search.status ?? "all"}
          onChange={(event) => updateSearch({ status: event.target.value === "all" ? undefined : event.target.value })}
          className="h-12 border border-border px-3"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-10 space-y-14">
        {filteredTotal === 0 ? (
          <div className="border border-dashed border-border p-6 text-sm">
            <p>No programs match the current filters.</p>
            <button type="button" className="mt-3 font-bold text-primary" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          groups.map((group) => {
            const items = catalog.filter((program) => group.accepts(program) && matchesFilters(program));
            if (items.length === 0) return null;
          return (
            <section key={group.title}>
              <div className="border-b border-border pb-4 md:flex md:items-end md:justify-between">
                <h2 className="font-display text-3xl font-normal">{group.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:mt-0">
                  {group.description}
                </p>
              </div>
              <div className="divide-y divide-border">
                {items.map((program) => {
                  const capacity = program.slug ? capacityByProgram.get(program.slug) : undefined;
                  return (
                    <article
                      key={program.id}
                      className="grid gap-5 py-6 lg:grid-cols-[1.4fr_1fr_220px_auto] lg:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold">{program.name}</h3>
                          <StatusBadge tone={statusTone(program.applicationStatus)}>
                            {program.applicationStatus.replaceAll("_", " ")}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{program.organization}</p>
                        <p className="mt-2 text-sm leading-relaxed">{program.description}</p>
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold">{program.benefitType}</p>
                        <p className="mt-1 text-muted-foreground">
                          {program.repairTypes.map(toRepairCategoryLabel).join(", ") ||
                            "Program funding"}
                        </p>
                        {program.residentEntryPoint && (
                          <p className="mt-2 text-muted-foreground">
                            Entry point: {program.residentEntryPoint}
                          </p>
                        )}
                      </div>
                      <div className="text-sm">
                        {capacity ? (
                          <>
                            <p className="eyebrow">Modeled capacity assumption</p>
                            <p className="mt-2">
                              {capacityStatusLabels[capacity.status]}: {capacity.matchedNeeds} needs
                              / {capacity.simulatedCapacity} capacity
                            </p>
                            <p className="mt-1 font-semibold text-rust">
                              {capacity.excessDemand} above modeled capacity
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">No capacity assumption available</p>
                        )}
                      </div>
                      <Link
                        to="/programs/$programId"
                        params={{ programId: program.slug ?? program.id }}
                        search={{ from: "partner" }}
                        className="flex items-center gap-2 font-bold text-primary"
                      >
                        Details
                        <ArrowRight className="size-4" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
          })
        )}
      </div>
    </>
  );
}

function statusTone(status: string): "positive" | "warning" | "danger" {
  if (["open", "current"].includes(status)) return "positive";
  if (["closed", "transitioning"].includes(status)) return "danger";
  return "warning";
}
