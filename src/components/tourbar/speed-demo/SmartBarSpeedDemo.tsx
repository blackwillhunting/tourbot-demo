import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Coffee, CreditCard, Hotel, ListChecks, ShieldCheck, Sparkles, Users } from "lucide-react";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellDemoCommand,
  type TourBarShellResult,
  type TourBarShellTurnContext,
} from "../TourBarShell";
import { OrderReview, type CarryoutOrder, type GuideAiCarryoutResponse, type ReviewMode } from "../TourBarOrdering";
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
  const comboSelections =
    kind === "qualified"
      ? ["Double patty", "Large fries", "Diet Coke"]
      : ["Large fries", "Large Diet Coke", "No onions"];

  return {
    type: "carryout_order",
    status: "ready_cart",
    nextAction: "show_cart",
    items: [
      line("double-cheeseburger-combo", "Double cheeseburger combo", "$11.99", comboSelections),
      line("apple-pie", "Apple pie", "$2.49"),
      ...(kind === "finale" ? [] : [line("large-diet-coke", "Large Diet Coke", "$2.19")]),
    ],
    completeItems: [
      line("double-cheeseburger-combo", "Double cheeseburger combo", "$11.99", comboSelections),
      line("apple-pie", "Apple pie", "$2.49"),
      ...(kind === "finale" ? [] : [line("large-diet-coke", "Large Diet Coke", "$2.19")]),
    ],
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
    body: order.status === "ready_cart" ? "Review the cart before checkout." : "Pick the missing choices, or open the cart to review everything.",
    commerceAction,
    displayMode: order.status === "ready_cart" ? "carryout_cart_panel" : "carryout_review",
    carryoutOrder: order,
    visibleContext: { carryoutOrder: order },
  };
}

function orderResult(order: CarryoutOrder, options: { title?: string; body?: string; activeIndex?: number; reviewMode?: ReviewMode; nextQuery?: string } = {}): TourBarShellResult {
  const raw = carryoutRaw(order);
  return {
    title: options.title || (order.status === "ready_cart" ? "Review order" : "Needs choices"),
    body: options.body || (order.status === "ready_cart" ? "The cart is structured and ready for checkout." : "SmartBar turned a vague order into the next missing choice."),
    invitation: options.nextQuery ? { kind: "next", text: options.nextQuery.startsWith("__checkout") ? "Checkout" : "Choose this option" } : undefined,
    nextMove: options.nextQuery ? { type: "handoff", label: options.nextQuery.startsWith("__checkout") ? "Checkout" : "Choose this option", query: options.nextQuery } : undefined,
    canFollowUp: true,
    mode: "speed_order",
    action: raw.commerceAction,
    raw: {
      ...raw,
      __speedDemo: {
        activeIndex: options.activeIndex || 0,
        reviewMode: options.reviewMode || (order.status === "ready_cart" ? "cart" : "review"),
      },
    },
  };
}

