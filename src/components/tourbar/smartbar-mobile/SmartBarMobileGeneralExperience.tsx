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
import type { SmartBarSpeedSurface } from "../speed-demo/smartBarSpeedScript";

type SmartBarMobileGeneralExperienceProps = {
  autoPlay?: boolean;
};

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
  delayMs: number;
  query: string;
  pointerSelector?: string;
  pointerLabel?: string;
  pointerLeadMs?: number;
  pointerAnchorX?: number;
  pointerAnchorY?: number;
  pointerOffsetX?: number;
  pointerOffsetY?: number;
};

const SMARTBAR_GENERAL_MOBILE_AUTO_STEPS: SmartBarGeneralMobileAutoStep[] = [
  {
    delayMs: 1500,
    query: "we're a hedge fund, need help with IT and setting up copilots",
    pointerSelector: '[data-smartbar-mobile-launcher="true"], [data-smartbar-mobile-companion="true"]',
    pointerLabel: "Open SmartBar",
    pointerLeadMs: 820,
    pointerAnchorY: 0.64,
    pointerOffsetY: 8,
  },
  {
    delayMs: 9000,
    query: "that doesn't say what you actually do",
    pointerSelector: '[data-smartbar-mobile-generic-action="show-proof"]:not(:disabled)',
    pointerLabel: "Ask for proof",
  },
  {
    delayMs: 15000,
    query: "Perfect, can I talk to someone?",
    pointerSelector: '[data-smartbar-mobile-generic-action="consultant"]:not(:disabled)',
    pointerLabel: "Talk to consultant",
  },
  {
    delayMs: 21800,
    query: "dbl chzbrger combo lg friez diet coke pie",
    pointerSelector: '[data-smartbar-mobile-generic-action="start-order"]:not(:disabled), [data-smartbar-mobile-companion="true"]',
    pointerLabel: "Next example",
  },
  {
    delayMs: 28800,
    query: "Aug 4 to 9, nice room with a view and breakfast, just me",
    pointerSelector: '[data-smartbar-mobile-companion="true"]',
    pointerLabel: "Booking example",
    pointerAnchorY: 0.62,
    pointerOffsetY: 6,
  },
  {
    delayMs: 35600,
    query: "__booking_next",
    pointerSelector: '[data-smartbar-mobile-generic-action="booking-next"]:not(:disabled)',
    pointerLabel: "Next room",
  },
  {
    delayMs: 42400,
    query: "__booking_next",
    pointerSelector: '[data-smartbar-mobile-generic-action="booking-next"]:not(:disabled)',
    pointerLabel: "Next room",
  },
  {
    delayMs: 49200,
    query: "add breakfast",
    pointerSelector: '[data-smartbar-mobile-generic-action="add-breakfast"]:not(:disabled)',
    pointerLabel: "Add breakfast",
  },
  {
    delayMs: 56000,
    query: "prepare booking summary",
    pointerSelector: '[data-smartbar-mobile-generic-action="prepare-booking"]:not(:disabled), [data-smartbar-mobile-generic-action="booking-summary"]:not(:disabled)',
    pointerLabel: "Prepare summary",
  },
];

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

type GeneralChatRole = "smartbar" | "consultant" | "visitor";

const GENERAL_CHAT_ROLE_CLASS: Record<GeneralChatRole, {
  shell: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
}> = {
  smartbar: {
    shell: "border-sky-100/42 bg-sky-400/80 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_28px_rgba(14,165,233,0.20)] ring-sky-100/32",
    icon: "bg-slate-950/88 text-sky-200 ring-slate-950/18",
    eyebrow: "text-slate-950/52",
    title: "text-slate-950",
    body: "text-slate-950/78",
  },
  consultant: {
    shell: "border-violet-100/34 bg-violet-500/84 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_30px_rgba(124,58,237,0.24)] ring-violet-100/24",
    icon: "bg-white/14 text-white ring-white/18",
    eyebrow: "text-white/56",
    title: "text-white",
    body: "text-white/78",
  },
  visitor: {
    shell: "border-white/24 bg-[#012169] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_26px_rgba(1,33,105,0.30)] ring-white/20",
    icon: "bg-white/12 text-white ring-white/18",
    eyebrow: "text-white/52",
    title: "text-white",
    body: "text-white/78",
  },
};

