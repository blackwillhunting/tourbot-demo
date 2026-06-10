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
  SMARTBAR_FLASH_CARD_TRANSITION_MS,

  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../../speed-demo/SmartBarFlashCardRail";
import {
  SmartBarFlashCardStack,
  type SmartBarFlashCardStackItem,
} from "../../speed-demo/SmartBarFlashCardStack";
import {
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
  tooltip?: string;
};

const FOOD_TRIO_POINTER_HIDDEN: FoodTrioPointerState = {
  visible: false,
  x: 0,
  y: 0,
  pulse: false,
  tooltip: undefined,
};

const FOOD_TRIO_POINTER_CADENCE = 1.12;
const FOOD_TRIO_POINTER_PRESS_HOLD_MS = 420;
const FOOD_TRIO_POINTER_REAIM_DISTANCE_PX = 34;
const FOOD_TRIO_POINTER_REAIM_OFFSET_X = -22;
const FOOD_TRIO_POINTER_REAIM_OFFSET_Y = -16;
const FOOD_TRIO_POINTER_REAIM_MS = 170;
const FOOD_TRIO_AFTER_SCENARIO_SETTLE_MS = 1400;
const FOOD_TRIO_TIMELINE_CARD_SETTLE_MS = 360;
const FOOD_TRIO_INTRO_POINTER_AIM_SETTLE_MS = 520;
const FOOD_TRIO_TARGET_TOP_INSET_PX = 10;
const FOOD_TRIO_TARGET_SCROLL_DURATION_MS = 2100;
const FOOD_TRIO_TARGET_SPOTLIGHT_AFTER_SCROLL_MS = 260;
const FOOD_TRIO_FIRST_NAVIGATION_STAGE_PX = 520;

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

