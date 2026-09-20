import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { startGuideDemo } from "@/lib/homefix-guide";

const guideStartEvent = "homefix-guide:start";
const intakeGuideEvent = "homefix-guide:intake-step";

type GuidePageContent = {
  title: string;
  intro: string;
  nextStep: string;
  whyAsk: string;
  simpleWords: string;
  readAloud: string;
  showSelector: string;
};

type DemoStep = {
  step: number;
  total: number;
  title: string;
  intro: string;
  showSelector?: string;
  nextSelector?: string;
  backSelector?: string;
  completeLabel?: string;
  alternateActionLabel?: string;
};

const guideContent: Record<string, GuidePageContent> = {
  "/intake": {
    title: "Let's complete your repair report",
    intro:
      "We’re collecting basic information about your home so HomeFix can look for repair programs that may fit your situation.",
    nextStep: "Enter your Detroit address.",
    whyAsk:
      "We use your home and household information to match your repair needs to programs with clear eligibility rules.",
    simpleWords:
      "Tell us what is wrong, where you live, and who lives with you. We use that to find help.",
    readAloud:
      "This intake page collects your address, household details, and repair notes so HomeFix can build your Repair Passport.",
    showSelector: "[data-guide-target='intake-address']",
  },
  "/assessment": {
    title: "Let's review what HomeFix noticed",
    intro: "This page summarizes preliminary findings from your repair report and photos.",
    nextStep: "Review the preliminary repair assessment.",
    whyAsk:
      "The assessment helps prioritize safety, prepare questions for the professional inspection, and match your case with possible programs.",
    simpleWords:
      "This is a first review of your repair issue. HomeFix will send the prepared questions to the inspector.",
    readAloud:
      "Assessment shows likely issue type, urgency, and recommended next steps before final matching.",
    showSelector: "[data-guide-target='assessment-next']",
  },
  "/passport": {
    title: "This is your Repair Passport",
    intro:
      "Your Repair Passport keeps your home profile, repair needs, assessments, and potential coverage in one place.",
    nextStep: "Check that your home and household information is correct.",
    whyAsk:
      "Accurate passport details help partners process your case faster and reduce repeat paperwork.",
    simpleWords:
      "Think of this as your repair folder. Make sure your details are correct before moving forward.",
    readAloud:
      "Passport combines case details, repair priorities, and possible program paths so you can continue to coverage planning.",
    showSelector: "[data-guide-target='passport-next']",
  },
  "/coverage": {
    title: "Let's review your repair coverage",
    intro: "This page shows which repair needs may have a resource available.",
    nextStep: "Look for items marked Verification Needed or Funding Gap.",
    whyAsk:
      "Coverage status helps you focus on missing verification checks and repairs that still need a path forward.",
    simpleWords:
      "Green means possible resource. Yellow means more info needed. Red means no resource found yet.",
    readAloud:
      "Coverage map compares your repair needs with available programs and highlights unresolved gaps.",
    showSelector: "[data-guide-target='next-action-continue']",
  },
};

const fallbackContent: GuidePageContent = {
  title: "Let's move through this page together",
  intro: "I can explain what this page is for and help you spot the next action.",
  nextStep: "Review the page heading and follow the main action button.",
  whyAsk: "Each page collects details needed to move your repair case forward.",
  simpleWords: "I can restate this page in plain language and point out what to do next.",
  readAloud:
    "This page is part of your HomeFix repair workflow. Follow the main action to continue.",
  showSelector: "main a, main button",
};

function resolveGuide(pathname: string) {
  if (guideContent[pathname]) return guideContent[pathname];
  if (pathname.startsWith("/programs/")) return guideContent["/coverage"];
  return fallbackContent;
}

