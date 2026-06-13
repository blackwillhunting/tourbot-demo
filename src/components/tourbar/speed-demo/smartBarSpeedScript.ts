import type { TourBarBookingContext, TourBarRequiredBookingField } from "../tourbarBookingContext";
import type { SmartBarFlashCardCascadeMode, SmartBarFlashCardDensity } from "./SmartBarFlashCardRail";

export type SmartBarSpeedSurface = "info" | "ordering" | "booking" | "finale";

export type SmartBarSpeedCardItem =
  | string
  | {
      title: string;
      detail?: string;
      density?: SmartBarFlashCardDensity;
      holdMs?: number;
    };


export type SmartBarSpeedCommand =
  | { kind: "shell"; type: "open" | "closeBar" | "closeSheet" | "closeChat" | "clearChat" | "closeAll" | "runNextMove" | "openChat"; delayMs?: number; settleMs?: number }
  | { kind: "typePrimary"; value: string; delayMs?: number }
  | { kind: "submitPrimary"; value?: string; delayMs?: number }
  | { kind: "typeFollowUp"; value: string; delayMs?: number }
  | { kind: "typeInput"; targetSelector: string; value: string; clearFirst?: boolean; delayMs?: number }
  | { kind: "submitFollowUp"; value?: string; delayMs?: number }
  | { kind: "openBookingContext"; field: TourBarRequiredBookingField; delayMs?: number; settleMs?: number }
  | { kind: "setBookingContext"; bookingContext: TourBarBookingContext; delayMs?: number }
  | { kind: "selectBookingDate"; dateKind: "check-in" | "check-out"; value: string; delayMs?: number }
  | { kind: "setBookingGuestCount"; adults: number; children: number; delayMs?: number }
  | { kind: "commitBookingContext"; field: TourBarRequiredBookingField; delayMs?: number }
  | { kind: "showFixture"; value: string; delayMs?: number; thinkingMs?: number; thinkingMessage?: string; settleMs?: number }
  | {
      kind: "cards";
      cards: SmartBarSpeedCardItem[];
      mode?: SmartBarFlashCardCascadeMode;
      density?: SmartBarFlashCardDensity;
      holdMs?: number;
      finalHoldMs?: number;
      delayMs?: number;
    }
  | {
      kind: "pointerClick";
      targetId?: string;
      targetSelector?: string;
      label?: string;
      click?: boolean;
      delayMs?: number;
      aimMs?: number;
      pulseMs?: number;
      exitMs?: number;
      anchorX?: number;
      anchorY?: number;
      offsetX?: number;
      offsetY?: number;
    }
  | {
      kind: "checkoutThinkingOverlay";
      targetSelector: string;
      message?: string;
      durationMs?: number;
      clickAfter?: boolean;
      delayMs?: number;
    }
  | {
      kind: "focusTarget";
      targetId: string;
      label?: string;
      delayMs?: number;
      initialDelayMs?: number;
      overlayDurationMs?: number;
      attempts?: number;
    }
  | { kind: "typeChat"; value: string; delayMs?: number }
  | { kind: "submitChat"; value?: string; delayMs?: number }
  | { kind: "pause"; delayMs: number };

export type SmartBarSpeedStep = {
  id: string;
  chapter: string;
  label: string;
  helper: string;
  surface: SmartBarSpeedSurface;
  commands: SmartBarSpeedCommand[];
};

