import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";

type SmartBarOrderBoardItemStatus = "new" | "entered";
type SmartBarOrderBoardScore = "ready" | "needs_fix";

export type SmartBarOrderBoardMockProps = {
  demoMode?: boolean;
  /** Social reel portrait mode: large 2x2 board and big readable ticket. */
  demoSocialPortrait?: boolean;
  /** Walkthrough board mode: tighter portrait grid so six tiles fit without clipping. */
  demoCompactBoard?: boolean;
  /** Playground board mode: compact 2x2 board for four visible ticket tiles. */
  demoFourTileBoard?: boolean;
  /** Playground collapsed mode: use very flat tiles so the minimized board is not clipped. */
  demoFlatBoardTiles?: boolean;
  /** Playground mode: animate newly injected orders instead of popping them in. */
  demoAnimateIncomingOrders?: boolean;
  /** Playground mode: let the ticket sheet own the screen instead of staying inside the board frame. */
  demoPlaygroundSheet?: boolean;
  /** Playground mode: let the parent stage render the ticket sheet above the whole phone frame. */
  onDemoOpenOrder?: (order: SmartBarOrderBoardItem) => void;
  demoMaxVisibleOrders?: number;
  demoRevealOrderId?: string;
  demoRevealDelayMs?: number;
  demoAutoOpenOrderId?: string;
  demoAutoOpenKey?: string;
  demoAutoOpenDelayMs?: number;
  /** Walkthrough mode: show the standard owned tap cue on a tile before auto-opening it. */
  demoShowAutoOpenCue?: boolean;
  /** Walkthrough mode: keep the sheet inside the board scene instead of the full viewport. */
  demoContainedSheet?: boolean;
  /** Walkthrough mode: start with a ticket already open, preserving the prior slide final state. */
  demoInitialOpenOrderId?: string;
  /** Walkthrough mode: show the standard tap cue on the handled action before auto-marking. */
  demoShowAutoMarkEnteredCue?: boolean;
  /** Walkthrough mode: override the visible staff action label. */
  demoMarkEnteredLabel?: string;
  demoAutoMarkEnteredOrderId?: string;
  demoAutoMarkEnteredKey?: string;
  demoAutoMarkEnteredDelayMs?: number;
  demoOrders?: SmartBarOrderBoardItem[];
  className?: string;
  onDemoEntered?: (orderId: string) => void;
};

export type SmartBarOrderBoardItem = {
  id: string;
  minutesAgo: number;
  status: SmartBarOrderBoardItemStatus;
  customer: string;
  phone: string;
  pickup: string;
  itemCount: number;
  groups: {
    title: string;
    items: {
      quantity: number;
      name: string;
      details?: string[];
    }[];
  }[];
  notes?: string;
  score?: SmartBarOrderBoardScore;
  scoreNote?: string;
  clientId?: string;
  vendorId?: string;
  displayName?: string;
  menuProfileId?: string;
  behaviorProfileId?: string;
  boardProfileId?: string;
  timezone?: string;
};

