import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock3, ReceiptText, X } from "lucide-react";
import type { CarryoutOrder } from "../TourBarOrdering";
import SmartBarMobileShell, {
  type SmartBarMobileApplyChoiceMeta,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../smartbar-mobile/SmartBarMobileShell";
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

type SmartBarPlaygroundProps = {
  onBack: () => void;
};

type PlaygroundTicket = {
  id: string;
  label: string;
  rawOrder: string;
  statusLabel: string;
  total: string;
  createdLabel: string;
  lines: SmartBarMobileOrderLine[];
};

const EMPTY_SLOT_LABELS = ["Waiting", "Waiting", "Waiting", "Waiting"];

function compactTicketLabel(lines: SmartBarMobileOrderLine[]) {
  if (!lines.length) return "SmartBar ticket";
  if (lines.length === 1) return lines[0].title;
  return `${lines[0].title} +${lines.length - 1}`;
}

function smartBarPlaygroundRetryKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*\d+\s*[Ã—x]\s*/i, "")
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
    price: "â€”",
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

function playgroundTicketStatusLabel(lines: SmartBarMobileOrderLine[]) {
  return lines.some((line) => line.status === "pending" || line.status === "unknown")
    ? "Review"
    : lines.some((line) => line.status === "options")
      ? "Options"
      : "Ready";
}

function createTicketFromResult(
  result: SmartBarMobileOrderResult,
  rawOrder: string,
  ticketId: string,
): PlaygroundTicket {
  return {
    id: ticketId,
    label: compactTicketLabel(result.lines),
    rawOrder,
    statusLabel: playgroundTicketStatusLabel(result.lines),
    total: result.estimatedTotal || "â€”",
    createdLabel: "Now",
    lines: result.lines,
  };
}

