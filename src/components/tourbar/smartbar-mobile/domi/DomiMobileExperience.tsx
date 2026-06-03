import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BedDouble, CalendarDays, Coffee, CreditCard, Users } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileSubmitResult,
} from "../SmartBarMobileShell";
import SmartBarSpeedTargetWall from "../../speed-demo/SmartBarSpeedTargetWall";

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

export default function DomiMobileExperience() {
  const focusSnapshotRef = useRef<MobileFocusSnapshot | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const submissionIdRef = useRef(0);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [activeRoomIndex, setActiveRoomIndex] = useState(1);
  const [breakfastAdded, setBreakfastAdded] = useState(false);

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
    setDemoSubmission({ id: submissionIdRef.current, query });
  }, []);

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
      <section
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface="booking"
        className="relative z-10 min-h-[4200px] overflow-x-hidden px-3 pb-[640px] pt-3"
      >
        <SmartBarSpeedTargetWall surface="booking" />
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
