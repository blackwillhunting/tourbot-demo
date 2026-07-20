import { useCallback, useEffect, useMemo, useRef } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
  type SmartBarMobileApplyChoiceMeta,
} from "../SmartBarMobileShell";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "../../smartbarFocusController";
import {
  smartBarMobileApplyChoiceToVisibleLines,
  smartBarMobileEstimatedTotalFromLines,
  smartBarMobileFilterReplacementLine,
  smartBarMobileMergeOrderResults,
  smartBarMobileQueryShouldUseExistingCart,
  smartBarMobileRemoveVisibleLine,
} from "./burgerRushMobileCartReducer";
import {
  smartBarMobileApiErrorResult,
  smartBarMobileDirectResultFromGuideAi,
} from "./burgerRushMobileGuideAdapter";
import { getStoredSmartBarVendorContext } from "../SmartBarVendorContext";
import { BurgerRushCarryoutSite } from "../../../../App-Carryout";

function BurgerRushMobileProductSurface({ hideMobileBrowseControls = false }: { hideMobileBrowseControls?: boolean }) {
  return (
    <BurgerRushCarryoutSite
      showTourBarOrdering={false}
      hideMobileBrowseControls={hideMobileBrowseControls}
    />
  );
}

function smartBarMobileRetryKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*\d+\s*[×x]\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function smartBarMobileRetryLineInstanceKey(line: SmartBarMobileOrderLine) {
  return smartBarMobileRetryKey(String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || ""));
}

function smartBarMobileRetryLinesAreSameInstance(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftKey = smartBarMobileRetryLineInstanceKey(left);
  const rightKey = smartBarMobileRetryLineInstanceKey(right);

  if (leftKey && rightKey) return leftKey === rightKey;

  if (left.sourceLineIndex !== undefined && right.sourceLineIndex !== undefined) {
    return left.sourceLineIndex === right.sourceLineIndex;
  }

  return Boolean(left.id && right.id && left.id === right.id);
}

function smartBarMobileRetryFallbackLine(query: string, meta?: SmartBarMobileSubmitMeta): SmartBarMobileOrderLine {
  const title = query.trim() || meta?.replaceLineTitle || "Requested item";
  const key = smartBarMobileRetryKey(title) || smartBarMobileRetryKey(meta?.replaceLineId || "") || "item";

  return {
    id: meta?.replaceLineId || `retry-unmatched-${key}`,
    cartLineKey: meta?.replaceLineId || `retry-unmatched-${key}`,
    title,
    status: "unknown",
    helper: "Not on the BurgerRush menu",
    price: "—",
    details: [],
    retryPrompt: "Try the item again with a BurgerRush menu name.",
  };
}

