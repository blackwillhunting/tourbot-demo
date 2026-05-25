import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BedDouble, Building2, CalendarDays, CheckCircle2, Coffee, CreditCard, KeyRound, Loader2, Menu, Search, ShieldCheck, ShoppingCart, Sparkles, Utensils, Users, XCircle } from "lucide-react";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellDemoCommand,
  type TourBarShellResult,
  type TourBarShellTurnContext,
} from "../TourBarShell";
import { OrderReview, type CarryoutOrder, type GuideAiCarryoutResponse, type ReviewMode } from "../TourBarOrdering";
import { TourBarBookingHandoffSheet, type TourBarBookingHandoff } from "../TourBarBooking";
import SmartBarDemoScrubber from "./SmartBarDemoScrubber";
import { SMARTBAR_SPEED_INTRO_NOTICES, SMARTBAR_SPEED_STEPS, type SmartBarSpeedCommand, type SmartBarSpeedIntroNotice, type SmartBarSpeedIntroNoticeId, type SmartBarSpeedSurface } from "./smartBarSpeedScript";

const TYPE_DELAY_MS = 18;
const FIXTURE_THINKING_MS = 280;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}


const FALLBACK_INTRO_NOTICE: SmartBarSpeedIntroNotice = {
  id: "passcode",
  chapter: "Access",
  label: "Enter demo passcode",
  helper: "Any 6-character code works for this prototype.",
  tone: "login",
};

function introNoticeCopy(id: SmartBarSpeedIntroNoticeId): SmartBarSpeedIntroNotice {
  return SMARTBAR_SPEED_INTRO_NOTICES.find((notice) => notice.id === id) || FALLBACK_INTRO_NOTICE;
}

type ActiveSmartBarFlashNotice = {
  slotId: number;
  noticeId: SmartBarSpeedIntroNoticeId;
};

