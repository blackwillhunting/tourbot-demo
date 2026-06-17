import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";

type SmartBarOrderBoardItemStatus = "new" | "entered";

type SmartBarOrderBoardMockProps = {
  demoMode?: boolean;
  demoRevealOrderId?: string;
  demoRevealDelayMs?: number;
  demoOrders?: SmartBarOrderBoardItem[];
  className?: string;
  onDemoEntered?: (orderId: string) => void;
};

type SmartBarOrderBoardItem = {
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
    customer: "Chris",
    phone: "202-555-0148",
    pickup: "ASAP",
    itemCount: 6,
    groups: [
      {
        title: "Sandwiches",
        items: [
          {
            quantity: 2,
            name: "Half-smoke",
            details: ["1 no onions", "1 extra chili"],
          },
          {
            quantity: 1,
            name: "Jerk chicken sandwich",
            details: ["Mild sauce"],
          },
        ],
      },
      {
        title: "Sides",
        items: [
          { quantity: 1, name: "Chili cheese fries" },
          { quantity: 1, name: "Regular fries" },
        ],
      },
      {
        title: "Drinks",
        items: [{ quantity: 1, name: "Half & Half" }],
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
}: {
  order: SmartBarOrderBoardItem;
  onOpen: (order: SmartBarOrderBoardItem) => void;
}) {
  const isNew = order.status === "new";

  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      data-smartbar-order-board-tile={order.id}
      data-smartbar-order-board-status={order.status}
      className={[
        "group relative h-[11.75rem] w-[11.75rem] rounded-[28px] p-3 text-center transition max-[430px]:h-[10.25rem] max-[430px]:w-[10.25rem]",
        isNew
          ? "bg-white text-slate-950 shadow-[0_18px_38px_rgba(15,23,42,0.12)] ring-1 ring-white/80 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.16)]"
          : "bg-transparent text-slate-400 shadow-none ring-0",
      ].join(" ")}
      aria-label={`Open SmartBar order ${order.id}`}
    >
      <span className="flex h-full flex-col items-center justify-center">
        <span className="text-[clamp(1.35rem,4.8vw,2.7rem)] font-black tracking-tight">{order.id}</span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {isNew ? timeLabel(order.minutesAgo) : "entered"}
        </span>
        {isNew ? (
          <span className="mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {order.itemCount} items
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SmartBarOrderSheet({
  order,
  onClose,
  onMarkEntered,
}: {
  order: SmartBarOrderBoardItem;
  onClose: () => void;
  onMarkEntered: (orderId: string) => void;
}) {
  const [isSwipingDone, setIsSwipingDone] = useState(false);
  const isNew = order.status === "new";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/20 px-3 pb-3 backdrop-blur-[2px]"
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
            "relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/70",
            "shadow-[0_30px_90px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/5",
            isSwipingDone ? "bg-slate-200" : "bg-white",
          ].join(" ")}
          initial={{ y: "110%" }}
          animate={{ y: isSwipingDone ? -96 : 0, scale: isSwipingDone ? 0.985 : 1 }}
          exit={{ y: "110%" }}
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

          <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.26em] text-sky-600">SmartBar Order</div>
              <div className="mt-1 flex items-baseline gap-3">
                <h1 className="text-4xl font-black tracking-tight text-slate-950">{order.id}</h1>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {order.status === "new" ? "New ticket" : "Entered"}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-500">
                {timeLabel(order.minutesAgo)} · {order.pickup} · Pay at counter
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close order ticket"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[70svh] overflow-y-auto px-5 pb-3 sm:px-7">
            <div className="flex flex-wrap content-start gap-2">
              {order.groups.flatMap((group) =>
                group.items.map((item, index) => (
                  <section
                    key={`${group.title}-${item.name}-${index}`}
                    className="w-fit max-w-full rounded-[18px] bg-white px-3 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
                  >
                    <div className="flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-400">
                        {group.title}
                      </span>
                      <span className="text-[0.95rem] font-black text-sky-700">{item.quantity}×</span>
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

            <div data-smartbar-order-board-swipe-zone="true" className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] bg-slate-50/80 px-4 py-4 text-slate-500 ring-1 ring-slate-100">
              <button
                type="button"
                data-smartbar-order-board-entered="true"
                onClick={() => {
                  setIsSwipingDone(true);
                  window.setTimeout(() => onMarkEntered(order.id), 260);
                }}
                disabled={!isNew}
                className="flex flex-col items-center justify-center gap-1 rounded-[18px] py-2 text-sky-700 transition enabled:hover:bg-white disabled:text-slate-400"
              >
                <ArrowUp className="h-8 w-8" strokeWidth={2.4} />
                <span className="text-xs font-black uppercase tracking-[0.18em]">Entered</span>
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
  demoRevealOrderId,
  demoRevealDelayMs = 1600,
  demoOrders,
  className = "",
  onDemoEntered,
}: SmartBarOrderBoardMockProps = {}) {
  const sourceOrders = demoOrders ?? INITIAL_ORDERS;
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setOrders(initialVisibleOrders);
    setActiveOrderId(null);
    setRevealSlotVisible(false);
    setRecentlyRevealedOrderId(null);

    if (!demoMode || !demoRevealOrderId) return undefined;

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
    }, demoRevealDelayMs + 950);

    const clearRevealTimer = window.setTimeout(() => {
      setRecentlyRevealedOrderId(null);
    }, demoRevealDelayMs + 2750);

    return () => {
      window.clearTimeout(openSlotTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(clearRevealTimer);
    };
  }, [demoMode, demoRevealDelayMs, demoRevealOrderId, initialVisibleOrders, sourceOrders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((left, right) => {
        if (left.status !== right.status) return left.status === "new" ? -1 : 1;
        if (left.status === "new") return smartBarOrderBoardOrderNumber(right.id) - smartBarOrderBoardOrderNumber(left.id);
        return left.minutesAgo - right.minutesAgo;
      }),
    [orders],
  );

  const showRevealSlot = Boolean(
    revealSlotVisible && demoMode && demoRevealOrderId && !orders.some((order) => order.id === demoRevealOrderId),
  );

  const activeOrder = activeOrderId ? orders.find((order) => order.id === activeOrderId) || null : null;

  const markEntered = (orderId: string) => {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status: "entered" } : order)));
    setActiveOrderId(null);
    onDemoEntered?.(orderId);
  };

  return (
    <main
      className={[
        "min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.20),_transparent_32%),linear-gradient(135deg,_#f8fbff_0%,_#e9f6ff_48%,_#f8fbff_100%)] px-4 py-5 text-slate-950 sm:px-6 sm:py-8",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-sky-700">SmartBar</div>
            <h1 className="mt-2 inline-flex rounded-full bg-white/80 px-4 py-2 text-xl font-black tracking-tight shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur sm:text-2xl">
              Order Board
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
              Tap SmartBar tickets, enter into the register, swipe away.
            </p>
          </div>
          <div className="flex items-center justify-end">
            <div
              className={[
                "flex h-11 items-center rounded-full bg-white/85 shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-white/80 backdrop-blur transition-all",
                searchOpen ? "w-56 px-3" : "w-11 justify-center px-0",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
                aria-label="Search SmartBar orders"
              >
                <Search className="h-4 w-4" />
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

        <section>
          <div className="grid w-fit grid-cols-[repeat(2,11.75rem)] gap-3 sm:grid-cols-[repeat(3,11.75rem)] sm:gap-3 lg:grid-cols-[repeat(4,11.75rem)] max-[430px]:grid-cols-[repeat(2,10.25rem)] max-[430px]:gap-2">
            {showRevealSlot ? (
              <motion.div
                layout
                className="h-[11.75rem] w-[11.75rem] rounded-[28px] border border-dashed border-white/70 bg-white/20 max-[430px]:h-[10.25rem] max-[430px]:w-[10.25rem]"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
                aria-hidden="true"
              />
            ) : null}
            {sortedOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={order.id === recentlyRevealedOrderId ? { opacity: 0, scale: 0.28 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: order.id === recentlyRevealedOrderId ? 1.05 : 0.38, ease: "easeOut" }}
              >
                <SmartBarOrderTile order={order} onOpen={(nextOrder) => setActiveOrderId(nextOrder.id)} />
              </motion.div>
            ))}
          </div>
        </section>

        <footer className="mt-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          White = needs entry · Blue = entered in POS
        </footer>
      </div>

      {activeOrder ? (
        <SmartBarOrderSheet order={activeOrder} onClose={() => setActiveOrderId(null)} onMarkEntered={markEntered} />
      ) : null}
    </main>
  );
}
