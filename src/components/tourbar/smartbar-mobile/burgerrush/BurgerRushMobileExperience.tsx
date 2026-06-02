import { useCallback, useEffect, useRef } from "react";
import type { CarryoutOrder } from "../../TourBarOrdering";
import SmartBarMobileShell, {
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../SmartBarMobileShell";
import {
  smartBarMobileApplyChoiceToCarryoutOrder,
  smartBarMobileApplyChoiceToVisibleLines,
  smartBarMobileEstimatedTotalFromLines,
  smartBarMobileFilterReplacementLine,
  smartBarMobileMergeCarryoutOrders,
  smartBarMobileMergeOrderResults,
  smartBarMobileQueryShouldUseExistingCart,
  smartBarMobileRemoveLineFromCarryoutOrder,
  smartBarMobileRemoveReplacementFromCarryoutOrder,
  smartBarMobileRemoveVisibleLine,
} from "./burgerRushMobileCartReducer";
import {
  smartBarMobileApiErrorResult,
  smartBarMobileRepriceCartFromGuideAi,
  smartBarMobileResultFromGuideAi,
} from "./burgerRushMobileGuideAdapter";
import { BurgerRushCarryoutSite } from "../../../../App-Carryout";

function BurgerRushMobileProductSurface() {
  return <BurgerRushCarryoutSite showTourBarOrdering={false} />;
}

// Mobile navigation speed controls. Tune these first for demo pacing.
const SMARTBAR_MOBILE_NAV_SCROLL_MS = 1200;
const SMARTBAR_MOBILE_NAV_FOCUS_SETTLE_MS = 140;
const SMARTBAR_MOBILE_NAV_FOCUS_HOLD_MS = 2100;

function smartBarMobileNavEase(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function smartBarMobileAnimateWindowScrollTo(top: number, durationMs: number) {
  if (typeof window === "undefined") return;

  const startTop = window.scrollY;
  const distance = top - startTop;

  if (Math.abs(distance) < 2 || durationMs <= 0) {
    window.scrollTo({ top, left: 0, behavior: "auto" });
    return;
  }

  const startedAt = performance.now();

  const step = (now: number) => {
    const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));
    const eased = smartBarMobileNavEase(progress);
    window.scrollTo({ top: startTop + distance * eased, left: 0, behavior: "auto" });

    if (progress < 1) {
      window.requestAnimationFrame(step);
      return;
    }

    window.scrollTo({ top, left: 0, behavior: "auto" });
  };

  window.requestAnimationFrame(step);
}

type SmartBarMobileFocusSnapshot = {
  element: HTMLElement;
  outline: string;
  outlineOffset: string;
  boxShadow: string;
  position: string;
  zIndex: string;
  transition: string;
  scrollMarginTop: string;
};

function smartBarMobileCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function smartBarMobileTargetIdForLine(line: SmartBarMobileOrderLine) {
  return String(line.targetId || line.sourceItemId || "").trim();
}

