import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BedDouble, CalendarDays, CreditCard, MessageSquare, Sparkles, Users } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
  type SmartBarMobileSubmitResult,
} from "./SmartBarMobileShell";
import SmartBarSpeedTargetWall from "../speed-demo/SmartBarSpeedTargetWall";
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

const SMARTBAR_GENERAL_MOBILE_AUTO_STEPS = [
  { delayMs: 900, query: "we're a hedge fund, need help with IT and setting up copilots" },
  { delayMs: 7800, query: "Perfect, can I talk to someone?" },
  { delayMs: 14600, query: "dbl chzbrger combo lg friez diet coke pie" },
  { delayMs: 21800, query: "Aug 4 to 9, nice room with a view and breakfast, just me" },
  { delayMs: 28800, query: "add breakfast" },
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

function ChatPreviewContent() {
  return (
    <div className="space-y-2.5">
      <GeneralMiniCard
        eyebrow="SmartBar"
        title="Context brief"
        body="Context received — handing this to a consultant."
        tone="sky"
        icon={<Sparkles className="h-4 w-4" />}
      />
      <GeneralMiniCard
        eyebrow="Consultant desk"
        title="Handoff accepted"
        body="Hi there — You’re interested in Copilots? I have the hedge-fund context SmartBar captured."
        tone="violet"
        icon={<MessageSquare className="h-4 w-4" />}
      />
      <GeneralMiniCard
        eyebrow="Visitor"
        title="Follow-up"
        body="Yes, curious about pricing and what setup would look like."
        tone="slate"
      />
    </div>
  );
}

function BookingTourContent({ step }: { step: number }) {
  const steps = [
    {
      title: "Garden Terrace King",
      body: "Best value recommendation. Good comfort and breakfast-compatible, but not the strongest view.",
    },
    {
      title: "Ocean View Suite",
      body: "Best fit for view + breakfast without jumping to villa pricing.",
    },
    {
      title: "Coastal Villa Suite",
      body: "Premium view and space, but a higher price tier than the request needs.",
    },
  ];
  const active = steps[Math.min(Math.max(step, 0), steps.length - 1)];

  return (
    <div className="space-y-3">
      <GeneralMiniCard
        eyebrow="Recommended room"
        title={active.title}
        body={active.body}
        tone={step === 0 ? "emerald" : step === 1 ? "sky" : "violet"}
        icon={<BedDouble className="h-4 w-4" />}
      />
      <div className="grid grid-cols-3 gap-2">
        {steps.map((item, index) => (
          <div
            key={item.title}
            className={`rounded-[18px] px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${
              index === step
                ? "bg-sky-300 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_8px_18px_rgba(14,165,233,0.20)] ring-sky-100/40"
                : "bg-slate-950/82 text-white/72 ring-white/14"
            }`}
            aria-label={item.title}
          >
            <span className="block text-[11px] leading-none">{index + 1}</span>
            <span className="mt-1 block truncate text-[8px] leading-none opacity-70">{index === 0 ? "Value" : index === 1 ? "View" : "Villa"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingSummaryContent() {
  const rows: Array<[string, string, GeneralMobileTone, ReactNode]> = [
    ["Room", "Ocean View Suite", "sky", <BedDouble className="h-3.5 w-3.5" />],
    ["Add-on", "Breakfast Flex Plan", "emerald", <Sparkles className="h-3.5 w-3.5" />],
    ["Dates", "Aug 4–9, 2026", "violet", <CalendarDays className="h-3.5 w-3.5" />],
    ["Guests", "1 guest", "amber", <Users className="h-3.5 w-3.5" />],
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
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const submissionIdRef = useRef(0);
  const autoPlayStartedRef = useRef(false);
  const focusSnapshotRef = useRef<MobileFocusSnapshot | null>(null);
  const focusTimerRef = useRef<number | null>(null);

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

  useEffect(() => () => clearFocus(), [clearFocus]);

  useEffect(() => {
    if (!autoPlay || autoPlayStartedRef.current) return;
    autoPlayStartedRef.current = true;

    const timers = SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.map((step) =>
      window.setTimeout(() => submitDemoQuery(step.query), step.delayMs),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [autoPlay, submitDemoQuery]);

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
    focusTarget("section-combos", { resetToTop: true });
    return readyGeneralCarryoutOrder();
  }, [focusTarget]);

  const buildBookingTourResult = useCallback((nextStep = bookingStep): SmartBarMobileGenericResult => {
    const safeStep = Math.min(Math.max(nextStep, 0), 2);
    setBookingStep(safeStep);
    setSurface("booking");
    focusTarget(safeStep === 0 ? "room-finder" : safeStep === 1 ? "package-breakfast-flex" : "booking-summary-card", { resetToTop: true });

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Room path ranked",
      statusLabel: "Tour mode",
      progressLabel: "Tour",
      progressCurrent: safeStep + 1,
      progressTotal: 3,
      content: <BookingTourContent step={safeStep} />,
      actions: [
        { id: "booking-back", label: "Back", variant: "secondary", disabled: safeStep === 0 },
        { id: "booking-next", label: safeStep >= 2 ? "Prepare booking summary" : "Next room", helper: safeStep >= 2 ? "Package the choice" : "Continue tour" },
      ],
      height: 530,
    };
  }, [bookingStep, focusTarget]);

  const buildBookingSummaryResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("booking-summary-card", { resetToTop: true });

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

    if (text.includes("__nexa_proof") || text.includes("proof")) return buildInfoResult("proof");
    if (text.includes("consultant") || text.includes("pricing") || text.includes("talk to someone")) return buildChatResult();
    if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez") || text.includes("burger")) return buildOrderResult();
    if (text.includes("__booking_back")) return buildBookingTourResult(bookingStep - 1);
    if (text.includes("__booking_next")) {
      if (bookingStep >= 2) return buildBookingSummaryResult();
      return buildBookingTourResult(bookingStep + 1);
    }
    if (text.includes("breakfast") || text.includes("book") || text.includes("summary")) return buildBookingSummaryResult();
    if (text.includes("room") || text.includes("view") || text.includes("aug") || text.includes("hotel")) return buildBookingTourResult(1);

    return buildInfoResult("primary");
  }, [bookingStep, buildBookingSummaryResult, buildBookingTourResult, buildChatResult, buildInfoResult, buildOrderResult]);

  const handleGenericAction = useCallback((action: SmartBarMobileGenericAction) => {
    if (action.id === "show-proof") submitDemoQuery("__nexa_proof");
    if (action.id === "consultant") submitDemoQuery("Perfect, can I talk to someone?");
    if (action.id === "start-order") submitDemoQuery("dbl chzbrger combo lg friez diet coke pie");
    if (action.id === "booking-back") submitDemoQuery("__booking_back");
    if (action.id === "booking-next") submitDemoQuery("__booking_next");
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
