import { useCallback, useEffect, useRef } from "react";
import type { CarryoutOrder } from "../../TourBarOrdering";
import SmartBarMobileShell, {
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../SmartBarMobileShell";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "../../smartbarFocusController";
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

function BurgerRushMobileProductSurface({ hideMobileBrowseControls = false }: { hideMobileBrowseControls?: boolean }) {
  return (
    <BurgerRushCarryoutSite
      showTourBarOrdering={false}
      hideMobileBrowseControls={hideMobileBrowseControls}
    />
  );
}

// Mobile navigation speed controls. Tune these first for demo pacing.



type BurgerRushMobileExperienceProps = {
  demoFixtureMode?: boolean;
};

function smartBarMobileDemoFixtureLine(
  line: SmartBarMobileOrderLine,
): SmartBarMobileOrderLine {
  return line;
}

function smartBarMobileDemoFixtureReadyOrderResult(): SmartBarMobileOrderResult {
  return {
    lines: [
      smartBarMobileDemoFixtureLine({
        id: "fixture-double-cheeseburger-combo",
        cartLineKey: "fixture-double-cheeseburger-combo",
        targetId: "combo-double-stack",
        sourceItemId: "combo-double-stack",
        title: "Double cheeseburger combo",
        status: "ready",
        helper: "Matched and ready",
        price: "$11.99",
        details: ["Large fries", "Large Diet Coke", "No onions"],
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-apple-pie",
        cartLineKey: "fixture-apple-pie",
        targetId: "dessert-apple-pie",
        sourceItemId: "dessert-apple-pie",
        title: "Apple pie",
        status: "ready",
        helper: "Matched and ready",
        price: "$2.49",
        details: ["Warm"],
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-large-diet-coke",
        cartLineKey: "fixture-large-diet-coke",
        targetId: "drink-soda",
        sourceItemId: "drink-soda",
        title: "Large Diet Coke",
        status: "ready",
        helper: "Matched and ready",
        price: "$2.19",
        details: ["Large", "Diet Coke"],
      }),
    ],
    estimatedSubtotal: "$16.67",
    estimatedTax: "$1.33",
    estimatedTotal: "$18.00",
  };
}

function smartBarMobileDemoFixtureRequiredChoiceResult(): SmartBarMobileOrderResult {
  return {
    lines: [
      smartBarMobileDemoFixtureLine({
        id: "fixture-required-cheeseburger",
        cartLineKey: "fixture-required-cheeseburger",
        targetId: "item-cheeseburger",
        sourceItemId: "item-cheeseburger",
        title: "Cheeseburger",
        status: "pending",
        helper: "Choose burger setup",
        price: "$5.49",
        details: ["Choice needed"],
        options: ["No onions", "No pickles", "Extra sauce"],
        optionSelectionMode: "single",
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-required-fries",
        cartLineKey: "fixture-required-fries",
        targetId: "side-fries",
        sourceItemId: "side-fries",
        title: "Fries",
        status: "pending",
        helper: "Choose size",
        price: "$3.49",
        details: ["Size needed"],
        options: ["Small", "Medium", "Large"],
        optionSelectionMode: "single",
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-required-milkshake",
        cartLineKey: "fixture-required-milkshake",
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
    ],
    estimatedSubtotal: "$13.27",
    estimatedTax: "$1.06",
    estimatedTotal: "$14.33",
  };
}

function smartBarMobileDemoFixtureOptionalExtrasResult(): SmartBarMobileOrderResult {
  return {
    lines: [
      smartBarMobileDemoFixtureLine({
        id: "fixture-optional-cheeseburger",
        cartLineKey: "fixture-optional-cheeseburger",
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
    ],
    estimatedSubtotal: "$5.49",
    estimatedTax: "$0.44",
    estimatedTotal: "$5.93",
  };
}

function smartBarMobileDemoFixtureUnmatchedItemResult(): SmartBarMobileOrderResult {
  return {
    lines: [
      smartBarMobileDemoFixtureLine({
        id: "fixture-unmatched-cheeseburger",
        cartLineKey: "fixture-unmatched-cheeseburger",
        targetId: "item-cheeseburger",
        sourceItemId: "item-cheeseburger",
        title: "Cheeseburger",
        status: "ready",
        helper: "Matched and ready",
        price: "$5.49",
        details: ["No onions"],
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-unmatched-fries",
        cartLineKey: "fixture-unmatched-fries",
        targetId: "side-fries",
        sourceItemId: "side-fries",
        title: "Large fries",
        status: "ready",
        helper: "Matched and ready",
        price: "$3.49",
        details: ["Large"],
      }),
      smartBarMobileDemoFixtureLine({
        id: "fixture-lava-tacos",
        cartLineKey: "fixture-lava-tacos",
        title: "lava tacos",
        status: "unknown",
        helper: "Not on the BurgerRush menu",
        price: "—",
        details: [],
        retryPrompt: "Re-enter unrecognizd item.",
      }),
    ],
    estimatedSubtotal: "$8.98",
    estimatedTax: "$0.72",
    estimatedTotal: "$9.70",
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

function smartBarMobileDemoFixtureText(query: string) {
  return query.replace(/\s+/g, " ").trim().toLowerCase();
}

function smartBarMobileDemoFixtureResult(
  query: string,
  meta?: SmartBarMobileSubmitMeta,
): SmartBarMobileOrderResult {
  if (meta?.intent === "replace_unknown") {
    return smartBarMobileDemoFixtureRetryResult(query);
  }

  const text = smartBarMobileDemoFixtureText(query);

  if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez")) {
    return smartBarMobileDemoFixtureReadyOrderResult();
  }

  if (text.includes("lava tacos")) {
    return smartBarMobileDemoFixtureUnmatchedItemResult();
  }

  if (text.includes("show burger options") || text.includes("optional extras")) {
    return smartBarMobileDemoFixtureOptionalExtrasResult();
  }

  if (text.includes("cheeseburger") && text.includes("fries") && text.includes("milkshake")) {
    return smartBarMobileDemoFixtureRequiredChoiceResult();
  }

  return smartBarMobileDemoFixtureReadyOrderResult();
}


export default function BurgerRushMobileExperience({ demoFixtureMode = false }: BurgerRushMobileExperienceProps = {}) {
  const mobileCarryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const mobileOrderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const mobileEstimatedTotalRef = useRef("—");
  const mobileFocusSnapshotRef = useRef<any | null>(null);
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
    clearMobileFocusTarget();
    clearSmartBarFocusOverlay();

    const targetId = String(line.targetId || "").trim();
    if (!targetId) return;

    void smartbarFocusTarget(
      {
        targetId,
        label: line.demoDisplayTitle || line.title,
      },
      {
        initialDelayMs: 80,
        attempts: 26,
        overlayDurationMs: 3600,
        dispatchLegacyEvent: false,
      },
    );
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
    clearMobileFocusTarget();
    clearSmartBarFocusOverlay();
    mobileCarryoutOrderRef.current = null;
    mobileOrderLinesRef.current = [];
    mobileEstimatedTotalRef.current = "—";
  }, []);

  return (
    <main
      data-smartbar-mobile-separated="true"
      className="relative min-h-[100dvh] overflow-x-hidden text-slate-950"
    >
      <BurgerRushMobileProductSurface hideMobileBrowseControls={demoFixtureMode} />
      <div aria-hidden="true" className="h-[420px] sm:hidden" />
      <SmartBarMobileShell
        mode="overlay"
        demoTransitionShield={demoFixtureMode}
        onSubmitPrompt={handleSubmitPrompt}
        onApplyLineChoice={handleApplyLineChoice}
        onRemoveLine={handleRemoveLine}
        onNavigateToLine={handleNavigateToLine}
        onResetCart={handleResetCart}
      />
    </main>
  );
}


