import type {
  CarryoutPreCartLine,
  CarryoutPreCartState,
  CarryoutQualifierGroup,
} from "./carryoutTypes";

type DemoGuideConfigLike = {
  mode?: string;
  catalogMode?: string;
};

type DemoFixtureReply = {
  title: string;
  body: string;
  answerParts?: {
    intro?: string;
    bullets?: string[];
    closing?: string;
  };
  suggestedAction?: Record<string, unknown>;
  rankedDestinations?: Array<Record<string, unknown>>;
  stepNarratives?: Array<Record<string, unknown>>;
  refinementChips?: string[];
  commerceAction?: string;
  displayMode?: string;
  stayPlan?: null;
  navigationOrder?: string[];
  extractedBookingContext?: Record<string, unknown>;
  visibleContext?: {
    carryoutOrder?: CarryoutPreCartState | null;
    [key: string]: unknown;
  };
  missingFields?: string[];
  resumePrompt?: string;
};

const CARRYOUT_DEMO_DELAY_MS = 5000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCarryoutBigOrderDemoPrompt(message: string) {
  const text = normalizedText(message);
  if (!text) return false;

  return (
    /\b(burger|burgers)\b/.test(text) &&
    /\bfries\b/.test(text) &&
    /\bonion\s+rings\b/.test(text) &&
    /\b(soda|sodas)\b/.test(text) &&
    /\b(ice\s+tea|iced\s+tea)\b/.test(text) &&
    /\b(milk\s*shake|milkshake|milk\s*shakes|milkshakes)\b/.test(text)
  );
}

function option(label: string, value?: string) {
  const cleanValue = value || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    label,
    value: cleanValue,
    state: "available" as const,
  };
}

function qualifierGroup({
  lineItemId,
  targetId,
  qualifierId,
  label,
  options,
}: {
  lineItemId: string;
  targetId: string;
  qualifierId: string;
  label: string;
  options: Array<{ label?: string | null; value?: string | null; state?: string }>;
}): CarryoutQualifierGroup {
  return {
    kind: "qualifier",
    qualifierId,
    label,
    lineItemId,
    targetId,
    required: true,
    missing: true,
    selectedValue: null,
    selectedLabel: null,
    options: options.map((item) => ({
      ...item,
      qualifierId,
      lineItemId,
      targetId,
      selected: false,
      state: item.state || "available",
    })),
  };
}

const sideSizeOptions = [option("Small", "small"), option("Medium", "medium"), option("Large", "large")];
const drinkSizeOptions = [option("Medium", "medium"), option("Large", "large")];
const sodaFlavorOptions = [
  option("Coke", "coke"),
  option("Diet Coke", "diet-coke"),
  option("Sprite", "sprite"),
  option("Root Beer", "root-beer"),
];
const teaSweetnessOptions = [option("Sweet", "sweet"), option("Unsweet", "unsweet")];
const shakeFlavorOptions = [option("Vanilla", "vanilla"), option("Chocolate", "chocolate"), option("Strawberry", "strawberry")];

function missingFromGroups(groups: CarryoutQualifierGroup[]) {
  return groups.map((group) => ({
    qualifierId: group.qualifierId,
    label: group.label,
    targetId: group.targetId,
  }));
}

function line({
  lineItemId,
  itemId,
  targetId,
  title,
  type = "offer",
  quantity = 1,
  knownSelections = [],
  qualifierGroups,
  lineSubtotal,
}: {
  lineItemId: string;
  itemId: string;
  targetId: string;
  title: string;
  type?: string;
  quantity?: number;
  knownSelections?: string[];
  qualifierGroups: CarryoutQualifierGroup[];
  lineSubtotal?: number | null;
}): CarryoutPreCartLine {
  return {
    id: lineItemId,
    lineItemId,
    itemId,
    targetId,
    title,
    type,
    quantity,
    knownSelections,
    qualifiers: [],
    missingQualifiers: missingFromGroups(qualifierGroups),
    qualifierGroups,
    lineSubtotal: lineSubtotal ?? null,
    priceStatus: "incomplete",
    status: "pending",
  };
}