function FlashNoticeIcon({ notice }: { notice: SmartBarSpeedIntroNotice }) {
  if (notice.tone === "checking") return <Loader2 className="h-5 w-5 animate-spin" />;
  if (notice.tone === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (notice.tone === "failure") return <XCircle className="h-5 w-5" />;
  return <KeyRound className="h-5 w-5" />;
}

function flashNoticeTone(notice: SmartBarSpeedIntroNotice) {
  if (notice.tone === "success") {
    return {
      icon: "bg-emerald-500 text-white shadow-emerald-500/25",
      eyebrow: "text-emerald-700",
      ring: "ring-emerald-200/80",
      button: "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-500",
    };
  }

  if (notice.tone === "failure") {
    return {
      icon: "bg-rose-500 text-white shadow-rose-500/25",
      eyebrow: "text-rose-700",
      ring: "ring-rose-200/80",
      button: "bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-800",
    };
  }

  return {
    icon: "bg-sky-600 text-white shadow-sky-600/25",
    eyebrow: "text-sky-700",
    ring: "ring-sky-200/80",
    button: "bg-slate-950 text-white shadow-slate-950/20 hover:bg-slate-800",
  };
}

function SmartBarFlashNoticeCard({
  notice,
  passcode,
  isChecking,
  onPasscodeChange,
  onSubmit,
}: {
  notice: SmartBarSpeedIntroNotice;
  passcode: string;
  isChecking: boolean;
  onPasscodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const tone = flashNoticeTone(notice);
  const isLogin = notice.tone === "login";

  return (
    <div className={`pointer-events-auto w-[min(360px,calc(100vw-32px))] rounded-[30px] border border-white/70 bg-white/82 p-4 shadow-2xl shadow-sky-950/12 ring-1 ${tone.ring} backdrop-blur-2xl`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${tone.icon}`}>
          <FlashNoticeIcon notice={notice} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${tone.eyebrow}`}>{notice.chapter}</div>
          <div className="mt-1 text-base font-black tracking-tight text-slate-950">{notice.label}</div>
          <div className="mt-1 text-sm font-semibold leading-snug text-slate-500">{notice.helper}</div>
        </div>
      </div>

      {isLogin ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <label className="sr-only" htmlFor="smartbar-demo-passcode">Demo passcode</label>
          <input
            id="smartbar-demo-passcode"
            value={passcode}
            onChange={(event) => onPasscodeChange(event.target.value)}
            maxLength={6}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="ABC123"
            className="h-12 rounded-2xl border border-sky-100 bg-white px-4 text-center text-lg font-black uppercase tracking-[0.34em] text-slate-950 outline-none ring-1 ring-white transition placeholder:text-slate-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={isChecking}
            className={`h-11 rounded-2xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${tone.button}`}
          >
            Enter demo
          </button>
        </form>
      ) : null}
    </div>
  );
}

function SmartBarFlashNoticeStage({
  activeNotice,
  passcode,
  isChecking,
  onPasscodeChange,
  onSubmit,
}: {
  activeNotice: ActiveSmartBarFlashNotice | null;
  passcode: string;
  isChecking: boolean;
  onPasscodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const notice = activeNotice ? introNoticeCopy(activeNotice.noticeId) : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[18svh] z-[10100] flex justify-end overflow-hidden px-4 sm:px-8">
      <AnimatePresence initial={false}>
        {notice ? (
          <motion.div
            key={`${notice.id}-${activeNotice?.slotId || 0}`}
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: -420 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <SmartBarFlashNoticeCard
              notice={notice}
              passcode={passcode}
              isChecking={isChecking}
              onPasscodeChange={onPasscodeChange}
              onSubmit={onSubmit}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function line(id: string, title: string, priceLabel: string, knownSelections: string[] = []) {
  return {
    lineItemId: id,
    id,
    title,
    quantity: 1,
    priceLabel,
    status: "ready",
    knownSelections,
  };
}

function readyCarryoutOrder(kind: "messy" | "qualified" | "finale" = "messy"): CarryoutOrder {
  if (kind === "qualified") {
    const items = [
      line("burger-combo", "Burger combo meal", "$10.99", ["Double patty", "Large fries", "Diet Coke"]),
    ];

    return {
      type: "carryout_order",
      status: "ready_cart",
      nextAction: "show_cart",
      items,
      completeItems: items,
      pendingItems: [],
      totals: {
        status: "ready",
        subtotal: 10.99,
        estimatedTax: 0.88,
        estimatedTotal: 11.87,
        currency: "USD",
      },
    };
  }

  const comboSelections = ["Large fries", "Large Diet Coke", "No onions"];
  const items = [
    line("double-cheeseburger-combo", "Double cheeseburger combo", "$11.99", comboSelections),
    line("apple-pie", "Apple pie", "$2.49"),
    ...(kind === "finale" ? [] : [line("large-diet-coke", "Large Diet Coke", "$2.19")]),
  ];

  return {
    type: "carryout_order",
    status: "ready_cart",
    nextAction: "show_cart",
    items,
    completeItems: items,
    pendingItems: [],
    totals: {
      status: "ready",
      subtotal: kind === "finale" ? 14.48 : 16.67,
      estimatedTax: kind === "finale" ? 1.16 : 1.33,
      estimatedTotal: kind === "finale" ? 15.64 : 18.0,
      currency: "USD",
    },
  };
}

function lockedCarryoutOrder(kind: "messy" | "qualified" | "finale" = "messy"): CarryoutOrder {
  const order = readyCarryoutOrder(kind);
  return {
    ...order,
    nextAction: "checkout_handoff",
    lockedForHandoff: true,
    handoffStatus: "ready",
  };
}

function pendingCarryoutOrder(stage: 0 | 1 | 2): CarryoutOrder {
  const burgerReady = stage >= 1;
  const friesReady = stage >= 2;

  const burger = {
    lineItemId: "burger-combo",
    id: "burger-combo",
    title: "Burger combo meal",
    quantity: 1,
    priceLabel: burgerReady ? "$10.99" : undefined,
    status: burgerReady ? "ready" : "needs_qualifier",
    knownSelections: burgerReady ? ["Double patty"] : [],
    missingQualifiers: burgerReady ? [] : [{ qualifierId: "patty", label: "Patty" }],
    qualifierGroups: burgerReady
      ? []
      : [
          {
            qualifierId: "patty",
            label: "Choose burger size",
            required: true,
            missing: true,
            options: [
              { label: "Single patty", value: "single" },
              { label: "Double patty", value: "double" },
              { label: "Triple patty", value: "triple" },
            ],
          },
        ],
  };

  const fries = {
    lineItemId: "fries-size",
    id: "fries-size",
    title: "Fries",
    quantity: 1,
    priceLabel: friesReady ? "$3.49" : undefined,
    status: friesReady ? "ready" : "needs_qualifier",
    knownSelections: friesReady ? ["Large fries"] : [],
    missingQualifiers: friesReady ? [] : [{ qualifierId: "fries", label: "Fries size" }],
    qualifierGroups: friesReady
      ? []
      : [
          {
            qualifierId: "fries",
            label: "Choose fries",
            required: true,
            missing: true,
            options: [
              { label: "Small fries", value: "small" },
              { label: "Medium fries", value: "medium" },
              { label: "Large fries", value: "large" },
            ],
          },
        ],
  };

  const drink = {
    lineItemId: "drink-choice",
    id: "drink-choice",
    title: "Drink",
    quantity: 1,
    priceLabel: undefined,
    status: "needs_qualifier",
    knownSelections: [],
    missingQualifiers: [{ qualifierId: "drink", label: "Drink" }],
    qualifierGroups: [
      {
        qualifierId: "drink",
        label: "Choose drink",
        required: true,
        missing: true,
        options: [
          { label: "Coke", value: "coke" },
          { label: "Diet Coke", value: "diet-coke" },
          { label: "Sprite", value: "sprite" },
        ],
      },
    ],
  };

  const items = [burger, fries, drink];
  return {
    type: "carryout_order",
    status: "needs_qualifier",
    nextAction: "choose_qualifier",
    items,
    completeItems: items.filter((item) => item.status === "ready"),
    pendingItems: items.filter((item) => item.status !== "ready"),
    currentStep: {
      type: "qualifier",
      itemId: stage === 0 ? "burger-combo" : stage === 1 ? "fries-size" : "drink-choice",
      qualifierId: stage === 0 ? "patty" : stage === 1 ? "fries" : "drink",
      question: stage === 0 ? "Choose burger size" : stage === 1 ? "Choose fries" : "Choose drink",
    },
    totals: {
      status: "partial",
      subtotal: stage === 0 ? null : stage === 1 ? 10.99 : 14.48,
      estimatedTax: null,
      estimatedTotal: null,
      currency: "USD",
    },
  };
}

function carryoutRaw(order: CarryoutOrder, commerceAction = "carryout_show_cart"): GuideAiCarryoutResponse {
  return {
    title: order.status === "ready_cart" ? "Review order" : "Needs choices",
    body: order.status === "ready_cart" ? "Review the cart before checkout." : "Pick the missing choices.",
    commerceAction,
    displayMode: order.status === "ready_cart" ? "carryout_cart_panel" : "carryout_review",
    carryoutOrder: order,
    visibleContext: { carryoutOrder: order },
  };
}

type SpeedResultOptions = {
  title?: string;
  body?: string;
  activeIndex?: number;
  reviewMode?: ReviewMode;
  nextQuery?: string;
  keepSheetOpenNextMove?: boolean;
  separateSheetNextMove?: boolean;
  stableSheetKey?: string;
  commerceAction?: string;
};

function speedMeta(
  options: {
    keepSheetOpenNextMove?: boolean;
    separateSheetNextMove?: boolean;
    stableSheetKey?: string;
    readyPillLabel?: string;
  } = {},
) {
  return {
    __speedDemo: {
      keepSheetOpenNextMove: Boolean(options.keepSheetOpenNextMove),
      separateSheetNextMove: Boolean(options.separateSheetNextMove),
      stableSheetKey: options.stableSheetKey,
      readyPillLabel: options.readyPillLabel,
    },
  };
}

function orderResult(order: CarryoutOrder, options: SpeedResultOptions = {}): TourBarShellResult {
  const raw = carryoutRaw(order, options.commerceAction || "carryout_show_cart");
  return {
    title: options.title || (order.status === "ready_cart" ? "Review order" : "Choose required options"),
    body: options.body ?? (order.status === "ready_cart" ? undefined : "Select the missing choice."),
    invitation: options.nextQuery ? { kind: "next", text: options.nextQuery.startsWith("__checkout") ? "Checkout" : "Choose this option" } : undefined,
    nextMove: options.nextQuery ? { type: "handoff", label: options.nextQuery.startsWith("__checkout") ? "Checkout" : "Choose this option", query: options.nextQuery } : undefined,
    canFollowUp: !order.lockedForHandoff,
    mode: "speed_order",
    action: raw.commerceAction,
    raw: {
      ...raw,
      __speedDemo: {
        activeIndex: options.activeIndex || 0,
        reviewMode: options.reviewMode || (order.status === "ready_cart" ? "cart" : "review"),
        keepSheetOpenNextMove: Boolean(options.keepSheetOpenNextMove),
        separateSheetNextMove: Boolean(options.separateSheetNextMove),
        stableSheetKey: options.stableSheetKey || "ordering",
        readyPillLabel: order.status === "ready_cart" ? "All items are ready for checkout" : undefined,
      },
    },
  };
}


function bookingHandoff(kind: "ocean" | "family"): TourBarBookingHandoff {
  if (kind === "family") {
    return {
      roomTitle: "Family Double Room",
      packageTitle: "Family Comfort Bundle",
      datesLabel: "Jun 12–15, 2026",
      guestsLabel: "2 adults, 2 children",
      budgetLabel: "Family value",
      priceLabel: "$249/night + $55/stay",
    };
  }

  return {
    roomTitle: "Ocean View Suite",
    packageTitle: "Breakfast Flex Plan",
    datesLabel: "Dates required",
    guestsLabel: "Guests required",
    budgetLabel: "Good view, not villa tier",
    priceLabel: "$379/night + $32/night",
  };
}

function fixtureResult(query: string): TourBarShellResult {
  const text = query.trim().toLowerCase();

  if (
    text.includes("hedge fund") ||
    text.includes("copilot agents") ||
    text.includes("copilots") ||
    text.includes("dora")
  ) {
    return {
      title: "Showing: Hedge Fund industry path",
      body:
        "Yes — this hedge-fund path covers both core IT support needs and AI/copilot-related modernization. In this context, that typically means:\n\n- Secure trading and collaboration infrastructure\n- Cyber/compliance operating model support\n- AI/data visibility and workflow enhancement, including governed copilot-style capabilities\n\nFor a hedge fund, the site frames this as a combined approach: stable infrastructure first, then security/compliance, then AI/data and workflow opportunities in a regulated operating model.",
      invitation: { kind: "next", text: "Want to look specifically at the AI & Data lane for Copilot and agent setup?" },
      nextMove: { type: "ask_deeper", label: "Show Copilot use cases", query: "__copilot_use_cases" },
      canFollowUp: true,
      mode: "speed_info",
      raw: speedMeta({ stableSheetKey: "hedge-fund-path", keepSheetOpenNextMove: true }),
    };
  }

  if (
    text === "__copilot_use_cases" ||
    text.includes("that doesn't say") ||
    text.includes("that doesnt say") ||
    text.includes("what you actually do")
  ) {
    return {
      title: "What we would actually do",
      body:
        "For a hedge fund, the practical Copilot/agent work would usually look like this:\n\n- **Readiness review:** confirm Microsoft 365 permissions, data exposure, identity controls, and security boundaries before anyone turns agents loose.\n- **Use-case selection:** pick a few high-value workflows — investment committee prep, policy lookup, vendor-risk intake, ticket triage, or research summarization.\n- **Agent design:** define what each agent can answer, what systems it can touch, and when it must escalate for review.\n- **Pilot support:** build a small controlled rollout, train the first users, measure adoption, and tighten governance before expanding.",
      invitation: { kind: "case_studies", text: "Show relevant case studies" },
      nextMove: { type: "ask_deeper", label: "Show relevant case studies", query: "__case_studies" },
      canFollowUp: true,
      mode: "speed_info",
      raw: speedMeta({ stableSheetKey: "copilot-use-cases", separateSheetNextMove: true }),
    };
  }

  if (text === "__case_studies") {
    return {
      title: "Relevant case studies",
      body:
        "- **Hedge-fund operations assistant:** mapped analyst and operations questions to approved knowledge sources, then routed sensitive requests to human review.\n- **Compliance evidence helper:** organized policy, vendor-risk, and incident-response materials so leaders could ask plain-English questions before audits and tabletop reviews.\n- **Copilot adoption sprint:** coached a regulated firm through safe rollout patterns, permission cleanup, user training, and a short list of practical first agents.",
      invitation: { kind: "handoff", text: "Talk to someone about Copilot support" },
      nextMove: { type: "handoff", label: "Talk to someone about Copilot support", query: "nice, can I talk to someone?" },
      canFollowUp: true,
      mode: "speed_case_studies",
      raw: speedMeta({ stableSheetKey: "case-studies" }),
    };
  }

  if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez")) {
    return orderResult(readyCarryoutOrder("messy"), {
      title: "Review order",
      nextQuery: "__checkout_messy",
      separateSheetNextMove: true,
    });
  }

  if (text === "__checkout_messy") {
    return orderResult(lockedCarryoutOrder("messy"), {
      title: "Order locked for handoff",
      reviewMode: "cart",
      stableSheetKey: "checkout-messy",
      commerceAction: "carryout_checkout_handoff",
    });
  }

  if (text === "__checkout_qualified") {
    return orderResult(lockedCarryoutOrder("qualified"), {
      title: "Order locked for handoff",
      reviewMode: "cart",
      stableSheetKey: "checkout-qualified",
      commerceAction: "carryout_checkout_handoff",
    });
  }

  if (text.includes("burger combo")) {
    return orderResult(pendingCarryoutOrder(0), {
      title: "Choose required options",
      body: "Burger combo meal needs required selections before checkout.",
      activeIndex: 0,
      reviewMode: "review",
      nextQuery: "__qualifier_1",
      keepSheetOpenNextMove: true,
    });
  }

  if (text === "__qualifier_1") {
    return orderResult(pendingCarryoutOrder(1), {
      title: "Choose required options",
      body: "Burger size captured. Fries size is next.",
      activeIndex: 1,
      reviewMode: "review",
      nextQuery: "__qualifier_2",
      keepSheetOpenNextMove: true,
    });
  }

  if (text === "__qualifier_2") {
    return orderResult(pendingCarryoutOrder(2), {
      title: "Choose required options",
      body: "Fries size captured. Drink choice is next.",
      activeIndex: 2,
      reviewMode: "review",
      nextQuery: "__qualifier_3",
      keepSheetOpenNextMove: true,
    });
  }

  if (text === "__qualifier_3") {
    return orderResult(readyCarryoutOrder("qualified"), {
      title: "Review order",
      nextQuery: "__checkout_qualified",
      separateSheetNextMove: true,
    });
  }

  if (text === "__booking_step_1" || text.includes("nice room") || text.includes("view and breakfast")) {
    return {
      title: "Recommendation 1 of 3: Garden Terrace King",
      body:
        "$239/night. A quieter garden-facing option with a resort feel and lower price. It is a value fit, but the view is softer than the Ocean View Suite.",
      nextMove: { type: "compare_options", label: "Show next recommendation", query: "__booking_step_2" },
      canFollowUp: true,
      mode: "speed_booking_reco",
      raw: speedMeta({ keepSheetOpenNextMove: true, stableSheetKey: "booking-recommendations" }),
    };
  }

  if (text === "__booking_step_2") {
    return {
      title: "Recommendation 2 of 3: Ocean View Suite",
      body:
        "$379/night. Best fit for a strong view without jumping to the villa tier. Breakfast can be attached with the Breakfast Flex Plan.",
      nextMove: { type: "compare_options", label: "Show premium comparison", query: "__booking_step_3" },
      canFollowUp: true,
      mode: "speed_booking_reco",
      raw: speedMeta({ keepSheetOpenNextMove: true, stableSheetKey: "booking-recommendations" }),
    };
  }

  if (text === "__booking_step_3") {
    return {
      title: "Recommendation 3 of 3: Coastal Villa Suite",
      body:
        "$549/night. The premium view-and-space option. It is stronger than needed for this request, so the Ocean View Suite remains the practical recommendation.",
      canFollowUp: true,
      mode: "speed_booking_reco",
      raw: speedMeta({ stableSheetKey: "booking-recommendations" }),
    };
  }

  if (text.includes("breakfast")) {
    return {
      title: "Breakfast Flex Plan",
      body: "Daily breakfast credit across the lobby café, buffet, and grab-and-go market. +$32/night.",
      invitation: { kind: "book", text: "Book this" },
      nextMove: { type: "handoff", label: "Book this", query: "__booking_confirm" },
      canFollowUp: true,
      mode: "speed_package",
      raw: speedMeta({ stableSheetKey: "booking-package" }),
    };
  }

  if (text === "__booking_confirm") {
    return {
      title: "Booking summary ready",
      canFollowUp: false,
      mode: "speed_booking_confirm",
      raw: {
        ...speedMeta({ stableSheetKey: "booking-confirm" }),
        bookingHandoff: bookingHandoff("ocean"),
      },
    };
  }

  if (text.includes("family room")) {
    return {
      title: "Stay details needed",
      body: "Family-room recommendations require stay dates and guests before the booking path can be prepared.",
      canFollowUp: true,
      mode: "speed_needs_context",
      raw: speedMeta({ stableSheetKey: "booking-context" }),
    };
  }

  if (text === "__booking_after_context" || text.includes("family recommendation")) {
    return {
      title: "Family Double Room recommended",
      body: "Family Double Room · $249/night.\nFamily Comfort Bundle · +$55/stay.\nStay context: Jun 12–15, 2026 · 2 adults / 2 children.",
      invitation: { kind: "book", text: "Book this family stay" },
      nextMove: { type: "handoff", label: "Book this family stay", query: "__family_booking_confirm" },
      canFollowUp: true,
      mode: "speed_family_reco",
      raw: speedMeta({ stableSheetKey: "family-recommendation" }),
    };
  }

  if (text === "__family_booking_confirm") {
    return {
      title: "Family booking summary ready",
      canFollowUp: false,
      mode: "speed_booking_confirm",
      raw: {
        ...speedMeta({ stableSheetKey: "family-confirm" }),
        bookingHandoff: bookingHandoff("family"),
      },
    };
  }

  if (text.includes("action choices") || text.includes("tiles")) {
    return {
      title: "Choose next action",
      canFollowUp: false,
      mode: "speed_tiles",
      raw: speedMeta({ stableSheetKey: "finale-tiles" }),
    };
  }

  if (text.includes("pending cart")) {
    return orderResult(pendingCarryoutOrder(0), {
      title: "Review order",
      reviewMode: "cart",
      stableSheetKey: "finale-pending-cart",
    });
  }

  if (text.includes("final cart") || text.includes("cart")) {
    return orderResult(readyCarryoutOrder("finale"), {
      title: "Review order",
      reviewMode: "cart",
      stableSheetKey: "finale-final-cart",
    });
  }

  if (text.includes("summary")) {
    return {
      title: "Booking summary ready",
      canFollowUp: false,
      mode: "speed_booking_confirm",
      raw: {
        ...speedMeta({ stableSheetKey: "finale-booking-summary" }),
        bookingHandoff: bookingHandoff("ocean"),
      },
    };
  }

  return {
    title: "SmartBar response",
    body: "I can answer the question, collect the right details, and open the next step.",
    canFollowUp: true,
    mode: "speed_info",
    raw: speedMeta({ stableSheetKey: "finale-natural-language" }),
  };
}

function renderSpeedExtras(result: TourBarShellResult, actions: TourBarShellActions) {
  const mode = result.mode || "";

  if (mode === "speed_order") {
    const raw = (result.raw || {}) as GuideAiCarryoutResponse & { __speedDemo?: { activeIndex?: number; reviewMode?: ReviewMode } };
    const order = raw.carryoutOrder || raw.visibleContext?.carryoutOrder || null;
    return (
      <OrderReview
        result={result}
        actions={actions}
        carryoutOrder={order}
        activeIndex={raw.__speedDemo?.activeIndex || 0}
        reviewMode={raw.__speedDemo?.reviewMode || "cart"}
        onActiveIndexChange={() => undefined}
        onReviewModeChange={() => undefined}
        onLocalOptionSelect={() => order}
        onSilentReprice={() => undefined}
        onRemoveItem={() => undefined}
        notOnMenuLabel="Not on the demo menu"
      />
    );
  }

  if (mode === "speed_needs_context") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => actions.openBookingContextSheet("dates")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:bg-slate-50">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Dates</div>
          <div className="text-sm font-semibold text-slate-950">Select dates</div>
        </button>
        <button type="button" onClick={() => actions.openBookingContextSheet("guests")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:bg-slate-50">
          <Users className="h-4 w-4 text-slate-500" />
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Guests</div>
          <div className="text-sm font-semibold text-slate-950">Add guests</div>
        </button>
      </div>
    );
  }

  if (mode === "speed_booking_reco") {
    const title = result.title || "";
    const backQuery = title.includes("2 of 3")
      ? "__booking_step_1"
      : title.includes("3 of 3")
        ? "__booking_step_2"
        : "";
    const nextQuery = title.includes("1 of 3")
      ? "__booking_step_2"
      : title.includes("2 of 3")
        ? "__booking_step_3"
        : "";
    const buttonBase = "rounded-2xl px-3 py-2.5 text-sm font-bold ring-1 transition";
    const enabledClass = "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50";
    const disabledClass = "cursor-not-allowed bg-slate-50 text-slate-300 ring-slate-100";

    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!backQuery}
          onClick={() => {
            if (backQuery) actions.submitFollowUp(backQuery);
          }}
          className={`${buttonBase} ${backQuery ? enabledClass : disabledClass}`}
        >
          Back
        </button>
        <button
          type="button"
          disabled={!nextQuery}
          onClick={() => {
            if (nextQuery) actions.submitFollowUp(nextQuery);
          }}
          className={`${buttonBase} ${nextQuery ? enabledClass : disabledClass}`}
        >
          Next
        </button>
      </div>
    );
  }

  if (mode === "speed_booking_confirm") {
    const raw = (result.raw || {}) as { bookingHandoff?: TourBarBookingHandoff };
    return (
      <TourBarBookingHandoffSheet
        bookingHandoff={raw.bookingHandoff || null}
        actions={actions}
      />
    );
  }

  if (mode === "speed_tiles") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["Answer", "Choose options", "Review cart", "Handoff"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm"
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return null;
}



function toolbarTone(surface: SmartBarSpeedSurface) {
  if (surface === "ordering") {
    return {
      shell: "border-orange-200/70 bg-slate-950/94 text-white shadow-slate-950/18",
      brandBadge: "bg-orange-400 text-slate-950",
      muted: "text-orange-100/75",
      pill: "border-white/10 bg-white/10 text-orange-50",
      activePill: "bg-orange-400 text-slate-950 ring-orange-300/40",
    };
  }

  if (surface === "booking") {
    return {
      shell: "border-sky-200/80 bg-white/94 text-slate-950 shadow-sky-950/10",
      brandBadge: "bg-sky-950 text-white",
      muted: "text-slate-500",
      pill: "border-slate-200 bg-slate-50 text-slate-700",
      activePill: "bg-sky-950 text-white ring-sky-200/70",
    };
  }

  return {
    shell: "border-slate-200/80 bg-white/94 text-slate-950 shadow-slate-950/10",
    brandBadge: "bg-slate-950 text-white",
    muted: "text-slate-500",
    pill: "border-slate-200 bg-slate-50 text-slate-700",
    activePill: "bg-slate-950 text-white ring-slate-300/70",
  };
}

function ToolbarPill({
  children,
  active = false,
  className = "",
  surface,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  surface: SmartBarSpeedSurface;
}) {
  const tone = toolbarTone(surface);
  return (
    <span
      className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-bold ring-1 ring-transparent ${
        active ? tone.activePill : tone.pill
      } ${className}`}
    >
      {children}
    </span>
  );
}

function ToolbarBrand({ surface }: { surface: SmartBarSpeedSurface }) {
  const tone = toolbarTone(surface);

  if (surface === "ordering") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.brandBadge}`}>
          <Utensils className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black tracking-tight sm:text-base">Ordering</div>
          <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Menu · cart · checkout</div>
        </div>
      </div>
    );
  }

  if (surface === "booking") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.brandBadge}`}>
          <BedDouble className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black tracking-tight sm:text-base">Booking</div>
          <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Rooms · packages · confirmation</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.brandBadge}`}>
        <Building2 className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-black tracking-tight sm:text-base">Informational</div>
        <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Services · proof · handoff</div>
      </div>
    </div>
  );
}

