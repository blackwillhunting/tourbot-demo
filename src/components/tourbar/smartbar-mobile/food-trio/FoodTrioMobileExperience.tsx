import { useCallback, useEffect, useRef, useState } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../SmartBarMobileShell";
import FoodTrioTargetWall from "./FoodTrioTargetWall";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "../../smartbarFocusController";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_CROSSOVER_MS,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../../speed-demo/SmartBarFlashCardRail";
import {
  SmartBarFlashCardStack,
  type SmartBarFlashCardStackItem,
} from "../../speed-demo/SmartBarFlashCardStack";
import {
  FOOD_TRIO_SCENARIOS,
  foodTrioApplyChoice,
  foodTrioPromptForScenario,
  foodTrioRemoveLine,
  foodTrioResultForQuery,
  foodTrioResultForScenario,
  foodTrioScenarioFromQuery,
  type FoodTrioScenarioId,
} from "./foodTrioScript";

type FoodTrioPointerState = {
  visible: boolean;
  x: number;
  y: number;
  pulse: boolean;
};

const FOOD_TRIO_POINTER_HIDDEN: FoodTrioPointerState = {
  visible: false,
  x: 0,
  y: 0,
  pulse: false,
};

const FOOD_TRIO_POINTER_CADENCE = 1.12;
const FOOD_TRIO_POINTER_PRESS_HOLD_MS = 420;
const FOOD_TRIO_POINTER_REAIM_DISTANCE_PX = 34;
const FOOD_TRIO_POINTER_REAIM_OFFSET_X = -22;
const FOOD_TRIO_POINTER_REAIM_OFFSET_Y = -16;
const FOOD_TRIO_POINTER_REAIM_MS = 170;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function FoodTrioFakePointer({ state }: { state: FoodTrioPointerState }) {
  if (!state.visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[10120] transition-[opacity,transform] duration-500 ease-out"
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
      </div>
    </div>
  );
}

