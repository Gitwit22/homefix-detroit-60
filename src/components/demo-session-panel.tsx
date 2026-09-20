import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, RotateCcw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  claimDemoSessionCase,
  getDemoSessionCases,
  openDemoSession,
  wipeDemoSessionData,
  type DemoSessionCase,
} from "@/lib/homefix-api";
import {
  clearDemoSession,
  getStoredDemoSession,
  storeDemoSession,
  type DemoSession,
} from "@/lib/demo-session";
import { lastCaseStorageKey } from "@/lib/resident-case";

const demoDraftKey = "homefix:denise-carter-pitch-v1:draft";

export function DemoSessionPanel({
  onReset,
  caseId,
  onClaimed,
}: {
  onReset?: () => void;
  caseId?: string;
  onClaimed?: () => void;
}) {
  const [session, setSession] = useState<DemoSession | null>(() => getStoredDemoSession());
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [cases, setCases] = useState<DemoSessionCase[]>([]);
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const loadCases = async (activeSession: DemoSession) => {
    try {
      setCases(await getDemoSessionCases(activeSession.token));
    } catch (loadError) {
      console.error(loadError);
      setError("Saved demo cases could not be loaded.");
    }
  };

  useEffect(() => {
    if (session) void loadCases(session);
  }, [session]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim() || !/^\d{4}$/.test(pin)) {
      setError("Enter a display name and four-digit PIN.");
      return;
    }
    setIsWorking(true);
    setError("");
    try {
      const nextSession = await openDemoSession(displayName, pin);
      storeDemoSession(nextSession);
      setSession(nextSession);
      if (caseId) {
        await claimDemoSessionCase(nextSession.token, caseId);
        onClaimed?.();
      }
      setDisplayName("");
      setPin("");
    } catch (signInError) {
      console.error(signInError);
      setError(
        signInError instanceof Error && signInError.message === "INVALID_SESSION_CREDENTIALS"
          ? "Display name or PIN is incorrect."
          : "Your Passport session could not be opened.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const signOut = () => {
    clearDemoSession();
    setSession(null);
    setCases([]);
    setError("");
  };

  const wipe = async () => {
    if (!session) return;
    setIsWorking(true);
    setError("");
    try {
      await wipeDemoSessionData(session.token);
      localStorage.removeItem(lastCaseStorageKey);
      localStorage.removeItem(demoDraftKey);
      setCases([]);
      onReset?.();
    } catch (wipeError) {
      console.error(wipeError);
      setError("Your saved data could not be deleted. Nothing was removed.");
    } finally {
      setIsWorking(false);
    }
  };

  const claim = async () => {
    if (!session || !caseId) return;
    setIsWorking(true);
    setError("");
    try {
      await claimDemoSessionCase(session.token, caseId);
      await loadCases(session);
      onClaimed?.();
    } catch (claimError) {
      console.error(claimError);
      setError("This Repair Passport could not be saved to your session.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section className="border-b border-foreground bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <p className="eyebrow">Repair Passport access</p>
          {session ? (
            <>
              <h2 className="mt-2 text-3xl">Welcome, {session.displayName}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Your saved Repair Passports can be resumed on this device or another browser.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-3xl">Save and return to your Repair Passport</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Create or open a buildathon session with a display name and four-digit PIN.
              </p>
            </>
          )}
          {error && (
            <p className="mt-3 text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        {!session ? (
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={signIn}>
            <label className="sr-only" htmlFor="demo-display-name">
              Demo display name
            </label>
            <input
              id="demo-display-name"
              className="min-h-11 border border-input bg-background px-3"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              maxLength={80}
              disabled={isWorking}
            />
            <label className="sr-only" htmlFor="passport-pin">
              Four-digit PIN
            </label>
            <input
              id="passport-pin"
              className="min-h-11 w-36 border border-input bg-background px-3"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit PIN"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="[0-9]{4}"
              disabled={isWorking}
            />
            <Button type="submit" className="min-h-11 rounded-none" disabled={isWorking}>
              <LogIn /> {isWorking ? "Opening..." : caseId ? "Save My Passport" : "Create or Sign In"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {caseId && !cases.some((item) => item.caseId === caseId) && (
              <Button className="rounded-none" onClick={() => void claim()} disabled={isWorking}>
                {isWorking ? "Saving..." : "Save My Passport"}
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-none"
              onClick={signOut}
              disabled={isWorking}
            >
              <LogOut /> Sign Out
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-none" disabled={isWorking}>
                  <RotateCcw /> Delete My Saved Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-none">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your saved Repair Passports?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every customer case, photo, assessment, and workflow
                    record saved to this session. The shared program catalog will remain.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void wipe()}
                  >
                    Delete Saved Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {session && cases.length > 0 && (
          <div className="border-t border-border pt-5 lg:col-span-2">
            <p className="eyebrow">Saved cases</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cases.map((item) => (
                <Link
                  key={item.caseId}
                  to="/passport"
                  search={{ caseId: item.caseId }}
                  className="border border-foreground bg-background px-4 py-3 text-sm font-semibold hover:bg-accent"
                >
                  {item.caseNumber} · {item.streetAddress}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
