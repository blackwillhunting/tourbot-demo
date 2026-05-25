import type { TourBarBookingContext, TourBarRequiredBookingField } from "../tourbarBookingContext";

export type SmartBarSpeedSurface = "info" | "ordering" | "booking";

export type SmartBarSpeedCommand =
  | { kind: "shell"; type: "open" | "closeBar" | "closeSheet" | "closeChat" | "clearChat" | "closeAll" | "runNextMove" | "openChat"; delayMs?: number }
  | { kind: "typePrimary"; value: string; delayMs?: number }
  | { kind: "submitPrimary"; value?: string; delayMs?: number }
  | { kind: "typeFollowUp"; value: string; delayMs?: number }
  | { kind: "submitFollowUp"; value?: string; delayMs?: number }
  | { kind: "openBookingContext"; field: TourBarRequiredBookingField; delayMs?: number }
  | { kind: "setBookingContext"; bookingContext: TourBarBookingContext; delayMs?: number }
  | { kind: "showFixture"; value: string; delayMs?: number }
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
      { kind: "shell", type: "open", delayMs: 450 },
    ],
  },
  {
    id: "hedge-fund-ask",
    chapter: "Discovery",
    label: "Long buyer question",
    helper: "Messy prompt a normal site search cannot handle.",
    surface: "info",
    commands: [
      { kind: "typePrimary", value: "we're a hedge fund and need IT support but could use help or mentorship setting up copilot agents", delayMs: 250 },
      { kind: "submitPrimary", delayMs: 900 },
      { kind: "pause", delayMs: 1700 },
    ],
  },
  {
    id: "prove-it",
    chapter: "Discovery",
    label: "Challenge the answer",
    helper: "SmartBar drills into concrete use cases.",
    surface: "info",
    commands: [
      { kind: "typeFollowUp", value: "that doesn't say what you actually do", delayMs: 250 },
      { kind: "submitFollowUp", delayMs: 850 },
      { kind: "pause", delayMs: 2100 },
    ],
  },
  {
    id: "case-studies",
    chapter: "Discovery",
    label: "Show proof",
    helper: "Case-study sheet.",
    surface: "info",
    commands: [
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 2100 },
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
      { kind: "submitFollowUp", delayMs: 820 },
      { kind: "pause", delayMs: 700 },
      { kind: "typeChat", value: "Can you route this to the right specialist?", delayMs: 850 },
      { kind: "submitChat", delayMs: 620 },
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
      { kind: "typePrimary", value: "dbl chzbrger combo lg friez diet coke apple pie", delayMs: 250 },
      { kind: "submitPrimary", delayMs: 1000 },
      { kind: "pause", delayMs: 1900 },
    ],
  },
  {
    id: "checkout",
    chapter: "Ordering",
    label: "Checkout handoff",
    helper: "Final sheet.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1700 },
    ],
  },
  {
    id: "incomplete-order",
    chapter: "Ordering",
    label: "Incomplete order",
    helper: "Qualifier sheet.",
    surface: "ordering",
    commands: [
      { kind: "typePrimary", value: "burger combo meal", delayMs: 250 },
      { kind: "submitPrimary", delayMs: 900 },
      { kind: "pause", delayMs: 1400 },
    ],
  },
  {
    id: "qualifiers",
    chapter: "Ordering",
    label: "Resolve choices",
    helper: "Same sheet, then cart.",
    surface: "ordering",
    commands: [
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1150 },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1150 },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1900 },
    ],
  },
  {
    id: "booking-complete",
    chapter: "Booking",
    label: "Room recommendations",
    helper: "Same sheet through step 3.",
    surface: "booking",
    commands: [
      { kind: "typePrimary", value: "nice room with a view and breakfast, not the most expensive option", delayMs: 250 },
      { kind: "submitPrimary", delayMs: 1000 },
      { kind: "pause", delayMs: 1500 },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1000 },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1400 },
    ],
  },
  {
    id: "booking-breakfast",
    chapter: "Booking",
    label: "Add breakfast + book",
    helper: "Package, then summary.",
    surface: "booking",
    commands: [
      { kind: "typeFollowUp", value: "add breakfast", delayMs: 250 },
      { kind: "submitFollowUp", delayMs: 900 },
      { kind: "pause", delayMs: 1400 },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1700 },
    ],
  },
  {
    id: "booking-incomplete",
    chapter: "Booking",
    label: "Dates + guests",
    helper: "Selector sheets.",
    surface: "booking",
    commands: [
      { kind: "typePrimary", value: "need a family room", delayMs: 250 },
      { kind: "submitPrimary", delayMs: 850 },
      { kind: "openBookingContext", field: "dates", delayMs: 1000 },
      { kind: "pause", delayMs: 850 },
      {
        kind: "setBookingContext",
        delayMs: 250,
        bookingContext: {
          datesSelected: true,
          checkInDate: "2026-06-12",
          checkOutDate: "2026-06-15",
          datesLabel: "Jun 12–15, 2026",
          nights: 3,
        },
      },
      { kind: "pause", delayMs: 850 },
      { kind: "openBookingContext", field: "guests", delayMs: 400 },
      { kind: "pause", delayMs: 850 },
      {
        kind: "setBookingContext",
        delayMs: 250,
        bookingContext: {
          guestsSelected: true,
          guestAdults: 2,
          guestChildren: 2,
          adults: 2,
          children: 2,
          guests: 4,
          guestLabel: "2 adults, 2 children",
        },
      },
      { kind: "pause", delayMs: 850 },
      { kind: "submitPrimary", value: "show family recommendation", delayMs: 500 },
      { kind: "pause", delayMs: 1500 },
      { kind: "shell", type: "runNextMove", delayMs: 350 },
    ],
  },
  {
    id: "finale",
    chapter: "Finale",
    label: "Search bar with a toolbelt",
    helper: "Clean tool sweep.",
    surface: "booking",
    commands: [
      { kind: "shell", type: "open", delayMs: 200 },
      { kind: "showFixture", value: "show me the short version", delayMs: 250 },
      { kind: "pause", delayMs: 760 },
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
      { kind: "typeChat", value: "Let’s talk about your pricing.", delayMs: 520 },
      { kind: "submitChat", delayMs: 420 },
      { kind: "pause", delayMs: 2600 },
      { kind: "shell", type: "closeAll", delayMs: 500 },
    ],
  },
];
