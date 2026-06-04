import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BedDouble, CalendarDays, Coffee, CreditCard, MessageSquare, Sparkles, Users } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
  type SmartBarMobileSubmitResult,
} from "./SmartBarMobileShell";
import SmartBarSpeedTargetWall from "../speed-demo/SmartBarSpeedTargetWall";
import {
  SmartBarFakePointerOverlay,
  makeSmartBarFakePointerState,
  type SmartBarFakePointerState,
} from "../speed-demo/SmartBarFakePointer";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_CROSSOVER_MS,
  SMARTBAR_FLASH_CARD_TRANSITION_MS,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../speed-demo/SmartBarFlashCardRail";
import type { SmartBarSpeedSurface } from "../speed-demo/smartBarSpeedScript";

type SmartBarMobileGeneralExperienceProps = {
  autoPlay?: boolean;
};

const SMARTBAR_MOBILE_GENERAL_START_KEY = "smartbar_mobile_general_start";
const SMARTBAR_MOBILE_GENERAL_FAST_KEY = "smartbar_mobile_general_fast";

type MobileFocusSnapshot = {
  element: HTMLElement;
  outline: string;
  outlineOffset: string;
  boxShadow: string;
  position: string;
  zIndex: string;
  transition: string;
  scrollMarginTop: string;
};

type SmartBarGeneralMobileAutoStep = {
  /** Desktop scene id from SMARTBAR_SPEED_STEPS / opening tutor cards. */
  desktopStepId: string;
  query?: string;
  cards: string[];
  targetSelector?: string;
  label?: string;
  introMs?: number;
  cardMs?: number;
  afterSubmitMs?: number;
  surface?: SmartBarSpeedSurface;
};

