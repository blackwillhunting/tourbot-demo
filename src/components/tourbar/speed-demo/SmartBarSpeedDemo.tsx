import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellDemoCommand,
  type TourBarShellResult,
  type TourBarShellTurnContext,
} from "../TourBarShell";
import { OrderReview, type CarryoutOrder, type GuideAiCarryoutResponse, type ReviewMode } from "../TourBarOrdering";
import { TourBarBookingHandoffSheet, type TourBarBookingHandoff } from "../TourBarBooking";
import SmartBarDemoScrubber from "./SmartBarDemoScrubber";
import { SMARTBAR_SPEED_STEPS, type SmartBarSpeedCommand } from "./smartBarSpeedScript";

const TYPE_DELAY_MS = 18;
const FIXTURE_THINKING_MS = 280;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
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

  if (text.includes("dora")) {
    return {
      title: "DORA readiness",
      body:
        "Yes. DORA support belongs in the Cybersecurity & Compliance lane.\n\nRelevant work:\n- ICT third-party risk mapping\n- incident response and escalation readiness\n- resilience testing evidence\n- governance, policy, and reporting alignment",
      invitation: { kind: "case_studies", text: "Show relevant case studies" },
      nextMove: { type: "ask_deeper", label: "Show relevant case studies", query: "__case_studies" },
      canFollowUp: true,
      mode: "speed_info",
      raw: speedMeta({ stableSheetKey: "discovery", separateSheetNextMove: true }),
    };
  }

  if (text === "__case_studies") {
    return {
      title: "Relevant case studies",
      body:
        "- Third-party ICT register review for a regulated financial firm\n- Incident-response tabletop mapped to executive escalation paths\n- Resilience evidence pack prepared for governance and audit review",
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
    });
  }

  if (text === "__qualifier_3") {
    return orderResult(readyCarryoutOrder("qualified"), {
      title: "Review order",
      nextQuery: "__checkout_qualified",
      separateSheetNextMove: true,
    });
  }

  if (text.includes("nice room") || text.includes("view and breakfast")) {
    return {
      title: "Recommendation 1 of 3: Garden Terrace King",
      body:
        "$239/night. A quieter garden-facing option with a resort feel and lower price. It is a value fit, but the view is softer than the Ocean View Suite.",
      invitation: { kind: "next", text: "Show next recommendation" },
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
      invitation: { kind: "next", text: "Show premium comparison" },
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

export default function SmartBarSpeedDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoCommand, setDemoCommand] = useState<TourBarShellDemoCommand | null>(null);
  const commandIdRef = useRef(0);

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
    let cancelled = false;
    const currentStep = SMARTBAR_SPEED_STEPS[stepIndex];

    const run = async () => {
      for (const command of currentStep.commands) {
        if (cancelled) return;
        await runCommand(command, () => cancelled);
      }

      if (!cancelled && isPlaying) {
        await wait(650);
        if (cancelled) return;
        if (stepIndex < SMARTBAR_SPEED_STEPS.length - 1) setStepIndex((index) => index + 1);
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

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_52%,_#f8fafc_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="fixed right-6 top-6 z-[10070] h-9 w-9">
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
            waitingMessage: "Hold for next consultant...",
            confirmationMessage: "Thanks — someone will be with you shortly.",
            consultantResponseMessage: "Hello — I can help with pricing.",
          }}
          demoCommand={demoCommand}
          onPrimarySubmit={onPrimarySubmit}
          onFollowUpSubmit={onFollowUpSubmit}
          renderResultExtras={renderSpeedExtras}
          buildThreadMessage={(result) => [result.title, result.body].filter(Boolean).join("\n")}
        />
      </div>

      <SmartBarDemoScrubber
        index={stepIndex}
        isPlaying={isPlaying}
        onSelect={(index) => {
          setIsPlaying(false);
          setStepIndex(index);
        }}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
      />
    </main>
  );
}
