import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, RefreshCcw, Users } from "lucide-react";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "../smartbarFocusController";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellDemoCommand,
  type TourBarShellResult,
  type TourBarShellTurnContext,
} from "../TourBarShell";
import { OrderReview, type CarryoutOrder, type GuideAiCarryoutResponse, type ReviewMode } from "../TourBarOrdering";
import { TourBarBookingHandoffSheet, TourBarNavigationControls, type TourBarBookingHandoff, type TourBarBookingNavigationState } from "../TourBarBooking";
import TourBarAfterHoursLeadSheet from "../TourBarAfterHoursLeadSheet";
import SmartBarDemoScrubber from "./SmartBarDemoScrubber";
import SmartBarDemoToolbarFrame from "./SmartBarDemoToolbarFrame";
import SmartBarSpeedTargetWall from "./SmartBarSpeedTargetWall";
import { SmartBarFlashCardStack, type SmartBarFlashCardStackItem } from "./SmartBarFlashCardStack";
import {
  SmartBarFakePointerOverlay,
  SMARTBAR_FAKE_POINTER_AIM_MS,
  SMARTBAR_FAKE_POINTER_EXIT_MS,
  SMARTBAR_FAKE_POINTER_PULSE_MS,
  makeSmartBarFakePointerState,
  type SmartBarFakePointerState,
} from "./SmartBarFakePointer";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_TRANSITION_MS,
  SMARTBAR_FLASH_CARD_CROSSOVER_MS,
  type SmartBarFlashCardCascadeMode,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
  type SmartBarTutorCard,
} from "./SmartBarFlashCardRail";
import { SMARTBAR_SPEED_STEPS, type SmartBarSpeedCommand } from "./smartBarSpeedScript";

const TYPE_DELAY_MS = 18;
const DETERMINISTIC_FIXTURE_THINKING_MS = 280;
const TEXT_FIXTURE_THINKING_MS = 1500;
const SCRIPTED_SUBMIT_SETTLE_BUFFER_MS = 120;
const DEMO_TUTOR_INITIAL_DELAY_MS = 820;
const DEMO_TUTOR_HOLD_MS = 2500;
const DEMO_REPLAY_SETTLE_MS = 360;

// FLASHCARD SPEED CONTROLS
// Bigger number = slower. Smaller number = faster.
// Change these values first; leave the card/stack animation files alone unless
// you want to change the physical slide distance, overlap, or easing.
const FLASHCARD_SPEED_CONTROLS = {
  slowCascadeNextCardMs: 1000,
  slowCascadeFinalHoldMs: 1800,
  rapidCascadeNextCardMs: 500,
  rapidCascadeFinalHoldMs: 1900,
  normalCardHoldMs: DEMO_TUTOR_HOLD_MS,
} as const;

const OPENING_DEMO_TUTOR_CARDS: SmartBarTutorCard[] = [
  {
    title: "Or anywhere intent shows up",
    cascadeGroup: "intro-fit",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
  },
  {
    title: "Search bars",
    cascadeGroup: "intro-fit",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 800,
  },
    {
    title: "Product cards",
    cascadeGroup: "intro-fit",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 800,
  },
    {
    title: "Cart panels",
    cascadeGroup: "intro-fit",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 800,
  },
  {
    title: "Mobile sticky bars",
    cascadeGroup: "intro-fit",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 800,
  },
    {
    title: "checkout panels",
    cascadeGroup: "intro-fit",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
    clearCascade: true,
  },
  {
    title: "Works with **any kind of site**",
    cascadeGroup: "intro-2",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 3000,
    clearCascade: true,
  },
  {
    title: "First example: **NexaPath Advisory**",
    cascadeGroup: "intro-3",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
  },
  {
    title: "Managed IT for finance",
    cascadeGroup: "intro-3",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
  },
  {
    title: "SmartBar finds the right path",
    cascadeGroup: "intro-3",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
    clearCascade: true,
  },
];

const MOBILE_OPENING_DEMO_TUTOR_CARDS: SmartBarTutorCard[] = [
  {
    title: "Mobile-ready",
    cascadeGroup: "mobile-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "Bottom-mounted",
    cascadeGroup: "mobile-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "Works with **any site**",
    cascadeGroup: "mobile-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1800,
    clearCascade: true,
  },
  {
    title: "First example: **NexaPath**",
    cascadeGroup: "mobile-nexa",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1200,
  },
  {
    title: "Managed IT for finance",
    cascadeGroup: "mobile-nexa",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1200,
  },
  {
    title: "SmartBar finds the path",
    cascadeGroup: "mobile-nexa",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1400,
    clearCascade: true,
  },
];
function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function useSmartBarSpeedMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function waitForFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function resetSpeedDemoStageToTop(stage: HTMLElement | null) {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  stage?.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function speedDemoCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function speedDemoClamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function speedDemoScrollEase(progress: number) {
  return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function speedDemoStageScrollDuration(distance: number) {
  return Math.min(880, Math.max(360, Math.abs(distance) * 0.46));
}

function findSpeedDemoStageTarget(stage: HTMLElement, targetId: string) {
  const escaped = speedDemoCssEscape(targetId);
  return stage.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`);
}

function speedDemoElementLooksVisible(element: HTMLElement | null) {
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

function firstVisibleSpeedDemoElement(elements: HTMLElement[]) {
  return elements.find(speedDemoElementLooksVisible) || elements[0] || null;
}

function findSpeedDemoPointerTarget(
  stage: HTMLElement | null,
  targetId?: string,
  targetSelector?: string,
) {
  if (targetSelector) {
    const stageMatches = stage ? Array.from(stage.querySelectorAll<HTMLElement>(targetSelector)) : [];
    const documentMatches = Array.from(document.querySelectorAll<HTMLElement>(targetSelector));
    return firstVisibleSpeedDemoElement([...stageMatches, ...documentMatches]);
  }

  if (!targetId) return null;

  const escaped = speedDemoCssEscape(targetId);
  const selector = `[data-tour-id="${escaped}"], #${escaped}`;
  const stageMatches = stage ? Array.from(stage.querySelectorAll<HTMLElement>(selector)) : [];
  const documentMatches = Array.from(document.querySelectorAll<HTMLElement>(selector));

  return firstVisibleSpeedDemoElement([...stageMatches, ...documentMatches]);
}

async function scrollSpeedDemoStageToTarget(stage: HTMLElement, targetId: string) {
  const target = findSpeedDemoStageTarget(stage, targetId);
  if (!target) return null;

  await waitForFrame();

  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTopInStage = stage.scrollTop + targetRect.top - stageRect.top;
  const maxTop = Math.max(0, stage.scrollHeight - stage.clientHeight);
  const safeInset = Math.min(140, Math.max(72, stage.clientHeight * 0.16));
  const availableHeight = Math.max(180, stage.clientHeight - safeInset * 2);
  const desiredTop = targetRect.height >= availableHeight
    ? targetTopInStage - safeInset
    : targetTopInStage - (safeInset + (availableHeight - targetRect.height) / 2);
  const startTop = stage.scrollTop;
  const endTop = speedDemoClamp(desiredTop, 0, maxTop);
  const distance = endTop - startTop;

  if (Math.abs(distance) < 2) {
    stage.scrollTo({ top: endTop, behavior: "auto" });
    await waitForFrame();
    return target;
  }

  const duration = speedDemoStageScrollDuration(distance);
  const startedAt = performance.now();

  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      const eased = speedDemoScrollEase(progress);
      stage.scrollTo({ top: speedDemoClamp(startTop + distance * eased, 0, maxTop), behavior: "auto" });

      if (progress >= 1) {
        stage.scrollTo({ top: endTop, behavior: "auto" });
        resolve();
        return;
      }

      window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  });

  await waitForFrame();
  return target;
}

