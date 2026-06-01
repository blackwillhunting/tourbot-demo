import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

/**
 * SmartBarMobileShell
 *
 * First clean SmartBar Ordering mobile chassis.
 *
 * This is intentionally NOT wired into TourBarShell yet.
 * It is a safe clone target for the TourBot mobile pattern:
 *
 * prompt entry
 * -> prompt disappears
 * -> nav/action mode takes over
 * -> unresolved choices are handled with action tiles
 * -> complete orders open the cart
 */

type SmartBarMobilePhase = "entry" | "working" | "action" | "cart";

type DemoOrderLine = {
  id: string;
  title: string;
  status: "ready" | "needs_choice" | "unmatched";
  helper: string;
  price: string;
  options?: string[];
};

const demoLines: DemoOrderLine[] = [
  {
    id: "line-1",
    title: "2 Chili Dogs",
    status: "ready",
    helper: "Matched and ready",
    price: "$11.98",
  },
  {
    id: "line-2",
    title: "Fries",
    status: "ready",
    helper: "Matched and ready",
    price: "$4.49",
  },
  {
    id: "line-3",
    title: "Lemonade",
    status: "needs_choice",
    helper: "Choose a size",
    price: "$2.99",
    options: ["Small", "Medium", "Large"],
  },
];

function statusLabel(status: DemoOrderLine["status"]) {
  if (status === "ready") return "Ready";
  if (status === "needs_choice") return "Needs choice";
  return "Retry";
}

function statusClass(status: DemoOrderLine["status"]) {
  if (status === "ready") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (status === "needs_choice") return "bg-amber-100 text-amber-900 ring-amber-200";
  return "bg-rose-100 text-rose-900 ring-rose-200";
}

export default function SmartBarMobileShell() {
  const [phase, setPhase] = useState<SmartBarMobilePhase>("entry");
  const [draft, setDraft] = useState("Two chili dogs, fries, and a lemonade");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const lines = useMemo(() => {
    return demoLines.map((line) => {
      if (line.id !== "line-3" || !selectedSize) return line;
      return {
        ...line,
        status: "ready" as const,
        helper: `${selectedSize} selected`,
      };
    });
  }, [selectedSize]);

  const readyCount = lines.filter((line) => line.status === "ready").length;
  const needsChoiceCount = lines.filter((line) => line.status === "needs_choice").length;
  const unmatchedCount = lines.filter((line) => line.status === "unmatched").length;
  const checkoutReady = lines.length > 0 && needsChoiceCount === 0 && unmatchedCount === 0;
  const activeLine = lines.find((line) => line.status !== "ready") || null;

  const submitPrompt = () => {
    if (!draft.trim()) return;
    setPhase("working");
    window.setTimeout(() => {
      setPhase("action");
    }, 900);
  };

  const chooseOption = (value: string) => {
    setSelectedSize(value);
    window.setTimeout(() => {
      setPhase("cart");
    }, 260);
  };

  return (
    <div className="fixed inset-0 z-[10080] flex flex-col bg-slate-950 text-white">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
            SmartBar Ordering
          </div>
          <div className="mt-0.5 truncate text-base font-black tracking-tight">
            Mobile order mode
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10"
          aria-label="Close SmartBar mobile shell"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <main className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "entry" && (
            <motion.section
              key="entry"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex h-full flex-col justify-end px-4 pb-5"
            >
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tell us what you want
                </div>

                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-[110px] w-full resize-none rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-3 text-[16px] font-semibold leading-6 text-white outline-none placeholder:text-white/40"
                  placeholder="Example: two chili dogs, fries, and a lemonade..."
                />

                <button
                  type="button"
                  onClick={submitPrompt}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-base font-black text-slate-950 shadow-lg shadow-emerald-950/30"
                >
                  Build my order
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>
            </motion.section>
          )}

          {phase === "working" && (
            <motion.section
              key="working"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex h-full items-end px-4 pb-5"
            >
              <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                  Working
                </div>
                <div className="mt-2 text-xl font-black tracking-tight">
                  Reading the order
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  Matching items, checking required choices, and preparing the next step.
                </div>
              </div>
            </motion.section>
          )}

          {phase === "action" && (
            <motion.section
              key="action"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex h-full flex-col justify-end px-4 pb-5"
            >
              <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">
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
                    <div className="text-base font-black text-white">$19.46</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(activeLine?.options || []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseOption(option)}
                      className="rounded-2xl bg-white px-3 py-3 text-sm font-black text-slate-950 shadow-lg"
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPhase("cart")}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white"
                >
                  <ShoppingBag className="h-4 w-4" />
                  View cart
                </button>
              </div>
            </motion.section>
          )}

          {phase === "cart" && (
            <motion.section
              key="cart"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex h-full flex-col px-4 pb-5 pt-4"
            >
              <div className="min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                      {checkoutReady ? "Ready for checkout" : "Almost ready"}
                    </div>
                    <div className="mt-1 text-xl font-black tracking-tight">
                      Review order
                    </div>
                  </div>

                  {checkoutReady && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-300 px-2.5 py-1 text-xs font-black text-slate-950">
                      <Check className="h-3.5 w-3.5" />
                      Complete
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black">
                            {line.title}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-300">
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
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="shrink-0 border-t border-white/10 bg-slate-950 px-3 py-3">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setPhase(phase === "entry" ? "entry" : "action")}
            className="rounded-2xl bg-white/10 px-2 py-2.5 text-xs font-black text-white ring-1 ring-white/10"
          >
            <ArrowLeft className="mx-auto mb-1 h-4 w-4" />
            Back
          </button>

          <div className="rounded-2xl bg-white/10 px-2 py-2.5 text-center text-xs font-black text-white ring-1 ring-white/10">
            <div className="text-emerald-300">{readyCount}</div>
            Ready
          </div>

          <div className="rounded-2xl bg-white/10 px-2 py-2.5 text-center text-xs font-black text-white ring-1 ring-white/10">
            <div className="text-amber-300">{needsChoiceCount + unmatchedCount}</div>
            Needs
          </div>

          <button
            type="button"
            onClick={() => setPhase("cart")}
            className="rounded-2xl bg-emerald-400 px-2 py-2.5 text-xs font-black text-slate-950"
          >
            <ShoppingBag className="mx-auto mb-1 h-4 w-4" />
            Cart
          </button>
        </div>
      </footer>
    </div>
  );
}
