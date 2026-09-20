import { useRouterState } from "@tanstack/react-router";
import { Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";

type GuidePageContent = {
  title: string;
  intro: string;
  nextStep: string;
  whyAsk: string;
  simpleWords: string;
  readAloud: string;
  showSelector: string;
};

const guideContent: Record<string, GuidePageContent> = {
  "/intake": {
    title: "Let's complete your repair report",
    intro:
      "We’re collecting basic information about your home so HomeFix can look for repair programs that may fit your situation.",
    nextStep: "Enter your Detroit address.",
    whyAsk:
      "We use your home and household information to match your repair needs to programs with clear eligibility rules.",
    simpleWords: "Tell us what is wrong, where you live, and who lives with you. We use that to find help.",
    readAloud:
      "This intake page collects your address, household details, and repair notes so HomeFix can build your Repair Passport.",
    showSelector: "[data-guide-target='intake-address']",
  },
  "/assessment": {
    title: "Let's review what HomeFix noticed",
    intro: "This page summarizes preliminary findings from your repair report and photos.",
    nextStep: "Review the preliminary repair assessment.",
    whyAsk:
      "The assessment helps prioritize safety, identify follow-up questions, and prepare your case for matching.",
    simpleWords: "This is a first review of your repair issue. Check what looks right and what needs updates.",
    readAloud:
      "Assessment shows likely issue type, urgency, and recommended next steps before final matching.",
    showSelector: "[data-guide-target='assessment-next']",
  },
  "/passport": {
    title: "This is your Repair Passport",
    intro: "Your Repair Passport keeps your home profile, documents, repair needs, and status in one place.",
    nextStep: "Check that your home and household information is correct.",
    whyAsk: "Accurate passport details help partners process your case faster and reduce repeat paperwork.",
    simpleWords:
      "Think of this as your repair folder. Make sure your details are correct before moving forward.",
    readAloud:
      "Passport combines case details, documents, and repair priorities so you can continue to coverage planning.",
    showSelector: "[data-guide-target='passport-next']",
  },
  "/coverage": {
    title: "Let's review your repair coverage",
    intro: "This page shows which repair needs may have a resource available.",
    nextStep: "Look for items marked Verification Needed or Funding Gap.",
    whyAsk:
      "Coverage status helps you focus on missing documents, verification checks, and repairs that still need funding.",
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
  readAloud: "This page is part of your HomeFix repair workflow. Follow the main action to continue.",
  showSelector: "main a, main button",
};

function resolveGuide(pathname: string) {
  if (guideContent[pathname]) return guideContent[pathname];
  if (pathname.startsWith("/programs/")) return guideContent["/coverage"];
  return fallbackContent;
}

export function HomeFixGuide() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const content = useMemo(() => resolveGuide(path), [path]);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");

  const showTarget = () => {
    const target = document.querySelector<HTMLElement>(content.showSelector);
    if (!target) {
      setAnswer("I couldn't find that control on this screen. Try scrolling a little and ask again.");
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("guide-highlight");
    window.setTimeout(() => target.classList.remove("guide-highlight"), 1800);
    setAnswer("I highlighted the next place to click.");
  };

  const readPage = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${content.title}. ${content.intro} Your next step: ${content.nextStep}. ${content.readAloud}`,
    );
    window.speechSynthesis.speak(utterance);
    setAnswer("Reading this page to you now.");
  };

  return (
    <>
      <button type="button" className="guide-toggle" onClick={() => setOpen((v) => !v)}>
        Need Help?
      </button>
      {open && (
        <aside className="guide-panel" role="dialog" aria-label="HomeFix Guide">
          <div className="guide-header">
            <strong>Hi, I’m the HomeFix Guide.</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close guide">
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="guide-subhead">I can walk you through this page.</p>
          <div className="guide-actions">
            <button type="button" onClick={() => setAnswer(`Your next step: ${content.nextStep}`)}>
              What do I do next?
            </button>
            <button type="button" onClick={() => setAnswer(content.whyAsk)}>
              Why are you asking this?
            </button>
            <button type="button" onClick={showTarget}>
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
          {answer && <p className="guide-answer">{answer}</p>}
        </aside>
      )}
    </>
  );
}