function makeLineGroups(lineItemId: string, targetId: string, specs: Array<"side-size" | "drink-size" | "soda-flavor" | "tea-sweetness" | "shake-flavor">) {
  return specs.map((spec) => {
    if (spec === "side-size") {
      return qualifierGroup({
        lineItemId,
        targetId,
        qualifierId: "side-size",
        label: "Side size",
        options: sideSizeOptions,
      });
    }
    if (spec === "drink-size") {
      return qualifierGroup({
        lineItemId,
        targetId,
        qualifierId: "drink-size",
        label: "Drink size",
        options: drinkSizeOptions,
      });
    }
    if (spec === "soda-flavor") {
      return qualifierGroup({
        lineItemId,
        targetId,
        qualifierId: "soda-flavor",
        label: "Soda flavor",
        options: sodaFlavorOptions,
      });
    }
    if (spec === "tea-sweetness") {
      return qualifierGroup({
        lineItemId,
        targetId,
        qualifierId: "tea-sweetness",
        label: "Tea sweetness",
        options: teaSweetnessOptions,
      });
    }
    return qualifierGroup({
      lineItemId,
      targetId,
      qualifierId: "shake-flavor",
      label: "Milkshake flavor",
      options: shakeFlavorOptions,
    });
  });
}

function buildCarryoutDemoLines() {
  const combo1Groups = makeLineGroups("demo-combo-1", "combo-classic-burger", ["side-size", "drink-size", "soda-flavor"]);
  const combo2Groups = makeLineGroups("demo-combo-2", "combo-classic-burger", ["side-size", "drink-size", "soda-flavor"]);
  const burgerGroups: CarryoutQualifierGroup[] = [];
  const onionGroups = makeLineGroups("demo-onion-rings", "side-onion-rings", ["side-size"]);
  const soda3Groups = makeLineGroups("demo-soda-3", "drink-soda", ["drink-size", "soda-flavor"]);
  const soda4Groups = makeLineGroups("demo-soda-4", "drink-soda", ["drink-size", "soda-flavor"]);
  const teaGroups = makeLineGroups("demo-iced-tea", "drink-iced-tea", ["drink-size", "tea-sweetness"]);
  const shake1Groups = makeLineGroups("demo-milkshake-1", "drink-milkshake", ["shake-flavor"]);

  return [
    line({
      lineItemId: "demo-combo-1",
      itemId: "combo-classic-burger",
      targetId: "combo-classic-burger",
      title: "Classic Burger Combo #1",
      type: "bundle",
      knownSelections: ["Classic burger", "Fries", "Fountain soda", "Combo savings applied"],
      qualifierGroups: combo1Groups,
      lineSubtotal: 9.49,
    }),
    line({
      lineItemId: "demo-combo-2",
      itemId: "combo-classic-burger",
      targetId: "combo-classic-burger",
      title: "Classic Burger Combo #2",
      type: "bundle",
      knownSelections: ["Classic burger", "Fries", "Fountain soda", "Combo savings applied"],
      qualifierGroups: combo2Groups,
      lineSubtotal: 9.49,
    }),
    line({
      lineItemId: "demo-burger-3",
      itemId: "item-classic-burger",
      targetId: "item-classic-burger",
      title: "Classic Burger",
      knownSelections: ["Standalone burger"],
      qualifierGroups: burgerGroups,
      lineSubtotal: 4.99,
    }),
    line({
      lineItemId: "demo-onion-rings",
      itemId: "side-onion-rings",
      targetId: "side-onion-rings",
      title: "Onion Rings",
      knownSelections: ["Side item"],
      qualifierGroups: onionGroups,
      lineSubtotal: 3.99,
    }),
    line({
      lineItemId: "demo-soda-3",
      itemId: "drink-soda",
      targetId: "drink-soda",
      title: "Large Fountain Soda #3",
      knownSelections: ["Extra soda"],
      qualifierGroups: soda3Groups,
      lineSubtotal: 2.49,
    }),
    line({
      lineItemId: "demo-soda-4",
      itemId: "drink-soda",
      targetId: "drink-soda",
      title: "Large Fountain Soda #4",
      knownSelections: ["Extra soda"],
      qualifierGroups: soda4Groups,
      lineSubtotal: 2.49,
    }),
    line({
      lineItemId: "demo-iced-tea",
      itemId: "drink-iced-tea",
      targetId: "drink-iced-tea",
      title: "Large Iced Tea",
      knownSelections: ["Iced tea"],
      qualifierGroups: teaGroups,
      lineSubtotal: 2.79,
    }),
    line({
      lineItemId: "demo-milkshake-1",
      itemId: "drink-milkshake",
      targetId: "drink-milkshake",
      title: "Milkshake #1",
      knownSelections: ["Dessert drink"],
      qualifierGroups: shake1Groups,
      lineSubtotal: 4.29,
    }),
  ];
}

