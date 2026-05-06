export type DemoPointerTarget =
  | string
  | { x: number; y: number; label?: string };

export type DemoClickCommand = "open" | "submit" | "next" | "got-it" | "minimize" | "book";

export type DemoStep =
  | { action: "wait"; delayMs: number }
  | { action: "wait-for-response"; delayMs?: number; timeoutMs?: number }
  | { action: "move-pointer"; target: DemoPointerTarget; delayMs?: number; targetWaitMs?: number }
  | { action: "click-target"; target: DemoPointerTarget; command: DemoClickCommand; delayMs?: number; targetWaitMs?: number; hoverMs?: number; pulseMs?: number }
  | { action: "click-dom-target"; target: DemoPointerTarget; delayMs?: number; targetWaitMs?: number; hoverMs?: number; pulseMs?: number }
  | { action: "set-input-value"; target: DemoPointerTarget; value: string; delayMs?: number; targetWaitMs?: number; hoverMs?: number; pulseMs?: number }
  | { action: "click-through-guide-steps"; target?: DemoPointerTarget; delayMs?: number; targetWaitMs?: number; hoverMs?: number; pulseMs?: number; betweenClicksMs?: number; maxClicks?: number }
  | { action: "open-shell"; delayMs?: number }
  | { action: "type-prompt"; prompt: string; delayMs?: number; charDelayMs?: number }
  | { action: "submit"; delayMs?: number }
  | { action: "next"; delayMs?: number }
  | { action: "got-it"; delayMs?: number }
  | { action: "minimize"; delayMs?: number };

export type DemoScript = {
  id: string;
  label: string;
  description: string;
  defaultCharDelayMs?: number;
  steps: DemoStep[];
};