function ToolbarOptions({ surface }: { surface: SmartBarSpeedSurface }) {
  if (surface === "ordering") {
    return (
      <>
        {["Combos", "Burgers", "Sides", "Drinks"].map((label, index) => (
          <ToolbarPill key={label} surface={surface} active={index === 0}>
            {label}
          </ToolbarPill>
        ))}
      </>
    );
  }

  if (surface === "booking") {
    return (
      <>
        <ToolbarPill surface={surface} active>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Jun 12–15
        </ToolbarPill>
        <ToolbarPill surface={surface}>
          <Users className="mr-1.5 h-3.5 w-3.5" />
          4 guests
        </ToolbarPill>
        <ToolbarPill surface={surface}>
          <Coffee className="mr-1.5 h-3.5 w-3.5" />
          Packages
        </ToolbarPill>
      </>
    );
  }

  return (
    <>
      <ToolbarPill surface={surface} active>
        Services
      </ToolbarPill>
      <ToolbarPill surface={surface}>
        Compliance
      </ToolbarPill>
      <ToolbarPill surface={surface}>
        Industries
      </ToolbarPill>
    </>
  );
}

function ToolbarActions({ surface }: { surface: SmartBarSpeedSurface }) {
  if (surface === "ordering") {
    return (
      <>
        <ToolbarPill surface={surface} className="hidden sm:inline-flex">
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Search menu
        </ToolbarPill>
        <ToolbarPill surface={surface} active>
          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
          Cart
        </ToolbarPill>
      </>
    );
  }

  if (surface === "booking") {
    return (
      <>
        <ToolbarPill surface={surface} className="hidden sm:inline-flex">
          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
          Book
        </ToolbarPill>
        <ToolbarPill surface={surface}>
          Help
        </ToolbarPill>
      </>
    );
  }

  return (
    <>
      <ToolbarPill surface={surface} className="hidden sm:inline-flex">
        <Search className="mr-1.5 h-3.5 w-3.5" />
        Search
      </ToolbarPill>
      <ToolbarPill surface={surface}>
        Contact
      </ToolbarPill>
    </>
  );
}