export const SMARTBAR_SPEED_STEPS: SmartBarSpeedStep[] = [
{
    id: "open",
    chapter: "Launch",
    label: "Open SmartBar",
    helper: "Launcher only.",
    surface: "info",
    commands: [
      { kind: "shell", type: "closeAll", delayMs: 100 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-launcher-hotspot="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "open", delayMs: 180 },
    ],
  },
{
    id: "hedge-fund-ask",
    chapter: "Discovery",
    label: "Long buyer question",
    helper: "Messy prompt a normal site search cannot handle.",
    surface: "info",
    commands: [
      { kind: "typePrimary", value: "we're a hedge fund, need help wih IT and setting up copilots", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1300,
        finalHoldMs: 1800,
        cards: [
          //"Search can't parse this",
          "Navigates the site",
          "Spotlights the relevant section",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 900 },
      { kind: "focusTarget", targetId: "hedgefund-copilot", label: "Copilot journeys", delayMs: 720 },
      { kind: "pause", delayMs: 2000 },
    ],
  },
{
    id: "prove-it",
    chapter: "Discovery",
    label: "Challenge the answer",
    helper: "SmartBar drills into concrete use cases.",
    surface: "info",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 3300,
        finalHoldMs: 1800,
        cards: [
          "Summarizes focus area",
          "Visitor asks for specifics",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-cart-toggle="true"]',
        label: "",
        click: true,
        delayMs: 180,
        pulseMs: 720,
      },
      { kind: "typeFollowUp", value: "that doesn't say what you actually do", delayMs: 1250 },
      { kind: "pause", delayMs: 900 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-followup-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitFollowUp", delayMs: 850 },
      { kind: "pause", delayMs: 700 },
    ],
  },
{
    id: "case-studies",
    chapter: "Discovery",
    label: "Show proof",
    helper: "Case-study sheet.",
    surface: "info",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1800,
        cards: [
          //"SmartBar digs deeper",
          "Surfaces proof points",
          "Offers next step",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-nextmove-query="__case_studies"]',
        label: "",
        click: true,
        delayMs: 250,
        aimMs: 650,
        pulseMs: 2600,
        exitMs: 450,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1800 },
    ],
  },
{
  id: "consultant-chat",
  chapter: "Handoff",
  label: "Contextual handoff",
  helper: "Consultant starts with the visitor’s context.",
  surface: "info",
  commands: [
    { kind: "pause", delayMs: 2000 },
    {
      kind: "pointerClick",
      targetSelector: '[data-smartbar-mobile-cart-toggle="true"]',
      label: "",
      click: true,
      delayMs: 180,
      pulseMs: 720,
    },
    { kind: "typeFollowUp", value: "Perfect, can I talk to someone?", delayMs: 2250 },
    { kind: "pause", delayMs: 1200 },
    {
      kind: "cards",
      mode: "standard",
      density: "normal",
      holdMs: 1000,
      finalHoldMs: 1800,
      cards: [
        "Hands off context",
        "Opens direct chat",
      ],
    },
    {
      kind: "pointerClick",
      targetSelector: '[data-smartbar-followup-submit="true"]',
      label: "",
      delayMs: 250,
      pulseMs: 820,
    },
    { kind: "submitFollowUp", delayMs: 350 },
    { kind: "pause", delayMs: 2600 },
    { kind: "typeChat", value: "Yes — I’d love to hear about pricing!", delayMs: 120 },
    { kind: "submitChat", delayMs: 420 },
    { kind: "pause", delayMs: 3600 },
    { kind: "shell", type: "closeChat", delayMs: 350 },
  ],
},
{
    id: "complete-order",
    chapter: "Ordering",
    label: "Messy order to cart",
    helper: "Cart sheet.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Example 2: **BurgerRush**",
          "Direct ordering site",
          "Turns intent into checkout",
        ],
      },
      { kind: "typePrimary", value: "dbl chzbrger combo lg friez diet coke pie", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          //"Messy food shorthand",
          //"Plain English",
          //"Cart loaded",
          //"then checks totals and modifiers",
          //"Done",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1500 },
    ],
  },
{
    id: "checkout",
    chapter: "Ordering",
    label: "Checkout handoff",
    helper: "Final sheet.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Plain English",
          "Typos included",
          "Cart loaded",
          "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2200 },
      { kind: "pause", delayMs: 900 },
    ],
  },
{
    id: "incomplete-order-general",
    chapter: "Ordering",
    label: "Missing choices",
    helper: "Required choices are flagged before checkout.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 900 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Another food order.",
          "Details missing.",
          "SmartBar keeps the cart intact.",
        ],
      },
      { kind: "typePrimary", value: "cheeseburger, fries and a milkshake", delayMs: 250 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1250 },
    ],
  },
{
    id: "qualifiers-general",
    chapter: "Ordering",
    label: "Resolve missing choices",
    helper: "Required choices become quick guided taps.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Red items.",
          "Choices required.",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="no-onions"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1500 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="large"]',
        label: "",
        delayMs: 260,
        pulseMs: 720,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1500 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="chocolate"]',
        label: "",
        delayMs: 260,
        pulseMs: 720,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 2200 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Missing choices resolved.",
          "Checkout unlocks.",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 900,
        aimMs: 900,
        pulseMs: 900,
        anchorY: 0.68,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2600 },
      { kind: "pause", delayMs: 1800 },
      { kind: "shell", type: "closeSheet", delayMs: 650 },
      { kind: "pause", delayMs: 650 },
    ],
  },
{
    id: "booking-complete",
    chapter: "Booking",
    label: "Room recommendations",
    helper: "Same sheet through step 3.",
    surface: "booking",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 120 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Example 3: **Domi Hotel**",
          "Choice-heavy booking site",
          "Ranks best fit",
        ],
      },
      { kind: "typePrimary", value: "Aug 4 to 9, nice room with a view and breakfast, just me", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Room request has tradeoffs",
          "Ranks options",
          "stores room context",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "focusTarget", targetId: "room-garden-terrace", label: "Garden Terrace King", delayMs: 700 },
      { kind: "pause", delayMs: 1000 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-booking-nav="next"]:not(:disabled)',
        label: "",
        delayMs: 180,
        pulseMs: 760,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 1250 },
      { kind: "focusTarget", targetId: "room-ocean-view-suite", label: "Ocean View Suite", delayMs: 520 },
      { kind: "pause", delayMs: 900 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-booking-nav="next"]:not(:disabled)',
        label: "",
        delayMs: 180,
        pulseMs: 760,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 1250 },
      { kind: "focusTarget", targetId: "room-coastal-villa", label: "Coastal Villa Suite", delayMs: 520 },
      { kind: "pause", delayMs: 950 },
    ],
  },
{
    id: "booking-breakfast",
    chapter: "Booking",
    label: "Add breakfast + book",
    helper: "Package holds, then summary.",
    surface: "booking",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          //"Visitor changes plan",
          //"SmartBar keeps the room context",
        ],
      },
      { kind: "typeFollowUp", value: "add breakfast", delayMs: 250 },
      { kind: "pause", delayMs: 700 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-followup-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitFollowUp", delayMs: 650 },
      { kind: "focusTarget", targetId: "package-breakfast-flex", label: "Breakfast Flex Plan", delayMs: 700 },
      { kind: "pause", delayMs: 1800 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Package attaches to active room",
          //"Prepares summary",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-sheet-panel="true"] button:not([aria-label]):not(:disabled)',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2600 },
      { kind: "pause", delayMs: 3600 },
    ],
  },
{
    id: "booking-incomplete",
    chapter: "Booking",
    label: "Dates + guests",
    helper: "Selector sheets.",
    surface: "booking",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 900 },
      { kind: "typePrimary", value: "need a family room", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Travel dates missing",
          "Who's staying missing",
         //  "Offers selectors",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 620 },
   //   {
    //    kind: "cards",
    //    mode: "standard",
    //    density: "normal",
    //    holdMs: 1000,
    //    finalHoldMs: 1400,
    //    cards: [
         // "Offers selectors",
          //"Easier entry",
     //   ],
    //  },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-calendar-date="2026-06-12"]',
        label: "",
        delayMs: 280,
        pulseMs: 720,
      },
      { kind: "selectBookingDate", dateKind: "check-in", value: "2026-06-12", delayMs: 80 },
      { kind: "pause", delayMs: 260 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-calendar-date="2026-06-15"]',
        label: "",
        delayMs: 120,
        pulseMs: 720,
      },
      { kind: "selectBookingDate", dateKind: "check-out", value: "2026-06-15", delayMs: 80 },
      { kind: "pause", delayMs: 280 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-booking-apply="dates"]',
        label: "",
        delayMs: 120,
        pulseMs: 720,
        anchorY: 0.62,
      },
      { kind: "commitBookingContext", field: "dates", delayMs: 120 },
      { kind: "pause", delayMs: 520 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1400,
        cards: [
          "Selectors easier than typing",
        ],
      },
      { kind: "openBookingContext", field: "guests", delayMs: 400 },
      { kind: "pause", delayMs: 500 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-guest-control="adults-increment"]',
        label: "",
        delayMs: 120,
        pulseMs: 680,
      },
      { kind: "setBookingGuestCount", adults: 2, children: 0, delayMs: 80 },
      { kind: "pause", delayMs: 220 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-guest-control="children-increment"]',
        label: "",
        delayMs: 120,
        pulseMs: 680,
      },
      { kind: "setBookingGuestCount", adults: 2, children: 1, delayMs: 80 },
      { kind: "pause", delayMs: 220 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-guest-control="children-increment"]',
        label: "",
        delayMs: 120,
        pulseMs: 680,
      },
      { kind: "setBookingGuestCount", adults: 2, children: 2, delayMs: 80 },
      { kind: "pause", delayMs: 280 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-booking-apply="guests"]',
        label: "",
        delayMs: 120,
        pulseMs: 720,
        anchorY: 0.62,
      },
      { kind: "commitBookingContext", field: "guests", delayMs: 120 },
      { kind: "pause", delayMs: 520 },
      { kind: "submitPrimary", value: "show family recommendation", delayMs: 500 },
      { kind: "focusTarget", targetId: "room-family-double", label: "Family Double Room", delayMs: 680 },
      { kind: "pause", delayMs: 1000 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Context becomes booking",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-sheet-panel="true"] button:not([aria-label]):not(:disabled)',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 3000 },
      { kind: "pause", delayMs: 2200 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 1100 },
      { kind: "pause", delayMs: 650 },
    ],
  },
{
    id: "finale-setup",
    chapter: "Finale",
    label: "Right tool",
    helper: "SmartBar chooses the right surface for the job.",
    surface: "finale",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 160 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1700,
        cards: [
          "Same bar. Different jobs.",
          "Think of SmartBar like a caddy",
          "with a bag full of clubs.",
          "The visitor describes the shot.",
          "SmartBar picks the right tool.",
          //"Then opens the next step.",
        ],
      },
    ],
  },
{
    id: "finale",
    chapter: "Finale",
    label: "Search bar with a toolbelt",
    helper: "Clean tool sweep.",
    surface: "finale",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "open", delayMs: 200 },
      { kind: "showFixture", value: "show me the short version", delayMs: 250, thinkingMs: 1500, thinkingMessage: "Choosing the right tool...", settleMs: 1600 },
      { kind: "pause", delayMs: 650 },
      { kind: "showFixture", value: "show action choices", delayMs: 80, settleMs: 1500 },
      { kind: "pause", delayMs: 650 },
      { kind: "showFixture", value: "show pending cart", delayMs: 80, settleMs: 1500 },
      { kind: "pause", delayMs: 650 },
      { kind: "showFixture", value: "show final cart", delayMs: 80, settleMs: 1500 },
      { kind: "pause", delayMs: 650 },
      { kind: "openBookingContext", field: "dates", delayMs: 80, settleMs: 1500 },
      { kind: "pause", delayMs: 650 },
      { kind: "openBookingContext", field: "guests", delayMs: 80, settleMs: 1500 },
      { kind: "pause", delayMs: 650 },
      { kind: "showFixture", value: "summarize this", delayMs: 80, settleMs: 1700 },
      { kind: "pause", delayMs: 1200 },
      { kind: "showFixture", value: "show after-hours lead capture", delayMs: 80, settleMs: 1700 },
      { kind: "pause", delayMs: 1700 },
      { kind: "shell", type: "closeSheet", delayMs: 320, settleMs: 1200 },
      { kind: "shell", type: "clearChat", delayMs: 80 },
      { kind: "shell", type: "openChat", delayMs: 80, settleMs: 1500 },
      { kind: "pause", delayMs: 2600 },
      { kind: "typeChat", value: "Yes — I’d love to hear about pricing!", delayMs: 120 },
      { kind: "submitChat", delayMs: 420 },
      { kind: "pause", delayMs: 3600 },
      { kind: "typeChat", value: "Perfect — send me the scheduling link.", delayMs: 120 },
      { kind: "submitChat", delayMs: 420 },
      { kind: "pause", delayMs: 1900 },
      { kind: "shell", type: "closeChat", delayMs: 500, settleMs: 1200 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 900 },
      {
        kind: "pointerClick",
        targetSelector: '[aria-label="Close TourBar"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "closeBar", delayMs: 220, settleMs: 900 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1300,
        cards: [
          "Guided discovery.",
          "Finds the right answer.",
          "Opens the next step.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1300,
        cards: [
          "Direct ordering.",
          "Builds the cart.",
          "Gets it checkout-ready.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1300,
        cards: [
          "Booking assistance.",
          "Ranks choices.",
          "Prepares handoff.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1600,
        cards: [
          "One SmartBar.",
          "Many site types.",
          "Same setup pattern.",
        ],
      },
    ],
  },
];

