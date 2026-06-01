import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

/**
 * SmartBarMobileShell
 *
 * Mobile-only SmartBar Ordering lab shell.
 *
 * This is intentionally NOT wired into TourBarShell yet.
 *
 * Current experiment:
 * - SmartBar rests as a Safari-center-pill-sized launcher.
 * - Tapping the pill opens a matching prompt pill above it.
 * - After submit, the same lower pill becomes a status/footer surface.
 * - The prompt always builds a cart first, even with pending options/retries.
 * - Selecting a cart item shrinks the cart into an item-resolution surface.
 */

type SmartBarMobilePhase = "rest" | "entry" | "building_cart" | "action" | "cart";
type DemoOrderStatus = "ready" | "pending" | "options" | "unknown";

type DemoOrderLine = {
  id: string;
  title: string;
  status: DemoOrderStatus;
  helper: string;
  price: string;
  details: string[];
  options?: string[];
  retryPrompt?: string;
};

type DemoLineOverride = Partial<Pick<DemoOrderLine, "status" | "helper" | "price" | "details">>;

const demoLines: DemoOrderLine[] = [
  {
    id: "line-1",
    title: "2 Chili Dogs",
    status: "ready",
    helper: "Matched and ready",
    price: "$11.98",
    details: ["2 items", "Chili", "Regular buns"],
    options: ["Chili", "No onions", "Add cheese"],
  },
  {
    id: "line-2",
    title: "Fries",
    status: "pending",
    helper: "Choose a size",
    price: "$4.49",
    details: ["Size needed"],
    options: ["Small", "Medium", "Large"],
  },
  {
    id: "line-3",
    title: "Lemonade",
    status: "options",
    helper: "Options available",
    price: "$2.99",
    details: ["Medium suggested", "Ice normal"],
    options: ["Small", "Medium", "Large"],
  },
  {
    id: "line-4",
    title: "Chocolate shake",
    status: "unknown",
    helper: "Could not match item",
    price: "—",
    details: [],
    retryPrompt: "Re-enter the item so SmartBar can match it.",
  },
];

const estimatedTotal = "$19.46";

function statusLabel(status: DemoOrderStatus) {
  if (status === "ready") return "Ready";
  if (status === "pending") return "Pending";
  if (status === "options") return "Options?";
  return "Unknown";
}

function statusClass(status: DemoOrderStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (status === "pending") return "bg-rose-100 text-rose-900 ring-rose-200";
  if (status === "options") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-slate-200 text-slate-700 ring-slate-300";
}

function ThinkingText({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center justify-center whitespace-nowrap" aria-label={text}>
      {Array.from(text).map((character, index) => (
        <motion.span
          // eslint-disable-next-line react/no-array-index-key
          key={`${character}-${index}`}
          className="inline-block"
          animate={{ y: [0, -1.5, 0], opacity: [0.78, 1, 0.78] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.035,
          }}
        >
          {character === " " ? " " : character}
        </motion.span>
      ))}
    </span>
  );
}