function SpeedDemoSitePreview({ surface }: { surface: SmartBarSpeedSurface }) {
  if (surface === "ordering") {
    return (
      <div className="mx-auto mt-10 grid max-w-5xl gap-4 px-4 pb-28 sm:grid-cols-3 sm:px-6">
        {[
          ["Combo item", "Burger, fries, drink", "$11.99"],
          ["Side item", "Crispy salted side", "$3.49"],
          ["Drink item", "Large fountain drink", "$2.19"],
        ].map(([title, body, price]) => (
          <div key={title} className="rounded-[28px] border border-orange-200/40 bg-slate-950/86 p-5 text-white shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-orange-400 px-3 py-1 text-xs font-black text-slate-950">{price}</span>
              <Menu className="h-4 w-4 text-orange-200" />
            </div>
            <div className="mt-8 text-lg font-black">{title}</div>
            <div className="mt-1 text-sm text-orange-100/75">{body}</div>
          </div>
        ))}
      </div>
    );
  }

  if (surface === "booking") {
    return (
      <div className="mx-auto mt-10 grid max-w-5xl gap-4 px-4 pb-28 sm:grid-cols-3 sm:px-6">
        {[
          ["Garden Terrace", "$239/night", "Quiet value option"],
          ["Ocean View Suite", "$379/night", "Best practical view"],
          ["Breakfast Flex", "+$32/night", "Package add-on"],
        ].map(([title, price, body]) => (
          <div key={title} className="rounded-[28px] border border-sky-100 bg-white/88 p-5 shadow-xl shadow-sky-950/8 ring-1 ring-white/80">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-sky-950 px-3 py-1 text-xs font-black text-white">{price}</span>
              <BedDouble className="h-4 w-4 text-sky-600" />
            </div>
            <div className="mt-8 text-lg font-black text-slate-950">{title}</div>
            <div className="mt-1 text-sm text-slate-500">{body}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 grid max-w-5xl gap-4 px-4 pb-28 sm:grid-cols-3 sm:px-6">
      {[
        ["Hedge-fund IT support", "Secure operations, collaboration, and compliance-aware infrastructure"],
        ["Copilot mentorship", "Use-case design, governance, adoption, and agent rollout"],
        ["Contextual handoff", "The consultant receives the visitor’s goal before the conversation starts"],
      ].map(([title, body], index) => (
        <div key={title} className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-xl shadow-slate-950/8 ring-1 ring-white/80">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">0{index + 1}</span>
            {index === 0 ? <ShieldCheck className="h-4 w-4 text-slate-500" /> : <Sparkles className="h-4 w-4 text-slate-500" />}
          </div>
          <div className="mt-8 text-lg font-black text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{body}</div>
        </div>
      ))}
    </div>
  );
}

function AdaptiveToolbarFrame({
  surface,
  smartBarNode,
}: {
  surface: SmartBarSpeedSurface;
  smartBarNode: ReactNode;
}) {
  const tone = toolbarTone(surface);

  return (
    <div className={`mx-auto mt-4 max-w-7xl rounded-[28px] border px-3 py-3 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl sm:px-4 ${tone.shell}`}>
      <div className="flex items-center gap-3">
        <ToolbarBrand surface={surface} />

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          <AnimatePresence mode="wait">
            <motion.div
              key={surface}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex min-w-0 items-center justify-center gap-2"
            >
              <ToolbarOptions surface={surface} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <ToolbarActions surface={surface} />
          </div>
          <div className="relative z-[10080] flex h-9 w-9 shrink-0 items-center justify-center">
            {smartBarNode}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function SmartBarSpeedDemo() {
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoCommand, setDemoCommand] = useState<TourBarShellDemoCommand | null>(null);
  const [passcode, setPasscode] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessComplete, setAccessComplete] = useState(false);
  const [activeIntroNotice, setActiveIntroNotice] = useState<ActiveSmartBarFlashNotice | null>({ slotId: 0, noticeId: "passcode" });
  const commandIdRef = useRef(0);
  const noticeIdRef = useRef(0);
  const accessTimersRef = useRef<number[]>([]);

  const queueAccessTimer = useCallback((callback: () => void, delayMs: number) => {
    const timerId = window.setTimeout(() => {
      accessTimersRef.current = accessTimersRef.current.filter((id) => id !== timerId);
      callback();
    }, delayMs);
    accessTimersRef.current.push(timerId);
  }, []);

  const showIntroNotice = useCallback((noticeId: SmartBarSpeedIntroNoticeId) => {
    noticeIdRef.current += 1;
    setActiveIntroNotice({ slotId: noticeIdRef.current, noticeId });
  }, []);

  const handlePasscodeChange = useCallback((value: string) => {
    setPasscode(value.replace(/\s/g, "").slice(0, 6).toUpperCase());
  }, []);

  const handlePasscodeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isCheckingAccess) return;

      const normalized = passcode.trim();
      const isValid = normalized.length === 6;
      accessTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      accessTimersRef.current = [];
      setIsCheckingAccess(true);
      showIntroNotice("checking");

      queueAccessTimer(() => {
        showIntroNotice(isValid ? "success" : "failure");
        setIsCheckingAccess(false);

        if (isValid) {
          queueAccessTimer(() => setActiveIntroNotice(null), 950);
          queueAccessTimer(() => setAccessComplete(true), 1220);
          return;
        }

        queueAccessTimer(() => {
          setPasscode("");
          showIntroNotice("passcode");
        }, 1150);
      }, 620);
    },
    [isCheckingAccess, passcode, queueAccessTimer, showIntroNotice],
  );

  useEffect(() => {
    return () => {
      accessTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      accessTimersRef.current = [];
    };
  }, []);

  const sendCommand = useCallback((command: Omit<TourBarShellDemoCommand, "id">) => {
    commandIdRef.current += 1;
    setDemoCommand({ id: commandIdRef.current, ...command });
  }, []);

  const typeIntoShell = useCallback(
    async (field: "primary" | "followup" | "chat", value: string, cancelled: () => boolean) => {
      const type = field === "primary" ? "setPrimary" : field === "followup" ? "setFollowUp" : "setChatDraft";
      sendCommand({ type, value: "" });
      await wait(80);

      for (let index = 1; index <= value.length; index += 1) {
        if (cancelled()) return;
        sendCommand({ type, value: value.slice(0, index) });
        await wait(TYPE_DELAY_MS);
      }
    },
    [sendCommand],
  );

  const runCommand = useCallback(
    async (command: SmartBarSpeedCommand, cancelled: () => boolean) => {
      if (command.delayMs) await wait(command.delayMs);
      if (cancelled()) return;

      if (command.kind === "pause") return;
      if (command.kind === "typePrimary") return typeIntoShell("primary", command.value, cancelled);
      if (command.kind === "typeFollowUp") return typeIntoShell("followup", command.value, cancelled);
      if (command.kind === "typeChat") return typeIntoShell("chat", command.value, cancelled);
      if (command.kind === "submitPrimary") {
        sendCommand({ type: "submitPrimary", value: command.value });
        return;
      }
      if (command.kind === "submitFollowUp") {
        sendCommand({ type: "submitFollowUp", value: command.value });
        return;
      }
      if (command.kind === "submitChat") {
        sendCommand({ type: "submitChat", value: command.value });
        return;
      }
      if (command.kind === "openBookingContext") {
        sendCommand({ type: "openBookingContext", field: command.field });
        return;
      }
      if (command.kind === "setBookingContext") {
        sendCommand({ type: "setBookingContext", bookingContext: command.bookingContext });
        return;
      }
      if (command.kind === "showFixture") {
        sendCommand({ type: "showResult", result: fixtureResult(command.value) });
        return;
      }
      if (command.kind === "shell") {
        sendCommand({ type: command.type });
      }
    },
    [sendCommand, typeIntoShell],
  );

  useEffect(() => {
    if (stepIndex < 0) return;

    let cancelled = false;
    const currentStep = SMARTBAR_SPEED_STEPS[stepIndex];
    if (!currentStep) return;

    const run = async () => {
      for (const command of currentStep.commands) {
        if (cancelled) return;
        await runCommand(command, () => cancelled);
      }

      if (!cancelled && isPlaying) {
        await wait(650);
        if (cancelled) return;
        if (stepIndex < SMARTBAR_SPEED_STEPS.length - 1) setStepIndex((index) => Math.min(index + 1, SMARTBAR_SPEED_STEPS.length - 1));
        else setIsPlaying(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isPlaying, runCommand, stepIndex]);

  const onPrimarySubmit = async (query: string, _context: TourBarShellTurnContext) => {
    await wait(FIXTURE_THINKING_MS);
    return fixtureResult(query);
  };

  const onFollowUpSubmit = async (query: string, _context: TourBarShellTurnContext) => {
    await wait(FIXTURE_THINKING_MS);
    return fixtureResult(query);
  };

  const currentStep = stepIndex >= 0 ? SMARTBAR_SPEED_STEPS[stepIndex] : null;
  const toolbarSurface = currentStep?.surface || "info";
  const smartBarNode = (
    <TourBarShell
              primaryPlaceholder="Ask SmartBar in plain English..."
              followUpPlaceholder="Ask a follow-up..."
              launcherTitle="SmartBar speed demo"
              launcherAriaLabel="Open SmartBar speed demo"
              resultEyebrow="SmartBar response"
              initialLoadingMessage="Choosing the right tool..."
              followUpLoadingMessage="Switching tools..."
              consultantChat={{
                enabled: true,
                title: "Talk to a consultant",
                placeholder: "Send a quick note...",
                waitingMessage: "Connecting you with the right specialist...",
                confirmationMessage: "Context received — handing this to a consultant.",
                consultantResponseMessage: "Hi there — so you’re interested in Copilots?",
              }}
              demoCommand={demoCommand}
              onPrimarySubmit={onPrimarySubmit}
              onFollowUpSubmit={onFollowUpSubmit}
              renderResultExtras={renderSpeedExtras}
              buildThreadMessage={(result) => [result.title, result.body].filter(Boolean).join("\n")}
            />
  );

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_52%,_#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

      {!accessComplete ? (
        <section className="absolute inset-0 z-[10095] overflow-hidden bg-[radial-gradient(circle_at_18%_14%,_rgba(125,211,252,0.36),_transparent_30%),radial-gradient(circle_at_82%_76%,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(135deg,_#eef8ff_0%,_#eaf4ff_48%,_#f8fbff_100%)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(14,116,144,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,0.12)_1px,transparent_1px)] [background-size:40px_40px]" />
          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-sky-900 shadow-lg shadow-sky-950/5 backdrop-blur-xl sm:left-8 sm:top-8">
            SmartBar speed demo
          </div>
          <SmartBarFlashNoticeStage
            activeNotice={activeIntroNotice}
            passcode={passcode}
            isChecking={isCheckingAccess}
            onPasscodeChange={handlePasscodeChange}
            onSubmit={handlePasscodeSubmit}
          />
        </section>
      ) : (
        <>
          <div className="relative z-[10070] px-4 pt-4 sm:px-6">
            <AdaptiveToolbarFrame surface={toolbarSurface} smartBarNode={smartBarNode} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={toolbarSurface}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <SpeedDemoSitePreview surface={toolbarSurface} />
            </motion.div>
          </AnimatePresence>

          <SmartBarDemoScrubber
            index={stepIndex}
            isPlaying={isPlaying}
            onSelect={(index) => {
              setIsPlaying(false);
              setStepIndex(index);
            }}
            onTogglePlay={() => {
              if (isPlaying) {
                setIsPlaying(false);
                return;
              }
              if (stepIndex < 0) setStepIndex(0);
              setIsPlaying(true);
            }}
          />
        </>
      )}
    </main>
  );
}
