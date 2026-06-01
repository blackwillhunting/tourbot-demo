import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCcw, Users } from "lucide-react";
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
import BurgerRushMobileExperience from "../smartbar-mobile/burgerrush/BurgerRushMobileExperience";
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
import { SMARTBAR_BURGERRUSH_ONLY_STEPS, SMARTBAR_SPEED_STEPS, type SmartBarSpeedCommand } from "./smartBarSpeedScript";

const TYPE_DELAY_MS = 18;
const MOBILE_TYPE_DELAY_MS = 42;
const MOBILE_STAGE_SCROLL_MIN_MS = 620;
const MOBILE_STAGE_SCROLL_MAX_MS = 1480;
const MOBILE_STAGE_SCROLL_PX_FACTOR = 0.82;
const MOBILE_STAGE_TOP_ANCHOR_Y = 30;
const MOBILE_NEXT_MOVE_POINTER_EXTRA_WAIT_MS = 650;
const MOBILE_NEXT_MOVE_POINTER_PULSE_MS = 1050;
const DETERMINISTIC_FIXTURE_THINKING_MS = 280;
const TEXT_FIXTURE_THINKING_MS = 1500;
const SCRIPTED_SUBMIT_SETTLE_BUFFER_MS = 120;
const DEMO_TUTOR_INITIAL_DELAY_MS = 820;
const DEMO_TUTOR_HOLD_MS = 2500;
const DEMO_REPLAY_SETTLE_MS = 360;
const SPEED_DEMO_POINTER_SETTLE_FRAMES = 3;
const SPEED_DEMO_POINTER_STABLE_RECT_ATTEMPTS = 34;
const SPEED_DEMO_POINTER_LOCK_ATTEMPTS = 10;
const SPEED_DEMO_POINTER_MIN_VISIBLE_RATIO = 0.82;

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
    title: "Example 1: **NexaPath Advisory**",
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
    title: "SmartBar generates a lead",
    cascadeGroup: "intro-3",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
    clearCascade: true,
  },
];

const BURGERRUSH_ONLY_DEMO_TUTOR_CARDS: SmartBarTutorCard[] = [
  {
    title: "BurgerRush Carryout",
    cascadeGroup: "burger-rush-only-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1400,
  },
  {
    title: "Order in plain English",
    cascadeGroup: "burger-rush-only-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1400,
  },
  {
    title: "SmartBar builds the cart",
    cascadeGroup: "burger-rush-only-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1400,
  },
  {
    title: "Choices, fixes, checkout",
    cascadeGroup: "burger-rush-only-intro",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1700,
    clearCascade: true,
  },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function waitForFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function speedDemoIsPhoneViewport() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(max-width: 767px)").matches ||
    /Android|iPhone|iPod|Mobile/i.test(window.navigator.userAgent)
  );
}

function speedDemoTypeDelayMs() {
  return speedDemoIsPhoneViewport() ? MOBILE_TYPE_DELAY_MS : TYPE_DELAY_MS;
}

function speedDemoIsMobileNextMovePointer(command: Extract<SmartBarSpeedCommand, { kind: "pointerClick" }>) {
  return Boolean(
    speedDemoIsPhoneViewport() &&
      command.targetSelector?.includes("data-tourbar-nextmove-query"),
  );
}

function speedDemoPointerTargetKind(target: HTMLElement) {
  return target.getAttribute("data-smartbar-pointer-kind") || "";
}

function speedDemoPointerAnchorY(
  target: HTMLElement,
  command: Extract<SmartBarSpeedCommand, { kind: "pointerClick" }>,
) {
  if (command.anchorY !== undefined) return command.anchorY;

  if (!speedDemoIsPhoneViewport()) return 0.5;

  const targetKind = speedDemoPointerTargetKind(target);

  // Small bottom-mounted phone controls need a lower visual hotspot than normal
  // content cards. The DOM center is mathematically correct, but the fake
  // pointer graphic reads high on tiny circular controls unless we bias down.
  if (targetKind === "launcher") return 0.64;
  if (targetKind === "submit") return 0.62;

  return 0.5;
}

function speedDemoPointerOffsetY(
  target: HTMLElement,
  command: Extract<SmartBarSpeedCommand, { kind: "pointerClick" }>,
) {
  const baseOffset = command.offsetY ?? 0;

  if (!speedDemoIsPhoneViewport()) return command.offsetY;

  const targetKind = speedDemoPointerTargetKind(target);

  // Keep desktop untouched. On phones, bottom-mounted controls sit visually
  // inside the browser chrome zone, so the pointer needs a tiny downward
  // correction to land center-shot on the icon face.
  if (targetKind === "launcher") return baseOffset + 8;
  if (targetKind === "submit") return baseOffset + 6;

  return command.offsetY;
}

async function waitForFrames(count: number) {
  for (let index = 0; index < count; index += 1) {
    await waitForFrame();
  }
}

function speedDemoRectDelta(a: DOMRect, b: DOMRect) {
  return Math.max(
    Math.abs(a.top - b.top),
    Math.abs(a.left - b.left),
    Math.abs(a.width - b.width),
    Math.abs(a.height - b.height),
  );
}

async function waitForSpeedDemoStableRect(element: HTMLElement, frames = SPEED_DEMO_POINTER_SETTLE_FRAMES) {
  let previousRect = element.getBoundingClientRect();

  for (let attempt = 0; attempt < SPEED_DEMO_POINTER_STABLE_RECT_ATTEMPTS; attempt += 1) {
    await waitForFrames(frames);
    const nextRect = element.getBoundingClientRect();

    if (speedDemoRectDelta(previousRect, nextRect) < 0.75) {
      return nextRect;
    }

    previousRect = nextRect;
  }

  return element.getBoundingClientRect();
}

