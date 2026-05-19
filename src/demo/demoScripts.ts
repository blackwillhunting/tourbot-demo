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
  | { action: "carryout-panel-command"; command: "snapshot" | "scroll-bottom" | "scroll-top" | "open-review" | "jump-last-pending" | "confirm-ready"; target?: DemoPointerTarget; delayMs?: number; targetWaitMs?: number; hoverMs?: number; pulseMs?: number; requireSuccess?: boolean }
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

function usesMobileDemoEnding(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 640px)").matches
  );
}

function createGuidedCommerceBookingHandoffSteps({
  includeFinalCallout = true,
}: {
  includeFinalCallout?: boolean;
} = {}): DemoStep[] {
  const steps: DemoStep[] = [
    {
      action: "click-dom-target",
      target: "[data-demo-target='guide-checkout-continue']",
      hoverMs: 800,
      pulseMs: 650,
      delayMs: 3000,
      targetWaitMs: 6000,
    },
    { action: "wait", delayMs: 1200 },
  ];

  if (includeFinalCallout) {
    steps.push({
      action: "callout",
      eyebrow: "Prefilled link",
      title: "What is being handed off",
      body: "The room, travel dates, guest count, and selected add-ons are now staged for booking. The visitor keeps momentum instead of starting over in a blank form.",
      buttonLabel: "Finish demo",
      placement: "left",
    });
  }

  if (!usesMobileDemoEnding()) {
    steps.push({
      action: "click-target",
      target: "[data-demo-target='guide-minimize']",
      command: "minimize",
      hoverMs: 800,
      pulseMs: 650,
      delayMs: includeFinalCallout ? 1400 : 1800,
      targetWaitMs: 3600,
    });
  }

  return steps;
}

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
      eyebrow: "Background",
      title: "What kind of site this is",
      body: "This is a 1,000+ room hotel resort with many room types, view tiers, towers, and add-ons.",
      buttonLabel: "Continue",
      placement: "left",
      emphasis: "green-flash",
    },
    {
      action: "callout",
      eyebrow: "Kickoff",
      title: "What you are about to see",
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
    { action: "wait-for-response", delayMs: 5000, timeoutMs: 35000 },
    {
      action: "callout",
      eyebrow: "Ranked option",
      title: "What just happened",
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
      delayMs: 5000,
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

    // Move to the package step, then ask TourBot to prepare the booking handoff.
    { action: "click-target", target: "[data-demo-target='guide-next']", command: "next", hoverMs: 650, pulseMs: 560, delayMs: 9000, targetWaitMs: 3600 },
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "Book this stay.",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 3000, timeoutMs: 35000 },

    // Continue through TourBot's checkout gate, pause for the booking handoff,
    // then minimize TourBot on desktop only. On phones, Continue already
    // closes/minimizes the shell, so the final minimize click is skipped.
    ...createGuidedCommerceBookingHandoffSteps(),
  ],
};