export const guidedDiscoveryDemo: DemoScript = {
  id: "guided-discovery-assisted-learning",
  label: "Assisted Learning",
  description:
    "Shows no-nav answer, single-destination spotlight, and multi-step guided navigation.",
  defaultCharDelayMs: 34,
  steps: [
    { action: "click-target", target: "[data-demo-target='guide-open']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

    // 1) No-navigation response.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    { action: "type-prompt", prompt: "Give me a quick one-sentence overview of this site.", delayMs: 900 },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2700, timeoutMs: 35000 },

    // 2) Single destination: DORA/regulatory colored block. Move pointer away so shell minimizes.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    { action: "type-prompt", prompt: "Do you cover DORA regulations?", delayMs: 900 },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2700, timeoutMs: 35000 },
    { action: "move-pointer", target: { x: 130, y: 220, label: "page canvas" }, delayMs: 2200 },
    { action: "minimize", delayMs: 950 },

    // 3) Multi-step: varied cybersecurity blocks. Reopen from the visible launcher,
    // then step through, clear the spotlight, and minimize at the end.
    { action: "click-target", target: "[data-demo-target='guide-launcher']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1200, targetWaitMs: 3600 },
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    { action: "type-prompt", prompt: "Walk me through your cybersecurity services.", delayMs: 900 },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2700, timeoutMs: 35000 },
    { action: "wait", delayMs: 2400 },
    { action: "click-through-guide-steps", target: "[data-demo-target='guide-next']", hoverMs: 650, pulseMs: 560, betweenClicksMs: 5600, targetWaitMs: 3600, maxClicks: 6 },
    { action: "click-target", target: "[data-demo-target='guide-got-it']", command: "got-it", hoverMs: 800, pulseMs: 650, delayMs: 1400, targetWaitMs: 3600 },
    { action: "click-target", target: "[data-demo-target='guide-minimize']", command: "minimize", hoverMs: 800, pulseMs: 650, delayMs: 1400, targetWaitMs: 3600 },
  ],
};

export const guidedCommerceRichIntentDemo: DemoScript = {
  id: "guided-commerce-rich-intent",
  label: "Guided Commerce · Rich Intent",
  description:
    "Shows a high-context booking request: natural-language extraction, recommendation steps, and booking-summary preload.",
  defaultCharDelayMs: 30,
  steps: [
    { action: "click-target", target: "[data-demo-target='guide-open']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "I'm traveling from May 8 thru May 12 and need a simple room with breakfast, just me traveling",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2800, timeoutMs: 35000 },

    // First result should navigate immediately. Now show that a passive
    // completion/refinement chip can change the recommendation path.
    { action: "click-dom-target", target: "[data-demo-target='chip-set-budget']", hoverMs: 650, pulseMs: 560, delayMs: 1600, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='budget-luxury']", hoverMs: 650, pulseMs: 560, delayMs: 1350, targetWaitMs: 4200 },

    // Budget selection preloads the composer. Submit it to refresh the guide
    // recommendation using the retained travel context plus the Luxury signal.
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2800, timeoutMs: 35000 },
    { action: "wait", delayMs: 2400 },

    // Step through the upgraded room/package path, then book it.
    { action: "click-through-guide-steps", target: "[data-demo-target='guide-next']", hoverMs: 650, pulseMs: 560, betweenClicksMs: 5800, targetWaitMs: 3600, maxClicks: 4 },

    // Book from the current guide path. GuideShellStatic resolves this to the
    // current room step, or the first room step if the current step is a package.
    { action: "click-target", target: "[data-demo-target='guide-book']", command: "book", hoverMs: 800, pulseMs: 650, delayMs: 1600, targetWaitMs: 3600 },

    // Move the pointer away so the booking summary handoff is visible, then
    // explicitly minimize the shell. The fake pointer does not fire real
    // mouseleave events, so relying on hover timeout will not close the shell.
    { action: "move-pointer", target: { x: 120, y: 240, label: "booking preloaded" }, delayMs: 4400 },
    { action: "minimize", delayMs: 1400 },
  ],
};

export const guidedCommerceAssistedCompletionDemo: DemoScript = {
  id: "guided-commerce-assisted-completion",
  label: "Guided Commerce · Assisted Completion",
  description:
    "Shows a sparse booking request: the guide recommends options and exposes passive completion chips for missing booking details.",
  defaultCharDelayMs: 30,
  steps: [
    { action: "click-target", target: "[data-demo-target='guide-open']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "I need a nice room with a view and breakfast, but not too expensive.",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2800, timeoutMs: 35000 },

    // Complete missing booking context through passive chips.
    { action: "click-dom-target", target: "[data-demo-target='chip-select-dates']", hoverMs: 700, pulseMs: 600, delayMs: 1500, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='date-check-in-expand']", hoverMs: 700, pulseMs: 600, delayMs: 1400, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='calendar-check-in-2026-07-10']", hoverMs: 700, pulseMs: 600, delayMs: 1500, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='date-check-out-expand']", hoverMs: 700, pulseMs: 600, delayMs: 1400, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='calendar-check-out-2026-07-14']", hoverMs: 700, pulseMs: 600, delayMs: 1600, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='apply-dates']", hoverMs: 700, pulseMs: 600, delayMs: 1800, targetWaitMs: 3200 },

    { action: "click-dom-target", target: "[data-demo-target='chip-add-guests']", hoverMs: 700, pulseMs: 600, delayMs: 1500, targetWaitMs: 4200 },
    { action: "click-dom-target", target: "[data-demo-target='guest-adults-plus']", hoverMs: 650, pulseMs: 520, delayMs: 1200, targetWaitMs: 3200 },
    { action: "click-dom-target", target: "[data-demo-target='guest-children-plus']", hoverMs: 650, pulseMs: 520, delayMs: 1300, targetWaitMs: 3200 },
    { action: "click-dom-target", target: "[data-demo-target='apply-guests']", hoverMs: 700, pulseMs: 600, delayMs: 1800, targetWaitMs: 3200 },

    // Dates and guests append into the composer. Submit once to refresh the path.
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2800, timeoutMs: 35000 },
    { action: "wait", delayMs: 2400 },

    // Step through any returned recommendations, book the best fit, then clear the shell.
    { action: "click-through-guide-steps", target: "[data-demo-target='guide-next']", hoverMs: 650, pulseMs: 560, betweenClicksMs: 5800, targetWaitMs: 3600, maxClicks: 4 },
    { action: "click-target", target: "[data-demo-target='guide-book']", command: "book", hoverMs: 800, pulseMs: 650, delayMs: 1600, targetWaitMs: 3600 },
    { action: "move-pointer", target: { x: 120, y: 240, label: "booking preloaded" }, delayMs: 4400 },
    { action: "minimize", delayMs: 1400 },
  ],
};

export const guidedCommerceDemo = guidedCommerceRichIntentDemo;

export const demoScripts = [
  guidedDiscoveryDemo,
  guidedCommerceRichIntentDemo,
  guidedCommerceAssistedCompletionDemo,
];