function TicketTile({
  ticket,
  index,
  onOpen,
  compact = false,
}: {
  ticket: PlaygroundTicket | null;
  index: number;
  onOpen: (ticket: PlaygroundTicket) => void;
  compact?: boolean;
}) {
  if (!ticket) {
    return (
      <div
        className={compact
          ? "min-h-[34px] rounded-xl border border-dashed border-sky-200/80 bg-white/48 px-1.5 py-1 text-left"
          : "min-h-[52px] rounded-2xl border border-dashed border-sky-200/80 bg-white/45 px-2.5 py-2 text-left"
        }
      >
        <div
          className={compact
            ? "text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400"
            : "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
          }
        >
          Slot {index + 1}
        </div>
        <div
          className={compact
            ? "mt-0.5 truncate text-[10px] font-semibold leading-3 text-slate-500"
            : "mt-1 truncate text-[13px] font-semibold text-slate-500"
          }
        >
          {EMPTY_SLOT_LABELS[index] || "Waiting"}
        </div>
      </div>
    );
  }

  const ready = ticket.statusLabel === "Ready";

  return (
    <button
      type="button"
      onClick={() => onOpen(ticket)}
      className={compact
        ? "min-h-[34px] rounded-xl bg-white px-1.5 py-1 text-left shadow-[0_6px_14px_rgba(14,116,144,0.09)] ring-1 ring-sky-100 transition hover:-translate-y-0.5"
        : "min-h-[52px] rounded-2xl bg-white px-2.5 py-2 text-left shadow-[0_8px_18px_rgba(14,116,144,0.10)] ring-1 ring-sky-100 transition hover:-translate-y-0.5"
      }
    >
      <div className="flex items-center justify-between gap-1.5">
        <span
          className={compact
            ? "text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400"
            : "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
          }
        >
          {ticket.id}
        </span>
        <span className={`${compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]"} rounded-full font-bold uppercase tracking-[0.08em] ${
          ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>
          {ticket.statusLabel}
        </span>
      </div>
      <div
        className={compact
          ? "mt-0.5 truncate text-[10px] font-semibold leading-3 text-slate-950"
          : "mt-1 truncate text-[13px] font-semibold leading-4 text-slate-950"
        }
      >
        {ticket.label}
      </div>
      {!compact && (
        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
          {ticket.total}
        </div>
      )}
    </button>
  );
}

export default function SmartBarPlayground({ onBack }: SmartBarPlaygroundProps) {
  const carryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const orderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const estimatedTotalRef = useRef("â€”");
  const latestPromptRef = useRef("");
  const ticketSequenceRef = useRef(184);
  const activeOrderTicketIdRef = useRef<string | null>(null);
  const pendingTicketIdRef = useRef(formatPlaygroundTicketId(184));

  const [tickets, setTickets] = useState<PlaygroundTicket[]>([]);
  const [sendOrderNumber, setSendOrderNumber] = useState(() => formatPlaygroundTicketId(184));
  const [activeTicket, setActiveTicket] = useState<PlaygroundTicket | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const forceProductionCart = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("playgroundCart") === "1";
  }, []);

  const forcedCartSubmission = useMemo(() => (
    forceProductionCart
      ? {
          id: 9001,
          query: "large pepperoni well done, buffalo wings, caesar salad, gar-stix",
          typing: false,
          submitDelayMs: 0,
        }
      : null
  ), [forceProductionCart]);

  const ticketSlots = useMemo(() => {
    const visibleTickets = tickets.slice(0, 4);
    return [...visibleTickets, ...Array(Math.max(0, 4 - visibleTickets.length)).fill(null)] as Array<PlaygroundTicket | null>;
  }, [tickets]);

  const visibleTicketCount = Math.min(tickets.length, 4);
  const shownTicketLabel = tickets.length > 4 ? `${visibleTicketCount} of ${tickets.length} shown` : `${visibleTicketCount} shown`;

  const compactOrderRail = forceProductionCart || cartOpen;

  const updateActiveTicketFromResult = useCallback((result: SmartBarMobileOrderResult) => {
    const ticketId = activeOrderTicketIdRef.current || pendingTicketIdRef.current;
    if (!ticketId) return;

    const updatedTicket = createTicketFromResult(
      result,
      latestPromptRef.current || "SmartBar order",
      ticketId,
    );

    setTickets((current) => current.map((ticket) => (
      ticket.id === ticketId ? updatedTicket : ticket
    )));
  }, []);

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
    }

    setCartOpen(true);

    try {
      const result = await smartBarMobileResultFromGuideAi(promptQuery, carryoutOrderForPrompt);
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
      if (replacingUnknown) updateActiveTicketFromResult(mergedResult);

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
      if (replacingUnknown) updateActiveTicketFromResult(mergedErrorResult);

      return mergedErrorResult;
    }
  }, [reserveActiveTicketId, updateActiveTicketFromResult]);

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
    const optimisticEstimatedTotal = previousEstimatedTotal && previousEstimatedTotal !== "â€”"
      ? previousEstimatedTotal
      : smartBarMobileEstimatedTotalFromLines(nextLines);

    orderLinesRef.current = nextLines;
    estimatedTotalRef.current = optimisticEstimatedTotal;
    carryoutOrderRef.current = optimisticCarryoutOrder;

    const optimisticResult = {
      lines: nextLines,
      estimatedTotal: optimisticEstimatedTotal,
    };

    updateActiveTicketFromResult(optimisticResult);

    if (!optimisticCarryoutOrder) return optimisticResult;

    try {
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `${meta?.selected === false ? "deselected" : "selected"} ${value} for ${line.title}`,
      );

      orderLinesRef.current = repricedResult.lines;
      estimatedTotalRef.current = repricedResult.estimatedTotal || optimisticEstimatedTotal;
      carryoutOrderRef.current = repricedResult.carryoutOrder ?? optimisticCarryoutOrder;

      const finalResult = {
        ...repricedResult,
        estimatedTotal: repricedResult.estimatedTotal || optimisticEstimatedTotal,
      };
      updateActiveTicketFromResult(finalResult);

      return finalResult;
    } catch (error) {
      console.warn("SmartBar playground reprice failed after choice", error);
      return optimisticResult;
    }
  }, [updateActiveTicketFromResult]);

  const handleRemoveLine = useCallback(async (line: SmartBarMobileOrderLine) => {
    const nextLines = smartBarMobileRemoveVisibleLine(orderLinesRef.current, line);
    const nextEstimatedTotal = nextLines.length ? smartBarMobileEstimatedTotalFromLines(nextLines) : "â€”";
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

    updateActiveTicketFromResult(optimisticResult);

    if (!nextLines.length || !optimisticCarryoutOrder) return optimisticResult;

    try {
      const repricedResult = await smartBarMobileRepriceCartFromGuideAi(
        optimisticCarryoutOrder,
        `removed ${line.title}`,
      );

      orderLinesRef.current = repricedResult.lines;
      estimatedTotalRef.current = repricedResult.estimatedTotal || nextEstimatedTotal;
      carryoutOrderRef.current = repricedResult.carryoutOrder ?? optimisticCarryoutOrder;

      const finalResult = {
        ...repricedResult,
        estimatedTotal: repricedResult.estimatedTotal || nextEstimatedTotal,
      };
      updateActiveTicketFromResult(finalResult);

      return finalResult;
    } catch (error) {
      console.warn("SmartBar playground reprice failed after remove", error);
      return optimisticResult;
    }
  }, [updateActiveTicketFromResult]);

  const handleCartReady = useCallback((result: SmartBarMobileOrderResult) => {
    setCartOpen(true);
    const ticketId = pendingTicketIdRef.current || activeOrderTicketIdRef.current || reserveActiveTicketId();
    const nextTicket = createTicketFromResult(
      result,
      latestPromptRef.current || "SmartBar order",
      ticketId,
    );

    setTickets((current) => [nextTicket, ...current.filter((ticket) => ticket.id !== nextTicket.id)]);
  }, [reserveActiveTicketId]);

  const handleResetCart = useCallback(() => {
    carryoutOrderRef.current = null;
    orderLinesRef.current = [];
    estimatedTotalRef.current = "â€”";
    latestPromptRef.current = "";
    activeOrderTicketIdRef.current = null;
    pendingTicketIdRef.current = formatPlaygroundTicketId(ticketSequenceRef.current);
    setSendOrderNumber(pendingTicketIdRef.current);
    setCartOpen(false);
  }, []);

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

        <div className={`absolute inset-x-3 top-3 z-40 rounded-[26px] bg-[#e9f6ff]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_28px_rgba(14,116,144,0.08)] ring-1 ring-sky-100/90 backdrop-blur ${compactOrderRail ? "p-1.5" : "p-2"}`}>
          {!compactOrderRail && (
            <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-[#012169]" />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Test Orders
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-sky-100">
              <Clock3 className="h-3 w-3" />
              {tickets.length ? shownTicketLabel : "Waiting"}
            </span>
            </div>
          )}

          <div className={compactOrderRail ? "grid grid-cols-4 gap-1.5" : "grid grid-cols-2 gap-2"}>
            {ticketSlots.map((ticket, index) => (
              <TicketTile
                key={ticket?.id || `empty-${index}`}
                ticket={ticket}
                index={index}
                onOpen={setActiveTicket}
                compact={compactOrderRail}
              />
            ))}
          </div>
        </div>

        <div className={`absolute inset-x-0 bottom-0 z-20 overflow-visible [transform:translateZ(0)] ${compactOrderRail ? "top-[58px]" : "top-[150px]"}`}>
          <SmartBarMobileShell
            mode="overlay"
            introCallout={{
              title: "Say or type an order",
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
            onResetCart={handleResetCart}
          />
        </div>

        <AnimatePresence>
          {activeTicket && (
            <motion.div
              key={activeTicket.id}
              className="absolute inset-3 z-[60] flex items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 rounded-[30px] bg-slate-950/24 backdrop-blur-[2px]"
                onClick={() => setActiveTicket(null)}
                aria-label="Close ticket"
              />

              <motion.div
                className="relative z-10 w-full rounded-[28px] bg-white p-4 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.24)] ring-1 ring-slate-200"
                initial={{ y: 26, scale: 0.985 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 20, scale: 0.99 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {activeTicket.id}
                    </div>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">
                      {activeTicket.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTicket(null)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                    aria-label="Close ticket"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium leading-5 text-slate-600 ring-1 ring-slate-200">
                  {activeTicket.rawOrder}
                </div>

                <div className="mt-3 grid gap-2">
                  {activeTicket.lines.map((line) => (
                    <div key={line.id} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{line.title}</div>
                          <div className="mt-0.5 text-xs font-medium text-slate-500">
                            {(line.details || []).slice(0, 3).join(" â€¢ ") || line.helper}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-700">{line.price}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Ticket preview
                  </span>
                  <span>{activeTicket.total}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
