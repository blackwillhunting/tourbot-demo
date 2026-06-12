import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, X } from "lucide-react";
import SmartBarDemoToolbarFrame from "./SmartBarDemoToolbarFrame";
import { SmartBarFlashCardStack, type SmartBarFlashCardStackItem } from "./SmartBarFlashCardStack";
import {
  SmartBarFakePointerOverlay,
  makeSmartBarFakePointerState,
  type SmartBarFakePointerState,
} from "./SmartBarFakePointer";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellDemoCommand,
  type TourBarShellResult,
} from "../TourBarShell";
import { type CarryoutOrder, type GuideAiCarryoutResponse } from "../TourBarOrdering";
import ThinkingText from "../ThinkingText";

export const FOOD_TRIO_DESKTOP_INTRO_ANIMATION_MS = 47000;

const FOOD_TRIO_PROMPT = "Enter order in plain English";
const POINTER_AIM_MS = 260;
const POINTER_PULSE_MS = 520;
const ITEM_TILE_PRE_CLICK_HOVER_MS = 2500;
const TYPE_DELAY_MS = 26;
const THINKING_DELAY_MS = 2500;
const RESULT_AFTER_SUBMIT_SETTLE_MS = THINKING_DELAY_MS + 850;
const CHECKOUT_THINKING_MS = 3000;
const RETRY_PASTE_TEXT = "New entry";

type IntroCartPhase = "mixed" | "redDone" | "yellowDone" | "grayDone" | "checkout";
type IntroFilter = "all" | "ready" | "required" | "extras" | "retry";
type IntroPanel =
  | { kind: "required" }
  | { kind: "extras" }
  | { kind: "retry" }
  | null;

type IntroRowState = "ready" | "required" | "extras" | "retry" | "checkout";