export const guidedCommerceAssistedCompletionDemo: DemoScript = {
  id: "guided-commerce-assisted-completion",
  label: "Guided Commerce · Assisted Completion",
  description:
    "Shows a judgement-safe assisted completion path: range comparison, date and guest selectors, budgeted add-on reasoning, and booking handoff.",
  defaultCharDelayMs: 30,
  steps: [
    {
      action: "callout",
      eyebrow: "Background",
      title: "What kind of site this is",
      body: "This is a 1,000+ room hotel resort with many room types, view tiers, towers, and add-ons.",
      buttonLabel: "Continue",
      placement: "left",
      emphasis: "green-flash",
    },
    {
      action: "callout",
      eyebrow: "Assisted completion",
      title: "What you are about to see",
      body: "A guest starts with incomplete request, and TourBot gathers data, applies contraints and tours focus areas.",
      buttonLabel: "Start demo",
      placement: "left",
    },

    // Start from the minimized launcher and activate TourBot.
    { action: "click-target", target: "[data-demo-target='guide-launcher']", command: "open", hoverMs: 800, pulseMs: 650, delayMs: 1100, targetWaitMs: 3600 },

    // 1) Deterministic range request: cheapest and most expensive are stable anchors,
    // but the script remains safe by stepping through whatever TourBot returns.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "I'm planning a stay. Show me your cheapest room and your most expensive room.",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 3000, timeoutMs: 35000 },

    {
      action: "callout",
      eyebrow: "Guided inputs",
      title: "Missing details become selectors",
      body: "Instead of forcing the guest to type every field, TourBot can open the right site controls at the right time: dates, guests, and booking constraints.",
      buttonLabel: "Continue",
      placement: "left",
    },

    // Complete missing booking context through selectors. The date chip opens the
    // check-in calendar automatically on July 2026 with no dates preselected,
    // so the script goes straight to the day.
    // The chip selector accepts both likely labels to stay safe if the backend
    // says "Select dates" or "Set dates".
{ action: "click-dom-target", target: "[data-demo-target='chip-select-dates'], [data-demo-target='chip-set-dates']", hoverMs: 250, pulseMs: 220, delayMs: 0, targetWaitMs: 1500 },
{ action: "click-dom-target", target: "[data-demo-target='calendar-check-in-2026-07-10'], [data-demo-date='2026-07-10']", hoverMs: 450, pulseMs: 420, delayMs: 500, targetWaitMs: 6000 },
    { action: "click-dom-target", target: "[data-demo-target='date-check-out-expand']", hoverMs: 700, pulseMs: 600, delayMs: 1400, targetWaitMs: 5200 },
    { action: "click-dom-target", target: "[data-demo-target='calendar-check-out-2026-07-14'], [data-demo-date='2026-07-14']", hoverMs: 700, pulseMs: 600, delayMs: 1600, targetWaitMs: 6000 },
    { action: "click-dom-target", target: "[data-demo-target='apply-dates']", hoverMs: 700, pulseMs: 600, delayMs: 1800, targetWaitMs: 4200 },

{ action: "click-dom-target", target: "[data-demo-target='chip-add-guests']", hoverMs: 250, pulseMs: 220, delayMs: 0, targetWaitMs: 1500 },
{ action: "click-dom-target", target: "[data-demo-target='guest-adults-plus']", hoverMs: 420, pulseMs: 380, delayMs: 450, targetWaitMs: 3200 },
    { action: "click-dom-target", target: "[data-demo-target='guest-children-plus']", hoverMs: 650, pulseMs: 520, delayMs: 1300, targetWaitMs: 3200 },
    { action: "click-dom-target", target: "[data-demo-target='apply-guests']", hoverMs: 700, pulseMs: 600, delayMs: 1800, targetWaitMs: 3200 },

    // Applying guests resumes the pending booking prompt automatically, so no
    // separate submit click is needed here.
    { action: "wait-for-response", delayMs: 5200, timeoutMs: 35000 },

    // Step through any returned options. This stays in sync even if the model
    // chooses a slightly different set of rooms.
    { action: "click-through-guide-steps", target: "[data-demo-target='guide-next']", hoverMs: 650, pulseMs: 560, betweenClicksMs: 5600, targetWaitMs: 3600, maxClicks: 6 },

    // 2) Constraint + add-on composition. The room/add-on choices may vary, but
    // the script only relies on TourBot controls and the returned guide steps.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "I don't want the room to cost more than $350/night. What's the cheapest way to include parking?",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 6500, timeoutMs: 35000 },
    { action: "click-through-guide-steps", target: "[data-demo-target='guide-next']", hoverMs: 650, pulseMs: 560, betweenClicksMs: 5600, targetWaitMs: 3600, maxClicks: 5 },

    // 3) Natural booking intent. Backend safely interprets this as a booking
    // handoff setup, not a live reservation or payment.
    { action: "move-pointer", target: "[data-demo-target='guide-textarea']", delayMs: 900 },
    {
      action: "type-prompt",
      prompt: "Reserve this.",
      delayMs: 900,
    },
    { action: "click-target", target: "[data-demo-target='guide-submit']", command: "submit", hoverMs: 500, pulseMs: 620, delayMs: 1100, targetWaitMs: 2600 },
    { action: "wait-for-response", delayMs: 3600, timeoutMs: 35000 },

    // Continue through TourBot's checkout gate. This variant intentionally skips
    // the final handoff pause card because the demo has already explained the setup.
    ...createGuidedCommerceBookingHandoffSteps({ includeFinalCallout: false }),
  ],
};

