import type { TourBarBookingContext, TourBarRequiredBookingField } from "../tourbarBookingContext";
import type { SmartBarFlashCardCascadeMode, SmartBarFlashCardDensity } from "./SmartBarFlashCardRail";

export type SmartBarSpeedSurface = "info" | "ordering" | "booking";

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
  | { kind: "submitFollowUp"; value?: string; delayMs?: number }
  | { kind: "openBookingContext"; field: TourBarRequiredBookingField; delayMs?: number }
  | { kind: "setBookingContext"; bookingContext: TourBarBookingContext; delayMs?: number }
  | { kind: "selectBookingDate"; dateKind: "check-in" | "check-out"; value: string; delayMs?: number }
  | { kind: "setBookingGuestCount"; adults: number; children: number; delayMs?: number }
  | { kind: "commitBookingContext"; field: TourBarRequiredBookingField; delayMs?: number }
  | { kind: "showFixture"; value: string; delayMs?: number; thinkingMs?: number; thinkingMessage?: string }
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
        targetSelector: 'button[aria-label="Open SmartBar speed demo"]',
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
      { kind: "typePrimary", value: "we're a hedge fund and need IT support but could use help setting up copilot agents", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1300,
        finalHoldMs: 1800,
        cards: [
          "Search can't parse this",
          "SmartBar **reads intent**",
          "moves the visitor **to the answer**",
          "then **explains why**",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Submit TourBar query"]',
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
        holdMs: 1300,
        finalHoldMs: 1800,
        cards: [
          "Visitor asks for specifics",
        ],
      },
      { kind: "typeFollowUp", value: "that doesn't say what you actually do", delayMs: 250 },
      { kind: "pause", delayMs: 900 },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Ask TourBar follow-up"]',
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
          "SmartBar digs deeper",
          "Surfaces proof points",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-nextmove-query="__case_studies"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
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
      { kind: "typeFollowUp", value: "nice, can I talk to someone?", delayMs: 250 },
      { kind: "pause", delayMs: 1600 },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Ask TourBar follow-up"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitFollowUp", delayMs: 350 },
      { kind: "pause", delayMs: 3900 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1800,
        cards: [
          "Provides a direct chat surface",
          "Hands off context",
        ],
      },
      { kind: "typeChat", value: "Hi — curious about pricing.", delayMs: 140 },
      { kind: "submitChat", delayMs: 420 },
      { kind: "pause", delayMs: 3200 },
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
          "Example 2: **BurgerRush Carryout**",
          "Visible-cart ordering site",
          "SmartBar turns intent into checkout",
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
          "Messy food shorthand",
          "SmartBar **builds the cart**",
          "then checks totals and modifiers",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Submit TourBar query"]',
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
          "Complete cart is ready",
          "SmartBar can hand it off",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350, settleMs: 2200 },
      { kind: "pause", delayMs: 900 },
    ],
  },
  {
    id: "incomplete-order",
    chapter: "Ordering",
    label: "Incomplete order",
    helper: "Qualifier sheet.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "typePrimary", value: "cheeseburger, fries and a milkshake", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Order is incomplete",
          "SmartBar **stops before checkout**",
          "and asks only for missing choices",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Submit TourBar query"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "focusTarget", targetId: "item-cheeseburger", label: "Cheeseburger", delayMs: 650 },
      { kind: "pause", delayMs: 950 },
    ],
  },
  {
    id: "qualifiers",
    chapter: "Ordering",
    label: "Resolve choices",
    helper: "Choices, cart, checkout.",
    surface: "ordering",
    commands: [
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1500,
        cards: [
          "Choices become guided steps",
          "Each missing detail gets a path",
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
      { kind: "focusTarget", targetId: "side-fries", label: "Fries", delayMs: 520 },
      { kind: "pause", delayMs: 950 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="large"]',
        label: "",
        delayMs: 120,
        pulseMs: 720,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "focusTarget", targetId: "drink-milkshake", label: "Milkshake", delayMs: 520 },
      { kind: "pause", delayMs: 1250 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-qualifier-option="chocolate"]',
        label: "",
        delayMs: 120,
        pulseMs: 720,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1100 },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-order-cta="checkout"]',
        label: "",
        delayMs: 450,
        pulseMs: 820,
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
          "SmartBar ranks the best fit",
        ],
      },
      { kind: "typePrimary", value: "nice room with a view and breakfast, not the most expensive option", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Room request has tradeoffs",
          "SmartBar **ranks options**",
          "and keeps room context alive",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Submit TourBar query"]',
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
          "Visitor changes the plan",
          "SmartBar keeps the room context",
        ],
      },
      { kind: "typeFollowUp", value: "add breakfast", delayMs: 250 },
      { kind: "pause", delayMs: 700 },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Ask TourBar follow-up"]',
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
          "Package attaches to the room",
          "SmartBar prepares the summary",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-sheet-panel="true"] button:not([aria-label]):not(:disabled)',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1300 },
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
      { kind: "typePrimary", value: "need a family room", delayMs: 250 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1600,
        cards: [
          "Booking needs required context",
          "SmartBar asks only for dates and guests",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: 'button[aria-label="Submit TourBar query"]',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "submitPrimary", delayMs: 650 },
      { kind: "pause", delayMs: 620 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 1000,
        finalHoldMs: 1400,
        cards: [
          "Calendar opens directly",
        ],
      },
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
          "Same thread, new selector",
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
          "Context becomes a booking summary",
        ],
      },
      {
        kind: "pointerClick",
        targetSelector: '[data-tourbar-sheet-panel="true"] button:not([aria-label]):not(:disabled)',
        label: "",
        delayMs: 250,
        pulseMs: 820,
      },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1300 },
    ],
  },
  {
    id: "finale-setup",
    chapter: "Finale",
    label: "Right tool",
    helper: "SmartBar chooses the right surface for the job.",
    surface: "booking",
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
          "Then opens the next step.",
        ],
      },
    ],
  },
  {
    id: "finale",
    chapter: "Finale",
    label: "Search bar with a toolbelt",
    helper: "Clean tool sweep.",
    surface: "booking",
    commands: [
      { kind: "shell", type: "closeChat", delayMs: 80 },
      { kind: "shell", type: "open", delayMs: 200 },
      { kind: "showFixture", value: "show me the short version", delayMs: 250, thinkingMs: 1500, thinkingMessage: "Choosing the right tool..." },
      { kind: "pause", delayMs: 580 },
      { kind: "showFixture", value: "show action choices", delayMs: 80 },
      { kind: "pause", delayMs: 760 },
      { kind: "showFixture", value: "show pending cart", delayMs: 80 },
      { kind: "pause", delayMs: 760 },
      { kind: "showFixture", value: "show final cart", delayMs: 80 },
      { kind: "pause", delayMs: 760 },
      { kind: "openBookingContext", field: "dates", delayMs: 80 },
      { kind: "pause", delayMs: 760 },
      { kind: "openBookingContext", field: "guests", delayMs: 80 },
      { kind: "pause", delayMs: 760 },
      { kind: "showFixture", value: "summarize this", delayMs: 80 },
      { kind: "pause", delayMs: 760 },
      { kind: "shell", type: "clearChat", delayMs: 80 },
      { kind: "shell", type: "openChat", delayMs: 80 },
      { kind: "pause", delayMs: 3150 },
      { kind: "typeChat", value: "Yes — I’d love to hear about pricing!", delayMs: 120 },
      { kind: "submitChat", delayMs: 420 },
      { kind: "pause", delayMs: 3600 },
      { kind: "shell", type: "closeChat", delayMs: 500 },
      { kind: "showFixture", value: "show after-hours lead capture", delayMs: 320 },
      { kind: "pause", delayMs: 1050 },
      { kind: "shell", type: "closeSheet", delayMs: 320 },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 950,
        finalHoldMs: 1500,
        cards: [
          "SmartBar is a lift",
          "for every web property.",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1300,
        cards: [
          "B2B informational sites",
          "find intent",
          "dive deeper",
          "guide visitors to conversion",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1300,
        cards: [
          "Online ordering sites",
          "turn plain English",
          "into native checkout",
        ],
      },
      {
        kind: "cards",
        mode: "standard",
        density: "normal",
        holdMs: 850,
        finalHoldMs: 1500,
        cards: [
          "Choice-heavy booking sites",
          "read buying needs",
          "rank options",
          "accelerate decisions",
        ],
      },
    ],
  },
];