function resolveResidentStep(pathname: string, intakeStep: number): DemoStep | null {
  if (pathname === "/") {
    return {
      step: 1,
      total: 7,
      title: "Start with your repair",
      intro: "HomeFix helps organize your repair problem and identify possible next steps.",
      showSelector: "[data-guide-target='resident-start-assessment']",
      nextSelector: "[data-guide-target='resident-start-assessment']",
    };
  }

  if (pathname === "/intake") {
    if (intakeStep >= 3) {
      return {
        step: 3,
        total: 7,
        title: "Show us the problem",
        intro:
          "Add a description and photos when available. HomeFix normalizes the report before checking program rules.",
        showSelector:
          intakeStep >= 5
            ? "[data-guide-target='intake-submit']"
            : intakeStep === 4
              ? "[data-guide-target='intake-photo-upload']"
              : "[data-guide-target='intake-repair-description']",
        nextSelector: "[data-guide-target='intake-continue'], [data-guide-target='intake-submit']",
        backSelector: "[data-guide-target='intake-back']",
      };
    }

    return {
      step: 2,
      total: 7,
      title: "Tell us about your home",
      intro:
        "Add basic property, household, and repair information so HomeFix can organize the case.",
      showSelector:
        intakeStep === 2
          ? "[data-guide-target='intake-household-size']"
          : "[data-guide-target='intake-address']",
      nextSelector: "[data-guide-target='intake-continue']",
      backSelector: intakeStep > 1 ? "[data-guide-target='intake-back']" : undefined,
    };
  }

  if (pathname === "/assessment") {
    return {
      step: 4,
      total: 7,
      title: "Review initial program pathways",
      intro:
        "HomeFix compares the normalized repair report with deterministic program requirements. Results remain preliminary until verification.",
      showSelector: "[data-guide-target='assessment-next']",
      nextSelector: "[data-guide-target='assessment-next']",
    };
  }

  if (pathname === "/inspection") {
    return {
      step: 5,
      total: 7,
      title: "Choose inspection availability",
      intro:
        "Submit several acceptable windows so a partner can confirm an on-site inspection of the repair condition and scope.",
      showSelector: "main button",
    };
  }

  if (pathname === "/passport") {
    return {
      step: 6,
      total: 7,
      title: "Your repair information stays together",
      intro:
        "The Repair Passport combines your home, household, repairs, assessments, and potential program matches.",
      showSelector: "[data-guide-target='passport-next']",
      nextSelector: "[data-guide-target='passport-next']",
    };
  }

  if (pathname === "/coverage") {
    return {
      step: 7,
      total: 7,
      title: "Guided Demo Complete",
      intro:
        "You’ve seen the resident journey from repair report through initial matching and inspection scheduling.",
      showSelector: "[data-guide-target='next-action-continue']",
      completeLabel: "Finish",
      alternateActionLabel: "Switch to Partner View",
    };
  }

  return null;
}

function resolvePartnerStep(pathname: string): DemoStep | null {
  if (pathname === "/partner") {
    return {
      step: 1,
      total: 5,
      title: "Overview",
      intro: "See repair demand, high-priority cases, coverage, and gaps.",
      showSelector: "[data-guide-target='partner-nav-cases']",
      nextSelector: "[data-guide-target='partner-nav-cases']",
    };
  }

  if (pathname.startsWith("/partner/cases")) {
    return {
      step: 2,
      total: 5,
      title: "Repair Cases",
      intro: "Review individual synthetic cases and their program alignment.",
      showSelector: "[data-guide-target='partner-nav-unmet-needs']",
      nextSelector: "[data-guide-target='partner-nav-unmet-needs']",
      backSelector: "[data-guide-target='partner-nav-overview']",
    };
  }

  if (pathname.startsWith("/partner/unmet-needs")) {
    return {
      step: 3,
      total: 5,
      title: "Unmet Needs",
      intro: "See which repair categories and ZIP codes lack identified resources.",
      showSelector: "[data-guide-target='partner-nav-programs']",
      nextSelector: "[data-guide-target='partner-nav-programs']",
      backSelector: "[data-guide-target='partner-nav-cases']",
    };
  }

  if (pathname.startsWith("/partner/programs")) {
    return {
      step: 4,
      total: 5,
      title: "Programs + Capacity",
      intro: "Compare repair demand with available program pathways and modeled capacity.",
      showSelector: "[data-guide-target='partner-nav-overflow']",
      nextSelector: "[data-guide-target='partner-nav-overflow']",
      backSelector: "[data-guide-target='partner-nav-unmet-needs']",
    };
  }

  if (pathname.startsWith("/partner/overflow")) {
    return {
      step: 5,
      total: 5,
      title: "Overflow Network",
      intro:
        "When an approved repair exceeds program delivery capacity, HomeFix can prepare a structured job package for contractor response.",
      showSelector:
        "[data-guide-target='partner-overflow-job']||[data-guide-target='partner-nav-overflow']",
      backSelector: "[data-guide-target='partner-nav-programs']",
      completeLabel: "Done",
    };
  }

  return null;
}

function resolveSelector(selector?: string) {
  if (!selector) return null;
  return (
    selector
      .split("||")
      .map((item) => item.trim())
      .find((item) => document.querySelector<HTMLElement>(item)) ?? null
  );
}

function focusTarget(selector?: string) {
  if (!selector)
    return "I couldn't find that control on this screen. Try scrolling a little and ask again.";
  const targetSelector = resolveSelector(selector);
  if (!targetSelector)
    return "I couldn't find that control on this screen. Try scrolling a little and ask again.";
  const target = document.querySelector<HTMLElement>(targetSelector);
  if (!target)
    return "I couldn't find that control on this screen. Try scrolling a little and ask again.";

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusTarget = target.matches("button,a,input,select,textarea,[tabindex]")
    ? target
    : target.querySelector<HTMLElement>("button,a,input,select,textarea,[tabindex]");
  if (focusTarget) {
    if (focusTarget.tabIndex < 0) {
      focusTarget.setAttribute("tabindex", "-1");
    }
    focusTarget.focus({ preventScroll: true });
  }
  target.classList.add("guide-highlight");
  window.setTimeout(() => target.classList.remove("guide-highlight"), 1800);
  return "I highlighted the next place to click.";
}