const MOBILE_GENERAL_OPEN_COMMANDS: SmartBarSpeedCommand[] = [
  {
    kind: "pointerClick",
    targetSelector: '[data-smartbar-mobile-launcher="true"]',
    label: "",
    click: true,
    delayMs: 250,
    pulseMs: 820,
  },
  { kind: "pause", delayMs: 520 },
];

const MOBILE_GENERAL_SUBMIT_COMMANDS: SmartBarSpeedCommand[] = [
  {
    kind: "pointerClick",
    targetSelector: '[data-smartbar-mobile-submit="true"]',
    label: "",
    click: true,
    delayMs: 250,
    pulseMs: 820,
  },
];

export const SMARTBAR_MOBILE_GENERAL_REAL_STEPS: SmartBarSpeedStep[] = [
  {
    id: "mobile-nexa-open",
    chapter: "NexaPath",
    label: "Open NexaPath SmartBar",
    helper: "Real mobile shell, BurgerRush-style director.",
    surface: "info",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1350,
        cards: [
          "Example 1: **NexaPath Advisory**",
          "Real mobile shell",
          "Script only directs",
        ],
      },
      ...MOBILE_GENERAL_OPEN_COMMANDS,
    ],
  },
  {
    id: "mobile-nexa-query",
    chapter: "NexaPath",
    label: "Ask advisory question",
    helper: "Type into the real NexaPath entry box.",
    surface: "info",
    commands: [
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "we're a hedge fund, need help with IT and setting up copilots",
        delayMs: 250,
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 3600,
        cards: [
          "Typed into the real bar",
          "Adapter owns the panel",
          "No fake general shell",
        ],
      },
      ...MOBILE_GENERAL_SUBMIT_COMMANDS,
      { kind: "pause", delayMs: 6200 },
    ],
  },
  {
    id: "mobile-order-open",
    chapter: "BurgerRush",
    label: "Open BurgerRush SmartBar",
    helper: "Same working BurgerRush orchestration pattern.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1350,
        cards: [
          "Example 2: **BurgerRush**",
          "This is the known-good path",
          "Words become cart",
        ],
      },
      ...MOBILE_GENERAL_OPEN_COMMANDS,
    ],
  },
  {
    id: "mobile-order-query",
    chapter: "BurgerRush",
    label: "Messy order to cart",
    helper: "Use the real BurgerRush mobile fixture shell.",
    surface: "ordering",
    commands: [
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "dbl chzbrger combo lg friez diet coke pie",
        delayMs: 250,
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1600,
        cards: [
          "Plain English",
          "Typos included",
          "Cart renderer fills itself",
        ],
      },
      ...MOBILE_GENERAL_SUBMIT_COMMANDS,
      { kind: "pause", delayMs: 5200 },
    ],
  },
  {
    id: "mobile-order-checkout",
    chapter: "BurgerRush",
    label: "Checkout handoff",
    helper: "Tap the real checkout control.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Cart loaded",
          "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
        anchorY: 0.68,
      },
      { kind: "pause", delayMs: 2200 },
    ],
  },
  {
    id: "mobile-domi-open",
    chapter: "Domi",
    label: "Open Domi SmartBar",
    helper: "Real Domi mobile shell, not general fixture UI.",
    surface: "booking",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1350,
        cards: [
          "Example 3: **Domi Hotel**",
          "Real booking shell",
          "Booking adapter owns panel",
        ],
      },
      ...MOBILE_GENERAL_OPEN_COMMANDS,
    ],
  },
  {
    id: "mobile-domi-query",
    chapter: "Domi",
    label: "Room request",
    helper: "Type into the real Domi entry box.",
    surface: "booking",
    commands: [
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "Aug 4 to 9, nice room with a view and breakfast, just me",
        delayMs: 250,
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1600,
        cards: [
          "Dates included",
          "Guest included",
          "Adapter ranks options",
        ],
      },
      ...MOBILE_GENERAL_SUBMIT_COMMANDS,
      { kind: "pause", delayMs: 7600 },
    ],
  },
  {
    id: "mobile-finale",
    chapter: "Finale",
    label: "Closeout",
    helper: "Cards own the closeout, just like BurgerRush.",
    surface: "finale",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1400,
        cards: [
          "Real mobile shells.",
          "One director layer.",
          "No fake general UI.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1800,
        cards: [
          "Nexa.",
          "BurgerRush.",
          "Domi.",
          "Same SmartBar pattern.",
        ],
      },
    ],
  },
];

