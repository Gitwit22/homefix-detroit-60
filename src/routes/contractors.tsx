import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Eye, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { DemoFlag } from "@/components/homefix";
import { Button } from "@/components/ui/button";
import { HomeFixApiError, openContractorAccess } from "@/lib/homefix-api";
import {
  getStoredContractorSession,
  storeContractorSession,
} from "@/lib/contractor-session";

export const Route = createFileRoute("/contractors")({
  head: () => ({
    meta: [
      { title: "Contractor Access - HomeFix 313" },
      {
        name: "description",
        content: "Open the HomeFix partner workspace for Detroit home repair coordination.",
      },
    ],
  }),
  component: ContractorAccessPage,
});

function ContractorAccessPage() {
  const navigate = Route.useNavigate();
  const storedSession = getStoredContractorSession();
  const [displayName, setDisplayName] = useState(storedSession?.displayName ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim() || !/^\d{4}$/.test(pin)) {
      setError("Enter a business or contractor name and a four-digit code.");
      return;
    }

    setIsWorking(true);
    setError("");
    try {
      const session = await openContractorAccess(displayName, pin);
      storeContractorSession(session);
      await navigate({ to: "/partner" });
    } catch (accessError) {
      console.error(accessError);
      setError(
        accessError instanceof HomeFixApiError && accessError.status === 401
          ? "That name and four-digit code do not match."
          : "Contractor access could not be opened. Please try again.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-secondary/35">
      <section className="border-b border-foreground bg-navy text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <DemoFlag />
            <p className="mt-8 text-xs font-bold uppercase text-warning">Contractor access</p>
            <h1 className="mt-3 font-display text-5xl leading-[.95] sm:text-6xl">
              Help move Detroit repair cases forward.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              This is the HomeFix partner workspace. It brings submitted repair cases,
              inspection activity, program pathways, and available work into one coordinated
              view.
            </p>
            <div className="mt-9 grid gap-px bg-white/25 sm:grid-cols-3">
              {["Review repair demand", "Coordinate inspections", "Respond to available work"].map(
                (item, index) => (
                  <div key={item} className="bg-navy p-4">
                    <b className="font-display text-3xl font-normal text-warning">0{index + 1}</b>
                    <p className="mt-3 text-sm font-semibold">{item}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="self-center border border-white/40 bg-background p-6 text-foreground sm:p-8">
            <BriefcaseBusiness className="size-8 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-3xl">Create or open access</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Use your business name or contractor name and a four-digit code. Use the same name
              and code when you return.
            </p>
            <form className="mt-7 grid gap-4" onSubmit={submit}>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="contractor-name">
                Business or contractor name
                <input
                  id="contractor-name"
                  className="min-h-12 border border-input bg-background px-3 font-normal"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={120}
                  autoComplete="organization"
                  disabled={isWorking}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold" htmlFor="contractor-pin">
                Four-digit code
                <span className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    id="contractor-pin"
                    className="min-h-12 w-full border border-input bg-background px-10 font-normal"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4 digits"
                    inputMode="numeric"
                    autoComplete="current-password"
                    pattern="[0-9]{4}"
                    disabled={isWorking}
                  />
                </span>
              </label>
              {error && (
                <p className="border-l-4 border-destructive bg-destructive/10 p-3 text-sm font-semibold" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="min-h-12 rounded-none" disabled={isWorking}>
                {isWorking ? "Opening workspace..." : "Create or Sign In"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button asChild variant="outline" className="min-h-12 w-full rounded-none">
              <Link to="/contractor-jobs">
                <Eye aria-hidden="true" />
                Browse Jobs as Guest
              </Link>
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Preview available work without an account. Resident names, contact details, and
              street addresses stay hidden.
            </p>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Buildathon access only. This is not contractor verification or official government
              procurement.
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to resident home
        </Link>
      </div>
    </div>
  );
}