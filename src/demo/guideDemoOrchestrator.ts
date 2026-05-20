import {
  assistedCompletionCollectBookingFixture,
  cloneFixture,
  hotelAssistedCompletionFixtures,
  hotelNaturalLanguageBookingFixtures,
  type GuideDemoFixtureReply,
} from "./guideDemoFixtures";

type GuideDemoOrchestratorRequest = {
  message: string;
  guideConfig?: {
    mode?: string;
    catalogMode?: string;
  };
  conversationContext?: unknown;
  visibleContext?: Record<string, unknown> | null;
  isDemoActive?: boolean;
};

function normalizePrompt(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[’‘]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasResolvedBookingBasics(visibleContext?: Record<string, unknown> | null) {
  const bookingContext =
    visibleContext?.bookingContext && typeof visibleContext.bookingContext === "object"
      ? (visibleContext.bookingContext as Record<string, unknown>)
      : null;

  if (!bookingContext) return false;

  const hasDates = Boolean(bookingContext.checkInDate && bookingContext.checkOutDate);
  const guests =
    typeof bookingContext.guests === "number"
      ? bookingContext.guests
      : typeof bookingContext.adults === "number"
        ? bookingContext.adults
        : 0;

  return Boolean(hasDates && Number(guests) > 0);
}

function cloneCarryoutOrder(visibleContext?: Record<string, unknown> | null) {
  const order = visibleContext?.carryoutOrder;
  if (!order || typeof order !== "object") return null;
  return JSON.parse(JSON.stringify(order)) as Record<string, any>;
}

function setCarryoutTotals(order: Record<string, any>, finalTotalAvailable: boolean) {
  order.totals = {
    ...(order.totals || {}),
    status: "partial",
    subtotal: 40.02,
    estimatedTax: 3.21,
    estimatedTotal: 43.23,
    finalTotalAvailable,
    currency: "USD",
  };
}

function buildCarryoutShowCartFixture(
  visibleContext?: Record<string, unknown> | null,
): GuideDemoFixtureReply | null {
  const order = cloneCarryoutOrder(visibleContext);
  if (!order) return null;

  order.type = order.type || "carryout_pre_cart";
  order.status = "needs_qualifier";
  order.nextAction = "ask_qualifier";
  order.savedBadgeCount = 8;
  setCarryoutTotals(order, false);

  const navigationOrder = Array.isArray(order.navigationOrder)
    ? order.navigationOrder.filter(Boolean).map(String)
    : [
        "combo-classic-burger",
        "combo-classic-burger",
        "item-classic-burger",
        "side-onion-rings",
        "drink-soda",
        "drink-soda",
        "drink-iced-tea",
        "drink-milkshake",
      ];

  return {
    title: "Guide response",
    body:
      "I opened your draft cart: 8 cart lines with 7 ready and 1 still needing choices. Estimated total: $43.23.",
    commerceAction: "carryout_show_cart",
    displayMode: "carryout_cart_panel",
    suggestedAction: null,
    rankedDestinations: [],
    stepNarratives: [],
    refinementChips: [],
    navigationOrder,
    visibleContext: {
      ...(visibleContext || {}),
      carryoutOrder: order,
    },
  };
}

function vanillaMilkshakeQualifier(line: Record<string, any>) {
  const qualifier = {
    qualifierId: "shake-flavor",
    label: "Milkshake flavor",
    value: "vanilla",
    valueLabel: "Vanilla",
    targetId: line.targetId || "drink-milkshake",
  };

  line.knownSelections = Array.from(
    new Set([...(Array.isArray(line.knownSelections) ? line.knownSelections : []), "Vanilla"]),
  );
  line.qualifiers = [qualifier];
  line.missingQualifiers = [];
  line.status = "ready";

  if (Array.isArray(line.qualifierGroups)) {
    line.qualifierGroups = line.qualifierGroups.map((group: Record<string, any>) => {
      if (group.qualifierId !== "shake-flavor") return group;
      return {
        ...group,
        missing: false,
        selectedValue: "vanilla",
        selectedLabel: "Vanilla",
        options: Array.isArray(group.options)
          ? group.options.map((option: Record<string, any>) => ({
              ...option,
              state: option.value === "vanilla" ? "selected" : "available",
              selected: option.value === "vanilla",
            }))
          : group.options,
      };
    });
  }

  return line;
}

function buildCarryoutCheckoutFixture(
  visibleContext?: Record<string, unknown> | null,
): GuideDemoFixtureReply | null {
  const order = cloneCarryoutOrder(visibleContext);
  if (!order) return null;

  const completeItems = Array.isArray(order.completeItems) ? order.completeItems : [];
  const pendingItems = Array.isArray(order.pendingItems) ? order.pendingItems : [];
  const resolvedPending = pendingItems.map((line: Record<string, any>) => {
    if (line?.targetId === "drink-milkshake" || line?.itemId === "drink-milkshake") {
      return vanillaMilkshakeQualifier(line);
    }
    return { ...line, missingQualifiers: [], status: "ready" };
  });

  const readyItems = [...completeItems, ...resolvedPending].map((line) => ({
    ...line,
    status: "ready",
    missingQualifiers: Array.isArray(line.missingQualifiers) ? line.missingQualifiers : [],
  }));

  order.type = order.type || "carryout_pre_cart";
  order.status = "ready_cart";
  order.nextAction = "show_ready_cart";
  order.completeItems = readyItems;
  order.pendingItems = [];
  order.cannotMatchItems = Array.isArray(order.cannotMatchItems) ? order.cannotMatchItems : [];
  order.items = readyItems;
  order.savedBadgeCount = 8;
  setCarryoutTotals(order, true);

  const navigationOrder = Array.isArray(order.navigationOrder)
    ? order.navigationOrder.filter(Boolean).map(String)
    : [
        "combo-classic-burger",
        "combo-classic-burger",
        "item-classic-burger",
        "side-onion-rings",
        "drink-soda",
        "drink-soda",
        "drink-iced-tea",
        "drink-milkshake",
      ];

  return {
    title: "Guide response",
    body:
      "Your BurgerRush order is ready for checkout. I opened the review handoff for 8 cart lines. Estimated total: $43.23.",
    commerceAction: "carryout_checkout_handoff",
    displayMode: "carryout_checkout_review",
    suggestedAction: null,
    rankedDestinations: [],
    stepNarratives: [],
    refinementChips: [],
    navigationOrder,
    visibleContext: {
      ...(visibleContext || {}),
      carryoutOrder: order,
    },
  };
}

export function resolveGuideDemoFixtureReply({
  message,
  guideConfig,
  visibleContext,
}: GuideDemoOrchestratorRequest): GuideDemoFixtureReply | null {
  const key = normalizePrompt(message);

  if (guideConfig?.catalogMode === "carryout_ordering") {
    if (key === "show cart") {
      return buildCarryoutShowCartFixture(visibleContext);
    }

    if (key === "ok checkout" || key === "okay checkout" || key === "checkout") {
      return buildCarryoutCheckoutFixture(visibleContext);
    }

    return null;
  }

  if (guideConfig?.mode === "commerce") {
    if (
      key ===
      "i m planning a stay show me your cheapest room and your most expensive room"
    ) {
      if (!hasResolvedBookingBasics(visibleContext)) {
        return cloneFixture(assistedCompletionCollectBookingFixture);
      }

      return cloneFixture(hotelAssistedCompletionFixtures[key]);
    }

    const naturalFixture = hotelNaturalLanguageBookingFixtures[key];
    if (naturalFixture) return cloneFixture(naturalFixture);

    const assistedFixture = hotelAssistedCompletionFixtures[key];
    if (assistedFixture) return cloneFixture(assistedFixture);
  }

  return null;
}