export const SMARTBAR_BURGERRUSH_ONLY_STEPS: SmartBarSpeedStep[] = [
{
    id: "food-open",
    chapter: "BurgerRush",
    label: "Open BurgerRush SmartBar",
    helper: "Restaurant ordering wedge.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeAll", delayMs: 100 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-launcher-hotspot="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "open", delayMs: 180 },
    ],
  },
{
    id: "complete-order",
    chapter: "Ordering",
    label: "Messy order to cart",
    helper: "Cart sheet.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Food stop: **BurgerRush**",
          "Direct ordering site",
          "Turns words into checkout",
        ],
      },
      { kind: "typePrimary", value: "dbl chzbrger combo lg friez diet coke pie", delayMs: 250 },
      // {
      //   kind: "cards",
      //   mode: "standard",
      //   density: "normal",
      //   holdMs: 1000,
      //   finalHoldMs: 1600,
      //   cards: [
      //     //"Messy food shorthand",
      //     "Plain English",
      //     "Typos included",
      //     //"then checks totals and modifiers",
      //     //"Done",
      //   ],
      // },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1500 },
    ],
  },
{
    id: "checkout",
    chapter: "Ordering",
    label: "Checkout handoff",
    helper: "Final sheet.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Green items",
          "All set",
          // "Cart loaded",
          // "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
            {
        kind: "cards",
        mode: "standard",
        density: "normal",
        finalHoldMs: 1400,
        cards: [
          "Prefills your POS",
          "You handle the rest",
        ],
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2200 },
      { kind: "pause", delayMs: 900 },
    ],
  },
{
    id: "incomplete-order",
    chapter: "Ordering",
    label: "Incomplete order",
    helper: "Cart opens with required-choice overlay.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 900 },
      { kind: "typePrimary", value: "cheeseburger, fries and a milkshake", delayMs: 250 },
      // {
      //   kind: "cards",
      //   mode: "standard",
      //   density: "normal",
      //   holdMs: 1000,
      //   finalHoldMs: 1600,
      //   cards: [
      //     "Missing choices",
      //     "Only blockers are flagged",
      //     "Cart stays intact",
      //   ],
      // },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1250 },
    ],
  },
{
    id: "qualifiers",
    chapter: "Ordering",
    label: "Resolve choices",
    helper: "Overlay choices, cart, checkout.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Red items",
          "Choices required",
          // "Checkout unlocks when ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="no-onions"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1500 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="large"]',
        label: "",
        delayMs: 260,
        pulseMs: 720,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1500 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="chocolate"]',
        label: "",
        delayMs: 260,
        pulseMs: 720,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 2200 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 900,
        aimMs: 900,
        pulseMs: 900,
        anchorY: 0.68,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2600 },
      { kind: "pause", delayMs: 1800 },
      { kind: "shell", type: "closeSheet", delayMs: 650 },
      { kind: "pause", delayMs: 650 },
    ],
  },
{
    id: "optional-extras",
    chapter: "Ordering",
    label: "Optional extras",
    helper: "Checkout stays available while extras stay optional.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 900 },
      { kind: "typePrimary", value: "cheeseburger no onions, show burger options", delayMs: 250 },
      // {
      //   kind: "cards",
      //   mode: "standard",
      //   density: "normal",
      //   holdMs: 1000,
      //   finalHoldMs: 1500,
      //   cards: [
      //     "Extras stay optional",
      //     "Add bacon",
      //     "Checkout stays open",
      //   ],
      // },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1050 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Yellow items",
          "All set",
          "but options available",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-state="optional"] button',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 650 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="bacon"]',
        label: "",
        delayMs: 180,
        pulseMs: 760,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 1200 },
      { kind: "pause", delayMs: 450 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 120,
        pulseMs: 640,
      },
      { kind: "pause", delayMs: 1150 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 300,
        pulseMs: 820,
        anchorY: 0.68,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2200 },
      { kind: "pause", delayMs: 1200 },
      { kind: "shell", type: "closeSheet", delayMs: 500, settleMs: 850 },
    ],
  },
{
    id: "unmatched-order",
    chapter: "Ordering",
    label: "Unmatched item",
    helper: "Gray retry row for items not on the menu.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 900 },
      { kind: "typePrimary", value: "cheeseburger, large fries, lava tacos", delayMs: 250 },
      // {
      //   kind: "cards",
      //   mode: "standard",
      //   density: "normal",
      //   holdMs: 1000,
      //   finalHoldMs: 1500,
      //   cards: [
      //     "Bad item isolated",
      //     "Matched items stay ready",
      //     "Retry replaces the gray row",
      //   ],
      // },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1100 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Gray item",
          "Not on the menu",
          // "Cart stays intact",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-state="unrecognized"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 1550 },
      {
        kind: "typeInput",
        targetSelector: '[data-tourbar-cart-retry-input="true"]',
        value: "med rings",
        delayMs: 120,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-retry-submit="true"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 4300 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
        anchorY: 0.68,
      },
      { kind: "pause", delayMs: 550 },
      { kind: "shell", type: "closeSheet", delayMs: 420, settleMs: 850 },
      { kind: "pause", delayMs: 450 },
    ],
  },
{
    id: "ordering-closeout",
    chapter: "Ordering",
    label: "Ordering closeout",
    helper: "BurgerRush clears so the closing cards own the screen.",
    surface: "finale",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 900,
        finalHoldMs: 1500,
        cards: [
          // "Not a burger-shop toy.",
          "Any menu.",
          "Modifiers.",
          "Sizes.",
          "Missing choices.",
          "Bad items.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 900,
        finalHoldMs: 1500,
        cards: [
          "One burger.",
          "Office lunches.",
          "Team meals.",
          "Catering requests.",
          "Paste the list.",
          "Build the cart.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 900,
        finalHoldMs: 1800,
        cards: [
          "Setup is simple.",
          "Site scan.",
          "Code snippet.",
          "Menu insert.",
          "Go live.",
        ],
      },
    ],
  },
];

