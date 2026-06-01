import { useCallback, useRef } from "react";
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




export default function BurgerRushMobileExperience() {
  const mobileCarryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const mobileOrderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const mobileEstimatedTotalRef = useRef("—");

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
        onResetCart={handleResetCart}
      />
    </main>
  );
}
