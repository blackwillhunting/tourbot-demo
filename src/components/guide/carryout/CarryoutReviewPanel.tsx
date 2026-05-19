import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import type { CarryoutPreCartLine, CarryoutPreCartState } from "./carryoutTypes";
import {
  carryoutDisplayTitle,
  carryoutLineDetails,
  carryoutLineKey,
  formatCarryoutMoney,
} from "./carryoutUtils";

export type CarryoutReviewPanelProps = {
  order: CarryoutPreCartState | null;
  readyLines: CarryoutPreCartLine[];
  pendingLines: CarryoutPreCartLine[];
  allLines: CarryoutPreCartLine[];
  hasItems: boolean;
  hasPendingItems: boolean;
  bookingPreloadConfirmed: boolean;
  orderConfirmed: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onJumpToLine: (line: CarryoutPreCartLine) => void;
  onRemoveLine: (line: CarryoutPreCartLine) => void;
  onReviewChoices: () => void;
  onConfirmOrder: () => void;
  formatPriceDelta: (value?: number | null) => string;
  phraseFromId: (value?: string | null) => string;
  formatLinePrice: (line: CarryoutPreCartLine) => string;
  missingSummary: (line: CarryoutPreCartLine) => string;
  demoScrollButtonVisible?: boolean;
  compactPanelHeader?: boolean;
};
export type CarryoutReviewPanelSnapshot = {
  hasScrollNode: boolean;
  isScrollable: boolean;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  atTop: boolean;
  atBottom: boolean;
  hasItems: boolean;
  hasPendingItems: boolean;
  readyCount: number;
  pendingCount: number;
  lineCount: number;
  bookingPreloadConfirmed: boolean;
  orderConfirmed: boolean;
  checkoutReady: boolean;
  lastPendingTitle?: string;
};

export type CarryoutReviewPanelHandle = {
  scrollToBottom: (options?: ScrollToOptions) => boolean;
  scrollToTop: (options?: ScrollToOptions) => boolean;
  getSnapshot: () => CarryoutReviewPanelSnapshot;
};

const invisibleDemoHitTargetClass =
  "z-20 h-9 w-9 overflow-hidden rounded-full border border-transparent bg-transparent p-0 text-[0px] text-transparent shadow-none outline-none ring-0 transition focus-visible:ring-2 focus-visible:ring-slate-400/50";