function FoodTrioNarratorCards({ cards }: { cards: string[] }) {
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
          await wait(260);
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

function foodTrioTargetScrollTop(target: HTMLElement) {
  const currentTop = window.scrollY || document.documentElement.scrollTop || 0;
  const targetRect = target.getBoundingClientRect();
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  return Math.min(
    Math.max(currentTop + targetRect.top - FOOD_TRIO_TARGET_TOP_INSET_PX, 0),
    maxTop,
  );
}

function foodTrioEaseInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function slowScrollFoodTrioWindowTo(top: number, durationMs = FOOD_TRIO_TARGET_SCROLL_DURATION_MS) {
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
      const easedProgress = foodTrioEaseInOutCubic(rawProgress);

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

function foodTrioFirstTargetIdForScenario(scenarioId: FoodTrioScenarioId) {
  return foodTrioResultForScenario(scenarioId).lines.find((line) => line.targetId)?.targetId;
}

function stageFoodTrioScenarioForFirstNavigation(scenarioId: FoodTrioScenarioId) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const targetId = foodTrioFirstTargetIdForScenario(scenarioId);
  if (!targetId) return;

  const target = document.querySelector<HTMLElement>(
    `[data-foodtrio-target="${targetId}"], [data-tour-id="${targetId}"], #${targetId}`,
  );

  if (!target) return;

  const targetTop = foodTrioTargetScrollTop(target);
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const lowerStageTop = Math.min(targetTop + FOOD_TRIO_FIRST_NAVIGATION_STAGE_PX, maxTop);
  const upperStageTop = Math.max(targetTop - FOOD_TRIO_FIRST_NAVIGATION_STAGE_PX, 0);
  const stageTop =
    Math.abs(lowerStageTop - targetTop) > 220
      ? lowerStageTop
      : upperStageTop;

  if (Math.abs(stageTop - targetTop) < 180) return;

  // This runs during the segment stage-setting card. It creates enough distance
  // for the first cart-item tap to produce a visible page move before spotlight.
  window.scrollTo({ top: stageTop, left: 0, behavior: "auto" });
}

function scrollToFoodTrioTarget(targetId?: string) {
  if (!targetId || typeof document === "undefined" || typeof window === "undefined") return;

  const target = document.querySelector<HTMLElement>(
    `[data-foodtrio-target="${targetId}"], [data-tour-id="${targetId}"], #${targetId}`,
  );

  if (!target) return;

  const nextTop = foodTrioTargetScrollTop(target);

  clearSmartBarFocusOverlay();

  void slowScrollFoodTrioWindowTo(nextTop).then(() => {
    window.setTimeout(() => {
      void smartbarFocusTarget(
        {
          pageId: "foodtrio-mobile",
          targetId,
        },
        {
          initialDelayMs: 0,
          skipPlacementScroll: true,
          overlayDurationMs: 3600,
          dispatchLegacyEvent: false,
        },
      );
    }, FOOD_TRIO_TARGET_SPOTLIGHT_AFTER_SCROLL_MS);
  });
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

function scrollFoodTrioCartElementIntoView(selector: string) {
  if (typeof document === "undefined") return;

  const element = document.querySelector<HTMLElement>(selector);
  const container = document.querySelector<HTMLElement>('[data-smartbar-mobile-cart-scroll="true"]');
  if (!element || !container) return;

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const comfortableTop = containerRect.top + containerRect.height * 0.28;
  const comfortableBottom = containerRect.top + containerRect.height * 0.68;

  if (elementRect.top >= comfortableTop && elementRect.bottom <= comfortableBottom) {
    return;
  }

  const nextTop =
    container.scrollTop +
    (elementRect.top - containerRect.top) -
    container.clientHeight * 0.38 +
    elementRect.height * 0.5;

  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);

  container.scrollTo({
    top: Math.min(Math.max(nextTop, 0), maxTop),
    left: 0,
    behavior: "smooth",
  });
}

type FoodTrioIntroTeachingOptions = {
  revealLineId?: string | null;
  redResolved?: boolean;
  yellowResolved?: boolean;
  grayResolved?: boolean;
};

function foodTrioIntroTeachingResult(options: FoodTrioIntroTeachingOptions = {}): SmartBarMobileOrderResult {
  const {
    redResolved = false,
    yellowResolved = false,
    grayResolved = false,
  } = options;

  return {
    lines: [
      {
        id: "intro-green-ready",
        cartLineKey: "intro-green-ready",
        title: "Green = ready to go",
        demoDisplayTitle: "Item 1",
        demoHideMeta: true,
        status: "ready",
        helper: "",
        price: "",
        details: [],
      },
      {
        id: "intro-red-required",
        cartLineKey: "intro-red-required",
        title: "Red = required choice missing",
        demoDisplayTitle: "Item 2",
        demoHideMeta: true,
        status: redResolved ? "ready" : "pending",
        helper: "",
        price: "",
        details: redResolved ? ["Option 1 selected"] : [],
        options: redResolved ? undefined : ["Option 1", "Option 2", "Option 3", "Option 4"],
        optionSelectionMode: "single",
      },
      {
        id: "intro-yellow-options",
        cartLineKey: "intro-yellow-options",
        title: "Yellow = options available",
        demoDisplayTitle: "Item 3",
        demoHideMeta: true,
        status: yellowResolved ? "ready" : "options",
        helper: "",
        price: "",
        details: yellowResolved ? ["Option 2 selected", "Option 3 selected"] : [],
        options: yellowResolved ? undefined : ["Option 1", "Option 2", "Option 3", "Option 4"],
        optionSelectionMode: "multi",
      },
      {
        id: "intro-gray-match",
        cartLineKey: "intro-gray-match",
        title: "Gray = unmatched item",
        demoDisplayTitle: "Item 4",
        demoHideMeta: true,
        status: grayResolved ? "ready" : "unknown",
        helper: "",
        price: "",
        details: grayResolved ? ["New item entered"] : [],
        retryPrompt: grayResolved ? undefined : "Re-enter this item.",
      },
    ],
  };
}

function foodTrioPrepareCasualDiningResult(result: SmartBarMobileOrderResult): SmartBarMobileOrderResult {
  const normalizeOptionKey = (value: string) => (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );

  const isCheesecakeLine = (line: SmartBarMobileOrderLine) => {
    const combined = [
      line.id,
      line.cartLineKey,
      line.title,
      line.demoDisplayTitle,
      ...(line.details || []),
      ...(line.options || []),
    ]
      .filter(Boolean)
      .join(" ");

    const normalized = normalizeOptionKey(combined);

    return normalized.includes("original-cheesecake") || normalized.includes("cheesecake");
  };

  const optionExists = (values: string[], option: string) => (
    values.some((value) => normalizeOptionKey(value) === normalizeOptionKey(option))
  );

  const preselectedOption = "Extra whipped cream";
  const addedOption = "Fresh strawberries";

  return {
    ...result,
    lines: result.lines.map((line) => {
      if (!isCheesecakeLine(line)) {
        return line;
      }

      const details = [...(line.details || [])];

      // Preselected means it is already included on the line.
      // Do not remove it from options; the option chip still needs to exist
      // so the UI can visibly show it as already selected.
      if (!optionExists(details, preselectedOption)) {
        details.push(preselectedOption);
      }

      const options = [...(line.options || [])];

      if (!optionExists(options, preselectedOption)) {
        options.unshift(preselectedOption);
      }

      if (!optionExists(options, addedOption)) {
        options.push(addedOption);
      }

      return {
        ...line,
        status: "options",
        helper: "Extra whipped cream already included. Optional toppings available.",
        details,
        options,
        optionSelectionMode: line.optionSelectionMode || "multi",
      };
    }),
  };
}


type FoodTrioIntroResolvedKey = "none" | "red" | "redYellow" | "all";

type FoodTrioIntroLineId =
  | "intro-green-ready"
  | "intro-red-required"
  | "intro-yellow-options"
  | "intro-gray-match";

type FoodTrioIntroSpotlightTarget = "red" | "yellow";

type FoodTrioIntroBeat =
  | {
      kind: "show-line";
      delayMs: number;
      lineId: FoodTrioIntroLineId;
      resolved: FoodTrioIntroResolvedKey;
      selector: string;
      tooltip: string;
    }
  | {
      kind: "move-line";
      delayMs: number;
      lineId: FoodTrioIntroLineId | null;
      resolved: FoodTrioIntroResolvedKey;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
      tooltip?: string;
      spotlightTarget?: FoodTrioIntroSpotlightTarget;
    }
  | {
      kind: "move";
      delayMs: number;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
      tooltip?: string;
    }
  | {
      kind: "tap";
      delayMs: number;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
      tooltip?: string;
    }
  | {
      kind: "resolve";
      delayMs: number;
      lineId: FoodTrioIntroLineId | null;
      resolved: FoodTrioIntroResolvedKey;
    }
  | {
      kind: "spotlight";
      delayMs: number;
      active: boolean;
      target?: FoodTrioIntroSpotlightTarget;
    }
  | {
      kind: "type-retry";
      delayMs: number;
      value: string;
    }
  | {
      kind: "teaching-card";
      delayMs: number;
      cards: string[];
      holdMs: number;
    }
  | {
      // Backward-compatible alias for teaching-card.
      // Prefer kind: "teaching-card" for new edits.
      kind: "zip";
      delayMs: number;
      cards: string[];
      holdMs: number;
    }
  | {
      kind: "finish";
      delayMs: number;
    };

const FOOD_TRIO_INTRO_RESOLVED_STATES: Record<FoodTrioIntroResolvedKey, { red: boolean; yellow: boolean; gray: boolean }> = {
  none: { red: false, yellow: false, gray: false },
  red: { red: true, yellow: false, gray: false },
  redYellow: { red: true, yellow: true, gray: false },
  all: { red: true, yellow: true, gray: true },
};

const FOOD_TRIO_INTRO_SELECTORS = {
  green: '[data-smartbar-mobile-line-title-key="green-ready-to-go"]',
  red: '[data-smartbar-mobile-line-title-key="red-required-choice-missing"]',
  yellow: '[data-smartbar-mobile-line-title-key="yellow-options-available"]',
  gray: '[data-smartbar-mobile-line-title-key="gray-unmatched-item"]',
  option1: '[data-smartbar-mobile-option-key="option-1"]',
  option2: '[data-smartbar-mobile-option-key="option-2"]',
  option3: '[data-smartbar-mobile-option-key="option-3"]',
  detailClose: '[data-smartbar-mobile-detail-close="true"]',
  retrySubmit: '[data-smartbar-mobile-retry-submit="true"]',
  checkout: '[data-smartbar-mobile-checkout="true"]',
  launcher: '[data-smartbar-mobile-launcher="true"]',
  submit: '[data-smartbar-mobile-submit="true"]',
} as const;

type FoodTrioIntroAnimationBeat =
  | {
      kind: "pointer-start";
      delayMs: number;
      xRatio: number;
      yRatio: number;
    }
  | {
      kind: "move";
      delayMs: number;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
    }
  | {
      kind: "tap";
      delayMs: number;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
    }
  | {
      kind: "type";
      delayMs: number;
      prompt: string;
      typeDelayMs: number;
    };

type FoodTrioStoryboardBeat =
  | {
      kind: "cards";
      cards: string[];
      holdMs: number;
    }
  | {
      kind: "intro-animation";
    }
  | {
      kind: "load-wall";
      scenarioId: FoodTrioScenarioId;
      settleMs?: number;
    }
  | {
      kind: "hide-wall";
      settleMs?: number;
    }
  | {
      kind: "start-scenario";
      scenarioId: FoodTrioScenarioId;
      skipSegmentCard?: boolean;
    };

const FOOD_TRIO_INTRO_ANIMATION_PROMPT = "Enter order in plain English.";

const FOOD_TRIO_INTRO_ANIMATION_BEATS: FoodTrioIntroAnimationBeat[] = [
  {
    kind: "pointer-start",
    delayMs: 1180,
    xRatio: 0.58,
    yRatio: 0.66,
  },
  {
    kind: "move",
    delayMs: 580,
    selector: FOOD_TRIO_INTRO_SELECTORS.launcher,
    anchorX: 0.10,
  },
  {
    kind: "tap",
    delayMs: 780,
    selector: FOOD_TRIO_INTRO_SELECTORS.launcher,
    anchorX: 0.10,
  },
  {
    kind: "type",
    delayMs: 1720,
    prompt: FOOD_TRIO_INTRO_ANIMATION_PROMPT,
    typeDelayMs: 25,
  },
  {
    kind: "move",
    delayMs: 2000,
    selector: FOOD_TRIO_INTRO_SELECTORS.submit,
    anchorX: 0.10,
  },
  {
    kind: "tap",
    delayMs: 870,
    selector: FOOD_TRIO_INTRO_SELECTORS.submit,
    anchorX: 0.10,
  },
];

const FOOD_TRIO_STORYBOARD: FoodTrioStoryboardBeat[] = [
  {
    kind: "cards",
    cards: ["SmartBar", "A search bar", "That builds carts."],
    holdMs: 4500,
  },
  {
    kind: "cards",
    cards: ["Like having Alexa.", "On any site."],
    holdMs: 5000,
  },
  {
    kind: "intro-animation",
  },
    {
    kind: "cards",
    cards: ["Type order.", "Get cart.", "Tap colors,", "Checkout."],
    holdMs: 4500,
  },
  {
    kind: "cards",
    cards: ["Same idea.", "Now on real menus."],
    holdMs: 4500,
  },
  {
    kind: "load-wall",
    scenarioId: "coffee",
    settleMs: 420,
  },
  {
    kind: "cards",
    cards: ["Coffee shop.", "A few items.", "Lots of detail."],
    holdMs: 4000,
  },
  {
    kind: "start-scenario",
    scenarioId: "coffee",
    skipSegmentCard: true,
  },
  {
    kind: "load-wall",
    scenarioId: "fast-food",
    settleMs: 620,
  },
  {
    kind: "cards",
    cards: ["Fast food.", "Big order.", "Fast cleanup."],
    holdMs: 4000,
  },
  {
    kind: "start-scenario",
    scenarioId: "fast-food",
    skipSegmentCard: true,
  },
  {
    kind: "load-wall",
    scenarioId: "casual-dining",
    settleMs: 620,
  },
  {
    kind: "cards",
    cards: ["Casual dining.", "Full meal.", "Full range."],
    holdMs: 4000,
  },
  {
    kind: "start-scenario",
    scenarioId: "casual-dining",
    skipSegmentCard: true,
  },
  {
    kind: "hide-wall",
    settleMs: 520,
  },
{
  kind: "cards",
  cards: ["One bar.", "Any menu.", "Any order."],
  holdMs: 3500,
},
{
  kind: "cards",
  cards: ["Fewer calls.", "Fewer abandoned carts.", "More direct orders."],
  holdMs: 3500,
},
{
  kind: "cards",
  cards: ["Setup is simple."],
  holdMs: 2400,
},
{
  kind: "cards",
  cards: ["Site scan.", "Code snippet.", "Menu pack."],
  holdMs: 3000,
},
{
  kind: "cards",
  cards: ["Direct orders.", "Made simple."],
  holdMs: 5500,
},
];

type FoodTrioPointerBeat =
  | {
      kind: "move";
      delayMs: number;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
      tooltip?: string;
    }
  | {
      kind: "tap";
      delayMs: number;
      selector: string;
      anchorY?: number;
      offsetY?: number;
      anchorX?: number;
      tooltip?: string;
    }
  | {
      kind: "cart-card";
      delayMs: number;
      cards: string[];
      holdMs: number;
    }
  | {
      kind: "hide";
      delayMs: number;
    };

type FoodTrioNarratorCardBeat = {
  delayMs: number;
  holdMs: number;
  cards: string[];
};

const FOOD_TRIO_FAST_FOOD_FILTER_CARD: FoodTrioNarratorCardBeat = {
  delayMs: 0,
  holdMs: 5000,
  cards: ["Long messy order.", "Use color filters.", "Cut through it fast."],
};

const FOOD_TRIO_CASUAL_GREEN_EDIT_CARD: FoodTrioNarratorCardBeat = {
  delayMs: 15420,
  holdMs: 5000,
  cards: ["Green means ready.", "But you can edit."],
};

const FOOD_TRIO_COFFEE_CART_SELECTORS = {
  latte: '[data-smartbar-mobile-line-title-key="iced-vanilla-latte"]',
  vanillaColdFoam: '[data-smartbar-mobile-option-key="vanilla-cold-foam"]',
  caramelDrizzle: '[data-smartbar-mobile-option-key="caramel-drizzle"]',
  extraVanilla: '[data-smartbar-mobile-option-key="extra-vanilla"]',
  matcha: '[data-smartbar-mobile-line-title-key="matcha-latte"]',
  extraMatcha: '[data-smartbar-mobile-option-key="extra-matcha"]',
  lightIce: '[data-smartbar-mobile-option-key="light-ice"]',
  coldBrew: '[data-smartbar-mobile-line-title-key="cold-brew"]',
  detailClose: '[data-smartbar-mobile-detail-close="true"]',
  checkout: '[data-smartbar-mobile-checkout="true"]',
} as const;

// Demo 1 / Coffee cart choreography:
// - delayMs is relative to the previous beat, not an absolute timestamp.
// - To slow one moment, change only that beat's delayMs.
// - Fast food and casual dining are still in their old pointer functions for now.
const FOOD_TRIO_COFFEE_CART_BEATS: FoodTrioPointerBeat[] = [
  // Drink 1: first real menu navigation moment, after the prompt creates the cart.
  {
    kind: "cart-card",
    delayMs: 500,
    cards: ["Tap an item.", "SmartBar scrolls the site.", "Spotlights the match."],
    holdMs: 5200,
  },
  { kind: "move", delayMs: 900, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.latte, tooltip: "Tap cart item" },
  { kind: "tap", delayMs: 1900, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.latte },
  { kind: "move", delayMs: 5200, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.vanillaColdFoam, tooltip: "Choose option" },
  { kind: "tap", delayMs: 2400, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.vanillaColdFoam },
  { kind: "move", delayMs: 1140, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.caramelDrizzle },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.caramelDrizzle },
  { kind: "move", delayMs: 1140, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.extraVanilla },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.extraVanilla },
  { kind: "move", delayMs: 1220, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.detailClose, anchorX: 0.10 },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.detailClose, anchorX: 0.10 },

  // Drink 2: add one modifier and remove one existing modifier.
  { kind: "move", delayMs: 1220, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.matcha },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.matcha },
  { kind: "move", delayMs: 4200, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.extraMatcha },
  { kind: "tap", delayMs: 1200, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.extraMatcha },
  { kind: "move", delayMs: 1140, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.lightIce },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.lightIce },
  { kind: "move", delayMs: 1220, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.detailClose, anchorX: 0.10 },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.detailClose, anchorX: 0.10 },

  // Drink 3: review and pass. This teaches that yellow does not force a change.
  { kind: "move", delayMs: 1220, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.coldBrew, tooltip: "Tap to review" },
  { kind: "tap", delayMs: 1800, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.coldBrew },
  {
    kind: "cart-card",
    delayMs: 900,
    cards: ["Extras are optional.", "You can leave as is."],
    holdMs: 4500,
  },
  { kind: "move", delayMs: 800, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.detailClose, anchorX: 0.10, tooltip: "Move on" },
  { kind: "tap", delayMs: 1800, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.detailClose, anchorX: 0.10 },
  { kind: "move", delayMs: 1220, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.checkout, anchorX: 0.10 },
  { kind: "tap", delayMs: 980, selector: FOOD_TRIO_COFFEE_CART_SELECTORS.checkout, anchorX: 0.10 },
  { kind: "hide", delayMs: 1120 },
];