function fixtureResult(query: string): TourBarShellResult {
  const text = query.trim().toLowerCase();

  if (text.includes("dora")) {
    return {
      title: "DORA readiness sits in the compliance lane",
      body:
        "Yes. SmartBar can explain where DORA fits, show the relevant advisory path, and move the visitor toward useful proof instead of leaving them with a generic search result.",
      invitation: { kind: "case_studies", text: "Invite case studies" },
      nextMove: { type: "ask_deeper", label: "Show case studies", query: "__case_studies" },
      canFollowUp: true,
      mode: "speed_info",
    };
  }

  if (text === "__case_studies") {
    return {
      title: "Relevant proof points",
      body: "SmartBar pivots from a service question into evidence the visitor can actually use.",
      canFollowUp: true,
      mode: "speed_case_studies",
    };
  }

  if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez")) {
    return orderResult(readyCarryoutOrder("messy"), {
      title: "Ready cart from messy English",
      body: "SmartBar corrected the intent, matched menu items, and built a ready checkout cart.",
      nextQuery: "__checkout",
    });
  }

  if (text === "__checkout") {
    return {
      title: "Checkout handoff ready",
      body:
        "The order is ready to hand off to a checkout or POS flow with the matched items, quantities, and selections preserved.",
      canFollowUp: false,
      mode: "speed_checkout",
    };
  }

  if (text.includes("burger combo")) {
    return orderResult(pendingCarryoutOrder(0), {
      title: "One choice needed",
      body: "SmartBar does not ask a vague follow-up. It opens the exact selector needed next.",
      activeIndex: 0,
      reviewMode: "review",
      nextQuery: "__qualifier_1",
    });
  }

  if (text === "__qualifier_1") {
    return orderResult(pendingCarryoutOrder(1), {
      title: "Next missing choice",
      body: "The burger choice is captured. SmartBar advances to the fries selector.",
      activeIndex: 1,
      reviewMode: "review",
      nextQuery: "__qualifier_2",
    });
  }

  if (text === "__qualifier_2") {
    return orderResult(pendingCarryoutOrder(2), {
      title: "Last missing choice",
      body: "Now SmartBar needs the drink choice before the cart can be finalized.",
      activeIndex: 2,
      reviewMode: "review",
      nextQuery: "__qualifier_3",
    });
  }

  if (text === "__qualifier_3") {
    return orderResult(readyCarryoutOrder("qualified"), {
      title: "Ready cart",
      body: "The missing choices are resolved and the order is ready for checkout.",
      nextQuery: "__checkout",
    });
  }

  if (text.includes("nice room") || text.includes("view and breakfast")) {
    return {
      title: "Recommendation 1 of 3: Garden Terrace King",
      body:
        "A value resort-feel option with a quieter garden view. It is less expensive, but breakfast is better handled as an add-on.",
      invitation: { kind: "next", text: "Show next recommendation" },
      nextMove: { type: "compare_options", label: "Show next recommendation", query: "__booking_step_2" },
      canFollowUp: true,
      mode: "speed_booking_reco_1",
    };
  }

  if (text === "__booking_step_2") {
    return {
      title: "Recommendation 2 of 3: Ocean View Suite",
      body:
        "Best fit: a strong view without jumping to the most expensive villa tier. Breakfast can be attached as a package.",
      invitation: { kind: "next", text: "Show premium comparison" },
      nextMove: { type: "compare_options", label: "Show premium comparison", query: "__booking_step_3" },
      canFollowUp: true,
      mode: "speed_booking_reco_2",
    };
  }

  if (text === "__booking_step_3") {
    return {
      title: "Recommendation 3 of 3: Coastal Villa Suite",
      body:
        "The premium option has the strongest view and space, but it is more than the request needs. SmartBar keeps the Ocean View Suite as the practical recommendation.",
      canFollowUp: true,
      mode: "speed_booking_reco_3",
    };
  }

  if (text.includes("breakfast")) {
    return {
      title: "Breakfast package added",
      body:
        "SmartBar pairs the Ocean View Suite with the Breakfast Flex Plan instead of forcing the visitor to browse package cards.",
      invitation: { kind: "book", text: "Book this" },
      nextMove: { type: "handoff", label: "Book this", query: "__booking_confirm" },
      canFollowUp: true,
      mode: "speed_package",
    };
  }

  if (text === "__booking_confirm") {
    return {
      title: "Booking summary ready",
      body:
        "Room: Ocean View Suite. Package: Breakfast Flex Plan. Known preferences are preserved for the booking handoff.",
      canFollowUp: false,
      mode: "speed_booking_confirm",
    };
  }

  if (text.includes("family room")) {
    return {
      title: "Stay details needed",
      body:
        "SmartBar knows the likely room family, but booking requires dates and guests before it can recommend confidently.",
      canFollowUp: true,
      mode: "speed_needs_context",
    };
  }

  if (text === "__booking_after_context" || text.includes("family recommendation")) {
    return {
      title: "Family Double Room recommended",
      body:
        "With dates and 2 adults / 2 children selected, SmartBar recommends the Family Double Room with the Family Comfort Bundle.",
      invitation: { kind: "book", text: "Book this family stay" },
      nextMove: { type: "handoff", label: "Book this family stay", query: "__booking_confirm" },
      canFollowUp: true,
      mode: "speed_family_reco",
    };
  }

  if (text.includes("action choices") || text.includes("tiles")) {
    return {
      title: "Action tiles",
      body: "When a decision is needed, SmartBar returns choices instead of paragraphs.",
      canFollowUp: false,
      mode: "speed_tiles",
    };
  }

  if (text.includes("cart")) {
    return orderResult(readyCarryoutOrder("finale"), {
      title: "Cart tool",
      body: "A search bar can become a cart when the job is ordering.",
    });
  }

  if (text.includes("summary")) {
    return {
      title: "Summary tool",
      body: "When the user is ready to act, SmartBar packages the decision into a clean summary.",
      canFollowUp: false,
      mode: "speed_booking_confirm",
    };
  }

  return {
    title: "Info sheet",
    body: "SmartBar is a search bar that does. It chooses the right UX tool for the next step.",
    canFollowUp: true,
    mode: "speed_info",
  };
}