export default function SmartBarMobileShell() {
  const [phase, setPhase] = useState<SmartBarMobilePhase>("rest");
  const [draft, setDraft] = useState("");
  const [hasEditedDraft, setHasEditedDraft] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [closeArmed, setCloseArmed] = useState(false);
  const closeArmTimeoutRef = useRef<number | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [lineOverrides, setLineOverrides] = useState<Record<string, DemoLineOverride>>({});
  const [stableViewportWidth] = useState(() => {
    if (typeof window === "undefined") return 390;

    return Math.round(
      window.innerWidth || document.documentElement.clientWidth || 390,
    );
  });
  const [stableViewportHeight] = useState(() => {
    if (typeof window === "undefined") return 844;

    return Math.round(
      window.innerHeight || document.documentElement.clientHeight || 844,
    );
  });

  const entryPillWidth = Math.min(Math.max(stableViewportWidth - 64, 240), 430);
  const cartTogglePillSize = 46;
  const safariControlLeftGap = 8;
  const safariControlRightGap = 8;
  const launcherPillWidth = Math.min(
    entryPillWidth -
      (cartTogglePillSize * 2) -
      safariControlLeftGap -
      safariControlRightGap,
    260,
  );
  const launcherPillLeft = cartTogglePillSize + safariControlLeftGap;
  const stretchPanelHeight = Math.max(360, stableViewportHeight - 128);

  const lines = useMemo(() => {
    return demoLines.map((line) => ({
      ...line,
      ...(lineOverrides[line.id] || {}),
    }));
  }, [lineOverrides]);

  const selectedLine = selectedLineId
    ? lines.find((line) => line.id === selectedLineId) || null
    : null;
  const issueCount = lines.filter((line) => line.status !== "ready").length;
  const checkoutReady = lines.length > 0 && issueCount === 0;
  const activeLine = selectedLine || lines.find((line) => line.status !== "ready") || null;
  const cartDetailHeight = selectedLine?.status === "unknown" ? 230 : 284;
  const upperPanelHeight = phase === "cart"
    ? cartExpanded ? selectedLine ? cartDetailHeight : stretchPanelHeight : 90
    : phase === "building_cart" ? 154 : 90;
  const upperPanelRadius = phase === "entry" || (phase === "cart" && !cartExpanded) ? 999 : 30;

  const clearCloseArmTimer = () => {
    if (closeArmTimeoutRef.current === null) return;

    window.clearTimeout(closeArmTimeoutRef.current);
    closeArmTimeoutRef.current = null;
  };

  const disarmClose = () => {
    clearCloseArmTimer();
    setCloseArmed(false);
  };

  useEffect(() => {
    return () => {
      clearCloseArmTimer();
    };
  }, []);

  const submitPrompt = () => {
    if (!draft.trim()) return;

    const activeElement = typeof document !== "undefined"
      ? document.activeElement as HTMLElement | null
      : null;
    activeElement?.blur?.();

    disarmClose();
    setSelectedLineId(null);
    setCartExpanded(true);
    setPhase("building_cart");
    window.setTimeout(() => {
      setPhase("cart");
    }, 1150);
  };

  const selectLine = (line: DemoOrderLine) => {
    disarmClose();
    setSelectedLineId(line.id);
    setCartExpanded(true);
    if (line.status === "unknown") {
      setDraft("");
      setHasEditedDraft(false);
    }
  };

  const applyLineChoice = (line: DemoOrderLine, value: string) => {
    disarmClose();
    setLineOverrides((current) => ({
      ...current,
      [line.id]: {
        ...(current[line.id] || {}),
        status: "ready",
        helper: `${value} selected`,
        details: Array.from(new Set([...(line.details || []), value])),
      },
    }));
    window.setTimeout(() => {
      setSelectedLineId(null);
      setCartExpanded(true);
    }, 240);
  };

  const submitRetry = () => {
    if (!selectedLine || selectedLine.status !== "unknown" || !draft.trim()) return;

    setLineOverrides((current) => ({
      ...current,
      [selectedLine.id]: {
        ...(current[selectedLine.id] || {}),
        status: "ready",
        title: selectedLine.title,
        helper: "Re-entered and matched",
        price: "$5.49",
        details: [draft.trim()],
      } as DemoLineOverride,
    }));
    setDraft("");
    setHasEditedDraft(false);
    disarmClose();
    window.setTimeout(() => {
      setSelectedLineId(null);
      setCartExpanded(true);
    }, 240);
  };

  const resetToRest = () => {
    setPhase("rest");
    setDraft("");
    setHasEditedDraft(false);
    disarmClose();
    setSelectedLineId(null);
    setCartExpanded(true);
  };

  const companionLabel = (() => {
    if (phase === "rest") return "SmartBar";
    if (closeArmed) return "Tap again...";
    if (phase === "entry") return hasEditedDraft && draft.trim() ? "Tap to submit" : "Type order";
    if (phase === "building_cart") return "Building cart...";
    if (phase === "cart" && selectedLine?.status === "unknown") return "Re-enter";
    if (phase === "cart" && selectedLine) return "Tap to reopen";
    if (phase === "cart") return checkoutReady ? "Tap for checkout" : `${issueCount} need attention`;
    if (checkoutReady) return `Ready checkout · ${estimatedTotal}`;
    return `${issueCount} need attention · ${estimatedTotal}`;
  })();

  const handleCompanionClick = () => {
    if (closeArmed) disarmClose();

    if (phase === "rest") {
      setPhase("entry");
      return;
    }

    if (phase === "entry") {
      submitPrompt();
      return;
    }

    if (phase === "building_cart") return;

    if (phase === "cart" && selectedLine?.status === "unknown") {
      submitRetry();
      return;
    }

    if (phase === "cart" && selectedLine) {
      setSelectedLineId(null);
      setCartExpanded(true);
      return;
    }

    if (phase === "cart") return;

    setPhase("cart");
  };

  const handleClosePillClick = () => {
    if (phase === "rest") return;

    if (closeArmed) {
      resetToRest();
      return;
    }

    setCloseArmed(true);
    clearCloseArmTimer();
    closeArmTimeoutRef.current = window.setTimeout(() => {
      closeArmTimeoutRef.current = null;
      setCloseArmed(false);
    }, 2000);
  };

  const handleCartToggleClick = () => {
    disarmClose();
    setCartExpanded((expanded) => !expanded);
  };

  const cartToggleShowsUp = !cartExpanded;

  return (
    <div className="fixed inset-0 z-[10080] overflow-hidden bg-[radial-gradient(circle_at_24%_16%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_84%_74%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(180deg,#07111f_0%,#020617_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:38px_38px]" />

      <main className="relative z-[1] h-full min-h-0 overflow-hidden pb-[88px]">
        <AnimatePresence mode="wait">
          {phase === "rest" && (
            <motion.section
              key="rest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex h-full items-end justify-center px-5 pb-[92px]"
            >
              <div className="max-w-[360px] rounded-[30px] border border-white/10 bg-white/[0.055] p-4 text-center shadow-2xl backdrop-blur-xl">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/16 text-emerald-200 ring-1 ring-emerald-200/25">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-lg font-black tracking-tight">
                  Order in plain English
                </div>
                <div className="mt-1 text-sm font-semibold leading-6 text-slate-300">
                  Tap the SmartBar pill to start a guided web order.
                </div>
              </div>
            </motion.section>
          )}

          {(phase === "entry" || phase === "building_cart" || phase === "cart") && (
            <motion.section
              key="upper-glass-panel"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-[76px] z-[10083] flex justify-center px-0"
            >
              <motion.div
                className="overflow-hidden border border-white/12 bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-xl"
                style={{ width: entryPillWidth }}
                animate={{ height: upperPanelHeight, borderRadius: upperPanelRadius }}
                transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {phase === "entry" && (
                    <motion.div
                      key="entry-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="h-full px-3 py-2"
                    >
                      <textarea
                        value={draft}
                        onChange={(event) => {
                          setDraft(event.target.value);
                          setHasEditedDraft(true);
                        }}
                        className="h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-transparent caret-white"
                        placeholder=""
                        autoFocus
                      />
                    </motion.div>
                  )}

                  {phase === "building_cart" && (
                    <motion.div
                      key="building-cart-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="h-full"
                      aria-hidden="true"
                    />
                  )}

                  {phase === "cart" && cartExpanded && selectedLine && (
                    <motion.div
                      key={`item-detail-${selectedLine.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex h-full min-h-0 flex-col p-4"
                    >
                      <div className="flex shrink-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-200">
                            {selectedLine.status === "unknown" ? "Retry item" : "Editing item"}
                          </div>
                          <div className={`mt-1 truncate text-xl font-black tracking-tight ${selectedLine.status === "unknown" ? "italic" : ""}`}>
                            {selectedLine.title}
                          </div>
                        </div>
                        <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${statusClass(selectedLine.status)}`}>
                          {statusLabel(selectedLine.status)}
                        </div>
                      </div>

                      {selectedLine.status === "unknown" ? (
                        <div className="mt-4 flex min-h-0 flex-1 flex-col">
                          <div className="text-sm font-semibold leading-5 text-white/62">
                            {selectedLine.retryPrompt || "Re-enter this item."}
                          </div>
                          <textarea
                            value={draft}
                            onChange={(event) => {
                              setDraft(event.target.value);
                              setHasEditedDraft(true);
                            }}
                            className="mt-3 h-[96px] w-full resize-none rounded-[26px] border border-white/10 bg-slate-950/28 px-4 py-3 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-white/28 caret-white"
                            placeholder=""
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                          <div className="text-[12px] font-black uppercase tracking-[0.14em] text-white/44">
                            Item page opened
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedLine.details.map((detail) => (
                              <button
                                key={detail}
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-300/90 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm"
                              >
                                <Check className="h-3.5 w-3.5" />
                                {detail}
                              </button>
                            ))}
                          </div>

                          {!!selectedLine.options?.length && (
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {selectedLine.options.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => applyLineChoice(selectedLine, option)}
                                  className="rounded-[22px] bg-white/88 px-3 py-3 text-sm font-black text-slate-950 shadow-lg"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {phase === "cart" && cartExpanded && !selectedLine && (
                    <motion.div
                      key="cart-content"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex h-full min-h-0 flex-col p-4"
                    >
                      <div className="flex shrink-0 items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                            {checkoutReady ? "Ready for checkout" : "Needs attention"}
                          </div>
                          <div className="mt-1 text-xl font-black tracking-tight">
                            Review order
                          </div>
                        </div>

                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${checkoutReady ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-white ring-1 ring-white/12"}`}>
                          {checkoutReady ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Complete
                            </>
                          ) : `${issueCount} open`}
                        </div>
                      </div>

                      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {lines.map((line) => (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => selectLine(line)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/44 p-3 text-left transition active:scale-[0.99]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={`truncate text-base font-black ${line.status === "unknown" ? "italic text-white/82" : ""}`}>
                                  {line.title}
                                </div>
                                <div className={`mt-1 text-sm font-semibold text-slate-300 ${line.status === "unknown" ? "italic" : ""}`}>
                                  {line.helper}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-sm font-black">{line.price}</div>
                                <div className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${statusClass(line.status)}`}>
                                  {statusLabel(line.status)}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.section>
          )}

          {phase === "action" && (
            <motion.section
              key="action"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex h-full flex-col justify-end px-4 pb-4"
            >
              <div className="mx-auto w-full max-w-[390px] rounded-[30px] border border-white/12 bg-white/[0.075] p-4 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                      Needs choice
                    </div>
                    <div className="mt-1 text-xl font-black tracking-tight">
                      {activeLine?.title || "Order ready"}
                    </div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-slate-300">
                      {activeLine?.helper || "Everything required is complete."}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right ring-1 ring-white/10">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Total
                    </div>
                    <div className="text-base font-black text-white">{estimatedTotal}</div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

        </AnimatePresence>
      </main>

      <footer className="fixed inset-x-0 bottom-3 z-[10084] flex justify-center px-0">
        <div
          className="relative h-[46px]"
          style={{ width: entryPillWidth }}
        >
          <AnimatePresence initial={false}>
            {phase !== "rest" && (
              <motion.button
                type="button"
                onClick={handleClosePillClick}
                className="absolute left-0 top-0 flex items-center justify-center rounded-full border border-white/12 bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-xl transition active:scale-[0.985]"
                style={{ width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={closeArmed ? "Tap again to close SmartBar" : "Close SmartBar"}
              >
                <X className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleCompanionClick}
            className={`absolute top-0 flex h-[46px] min-w-0 items-center rounded-full border border-white/12 bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-xl transition active:scale-[0.985] ${
              phase === "rest" ? "justify-between gap-2 px-2.5" : "justify-center px-4"
            }`}
            style={{ width: launcherPillWidth, left: launcherPillLeft }}
            aria-label={phase === "rest" ? "Open SmartBar" : companionLabel}
          >
            {phase === "rest" ? (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-sm ring-1 ring-white/10">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-center text-[16px] font-medium tracking-normal">
                  {companionLabel}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
              </>
            ) : closeArmed || phase === "building_cart" ? (
              <span className="min-w-0 truncate text-center text-[16px] font-medium tracking-normal">
                <ThinkingText text={companionLabel} />
              </span>
            ) : (
              <span className="min-w-0 truncate text-center text-[16px] font-medium tracking-normal">
                {companionLabel}
              </span>
            )}
          </button>

          <AnimatePresence initial={false}>
            {phase === "cart" && (
              <motion.button
                type="button"
                onClick={handleCartToggleClick}
                className="absolute right-0 top-0 flex items-center justify-center rounded-full border border-white/12 bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-xl transition active:scale-[0.985]"
                style={{ width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={cartExpanded ? "Collapse to entry box" : "Expand cart"}
              >
                {cartToggleShowsUp ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}