function buildStep(line: CarryoutPreCartLine, index: number, total: number) {
  const qualifierGroups = line.qualifierGroups || [];
  const targetText = line.title || "Carryout item";
  const body =
    index < 2
      ? `TourBot grouped part of the order into **${targetText}** so the customer gets combo pricing instead of separate burger, fries, and soda rows.`
      : `Now confirming choices for **${targetText}**.`;

  return {
    type: "navigate",
    targetId: line.targetId,
    itemId: line.itemId,
    lineItemId: line.lineItemId,
    targetText,
    reviewIndex: index + 1,
    reviewCount: total,
    qualifierGroups,
    stepNarrative: {
      targetId: line.targetId,
      itemId: line.itemId,
      lineItemId: line.lineItemId,
      targetText,
      reviewIndex: index + 1,
      reviewCount: total,
      body,
      qualifierGroups,
    },
  };
}

export function buildCarryoutBigOrderDemoFixtureReply(): DemoFixtureReply {
  const lines = buildCarryoutDemoLines();
  const order: CarryoutPreCartState = {
    type: "carryout_pre_cart",
    status: "needs_qualifier",
    nextAction: "collect_qualifiers",
    completeItems: [],
    pendingItems: lines,
    cannotMatchItems: [],
    currentQualifierControls: lines[0]?.qualifierGroups || [],
    savedBadgeCount: lines.length,
    navigationOrder: lines.map((line) => String(line.targetId || "")).filter(Boolean),
    totals: {
      status: "partial",
      subtotal: 40.02,
      estimatedTax: 3.21,
      estimatedTotal: 43.23,
      finalTotalAvailable: false,
      currency: "USD",
    },
  };

  const steps = lines.map((item, index) => buildStep(item, index, lines.length));

  return {
    title: "Guide response",
    body:
      "I found the carryout order and applied combo savings where they fit. Two burger-fries-soda groups were converted into Classic Burger Combos, so the 12 requested items are staged as 8 cart lines. I’ll walk through the missing choices next.",
    answerParts: {
      intro:
        "I found the carryout order and applied combo savings where they fit.",
      bullets: [
        "2 burger + fries + soda sets became Classic Burger Combos.",
        "The remaining burger, onion rings, extra sodas, iced tea, and the milkshake stay as separate cart lines.",
        "TourBot can now collect only the missing choices instead of making the customer rebuild the order manually.",
      ],
      closing: "Next, I’ll walk through the choices needed to finish checkout.",
    },
    rankedDestinations: steps,
    stepNarratives: steps.map((step) => step.stepNarrative),
    refinementChips: [],
    commerceAction: "carryout_ordering",
    displayMode: "carryout_ordering",
    stayPlan: null,
    navigationOrder: order.navigationOrder,
    visibleContext: {
      carryoutOrder: order,
    },
    missingFields: [],
  };
}

export async function maybeBuildCarryoutDemoFixtureReply({
  message,
  guideConfig,
  isDemoActive,
  delayMs = CARRYOUT_DEMO_DELAY_MS,
}: {
  message: string;
  guideConfig?: DemoGuideConfigLike | null;
  isDemoActive?: boolean;
  delayMs?: number;
}) {
  if (!isDemoActive) return null;
  if (guideConfig?.catalogMode !== "carryout_ordering") return null;
  if (!isCarryoutBigOrderDemoPrompt(message)) return null;

  if (delayMs > 0) await wait(delayMs);
  return buildCarryoutBigOrderDemoFixtureReply();
}
