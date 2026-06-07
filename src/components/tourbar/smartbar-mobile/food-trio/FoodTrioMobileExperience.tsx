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

function foodTrioButtonPoint(button: HTMLElement, anchorY: number, offsetY = 0) {
  const rect = button.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
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

export default function FoodTrioMobileExperience() {
  const [activeScenario, setActiveScenario] = useState<FoodTrioScenarioId>("coffee");
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [lastResult, setLastResult] = useState<SmartBarMobileOrderResult>(() => foodTrioResultForScenario("coffee"));
  const [pointerState, setPointerState] = useState<FoodTrioPointerState>(FOOD_TRIO_POINTER_HIDDEN);
  const submissionIdRef = useRef(1);
  const pointerTimersRef = useRef<number[]>([]);
  const pendingPointerScenarioRef = useRef<FoodTrioScenarioId | null>(null);
  const scriptedPointerClickRef = useRef(false);

  const clearFoodTrioPointerTimers = useCallback(() => {
    pointerTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    pointerTimersRef.current = [];
    setPointerState(FOOD_TRIO_POINTER_HIDDEN);
  }, []);

  useEffect(() => {
    return () => {
      clearFoodTrioPointerTimers();
    };
  }, [clearFoodTrioPointerTimers]);

  const moveFoodTrioPointerToElement = useCallback((
    selector: string,
    anchorY = 0.5,
    offsetY = 0,
    pulse = false,
  ) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return null;

    const point = foodTrioButtonPoint(element, anchorY, offsetY);
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
  ) => {
    const element = moveFoodTrioPointerToElement(selector, anchorY, offsetY, true);
    if (!element) return null;

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
    }, 260);

    pointerTimersRef.current.push(clickTimer);

    return element;
  }, [moveFoodTrioPointerToElement]);

  const runCoffeeEntryPointer = useCallback((query: string) => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, delayMs);
      pointerTimersRef.current.push(timer);
    };

    const typeDelayMs = 28;
    const typingStartsAt = 1180;
    const submitAimAt = typingStartsAt + 220 + query.length * typeDelayMs + 420;

    queue(260, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-launcher="true"]', 0.5);
    });

    queue(980, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-launcher="true"]', 0.5);
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
      moveFoodTrioPointerToElement('[data-smartbar-mobile-submit="true"]', 0.5);
    });

    queue(submitAimAt + 760, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-submit="true"]', 0.5);
    });
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, moveFoodTrioPointerToElement]);

  const runCoffeeCartPointer = useCallback(() => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, delayMs);
      pointerTimersRef.current.push(timer);
    };

    // Coffee teaches the basic repair loop:
    // required red item -> one tap choice -> cart returns -> green row spotlight.
    queue(620, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="half-caf-cappuccino"]', 0.5);
    });

    queue(1500, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="half-caf-cappuccino"]', 0.5);
    });

    queue(2300, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="grande"]', 0.5);
    });

    queue(3200, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="grande"]', 0.5);
    });

    queue(4120, () => {
      moveFoodTrioPointerToElement('[data-smartbar-mobile-line-title-key="grande-iced-vanilla-lattes"]', 0.5);
    });

    queue(5000, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-line-title-key="grande-iced-vanilla-lattes"]', 0.5);
    });

    queue(6050, () => {
      setPointerState(FOOD_TRIO_POINTER_HIDDEN);
    });
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, moveFoodTrioPointerToElement]);

  const runFastFoodCartScrollPointer = useCallback(() => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, delayMs);
      pointerTimersRef.current.push(timer);
    };

    const moveToButton = (
      selector: string,
      anchorY: number,
      offsetY: number,
      pulse = false,
    ) => {
      const button = document.querySelector<HTMLElement>(selector);
      if (!button) return null;

      const point = foodTrioButtonPoint(button, anchorY, offsetY);
      setPointerState({
        visible: true,
        x: point.x,
        y: point.y,
        pulse,
      });

      return button;
    };

    queue(360, () => {
      moveToButton('[data-smartbar-mobile-cart-scroll-button="down"]', 1, 46);
    });

    queue(980, () => {
      moveToButton('[data-smartbar-mobile-cart-scroll-button="down"]', 0.55, 0);
    });

    queue(1260, () => {
      const button = moveToButton('[data-smartbar-mobile-cart-scroll-button="down"]', 0.55, 0, true);
      button?.click();
    });

    queue(1820, () => {
      moveToButton('[data-smartbar-mobile-cart-scroll-button="down"]', 1, 46);
    });

    queue(2380, () => {
      moveToButton('[data-smartbar-mobile-cart-scroll-button="down"]', 0.55, 0);
    });

    queue(2660, () => {
      const button = moveToButton('[data-smartbar-mobile-cart-scroll-button="down"]', 0.55, 0, true);
      button?.click();
    });

    queue(3520, () => {
      moveToButton('[data-smartbar-mobile-cart-scroll-button="up"]', 0, -42);
    });

    queue(4080, () => {
      moveToButton('[data-smartbar-mobile-cart-scroll-button="up"]', 0.45, 0);
    });

    queue(4360, () => {
      const button = moveToButton('[data-smartbar-mobile-cart-scroll-button="up"]', 0.45, 0, true);
      button?.click();
    });

    queue(5200, () => {
      setPointerState(FOOD_TRIO_POINTER_HIDDEN);
    });
  }, [clearFoodTrioPointerTimers]);

  const startScenario = useCallback((scenarioId: FoodTrioScenarioId) => {
    const query = foodTrioPromptForScenario(scenarioId);
    clearFoodTrioPointerTimers();
    pendingPointerScenarioRef.current = scenarioId === "coffee" || scenarioId === "fast-food" ? scenarioId : null;
    setActiveScenario(scenarioId);
    setActiveTargetId(null);

    if (scenarioId === "coffee") {
      setDemoSubmission(null);
      runCoffeeEntryPointer(query);
      return;
    }

    setDemoSubmission({
      id: submissionIdRef.current,
      query,
      typing: true,
      typeDelayMs: 28,
      submitDelayMs: 680,
    });
    submissionIdRef.current += 1;
  }, [clearFoodTrioPointerTimers, runCoffeeEntryPointer]);

  const handleSubmitPrompt = useCallback((query: string, _meta?: SmartBarMobileSubmitMeta) => {
    const nextScenario = foodTrioScenarioFromQuery(query, activeScenario);
    const result = foodTrioResultForQuery(query, activeScenario);
    pendingPointerScenarioRef.current = nextScenario === "coffee" || nextScenario === "fast-food" ? nextScenario : null;
    setActiveScenario(nextScenario);
    setLastResult(result);

    // Opening a cart should not move the menu. Menu navigation is reserved
    // for the explicit cart-line focus moment.
    setActiveTargetId(null);

    return result;
  }, [activeScenario]);

  const handleNavigateToLine = useCallback((line: SmartBarMobileOrderLine) => {
    if (scriptedPointerClickRef.current) {
      scriptedPointerClickRef.current = false;
    } else {
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
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.18),transparent_58%)]" />
      <FoodTrioTargetWall
        activeScenario={activeScenario}
        activeTargetId={activeTargetId}
        onScenarioSelect={(scenarioId) => {
              clearFoodTrioPointerTimers();
              clearSmartBarFocusOverlay();
              setActiveScenario(scenarioId);
              setActiveTargetId(null);
              window.setTimeout(() => scrollToFoodTrioScenario(scenarioId), 60);
            }}
        onSamplePrompt={startScenario}
      />

      <div className="pointer-events-none fixed left-3 right-3 top-3 z-30 rounded-full border border-white/12 bg-slate-950/72 px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/72 shadow-xl shadow-black/20 backdrop-blur-xl">
        {scenario.brand} · fixture wall
      </div>

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
            runFastFoodCartScrollPointer();
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
