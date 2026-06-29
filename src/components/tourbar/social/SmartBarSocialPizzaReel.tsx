import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Circle, Clock, Compass, Pizza, Salad, ShoppingCart, Sparkles } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileDemoTypingStep,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../smartbar-mobile/SmartBarMobileShell";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "../smartbarFocusController";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_TRANSITION_MS,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../speed-demo/SmartBarFlashCardRail";
import { SmartBarFlashCardStack, type SmartBarFlashCardStackItem } from "../speed-demo/SmartBarFlashCardStack";

const PIZZA_PRE_ROLL_MS = 5000;
const PIZZA_POINTER_CADENCE = 0.82;
const PIZZA_POINTER_PRESS_HOLD_MS = 340;
const PIZZA_POINTER_REAIM_DISTANCE_PX = 34;
const PIZZA_POINTER_REAIM_OFFSET_X = -20;
const PIZZA_POINTER_REAIM_OFFSET_Y = -14;
const PIZZA_POINTER_REAIM_MS = 150;
const PIZZA_TARGET_TOP_INSET_PX = 90;
const PIZZA_TARGET_SCROLL_DURATION_MS = 1550;
const PIZZA_TARGET_SPOTLIGHT_AFTER_SCROLL_MS = 180;

const PIZZA_PROMPT = "1 larg doubl pep thin crust, a sausage calzone, garlic knots, a 2 liter diet coke, and a caeser";
const PIZZA_TYPING_DEFAULT_DELAY_MS = 42;
const PIZZA_TYPING_SCRIPT: SmartBarMobileDemoTypingStep[] = [
  { action: "type", text: "1 larg doubl pep thin crust,", delayMs: 42 },
  { action: "pause", ms: 460 },
  { action: "type", text: " a sausage calzonne", delayMs: 44 },
  { action: "pause", ms: 560 },
  { action: "backspace", count: 5, delayMs: 118 },
  { action: "pause", ms: 210 },
  { action: "type", text: "zone,", delayMs: 46 },
  { action: "pause", ms: 380 },
  { action: "type", text: " garlic knots,", delayMs: 42 },
  { action: "pause", ms: 240 },
  { action: "type", text: " a 2 liter diet coke,", delayMs: 42 },
  { action: "pause", ms: 400 },
  { action: "type", text: " and a ceasar", delayMs: 44 },
  { action: "pause", ms: 480 },
  { action: "backspace", count: 5, delayMs: 108 },
  { action: "pause", ms: 210 },
  { action: "type", text: "aeser", delayMs: 46 },
];
const PIZZA_TYPING_SCRIPT_DURATION_MS = PIZZA_TYPING_SCRIPT.reduce((total, step) => {
  if (step.action === "pause") return total + step.ms;
  if (step.action === "backspace") return total + step.count * (step.delayMs ?? PIZZA_TYPING_DEFAULT_DELAY_MS);
  return total + step.text.length * (step.delayMs ?? PIZZA_TYPING_DEFAULT_DELAY_MS);
}, 0);
const PIZZA_SEND_ORDER_NUMBER = "S-184";

type PizzaPointerState = {
  visible: boolean;
  x: number;
  y: number;
  pulse: boolean;
  tooltip?: string;
};

const PIZZA_POINTER_HIDDEN: PizzaPointerState = {
  visible: false,
  x: 0,
  y: 0,
  pulse: false,
};

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function pizzaDemoKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pizzaInitialResult(): SmartBarMobileOrderResult {
  return {
    lines: [
      {
        id: "pizza-sausage-calzone",
        cartLineKey: "pizza-sausage-calzone",
        targetId: "pizza-sausage-calzone-target",
        title: "Sausage Calzone",
        status: "ready",
        helper: "Matched and ready",
        price: "$10.99",
        details: ["Sausage", "Marinara"],
      },
      {
        id: "pizza-garlic-knots",
        cartLineKey: "pizza-garlic-knots",
        targetId: "pizza-garlic-knots-target",
        title: "Garlic Knots",
        status: "ready",
        helper: "Matched and ready",
        price: "$5.49",
        details: ["Garlic butter", "Marinara"],
      },
      {
        id: "pizza-diet-coke",
        cartLineKey: "pizza-diet-coke",
        targetId: "pizza-diet-coke-target",
        title: "2L Diet Coke",
        status: "ready",
        helper: "Matched and ready",
        price: "$3.99",
        details: ["2 liter bottle"],
      },
      {
        id: "pizza-caesar-salad",
        cartLineKey: "pizza-caesar-salad",
        targetId: "pizza-caesar-salad-target",
        title: "Caesar Salad",
        status: "pending",
        helper: "Choose a size",
        price: "$8.99",
        details: ["Size needed"],
        options: ["Small", "Large"],
        optionSelectionMode: "single",
      },
      {
        id: "pizza-large-double-pepperoni",
        cartLineKey: "pizza-large-double-pepperoni",
        targetId: "pizza-large-double-pepperoni-target",
        title: "Large Double Pepperoni Pizza",
        demoDisplayTitle: "Lg Dbl Pep Pizza",
        status: "options",
        helper: "Optional extras available",
        price: "$18.99",
        details: ["Thin crust"],
        options: ["Extra sauce", "Extra cheese"],
        optionSelectionMode: "multi",
      },
    ],
    estimatedSubtotal: "$48.45",
    estimatedTax: "$2.91",
    estimatedTotal: "$51.36",
  };
}