function FoodTrioNarratorCards({ cards }: { cards: string[] }) {
  const sequenceRef = useRef(0);
  const laneRef = useRef<SmartBarFlashCardLaneName>("a");
  const [stackCards, setStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    const visibleCards = cards.map((card) => card.trim()).filter(Boolean);
    const sequenceId = sequenceRef.current + 1;
    sequenceRef.current = sequenceId;

    const clearAll = async () => {
      setActiveLane(null);
      setStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
      if (cancelled) return;
      setNoticeA(null);
      setNoticeB(null);
    };

    const runCards = async () => {
      if (!visibleCards.length) {
        await clearAll();
        return;
      }

      const forceStack = visibleCards.some((card) => card.includes("\n"));

      if (visibleCards.length > 1 || forceStack) {
        setActiveLane(null);
        setNoticeA(null);
        setNoticeB(null);
        setStackCards([]);

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
          await wait(260);
        }

        return;
      }

      setStackCards([]);
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

  if (!cards.length && !noticeA && !noticeB && !stackCards.length) return null;

  return (
    <SmartBarFlashCardRail className="pointer-events-none !fixed inset-x-0 !top-[32%] z-[10120]">
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

function foodTrioButtonPoint(button: HTMLElement, anchorY: number, offsetY = 0, anchorX = 0.5) {
  const rect = button.getBoundingClientRect();

  return {
    x: rect.left + rect.width * anchorX,
    y: rect.top + rect.height * anchorY + offsetY,
  };
}

function scrollToFoodTrioScenario(scenarioId: FoodTrioScenarioId) {
  if (!scenarioId || typeof document === "undefined") return;

  const target = document.querySelector<HTMLElement>(
    `[data-foodtrio-scenario="${scenarioId}"], #foodtrio-section-${scenarioId}`,
  );

  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToFoodTrioTarget(targetId?: string) {
  if (!targetId || typeof document === "undefined" || typeof window === "undefined") return;

  const target = document.querySelector<HTMLElement>(
    `[data-foodtrio-target="${targetId}"], [data-tour-id="${targetId}"], #${targetId}`,
  );

  if (!target) return;

  // Keep the focused product close to the top of the phone viewport, but not
  // hidden under the fixed FoodTrio status pill or clipped against the edge.
  const topInset = 88;
  const currentTop = window.scrollY || document.documentElement.scrollTop || 0;
  const targetRect = target.getBoundingClientRect();
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const nextTop = Math.min(Math.max(currentTop + targetRect.top - topInset, 0), maxTop);

  clearSmartBarFocusOverlay();
  window.scrollTo({ top: nextTop, left: 0, behavior: "smooth" });

  // Use the same frost/blur spotlight as the other demos. The manual scroll
  // above owns placement; skipPlacementScroll prevents a second correction jump.
  window.setTimeout(() => {
    void smartbarFocusTarget(
      {
        pageId: "foodtrio-mobile",
        targetId,
      },
      {
        initialDelayMs: 0,
        skipPlacementScroll: true,
        overlayDurationMs: 3200,
        dispatchLegacyEvent: false,
      },
    );
  }, 540);
}

function scrollFoodTrioCart(direction: "down" | "up") {
  if (typeof document === "undefined") return;

  const container = document.querySelector<HTMLElement>('[data-smartbar-mobile-cart-scroll="true"]');
  if (!container) return;

  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const nextTop = direction === "down" ? maxTop : 0;

  container.scrollTo({
    top: nextTop,
    left: 0,
    behavior: "smooth",
  });
}

export default function FoodTrioMobileExperience() {
  const [activeScenario, setActiveScenario] = useState<FoodTrioScenarioId>("coffee");
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [lastResult, setLastResult] = useState<SmartBarMobileOrderResult>(() => foodTrioResultForScenario("coffee"));
  const [pointerState, setPointerState] = useState<FoodTrioPointerState>(FOOD_TRIO_POINTER_HIDDEN);
  const [narratorCards, setNarratorCards] = useState<string[]>([]);
  const [introStageVisible, setIntroStageVisible] = useState(true);
  const submissionIdRef = useRef(1);
  const pointerTimersRef = useRef<number[]>([]);
  const narratorCardTimersRef = useRef<number[]>([]);
  const introStartedRef = useRef(false);
  const lastPointerPointRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedSinceLastTapRef = useRef(false);
  const pendingPointerScenarioRef = useRef<FoodTrioScenarioId | null>(null);
  const scriptedPointerClickRef = useRef(false);

  const clearFoodTrioPointerTimers = useCallback(() => {
    pointerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pointerTimersRef.current = [];
    lastPointerPointRef.current = null;
    pointerMovedSinceLastTapRef.current = false;
    setPointerState(FOOD_TRIO_POINTER_HIDDEN);
  }, []);

  const clearFoodTrioNarratorCards = useCallback(() => {
    narratorCardTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    narratorCardTimersRef.current = [];
    setNarratorCards([]);
  }, []);

  useEffect(() => {
    return () => {
      clearFoodTrioPointerTimers();
      clearFoodTrioNarratorCards();
    };
  }, [clearFoodTrioPointerTimers, clearFoodTrioNarratorCards]);

  const moveFoodTrioPointerToElement = useCallback((
    selector: string,
    anchorY = 0.5,
    offsetY = 0,
    pulse = false,
    anchorX = 0.5,
  ) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return null;

    const point = foodTrioButtonPoint(element, anchorY, offsetY, anchorX);
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
    });

    return element;
  }, []);

  const clickFoodTrioPointerElement = useCallback((
    selector: string,
    anchorY = 0.5,
    offsetY = 0,
    anchorX = 0.5,
  ) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return null;

    const point = foodTrioButtonPoint(element, anchorY, offsetY, anchorX);
    const previousPoint = lastPointerPointRef.current;
    const distanceFromPrevious = previousPoint
      ? Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y)
      : Number.POSITIVE_INFINITY;
    const shouldReaim =
      distanceFromPrevious < FOOD_TRIO_POINTER_REAIM_DISTANCE_PX &&
      !pointerMovedSinceLastTapRef.current;

    const pressTarget = () => {
      lastPointerPointRef.current = point;
      pointerMovedSinceLastTapRef.current = false;
      setPointerState({
        visible: true,
        x: point.x,
        y: point.y,
        pulse: true,
      });

      const clickTimer = window.setTimeout(() => {
        scriptedPointerClickRef.current = true;
        element.click();

        const releaseTimer = window.setTimeout(() => {
          scriptedPointerClickRef.current = false;
          setPointerState((current) => (
            current.visible
              ? { ...current, pulse: false }
              : current
          ));
        }, 140);

        pointerTimersRef.current.push(releaseTimer);
      }, FOOD_TRIO_POINTER_PRESS_HOLD_MS);

      pointerTimersRef.current.push(clickTimer);
    };

    if (shouldReaim) {
      const reaimPoint = {
        x: point.x + FOOD_TRIO_POINTER_REAIM_OFFSET_X,
        y: point.y + FOOD_TRIO_POINTER_REAIM_OFFSET_Y,
      };

      lastPointerPointRef.current = reaimPoint;
      pointerMovedSinceLastTapRef.current = true;
      setPointerState({
        visible: true,
        x: reaimPoint.x,
        y: reaimPoint.y,
        pulse: false,
      });

      const reaimTimer = window.setTimeout(pressTarget, FOOD_TRIO_POINTER_REAIM_MS);
      pointerTimersRef.current.push(reaimTimer);
    } else {
      pressTarget();
    }

    return element;
  }, []);

  const fillFoodTrioRetryInput = useCallback((value: string) => {
    const input = document.querySelector<HTMLTextAreaElement>('[data-smartbar-mobile-retry-input="true"]');
    if (!input) return null;

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus({ preventScroll: true });

    return input;
  }, []);

  const runScenarioEntryPointer = useCallback((query: string) => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, Math.round(delayMs * FOOD_TRIO_POINTER_CADENCE));
      pointerTimersRef.current.push(timer);
    };

    const typeDelayMs = 34;
    const typingStartsAt = 1180;
    const submitAimAt = typingStartsAt + 220 + query.length * typeDelayMs + 420;

    queue(260, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-launcher="true"]', 0.5, 0, false, 0.10);
    });

    queue(980, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-launcher="true"]', 0.5, 0, 0.10);
    });

    queue(typingStartsAt, () => {
      setDemoSubmission({
        id: submissionIdRef.current,
        query,
        typing: true,
        typeDelayMs,
        submitDelayMs: 0,
        manualSubmit: true,
      });
      submissionIdRef.current += 1;
    });

    queue(submitAimAt, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-submit="true"]', 0.5, 0, false, 0.10);
    });

    queue(submitAimAt + 760, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-submit="true"]', 0.5, 0, 0.10);
    });
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, moveFoodTrioPointerToElement]);

  const runCoffeeCartPointer = useCallback(() => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, Math.round(delayMs * FOOD_TRIO_POINTER_CADENCE));
      pointerTimersRef.current.push(timer);
    };

    // Coffee lesson: meticulous drink detail. All rows are yellow; no green time-wasters.
    // Drink 1: add several modifiers.
    queue(620, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="iced-vanilla-latte"]', 0.5);
    });

    queue(1540, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="iced-vanilla-latte"]', 0.5);
    });

    queue(2760, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="vanilla-cold-foam"]', 0.5);
    });

    queue(3740, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="vanilla-cold-foam"]', 0.5);
    });

    queue(4880, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="caramel-drizzle"]', 0.5);
    });

    queue(5860, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="caramel-drizzle"]', 0.5);
    });

    queue(7000, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="extra-vanilla"]', 0.5);
    });

    queue(7980, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="extra-vanilla"]', 0.5);
    });

    queue(9200, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, false, 0.10);
    });

    queue(10180, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, 0.10);
    });

    // Drink 2: add one modifier and remove one existing modifier.
    queue(11400, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="matcha-latte"]', 0.5);
    });

    queue(12380, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="matcha-latte"]', 0.5);
    });

    queue(13600, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="extra-matcha"]', 0.5);
    });

    queue(14580, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="extra-matcha"]', 0.5);
    });

    queue(15720, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="light-ice"]', 0.5);
    });

    queue(16700, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="light-ice"]', 0.5);
    });

    queue(17920, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, false, 0.10);
    });

    queue(18900, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, 0.10);
    });

    // Drink 3: review and leave alone.
    queue(20120, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="cold-brew"]', 0.5);
    });

    queue(21100, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="cold-brew"]', 0.5);
    });

    queue(22500, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, false, 0.10);
    });

    queue(23480, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, 0.10);
    });

    queue(24700, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-checkout="true"]', 0.5, 0, false, 0.10);
    });

    queue(25680, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-checkout="true"]', 0.5, 0, 0.10);
    });

    queue(26800, () => {
      setPointerState(FOOD_TRIO_POINTER_HIDDEN);
    });
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, moveFoodTrioPointerToElement]);

  const runFastFoodCartPointer = useCallback(() => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, Math.round(delayMs * FOOD_TRIO_POINTER_CADENCE));
      pointerTimersRef.current.push(timer);
    };

    // Fast Food lesson: reckless group order triage by color.
    // Red first: required missing choices.
    queue(620, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-status-filter="pending"]', 0.5);
    });

    queue(1580, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-status-filter="pending"]', 0.5);
    });

    queue(2720, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="regular-chicken-sandwich-meal"]', 0.5);
    });

    queue(3700, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="regular-chicken-sandwich-meal"]', 0.5);
    });

    queue(4920, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="large-fries-dr-pepper"]', 0.5);
    });

    queue(5900, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="large-fries-dr-pepper"]', 0.5);
    });

    queue(7120, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="kids-nuggets"]', 0.5);
    });

    queue(8100, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="kids-nuggets"]', 0.5);
    });

    queue(9320, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="8-count"]', 0.5);
    });

    queue(10300, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="8-count"]', 0.5);
    });

    queue(11520, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="dr-pepper"]', 0.5);
    });

    queue(12500, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="dr-pepper"]', 0.5);
    });

    queue(13720, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="large"]', 0.5);
    });

    queue(14700, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="large"]', 0.5);
    });

    // Yellow next: optional group extras. Resolve both yellow rows so the final proof is all-green.
    queue(16040, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-status-filter="options"]', 0.5);
    });

    queue(17020, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-status-filter="options"]', 0.5);
    });

    queue(18240, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="large-fries"]', 0.5);
    });

    queue(19220, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="large-fries"]', 0.5);
    });

    queue(20440, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="extra-crispy"]', 0.5);
    });

    queue(21420, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="extra-crispy"]', 0.5);
    });

    queue(22640, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, false, 0.10);
    });

    queue(23620, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, 0.10);
    });

    queue(24940, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="sauce-bundle"]', 0.5);
    });

    queue(25920, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="sauce-bundle"]', 0.5);
    });

    queue(27140, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="ranch"]', 0.5);
    });

    queue(28120, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="ranch"]', 0.5);
    });

    queue(29340, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="buffalo"]', 0.5);
    });

    queue(30320, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="buffalo"]', 0.5);
    });

    queue(31540, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, false, 0.10);
    });

    queue(32520, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, 0.10);
    });

    // Gray last: resolve the mystery item.
    queue(33760, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-status-filter="unknown"]', 0.5);
    });

    queue(34740, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-status-filter="unknown"]', 0.5);
    });

    queue(35960, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="crunchy-wrap-thing"]', 0.5);
    });

    queue(36940, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="crunchy-wrap-thing"]', 0.5);
    });

    queue(38300, () => {
      fillFoodTrioRetryInput("Crispy Chicken Wrap");
    });

    queue(39380, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-retry-submit="true"]', 0.5, 0, false, 0.10);
    });

    queue(40360, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-retry-submit="true"]', 0.5, 0, 0.10);
    });

    queue(41720, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-cart-view="default"]', 0.5);
    });

    queue(42700, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-cart-view="default"]', 0.5);
    });

    // Scroll proof: use invisible side buttons after returning to the full all-green cart.
    queue(44000, () => {
      moveFoodTrioPointerToElement('[data-food-trio-scroll-button="down"]', 0.5);
    });

    queue(44980, () => {
      clickFoodTrioPointerElement('[data-food-trio-scroll-button="down"]', 0.5);
    });

    queue(46640, () => {
      moveFoodTrioPointerToElement('[data-food-trio-scroll-button="up"]', 0.5);
    });

    queue(47620, () => {
      clickFoodTrioPointerElement('[data-food-trio-scroll-button="up"]', 0.5);
    });

    queue(49300, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-checkout="true"]', 0.5, 0, false, 0.10);
    });

    queue(50280, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-checkout="true"]', 0.5, 0, 0.10);
    });

    queue(53800, () => {
      setPointerState(FOOD_TRIO_POINTER_HIDDEN);
    });
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, fillFoodTrioRetryInput, moveFoodTrioPointerToElement]);

  const runCasualDiningCartPointer = useCallback(() => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, Math.round(delayMs * FOOD_TRIO_POINTER_CADENCE));
      pointerTimersRef.current.push(timer);
    };

    // Dining lesson: mostly ready restaurant items, one required side, one weird dessert option,
    // plus a green item can still be changed.
    queue(620, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-status-filter="pending"]', 0.5);
    });

    queue(1580, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-status-filter="pending"]', 0.5);
    });

    queue(2800, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="herb-crusted-salmon"]', 0.5);
    });

    queue(3780, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="herb-crusted-salmon"]', 0.5);
    });

    queue(5000, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="asparagus"]', 0.5);
    });

    queue(5980, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="asparagus"]', 0.5);
    });

    queue(7320, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-status-filter="options"]', 0.5);
    });

    queue(8300, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-status-filter="options"]', 0.5);
    });

    queue(9520, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="original-cheesecake"]', 0.5);
    });

    queue(10500, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="original-cheesecake"]', 0.5);
    });

    queue(11720, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="extra-whipped-cream"]', 0.5);
    });

    queue(12700, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="extra-whipped-cream"]', 0.5);
    });

    queue(13920, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, false, 0.10);
    });

    queue(14900, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-detail-close="true"]', 0.5, 0, 0.10);
    });

    // The only green tap: ready means done, not immutable.
    queue(16120, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-status-filter="ready"]', 0.5);
    });

    queue(17100, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-status-filter="ready"]', 0.5);
    });

    queue(18320, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="chicken-madeira"]', 0.5);
    });

    queue(19300, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="chicken-madeira"]', 0.5);
    });

    queue(20520, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="rice-pilaf"]', 0.5);
    });

    queue(21500, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="rice-pilaf"]', 0.5);
    });

    queue(22840, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-cart-view="default"]', 0.5);
    });

    queue(23820, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-cart-view="default"]', 0.5);
    });

    // Scroll proof: use invisible side buttons after returning to the full cart.
    queue(25120, () => {
      moveFoodTrioPointerToElement('[data-food-trio-scroll-button="down"]', 0.5);
    });

    queue(26100, () => {
      clickFoodTrioPointerElement('[data-food-trio-scroll-button="down"]', 0.5);
    });

    queue(27760, () => {
      moveFoodTrioPointerToElement('[data-food-trio-scroll-button="up"]', 0.5);
    });

    queue(28740, () => {
      clickFoodTrioPointerElement('[data-food-trio-scroll-button="up"]', 0.5);
    });

    queue(30420, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-checkout="true"]', 0.5, 0, false, 0.10);
    });

    queue(31400, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-checkout="true"]', 0.5, 0, 0.10);
    });

    queue(34900, () => {
      setPointerState(FOOD_TRIO_POINTER_HIDDEN);
    });
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, moveFoodTrioPointerToElement]);


  const runFoodTrioNarratorSequence = useCallback((
    beats: Array<{ cards: string[]; holdMs: number }>,
    onComplete: () => void,
  ) => {
    clearFoodTrioNarratorCards();

    let elapsedMs = 0;
    beats.forEach((beat) => {
      const timer = window.setTimeout(() => {
        setNarratorCards(beat.cards);
      }, elapsedMs);
      narratorCardTimersRef.current.push(timer);
      elapsedMs += beat.holdMs;
    });

    const doneTimer = window.setTimeout(() => {
      setNarratorCards([]);
      onComplete();
    }, elapsedMs + 180);
    narratorCardTimersRef.current.push(doneTimer);
  }, [clearFoodTrioNarratorCards]);

  const runFoodTrioIntroCards = useCallback((onComplete: () => void) => {
    runFoodTrioNarratorSequence([
      { cards: ["Type order.\nGet cart.\nTap colors."], holdMs: 2450 },
      { cards: ["Green = ready.", "Red = required.", "Yellow = options.", "Gray = unmatched."], holdMs: 3200 },
      { cards: ["Real orders.", "Long requests.", "Missing details."], holdMs: 2850 },
      { cards: ["Focus item.\nSmartBar jumps.\nShows options."], holdMs: 2650 },
    ], onComplete);
  }, [runFoodTrioNarratorSequence]);

  const runFoodTrioSegmentCard = useCallback((scenarioId: FoodTrioScenarioId, onComplete: () => void) => {
    const segmentProof: Record<FoodTrioScenarioId, string[]> = {
      coffee: ["Coffee shop.\nDetail test."],
      "fast-food": ["Fast food.\nSpeed test."],
      "casual-dining": ["Casual dining.\nRange test."],
    };

    runFoodTrioNarratorSequence([
      { cards: segmentProof[scenarioId], holdMs: 1350 },
    ], onComplete);
  }, [runFoodTrioNarratorSequence]);

  const startScenario = useCallback((scenarioId: FoodTrioScenarioId) => {
    const query = foodTrioPromptForScenario(scenarioId);
    clearFoodTrioPointerTimers();
    clearFoodTrioNarratorCards();
    pendingPointerScenarioRef.current = scenarioId;
    setActiveScenario(scenarioId);
    setActiveTargetId(null);
    setDemoSubmission(null);
    runFoodTrioSegmentCard(scenarioId, () => runScenarioEntryPointer(query));
  }, [clearFoodTrioPointerTimers, clearFoodTrioNarratorCards, runFoodTrioSegmentCard, runScenarioEntryPointer]);

  useEffect(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    let introCompleted = false;

    setActiveScenario("coffee");
    setActiveTargetId(null);
    setDemoSubmission(null);
    setIntroStageVisible(true);

    const timer = window.setTimeout(() => {
      runFoodTrioIntroCards(() => {
        introCompleted = true;
        setIntroStageVisible(false);
        window.setTimeout(() => {
          clearSmartBarFocusOverlay();
          scrollToFoodTrioScenario("coffee");
          startScenario("coffee");
        }, 420);
      });
    }, 420);

    return () => {
      window.clearTimeout(timer);

      // React dev Strict Mode runs effect cleanup before replaying the effect.
      // If the intro has not actually completed yet, allow the replay to schedule it again.
      if (!introCompleted) {
        introStartedRef.current = false;
      }
    };
  }, [runFoodTrioIntroCards, startScenario]);

  const handleSubmitPrompt = useCallback((query: string, meta?: SmartBarMobileSubmitMeta) => {
    if (meta?.intent === "replace_unknown" && meta.replaceLineId) {
      const replacementTitle = query.trim() || "Crispy Chicken Wrap";
      const result: SmartBarMobileOrderResult = {
        lines: lastResult.lines.map((line) => (
          line.id === meta.replaceLineId
            ? {
                ...line,
                id: `${line.id}-matched`,
                cartLineKey: `${line.cartLineKey || line.id}-matched`,
                title: replacementTitle,
                status: "ready",
                helper: "Re-entered and matched",
                price: "$8.99",
                details: ["Matched from retry", "Crispy wrap"],
                options: undefined,
                optionSelectionMode: "single",
                retryPrompt: undefined,
              }
            : line
        )),
      };

      setLastResult(result);
      setActiveTargetId(null);
      return result;
    }

    const nextScenario = foodTrioScenarioFromQuery(query, activeScenario);
    const result = foodTrioResultForQuery(query, activeScenario);
    pendingPointerScenarioRef.current = nextScenario;
    setActiveScenario(nextScenario);
    setLastResult(result);

    // Opening a cart should not move the menu. Menu navigation is reserved
    // for the explicit cart-line focus moment.
    setActiveTargetId(null);

    return result;
  }, [activeScenario, lastResult]);

  const handleNavigateToLine = useCallback((line: SmartBarMobileOrderLine) => {
    const isScriptedPointerClick = scriptedPointerClickRef.current;
    scriptedPointerClickRef.current = false;

    if (!isScriptedPointerClick) {
      clearFoodTrioPointerTimers();
    }

    setActiveTargetId(line.targetId || null);
    scrollToFoodTrioTarget(line.targetId);
  }, [clearFoodTrioPointerTimers]);

  const handleApplyChoice = useCallback((line: SmartBarMobileOrderLine, value: string) => {
    const result = foodTrioApplyChoice(lastResult.lines, line, value);
    setLastResult(result);
    // Applying a choice updates the cart, but it should not create a fresh
    // page/menu navigation moment. Cart-line selection owns spotlight movement.
    return result;
  }, [lastResult]);

  const handleRemoveLine = useCallback((line: SmartBarMobileOrderLine) => {
    const result = foodTrioRemoveLine(lastResult.lines, line);
    setLastResult(result);
    return result;
  }, [lastResult]);

  const scenario = FOOD_TRIO_SCENARIOS.find((item) => item.id === activeScenario) || FOOD_TRIO_SCENARIOS[0];

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.24),transparent_32%),linear-gradient(180deg,#07111f_0%,#08111c_42%,#05070c_100%)] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.10),transparent_58%)]" />
      {introStageVisible ? (
        <div className="fixed inset-0 z-[10070] overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.62),transparent_24%),radial-gradient(circle_at_18%_0%,rgba(125,211,252,0.46),transparent_34%),linear-gradient(180deg,#dbeafe_0%,#bfdbfe_46%,#93c5fd_100%)]">
          <div className="pointer-events-none absolute inset-x-8 top-10 h-28 rounded-full bg-white/28 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-8rem] left-[-5rem] h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="pointer-events-none absolute right-[-6rem] top-1/3 h-72 w-72 rounded-full bg-blue-300/24 blur-3xl" />
        </div>
      ) : null}
      <FoodTrioTargetWall
        activeScenario={activeScenario}
        activeTargetId={activeTargetId}
        onScenarioSelect={(scenarioId) => {
              clearFoodTrioPointerTimers();
              clearFoodTrioNarratorCards();
              clearSmartBarFocusOverlay();
              setActiveScenario(scenarioId);
              setActiveTargetId(null);
              window.setTimeout(() => scrollToFoodTrioScenario(scenarioId), 60);
            }}
        onSamplePrompt={startScenario}
      />

      <div className="pointer-events-none fixed left-3 right-3 top-3 z-30 rounded-full border border-white/12 bg-slate-950/72 px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.10em] text-white/72 shadow-xl shadow-black/20 backdrop-blur-xl">
        {scenario.brand} · fixture wall
      </div>

      <FoodTrioNarratorCards cards={narratorCards} />

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-food-trio-scroll-button="down"
        onClick={() => scrollFoodTrioCart("down")}
        className="fixed right-0 top-[42svh] z-[10110] h-24 w-10 opacity-0"
      />
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-food-trio-scroll-button="up"
        onClick={() => scrollFoodTrioCart("up")}
        className="fixed right-0 top-[26svh] z-[10110] h-24 w-10 opacity-0"
      />

      <FoodTrioFakePointer state={pointerState} />

      <SmartBarMobileShell
        mode="overlay"
        entryModeLabel="Type order"
        buildingLabel="Building cart..."
        demoSubmission={demoSubmission}
        onSubmitPrompt={handleSubmitPrompt}
        onNavigateToLine={handleNavigateToLine}
        onApplyLineChoice={handleApplyChoice}
        onRemoveLine={handleRemoveLine}
        onCartReady={() => {
          const pointerScenario = pendingPointerScenarioRef.current;
          pendingPointerScenarioRef.current = null;

          if (pointerScenario === "coffee") {
            runCoffeeCartPointer();
            return;
          }

          if (pointerScenario === "fast-food") {
            runFastFoodCartPointer();
            return;
          }

          if (pointerScenario === "casual-dining") {
            runCasualDiningCartPointer();
          }
        }}
        onResetCart={() => {
          clearFoodTrioPointerTimers();
          clearSmartBarFocusOverlay();
          const result = foodTrioResultForScenario(activeScenario);
          setLastResult(result);
          setActiveTargetId(null);
        }}
      />
    </div>
  );
}