function speedDemoIntersectionRatio(rect: DOMRect, clip: { top: number; right: number; bottom: number; left: number }) {
  const width = Math.max(0, Math.min(rect.right, clip.right) - Math.max(rect.left, clip.left));
  const height = Math.max(0, Math.min(rect.bottom, clip.bottom) - Math.max(rect.top, clip.top));
  const visibleArea = width * height;
  const totalArea = Math.max(1, rect.width * rect.height);

  return visibleArea / totalArea;
}

function speedDemoClipRectForTarget(stage: HTMLElement | null, target: HTMLElement) {
  const viewport = {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };

  if (!stage || !stage.contains(target)) return viewport;

  const stageRect = stage.getBoundingClientRect();
  const inset = Math.min(28, Math.max(12, stageRect.height * 0.035));

  return {
    top: Math.max(viewport.top, stageRect.top + inset),
    left: Math.max(viewport.left, stageRect.left + inset),
    right: Math.min(viewport.right, stageRect.right - inset),
    bottom: Math.min(viewport.bottom, stageRect.bottom - inset),
  };
}

function speedDemoTargetIsReady(stage: HTMLElement | null, target: HTMLElement) {
  if (!speedDemoElementLooksVisible(target)) return false;

  const rect = target.getBoundingClientRect();
  const clip = speedDemoClipRectForTarget(stage, target);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const centerIsSafe = centerX >= clip.left && centerX <= clip.right && centerY >= clip.top && centerY <= clip.bottom;

  return centerIsSafe && speedDemoIntersectionRatio(rect, clip) >= SPEED_DEMO_POINTER_MIN_VISIBLE_RATIO;
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
  if (speedDemoIsPhoneViewport()) {
    return Math.min(
      MOBILE_STAGE_SCROLL_MAX_MS,
      Math.max(MOBILE_STAGE_SCROLL_MIN_MS, Math.abs(distance) * MOBILE_STAGE_SCROLL_PX_FACTOR),
    );
  }

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

async function scrollSpeedDemoStageElementIntoView(stage: HTMLElement, target: HTMLElement) {
  await waitForFrame();

  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTopInStage = stage.scrollTop + targetRect.top - stageRect.top;
  const maxTop = Math.max(0, stage.scrollHeight - stage.clientHeight);
  const safeInset = Math.min(140, Math.max(72, stage.clientHeight * 0.16));
  const availableHeight = Math.max(180, stage.clientHeight - safeInset * 2);
  const mobileTopAnchorY = Math.min(
    MOBILE_STAGE_TOP_ANCHOR_Y,
    Math.max(16, stage.clientHeight - 180),
  );
  const desiredTop = speedDemoIsPhoneViewport()
    ? targetTopInStage - mobileTopAnchorY
    : targetRect.height >= availableHeight
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

async function scrollSpeedDemoStageToTarget(stage: HTMLElement, targetId: string) {
  const target = findSpeedDemoStageTarget(stage, targetId);
  if (!target) return null;

  return scrollSpeedDemoStageElementIntoView(stage, target);
}

async function lockSpeedDemoPointerTarget(
  stage: HTMLElement | null,
  command: Extract<SmartBarSpeedCommand, { kind: "pointerClick" }>,
  cancelled: () => boolean,
) {
  let target: HTMLElement | null = null;

  for (let attempt = 0; attempt < SPEED_DEMO_POINTER_LOCK_ATTEMPTS; attempt += 1) {
    if (command.targetId && stage) {
      target = await scrollSpeedDemoStageToTarget(stage, command.targetId);
    }

    if (cancelled()) return null;

    target = target || findSpeedDemoPointerTarget(stage, command.targetId, command.targetSelector);

    if (target && stage?.contains(target)) {
      await scrollSpeedDemoStageElementIntoView(stage, target);
    }

    if (cancelled()) return null;

    if (target) {
      await waitForSpeedDemoStableRect(target);
      if (cancelled()) return null;

      if (speedDemoTargetIsReady(stage, target)) {
        return target;
      }
    }

    target = null;
    await wait(90);
  }

  return findSpeedDemoPointerTarget(stage, command.targetId, command.targetSelector);
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

function optionalCheeseburgerOrder(kind: "plain" | "bacon" = "plain"): CarryoutOrder {
  const hasBacon = kind === "bacon";
  const subtotal = hasBacon ? 6.74 : 5.49;
  const item = {
    lineItemId: "cheeseburger-options",
    id: "item-cheeseburger",
    targetId: "item-cheeseburger",
    title: "Cheeseburger",
    quantity: 1,
    priceLabel: `$${subtotal.toFixed(2)}`,
    status: "ready",
    knownSelections: ["No onions"],
    modifiers: hasBacon ? [{ label: "Bacon", priceDelta: 1.25 }] : [],
    qualifierGroups: [
      {
        kind: "modifier",
        qualifierId: "burger-extras",
        label: "Optional extras",
        targetId: "item-cheeseburger",
        required: false,
        missing: false,
        selectionMode: "multi",
        options: [
          { label: "Bacon", value: "bacon", priceDelta: 1.25 },
          { label: "Extra sauce", value: "extra-sauce", priceDelta: 0.5 },
          { label: "Pickles", value: "pickles", priceDelta: 0 },
        ],
      },
    ],
  };

  const items = [item];
  return {
    type: "carryout_order",
    status: "ready_cart",
    nextAction: "show_cart",
    items,
    completeItems: items,
    pendingItems: [],
    totals: {
      status: "ready",
      subtotal,
      estimatedTax: hasBacon ? 0.54 : 0.44,
      estimatedTotal: hasBacon ? 7.28 : 5.93,
      currency: "USD",
    },
  };
}

function lockedOptionalCheeseburgerOrder(): CarryoutOrder {
  return {
    ...optionalCheeseburgerOrder("bacon"),
    nextAction: "checkout_handoff",
    lockedForHandoff: true,
    handoffStatus: "ready",
  };
}

function cannotMatchTacoOrder(): CarryoutOrder {
  const items = [
    line("fries-size", "Fries", "$3.49", ["Large fries"]),
    line("cheeseburger", "Cheeseburger", "$5.49", ["No onions"]),
  ].map((item) => {
    if (item.id === "cheeseburger") return { ...item, targetId: "item-cheeseburger" };
    return { ...item, targetId: "side-fries" };
  });

  return {
    type: "carryout_order",
    status: "partial_match",
    nextAction: "show_cart",
    items,
    completeItems: items,
    pendingItems: [],
    cannotMatchItems: [
      {
        text: "lava tacos",
        reason: "not_on_menu",
      },
    ],
    totals: {
      status: "partial",
      subtotal: 8.98,
      estimatedTax: 0.72,
      estimatedTotal: 9.7,
      currency: "USD",
    },
  };
}

function retriedMediumOnionRingsOrder(): CarryoutOrder {
  const items = [
    line("medium-onion-rings", "Medium onion rings", "$3.99", ["Medium"]),
    line("fries-size", "Fries", "$3.49", ["Large fries"]),
    line("cheeseburger", "Cheeseburger", "$5.49", ["No onions"]),
  ].map((item) => {
    if (item.id === "cheeseburger") return { ...item, targetId: "item-cheeseburger" };
    if (item.id === "fries-size") return { ...item, targetId: "side-fries" };
    return { ...item, targetId: "side-onion-rings" };
  });

  return {
    type: "carryout_order",
    status: "ready_cart",
    nextAction: "show_cart",
    items,
    completeItems: items,
    pendingItems: [],
    cannotMatchItems: [],
    totals: {
      status: "ready",
      subtotal: 12.97,
      estimatedTax: 1.04,
      estimatedTotal: 14.01,
      currency: "USD",
    },
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
  promoteReadyLineItemId?: string;
  focusTargetId?: string;
  nextMoveLoadingMessage?: string;
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
        promoteReadyLineItemId: options.promoteReadyLineItemId,
        focusTargetId: options.focusTargetId,
        nextMoveLoadingMessage: options.nextMoveLoadingMessage,
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
    datesLabel: "Aug 4–9, 2026",
    guestsLabel: "1 guest",
    budgetLabel: "Good view, not villa tier",
    priceLabel: "$379/night + $32/night",
  };
}

function fixtureResult(query: string): TourBarShellResult {
  const text = query.trim().toLowerCase();

  if (
    text.includes("hedge fund") ||
    text.includes("copilot agents") ||
    text.includes("copilots") ||
    text.includes("dora")
  ) {
    return {
      title: "Showing: Hedge Fund industry path",
      body:
        "Yes — this hedge-fund path covers both core IT support needs and AI/copilot-related modernization. In this context, that typically means:\n\n- Secure trading and collaboration infrastructure\n- Cyber/compliance operating model support\n- AI/data visibility and workflow enhancement, including governed copilot-style capabilities\n\nFor a hedge fund, the site frames this as a combined approach: stable infrastructure first, then security/compliance, then AI/data and workflow opportunities in a regulated operating model.",
      invitation: { kind: "next", text: "Want to look specifically at the AI & Data lane for Copilot and agent setup?" },
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
        "For a hedge fund, the practical Copilot/agent work would usually look like this:\n\n- **Readiness review:** confirm Microsoft 365 permissions, data exposure, identity controls, and security boundaries before anyone turns agents loose.\n- **Use-case selection:** pick a few high-value workflows — investment committee prep, policy lookup, vendor-risk intake, ticket triage, or research summarization.\n- **Agent design:** define what each agent can answer, what systems it can touch, and when it must escalate for review.\n- **Pilot support:** build a small controlled rollout, train the first users, measure adoption, and tighten governance before expanding.",
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
        "- **Hedge-fund operations assistant:** mapped analyst and operations questions to approved knowledge sources, then routed sensitive requests to human review.\n- **Compliance evidence helper:** organized policy, vendor-risk, and incident-response materials so leaders could ask plain-English questions before audits and tabletop reviews.\n- **Copilot adoption sprint:** coached a regulated firm through safe rollout patterns, permission cleanup, user training, and a short list of practical first agents.",
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
      title: "Review order",
      body: "Cart opened with required choices. Pick each missing option to finish checkout.",
      activeIndex: 0,
      reviewMode: "cart",
      nextQuery: "__qualifier_1",
      keepSheetOpenNextMove: true,
    });
  }

  if (text.includes("optional extras") || text.includes("show burger options")) {
    return orderResult(optionalCheeseburgerOrder("plain"), {
      title: "Review order",
      body: "Cheeseburger is ready. Optional extras are available, but checkout is not blocked.",
      reviewMode: "cart",
      nextQuery: "__optional_bacon",
      keepSheetOpenNextMove: true,
    });
  }

  if (text === "__optional_bacon") {
    return orderResult(optionalCheeseburgerOrder("bacon"), {
      title: "Review order",
      body: "Bacon added. The cart is still ready for checkout.",
      reviewMode: "cart",
      nextQuery: "__checkout_optional",
      separateSheetNextMove: true,
    });
  }

  if (text === "__checkout_optional") {
    return orderResult(lockedOptionalCheeseburgerOrder(), {
      title: "Order locked for handoff",
      reviewMode: "cart",
      stableSheetKey: "checkout-optional",
      commerceAction: "carryout_checkout_handoff",
    });
  }

  if (text.includes("med rings") || text.includes("medium onion rings")) {
    return orderResult(retriedMediumOnionRingsOrder(), {
      title: "Review order",
      body: "Medium onion rings added. The gray item was replaced.",
      reviewMode: "cart",
      stableSheetKey: "retry-onion-rings",
      promoteReadyLineItemId: "medium-onion-rings",
      focusTargetId: "side-onion-rings",
    });
  }

  if (text.includes("lava tacos") || text.includes("not on the menu")) {
    return orderResult(cannotMatchTacoOrder(), {
      title: "Review order",
      body: "Matched items ready. The gray row(s) held out.",
      reviewMode: "cart",
      stableSheetKey: "cannot-match-tacos",
      nextMoveLoadingMessage: "Checking the BurgerRush menu...",
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
      title: "Review order",
      body: "Cheeseburger setup captured. Fries still needs a required choice.",
      activeIndex: 1,
      reviewMode: "cart",
      nextQuery: "__qualifier_2",
      keepSheetOpenNextMove: true,
      promoteReadyLineItemId: "cheeseburger",
    });
  }

  if (text === "__qualifier_2") {
    return orderResult(pendingCheeseburgerFriesShakeOrder(2), {
      title: "Review order",
      body: "Fries size captured. Milkshake flavor is the last required choice.",
      activeIndex: 2,
      reviewMode: "cart",
      nextQuery: "__qualifier_3",
      keepSheetOpenNextMove: true,
      promoteReadyLineItemId: "fries-size",
    });
  }

  if (text === "__qualifier_3") {
    return orderResult(readyCheeseburgerFriesShakeOrder(), {
      title: "Review order",
      nextQuery: "__checkout_qualified",
      separateSheetNextMove: true,
      promoteReadyLineItemId: "milkshake",
    });
  }

  if (text === "__booking_step_1" || text.includes("nice room") || text.includes("view and breakfast")) {
    return {
      title: "Recommendation 1 of 3",
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
      title: "Recommendation 2 of 3",
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
      title: "Recommendation 3 of 3",
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
    title: "SmartBar in one line",
    body:
      "SmartBar turns a plain visitor question into the next useful action.\nIt can answer, guide, qualify, compare, collect, and hand off without making the user hunt through the site.\nOn content-heavy sites, it behaves like a navigator.\nOn ordering or booking sites, it behaves like a completion layer.\nThe CTA is simple: ask for what you want, then let SmartBar open the right next step.",
    invitation: { kind: "next", text: "Show me what it can do" },
    nextMove: { type: "ask_deeper", label: "Show me what it can do", query: "show action choices" },
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

function speedDemoOrderTarget(result: TourBarShellResult) {
  const raw = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = raw.carryoutOrder || raw.visibleContext?.carryoutOrder || null;
  if (!order) return null;

  const explicitTarget = (raw as GuideAiCarryoutResponse & { __speedDemo?: { focusTargetId?: string } }).__speedDemo?.focusTargetId;
  if (explicitTarget) return explicitTarget;

  const currentTarget = order.currentStep?.targetId;
  if (currentTarget) return currentTarget;

  const firstPending = (order.items || order.pendingItems || []).find((line) => {
    const status = String(line.status || "").toLowerCase();
    return status.includes("pending") || status.includes("need") || Boolean(line.missingQualifiers?.length);
  });

  return firstPending?.targetId || null;
}

function speedDemoResultTarget(result: TourBarShellResult) {
  const mode = result.mode || "";

  if (mode === "speed_order") return speedDemoOrderTarget(result);
  if (mode === "speed_booking_reco") return SPEED_BOOKING_RECO_STEPS[speedBookingRecoIndex(result)]?.targetId || null;
  if (mode === "speed_package") return "package-breakfast-flex";
  if (mode === "speed_family_reco") return "room-family-double";
  if (mode === "speed_info" || mode === "speed_case_studies") return "hedgefund-copilot";

  return null;
}

function renderMobileSpeedControls(result: TourBarShellResult, actions: TourBarShellActions) {
  const mode = result.mode || "";

  if (mode === "speed_booking_reco") {
    const activeIndex = speedBookingRecoIndex(result);
    const backQuery = activeIndex === 2 ? "__booking_step_2" : activeIndex === 1 ? "__booking_step_1" : "";
    const nextQuery = activeIndex === 0 ? "__booking_step_2" : activeIndex === 1 ? "__booking_step_3" : "";

    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <button
          type="button"
          data-tourbar-booking-nav="back"
          data-tourbar-booking-nav-state={!backQuery ? "disabled" : "enabled"}
          onClick={() => backQuery && actions.submitFollowUp(backQuery)}
          disabled={!backQuery}
          aria-label="Previous recommendation"
          className="inline-flex h-8 w-8 items-center justify-center justify-self-start rounded-full border border-white/15 bg-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-10 text-center text-[11px] font-semibold text-white/45">
          {activeIndex + 1}/3
        </div>
        <button
          type="button"
          data-tourbar-booking-nav="next"
          data-tourbar-booking-nav-state={!nextQuery ? "disabled" : "enabled"}
          onClick={() => nextQuery && actions.submitFollowUp(nextQuery)}
          disabled={!nextQuery}
          aria-label="Next recommendation"
          className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-full border border-white/15 bg-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (mode === "speed_order") {
    // OrderReview owns food cart / qualifier controls. Suppress the generic
    // mobile next-move link so internal qualifier steps do not add/remove an
    // extra CTA row and jerk the sheet height between items.
    return null;
  }

  if (result.nextMove?.query) {
    return (
      <div className="flex w-full justify-center">
        <button
          type="button"
          data-tourbar-nextmove-button="true"
          data-tourbar-nextmove-label={result.nextMove.label || result.invitation?.text || "Next"}
          data-tourbar-nextmove-query={result.nextMove.query || ""}
          data-tourbar-nextmove-invitation={result.invitation?.text || ""}
          onClick={() => actions.submitFollowUp(result.nextMove?.query || result.nextMove?.label || "")}
          className="inline-flex items-center justify-center px-1 py-1 text-xs font-black text-sky-300 underline underline-offset-4 transition hover:text-sky-100"
        >
          {result.nextMove.label || result.invitation?.text || "Next"}
        </button>
      </div>
    );
  }

  return null;
}

function renderSpeedExtras(result: TourBarShellResult, actions: TourBarShellActions) {
  const mode = result.mode || "";

  if (mode === "speed_order") {
    const raw = (result.raw || {}) as GuideAiCarryoutResponse & { __speedDemo?: { activeIndex?: number; reviewMode?: ReviewMode } };
    const order = raw.carryoutOrder || raw.visibleContext?.carryoutOrder || null;
    return (
      <OrderReview
        appearance="light"
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
        onRetryItemReplace={(_retryIndex, retryValue, panelActions) => {
          panelActions.submitFollowUp(retryValue);
        }}
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
    if (speedDemoIsPhoneViewport()) return null;

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
      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm ring-1 ring-orange-100/70">
        <div className="relative min-h-[132px] p-4">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-orange-200/45 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm ring-1 ring-orange-100">
              🍔
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">Featured item</div>
              <div className="mt-1 text-lg font-black tracking-tight text-slate-950">Double cheeseburger combo</div>
              <div className="mt-1 text-sm font-semibold text-slate-600">Large fries · Large Diet Coke · No onions</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">$11.99</span>
                <span className="text-xs font-bold text-slate-500">SmartBar can turn a food request into a structured item slide.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function SmartBarDemoReplayScreen({ onReplay }: { onReplay: () => void }) {
  const replayRequestedRef = useRef(false);
  const requestReplay = useCallback(() => {
    if (replayRequestedRef.current) return;

    replayRequestedRef.current = true;
    onReplay();
  }, [onReplay]);

  return (
    <main className="relative h-[100svh] min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />

      <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center px-3">
        <motion.button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            requestReplay();
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            requestReplay();
          }}
          aria-label="Replay demo"
          title="Replay demo"
          initial={{ y: 36, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            duration: SMARTBAR_FLASH_CARD_TRANSITION_MS / 1000,
            ease: [0.22, 1, 0.36, 1],
          }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.985 }}
          className="group pointer-events-auto inline-flex min-h-[64px] w-fit max-w-[calc(100vw-1rem)] items-center gap-2 rounded-full border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl transition sm:min-h-[72px] sm:gap-3 sm:px-5 sm:py-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200/86 text-emerald-900 ring-1 ring-emerald-300/85 sm:h-12 sm:w-12">
            <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">Demo complete</span>
            <span className="block truncate text-xs font-semibold text-slate-600">Swipe down to replay.</span>
          </span>

          <span className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/12 transition group-hover:bg-slate-800 sm:h-12 sm:w-auto sm:px-5 sm:text-xs sm:font-black sm:uppercase sm:tracking-[0.14em]">
            <RefreshCcw className="h-4 w-4 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">Replay</span>
          </span>
        </motion.button>
      </div>
    </main>
  );
}





export type SmartBarSpeedDemoVariant = "full" | "burgerRushOnly";

export default function SmartBarSpeedDemo({
  autoPlay = false,
  variant = "full",
}: {
  autoPlay?: boolean;
  variant?: SmartBarSpeedDemoVariant;
}) {
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoCommand, setDemoCommand] = useState<TourBarShellDemoCommand | null>(null);
  const [activeTutorLane, setActiveTutorLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [tutorNoticeA, setTutorNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [tutorNoticeB, setTutorNoticeB] = useState<SmartBarFlashCardNotice | null>(null);
  const [activeTutorStackMode, setActiveTutorStackMode] = useState<SmartBarFlashCardCascadeMode>("standard");
  const [tutorStackCards, setTutorStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [tutorBlocking, setTutorBlocking] = useState(true);
  const [introRunId, setIntroRunId] = useState(0);
  const [fakePointer, setFakePointer] = useState<SmartBarFakePointerState | null>(null);
  const [replayVisible, setReplayVisible] = useState(false);
  const commandIdRef = useRef(0);
  const fakePointerIdRef = useRef(0);
  const targetStageRef = useRef<HTMLDivElement | null>(null);
  const lastAutoRevealTargetRef = useRef<{ targetId: string; at: number } | null>(null);
  const autoPlayStartedRef = useRef(false);
  const replayStartPendingRef = useRef(false);
  const replayFallbackTimerRef = useRef<number | null>(null);
  const primaryDraftRef = useRef("");
  const followUpDraftRef = useRef("");
  const demoSteps = useMemo(
    () => (variant === "burgerRushOnly" ? SMARTBAR_BURGERRUSH_ONLY_STEPS : SMARTBAR_SPEED_STEPS),
    [variant],
  );
  const openingTutorCards = variant === "burgerRushOnly" ? BURGERRUSH_ONLY_DEMO_TUTOR_CARDS : OPENING_DEMO_TUTOR_CARDS;
  const mobileBurgerRushShell = variant === "burgerRushOnly" && speedDemoIsPhoneViewport();
  const effectiveAutoPlay = autoPlay && !mobileBurgerRushShell;
  useLayoutEffect(() => {
    if (!mobileBurgerRushShell || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const previous = {
      htmlHeight: html.style.height,
      htmlMinHeight: html.style.minHeight,
      htmlOverflow: html.style.overflow,
      htmlOverflowX: html.style.overflowX,
      htmlOverflowY: html.style.overflowY,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyHeight: body.style.height,
      bodyMinHeight: body.style.minHeight,
      bodyOverflow: body.style.overflow,
      bodyOverflowX: body.style.overflowX,
      bodyOverflowY: body.style.overflowY,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      rootHeight: root?.style.height || "",
      rootMinHeight: root?.style.minHeight || "",
      rootOverflow: root?.style.overflow || "",
    };

    // BurgerRush mobile must behave like a normal web page. Earlier demo-mode
    // code froze html/body to protect the scripted stage, but this direct
    // mobile surface needs native document scrolling.
    html.style.height = "auto";
    html.style.minHeight = "100%";
    html.style.overflow = "";
    html.style.overflowX = "hidden";
    html.style.overflowY = "auto";
    html.style.overscrollBehavior = "auto";

    body.style.height = "auto";
    body.style.minHeight = "100%";
    body.style.overflow = "";
    body.style.overflowX = "hidden";
    body.style.overflowY = "auto";
    body.style.overscrollBehavior = "auto";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";

    if (root) {
      root.style.height = "auto";
      root.style.minHeight = "100%";
      root.style.overflow = "visible";
    }

    return () => {
      html.style.height = previous.htmlHeight;
      html.style.minHeight = previous.htmlMinHeight;
      html.style.overflow = previous.htmlOverflow;
      html.style.overflowX = previous.htmlOverflowX;
      html.style.overflowY = previous.htmlOverflowY;
      html.style.overscrollBehavior = previous.htmlOverscrollBehavior;
      body.style.height = previous.bodyHeight;
      body.style.minHeight = previous.bodyMinHeight;
      body.style.overflow = previous.bodyOverflow;
      body.style.overflowX = previous.bodyOverflowX;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      if (root) {
        root.style.height = previous.rootHeight;
        root.style.minHeight = previous.rootMinHeight;
        root.style.overflow = previous.rootOverflow;
      }
    };
  }, [mobileBurgerRushShell]);

  const sendCommand = useCallback((command: Omit<TourBarShellDemoCommand, "id">) => {
    commandIdRef.current += 1;
    setDemoCommand({ id: commandIdRef.current, ...command });
  }, []);

  const clearReplayFallbackTimer = useCallback(() => {
    if (replayFallbackTimerRef.current === null) return;

    window.clearTimeout(replayFallbackTimerRef.current);
    replayFallbackTimerRef.current = null;
  }, []);

  const restartDemo = useCallback(() => {
    clearReplayFallbackTimer();
    setReplayVisible(false);
    setIsPlaying(false);
    setStepIndex(-1);
    setTutorBlocking(true);
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
    replayStartPendingRef.current = true;
    setIntroRunId((runId) => runId + 1);

    replayFallbackTimerRef.current = window.setTimeout(() => {
      if (!replayStartPendingRef.current) return;

      replayStartPendingRef.current = false;
      replayFallbackTimerRef.current = null;
      setTutorBlocking(false);
      setTutorStackCards([]);
      setActiveTutorLane(null);
      setTutorNoticeA(null);
      setTutorNoticeB(null);
      resetSpeedDemoStageToTop(targetStageRef.current);
      setStepIndex(0);
      setIsPlaying(true);
    }, 9000);
  }, [clearReplayFallbackTimer, sendCommand]);

  useEffect(() => {
    resetSpeedDemoStageToTop(targetStageRef.current);
  }, []);

  useEffect(() => () => {
    clearReplayFallbackTimer();
  }, [clearReplayFallbackTimer]);

  useEffect(() => {
    if (!effectiveAutoPlay || autoPlayStartedRef.current) return;

    autoPlayStartedRef.current = true;
    setReplayVisible(false);
    setStepIndex(0);
    setIsPlaying(true);
  }, [effectiveAutoPlay]);

  useEffect(() => {
    if (mobileBurgerRushShell) {
      setTutorBlocking(false);
      setTutorStackCards([]);
      setActiveTutorLane(null);
      setTutorNoticeA(null);
      setTutorNoticeB(null);
      return;
    }

    let cancelled = false;

    const runOpeningTutorCards = async () => {
      setTutorBlocking(true);
      await wait(DEMO_TUTOR_INITIAL_DELAY_MS);
      if (cancelled) return;

      let nextLane: SmartBarFlashCardLaneName = "a";
      let activeCascadeGroup: string | null = null;

      for (let index = 0; index < openingTutorCards.length; index += 1) {
        const card = openingTutorCards[index];
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

      if (replayStartPendingRef.current) {
        replayStartPendingRef.current = false;
        clearReplayFallbackTimer();
        resetSpeedDemoStageToTop(targetStageRef.current);
        setStepIndex(0);
        setIsPlaying(true);
      }
    };

    void runOpeningTutorCards();

    return () => {
      cancelled = true;
    };
  }, [clearReplayFallbackTimer, introRunId, mobileBurgerRushShell, openingTutorCards]);

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
        const title = isTextCard ? card : card.title;
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
    [],
  );

  const showPointerClick = useCallback(
    async (
      command: Extract<SmartBarSpeedCommand, { kind: "pointerClick" }>,
      cancelled: () => boolean,
    ) => {
      const stage = targetStageRef.current;
      const mobileNextMovePointer = speedDemoIsMobileNextMovePointer(command);

      if (mobileNextMovePointer) {
        await wait(MOBILE_NEXT_MOVE_POINTER_EXTRA_WAIT_MS);
        if (cancelled()) return;
      }

      const target = await lockSpeedDemoPointerTarget(stage, command, cancelled);

      if (cancelled() || !target) return;

      await waitForSpeedDemoStableRect(target);
      if (cancelled() || !speedDemoTargetIsReady(stage, target)) return;

      const pointerId = fakePointerIdRef.current + 1;
      fakePointerIdRef.current = pointerId;

      setFakePointer(
        makeSmartBarFakePointerState(target, {
          id: pointerId,
          label: command.label,
          anchorX: command.anchorX ?? 0.5,
          anchorY: speedDemoPointerAnchorY(target, command),
          offsetX: command.offsetX,
          offsetY: speedDemoPointerOffsetY(target, command),
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

      await wait(
        mobileNextMovePointer
          ? Math.max(command.pulseMs ?? 0, MOBILE_NEXT_MOVE_POINTER_PULSE_MS)
          : command.pulseMs ?? SMARTBAR_FAKE_POINTER_PULSE_MS,
      );
      if (cancelled()) return;

      if (command.click) {
        target.click();
        await wait(80);
        if (cancelled()) return;
      }

      setFakePointer((current) => (current?.id === pointerId ? null : current));
      await wait(command.exitMs ?? SMARTBAR_FAKE_POINTER_EXIT_MS);
    },
    [],
  );

  const typeIntoShell = useCallback(
    async (field: "primary" | "followup" | "chat", value: string, cancelled: () => boolean) => {
      const visibleField = field === "followup" && speedDemoIsPhoneViewport() ? "primary" : field;
      const type = visibleField === "primary" ? "setPrimary" : visibleField === "followup" ? "setFollowUp" : "setChatDraft";
      const delayMs = speedDemoTypeDelayMs();

      if (field === "primary") primaryDraftRef.current = value;
      if (field === "followup") followUpDraftRef.current = value;
      if (visibleField === "primary") primaryDraftRef.current = value;

      sendCommand({ type, value: "" });
      await wait(80);

      for (let index = 1; index <= value.length; index += 1) {
        if (cancelled()) return;
        sendCommand({ type, value: value.slice(0, index) });
        await wait(delayMs);
      }
    },
    [sendCommand],
  );

  const typeIntoElement = useCallback(
    async (targetSelector: string, value: string, cancelled: () => boolean, clearFirst = true) => {
      let target: HTMLInputElement | HTMLTextAreaElement | null = null;

      for (let attempt = 0; attempt < 16; attempt += 1) {
        target = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(targetSelector);
        if (target && speedDemoElementLooksVisible(target)) break;
        await wait(90);
        if (cancelled()) return;
      }

      if (!target) return;

      target.focus();
      if (clearFirst) {
        const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(target, "");
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        await wait(70);
      }

      const delayMs = speedDemoTypeDelayMs();

      for (let index = 1; index <= value.length; index += 1) {
        if (cancelled()) return;
        const nextValue = value.slice(0, index);
        const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(target, nextValue);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        await wait(delayMs);
      }
    },
    [],
  );

  const runCommand = useCallback(
    async (command: SmartBarSpeedCommand, cancelled: () => boolean) => {
      if (command.delayMs) await wait(command.delayMs);
      if (cancelled()) return;

      if (command.kind === "pause") return;
      if (command.kind === "typePrimary") return typeIntoShell("primary", command.value, cancelled);
      if (command.kind === "typeFollowUp") return typeIntoShell("followup", command.value, cancelled);
      if (command.kind === "typeInput") return typeIntoElement(command.targetSelector, command.value, cancelled, command.clearFirst ?? true);
      if (command.kind === "typeChat") return typeIntoShell("chat", command.value, cancelled);
      if (command.kind === "submitPrimary") {
        const submittedValue = command.value ?? primaryDraftRef.current;
        sendCommand({ type: "submitPrimary", value: submittedValue });
        await wait(speedDemoFixtureThinkingMsForQuery(submittedValue) + SCRIPTED_SUBMIT_SETTLE_BUFFER_MS);
        return;
      }
      if (command.kind === "submitFollowUp") {
        const submittedValue = command.value ?? followUpDraftRef.current;
        sendCommand({ type: "submitFollowUp", value: submittedValue });
        await wait(speedDemoFixtureThinkingMsForQuery(submittedValue) + SCRIPTED_SUBMIT_SETTLE_BUFFER_MS);
        return;
      }
      if (command.kind === "submitChat") {
        sendCommand({ type: "submitChat", value: command.value });
        return;
      }
      if (command.kind === "openBookingContext") {
        sendCommand({ type: "openBookingContext", field: command.field });
        if (command.settleMs) await wait(command.settleMs);
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
        const result = fixtureResult(command.value);
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
        if (command.settleMs) await wait(command.settleMs);
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
        const recentAutoReveal = lastAutoRevealTargetRef.current;
        if (recentAutoReveal?.targetId === command.targetId && Date.now() - recentAutoReveal.at < 2600) {
          await wait(command.delayMs ?? 0);
          return;
        }

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
            overlayDurationMs: command.overlayDurationMs ?? (speedDemoIsPhoneViewport() ? 3600 : 2800),
            scrollBehavior: speedDemoIsPhoneViewport() ? "smooth" : "auto",
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
    [sendCommand, showPointerClick, showScriptCards, typeIntoElement, typeIntoShell],
  );

  useEffect(() => {
    if (mobileBurgerRushShell) return;
    if (stepIndex < 0 || tutorBlocking || !isPlaying) return;

    let cancelled = false;
    const currentStep = demoSteps[stepIndex];
    if (!currentStep) return;

    const run = async () => {
      for (const command of currentStep.commands) {
        if (cancelled) return;
        await runCommand(command, () => cancelled);
      }

      if (!cancelled) {
        await wait(650);
        if (cancelled) return;
        if (stepIndex < demoSteps.length - 1) {
          setStepIndex((index) => Math.min(index + 1, demoSteps.length - 1));
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
  }, [demoSteps, isPlaying, mobileBurgerRushShell, runCommand, sendCommand, stepIndex, tutorBlocking]);

  const beforeResultReveal = async (result: TourBarShellResult) => {
    const targetId = speedDemoResultTarget(result);
    if (!targetId) {
      await wait(180);
      return;
    }

    const stage = targetStageRef.current;
    const stageTarget = stage ? await scrollSpeedDemoStageToTarget(stage, targetId) : null;
    lastAutoRevealTargetRef.current = { targetId, at: Date.now() };

    await smartbarFocusTarget(
      {
        pageId: "smartbar-speed-demo",
        targetId,
        label: result.label || result.title,
      },
      {
        initialDelayMs: 40,
        attempts: 10,
        overlayDurationMs: speedDemoIsPhoneViewport() ? 3200 : 2200,
        scrollBehavior: speedDemoIsPhoneViewport() ? "smooth" : "auto",
        skipPlacementScroll: Boolean(stageTarget),
      },
    );

    await wait(180);
  };

  const onPrimarySubmit = async (query: string, _context: TourBarShellTurnContext) => {
    const result = fixtureResult(query);
    await wait(speedDemoFixtureThinkingMs(result, query));
    return result;
  };

  const onFollowUpSubmit = async (query: string, _context: TourBarShellTurnContext) => {
    const result = fixtureResult(query);
    await wait(speedDemoFixtureThinkingMs(result, query));
    return result;
  };

  const currentStep = stepIndex >= 0 ? demoSteps[stepIndex] : null;
  const defaultSurface = variant === "burgerRushOnly" ? "ordering" : "info";
  const toolbarSurface = currentStep?.surface || defaultSurface;
  const isFinaleSurface = toolbarSurface === "finale";
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

  const smartBarNode = mobileBurgerRushShell ? null : (
    <TourBarShell
              appearance="light"
              primaryPlaceholder="Ask in plain English..."
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
                autoStartMessage: "Context received — connecting consultant.",
                autoStartConsultantMessage: "Hi there — You’re interested in Copilots?",
                replyThinkingMessage: "Thinking...",
                replyConfirmationMessage: "Great, lets set up a chat!",
              }}
              demoCommand={demoCommand}
              onPrimarySubmit={onPrimarySubmit}
              onFollowUpSubmit={onFollowUpSubmit}
              beforeResultReveal={beforeResultReveal}
              renderResultExtras={renderSpeedExtras}
              renderMobileControls={renderMobileSpeedControls}
              buildThreadMessage={(result) => [result.title, result.body].filter(Boolean).join("\n")}
            />
  );


  if (mobileBurgerRushShell) {
    return <BurgerRushMobileExperience />;
  }

  if (replayVisible) {
    return <SmartBarDemoReplayScreen onReplay={restartDemo} />;
  }

  return (
    <main className="relative h-[100svh] min-h-[100svh] overflow-hidden overscroll-none bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_52%,_#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

      <SmartBarFlashCardRail className="!top-[45%] sm:!top-1/2">
        <SmartBarFlashCardStack cards={tutorStackCards} mode={activeTutorStackMode} />
        <SmartBarFlashCardLane active={activeTutorLane === "a"}>
          <SmartBarFlashCard notice={tutorNoticeA} />
        </SmartBarFlashCardLane>
        <SmartBarFlashCardLane active={activeTutorLane === "b"}>
          <SmartBarFlashCard notice={tutorNoticeB} />
        </SmartBarFlashCardLane>
      </SmartBarFlashCardRail>

      <SmartBarFakePointerOverlay pointer={fakePointer} />

      <div className="relative z-[10070] px-4 pt-4 sm:px-6">
        {isFinaleSurface ? (
          <div className="mx-auto flex max-w-7xl justify-end">
            <div className="relative z-[10080] flex h-12 w-12 shrink-0 items-center justify-center sm:h-9 sm:w-9">
              {smartBarNode}
            </div>
          </div>
        ) : (
          <SmartBarDemoToolbarFrame surface={toolbarSurface} smartBarNode={smartBarNode} />
        )}
      </div>

      <div
        key={toolbarSurface}
        ref={targetStageRef}
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface={toolbarSurface}
        className={isFinaleSurface
          ? "relative z-10 h-[calc(100svh-106px)] overflow-hidden overscroll-none pb-32 pt-2"
          : mobileBurgerRushShell
            ? "relative z-10 h-[calc(100svh-106px)] overflow-y-auto overscroll-none pb-32 pt-2 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]"
            : "relative z-10 h-[calc(100svh-106px)] overflow-y-auto overscroll-contain pb-32 pt-2 [scrollbar-gutter:stable]"
        }
      >
        <SmartBarSpeedTargetWall surface={toolbarSurface} />
      </div>


      {!mobileBurgerRushShell && <SmartBarDemoScrubber
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
      />}
    </main>
  );
}

