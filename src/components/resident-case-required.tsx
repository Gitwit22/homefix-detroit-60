import { Link } from "@tanstack/react-router";

import { BlueprintButton } from "@/components/homefix";

export function ResidentCaseRequired({ pageName }: { pageName: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">No active repair case</p>
      <h1 className="mt-3 text-4xl sm:text-6xl">Create a case to view your {pageName}.</h1>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        Complete a repair assessment first, or return home and select a case saved to your demo
        session.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <BlueprintButton to="/intake" search={{}}>
          Start Repair Assessment
        </BlueprintButton>
        <Link
          to="/"
          className="blueprint-button button-secondary inline-flex items-center justify-center"
        >
          View Saved Cases
        </Link>
      </div>
    </div>
  );
}