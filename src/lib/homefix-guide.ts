const guideStartEvent = "homefix-guide:start";

export function startGuideDemo(tour: "resident" | "partner") {
  window.dispatchEvent(new CustomEvent(guideStartEvent, { detail: { tour } }));
}