const SMARTBAR_GENERAL_MOBILE_AUTO_STEPS: SmartBarGeneralMobileAutoStep[] = [
  {
    desktopStepId: "open",
    cards: ["Example 1: **NexaPath Advisory**", "Managed IT for finance", "SmartBar generates a lead"],
    targetSelector: '[data-smartbar-mobile-launcher="true"], [data-smartbar-mobile-companion="true"]',
    label: "Open",
    introMs: 900,
    cardMs: 4200,
    afterSubmitMs: 700,
    surface: "info",
  },
  {
    desktopStepId: "hedge-fund-ask",
    query: "we're a hedge fund, need help wih IT and setting up copilots",
    cards: ["Reads intent", "moves visitor to the answer"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Ask",
    cardMs: 3300,
    afterSubmitMs: 5200,
    surface: "info",
  },
  {
    desktopStepId: "prove-it",
    query: "that doesn't say what you actually do",
    cards: ["Summarizes focus area", "Visitor asks for specifics"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Ask",
    cardMs: 5100,
    afterSubmitMs: 4200,
    surface: "info",
  },
  {
    desktopStepId: "case-studies",
    query: "__case_studies",
    cards: ["Surfaces proof points", "Offers next step"],
    targetSelector: '[data-smartbar-mobile-generic-action="show-proof"]',
    label: "Proof",
    cardMs: 3000,
    afterSubmitMs: 4800,
    surface: "info",
  },
  {
    desktopStepId: "consultant-chat",
    query: "Perfect, can I talk to someone?",
    cards: ["Provides direct chat surface", "Hands off context"],
    targetSelector: '[data-smartbar-mobile-generic-action="consultant"], [data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Handoff",
    cardMs: 3000,
    afterSubmitMs: 6200,
    surface: "info",
  },
  {
    desktopStepId: "complete-order",
    query: "dbl chzbrger combo lg friez diet coke pie",
    cards: ["Example 2: **BurgerRush**", "Direct ordering site", "Turns intent into checkout"],
    targetSelector: '[data-smartbar-mobile-generic-action="start-order"], [data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Order",
    cardMs: 3350,
    afterSubmitMs: 5600,
    surface: "ordering",
  },
  {
    desktopStepId: "checkout",
    cards: ["Plain English", "Typos included", "Cart loaded", "Checkout-ready"],
    targetSelector: '[data-smartbar-mobile-checkout="true"], [data-smartbar-mobile-companion="true"]',
    label: "Checkout",
    cardMs: 4300,
    afterSubmitMs: 2600,
    surface: "ordering",
  },
  {
    desktopStepId: "booking-complete",
    query: "Aug 4 to 9, nice room with a view and breakfast, just me",
    cards: ["Example 3: **Domi Hotel**", "Choice-heavy booking site", "Ranks best fit", "Room request has tradeoffs", "Ranks options", "stores room context"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Booking",
    cardMs: 6500,
    afterSubmitMs: 4200,
    surface: "booking",
  },
  {
    desktopStepId: "booking-next-ocean",
    query: "__booking_next",
    cards: [],
    targetSelector: '[data-smartbar-mobile-generic-action="booking-nav-next"]',
    label: "Next",
    cardMs: 400,
    afterSubmitMs: 3600,
    surface: "booking",
  },
  {
    desktopStepId: "booking-next-villa",
    query: "__booking_next",
    cards: [],
    targetSelector: '[data-smartbar-mobile-generic-action="booking-nav-next"]',
    label: "Next",
    cardMs: 400,
    afterSubmitMs: 3800,
    surface: "booking",
  },
  {
    desktopStepId: "booking-breakfast",
    query: "add breakfast",
    cards: ["Package attaches to active room"],
    targetSelector: '[data-smartbar-mobile-generic-action="add-breakfast"], [data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Add",
    cardMs: 2700,
    afterSubmitMs: 4600,
    surface: "booking",
  },
  {
    desktopStepId: "booking-summary",
    query: "prepare booking summary",
    cards: ["Package attaches to active room"],
    targetSelector: '[data-smartbar-mobile-generic-action="prepare-booking"]',
    label: "Summary",
    cardMs: 2600,
    afterSubmitMs: 5200,
    surface: "booking",
  },
  {
    desktopStepId: "booking-incomplete",
    query: "need a family room",
    cards: ["Travel dates missing", "Who's staying missing"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Dates",
    cardMs: 3000,
    afterSubmitMs: 4400,
    surface: "booking",
  },
  {
    desktopStepId: "booking-selectors",
    query: "__booking_selectors",
    cards: ["Selectors easier than typing"],
    targetSelector: '[data-smartbar-mobile-generic-action="select-dates"]',
    label: "Select",
    cardMs: 2500,
    afterSubmitMs: 4400,
    surface: "booking",
  },
  {
    desktopStepId: "booking-family-summary",
    query: "show family recommendation",
    cards: ["Context becomes booking"],
    targetSelector: '[data-smartbar-mobile-generic-action="show-family-recommendation"]',
    label: "Book",
    cardMs: 2500,
    afterSubmitMs: 5200,
    surface: "booking",
  },
  {
    desktopStepId: "finale-setup",
    cards: ["Same bar. Different jobs.", "Think of SmartBar like a caddy", "with a bag full of clubs.", "The visitor describes the shot.", "SmartBar picks the right tool."],
    targetSelector: '[data-smartbar-mobile-companion="true"]',
    label: "Toolbelt",
    cardMs: 6500,
    afterSubmitMs: 900,
    surface: "finale",
  },
  {
    desktopStepId: "finale",
    query: "show me the short version",
    cards: ["Search bar with a toolbelt"],
    targetSelector: '[data-smartbar-mobile-companion="true"]',
    label: "Finale",
    cardMs: 1800,
    afterSubmitMs: 5200,
    surface: "finale",
  },
];
function smartBarGeneralMobileReadStartIndex() {
  if (typeof window === "undefined") return 0;

  const params = new URLSearchParams(window.location.search);
  const rawStart =
    params.get("mobileDemoStart") ||
    params.get("mobileStart") ||
    params.get("mobileStep") ||
    window.sessionStorage.getItem(SMARTBAR_MOBILE_GENERAL_START_KEY) ||
    "";

  if (!rawStart) return 0;

  const normalized = rawStart.trim().toLowerCase();
  const aliases: Record<string, string> = {
    start: "open",
    nexa: "open",
    info: "open",
    proof: "case-studies",
    consultant: "consultant-chat",
    burger: "complete-order",
    burgerrush: "complete-order",
    order: "complete-order",
    ordering: "complete-order",
    checkout: "checkout",
    domi: "booking-complete",
    booking: "booking-complete",
    hotel: "booking-complete",
    nextroom: "booking-next-ocean",
    breakfast: "booking-breakfast",
    summary: "booking-summary",
    family: "booking-incomplete",
    selectors: "booking-selectors",
    finale: "finale-setup",
  };

  const requestedId = aliases[normalized] || normalized;
  const numeric = Number(requestedId);

  if (Number.isFinite(numeric)) {
    // 1-based is friendlier in a URL. 0 also works and means the first step.
    const zeroBased = numeric > 0 ? numeric - 1 : 0;
    return Math.min(Math.max(0, zeroBased), SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.length - 1);
  }

  const exactIndex = SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.findIndex(
    (step) => step.desktopStepId.toLowerCase() === requestedId,
  );

  return exactIndex >= 0 ? exactIndex : 0;
}

function smartBarGeneralMobileReadFastMode() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("mobileDemoFast") === "1" ||
    params.get("mobileFast") === "1" ||
    params.get("fast") === "1" ||
    window.sessionStorage.getItem(SMARTBAR_MOBILE_GENERAL_FAST_KEY) === "1"
  );
}

function smartBarGeneralMobileWaitMs(ms: number, fastMode: boolean) {
  if (!fastMode) return ms;
  if (ms <= 0) return 0;

  return Math.min(900, Math.max(80, Math.round(ms * 0.16)));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function smartBarGeneralElementLooksVisible(element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 1 &&
    rect.height > 1 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    Number(style.opacity || "1") > 0.02
  );
}

function smartBarGeneralFindPointerTarget(selector?: string) {
  if (typeof document === "undefined" || !selector) return null;
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return matches.find(smartBarGeneralElementLooksVisible) || null;
}


function smartBarGeneralShouldClickPointerTarget(
  target: HTMLElement | null,
  step: SmartBarGeneralMobileAutoStep,
) {
  if (!target) return false;

  if (target.closest('[data-smartbar-mobile-generic-action]')) return true;
  if (target.closest('[data-smartbar-mobile-launcher="true"]')) return true;
  if (target.closest('[data-smartbar-mobile-checkout="true"]')) return true;

  return !step.query && Boolean(target.closest('[data-smartbar-mobile-companion="true"]'));
}


function smartBarGeneralCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function smartBarGeneralCompact(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

type GeneralMobileTone = "sky" | "slate" | "emerald" | "violet" | "amber";

const GENERAL_MOBILE_TONE_CLASS: Record<GeneralMobileTone, {
  card: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
}> = {
  sky: {
    card: "border-sky-100/44 bg-sky-400/78 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(14,165,233,0.20)] ring-sky-100/30",
    icon: "bg-slate-950/88 text-sky-200 ring-slate-950/18",
    eyebrow: "text-slate-950/58",
    title: "text-slate-950",
    body: "text-slate-950/76",
  },
  slate: {
    card: "border-white/24 bg-slate-950/88 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_30px_rgba(2,6,23,0.24)] ring-white/14",
    icon: "bg-white/12 text-white ring-white/18",
    eyebrow: "text-white/46",
    title: "text-white",
    body: "text-white/72",
  },
  emerald: {
    card: "border-emerald-100/42 bg-emerald-300/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_28px_rgba(16,185,129,0.20)] ring-emerald-100/30",
    icon: "bg-slate-950/88 text-emerald-200 ring-slate-950/18",
    eyebrow: "text-slate-950/58",
    title: "text-slate-950",
    body: "text-slate-950/76",
  },
  violet: {
    card: "border-violet-100/36 bg-violet-500/82 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_30px_rgba(124,58,237,0.24)] ring-violet-100/24",
    icon: "bg-white/14 text-white ring-white/18",
    eyebrow: "text-white/56",
    title: "text-white",
    body: "text-white/76",
  },
  amber: {
    card: "border-amber-100/48 bg-amber-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_28px_rgba(245,158,11,0.20)] ring-amber-100/34",
    icon: "bg-slate-950/88 text-amber-200 ring-slate-950/18",
    eyebrow: "text-slate-950/58",
    title: "text-slate-950",
    body: "text-slate-950/76",
  },
};

function GeneralMiniCard({
  eyebrow,
  title,
  body,
  icon,
  tone = "slate",
}: {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: ReactNode;
  tone?: GeneralMobileTone;
}) {
  const toneClass = GENERAL_MOBILE_TONE_CLASS[tone];

  return (
    <div className={`rounded-[24px] border px-3.5 py-3 ring-1 ${toneClass.card}`}>
      <div className="flex items-start gap-3">
        {icon ? <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${toneClass.icon}`}>{icon}</div> : null}
        <div className="min-w-0">
          {eyebrow && (
            <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${toneClass.eyebrow}`}>
              {eyebrow}
            </div>
          )}
          <div className={`text-sm font-black leading-5 ${toneClass.title}`}>{title}</div>
          <div className={`mt-1 text-xs font-semibold leading-5 ${toneClass.body}`}>{body}</div>
        </div>
      </div>
    </div>
  );
}

type GeneralDomiRoom = {
  id: string;
  label: string;
  title: string;
  body: string;
  tone: GeneralMobileTone;
  price: string;
};

const GENERAL_DOMI_ROOMS: GeneralDomiRoom[] = [
  {
    id: "garden",
    label: "Value fit",
    title: "Garden Terrace King",
    body: "Comfortable and breakfast-compatible, but not the strongest view for this request.",
    tone: "emerald",
    price: "$239/night",
  },
  {
    id: "ocean",
    label: "Best fit",
    title: "Ocean View Suite",
    body: "Best balance of view, comfort, and breakfast compatibility without jumping to villa pricing.",
    tone: "sky",
    price: "$379/night",
  },
  {
    id: "villa",
    label: "Premium",
    title: "Coastal Villa Suite",
    body: "The strongest view and most space, but more room than this solo stay probably needs.",
    tone: "violet",
    price: "$549/night",
  },
];

function BookingContextPills() {
  const pills = [
    ["Dates", "Aug 4–9"],
    ["Guests", "1 guest"],
    ["View", "Nice view"],
    ["Breakfast", "Wanted"],
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {pills.map(([label, value]) => (
        <div
          key={label}
          className="rounded-full bg-slate-950/82 px-3 py-2 text-center text-white ring-1 ring-white/14"
        >
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/44">{label}</div>
          <div className="mt-0.5 text-[11px] font-semibold leading-none text-white/88">{value}</div>
        </div>
      ))}
    </div>
  );
}

function BookingTourContent({ step }: { step: number }) {
  const activeRoomIndex = Math.min(Math.max(step, 0), GENERAL_DOMI_ROOMS.length - 1);
  const room = GENERAL_DOMI_ROOMS[activeRoomIndex];

  return (
    <div className="space-y-3">
      <GeneralMiniCard
        eyebrow={room.label}
        title={room.title}
        body={`${room.body} ${room.price}.`}
        tone={room.tone}
        icon={<BedDouble className="h-4 w-4" />}
      />
      <BookingContextPills />
      <div className="grid grid-cols-3 gap-2">
        {GENERAL_DOMI_ROOMS.map((item, index) => (
          <div
            key={item.id}
            className={`rounded-[18px] px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${
              index === activeRoomIndex
                ? "bg-sky-300 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_8px_18px_rgba(14,165,233,0.20)] ring-sky-100/40"
                : "bg-slate-950/82 text-white/72 ring-white/14"
            }`}
            aria-label={item.title}
          >
            <span className="block text-[11px] leading-none">{index + 1}</span>
            <span className="mt-1 block truncate text-[8px] leading-none opacity-70">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingBreakfastContent() {
  return (
    <div className="space-y-3">
      <GeneralMiniCard
        eyebrow="Package attached"
        title="Breakfast Flex Plan"
        body="Breakfast is attached to the Ocean View Suite without losing the room, date, or guest context. +$32/night."
        tone="amber"
        icon={<Coffee className="h-4 w-4" />}
      />
      <BookingContextPills />
    </div>
  );
}

function BookingSummaryContent() {
  const rows: Array<[string, string, GeneralMobileTone, ReactNode]> = [
    ["Room", "Ocean View Suite", "sky", <BedDouble className="h-3.5 w-3.5" />],
    ["Add-on", "Breakfast Flex Plan", "amber", <Coffee className="h-3.5 w-3.5" />],
    ["Dates", "Aug 4–9, 2026", "violet", <CalendarDays className="h-3.5 w-3.5" />],
    ["Guests", "1 guest", "emerald", <Users className="h-3.5 w-3.5" />],
    ["Estimate", "$379/night + $32/night", "slate", <CreditCard className="h-3.5 w-3.5" />],
  ];

  return (
    <div className="space-y-2">
      {rows.map(([label, value, tone, icon]) => (
        <GeneralMiniCard
          key={label}
          eyebrow={label}
          title={value}
          body={label === "Estimate" ? "Ready for booking handoff" : "Confirmed for this stay"}
          tone={tone}
          icon={icon}
        />
      ))}
    </div>
  );
}

function BookingMissingContextContent() {
  return (
    <div className="space-y-3">
      <GeneralMiniCard
        eyebrow="Missing context"
        title="Need dates and guests"
        body="SmartBar does not guess. It pauses the booking path and asks for the fields needed before recommending a family room."
        tone="violet"
        icon={<CalendarDays className="h-4 w-4" />}
      />
      <div className="grid grid-cols-2 gap-2">
        <GeneralMiniCard
          eyebrow="Dates"
          title="Not set"
          body="Choose check-in and check-out."
          tone="amber"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <GeneralMiniCard
          eyebrow="Guests"
          title="Not set"
          body="Adults and children needed."
          tone="slate"
          icon={<Users className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function BookingSelectorsContent() {
  return (
    <div className="space-y-3">
      <GeneralMiniCard
        eyebrow="Dates selected"
        title="June 12–15, 2026"
        body="The mobile equivalent of the desktop calendar clicks: check-in and check-out are now attached to the stay."
        tone="sky"
        icon={<CalendarDays className="h-4 w-4" />}
      />
      <GeneralMiniCard
        eyebrow="Guests selected"
        title="2 adults · 2 children"
        body="The mobile equivalent of the desktop guest controls: SmartBar can now filter for family-capable rooms."
        tone="emerald"
        icon={<Users className="h-4 w-4" />}
      />
    </div>
  );
}

function FamilyRecommendationContent() {
  return (
    <div className="space-y-3">
      <GeneralMiniCard
        eyebrow="Family fit"
        title="Family Double Room"
        body="With dates and guests resolved, SmartBar turns the missing-context path into a recommendation."
        tone="sky"
        icon={<BedDouble className="h-4 w-4" />}
      />
      <GeneralMiniCard
        eyebrow="Context becomes booking"
        title="Family Comfort Bundle"
        body="The summary can now carry room, dates, guests, and package context forward."
        tone="amber"
        icon={<CreditCard className="h-4 w-4" />}
      />
    </div>
  );
}

function FinaleToolbeltContent() {
  return (
    <div className="space-y-2">
      <GeneralMiniCard
        eyebrow="Answer"
        title="Short version"
        body="SmartBar can answer directly when the visitor needs a concise explanation."
        tone="sky"
        icon={<Sparkles className="h-4 w-4" />}
      />
      <GeneralMiniCard
        eyebrow="Action choices"
        title="Next-step buttons"
        body="It can return choices when the right answer is an action path."
        tone="emerald"
        icon={<MessageSquare className="h-4 w-4" />}
      />
      <GeneralMiniCard
        eyebrow="Commerce"
        title="Cart / booking / handoff"
        body="It can switch tools without changing the bar: cart, dates, guests, summaries, and chat."
        tone="violet"
        icon={<CreditCard className="h-4 w-4" />}
      />
    </div>
  );
}

function GeneralNarratorCards({ cards }: { cards: string[] }) {
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runCards = async () => {
      if (!cards.length) {
        setActiveLane(null);
        await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
        if (cancelled) return;

        setNoticeA(null);
        setNoticeB(null);
        return;
      }

      let nextLane: SmartBarFlashCardLaneName = "a";
      setActiveLane(null);
      await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
      if (cancelled) return;

      for (let index = 0; index < cards.length; index += 1) {
        const title = cards[index]?.trim();
        if (!title) continue;

        const notice: SmartBarFlashCardNotice = {
          variant: "prelude",
          title,
        };

        if (nextLane === "a") setNoticeA(notice);
        else setNoticeB(notice);

        setActiveLane(nextLane);

        await wait(Math.max(1100, Math.min(1700, SMARTBAR_FLASH_CARD_TRANSITION_MS + 420)));
        if (cancelled) return;

        nextLane = nextLane === "a" ? "b" : "a";
      }
    };

    void runCards();

    return () => {
      cancelled = true;
    };
  }, [cards]);

  if (!cards.length && !noticeA && !noticeB) return null;

  return (
    <SmartBarFlashCardRail className="pointer-events-none !fixed inset-x-0 !top-[34%] z-[10120]">
      <SmartBarFlashCardLane active={activeLane === "a"}>
        <SmartBarFlashCard notice={noticeA} />
      </SmartBarFlashCardLane>
      <SmartBarFlashCardLane active={activeLane === "b"}>
        <SmartBarFlashCard notice={noticeB} />
      </SmartBarFlashCardLane>
    </SmartBarFlashCardRail>
  );
}

function readyGeneralCarryoutOrder(): SmartBarMobileOrderResult {
  return {
    lines: [
      {
        id: "general-double-combo",
        cartLineKey: "general-double-combo",
        targetId: "smartbar-order-cart",
        sourceItemId: "smartbar-order-cart",
        title: "Double cheeseburger combo",
        status: "ready",
        helper: "Matched and ready",
        price: "$11.99",
        details: ["Large fries", "Large Diet Coke", "No onions"],
      },
      {
        id: "general-apple-pie",
        cartLineKey: "general-apple-pie",
        targetId: "smartbar-order-menu",
        sourceItemId: "smartbar-order-menu",
        title: "Apple pie",
        status: "ready",
        helper: "Matched and ready",
        price: "$2.49",
        details: ["Warm"],
      },
      {
        id: "general-large-diet-coke",
        cartLineKey: "general-large-diet-coke",
        targetId: "smartbar-order-cart",
        sourceItemId: "smartbar-order-cart",
        title: "Large Diet Coke",
        status: "ready",
        helper: "Matched and ready",
        price: "$2.19",
        details: ["Large", "Diet Coke"],
      },
    ],
    estimatedSubtotal: "$16.67",
    estimatedTax: "$1.33",
    estimatedTotal: "$18.00",
  };
}

export default function SmartBarMobileGeneralExperience({ autoPlay = false }: SmartBarMobileGeneralExperienceProps) {
  const [surface, setSurface] = useState<SmartBarSpeedSurface>("info");
  const [bookingStep, setBookingStep] = useState(1);
  const [breakfastAdded, setBreakfastAdded] = useState(false);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const submissionIdRef = useRef(0);
  const autoPlayStartedRef = useRef(false);
  const focusSnapshotRef = useRef<MobileFocusSnapshot | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef(0);
  const [narratorCards, setNarratorCards] = useState<string[]>([]);
  const [pointer, setPointer] = useState<SmartBarFakePointerState | null>(null);

  const clearFocus = useCallback(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    const snapshot = focusSnapshotRef.current;
    if (!snapshot) return;

    snapshot.element.style.outline = snapshot.outline;
    snapshot.element.style.outlineOffset = snapshot.outlineOffset;
    snapshot.element.style.boxShadow = snapshot.boxShadow;
    snapshot.element.style.position = snapshot.position;
    snapshot.element.style.zIndex = snapshot.zIndex;
    snapshot.element.style.transition = snapshot.transition;
    snapshot.element.style.scrollMarginTop = snapshot.scrollMarginTop;
    focusSnapshotRef.current = null;
  }, []);

  const focusTarget = useCallback((targetId: string, options: { resetToTop?: boolean } = {}) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    clearFocus();

    if (options.resetToTop) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // Surface changes are state-driven. When the script moves from NexaPath to
    // BurgerRush or Domi, the new target wall does not exist until React commits
    // the next surface. Defer the lookup so the active surface is in the real
    // document flow before we scroll to a target inside it.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const escaped = smartBarGeneralCssEscape(targetId);
        const stage = document.querySelector<HTMLElement>('[data-smartbar-speed-stage="true"]');
        const target =
          stage?.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`) ||
          document.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`);

        if (!target) {
          if (options.resetToTop) {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }
          return;
        }

        target.scrollIntoView({ block: "start", behavior: "smooth" });

        focusTimerRef.current = window.setTimeout(() => {
          focusTimerRef.current = null;
          focusSnapshotRef.current = {
            element: target,
            outline: target.style.outline,
            outlineOffset: target.style.outlineOffset,
            boxShadow: target.style.boxShadow,
            position: target.style.position,
            zIndex: target.style.zIndex,
            transition: target.style.transition,
            scrollMarginTop: target.style.scrollMarginTop,
          };

          if (!target.style.position) target.style.position = "relative";
          target.style.zIndex = "60";
          target.style.scrollMarginTop = "18px";
          target.style.transition = target.style.transition
            ? `${target.style.transition}, outline 180ms ease, box-shadow 180ms ease`
            : "outline 180ms ease, box-shadow 180ms ease";
          target.style.outline = "3px solid rgba(14,165,233,0.92)";
          target.style.outlineOffset = "4px";
          target.style.boxShadow = "0 0 0 7px rgba(14,165,233,0.18), 0 22px 50px rgba(2,6,23,0.28)";
        }, 760);
      });
    });
  }, [clearFocus]);

  const submitDemoQuery = useCallback((query: string, meta?: SmartBarMobileSubmitMeta) => {
    submissionIdRef.current += 1;
    setDemoSubmission({ id: submissionIdRef.current, query, meta });
  }, []);

  const pointToStep = useCallback(async (step: SmartBarGeneralMobileAutoStep) => {
    const target = smartBarGeneralFindPointerTarget(step.targetSelector);
    if (!target) return null;

    pointerIdRef.current += 1;
    const id = pointerIdRef.current;
    setPointer(makeSmartBarFakePointerState(target, { id, label: step.label, anchorY: 0.58, offsetY: 4 }));
    await wait(360);

    setPointer(makeSmartBarFakePointerState(target, { id: id + 10000, label: step.label, phase: "pulse", anchorY: 0.58, offsetY: 4 }));
    await wait(760);
    setPointer(null);
    return target;
  }, []);

  useEffect(() => () => clearFocus(), [clearFocus]);

  useEffect(() => {
    if (!autoPlay || autoPlayStartedRef.current) return;
    autoPlayStartedRef.current = true;
    let cancelled = false;

    const run = async () => {
      const startIndex = smartBarGeneralMobileReadStartIndex();
      const fastMode = smartBarGeneralMobileReadFastMode();

      for (const step of SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.slice(startIndex)) {
        await wait(smartBarGeneralMobileWaitMs(step.introMs ?? 0, fastMode));
        if (cancelled) return;

        if (step.surface) setSurface(step.surface);
        setNarratorCards(step.cards);
        await wait(smartBarGeneralMobileWaitMs(step.cardMs ?? 2000, fastMode));
        if (cancelled) return;

        const target = await pointToStep(step);
        if (cancelled) return;

        const clickedTarget = smartBarGeneralShouldClickPointerTarget(target, step);
        if (clickedTarget) {
          target?.click();
          await wait(180);
        }

        if (step.query && !clickedTarget) {
          submitDemoQuery(step.query);
        }
        await wait(smartBarGeneralMobileWaitMs(step.afterSubmitMs ?? 5000, fastMode));
        if (cancelled) return;

        setNarratorCards([]);
      }

      await wait(smartBarGeneralMobileWaitMs(900, fastMode));
      if (!cancelled) setNarratorCards(["Same bar. Different jobs.", "Answers, carts, bookings, and handoffs."]);
    };

    void run();

    return () => {
      cancelled = true;
      setPointer(null);
      setNarratorCards([]);
    };
  }, [autoPlay, pointToStep, submitDemoQuery]);

  const buildInfoResult = useCallback((kind: "primary" | "specifics" | "proof" = "primary"): SmartBarMobileGenericResult => {
    setSurface("info");
    focusTarget(kind === "primary" ? "hedgefund-copilot" : "hedgefund-contact-cta");

    if (kind === "specifics") {
      return {
        surfaceKind: "info",
        eyebrow: "NexaPath Advisory",
        title: "What NexaPath would do",
        statusLabel: "Use cases",
        body: "Readiness review, secure Copilot rollout, agent design, and a controlled pilot for finance operations.",
        helper: "The visible page carries the detail; the bar stays compact and action-oriented.",
        actions: [
          { id: "show-proof", label: "Show relevant case studies", helper: "Surface proof points" },
          { id: "consultant", label: "Talk to consultant", variant: "secondary" },
        ],
        height: 330,
      };
    }

    if (kind === "proof") {
      return {
        surfaceKind: "info",
        eyebrow: "NexaPath Advisory",
        title: "Relevant proof points",
        statusLabel: "Proof ready",
        body: "Ops assistant, compliance evidence helper, and Copilot adoption sprint.",
        helper: "SmartBar moves from answer to proof, then to handoff.",
        actions: [
          { id: "consultant", label: "Talk to someone about Copilot support", helper: "Open the handoff surface" },
          { id: "start-order", label: "Next: ordering demo", variant: "secondary" },
        ],
        height: 330,
      };
    }

    return {
      surfaceKind: "info",
      eyebrow: "NexaPath Advisory",
      title: "Copilot journey found",
      statusLabel: "Answer ready",
      body: "For a hedge fund, SmartBar routes the visitor toward secure Copilot adoption, data readiness, compliance pressure, and operating-model fit.",
      helper: "A search bar returns links. SmartBar returns the next useful buyer step.",
      actions: [
        { id: "show-proof", label: "Show proof points", helper: "Drill into concrete examples" },
        { id: "consultant", label: "Talk to consultant", variant: "secondary" },
      ],
      height: 330,
    };
  }, [focusTarget]);

  const buildChatResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("info");
    focusTarget("hedgefund-contact-cta");

    return {
      surfaceKind: "chat",
      eyebrow: "Live handoff",
      title: "Consultant desk opened",
      statusLabel: "Chat open",
      body: "Context received — handing the hedge-fund Copilot brief to a consultant.",
      helper: "This keeps the handoff compact instead of rendering a fake chat transcript inside the shell.",
      actions: [
        { id: "start-order", label: "Next: ordering demo", helper: "Move to BurgerRush" },
      ],
      height: 330,
    };
  }, [focusTarget]);

  const buildOrderResult = useCallback((): SmartBarMobileOrderResult => {
    setSurface("ordering");
    focusTarget("smartbar-order-combo", { resetToTop: true });
    return readyGeneralCarryoutOrder();
  }, [focusTarget]);

  const buildBookingTourResult = useCallback((nextStep = bookingStep): SmartBarMobileGenericResult => {
    const safeStep = Math.min(Math.max(nextStep, 0), GENERAL_DOMI_ROOMS.length - 1);
    setBookingStep(safeStep);
    setSurface("booking");
    focusTarget("smartbar-booking-rooms", { resetToTop: true });

    const activeRoom = GENERAL_DOMI_ROOMS[safeStep];

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: activeRoom.title,
      statusLabel: activeRoom.label,
      progressLabel: "Rooms",
      progressCurrent: safeStep + 1,
      progressTotal: GENERAL_DOMI_ROOMS.length,
      content: <BookingTourContent step={safeStep} />,
      helper: "SmartBar keeps room, view, breakfast, dates, and guest context together while you compare options.",
      actions: [
        {
          id: "booking-nav-back",
          label: "Back",
          helper: `Stop ${safeStep + 1} of ${GENERAL_DOMI_ROOMS.length}`,
          variant: "back",
          disabled: safeStep === 0,
        },
        {
          id: "booking-nav-next",
          label: "Next",
          helper: safeStep >= GENERAL_DOMI_ROOMS.length - 1
            ? `Stop ${safeStep + 1} of ${GENERAL_DOMI_ROOMS.length}`
            : GENERAL_DOMI_ROOMS[safeStep + 1]?.label || `Stop ${safeStep + 2}`,
          variant: "next",
          disabled: safeStep === GENERAL_DOMI_ROOMS.length - 1,
        },
        { id: "add-breakfast", label: breakfastAdded ? "Breakfast already added" : "Add breakfast", variant: breakfastAdded ? "secondary" : "primary" },
        { id: "prepare-booking", label: "Prepare booking summary", variant: "secondary" },
      ],
      height: 570,
    };
  }, [bookingStep, breakfastAdded, focusTarget]);

  const buildBookingBreakfastResult = useCallback((): SmartBarMobileGenericResult => {
    setBreakfastAdded(true);
    setBookingStep(1);
    setSurface("booking");
    focusTarget("smartbar-booking-breakfast", { resetToTop: true });

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Breakfast added",
      statusLabel: "Add-on",
      progressLabel: "Package",
      progressCurrent: 2,
      progressTotal: 3,
      content: <BookingBreakfastContent />,
      helper: "The add-on attaches to the active stay plan instead of replacing the room recommendation.",
      actions: [
        { id: "show-rooms", label: "Review rooms", variant: "secondary" },
        { id: "prepare-booking", label: "Prepare booking summary" },
      ],
      height: 500,
    };
  }, [focusTarget]);

  const buildBookingSummaryResult = useCallback((): SmartBarMobileGenericResult => {
    setBreakfastAdded(true);
    setBookingStep(1);
    setSurface("booking");
    focusTarget("smartbar-booking-summary", { resetToTop: true });

    return {
      surfaceKind: "booking_summary",
      eyebrow: "Domi Hotel",
      title: "Booking summary ready",
      statusLabel: "Summary ready",
      content: <BookingSummaryContent />,
      actions: [
        { id: "restart-info", label: "Back to SmartBar overview", variant: "secondary" },
      ],
      height: 510,
    };
  }, [focusTarget]);

  const buildBookingMissingContextResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("smartbar-booking-context", { resetToTop: true });

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Need dates and guests",
      statusLabel: "Missing context",
      content: <BookingMissingContextContent />,
      helper: "This is the phone equivalent of the desktop selector setup: SmartBar asks for the fields required before continuing.",
      actions: [
        { id: "select-dates", label: "Set dates and guests" },
      ],
      height: 500,
    };
  }, [focusTarget]);

  const buildBookingSelectorsResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("smartbar-booking-context", { resetToTop: true });

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Dates and guests selected",
      statusLabel: "Selectors",
      content: <BookingSelectorsContent />,
      helper: "Calendar taps and guest controls are represented as selected booking context inside the mobile stretch box.",
      actions: [
        { id: "show-family-recommendation", label: "Show family recommendation" },
      ],
      height: 520,
    };
  }, [focusTarget]);

  const buildFamilyRecommendationResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("smartbar-booking-summary", { resetToTop: true });

    return {
      surfaceKind: "booking_summary",
      eyebrow: "Domi Hotel",
      title: "Family recommendation ready",
      statusLabel: "Family fit",
      content: <FamilyRecommendationContent />,
      actions: [
        { id: "restart-info", label: "Back to SmartBar overview", variant: "secondary" },
      ],
      height: 520,
    };
  }, [focusTarget]);

  const buildFinaleResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("finale");
    focusTarget("smartbar-booking-toolbelt", { resetToTop: true });

    return {
      surfaceKind: "info",
      eyebrow: "Finale",
      title: "Search bar with a toolbelt",
      statusLabel: "Toolbelt",
      content: <FinaleToolbeltContent />,
      helper: "Same bar, different jobs: answer, action choices, cart, selectors, summary, lead capture, and chat handoff.",
      actions: [
        { id: "restart-info", label: "Replay from the top", variant: "secondary" },
      ],
      height: 560,
    };
  }, [focusTarget]);

  const handleSubmitPrompt = useCallback((query: string): SmartBarMobileSubmitResult => {
    const text = smartBarGeneralCompact(query);

    if (text.includes("__case_studies") || text.includes("__nexa_proof") || text.includes("proof")) return buildInfoResult("proof");
    if (
      text.includes("specific") ||
      text.includes("actually do") ||
      text.includes("doesn't say") ||
      text.includes("doesnt say")
    ) return buildInfoResult("specifics");
    if (text.includes("consultant") || text.includes("pricing") || text.includes("talk to someone")) return buildChatResult();
    if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez") || text.includes("burger")) return buildOrderResult();
    if (text.includes("__booking_back")) return buildBookingTourResult(bookingStep - 1);
    if (text.includes("__booking_next")) return buildBookingTourResult(bookingStep + 1);
    if (text.includes("__booking_selectors")) return buildBookingSelectorsResult();
    if (text.includes("need a family room")) return buildBookingMissingContextResult();
    if (text.includes("show family recommendation")) return buildFamilyRecommendationResult();
    if (text.includes("prepare booking") || text.includes("booking summary") || text.includes("summary")) return buildBookingSummaryResult();
    if (text.includes("breakfast") || text.includes("package")) return buildBookingBreakfastResult();
    if (text.includes("show me the short version") || text.includes("toolbelt")) return buildFinaleResult();
    if (text.includes("room") || text.includes("view") || text.includes("aug") || text.includes("hotel")) return buildBookingTourResult(0);

    return buildInfoResult("primary");
  }, [
    bookingStep,
    buildBookingBreakfastResult,
    buildBookingMissingContextResult,
    buildBookingSelectorsResult,
    buildBookingSummaryResult,
    buildBookingTourResult,
    buildChatResult,
    buildFamilyRecommendationResult,
    buildFinaleResult,
    buildInfoResult,
    buildOrderResult,
  ]);

  const handleGenericAction = useCallback((action: SmartBarMobileGenericAction) => {
    if (action.disabled) return;
    if (action.id === "show-proof") submitDemoQuery("__nexa_proof");
    if (action.id === "consultant") submitDemoQuery("Perfect, can I talk to someone?");
    if (action.id === "start-order") submitDemoQuery("dbl chzbrger combo lg friez diet coke pie");
    if (action.id === "booking-back" || action.id === "booking-nav-back") submitDemoQuery("__booking_back");
    if (action.id === "booking-next" || action.id === "booking-nav-next") submitDemoQuery("__booking_next");
    if (action.id === "booking-summary") submitDemoQuery("prepare booking summary");
    if (action.id === "add-breakfast") submitDemoQuery("add breakfast");
    if (action.id === "prepare-booking") submitDemoQuery("prepare booking summary");
    if (action.id === "show-rooms") submitDemoQuery("show ocean view room");
    if (action.id === "select-dates") submitDemoQuery("__booking_selectors");
    if (action.id === "show-family-recommendation") submitDemoQuery("show family recommendation");
    if (action.id === "restart-info") submitDemoQuery("we're a hedge fund, need help with IT and setting up copilots");
  }, [submitDemoQuery]);

  return (
    <main
      data-smartbar-mobile-general="true"
      className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_16%_10%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_54%,#f8fafc_100%)] text-slate-950"
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <GeneralNarratorCards cards={narratorCards} />
      <SmartBarFakePointerOverlay pointer={pointer} />
      <section
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface={surface}
        className="relative z-10 min-h-[4200px] overflow-x-hidden px-3 pb-[640px] pt-3"
      >
        <SmartBarSpeedTargetWall surface={surface} />
      </section>
      <SmartBarMobileShell
        mode="overlay"
        entryModeLabel="Ask SmartBar"
        buildingLabel="Thinking..."
        demoSubmission={demoSubmission}
        onSubmitPrompt={handleSubmitPrompt}
        onGenericAction={handleGenericAction}
      />
    </main>
  );
}