function line(id: string, title: string, priceLabel: string, knownSelections: string[] = []) {
  return {
    lineItemId: id,
    id,
    title,
    quantity: 1,
    priceLabel,
    status: "ready",
    knownSelections,
  };
}

function readyCarryoutOrder(kind: "messy" | "qualified" | "finale" = "messy"): CarryoutOrder {
  if (kind === "qualified") {
    const items = [
      line("burger-combo", "Burger combo meal", "$10.99", ["Double patty", "Large fries", "Diet Coke"]),
    ];

    return {
      type: "carryout_order",
      status: "ready_cart",
      nextAction: "show_cart",
      items,
      completeItems: items,
      pendingItems: [],
      totals: {
        status: "ready",
        subtotal: 10.99,
        estimatedTax: 0.88,
        estimatedTotal: 11.87,
        currency: "USD",
      },
    };
  }

  const comboSelections = ["Large fries", "Large Diet Coke", "No onions"];
  const items = [
    line("double-cheeseburger-combo", "Double cheeseburger combo", "$11.99", comboSelections),
    line("apple-pie", "Apple pie", "$2.49"),
    ...(kind === "finale" ? [] : [line("large-diet-coke", "Large Diet Coke", "$2.19")]),
  ];

  return {
    type: "carryout_order",
    status: "ready_cart",
    nextAction: "show_cart",
    items,
    completeItems: items,
    pendingItems: [],
    totals: {
      status: "ready",
      subtotal: kind === "finale" ? 14.48 : 16.67,
      estimatedTax: kind === "finale" ? 1.16 : 1.33,
      estimatedTotal: kind === "finale" ? 15.64 : 18.0,
      currency: "USD",
    },
  };
}

function lockedCarryoutOrder(kind: "messy" | "qualified" | "finale" = "messy"): CarryoutOrder {
  const order = readyCarryoutOrder(kind);
  return {
    ...order,
    nextAction: "checkout_handoff",
    lockedForHandoff: true,
    handoffStatus: "ready",
  };
}

function pendingCarryoutOrder(stage: 0 | 1 | 2): CarryoutOrder {
  const burgerReady = stage >= 1;
  const friesReady = stage >= 2;

  const burger = {
    lineItemId: "burger-combo",
    id: "burger-combo",
    title: "Burger combo meal",
    quantity: 1,
    priceLabel: burgerReady ? "$10.99" : undefined,
    status: burgerReady ? "ready" : "needs_qualifier",
    knownSelections: burgerReady ? ["Double patty"] : [],
    missingQualifiers: burgerReady ? [] : [{ qualifierId: "patty", label: "Patty" }],
    qualifierGroups: burgerReady
      ? []
      : [
          {
            qualifierId: "patty",
            label: "Choose burger size",
            required: true,
            missing: true,
            options: [
              { label: "Single patty", value: "single" },
              { label: "Double patty", value: "double" },
              { label: "Triple patty", value: "triple" },
            ],
          },
        ],
  };

  const fries = {
    lineItemId: "fries-size",
    id: "fries-size",
    title: "Fries",
    quantity: 1,
    priceLabel: friesReady ? "$3.49" : undefined,
    status: friesReady ? "ready" : "needs_qualifier",
    knownSelections: friesReady ? ["Large fries"] : [],
    missingQualifiers: friesReady ? [] : [{ qualifierId: "fries", label: "Fries size" }],
    qualifierGroups: friesReady
      ? []
      : [
          {
            qualifierId: "fries",
            label: "Choose fries",
            required: true,
            missing: true,
            options: [
              { label: "Small fries", value: "small" },
              { label: "Medium fries", value: "medium" },
              { label: "Large fries", value: "large" },
            ],
          },
        ],
  };

  const drink = {
    lineItemId: "drink-choice",
    id: "drink-choice",
    title: "Drink",
    quantity: 1,
    priceLabel: undefined,
    status: "needs_qualifier",
    knownSelections: [],
    missingQualifiers: [{ qualifierId: "drink", label: "Drink" }],
    qualifierGroups: [
      {
        qualifierId: "drink",
        label: "Choose drink",
        required: true,
        missing: true,
        options: [
          { label: "Coke", value: "coke" },
          { label: "Diet Coke", value: "diet-coke" },
          { label: "Sprite", value: "sprite" },
        ],
      },
    ],
  };

  const items = [burger, fries, drink];
  return {
    type: "carryout_order",
    status: "needs_qualifier",
    nextAction: "choose_qualifier",
    items,
    completeItems: items.filter((item) => item.status === "ready"),
    pendingItems: items.filter((item) => item.status !== "ready"),
    currentStep: {
      type: "qualifier",
      itemId: stage === 0 ? "burger-combo" : stage === 1 ? "fries-size" : "drink-choice",
      qualifierId: stage === 0 ? "patty" : stage === 1 ? "fries" : "drink",
      question: stage === 0 ? "Choose burger size" : stage === 1 ? "Choose fries" : "Choose drink",
    },
    totals: {
      status: "partial",
      subtotal: stage === 0 ? null : stage === 1 ? 10.99 : 14.48,
      estimatedTax: null,
      estimatedTotal: null,
      currency: "USD",
    },
  };
}


function readyCheeseburgerFriesShakeOrder(): CarryoutOrder {
  // TourBarOrdering reverses backend-style cart lines into the visible review
  // order. Keep fixture lines in backend order so the review steps land as:
  // 1) Cheeseburger, 2) Fries, 3) Milkshake.
  const items = [
    line("milkshake", "Milkshake", "$4.29", ["Chocolate"]),
    line("fries-size", "Fries", "$3.49", ["Large fries"]),
    line("cheeseburger", "Cheeseburger", "$5.49", ["No onions"]),
  ].map((item) => {
    if (item.id === "cheeseburger") return { ...item, targetId: "item-cheeseburger" };
    if (item.id === "fries-size") return { ...item, targetId: "side-fries" };
    return { ...item, targetId: "drink-milkshake" };
  });

  return {
    type: "carryout_order",
    status: "ready_cart",
    nextAction: "show_cart",
    items,
    completeItems: items,
    pendingItems: [],
    totals: {
      status: "ready",
      subtotal: 13.27,
      estimatedTax: 1.06,
      estimatedTotal: 14.33,
      currency: "USD",
    },
  };
}

function lockedCheeseburgerFriesShakeOrder(): CarryoutOrder {
  return {
    ...readyCheeseburgerFriesShakeOrder(),
    nextAction: "checkout_handoff",
    lockedForHandoff: true,
    handoffStatus: "ready",
  };
}

