import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock3, ReceiptText, X } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileApplyChoiceMeta,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../smartbar-mobile/SmartBarMobileShell";

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
  if (!lines.length) return "Test ticket";
  if (lines.length === 1) return lines[0].title;
  return `${lines[0].title} +${lines.length - 1}`;
}

function createPlaygroundOrderResult(query: string): SmartBarMobileOrderResult {
  const cleanQuery = query.replace(/\s+/g, " ").trim();
  const queryHint = cleanQuery ? [`Heard: “${cleanQuery}”`] : [];

  return {
    lines: [
      {
        id: "playground-large-pepperoni",
        cartLineKey: "playground-large-pepperoni",
        title: "Large Pepperoni Pizza",
        status: "ready",
        helper: "Matched and ready",
        price: "$18.99",
        details: ["Well done", ...queryHint],
        options: ["Extra cheese", "Light sauce", "Half pepperoni"],
        optionSelectionMode: "multi",
      },
      {
        id: "playground-buffalo-wings",
        cartLineKey: "playground-buffalo-wings",
        title: "Buffalo Wings",
        status: "options",
        helper: "Options available",
        price: "$11.99",
        details: ["10 pieces"],
        options: ["Mild", "Hot", "Ranch", "Blue cheese"],
        optionSelectionMode: "multi",
      },
      {
        id: "playground-caesar-salad",
        cartLineKey: "playground-caesar-salad",
        title: "Caesar Salad",
        status: "pending",
        helper: "Choose croutons",
        price: "$8.49",
        details: ["Choice needed"],
        options: ["Croutons", "No croutons"],
        optionSelectionMode: "single",
      },
      {
        id: "playground-gar-stix",
        cartLineKey: "playground-gar-stix",
        title: "gar-stix",
        status: "unknown",
        helper: "Needs menu match",
        price: "-",
        details: ["Unknown item"],
        options: ["Map item", "Remove"],
        optionSelectionMode: "single",
      },
    ],
    estimatedSubtotal: "$39.47",
    estimatedTax: "$3.16",
    estimatedTotal: "$42.63",
  };
}

function applyChoiceToLines(
  lines: SmartBarMobileOrderLine[],
  selectedLine: SmartBarMobileOrderLine,
  value: string,
  meta?: SmartBarMobileApplyChoiceMeta,
): SmartBarMobileOrderLine[] {
  return lines.map((line) => {
    if (line.id !== selectedLine.id) return line;

    const nextDetails = new Set(line.details || []);
    if (meta?.selected === false) {
      nextDetails.delete(value);
    } else {
      nextDetails.add(value);
    }

    return {
      ...line,
      status: "ready",
      helper: "Choice captured",
      details: Array.from(nextDetails),
    };
  });
}

function removeLine(lines: SmartBarMobileOrderLine[], removedLine: SmartBarMobileOrderLine) {
  return lines.filter((line) => line.id !== removedLine.id);
}

function createTicketFromResult(
  result: SmartBarMobileOrderResult,
  rawOrder: string,
  sequence: number,
): PlaygroundTicket {
  const ticketId = `T-${String(sequence).padStart(3, "0")}`;

  return {
    id: ticketId,
    label: compactTicketLabel(result.lines),
    rawOrder,
    statusLabel: result.lines.some((line) => line.status === "pending" || line.status === "unknown")
      ? "Review"
      : result.lines.some((line) => line.status === "options")
        ? "Options"
        : "Ready",
    total: result.estimatedTotal || "—",
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
  const orderLinesRef = useRef<SmartBarMobileOrderLine[]>([]);
  const estimatedTotalRef = useRef("—");
  const latestPromptRef = useRef("");
  const ticketSequenceRef = useRef(184);

  const [tickets, setTickets] = useState<PlaygroundTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<PlaygroundTicket | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const forceSampleCart = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("playgroundCart") === "1";
  }, []);

  const forcedCartSubmission = useMemo(() => (
    forceSampleCart
      ? {
          id: 9001,
          query: "large pepperoni well done, buffalo wings, caesar salad, gar-stix",
          typing: false,
          submitDelayMs: 0,
        }
      : null
  ), [forceSampleCart]);

  const ticketSlots = useMemo(() => {
    const visibleTickets = tickets.slice(0, 4);
    return [...visibleTickets, ...Array(Math.max(0, 4 - visibleTickets.length)).fill(null)] as Array<PlaygroundTicket | null>;
  }, [tickets]);

  const compactOrderRail = forceSampleCart || cartOpen;

  const handleSubmitPrompt = useCallback((query: string, _meta?: SmartBarMobileSubmitMeta) => {
    latestPromptRef.current = query;
    const result = createPlaygroundOrderResult(query);
    setCartOpen(true);
    orderLinesRef.current = result.lines;
    estimatedTotalRef.current = result.estimatedTotal || "—";
    return result;
  }, []);

  const handleApplyLineChoice = useCallback((
    line: SmartBarMobileOrderLine,
    value: string,
    meta?: SmartBarMobileApplyChoiceMeta,
  ) => {
    const nextLines = applyChoiceToLines(orderLinesRef.current, line, value, meta);
    orderLinesRef.current = nextLines;

    return {
      lines: nextLines,
      estimatedTotal: estimatedTotalRef.current,
    };
  }, []);

  const handleRemoveLine = useCallback((line: SmartBarMobileOrderLine) => {
    const nextLines = removeLine(orderLinesRef.current, line);
    orderLinesRef.current = nextLines;

    return {
      lines: nextLines,
      estimatedTotal: nextLines.length ? estimatedTotalRef.current : "—",
    };
  }, []);

  const handleCartReady = useCallback((result: SmartBarMobileOrderResult) => {
    setCartOpen(true);
    const nextTicket = createTicketFromResult(
      result,
      latestPromptRef.current || "Test order",
      ticketSequenceRef.current,
    );
    ticketSequenceRef.current += 1;

    setTickets((current) => [nextTicket, ...current.filter((ticket) => ticket.id !== nextTicket.id)].slice(0, 4));
  }, []);

  const handleResetCart = useCallback(() => {
    orderLinesRef.current = [];
    estimatedTotalRef.current = "-";
    latestPromptRef.current = "";
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
              {tickets.length ? `${tickets.length} shown` : "Waiting"}
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
            demoTransitionShield
            introCallout={{
              title: "Say or type an order",
            }}
            demoRestCompanion={{ label: "SmartBar", showLogo: true }}
            entryModeLabel="Say or type order"
            sendOrderNumber="T-184"
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
                            {(line.details || []).slice(0, 3).join(" • ") || line.helper}
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