function smartBarMobileEnsureRetryReplacementLine(
  lines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
  query: string,
  meta?: SmartBarMobileSubmitMeta,
) {
  if (meta?.intent !== "replace_unknown") return lines;

  const hasReplacementCandidate = lines.some((line) => (
    !previousLines.some((previousLine) => smartBarMobileRetryLinesAreSameInstance(previousLine, line))
  ));

  if (hasReplacementCandidate) return lines;

  return [...lines, smartBarMobileRetryFallbackLine(query, meta)];
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
  const activeVendorContext = useMemo(() => getStoredSmartBarVendorContext(), []);
  const mobileDirectCartRef = useRef<SmartBarMobileOrderResult | null>(null);
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
    const hasExistingCart = Boolean(mobileDirectCartRef.current || previousLines.length > 0);
    const shouldUseExistingCart = smartBarMobileQueryShouldUseExistingCart(query, hasExistingCart);
    const currentCart = shouldUseExistingCart ? mobileDirectCartRef.current : null;
    const promptQuery = replacingUnknown && meta?.replaceLineTitle
      ? `Replace the cart line "${meta.replaceLineTitle}" with: ${query}`
      : query;

    if (demoFixtureMode) {
      const fixtureResult = smartBarMobileDemoFixtureResult(query, meta);
      const resultForMerge = {
        ...fixtureResult,
        lines: smartBarMobileEnsureRetryReplacementLine(
          smartBarMobileFilterReplacementLine(fixtureResult.lines, meta),
          previousLines,
          query,
          meta,
        ),
      };
      const mergedResultBase = smartBarMobileMergeOrderResults(
        resultForMerge,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );
      const mergedResult = replacingUnknown
        ? { ...mergedResultBase, preserveResultLinesOnRetry: true }
        : mergedResultBase;

      mobileOrderLinesRef.current = mergedResult.lines;
      mobileEstimatedTotalRef.current = mergedResult.estimatedTotal || previousEstimatedTotal;
      mobileDirectCartRef.current = null;
      return mergedResult;
    }

    try {
      const result = await smartBarMobileDirectResultFromGuideAi(promptQuery, currentCart, activeVendorContext);

      // AI returned the complete replacement cart. Store and return that exact object.
      mobileDirectCartRef.current = result;
      mobileOrderLinesRef.current = result.lines;
      mobileEstimatedTotalRef.current = result.estimatedTotal || "—";
      return result;
    } catch (error) {
      console.warn("SmartBar AI direct cart failed", error);
      if (currentCart) return currentCart;
      return smartBarMobileApiErrorResult(promptQuery, error);
    }
  }, [activeVendorContext, demoFixtureMode]);

  const handleApplyLineChoice = useCallback(async (
    line: SmartBarMobileOrderLine,
    value: string,
    meta?: SmartBarMobileApplyChoiceMeta,
  ) => {
    if (demoFixtureMode) {
      const nextLines = smartBarMobileApplyChoiceToVisibleLines(
        mobileOrderLinesRef.current,
        line,
        value,
        meta?.selected ?? true,
        null,
      );
      const nextResult: SmartBarMobileOrderResult = {
        lines: nextLines,
        estimatedTotal: smartBarMobileEstimatedTotalFromLines(nextLines),
      };
      mobileOrderLinesRef.current = nextLines;
      mobileEstimatedTotalRef.current = nextResult.estimatedTotal || "—";
      return nextResult;
    }

    const currentCart = mobileDirectCartRef.current;
    if (!currentCart) {
      return {
        lines: mobileOrderLinesRef.current,
        estimatedTotal: mobileEstimatedTotalRef.current,
      };
    }

    const selected = meta?.selected !== false;
    const action = selected ? "Select" : "Deselect";
    const request = `${action} "${value}" for the cart line "${line.title}". Return the complete backend-owned replacement card JSON.`;
    const result = await smartBarMobileDirectResultFromGuideAi(request, currentCart, activeVendorContext, {
      type: selected ? "select_option" : "deselect_option",
      lineId: meta?.lineId || line.id,
      cartLineKey: meta?.cartLineKey || line.cartLineKey,
      sourceLineItemId: meta?.sourceLineItemId || line.sourceLineItemId,
      sourceItemId: meta?.sourceItemId || line.sourceItemId,
      lineTitle: line.title,
      groupId: meta?.groupId,
      optionId: meta?.optionId,
      optionLabel: meta?.optionLabel || value,
      selected,
    });

    mobileDirectCartRef.current = result;
    mobileOrderLinesRef.current = result.lines;
    mobileEstimatedTotalRef.current = result.estimatedTotal || mobileEstimatedTotalRef.current;
    return result;
  }, [activeVendorContext, demoFixtureMode]);

  const handleRemoveLine = useCallback(async (line: SmartBarMobileOrderLine) => {
    if (demoFixtureMode) {
      const nextLines = smartBarMobileRemoveVisibleLine(mobileOrderLinesRef.current, line);
      const nextResult: SmartBarMobileOrderResult = {
        lines: nextLines,
        estimatedTotal: nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "—",
      };
      mobileOrderLinesRef.current = nextLines;
      mobileEstimatedTotalRef.current = nextResult.estimatedTotal || "—";
      return nextResult;
    }

    const currentCart = mobileDirectCartRef.current;
    if (!currentCart) {
      const nextLines = smartBarMobileRemoveVisibleLine(mobileOrderLinesRef.current, line);
      return {
        lines: nextLines,
        estimatedTotal: nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "—",
      };
    }

    const request = `Remove the cart line "${line.title}" with line id "${line.id}". Return the complete replacement cart JSON.`;
    const result = await smartBarMobileDirectResultFromGuideAi(request, currentCart, activeVendorContext);

    mobileDirectCartRef.current = result;
    mobileOrderLinesRef.current = result.lines;
    mobileEstimatedTotalRef.current = result.estimatedTotal || "—";
    return result;
  }, [activeVendorContext, demoFixtureMode]);

  const handleResetCart = useCallback(() => {
    clearMobileFocusTarget();
    clearSmartBarFocusOverlay();
    mobileDirectCartRef.current = null;
    mobileOrderLinesRef.current = [];
    mobileEstimatedTotalRef.current = "—";
  }, [clearMobileFocusTarget]);

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
        introCallout={{
          title: "Type or say your order",
        }}
        onSubmitPrompt={handleSubmitPrompt}
        onApplyLineChoice={handleApplyLineChoice}
        onRemoveLine={handleRemoveLine}
        onNavigateToLine={handleNavigateToLine}
        onResetCart={handleResetCart}
      />
    </main>
  );
}

