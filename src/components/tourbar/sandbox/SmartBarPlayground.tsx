import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { CarryoutOrder } from "../TourBarOrdering";
import SmartBarMobileShell, {
  type SmartBarMobileApplyChoiceMeta,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../smartbar-mobile/SmartBarMobileShell";
import { normalizeSmartBarVendorContext, type SmartBarVendorContext } from "../smartbar-mobile/SmartBarVendorContext";
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
} from "../smartbar-mobile/burgerrush/burgerRushMobileCartReducer";
import {
  smartBarMobileApiErrorResult,
  smartBarMobileRepriceCartFromGuideAi,
  smartBarMobileResultFromGuideAi,
} from "../smartbar-mobile/burgerrush/burgerRushMobileGuideAdapter";
import SmartBarOrderBoardMock, { SmartBarOrderSheet, type SmartBarOrderBoardItem } from "../order-board/SmartBarOrderBoardMock";

const SMARTBAR_TICKET_CREATE_URL = "/api/smartbar-tickets/create";

type SmartBarTicketCreateResponse = {
  ok?: boolean;
  ticketId?: string;
  ticketNumber?: string;
  ticketDisplayId?: string;
  code?: string;
  message?: string;
};

function smartBarPlaygroundNumberFromCurrency(value: string | undefined) {
  const normalized = String(value || "").replace(/[^0-9.-]/g, "");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function smartBarPlaygroundScoringStatus(lines: SmartBarMobileOrderLine[]) {
  return lines.some((line) => line.status !== "ready") ? "needs_fix" : "ready";
}

async function createPersistentSmartBarTicket(
  result: SmartBarMobileOrderResult,
  rawOrder: string,
  vendorContext: SmartBarVendorContext,
): Promise<SmartBarTicketCreateResponse | null> {
  const lines = result.lines || [];

  const payload = {
    clientId: vendorContext.clientId,
    vendorId: vendorContext.vendorId,
    menuProfileId: vendorContext.menuProfileId,
    behaviorProfileId: vendorContext.behaviorProfileId,
    boardProfileId: vendorContext.boardProfileId,
    timezone: vendorContext.timezone,
    mode: "sandbox",
    customerText: rawOrder || "SmartBar order",
    scoringStatus: smartBarPlaygroundScoringStatus(lines),
    ticket: {
      items: lines.map((line) => ({
        title: line.demoDisplayTitle || line.title,
        quantity: 1,
        status: line.status,
        details: boardDetailsForLine(line) || [],
        price: line.price,
      })),
      totals: {
        estimatedTotal: smartBarPlaygroundNumberFromCurrency(result.estimatedTotal),
        estimatedTotalLabel: result.estimatedTotal || "",
      },
    },
  };

  const response = await fetch(SMARTBAR_TICKET_CREATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as SmartBarTicketCreateResponse | null;

  if (!response.ok || !json?.ok) {
    throw new Error(json?.message || json?.code || `SmartBar ticket create failed with HTTP ${response.status}`);
  }

  return json;
}

type SmartBarPlaygroundProps = {
  onBack: () => void;
  vendorContext?: SmartBarVendorContext | null;
};

function smartBarPlaygroundRetryKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*\d+\s*x\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function smartBarPlaygroundRetryLineInstanceKey(line: SmartBarMobileOrderLine) {
  return smartBarPlaygroundRetryKey(String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || ""));
}

function smartBarPlaygroundRetryLinesAreSameInstance(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftKey = smartBarPlaygroundRetryLineInstanceKey(left);
  const rightKey = smartBarPlaygroundRetryLineInstanceKey(right);

  if (leftKey && rightKey) return leftKey === rightKey;

  if (left.sourceLineIndex !== undefined && right.sourceLineIndex !== undefined) {
    return left.sourceLineIndex === right.sourceLineIndex;
  }

  return Boolean(left.id && right.id && left.id === right.id);
}

function smartBarPlaygroundRetryFallbackLine(query: string, meta?: SmartBarMobileSubmitMeta): SmartBarMobileOrderLine {
  const title = query.trim() || meta?.replaceLineTitle || "Requested item";
  const key = smartBarPlaygroundRetryKey(title) || smartBarPlaygroundRetryKey(meta?.replaceLineId || "") || "item";

  return {
    id: meta?.replaceLineId || `retry-unmatched-${key}`,
    cartLineKey: meta?.replaceLineId || `retry-unmatched-${key}`,
    title,
    status: "unknown",
    helper: "Not on the BurgerRush menu",
    price: "-",
    details: [],
    retryPrompt: "Try the item again with a BurgerRush menu name.",
  };
}

function smartBarPlaygroundEnsureRetryReplacementLine(
  lines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
  query: string,
  meta?: SmartBarMobileSubmitMeta,
) {
  if (meta?.intent !== "replace_unknown") return lines;

  const hasReplacementCandidate = lines.some((line) => (
    !previousLines.some((previousLine) => smartBarPlaygroundRetryLinesAreSameInstance(previousLine, line))
  ));

  if (hasReplacementCandidate) return lines;

  return [...lines, smartBarPlaygroundRetryFallbackLine(query, meta)];
}

function formatPlaygroundTicketId(sequence: number) {
  return `T-${String(sequence).padStart(3, "0")}`;
}

function boardDetailsForLine(line: SmartBarMobileOrderLine) {
  const details = (line.details || []).filter(Boolean);
  if (details.length) return details;
  if (line.helper) return [line.helper];
  return undefined;
}

function createBoardOrderFromResult(
  result: SmartBarMobileOrderResult,
  rawOrder: string,
  ticketId: string,
  vendorContext: SmartBarVendorContext,
): SmartBarOrderBoardItem {
  const lines = result.lines || [];

  return {
    id: ticketId,
    minutesAgo: 0,
    status: "new",
    customer: "SmartBar",
    phone: "202-555-0184",
    pickup: "ASAP",
    itemCount: Math.max(1, lines.length),
    groups: [
      {
        title: "Order",
        items: lines.length
          ? lines.map((line) => ({
              quantity: 1,
              name: line.demoDisplayTitle || line.title,
              details: boardDetailsForLine(line),
            }))
          : [{ quantity: 1, name: "SmartBar ticket" }],
      },
    ],
    notes: [rawOrder ? `Heard: ${rawOrder}` : "SmartBar ticket", result.estimatedTotal ? `Total: ${result.estimatedTotal}` : ""]
      .filter(Boolean)
      .join(" - "),
    clientId: vendorContext.clientId,
    vendorId: vendorContext.vendorId,
    displayName: vendorContext.displayName,
    menuProfileId: vendorContext.menuProfileId,
    behaviorProfileId: vendorContext.behaviorProfileId,
    boardProfileId: vendorContext.boardProfileId,
    timezone: vendorContext.timezone,
  };
}

export default function SmartBarPlayground({ onBack, vendorContext }: SmartBarPlaygroundProps) {
  const carryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const orderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const estimatedTotalRef = useRef("-");
  const latestPromptRef = useRef("");
  const ticketSequenceRef = useRef(184);
  const activeOrderTicketIdRef = useRef<string | null>(null);
  const activeVendorContext = useMemo(() => normalizeSmartBarVendorContext(vendorContext), [vendorContext]);
  const pendingTicketIdRef = useRef(formatPlaygroundTicketId(184));
  const boardOrderIdsRef = useRef(new Set<string>());

  const [boardOrders, setBoardOrders] = useState<SmartBarOrderBoardItem[]>([]);
  const [sendOrderNumber, setSendOrderNumber] = useState(() => formatPlaygroundTicketId(184));
  const [, setCartOpen] = useState(false);
  const [boardExpanded, setBoardExpanded] = useState(true);
  const [activeBoardOrder, setActiveBoardOrder] = useState<SmartBarOrderBoardItem | null>(null);

  const forceProductionCart = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("playgroundCart") === "1";
  }, []);

  const forcedCartSubmission = useMemo(() => (
    forceProductionCart
      ? {
          id: 9001,
          query: "double cheeseburger combo no onions, large fries, large diet coke",
          typing: false,
          submitDelayMs: 0,
        }
      : null
  ), [forceProductionCart]);

  const reserveActiveTicketId = useCallback(() => {
    if (activeOrderTicketIdRef.current) return activeOrderTicketIdRef.current;

    const ticketId = formatPlaygroundTicketId(ticketSequenceRef.current);
    ticketSequenceRef.current += 1;
    activeOrderTicketIdRef.current = ticketId;
    pendingTicketIdRef.current = ticketId;
    setSendOrderNumber(ticketId);
    return ticketId;
  }, []);

  const handleSubmitPrompt = useCallback(async (query: string, meta?: SmartBarMobileSubmitMeta) => {
    const replacingUnknown = meta?.intent === "replace_unknown";
    const previousLines = replacingUnknown
      ? smartBarMobileFilterReplacementLine(orderLinesRef.current, meta)
      : orderLinesRef.current;
    const previousEstimatedTotal = estimatedTotalRef.current;
    const existingCarryoutOrder = replacingUnknown
      ? smartBarMobileRemoveReplacementFromCarryoutOrder(carryoutOrderRef.current, meta)
      : carryoutOrderRef.current;
    const hasExistingCart = Boolean(existingCarryoutOrder || previousLines.length > 0);
    const shouldUseExistingCart = smartBarMobileQueryShouldUseExistingCart(query, hasExistingCart);
    const carryoutOrderForPrompt = shouldUseExistingCart ? existingCarryoutOrder : null;
    const promptQuery = replacingUnknown && meta?.replaceLineTitle
      ? `replace ${meta.replaceLineTitle} with ${query}`
      : query;

    if (!replacingUnknown) {
      reserveActiveTicketId();
      latestPromptRef.current = query;
      setBoardExpanded(false);
    }

    setCartOpen(true);

    try {
      const result = await smartBarMobileResultFromGuideAi(promptQuery, carryoutOrderForPrompt, activeVendorContext);
      const resultForMerge = {
        ...result,
        lines: smartBarPlaygroundEnsureRetryReplacementLine(
          smartBarMobileFilterReplacementLine(result.lines, meta),
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

      orderLinesRef.current = mergedResult.lines;
      estimatedTotalRef.current = mergedResult.estimatedTotal || previousEstimatedTotal;
      carryoutOrderRef.current = smartBarMobileMergeCarryoutOrders(
        carryoutOrderForPrompt,
        smartBarMobileRemoveReplacementFromCarryoutOrder(result.carryoutOrder ?? null, meta),
        shouldUseExistingCart,
      );

      return mergedResult;
    } catch (error) {
      console.warn("SmartBar playground guide API failed", error);
      const errorResult = smartBarMobileApiErrorResult(promptQuery, error);
      const mergedErrorResultBase = smartBarMobileMergeOrderResults(
        errorResult,
        previousLines,
        previousEstimatedTotal,
        shouldUseExistingCart,
      );
      const mergedErrorResult = replacingUnknown
        ? { ...mergedErrorResultBase, preserveResultLinesOnRetry: true }
        : mergedErrorResultBase;

      orderLinesRef.current = mergedErrorResult.lines;
      estimatedTotalRef.current = mergedErrorResult.estimatedTotal || previousEstimatedTotal;
      carryoutOrderRef.current = carryoutOrderForPrompt;

      return mergedErrorResult;
    }
  }, [activeVendorContext, reserveActiveTicketId]);

  const handleApplyLineChoice = useCallback(async (
    line: SmartBarMobileOrderLine,
    value: string,
    meta?: SmartBarMobileApplyChoiceMeta,
  ) => {
    const previousEstimatedTotal = estimatedTotalRef.current;
    const nextLines = smartBarMobileApplyChoiceToVisibleLines(
      orderLinesRef.current,
      line,
      value,
      meta?.selected ?? true,
    );
    const optimisticCarryoutOrder = smartBarMobileApplyChoiceToCarryoutOrder(
      carryoutOrderRef.current,
      line,
      value,
      meta?.selected ?? true,
    );
    const optimisticEstimatedTotal = previousEstimatedTotal && previousEstimatedTotal !== "-"
      ? previousEstimatedTotal
      : smartBarMobileEstimatedTotalFromLines(nextLines);

    orderLinesRef.current = nextLines;
    estimatedTotalRef.current = optimisticEstimatedTotal;
    carryoutOrderRef.current = optimisticCarryoutOrder;

    const optimisticResult = {
      lines: nextLines,
      estimatedTotal: optimisticEstimatedTotal,
    };

    if (!optimisticCarryoutOrder) return optimisticResult;

    try {
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `${meta?.selected === false ? "deselected" : "selected"} ${value} for ${line.title}`,
        activeVendorContext,
      );

      orderLinesRef.current = repricedResult.lines;
      estimatedTotalRef.current = repricedResult.estimatedTotal || optimisticEstimatedTotal;
      carryoutOrderRef.current = repricedResult.carryoutOrder ?? optimisticCarryoutOrder;

      return {
        ...repricedResult,
        estimatedTotal: repricedResult.estimatedTotal || optimisticEstimatedTotal,
      };
    } catch (error) {
      console.warn("SmartBar playground reprice failed after choice", error);
      return optimisticResult;
    }
  }, [activeVendorContext]);

  const handleRemoveLine = useCallback(async (line: SmartBarMobileOrderLine) => {
    const nextLines = smartBarMobileRemoveVisibleLine(orderLinesRef.current, line);
    const nextEstimatedTotal = nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "-";
    const optimisticCarryoutOrder = smartBarMobileRemoveLineFromCarryoutOrder(
      carryoutOrderRef.current,
      line,
    );

    orderLinesRef.current = nextLines;
    estimatedTotalRef.current = nextEstimatedTotal;
    carryoutOrderRef.current = optimisticCarryoutOrder;

    const optimisticResult = {
      lines: nextLines,
      estimatedTotal: nextEstimatedTotal,
    };

    if (!nextLines.length || !optimisticCarryoutOrder) return optimisticResult;

    try {
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `removed ${line.title}`,
        activeVendorContext,
      );

      orderLinesRef.current = repricedResult.lines;
      estimatedTotalRef.current = repricedResult.estimatedTotal || nextEstimatedTotal;
      carryoutOrderRef.current = repricedResult.carryoutOrder ?? optimisticCarryoutOrder;

      return {
        ...repricedResult,
        estimatedTotal: repricedResult.estimatedTotal || nextEstimatedTotal,
      };
    } catch (error) {
      console.warn("SmartBar playground reprice failed after remove", error);
      return optimisticResult;
    }
  }, [activeVendorContext]);

  const handleCartReady = useCallback((result: SmartBarMobileOrderResult) => {
    setCartOpen(true);
    orderLinesRef.current = result.lines;
    estimatedTotalRef.current = result.estimatedTotal || estimatedTotalRef.current;
  }, []);

  const handleOrderSent = useCallback(async () => {
    const fallbackTicketId = activeOrderTicketIdRef.current || pendingTicketIdRef.current || sendOrderNumber;
    if (!fallbackTicketId || boardOrderIdsRef.current.has(fallbackTicketId)) return fallbackTicketId;

    boardOrderIdsRef.current.add(fallbackTicketId);

    const currentResult = {
      lines: orderLinesRef.current,
      estimatedTotal: estimatedTotalRef.current,
    };
    const rawOrder = latestPromptRef.current || "SmartBar order";

    let ticketId = fallbackTicketId;

    try {
      const persistedTicket = await createPersistentSmartBarTicket(
        currentResult,
        rawOrder,
        activeVendorContext,
      );

      ticketId = persistedTicket?.ticketDisplayId || persistedTicket?.ticketNumber || fallbackTicketId;
    } catch (error) {
      console.error("SmartBar ticket persistence failed", error);
    }

    boardOrderIdsRef.current.add(ticketId);

    const boardOrder = createBoardOrderFromResult(
      currentResult,
      rawOrder,
      ticketId,
      activeVendorContext,
    );

    setSendOrderNumber(ticketId);
    setBoardOrders((current) => [boardOrder, ...current.filter((order) => order.id !== ticketId && order.id !== fallbackTicketId)]);
    setBoardExpanded(true);

    return ticketId;
  }, [activeVendorContext, sendOrderNumber]);

  const handleBoardEntered = useCallback((orderId: string) => {
    setActiveBoardOrder(null);
    setBoardOrders((current) => current.map((order) => (
      order.id === orderId ? { ...order, status: "entered" } : order
    )));
  }, []);

  const handleBoardScore = useCallback((orderId: string, score: "ready" | "needs_fix", note = "") => {
    setBoardOrders((current) => current.map((order) => (
      order.id === orderId ? { ...order, score, scoreNote: note } : order
    )));
    setActiveBoardOrder((current) => (
      current && current.id === orderId ? { ...current, score, scoreNote: note } : current
    ));
  }, []);

  const handleResetCart = useCallback(() => {
    carryoutOrderRef.current = null;
    orderLinesRef.current = [];
    estimatedTotalRef.current = "-";
    latestPromptRef.current = "";
    activeOrderTicketIdRef.current = null;
    pendingTicketIdRef.current = formatPlaygroundTicketId(ticketSequenceRef.current);
    setSendOrderNumber(pendingTicketIdRef.current);
    setCartOpen(false);
  }, []);

  const boardIsCompact = !boardExpanded || forceProductionCart;

  return (
    <div className="mx-auto mt-0 w-full max-w-[430px]">
      <div className="mb-2 flex items-center px-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center rounded-full bg-white/82 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </button>
      </div>

      <div className="relative h-[min(650px,calc(100svh-132px))] min-h-[560px] overflow-hidden rounded-[34px] bg-[#e9f6ff] shadow-[0_24px_70px_rgba(14,116,144,0.16)] ring-1 ring-sky-100/90">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.88),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.44),rgba(232,246,255,0.26))]" />

        <div className={[
          "absolute inset-x-3 top-3 z-30 overflow-hidden rounded-[28px] bg-white/58 shadow-[0_16px_36px_rgba(14,116,144,0.12)] ring-1 ring-white/80 transition-all duration-300",
          boardIsCompact ? "h-[92px]" : "h-[286px]",
        ].join(" ")}
        >
          <SmartBarOrderBoardMock
            demoOrders={boardOrders}
            demoSocialPortrait
            demoCompactBoard
            demoFourTileBoard
            demoMaxVisibleOrders={4}
            demoAnimateIncomingOrders
            demoPlaygroundSheet
            onDemoOpenOrder={setActiveBoardOrder}
            className="!min-h-0 h-full overflow-hidden !px-3 !py-3"
            onDemoEntered={handleBoardEntered}
          />
        </div>

        <div className={[
          "absolute inset-x-0 bottom-0 z-20 overflow-visible [transform:translateZ(0)] transition-all duration-300",
          boardIsCompact ? "top-[108px]" : "top-[306px]",
        ].join(" ")}
        >
          <SmartBarMobileShell
            mode="overlay"
            introCallout={{
              title: boardOrders.length ? "Say or type another order" : "Say or type an order",
            }}
            demoRestCompanion={{ label: "SmartBar", showLogo: true }}
            entryModeLabel="Say or type order"
            sendOrderNumber={sendOrderNumber}
            compactCartRows
            demoBottomLiftPx={16}
            demoSubmission={forcedCartSubmission}
            onSubmitPrompt={handleSubmitPrompt}
            onApplyLineChoice={handleApplyLineChoice}
            onRemoveLine={handleRemoveLine}
            onCartReady={handleCartReady}
            onOrderSent={handleOrderSent}
            onResetCart={handleResetCart}
          />
        </div>

        {activeBoardOrder ? (
          <SmartBarOrderSheet
            order={activeBoardOrder}
            onClose={() => setActiveBoardOrder(null)}
            onMarkEntered={handleBoardEntered}
            onScoreOrder={handleBoardScore}
            demoSocialPortrait
            demoPlaygroundSheet
          />
        ) : null}
      </div>
    </div>
  );
}