const CarryoutReviewPanel = forwardRef<CarryoutReviewPanelHandle, CarryoutReviewPanelProps>(function CarryoutReviewPanel({
  order,
  readyLines,
  pendingLines,
  allLines,
  hasItems,
  hasPendingItems,
  bookingPreloadConfirmed,
  orderConfirmed,
  scrollRef,
  onJumpToLine,
  onRemoveLine,
  onReviewChoices,
  onConfirmOrder,
  formatPriceDelta,
  phraseFromId,
  formatLinePrice,
  missingSummary,
  demoScrollButtonVisible = false,
  compactPanelHeader = false,
}: CarryoutReviewPanelProps, ref) {
  const subtotal = order?.totals?.subtotal;
  const estimatedTax = order?.totals?.estimatedTax;
  const estimatedTotal = order?.totals?.estimatedTotal;
  const hasFinalTotal = Boolean(order?.totals?.finalTotalAvailable && estimatedTotal);
  const internalScrollRef = useRef<HTMLDivElement | null>(null);

  const setScrollNode = (node: HTMLDivElement | null) => {
    internalScrollRef.current = node;
    (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const scrollToBottom = (options?: ScrollToOptions) => {
    const node = internalScrollRef.current;
    if (!node) return false;

    node.scrollTo({
      top: node.scrollHeight,
      behavior: options?.behavior || "smooth",
    });
    return true;
  };

  const scrollToTop = (options?: ScrollToOptions) => {
    const node = internalScrollRef.current;
    if (!node) return false;

    node.scrollTo({
      top: 0,
      behavior: options?.behavior || "smooth",
    });
    return true;
  };

  const jumpToLastPendingLine = () => {
    const lastPending = pendingLines[pendingLines.length - 1];
    if (!lastPending) return false;

    onJumpToLine(lastPending);
    return true;
  };

  const getSnapshot = (): CarryoutReviewPanelSnapshot => {
    const node = internalScrollRef.current;
    const scrollTop = node?.scrollTop || 0;
    const scrollHeight = node?.scrollHeight || 0;
    const clientHeight = node?.clientHeight || 0;
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
    const lastPending = pendingLines[pendingLines.length - 1];

    return {
      hasScrollNode: Boolean(node),
      isScrollable: Boolean(node && scrollHeight > clientHeight + 1),
      scrollTop,
      scrollHeight,
      clientHeight,
      atTop: scrollTop <= 1,
      atBottom: !node || maxScrollTop - scrollTop <= 2,
      hasItems,
      hasPendingItems,
      readyCount: readyLines.length,
      pendingCount: pendingLines.length,
      lineCount: allLines.length,
      bookingPreloadConfirmed,
      orderConfirmed,
      checkoutReady: hasItems && !hasPendingItems,
      lastPendingTitle: lastPending
        ? carryoutDisplayTitle(lastPending, phraseFromId)
        : undefined,
    };
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
      scrollToTop,
      getSnapshot,
    }),
    [
      allLines,
      bookingPreloadConfirmed,
      hasItems,
      hasPendingItems,
      orderConfirmed,
      pendingLines,
      phraseFromId,
      readyLines,
    ],
  );

  const renderLine = (
    line: CarryoutPreCartLine,
    status: "ready" | "pending",
    index = 0,
    count = 0,
  ) => {
    const pending = status === "pending";
    const isLastPending = pending && index === Math.max(0, count - 1);
    const qty = typeof line.quantity === "number" && line.quantity > 1 ? `${line.quantity} × ` : "";
    const details = carryoutLineDetails(line, formatPriceDelta);

    return (
      <div
        key={carryoutLineKey(line)}
        className={`rounded-xl border bg-white p-2.5 shadow-sm ${
          pending ? "border-amber-200" : "border-emerald-100"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            data-demo-target={pending ? "guide-carryout-pending-line" : undefined}
            data-demo-pending-index={pending ? index : undefined}
            data-demo-pending-last={pending ? String(isLastPending) : undefined}
            onClick={() => pending && onJumpToLine(line)}
            className={`min-w-0 flex-1 text-left ${pending ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900">
                {qty}{carryoutDisplayTitle(line, phraseFromId)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] ${
                  pending
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {pending ? "Needs choices" : "Ready"}
              </span>
            </div>
            <div className="mt-1 text-[11px] leading-4 text-slate-500">
              {missingSummary(line)}
            </div>
            {details.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {details.slice(0, 5).map((selection) => (
                  <span
                    key={`${carryoutLineKey(line)}-${selection}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    {selection}
                  </span>
                ))}
              </div>
            )}
            {pending && (
              <div className="mt-1 text-[11px] font-semibold text-amber-700">
                Tap to choose now
              </div>
            )}
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-white">
              {formatLinePrice(line)}
            </span>
            <button
              type="button"
              aria-label={`Remove ${line.title || "item"}`}
              onClick={() => onRemoveLine(line)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreCartList = () => (
    hasItems ? (
      <div className="space-y-2">
        {pendingLines.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Needs choices
            </div>
            {pendingLines.map((line, index) => renderLine(line, "pending", index, pendingLines.length))}
          </div>
        )}
        {readyLines.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Ready items
            </div>
            {readyLines.map((line, index) => renderLine(line, "ready", index, readyLines.length))}
          </div>
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
        No food items saved yet.
      </div>
    )
  );

  const renderConfirmationLine = (line: CarryoutPreCartLine, index: number) => {
    const details = carryoutLineDetails(line, formatPriceDelta);
    return (
      <div
        key={`${carryoutLineKey(line)}-confirm-${index}`}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950">
              {carryoutDisplayTitle(line, phraseFromId)}
            </div>
            {details.length > 0 ? (
              <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-slate-500">
                {details.map((detail) => (
                  <div key={`${carryoutLineKey(line)}-detail-${detail}`}>• {detail}</div>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-[11px] leading-4 text-slate-500">
                No extra choices.
              </div>
            )}
          </div>
          <div className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold text-white">
            {formatLinePrice(line)}
          </div>
        </div>
      </div>
    );
  };

  const renderCheckoutReview = () => {
    if (!bookingPreloadConfirmed) return renderPreCartList();

    if (hasPendingItems) {
      return (
        <div
          data-demo-target="guide-carryout-pending-card"
          className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3"
        >
          <div>
            <div className="text-sm font-semibold text-amber-950">
              Almost ready — finish choices first
            </div>
            <div className="mt-1 text-[11px] leading-4 text-amber-900">
              {pendingLines.length} item{pendingLines.length === 1 ? "" : "s"} need choices before checkout. Tap a row to jump back to that item.
            </div>
          </div>
          <div className="max-h-[min(58dvh,520px)] space-y-1.5 overflow-y-auto pr-1">
            {pendingLines.map((line, index) => renderLine(line, "pending", index, pendingLines.length))}
          </div>
        </div>
      );
    }

    return (
      <div
        data-demo-target="guide-carryout-confirmation-card"
        className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"
      >
        <div>
          <div className="text-sm font-semibold text-emerald-950">
            Review your carryout order
          </div>
          <div className="mt-1 text-[11px] leading-4 text-emerald-900">
            Everything required is complete. Review details before the demo handoff.
          </div>
        </div>
        <div className="max-h-[min(58dvh,520px)] space-y-1.5 overflow-y-auto pr-1">
          {allLines.map((line, index) => renderConfirmationLine(line, index))}
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-2.5 text-xs text-slate-700 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-950">{formatCarryoutMoney(subtotal)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span>Estimated tax</span>
            <span className="font-semibold text-slate-950">{formatCarryoutMoney(estimatedTax)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-sm">
            <span className="font-semibold text-slate-950">Estimated total</span>
            <span className="font-black text-slate-950">{formatCarryoutMoney(estimatedTotal)}</span>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-[11px] leading-4 text-emerald-900">
          Demo handoff only — no payment is submitted. Use the fixed footer button below to confirm.
        </div>
        {orderConfirmed && (
          <div className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm">
            Carryout order confirmed for demo handoff.
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-demo-surface="carryout-review-panel"
      className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      {!compactPanelHeader && (
        <div className={`shrink-0 rounded-xl border px-3 py-2 text-xs leading-5 ${
          hasPendingItems
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          {hasItems
            ? hasPendingItems
              ? `${pendingLines.length} item${pendingLines.length === 1 ? "" : "s"} need choices before checkout.`
              : "All items are ready for checkout."
            : "Tell TourBot your order and matched items will appear here automatically."}
        </div>
      )}

      {demoScrollButtonVisible && (
        <>
          <button
            type="button"
            data-demo-target="guide-carryout-scroll-top-hit"
            aria-label="Demo scroll cart to top"
            tabIndex={-1}
            onClick={() => scrollToTop({ behavior: "smooth" })}
            className={`absolute top-[4.9rem] -right-4 ${invisibleDemoHitTargetClass}`}
          >
            Demo ↑
          </button>
          <button
            type="button"
            data-demo-target="guide-carryout-scroll-bottom-hit"
            aria-label="Demo scroll cart to bottom"
            tabIndex={-1}
            onClick={() => scrollToBottom({ behavior: "smooth" })}
            className={`absolute bottom-[5.75rem] -right-4 ${invisibleDemoHitTargetClass}`}
          >
            Demo ↓
          </button>
          {pendingLines.length > 0 && (
            <button
              type="button"
              data-demo-target="guide-carryout-jump-last-pending-hit"
              aria-label="Demo jump to last pending cart item"
              tabIndex={-1}
              onClick={jumpToLastPendingLine}
              className={`absolute bottom-[19.75rem] right-[15.15rem] ${invisibleDemoHitTargetClass}`}
            >
              Demo item →
            </button>
          )}
        </>
      )}

      <div
        ref={setScrollNode}
        data-demo-target="guide-carryout-cart-scroll"
        className="min-h-0 flex-1 overflow-y-auto pr-1 [overscroll-behavior:contain]"
      >
        {renderCheckoutReview()}
      </div>

      <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900">
              {hasPendingItems
                ? "Complete choices first"
                : orderConfirmed
                  ? "Order confirmed"
                  : bookingPreloadConfirmed
                    ? "Review and confirm"
                    : "Ready to checkout?"}
            </div>
            <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
              {hasFinalTotal
                ? `Estimated total: ${formatCarryoutMoney(estimatedTotal)}`
                : typeof subtotal === "number"
                  ? `Current subtotal: ${formatCarryoutMoney(subtotal)}`
                  : hasPendingItems
                    ? "Choose the pending item options to finish the draft cart."
                    : "Checkout handoff is ready once items are complete."}
            </div>
          </div>
          <button
            data-demo-target="guide-carryout-checkout"
            type="button"
            disabled={!hasItems || orderConfirmed}
            onClick={() => {
              if (!hasItems) return;
              if (hasPendingItems || !bookingPreloadConfirmed) {
                onReviewChoices();
                return;
              }
              onConfirmOrder();
            }}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
              hasPendingItems
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : orderConfirmed
                  ? "bg-emerald-700 text-white"
                  : bookingPreloadConfirmed
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "bg-cyan-950 text-white hover:bg-cyan-900"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {hasPendingItems
              ? "Review choices"
              : orderConfirmed
                ? "Confirmed"
                : bookingPreloadConfirmed
                  ? "Confirm order"
                  : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CarryoutReviewPanel;