const INITIAL_ORDERS: SmartBarOrderBoardItem[] = [
  {
    id: "S-187",
    minutesAgo: 0,
    status: "new",
    customer: "Sam",
    phone: "202-555-0191",
    pickup: "ASAP",
    itemCount: 3,
    groups: [
      {
        title: "Pizza",
        items: [{ quantity: 1, name: "Large pepperoni", details: ["Half no cheese"] }],
      },
      {
        title: "Sides",
        items: [{ quantity: 1, name: "Wings", details: ["Mumbo sauce"] }],
      },
      {
        title: "Drinks",
        items: [{ quantity: 1, name: "Ginger beer" }],
      },
    ],
  },
  {
    id: "S-184",
    minutesAgo: 2,
    status: "new",
    customer: "SmartBar",
    phone: "202-555-0184",
    pickup: "ASAP",
    itemCount: 4,
    groups: [
      {
        title: "Mains",
        items: [{ quantity: 1, name: "Classic burger combo", details: ["Diet Coke"] }],
      },
      {
        title: "Sides",
        items: [{ quantity: 1, name: "Medium fries" }],
      },
      {
        title: "Dessert",
        items: [
          { quantity: 1, name: "Chocolate shake", details: ["Whipped cream", "Cherry"] },
          { quantity: 1, name: "Chocolate sundae" },
        ],
      },
    ],
    notes: "Customer will pay at pickup.",
  },
  {
    id: "S-185",
    minutesAgo: 4,
    status: "new",
    customer: "Maya",
    phone: "202-555-0177",
    pickup: "12:45 PM",
    itemCount: 4,
    groups: [
      {
        title: "Mains",
        items: [
          {
            quantity: 1,
            name: "Jerk chicken dinner",
            details: ["Rice and peas", "Cabbage"],
          },
          {
            quantity: 1,
            name: "Curry chicken dinner",
            details: ["White rice", "Plantains"],
          },
        ],
      },
      {
        title: "Sides",
        items: [{ quantity: 1, name: "Mac and cheese" }],
      },
      {
        title: "Drinks",
        items: [{ quantity: 1, name: "Sorrel" }],
      },
    ],
  },
  {
    id: "S-186",
    minutesAgo: 7,
    status: "new",
    customer: "Dana",
    phone: "202-555-0104",
    pickup: "ASAP",
    itemCount: 5,
    groups: [
      {
        title: "Appetizers",
        items: [{ quantity: 1, name: "Avocado Eggrolls" }],
      },
      {
        title: "Salads",
        items: [{ quantity: 2, name: "Dinner Salads" }],
      },
      {
        title: "Entrees",
        items: [
          { quantity: 1, name: "Chicken Madeira", details: ["Mashed potatoes", "Extra mushroom sauce"] },
          { quantity: 1, name: "Herb-Crusted Salmon", details: ["Asparagus", "Sauce on side"] },
        ],
      },
      {
        title: "Desserts",
        items: [{ quantity: 1, name: "Original Cheesecake", details: ["Whipped cream", "Extra whipped cream"] }],
      },
    ],
  },
  {
    id: "S-181",
    minutesAgo: 22,
    status: "entered",
    customer: "Andre",
    phone: "202-555-0189",
    pickup: "12:20 PM",
    itemCount: 5,
    groups: [
      {
        title: "Sandwiches",
        items: [{ quantity: 2, name: "Cheeseburger", details: ["No pickles"] }],
      },
      {
        title: "Sides",
        items: [{ quantity: 2, name: "Fries" }],
      },
      {
        title: "Drinks",
        items: [{ quantity: 1, name: "Cola" }],
      },
    ],
  },
  {
    id: "S-179",
    minutesAgo: 35,
    status: "entered",
    customer: "Lee",
    phone: "202-555-0130",
    pickup: "12:05 PM",
    itemCount: 2,
    groups: [
      {
        title: "Mains",
        items: [{ quantity: 1, name: "Chicken bowl", details: ["Extra sauce"] }],
      },
      {
        title: "Drinks",
        items: [{ quantity: 1, name: "Water" }],
      },
    ],
  },
];

function timeLabel(minutesAgo: number) {
  if (minutesAgo <= 1) return "just now";
  return `${minutesAgo} min ago`;
}

function smartBarOrderBoardOrderNumber(orderId: string) {
  const match = String(orderId || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function SmartBarOrderTile({
  order,
  onOpen,
  demoSocialPortrait = false,
  demoCompactBoard = false,
  demoFourTileBoard = false,
  demoFlatBoardTiles = false,
  demoTapCue = false,
}: {
  order: SmartBarOrderBoardItem;
  onOpen: (order: SmartBarOrderBoardItem) => void;
  demoSocialPortrait?: boolean;
  demoCompactBoard?: boolean;
  demoFourTileBoard?: boolean;
  demoFlatBoardTiles?: boolean;
  demoTapCue?: boolean;
}) {
  const isNew = order.status === "new";
  const tileStatusLabel = order.score ? (order.score === "ready" ? "Ready" : "Needs fix") : `${order.itemCount} items`;

  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      data-smartbar-order-board-tile={order.id}
      data-smartbar-order-board-status={order.status}
      className={[
        demoSocialPortrait
          ? demoFlatBoardTiles
            ? "group relative h-[1.25rem] w-full rounded-[10px] px-2 py-0 text-center transition"
            : demoFourTileBoard
              ? "group relative h-[4.75rem] w-full rounded-[20px] p-1.5 text-center transition"
              : demoCompactBoard
                ? "group relative h-[7.85rem] w-full rounded-[24px] p-2 text-center transition"
                : "group relative h-[9.3rem] w-full rounded-[28px] p-2.5 text-center transition"
          : "group relative h-[11.75rem] w-[11.75rem] rounded-[28px] p-3 text-center transition max-[430px]:h-[10.25rem] max-[430px]:w-[10.25rem]",
        isNew
          ? "bg-white text-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.12)] ring-1 ring-white/80 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.16)]"
          : "bg-transparent text-slate-400 shadow-none ring-0",
      ].join(" ")}
      aria-label={`Open SmartBar order ${order.id}`}
    >
      {demoFlatBoardTiles ? (
        <span className="flex h-full min-w-0 items-center justify-between gap-1.5 px-0.5">
          <span className="min-w-0 shrink-0 text-[0.72rem] font-black leading-none tracking-[-0.02em]">{order.id}</span>
          <span className="min-w-0 truncate text-[0.42rem] font-black uppercase leading-none tracking-[0.09em] text-slate-400">
            {isNew ? tileStatusLabel : "Entered"}
          </span>
        </span>
      ) : (
        <span className="flex h-full flex-col items-center justify-center">
          <span className={demoSocialPortrait ? demoFourTileBoard ? "text-[1.35rem] font-black tracking-tight" : demoCompactBoard ? "text-[1.86rem] font-black tracking-tight" : "text-[2.2rem] font-black tracking-tight" : "text-[clamp(1.35rem,4.8vw,2.7rem)] font-black tracking-tight"}>{order.id}</span>
          <span className={demoSocialPortrait ? demoFourTileBoard ? "mt-0 text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-slate-400" : demoCompactBoard ? "mt-0 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400" : "mt-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-slate-400" : "mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"}>
            {isNew ? timeLabel(order.minutesAgo) : "entered"}
          </span>
          {isNew ? (
            <span className={demoSocialPortrait ? demoFourTileBoard ? "mt-0 text-[0.52rem] font-semibold uppercase tracking-[0.10em] text-slate-400" : demoCompactBoard ? "mt-0 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-400" : "mt-0 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-slate-400" : "mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"}>
              {tileStatusLabel}
            </span>
          ) : null}
        </span>
      )}
      {demoTapCue ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#012169] bg-white/62 shadow-[0_12px_28px_rgba(1,33,105,0.16)] ring-4 ring-white/72 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <motion.span
            className="absolute inset-[-9px] rounded-full border-2 border-[#012169]/70"
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: [0, 0.72, 0], scale: [0.72, 1.18, 1.52] }}
            transition={{ duration: 0.72, ease: "easeOut", times: [0, 0.32, 1] }}
          />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
        </motion.span>
      ) : null}
    </button>
  );
}

