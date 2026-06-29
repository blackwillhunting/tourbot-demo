
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Cable, CircleDollarSign, Compass, Hotel, Monitor, PhoneCall, ReceiptText, Settings, Smartphone, Tablet, UtensilsCrossed, Wifi, X } from "lucide-react";
import SmartBarMobileShell, { type SmartBarMobileDemoMontageStage, type SmartBarMobileDemoSubmission, type SmartBarMobileSubmitResult } from "../smartbar-mobile/SmartBarMobileShell";
import SmartBarOrderBoardMock from "../order-board/SmartBarOrderBoardMock";
import ThinkingText from "../ThinkingText";
import feesImage from "../../../assets/social/fees.png";

type SmartBarSocialFilmPhase =
  | "blank"
  | "empty"
  | "searchbar"
  | "site"
  | "smartbar"
  | "mounted"
  | "title"
  | "entry"
  | "food-clear"
  | "food-becomes-cart"
  | "food-carts-open"
  | "food-carts-closed"
  | "food-red-shake"
  | "food-requirements-open"
  | "food-requirements-selected"
  | "food-requirements-closed"
  | "food-requirements-resolved"
  | "food-yellow-shake"
  | "food-extras-open"
  | "food-extras-selected"
  | "food-extras-closed"
  | "food-extras-resolved"
  | "food-gray-shake"
  | "food-corrections-open"
  | "food-corrections-reentered"
  | "food-corrections-closed"
  | "food-corrections-resolved"
  | "food-checkout-open"
  | "food-checkout-closed"
  | "food-confirmation-open"
  | "food-confirmation-closed"
  | "tablet-board"
  | "tablet-received"
  | "tablet-arrival"
  | "tablet-open"
  | "tablet-entered"
  | "final-clear"
  | "final-caption-phone"
  | "final-clear-1"
  | "final-caption-customers"
  | "final-clear-2"
  | "final-caption-ticket"
  | "final-clear-3"
  | "final-caption-cashiers"
  | "final-clear-4"
  | "final-caption-fees"
  | "final-clear-5"
  | "final-brand-return"
  | "final-caption-orders"
  | "final-orders-clear"
  | "final-centered";

const SMARTBAR_SOCIAL_FILM_TOTAL_MS = 50240;

type SmartBarSocialOrderBoardOrders = NonNullable<
  NonNullable<Parameters<typeof SmartBarOrderBoardMock>[0]>["demoOrders"]
>;

const SMARTBAR_SOCIAL_ORDER_BOARD_ORDERS: SmartBarSocialOrderBoardOrders = [
  {
    id: "S-184",
    minutesAgo: 0,
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
    id: "S-183",
    minutesAgo: 2,
    status: "new",
    customer: "Maya",
    phone: "202-555-0183",
    pickup: "ASAP",
    itemCount: 3,
    groups: [{ title: "Order", items: [{ quantity: 2, name: "Chicken sandwiches" }, { quantity: 1, name: "Fries" }] }],
  },
  {
    id: "S-182",
    minutesAgo: 5,
    status: "new",
    customer: "Dana",
    phone: "202-555-0182",
    pickup: "12:45 PM",
    itemCount: 5,
    groups: [{ title: "Order", items: [{ quantity: 1, name: "Family bundle" }, { quantity: 4, name: "Drinks" }] }],
  },
  {
    id: "S-181",
    minutesAgo: 9,
    status: "new",
    customer: "Sam",
    phone: "202-555-0181",
    pickup: "ASAP",
    itemCount: 2,
    groups: [{ title: "Order", items: [{ quantity: 1, name: "Burger" }, { quantity: 1, name: "Onion rings" }] }],
  },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

const SMARTBAR_SOCIAL_RECORDING_PREROLL_MS = 5000;

function smartBarSocialFinalCaptionForPhase(phase: SmartBarSocialFilmPhase) {
  switch (phase) {
    case "final-caption-phone":
      return "Phone orders without the phone";
    case "final-caption-customers":
      return "Customers say what they want";
    case "final-caption-ticket":
      return "SmartBar sends a ready ticket";
    case "final-caption-cashiers":
      return "Free up cashiers";
    case "final-caption-fees":
      return "Without third-party platform fees";
    case "final-caption-orders":
      return "Words turned into orders";
    default:
      return "";
  }
}

function smartBarSocialOrderBoardVisible(phase: SmartBarSocialFilmPhase) {
  // The handoff captions teach the system transition first:
  // "order sent..." then "received on tablet". The board should not appear
  // until after that instructional handoff has landed.
  return phase === "tablet-arrival" ||
    phase === "tablet-open" ||
    phase === "tablet-entered";
}

function smartBarSocialMontageStageForPhase(
  phase: SmartBarSocialFilmPhase,
): SmartBarMobileDemoMontageStage | null {
  switch (phase) {
    case "food-clear":
      return { id: phase, label: "Plain English...", surface: "carts", open: false };
    case "food-becomes-cart":
      return { id: phase, label: "becomes a cart", surface: "carts", open: false };
    case "food-carts-open":
      return { id: phase, label: "coded by color", surface: "carts", open: true };
    case "food-carts-closed":
      return { id: phase, label: "coded by color", surface: "carts", open: false };

    case "food-red-shake":
      return { id: phase, label: "coded by color", surface: "carts", open: true, shakeLineId: "social-montage-requirement" };
    case "food-requirements-open":
      return { id: phase, label: "red forces choices", surface: "requirements", open: true, status: "pending" };
    case "food-requirements-selected":
      return { id: phase, label: "red forces choices", surface: "requirements", open: true, status: "pending", selectedOptions: ["Medium"] };
    case "food-requirements-closed":
      return { id: phase, label: "red forces choices", surface: "requirements", open: false, status: "pending" };
    case "food-requirements-resolved":
      return { id: phase, label: "coded by color", surface: "carts", open: true, resolvedState: "requirement" };

    case "food-yellow-shake":
      return { id: phase, label: "coded by color", surface: "carts", open: true, resolvedState: "requirement", shakeLineId: "social-montage-extras" };
    case "food-extras-open":
      return { id: phase, label: "yellow offers extras", surface: "extras", open: true, status: "options" };
    case "food-extras-selected":
      return { id: phase, label: "yellow offers extras", surface: "extras", open: true, status: "options", selectedOptions: ["Whipped cream", "Cherry"] };
    case "food-extras-closed":
      return { id: phase, label: "yellow offers extras", surface: "extras", open: false, status: "options" };
    case "food-extras-resolved":
      return { id: phase, label: "coded by color", surface: "carts", open: true, resolvedState: "extras" };

    case "food-gray-shake":
      return { id: phase, label: "coded by color", surface: "carts", open: true, resolvedState: "extras", shakeLineId: "social-montage-correction" };
    case "food-corrections-open":
      return { id: phase, label: "gray flags unknowns", surface: "corrections", open: true, status: "unknown" };
    case "food-corrections-reentered":
      return { id: phase, label: "gray flags unknowns", surface: "corrections", open: true, status: "unknown", retryDraft: "chocolate sundae" };
    case "food-corrections-closed":
      return { id: phase, label: "gray flags unknowns", surface: "corrections", open: false, status: "unknown" };
    case "food-corrections-resolved":
      return { id: phase, label: "coded by color", surface: "carts", open: true, resolvedState: "correction" };

    case "food-checkout-open":
      return { id: phase, label: "confirms order", surface: "checkout", open: true };
    case "food-checkout-closed":
      return { id: phase, label: "confirms order", surface: "checkout", open: false };
    case "food-confirmation-open":
      return { id: phase, label: "generates ticket", surface: "confirmation", open: true };
    case "food-confirmation-closed":
      return { id: phase, label: "generates ticket", surface: "confirmation", open: false };
    case "tablet-board":
      return { id: phase, label: "order sent...", surface: "confirmation", open: false };
    case "tablet-received":
    case "tablet-arrival":
    case "tablet-open":
    case "tablet-entered":
      return { id: phase, label: "received on tablet", surface: "confirmation", open: false };
    default:
      return null;
  }
}

function SocialFilmHeader({ phase }: { phase: SmartBarSocialFilmPhase }) {
  return (
    <motion.div
      initial={false}
      animate={phase === "blank" || phase.startsWith("tablet-") || phase.startsWith("final-") ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.36 }}
      className="absolute left-5 right-5 top-4 z-[60] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/58"
    >
      <span>SmartBar Reel</span>
      <span>{Math.round(SMARTBAR_SOCIAL_FILM_TOTAL_MS / 1000)}s</span>
    </motion.div>
  );
}

function SocialFilmBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-20 top-12 h-56 w-56 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-60 w-60 rounded-full bg-blue-300/20 blur-3xl" />
    </>
  );
}


type SmartBarSocialFeesPhase =
  | "blank"
  | "image-enter"
  | "pain-1"
  | "pain-2"
  | "direct-intake"
  | "order-header"
  | "order-chunk"
  | "order-thinking"
  | "ticket-clears"
  | "ticket-rise"
  | "line-1"
  | "line-2"
  | "line-3"
  | "line-4"
  | "direct-final"
  | "brand-in";

const SMARTBAR_FEES_REEL_TOTAL_MS = 36500;

function isFeesPainPhase(phase: SmartBarSocialFeesPhase) {
  return phase === "pain-1" || phase === "pain-2";
}