export const guidedCommerceDemo = guidedCommerceRichIntentDemo;


function carryoutQualifierChip(
  qualifierId: string,
  value: string,
  delayMs = 650,
  stepIndex?: number,
): DemoStep {
  const genericTarget = `[data-demo-target='guide-carryout-qualifier-${qualifierId}-${value}']`;
  const mobileCurrentTarget =
    typeof stepIndex === "number"
      ? `[data-demo-surface='mobile-carryout-qualifier-sheet'][data-demo-step-index='${stepIndex}'] [data-demo-current-qualifier='${qualifierId}-${value}']`
      : `[data-demo-surface='mobile-carryout-qualifier-sheet'] [data-demo-current-qualifier='${qualifierId}-${value}']`;

  return {
    action: "click-dom-target",
    target: usesMobileDemoEnding() ? mobileCurrentTarget : genericTarget,
    hoverMs: 520,
    pulseMs: 420,
    delayMs,
    targetWaitMs: 6000,
  };
}

function carryoutNext(delayMs = 850): DemoStep {
  return {
    action: "click-target",
    target: "[data-demo-target='guide-next']",
    command: "next",
    hoverMs: 520,
    pulseMs: 420,
    delayMs,
    targetWaitMs: 3600,
  };
}

function carryoutDeterministicQualifierSteps(): DemoStep[] {
  return [
    // Classic Burger Combo #1
    carryoutQualifierChip("side-size", "large", 650, 0),
    carryoutQualifierChip("drink-size", "large", 650, 0),
    carryoutQualifierChip("soda-flavor", "coke", 850, 0),
    carryoutNext(1000),

    // Classic Burger Combo #2
    carryoutQualifierChip("side-size", "medium", 650, 1),
    carryoutQualifierChip("drink-size", "large", 650, 1),
    carryoutQualifierChip("soda-flavor", "diet-coke", 850, 1),
    carryoutNext(4000),

    // Standalone burger has no required choices.
    carryoutNext(3000),

    // Onion rings
    carryoutQualifierChip("side-size", "large", 850, 3),
    carryoutNext(4000),

    // Extra soda #3
    carryoutQualifierChip("drink-size", "large", 650, 4),
    carryoutQualifierChip("soda-flavor", "sprite", 850, 4),
    carryoutNext(1000),

    // Extra soda #4 — medium to show the demo can change a size.
    carryoutQualifierChip("drink-size", "medium", 650, 5),
    carryoutQualifierChip("soda-flavor", "root-beer", 850, 5),
    carryoutNext(1000),

    // Iced tea
    carryoutQualifierChip("drink-size", "large", 650, 6),
    carryoutQualifierChip("tea-sweetness", "sweet", 1100, 6),
  ];
}