const MOBILE_BURGERRUSH_OPEN_COMMANDS: SmartBarSpeedCommand[] = [
  {
    kind: "pointerClick",
    targetSelector: '[data-smartbar-mobile-launcher="true"]',
    label: "",
    click: true,
    delayMs: 250,
    pulseMs: 820,
  },
  { kind: "pause", delayMs: 420 },
];

export const SMARTBAR_BURGERRUSH_MOBILE_STEPS: SmartBarSpeedStep[] = [
  {
    id: "mobile-open",
    chapter: "BurgerRush",
    label: "Open SmartBar",
    helper: "Real mobile shell.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1350,
        cards: [
          "Food stop: **BurgerRush**",
          "Direct ordering site",
          "Words become checkout",
        ],
      },
      ...MOBILE_BURGERRUSH_OPEN_COMMANDS,
    ],
  },
  {
    id: "mobile-complete-order",
    chapter: "Ordering",
    label: "Messy order to cart",
    helper: "Plain-English food request becomes a checkout-ready cart.",
    surface: "ordering",
    commands: [
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "dbl chzbrger combo lg friez diet coke pie",
        delayMs: 250,
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 2400,
        cards: [
          "Plain English",
          "Typos included",
          // "Cart loaded",
          // "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-submit="true"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 2400 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Green items",
          "All set",
          // "Cart loaded",
          // "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-checkout="true"]',
        label: "",
        click: true,
        delayMs: 350,
        aimMs: 900,
        pulseMs: 900,
        anchorY: 0.68,
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        finalHoldMs: 1400,
        cards: [
          "Prefills your POS",
          "You handle the rest",
        ],
      },
      { kind: "pause", delayMs: 3600 },
    ],
  },
  {
    id: "mobile-required-order",
    chapter: "Ordering",
    label: "Incomplete order",
    helper: "Required choices block checkout until resolved.",
    surface: "ordering",
    commands: [
      ...MOBILE_BURGERRUSH_OPEN_COMMANDS,
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "cheeseburger, fries and a milkshake",
        delayMs: 250,
      },
      // {
      //   kind: "cards",
      //   mode: "standard",
      //   density: "normal",
      //   holdMs: 1000,
      //   finalHoldMs: 1500,
      //   cards: [
      //     // "Missing choices",
      //     // "Only blockers are flagged",
      //     // "Cart stays intact",
      //   ],
      // },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-submit="true"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 2400 },
    ],
  },
  {
    id: "mobile-qualifiers",
    chapter: "Ordering",
    label: "Resolve choices",
    helper: "One required choice at a time.",
    surface: "ordering",
    commands: [
      {
         kind: "cards",
         mode: "standard",
         density: "normal",
         holdMs: 1000,
         finalHoldMs: 1500,
         cards: [
           "Red items",
           "Choices required",
           // "Checkout unlocks when ready",
         ],
       },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-line-title-key*="cheeseburger"]',
        label: "",
        click: true,
        delayMs: 250,
        aimMs: 900,
        pulseMs: 850,
      },
      { kind: "pause", delayMs: 1300 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Takes you to item",
          "Presents choices",
          // "Cart loaded",
          // "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-option-key="no-onions"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 1050 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-line-title-key*="fries"]',
        label: "",
        click: true,
        delayMs: 250,
        aimMs: 900,
        pulseMs: 850,
      },
      { kind: "pause", delayMs: 1300 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-option-key="large"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 1050 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-line-title-key*="milkshake"]',
        label: "",
        click: true,
        delayMs: 250,
        aimMs: 900,
        pulseMs: 850,
      },
      { kind: "pause", delayMs: 1300 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-option-key="chocolate"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 1550 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-checkout="true"]',
        label: "",
        click: true,
        delayMs: 900,
        aimMs: 900,
        pulseMs: 900,
        anchorY: 0.68,
      },
      { kind: "pause", delayMs: 5600 },
    ],
  },
  {
    id: "mobile-optional-extras",
    chapter: "Ordering",
    label: "Optional extras",
    helper: "Checkout stays available while extras stay optional.",
    surface: "ordering",
    commands: [
      ...MOBILE_BURGERRUSH_OPEN_COMMANDS,
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "cheeseburger no onions, show burger options",
        delayMs: 250,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-submit="true"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 2400 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Yellow items",
          "All set",
          "but options available",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-line-title-key*="cheeseburger"]',
        label: "",
        click: true,
        delayMs: 250,
        aimMs: 900,
        pulseMs: 850,
      },
      { kind: "pause", delayMs: 1700 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-option-key="bacon"]',
        label: "",
        click: true,
        delayMs: 240,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 850 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-detail-close="true"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 720,
      },
      { kind: "pause", delayMs: 900 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-checkout="true"]',
        label: "",
        click: true,
        delayMs: 350,
        aimMs: 900,
        pulseMs: 900,
        anchorY: 0.68,
      },
      { kind: "pause", delayMs: 5600 },
    ],
  },
  {
    id: "mobile-unmatched-order",
    chapter: "Ordering",
    label: "Unmatched item",
    helper: "Gray retry row for items not on the menu.",
    surface: "ordering",
    commands: [
      ...MOBILE_BURGERRUSH_OPEN_COMMANDS,
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-entry-input="true"]',
        value: "cheeseburger, large fries, lava tacos",
        delayMs: 250,
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          // "Lava tacos not on menu",
          // "Matched items stay ready",
          // "Retry replaces the gray row",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-submit="true"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 2400 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1400,
        cards: [
          "Gray items",
          "Not on menu",
          // "Chance to retry",
          // "Checkout-ready",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-line-status="unknown"]',
        label: "",
        click: true,
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 650 },
      {
        kind: "typeInput",
        targetSelector: '[data-smartbar-mobile-retry-input="true"]',
        value: "med rings",
        delayMs: 160,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-retry-submit="true"]',
        label: "",
        click: true,
        delayMs: 260,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 2800 },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-mobile-checkout="true"]',
        label: "",
        click: true,
        delayMs: 350,
        aimMs: 900,
        pulseMs: 900,
        anchorY: 0.68,
      },
      { kind: "pause", delayMs: 5600 },
    ],
  },
  // {
  //   id: "mobile-closeout",
  //   chapter: "BurgerRush",
  //   label: "Ordering closeout",
  //   helper: "Why this is bigger than a burger demo.",
  //   surface: "finale",
  //   commands: [
  //     {
  //       kind: "cards",
  //       mode: "standard",
  //       density: "normal",
  //       holdMs: 900,
  //       finalHoldMs: 1500,
  //       cards: [
  //         "Give it plain English.",
  //         "Get back a cart.",
  //         "Grabs missing detail.",
  //         "Offers extras.",
  //         "Flags bad matches.",
  //       ],
  //     },
  //     {
  //       kind: "cards",
  //       mode: "standard",
  //       density: "normal",
  //       holdMs: 900,
  //       finalHoldMs: 1500,
  //       cards: [
  //         "One burger.",
  //         "Office lunches.",
  //         "Team meals.",
  //         "Catering requests.",
  //         "Paste the list.",
  //         "Build the cart.",
  //       ],
  //     },
  //     {
  //       kind: "cards",
  //       mode: "standard",
  //       density: "normal",
  //       holdMs: 900,
  //       finalHoldMs: 1800,
  //       cards: [
  //         "Setup is simple.",
  //         "Site scan.",
  //         "Code snippet.",
  //         "Menu cheat sheet.",
  //         "Go live.",
  //       ],
  //     },
  //   ],
 // },
];