// Intro teaching timeline:
// - delayMs is relative to the previous beat, not an absolute timestamp.
// - To insert a safe card note during teaching, add:
//   { kind: "teaching-card", delayMs: 0, cards: ["Your note."], holdMs: 1600 }
// - The runner hides the pointer, lets the card slide in/out, waits briefly,
//   then the next pointer beat re-aims from the live DOM.
// - kind: "zip" still works as an old alias, but do not use it for new edits.
// - Later beats move automatically because the runner accumulates elapsed time.
const FOOD_TRIO_INTRO_TIMELINE: FoodTrioIntroBeat[] = [
  {
    kind: "teaching-card",
    delayMs: 0,
    cards: ["Cart built.", "Colors tell you what to do."],
    holdMs: 4000,
  },

  // First, reveal the four color states without asking the viewer to act yet.
  // {
  //   kind: "show-line",
  //   delayMs: 250,
  //   lineId: "intro-green-ready",
  //   resolved: "none",
  //   selector: FOOD_TRIO_INTRO_SELECTORS.green,
  //   tooltip: "",
  // },
  // {
  //   kind: "show-line",
  //   delayMs: 850,
  //   lineId: "intro-red-required",
  //   resolved: "none",
  //   selector: FOOD_TRIO_INTRO_SELECTORS.red,
  //   tooltip: "",
  // },
  // {
  //   kind: "show-line",
  //   delayMs: 850,
  //   lineId: "intro-yellow-options",
  //   resolved: "none",
  //   selector: FOOD_TRIO_INTRO_SELECTORS.yellow,
  //   tooltip: "",
  // },
  // {
  //   kind: "show-line",
  //   delayMs: 850,
  //   lineId: "intro-gray-match",
  //   resolved: "none",
  //   selector: FOOD_TRIO_INTRO_SELECTORS.gray,
  //   tooltip: "",
  // },

  // Explicit legend. This is the teaching moment the viewer needs.
  // {
  //   kind: "teaching-card",
  //   delayMs: 950,
  //   cards: [
  //     "Green = ready.",
  //     "Red = required choice.",
  //     "Yellow = optional review.",
  //     "Gray = not matched.",
  //   ],
  //   holdMs: 4300,
  // },

  // Red: required choice.
  {
    kind: "move-line",
    delayMs: 950,
    lineId: "intro-red-required",
    resolved: "none",
    selector: FOOD_TRIO_INTRO_SELECTORS.red,
    tooltip: "Red means required choice",
  },
  {
    kind: "tap",
    delayMs: 3400,
    selector: FOOD_TRIO_INTRO_SELECTORS.red,
  },
  {
    kind: "move",
    delayMs: 1800,
    selector: FOOD_TRIO_INTRO_SELECTORS.option1,
    tooltip: "Choose one option",
  },
  {
    kind: "tap",
    delayMs: 2100,
    selector: FOOD_TRIO_INTRO_SELECTORS.option1,
  },
  {
    kind: "resolve",
    delayMs: 1200,
    lineId: "intro-red-required",
    resolved: "red",
  },

  // Yellow: optional review.
  {
    kind: "move-line",
    delayMs: 1500,
    lineId: "intro-yellow-options",
    resolved: "red",
    selector: FOOD_TRIO_INTRO_SELECTORS.yellow,
    tooltip: "Yellow means optional review",
  },
  {
    kind: "tap",
    delayMs: 2400,
    selector: FOOD_TRIO_INTRO_SELECTORS.yellow,
  },
  {
    kind: "move",
    delayMs: 1800,
    selector: FOOD_TRIO_INTRO_SELECTORS.option2,
    tooltip: "Add or skip extras",
  },
  {
    kind: "tap",
    delayMs: 1900,
    selector: FOOD_TRIO_INTRO_SELECTORS.option2,
  },
  {
    kind: "move",
    delayMs: 1300,
    selector: FOOD_TRIO_INTRO_SELECTORS.option3,
  },
  {
    kind: "tap",
    delayMs: 1600,
    selector: FOOD_TRIO_INTRO_SELECTORS.option3,
  },
  {
    kind: "move",
    delayMs: 800,
    selector: FOOD_TRIO_INTRO_SELECTORS.detailClose,
    anchorX: 0.10,
  },
  {
    kind: "tap",
    delayMs: 1600,
    selector: FOOD_TRIO_INTRO_SELECTORS.detailClose,
    anchorX: 0.10,
  },
  {
    kind: "resolve",
    delayMs: 1200,
    lineId: "intro-yellow-options",
    resolved: "redYellow",
  },

  // Gray: unmatched / clarify.
  {
    kind: "move-line",
    delayMs: 1500,
    lineId: "intro-gray-match",
    resolved: "redYellow",
    selector: FOOD_TRIO_INTRO_SELECTORS.gray,
    tooltip: "Gray means not matched",
  },
  {
    kind: "tap",
    delayMs: 2400,
    selector: FOOD_TRIO_INTRO_SELECTORS.gray,
  },
  {
    kind: "type-retry",
    delayMs: 1800,
    value: "New item entered",
  },
  {
    kind: "move",
    delayMs: 1300,
    selector: FOOD_TRIO_INTRO_SELECTORS.retrySubmit,
    anchorX: 0.10,
    tooltip: "Clarify the item",
  },
  {
    kind: "tap",
    delayMs: 2100,
    selector: FOOD_TRIO_INTRO_SELECTORS.retrySubmit,
    anchorX: 0.10,
  },
  {
    kind: "resolve",
    delayMs: 1300,
    lineId: null,
    resolved: "all",
  },

  // Final proof.
  {
    kind: "teaching-card",
    delayMs: 900,
    cards: ["All green.", "Ready for checkout."],
    holdMs: 2300,
  },
  {
    kind: "move-line",
    delayMs: 900,
    lineId: null,
    resolved: "all",
    selector: FOOD_TRIO_INTRO_SELECTORS.checkout,
    anchorX: 0.10,
    tooltip: "Checkout",
  },
  {
    kind: "tap",
    delayMs: 2100,
    selector: FOOD_TRIO_INTRO_SELECTORS.checkout,
    anchorX: 0.10,
  },
  {
    kind: "finish",
    delayMs: 2600,
  },
];