function pendingCheeseburgerFriesShakeOrder(stage: 0 | 1 | 2): CarryoutOrder {
  const cheeseburgerReady = stage >= 1;
  const friesReady = stage >= 2;

  const cheeseburger = {
    lineItemId: "cheeseburger",
    id: "item-cheeseburger",
    targetId: "item-cheeseburger",
    title: "Cheeseburger",
    quantity: 1,
    priceLabel: cheeseburgerReady ? "$5.49" : undefined,
    status: cheeseburgerReady ? "ready" : "needs_qualifier",
    knownSelections: cheeseburgerReady ? ["No onions"] : [],
    missingQualifiers: cheeseburgerReady ? [] : [{ qualifierId: "burger-setup", label: "Burger setup", targetId: "item-cheeseburger" }],
    qualifierGroups: cheeseburgerReady
      ? []
      : [
          {
            qualifierId: "burger-setup",
            label: "Choose burger setup",
            targetId: "item-cheeseburger",
            required: true,
            missing: true,
            options: [
              { label: "No onions", value: "no-onions" },
              { label: "No pickles", value: "no-pickles" },
              { label: "Extra sauce", value: "extra-sauce" },
            ],
          },
        ],
  };

  const fries = {
    lineItemId: "fries-size",
    id: "fries-size",
    targetId: "side-fries",
    title: "Fries",
    quantity: 1,
    priceLabel: friesReady ? "$3.49" : undefined,
    status: friesReady ? "ready" : "needs_qualifier",
    knownSelections: friesReady ? ["Large fries"] : [],
    missingQualifiers: friesReady ? [] : [{ qualifierId: "fries", label: "Fries size", targetId: "side-fries" }],
    qualifierGroups: friesReady
      ? []
      : [
          {
            qualifierId: "fries",
            label: "Choose fries",
            targetId: "side-fries",
            required: true,
            missing: true,
            options: [
              { label: "Small fries", value: "small" },
              { label: "Medium fries", value: "medium" },
              { label: "Large fries", value: "large" },
            ],
          },
        ],
  };

  const milkshake = {
    lineItemId: "milkshake",
    id: "milkshake",
    targetId: "drink-milkshake",
    title: "Milkshake",
    quantity: 1,
    priceLabel: undefined,
    status: "needs_qualifier",
    knownSelections: [],
    missingQualifiers: [{ qualifierId: "milkshake-flavor", label: "Milkshake flavor", targetId: "drink-milkshake" }],
    qualifierGroups: [
      {
        qualifierId: "milkshake-flavor",
        label: "Choose milkshake flavor",
        targetId: "drink-milkshake",
        required: true,
        missing: true,
        options: [
          { label: "Vanilla", value: "vanilla" },
          { label: "Chocolate", value: "chocolate" },
          { label: "Strawberry", value: "strawberry" },
        ],
      },
    ],
  };

  // Backend-style order is reversed by TourBarOrdering into the visible review
  // sequence. This preserves the visible steps as cheeseburger → fries → milkshake.
  const items = [milkshake, fries, cheeseburger];

  return {
    type: "carryout_order",
    status: "needs_qualifier",
    nextAction: "choose_qualifier",
    items,
    completeItems: items.filter((item) => item.status === "ready"),
    pendingItems: items.filter((item) => item.status !== "ready"),
    currentStep: {
      type: "qualifier",
      itemId: stage === 0 ? "cheeseburger" : stage === 1 ? "fries-size" : "milkshake",
      targetId: stage === 0 ? "item-cheeseburger" : stage === 1 ? "side-fries" : "drink-milkshake",
      qualifierId: stage === 0 ? "burger-setup" : stage === 1 ? "fries" : "milkshake-flavor",
      question: stage === 0 ? "Choose burger setup" : stage === 1 ? "Choose fries" : "Choose milkshake flavor",
    },
    totals: {
      status: "partial",
      subtotal: stage === 0 ? null : stage === 1 ? 5.49 : 8.98,
      estimatedTax: null,
      estimatedTotal: null,
      currency: "USD",
    },
  };
}

function carryoutRaw(order: CarryoutOrder, commerceAction = "carryout_show_cart"): GuideAiCarryoutResponse {
  return {
    title: order.status === "ready_cart" ? "Review order" : "Needs choices",
    body: order.status === "ready_cart" ? "Review the cart before checkout." : "Pick the missing choices.",
    commerceAction,
    displayMode: order.status === "ready_cart" ? "carryout_cart_panel" : "carryout_review",
    carryoutOrder: order,
    visibleContext: { carryoutOrder: order },
  };
}

type SpeedResultOptions = {
  title?: string;
  body?: string;
  activeIndex?: number;
  reviewMode?: ReviewMode;
  nextQuery?: string;
  keepSheetOpenNextMove?: boolean;
  separateSheetNextMove?: boolean;
  stableSheetKey?: string;
  commerceAction?: string;
};

function speedMeta(
  options: {
    keepSheetOpenNextMove?: boolean;
    separateSheetNextMove?: boolean;
    stableSheetKey?: string;
    readyPillLabel?: string;
    thinkingOnNextMove?: boolean;
    nextMoveLoadingMessage?: string;
  } = {},
) {
  return {
    __speedDemo: {
      keepSheetOpenNextMove: Boolean(options.keepSheetOpenNextMove),
      separateSheetNextMove: Boolean(options.separateSheetNextMove),
      stableSheetKey: options.stableSheetKey,
      readyPillLabel: options.readyPillLabel,
      thinkingOnNextMove: Boolean(options.thinkingOnNextMove),
      nextMoveLoadingMessage: options.nextMoveLoadingMessage,
    },
  };
}

function speedDemoCompactText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function speedDemoQueryLooksInternal(value?: string | null) {
  return speedDemoCompactText(value).startsWith("__");
}

function speedOrderResultAllowsThinkingTheater(
  result: TourBarShellResult,
  query?: string | null,
) {
  if (result.mode !== "speed_order") return false;

  // BurgerRush has two kinds of speed_order moments:
  // - visitor prompt -> structured order/cart result, which should get a brief
  //   ThinkingText beat before the sheet opens
  // - deterministic next-move steps like __checkout_* / __qualifier_*, which
  //   should stay fast and not add theater
  return !speedDemoQueryLooksInternal(query);
}

function speedResultAllowsThinkingTheater(
  result: TourBarShellResult,
  query?: string | null,
) {
  return (
    [
      "speed_info",
      "speed_case_studies",
      "speed_booking_reco",
      "speed_package",
      "speed_family_reco",
    ].includes(result.mode || "") ||
    speedOrderResultAllowsThinkingTheater(result, query)
  );
}

function speedDemoLooksLikeConsultantRequest(value?: string | null) {
  const text = speedDemoCompactText(value);
  if (!text) return false;

  return /\b(talk|speak|chat|connect|contact|call|reach)\b/.test(text) &&
    /\b(consultant|specialist|advisor|adviser|expert|sales|someone|person|human|representative|rep|team)\b/.test(text);
}

function speedDemoFixtureThinkingMs(
  result: TourBarShellResult,
  query?: string | null,
) {
  return speedResultAllowsThinkingTheater(result, query)
    ? TEXT_FIXTURE_THINKING_MS
    : DETERMINISTIC_FIXTURE_THINKING_MS;
}

function speedDemoFixtureThinkingMsForQuery(query: string) {
  if (speedDemoLooksLikeConsultantRequest(query)) return 0;

  const result = fixtureResult(query);
  return speedDemoFixtureThinkingMs(result, query);
}

function mobileSpeedDemoCardTitle(value: string) {
  const clean = value.trim();
  const compact = speedDemoCompactText(clean);

  if (compact === "search can't parse this") return "Search stalls";
  if (compact.includes("moves the visitor")) return "Moves to the answer";
  if (compact.includes("explains why")) return "Explains why";
  if (compact === "visitor asks for specifics") return "Ask for specifics";
  if (compact === "surfaces proof points") return "Shows proof";
  if (compact === "provides a direct chat surface") return "Opens live chat";
  if (compact === "hands off context") return "Carries context";
  if (compact.includes("burgerrush")) return "Example 2: **BurgerRush**";
  if (compact === "visible-cart ordering site") return "Ordering site";
  if (compact === "smartbar turns intent into checkout") return "Intent to checkout";
  if (compact === "messy food shorthand") return "Messy shorthand";
  if (compact === "then checks totals and modifiers") return "Checks the cart";
  if (compact.includes("domi hotel")) return "Example 3: **Domi**";
  if (compact === "smartbar builds a booking path") return "Builds booking path";
  if (compact === "same script") return "Same script";

  return clean;
}