function CaseStudyBullets() {
  return (
    <div className="grid gap-2">
      {[
        [ShieldCheck, "Regulatory mapping", "Map DORA obligations to current risk and operational controls."],
        [ListChecks, "Third-party risk", "Identify vendor dependencies, evidence gaps, and ownership."],
        [Sparkles, "Consult-ready brief", "Package the known context before a human conversation starts."],
      ].map(([Icon, title, body]) => {
        const ItemIcon = Icon as typeof ShieldCheck;
        return (
          <div key={String(title)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                <ItemIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-950">{String(title)}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{String(body)}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionTiles({ actions }: { actions: Array<{ label: string; helper: string; icon: typeof Sparkles }> }) {
  return (
    <div className="grid gap-2">
      {actions.map(({ label, helper, icon: Icon }, index) => (
        <button
          key={label}
          type="button"
          className={`rounded-2xl px-3 py-2.5 text-left shadow-sm ring-1 transition ${
            index === 0
              ? "bg-slate-950 text-white ring-slate-950"
              : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${index === 0 ? "text-white" : "text-slate-500"}`} />
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className={`mt-0.5 block text-xs leading-5 ${index === 0 ? "text-slate-200" : "text-slate-500"}`}>{helper}</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function BookingCards({ mode }: { mode?: string }) {
  const selected = mode?.endsWith("2") || mode === "speed_package" || mode === "speed_booking_confirm";
  const cards = [
    { title: "Garden Terrace King", price: "$239/night", helper: "Good value, softer view", icon: Hotel },
    { title: "Ocean View Suite", price: "$379/night", helper: "Best fit with breakfast", icon: WavesIcon },
    { title: "Coastal Villa Suite", price: "$549/night", helper: "Premium, not needed", icon: Sparkles },
  ];

  return (
    <div className="grid gap-2">
      {cards.map(({ title, price, helper, icon: Icon }, index) => {
        const active = selected ? index === 1 : index === 0;
        return (
          <div key={title} className={`rounded-2xl border px-3 py-2.5 shadow-sm ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{title}</div>
                  <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{price}</div>
                </div>
                <div className={`mt-0.5 text-xs leading-5 ${active ? "text-slate-200" : "text-slate-500"}`}>{helper}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WavesIcon({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}

function PackageCard() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <div className="text-sm font-bold">Breakfast Flex Plan</div>
          <div className="mt-0.5 text-xs leading-5 text-amber-800">Daily breakfast credit across cafe, buffet, and grab-and-go. +$32/night.</div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ family = false }: { family?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <div className="text-sm font-bold">{family ? "Family stay ready" : "Booking handoff ready"}</div>
            <div className="mt-0.5 text-xs leading-5 text-emerald-800">
              {family
                ? "Family Double Room · Family Comfort Bundle · 2 adults / 2 children."
                : "Ocean View Suite · Breakfast Flex Plan · ready for prefill."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSpeedExtras(result: TourBarShellResult, actions: TourBarShellActions) {
  const mode = result.mode || "";

  if (mode === "speed_case_studies") return <CaseStudyBullets />;

  if (mode === "speed_info") {
    return (
      <ActionTiles
        actions={[
          { label: "Explain DORA coverage", helper: "Answer the service question directly.", icon: ShieldCheck },
          { label: "Show relevant proof", helper: "Move from search to evidence.", icon: ListChecks },
          { label: "Prepare consult", helper: "Package the context for a person.", icon: Users },
        ]}
      />
    );
  }

  if (mode === "speed_tiles") {
    return (
      <ActionTiles
        actions={[
          { label: "Open selector", helper: "Use a choice tile when one answer is needed.", icon: ListChecks },
          { label: "Open cart", helper: "Use a cart when the user is ordering.", icon: CreditCard },
          { label: "Open chat", helper: "Use a thread when a person is needed.", icon: Users },
        ]}
      />
    );
  }

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

  if (mode.startsWith("speed_booking_reco")) return <BookingCards mode={mode} />;
  if (mode === "speed_package") return <PackageCard />;
  if (mode === "speed_booking_confirm") return <SummaryCard />;
  if (mode === "speed_family_reco") return <SummaryCard family />;
  if (mode === "speed_checkout") return <SummaryCard />;

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
      <div className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

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