// FoodTrio desktop choreography is sheet-first: prompt -> submit -> ThinkingText -> sheet drops.
// Page navigation/spotlight happens only after a red/yellow/gray item tile is selected.
//
// FOODTRIO_DESKTOP_CARD_EDITOR_COPY_BLOCK
// -----------------------------------------------------------------------------
// EDIT FOODTRIO DESKTOP SLIDE-CARD COPY HERE.
// Keep each card group short and punchy. The timeline below only references these
// names, so copy changes do not require digging through pointer/tap choreography.
// -----------------------------------------------------------------------------
const FOOD_TRIO_DESKTOP_CARD_COPY = {
  // FOODTRIO_COFFEE_FIRST_PASS_DETAIL_STORY:
  // Coffee now proves first-pass detail capture, not omission correction.
  // FOODTRIO_DESKTOP_FINALE_SALES_SETUP_AND_COFFEE_REVIEW_COPY_V1:
  // Coffee now makes the review jump explicit, matching the mobile clarity.
  coffeeIntro: ["Coffee", "Small order", "Lots of detail"],
  coffeeCart: ["Details captured", "Jump to review"],
  coffeeLatteReview: ["Details picked up", "Looks good", "No change"],
  coffeeMatchaReview: ["Also spot on"],
  coffeeColdBrewExtra: ["Let's add something"],

  // FOODTRIO_FAST_FOOD_GREEN_FOCUS_STORY:
  // Fast food now proves messy shorthand becomes a mostly-ready green cart.
  fastFoodIntro: ["Fast food", "Messy shorthand", "Mostly ready"],

  casualDiningIntro: ["Casual dining.", "Full meal.", "Full range."],
  // FOODTRIO_CASUAL_CLEAN_BEAT_STORY:
  // Casual Dining proves red required choices, green editability, and yellow captured extras.
  casualMadeiraReview: ["Green is ready", "But can be changed"],
  casualCheesecakeReview: ["Got my extra cream?", "Good!"],

  // Desktop finale now carries the stronger sales/setup close from mobile.
  finaleProof: ["One bar", "Any menu", "Any order"],
  finaleSales: ["Fewer calls", "Fewer abandoned carts", "More direct orders"],
  finaleSetupIntro: ["Setup is simple"],
  finaleSetupSteps: ["Site scan", "Code snippet", "Menu pack"],
  finaleClose: ["Direct orders", "Made simple"],
} satisfies Record<string, SmartBarSpeedCardItem[]>;

const FOOD_TRIO_DESKTOP_CARD_CINEMATIC_CADENCE = {
  // FOODTRIO_DESKTOP_CARD_CINEMATIC_CADENCE:
  // Keep desktop lesson cards slow enough to read. Newer coffee cards were
  // entering too quickly; these minimums make each card land with a digestion pause.
  cascadeGapMs: 1000,
  finalHoldMs: 1800,
} as const;

