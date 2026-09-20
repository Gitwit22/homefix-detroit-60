import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Eye, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { DemoFlag } from "@/components/homefix";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HomeFixApiError, registerContractor, signInContractor } from "@/lib/homefix-api";
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
  const [mode, setMode] = useState<"register" | "sign-in">("register");
  const [displayName, setDisplayName] = useState(storedSession?.displayName ?? "");
  const [pin, setPin] = useState("");
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim() || !/^\d{4}$/.test(pin)) {
      setError("Enter a business or contractor name and a four-digit code.");
      return;
    }
    if (mode === "register" && !complianceConfirmed) {
      setError("Confirm the compliance acknowledgment before creating your account.");
      return;
    }

    setIsWorking(true);
    setError("");
    try {
      const session =
        mode === "register"
          ? await registerContractor(displayName, pin, true)
          : await signInContractor(displayName, pin);
      storeContractorSession(session);
      await navigate({ to: "/partner" });
    } catch (accessError) {
      console.error(accessError);
      if (accessError instanceof HomeFixApiError) setError(accessError.message);
      else if (accessError instanceof DOMException && accessError.name === "AbortError")
        setError("The contractor service took too long to respond. Please try again.");
      else if (accessError instanceof TypeError)
        setError("The contractor service could not be reached. Check your connection and try again.");
      else setError("Contractor access failed. Please try again.");
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
            <h2 className="mt-5 text-3xl">
              {mode === "register" ? "Create contractor account" : "Sign in"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {mode === "register"
                ? "Create access with your business or contractor name and a four-digit code."
                : "Use the same business or contractor name and code you registered with."}
            </p>
            <div
              className="mt-6 grid grid-cols-2 border border-foreground"
              aria-label="Contractor access mode"
            >
              {(["register", "sign-in"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`min-h-11 px-3 text-sm font-bold ${mode === option ? "bg-foreground text-background" : "bg-background"}`}
                  aria-pressed={mode === option}
                  onClick={() => {
                    setMode(option);
                    setError("");
                  }}
                  disabled={isWorking}
                >
                  {option === "register" ? "Create Account" : "Sign In"}
                </button>
              ))}
            </div>
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
              {mode === "register" && (
                <label
                  className="flex cursor-pointer items-start gap-3 border border-border bg-secondary/35 p-4 text-sm font-semibold leading-relaxed"
                  htmlFor="contractor-compliance"
                >
                  <Checkbox
                    id="contractor-compliance"
                    className="mt-0.5 size-5 rounded-none"
                    checked={complianceConfirmed}
                    onCheckedChange={(checked) => setComplianceConfirmed(checked === true)}
                    aria-required="true"
                    disabled={isWorking}
                  />
                  <span>
                    I confirm that I am properly licensed, insured, and authorized to perform the
                    services I am registering to provide, where required by applicable law.
                    <small className="mt-2 block font-normal text-muted-foreground">
                      Required. This representation does not verify your license or insurance.
                    </small>
                  </span>
                </label>
              )}
              {error && (
                <p
                  className="border-l-4 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <Button type="submit" className="min-h-12 rounded-none" disabled={isWorking}>
                {isWorking
                  ? mode === "register"
                    ? "Creating account..."
                    : "Signing in..."
                  : mode === "register"
                    ? "Create Contractor Account"
                    : "Sign In"}
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