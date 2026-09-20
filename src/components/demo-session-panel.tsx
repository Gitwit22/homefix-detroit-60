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

const demoDraftKey = "homefix:denise-carter-pitch-v1:draft";

export function DemoSessionPanel({ onReset }: { onReset: () => void }) {
  const [session, setSession] = useState<DemoSession | null>(() => getStoredDemoSession());
  const [displayName, setDisplayName] = useState("");
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
    if (!displayName.trim()) {
      setError("Enter a display name to continue.");
      return;
    }
    setIsWorking(true);
    setError("");
    try {
      const nextSession = await openDemoSession(displayName);
      storeDemoSession(nextSession);
      setSession(nextSession);
      setDisplayName("");
    } catch (signInError) {
      console.error(signInError);
      setError("The demo session could not be opened.");
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
      localStorage.removeItem("homefix:lastCaseId");
      localStorage.removeItem(demoDraftKey);
      clearDemoSession();
      setSession(null);
      setCases([]);
      onReset();
    } catch (wipeError) {
      console.error(wipeError);
      setError("Demo data could not be wiped. Nothing was removed from the case database.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section className="border-b border-foreground bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <p className="eyebrow">Live demo session</p>
          {session ? (
            <>
              <h2 className="mt-2 text-3xl">Welcome, {session.displayName}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Cases created during this browser session can be resumed here. This demo name is not
                a secure account.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-3xl">Save this walkthrough for the session</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Signing in is optional. A display name groups demo cases so you can resume or wipe
                them before the next presentation.
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
            <Button type="submit" className="min-h-11 rounded-none" disabled={isWorking}>
              <LogIn /> {isWorking ? "Opening..." : "Start Session"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 lg:justify-end">
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
                  <RotateCcw /> Wipe My Demo Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-none">
                <AlertDialogHeader>
                  <AlertDialogTitle>Wipe your resident demo data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your Denise demo cases and uploaded repair photos.
                    Partner analytics, programs, and overflow demo data will remain available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void wipe()}
                  >
                    Wipe Demo Data
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