function FoodTrioIntroSpotlightReel({ active, target }: { active: boolean; target: "red" | "yellow" }) {
  if (!active) return null;

  const isYellow = target === "yellow";
  const targetLabel = isYellow ? "Item 3" : "Item 2";
  const targetTone = isYellow ? "bg-yellow-300 text-yellow-950" : "bg-red-300 text-red-950";
  const targetRing = isYellow ? "ring-yellow-100/88" : "ring-red-100/88";
  const captionTone = isYellow ? "text-yellow-900/80" : "text-red-900/80";
  const pulseBorder = isYellow ? "border-yellow-100/80 bg-yellow-200/13" : "border-red-100/80 bg-red-200/13";
  const pulseGlow = isYellow
    ? "0 0 0 1px rgba(254, 240, 138, 0.80),0 0 26px rgba(250, 204, 21, 0.44),0 0 48px rgba(59, 130, 246, 0.18)"
    : "0 0 0 1px rgba(254, 202, 202, 0.80),0 0 26px rgba(248, 113, 113, 0.44),0 0 48px rgba(59, 130, 246, 0.18)";
  const pulseGlowStrong = isYellow
    ? "0 0 0 2px rgba(254, 249, 195, 0.96),0 0 38px rgba(250, 204, 21, 0.68),0 0 68px rgba(59, 130, 246, 0.28)"
    : "0 0 0 2px rgba(254, 226, 226, 0.96),0 0 38px rgba(248, 113, 113, 0.68),0 0 68px rgba(59, 130, 246, 0.28)";
  const slotClass = isYellow
    ? "border-yellow-200/70 bg-yellow-300/14 shadow-[0_0_34px_rgba(250,204,21,0.42)]"
    : "border-red-200/70 bg-red-300/14 shadow-[0_0_34px_rgba(248,113,113,0.42)]";

  const stagedCards = [
    {
      label: "Item 12",
      tone: "bg-emerald-300/74 text-emerald-950",
      size: "h-9 w-[58%]",
      delayMs: 0,
      final: "exit",
    },
    {
      label: isYellow ? "Item 2" : "Item 24",
      tone: isYellow ? "bg-red-300/78 text-red-950" : "bg-yellow-300/80 text-yellow-950",
      size: "h-10 w-[70%]",
      delayMs: 560,
      final: "exit",
    },
    {
      label: "Item 7",
      tone: "bg-slate-300/82 text-slate-950",
      size: "h-9 w-[52%]",
      delayMs: 1120,
      final: "exit",
    },
    {
      label: targetLabel,
      tone: targetTone,
      size: "h-[4.35rem] w-[90%]",
      delayMs: 1680,
      final: "land",
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[44svh] z-[10082] flex justify-center px-5">
      <style>
        {`
          @keyframes foodTrioIntroVerticalCardExit {
            0% {
              transform: translate3d(-50%, 8.6rem, 0) scale(0.92);
              opacity: 0;
              filter: blur(7px);
            }
            22% {
              opacity: 1;
              filter: blur(0);
            }
            50% {
              transform: translate3d(-50%, 0, 0) scale(1);
              opacity: 1;
              filter: blur(0);
            }
            76% {
              transform: translate3d(-50%, -4.9rem, 0) scale(0.96);
              opacity: 0.58;
              filter: blur(1px);
            }
            100% {
              transform: translate3d(-50%, -9.6rem, 0) scale(0.90);
              opacity: 0;
              filter: blur(7px);
            }
          }

          @keyframes foodTrioIntroVerticalCardLand {
            0% {
              transform: translate3d(-50%, 8.6rem, 0) scale(0.92);
              opacity: 0;
              filter: blur(7px);
            }
            28% {
              opacity: 1;
              filter: blur(0);
            }
            70% {
              transform: translate3d(-50%, -0.32rem, 0) scale(1.018);
              opacity: 1;
              filter: blur(0);
            }
            84% {
              transform: translate3d(-50%, 0.18rem, 0) scale(0.995);
              opacity: 1;
              filter: blur(0);
            }
            100% {
              transform: translate3d(-50%, 0, 0) scale(1);
              opacity: 1;
              filter: blur(0);
            }
          }

          @keyframes foodTrioIntroLockedItemPulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.56;
              box-shadow: var(--foodtrio-intro-pulse);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.07);
              opacity: 1;
              box-shadow: var(--foodtrio-intro-pulse-strong);
            }
          }

          @keyframes foodTrioIntroSpotlightCaptionIn {
            0%, 62% {
              transform: translate3d(0, 0.35rem, 0);
              opacity: 0;
            }
            100% {
              transform: translate3d(0, 0, 0);
              opacity: 1;
            }
          }
        `}
      </style>

      <div className="relative h-[15.8rem] w-[min(22rem,86vw)] overflow-hidden rounded-[1.65rem] border border-white/28 bg-white/28 p-3 shadow-[0_24px_60px_rgba(30,64,175,0.20),inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-2xl">
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/50 to-transparent" />

        <div
          className={`absolute left-1/2 top-1/2 h-[5.18rem] w-[94%] rounded-[1.55rem] border ${pulseBorder}`}
          style={{
            animation: "foodTrioIntroLockedItemPulse 1.34s ease-in-out 2.44s infinite both",
            "--foodtrio-intro-pulse": pulseGlow,
            "--foodtrio-intro-pulse-strong": pulseGlowStrong,
          } as React.CSSProperties}
        />
        <div className={`absolute inset-x-4 top-1/2 h-[4.95rem] -translate-y-1/2 rounded-[1.45rem] border ${slotClass}`} />

        <div className="absolute left-1/2 top-1/2 h-[4.95rem] w-[92%] -translate-x-1/2 -translate-y-1/2">
          {stagedCards.map((card) => {
            const isTarget = card.label === targetLabel;
            const animationName = card.final === "land" ? "foodTrioIntroVerticalCardLand" : "foodTrioIntroVerticalCardExit";
            const animationDuration = card.final === "land" ? 1040 : 980;

            return (
              <div
                key={`${target}-${card.label}`}
                className={[
                  "absolute left-1/2 top-1/2 flex items-center justify-center rounded-[1.2rem] px-4 text-center font-black tracking-[-0.025em] shadow-[0_8px_24px_rgba(15,23,42,0.13)]",
                  card.tone,
                  card.size,
                  isTarget ? `z-20 text-[20px] ring-2 ${targetRing}` : "z-10 text-[13px]",
                ].join(" ")}
                style={{
                  animation: `${animationName} ${animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${card.delayMs}ms both`,
                }}
              >
                <div>
                  {card.label}
                  {isTarget ? (
                    <div className={`mt-1 text-[12px] font-black uppercase tracking-[0.10em] ${captionTone}`} style={{ animation: "foodTrioIntroSpotlightCaptionIn 1500ms ease-out 1680ms both" }}>
                      Item spotlighted on site
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FoodTrioMobileExperience() {
  const [activeScenario, setActiveScenario] = useState<FoodTrioScenarioId>("coffee");
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [lastResult, setLastResult] = useState<SmartBarMobileOrderResult>(() => foodTrioResultForScenario("coffee"));
  const [pointerState, setPointerState] = useState<FoodTrioPointerState>(FOOD_TRIO_POINTER_HIDDEN);
  const [narratorCards, setNarratorCards] = useState<string[]>([]);
  const [introStageVisible, setIntroStageVisible] = useState(true);
  const [introSpotlightActive, setIntroSpotlightActive] = useState(false);
  const [introSpotlightTarget, setIntroSpotlightTarget] = useState<"red" | "yellow">("red");
  const [introRevealLineId, setIntroRevealLineId] = useState<string | null>(null);
  const [introResolved, setIntroResolved] = useState({ red: false, yellow: false, gray: false });
  const submissionIdRef = useRef(1);
  const pointerTimersRef = useRef<number[]>([]);
  const narratorCardTimersRef = useRef<number[]>([]);
  const introStartedRef = useRef(false);
  const introTeachingActiveRef = useRef(false);
  const introTeachingReadyRef = useRef(false);
  const introTeachingCompleteRef = useRef<(() => void) | null>(null);
  const lastPointerPointRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedSinceLastTapRef = useRef(false);
  const pendingPointerScenarioRef = useRef<FoodTrioScenarioId | null>(null);
  const scenarioCompleteRef = useRef<(() => void) | null>(null);
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

  const scheduleFoodTrioNarratorCard = useCallback((beat: FoodTrioNarratorCardBeat) => {
    const showCardTimer = window.setTimeout(() => {
      setPointerState(FOOD_TRIO_POINTER_HIDDEN);
      lastPointerPointRef.current = null;
      pointerMovedSinceLastTapRef.current = false;
      setNarratorCards(beat.cards);

      const clearCardTimer = window.setTimeout(() => {
        setNarratorCards([]);
      }, beat.holdMs);
      narratorCardTimersRef.current.push(clearCardTimer);
    }, Math.round(beat.delayMs * FOOD_TRIO_POINTER_CADENCE));

    narratorCardTimersRef.current.push(showCardTimer);
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
    tooltip?: string,
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
      tooltip,
    });

    return element;
  }, []);

  const clickFoodTrioPointerElement = useCallback((
    selector: string,
    anchorY = 0.5,
    offsetY = 0,
    anchorX = 0.5,
    tooltip?: string,
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
        tooltip,
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
    // Give the shell time to finish opening before fake typing begins.
    // Starting too early can show the pause/processing symbol without visible characters.
    const typingStartsAt = 1500;
    const submitAimAt = typingStartsAt + 360 + query.length * typeDelayMs + 520;

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

  const runFoodTrioPointerBeatSequence = useCallback((beats: FoodTrioPointerBeat[], onComplete?: () => void) => {
    clearFoodTrioPointerTimers();

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, Math.round(delayMs * FOOD_TRIO_POINTER_CADENCE));
      pointerTimersRef.current.push(timer);
    };

    let elapsedMs = 0;

    beats.forEach((beat) => {
      elapsedMs += beat.delayMs;

      queue(elapsedMs, () => {
        switch (beat.kind) {
          case "move":
            moveFoodTrioPointerToElement(
              beat.selector,
              beat.anchorY ?? 0.5,
              beat.offsetY ?? 0,
              false,
              beat.anchorX ?? 0.5,
              beat.tooltip,
            );
            break;

          case "tap":
            clickFoodTrioPointerElement(
              beat.selector,
              beat.anchorY ?? 0.5,
              beat.offsetY ?? 0,
              beat.anchorX ?? 0.5,
              beat.tooltip,
            );
            break;

          case "cart-card": {
            setPointerState(FOOD_TRIO_POINTER_HIDDEN);
            lastPointerPointRef.current = null;
            pointerMovedSinceLastTapRef.current = false;
            setNarratorCards(beat.cards);

            const clearCardTimer = window.setTimeout(() => {
              setNarratorCards([]);
            }, beat.holdMs);
            narratorCardTimersRef.current.push(clearCardTimer);
            break;
          }

          case "hide":
            setPointerState(FOOD_TRIO_POINTER_HIDDEN);
            break;

          default:
            break;
        }
      });

      if (beat.kind === "cart-card") {
        elapsedMs += beat.holdMs + SMARTBAR_FLASH_CARD_TRANSITION_MS + FOOD_TRIO_TIMELINE_CARD_SETTLE_MS;
      }
    });

    if (onComplete) {
      queue(elapsedMs + FOOD_TRIO_AFTER_SCENARIO_SETTLE_MS, onComplete);
    }
  }, [clearFoodTrioPointerTimers, clickFoodTrioPointerElement, moveFoodTrioPointerToElement]);

  const runCoffeeCartPointer = useCallback((onComplete?: () => void) => {
    runFoodTrioPointerBeatSequence(FOOD_TRIO_COFFEE_CART_BEATS, onComplete);
  }, [runFoodTrioPointerBeatSequence]);

  const runFastFoodCartPointer = useCallback((onComplete?: () => void) => {
    clearFoodTrioPointerTimers();

    const filterIntroCard = FOOD_TRIO_FAST_FOOD_FILTER_CARD;
    const filterIntroDelayMs = filterIntroCard.delayMs;
    const filterIntroHoldMs = filterIntroCard.holdMs;
    const uglyCartPreviewHoldMs = 5200;
    const navigationHoldMs = 2400;
    const navigationThresholds = [3700, 8100, 12500, 19220, 25920, 36940];

    const adjustedDelay = (delayMs: number) => (
      delayMs +
      uglyCartPreviewHoldMs +
      filterIntroDelayMs +
      filterIntroHoldMs +
      navigationThresholds.filter((threshold) => delayMs > threshold).length * navigationHoldMs
    );

    const queueRaw = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(
        callback,
        Math.round(delayMs * FOOD_TRIO_POINTER_CADENCE),
      );
      pointerTimersRef.current.push(timer);
    };

    // Fast Food first impression: show the ugly, long cart before filtering it.
    // This uses the same invisible scroll buttons as the final all-green proof.
    queueRaw(520, () => {
      moveFoodTrioPointerToElement('[data-food-trio-scroll-button="down"]', 0.5, 0, false, 0.5, "Scan the mess");
    });

    queueRaw(1500, () => {
      clickFoodTrioPointerElement('[data-food-trio-scroll-button="down"]', 0.5);
    });

    queueRaw(3260, () => {
      moveFoodTrioPointerToElement('[data-food-trio-scroll-button="up"]', 0.5, 0, false, 0.5, "Back to filters");
    });

    queueRaw(4240, () => {
      clickFoodTrioPointerElement('[data-food-trio-scroll-button="up"]', 0.5);
    });

    scheduleFoodTrioNarratorCard({
      ...filterIntroCard,
      delayMs: uglyCartPreviewHoldMs + filterIntroDelayMs,
    });

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(
        callback,
        Math.round(adjustedDelay(delayMs) * FOOD_TRIO_POINTER_CADENCE),
      );
      pointerTimersRef.current.push(timer);
    };

    if (onComplete) {
      const completionTimer = window.setTimeout(
        onComplete,
        Math.round(adjustedDelay(53800 + FOOD_TRIO_AFTER_SCENARIO_SETTLE_MS) * FOOD_TRIO_POINTER_CADENCE),
      );
      narratorCardTimersRef.current.push(completionTimer);
    }

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

  const runCasualDiningCartPointer = useCallback((onComplete?: () => void) => {
    clearFoodTrioPointerTimers();

    const greenEditCard = FOOD_TRIO_CASUAL_GREEN_EDIT_CARD;
    const navigationHoldMs = 2400;
    const greenCardHoldMs = greenEditCard.holdMs;
    const greenCardBaseTimeMs = greenEditCard.delayMs;
    const greenFilterBaseTimeMs = greenCardBaseTimeMs + 700;
    const navigationThresholds = [3780, 10500, 19300];

    const adjustedDelay = (delayMs: number) => (
      delayMs +
      navigationThresholds.filter((threshold) => delayMs > threshold).length * navigationHoldMs +
      (delayMs >= greenFilterBaseTimeMs ? greenCardHoldMs : 0)
    );

    scheduleFoodTrioNarratorCard({
      ...greenEditCard,
      delayMs: adjustedDelay(greenCardBaseTimeMs),
    });

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(
        callback,
        Math.round(adjustedDelay(delayMs) * FOOD_TRIO_POINTER_CADENCE),
      );
      pointerTimersRef.current.push(timer);
    };

    if (onComplete) {
      const completionTimer = window.setTimeout(
        onComplete,
        Math.round(adjustedDelay(34900 + FOOD_TRIO_AFTER_SCENARIO_SETTLE_MS) * FOOD_TRIO_POINTER_CADENCE),
      );
      narratorCardTimersRef.current.push(completionTimer);
    }

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
      moveFoodTrioPointerToElement('[data-smartbar-mobile-option-key="fresh-strawberries"]', 0.5, 0, false, 0.5, "Add another topping");
    });

    queue(12700, () => {
      clickFoodTrioPointerElement('[data-smartbar-mobile-option-key="fresh-strawberries"]', 0.5);
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

  const runFoodTrioIntroSimulation = useCallback((onComplete?: () => void) => {
    clearFoodTrioPointerTimers();
    clearFoodTrioNarratorCards();

    introTeachingCompleteRef.current = onComplete ?? null;
    introTeachingActiveRef.current = true;
    introTeachingReadyRef.current = false;
    setIntroSpotlightActive(false);
    setIntroSpotlightTarget("red");
    setIntroRevealLineId(null);
    setIntroResolved({ red: false, yellow: false, gray: false });
    setActiveScenario("coffee");
    setActiveTargetId(null);
    setDemoSubmission(null);
    setIntroStageVisible(true);

    const queue = (delayMs: number, callback: () => void) => {
      const timer = window.setTimeout(callback, delayMs);
      pointerTimersRef.current.push(timer);
    };

    const runAnimationBeat = (beat: FoodTrioIntroAnimationBeat) => {
      switch (beat.kind) {
        case "pointer-start": {
          const width = window.innerWidth || 390;
          const height = window.innerHeight || 780;
          setPointerState({
            visible: true,
            x: width * beat.xRatio,
            y: height * beat.yRatio,
            pulse: false,
          });
          break;
        }

        case "move":
          moveFoodTrioPointerToElement(
            beat.selector,
            beat.anchorY ?? 0.5,
            beat.offsetY ?? 0,
            false,
            beat.anchorX ?? 0.5,
          );
          break;

        case "tap":
          clickFoodTrioPointerElement(
            beat.selector,
            beat.anchorY ?? 0.5,
            beat.offsetY ?? 0,
            beat.anchorX ?? 0.5,
          );
          break;

        case "type":
          setDemoSubmission({
            id: submissionIdRef.current,
            query: beat.prompt,
            typing: true,
            typeDelayMs: beat.typeDelayMs,
            submitDelayMs: 0,
            manualSubmit: true,
          });
          submissionIdRef.current += 1;
          break;

        default:
          break;
      }
    };

    let elapsedMs = 0;

    FOOD_TRIO_INTRO_ANIMATION_BEATS.forEach((beat) => {
      elapsedMs += beat.delayMs;
      queue(elapsedMs, () => runAnimationBeat(beat));
    });
  }, [
    clearFoodTrioNarratorCards,
    clearFoodTrioPointerTimers,
    clickFoodTrioPointerElement,
    moveFoodTrioPointerToElement,
  ]);

  const runFoodTrioSegmentCard = useCallback((scenarioId: FoodTrioScenarioId, onComplete: () => void) => {
    const segmentProof: Record<FoodTrioScenarioId, string[]> = {
      coffee: ["Coffee shop.", "A few items.", "Lots of detail."],
      "fast-food": ["Fast food.\nSpeed test."],
      "casual-dining": ["Casual dining.\nRange test."],
    };

    runFoodTrioNarratorSequence([
      { cards: segmentProof[scenarioId], holdMs: scenarioId === "coffee" ? 2300 : 1350 },
    ], onComplete);
  }, [runFoodTrioNarratorSequence]);

  const startScenario = useCallback((
    scenarioId: FoodTrioScenarioId,
    options: { skipSegmentCard?: boolean; onComplete?: () => void } = {},
  ) => {
    const query = foodTrioPromptForScenario(scenarioId);
    clearFoodTrioPointerTimers();
    clearFoodTrioNarratorCards();
    pendingPointerScenarioRef.current = scenarioId;
    scenarioCompleteRef.current = options.onComplete ?? null;
    setActiveScenario(scenarioId);
    setActiveTargetId(null);
    setDemoSubmission(null);

    if (options.skipSegmentCard) {
      runScenarioEntryPointer(query);
      return;
    }

    runFoodTrioSegmentCard(scenarioId, () => runScenarioEntryPointer(query));
  }, [clearFoodTrioPointerTimers, clearFoodTrioNarratorCards, runFoodTrioSegmentCard, runScenarioEntryPointer]);

  useEffect(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    let introCompleted = false;
    let cancelled = false;

    const runStoryboardCards = (cards: string[], holdMs: number) => (
      new Promise<void>((resolve) => {
        runFoodTrioNarratorSequence([{ cards, holdMs }], resolve);
      })
    );

    const runIntroAnimation = () => (
      new Promise<void>((resolve) => {
        runFoodTrioIntroSimulation(resolve);
      })
    );

    const runStoryboard = async () => {
      await wait(420);

      for (const beat of FOOD_TRIO_STORYBOARD) {
        if (cancelled) return;

        switch (beat.kind) {
          case "cards":
            await runStoryboardCards(beat.cards, beat.holdMs);
            break;

          case "intro-animation":
            await runIntroAnimation();
            break;

          case "load-wall":
            setIntroStageVisible(false);
            await wait(beat.settleMs ?? 420);
            clearSmartBarFocusOverlay();
            scrollToFoodTrioScenario(beat.scenarioId);

            if (beat.scenarioId === "coffee") {
              window.setTimeout(() => {
                stageFoodTrioScenarioForFirstNavigation(beat.scenarioId);
              }, 820);
            }

            break;

          case "hide-wall":
            clearSmartBarFocusOverlay();
            clearFoodTrioPointerTimers();
            setActiveTargetId(null);
            setPointerState(FOOD_TRIO_POINTER_HIDDEN);
            setIntroStageVisible(true);
            await wait(beat.settleMs ?? 420);
            break;

          case "start-scenario":
            await new Promise<void>((resolve) => {
              startScenario(beat.scenarioId, {
                skipSegmentCard: beat.skipSegmentCard,
                onComplete: resolve,
              });
            });
            break;

          default:
            break;
        }
      }

      introCompleted = true;
    };

    void runStoryboard();

    return () => {
      cancelled = true;

      // React dev Strict Mode runs effect cleanup before replaying the effect.
      // If the intro has not actually completed yet, allow the replay to schedule it again.
      if (!introCompleted) {
        introStartedRef.current = false;
      }
    };
  }, [runFoodTrioIntroSimulation, runFoodTrioNarratorSequence, startScenario]);

  const handleSubmitPrompt = useCallback((query: string, meta?: SmartBarMobileSubmitMeta) => {
    if (introTeachingActiveRef.current && meta?.intent === "replace_unknown" && meta.replaceLineId) {
      const result: SmartBarMobileOrderResult = {
        ...foodTrioIntroTeachingResult({
          revealLineId: null,
          redResolved: true,
          yellowResolved: true,
          grayResolved: true,
        }),
        preserveResultLinesOnRetry: true,
      };
      setIntroResolved({ red: true, yellow: true, gray: true });
      setIntroRevealLineId(null);
      setIntroSpotlightActive(false);
      setLastResult(result);
      return result;
    }

    if (introTeachingActiveRef.current) {
      const result = foodTrioIntroTeachingResult({
        revealLineId: introRevealLineId,
        ...introResolved,
      });
      introTeachingReadyRef.current = true;
      setLastResult(result);
      return result;
    }

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
    const rawResult = foodTrioResultForQuery(query, nextScenario);
    const result = nextScenario === "casual-dining"
      ? foodTrioPrepareCasualDiningResult(rawResult)
      : rawResult;
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

    if (introTeachingActiveRef.current && (line.id === "intro-red-required" || line.id === "intro-yellow-options")) {
      // Intro teaches color meaning only. Leave the area above the focused cart
      // item empty here; real page navigation is demonstrated in the first Coffee demo.
      setIntroSpotlightActive(false);
      return;
    }

    if (!isScriptedPointerClick) {
      clearFoodTrioPointerTimers();
    }

    setActiveTargetId(line.targetId || null);
    scrollToFoodTrioTarget(line.targetId);
  }, [clearFoodTrioPointerTimers]);

  const handleApplyChoice = useCallback((line: SmartBarMobileOrderLine, value: string) => {
    if (introTeachingActiveRef.current && line.id === "intro-red-required") {
      setIntroSpotlightActive(false);
      return undefined;
    }

    if (introTeachingActiveRef.current && line.id === "intro-yellow-options") {
      return undefined;
    }

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
      <FoodTrioNarratorCards cards={narratorCards} />
      <FoodTrioIntroSpotlightReel active={introSpotlightActive} target={introSpotlightTarget} />

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
          if (introTeachingActiveRef.current && introTeachingReadyRef.current) {
            introTeachingReadyRef.current = false;

            const queue = (delayMs: number, callback: () => void) => {
              const timer = window.setTimeout(callback, delayMs);
              pointerTimersRef.current.push(timer);
            };

            const showIntroCart = (
              revealLineId: FoodTrioIntroLineId | null,
              resolvedKey: FoodTrioIntroResolvedKey,
            ) => {
              const resolved = FOOD_TRIO_INTRO_RESOLVED_STATES[resolvedKey];

              setIntroRevealLineId(revealLineId);
              setIntroResolved(resolved);
              setLastResult(foodTrioIntroTeachingResult({
                revealLineId,
                redResolved: resolved.red,
                yellowResolved: resolved.yellow,
                grayResolved: resolved.gray,
              }));
            };

            const runIntroBeat = (beat: FoodTrioIntroBeat) => {
              switch (beat.kind) {
                case "show-line": {
                  showIntroCart(beat.lineId, beat.resolved);

                  const scrollTimer = window.setTimeout(() => {
                    scrollFoodTrioCartElementIntoView(beat.selector);
                  }, 120);
                  pointerTimersRef.current.push(scrollTimer);

                  const aimTimer = window.setTimeout(() => {
                    window.requestAnimationFrame(() => {
                      window.requestAnimationFrame(() => {
                        moveFoodTrioPointerToElement(beat.selector, 0.5, 0, false, 0.5, beat.tooltip);
                      });
                    });
                  }, FOOD_TRIO_INTRO_POINTER_AIM_SETTLE_MS);
                  pointerTimersRef.current.push(aimTimer);
                  break;
                }

                case "move-line": {
                  showIntroCart(beat.lineId, beat.resolved);
                  if (beat.spotlightTarget) {
                    setIntroSpotlightTarget(beat.spotlightTarget);
                  }

                  const scrollTimer = window.setTimeout(() => {
                    scrollFoodTrioCartElementIntoView(beat.selector);
                  }, 120);
                  pointerTimersRef.current.push(scrollTimer);

                  const aimTimer = window.setTimeout(() => {
                    window.requestAnimationFrame(() => {
                      window.requestAnimationFrame(() => {
                        moveFoodTrioPointerToElement(beat.selector, 0.5, 0, false, beat.anchorX ?? 0.5, beat.tooltip);
                      });
                    });
                  }, FOOD_TRIO_INTRO_POINTER_AIM_SETTLE_MS);
                  pointerTimersRef.current.push(aimTimer);
                  break;
                }

                case "move":
                  moveFoodTrioPointerToElement(
                    beat.selector,
                    beat.anchorY ?? 0.5,
                    beat.offsetY ?? 0,
                    false,
                    beat.anchorX ?? 0.5,
                    beat.tooltip,
                  );
                  break;

                case "tap":
                  clickFoodTrioPointerElement(
                    beat.selector,
                    beat.anchorY ?? 0.5,
                    beat.offsetY ?? 0,
                    beat.anchorX ?? 0.5,
                    beat.tooltip,
                  );
                  break;

                case "resolve":
                  showIntroCart(beat.lineId, beat.resolved);
                  break;

                case "spotlight":
                  if (beat.target) {
                    setIntroSpotlightTarget(beat.target);
                  }
                  setIntroSpotlightActive(beat.active);
                  break;

                case "type-retry":
                  fillFoodTrioRetryInput(beat.value);
                  break;

                case "teaching-card":
                case "zip":
                  setPointerState(FOOD_TRIO_POINTER_HIDDEN);
                  lastPointerPointRef.current = null;
                  pointerMovedSinceLastTapRef.current = false;
                  runFoodTrioNarratorSequence([
                    {
                      cards: beat.cards,
                      holdMs: beat.holdMs,
                    },
                  ], () => undefined);
                  break;

                case "finish": {
                  introTeachingActiveRef.current = false;
                  clearFoodTrioPointerTimers();
                  const onIntroTeachingComplete = introTeachingCompleteRef.current;
                  introTeachingCompleteRef.current = null;
                  onIntroTeachingComplete?.();
                  break;
                }

                default:
                  break;
              }
            };

            let elapsedMs = 0;

            FOOD_TRIO_INTRO_TIMELINE.forEach((beat) => {
              elapsedMs += beat.delayMs;

              queue(elapsedMs, () => runIntroBeat(beat));

              if (beat.kind === "teaching-card" || beat.kind === "zip") {
                elapsedMs += beat.holdMs + SMARTBAR_FLASH_CARD_TRANSITION_MS + FOOD_TRIO_TIMELINE_CARD_SETTLE_MS;
              }
            });

            return;
          }

          const pointerScenario = pendingPointerScenarioRef.current;
          pendingPointerScenarioRef.current = null;

          const onScenarioComplete = scenarioCompleteRef.current;
          scenarioCompleteRef.current = null;

          if (pointerScenario === "coffee") {
            runCoffeeCartPointer(onScenarioComplete ?? undefined);
            return;
          }

          if (pointerScenario === "fast-food") {
            runFastFoodCartPointer(onScenarioComplete ?? undefined);
            return;
          }

          if (pointerScenario === "casual-dining") {
            runCasualDiningCartPointer(onScenarioComplete ?? undefined);
          }
        }}
        onResetCart={() => {
          if (!introTeachingActiveRef.current) {
            clearFoodTrioPointerTimers();
          }
          clearSmartBarFocusOverlay();
          const rawResult = foodTrioResultForScenario(activeScenario);
          const result = activeScenario === "casual-dining"
            ? foodTrioPrepareCasualDiningResult(rawResult)
            : rawResult;
          setLastResult(result);
          setActiveTargetId(null);
        }}
      />
    </div>
  );
}