export const guidedCarryoutPanelDemo: DemoScript = {
  id: "guided-carryout-natural-language-ordering",
  label: "Natural Language Carryout",
  description:
    "Shows a messy BurgerRush carryout order becoming a structured cart with combo logic, clickable choice labels, missing-detail cleanup, and checkout handoff.",
  defaultCharDelayMs: 22,
  steps: [
    {
      action: "callout",
      eyebrow: "BurgerRush Carryout",
      title: "A standard food stop",
      body: "A stand-in for any restaurant that supports carryout ordering.",
      buttonLabel: "Continue",
      placement: "left",
      emphasis: "green-flash",
    },
    {
      action: "callout",
      eyebrow: "What you'll see",
      title: "Messy order → guided cart",
      body: "TourBot reads plain English, responds with navigation, and action tiles.",
      buttonLabel: "Start demo",
      placement: "left",
    },
    {
      action: "click-target",
      target: "[data-demo-target='guide-launcher']",
      command: "open",
      hoverMs: 800,
      pulseMs: 650,
      delayMs: 900,
      targetWaitMs: 3600,
    },
    {
      action: "move-pointer",
      target: "[data-demo-target='guide-textarea']",
      delayMs: 650,
      targetWaitMs: 3600,
    },
    {
      action: "type-prompt",
      prompt: "i want 3 burgers, 2 fries, some onion rings, 4 large sodas, 1 ice tea, and a milkshake",
      delayMs: 650,
    },
    {
      action: "click-target",
      target: "[data-demo-target='guide-submit']",
      command: "submit",
      hoverMs: 500,
      pulseMs: 620,
      delayMs: 900,
      targetWaitMs: 2600,
    },
    { action: "wait-for-response", delayMs: 3200, timeoutMs: 45000 },
    {
      action: "callout",
      eyebrow: "Order understood",
      title: "TourBot turned intent into structure",
      body: "TourBot applied 2 combos the user missed.",
      buttonLabel: "Choose options",
      placement: "left",
    },
    ...carryoutDeterministicQualifierSteps(),
    {
      action: "callout",
      eyebrow: "Cart review",
      title: "One missing detail remains",
      body: "Review the order when ready → unfinished items are refocused on selection.",
      buttonLabel: "Show cart",
      placement: "left",
    },
    {
      action: "move-pointer",
      target: "[data-demo-target='guide-textarea']",
      delayMs: 650,
      targetWaitMs: 3600,
    },
    { action: "type-prompt", prompt: "show cart", delayMs: 500 },
    {
      action: "click-target",
      target: "[data-demo-target='guide-submit']",
      command: "submit",
      hoverMs: 500,
      pulseMs: 620,
      delayMs: 900,
      targetWaitMs: 2600,
    },
    { action: "wait-for-response", delayMs: 1800, timeoutMs: 35000 },
    {
      action: "click-dom-target",
      target: "[data-demo-target='guide-carryout-scroll-bottom-hit']",
      hoverMs: 900,
      pulseMs: 650,
      delayMs: 1500,
      targetWaitMs: 8000,
    },
    {
      action: "click-dom-target",
      target: "[data-demo-target='guide-carryout-scroll-top-hit']",
      hoverMs: 900,
      pulseMs: 650,
      delayMs: 1500,
      targetWaitMs: 8000,
    },
    {
      action: "click-dom-target",
      target: "[data-demo-target='guide-carryout-pending-line'][data-demo-pending-last='true']",
      hoverMs: 900,
      pulseMs: 650,
      delayMs: 1800,
      targetWaitMs: 8000,
    },
    { action: "wait", delayMs: 1000 },

    // Finish the last pending milkshake item.
    carryoutQualifierChip("shake-flavor", "vanilla", 900, 7),

    // Ask TourBot to open the checkout/review state.
    {
      action: "move-pointer",
      target: "[data-demo-target='guide-textarea']",
      delayMs: 900,
      targetWaitMs: 3600,
    },
    { action: "type-prompt", prompt: "ok checkout", delayMs: 650 },
    {
      action: "click-target",
      target: "[data-demo-target='guide-submit']",
      command: "submit",
      hoverMs: 500,
      pulseMs: 620,
      delayMs: 900,
      targetWaitMs: 2600,
    },
    { action: "wait-for-response", delayMs: 2200, timeoutMs: 35000 },

    // Scroll the review panel to the bottom, then complete the demo handoff.
    {
      action: "click-dom-target",
      target: "[data-demo-target='guide-carryout-scroll-bottom-hit']",
      hoverMs: 900,
      pulseMs: 650,
      delayMs: 1500,
      targetWaitMs: 8000,
    },
    {
      action: "click-dom-target",
      target: "[data-demo-target='guide-carryout-checkout']",
      hoverMs: 900,
      pulseMs: 650,
      delayMs: 1800,
      targetWaitMs: 8000,
    },
  ],
};


export const demoScripts = [
  guidedDiscoveryDemo,
  guidedCommerceRichIntentDemo,
  guidedCommerceAssistedCompletionDemo,
];