function pizzaResolvedResult(lines: SmartBarMobileOrderLine[]): SmartBarMobileOrderResult {
  return {
    lines,
    estimatedSubtotal: "$48.45",
    estimatedTax: "$2.91",
    estimatedTotal: "$51.36",
  };
}

function PizzaPointer({ state }: { state: PizzaPointerState }) {
  if (!state.visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[10130] transition-[opacity,transform] duration-500 ease-out"
      style={{
        opacity: state.visible ? 1 : 0,
        transform: `translate3d(${state.x - 16}px, ${state.y - 16}px, 0)`,
      }}
    >
      <div className="relative h-8 w-8">
        <div
          className={[
            "absolute inset-0 rounded-full border-2 border-white/70 shadow-[0_0_0_1px_rgba(15,23,42,0.22),0_0_18px_rgba(56,189,248,0.24)] transition-[opacity,transform] ease-out",
            state.pulse ? "scale-[2.05] border-cyan-200/80 opacity-0 shadow-[0_0_30px_rgba(56,189,248,0.55)] duration-360" : "scale-75 opacity-75 duration-150",
          ].join(" ")}
        />
        <div
          className={[
            "absolute inset-[3px] rounded-full border-2 border-white/95 bg-cyan-50/10 shadow-[0_8px_18px_rgba(2,6,23,0.34),0_0_18px_rgba(255,255,255,0.24),0_0_24px_rgba(56,189,248,0.28),inset_0_1px_0_rgba(255,255,255,0.55)] transition-[transform,background-color,box-shadow] duration-180 ease-out",
            state.pulse ? "scale-90 border-cyan-100/95 bg-cyan-100/28 shadow-[0_4px_12px_rgba(2,6,23,0.28),0_0_22px_rgba(255,255,255,0.40),0_0_42px_rgba(56,189,248,0.62)]" : "scale-100",
          ].join(" ")}
        />
        <div
          className={[
            "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[opacity,transform,background-color,box-shadow] duration-180 ease-out",
            state.pulse ? "scale-125 bg-cyan-100 opacity-95 shadow-[0_0_16px_rgba(56,189,248,0.78)]" : "scale-100 bg-white opacity-70",
          ].join(" ")}
        />
        {state.tooltip ? (
          <div className="absolute left-1/2 top-[-4.05rem] w-max max-w-[17rem] -translate-x-1/2 rounded-2xl border border-white/60 bg-slate-950/90 px-5 py-2.5 text-center text-[14px] font-black leading-tight tracking-[-0.01em] text-white shadow-[0_18px_38px_rgba(15,23,42,0.42),0_0_28px_rgba(56,189,248,0.24)] backdrop-blur-xl">
            {state.tooltip}
            <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/45 bg-slate-950/88" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PizzaNarratorCards({ cards }: { cards: string[] }) {
  const sequenceRef = useRef(0);
  const laneRef = useRef<SmartBarFlashCardLaneName>("a");
  const [stackCards, setStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);
  const [isExitingCards, setIsExitingCards] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const visibleCards = cards.map((card) => card.trim()).filter(Boolean);
    const sequenceId = sequenceRef.current + 1;
    sequenceRef.current = sequenceId;

    const clearAll = async () => {
      setIsExitingCards(true);
      setActiveLane(null);
      setStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
      if (cancelled) return;
      setNoticeA(null);
      setNoticeB(null);
      setIsExitingCards(false);
    };

    const runCards = async () => {
      if (!visibleCards.length) {
        await clearAll();
        return;
      }

      setIsExitingCards(false);
      const forceStack = visibleCards.some((card) => card.includes("\n"));

      if (visibleCards.length > 1 || forceStack) {
        setIsExitingCards(true);
        setActiveLane(null);
        setStackCards([]);
        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
        if (cancelled) return;
        setNoticeA(null);
        setNoticeB(null);
        setIsExitingCards(false);

        const nextStack: SmartBarFlashCardStackItem[] = [];
        for (let index = 0; index < visibleCards.length; index += 1) {
          if (cancelled) return;

          nextStack.push({
            id: `${sequenceId}-${index}-${visibleCards[index]}`,
            variant: "prelude",
            title: visibleCards[index],
            density: "normal",
          });

          setStackCards([...nextStack]);
          await wait(240);
        }
        return;
      }

      setIsExitingCards(true);
      setStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
      if (cancelled) return;
      setIsExitingCards(false);

      const notice: SmartBarFlashCardNotice = {
        variant: "prelude",
        title: visibleCards[0],
      };

      const nextLane: SmartBarFlashCardLaneName = laneRef.current === "a" ? "b" : "a";
      laneRef.current = nextLane;
      if (nextLane === "a") setNoticeA(notice);
      else setNoticeB(notice);
      setActiveLane(nextLane);
    };

    void runCards();

    return () => {
      cancelled = true;
    };
  }, [cards]);

  if (!cards.length && !noticeA && !noticeB && !stackCards.length && !isExitingCards) return null;

  return (
    <SmartBarFlashCardRail className="pointer-events-none !fixed inset-x-0 !top-[28%] z-[10120]">
      <SmartBarFlashCardStack cards={stackCards} mode="standard" />
      <SmartBarFlashCardLane active={activeLane === "a"}>
        <SmartBarFlashCard notice={noticeA} />
      </SmartBarFlashCardLane>
      <SmartBarFlashCardLane active={activeLane === "b"}>
        <SmartBarFlashCard notice={noticeB} />
      </SmartBarFlashCardLane>
    </SmartBarFlashCardRail>
  );
}

function pizzaButtonPoint(button: HTMLElement, anchorY: number, offsetY = 0, anchorX = 0.5) {
  const rect = button.getBoundingClientRect();

  return {
    x: rect.left + rect.width * anchorX,
    y: rect.top + rect.height * anchorY + offsetY,
  };
}

function pizzaEaseInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function pizzaTargetTopInsetPx() {
  if (typeof window === "undefined") return PIZZA_TARGET_TOP_INSET_PX;
  return Math.min(Math.max(window.innerHeight * 0.18, 72), 150);
}

function pizzaTargetScrollTop(target: HTMLElement) {
  const currentTop = window.scrollY || document.documentElement.scrollTop || 0;
  const targetRect = target.getBoundingClientRect();
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  return Math.min(
    Math.max(currentTop + targetRect.top - pizzaTargetTopInsetPx(), 0),
    maxTop,
  );
}

function slowScrollPizzaWindowTo(top: number, durationMs = PIZZA_TARGET_SCROLL_DURATION_MS) {
  return new Promise<void>((resolve) => {
    const startTop = window.scrollY || document.documentElement.scrollTop || 0;
    const distance = top - startTop;

    if (Math.abs(distance) < 4) {
      window.scrollTo({ top, left: 0, behavior: "auto" });
      resolve();
      return;
    }

    const startedAt = window.performance.now();

    const step = (now: number) => {
      const rawProgress = Math.min((now - startedAt) / durationMs, 1);
      const easedProgress = pizzaEaseInOutCubic(rawProgress);

      window.scrollTo({
        top: startTop + distance * easedProgress,
        left: 0,
        behavior: "auto",
      });

      if (rawProgress < 1) {
        window.requestAnimationFrame(step);
        return;
      }

      window.scrollTo({ top, left: 0, behavior: "auto" });
      resolve();
    };

    window.requestAnimationFrame(step);
  });
}

function scrollToPizzaTarget(targetId?: string) {
  if (!targetId || typeof document === "undefined" || typeof window === "undefined") return;

  const target = document.querySelector<HTMLElement>(
    `[data-pizza-target="${targetId}"], [data-tour-id="${targetId}"], #${targetId}`,
  );

  if (!target) return;

  const nextTop = pizzaTargetScrollTop(target);

  clearSmartBarFocusOverlay();

  void slowScrollPizzaWindowTo(nextTop).then(() => {
    window.setTimeout(() => {
      void smartbarFocusTarget(
        {
          pageId: "smartbar-pizza-social",
          targetId,
        },
        {
          initialDelayMs: 0,
          skipPlacementScroll: true,
          overlayDurationMs: 2600,
          dispatchLegacyEvent: false,
        },
      );
    }, PIZZA_TARGET_SPOTLIGHT_AFTER_SCROLL_MS);
  });
}

function PizzaTargetCard({
  id,
  title,
  meta,
  price,
  active,
  children,
}: {
  id: string;
  title: string;
  meta: string;
  price: string;
  active: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      id={id}
      data-tour-id={id}
      data-pizza-target={id}
      className={[
        "relative overflow-hidden rounded-[1.45rem] border bg-white/[0.075] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)] ring-1 backdrop-blur-xl transition",
        active
          ? "border-cyan-200/88 ring-cyan-200/70 shadow-[0_0_0_1px_rgba(165,243,252,0.55),0_24px_70px_rgba(34,211,238,0.32)]"
          : "border-white/12 ring-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/74">{meta}</div>
          <div className="mt-1 truncate text-[20px] font-black tracking-[-0.05em] text-white">{title}</div>
        </div>
        <div className="shrink-0 rounded-full bg-white/92 px-3 py-1 text-sm font-black text-slate-950">{price}</div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function PizzaShopTargetWall({ activeTargetId }: { activeTargetId: string | null }) {
  const sectionClass = "rounded-[2rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.22)] ring-1 ring-white/10 backdrop-blur-2xl";
  const sectionTitleClass = "mb-3 flex items-center gap-2 text-[14px] font-black uppercase tracking-[0.22em] text-cyan-100/78";

  return (
    <main className="relative z-10 mx-auto min-h-[160svh] w-full max-w-[28rem] px-4 pb-[44svh] pt-8 text-white sm:max-w-[42rem] sm:pt-10">
      <section className="mb-5 rounded-[2.2rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-300 text-orange-950 shadow-lg ring-1 ring-orange-100/70">
            <Pizza className="h-7 w-7" />
          </div>
          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.22em] text-cyan-100/78">Tony's Pizza</div>
            <h1 className="text-[28px] font-black leading-none tracking-[-0.08em]">Direct Order Menu</h1>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold leading-5 text-white/64">
          A realistic pizza page: menu sections, options, sides, drinks, and one SmartBar order intake layer.
        </p>
      </section>

      <section className={`${sectionClass} mb-5`}>
        <div className={sectionTitleClass}><Pizza className="h-4 w-4" /> Pizza / Make Your Own Pizza</div>
        <div className="space-y-3">
          <PizzaTargetCard
            id="pizza-large-double-pepperoni-target"
            title="Large Double Pepperoni Pizza"
            meta="Build pizza"
            price="$18.99"
            active={activeTargetId === "pizza-large-double-pepperoni-target"}
          >
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-[0.08em]">
              <div className="rounded-2xl bg-emerald-300/95 px-2 py-2 text-emerald-950">Thin crust</div>
              <div className="rounded-2xl bg-white/88 px-2 py-2 text-slate-950">Extra sauce</div>
              <div className="rounded-2xl bg-white/88 px-2 py-2 text-slate-950">Extra cheese</div>
            </div>
          </PizzaTargetCard>
          <PizzaTargetCard id="pizza-cheese-target" title="Classic Cheese Pizza" meta="Popular" price="$14.99" active={false} />
        </div>
      </section>

      <section className={`${sectionClass} mb-5`}>
        <div className={sectionTitleClass}><Circle className="h-4 w-4" /> Calzones</div>
        <PizzaTargetCard
          id="pizza-sausage-calzone-target"
          title="Sausage Calzone"
          meta="Calzone"
          price="$10.99"
          active={activeTargetId === "pizza-sausage-calzone-target"}
        />
      </section>

      <section className={`${sectionClass} mb-5`}>
        <div className={sectionTitleClass}><Sparkles className="h-4 w-4" /> Sides</div>
        <PizzaTargetCard
          id="pizza-garlic-knots-target"
          title="Garlic Knots"
          meta="Side"
          price="$5.49"
          active={activeTargetId === "pizza-garlic-knots-target"}
        />
      </section>

      <section className={`${sectionClass} mb-5`}>
        <div className={sectionTitleClass}><Clock className="h-4 w-4" /> Drinks</div>
        <PizzaTargetCard
          id="pizza-diet-coke-target"
          title="2 Liter Diet Coke"
          meta="Bottle"
          price="$3.99"
          active={activeTargetId === "pizza-diet-coke-target"}
        />
      </section>

      <section className={`${sectionClass} mb-8`}>
        <div className={sectionTitleClass}><Salad className="h-4 w-4" /> Salads</div>
        <PizzaTargetCard
          id="pizza-caesar-salad-target"
          title="Caesar Salad"
          meta="Size required"
          price="$8.99"
          active={activeTargetId === "pizza-caesar-salad-target"}
        >
          <div className="grid grid-cols-2 gap-2 text-center text-[12px] font-black uppercase tracking-[0.10em]">
            <div className="rounded-2xl bg-white/88 px-3 py-2 text-slate-950">Small</div>
            <div className="rounded-2xl bg-white/88 px-3 py-2 text-slate-950">Large</div>
          </div>
        </PizzaTargetCard>
      </section>
    </main>
  );
}

const PIZZA_FINAL_FOG_GLASS_STYLE = {
  background:
    "radial-gradient(circle at 78% 18%, rgba(103,232,249,0.22) 0%, rgba(103,232,249,0.11) 20%, transparent 46%), radial-gradient(circle at 10% 82%, rgba(147,197,253,0.20) 0%, rgba(147,197,253,0.10) 24%, transparent 50%), linear-gradient(180deg, rgba(226,232,240,0.42) 0%, rgba(148,163,184,0.50) 36%, rgba(71,85,105,0.58) 100%)",
  borderColor: "rgba(255,255,255,0.34)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 0 34px rgba(255,255,255,0.12), inset 0 -1px 0 rgba(15,23,42,0.50), 0 22px 52px rgba(2,6,23,0.44), 0 6px 18px rgba(2,6,23,0.28)",
  backdropFilter: "blur(38px) saturate(155%) brightness(1.08)",
  WebkitBackdropFilter: "blur(38px) saturate(155%) brightness(1.08)",
};

const PIZZA_FINAL_BLUE_CONTROL_STYLE = {
  background:
    "linear-gradient(180deg, rgba(20,34,92,0.96) 0%, rgba(17,29,82,0.98) 52%, rgba(13,23,68,0.99) 100%)",
  borderColor: "rgba(255,255,255,0.30)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(2,6,23,0.48), 0 16px 38px rgba(2,6,23,0.30), 0 5px 14px rgba(2,6,23,0.18)",
  backdropFilter: "blur(18px) saturate(120%)",
  WebkitBackdropFilter: "blur(18px) saturate(120%)",
};

function PizzaFinalLiveCaption({ caption }: { caption: string | null }) {
  const [typedCaption, setTypedCaption] = useState("");

  useEffect(() => {
    const title = caption || "";
    if (!title) {
      setTypedCaption("");
      return;
    }

    let index = 0;
    let intervalId: number | null = null;
    setTypedCaption("");

    const delayId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setTypedCaption(title.slice(0, index));

        if (index >= title.length && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }, 22);
    }, 120);

    return () => {
      window.clearTimeout(delayId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [caption]);

  if (!caption) return null;

  const charCount = Math.max(1, typedCaption.length);
  const capsuleWidth = Math.min(Math.max(42, charCount * 8.35 + 34), 336);
  const glassWidth = Math.min(Math.max(70, capsuleWidth + 24), 354);

  return (
    <motion.div
      key={caption}
      data-smartbar-mobile-intro-callout="true"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.99 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none absolute bottom-[calc(100%+0.64rem)] left-1/2 z-[3] flex h-[52px] -translate-x-1/2 items-center justify-center px-2 text-center text-white shadow-2xl"
      style={{
        ...PIZZA_FINAL_FOG_GLASS_STYLE,
        width: glassWidth,
        borderRadius: 999,
        transition: "width 160ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        className="flex h-[34px] items-center justify-center overflow-hidden rounded-full px-3.5 text-[13px] font-black tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_10px_24px_rgba(2,6,23,0.26)]"
        style={{
          ...PIZZA_FINAL_BLUE_CONTROL_STYLE,
          width: capsuleWidth,
          transition: "width 160ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <span className="truncate whitespace-nowrap">{typedCaption}</span>
        {typedCaption.length < caption.length ? (
          <span className="ml-0.5 inline-block animate-pulse text-white/86">|</span>
        ) : null}
      </div>

      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/18 bg-slate-900/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
    </motion.div>
  );
}

function PizzaFinalTicket({
  visible,
  liveCaption,
  capsuleAscend,
  ticketCleared,
}: {
  visible: boolean;
  liveCaption: string | null;
  capsuleAscend: boolean;
  ticketCleared: boolean;
}) {
  if (!visible) return null;

  const ticketItems = [
    {
      group: "Pizza",
      quantity: "1×",
      name: "Large Double Pepperoni Pizza",
      details: ["Thin crust"],
    },
    {
      group: "Calzone",
      quantity: "1×",
      name: "Sausage Calzone",
      details: ["Marinara"],
    },
    {
      group: "Sides",
      quantity: "1×",
      name: "Garlic Knots",
      details: ["Garlic butter"],
    },
    {
      group: "Drinks",
      quantity: "1×",
      name: "2L Diet Coke",
      details: ["Bottle"],
    },
    {
      group: "Salad",
      quantity: "1×",
      name: "Large Caesar Salad",
      details: ["Size: Large"],
    },
  ];

  return (
    <div className="fixed inset-0 z-[10110] overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.62),transparent_24%),radial-gradient(circle_at_18%_0%,rgba(125,211,252,0.46),transparent_34%),linear-gradient(180deg,#dbeafe_0%,#bfdbfe_46%,#93c5fd_100%)] text-slate-950">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
      >
        <ShoppingCart className="h-[54svh] max-h-[520px] w-[54svh] max-w-[520px] text-sky-500/10" strokeWidth={1.28} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: "-112svh", scale: 0.992 }}
        animate={
          ticketCleared
            ? { opacity: 0, y: "-112svh", scale: 0.992 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ duration: ticketCleared ? 0.62 : 0.86, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute inset-x-[5px] top-[8px] z-[34]"
      >
        <div className="mx-auto w-[min(calc(100%-10px),528px)] overflow-hidden rounded-[34px] border border-slate-200/90 bg-white text-slate-950 shadow-[0_24px_72px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/5">
          <div className="mx-auto mt-3 h-1.5 w-[68px] rounded-full bg-slate-300" />

          <div className="flex items-start justify-between gap-3 px-5 pb-2.5 pt-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.26em] text-sky-600">SmartBar Order</div>
              <div className="mt-0.5 flex flex-nowrap items-center gap-2">
                <h1 className="shrink-0 whitespace-nowrap text-[42px] font-black leading-none tracking-[-0.075em] text-slate-950">{PIZZA_SEND_ORDER_NUMBER}</h1>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                  New ticket
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-500">
                just now · ASAP · Pay at counter
              </div>
            </div>

            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              aria-hidden="true"
            >
              <span className="text-3xl font-light leading-none">×</span>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="flex flex-col gap-2">
              {ticketItems.map((item) => (
                <section
                  key={item.name}
                  className="w-full rounded-[18px] bg-white px-3.5 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.055)] ring-1 ring-slate-200/80"
                >
                  <div className="flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.16em] text-slate-400">
                      {item.group}
                    </span>
                    <span className="text-[0.94rem] font-black text-sky-700">{item.quantity}</span>
                    <span className="text-[0.94rem] font-black text-slate-950">{item.name}</span>
                  </div>
                  <div className="mt-1.5 flex max-w-full flex-wrap gap-1.5 pl-0 text-[0.66rem] font-bold leading-none text-slate-500">
                    {item.details.map((detail) => (
                      <span key={detail} className="rounded-full bg-slate-50 px-2 py-0.5">
                        {detail}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: "12svh", scale: 0.94 }}
        animate={{ opacity: 1, y: capsuleAscend ? "-36svh" : "0svh", scale: capsuleAscend ? 1.035 : 1 }}
        transition={{ duration: capsuleAscend ? 0.94 : 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 bottom-3 z-[42] flex h-[46px] w-[260px] -translate-x-1/2 items-center justify-center rounded-full border px-4 text-white"
        style={PIZZA_FINAL_BLUE_CONTROL_STYLE}
      >
        <PizzaFinalLiveCaption caption={liveCaption} />
        <span className="inline-flex h-8 max-w-full items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[18px] font-semibold tracking-[-0.025em] text-white">
          <Compass className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={2.25} />
          <span>SmartBar</span>
        </span>
      </motion.div>
    </div>
  );
}

export default function SmartBarSocialPizzaReel() {
  const [preRollVisible, setPreRollVisible] = useState(true);
  const [introStageVisible, setIntroStageVisible] = useState(true);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [lastResult, setLastResult] = useState<SmartBarMobileOrderResult>(() => pizzaInitialResult());
  const [pointerState, setPointerState] = useState<PizzaPointerState>(PIZZA_POINTER_HIDDEN);
  const [narratorCards, setNarratorCards] = useState<string[]>([]);
  const [finalTicketVisible, setFinalTicketVisible] = useState(false);
  const [finalTicketCleared, setFinalTicketCleared] = useState(false);
  const [liveCaption, setLiveCaption] = useState<string | null>(null);
  const [capsuleAscend, setCapsuleAscend] = useState(false);
  const submissionIdRef = useRef(1);
  const pointerTimersRef = useRef<number[]>([]);
  const narratorTimersRef = useRef<number[]>([]);
  const startedRef = useRef(false);
  const flowCompleteRef = useRef<(() => void) | null>(null);
  const cartSequencePendingRef = useRef(false);
  const lastPointerPointRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedSinceLastTapRef = useRef(false);
  const scriptedPointerClickRef = useRef(false);

  const clearPizzaPointerTimers = useCallback(() => {
    pointerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pointerTimersRef.current = [];
    lastPointerPointRef.current = null;
    pointerMovedSinceLastTapRef.current = false;
    setPointerState(PIZZA_POINTER_HIDDEN);
  }, []);

  const clearPizzaNarratorTimers = useCallback(() => {
    narratorTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    narratorTimersRef.current = [];
    setNarratorCards([]);
  }, []);

  useEffect(() => {
    return () => {
      clearPizzaPointerTimers();
      clearPizzaNarratorTimers();
      clearSmartBarFocusOverlay();
    };
  }, [clearPizzaNarratorTimers, clearPizzaPointerTimers]);

  const movePizzaPointerToElement = useCallback((
    selector: string,
    anchorY = 0.5,
    offsetY = 0,
    pulse = false,
    anchorX = 0.5,
    tooltip?: string,
  ) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return null;

    const point = pizzaButtonPoint(element, anchorY, offsetY, anchorX);
    const previousPoint = lastPointerPointRef.current;
    const movementDistance = previousPoint
      ? Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
      : Number.POSITIVE_INFINITY;

    lastPointerPointRef.current = point;
    pointerMovedSinceLastTapRef.current = movementDistance > 8;
    setPointerState({
      visible: true,
      x: point.x,
      y: point.y,
      pulse,
      tooltip,
    });

    return element;
  }, []);

  const clickPizzaPointerElement = useCallback((
    selector: string,
    anchorY = 0.5,
    offsetY = 0,
    anchorX = 0.5,
    tooltip?: string,
  ) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return null;

    const point = pizzaButtonPoint(element, anchorY, offsetY, anchorX);
    const previousPoint = lastPointerPointRef.current;
    const distanceFromPrevious = previousPoint
      ? Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
      : Number.POSITIVE_INFINITY;
    const shouldReaim =
      distanceFromPrevious < PIZZA_POINTER_REAIM_DISTANCE_PX &&
      !pointerMovedSinceLastTapRef.current;

    const pressTarget = () => {
      lastPointerPointRef.current = point;
      pointerMovedSinceLastTapRef.current = false;
      setPointerState({
        visible: true,
        x: point.x,
        y: point.y,
        pulse: true,
        tooltip,
      });

      const clickTimer = window.setTimeout(() => {
        scriptedPointerClickRef.current = true;
        element.click();

        const releaseTimer = window.setTimeout(() => {
          scriptedPointerClickRef.current = false;
          setPointerState((current) => (
            current.visible
              ? { ...current, pulse: false, tooltip: undefined }
              : current
          ));
        }, 120);

        pointerTimersRef.current.push(releaseTimer);
      }, PIZZA_POINTER_PRESS_HOLD_MS);

      pointerTimersRef.current.push(clickTimer);
    };

    if (shouldReaim) {
      const reaimPoint = {
        x: point.x + PIZZA_POINTER_REAIM_OFFSET_X,
        y: point.y + PIZZA_POINTER_REAIM_OFFSET_Y,
      };

      lastPointerPointRef.current = reaimPoint;
      pointerMovedSinceLastTapRef.current = true;
      setPointerState({
        visible: true,
        x: reaimPoint.x,
        y: reaimPoint.y,
        pulse: false,
        tooltip,
      });

      const reaimTimer = window.setTimeout(pressTarget, PIZZA_POINTER_REAIM_MS);
      pointerTimersRef.current.push(reaimTimer);
    } else {
      pressTarget();
    }

    return element;
  }, []);

  const queuePizzaPointer = useCallback((delayMs: number, callback: () => void) => {
    const timer = window.setTimeout(callback, Math.round(delayMs * PIZZA_POINTER_CADENCE));
    pointerTimersRef.current.push(timer);
  }, []);

  const showPizzaPointerAtViewport = useCallback((xRatio: number, yRatio: number, tooltip?: string) => {
    const point = {
      x: window.innerWidth * xRatio,
      y: window.innerHeight * yRatio,
    };

    lastPointerPointRef.current = point;
    pointerMovedSinceLastTapRef.current = true;
    setPointerState({
      visible: true,
      x: point.x,
      y: point.y,
      pulse: false,
      tooltip,
    });
  }, []);

  const runEntryPointer = useCallback(() => {
    clearPizzaPointerTimers();

    const typeDelayMs = PIZZA_TYPING_DEFAULT_DELAY_MS;
    const typingStartsAt = 2500;
    const submitAimAt = typingStartsAt + 260 + PIZZA_TYPING_SCRIPT_DURATION_MS + 340;

    queuePizzaPointer(220, () => {
      movePizzaPointerToElement('[data-smartbar-mobile-launcher="true"]', 0.30, -18, false, -0.04);
    });

    queuePizzaPointer(650, () => {
      movePizzaPointerToElement('[data-smartbar-mobile-launcher="true"]', 0.5, 0, false, 0.10, "Pizza order");
    });

    queuePizzaPointer(2200, () => {
      clickPizzaPointerElement('[data-smartbar-mobile-launcher="true"]', 0.5, 0, 0.10, "Pizza order");
    });

    queuePizzaPointer(typingStartsAt, () => {
      setDemoSubmission({
        id: submissionIdRef.current,
        query: PIZZA_PROMPT,
        typing: true,
        typeDelayMs,
        typingScript: PIZZA_TYPING_SCRIPT,
        submitDelayMs: 0,
        manualSubmit: true,
      });
      submissionIdRef.current += 1;
    });

    queuePizzaPointer(submitAimAt, () => {
      movePizzaPointerToElement('[data-smartbar-mobile-submit="true"]', 0.22, -26, false, -0.08);
    });

    queuePizzaPointer(submitAimAt + 500, () => {
      movePizzaPointerToElement('[data-smartbar-mobile-submit="true"]', 0.5, 0, false, 0.10, "Build cart");
    });

    queuePizzaPointer(submitAimAt + 2200, () => {
      clickPizzaPointerElement('[data-smartbar-mobile-submit="true"]', 0.5, 0, 0.10, "Build cart");
    });
  }, [clearPizzaPointerTimers, clickPizzaPointerElement, movePizzaPointerToElement, queuePizzaPointer]);

  const runPizzaCartPointer = useCallback((onComplete?: () => void) => {
    clearPizzaPointerTimers();
    clearPizzaNarratorTimers();

    const lineSelector = (title: string) => `[data-smartbar-mobile-line-title-key="${pizzaDemoKey(title)}"]`;
    const readySelector = lineSelector("Sausage Calzone");
    const caesarSelector = lineSelector("Caesar Salad");
    const pizzaSelector = lineSelector("Large Double Pepperoni Pizza");
    const largeOption = '[data-smartbar-mobile-option-key="large"]';
    const detailDone = '[data-smartbar-mobile-detail-close="true"]';
    const checkout = '[data-smartbar-mobile-checkout="true"]';

    queuePizzaPointer(300, () => {
      movePizzaPointerToElement('[data-smartbar-mobile-status-filter="ready"]', 0.5, 0, false, 0.28);
    });
    queuePizzaPointer(1250, () => {
      movePizzaPointerToElement(readySelector, 0.5, 0, false, 0.5, "Ready");
    });
    queuePizzaPointer(4300, () => {
      movePizzaPointerToElement(caesarSelector, 0.5, 0, false, 0.5, "Required detail");
    });
    queuePizzaPointer(7350, () => {
      movePizzaPointerToElement(pizzaSelector, 0.5, 0, false, 0.5, "Optional review");
    });

    queuePizzaPointer(9300, () => {
      movePizzaPointerToElement(caesarSelector, 0.5, 0, false, 0.5, "Required detail");
    });
    queuePizzaPointer(10600, () => {
      clickPizzaPointerElement(caesarSelector, 0.5, 0, 0.5, "Required detail");
    });
    queuePizzaPointer(13300, () => {
      movePizzaPointerToElement('[data-pizza-target="pizza-caesar-salad-target"]', 0.42, 0, false, 0.5, "Hops to item");
    });
    queuePizzaPointer(15050, () => {
      movePizzaPointerToElement(largeOption, 0.5, 0, false, 0.5);
    });
    queuePizzaPointer(16000, () => {
      clickPizzaPointerElement(largeOption, 0.5, 0, 0.5);
    });

    queuePizzaPointer(17850, () => {
      movePizzaPointerToElement(pizzaSelector, 0.5, 0, false, 0.5, "Review optional extras");
    });
    queuePizzaPointer(19000, () => {
      clickPizzaPointerElement(pizzaSelector, 0.5, 0, 0.5, "Review optional extras");
    });
    queuePizzaPointer(22050, () => {
      movePizzaPointerToElement(detailDone, 0.5, 0, false, 0.10, "Looks good");
    });
    queuePizzaPointer(23100, () => {
      clickPizzaPointerElement(detailDone, 0.5, 0, 0.10, "Looks good");
    });

    queuePizzaPointer(25350, () => {
      movePizzaPointerToElement(checkout, 0.5, 0, false, 0.10, "Ready to send");
    });
    queuePizzaPointer(28100, () => {
      clickPizzaPointerElement(checkout, 0.5, 0, 0.10, "Ready to send");
    });

    queuePizzaPointer(31300, () => {
      showPizzaPointerAtViewport(0.5, 0.70, "Sent to vendor");
    });
    queuePizzaPointer(33300, () => {
      setFinalTicketCleared(false);
      setFinalTicketVisible(true);
    });
    queuePizzaPointer(34200, () => {
      showPizzaPointerAtViewport(0.5, 0.56, "Received on tablet");
    });
    queuePizzaPointer(36600, () => {
      setPointerState(PIZZA_POINTER_HIDDEN);
      setFinalTicketCleared(true);
    });
    queuePizzaPointer(37800, () => setLiveCaption("Plain English."));
    queuePizzaPointer(39550, () => setLiveCaption("Ready ticket."));
    queuePizzaPointer(41300, () => setLiveCaption("Phone orders without the phone."));
    queuePizzaPointer(44100, () => {
      setLiveCaption(null);
    });
    queuePizzaPointer(44850, () => {
      setCapsuleAscend(true);
    });
    queuePizzaPointer(46700, () => {
      onComplete?.();
    });
  }, [
    clearPizzaNarratorTimers,
    clearPizzaPointerTimers,
    clickPizzaPointerElement,
    movePizzaPointerToElement,
    queuePizzaPointer,
    showPizzaPointerAtViewport,
  ]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let completed = false;
    let cancelled = false;

    const runStoryboard = async () => {
      await wait(PIZZA_PRE_ROLL_MS);
      if (cancelled) return;

      setPreRollVisible(false);
      await wait(280);
      if (cancelled) return;

      await new Promise<void>((resolve) => {
        flowCompleteRef.current = resolve;
        cartSequencePendingRef.current = true;
        runEntryPointer();
      });

      completed = true;
    };

    void runStoryboard();

    return () => {
      cancelled = true;
      if (!completed) {
        startedRef.current = false;
      }
    };
  }, [runEntryPointer]);

  const handleSubmitPrompt = useCallback((_query: string, _meta?: SmartBarMobileSubmitMeta) => {
    const result = pizzaInitialResult();
    setLastResult(result);
    setIntroStageVisible(false);
    setActiveTargetId(null);
    setLiveCaption(null);
    setCapsuleAscend(false);
    setFinalTicketVisible(false);
    setFinalTicketCleared(false);
    return result;
  }, []);

  const handleNavigateToLine = useCallback((line: SmartBarMobileOrderLine) => {
    const isScriptedPointerClick = scriptedPointerClickRef.current;
    scriptedPointerClickRef.current = false;

    if (!isScriptedPointerClick) {
      clearPizzaPointerTimers();
    }

    setActiveTargetId(line.targetId || null);
    scrollToPizzaTarget(line.targetId);
  }, [clearPizzaPointerTimers]);

  const handleApplyChoice = useCallback((line: SmartBarMobileOrderLine, value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    const result = pizzaResolvedResult(
      lastResult.lines.map((candidate) => {
        if (candidate.id !== line.id) return candidate;

        if (candidate.id === "pizza-caesar-salad") {
          return {
            ...candidate,
            status: "ready",
            helper: `${value} selected`,
            details: [value],
            options: undefined,
            optionSelectionMode: "single",
          };
        }

        if (candidate.id === "pizza-large-double-pepperoni") {
          const details = new Set(candidate.details || ["Thin crust"]);
          if (normalizedValue === "extra sauce" || normalizedValue === "extra cheese") {
            details.add(value);
          }

          return {
            ...candidate,
            status: "ready",
            helper: "Reviewed and ready",
            details: Array.from(details),
            options: candidate.options || ["Extra sauce", "Extra cheese"],
            optionSelectionMode: "multi",
          };
        }

        return line;
      }),
    );

    setLastResult(result);
    return result;
  }, [lastResult]);

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.24),transparent_32%),linear-gradient(180deg,#07111f_0%,#08111c_42%,#05070c_100%)] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.10),transparent_58%)]" />

      <PizzaShopTargetWall activeTargetId={activeTargetId} />

      {introStageVisible ? (
        <div className="fixed inset-0 z-[10070] overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.62),transparent_24%),radial-gradient(circle_at_18%_0%,rgba(125,211,252,0.46),transparent_34%),linear-gradient(180deg,#dbeafe_0%,#bfdbfe_46%,#93c5fd_100%)]">
          <div className="pointer-events-none absolute inset-x-8 top-10 h-28 rounded-full bg-white/28 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-8rem] left-[-5rem] h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="pointer-events-none absolute right-[-6rem] top-1/3 h-72 w-72 rounded-full bg-blue-300/24 blur-3xl" />
        </div>
      ) : null}

      {preRollVisible ? (
        <div className="fixed inset-0 z-[10200] bg-[#bfdbfe]" aria-label="Recording pre-roll" />
      ) : null}

      <PizzaNarratorCards cards={narratorCards} />
      <PizzaPointer state={pointerState} />
      <PizzaFinalTicket
        visible={finalTicketVisible}
        liveCaption={liveCaption}
        capsuleAscend={capsuleAscend}
        ticketCleared={finalTicketCleared}
      />

      {!finalTicketVisible ? (
        <SmartBarMobileShell
          mode="overlay"
          entryModeLabel="Type order"
          buildingLabel="Building cart..."
          compactCartRows
          demoSubmission={demoSubmission}
          sendOrderNumber={PIZZA_SEND_ORDER_NUMBER}
          onSubmitPrompt={handleSubmitPrompt}
          onNavigateToLine={handleNavigateToLine}
          onApplyLineChoice={handleApplyChoice}
          onCartReady={() => {
            if (!cartSequencePendingRef.current) return;
            cartSequencePendingRef.current = false;
            runPizzaCartPointer(() => {
              flowCompleteRef.current?.();
              flowCompleteRef.current = null;
            });
          }}
          onResetCart={() => {
            clearSmartBarFocusOverlay();
            setLastResult(pizzaInitialResult());
            setActiveTargetId(null);
          }}
        />
      ) : null}
    </div>
  );
}