function GeneralChatBubble({
  role,
  eyebrow,
  title,
  body,
  icon,
}: {
  role: GeneralChatRole;
  eyebrow: string;
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  const roleClass = GENERAL_CHAT_ROLE_CLASS[role];

  return (
    <div className={`rounded-[26px] border px-3.5 py-3 ring-1 ${roleClass.shell}`}>
      <div className="flex items-start gap-3">
        {icon ? <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${roleClass.icon}`}>{icon}</div> : null}
        <div className="min-w-0">
          <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${roleClass.eyebrow}`}>
            {eyebrow}
          </div>
          <div className={`text-sm font-semibold leading-5 ${roleClass.title}`}>{title}</div>
          <div className={`mt-1 text-xs font-normal leading-5 ${roleClass.body}`}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function ChatPreviewContent() {
  return (
    <div className="space-y-2.5">
      <GeneralChatBubble
        role="smartbar"
        eyebrow="SmartBar"
        title="Context brief"
        body="Context received — handing this to a consultant."
        icon={<Sparkles className="h-4 w-4" />}
      />
      <GeneralChatBubble
        role="consultant"
        eyebrow="Consultant desk"
        title="Handoff accepted"
        body="Hi there — I have the hedge-fund Copilot context SmartBar captured."
        icon={<MessageSquare className="h-4 w-4" />}
      />
      <GeneralChatBubble
        role="visitor"
        eyebrow="Visitor"
        title="Follow-up"
        body="Yes — curious about pricing and setup."
      />
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
  const pointerClearTimerRef = useRef<number | null>(null);
  const pointerPulseTimerRef = useRef<number | null>(null);
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

  const clearPointer = useCallback(() => {
    if (pointerClearTimerRef.current !== null) {
      window.clearTimeout(pointerClearTimerRef.current);
      pointerClearTimerRef.current = null;
    }

    if (pointerPulseTimerRef.current !== null) {
      window.clearTimeout(pointerPulseTimerRef.current);
      pointerPulseTimerRef.current = null;
    }

    setPointer(null);
  }, []);

  const showPointer = useCallback((step: SmartBarGeneralMobileAutoStep) => {
    if (typeof document === "undefined" || typeof window === "undefined" || !step.pointerSelector) return;

    if (pointerClearTimerRef.current !== null) {
      window.clearTimeout(pointerClearTimerRef.current);
      pointerClearTimerRef.current = null;
    }

    if (pointerPulseTimerRef.current !== null) {
      window.clearTimeout(pointerPulseTimerRef.current);
      pointerPulseTimerRef.current = null;
    }

    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(step.pointerSelector || "");
      if (!target) return;

      pointerIdRef.current += 1;
      const id = pointerIdRef.current;
      const pointerOptions = {
        id,
        label: step.pointerLabel,
        anchorX: step.pointerAnchorX ?? 0.56,
        anchorY: step.pointerAnchorY ?? 0.50,
        offsetX: step.pointerOffsetX ?? 0,
        offsetY: step.pointerOffsetY ?? 0,
      };

      setPointer(makeSmartBarFakePointerState(target, pointerOptions));

      pointerPulseTimerRef.current = window.setTimeout(() => {
        pointerPulseTimerRef.current = null;
        setPointer(makeSmartBarFakePointerState(target, {
          ...pointerOptions,
          phase: "pulse",
        }));
      }, 260);

      pointerClearTimerRef.current = window.setTimeout(() => {
        pointerClearTimerRef.current = null;
        setPointer(null);
      }, 1180);
    });
  }, []);

  const submitDemoQuery = useCallback((query: string, meta?: SmartBarMobileSubmitMeta) => {
    submissionIdRef.current += 1;
    setDemoSubmission({ id: submissionIdRef.current, query, meta });
  }, []);

  useEffect(() => () => {
    clearFocus();
    clearPointer();
  }, [clearFocus, clearPointer]);

  useEffect(() => {
    if (!autoPlay || autoPlayStartedRef.current) return;
    autoPlayStartedRef.current = true;

    const timers = SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.flatMap((step) => {
      const submitTimer = window.setTimeout(() => {
        clearPointer();
        submitDemoQuery(step.query);
      }, step.delayMs);

      if (!step.pointerSelector) return [submitTimer];

      const pointerTimer = window.setTimeout(
        () => showPointer(step),
        Math.max(0, step.delayMs - (step.pointerLeadMs ?? 900)),
      );

      return [pointerTimer, submitTimer];
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      clearPointer();
    };
  }, [autoPlay, clearPointer, showPointer, submitDemoQuery]);

  const buildInfoResult = useCallback((kind: "primary" | "proof" = "primary"): SmartBarMobileGenericResult => {
    setSurface("info");
    focusTarget(kind === "proof" ? "hedgefund-contact-cta" : "hedgefund-copilot");

    if (kind === "proof") {
      return {
        surfaceKind: "info",
        eyebrow: "NexaPath Advisory",
        title: "Proof points surfaced",
        statusLabel: "Proof ready",
        body: "SmartBar moves from a vague hedge-fund IT question into concrete service areas, proof points, and a sales-ready next step.",
        helper: "This is still the same response bubble — just filled with advisory-site content instead of cart rows.",
        actions: [
          { id: "consultant", label: "Talk to consultant", helper: "Open the handoff surface" },
          { id: "start-order", label: "Next: ordering demo", variant: "secondary" },
        ],
        height: 450,
      };
    }

    return {
      surfaceKind: "info",
      eyebrow: "NexaPath Advisory",
      title: "Copilot journey found",
      statusLabel: "Answer ready",
      body: "For a hedge fund, SmartBar routes the visitor toward secure Copilot adoption, data readiness, compliance pressure, and operating-model fit.",
      helper: "A normal search bar returns links. SmartBar returns the next useful buyer step.",
      actions: [
        { id: "show-proof", label: "Show proof points", helper: "Drill into concrete examples" },
        { id: "consultant", label: "Talk to consultant", variant: "secondary" },
      ],
      height: 450,
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
      content: <ChatPreviewContent />,
      actions: [
        { id: "start-order", label: "Next: ordering demo", helper: "Move to BurgerRush" },
      ],
      height: 510,
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
        { id: "booking-back", label: "Previous room", variant: "secondary", disabled: safeStep === 0 },
        { id: "booking-next", label: "Next room", disabled: safeStep === GENERAL_DOMI_ROOMS.length - 1 },
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

  const handleSubmitPrompt = useCallback((query: string): SmartBarMobileSubmitResult => {
    const text = smartBarGeneralCompact(query);

    if (
      text.includes("__nexa_proof") ||
      text.includes("proof") ||
      text.includes("specific") ||
      text.includes("actually do") ||
      text.includes("doesn't say") ||
      text.includes("doesnt say")
    ) return buildInfoResult("proof");
    if (text.includes("consultant") || text.includes("pricing") || text.includes("talk to someone")) return buildChatResult();
    if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez") || text.includes("burger")) return buildOrderResult();
    if (text.includes("__booking_back")) return buildBookingTourResult(bookingStep - 1);
    if (text.includes("__booking_next")) return buildBookingTourResult(bookingStep + 1);
    if (text.includes("prepare booking") || text.includes("booking summary") || text.includes("summary")) return buildBookingSummaryResult();
    if (text.includes("breakfast") || text.includes("package")) return buildBookingBreakfastResult();
    if (text.includes("room") || text.includes("view") || text.includes("aug") || text.includes("hotel")) return buildBookingTourResult(0);

    return buildInfoResult("primary");
  }, [bookingStep, buildBookingBreakfastResult, buildBookingSummaryResult, buildBookingTourResult, buildChatResult, buildInfoResult, buildOrderResult]);

  const handleGenericAction = useCallback((action: SmartBarMobileGenericAction) => {
    if (action.disabled) return;
    if (action.id === "show-proof") submitDemoQuery("__nexa_proof");
    if (action.id === "consultant") submitDemoQuery("Perfect, can I talk to someone?");
    if (action.id === "start-order") submitDemoQuery("dbl chzbrger combo lg friez diet coke pie");
    if (action.id === "booking-back") submitDemoQuery("__booking_back");
    if (action.id === "booking-next") submitDemoQuery("__booking_next");
    if (action.id === "booking-summary") submitDemoQuery("prepare booking summary");
    if (action.id === "add-breakfast") submitDemoQuery("add breakfast");
    if (action.id === "prepare-booking") submitDemoQuery("prepare booking summary");
    if (action.id === "show-rooms") submitDemoQuery("show ocean view room");
    if (action.id === "restart-info") submitDemoQuery("we're a hedge fund, need help with IT and setting up copilots");
  }, [submitDemoQuery]);

  return (
    <main
      data-smartbar-mobile-general="true"
      className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_16%_10%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_54%,#f8fafc_100%)] text-slate-950"
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <section
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface={surface}
        className="relative z-10 min-h-[4200px] overflow-x-hidden px-3 pb-[640px] pt-3"
      >
        <SmartBarSpeedTargetWall surface={surface} />
      </section>
      <SmartBarFakePointerOverlay pointer={pointer} />
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
