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
  smartBarMobileResultFromGuideAi,
} from "./burgerRushMobileGuideAdapter";

function BurgerRushMobileProductSurface() {
  const menuRows = [
    { title: "Classic Burger", meta: "Burgers · from $5.49" },
    { title: "Chicken Nuggets", meta: "6, 10, or 20 piece" },
    { title: "Fries & Sides", meta: "Small · Medium · Large" },
    { title: "Sprite, Coke, Shakes", meta: "Drinks & desserts" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_42%,#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute -left-24 top-[-12%] h-64 w-64 rounded-full bg-orange-300/42 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-[22%] h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative z-[1] flex h-full flex-col px-5 pb-[180px] pt-5">
        <header className="rounded-[30px] border border-orange-200/80 bg-white/82 p-4 shadow-[0_20px_48px_rgba(154,52,18,0.16)] ring-1 ring-white/80 backdrop-blur-xl">
          <div className="inline-flex rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            BurgerRush Mobile Surface
          </div>
          <h1 className="mt-3 text-[28px] font-black leading-[0.95] tracking-[-0.04em] text-slate-950">
            Say the order.
            <br />
            SmartBar builds the cart.
          </h1>
          <p className="mt-3 max-w-[300px] text-sm font-semibold leading-5 text-slate-600">
            This is the separated phone surface. The speed-demo wall, scrubber, pointer, toolbar, and flashcard rail are not mounted here.
          </p>
        </header>

        <section className="mt-4 grid gap-3">
          {menuRows.map((row) => (
            <div
              key={row.title}
              className="rounded-[24px] border border-slate-950/8 bg-white/76 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur-xl"
            >
              <div className="text-sm font-black tracking-[-0.02em] text-slate-950">{row.title}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{row.meta}</div>
            </div>
          ))}
        </section>

        <div className="mt-auto rounded-[28px] border border-slate-950/8 bg-slate-950/88 p-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200">Try it</div>
          <div className="mt-2 text-sm font-bold leading-5 text-white/86">
            “burger, fries, and large Sprite”
            <br />
            “add a sundae”
          </div>
        </div>
      </div>
    </div>
  );
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

  const handleApplyLineChoice = useCallback((line: SmartBarMobileOrderLine, value: string) => {
    const previousEstimatedTotal = mobileEstimatedTotalRef.current;
    const nextLines = smartBarMobileApplyChoiceToVisibleLines(
      mobileOrderLinesRef.current,
      line,
      value,
    );

    mobileOrderLinesRef.current = nextLines;
    mobileEstimatedTotalRef.current = previousEstimatedTotal && previousEstimatedTotal !== "—"
      ? previousEstimatedTotal
      : smartBarMobileEstimatedTotalFromLines(nextLines);
    mobileCarryoutOrderRef.current = smartBarMobileApplyChoiceToCarryoutOrder(
      mobileCarryoutOrderRef.current,
      line,
      value,
    );

    return {
      lines: nextLines,
      estimatedTotal: mobileEstimatedTotalRef.current,
    };
  }, []);


  const handleRemoveLine = useCallback((line: SmartBarMobileOrderLine) => {
    const nextLines = smartBarMobileRemoveVisibleLine(mobileOrderLinesRef.current, line);
    const nextEstimatedTotal = nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "—";

    mobileOrderLinesRef.current = nextLines;
    mobileEstimatedTotalRef.current = nextEstimatedTotal;
    mobileCarryoutOrderRef.current = smartBarMobileRemoveLineFromCarryoutOrder(
      mobileCarryoutOrderRef.current,
      line,
    );

    return {
      lines: nextLines,
      estimatedTotal: nextEstimatedTotal,
    };
  }, []);

  const handleResetCart = useCallback(() => {
    mobileCarryoutOrderRef.current = null;
    mobileOrderLinesRef.current = [];
    mobileEstimatedTotalRef.current = "—";
  }, []);

  return (
    <main
      data-smartbar-mobile-separated="true"
      className="relative h-[100svh] min-h-[100svh] overflow-hidden overscroll-none text-slate-950"
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
