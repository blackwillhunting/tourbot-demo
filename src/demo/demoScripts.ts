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
  | { action: "click-next-back-if-multistep"; nextTarget?: DemoPointerTarget; backTarget?: DemoPointerTarget; delayMs?: number; targetWaitMs?: number; hoverMs?: number; pulseMs?: number; betweenClicksMs?: number; minStepCount?: number }
  | { action: "callout"; eyebrow?: string; title: string; body: string; buttonLabel?: string; placement?: "left" | "center" | "bottom"; emphasis?: "green-flash"; delayMs?: number }
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
    { action: "click-target", target: "[data-demo-target='guide-launcher']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

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
  label: "Natural Language Booking",
  description:
    "Shows a natural-language booking path: room preference, view refinement, breakfast add-on, and booking-summary handoff.",
  defaultCharDelayMs: 30,
  steps: [
    {
      action: "callout",
      eyebrow: "Demo site context",
      title: "Complex hotel resort",
      body: "Domi Coast is a 1,000+ room hotel resort with many room types, view tiers, towers, and add-ons.",
      buttonLabel: "Continue",
      placement: "left",
      emphasis: "green-flash",
    },
    {
      action: "callout",
      eyebrow: "Natural Language Booking",
      title: "Conversational booking",
      body: "A guest describes the stay, and TourBot extracts key details, optimizes fit, and tours focus areas.",
      buttonLabel: "Start demo",
      placement: "left",
    },

    // Start from the minimized launcher and activate TourBot.
    { action: "click-target", target: "[data-demo-target='guide-launcher']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

    // 1) Natural language stay request: dates, view preference, budget sensitivity, solo traveler.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "travelling June 12th thru June 19th, want a room with a good view, not too pricey, just me staying",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 2800, timeoutMs: 35000 },
    {
      action: "callout",
      eyebrow: "Ranked recommendation",
      title: "TourBot optimizes and auto-scrolls",
      body: "TourBot detected key travel details and turned stray needs into a specific stay option.",
      buttonLabel: "Continue demo",
      placement: "left",
    },

    // 2) Refine the recommendation with a natural follow-up.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "show rooms with better views",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 9000, timeoutMs: 35000 },

    // If the view-refinement response returns multiple room steps, show Next/Back.
    // If it returns only one room, skip this beat and continue to breakfast.
    {
      action: "click-next-back-if-multistep",
      nextTarget: "[data-demo-target='guide-next']",
      backTarget: "[data-demo-target='guide-back']",
      hoverMs: 650,
      pulseMs: 560,
      betweenClicksMs: 9000,
      delayMs: 900,
      targetWaitMs: 3600,
    },

    // 3) Add breakfast as another natural-language follow-up.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "add breakfast",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 5000, timeoutMs: 35000 },

    // Move to the package step, then book the composed stay.
    { action: "click-target", target: "[data-demo-target='guide-next']", command: "next", hoverMs: 650, pulseMs: 560, delayMs: 9000, targetWaitMs: 3600 },
    { action: "click-target", target: "[data-demo-target='guide-book']", command: "book", hoverMs: 800, pulseMs: 650, delayMs: 3000, targetWaitMs: 3600 },

    // Continue through TourBot's checkout gate, pause for the booking handoff, then minimize TourBot.
    { action: "click-dom-target", target: "[data-demo-target='guide-checkout-continue']", hoverMs: 800, pulseMs: 650, delayMs: 3000, targetWaitMs: 6000 },
    { action: "wait", delayMs: 1200 },
    {
      action: "callout",
      eyebrow: "Booking handoff",
      title: "Known context carries forward.",
      body: "The room, travel dates, guest count, and breakfast package are now staged for booking. The visitor keeps momentum instead of starting over in a blank form.",
      buttonLabel: "Finish demo",
      placement: "left",
    },
    { action: "click-target", target: "[data-demo-target='guide-minimize']", command: "minimize", hoverMs: 800, pulseMs: 650, delayMs: 1400, targetWaitMs: 3600 },
  ],
};

export const guidedCommerceAssistedCompletionDemo: DemoScript = {
  id: "guided-commerce-assisted-completion",
  label: "Guided Commerce · Assisted Completion",
  description:
    "Shows a sparse booking request: TourBot softly obtains missing data and hardens loose travel plans into solid options.",
  defaultCharDelayMs: 30,
  steps: [
    // Start from the minimized launcher and activate TourBot.
    { action: "click-target", target: "[data-demo-target='guide-launcher']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

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