function orderResult(order: CarryoutOrder, options: SpeedResultOptions = {}): TourBarShellResult {
  const raw = carryoutRaw(order, options.commerceAction || "carryout_show_cart");
  return {
    title: options.title || (order.status === "ready_cart" ? "Review order" : "Choose required options"),
    body: options.body ?? (order.status === "ready_cart" ? undefined : "Select the missing choice."),
    invitation: options.nextQuery ? { kind: "next", text: options.nextQuery.startsWith("__checkout") ? "Checkout" : "Choose this option" } : undefined,
    nextMove: options.nextQuery ? { type: "handoff", label: options.nextQuery.startsWith("__checkout") ? "Checkout" : "Choose this option", query: options.nextQuery } : undefined,
    canFollowUp: !order.lockedForHandoff,
    mode: "speed_order",
    action: raw.commerceAction,
    raw: {
      ...raw,
      __speedDemo: {
        activeIndex: options.activeIndex || 0,
        reviewMode: options.reviewMode || (order.status === "ready_cart" ? "cart" : "review"),
        keepSheetOpenNextMove: Boolean(options.keepSheetOpenNextMove),
        separateSheetNextMove: Boolean(options.separateSheetNextMove),
        stableSheetKey: options.stableSheetKey || "ordering",
        readyPillLabel: order.status === "ready_cart" ? "All items are ready for checkout" : undefined,
      },
    },
  };
}


function bookingHandoff(kind: "ocean" | "family"): TourBarBookingHandoff {
  if (kind === "family") {
    return {
      roomTitle: "Family Double Room",
      packageTitle: "Family Comfort Bundle",
      datesLabel: "Jun 12–15, 2026",
      guestsLabel: "2 adults, 2 children",
      budgetLabel: "Family value",
      priceLabel: "$249/night + $55/stay",
    };
  }

  return {
    roomTitle: "Ocean View Suite",
    packageTitle: "Breakfast Flex Plan",
    datesLabel: "Dates required",
    guestsLabel: "Guests required",
    budgetLabel: "Good view, not villa tier",
    priceLabel: "$379/night + $32/night",
  };
}