type IntroRow = {
  key: string;
  label: string;
  detail: string;
  state: IntroRowState;
  selectorState: string;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function makeOrder(phase: IntroCartPhase): CarryoutOrder {
  const redDone = phase === "redDone" || phase === "yellowDone" || phase === "grayDone" || phase === "checkout";
  const yellowDone = phase === "yellowDone" || phase === "grayDone" || phase === "checkout";
  const grayDone = phase === "grayDone" || phase === "checkout";
  const allDone = redDone && yellowDone && grayDone;

  return {
    type: "carryout_order",
    status: allDone ? "ready_cart" : "needs_qualifier",
    nextAction: allDone ? "checkout" : "review_cart",
    items: [
      {
        lineItemId: "foodtrio-intro-green",
        id: "green-item",
        title: "Green item",
        quantity: 1,
        status: "ready",
                        knownSelections: ["No extra choices."],
      },
      {
        lineItemId: "foodtrio-intro-red",
        id: "red-item",
        title: "Red item",
        quantity: 1,
        status: redDone ? "ready" : "pending_required",
                        knownSelections: redDone ? ["Medium selected."] : [],
        missingQualifiers: redDone ? [] : [{ qualifierId: "size", label: "Choose size" }],
        qualifierGroups: redDone
          ? []
          : [
              {
                kind: "required",
                qualifierId: "size",
                label: "Choose size",
                required: true,
                missing: true,
                selectionMode: "single",
                options: [
                  { label: "Small", value: "small" },
                  { label: "Medium", value: "medium" },
                  { label: "Large", value: "large" },
                ],
              },
            ],
      },
      {
        lineItemId: "foodtrio-intro-yellow",
        id: "yellow-item",
        title: "Yellow item",
        quantity: 1,
        status: "ready",
                        knownSelections: yellowDone ? ["Extra sauce.", "Crispy add-on."] : [],
        qualifierGroups: yellowDone
          ? []
          : [
              {
                kind: "modifier",
                qualifierId: "extras",
                label: "Extras available",
                required: false,
                missing: false,
                selectionMode: "multi",
                options: [
                  { label: "Extra sauce", value: "extra-sauce" },
                  { label: "Crispy add-on", value: "crispy-addon" },
                  { label: "No onions", value: "no-onions" },
                ],
              },
            ],
      },
      ...(grayDone
        ? [
            {
              lineItemId: "foodtrio-intro-gray-resolved",
              id: "gray-resolved",
              title: "Retry item",
              quantity: 1,
              status: "ready",
                                          knownSelections: ["Matched from retry."],
            },
          ]
        : []),
    ],
    cannotMatchItems: grayDone
      ? []
      : [
          {
            text: "Gray item",
            label: "Gray item",
            reason: "No menu match found.",
            suggestion: "Try another item name.",
          },
        ],
      };
}

function makeResult(phase: IntroCartPhase): TourBarShellResult {
  const order = makeOrder(phase);
  const response: GuideAiCarryoutResponse = {
    title: phase === "checkout" ? "Checkout handoff ready" : "Cart built",
    answer: "FoodTrio cart preview.",
    commerceAction: "carryout_show_cart",
    displayMode: "cart",
    carryoutOrder: order,
    visibleContext: { carryoutOrder: order },
  };

  return {
    title: phase === "checkout" ? "Checkout handoff ready" : "Cart built",
    body: undefined,
    canFollowUp: false,
    mode: "speed_order",
    action: "carryout_show_cart",
    raw: {
      ...response,
      __speedDemo: {
        stableSheetKey: "foodtrio-intro-glass-cart",
        reviewMode: "cart",
        activeIndex: 0,
        keepSheetOpenNextMove: true,
      },
    },
  };
}

function rowsForPhase(phase: IntroCartPhase): IntroRow[] {
  const redDone = phase === "redDone" || phase === "yellowDone" || phase === "grayDone" || phase === "checkout";
  const yellowDone = phase === "yellowDone" || phase === "grayDone" || phase === "checkout";
  const grayDone = phase === "grayDone" || phase === "checkout";
  const checkout = phase === "checkout";

  return [
    {
      key: "green",
      label: "Green item",
      detail: "No extra choices.",
            state: checkout ? "checkout" : "ready",
      selectorState: "ready",
    },
    {
      key: "required",
      label: "Red item",
      detail: redDone ? "Medium selected." : "Required choice missing.",
            state: checkout ? "checkout" : redDone ? "ready" : "required",
      selectorState: redDone ? "ready" : "pending",
    },
    {
      key: "extras",
      label: "Yellow item",
      detail: yellowDone ? "Extra sauce · Crispy add-on." : "Optional extras available.",
            state: checkout ? "checkout" : yellowDone ? "ready" : "extras",
      selectorState: yellowDone ? "ready" : "optional",
    },
    {
      key: "retry",
      label: grayDone ? "Retry item" : "Gray item",
      detail: grayDone ? "Matched from retry." : "No match found.",
      state: checkout ? "checkout" : grayDone ? "ready" : "retry",
      selectorState: grayDone ? "ready" : "unrecognized",
    },
  ];
}

function filterRows(rows: IntroRow[], filter: IntroFilter) {
  if (filter === "all") return rows;
  if (filter === "ready") return rows.filter((row) => row.state === "ready" || row.state === "checkout");
  if (filter === "required") return rows.filter((row) => row.state === "required");
  if (filter === "extras") return rows.filter((row) => row.state === "extras");
  return rows.filter((row) => row.state === "retry");
}

function statusCounts(rows: IntroRow[]) {
  return {
    all: rows.length,
    ready: rows.filter((row) => row.state === "ready" || row.state === "checkout").length,
    required: rows.filter((row) => row.state === "required").length,
    extras: rows.filter((row) => row.state === "extras").length,
    retry: rows.filter((row) => row.state === "retry").length,
  } satisfies Record<IntroFilter, number>;
}

function rowTone(state: IntroRowState) {
  if (state === "checkout") {
    return {
      row: "border-blue-300/60 bg-gradient-to-r from-blue-500/90 to-blue-700/92 text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)]",
      badge: "bg-white/18 text-white ring-white/25",
      detail: "text-white/78",
          };
  }

  if (state === "required") {
    return {
      row: "border-rose-300/75 bg-gradient-to-r from-rose-500/86 to-pink-500/86 text-white shadow-[0_14px_30px_rgba(244,63,94,0.22)]",
      badge: "bg-white/18 text-white ring-white/28",
      detail: "text-white/82",
          };
  }

  if (state === "extras") {
    return {
      row: "border-yellow-300/85 bg-gradient-to-r from-yellow-300/96 to-amber-300/94 text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.20)]",
      badge: "bg-white/52 text-amber-900 ring-amber-400/25",
      detail: "text-amber-950/74",
          };
  }

  if (state === "retry") {
    return {
      row: "border-white/70 bg-gradient-to-r from-slate-100/94 to-white/86 text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.12)]",
      badge: "bg-slate-950/8 text-slate-700 ring-slate-400/20",
      detail: "text-slate-600",
          };
  }

  return {
    row: "border-emerald-300/75 bg-gradient-to-r from-emerald-300/86 to-green-300/80 text-slate-950 shadow-[0_14px_30px_rgba(16,185,129,0.18)]",
    badge: "bg-emerald-100/85 text-emerald-950 ring-emerald-700/10",
    detail: "text-emerald-950/70",
      };
}

function filterTone(filter: IntroFilter, active: boolean) {
  const base = "inline-flex h-11 w-full min-w-0 items-center justify-center gap-1 rounded-full px-2 text-[15px] font-black ring-1 transition";

  if (filter === "ready") {
    return active
      ? `${base} bg-emerald-300 text-slate-950 ring-emerald-100 shadow-lg shadow-emerald-900/10`
      : `${base} bg-emerald-300/58 text-slate-950 ring-white/34`;
  }

  if (filter === "required") {
    return active
      ? `${base} bg-rose-500 text-white ring-rose-200 shadow-lg shadow-rose-900/16`
      : `${base} bg-rose-500/72 text-white ring-white/28`;
  }

  if (filter === "extras") {
    return active
      ? `${base} bg-yellow-300 text-slate-950 ring-yellow-100 shadow-lg shadow-amber-900/12`
      : `${base} bg-yellow-300/72 text-slate-950 ring-white/28`;
  }

  if (filter === "retry") {
    return active
      ? `${base} bg-slate-800 text-white ring-white/22 shadow-lg shadow-slate-950/16`
      : `${base} bg-slate-800/72 text-white ring-white/22`;
  }

  // FoodTrio: All is the default teaching view, so give it a tiny visible selected ring.
  return active
    ? `${base} bg-slate-950 text-white ring-2 ring-white/80 shadow-[0_0_0_2px_rgba(15,23,42,0.10),0_12px_24px_rgba(15,23,42,0.16)]`
    : `${base} bg-slate-900/72 text-white ring-white/24`;
}

function statusIcon(filter: IntroFilter) {
  if (filter === "all") return "≡";
  return "";
}

function FoodTrioStatusFilter({
  filter,
  active,
  count,
  onClick,
}: {
  filter: IntroFilter;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-foodtrio-status-filter={filter}
      onClick={onClick}
      aria-label={`${filter} status filter`}
      className={filterTone(filter, active)}
    >
      {filter === "all" ? <span className="text-[22px] leading-none">{statusIcon(filter)}</span> : null}
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/22 px-1.5 text-[15px] leading-none ring-1 ring-white/20">
        {count}
      </span>
    </button>
  );
}

function displayRowLabel(row: IntroRow) {
  if (row.key === "green") return "Item 1";
  if (row.key === "required") return "Item 2";
  if (row.key === "extras") return "Item 3";
  return "Item 4";
}

function FoodTrioCartRow({ row, onClick }: { row: IntroRow; onClick: () => void }) {
  const tone = rowTone(row.state);

  return (
    <motion.button
      type="button"
      data-foodtrio-intro-row={row.key}
      data-tourbar-cart-line-state={row.selectorState}
      onClick={onClick}
      className={`group flex h-[48px] w-full items-center rounded-[18px] border px-4 py-0 text-left transition-colors duration-300 ${tone.row}`}
    >
      <div className="truncate text-[18px] font-black tracking-tight">{displayRowLabel(row)}</div>
    </motion.button>
  );
}

function FoodTrioOptionPanel({
  panel,
  optionalSelections,
  requiredSelection,
  retryText,
  retryTextVisible,
  onOptionalToggle,
  onRetryTextChange,
  onRequiredDone,
  onOptionalDone,
  onRetryDone,
  onClose,
}: {
  panel: IntroPanel;
  optionalSelections: Set<string>;
  requiredSelection: string | null;
  retryText: string;
  retryTextVisible: boolean;
  onOptionalToggle: (value: string) => void;
  onRetryTextChange: (value: string) => void;
  onRequiredDone: (value: string) => void;
  onOptionalDone: () => void;
  onRetryDone: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {panel ? (
        <motion.div
          key={panel.kind}
          data-tourbar-cart-action-panel={panel.kind === "required" ? "required" : panel.kind === "extras" ? "optional" : "retry"}
          initial={{ opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.985 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute left-5 right-5 top-[210px] z-30 rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(221,237,246,0.66)_54%,rgba(190,218,231,0.58))] p-2.5 shadow-[0_20px_48px_rgba(15,23,42,0.18),inset_0_1px_1px_rgba(255,255,255,0.76)] ring-1 ring-white/60 backdrop-blur-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-600">
              {panel.kind === "required" ? "Complete required choice" : panel.kind === "extras" ? "Choose extras" : "Retry item"}
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-slate-500 ring-1 ring-slate-200/70">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {panel.kind === "required" ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                ["small", "Small"],
                ["medium", "Medium"],
                ["large", "Large"],
              ].map(([value, label]) => {
                const selected = requiredSelection === value;

                return (
                  <button
                    key={value}
                    type="button"
                    data-tourbar-qualifier-option={value}
                    data-foodtrio-required-option={value}
                    onClick={() => onRequiredDone(value)}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-black shadow-sm ring-1 transition ${
                      selected
                        ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/16 ring-emerald-100"
                        : "bg-white text-slate-700 ring-white/80 hover:bg-emerald-50"
                    }`}
                  >
                    {selected ? "✓ " : ""}{label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {panel.kind === "extras" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["extra-sauce", "Extra sauce"],
                  ["crispy-addon", "Crispy add-on"],
                  ["no-onions", "No onions"],
                ].map(([value, label], index) => {
                  const selected = optionalSelections.has(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      data-tourbar-qualifier-option={value}
                      data-demo-active-option-index={index}
                      onClick={() => onOptionalToggle(value)}
                      className={`rounded-2xl px-3 py-2.5 text-sm font-black shadow-sm ring-1 transition ${
                        selected
                          ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/14 ring-emerald-100"
                          : "bg-white text-slate-700 ring-white/80 hover:bg-emerald-50"
                      }`}
                    >
                      {selected ? "✓ " : ""}{label}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  data-tourbar-options-done="true"
                  onClick={onOptionalDone}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/16 disabled:opacity-50"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}

          {panel.kind === "retry" ? (
            <div className="flex items-center gap-2 rounded-[22px] bg-white/82 px-3 py-2 ring-1 ring-white/60">
              <textarea
                data-tourbar-cart-retry-input="true"
                value={retryText || RETRY_PASTE_TEXT}
                data-foodtrio-retry-visible={retryTextVisible ? "true" : "false"}
                onChange={(event) => onRetryTextChange(event.target.value)}
                rows={1}
                className="min-h-10 flex-1 resize-none bg-transparent py-2 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                placeholder="Try another menu item..."
              />
              <button
                type="button"
                data-tourbar-cart-retry-submit="true"
                onClick={onRetryDone}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/14"
                aria-label="Retry item"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* FoodTrio intro geometry locked: filters teach, rows stay stable. */
function FoodTrioIntroGlassCart({
  phase,
  setPhase,
  actions,
  scriptedRetryText,
}: {
  phase: IntroCartPhase;
  setPhase: (phase: IntroCartPhase) => void;
  actions: TourBarShellActions;
  scriptedRetryText?: string;
}) {
  const [filter, setFilter] = useState<IntroFilter>("all");
  const [panel, setPanel] = useState<IntroPanel>(null);
  const [optionalSelections, setOptionalSelections] = useState(() => new Set<string>());
  const [requiredSelection, setRequiredSelection] = useState<string | null>(null);
  const [retryText, setRetryText] = useState("");
  const [retryTextVisible, setRetryTextVisible] = useState(false);
  const [checkoutThinking, setCheckoutThinking] = useState(false);

  useEffect(() => {
    if (scriptedRetryText !== undefined) setRetryText(scriptedRetryText);
  }, [scriptedRetryText]);

  const rows = useMemo(() => rowsForPhase(phase), [phase]);
  const counts = useMemo(() => statusCounts(rows), [rows]);
  const visibleRows = useMemo(() => filterRows(rows, "all"), [rows]);
  const openCount = counts.required + counts.extras + counts.retry;

  useEffect(() => {
    if (openCount > 0) setCheckoutThinking(false);
  }, [openCount]);

  const openPanelForRow = (row: IntroRow) => {
    if (row.state === "required") {
      setRequiredSelection(null);
      setPanel({ kind: "required" });
      return;
    }

    if (row.state === "extras") {
      setPanel({ kind: "extras" });
      return;
    }

    if (row.state === "retry") {
      // Preload the retry text invisibly, then reveal it by switching the text color.
      // This avoids fragile textarea typing/DOM mutation during the animation.
      setRetryText(scriptedRetryText || RETRY_PASTE_TEXT);
      setRetryTextVisible(false);
      setPanel({ kind: "retry" });
      window.setTimeout(() => setRetryTextVisible(true), 360);
    }
  };

  const resolveRequired = (value: string) => {
    setRequiredSelection(value);

    window.setTimeout(() => {
      setPanel(null);
      setPhase("redDone");
    }, 460);
  };

  const toggleOptional = (value: string) => {
    setOptionalSelections((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const resolveOptional = () => {
    setPanel(null);
    setPhase("yellowDone");
  };

  const resolveRetry = () => {
    setRetryTextVisible(false);
    setPanel(null);
    setPhase("grayDone");
  };

  const checkout = () => {
    if (openCount > 0 || checkoutThinking) return;

    setPhase("checkout");
    setCheckoutThinking(true);

    window.setTimeout(() => {
      actions.closeSheet();
    }, CHECKOUT_THINKING_MS);
  };

  return (
    <div data-foodtrio-glass-cart="true" className="mx-auto w-full max-w-[380px] p-0">
      <div className="relative h-[560px] overflow-hidden rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(248,252,255,0.80)_0%,rgba(199,224,236,0.50)_44%,rgba(150,185,202,0.54)_100%)] px-5 py-4 text-slate-950 shadow-[0_24px_68px_rgba(15,23,42,0.22),inset_0_1px_1px_rgba(255,255,255,0.72)] ring-1 ring-white/55 backdrop-blur-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="text-[23px] font-black tracking-tight text-slate-950">Review order</div>
          <div className="rounded-full bg-white/34 px-3 py-1.5 text-sm font-black text-white ring-1 ring-white/40">
            {openCount} open
          </div>
        </div>

        <div className="mb-3 grid grid-cols-5 gap-2">
          {(["all", "ready", "required", "extras", "retry"] as IntroFilter[]).map((item) => (
            <FoodTrioStatusFilter
              key={item}
              filter={item}
              count={counts[item]}
              active={filter === item}
              onClick={() => {
                setFilter(item);
                setPanel(null);
              }}
            />
          ))}
        </div>

        <div className="grid h-[216px] grid-rows-4 gap-2">
          <AnimatePresence initial={false}>
            {visibleRows.map((row) => (
              <FoodTrioCartRow key={row.key} row={row} onClick={() => openPanelForRow(row)} />
            ))}
          </AnimatePresence>
        </div>

        <FoodTrioOptionPanel
          panel={panel}
          optionalSelections={optionalSelections}
          requiredSelection={requiredSelection}
          retryText={retryText}
          retryTextVisible={retryTextVisible}
          onOptionalToggle={toggleOptional}
          onRetryTextChange={setRetryText}
          onRequiredDone={resolveRequired}
          onOptionalDone={resolveOptional}
          onRetryDone={resolveRetry}
          onClose={() => setPanel(null)}
        />

        <div className="absolute bottom-4 left-5 right-5 rounded-[25px] bg-[#1c267d] px-5 py-4 text-white shadow-[0_18px_42px_rgba(23,37,84,0.32)] ring-1 ring-white/20">
          <div className="text-[13px] font-black uppercase tracking-[0.16em] text-white/72">
            {openCount > 0 ? `${openCount} open` : "All set"}
          </div>
          <div className="mt-2 border-t border-white/18 pt-3 text-[20px] font-black">
            {openCount > 0 ? "Resolve colors" : "Ready for checkout"}
          </div>
          <button
            type="button"
            data-tourbar-order-cta="checkout"
            data-tourbar-order-checkout="true"
            data-tourbar-checkout-button="true"
            onClick={checkout}
            disabled={openCount > 0}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-black uppercase tracking-[0.12em] text-[#1c267d] shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/28 disabled:text-white/48 disabled:shadow-none"
          >
            {checkoutThinking ? <ThinkingText body="Checkout" /> : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FoodTrioIntroChromeStyles() {
  return (
    <style>{`
      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-open-panel="true"] {
        width: min(380px, calc(100vw - 72px)) !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] button[aria-label="Open FoodTrio intro SmartBar"] {
        background: #17227c !important;
        color: white !important;
        box-shadow: 0 18px 40px rgba(23,34,124,0.22), inset 0 1px 1px rgba(255,255,255,0.16) !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-open-panel="true"] > div > div:not([data-tourbar-sheet-panel]) > div {
        border-color: rgba(255,255,255,0.28) !important;
        background: linear-gradient(180deg, rgba(29,43,145,0.98), rgba(23,34,124,0.96)) !important;
        color: white !important;
        box-shadow: 0 24px 62px rgba(23,34,124,0.28), inset 0 1px 1px rgba(255,255,255,0.18) !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-open-panel="true"] textarea {
        color: white !important;
        font-weight: 800 !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-open-panel="true"] textarea::placeholder {
        color: rgba(255,255,255,0.48) !important;
      }

      /* FoodTrio intro gray retry box: preload the value in invisible white text,
         then flip only this retry box to dark text when the pointer is about to submit. */
      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-open-panel="true"] textarea[data-tourbar-cart-retry-input="true"] {
        color: white !important;
        caret-color: transparent !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-open-panel="true"] textarea[data-tourbar-cart-retry-input="true"][data-foodtrio-retry-visible="true"] {
        color: #0f172a !important;
        caret-color: #0f172a !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-smartbar-primary-submit="true"] {
        background: rgba(255,255,255,0.16) !important;
        color: white !important;
        box-shadow: inset 0 1px 1px rgba(255,255,255,0.22) !important;
      }

      /* FoodTrio intro: keep TourBarShell's native slide timing, but clip the outer
         sheet panel at the composer edge. That preserves the slide while making the
         visible origin read as inside the entry box instead of above it. */
      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-sheet-panel="true"] {
        max-height: none !important;
        overflow: hidden !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-sheet-panel="true"] > div {
        max-height: none !important;
        overflow: visible !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-sheet-panel="true"] > div > div {
        max-height: none !important;
        overflow: visible !important;
        background: transparent !important;
      }

      /* FoodTrio intro: TourBarShell's default desktop body has px-4 padding.
         The custom glass cart already owns its internal gutters, so remove that
         wrapper padding or the cart overflows right and clips the gutter. */
      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-sheet-panel="true"] > div > div > div:nth-child(2) {
        padding: 0 !important;
        overflow: visible !important;
      }

      [data-foodtrio-desktop-intro="true"] [data-smartbar-desktop-compass-chrome="true"] [data-tourbar-sheet-panel="true"] > div > div > div:first-child:not(:only-child) {
        display: none !important;
      }
    `}</style>
  );
}

export default function FoodTrioDesktopIntroAnimation({ onComplete }: { onComplete?: () => void }) {
  const [demoCommand, setDemoCommand] = useState<TourBarShellDemoCommand | null>(null);
  const [phase, setPhase] = useState<IntroCartPhase>("mixed");
  const [cards, setCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [fakePointer, setFakePointer] = useState<SmartBarFakePointerState | null>(null);
  const [scriptedRetryText, setScriptedRetryText] = useState("");
  const commandIdRef = useRef(0);
  const pointerIdRef = useRef(0);
  const cancelledRef = useRef(false);

  const issueCommand = useCallback((command: Omit<TourBarShellDemoCommand, "id">) => {
    const id = commandIdRef.current + 1;
    commandIdRef.current = id;
    setDemoCommand({ id, ...command });
  }, []);

  const movePointer = useCallback(async (selector: string, label?: string, click = false, anchorY = 0.5, preClickHoverMs = 0) => {
    let target: HTMLElement | null = null;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      target = document.querySelector<HTMLElement>(selector);
      if (target) break;
      await wait(90);
      if (cancelledRef.current) return null;
    }

    if (!target) return null;

    const pointerId = pointerIdRef.current + 1;
    pointerIdRef.current = pointerId;
    setFakePointer(
      makeSmartBarFakePointerState(target, {
        id: pointerId,
        label,
        anchorX: 0.52,
        anchorY,
      }),
    );

    await wait(POINTER_AIM_MS);
    if (cancelledRef.current) return target;

    if (click) {
      if (preClickHoverMs > 0) {
        await wait(preClickHoverMs);
        if (cancelledRef.current) return target;
      }

      setFakePointer((current) => (current?.id === pointerId ? { ...current, phase: "pulse" } : current));
      const clickTarget = target.closest("button") as HTMLElement | null;
      (clickTarget || target).click();
      await wait(POINTER_PULSE_MS);
    }

    return target;
  }, []);

  const parkPointerBelowCards = useCallback(async () => {
    const pointerId = pointerIdRef.current + 1;
    pointerIdRef.current = pointerId;
    const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;

    setFakePointer({
      id: pointerId,
      x: Math.max(40, Math.min(viewportWidth - 150, viewportWidth * 0.72)),
      y: Math.max(360, Math.min(viewportHeight - 105, viewportHeight * 0.78)),
      phase: "aim",
    });

    await wait(520);
  }, []);

  const setPrimaryText = useCallback(async (value: string) => {
    issueCommand({ type: "setPrimary", value: "" });
    await wait(80);
    for (let index = 1; index <= value.length; index += 1) {
      if (cancelledRef.current) return;
      issueCommand({ type: "setPrimary", value: value.slice(0, index) });
      await wait(TYPE_DELAY_MS);
    }
  }, [issueCommand]);

  const showCards = useCallback(async (nextCards: string[], baseId: string, holdMs = 1320) => {
    setCards([]);
    await wait(120);
    for (let index = 0; index < nextCards.length; index += 1) {
      if (cancelledRef.current) return;
      setCards((items) => [
        ...items,
        {
          id: `${baseId}-${index}`,
          variant: "prelude",
          title: nextCards[index],
          density: "normal",
        },
      ]);
      await wait(holdMs);
    }
    await wait(900);
    setCards([]);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    const run = async () => {
      await wait(520);
      if (cancelledRef.current) return;

      await movePointer('[data-smartbar-launcher-hotspot="true"]', "Open SmartBar", true);
      await wait(420);

      await setPrimaryText(FOOD_TRIO_PROMPT);
      await wait(220);

      setPhase("mixed");


      await movePointer('[data-smartbar-primary-submit="true"]', "Go", true, 0.58);


      // The click above submits through TourBarShell. Do not also force


      // showThinking/showResult, or the sheet gets double-driven and buckles.
      await wait(RESULT_AFTER_SUBMIT_SETTLE_MS);

      await showCards(["Cart built", "Colors tell you what to do"], "cart-built", 1120);

      await movePointer('[data-foodtrio-intro-row="required"]', "Red = requirements missing", true, 0.5, ITEM_TILE_PRE_CLICK_HOVER_MS);
      await wait(520);
      await movePointer('[data-foodtrio-required-option="medium"]', "Pick one", true);
      await wait(760);

      await movePointer('[data-foodtrio-intro-row="extras"]', "Yellow = extras available", true, 0.5, ITEM_TILE_PRE_CLICK_HOVER_MS);
      await wait(520);
      await movePointer('[data-demo-active-option-index="0"]', "Tap", true);
      await wait(320);
      await movePointer('[data-demo-active-option-index="1"]', "Tap", true);
      await wait(320);
      await movePointer('[data-tourbar-options-done="true"]', "Done", true);
      await wait(760);

      // Set the gray retry value before opening the overlay. The overlay preloads it
      // invisibly and then reveals it by switching the text color.
      setScriptedRetryText(RETRY_PASTE_TEXT);
      await movePointer('[data-foodtrio-intro-row="retry"]', "Gray = no match found", true, 0.5, ITEM_TILE_PRE_CLICK_HOVER_MS);
      await wait(720);
      await movePointer('[data-tourbar-cart-retry-submit="true"]', "Done", true);
      await wait(260);
      await parkPointerBelowCards();
      await wait(320);

      await showCards(["All-green", "All set for checkout"], "all-green", 1200);

      await movePointer('[data-tourbar-order-cta="checkout"]', "Checkout", true);

      // The checkout button owns the 3000ms ThinkingText beat and closes the sheet.
      await wait(CHECKOUT_THINKING_MS + 420);
      issueCommand({ type: "closeBar" });
      setFakePointer(null);
      await wait(160);
      onComplete?.();
    };

    const startTimer = window.setTimeout(() => {
      void run();
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      cancelledRef.current = true;
    };
  }, [issueCommand, movePointer, onComplete, parkPointerBelowCards, setPrimaryText, showCards]);

  const onPrimarySubmit = useCallback(async () => {
    await wait(THINKING_DELAY_MS);
    return makeResult(phase);
  }, [phase]);

  const onFollowUpSubmit = useCallback(async () => {
    await wait(240);
    return makeResult("checkout");
  }, []);

  const renderIntroCart = useCallback((_: TourBarShellResult, actions: TourBarShellActions) => {
    return (
      <FoodTrioIntroGlassCart
        phase={phase}
        setPhase={setPhase}
        actions={actions}
        scriptedRetryText={scriptedRetryText}
      />
    );
  }, [phase, scriptedRetryText]);

  const smartBarNode = (
    <TourBarShell
      appearance="light"
      desktopCompassChrome
      sheetRevealMode="composerClip"
      primaryPlaceholder="Enter order in plain English"
      followUpPlaceholder="Update the cart..."
      launcherTitle="FoodTrio SmartBar intro"
      launcherAriaLabel="Open FoodTrio intro SmartBar"
      resultEyebrow="FoodTrio cart"
      initialLoadingMessage="Building cart..."
      followUpLoadingMessage="Preparing checkout..."
      demoCommand={demoCommand}
      onPrimarySubmit={onPrimarySubmit}
      onFollowUpSubmit={onFollowUpSubmit}
      renderResultExtras={renderIntroCart}
      buildThreadMessage={(result) => result.title}
    />
  );

  return (
    <>
      <FoodTrioIntroChromeStyles />
      <motion.div
        data-foodtrio-desktop-intro="true"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6"
      >
        <SmartBarDemoToolbarFrame
          surface="ordering"
          placement="right"
          animateOptions={false}
          smartBarNode={<div className="pointer-events-auto">{smartBarNode}</div>}
        />
      </motion.div>

      <div className="pointer-events-none fixed inset-x-0 top-[44%] z-[10135] -translate-y-1/2">
        <SmartBarFlashCardStack cards={cards} mode="standard" />
      </div>

      <SmartBarFakePointerOverlay pointer={fakePointer} />
    </>
  );
}