const foodTrioDesktopCardBeat = (
  cards: SmartBarSpeedCardItem[],
  holdMs: number = FOOD_TRIO_DESKTOP_CARD_CINEMATIC_CADENCE.cascadeGapMs,
  finalHoldMs: number = FOOD_TRIO_DESKTOP_CARD_CINEMATIC_CADENCE.finalHoldMs,
): Extract<SmartBarSpeedCommand, { kind: "cards" }> => ({
  kind: "cards",
  mode: "standard",
  density: "normal",
  holdMs: Math.max(holdMs, FOOD_TRIO_DESKTOP_CARD_CINEMATIC_CADENCE.cascadeGapMs),
  finalHoldMs: Math.max(finalHoldMs, FOOD_TRIO_DESKTOP_CARD_CINEMATIC_CADENCE.finalHoldMs),
  cards,
});

export const SMARTBAR_FOOD_TRIO_DESKTOP_STEPS: SmartBarSpeedStep[] = [
  {
    id: "food-trio-desktop-open",
    chapter: "FoodTrio",
    label: "Open FoodTrio SmartBar",
    helper: "Open immediately so the coffee prompt starts without a dead hold.",
    surface: "ordering",
    commands: [
      // FoodTrio desktop choreo step 2: no opening card stack here.
      // The launch/prelude already introduced the demo; when the food page loads,
      // the real SmartBar should open and the coffee prompt should begin quickly.
      { kind: "shell", type: "closeAll", delayMs: 40 },
      // FoodTrio desktop checkout/start mechanics: show the pointer opening SmartBar.
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-launcher-hotspot="true"]',
        label: "",
        click: true,
        delayMs: 80,
        aimMs: 650,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 260 },
      { kind: "shell", type: "open", delayMs: 40, settleMs: 220 },
    ],
  },
  {
    id: "food-trio-desktop-coffee",
    chapter: "Coffee",
    label: "Detail",
    helper: "A few items, lots of modifiers.",
    surface: "ordering",
    commands: [
      // FoodTrio desktop per-order checkout fix: start with a visible SmartBar launcher click.
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-launcher-hotspot="true"]',
        label: "",
        click: true,
        delayMs: 80,
        aimMs: 520,
        pulseMs: 720,
      },
      { kind: "shell", type: "open", delayMs: 160 },
      { kind: "pause", delayMs: 180 },
      // Coffee slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.coffeeIntro.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.coffeeIntro, 700, 950),
      {
        kind: "typePrimary",
        value: "Three drinks: iced vanilla latte with oat milk, half sweet, light ice, and extra shot; matcha latte with almond milk, no foam, and light ice; cold brew black with vanilla cold foam.",
        delayMs: 80,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 240,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1350 },
      // Coffee slide card C08: first-pass details are already captured.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.coffeeCart, 750, 1050),

      // FoodTrio desktop selection-state fix: coffee has yellow optional-tile choreography too.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="coffee-iced-vanilla-latte"]',
        label: "",
        click: true,
        delayMs: 140,
        aimMs: 640,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 300 },
      // Coffee slide card C12A: all requested latte details were captured on first pass.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.coffeeLatteReview, 700, 950),
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 100,
        aimMs: 460,
        pulseMs: 560,
      },
      { kind: "pause", delayMs: 520 },
      // FoodTrio desktop last-yellow fix: coffee has three yellow optional tiles.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="coffee-matcha-latte"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 620,
        pulseMs: 720,
      },
      { kind: "pause", delayMs: 280 },
      // Coffee slide card C18A: matcha details are also already right.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.coffeeMatchaReview, 650, 850),
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 90,
        aimMs: 460,
        pulseMs: 540,
      },
      { kind: "pause", delayMs: 520 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="coffee-cold-brew"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 620,
        pulseMs: 720,
      },
      { kind: "pause", delayMs: 280 },
      // Coffee slide card C24A: optional extras remain available after first-pass capture.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.coffeeColdBrewExtra, 650, 850),
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-panel="optional"] [data-tourbar-qualifier-option="extra-cold-foam"]',
        label: "",
        click: true,
        delayMs: 100,
        aimMs: 500,
        pulseMs: 620,
      },
      { kind: "pause", delayMs: 360 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 90,
        aimMs: 460,
        pulseMs: 540,
      },
      { kind: "pause", delayMs: 420 },
      // FoodTrio desktop rebuild: checkout is a recognized scripted fixture step,
      // matching the working desktop demos instead of relying on live cart inference.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"], [data-tourbar-checkout-button="true"]',
        label: "",
        click: false,
        delayMs: 160,
        aimMs: 520,
        pulseMs: 560,
        anchorY: 0.68,
      },
      // FOODTRIO_ALL_CHECKOUTS_REAL_THINKING_LABEL_V1:
      // The Checkout label thinks for 2250ms, then this command fires the real click.
      {
        kind: "checkoutThinkingOverlay",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"], [data-tourbar-checkout-button="true"]',
        message: "Checkout",
        durationMs: 2250,
        clickAfter: true,
      },
      // FOODTRIO_CHECKOUT_HANDOFF_HOLD_FIX:
      // Let the checkout handoff card fully drop/open before the next demo closes the sheet.
      // Earlier timing closed the sheet while the handoff was still animating.
      { kind: "pause", delayMs: 3300 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 650 },
    ],
  },
  {
    id: "food-trio-desktop-fast-food",
    chapter: "Fast food",
    label: "Speed",
    helper: "Messy group order with typos.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 650 },
      // Fast-food slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.fastFoodIntro.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.fastFoodIntro, 950, 1400),
      {
        kind: "typePrimary",
        value: "2 chick mals, 1 spicy, both diet coke, 6 kids nug bbq sauce, extra sauces, crunch wrap",
        delayMs: 240,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 240,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1400 },

      // FOODTRIO_FAST_FOOD_GREEN_FOCUS_STORY:
      // Old red meal/kids/drink correction sequence removed.
      // Fast Food now focuses on SmartBar making the messy shorthand mostly green,
      // with only optional sauces and the gray retry remaining.
      // Yellow: optional extras are reviewed and selected.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="fast-sauces"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 650,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 240 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-panel="optional"] [data-tourbar-qualifier-option="ranch"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 520,
        pulseMs: 620,
      },
      { kind: "pause", delayMs: 360 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-panel="optional"] [data-tourbar-qualifier-option="buffalo"]',
        label: "",
        click: true,
        delayMs: 80,
        aimMs: 500,
        pulseMs: 620,
      },
      { kind: "pause", delayMs: 420 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 100,
        aimMs: 460,
        pulseMs: 560,
      },
      { kind: "pause", delayMs: 720 },

      // Gray: unmatched phrase is retried and becomes a matched cart line.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-state="unrecognized"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 650,
        pulseMs: 820,
      },
      { kind: "pause", delayMs: 260 },
      {
        kind: "typeInput",
        targetSelector: '[data-tourbar-cart-retry-input="true"]',
        value: "Crispy chicken wrap",
        clearFirst: true,
        delayMs: 120,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-retry-submit="true"]',
        label: "",
        click: true,
        delayMs: 160,
        aimMs: 520,
        pulseMs: 680,
      },
      { kind: "pause", delayMs: 520 },
      // FoodTrio desktop rebuild: checkout is a recognized scripted fixture step,
      // then the sheet closes before the next order starts fresh.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"], [data-tourbar-checkout-button="true"]',
        label: "",
        click: false,
        delayMs: 160,
        aimMs: 520,
        pulseMs: 560,
        anchorY: 0.68,
      },
      // FOODTRIO_ALL_CHECKOUTS_REAL_THINKING_LABEL_V1:
      // The Checkout label thinks for 2250ms, then this command fires the real click.
      {
        kind: "checkoutThinkingOverlay",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"], [data-tourbar-checkout-button="true"]',
        message: "Checkout",
        durationMs: 2250,
        clickAfter: true,
      },
      // FOODTRIO_CHECKOUT_HANDOFF_HOLD_FIX:
      // Let the checkout handoff card fully drop/open before the next demo closes the sheet.
      // Earlier timing closed the sheet while the handoff was still animating.
      { kind: "pause", delayMs: 3300 },
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 650 },
    ],
  },
  {
    id: "food-trio-desktop-casual-dining",
    chapter: "Casual dining",
    label: "Range",
    helper: "Full meal, full range.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeSheet", delayMs: 120, settleMs: 650 },
      // Casual-dining slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.casualDiningIntro.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.casualDiningIntro, 950, 1400),
      {
        kind: "typePrimary",
        value: "Start with avocado eggrolls, two dinner salads, Chicken Madeira with mashed potatoes, Herb-Crusted Salmon, and one Original Cheesecake with whipped cream — add extra whipped cream if available.",
        delayMs: 240,
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-smartbar-primary-submit="true"]',
        label: "",
        delayMs: 240,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 1350 },

      // FoodTrio desktop selection-state fix: casual dining resolves one red and one yellow tile.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="casual-salmon"]',
        label: "",
        click: true,
        delayMs: 140,
        aimMs: 650,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 240 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-panel="required"] [data-tourbar-qualifier-option="asparagus"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 520,
        pulseMs: 640,
      },
      { kind: "pause", delayMs: 780 },
      // FOODTRIO_CASUAL_MADEIRA_GREEN_EDITABLE:
      // Reopen a green/ready Madeira tile to prove ready items can still be changed.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="casual-madeira"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 650,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 260 },
      // FOODTRIO_CASUAL_CLEAN_BEAT_STORY D13B:
      // Madeira is green/ready, but ready items can still be changed.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.casualMadeiraReview, 900, 1500),
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-panel="optional"] [data-tourbar-qualifier-option="side-salad"]',
        label: "",
        click: true,
        delayMs: 100,
        aimMs: 500,
        pulseMs: 620,
      },
      { kind: "pause", delayMs: 360 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 90,
        aimMs: 460,
        pulseMs: 540,
      },
      { kind: "pause", delayMs: 520 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-line-key="casual-cheesecake"]',
        label: "",
        click: true,
        delayMs: 120,
        aimMs: 650,
        pulseMs: 760,
      },
      { kind: "pause", delayMs: 300 },
      // FOODTRIO_CASUAL_CLEAN_BEAT_STORY D20A:
      // Extra whipped cream was already captured from the prompt.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.casualCheesecakeReview, 900, 1500),
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-cart-action-close="optional"]',
        label: "",
        click: true,
        delayMs: 100,
        aimMs: 460,
        pulseMs: 560,
      },
      { kind: "pause", delayMs: 950 },
    ],
  },
  {
    id: "food-trio-desktop-checkout",
    chapter: "Checkout",
    label: "Checkout handoff",
    helper: "Finish the last FoodTrio order before the finale.",
    surface: "ordering",
    commands: [
      // FOODTRIO_CHECKOUT_THEN_FINALE_TEARDOWN:
      // Checkout handoff is its own beat. Let the handoff card fully drop,
      // then close the sheet before the finale surface/cards begin.
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"], [data-tourbar-checkout-button="true"]',
        label: "",
        click: false,
        delayMs: 160,
        aimMs: 520,
        pulseMs: 560,
        anchorY: 0.68,
      },
      // FOODTRIO_ALL_CHECKOUTS_REAL_THINKING_LABEL_V1:
      // Same label treatment as Coffee/Fast Food: Checkout thinks, then clicks.
      {
        kind: "checkoutThinkingOverlay",
        targetSelector: '[data-tourbar-order-checkout="true"], [data-tourbar-order-cta="checkout"], [data-tourbar-checkout-button="true"]',
        message: "Checkout",
        durationMs: 2250,
        clickAfter: true,
      },
      // FoodTrio desktop rebuild: checkout is clicked by the overlay command and routed through the recognized fixture nextMove.
      { kind: "pause", delayMs: 3200 },
      { kind: "shell", type: "closeSheet", delayMs: 80, settleMs: 760 },
      { kind: "pause", delayMs: 450 },
    ],
  },
  {
    id: "food-trio-desktop-finale",
    chapter: "Finale",
    label: "One bar",
    helper: "Words in. Cart out.",
    surface: "finale",
    commands: [
      // FOODTRIO_CHECKOUT_THEN_FINALE_TEARDOWN:
      // The previous step has closed the handoff sheet. Advancing to this
      // finale surface tears down the FoodTrio target wall before cards run.
      { kind: "pause", delayMs: 450 },
      // Finale slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.finaleProof.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.finaleProof, 900, 1300),
      // Finale slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.finaleSales.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.finaleSales, 900, 1300),
      // Finale slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.finaleSetupIntro.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.finaleSetupIntro, 900, 1100),
      // Finale slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.finaleSetupSteps.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.finaleSetupSteps, 900, 1300),
      // Finale slide card: edit copy in FOOD_TRIO_DESKTOP_CARD_COPY.finaleClose.
      foodTrioDesktopCardBeat(FOOD_TRIO_DESKTOP_CARD_COPY.finaleClose, 900, 1700),
    ],
  },
];