function fixtureResult(query: string, options: { compact?: boolean } = {}): TourBarShellResult {
  const text = query.trim().toLowerCase();
  const compact = Boolean(options.compact);

  if (
    text.includes("hedge fund") ||
    text.includes("copilot agents") ||
    text.includes("copilots") ||
    text.includes("dora")
  ) {
    return {
      title: "Showing: Hedge Fund industry path",
      body:
        compact
          ? "You’re describing two needs: secure hedge-fund IT support and Copilot/agent enablement.\n\nSmartBar routes that to the finance-focused managed IT path, with AI/data advisory layered in."
          : "Yes — this hedge-fund path covers both core IT support needs and AI/copilot-related modernization. In this context, that typically means:\n\n- Secure trading and collaboration infrastructure\n- Cyber/compliance operating model support\n- AI/data visibility and workflow enhancement, including governed copilot-style capabilities\n\nFor a hedge fund, the site frames this as a combined approach: stable infrastructure first, then security/compliance, then AI/data and workflow opportunities in a regulated operating model.",
      invitation: { kind: "next", text: compact ? "Show Copilot use cases" : "Want to look specifically at the AI & Data lane for Copilot and agent setup?" },
      nextMove: { type: "ask_deeper", label: "Show Copilot use cases", query: "__copilot_use_cases" },
      canFollowUp: true,
      mode: "speed_info",
      raw: speedMeta({ stableSheetKey: "hedge-fund-path", keepSheetOpenNextMove: true }),
    };
  }

  if (
    text === "__copilot_use_cases" ||
    text.includes("that doesn't say") ||
    text.includes("that doesnt say") ||
    text.includes("what you actually do")
  ) {
    return {
      title: "What we would actually do",
      body:
        compact
          ? "Practical work would start with:\n\n- **Readiness:** permissions, data exposure, and security boundaries\n- **Use cases:** investment prep, policy lookup, vendor risk, ticket triage\n- **Pilot:** small rollout, training, and governance before expansion"
          : "For a hedge fund, the practical Copilot/agent work would usually look like this:\n\n- **Readiness review:** confirm Microsoft 365 permissions, data exposure, identity controls, and security boundaries before anyone turns agents loose.\n- **Use-case selection:** pick a few high-value workflows — investment committee prep, policy lookup, vendor-risk intake, ticket triage, or research summarization.\n- **Agent design:** define what each agent can answer, what systems it can touch, and when it must escalate for review.\n- **Pilot support:** build a small controlled rollout, train the first users, measure adoption, and tighten governance before expanding.",
      invitation: { kind: "case_studies", text: "Show relevant case studies" },
      nextMove: { type: "ask_deeper", label: "Show relevant case studies", query: "__case_studies" },
      canFollowUp: true,
      mode: "speed_info",
      raw: speedMeta({ stableSheetKey: "copilot-use-cases", separateSheetNextMove: true, thinkingOnNextMove: true, nextMoveLoadingMessage: "Choosing the right tool..." }),
    };
  }

  if (text === "__case_studies") {
    return {
      title: "Relevant case studies",
      body:
        compact
          ? "- **Operations assistant:** approved-source answers with human review for sensitive requests\n- **Compliance helper:** policy and vendor-risk evidence before audits\n- **Copilot sprint:** safe rollout, permission cleanup, and first-agent selection"
          : "- **Hedge-fund operations assistant:** mapped analyst and operations questions to approved knowledge sources, then routed sensitive requests to human review.\n- **Compliance evidence helper:** organized policy, vendor-risk, and incident-response materials so leaders could ask plain-English questions before audits and tabletop reviews.\n- **Copilot adoption sprint:** coached a regulated firm through safe rollout patterns, permission cleanup, user training, and a short list of practical first agents.",
      invitation: { kind: "handoff", text: "Talk to someone about Copilot support" },
      nextMove: { type: "handoff", label: "Talk to someone about Copilot support", query: "nice, can I talk to someone?" },
      canFollowUp: true,
      mode: "speed_case_studies",
      raw: speedMeta({ stableSheetKey: "case-studies" }),
    };
  }

  if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez")) {
    return orderResult(readyCarryoutOrder("messy"), {
      title: "Review order",
      nextQuery: "__checkout_messy",
      separateSheetNextMove: true,
    });
  }

  if (text === "__checkout_messy") {
    return orderResult(lockedCarryoutOrder("messy"), {
      title: "Order locked for handoff",
      reviewMode: "cart",
      stableSheetKey: "checkout-messy",
      commerceAction: "carryout_checkout_handoff",
    });
  }

  if (text === "__checkout_qualified") {
    return orderResult(lockedCheeseburgerFriesShakeOrder(), {
      title: "Order locked for handoff",
      reviewMode: "cart",
      stableSheetKey: "checkout-qualified",
      commerceAction: "carryout_checkout_handoff",
    });
  }

  if (text.includes("cheeseburger") && text.includes("fries") && text.includes("milkshake")) {
    return orderResult(pendingCheeseburgerFriesShakeOrder(0), {
      title: "Choose required options",
      body: "Cheeseburger, fries, and milkshake each need one required choice before checkout.",
      activeIndex: 0,
      reviewMode: "review",
      nextQuery: "__qualifier_1",
      keepSheetOpenNextMove: true,
    });
  }

  if (text.includes("burger combo")) {
    return orderResult(pendingCarryoutOrder(0), {
      title: "Choose required options",
      body: "Burger combo meal needs required selections before checkout.",
      activeIndex: 0,
      reviewMode: "review",
      nextQuery: "__qualifier_1",
      keepSheetOpenNextMove: true,
    });
  }

  if (text === "__qualifier_1") {
    return orderResult(pendingCheeseburgerFriesShakeOrder(1), {
      title: "Choose required options",
      body: "Cheeseburger setup captured. Fries size is next.",
      activeIndex: 1,
      reviewMode: "review",
      nextQuery: "__qualifier_2",
      keepSheetOpenNextMove: true,
    });
  }

  if (text === "__qualifier_2") {
    return orderResult(pendingCheeseburgerFriesShakeOrder(2), {
      title: "Choose required options",
      body: "Fries size captured. Milkshake flavor is next.",
      activeIndex: 2,
      reviewMode: "review",
      nextQuery: "__qualifier_3",
      separateSheetNextMove: true,
    });
  }

  if (text === "__qualifier_3") {
    return orderResult(readyCheeseburgerFriesShakeOrder(), {
      title: "Review order",
      nextQuery: "__checkout_qualified",
      separateSheetNextMove: true,
    });
  }

  if (text === "__booking_step_1" || text.includes("nice room") || text.includes("view and breakfast")) {
    return {
      title: "Recommendation 1 of 3: Garden Terrace King",
      body:
        "$239/night. A quieter garden-facing option with a resort feel and lower price. It is a value fit, but the view is softer than the Ocean View Suite.",
      nextMove: { type: "compare_options", label: "Next stop", query: "__booking_step_2" },
      canFollowUp: true,
      mode: "speed_booking_reco",
      raw: speedMeta({ keepSheetOpenNextMove: true, stableSheetKey: "booking-recommendations" }),
    };
  }

  if (text === "__booking_step_2") {
    return {
      title: "Recommendation 2 of 3: Ocean View Suite",
      body:
        "$379/night. Best fit for a strong view without jumping to the villa tier. Breakfast can be attached with the Breakfast Flex Plan.",
      nextMove: { type: "compare_options", label: "Next stop", query: "__booking_step_3" },
      canFollowUp: true,
      mode: "speed_booking_reco",
      raw: speedMeta({ keepSheetOpenNextMove: true, stableSheetKey: "booking-recommendations" }),
    };
  }

  if (text === "__booking_step_3") {
    return {
      title: "Recommendation 3 of 3: Coastal Villa Suite",
      body:
        "$549/night. The premium view-and-space option. It is stronger than needed for this request, so the Ocean View Suite remains the practical recommendation.",
      canFollowUp: true,
      mode: "speed_booking_reco",
      raw: speedMeta({ stableSheetKey: "booking-recommendations" }),
    };
  }

  if (text.includes("breakfast")) {
    return {
      title: "Breakfast Flex Plan",
      body: "Daily breakfast credit across the lobby café, buffet, and grab-and-go market. +$32/night.",
      invitation: { kind: "book", text: "Book this" },
      nextMove: { type: "handoff", label: "Book this", query: "__booking_confirm" },
      canFollowUp: true,
      mode: "speed_package",
      raw: speedMeta({ stableSheetKey: "booking-package" }),
    };
  }

  if (text === "__booking_confirm") {
    return {
      title: "Booking summary ready",
      canFollowUp: false,
      mode: "speed_booking_confirm",
      raw: {
        ...speedMeta({ stableSheetKey: "booking-confirm" }),
        bookingHandoff: bookingHandoff("ocean"),
      },
    };
  }

  if (text.includes("family room")) {
    return {
      title: "Select your stay dates",
      body: "I need stay dates before I can price and rank family-room options. Choose check-in and check-out dates to continue.",
      canFollowUp: false,
      answerMode: "tourbar_collect_dates",
      mode: "tourbar_collect_dates",
      action: "tourbar_collect_dates",
      label: "Dates required",
      raw: {
        mode: "tourbar_collect_dates",
        action: "tourbar_collect_dates",
        requiredField: "dates",
        pendingQuery: "",
      },
    };
  }

  if (text === "__booking_after_context" || text.includes("family recommendation")) {
    return {
      title: "Family Double Room recommended",
      body: "Family Double Room · $249/night.\nFamily Comfort Bundle · +$55/stay.\nStay context: Jun 12–15, 2026 · 2 adults / 2 children.",
      invitation: { kind: "book", text: "Book this family stay" },
      nextMove: { type: "handoff", label: "Book this family stay", query: "__family_booking_confirm" },
      canFollowUp: true,
      mode: "speed_family_reco",
      raw: speedMeta({ stableSheetKey: "family-recommendation" }),
    };
  }

  if (text === "__family_booking_confirm") {
    return {
      title: "Family booking summary ready",
      canFollowUp: false,
      mode: "speed_booking_confirm",
      raw: {
        ...speedMeta({ stableSheetKey: "family-confirm" }),
        bookingHandoff: bookingHandoff("family"),
      },
    };
  }

  if (text.includes("after hours") || text.includes("lead capture") || text.includes("offline handoff")) {
    return {
      title: "After-hours request capture",
      body: "When the consultant desk is offline, SmartBar switches from live chat to a reusable lead-capture sheet.",
      canFollowUp: false,
      mode: "speed_after_hours",
      raw: speedMeta({ stableSheetKey: "finale-after-hours" }),
    };
  }

  if (text.includes("action choices") || text.includes("tiles")) {
    return {
      title: "Choose next action",
      canFollowUp: false,
      mode: "speed_tiles",
      raw: speedMeta({ stableSheetKey: "finale-tiles" }),
    };
  }

  if (text.includes("pending cart")) {
    return orderResult(pendingCarryoutOrder(0), {
      title: "Review order",
      reviewMode: "cart",
      stableSheetKey: "finale-pending-cart",
    });
  }

  if (text.includes("final cart") || text.includes("cart")) {
    return orderResult(readyCarryoutOrder("finale"), {
      title: "Review order",
      reviewMode: "cart",
      stableSheetKey: "finale-final-cart",
    });
  }

  if (text.includes("summary")) {
    return {
      title: "Booking summary ready",
      canFollowUp: false,
      mode: "speed_booking_confirm",
      raw: {
        ...speedMeta({ stableSheetKey: "finale-booking-summary" }),
        bookingHandoff: bookingHandoff("ocean"),
      },
    };
  }

  return {
    title: "SmartBar response",
    body: "I can answer the question, collect the right details, and open the next step.",
    canFollowUp: true,
    mode: "speed_info",
    raw: speedMeta({ stableSheetKey: "finale-natural-language" }),
  };
}

const SPEED_BOOKING_RECO_STEPS: TourBarBookingNavigationState["steps"] = [
  {
    pageId: "rooms",
    targetId: "room-garden-terrace",
    targetText: "Garden Terrace King",
  },
  {
    pageId: "rooms",
    targetId: "room-ocean-view-suite",
    targetText: "Ocean View Suite",
  },
  {
    pageId: "rooms",
    targetId: "room-coastal-villa",
    targetText: "Coastal Villa Suite",
  },
];

function speedBookingRecoIndex(result: TourBarShellResult) {
  const title = result.title || "";
  if (title.includes("2 of 3")) return 1;
  if (title.includes("3 of 3")) return 2;
  return 0;
}

function speedBookingRecoNavigationState(result: TourBarShellResult): TourBarBookingNavigationState {
  return {
    steps: SPEED_BOOKING_RECO_STEPS,
    activeIndex: speedBookingRecoIndex(result),
  };
}

