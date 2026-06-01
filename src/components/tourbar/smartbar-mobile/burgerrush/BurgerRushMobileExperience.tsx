import { useCallback, useEffect, useRef } from "react";
import type { CarryoutOrder } from "../../TourBarOrdering";
import SmartBarMobileShell, {
  type SmartBarMobileOrderLine,
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
  if (typeof document === "undefined") return 24;

  const header = document.querySelector<HTMLElement>("#burger-rush-app header");
  const headerBottom = header?.getBoundingClientRect().bottom ?? 0;

  // Phone navigation should park the target at the top of the usable content
  // area, not centered like desktop spotlighting. Respect the sticky site header
  // so the focused card is not hidden underneath it.
  return Math.max(18, Math.min(142, headerBottom + 10));
}

function smartBarMobileScrollTargetNearTop(target: HTMLElement) {
  if (typeof window === "undefined") return 24;

  const anchorY = smartBarMobileTopAnchorY();
  const targetTop = window.scrollY + target.getBoundingClientRect().top;
  const nextTop = Math.max(0, targetTop - anchorY);

  window.scrollTo({ top: nextTop, left: 0, behavior: "smooth" });
  return anchorY;
}




export default function BurgerRushMobileExperience() {
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
      }, 2100);
    }, 620);
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
  }, []);

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

    if (!optimisticCarryoutOrder) return optimisticResult;

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
  }, []);


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

    if (!nextLines.length || !optimisticCarryoutOrder) return optimisticResult;

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
  }, []);


  const handleResetCart = useCallback(() => {
    mobileCarryoutOrderRef.current = null;
    mobileOrderLinesRef.current = [];
    mobileEstimatedTotalRef.current = "—";
  }, []);

  return (
    <main
      data-smartbar-mobile-separated="true"
      className="relative min-h-[100svh] overflow-x-hidden text-slate-950"
    >
      <BurgerRushMobileProductSurface />
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
