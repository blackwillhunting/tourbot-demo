import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BedDouble, CalendarDays, Coffee, CreditCard, Users } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileSubmitResult,
} from "../SmartBarMobileShell";
import SmartBarSpeedTargetWall from "../../speed-demo/SmartBarSpeedTargetWall";
import {
  SmartBarFakePointerOverlay,
  makeSmartBarFakePointerState,
  type SmartBarFakePointerState,
} from "../../speed-demo/SmartBarFakePointer";
import {
  SmartBarFlashCardStack,
  type SmartBarFlashCardStackItem,
} from "../../speed-demo/SmartBarFlashCardStack";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_CROSSOVER_MS,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../../speed-demo/SmartBarFlashCardRail";
import SmartBarBookingAdapter from "../adapters/SmartBarBookingAdapter";
import type { TourBarBookingPageId, TourBarBookingSiteAdapter } from "../../TourBarBooking";

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

type DomiMobileTone = "sky" | "slate" | "emerald" | "violet" | "amber";

type DomiNarratorCardItem = {
  id: string;
  text: string;
};

type DomiRoom = {
  id: string;
  label: string;
  title: string;
  body: string;
  tone: DomiMobileTone;
  price: string;
};

const DOMI_ROOMS: DomiRoom[] = [
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

const DOMI_ROOM_BOOKING_META: Record<string, { title: string; price: string; signal: string }> = {
  "room-garden-terrace": {
    title: "Garden Terrace King",
    price: "$239/night",
    signal: "Quiet resort feel without oceanfront pricing",
  },
  "room-ocean-view-suite": {
    title: "Ocean View Suite",
    price: "$379/night",
    signal: "Best balance of view, comfort, and breakfast compatibility",
  },
  "room-coastal-villa": {
    title: "Coastal Villa Suite",
    price: "$549/night",
    signal: "Premium villa-style stay with the strongest view",
  },
  "room-family-double": {
    title: "Family Double Room",
    price: "$249/night",
    signal: "Flexible room for families or groups",
  },
};

const DOMI_ROOM_STEP_ORDER = [
  "room-garden-terrace",
  "room-ocean-view-suite",
  "room-coastal-villa",
  "room-family-double",
];

const DOMI_PACKAGE_BOOKING_META: Record<string, { title: string; price: string; signal: string }> = {
  "package-breakfast-flex": {
    title: "Breakfast Flex Plan",
    price: "+$32/night",
    signal: "Breakfast package for the active stay",
  },
  "package-resort-parking": {
    title: "Valet Parking",
    price: "+$24/night",
    signal: "Convenient arrival and daily in/out parking",
  },
  "package-spa-credit": {
    title: "Spa Credit",
    price: "+$45/night",
    signal: "Resort add-on for pool, spa, and relaxation stays",
  },
};

const DOMI_TARGET_IDS = [
  ...DOMI_ROOM_STEP_ORDER,
  ...Object.keys(DOMI_PACKAGE_BOOKING_META),
  "smartbar-booking-summary",
  "payment-module",
];

function domiGetRoomMeta(roomId?: string | null) {
  if (!roomId) return null;
  return DOMI_ROOM_BOOKING_META[roomId] || null;
}

function domiGetPackageMeta(packageId?: string | null) {
  if (!packageId) return null;
  return DOMI_PACKAGE_BOOKING_META[packageId] || null;
}

function domiNormalizePackageIds(values?: Array<string | null | undefined> | null) {
  const seen = new Set<string>();
  return (values || [])
    .map((value) => String(value || "").trim())
    .filter((value) => value && Boolean(DOMI_PACKAGE_BOOKING_META[value]))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function domiDateFromIso(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function domiFormatDateRange(checkIn: string, checkOut: string) {
  const start = domiDateFromIso(checkIn);
  const end = domiDateFromIso(checkOut);
  if (!start || !end) return "Dates pending";

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} to ${endLabel}`;
}

function domiBookingNights(checkIn: string, checkOut: string) {
  const start = domiDateFromIso(checkIn);
  const end = domiDateFromIso(checkOut);
  if (!start || !end) return null;
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return nights > 0 ? nights : null;
}

function domiGuestLabelFromCounts(adults: number, children: number) {
  const adultCount = Math.max(1, Math.floor(adults || 1));
  const childCount = Math.max(0, Math.floor(children || 0));
  return `${adultCount} adult${adultCount === 1 ? "" : "s"}${childCount > 0 ? `, ${childCount} child${childCount === 1 ? "" : "ren"}` : ""}`;
}

function domiGuestCountsFromLabel(label: string) {
  const adults = Number(label.match(/(\d+)\s+adult/i)?.[1] || 1);
  const children = Number(label.match(/(\d+)\s+child/i)?.[1] || 0);
  return {
    adults: Math.max(1, adults || 1),
    children: Math.max(0, children || 0),
  };
}

const DOMI_TONE_CLASS: Record<DomiMobileTone, {
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

function smartBarDomiCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function smartBarDomiCompact(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}


function domiElementLooksVisible(element: HTMLElement | null) {
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

function domiFindPointerTarget(selector: string) {
  if (typeof document === "undefined") return null;
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(domiElementLooksVisible) || null;
}

function domiWait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

const DOMI_TYPE_DELAY_MS = 34;

function domiScriptedTypingWaitMs(query: string) {
  // Matches submitDemoQuery typeDelayMs, plus entry-open and safety buffer.
  return Math.max(900, query.length * DOMI_TYPE_DELAY_MS + 520);
}

function domiClickElement(element: HTMLElement) {
  const clickable = (element.closest("button") as HTMLElement | null) || element;
  clickable.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });

  // One scripted click only. The previous browser-style event stack plus .click()
  // made React handle some targets twice.
  clickable.click();
}

function DomiNarratorCards({ cards }: { cards: DomiNarratorCardItem[] }) {
  const sequenceRef = useRef(0);
  const [stackCards, setStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const activeLaneRef = useRef<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);
  const [exitHold, setExitHold] = useState(false);

  const setActiveLaneState = useCallback((lane: SmartBarFlashCardLaneName | null) => {
    activeLaneRef.current = lane;
    setActiveLane(lane);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const visibleCards = cards.map((card) => card.text.trim()).filter(Boolean);
    const sequenceId = sequenceRef.current + 1;
    sequenceRef.current = sequenceId;

    const clearAll = async () => {
      setExitHold(true);
      setActiveLaneState(null);
      setStackCards([]);

      await domiWait(SMARTBAR_FLASH_CARD_CROSSOVER_MS + 260);
      if (cancelled || sequenceRef.current !== sequenceId) return;

      setNoticeA(null);
      setNoticeB(null);
      setExitHold(false);
    };

    const runCards = async () => {
      if (!visibleCards.length) {
        await clearAll();
        return;
      }

      setExitHold(true);

      if (visibleCards.length > 1) {
        setActiveLaneState(null);
        setNoticeA(null);
        setNoticeB(null);
        setStackCards([]);

        const nextStack: SmartBarFlashCardStackItem[] = [];
        for (let index = 0; index < visibleCards.length; index += 1) {
          if (cancelled || sequenceRef.current !== sequenceId) return;

          nextStack.push({
            id: `${sequenceId}-${index}-${visibleCards[index]}`,
            variant: "prelude",
            title: visibleCards[index],
            density: visibleCards.length >= 4 ? "micro" : "compact",
          });

          setStackCards([...nextStack]);
          await domiWait(760);
        }

        return;
      }

      setStackCards([]);
      const notice: SmartBarFlashCardNotice = {
        variant: "prelude",
        title: visibleCards[0],
      };

      const nextLane: SmartBarFlashCardLaneName = activeLaneRef.current === "a" ? "b" : "a";
      if (nextLane === "a") setNoticeA(notice);
      else setNoticeB(notice);

      setActiveLaneState(nextLane);
    };

    void runCards();

    return () => {
      cancelled = true;
    };
  }, [cards, setActiveLaneState]);

  if (!cards.length && !noticeA && !noticeB && !stackCards.length && !exitHold) return null;

  return (
    <SmartBarFlashCardRail className="pointer-events-none !fixed !left-0 !right-0 !top-[33%] z-[10130] !w-full origin-top scale-[1.24] sm:!top-[31%] lg:!top-[32%]">
      <SmartBarFlashCardStack cards={stackCards} mode={stackCards.length >= 4 ? "flurry" : "standard"} align="center" />
      <SmartBarFlashCardLane active={activeLane === "a"} align="center">
        <SmartBarFlashCard notice={noticeA} />
      </SmartBarFlashCardLane>
      <SmartBarFlashCardLane active={activeLane === "b"} align="center">
        <SmartBarFlashCard notice={noticeB} />
      </SmartBarFlashCardLane>
    </SmartBarFlashCardRail>
  );
}

function DomiMiniCard({
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
  tone?: DomiMobileTone;
}) {
  const toneClass = DOMI_TONE_CLASS[tone];

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

function DomiContextPills() {
  const pills = [
    ["Dates", "Aug 4–9", "sky"],
    ["Guests", "1 guest", "violet"],
    ["View", "Ocean", "emerald"],
    ["Meal", "Breakfast", "amber"],
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2">
      {pills.map(([label, value, tone]) => {
        const toneClass = DOMI_TONE_CLASS[tone];
        return (
          <div key={label} className={`rounded-full border px-3 py-2 text-center ring-1 ${toneClass.card}`}>
            <div className={`text-[9px] font-black uppercase tracking-[0.14em] ${toneClass.eyebrow}`}>{label}</div>
            <div className={`mt-0.5 truncate text-[12px] font-black ${toneClass.title}`}>{value}</div>
          </div>
        );
      })}
    </div>
  );
}

function DomiRoomRecommendationContent({ activeRoomIndex }: { activeRoomIndex: number }) {
  const room = DOMI_ROOMS[Math.min(Math.max(activeRoomIndex, 0), DOMI_ROOMS.length - 1)];

  return (
    <div className="space-y-3">
      <DomiMiniCard
        eyebrow={room.label}
        title={room.title}
        body={`${room.body} ${room.price}.`}
        tone={room.tone}
        icon={<BedDouble className="h-4 w-4" />}
      />
      <DomiContextPills />
      <div className="grid grid-cols-3 gap-2">
        {DOMI_ROOMS.map((item, index) => (
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

function DomiBreakfastContent() {
  return (
    <div className="space-y-3">
      <DomiMiniCard
        eyebrow="Package attached"
        title="Breakfast Flex Plan"
        body="Breakfast is attached to the Ocean View Suite without losing the room, date, or guest context. +$32/night."
        tone="amber"
        icon={<Coffee className="h-4 w-4" />}
      />
      <DomiContextPills />
    </div>
  );
}

function DomiBookingSummaryContent() {
  const rows: Array<[string, string, DomiMobileTone, ReactNode]> = [
    ["Room", "Ocean View Suite", "sky", <BedDouble className="h-3.5 w-3.5" />],
    ["Add-on", "Breakfast Flex Plan", "amber", <Coffee className="h-3.5 w-3.5" />],
    ["Dates", "Aug 4–9, 2026", "violet", <CalendarDays className="h-3.5 w-3.5" />],
    ["Guests", "1 guest", "emerald", <Users className="h-3.5 w-3.5" />],
    ["Estimate", "$379/night + $32/night", "slate", <CreditCard className="h-3.5 w-3.5" />],
  ];

  return (
    <div className="space-y-2">
      {rows.map(([label, value, tone, icon]) => (
        <DomiMiniCard
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

type DomiMobileExperienceProps = {
  demoFixtureMode?: boolean;
  autoPlay?: boolean;
};

export default function DomiMobileExperience({ demoFixtureMode = false, autoPlay = false }: DomiMobileExperienceProps) {
  const domiQueryParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const requestedDomiScenario = domiQueryParams?.get("domiScenario") || domiQueryParams?.get("scenario");
  const startAtScenario2 = requestedDomiScenario === "2";
  const queryRequestedAutoPlay =
    Boolean(domiQueryParams) &&
    (domiQueryParams?.get("demo") === "1" ||
      domiQueryParams?.get("autoplay") === "1" ||
      startAtScenario2);
  const effectiveAutoPlay = autoPlay || queryRequestedAutoPlay;
  const effectiveDemoFixtureMode = demoFixtureMode || queryRequestedAutoPlay;
  const focusSnapshotRef = useRef<MobileFocusSnapshot | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const submissionIdRef = useRef(0);
  const domiPointerIdRef = useRef(0);
  const autoPlayStartedRef = useRef(false);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [pointer, setPointer] = useState<SmartBarFakePointerState | null>(null);
  const [narratorCards, setNarratorCards] = useState<DomiNarratorCardItem[]>([]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(1);
  const [breakfastAdded, setBreakfastAdded] = useState(false);
  const [currentPage, setCurrentPage] = useState<TourBarBookingPageId>("home");
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [datesSelected, setDatesSelected] = useState(false);
  const [guestsSelected, setGuestsSelected] = useState(false);
  const [guestAdults, setGuestAdults] = useState(1);
  const [guestChildren, setGuestChildren] = useState(0);
  const [guestLabel, setGuestLabel] = useState("1 adult");
  const [budgetBand, setBudgetBand] = useState("");
  const [checkInDate, setCheckInDate] = useState("2026-08-04");
  const [checkOutDate, setCheckOutDate] = useState("2026-08-09");
  const [, setActiveFormSpotlight] = useState<"guests" | null>(null);
  const [, setBookingRailSpotlight] = useState(false);

  const tourBarBookingSite = useMemo<TourBarBookingSiteAdapter>(() => ({
    currentPage,
    activeAnchor,
    targetIds: DOMI_TARGET_IDS,
    roomStepOrder: DOMI_ROOM_STEP_ORDER,
    selectedRoom,
    selectedPackages,
    datesSelected,
    guestsSelected,
    guestAdults,
    guestChildren,
    guestLabel,
    budgetBand,
    checkInDate,
    checkOutDate,
    setCurrentPage,
    setActiveAnchor,
    setSelectedRoom,
    setSelectedPackages,
    setDatesSelected,
    setGuestsSelected,
    setGuestAdults,
    setGuestChildren,
    setGuestLabel,
    setBudgetBand,
    setCheckInDate,
    setCheckOutDate,
    setActiveFormSpotlight,
    setBookingRailSpotlight,
    getRoomMeta: domiGetRoomMeta,
    getPackageMeta: domiGetPackageMeta,
    normalizePackageIds: domiNormalizePackageIds,
    formatDateRange: domiFormatDateRange,
    bookingNights: domiBookingNights,
    guestLabelFromCounts: domiGuestLabelFromCounts,
    guestCountsFromLabel: domiGuestCountsFromLabel,
  }), [
    activeAnchor,
    budgetBand,
    checkInDate,
    checkOutDate,
    currentPage,
    datesSelected,
    guestAdults,
    guestChildren,
    guestLabel,
    guestsSelected,
    selectedPackages,
    selectedRoom,
  ]);

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

  const focusTarget = useCallback((targetId: string) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    clearFocus();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const escaped = smartBarDomiCssEscape(targetId);
        const stage = document.querySelector<HTMLElement>('[data-smartbar-speed-stage="true"]');
        const target =
          stage?.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`) ||
          document.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`);

        if (!target) return;

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

  const submitDemoQuery = useCallback((query: string) => {
    submissionIdRef.current += 1;
    setDemoSubmission({
      id: submissionIdRef.current,
      query,
      typing: true,
      typeDelayMs: DOMI_TYPE_DELAY_MS,
      submitDelayMs: 60000,
      manualSubmit: true,
    });
  }, []);


  const pointToSelector = useCallback(async (selector: string, label: string, options: { click?: boolean; waitForMs?: number } = {}) => {
    const startedAt = Date.now();
    let target: HTMLElement | null = null;

    while (Date.now() - startedAt < (options.waitForMs ?? 5000)) {
      target = domiFindPointerTarget(selector);
      if (target) break;
      await domiWait(120);
    }

    if (!target) return null;

    domiPointerIdRef.current += 1;
    const id = domiPointerIdRef.current;

    setPointer(makeSmartBarFakePointerState(target, {
      id,
      label,
      anchorX: 0.5,
      anchorY: 0.5,
    }));
    await domiWait(720);

    setPointer(makeSmartBarFakePointerState(target, {
      id,
      label,
      phase: "pulse",
      anchorX: 0.5,
      anchorY: 0.5,
    }));
    await domiWait(1040);

    if (options.click) {
      domiClickElement(target);
      await domiWait(650);
    }

    setPointer(null);
    return target;
  }, []);

  const runDomiAction = useCallback((actionId: string) => {
    window.dispatchEvent(
      new CustomEvent("smartbar-mobile-domi-demo-preaction", {
        detail: { actionId },
      }),
    );

    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("smartbar-mobile-domi-demo-action", {
          detail: { actionId },
        }),
      );
    }, 120);
  }, []);

  const openDomiEntry = useCallback((options: { reset?: boolean } = {}) => {
    window.dispatchEvent(new CustomEvent("smartbar-mobile-domi-open-entry", {
      detail: { reset: Boolean(options.reset) },
    }));
  }, []);

  const showDomiCards = useCallback(async (cards: string[], durationMs = 2400) => {
    const visibleCards = cards.map((card) => card.trim()).filter(Boolean);

    if (!visibleCards.length) {
      setNarratorCards([]);
      return;
    }

    setNarratorCards(
      visibleCards.map((card, index) => ({
        id: `${Date.now()}-${index}-${card}`,
        text: card,
      })),
    );

    await domiWait(durationMs);
    setNarratorCards([]);
    await domiWait(180);
  }, []);


  useEffect(() => {
    if (!effectiveAutoPlay || autoPlayStartedRef.current) return;
    autoPlayStartedRef.current = true;

    let cancelled = false;

    const run = async () => {
      await domiWait(900);
      if (cancelled) return;

      if (startAtScenario2) {
        await pointToSelector('[data-smartbar-mobile-launcher="true"], [data-smartbar-mobile-companion="true"]', "Open", {
          click: true,
          waitForMs: 6000,
        });
        if (cancelled) return;

        await domiWait(700);
        if (cancelled) return;
      } else {
      // start
      await showDomiCards(["Domi Hotel", "SmartBar compares stay options"], 3400);
      if (cancelled) return;

      // → tap launcher
      await pointToSelector('[data-smartbar-mobile-launcher="true"], [data-smartbar-mobile-companion="true"]', "Open", {
        click: true,
        waitForMs: 6000,
      });
      if (cancelled) return;

      // ↓ type initial prompt - complete
      await domiWait(500);
      const initialPrompt = "Aug 4 to 9, has to have a view, would like see lowest and highest price-wise, just me traveling";
      submitDemoQuery(initialPrompt);
      await domiWait(domiScriptedTypingWaitMs(initialPrompt));
      if (cancelled) return;

      // → tap submit
      await pointToSelector('[data-smartbar-mobile-submit="true"]', "Ask", {
        click: true,
        waitForMs: 9000,
      });
      if (cancelled) return;

      // ↓ room candidates are staged in the stay cart; the navigator guides the current match set.
      await domiWait(2000);
      if (cancelled) return;

      await showDomiCards(["Key data tiles green", "Focus shifts to room"], 3200);
      if (cancelled) return;

      await showDomiCards(["3 room recommendations", "Use Next to go thru"], 3200);
      if (cancelled) return;

      await domiWait(2000);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-generic-action="booking-nav-next"]', "Next", {
        click: false,
        waitForMs: 5200,
      });
      runDomiAction("booking-nav-next");
      await domiWait(2100);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-generic-action="booking-nav-next"]', "Next", {
        click: false,
        waitForMs: 5200,
      });
      runDomiAction("booking-nav-next");
      await domiWait(2300);
      if (cancelled) return;

      // ↓ tap the Coastal Villa preview tile so the shell opens the focus panel and navigates to the room.
      await showDomiCards(["Select room", "SmartBar jumps to Coastal Villa"], 3200);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-content-action="booking-focus-room-preview"]', "Preview", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-focus-room-preview");
      await domiWait(4600);
      if (cancelled) return;

      await showDomiCards(["Extra detail added in header"], 2400);
      if (cancelled) return;

      await domiWait(5000);
      if (cancelled) return;

      // ↓ click the pencil first, then type 'add breakfast'; this refines the same room set.
      await pointToSelector('[data-smartbar-mobile-generic-action="booking-edit-room-search"]', "Edit", {
        click: true,
        waitForMs: 7000,
      });
      await domiWait(1700);
      if (cancelled) return;

      const breakfastPrompt = "add breakfast";
      submitDemoQuery(breakfastPrompt);
      await domiWait(domiScriptedTypingWaitMs(breakfastPrompt));
      if (cancelled) return;

      // → tap submit
      await pointToSelector('[data-smartbar-mobile-submit="true"]', "Ask", {
        click: true,
        waitForMs: 9000,
      });
      if (cancelled) return;

      await showDomiCards(["Breakfast package added to each room", "Estimate updated"], 3200);
      if (cancelled) return;

      // Breakfast refines the same set; tap through the updated candidates before choosing.
      await pointToSelector('[data-smartbar-mobile-generic-action="booking-nav-next"]', "Next", {
        click: false,
        waitForMs: 5200,
      });
      runDomiAction("booking-nav-next");
      await domiWait(1900);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-generic-action="booking-nav-next"]', "Next", {
        click: false,
        waitForMs: 5200,
      });
      runDomiAction("booking-nav-next");
      await domiWait(2100);
      if (cancelled) return;

      await showDomiCards(["Commit to a room", "Preview flips to green"], 3200);
      if (cancelled) return;

      // → add the currently previewed room
      await pointToSelector('[data-smartbar-mobile-generic-action="booking-add-room"]', "Add room", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-add-room");
      if (cancelled) return;

      await domiWait(3600);
      if (cancelled) return;

      await showDomiCards(["Room now set", "Focus shifts to packages", "Review is required"], 3600);
      if (cancelled) return;

      // → open packages panel; breakfast is preselected, then review/close the panel.
      await pointToSelector('[data-smartbar-mobile-content-action="booking-review-packages"], [data-smartbar-mobile-generic-action="booking-review-packages"]', "Packages", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-review-packages");
      await domiWait(2600);
      if (cancelled) return;

      // ↓ tap the selected breakfast package so the focus panel navigates to that package section.
      await showDomiCards(["Breakfast preselected", "Tap to see it"], 2800);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-content-action="booking-focus-package-package-breakfast-flex"], [data-smartbar-mobile-content-action="booking-focus-package"]', "Breakfast", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-focus-package-package-breakfast-flex");
      await domiWait(4600);
      if (cancelled) return;

      await domiWait(3000);
      if (cancelled) return;

      await showDomiCards(["No other packages of interest"], 2400);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-companion="true"]', "Done", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-packages-done");
      if (cancelled) return;

      await domiWait(3600);
      if (cancelled) return;

      await showDomiCards(["All items green", "Ready to book"], 3000);
      if (cancelled) return;

      // → tap to book
      await pointToSelector('[data-smartbar-mobile-companion="true"]', "Book", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-summary");
      if (cancelled) return;

      // ↓ open booking summary
      await domiWait(5200);
      if (cancelled) return;

      await domiWait(3000);
      if (cancelled) return;

      // ↓ close booking summary and start a clean second search
      openDomiEntry({ reset: true });
      await domiWait(1100);
      if (cancelled) return;
      }

      // ↓ type 2nd prompt - incomplete dates/guests; spa and price range are included.
      await showDomiCards(["Next search", "Key details missing"], 3200);
      if (cancelled) return;

      const familyPrompt = "Need a family-friendly room with spa privileges included, I want to spend between $275 to $325 per night";
      submitDemoQuery(familyPrompt);
      await domiWait(domiScriptedTypingWaitMs(familyPrompt));
      if (cancelled) return;

      await domiWait(1500);
      if (cancelled) return;

      // → tap submit
      await pointToSelector('[data-smartbar-mobile-submit="true"]', "Ask", {
        click: true,
        waitForMs: 9000,
      });
      if (cancelled) return;

      // ↓ open calendar
      await domiWait(2800);
      if (cancelled) return;

      await showDomiCards(["Dates and guests required", "Selectors faster than typing"], 3200);
      if (cancelled) return;

      await domiWait(1000);
      if (cancelled) return;

      // → tap checkin date
      await pointToSelector('[data-tourbar-calendar-date="2026-06-12"], button[aria-label="Select 2026-06-12"]', "Check-in", {
        click: true,
        waitForMs: 7000,
      });
      if (cancelled) return;

      await domiWait(420);
      if (cancelled) return;

      // → tap checkout date
      await pointToSelector('[data-tourbar-calendar-date="2026-06-15"], button[aria-label="Select 2026-06-15"]', "Check-out", {
        click: true,
        waitForMs: 7000,
      });
      if (cancelled) return;

      // ↓ checkout date confirms dates and opens guest picker
      await domiWait(1200);
      if (cancelled) return;

      // → tap adult
      await pointToSelector('[data-tourbar-guest-control="adults-increment"], button[aria-label="Increase adults"]', "Adult", {
        click: true,
        waitForMs: 7000,
      });
      if (cancelled) return;

      await domiWait(420);
      if (cancelled) return;

      // → tap child
      await pointToSelector('[data-tourbar-guest-control="children-increment"], button[aria-label="Increase kids"], button[aria-label="Increase children"]', "Child", {
        click: true,
        waitForMs: 7000,
      });
      if (cancelled) return;

      await domiWait(700);
      if (cancelled) return;

      // → tap continue to confirm guests
      await pointToSelector('[data-smartbar-mobile-generic-action="booking-context-continue"], [data-smartbar-mobile-content-action="booking-context-continue"]', "Continue", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-context-continue");
      await domiWait(2600);
      if (cancelled) return;

      // ↓ two room matches appear with the spa package preselected.
      await showDomiCards(["2 room matches", "Spa already selected"], 3200);
      if (cancelled) return;

      // → move from Garden Terrace to Family Double
      await pointToSelector('[data-smartbar-mobile-generic-action="booking-nav-next"]', "Next", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-nav-next");
      await domiWait(2300);
      if (cancelled) return;

      // ↓ hold on Family Double candidate
      await domiWait(2500);
      if (cancelled) return;

      // → go back to Garden Terrace
      await pointToSelector('[data-smartbar-mobile-generic-action="booking-nav-back"]', "Back", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-nav-back");
      await domiWait(2300);
      if (cancelled) return;

      // ↓ preview Garden Terrace and select it.
      await showDomiCards(["Check out Garden Terrace", "SmartBar jumps to the room"], 3000);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-content-action="booking-focus-room-preview"]', "Preview", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-focus-room-preview");
      await domiWait(4300);
      if (cancelled) return;

      // ↓ hold on Garden Terrace spotlight
      await domiWait(2500);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-generic-action="booking-add-room"]', "Add room", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-add-room");
      await domiWait(2600);
      if (cancelled) return;

      await showDomiCards(["Room set", "Package review next", "This is required"], 3600);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-content-action="booking-review-packages"], [data-smartbar-mobile-generic-action="booking-review-packages"]', "Packages", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-review-packages");
      await domiWait(2300);
      if (cancelled) return;

      await showDomiCards(["Spa preselected", "Parking also looks good", "SmartBar has upsold"], 3800);
      if (cancelled) return;

      await domiWait(2000);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-content-action="booking-package-toggle-package-resort-parking"]', "Parking", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-package-toggle-package-resort-parking");
      await domiWait(4600);
      if (cancelled) return;

      // ↓ hold on Valet Parking spotlight
      await domiWait(2000);
      if (cancelled) return;

      window.dispatchEvent(new CustomEvent("smartbar:adaptive-rail-reset"));
      await domiWait(520);
      if (cancelled) return;

      await pointToSelector('[data-smartbar-mobile-companion="true"]', "Done", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-packages-done");
      await domiWait(3000);
      if (cancelled) return;

      await showDomiCards(["All green", "Ready to book"], 3200);
      if (cancelled) return;

      // → tap footer to open the booking summary
      await pointToSelector('[data-smartbar-mobile-companion="true"]', "Book", {
        click: false,
        waitForMs: 7000,
      });
      runDomiAction("booking-summary");
      if (cancelled) return;

      // ↓ open booking summary
      await domiWait(5200);
      if (cancelled) return;

      // ↓ close booking summary
      openDomiEntry({ reset: true });
      setPointer(null);

      // Route handoff to the standalone mobile finale.
      await domiWait(1100);
      if (cancelled) return;
      window.location.assign("/local-smartbar-finale?from=domi&t=mobile-finale");
    };

    void run();

    return () => {
      cancelled = true;
      autoPlayStartedRef.current = false;
      setPointer(null);
      setNarratorCards([]);
    };
  }, [effectiveAutoPlay, openDomiEntry, pointToSelector, runDomiAction, showDomiCards, startAtScenario2, submitDemoQuery]);


  useEffect(() => () => clearFocus(), [clearFocus]);

  const buildRoomResult = useCallback((roomIndex = activeRoomIndex): SmartBarMobileGenericResult => {
    const safeRoomIndex = Math.min(Math.max(roomIndex, 0), DOMI_ROOMS.length - 1);
    setActiveRoomIndex(safeRoomIndex);
    focusTarget("smartbar-booking-rooms");

    const activeRoom = DOMI_ROOMS[safeRoomIndex];

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: activeRoom.title,
      statusLabel: activeRoom.label,
      progressLabel: "Rooms",
      progressCurrent: safeRoomIndex + 1,
      progressTotal: DOMI_ROOMS.length,
      content: <DomiRoomRecommendationContent activeRoomIndex={safeRoomIndex} />,
      helper: "SmartBar keeps room, view, breakfast, dates, and guest context together while you compare options.",
      actions: [
        { id: "prev-room", label: "Previous room", variant: "secondary", disabled: safeRoomIndex === 0 },
        { id: "next-room", label: "Next room", disabled: safeRoomIndex === DOMI_ROOMS.length - 1 },
        { id: "add-breakfast", label: breakfastAdded ? "Breakfast already added" : "Add breakfast", variant: breakfastAdded ? "secondary" : "primary" },
        { id: "prepare-booking", label: "Prepare booking summary", variant: "secondary" },
      ],
      height: 570,
    };
  }, [activeRoomIndex, breakfastAdded, focusTarget]);

  const buildBreakfastResult = useCallback((): SmartBarMobileGenericResult => {
    setBreakfastAdded(true);
    setActiveRoomIndex(1);
    focusTarget("smartbar-booking-breakfast");

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Breakfast added",
      statusLabel: "Add-on",
      progressLabel: "Package",
      progressCurrent: 2,
      progressTotal: 3,
      content: <DomiBreakfastContent />,
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
    setActiveRoomIndex(1);
    focusTarget("smartbar-booking-summary");

    return {
      surfaceKind: "booking_summary",
      eyebrow: "Domi Hotel",
      title: "Booking summary ready",
      statusLabel: "Summary",
      content: <DomiBookingSummaryContent />,
      helper: "This is the clean handoff package: selected room, add-on, dates, guests, and pricing context.",
      actions: [
        { id: "show-rooms", label: "Back to room options", variant: "secondary" },
      ],
      height: 570,
    };
  }, [focusTarget]);

  const handleSubmitPrompt = useCallback((query: string): SmartBarMobileSubmitResult => {
    const text = smartBarDomiCompact(query);

    if (text.includes("summary") || text.includes("book") || text.includes("reserve") || text.includes("prepare")) return buildBookingSummaryResult();
    if (text.includes("breakfast") || text.includes("package") || text.includes("add-on") || text.includes("addon")) return buildBreakfastResult();
    if (text.includes("villa") || text.includes("premium") || text.includes("expensive")) return buildRoomResult(2);
    if (text.includes("garden") || text.includes("cheap") || text.includes("value")) return buildRoomResult(0);
    if (text.includes("next")) return buildRoomResult(Math.min(activeRoomIndex + 1, DOMI_ROOMS.length - 1));
    if (text.includes("previous") || text.includes("back")) return buildRoomResult(Math.max(activeRoomIndex - 1, 0));

    return buildRoomResult(1);
  }, [activeRoomIndex, buildBookingSummaryResult, buildBreakfastResult, buildRoomResult]);

  const handleGenericAction = useCallback((action: SmartBarMobileGenericAction) => {
    if (action.disabled) return;
    if (action.id === "prev-room") submitDemoQuery("previous room");
    if (action.id === "next-room") submitDemoQuery("next room");
    if (action.id === "add-breakfast") submitDemoQuery("add breakfast");
    if (action.id === "prepare-booking") submitDemoQuery("prepare booking summary");
    if (action.id === "show-rooms") submitDemoQuery("show ocean view room");
  }, [submitDemoQuery]);

  return (
    <main
      data-smartbar-mobile-domi-playground="true"
      className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_16%_10%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_54%,#f8fafc_100%)] text-slate-950"
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <DomiNarratorCards cards={narratorCards} />
      <SmartBarFakePointerOverlay pointer={pointer} />
      <section
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface="booking"
        className="relative z-10 min-h-[4200px] overflow-x-hidden px-3 pb-[640px] pt-3"
      >
        <SmartBarSpeedTargetWall surface="booking" />
      </section>
      {effectiveDemoFixtureMode ? (
        <SmartBarBookingAdapter site={tourBarBookingSite} demoFixtureMode demoSubmission={demoSubmission} />
      ) : (
        <SmartBarMobileShell
          mode="overlay"
          entryModeLabel="Ask SmartBar"
          buildingLabel="Thinking..."
          demoSubmission={demoSubmission}
          onSubmitPrompt={handleSubmitPrompt}
          onGenericAction={handleGenericAction}
        />
      )}
    </main>
  );
}
