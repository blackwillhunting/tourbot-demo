import type { TourBarBookingContext, TourBarRequiredBookingField } from "../tourbarBookingContext";

export type SmartBarSpeedCommand =
  | { kind: "shell"; type: "open" | "closeBar" | "closeSheet" | "closeChat" | "closeAll" | "runNextMove" | "openChat"; delayMs?: number }
  | { kind: "typePrimary"; value: string; delayMs?: number }
  | { kind: "submitPrimary"; value?: string; delayMs?: number }
  | { kind: "typeFollowUp"; value: string; delayMs?: number }
  | { kind: "submitFollowUp"; value?: string; delayMs?: number }
  | { kind: "openBookingContext"; field: TourBarRequiredBookingField; delayMs?: number }
  | { kind: "setBookingContext"; bookingContext: TourBarBookingContext; delayMs?: number }
  | { kind: "typeChat"; value: string; delayMs?: number }
  | { kind: "submitChat"; value?: string; delayMs?: number }
  | { kind: "pause"; delayMs: number };

export type SmartBarSpeedStep = {
  id: string;
  chapter: string;
  label: string;
  helper: string;
  commands: SmartBarSpeedCommand[];
};

export const SMARTBAR_SPEED_STEPS: SmartBarSpeedStep[] = [
  {
    id: "open",
    chapter: "Launch",
    label: "Open SmartBar",
    helper: "Launcher only.",
    commands: [
      { kind: "shell", type: "closeAll", delayMs: 100 },
      { kind: "shell", type: "open", delayMs: 450 },
    ],
  },
  {
    id: "dora",
    chapter: "Discovery",
    label: "Ask about DORA",
    helper: "Info sheet.",
    commands: [
      { kind: "typePrimary", value: "Do you help with DORA regulations?", delayMs: 250 },
      { kind: "submitPrimary", delayMs: 900 },
      { kind: "pause", delayMs: 1600 },
    ],
  },
  {
    id: "case-studies",
    chapter: "Discovery",
    label: "Show case studies",
    helper: "Separate case-study sheet.",
    commands: [
      { kind: "shell", type: "runNextMove", delayMs: 350 },
      { kind: "pause", delayMs: 1900 },
    ],
  },
  {
    id: "consultant-chat",
    chapter: "Handoff",
    label: "Consultant chat",
    helper: "Chat sheet.",
    commands: [
      { kind: "typeFollowUp", value: "can i speak with someone", delayMs: 250 },
      { kind: "submitFollowUp", delayMs: 820 },
      { kind: "typeChat", value: "interested in pricing", delayMs: 1300 },
      { kind: "submitChat", delayMs: 700 },
      { kind: "pause", delayMs: 3400 },
      { kind: "shell", type: "closeChat", delayMs: 350 },
    ],
  },
  {
    id: "complete-order",
    chapter: "Ordering",
    label: "Messy order to cart",
    helper: "Cart sheet.",
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
    helper: "Tool sweep.",
    commands: [
      { kind: "submitPrimary", value: "show me the short version", delayMs: 300 },
      { kind: "pause", delayMs: 850 },
      { kind: "submitPrimary", value: "show action choices", delayMs: 250 },
      { kind: "pause", delayMs: 850 },
      { kind: "openBookingContext", field: "dates", delayMs: 250 },
      { kind: "pause", delayMs: 850 },
      { kind: "submitPrimary", value: "show my cart", delayMs: 250 },
      { kind: "pause", delayMs: 850 },
      { kind: "submitPrimary", value: "summarize this", delayMs: 250 },
      { kind: "pause", delayMs: 850 },
      { kind: "shell", type: "openChat", delayMs: 250 },
      { kind: "typeChat", value: "Send this to a specialist", delayMs: 600 },
      { kind: "submitChat", delayMs: 500 },
      { kind: "pause", delayMs: 2600 },
      { kind: "shell", type: "closeAll", delayMs: 600 },
    ],
  },
];