function smartBarMobileFindPageTarget(line: SmartBarMobileOrderLine) {
  if (typeof document === "undefined") return null;

  const targetId = smartBarMobileTargetIdForLine(line);
  if (!targetId) return null;

  const escaped = smartBarMobileCssEscape(targetId);
  return document.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`);
}

function smartBarMobileTopAnchorY() {
  // The scripted mobile demo should make the clicked product feel like a true
  // page navigation: target at the top of the viewport, then highlight.
  // Keep only a tiny breathing gap instead of parking below the sticky header.
  return 8;
}

function smartBarMobileScrollTargetNearTop(target: HTMLElement) {
  if (typeof window === "undefined") return 24;

  const anchorY = smartBarMobileTopAnchorY();
  const targetTop = window.scrollY + target.getBoundingClientRect().top;
  const nextTop = Math.max(0, targetTop - anchorY);

  smartBarMobileAnimateWindowScrollTo(nextTop, SMARTBAR_MOBILE_NAV_SCROLL_MS);
  return anchorY;
}



type BurgerRushMobileExperienceProps = {
  demoFixtureMode?: boolean;
};

function smartBarMobileDemoFixtureLine(
  line: SmartBarMobileOrderLine,
): SmartBarMobileOrderLine {
  return line;
}

function smartBarMobileDemoFixtureInitialResult(): SmartBarMobileOrderResult {
  return {
    lines: [
      smartBarMobileDemoFixtureLine({
        id: "fixture-cheeseburger",
        cartLineKey: "fixture-cheeseburger",
        targetId: "item-cheeseburger",
        sourceItemId: "item-cheeseburger",
        title: "Cheeseburger",
        status: "options",
        helper: "Options available",
        price: "$5.49",
        details: ["No onions"],
        options: ["Bacon", "Extra sauce", "Pickles"],
        optionSelectionMode: "multi",
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-fries",
        cartLineKey: "fixture-fries",
        targetId: "side-fries",
        sourceItemId: "side-fries",
        title: "Large fries",
        status: "ready",
        helper: "Matched and ready",
        price: "$3.49",
        details: ["Large"],
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-milkshake",
        cartLineKey: "fixture-milkshake",
        targetId: "drink-milkshake",
        sourceItemId: "drink-milkshake",
        title: "Milkshake",
        status: "pending",
        helper: "Choose flavor",
        price: "$4.29",
        details: ["Flavor needed"],
        options: ["Vanilla", "Chocolate", "Strawberry"],
        optionSelectionMode: "single",
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-lava-tacos",
        cartLineKey: "fixture-lava-tacos",
        title: "lava tacos",
        status: "unknown",
        helper: "Not on the BurgerRush menu",
        price: "—",
        details: [],
        retryPrompt: "Re-enter the item so SmartBar can match it.",
      }),
    ],
    estimatedSubtotal: "$13.27",
    estimatedTax: "$1.09",
    estimatedTotal: "$14.36",
  };
}

function smartBarMobileDemoFixtureRetryResult(query: string): SmartBarMobileOrderResult {
  const text = query.replace(/\s+/g, " ").trim().toLowerCase();
  const isOnionRings = text.includes("ring");

  if (isOnionRings) {
    return {
      lines: [
        smartBarMobileDemoFixtureLine({
          id: "fixture-medium-onion-rings",
          cartLineKey: "fixture-medium-onion-rings",
          targetId: "side-onion-rings",
          sourceItemId: "side-onion-rings",
          title: "Medium onion rings",
          status: "ready",
          helper: "Re-entered and matched",
          price: "$3.99",
          details: ["Medium"],
        }),
      ],
      estimatedSubtotal: "$3.99",
      estimatedTax: "$0.33",
      estimatedTotal: "$4.32",
    };
  }

  return {
    lines: [
      smartBarMobileDemoFixtureLine({
        id: `fixture-retry-${text || "item"}`,
        cartLineKey: `fixture-retry-${text || "item"}`,
        title: query || "Replacement item",
        status: "unknown",
        helper: "Still could not match item",
        price: "—",
        details: query ? [query] : [],
        retryPrompt: "Try the item again with a BurgerRush menu name.",
      }),
    ],
    estimatedTotal: "—",
  };
}

function smartBarMobileDemoFixtureResult(
  query: string,
  meta?: SmartBarMobileSubmitMeta,
): SmartBarMobileOrderResult {
  if (meta?.intent === "replace_unknown") {
    return smartBarMobileDemoFixtureRetryResult(query);
  }

  return smartBarMobileDemoFixtureInitialResult();
}



export default function BurgerRushMobileExperience({ demoFixtureMode = false }: BurgerRushMobileExperienceProps = {}) {
  const mobileCarryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const mobileOrderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const mobileEstimatedTotalRef = useRef("—");
  const mobileFocusSnapshotRef = useRef<SmartBarMobileFocusSnapshot | null>(null);
  const mobileFocusTimerRef = useRef<number | null>(null);

  const clearMobileFocusTarget = useCallback(() => {
    if (mobileFocusTimerRef.current !== null) {
      window.clearTimeout(mobileFocusTimerRef.current);
      mobileFocusTimerRef.current = null;
    }

    const snapshot = mobileFocusSnapshotRef.current;
    if (!snapshot) return;

    snapshot.element.style.outline = snapshot.outline;
    snapshot.element.style.outlineOffset = snapshot.outlineOffset;
    snapshot.element.style.boxShadow = snapshot.boxShadow;
    snapshot.element.style.position = snapshot.position;
    snapshot.element.style.zIndex = snapshot.zIndex;
    snapshot.element.style.transition = snapshot.transition;
    snapshot.element.style.scrollMarginTop = snapshot.scrollMarginTop;
    mobileFocusSnapshotRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearMobileFocusTarget();
    };
  }, [clearMobileFocusTarget]);

  const handleNavigateToLine = useCallback((line: SmartBarMobileOrderLine) => {
    if (line.status === "unknown") return;

    const target = smartBarMobileFindPageTarget(line);
    if (!target) return;

    clearMobileFocusTarget();
    const anchorY = smartBarMobileScrollTargetNearTop(target);

    mobileFocusTimerRef.current = window.setTimeout(() => {
      mobileFocusTimerRef.current = null;

      const finalTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - anchorY);
      window.scrollTo({ top: finalTop, left: 0, behavior: "auto" });

      mobileFocusSnapshotRef.current = {
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
      target.style.scrollMarginTop = `${anchorY + 12}px`;
      target.style.transition = target.style.transition
        ? `${target.style.transition}, outline 180ms ease, box-shadow 180ms ease`
        : "outline 180ms ease, box-shadow 180ms ease";
      target.style.outline = "3px solid rgba(14,165,233,0.92)";
      target.style.outlineOffset = "4px";
      target.style.boxShadow = "0 0 0 7px rgba(14,165,233,0.18), 0 22px 50px rgba(2,6,23,0.28)";

      window.setTimeout(() => {
        if (mobileFocusSnapshotRef.current?.element === target) {
          clearMobileFocusTarget();
        }
      }, SMARTBAR_MOBILE_NAV_FOCUS_HOLD_MS);
    }, SMARTBAR_MOBILE_NAV_SCROLL_MS + SMARTBAR_MOBILE_NAV_FOCUS_SETTLE_MS);
  }, [clearMobileFocusTarget]);

  const handleSubmitPrompt = useCallback(async (query: string, meta?: SmartBarMobileSubmitMeta) => {
    const replacingUnknown = meta?.intent === "replace_unknown";
    const previousLines = replacingUnknown
      ? smartBarMobileFilterReplacementLine(mobileOrderLinesRef.current, meta)
      : mobileOrderLinesRef.current;
    const previousEstimatedTotal = mobileEstimatedTotalRef.current;
    const existingCarryoutOrder = replacingUnknown
      ? smartBarMobileRemoveReplacementFromCarryoutOrder(mobileCarryoutOrderRef.current, meta)
      : mobileCarryoutOrderRef.current;
    const hasExistingCart = Boolean(existingCarryoutOrder || previousLines.length > 0);
    const shouldUseExistingCart = smartBarMobileQueryShouldUseExistingCart(query, hasExistingCart);
    const carryoutOrderForPrompt = shouldUseExistingCart ? existingCarryoutOrder : null;
    const promptQuery = replacingUnknown && meta?.replaceLineTitle
      ? `replace ${meta.replaceLineTitle} with ${query}`
      : query;

    if (demoFixtureMode) {
      const fixtureResult = smartBarMobileDemoFixtureResult(query, meta);
      const resultForMerge = {
        ...fixtureResult,
        lines: smartBarMobileFilterReplacementLine(fixtureResult.lines, meta),
      };
      const mergedResult = smartBarMobileMergeOrderResults(
        resultForMerge,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );

      mobileOrderLinesRef.current = mergedResult.lines;
      mobileEstimatedTotalRef.current = mergedResult.estimatedTotal || previousEstimatedTotal;
      mobileCarryoutOrderRef.current = null;

      return mergedResult;
    }

    try {
      const result = await smartBarMobileResultFromGuideAi(promptQuery, carryoutOrderForPrompt);
      const resultForMerge = {
        ...result,
        lines: smartBarMobileFilterReplacementLine(result.lines, meta),
      };
      const mergedResult = smartBarMobileMergeOrderResults(
        resultForMerge,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );

      mobileOrderLinesRef.current = mergedResult.lines;
      mobileEstimatedTotalRef.current = mergedResult.estimatedTotal || previousEstimatedTotal;
      mobileCarryoutOrderRef.current = smartBarMobileMergeCarryoutOrders(
        carryoutOrderForPrompt,
        smartBarMobileRemoveReplacementFromCarryoutOrder(result.carryoutOrder ?? null, meta),
        shouldUseExistingCart,
      );

      return mergedResult;
    } catch (error) {
      console.warn("SmartBar mobile guide API failed", error);
      const errorResult = smartBarMobileApiErrorResult(promptQuery, error);
      const mergedErrorResult = smartBarMobileMergeOrderResults(
        errorResult,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );

      if (shouldUseExistingCart) {
        mobileOrderLinesRef.current = mergedErrorResult.lines;
        mobileEstimatedTotalRef.current = mergedErrorResult.estimatedTotal || previousEstimatedTotal;
      }

      return mergedErrorResult;
    }
  }, [demoFixtureMode]);

  const handleApplyLineChoice = useCallback(async (line: SmartBarMobileOrderLine, value: string) => {
    const previousEstimatedTotal = mobileEstimatedTotalRef.current;
    const nextLines = smartBarMobileApplyChoiceToVisibleLines(
      mobileOrderLinesRef.current,
      line,
      value,
    );
    const optimisticCarryoutOrder = smartBarMobileApplyChoiceToCarryoutOrder(
      mobileCarryoutOrderRef.current,
      line,
      value,
    );
    const optimisticEstimatedTotal = previousEstimatedTotal && previousEstimatedTotal !== "—"
      ? previousEstimatedTotal
      : smartBarMobileEstimatedTotalFromLines(nextLines);

    mobileOrderLinesRef.current = nextLines;
    mobileEstimatedTotalRef.current = optimisticEstimatedTotal;
    mobileCarryoutOrderRef.current = optimisticCarryoutOrder;

    const optimisticResult = {
      lines: nextLines,
      estimatedTotal: optimisticEstimatedTotal,
    };

    if (demoFixtureMode || !optimisticCarryoutOrder) return optimisticResult;

    try {
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `selected ${value} for ${line.title}`,
      );

      mobileOrderLinesRef.current = repricedResult.lines;
      mobileEstimatedTotalRef.current = repricedResult.estimatedTotal || optimisticEstimatedTotal;
      mobileCarryoutOrderRef.current = repricedResult.carryoutOrder ?? optimisticCarryoutOrder;

      return {
        ...repricedResult,
        estimatedTotal: repricedResult.estimatedTotal || optimisticEstimatedTotal,
      };
    } catch (error) {
      console.warn("SmartBar mobile reprice failed after choice", error);
      return optimisticResult;
    }
  }, [demoFixtureMode]);


  const handleRemoveLine = useCallback(async (line: SmartBarMobileOrderLine) => {
    const nextLines = smartBarMobileRemoveVisibleLine(mobileOrderLinesRef.current, line);
    const nextEstimatedTotal = nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "—";
    const optimisticCarryoutOrder = smartBarMobileRemoveLineFromCarryoutOrder(
      mobileCarryoutOrderRef.current,
      line,
    );

    mobileOrderLinesRef.current = nextLines;
    mobileEstimatedTotalRef.current = nextEstimatedTotal;
    mobileCarryoutOrderRef.current = optimisticCarryoutOrder;

    const optimisticResult = {
      lines: nextLines,
      estimatedTotal: nextEstimatedTotal,
    };

    if (demoFixtureMode || !nextLines.length || !optimisticCarryoutOrder) return optimisticResult;

    try {
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `removed ${line.title}`,
      );

      mobileOrderLinesRef.current = repricedResult.lines;
      mobileEstimatedTotalRef.current = repricedResult.estimatedTotal || nextEstimatedTotal;
      mobileCarryoutOrderRef.current = repricedResult.carryoutOrder ?? optimisticCarryoutOrder;

      return {
        ...repricedResult,
        estimatedTotal: repricedResult.estimatedTotal || nextEstimatedTotal,
      };
    } catch (error) {
      console.warn("SmartBar mobile reprice failed after remove", error);
      return optimisticResult;
    }
  }, [demoFixtureMode]);


  const handleResetCart = useCallback(() => {
    mobileCarryoutOrderRef.current = null;
    mobileOrderLinesRef.current = [];
    mobileEstimatedTotalRef.current = "—";
  }, []);

  return (
    <main
      data-smartbar-mobile-separated="true"
      className="relative min-h-[100dvh] overflow-x-hidden text-slate-950"
    >
      <BurgerRushMobileProductSurface />
      <div aria-hidden="true" className="h-[420px] sm:hidden" />
      <SmartBarMobileShell
        mode="overlay"
        onSubmitPrompt={handleSubmitPrompt}
        onApplyLineChoice={handleApplyLineChoice}
        onRemoveLine={handleRemoveLine}
        onNavigateToLine={handleNavigateToLine}
        onResetCart={handleResetCart}
      />
    </main>
  );
}