export function SmartBarOrderSheet({
  order,
  onClose,
  onMarkEntered,
  onScoreOrder,
  demoSocialPortrait = false,
  demoContainedSheet = false,
  demoPlaygroundSheet = false,
  demoMarkEnteredLabel = "Entered",
  demoMarkEnteredCue = false,
}: {
  order: SmartBarOrderBoardItem;
  onClose: () => void;
  onMarkEntered: (orderId: string) => void;
  onScoreOrder?: (orderId: string, score: SmartBarOrderBoardScore, note?: string) => void;
  demoSocialPortrait?: boolean;
  demoContainedSheet?: boolean;
  demoPlaygroundSheet?: boolean;
  demoMarkEnteredLabel?: string;
  demoMarkEnteredCue?: boolean;
}) {
  const [isSwipingDone, setIsSwipingDone] = useState(false);
  const [fixNote, setFixNote] = useState(order.scoreNote || "");
  const [fixOpen, setFixOpen] = useState(order.score === "needs_fix");
  const isNew = order.status === "new";
  const scoreLabel = order.score === "ready" ? "Ready" : order.score === "needs_fix" ? "Needs Fix" : null;

  useEffect(() => {
    setFixNote(order.scoreNote || "");
    setFixOpen(order.score === "needs_fix");
  }, [order.id, order.score, order.scoreNote]);

  return (
    <AnimatePresence>
      <motion.div
        className={demoPlaygroundSheet
          ? "absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/18 px-3 py-4 backdrop-blur-[2px]"
          : demoContainedSheet
            ? "absolute inset-0 z-50 flex items-center justify-center bg-slate-950/14 px-3 py-3 backdrop-blur-[2px]"
            : demoSocialPortrait
              ? "fixed z-50 flex items-center justify-center bg-slate-950/18 px-2 py-2 backdrop-blur-[2px]"
              : "fixed inset-0 z-50 flex items-end justify-center bg-slate-950/20 px-3 pb-3 backdrop-blur-[2px]"
        }
        style={!demoPlaygroundSheet && !demoContainedSheet && demoSocialPortrait ? { left: -10, right: -10, top: -72, bottom: -126 } : undefined}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label={`SmartBar order ${order.id}`}
          data-smartbar-order-board-sheet="true"
          className={[
            demoPlaygroundSheet
              ? "relative h-[min(560px,calc(100%-2rem))] w-[calc(100%-1.5rem)] max-w-[398px] overflow-hidden rounded-[32px] border border-white/70"
              : demoContainedSheet
                ? "relative h-full max-h-full w-full max-w-[26rem] overflow-hidden rounded-[28px] border border-white/70"
                : demoSocialPortrait
                  ? "relative h-[92%] max-h-[620px] w-full max-w-none overflow-hidden rounded-[32px] border border-white/70"
                  : "relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/70",
            "shadow-[0_30px_90px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/5",
            isSwipingDone ? "bg-slate-200" : "bg-white",
          ].join(" ")}
          initial={demoPlaygroundSheet
            ? { opacity: 0, y: 34, scale: 0.94 }
            : demoContainedSheet || demoSocialPortrait ? { opacity: 0, y: 24, scale: demoContainedSheet ? 0.88 : 0.70 } : { y: "110%" }}
          animate={demoPlaygroundSheet
            ? { opacity: 1, y: isSwipingDone ? -18 : 0, scale: isSwipingDone ? 0.96 : 1 }
            : demoContainedSheet || demoSocialPortrait
              ? { opacity: 1, y: isSwipingDone ? -18 : 0, scale: isSwipingDone ? 0.96 : 1 }
              : { y: isSwipingDone ? -96 : 0, scale: isSwipingDone ? 0.985 : 1 }}
          exit={demoPlaygroundSheet
            ? { opacity: 0, y: 34, scale: 0.94 }
            : demoContainedSheet || demoSocialPortrait ? { opacity: 0, y: 24, scale: demoContainedSheet ? 0.9 : 0.72 } : { y: "110%" }}
          drag={isNew ? "y" : false}
          dragConstraints={{ top: -150, bottom: 130 }}
          dragElastic={{ top: 0.18, bottom: 0.22 }}
          onDrag={(_, info) => setIsSwipingDone(info.offset.y < -70)}
          onDragEnd={(_, info) => {
            if (info.offset.y < -90 || info.velocity.y < -600) {
              onMarkEntered(order.id);
              return;
            }

            if (info.offset.y > 110 || info.velocity.y > 700) {
              onClose();
              return;
            }

            setIsSwipingDone(false);
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            data-smartbar-order-board-demo-entered-target="true"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => {
              if (!isNew) return;
              setIsSwipingDone(true);
              window.setTimeout(() => onMarkEntered(order.id), 260);
            }}
            className="absolute inset-x-10 bottom-6 z-10 h-24 rounded-[28px] opacity-0"
          />

          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-300" />

          <div className={demoContainedSheet ? "flex items-start justify-between gap-3 px-4 pb-2 pt-3" : demoSocialPortrait ? "flex items-start justify-between gap-3 px-4 pb-3 pt-4" : "flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7"}>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-[0.26em] text-sky-600">SmartBar Order</div>
              <div className={demoSocialPortrait ? "mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" : "mt-1 flex items-baseline gap-3"}>
                <h1 className={demoContainedSheet ? "shrink-0 whitespace-nowrap text-[2.2rem] font-black leading-none tracking-[-0.055em] text-slate-950" : demoSocialPortrait ? "shrink-0 whitespace-nowrap text-[3.05rem] font-black leading-none tracking-[-0.06em] text-slate-950" : "text-4xl font-black tracking-tight text-slate-950"}>{order.id}</h1>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {order.status === "new" ? "New ticket" : "Entered"}
                </span>
                {scoreLabel ? (
                  <span className={[
                    "shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]",
                    order.score === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                  ].join(" ")}>
                    {scoreLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-500">
                {timeLabel(order.minutesAgo)} - {order.pickup} - Pay at counter
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={demoSocialPortrait ? "shrink-0 rounded-full bg-slate-100 p-2.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" : "rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"}
              aria-label="Close order ticket"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={demoContainedSheet ? "max-h-[calc(100%-108px)] overflow-y-auto px-4 pb-3" : demoSocialPortrait ? "max-h-[calc(100%-124px)] overflow-y-auto px-4 pb-3" : "max-h-[70svh] overflow-y-auto px-5 pb-3 sm:px-7"}>
            <div className="flex flex-wrap content-start gap-2">
              {order.groups.flatMap((group) =>
                group.items.map((item, index) => (
                  <section
                    key={`${group.title}-${item.name}-${index}`}
                    className={demoSocialPortrait
                      ? "w-full max-w-full rounded-[18px] bg-white px-3.5 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
                      : "w-fit max-w-full rounded-[18px] bg-white px-3 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
                    }
                  >
                    <div className="flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-400">
                        {group.title}
                      </span>
                      <span className="text-[0.95rem] font-black text-sky-700">{item.quantity}x</span>
                      <span className="text-[0.95rem] font-black text-slate-950">{item.name}</span>
                    </div>
                    {item.details?.length ? (
                      <div className="mt-1 flex max-w-full flex-wrap gap-1 pl-0 text-[0.7rem] font-bold leading-none text-slate-500">
                        {item.details.map((detail) => (
                          <span key={detail} className="rounded-full bg-slate-50 px-2 py-1">
                            {detail}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </section>
                )),
              )}
            </div>

            <div className={demoSocialPortrait ? "mt-3 rounded-[22px] bg-slate-50/88 px-3 py-3 ring-1 ring-slate-100" : "mt-4 rounded-[24px] bg-slate-50/88 px-4 py-4 ring-1 ring-slate-100"}>
              <div className="text-[0.72rem] font-black uppercase tracking-[0.22em] text-slate-500">How did SmartBar do?</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFixOpen(false);
                    setFixNote("");
                    onScoreOrder?.(order.id, "ready", "");
                  }}
                  className={[
                    "rounded-full px-3 py-2 text-sm font-black transition",
                    order.score === "ready"
                      ? "bg-emerald-400 text-slate-950 shadow-[0_10px_24px_rgba(16,185,129,0.20)]"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700",
                  ].join(" ")}
                >
                  Ready
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFixOpen(true);
                    onScoreOrder?.(order.id, "needs_fix", fixNote);
                  }}
                  className={[
                    "rounded-full px-3 py-2 text-sm font-black transition",
                    order.score === "needs_fix"
                      ? "bg-rose-500 text-white shadow-[0_10px_24px_rgba(244,63,94,0.20)]"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700",
                  ].join(" ")}
                >
                  Needs Fix
                </button>
              </div>
              {fixOpen ? (
                <div className="mt-3">
                  <textarea
                    value={fixNote}
                    onChange={(event) => setFixNote(event.target.value)}
                    placeholder="What needs fixing?"
                    className="min-h-[72px] w-full resize-none rounded-[18px] bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-200"
                  />
                  <button
                    type="button"
                    onClick={() => onScoreOrder?.(order.id, "needs_fix", fixNote)}
                    className="mt-2 w-full rounded-full bg-slate-950 px-3 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
                  >
                    Save note
                  </button>
                </div>
              ) : null}
              {order.score ? (
                <div className="mt-2 text-xs font-bold text-slate-500">
                  Saved: {order.score === "ready" ? "Ready" : "Needs Fix"}{order.scoreNote ? ` - ${order.scoreNote}` : ""}
                </div>
              ) : null}
            </div>

            <div data-smartbar-order-board-swipe-zone="true" className={demoSocialPortrait ? "mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[20px] bg-slate-50/80 px-3 py-3 text-slate-500 ring-1 ring-slate-100" : "mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] bg-slate-50/80 px-4 py-4 text-slate-500 ring-1 ring-slate-100"}>
              <button
                type="button"
                data-smartbar-order-board-entered="true"
                onClick={() => {
                  setIsSwipingDone(true);
                  window.setTimeout(() => onMarkEntered(order.id), 260);
                }}
                disabled={!isNew}
                className="relative flex flex-col items-center justify-center gap-1 rounded-[18px] py-2 text-sky-700 transition enabled:hover:bg-white disabled:text-slate-400"
              >
                {demoMarkEnteredCue ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#012169] bg-white/62 shadow-[0_12px_28px_rgba(1,33,105,0.16)] ring-4 ring-white/72 backdrop-blur-sm"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <motion.span
                      className="absolute inset-[-9px] rounded-full border-2 border-[#012169]/70"
                      initial={{ opacity: 0, scale: 0.72 }}
                      animate={{ opacity: [0, 0.72, 0], scale: [0.72, 1.18, 1.52] }}
                      transition={{ duration: 0.72, ease: "easeOut", times: [0, 0.32, 1] }}
                    />
                    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
                  </motion.span>
                ) : null}
                <ArrowUp className="h-8 w-8" strokeWidth={2.4} />
                <span className="text-xs font-black uppercase tracking-[0.18em]">{demoMarkEnteredLabel}</span>
              </button>
              <div className="text-center text-xs font-black uppercase tracking-[0.32em] text-slate-400">Swipe</div>
              <button
                type="button"
                onClick={onClose}
                className="flex flex-col items-center justify-center gap-1 rounded-[18px] py-2 text-slate-500 transition hover:bg-white"
              >
                <span className="text-xs font-black uppercase tracking-[0.18em]">On Hold</span>
                <ArrowDown className="h-8 w-8" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

export default function SmartBarOrderBoardMock({
  demoMode = false,
  demoSocialPortrait = false,
  demoCompactBoard = false,
  demoFourTileBoard = false,
  demoFlatBoardTiles = false,
  demoAnimateIncomingOrders = false,
  demoPlaygroundSheet = false,
  onDemoOpenOrder,
  demoMaxVisibleOrders,
  demoRevealOrderId,
  demoRevealDelayMs = 1760,
  demoAutoOpenOrderId,
  demoAutoOpenKey,
  demoAutoOpenDelayMs = 310,
  demoShowAutoOpenCue = false,
  demoContainedSheet = false,
  demoInitialOpenOrderId,
  demoShowAutoMarkEnteredCue = false,
  demoMarkEnteredLabel = "Entered",
  demoAutoMarkEnteredOrderId,
  demoAutoMarkEnteredKey,
  demoAutoMarkEnteredDelayMs = 790,
  demoOrders,
  className = "",
  onDemoEntered,
}: SmartBarOrderBoardMockProps = {}) {
  const sourceOrders = demoOrders ?? INITIAL_ORDERS;
  const previousSourceOrderIdsRef = useRef<Set<string> | null>(null);
  const incomingOrderClearTimerRef = useRef<number | null>(null);
  const initialVisibleOrders = useMemo(
    () => (demoMode && demoRevealOrderId
      ? sourceOrders.filter((order) => order.id !== demoRevealOrderId)
      : sourceOrders),
    [demoMode, demoRevealOrderId, sourceOrders],
  );

  const [orders, setOrders] = useState<SmartBarOrderBoardItem[]>(initialVisibleOrders);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [revealSlotVisible, setRevealSlotVisible] = useState(false);
  const [recentlyRevealedOrderId, setRecentlyRevealedOrderId] = useState<string | null>(null);
  const [recentlyEnteredOrderId, setRecentlyEnteredOrderId] = useState<string | null>(null);
  const [tapCueOrderId, setTapCueOrderId] = useState<string | null>(null);
  const [markEnteredCueOrderId, setMarkEnteredCueOrderId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const previousSourceOrderIds = previousSourceOrderIdsRef.current;
    const nextSourceOrderIds = new Set(sourceOrders.map((order) => order.id));
    const incomingOrder = demoAnimateIncomingOrders && previousSourceOrderIds
      ? sourceOrders.find((order) => !previousSourceOrderIds.has(order.id)) || null
      : null;

    previousSourceOrderIdsRef.current = nextSourceOrderIds;

    if (incomingOrderClearTimerRef.current !== null) {
      window.clearTimeout(incomingOrderClearTimerRef.current);
      incomingOrderClearTimerRef.current = null;
    }

    setOrders(initialVisibleOrders);
    setActiveOrderId(null);
    setRevealSlotVisible(false);
    setRecentlyRevealedOrderId(incomingOrder?.id ?? null);
    setRecentlyEnteredOrderId(null);
    setTapCueOrderId(null);
    setMarkEnteredCueOrderId(null);

    if (incomingOrder) {
      incomingOrderClearTimerRef.current = window.setTimeout(() => {
        setRecentlyRevealedOrderId(null);
        incomingOrderClearTimerRef.current = null;
      }, 1150);
    }

    if (!demoMode || !demoRevealOrderId) {
      return () => {
        if (incomingOrderClearTimerRef.current !== null) {
          window.clearTimeout(incomingOrderClearTimerRef.current);
          incomingOrderClearTimerRef.current = null;
        }
      };
    }

    // Demo arrival choreography:
    // 1) Start with the latest existing ticket (S-186) in the first slot.
    // 2) After a short beat, the grid reforms and opens the first slot.
    // 3) Then the new ticket (S-187) scales into that open slot.
    const openSlotTimer = window.setTimeout(() => {
      setRevealSlotVisible(true);
    }, demoRevealDelayMs);

    const revealTimer = window.setTimeout(() => {
      setOrders(sourceOrders);
      setRecentlyRevealedOrderId(demoRevealOrderId);
      setRevealSlotVisible(false);
    }, demoRevealDelayMs + 1050);

    const clearRevealTimer = window.setTimeout(() => {
      setRecentlyRevealedOrderId(null);
    }, demoRevealDelayMs + 3030);

    return () => {
      window.clearTimeout(openSlotTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(clearRevealTimer);
      if (incomingOrderClearTimerRef.current !== null) {
        window.clearTimeout(incomingOrderClearTimerRef.current);
        incomingOrderClearTimerRef.current = null;
      }
    };
  }, [demoAnimateIncomingOrders, demoMode, demoRevealDelayMs, demoRevealOrderId, initialVisibleOrders, sourceOrders]);

  // Keep demoInitialOpenOrderId from resetting the board state after a demo action.
  // The walkthrough uses this prop to start the handled step with S-184 open.
  // When the parent later moves from watch -> done, the prop clears; that must not
  // reset orders back to the original fixture and undo the entered/handled state.
  useEffect(() => {
    if (!demoMode || !demoInitialOpenOrderId) return;
    setActiveOrderId(demoInitialOpenOrderId);
  }, [demoMode, demoInitialOpenOrderId]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((left, right) => {
        if (left.status !== right.status) return left.status === "new" ? -1 : 1;
        if (left.status === "new") return smartBarOrderBoardOrderNumber(right.id) - smartBarOrderBoardOrderNumber(left.id);
        return left.minutesAgo - right.minutesAgo;
      }),
    [orders],
  );

  const visibleSortedOrders = useMemo(
    () => (typeof demoMaxVisibleOrders === "number" ? sortedOrders.slice(0, Math.max(0, demoMaxVisibleOrders)) : sortedOrders),
    [demoMaxVisibleOrders, sortedOrders],
  );

  const showRevealSlot = Boolean(
    revealSlotVisible && demoMode && demoRevealOrderId && !orders.some((order) => order.id === demoRevealOrderId),
  );

  const activeOrder = activeOrderId ? orders.find((order) => order.id === activeOrderId) || null : null;

  const markEntered = (orderId: string) => {
    setMarkEnteredCueOrderId(null);
    setRecentlyEnteredOrderId(orderId);
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: "entered" } : order)));
    setActiveOrderId(null);
    onDemoEntered?.(orderId);
  };

  const scoreOrder = (orderId: string, score: SmartBarOrderBoardScore, note = "") => {
    setOrders((current) => current.map((order) => (
      order.id === orderId ? { ...order, score, scoreNote: note } : order
    )));
  };

  useEffect(() => {
    if (!demoMode || !demoAutoOpenOrderId || !demoAutoOpenKey) return undefined;

    setTapCueOrderId(null);

    if (!demoShowAutoOpenCue) {
      const timer = window.setTimeout(() => {
        setActiveOrderId(demoAutoOpenOrderId);
      }, demoAutoOpenDelayMs);

      return () => window.clearTimeout(timer);
    }

    const cueTimer = window.setTimeout(() => {
      setTapCueOrderId(demoAutoOpenOrderId);
    }, demoAutoOpenDelayMs);

    const openTimer = window.setTimeout(() => {
      setTapCueOrderId(null);
      setActiveOrderId(demoAutoOpenOrderId);
    }, demoAutoOpenDelayMs + 820);

    return () => {
      window.clearTimeout(cueTimer);
      window.clearTimeout(openTimer);
    };
  }, [demoMode, demoAutoOpenOrderId, demoAutoOpenKey, demoAutoOpenDelayMs, demoShowAutoOpenCue]);

  useEffect(() => {
    if (!demoMode || !demoAutoMarkEnteredOrderId || !demoAutoMarkEnteredKey) return undefined;

    setMarkEnteredCueOrderId(null);

    if (!demoShowAutoMarkEnteredCue) {
      const timer = window.setTimeout(() => {
        markEntered(demoAutoMarkEnteredOrderId);
      }, demoAutoMarkEnteredDelayMs);

      return () => window.clearTimeout(timer);
    }

    const cueTimer = window.setTimeout(() => {
      setMarkEnteredCueOrderId(demoAutoMarkEnteredOrderId);
    }, demoAutoMarkEnteredDelayMs);

    const markTimer = window.setTimeout(() => {
      markEntered(demoAutoMarkEnteredOrderId);
    }, demoAutoMarkEnteredDelayMs + 980);

    return () => {
      window.clearTimeout(cueTimer);
      window.clearTimeout(markTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, demoAutoMarkEnteredOrderId, demoAutoMarkEnteredKey, demoAutoMarkEnteredDelayMs, demoShowAutoMarkEnteredCue]);

  return (
    <main
      className={[
        "relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.20),_transparent_32%),linear-gradient(135deg,_#f8fbff_0%,_#e9f6ff_48%,_#f8fbff_100%)] px-4 py-5 text-slate-950 sm:px-6 sm:py-8",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className={demoSocialPortrait ? "mx-auto flex h-full max-w-none flex-col" : "mx-auto max-w-6xl"}>
        <header className={demoSocialPortrait ? demoFlatBoardTiles ? "mb-1 flex items-start justify-between gap-2" : demoFourTileBoard ? "mb-2 flex items-start justify-between gap-2" : demoCompactBoard ? "mb-3 flex items-start justify-between gap-3" : "mb-6 flex items-start justify-between gap-3" : "mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between"}>
          <div>
            <div className={demoFlatBoardTiles ? "text-[0.46rem] font-black uppercase leading-none tracking-[0.22em] text-sky-700" : demoFourTileBoard ? "text-[0.64rem] font-black uppercase tracking-[0.24em] text-sky-700" : "text-xs font-black uppercase tracking-[0.28em] text-sky-700"}>SmartBar</div>
            <h1 className={demoFlatBoardTiles ? "mt-0.5 inline-flex rounded-full bg-white/80 px-2.5 py-0.5 text-sm font-black tracking-tight shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur" : demoFourTileBoard ? "mt-1 inline-flex rounded-full bg-white/80 px-3 py-1.5 text-lg font-black tracking-tight shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur" : "mt-2 inline-flex rounded-full bg-white/80 px-4 py-2 text-xl font-black tracking-tight shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur sm:text-2xl"}>
              Order Board
            </h1>
            {!demoSocialPortrait ? (
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                Tap SmartBar tickets, enter into the register, swipe away.
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-end">
            <div
              className={[
                demoFlatBoardTiles ? "flex h-8 items-center rounded-full bg-white/85 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur transition-all" : "flex h-11 items-center rounded-full bg-white/85 shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur transition-all",
                searchOpen ? (demoFlatBoardTiles ? "w-44 px-2" : "w-56 px-3") : (demoFlatBoardTiles ? "w-8 justify-center px-0" : "w-11 justify-center px-0"),
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                className={demoFlatBoardTiles ? "grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-sky-50 hover:text-sky-700" : "grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"}
                aria-label="Search SmartBar orders"
              >
                <Search className={demoFlatBoardTiles ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </button>
              {searchOpen ? (
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Order #"
                  className="ml-1 min-w-0 flex-1 bg-transparent text-sm font-black uppercase tracking-[0.12em] text-slate-700 outline-none placeholder:text-slate-400"
                  autoFocus
                />
              ) : null}
            </div>
          </div>
        </header>

        <section className={demoSocialPortrait ? demoFlatBoardTiles ? "min-h-0" : "min-h-0 flex-1" : undefined}>
          <div className={demoSocialPortrait
            ? demoFlatBoardTiles
              ? "grid w-full grid-cols-2 gap-x-1.5 gap-y-1"
              : demoFourTileBoard
                ? "grid w-full grid-cols-2 gap-x-2 gap-y-2 content-start"
                : demoCompactBoard
                  ? "grid w-full grid-cols-2 gap-2"
                  : "grid w-full grid-cols-2 gap-2.5"
            : "grid w-fit grid-cols-[repeat(2,11.75rem)] gap-3 sm:grid-cols-[repeat(3,11.75rem)] sm:gap-3 lg:grid-cols-[repeat(4,11.75rem)] max-[430px]:grid-cols-[repeat(2,10.25rem)] max-[430px]:gap-2"
          }>
            {showRevealSlot ? (
              <motion.div
                layout
                className={demoSocialPortrait
                  ? demoFlatBoardTiles
                    ? "h-[1.25rem] w-full rounded-[10px] border border-dashed border-white/70 bg-white/26"
                    : demoFourTileBoard
                      ? "h-[4.75rem] w-full rounded-[20px] border border-dashed border-white/70 bg-white/26"
                      : demoCompactBoard
                        ? "h-[7.85rem] w-full rounded-[24px] border border-dashed border-white/70 bg-white/26"
                        : "h-[9.3rem] w-full rounded-[28px] border border-dashed border-white/70 bg-white/26"
                  : "h-[11.75rem] w-[11.75rem] rounded-[28px] border border-dashed border-white/70 bg-white/20 max-[430px]:h-[10.25rem] max-[430px]:w-[10.25rem]"
                }
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
                aria-hidden="true"
              />
            ) : null}
            {visibleSortedOrders.map((order) => {
              const isRecentlyEntered = order.id === recentlyEnteredOrderId;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={order.id === recentlyRevealedOrderId ? { opacity: 0, scale: 0.28 } : false}
                  animate={isRecentlyEntered
                    ? { opacity: 0.50, scale: 0.90, rotateX: 18, y: 34 }
                    : { opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                  transition={{ duration: order.id === recentlyRevealedOrderId ? 1.05 : 0.46, ease: "easeOut" }}
                  style={{ transformPerspective: 820, transformOrigin: "center bottom" }}
                >
                  <SmartBarOrderTile order={order} onOpen={(nextOrder) => {
                    if (onDemoOpenOrder) {
                      onDemoOpenOrder(nextOrder);
                      return;
                    }

                    setActiveOrderId(nextOrder.id);
                  }} demoSocialPortrait={demoSocialPortrait} demoCompactBoard={demoCompactBoard} demoFourTileBoard={demoFourTileBoard} demoFlatBoardTiles={demoFlatBoardTiles} demoTapCue={order.id === tapCueOrderId} />
                </motion.div>
              );
            })}
          </div>
        </section>

        {!demoSocialPortrait ? (
          <footer className="mt-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            White = needs entry - Blue = entered in POS
          </footer>
        ) : null}
      </div>

      {activeOrder && !onDemoOpenOrder ? (
        <SmartBarOrderSheet
          order={activeOrder}
          onClose={() => setActiveOrderId(null)}
          onMarkEntered={markEntered}
          onScoreOrder={scoreOrder}
          demoSocialPortrait={demoSocialPortrait}
          demoContainedSheet={demoContainedSheet}
          demoPlaygroundSheet={demoPlaygroundSheet}
          demoMarkEnteredLabel={demoMarkEnteredLabel}
          demoMarkEnteredCue={activeOrder.id === markEnteredCueOrderId}
        />
      ) : null}
    </main>
  );
}