function renderSpeedExtras(result: TourBarShellResult, actions: TourBarShellActions) {
  const mode = result.mode || "";

  if (mode === "speed_order") {
    const raw = (result.raw || {}) as GuideAiCarryoutResponse & { __speedDemo?: { activeIndex?: number; reviewMode?: ReviewMode } };
    const order = raw.carryoutOrder || raw.visibleContext?.carryoutOrder || null;
    return (
      <OrderReview
        result={result}
        actions={actions}
        carryoutOrder={order}
        activeIndex={raw.__speedDemo?.activeIndex || 0}
        reviewMode={raw.__speedDemo?.reviewMode || "cart"}
        onActiveIndexChange={() => undefined}
        onReviewModeChange={() => undefined}
        onLocalOptionSelect={() => order}
        onSilentReprice={() => undefined}
        onRemoveItem={() => undefined}
        notOnMenuLabel="Not on the demo menu"
      />
    );
  }

  if (mode === "speed_needs_context") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => actions.openBookingContextSheet("dates")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:bg-slate-50">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Dates</div>
          <div className="text-sm font-semibold text-slate-950">Select dates</div>
        </button>
        <button type="button" onClick={() => actions.openBookingContextSheet("guests")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:bg-slate-50">
          <Users className="h-4 w-4 text-slate-500" />
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Guests</div>
          <div className="text-sm font-semibold text-slate-950">Add guests</div>
        </button>
      </div>
    );
  }

  if (mode === "speed_booking_reco") {
    const activeIndex = speedBookingRecoIndex(result);
    const backQuery = activeIndex === 2 ? "__booking_step_2" : activeIndex === 1 ? "__booking_step_1" : "";
    const nextQuery = activeIndex === 0 ? "__booking_step_2" : activeIndex === 1 ? "__booking_step_3" : "";

    return (
      <TourBarNavigationControls
        state={speedBookingRecoNavigationState(result)}
        onBack={backQuery ? () => actions.submitFollowUp(backQuery) : undefined}
        onNext={nextQuery ? () => actions.submitFollowUp(nextQuery) : undefined}
      />
    );
  }

  if (mode === "speed_booking_confirm") {
    const raw = (result.raw || {}) as { bookingHandoff?: TourBarBookingHandoff };
    return (
      <TourBarBookingHandoffSheet
        bookingHandoff={raw.bookingHandoff || null}
        actions={actions}
      />
    );
  }

  if (mode === "speed_after_hours") {
    return (
      <TourBarAfterHoursLeadSheet
        initialEmail="visitor@riverstonecap.com"
        initialNote="I watched the SmartBar demo and want to talk through pricing and rollout options."
        contextSummary="Visitor asked for consultant help after reviewing SmartBar capabilities."
      />
    );
  }

  if (mode === "speed_tiles") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["Answer", "Choose options", "Review cart", "Handoff"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm"
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

function SmartBarDemoReplayScreen({ onReplay }: { onReplay: () => void }) {
  const isMobileReplay = useSmartBarSpeedMobileViewport();

  return (
    <main className="relative h-[100svh] min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />

      <div className={isMobileReplay ? "-translate-y-[8svh] sm:translate-y-0" : undefined}>
      <SmartBarFlashCardRail>
        <SmartBarFlashCardLane active>
          <div className="inline-flex min-h-[72px] w-[min(100%,calc(100vw-1.5rem))] items-center gap-2 rounded-[28px] border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl sm:w-fit sm:max-w-[calc(100vw-2rem)] sm:gap-3 sm:rounded-full sm:px-5 sm:py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200/86 text-emerald-900 ring-1 ring-emerald-300/85 sm:h-12 sm:w-12">
              <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>

            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">
                {isMobileReplay ? "Demo complete" : "Demo complete"}
              </div>
              <div className="truncate text-[11px] font-semibold text-slate-600 sm:text-xs">
                {isMobileReplay ? "Replay SmartBar." : "Run the SmartBar speed demo again."}
              </div>
            </div>

            <button
              type="button"
              onClick={onReplay}
              className="h-11 rounded-full bg-slate-950 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-slate-950/12 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:h-12 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
            >
              Replay
            </button>
          </div>
        </SmartBarFlashCardLane>
      </SmartBarFlashCardRail>
      </div>
    </main>
  );
}




export default function SmartBarSpeedDemo({
  autoPlay = false,
}: {
  autoPlay?: boolean;
}) {
  const isMobileSpeedDemo = useSmartBarSpeedMobileViewport();
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoCommand, setDemoCommand] = useState<TourBarShellDemoCommand | null>(null);
  const [activeTutorLane, setActiveTutorLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [tutorNoticeA, setTutorNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [tutorNoticeB, setTutorNoticeB] = useState<SmartBarFlashCardNotice | null>(null);
  const [activeTutorStackMode, setActiveTutorStackMode] = useState<SmartBarFlashCardCascadeMode>("standard");
  const [tutorStackCards, setTutorStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [tutorBlocking, setTutorBlocking] = useState(true);
  const [fakePointer, setFakePointer] = useState<SmartBarFakePointerState | null>(null);
  const [replayVisible, setReplayVisible] = useState(false);
  const commandIdRef = useRef(0);
  const fakePointerIdRef = useRef(0);
  const targetStageRef = useRef<HTMLDivElement | null>(null);
  const autoPlayStartedRef = useRef(false);
  const primaryDraftRef = useRef("");
  const followUpDraftRef = useRef("");

  const sendCommand = useCallback((command: Omit<TourBarShellDemoCommand, "id">) => {
    commandIdRef.current += 1;
    setDemoCommand({ id: commandIdRef.current, ...command });
  }, []);

  const restartDemo = useCallback(() => {
    setReplayVisible(false);
    setIsPlaying(false);
    setStepIndex(-1);
    setTutorStackCards([]);
    setActiveTutorLane(null);
    setTutorNoticeA(null);
    setTutorNoticeB(null);
    setFakePointer(null);
    primaryDraftRef.current = "";
    followUpDraftRef.current = "";
    clearSmartBarFocusOverlay();
    resetSpeedDemoStageToTop(targetStageRef.current);
    sendCommand({ type: "closeAll" });

    window.setTimeout(() => {
      resetSpeedDemoStageToTop(targetStageRef.current);
      setStepIndex(0);
      setIsPlaying(true);
    }, 180);
  }, [sendCommand]);

  useEffect(() => {
    resetSpeedDemoStageToTop(targetStageRef.current);
  }, []);

  useEffect(() => {
    if (!autoPlay || autoPlayStartedRef.current) return;

    autoPlayStartedRef.current = true;
    setReplayVisible(false);
    setStepIndex(0);
    setIsPlaying(true);
  }, [autoPlay]);

  useEffect(() => {
    let cancelled = false;

    const runOpeningTutorCards = async () => {
      setTutorBlocking(true);
      await wait(DEMO_TUTOR_INITIAL_DELAY_MS);
      if (cancelled) return;

      let nextLane: SmartBarFlashCardLaneName = "a";
      let activeCascadeGroup: string | null = null;

      const openingCards = isMobileSpeedDemo ? MOBILE_OPENING_DEMO_TUTOR_CARDS : OPENING_DEMO_TUTOR_CARDS;

      for (let index = 0; index < openingCards.length; index += 1) {
        const card = openingCards[index];
        const notice: SmartBarFlashCardNotice = {
          variant: "prelude",
          title: card.title,
          detail: card.detail,
        };

        if (card.cascadeGroup) {
          const mode = card.cascadeMode || "standard";

          if (activeCascadeGroup && activeCascadeGroup !== card.cascadeGroup) {
            setTutorStackCards([]);
            await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
            if (cancelled) return;
          }

          if (activeCascadeGroup !== card.cascadeGroup) {
            setActiveTutorLane(null);
            setTutorStackCards([]);
            setActiveTutorStackMode(mode);
            activeCascadeGroup = card.cascadeGroup;
          }

          const stackItem: SmartBarFlashCardStackItem = {
            ...notice,
            id: `${card.cascadeGroup}-${index}`,
            density: card.density || (mode === "flurry" ? "micro" : "compact"),
          };

          setTutorStackCards((items) => [...items, stackItem]);
          await wait(card.holdMs ?? (mode === "flurry" ? FLASHCARD_SPEED_CONTROLS.rapidCascadeNextCardMs : FLASHCARD_SPEED_CONTROLS.slowCascadeNextCardMs));
          if (cancelled) return;

          if (card.clearCascade) {
            setTutorStackCards([]);
            activeCascadeGroup = null;
            await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
            if (cancelled) return;
          }

          continue;
        }

        if (activeCascadeGroup) {
          setTutorStackCards([]);
          activeCascadeGroup = null;
          await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
          if (cancelled) return;
        }

        if (nextLane === "a") setTutorNoticeA(notice);
        else setTutorNoticeB(notice);

        setActiveTutorLane(nextLane);
        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS + (card.holdMs ?? FLASHCARD_SPEED_CONTROLS.normalCardHoldMs));
        if (cancelled) return;

        nextLane = nextLane === "a" ? "b" : "a";
      }

      setActiveTutorLane(null);
      setTutorStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
      if (cancelled) return;

      setTutorBlocking(false);
    };

    void runOpeningTutorCards();

    return () => {
      cancelled = true;
    };
  }, [isMobileSpeedDemo]);

  const showScriptCards = useCallback(
    async (
      command: Extract<SmartBarSpeedCommand, { kind: "cards" }>,
      cancelled: () => boolean,
    ) => {
      if (!command.cards.length) return;

      const mode = command.mode || "standard";
      const defaultDensity = command.density || (mode === "flurry" ? "compact" : "normal");
      const defaultGapMs = command.holdMs ?? (
        mode === "flurry"
          ? FLASHCARD_SPEED_CONTROLS.rapidCascadeNextCardMs
          : FLASHCARD_SPEED_CONTROLS.slowCascadeNextCardMs
      );
      const finalHoldMs = command.finalHoldMs ?? (
        mode === "flurry"
          ? FLASHCARD_SPEED_CONTROLS.rapidCascadeFinalHoldMs
          : FLASHCARD_SPEED_CONTROLS.slowCascadeFinalHoldMs
      );
      const runStamp = `${Date.now()}-${Math.round(performance.now())}`;

      setActiveTutorLane(null);
      setTutorNoticeA(null);
      setTutorNoticeB(null);
      setTutorStackCards([]);
      setActiveTutorStackMode(mode);

      await waitForFrame();
      if (cancelled()) return;

      for (let index = 0; index < command.cards.length; index += 1) {
        const card = command.cards[index];
        const isTextCard = typeof card === "string";
        const title = isTextCard
          ? (isMobileSpeedDemo ? mobileSpeedDemoCardTitle(card) : card)
          : (isMobileSpeedDemo ? mobileSpeedDemoCardTitle(card.title) : card.title);
        const detail = isTextCard ? undefined : card.detail;
        const density = isTextCard ? defaultDensity : card.density || defaultDensity;
        const waitMs = isTextCard
          ? (index === command.cards.length - 1 ? finalHoldMs : defaultGapMs)
          : card.holdMs ?? (index === command.cards.length - 1 ? finalHoldMs : defaultGapMs);

        setTutorStackCards((items) => [
          ...items,
          {
            id: `script-card-${runStamp}-${index}`,
            variant: "prelude",
            title,
            detail,
            density,
          },
        ]);

        await wait(waitMs);
        if (cancelled()) return;
      }

      setTutorStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
    },
    [isMobileSpeedDemo],
  );

  const showPointerClick = useCallback(
    async (
      command: Extract<SmartBarSpeedCommand, { kind: "pointerClick" }>,
      cancelled: () => boolean,
    ) => {
      if (isMobileSpeedDemo) {
        await wait(Math.min(command.pulseMs ?? SMARTBAR_FAKE_POINTER_PULSE_MS, 320));
        return;
      }

      const stage = targetStageRef.current;
      let target: HTMLElement | null = null;

      if (command.targetId && stage) {
        target = await scrollSpeedDemoStageToTarget(stage, command.targetId);
      }

      if (cancelled()) return;

      target = target || findSpeedDemoPointerTarget(stage, command.targetId, command.targetSelector);

      for (let attempt = 0; !target && attempt < 8; attempt += 1) {
        await wait(120);
        if (cancelled()) return;
        target = findSpeedDemoPointerTarget(stage, command.targetId, command.targetSelector);
      }

      if (!target) return;

      await waitForFrame();
      if (cancelled()) return;

      const pointerId = fakePointerIdRef.current + 1;
      fakePointerIdRef.current = pointerId;

      setFakePointer(
        makeSmartBarFakePointerState(target, {
          id: pointerId,
          label: command.label,
          anchorX: command.anchorX,
          anchorY: command.anchorY,
          offsetX: command.offsetX,
          offsetY: command.offsetY,
        }),
      );

      await wait(command.aimMs ?? SMARTBAR_FAKE_POINTER_AIM_MS);
      if (cancelled()) return;

      setFakePointer((current) =>
        current?.id === pointerId
          ? {
              ...current,
              phase: "pulse",
            }
          : current,
      );

      await wait(command.pulseMs ?? SMARTBAR_FAKE_POINTER_PULSE_MS);
      if (cancelled()) return;

      setFakePointer((current) => (current?.id === pointerId ? null : current));
      await wait(command.exitMs ?? SMARTBAR_FAKE_POINTER_EXIT_MS);
    },
    [isMobileSpeedDemo],
  );

  const typeIntoShell = useCallback(
    async (field: "primary" | "followup" | "chat", value: string, cancelled: () => boolean) => {
      const type = field === "primary" ? "setPrimary" : field === "followup" ? "setFollowUp" : "setChatDraft";

      if (field === "primary") primaryDraftRef.current = value;
      if (field === "followup") followUpDraftRef.current = value;

      sendCommand({ type, value: "" });
      await wait(80);

      for (let index = 1; index <= value.length; index += 1) {
        if (cancelled()) return;
        sendCommand({ type, value: value.slice(0, index) });
        await wait(TYPE_DELAY_MS);
      }
    },
    [sendCommand],
  );

  const runCommand = useCallback(
    async (command: SmartBarSpeedCommand, cancelled: () => boolean) => {
      if (command.delayMs) await wait(command.delayMs);
      if (cancelled()) return;

      if (command.kind === "pause") return;
      if (command.kind === "typePrimary") return typeIntoShell("primary", command.value, cancelled);
      if (command.kind === "typeFollowUp") return typeIntoShell("followup", command.value, cancelled);
      if (command.kind === "typeChat") return typeIntoShell("chat", command.value, cancelled);
      if (command.kind === "submitPrimary") {
        const submittedValue = command.value ?? primaryDraftRef.current;
        sendCommand({ type: "submitPrimary", value: command.value });
        await wait(speedDemoFixtureThinkingMsForQuery(submittedValue) + SCRIPTED_SUBMIT_SETTLE_BUFFER_MS);
        return;
      }
      if (command.kind === "submitFollowUp") {
        const submittedValue = command.value ?? followUpDraftRef.current;
        sendCommand({ type: "submitFollowUp", value: command.value });
        await wait(speedDemoFixtureThinkingMsForQuery(submittedValue) + SCRIPTED_SUBMIT_SETTLE_BUFFER_MS);
        return;
      }
      if (command.kind === "submitChat") {
        sendCommand({ type: "submitChat", value: command.value });
        return;
      }
      if (command.kind === "openBookingContext") {
        sendCommand({ type: "openBookingContext", field: command.field });
        return;
      }
      if (command.kind === "setBookingContext") {
        sendCommand({ type: "setBookingContext", bookingContext: command.bookingContext });
        return;
      }
      if (command.kind === "selectBookingDate") {
        sendCommand({ type: "selectBookingDate", dateKind: command.dateKind, value: command.value });
        return;
      }
      if (command.kind === "setBookingGuestCount") {
        sendCommand({ type: "setBookingGuestCount", guestAdults: command.adults, guestChildren: command.children });
        return;
      }
      if (command.kind === "commitBookingContext") {
        sendCommand({ type: "commitBookingContext", field: command.field });
        return;
      }
      if (command.kind === "showFixture") {
        const result = fixtureResult(command.value, { compact: isMobileSpeedDemo });
        const thinkingMs = command.thinkingMs ?? 0;

        if (thinkingMs > 0 && speedResultAllowsThinkingTheater(result, command.value)) {
          sendCommand({
            type: "showThinking",
            value: command.thinkingMessage || "Choosing the right tool...",
          });
          await wait(thinkingMs);
          if (cancelled()) return;
        }

        sendCommand({ type: "showResult", result });
        return;
      }
      if (command.kind === "cards") {
        await showScriptCards(command, cancelled);
        return;
      }
      if (command.kind === "pointerClick") {
        await showPointerClick(command, cancelled);
        return;
      }
      if (command.kind === "focusTarget") {
        const stage = targetStageRef.current;
        const stageTarget = stage
          ? await scrollSpeedDemoStageToTarget(stage, command.targetId)
          : null;
        if (cancelled()) return;

        await smartbarFocusTarget(
          {
            pageId: "smartbar-speed-demo",
            targetId: command.targetId,
            label: command.label,
          },
          {
            initialDelayMs: command.initialDelayMs ?? 40,
            attempts: Math.min(command.attempts ?? 10, 10),
            overlayDurationMs: command.overlayDurationMs ?? 2800,
            scrollBehavior: "auto",
            skipPlacementScroll: Boolean(stageTarget),
          },
        );
        return;
      }
      if (command.kind === "shell") {
        sendCommand({ type: command.type });
        if (command.settleMs) await wait(command.settleMs);
      }
    },
    [isMobileSpeedDemo, sendCommand, showPointerClick, showScriptCards, typeIntoShell],
  );

  useEffect(() => {
    if (stepIndex < 0 || tutorBlocking || !isPlaying) return;

    let cancelled = false;
    const currentStep = SMARTBAR_SPEED_STEPS[stepIndex];
    if (!currentStep) return;

    const run = async () => {
      for (const command of currentStep.commands) {
        if (cancelled) return;
        await runCommand(command, () => cancelled);
      }

      if (!cancelled) {
        await wait(650);
        if (cancelled) return;
        if (stepIndex < SMARTBAR_SPEED_STEPS.length - 1) {
          setStepIndex((index) => Math.min(index + 1, SMARTBAR_SPEED_STEPS.length - 1));
        } else {
          setFakePointer(null);
          setTutorStackCards([]);
          setActiveTutorLane(null);
          setTutorNoticeA(null);
          setTutorNoticeB(null);
          clearSmartBarFocusOverlay();
          resetSpeedDemoStageToTop(targetStageRef.current);
          sendCommand({ type: "closeAll" });
          await wait(DEMO_REPLAY_SETTLE_MS);
          if (cancelled) return;
          setReplayVisible(true);
          setIsPlaying(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isPlaying, runCommand, sendCommand, stepIndex, tutorBlocking]);

  const onPrimarySubmit = async (query: string, _context: TourBarShellTurnContext) => {
    const result = fixtureResult(query, { compact: isMobileSpeedDemo });
    await wait(speedDemoFixtureThinkingMs(result, query));
    return result;
  };

  const onFollowUpSubmit = async (query: string, _context: TourBarShellTurnContext) => {
    const result = fixtureResult(query, { compact: isMobileSpeedDemo });
    await wait(speedDemoFixtureThinkingMs(result, query));
    return result;
  };

  const currentStep = stepIndex >= 0 ? SMARTBAR_SPEED_STEPS[stepIndex] : null;
  const toolbarSurface = currentStep?.surface || "info";

  useLayoutEffect(() => {
    clearSmartBarFocusOverlay();
    resetSpeedDemoStageToTop(targetStageRef.current);

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      resetSpeedDemoStageToTop(targetStageRef.current);

      secondFrame = window.requestAnimationFrame(() => {
        resetSpeedDemoStageToTop(targetStageRef.current);
        targetStageRef.current?.setAttribute("data-smartbar-speed-last-scroll-reset", toolbarSurface);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [toolbarSurface]);

  const smartBarNode = (
    <TourBarShell
              primaryPlaceholder={isMobileSpeedDemo ? "Ask SmartBar..." : "Ask SmartBar in plain English..."}
              followUpPlaceholder="Ask a follow-up..."
              launcherTitle="SmartBar speed demo"
              launcherAriaLabel="Open SmartBar speed demo"
              resultEyebrow="SmartBar response"
              initialLoadingMessage="Choosing the right tool..."
              followUpLoadingMessage="Switching tools..."
              consultantChat={{
                enabled: true,
                title: "Talk to a consultant",
                placeholder: "Add anything else if needed...",
                autoStartMessage: "Context received — handing this to a consultant.",
                autoStartConsultantMessage: "Hi there — You’re interested in Copilot support?",
                replyThinkingMessage: "Thinking...",
                replyConfirmationMessage: "Great, lets set up a chat!",
              }}
              demoCommand={demoCommand}
              onPrimarySubmit={onPrimarySubmit}
              onFollowUpSubmit={onFollowUpSubmit}
              renderResultExtras={renderSpeedExtras}
              buildThreadMessage={(result) => [result.title, result.body].filter(Boolean).join("\n")}
            />
  );

  if (replayVisible) {
    return <SmartBarDemoReplayScreen onReplay={restartDemo} />;
  }

  return (
    <main className="relative h-[100svh] min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_52%,_#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className={isMobileSpeedDemo ? "-translate-y-[8svh] sm:translate-y-0" : undefined}>
      <SmartBarFlashCardRail>
        <SmartBarFlashCardStack cards={tutorStackCards} mode={activeTutorStackMode} />
        <SmartBarFlashCardLane active={activeTutorLane === "a"}>
          <SmartBarFlashCard notice={tutorNoticeA} />
        </SmartBarFlashCardLane>
        <SmartBarFlashCardLane active={activeTutorLane === "b"}>
          <SmartBarFlashCard notice={tutorNoticeB} />
        </SmartBarFlashCardLane>
      </SmartBarFlashCardRail>
      </div>

      <SmartBarFakePointerOverlay pointer={isMobileSpeedDemo ? null : fakePointer} />

      <div className="relative z-[10070] px-3 pt-3 sm:px-6 sm:pt-4">
        <SmartBarDemoToolbarFrame surface={toolbarSurface} smartBarNode={smartBarNode} />
      </div>

      <div
        key={toolbarSurface}
        ref={targetStageRef}
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface={toolbarSurface}
        className="relative z-10 h-[calc(100svh-88px)] overflow-y-auto overscroll-contain pb-36 pt-1 [scrollbar-gutter:stable] sm:h-[calc(100svh-106px)] sm:pb-32 sm:pt-2"
      >
        <SmartBarSpeedTargetWall surface={toolbarSurface} />
      </div>


      <SmartBarDemoScrubber
        index={stepIndex}
        isPlaying={isPlaying}
        onSelect={(index) => {
          if (tutorBlocking) return;
          setReplayVisible(false);
          setIsPlaying(false);
          setStepIndex(index);
        }}
        onTogglePlay={() => {
          if (tutorBlocking) return;
          setReplayVisible(false);
          if (isPlaying) {
            setIsPlaying(false);
            return;
          }
          if (stepIndex < 0) setStepIndex(0);
          setIsPlaying(true);
        }}
      />
    </main>
  );
}