function clickTarget(selector?: string) {
  if (!selector) return false;
  const targetSelector = resolveSelector(selector);
  if (!targetSelector) return false;
  const target = document.querySelector<HTMLElement>(targetSelector);
  if (!target) return false;
  target.click();
  return true;
}

export function HomeFixGuide() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const partner = path.startsWith("/partner");
  const content = useMemo(() => resolveGuide(path), [path]);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [residentDemoActive, setResidentDemoActive] = useState(false);
  const [partnerDemoActive, setPartnerDemoActive] = useState(false);
  const [intakeStep, setIntakeStep] = useState(1);
  const [startPartnerOnArrival, setStartPartnerOnArrival] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const activeResidentStep = useMemo(
    () => resolveResidentStep(path, intakeStep),
    [intakeStep, path],
  );
  const activePartnerStep = useMemo(() => resolvePartnerStep(path), [path]);

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<{ tour?: "resident" | "partner" }>).detail;
      if (detail?.tour === "partner") {
        setPartnerDemoActive(true);
        setResidentDemoActive(false);
      } else {
        setResidentDemoActive(true);
        setPartnerDemoActive(false);
      }
      setAnswer("");
      setOpen(true);
    };

    const onIntakeStep = (event: Event) => {
      const detail = (event as CustomEvent<{ step?: number }>).detail;
      if (detail?.step) {
        setIntakeStep(detail.step);
      }
    };

    window.addEventListener(guideStartEvent, onStart as EventListener);
    window.addEventListener(intakeGuideEvent, onIntakeStep as EventListener);
    return () => {
      window.removeEventListener(guideStartEvent, onStart as EventListener);
      window.removeEventListener(intakeGuideEvent, onIntakeStep as EventListener);
    };
  }, []);

  useEffect(() => {
    setAnswer("");
  }, [path, intakeStep]);

  useEffect(() => {
    if (partner && residentDemoActive) {
      setResidentDemoActive(false);
      setOpen(false);
    }
    if (!partner && partnerDemoActive) {
      setPartnerDemoActive(false);
      setOpen(false);
    }
  }, [partner, partnerDemoActive, residentDemoActive]);

  useEffect(() => {
    if (residentDemoActive && !partner && !activeResidentStep) {
      setResidentDemoActive(false);
      setOpen(false);
    }
    if (partnerDemoActive && partner && !activePartnerStep) {
      setPartnerDemoActive(false);
      setOpen(false);
    }
  }, [activePartnerStep, activeResidentStep, partner, partnerDemoActive, residentDemoActive]);

  useEffect(() => {
    if (!startPartnerOnArrival || !partner) return;
    setStartPartnerOnArrival(false);
    setResidentDemoActive(false);
    setPartnerDemoActive(true);
    setAnswer("");
    setOpen(true);
  }, [partner, startPartnerOnArrival]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [open]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [path]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const showTarget = (selector?: string) => setAnswer(focusTarget(selector));

  const readPage = () => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setAnswer("Read aloud is not available in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${content.title}. ${content.intro} Your next step: ${content.nextStep}. ${content.readAloud}`,
    );
    window.speechSynthesis.speak(utterance);
    setAnswer("Reading this page to you now.");
  };

  const exitDemo = () => {
    setResidentDemoActive(false);
    setPartnerDemoActive(false);
    setAnswer("");
    setOpen(false);
  };

  const moveDemo = (direction: "next" | "back") => {
    const step = partnerDemoActive ? activePartnerStep : activeResidentStep;
    if (!step) return;

    const selector = direction === "next" ? step.nextSelector : step.backSelector;
    if (clickTarget(selector)) return;

    if (partnerDemoActive) {
      if (direction === "back" && path.startsWith("/partner/overflow/")) {
        void navigate({ to: "/partner/overflow" });
        return;
      }
      const partnerTargets = [
        "/partner",
        "/partner/cases",
        "/partner/unmet-needs",
        "/partner/programs",
        "/partner/overflow",
      ];
      const index = step.step - 1 + (direction === "next" ? 1 : -1);
      const nextPath = partnerTargets[index];
      if (nextPath) {
        void navigate({ to: nextPath });
      }
      return;
    }

    const caseId =
      new URLSearchParams(window.location.search).get("caseId") ??
      window.localStorage.getItem("homefix:lastCaseId") ??
      "";

    if (direction === "back") {
      if (step.step === 2 || step.step === 3 || step.step === 4) {
        void navigate({ to: "/intake", search: { demo: "denise-carter-pitch-v1" } });
        return;
      }
      if (step.step === 5 && caseId) {
        void navigate({ to: "/assessment", search: { caseId } });
        return;
      }
      if (step.step === 6 && caseId) {
        void navigate({ to: "/passport", search: { caseId } });
      }
      return;
    }

    if (step.step === 1) {
      void navigate({ to: "/intake", search: { demo: "denise-carter-pitch-v1" } });
      return;
    }
    if (step.step === 4 && caseId) {
      void navigate({ to: "/passport", search: { caseId } });
      return;
    }
    if (step.step === 5 && caseId) {
      void navigate({ to: "/coverage", search: { caseId } });
    }
  };

  const demoStep = partnerDemoActive
    ? activePartnerStep
    : residentDemoActive
      ? activeResidentStep
      : null;
  const demoToggleLabel = partner ? "Tour Partner Intelligence" : "Need Help?";
  const showPartnerTourOffer = partner && !partnerDemoActive;

  return (
    <>
      <button
        type="button"
        className="guide-toggle"
        aria-expanded={open}
        aria-controls="homefix-guide-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {demoToggleLabel}
      </button>
      {open && (
        <aside
          id="homefix-guide-panel"
          className="guide-panel"
          role="complementary"
          aria-label={demoStep ? "Guided demo" : "HomeFix Guide"}
        >
          <div className="guide-header">
            <strong>{demoStep ? "Guided Demo" : "Hi, I’m the HomeFix Guide."}</strong>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => (demoStep ? exitDemo() : setOpen(false))}
              aria-label={demoStep ? "Exit guided demo" : "Close guide"}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          {showPartnerTourOffer ? (
            <>
              <p className="guide-step-label">Partner View</p>
              <h2 className="guide-demo-title">Tour Partner Intelligence</h2>
              <p className="guide-subhead">
                Take a short walkthrough of repair demand, cases, unmet needs, programs, and the
                Overflow Network.
              </p>
              <button
                type="button"
                className="guide-demo-button"
                onClick={() => startGuideDemo("partner")}
              >
                Start Tour
              </button>
            </>
          ) : demoStep ? (
            <>
              <p className="guide-step-label">
                Step {demoStep.step} of {demoStep.total}
              </p>
              <h2 className="guide-demo-title">{demoStep.title}</h2>
              <p className="guide-subhead">{demoStep.intro}</p>
              {demoStep.showSelector && (
                <button
                  type="button"
                  className="guide-demo-button"
                  onClick={() => showTarget(demoStep.showSelector)}
                >
                  Show Me Where
                </button>
              )}
              <div className="guide-demo-actions">
                {demoStep.step > 1 && !demoStep.completeLabel && (
                  <button type="button" onClick={() => moveDemo("back")}>
                    Back
                  </button>
                )}
                {!demoStep.completeLabel ? (
                  <button type="button" onClick={() => moveDemo("next")}>
                    Next
                  </button>
                ) : (
                  <>
                    {demoStep.step > 1 && (
                      <button type="button" onClick={() => moveDemo("back")}>
                        Back
                      </button>
                    )}
                    <button type="button" onClick={exitDemo}>
                      {demoStep.completeLabel}
                    </button>
                    {demoStep.alternateActionLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          exitDemo();
                          setStartPartnerOnArrival(true);
                          void navigate({ to: "/partner" });
                        }}
                      >
                        {demoStep.alternateActionLabel}
                      </button>
                    )}
                  </>
                )}
              </div>
              {!demoStep.completeLabel && (
                <button type="button" className="guide-exit" onClick={exitDemo}>
                  Exit Demo
                </button>
              )}
            </>
          ) : (
            <>
              <p className="guide-subhead">I can walk you through this page.</p>
              <div className="guide-actions">
                <button
                  type="button"
                  onClick={() => setAnswer(`Your next step: ${content.nextStep}`)}
                >
                  What do I do next?
                </button>
                <button type="button" onClick={() => setAnswer(content.whyAsk)}>
                  Why are you asking this?
                </button>
                <button type="button" onClick={() => showTarget(content.showSelector)}>
                  Show me where to click.
                </button>
                <button type="button" onClick={() => setAnswer(content.simpleWords)}>
                  Explain this in simpler words.
                </button>
                <button type="button" onClick={readPage}>
                  Read this page to me.
                </button>
              </div>
              <button type="button" className="guide-read" onClick={readPage}>
                <Volume2 aria-hidden="true" />
                Read This Page
              </button>
            </>
          )}
          {answer && (
            <p className="guide-answer" role="status" aria-live="polite">
              {answer}
            </p>
          )}
        </aside>
      )}
    </>
  );
}