function SmartBarFeesCaptionStack({ phase }: { phase: SmartBarSocialFeesPhase }) {
  if (!isFeesPainPhase(phase)) return null;

  return (
    <div className="absolute left-7 right-7 top-[57svh] z-[30]">
      <motion.div
        initial={{ y: 22, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] border border-white/82 bg-white/90 px-4 py-2.5 text-center text-[19px] font-black leading-[1.06] tracking-[-0.045em] text-slate-950 shadow-[0_16px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl"
      >
        When the delivery-app bill hits.
      </motion.div>

      {phase === "pain-2" && (
        <motion.div
          initial={{ y: 22, opacity: 0, scale: 0.985 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          className="-mt-1 rounded-[24px] border border-white/82 bg-white/90 px-4 py-2.5 text-center text-[20px] font-black leading-[1.06] tracking-[-0.045em] text-slate-950 shadow-[0_16px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        >
          Great order. Tiny margin.
        </motion.div>
      )}
    </div>
  );
}

function SmartBarFeesDirectIntake({ phase }: { phase: SmartBarSocialFeesPhase }) {
  if (phase !== "direct-intake") return null;

  return (
    <motion.div
      initial={{ y: 26, opacity: 0, scale: 0.98 }}
      animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.64, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-7 right-7 top-[54svh] z-[34] rounded-[26px] border border-slate-200/85 bg-white/94 px-4 py-3 text-center text-[20px] font-black leading-[1.06] tracking-[-0.045em] text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.13)] backdrop-blur-xl"
    >
      SmartBar is direct order intake.
    </motion.div>
  );
}


const SMARTBAR_FEES_MESSY_ORDER = `2 chese burgers no onyons
one wit bacon, fries well done
kids nugget BBQ, vanila shake, xtra ranch if u have it`;

type SmartBarFeesOrderTypingStep = { text: string; delay: number };

function buildSmartBarFeesOrderTypingSteps(): SmartBarFeesOrderTypingStep[] {
  const steps: SmartBarFeesOrderTypingStep[] = [];
  let text = "";

  const typeText = (next: string, delay = 34) => {
    for (const char of next) {
      text += char;
      steps.push({ text, delay });
    }
  };

  const backspace = (count: number, delay = 44) => {
    for (let index = 0; index < count; index += 1) {
      text = text.slice(0, -1);
      steps.push({ text, delay });
    }
  };

  const pause = (delay: number) => {
    steps.push({ text, delay });
  };

  typeText("2 chese burgers no onyon");
  pause(180);
  backspace(5);
  typeText("onyons");
  pause(160);
  typeText("\none wi");
  pause(110);
  backspace(2);
  typeText("wit bacon, frise");
  pause(120);
  backspace(5);
  typeText("fries well done");
  typeText("\nkids nugget BBQ, vanila");
  pause(120);
  typeText(" shake, extra");
  pause(120);
  backspace(5);
  typeText("xtra ranch if u have it");
  pause(540);

  if (text !== SMARTBAR_FEES_MESSY_ORDER) {
    steps.push({ text: SMARTBAR_FEES_MESSY_ORDER, delay: 80 });
  }

  return steps;
}

const SMARTBAR_FEES_ORDER_TYPING_STEPS = buildSmartBarFeesOrderTypingSteps();

function SmartBarFeesTypedOrder({ phase }: { phase: SmartBarSocialFeesPhase }) {
  const [typedOrder, setTypedOrder] = useState("");

  useEffect(() => {
    if (phase === "order-header") {
      setTypedOrder("");
      return;
    }

    if (phase !== "order-chunk") return;

    let cancelled = false;
    let timer: number | null = null;
    setTypedOrder("");

    const runTyping = async () => {
      for (const step of SMARTBAR_FEES_ORDER_TYPING_STEPS) {
        await new Promise<void>((resolve) => {
          timer = window.setTimeout(resolve, step.delay);
        });
        if (cancelled) return;
        setTypedOrder(step.text);
      }
    };

    void runTyping();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [phase]);

  if (phase === "order-thinking" || phase === "ticket-clears") {
    return <ThinkingText body={SMARTBAR_FEES_MESSY_ORDER} />;
  }

  return (
    <span>
      {typedOrder}
      {phase === "order-chunk" && <span className="ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[2px] rounded-full bg-slate-950/82" />}
    </span>
  );
}

function SmartBarFeesOrderStream({ phase }: { phase: SmartBarSocialFeesPhase }) {
  const visible = phase === "order-header" || phase === "order-chunk" || phase === "order-thinking" || phase === "ticket-clears";
  if (!visible) return null;

  const clearing = phase === "ticket-clears";
  const showChunk = phase === "order-chunk" || phase === "order-thinking" || phase === "ticket-clears";

  return (
    <motion.div
      initial={{ x: "112%", opacity: 0, rotate: 1.8 }}
      animate={clearing ? { x: "-128%", opacity: 0, rotate: -3.5 } : { x: 0, opacity: 1, rotate: 0 }}
      transition={{ duration: clearing ? 0.56 : 0.72, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-7 right-7 top-[54svh] z-[36]"
    >
      <div className="rounded-[26px] border border-slate-200/85 bg-white/94 px-4 py-3 text-center text-[20px] font-black leading-[1.06] tracking-[-0.045em] text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.13)] backdrop-blur-xl">
        Customer types or says order
      </div>
      {showChunk && (
        <motion.div
          initial={{ x: "112%", opacity: 0, scale: 0.985 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          layout
          className="-mt-1 min-h-[56px] rounded-[26px] border border-slate-200/85 bg-white/94 px-4 py-3 text-slate-950 shadow-[0_20px_58px_rgba(15,23,42,0.15)] backdrop-blur-xl"
        >
          <motion.div
            layout
            className="whitespace-pre-wrap text-[17px] font-black leading-[1.1] tracking-[-0.045em] text-slate-900"
          >
            <SmartBarFeesTypedOrder phase={phase} />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

function SmartBarFeesTicket({ phase }: { phase: SmartBarSocialFeesPhase }) {
  const visible = phase === "ticket-clears" || phase === "ticket-rise";
  if (!visible) return null;

  const ticketItems = [
    {
      group: "Mains",
      quantity: "2×",
      name: "Cheeseburger",
      details: ["No onions", "Bacon on one"],
    },
    {
      group: "Sides",
      quantity: "1×",
      name: "Fries",
      details: ["Well done"],
    },
    {
      group: "Kids",
      quantity: "1×",
      name: "Kids nuggets",
      details: ["BBQ sauce"],
    },
    {
      group: "Drinks",
      quantity: "1×",
      name: "Vanilla shake",
      details: ["Extra ranch if available"],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: "112%", y: 0, scale: 0.992, rotate: 1.8 }}
      animate={
        phase === "ticket-rise"
          ? { opacity: 1, x: 0, y: "-140svh", scale: 1, rotate: 0 }
          : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }
      }
      transition={{ duration: phase === "ticket-rise" ? 0.72 : 0.72, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute inset-x-[6px] top-[8px] z-[46]"
    >
      <div className="mx-auto w-[min(calc(100%-6px),528px)] overflow-hidden rounded-[34px] border border-slate-200/90 bg-white text-slate-950 shadow-[0_28px_84px_rgba(15,23,42,0.30)] ring-1 ring-slate-950/5">
        <div className="mx-auto mt-3 h-1.5 w-[64px] rounded-full bg-slate-300" />

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.26em] text-sky-600">SmartBar Order</div>
            <div className="mt-1 flex flex-nowrap items-baseline gap-2">
              <h1 className="whitespace-nowrap text-[50px] font-black leading-none tracking-[-0.07em] text-slate-950">S-184</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                New ticket
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-500">
              just now · ASAP · Pay at counter
            </div>
          </div>

          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-hidden="true"
          >
            <span className="text-4xl font-light leading-none">×</span>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="flex flex-col gap-2">
            {ticketItems.map((item) => (
              <section
                key={item.name}
                className="w-full rounded-[18px] bg-white px-4 py-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
              >
                <div className="flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
                  <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-400">
                    {item.group}
                  </span>
                  <span className="text-[0.94rem] font-black text-sky-700">{item.quantity}</span>
                  <span className="text-[0.94rem] font-black text-slate-950">{item.name}</span>
                </div>
                <div className="mt-2 flex max-w-full flex-wrap gap-1.5 pl-0 text-[0.68rem] font-bold leading-none text-slate-500">
                  {item.details.map((detail) => (
                    <span key={detail} className="rounded-full bg-slate-50 px-2 py-0.5">
                      {detail}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] bg-slate-50/80 px-4 py-3.5 text-slate-500 ring-1 ring-slate-100">
            <div className="flex flex-col items-center justify-center gap-0.5 rounded-[18px] py-1 text-sky-700">
              <ArrowUp className="h-8 w-8" strokeWidth={2.4} />
              <span className="text-xs font-black uppercase tracking-[0.18em]">Entered</span>
            </div>
            <div className="text-center text-xs font-black uppercase tracking-[0.32em] text-slate-400">Swipe</div>
            <div className="flex flex-col items-center justify-center gap-0.5 rounded-[18px] py-1 text-slate-500">
              <span className="text-xs font-black uppercase tracking-[0.18em]">On Hold</span>
              <ArrowDown className="h-8 w-8" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SmartBarFeesLineStack({ phase }: { phase: SmartBarSocialFeesPhase }) {
  const lines = [
    { id: "line-1", text: "Customer words → clean ticket." },
    { id: "line-2", text: "No per-order platform fee." },
    { id: "line-3", text: "Tablet-based intake." },
    { id: "line-4", text: "POS integration optional." },
  ] as const;
  const phaseOrder = ["line-1", "line-2", "line-3", "line-4", "direct-final", "brand-in"];
  const phaseIndex = phaseOrder.indexOf(phase);
  if (phaseIndex < 0) return null;

  const leaving = phase === "direct-final" || phase === "brand-in";

  return (
    <motion.div
      initial={false}
      animate={leaving ? { x: "-116%", opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ duration: 0.64, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-7 right-7 top-[32svh] z-[35]"
    >
      {lines.map((line, index) => {
        const visible = phaseIndex >= index;
        if (!visible) return null;
        return (
          <motion.div
            key={line.id}
            initial={{ y: 24, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            className={`${index > 0 ? "-mt-1" : ""} rounded-[24px] border border-white/78 bg-white/88 px-4 py-3 text-[20px] font-black leading-[1.07] tracking-[-0.045em] text-slate-950 shadow-[0_16px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl`}
          >
            {line.text}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function SmartBarFeesBrandLockup({ phase }: { phase: SmartBarSocialFeesPhase }) {
  if (phase !== "direct-final" && phase !== "brand-in") return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 z-[18] flex items-center justify-center"
      >
        <Compass className="h-[54svh] max-h-[520px] w-[54svh] max-w-[520px] text-sky-500/10" strokeWidth={1.24} />
      </motion.div>

      <motion.div
        initial={{ x: "112%", opacity: 0, scale: 0.98 }}
        animate={phase === "brand-in" ? { x: "-118%", opacity: 0, scale: 0.98 } : { x: 0, opacity: 1, scale: 1 }}
        transition={{ duration: phase === "brand-in" ? 0.82 : 0.72, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-7 right-7 top-[38svh] z-[38] rounded-[28px] border border-white/82 bg-white/88 px-5 py-3.5 text-center text-[20px] font-black leading-[1.06] tracking-[-0.045em] text-slate-950 shadow-[0_18px_54px_rgba(15,23,42,0.13)] backdrop-blur-xl"
      >
        Direct order intake for restaurants.
      </motion.div>

      {phase === "brand-in" && (
        <motion.div
          initial={{ x: "112%", y: "-7svh", opacity: 0, scale: 0.98 }}
          animate={{ x: ["112%", "0%", "0%"], y: ["-7svh", "-7svh", "0svh"], opacity: [0, 1, 1], scale: [0.98, 1, 1] }}
          transition={{ duration: 1.78, times: [0, 0.54, 1], ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-[calc(64svh-58px)] z-[48] flex items-center justify-center"
        >
          <div className="relative flex h-[46px] w-[260px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-[linear-gradient(180deg,_rgba(20,34,92,0.96)_0%,_rgba(17,29,82,0.98)_52%,_rgba(13,23,68,0.99)_100%)] px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(2,6,23,0.48),0_16px_38px_rgba(2,6,23,0.30),0_5px_14px_rgba(2,6,23,0.18)] backdrop-blur-[18px]">
            <span className="inline-flex h-8 max-w-full items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[18px] font-semibold tracking-[-0.025em] text-white">
              <Compass className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={2.25} />
              <span>SmartBar</span>
            </span>
          </div>
        </motion.div>
      )}
    </>
  );
}

export function SmartBarSocialFeesReel() {
  const [phase, setPhase] = useState<SmartBarSocialFeesPhase>("blank");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      await wait(SMARTBAR_SOCIAL_RECORDING_PREROLL_MS);
      if (cancelled) return;

      setPhase("image-enter");
      await wait(900);
      if (cancelled) return;

      setPhase("pain-1");
      await wait(1800);
      if (cancelled) return;

      setPhase("pain-2");
      await wait(2200);
      if (cancelled) return;

      setPhase("direct-intake");
      await wait(2200);
      if (cancelled) return;

      setPhase("order-header");
      await wait(1800);
      if (cancelled) return;

      setPhase("order-chunk");
      await wait(8500);
      if (cancelled) return;

      setPhase("order-thinking");
      await wait(3000);
      if (cancelled) return;

      setPhase("ticket-clears");
      await wait(3900);
      if (cancelled) return;

      setPhase("ticket-rise");
      await wait(900);
      if (cancelled) return;

      setPhase("line-1");
      await wait(1200);
      if (cancelled) return;

      setPhase("line-2");
      await wait(1100);
      if (cancelled) return;

      setPhase("line-3");
      await wait(1100);
      if (cancelled) return;

      setPhase("line-4");
      await wait(2400);
      if (cancelled) return;

      setPhase("direct-final");
      await wait(1700);
      if (cancelled) return;

      setPhase("brand-in");
      await wait(3400);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const showPainImage = phase !== "blank" && phase !== "line-1" && phase !== "line-2" && phase !== "line-3" && phase !== "line-4" && phase !== "direct-final" && phase !== "brand-in" && phase !== "ticket-rise";
  const clearing = phase === "ticket-clears";

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 text-white">
      <section
        className="relative isolate overflow-hidden bg-[#eff8ff]"
        style={{
          width: "min(100vw, 56.25svh)",
          height: "min(177.7778vw, 100svh)",
        }}
      >
        <SocialFilmBackground />
        <div className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center opacity-70">
          <UtensilsCrossed className="h-[56svh] max-h-[540px] w-[56svh] max-w-[540px] text-sky-500/10" strokeWidth={1.28} />
        </div>
        <div className="absolute left-5 right-5 top-4 z-[60] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500/58">
          <span>SmartBar Fees</span>
          <span>{Math.round(SMARTBAR_FEES_REEL_TOTAL_MS / 1000)}s</span>
        </div>

        {showPainImage && (
          <motion.div
            initial={{ y: "112%", opacity: 0, scale: 0.94 }}
            animate={clearing ? { x: "-128%", y: 0, opacity: 0, scale: 0.96, rotate: -4 } : { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: clearing ? 0.56 : 0.68, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-7 right-7 top-[14svh] z-[18] overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
          >
            <img src={feesImage} alt="Restaurant owner reacting to platform fees" className="h-auto w-full object-cover" />
          </motion.div>
        )}

        <SmartBarFeesCaptionStack phase={phase} />
        <SmartBarFeesDirectIntake phase={phase} />
        <SmartBarFeesOrderStream phase={phase} />
        <SmartBarFeesTicket phase={phase} />
        <SmartBarFeesLineStack phase={phase} />
        <SmartBarFeesBrandLockup phase={phase} />
      </section>
    </main>
  );
}


type SmartBarSocialSetupLinePhase =
  | "blank"
  | "line"
  | "scan-empty"
  | "scan-label"
  | "scan-active"
  | "scan-complete"
  | "test-order-label"
  | "test-entry"
  | "test-panel"
  | "test-panel-close"
  | "test-ticket"
  | "ticket-clear"
  | "final-caption-fees"
  | "final-clear-1"
  | "final-caption-integration"
  | "final-clear-2"
  | "final-caption-access"
  | "final-clear-3"
  | "final-caption-line"
  | "final-clear-4"
  | "final-caption-scan"
  | "final-clear-5"
  | "final-caption-test"
  | "final-clear-6"
  | "final-caption-ready"
  | "final-ready-clear"
  | "final-centered";

const SMARTBAR_SETUP_LINE_RAIL_DURATION_S = 10.0; // equal-speed rail: same px/sec before and after pause
const SMARTBAR_SETUP_LINE_PAUSE_X = -1380;
const SMARTBAR_SETUP_SCAN_VACUUM_MS = 6000;
const SMARTBAR_SETUP_SCAN_TAGS = [
  "burgers",
  "fries",
  "shakes",
  "combos",
  "extra sauce",
  "pickup",
  "kids meal",
  "salad",
  "dessert",
  "coffee",
  "breakfast",
  "delivery",
  "dates",
  "guests",
  "ocean view",
  "suite",
  "spa",
  "parking",
  "late checkout",
  "room service",
  "package",
  "availability",
  "pricing",
  "support",
  "quote",
  "hours",
  "location",
  "policies",
  "menu",
  "modifiers",
  "inventory",
  "specials",
];

function smartBarSetupCaptionForPhase(phase: SmartBarSocialSetupLinePhase) {
  switch (phase) {
    case "final-caption-fees":
      return "No installation fees";
    case "final-caption-integration":
      return "No deep integration";
    case "final-caption-access":
      return "No special access";
    case "final-caption-line":
      return "One line added";
    case "final-caption-scan":
      return "Public site scanned";
    case "final-caption-test":
      return "Test ticket received";
    case "final-caption-ready":
      return "Now testing locally";
    default:
      return "";
  }
}

function SmartBarSetupThinkingText({ text }: { text: string }) {
  return (
    <span className="inline-flex min-w-[112px] items-center justify-center text-center">
      <ThinkingText body={text} />
    </span>
  );
}

function SmartBarSetupLineCapsule({ label, thinking = false }: { label?: string; thinking?: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-[46px] w-[260px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-[linear-gradient(180deg,_rgba(20,34,92,0.96)_0%,_rgba(17,29,82,0.98)_52%,_rgba(13,23,68,0.99)_100%)] px-5 text-[15px] font-black tracking-[-0.015em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-1px_0_rgba(2,6,23,0.48),0_16px_38px_rgba(2,6,23,0.30),0_5px_14px_rgba(2,6,23,0.18)] backdrop-blur-[18px]"
    >
      {label ? (thinking ? <SmartBarSetupThinkingText text={label} /> : <span>{label}</span>) : null}
    </motion.div>
  );
}

function SmartBarSetupInstallRailTail() {
  return (
    <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-[25px] font-semibold tracking-[-0.032em] text-slate-900/82">
      <span className="text-slate-700/46">────────</span>
      <span className="rounded-full border border-slate-300/70 bg-white/78 px-4 py-2 font-mono text-[22px] font-bold text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">&lt;script /&gt;</span>
      <span className="text-slate-700/46">────────</span>
      <span><strong className="font-black">(1) One line of code</strong></span>
      <span className="text-slate-700/46">────────</span>
      <span><strong className="font-black">Setup is 3 steps</strong></span>
      <span className="text-slate-700/46">────────&gt;</span>
    </div>
  );
}

function SmartBarSetupScanStream({ active }: { active: boolean }) {
  if (!active) return null;

  const lanes = [-230, -182, -134, -86, -38, 38, 86, 134, 182, 230];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[12px] top-0 z-[22] overflow-hidden">
      {SMARTBAR_SETUP_SCAN_TAGS.map((tag, index) => {
        const startX = lanes[index % lanes.length] + (index % 2 === 0 ? -10 : 10);
        const delay = index * 0.045;
        const duration = 4.35 + (index % 4) * 0.18;
        const midX = startX * 0.62;
        const pullX = startX * 0.18;

        return (
          <motion.div
            key={`${tag}-${index}`}
            initial={{ x: startX, y: "-10svh", opacity: 0, scale: 0.98 }}
            animate={{
              x: [startX, midX, pullX, 0, 0],
              y: ["-12svh", "22svh", "56svh", "88svh", "98svh"],
              opacity: [0, 0.98, 0.98, 0.96, 0],
              scale: [1, 1.05, 1, 0.68, 0.18],
              filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(0.3px)", "blur(1.8px)"],
            }}
            transition={{
              delay,
              duration,
              ease: "easeIn",
              times: [0, 0.18, 0.62, 0.92, 1],
            }}
            className="absolute left-1/2 rounded-full border border-sky-200/80 bg-white/90 px-4 py-2 text-[16px] font-black tracking-[-0.025em] text-slate-800 shadow-[0_12px_30px_rgba(14,116,144,0.14)] backdrop-blur-md"
          >
            {tag}
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: [0.2, 0.72, 0.48, 0], scale: [0.96, 1.06, 1.0, 0.92] }}
        transition={{ duration: 6.0, ease: "easeInOut" }}
        className="absolute bottom-[12px] left-1/2 h-24 w-[300px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(14,165,233,0.38)_0%,_rgba(14,165,233,0.18)_42%,_transparent_74%)] blur-sm"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.12, 0.7, 0.56, 0] }}
        transition={{ duration: 6.0, ease: "easeInOut" }}
        className="absolute bottom-[22px] left-1/2 h-11 w-[170px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.34)_0%,_rgba(125,211,252,0.16)_48%,_transparent_78%)]"
      />
    </div>
  );
}


function SmartBarSetupWatermark({ phase }: { phase: SmartBarSocialSetupLinePhase }) {
  const visible = phase === "final-ready-clear" || phase === "final-centered";
  const revealed = phase === "final-centered";

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          opacity: revealed ? 1 : 0.08,
          scale: revealed ? 1 : 0.96,
          rotate: revealed ? 0 : -3,
        }}
        transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Settings
          className="h-[56svh] max-h-[540px] w-[56svh] max-w-[540px] text-sky-500/12"
          strokeWidth={1.35}
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={revealed ? { y: "-116%", opacity: 0.96 } : { y: "0%", opacity: 0.98 }}
        transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[-12%] bottom-[-12%] h-[124%] rounded-t-[56px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,251,255,0.88)_100%)] shadow-[0_-28px_90px_rgba(255,255,255,0.72)]"
      />
    </div>
  );
}

function SmartBarSetupActualShell({ phase }: { phase: SmartBarSocialSetupLinePhase }) {
  const isEntry = phase === "test-entry";
  const isPanel = phase === "test-panel" || phase === "test-panel-close";
  const isTicket = phase === "test-ticket" || phase === "ticket-clear";
  const isFinal = phase.startsWith("final-");
  const isClosing = phase === "test-panel-close";

  if (!isEntry && !isPanel && !isTicket && !isFinal) return null;

  const demoSubmission = isEntry
    ? {
        id: 9301,
        query: "Type in test order",
        typing: true,
        manualSubmit: true,
        typeDelayMs: 22,
      }
    : null;

  const demoMontageStage: SmartBarMobileDemoMontageStage | null = isPanel
    ? {
        id: isClosing ? "setup-test-confirmation-closed" : "setup-test-confirmation-open",
        label: isClosing ? "" : "received on tablet",
        surface: "confirmation",
        open: !isClosing,
      }
    : null;

  const setupCaption = smartBarSetupCaptionForPhase(phase);
  const finalBrandVisible = phase === "final-ready-clear" || phase === "final-centered";
  const shellCentered = phase === "final-centered";
  const restCompanion = finalBrandVisible || isTicket
    ? { label: "SmartBar", showLogo: true }
    : isFinal
      ? { blank: true }
      : { blank: true };

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: 1,
        y: shellCentered ? "-36%" : 0,
        scale: shellCentered ? 1.035 : 1,
      }}
      transition={{
        opacity: { duration: 0.34 },
        y: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
      }}
      className="pointer-events-none absolute inset-0 z-[31] overflow-visible [transform-style:preserve-3d]"
      style={{ transformOrigin: "center bottom", transform: "translateZ(0)" }}
    >
      <SmartBarMobileShell
        mode="overlay"
        demoRestCompanion={restCompanion}
        entryModeLabel="Type in test order"
        buildingLabel="Send test"
        demoSubmission={demoSubmission}
        demoMontageStage={demoMontageStage}
        sendOrderNumber="S-test"
        introCallout={setupCaption ? { title: setupCaption, startDelayMs: 120, typeDelayMs: 22 } : null}
        demoResetToRestKey={isFinal ? "setup-reel-final-live-caption" : null}
      />
    </motion.div>
  );
}

function SmartBarSetupFallingTicket({ active }: { active: boolean }) {
  if (!active) return null;

  const ticketItems = [
    {
      group: "Mains",
      quantity: "1×",
      name: "Classic burger combo",
      details: ["Medium fries", "Diet Coke"],
    },
    {
      group: "Dessert",
      quantity: "1×",
      name: "Chocolate shake",
      details: ["Whipped cream", "Cherry"],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: "-112svh", scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.86, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute inset-x-[3px] top-[14px] z-[34]"
    >
      <div className="mx-auto w-[min(calc(100%-6px),528px)] overflow-hidden rounded-[38px] border border-slate-200/90 bg-white text-slate-950 shadow-[0_28px_84px_rgba(15,23,42,0.30)] ring-1 ring-slate-950/5">
        <div className="mx-auto mt-4 h-1.5 w-[70px] rounded-full bg-slate-300" />

        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.26em] text-sky-600">SmartBar Order</div>
            <div className="mt-1 flex flex-nowrap items-center gap-3">
              <h1 className="shrink-0 whitespace-nowrap text-[50px] font-black leading-none tracking-[-0.075em] text-slate-950">S-test</h1>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                New ticket
              </span>
            </div>
            <div className="mt-3 text-base font-semibold text-slate-500">
              just now · ASAP · Pay at counter
            </div>
          </div>

          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-hidden="true"
          >
            <span className="text-4xl font-light leading-none">×</span>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="flex flex-col gap-2.5">
            {ticketItems.map((item) => (
              <section
                key={item.name}
                className="w-full rounded-[20px] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80"
              >
                <div className="flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 leading-tight">
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">
                    {item.group}
                  </span>
                  <span className="text-[1rem] font-black text-sky-700">{item.quantity}</span>
                  <span className="text-[1rem] font-black text-slate-950">{item.name}</span>
                </div>
                <div className="mt-2 flex max-w-full flex-wrap gap-1.5 pl-0 text-[0.72rem] font-bold leading-none text-slate-500">
                  {item.details.map((detail) => (
                    <span key={detail} className="rounded-full bg-slate-50 px-2.5 py-1">
                      {detail}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[24px] bg-slate-50/80 px-5 py-5 text-slate-500 ring-1 ring-slate-100">
            <div className="flex flex-col items-center justify-center gap-1 rounded-[18px] py-2 text-sky-700">
              <ArrowUp className="h-9 w-9" strokeWidth={2.4} />
              <span className="text-xs font-black uppercase tracking-[0.18em]">Entered</span>
            </div>
            <div className="text-center text-xs font-black uppercase tracking-[0.32em] text-slate-400">Swipe</div>
            <div className="flex flex-col items-center justify-center gap-1 rounded-[18px] py-2 text-slate-500">
              <span className="text-xs font-black uppercase tracking-[0.18em]">On Hold</span>
              <ArrowDown className="h-9 w-9" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


type SmartBarSocialFaqPhase =
  | "blank"
  | "intro"
  | "question-1"
  | "question-2"
  | "question-3"
  | "question-4"
  | "question-5"
  | "question-6"
  | "final-bridge"
  | "final-centered";

const SMARTBAR_FAQ_CARD_HEIGHT = 214;
const SMARTBAR_FAQ_SURFACE_HEIGHT = SMARTBAR_FAQ_CARD_HEIGHT + 16;

const SMARTBAR_FAQ_ITEMS = [
  {
    question: "What do we need to get started?",
    answer: "An ordinary tablet — or smartphone — connected to the web.",
    helper: "No new counter hardware required for the first version.",
    note: "Start simple",
    graphic: "devices",
    cardHeight: SMARTBAR_FAQ_CARD_HEIGHT,
  },
  {
    question: "Do we need POS integration?",
    answer: "No. SmartBar can start as tablet-based intake. Staff receive a clean ticket and enter it like a normal counter order.",
    helper: "That keeps setup lighter and avoids a big integration project on day one.",
    note: "No POS required",
    graphic: "no-pos",
    cardHeight: SMARTBAR_FAQ_CARD_HEIGHT,
  },
  {
    question: "Can it integrate with our POS later?",
    answer: "Yes. POS integration can be scoped separately if you want a deeper setup.",
    helper: "Start with clean tickets. Integrate later if the business case is there.",
    note: "Integration optional",
    graphic: "integration",
    cardHeight: SMARTBAR_FAQ_CARD_HEIGHT,
  },
  {
    question: "Is there a per-order fee?",
    answer: "No per-order platform fee. SmartBar is direct intake, not a delivery marketplace.",
    helper: "The restaurant keeps the customer relationship instead of routing every order through a third-party marketplace.",
    note: "No per-order fee",
    graphic: "fee",
    cardHeight: SMARTBAR_FAQ_CARD_HEIGHT,
  },
  {
    question: "What does my staff receive?",
    answer: "A clean SmartBar ticket with items, modifiers, missing details, and customer notes organized.",
    helper: "The goal is less phone chaos and fewer missed details.",
    note: "Clean tickets",
    graphic: "ticket",
    cardHeight: SMARTBAR_FAQ_CARD_HEIGHT,
  },
  {
    question: "Is this replacing phone orders?",
    answer: "Yes. Customers type or say what they want. SmartBar checks the order and sends staff a clean ticket.",
    helper: "Phone-order replacement is the starting point.",
    note: "Orders next",
    graphic: "phone-ticket",
    cardHeight: SMARTBAR_FAQ_CARD_HEIGHT,
  },
] as const;

function smartBarFaqIndexForPhase(phase: SmartBarSocialFaqPhase) {
  if (!phase.startsWith("question-")) return -1;
  const index = Number(phase.replace("question-", "")) - 1;
  return Number.isFinite(index) ? index : -1;
}


type SmartBarFaqGraphicKind =
  | "devices"
  | "no-pos"
  | "integration"
  | "fee"
  | "ticket"
  | "phone-ticket";

function SmartBarFaqHelperGraphic({ kind }: { kind: SmartBarFaqGraphicKind }) {
  const frameClass = "relative flex h-[66px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-sky-50/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] ring-1 ring-sky-100/90";

  if (kind === "devices") {
    return (
      <div className={frameClass}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
          className="absolute left-3 bottom-3 flex h-9 w-7 items-center justify-center rounded-[8px] bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
        >
          <Tablet className="h-4 w-4" strokeWidth={2.45} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.36, delay: 0.08, ease: "easeOut" }}
          className="absolute right-3 bottom-3 flex h-9 w-6 items-center justify-center rounded-[8px] bg-white text-slate-700 shadow-sm ring-1 ring-sky-100"
        >
          <Smartphone className="h-4 w-4" strokeWidth={2.45} />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.38, 1, 0.38], scale: [0.95, 1.08, 0.95] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-2.5 text-sky-600"
        >
          <Wifi className="h-5 w-5" strokeWidth={2.55} />
        </motion.div>
      </div>
    );
  }

  if (kind === "no-pos") {
    return (
      <div className={frameClass}>
        <div className="absolute right-3 top-3 flex h-9 w-10 items-center justify-center rounded-[10px] bg-slate-200/55 text-slate-400 ring-1 ring-slate-200/80">
          <Monitor className="h-5 w-5" strokeWidth={2.35} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          className="absolute left-3 bottom-3 w-10 rounded-[10px] bg-white px-2 py-1.5 shadow-sm ring-1 ring-sky-100"
        >
          <div className="mb-1 h-1.5 w-5 rounded-full bg-sky-600" />
          <div className="space-y-1">
            <div className="h-1 rounded-full bg-slate-300" />
            <div className="h-1 w-4 rounded-full bg-slate-200" />
            <div className="h-1 w-5 rounded-full bg-slate-200" />
          </div>
        </motion.div>
        <div className="absolute right-2 bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          <X className="h-3 w-3" strokeWidth={3} />
        </div>
      </div>
    );
  }

  if (kind === "integration") {
    return (
      <div className={frameClass}>
        <div className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-slate-700 shadow-sm ring-1 ring-sky-100">
          <Monitor className="h-5 w-5" strokeWidth={2.35} />
        </div>
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-2 flex items-center text-sky-700"
        >
          <Cable className="h-7 w-7" strokeWidth={2.4} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0.3], scale: [0.72, 1.18, 0.92] }}
          transition={{ duration: 1.05, delay: 0.5, repeat: Infinity, repeatDelay: 0.55, ease: "easeInOut" }}
          className="absolute right-[31px] top-[23px] h-3 w-3 rounded-full bg-sky-400/80 blur-[1px]"
        />
      </div>
    );
  }

  if (kind === "fee") {
    return (
      <div className={frameClass}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="relative flex h-11 w-11 items-center justify-center rounded-[15px] bg-white text-slate-700 shadow-sm ring-1 ring-sky-100"
        >
          <CircleDollarSign className="h-6 w-6" strokeWidth={2.35} />
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.38, delay: 0.36, ease: "easeOut" }}
            className="absolute left-[-2px] top-[20px] h-[3px] w-12 origin-center rotate-[-28deg] rounded-full bg-rose-500"
          />
        </motion.div>
      </div>
    );
  }

  if (kind === "ticket") {
    return (
      <div className={frameClass}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="w-12 rounded-[12px] bg-white px-2 py-2 shadow-sm ring-1 ring-sky-100"
        >
          <div className="mb-1 flex items-center gap-1 text-sky-700">
            <ReceiptText className="h-3.5 w-3.5" strokeWidth={2.6} />
            <div className="h-1.5 w-4 rounded-full bg-sky-600" />
          </div>
          <div className="space-y-1">
            <div className="h-1 rounded-full bg-slate-300" />
            <div className="h-1 w-7 rounded-full bg-slate-200" />
            <div className="h-1 w-8 rounded-full bg-slate-200" />
            <div className="h-1 w-5 rounded-full bg-slate-200" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <motion.div
        initial={{ opacity: 1, x: 0 }}
        animate={{ opacity: [1, 1, 0], x: [0, -2, -17], rotate: [0, -3, -7] }}
        transition={{ duration: 1.15, delay: 0.25, ease: "easeInOut" }}
        className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-slate-600 shadow-sm ring-1 ring-sky-100"
      >
        <PhoneCall className="h-5 w-5" strokeWidth={2.35} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.48, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
        className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-sky-700 shadow-sm ring-1 ring-sky-100"
      >
        <ReceiptText className="h-5 w-5" strokeWidth={2.45} />
      </motion.div>
    </div>
  );
}

function SmartBarFaqAnswerContent({ question, answer, cardHeight, graphic }: { question: string; answer: string; cardHeight: number; graphic: SmartBarFaqGraphicKind }) {
  return (
    <div
      className="flex overflow-hidden rounded-[28px] border border-white/30 bg-white/94 text-slate-950 shadow-[0_14px_34px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.78)] ring-1 ring-white/46 backdrop-blur-xl"
      style={{ height: cardHeight }}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto]">
        <div className="flex min-h-0 items-start gap-3.5 px-5 pb-3 pt-4 text-[15px] font-normal leading-[1.38] tracking-[-0.01em] text-slate-950">
          <SmartBarFaqHelperGraphic kind={graphic} />
          <span className="min-w-0 flex-1 pt-0.5">{answer}</span>
        </div>
        <div className="shrink-0 border-t border-slate-200/72 bg-sky-50/76 px-5 pb-4 pt-3 text-[12.5px] font-semibold leading-[1.28] text-slate-700">
          <span className="mr-1.5 text-[9.5px] font-black uppercase tracking-[0.16em] text-sky-700/78">Asked</span>
          {question}
        </div>
      </div>
    </div>
  );
}


function SmartBarFaqProgress({ phase }: { phase: SmartBarSocialFaqPhase }) {
  const index = smartBarFaqIndexForPhase(phase);
  if (index < 0) return null;

  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="pointer-events-none absolute left-5 right-5 top-4 z-[60] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500/58"
    >
      <span>FAQ {index + 1} of {SMARTBAR_FAQ_ITEMS.length}</span>
      <span>{SMARTBAR_FAQ_ITEMS[index]?.note}</span>
    </motion.div>
  );
}

function SmartBarFaqFinalLockup({ phase }: { phase: SmartBarSocialFaqPhase }) {
  const bridge = phase === "final-bridge";
  const centered = phase === "final-centered";

  if (!bridge && !centered) return null;

  return (
    <motion.div
      initial={false}
      animate={centered ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0.24, scale: 0.92, rotate: -5 }}
      transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none absolute inset-0 z-[20] flex items-center justify-center"
    >
      <Compass className="h-[54svh] max-h-[520px] w-[54svh] max-w-[520px] text-sky-500/10" strokeWidth={1.28} />
    </motion.div>
  );
}

export function SmartBarSocialFaqReel() {
  const [phase, setPhase] = useState<SmartBarSocialFaqPhase>("blank");
  const [submission, setSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [resetKey, setResetKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      setSubmission(null);
      setResetKey(null);
      await wait(SMARTBAR_SOCIAL_RECORDING_PREROLL_MS);
      if (cancelled) return;

      setPhase("intro");
      setResetKey("faq-intro");
      await wait(2100);
      if (cancelled) return;

      for (let index = 0; index < SMARTBAR_FAQ_ITEMS.length; index += 1) {
        const nextPhase = `question-${index + 1}` as SmartBarSocialFaqPhase;
        setPhase(nextPhase);
        setSubmission({
          id: index + 1,
          query: SMARTBAR_FAQ_ITEMS[index].question,
          typing: true,
          typeDelayMs: 23,
          submitDelayMs: 560,
        });
        await wait(index === 0 ? 8200 : 9000);
        if (cancelled) return;
      }

      setSubmission(null);
      setResetKey("faq-final-bridge");
      setPhase("final-bridge");
      await wait(2600);
      if (cancelled) return;

      setPhase("final-centered");
      await wait(3200);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeIndex = smartBarFaqIndexForPhase(phase);
  const isFinalPhase = phase === "final-bridge" || phase === "final-centered";
  const shellCentered = phase === "final-centered";
  const faqFinalCaption = phase === "final-bridge" ? "Questions answered. Orders next." : null;
  const faqRestCompanion = isFinalPhase
    ? shellCentered
      ? { label: "SmartBar", showLogo: true }
      : { blank: true }
    : null;

  const handleFaqSubmit = (query: string): SmartBarMobileSubmitResult => {
    const normalizedQuery = query.trim().toLowerCase();
    const item = SMARTBAR_FAQ_ITEMS.find((candidate) => candidate.question.toLowerCase() === normalizedQuery) ??
      (activeIndex >= 0 ? SMARTBAR_FAQ_ITEMS[activeIndex] : SMARTBAR_FAQ_ITEMS[0]);

    return {
      surfaceKind: "chat",
      title: "SmartBar answer",
      eyebrow: "FAQ",
      statusLabel: "Answered",
      height: SMARTBAR_FAQ_SURFACE_HEIGHT,
      content: <SmartBarFaqAnswerContent question={item.question} answer={item.answer} cardHeight={item.cardHeight} graphic={item.graphic} />,
    };
  };

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 text-white">
      <section
        className="relative isolate overflow-hidden bg-[#eff8ff]"
        style={{
          width: "min(100vw, 56.25svh)",
          height: "min(177.7778vw, 100svh)",
        }}
      >
        <SocialFilmBackground />
        <div className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center opacity-80">
          <Compass className="h-[56svh] max-h-[540px] w-[56svh] max-w-[540px] text-sky-500/10" strokeWidth={1.28} />
        </div>

        <SmartBarFaqProgress phase={phase} />

        <motion.div
          initial={false}
          animate={{
            opacity: 1,
            y: shellCentered ? "-36%" : 0,
            scale: shellCentered ? 1.035 : 1,
          }}
          transition={{
            opacity: { duration: 0.34 },
            y: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
          }}
          className="pointer-events-none absolute inset-0 z-[31] overflow-visible [transform-style:preserve-3d]"
          style={{ transformOrigin: "center bottom", transform: "translateZ(0)" }}
        >
          {phase !== "blank" && (
          <SmartBarMobileShell
            mode="overlay"
            demoRestCompanion={faqRestCompanion}
            entryModeLabel="Ask SmartBar"
            buildingLabel="Answering..."
            demoSubmission={submission}
            demoResetToRestKey={isFinalPhase ? "faq-reel-final-live-caption" : resetKey}
            introCallout={faqFinalCaption ? { title: faqFinalCaption, startDelayMs: 120, typeDelayMs: 22 } : phase === "intro" ? { title: "Common restaurant questions", startDelayMs: 220, typeDelayMs: 24 } : null}
            onSubmitPrompt={handleFaqSubmit}
          />
          )}
        </motion.div>

        <SmartBarFaqFinalLockup phase={phase} />
      </section>
    </main>
  );
}

export function SmartBarSocialSetupLinePrototype() {
  const [phase, setPhase] = useState<SmartBarSocialSetupLinePhase>("blank");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      await wait(SMARTBAR_SOCIAL_RECORDING_PREROLL_MS);
      if (cancelled) return;

      setPhase("line");
      await wait(SMARTBAR_SETUP_LINE_RAIL_DURATION_S * 1000);
      if (cancelled) return;

      setPhase("scan-empty");
      await wait(1500);
      if (cancelled) return;

      setPhase("scan-label");
      await wait(750);
      if (cancelled) return;

      setPhase("scan-active");
      await wait(SMARTBAR_SETUP_SCAN_VACUUM_MS);
      if (cancelled) return;

      setPhase("scan-complete");
      await wait(1100);
      if (cancelled) return;

      setPhase("test-order-label");
      await wait(1200);
      if (cancelled) return;

      setPhase("test-entry");
      await wait(1450);
      if (cancelled) return;

      setPhase("test-panel");
      await wait(1650);
      if (cancelled) return;

      setPhase("test-panel-close");
      await wait(420);
      if (cancelled) return;

      setPhase("test-ticket");
      await wait(2000);
      if (cancelled) return;

      setPhase("ticket-clear");
      await wait(520);
      if (cancelled) return;

      setPhase("final-caption-fees");
      await wait(2200);
      if (cancelled) return;

      setPhase("final-clear-1");
      await wait(300);
      if (cancelled) return;

      setPhase("final-caption-integration");
      await wait(2200);
      if (cancelled) return;

      setPhase("final-clear-2");
      await wait(300);
      if (cancelled) return;

      setPhase("final-caption-access");
      await wait(2200);
      if (cancelled) return;

      setPhase("final-clear-3");
      await wait(300);
      if (cancelled) return;

      setPhase("final-caption-line");
      await wait(2200);
      if (cancelled) return;

      setPhase("final-clear-4");
      await wait(300);
      if (cancelled) return;

      setPhase("final-caption-scan");
      await wait(2200);
      if (cancelled) return;

      setPhase("final-clear-5");
      await wait(300);
      if (cancelled) return;

      setPhase("final-caption-test");
      await wait(2200);
      if (cancelled) return;

      setPhase("final-clear-6");
      await wait(300);
      if (cancelled) return;

      setPhase("final-caption-ready");
      await wait(3000);
      if (cancelled) return;

      setPhase("final-ready-clear");
      await wait(520);
      if (cancelled) return;

      setPhase("final-centered");
      await wait(3000);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const scanActive = phase === "scan-active";
  const capsuleLabel =
    phase === "scan-label" || phase === "scan-active"
      ? "(2) a public site scan..."
      : phase === "scan-complete"
        ? "site mapped"
        : phase === "test-order-label"
          ? "(3) and a test order"
          : undefined;
  const capsuleThinking = phase === "scan-active";

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 text-white">
      <section
        className="relative isolate overflow-hidden bg-[#eff8ff]"
        style={{
          width: "min(100vw, 56.25svh)",
          height: "min(177.7778vw, 100svh)",
        }}
      >
        <SocialFilmBackground />
        <SmartBarSetupWatermark phase={phase} />
        <SmartBarSetupScanStream active={scanActive} />

        <div className="pointer-events-none absolute inset-0 z-[24] overflow-hidden">
          <motion.div
            initial={false}
            animate={phase === "blank" ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.32 }}
            className="absolute inset-0"
          >
            {(phase === "line" || phase === "scan-empty" || phase === "scan-label" || phase === "scan-active" || phase === "scan-complete" || phase === "test-order-label") && (
              <motion.div
                initial={{ x: "-1760px", y: 0 }}
                animate={
                  phase === "line"
                    ? { x: ["-1760px", `${SMARTBAR_SETUP_LINE_PAUSE_X}px`, `${SMARTBAR_SETUP_LINE_PAUSE_X}px`, "-130px", "-130px"], y: 0 }
                    : { x: "-130px", y: 0 }
                }
                transition={
                  phase === "line"
                    ? {
                        duration: SMARTBAR_SETUP_LINE_RAIL_DURATION_S,
                        ease: "linear",
                        times: [0, 0.198, 0.288, 0.94, 1],
                      }
                    : { duration: 0 }
                }
                className="absolute bottom-[12px] left-1/2 flex items-center gap-4"
              >
                <SmartBarSetupLineCapsule
                  label={phase === "line" ? undefined : capsuleLabel}
                  thinking={phase === "line" ? false : capsuleThinking}
                />

                {phase === "line" ? (
                  <SmartBarSetupInstallRailTail />
                ) : (
                  <motion.div
                    initial={{ x: 0, opacity: 1 }}
                    animate={{ x: 780, opacity: 0.86 }}
                    transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center"
                  >
                    <SmartBarSetupInstallRailTail />
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        <SmartBarSetupActualShell phase={phase} />
        <SmartBarSetupFallingTicket active={phase === "test-ticket"} />
      </section>
    </main>
  );
}

function SmartBarSocialFoodWatermark({ phase }: { phase: SmartBarSocialFilmPhase }) {
  const visible = phase === "final-orders-clear" || phase === "final-centered";
  const revealed = phase === "final-centered";

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          opacity: revealed ? 1 : 0.08,
          scale: revealed ? 1 : 0.96,
        }}
        transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <UtensilsCrossed
          className="h-[54svh] max-h-[520px] w-[54svh] max-w-[520px] text-sky-500/12"
          strokeWidth={1.45}
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={revealed ? { y: "-116%", opacity: 0.96 } : { y: "0%", opacity: 0.98 }}
        transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[-12%] bottom-[-12%] h-[124%] rounded-t-[56px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,251,255,0.88)_100%)] shadow-[0_-28px_90px_rgba(255,255,255,0.72)]"
      />
    </div>
  );
}

function SmartBarSocialOrderBoardScene({ phase }: { phase: SmartBarSocialFilmPhase }) {
  if (!smartBarSocialOrderBoardVisible(phase)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-4 right-4 top-14 z-[22] h-[calc(100%-214px)] overflow-visible rounded-[34px] border border-white/70 bg-white/62 shadow-[0_22px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/5 backdrop-blur-xl"
    >
      <div
        className="h-full origin-top-left"
        style={{ width: "100%", height: "100%", transformOrigin: "top left" }}
      >
        <SmartBarOrderBoardMock
          demoMode
          demoSocialPortrait
          demoRevealOrderId="S-184"
          demoRevealDelayMs={720}
          demoOrders={SMARTBAR_SOCIAL_ORDER_BOARD_ORDERS}
          demoAutoOpenOrderId={phase === "tablet-open" ? "S-184" : undefined}
          demoAutoOpenKey={phase === "tablet-open" ? "open-s-184" : undefined}
          demoAutoOpenDelayMs={240}
          demoAutoMarkEnteredOrderId={phase === "tablet-entered" ? "S-184" : undefined}
          demoAutoMarkEnteredKey={phase === "tablet-entered" ? "entered-s-184" : undefined}
          demoAutoMarkEnteredDelayMs={1010}
          className="!h-full !min-h-0 !px-3 !py-4"
        />
      </div>
    </motion.div>
  );
}


type SmartBarSocialTeaserPhase =
  | "blank"
  | "empty"
  | "searchbar"
  | "site"
  | "smartbar"
  | "mounted"
  | "plain"
  | "action"
  | "caddy"
  | "tool"
  | "food-label"
  | "food-carts-closed"
  | "food-carts-open"
  | "food-requirements-closed"
  | "food-requirements-open"
  | "food-extras-closed"
  | "food-extras-open"
  | "food-corrections-closed"
  | "food-corrections-open"
  | "food-ticket-closed"
  | "food-ticket-open"
  | "booking-label"
  | "booking-details-closed"
  | "booking-details-open"
  | "booking-room-preview-closed"
  | "booking-room-preview-open"
  | "booking-rooms-closed"
  | "booking-rooms-one-open"
  | "booking-rooms-two-open"
  | "booking-rooms-three-open"
  | "booking-packages-closed"
  | "booking-packages-open"
  | "booking-dates-closed"
  | "booking-dates-open"
  | "booking-guests-closed"
  | "booking-guests-open"
  | "booking-summary-closed"
  | "booking-summary-open"
  | "final-empty"
  | "final-brand-return"
  | "final-caption-actions"
  | "final-actions-clear"
  | "final-centered";

const SMARTBAR_SOCIAL_TEASER_TOTAL_MS = 59000;

function smartBarSocialTeaserCaptionForPhase(phase: SmartBarSocialTeaserPhase) {
  switch (phase) {
    case "mounted":
      return "A search bar that shops";
    case "plain":
      return "Plain English in";
    case "action":
      return "Action out";
    case "caddy":
      return "Like a caddy";
    case "tool":
      return "with the right tool ready";
    case "food-label":
      return "Food orders";
    case "booking-label":
      return "Hotel bookings";
    case "final-caption-actions":
      return "Turns words into actions";
    default:
      return "";
  }
}


function smartBarSocialTeaserMontageStageForPhase(
  phase: SmartBarSocialTeaserPhase,
): SmartBarMobileDemoMontageStage | null {
  const open = phase.endsWith("-open");

  if (phase.startsWith("food-carts-")) {
    return { id: phase, label: "Cart built", surface: "carts", open };
  }

  if (phase.startsWith("food-requirements-")) {
    return {
      id: phase,
      label: "Choices checked",
      surface: "requirements",
      open,
      status: "pending",
      selectedOptions: ["Medium"],
    };
  }

  if (phase.startsWith("food-extras-")) {
    return {
      id: phase,
      label: "Extras offered",
      surface: "extras",
      open,
      status: "options",
      selectedOptions: ["Whipped cream", "Cherry"],
    };
  }

  if (phase.startsWith("food-corrections-")) {
    return {
      id: phase,
      label: "Unknowns flagged",
      surface: "corrections",
      open,
      status: "unknown",
      retryDraft: "re-entered item",
    };
  }

  if (phase.startsWith("food-ticket-")) {
    return { id: phase, label: "Ticket ready", surface: "confirmation", open };
  }

  if (phase.startsWith("booking-details-")) {
    return { id: phase, label: "Dates confirmed", surface: "booking_details", open };
  }

  if (phase.startsWith("booking-room-preview-")) {
    return { id: phase, label: "Room previewed", surface: "booking_room_preview", open };
  }

  if (phase.startsWith("booking-rooms-")) {
    return { id: phase, label: "Rooms compared", surface: "booking_rooms", open };
  }

  if (phase.startsWith("booking-packages-")) {
    return { id: phase, label: "Packages reviewed", surface: "booking_packages", open };
  }

  if (phase.startsWith("booking-dates-")) {
    return { id: phase, label: "Dates gathered", surface: "booking_dates", open };
  }

  if (phase.startsWith("booking-guests-")) {
    return { id: phase, label: "Guests set", surface: "booking_guests", open };
  }

  if (phase.startsWith("booking-summary-")) {
    return { id: phase, label: "Bookings summarized", surface: "booking_summary", open };
  }

  return null;
}

function SmartBarSocialTeaserWatermark({ phase }: { phase: SmartBarSocialTeaserPhase }) {
  const visible = phase === "final-actions-clear" || phase === "final-centered";
  const revealed = phase === "final-centered";

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          opacity: revealed ? 1 : 0.08,
          scale: revealed ? 1 : 0.96,
          rotate: revealed ? 0 : -4,
        }}
        transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Compass
          className="h-[56svh] max-h-[540px] w-[56svh] max-w-[540px] text-sky-500/12"
          strokeWidth={1.35}
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={revealed ? { y: "-116%", opacity: 0.96 } : { y: "0%", opacity: 0.98 }}
        transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[-12%] bottom-[-12%] h-[124%] rounded-t-[56px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,251,255,0.88)_100%)] shadow-[0_-28px_90px_rgba(255,255,255,0.72)]"
      />
    </div>
  );
}

function SmartBarSocialTeaserHeader({ phase }: { phase: SmartBarSocialTeaserPhase }) {
  return (
    <motion.div
      initial={false}
      animate={phase === "blank" || phase.startsWith("final-") ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.36 }}
      className="absolute left-5 right-5 top-4 z-[60] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/58"
    >
      <span>SmartBar Teaser</span>
      <span>{Math.round(SMARTBAR_SOCIAL_TEASER_TOTAL_MS / 1000)}s</span>
    </motion.div>
  );
}

export function SmartBarSocialTeaserReel() {
  const [phase, setPhase] = useState<SmartBarSocialTeaserPhase>("blank");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      await wait(SMARTBAR_SOCIAL_RECORDING_PREROLL_MS);
      if (cancelled) return;

      setPhase("empty");
      await wait(1050);
      if (cancelled) return;

      setPhase("searchbar");
      await wait(1272);
      if (cancelled) return;

      setPhase("site");
      await wait(1272);
      if (cancelled) return;

      setPhase("smartbar");
      await wait(1242);
      if (cancelled) return;

      setPhase("mounted");
      await wait(2700);
      if (cancelled) return;

      setPhase("plain");
      await wait(1962);
      if (cancelled) return;

      setPhase("action");
      await wait(1824);
      if (cancelled) return;

      setPhase("caddy");
      await wait(1962);
      if (cancelled) return;

      setPhase("tool");
      await wait(1716);
      if (cancelled) return;

      setPhase("food-label");
      await wait(3150);
      if (cancelled) return;

      setPhase("food-carts-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("food-carts-open");
      await wait(1050);
      if (cancelled) return;

      setPhase("food-carts-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("food-requirements-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("food-requirements-open");
      await wait(1134);
      if (cancelled) return;

      setPhase("food-requirements-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("food-extras-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("food-extras-open");
      await wait(1134);
      if (cancelled) return;

      setPhase("food-extras-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("food-corrections-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("food-corrections-open");
      await wait(1134);
      if (cancelled) return;

      setPhase("food-corrections-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("food-ticket-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("food-ticket-open");
      await wait(1356);
      if (cancelled) return;

      setPhase("food-ticket-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-label");
      await wait(3150);
      if (cancelled) return;

      setPhase("booking-details-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-details-open");
      await wait(1260);
      if (cancelled) return;

      setPhase("booking-details-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-room-preview-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-room-preview-open");
      await wait(1260);
      if (cancelled) return;

      setPhase("booking-room-preview-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-rooms-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-rooms-one-open");
      await wait(820);
      if (cancelled) return;

      setPhase("booking-rooms-two-open");
      await wait(820);
      if (cancelled) return;

      setPhase("booking-rooms-three-open");
      await wait(940);
      if (cancelled) return;

      setPhase("booking-rooms-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-packages-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-packages-open");
      await wait(1134);
      if (cancelled) return;

      setPhase("booking-packages-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-dates-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-dates-open");
      await wait(1260);
      if (cancelled) return;

      setPhase("booking-dates-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-guests-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-guests-open");
      await wait(1134);
      if (cancelled) return;

      setPhase("booking-guests-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("booking-summary-closed");
      await wait(360);
      if (cancelled) return;

      setPhase("booking-summary-open");
      await wait(1356);
      if (cancelled) return;

      setPhase("booking-summary-closed");
      await wait(300);
      if (cancelled) return;

      setPhase("final-empty");
      await wait(2000);
      if (cancelled) return;

      setPhase("final-brand-return");
      await wait(1500);
      if (cancelled) return;

      setPhase("final-caption-actions");
      await wait(4140);
      if (cancelled) return;

      setPhase("final-actions-clear");
      await wait(360);
      if (cancelled) return;

      setPhase("final-centered");
      await wait(3036);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const shellVisible = phase !== "blank";
  const shellCentered = phase === "final-centered";
  const shellMounted =
    !shellCentered &&
    (phase === "mounted" ||
      phase === "plain" ||
      phase === "action" ||
      phase === "caddy" ||
      phase === "tool" ||
      phase === "food-label" ||
      phase.startsWith("food-") ||
      phase === "booking-label" ||
      phase.startsWith("booking-") ||
      phase.startsWith("final-"));

  const restCompanion =
    phase === "empty" || phase === "final-empty"
      ? { blank: true }
      : phase === "searchbar"
        ? { label: "A search bar" }
        : phase === "site"
          ? { label: "on any site" }
          : phase === "smartbar" || shellMounted
            ? { label: "SmartBar", showLogo: true }
            : null;

  const teaserCaption = smartBarSocialTeaserCaptionForPhase(phase);
  const teaserCalloutStartDelayMs = phase === "mounted" ? 920 : 126;
  const teaserMontageStage = smartBarSocialTeaserMontageStageForPhase(phase);

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 text-white">
      <section
        className="relative isolate overflow-hidden bg-[#eff8ff]"
        style={{
          width: "min(100vw, 56.25svh)",
          height: "min(177.7778vw, 100svh)",
        }}
      >
        <SocialFilmBackground />
        <SmartBarSocialTeaserWatermark phase={phase} />
        <SmartBarSocialTeaserHeader phase={phase} />

        <motion.div
          initial={false}
          animate={
            shellVisible
              ? {
                  opacity: 1,
                  y: shellMounted ? 0 : "-36%",
                  scale: shellMounted ? 1 : 1.035,
                }
              : {
                  opacity: 0,
                  y: "-36%",
                  scale: 0.96,
                }
          }
          transition={{
            opacity: { duration: 0.34 },
            y: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
          }}
          className="absolute inset-0 z-[30] overflow-visible [transform-style:preserve-3d]"
          style={{
            transformOrigin: "center bottom",
            transform: "translateZ(0)",
          }}
        >
          <SmartBarMobileShell
            mode="overlay"
            entryModeLabel="Ask SmartBar"
            buildingLabel="Building..."
            introCallout={teaserCaption ? { title: teaserCaption, startDelayMs: teaserCalloutStartDelayMs, typeDelayMs: 25 } : null}
            demoRestCompanion={restCompanion}
            demoMontageStage={teaserMontageStage}
            demoResetToRestKey={phase === "booking-label" ? "smartbar-teaser-booking" : phase.startsWith("final-") ? "smartbar-teaser-final" : null}
          />
        </motion.div>
      </section>
    </main>
  );
}


type SmartBarSocialBookingReelPhase =
  | "blank"
  | "empty"
  | "searchbar"
  | "site"
  | "smartbar"
  | "mounted"
  | "title"
  | "entry"
  | "booking-clear"
  | "booking-tracker-open"
  | "booking-details-closed"
  | "booking-details-open"
  | "booking-details-spotlight"
  | "booking-dates-closed"
  | "booking-dates-open"
  | "booking-guests-closed"
  | "booking-guests-open"
  | "booking-room-preview-closed"
  | "booking-room-preview-open"
  | "booking-room-preview-spotlight"
  | "booking-rooms-one-closed"
  | "booking-rooms-one-open"
  | "booking-rooms-two-closed"
  | "booking-rooms-two-open"
  | "booking-rooms-two-spotlight"
  | "booking-rooms-three-closed"
  | "booking-rooms-three-open"
  | "booking-rooms-three-spotlight"
  | "booking-room-chosen-closed"
  | "booking-room-chosen-open"
  | "booking-room-chosen-spotlight"
  | "booking-packages-closed"
  | "booking-packages-open"
  | "booking-packages-spotlight"
  | "booking-finalized-closed"
  | "booking-finalized-open"
  | "booking-summary-closed"
  | "booking-summary-open"
  | "final-clear"
  | "final-caption-visitors"
  | "final-clear-1"
  | "final-caption-choices"
  | "final-clear-2"
  | "final-caption-preview"
  | "final-clear-2b"
  | "final-caption-add-ons"
  | "final-clear-3"
  | "final-caption-upsells"
  | "final-clear-4"
  | "final-caption-decisions"
  | "final-clear-5"
  | "final-brand-return"
  | "final-caption-bookings"
  | "final-bookings-clear"
  | "final-centered";

const SMARTBAR_SOCIAL_BOOKING_REEL_HOLD_MULTIPLIER = 1.2;
const bookingReelHold = (ms: number) => Math.round(ms * SMARTBAR_SOCIAL_BOOKING_REEL_HOLD_MULTIPLIER);
const SMARTBAR_SOCIAL_BOOKING_REEL_TOTAL_MS = 62000;

function smartBarSocialBookingCaptionForPhase(phase: SmartBarSocialBookingReelPhase) {
  switch (phase) {
    case "title":
      return "A search bar that books";
    case "final-caption-visitors":
      return "Visitors describe their stay";
    case "final-caption-choices":
      return "SmartBar makes recommendations";
    case "final-caption-preview":
      return "Previews choices";
    case "final-caption-add-ons":
      return "Presents add-ons";
    case "final-caption-upsells":
      return "Upsells missed options";
    case "final-caption-decisions":
      return "Books decisions";
    case "final-caption-bookings":
      return "Words turned into bookings";
    default:
      return "";
  }
}

function smartBarSocialBookingMontageStageForPhase(
  phase: SmartBarSocialBookingReelPhase,
): SmartBarMobileDemoMontageStage | null {
  const open = phase.endsWith("-open");

  switch (phase) {
    case "booking-clear":
      return { id: phase, label: "Plain English...", surface: "booking_details", open: false };
    case "booking-tracker-open":
      return { id: phase, label: "opens a tracker", surface: "booking_details", open: true };
    case "booking-details-closed":
      return { id: phase, label: "dates and guests extracted", surface: "booking_details", open: false };
    case "booking-details-open":
      return { id: phase, label: "dates and guests extracted", surface: "booking_details", open: true };
    case "booking-details-spotlight":
      return {
        id: phase,
        label: "dates and guests extracted",
        surface: "booking_details",
        open: true,
        spotlightBlockIds: ["stay-check-in", "stay-checkout", "stay-guests"],
      };
    case "booking-dates-closed":
    case "booking-dates-open":
      return { id: phase, label: "collects if missing", surface: "booking_dates", open };
    case "booking-guests-closed":
    case "booking-guests-open":
      return { id: phase, label: "collects if missing", surface: "booking_guests", open };
    case "booking-room-preview-closed":
      return { id: phase, label: "rooms recommended", surface: "booking_room_preview", open: false };
    case "booking-room-preview-open":
      return { id: phase, label: "rooms recommended", surface: "booking_room_preview", open: true };
    case "booking-room-preview-spotlight":
      return { id: phase, label: "rooms recommended", surface: "booking_room_preview", open: true, spotlightBlockIds: ["stay-room"] };
    case "booking-rooms-one-closed":
      return { id: phase, label: "rooms compared", surface: "booking_rooms", open: false };
    case "booking-rooms-one-open":
    case "booking-rooms-two-open":
    case "booking-rooms-three-open":
      return { id: phase, label: "rooms compared", surface: "booking_rooms", open: true };
    case "booking-rooms-two-spotlight":
    case "booking-rooms-three-spotlight":
      return { id: phase, label: "rooms compared", surface: "booking_rooms", open: true, spotlightBlockIds: ["stay-room"] };
    case "booking-rooms-two-closed":
    case "booking-rooms-three-closed":
      return { id: phase, label: "rooms compared", surface: "booking_rooms", open: false };
    case "booking-room-chosen-closed":
      return { id: phase, label: "room chosen", surface: "booking_room_chosen", open: false };
    case "booking-room-chosen-open":
      return { id: phase, label: "room chosen", surface: "booking_room_chosen", open: true };
    case "booking-room-chosen-spotlight":
      return { id: phase, label: "room chosen", surface: "booking_room_chosen", open: true, spotlightBlockIds: ["stay-room"] };
    case "booking-packages-closed":
      return { id: phase, label: "packages matched", surface: "booking_packages", open: false };
    case "booking-packages-open":
      return { id: phase, label: "packages matched", surface: "booking_packages", open: true };
    case "booking-packages-spotlight":
      return { id: phase, label: "packages matched", surface: "booking_packages", open: true, spotlightBlockIds: ["package-option-breakfast"] };
    case "booking-finalized-closed":
      return { id: phase, label: "booking finalized", surface: "booking_finalized", open: false };
    case "booking-finalized-open":
      return { id: phase, label: "booking finalized", surface: "booking_finalized", open: true };
    case "booking-summary-closed":
    case "booking-summary-open":
      return { id: phase, label: "booking summarized", surface: "booking_summary", open };
    default:
      return null;
  }
}

function SmartBarSocialBookingWatermark({ phase }: { phase: SmartBarSocialBookingReelPhase }) {
  const visible = phase === "final-bookings-clear" || phase === "final-centered";
  const revealed = phase === "final-centered";

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          opacity: revealed ? 1 : 0.08,
          scale: revealed ? 1 : 0.96,
          rotate: revealed ? 0 : 3,
        }}
        transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Hotel
          className="h-[56svh] max-h-[540px] w-[56svh] max-w-[540px] text-sky-500/12"
          strokeWidth={1.35}
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={revealed ? { y: "-116%", opacity: 0.96 } : { y: "0%", opacity: 0.98 }}
        transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-[-12%] bottom-[-12%] h-[124%] rounded-t-[56px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,251,255,0.88)_100%)] shadow-[0_-28px_90px_rgba(255,255,255,0.72)]"
      />
    </div>
  );
}

function SmartBarSocialBookingHeader({ phase }: { phase: SmartBarSocialBookingReelPhase }) {
  return (
    <motion.div
      initial={false}
      animate={phase === "blank" || phase.startsWith("final-") ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.36 }}
      className="absolute left-5 right-5 top-4 z-[60] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/58"
    >
      <span>SmartBar Booking Reel</span>
      <span>{Math.round(SMARTBAR_SOCIAL_BOOKING_REEL_TOTAL_MS / 1000)}s</span>
    </motion.div>
  );
}

export function SmartBarSocialBookingReel() {
  const [phase, setPhase] = useState<SmartBarSocialBookingReelPhase>("blank");
  const [runKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      await wait(SMARTBAR_SOCIAL_RECORDING_PREROLL_MS);
      if (cancelled) return;

      setPhase("empty");
      await wait(bookingReelHold(790));
      if (cancelled) return;

      setPhase("searchbar");
      await wait(bookingReelHold(1010));
      if (cancelled) return;

      setPhase("site");
      await wait(bookingReelHold(1010));
      if (cancelled) return;

      setPhase("smartbar");
      await wait(bookingReelHold(920));
      if (cancelled) return;

      setPhase("mounted");
      await wait(bookingReelHold(900));
      if (cancelled) return;

      setPhase("title");
      await wait(bookingReelHold(2280));
      if (cancelled) return;

      setPhase("entry");
      await wait(bookingReelHold(2200));
      if (cancelled) return;

      setPhase("booking-clear");
      await wait(bookingReelHold(980));
      if (cancelled) return;

      setPhase("booking-tracker-open");
      await wait(bookingReelHold(900));
      if (cancelled) return;

      setPhase("booking-details-spotlight");
      await wait(bookingReelHold(1650));
      if (cancelled) return;

      setPhase("booking-dates-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-dates-open");
      await wait(bookingReelHold(1700));
      if (cancelled) return;

      setPhase("booking-guests-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-guests-open");
      await wait(bookingReelHold(1480));
      if (cancelled) return;

      setPhase("booking-room-preview-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-room-preview-open");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-room-preview-spotlight");
      await wait(bookingReelHold(1260));
      if (cancelled) return;

      setPhase("booking-rooms-two-open");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-rooms-two-spotlight");
      await wait(bookingReelHold(1120));
      if (cancelled) return;

      setPhase("booking-rooms-three-open");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-rooms-three-spotlight");
      await wait(bookingReelHold(1220));
      if (cancelled) return;

      setPhase("booking-room-chosen-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-room-chosen-open");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-room-chosen-spotlight");
      await wait(bookingReelHold(1180));
      if (cancelled) return;

      setPhase("booking-packages-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-packages-open");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-packages-spotlight");
      await wait(bookingReelHold(1340));
      if (cancelled) return;

      setPhase("booking-finalized-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-finalized-open");
      await wait(bookingReelHold(1320));
      if (cancelled) return;

      setPhase("booking-summary-closed");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("booking-summary-open");
      await wait(bookingReelHold(1720));
      if (cancelled) return;

      setPhase("final-clear");
      await wait(bookingReelHold(720));
      if (cancelled) return;

      setPhase("final-caption-visitors");
      await wait(bookingReelHold(2140));
      if (cancelled) return;

      setPhase("final-clear-1");
      await wait(bookingReelHold(420));
      if (cancelled) return;

      setPhase("final-caption-choices");
      await wait(bookingReelHold(2120));
      if (cancelled) return;

      setPhase("final-clear-2");
      await wait(bookingReelHold(420));
      if (cancelled) return;

      setPhase("final-caption-preview");
      await wait(bookingReelHold(1900));
      if (cancelled) return;

      setPhase("final-clear-2b");
      await wait(bookingReelHold(420));
      if (cancelled) return;

      setPhase("final-caption-add-ons");
      await wait(bookingReelHold(1960));
      if (cancelled) return;

      setPhase("final-clear-3");
      await wait(bookingReelHold(420));
      if (cancelled) return;

      setPhase("final-caption-upsells");
      await wait(bookingReelHold(2100));
      if (cancelled) return;

      setPhase("final-clear-4");
      await wait(bookingReelHold(420));
      if (cancelled) return;

      setPhase("final-caption-decisions");
      await wait(bookingReelHold(1940));
      if (cancelled) return;

      setPhase("final-clear-5");
      await wait(bookingReelHold(380));
      if (cancelled) return;

      setPhase("final-brand-return");
      await wait(bookingReelHold(620));
      if (cancelled) return;

      setPhase("final-caption-bookings");
      await wait(bookingReelHold(2920));
      if (cancelled) return;

      setPhase("final-bookings-clear");
      await wait(bookingReelHold(260));
      if (cancelled) return;

      setPhase("final-centered");
      await wait(bookingReelHold(2000));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [runKey]);

  const shellVisible = phase !== "blank";
  const shellCentered = phase === "final-centered";
  const shellMounted =
    !shellCentered &&
    (phase === "mounted" ||
      phase === "title" ||
      phase === "entry" ||
      phase.startsWith("booking-") ||
      phase.startsWith("final-"));

  const restCompanion =
    phase === "empty"
      ? { blank: true }
      : phase === "searchbar"
        ? { label: "A search bar" }
        : phase === "site"
          ? { label: "on any site" }
          : phase === "final-brand-return" ||
              phase === "final-caption-bookings" ||
              phase === "final-bookings-clear" ||
              phase === "final-centered"
            ? { label: "SmartBar", showLogo: true }
            : phase.startsWith("final-")
              ? { blank: true }
              : phase === "smartbar" || shellMounted
                ? { label: "SmartBar", showLogo: true }
                : null;

  const bookingMontageStage = smartBarSocialBookingMontageStageForPhase(phase);
  const bookingCaption = smartBarSocialBookingCaptionForPhase(phase);
  const demoSubmission =
    phase === "entry"
      ? {
          id: runKey + 101,
          query: "Type or say hotel stay requirements",
          typing: true,
          manualSubmit: true,
          typeDelayMs: 34,
        }
      : null;

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 text-white">
      <section
        className="relative isolate overflow-hidden bg-[#eff8ff]"
        style={{
          width: "min(100vw, 56.25svh)",
          height: "min(177.7778vw, 100svh)",
        }}
      >
        <SocialFilmBackground />
        <SmartBarSocialBookingWatermark phase={phase} />
        <SmartBarSocialBookingHeader phase={phase} />

        <motion.div
          initial={false}
          animate={
            shellVisible
              ? {
                  opacity: 1,
                  y: shellMounted ? 0 : "-36%",
                  scale: shellMounted ? 1 : 1.035,
                }
              : {
                  opacity: 0,
                  y: "-36%",
                  scale: 0.96,
                }
          }
          transition={{
            opacity: { duration: 0.34 },
            y: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
          }}
          className="absolute inset-0 z-[30] overflow-visible [transform-style:preserve-3d]"
          style={{
            transformOrigin: "center bottom",
            transform: "translateZ(0)",
          }}
        >
          <SmartBarMobileShell
            mode="overlay"
            entryModeLabel="Ask SmartBar"
            buildingLabel="Building..."
            introCallout={bookingCaption ? { title: bookingCaption, startDelayMs: phase === "title" ? 120 : 120, typeDelayMs: 22 } : null}
            demoRestCompanion={restCompanion}
            demoMontageStage={bookingMontageStage}
            demoResetToRestKey={phase.startsWith("final-") ? "social-booking-final-live-caption" : null}
            demoSubmission={demoSubmission}
          />
        </motion.div>
      </section>
    </main>
  );
}

export default function SmartBarSocialIntroReel() {
  const [phase, setPhase] = useState<SmartBarSocialFilmPhase>("blank");
  const [runKey] = useState(0);


  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      await wait(SMARTBAR_SOCIAL_RECORDING_PREROLL_MS);
      if (cancelled) return;

      setPhase("empty");
      await wait(790);
      if (cancelled) return;

      setPhase("searchbar");
      await wait(1010);
      if (cancelled) return;

      setPhase("site");
      await wait(1010);
      if (cancelled) return;

      setPhase("smartbar");
      await wait(920);
      if (cancelled) return;

      setPhase("mounted");
      await wait(900);
      if (cancelled) return;

      setPhase("title");
      await wait(2420);
      if (cancelled) return;

      setPhase("entry");
      await wait(1890);
      if (cancelled) return;

      setPhase("food-clear");
      await wait(990);
      if (cancelled) return;

      setPhase("food-becomes-cart");
      await wait(1080);
      if (cancelled) return;

      setPhase("food-carts-closed");
      await wait(1500);
      if (cancelled) return;

      setPhase("food-carts-open");
      await wait(3100);
      if (cancelled) return;

      setPhase("food-red-shake");
      await wait(1250);
      if (cancelled) return;

      setPhase("food-requirements-open");
      await wait(2220);
      if (cancelled) return;

      setPhase("food-requirements-selected");
      await wait(1040);
      if (cancelled) return;

      setPhase("food-requirements-resolved");
      await wait(980);
      if (cancelled) return;

      setPhase("food-yellow-shake");
      await wait(1250);
      if (cancelled) return;

      setPhase("food-extras-open");
      await wait(2220);
      if (cancelled) return;

      setPhase("food-extras-selected");
      await wait(1080);
      if (cancelled) return;

      setPhase("food-extras-resolved");
      await wait(980);
      if (cancelled) return;

      setPhase("food-gray-shake");
      await wait(1250);
      if (cancelled) return;

      setPhase("food-corrections-open");
      await wait(2260);
      if (cancelled) return;

      setPhase("food-corrections-reentered");
      await wait(1030);
      if (cancelled) return;

      setPhase("food-corrections-resolved");
      await wait(980);
      if (cancelled) return;

      setPhase("food-checkout-open");
      await wait(1900);
      if (cancelled) return;

      setPhase("food-confirmation-closed");
      await wait(900);
      if (cancelled) return;

      setPhase("food-confirmation-open");
      await wait(2300);
      if (cancelled) return;

      setPhase("tablet-board");
      await wait(1210);
      if (cancelled) return;

      setPhase("tablet-received");
      await wait(1700);
      if (cancelled) return;

      setPhase("tablet-arrival");
      await wait(2640);
      if (cancelled) return;

      setPhase("tablet-open");
      await wait(2310);
      if (cancelled) return;

      setPhase("tablet-entered");
      await wait(1930);
      if (cancelled) return;

      setPhase("final-clear");
      await wait(770);
      if (cancelled) return;

      setPhase("final-caption-customers");
      await wait(2240);
      if (cancelled) return;

      setPhase("final-clear-2");
      await wait(440);
      if (cancelled) return;

      setPhase("final-caption-ticket");
      await wait(2260);
      if (cancelled) return;

      setPhase("final-clear-3");
      await wait(440);
      if (cancelled) return;

      setPhase("final-brand-return");
      await wait(620);
      if (cancelled) return;

      setPhase("final-caption-orders");
      await wait(3000);
      if (cancelled) return;

      setPhase("final-orders-clear");
      await wait(260);
      if (cancelled) return;

      setPhase("final-centered");
      await wait(2000);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [runKey]);

  const shellVisible = phase !== "blank";
  const shellCentered = phase === "final-centered";
  const shellMounted =
    !shellCentered &&
    (phase === "mounted" ||
      phase === "title" ||
      phase === "entry" ||
      phase.startsWith("food-") ||
      phase.startsWith("tablet-") ||
      phase.startsWith("final-"));
  const restCompanion =
    phase === "empty"
      ? { blank: true }
      : phase === "searchbar"
        ? { label: "A search bar" }
        : phase === "site"
          ? { label: "on any site" }
          : phase === "final-brand-return" ||
              phase === "final-caption-orders" ||
              phase === "final-orders-clear" ||
              phase === "final-centered"
            ? { label: "SmartBar", showLogo: true }
            : phase.startsWith("final-")
              ? { blank: true }
              : phase === "smartbar" || shellMounted
                ? { label: "SmartBar", showLogo: true }
                : null;
  const demoMontageStage = smartBarSocialMontageStageForPhase(phase);
  const finalCaption = smartBarSocialFinalCaptionForPhase(phase);
  const demoSubmission =
    phase === "entry"
      ? {
          id: runKey + 1,
          query: "Type or say food orders",
          typing: true,
          manualSubmit: true,
          typeDelayMs: 34,
        }
      : null;

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 text-white">
      <section
        className="relative isolate overflow-hidden bg-[#eff8ff]"
        style={{
          width: "min(100vw, 56.25svh)",
          height: "min(177.7778vw, 100svh)",
        }}
      >
        <SocialFilmBackground />
        <SmartBarSocialFoodWatermark phase={phase} />
        <SocialFilmHeader phase={phase} />
        <SmartBarSocialOrderBoardScene phase={phase} />

        <motion.div
          initial={false}
          animate={
            shellVisible
              ? {
                  opacity: 1,
                  y: shellMounted ? 0 : "-36%",
                  scale: shellMounted ? 1 : 1.035,
                }
              : {
                  opacity: 0,
                  y: "-36%",
                  scale: 0.96,
                }
          }
          transition={{
            opacity: { duration: 0.34 },
            y: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
          }}
          className="absolute inset-0 z-[30] overflow-visible [transform-style:preserve-3d]"
          style={{
            transformOrigin: "center bottom",
            transform: "translateZ(0)",
          }}
        >
          <SmartBarMobileShell
            mode="overlay"
            entryModeLabel="Ask SmartBar"
            buildingLabel="Building..."
            introCallout={phase === "title" ? { title: "A search bar that shops" } : finalCaption ? { title: finalCaption, startDelayMs: 120, typeDelayMs: 22 } : null}
            demoRestCompanion={restCompanion}
            demoMontageStage={demoMontageStage}
            demoHideCollapsedSurface={phase.startsWith("tablet-")}
            demoResetToRestKey={phase.startsWith("final-") ? "social-final-live-caption" : null}
            demoSubmission={demoSubmission}
          />
        </motion.div>


      </section>
    </main>
  );
}
