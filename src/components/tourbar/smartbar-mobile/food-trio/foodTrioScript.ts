import type {
  SmartBarMobileOrderLine,
  SmartBarMobileOrderResult,
} from "../SmartBarMobileShell";

export type FoodTrioScenarioId = "coffee" | "fast-food" | "casual-dining";

export type FoodTrioScenario = {
  id: FoodTrioScenarioId;
  brand: string;
  category: string;
  proof: string;
  samplePrompt: string;
  shortPrompt: string;
};

export const FOOD_TRIO_SCENARIOS: FoodTrioScenario[] = [
  {
    id: "coffee",
    brand: "Beanstack Coffee",
    category: "Coffee shop ordering",
    proof: "Meticulous drink modifiers stay visible and editable.",
    shortPrompt: "Three highly customized drinks",
    samplePrompt:
      "Three drinks: iced vanilla latte with oat milk, half sweet, light ice, and extra shot; matcha latte with almond milk, no foam, and light ice; cold brew black with vanilla cold foam.",
  },
  {
    id: "fast-food",
    brand: "Cluck & Fry",
    category: "Fast food ordering",
    proof: "Messy shorthand becomes a mostly-ready green cart.",
    shortPrompt: "Messy shorthand, mostly ready",
    samplePrompt:
      "2 chick mals, 1 spicy, both diet coke, 6 kids nug bbq sauce, extra sauces, crunch wrap",
  },
  {
    id: "casual-dining",
    brand: "Tablehouse Grill",
    category: "Casual dining ordering",
    proof: "Full meal captured; filters jump straight to what needs attention.",
    shortPrompt: "Full meal, filter to what matters",
    samplePrompt:
      "Start with avocado eggrolls, two dinner salads, Chicken Madeira with mashed potatoes, Herb-Crusted Salmon, and one Original Cheesecake with whipped cream — add extra whipped cream if available.",
  },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function totals(lines: SmartBarMobileOrderLine[]): Pick<SmartBarMobileOrderResult, "estimatedSubtotal" | "estimatedTax" | "estimatedTotal"> {
  const subtotal = lines.reduce((sum, line) => {
    const parsed = Number(String(line.price || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
  const tax = subtotal * 0.0825;

  return {
    estimatedSubtotal: money(subtotal),
    estimatedTax: money(tax),
    estimatedTotal: money(subtotal + tax),
  };
}

function line(
  id: string,
  targetId: string,
  title: string,
  price: string,
  details: string[],
  helper = "Matched and ready",
  status: SmartBarMobileOrderLine["status"] = "ready",
  options?: string[],
  optionSelectionMode: SmartBarMobileOrderLine["optionSelectionMode"] = "single",
): SmartBarMobileOrderLine {
  return {
    id,
    cartLineKey: id,
    targetId,
    title,
    price,
    details,
    helper,
    status,
    options,
    optionSelectionMode,
    retryPrompt: status === "unknown" ? "Re-enter this item." : undefined,
  };
}

const COFFEE_LINES: SmartBarMobileOrderLine[] = [
  line(
    "coffee-iced-vanilla-latte",
    "foodtrio-coffee-iced-vanilla-latte",
    "Iced Vanilla Latte",
    "$7.25",
    ["Oat milk", "Half sweet", "Light ice", "Extra shot"],
    "Modifier stack preserved",
    "options",
    ["Oat milk", "Half sweet", "Light ice", "Extra shot", "Vanilla cold foam", "Caramel drizzle", "Extra vanilla"],
    "multi",
  ),
  line(
    "coffee-matcha-latte",
    "foodtrio-coffee-cappuccino",
    "Matcha Latte",
    "$6.95",
    ["Almond milk", "No foam", "Light ice"],
    "Adjust precise drink notes",
    "options",
    ["Almond milk", "No foam", "Light ice", "Extra matcha", "Less sweet", "Oat milk"],
    "multi",
  ),
  line(
    "coffee-cold-brew",
    "foodtrio-coffee-cold-brew",
    "Cold Brew",
    "$6.25",
    ["Black", "Vanilla cold foam"],
    "Review preserved modifiers",
    "options",
    ["Black", "Vanilla cold foam", "Extra cold foam", "Splash oat milk", "Light ice", "No sweetener"],
    "multi",
  ),
];

const FAST_FOOD_LINES: SmartBarMobileOrderLine[] = [
  // FOODTRIO_MOBILE_FAST_FOOD_DESKTOP_STORY_DATA_V1:
  // Mobile Fast Food now matches the polished desktop story:
  // messy shorthand, mostly green, one yellow sauce review, one gray retry.
  line(
    "fast-spicy-meal",
    "foodtrio-fast-spicy-sandwich-meal",
    "1 × Spicy Chicken Sandwich Meal",
    "$10.99",
    ["Medium fries", "Diet Coke"],
    "Parsed from shorthand",
  ),
  line(
    "fast-mild-meal",
    "foodtrio-fast-original-sandwich-meal",
    "1 × Mild Chicken Sandwich Meal",
    "$10.49",
    ["Medium fries", "Diet Coke"],
    "Parsed from shorthand",
  ),
  line(
    "fast-kids-nuggets",
    "foodtrio-fast-nuggets",
    "Kids Nuggets",
    "$5.99",
    ["6-count", "BBQ sauce"],
    "Parsed from shorthand",
  ),
  line(
    "fast-sauces",
    "foodtrio-fast-sauces",
    "Sauce bundle",
    "$0.00",
    ["BBQ"],
    "Optional sauces available",
    "options",
    ["Ranch", "Buffalo", "Honey mustard", "Extra BBQ"],
    "multi",
  ),
  line(
    "fast-crunch-wrap",
    "foodtrio-fast-original-sandwich-meal",
    "crunch wrap",
    "—",
    [],
    "Could not match exact item",
    "unknown",
    undefined,
    "single",
  ),
];

const CASUAL_DINING_LINES: SmartBarMobileOrderLine[] = [
  // FOODTRIO_MOBILE_CASUAL_FILTER_STORY_DATA_V1:
  // Mobile Casual now uses filters as the phone-native navigation system:
  // red required side, green editable ready item, yellow captured extra.
  line(
    "casual-avocado-rolls",
    "foodtrio-casual-avocado-rolls",
    "Avocado Eggrolls",
    "$14.95",
    ["Share plate", "Tamarind sauce"],
  ),
  line(
    "casual-salads",
    "foodtrio-casual-dinner-salad",
    "2 × Dinner Salads",
    "$17.90",
    ["One ranch", "One vinaigrette"],
  ),
  line(
    "casual-salmon",
    "foodtrio-casual-herb-salmon",
    "Herb-Crusted Salmon",
    "$27.95",
    [],
    "Choose entree side",
    "pending",
    ["Asparagus", "Rice pilaf", "Mashed potatoes", "Side salad"],
  ),
  line(
    "casual-madeira",
    "foodtrio-casual-chicken-madeira",
    "Chicken Madeira",
    "$24.95",
    ["Mashed potatoes"],
    "Ready, but side can change",
    "ready",
    ["Asparagus", "Rice pilaf", "Side salad", "Mashed potatoes"],
  ),
  line(
    "casual-cheesecake",
    "foodtrio-casual-cheesecake",
    "Original Cheesecake",
    "$10.50",
    ["Whipped cream", "Extra whipped cream"],
    "Extra whipped cream already captured",
    "options",
    ["Extra whipped cream", "No whipped cream", "Strawberry sauce", "Whipped cream"],
    "multi",
  ),
];

export function foodTrioPromptForScenario(scenarioId: FoodTrioScenarioId) {
  return FOOD_TRIO_SCENARIOS.find((scenario) => scenario.id === scenarioId)?.samplePrompt || FOOD_TRIO_SCENARIOS[0].samplePrompt;
}

export function foodTrioScenarioFromQuery(query: string, fallback: FoodTrioScenarioId = "coffee"): FoodTrioScenarioId {
  const text = query.toLowerCase();

  if (/\b(coffee|latte|matcha|cold brew|cappuccino|espresso|oat|almond|foam|drinks?)\b/.test(text)) return "coffee";
  if (/\b(eggrolls?|salad|salmon|madeira|pasta|cheesecake|mocktail|appetizer|entree|dessert|whipped)\b/.test(text)) return "casual-dining";
  if (/\b(chx|chick|chicken|sandwch|sandwich|mals|meals|nugget|nugs|fries|fryz|waffle|sauce|sauces|diet coke|coke|dr pepper|pepper|wrap|spicy|grilled sandwich)\b/.test(text)) return "fast-food";

  return fallback;
}

export function foodTrioLinesForScenario(scenarioId: FoodTrioScenarioId): SmartBarMobileOrderLine[] {
  if (scenarioId === "fast-food") return FAST_FOOD_LINES.map((item) => ({ ...item }));
  if (scenarioId === "casual-dining") return CASUAL_DINING_LINES.map((item) => ({ ...item }));

  return COFFEE_LINES.map((item) => ({ ...item }));
}

export function foodTrioResultForScenario(scenarioId: FoodTrioScenarioId): SmartBarMobileOrderResult {
  const lines = foodTrioLinesForScenario(scenarioId);
  return {
    lines,
    ...totals(lines),
  };
}

export function foodTrioResultForQuery(query: string, fallback: FoodTrioScenarioId = "coffee") {
  return foodTrioResultForScenario(foodTrioScenarioFromQuery(query, fallback));
}

export function foodTrioApplyChoice(
  lines: SmartBarMobileOrderLine[],
  selectedLine: SmartBarMobileOrderLine,
  value: string,
): SmartBarMobileOrderResult {
  const selectedOptionKey = value.trim().toLowerCase();

  const nextLines = lines.map((lineItem) => {
    if ((lineItem.cartLineKey || lineItem.id) !== (selectedLine.cartLineKey || selectedLine.id)) return lineItem;

    const isMultiSelect = lineItem.optionSelectionMode === "multi" || lineItem.status === "options";
    const valueAlreadySelected = (lineItem.details || []).some((detail) => {
      return detail.trim().toLowerCase() === selectedOptionKey;
    });
    const nextDetails = isMultiSelect && valueAlreadySelected
      ? (lineItem.details || []).filter((detail) => detail.trim().toLowerCase() !== selectedOptionKey)
      : Array.from(new Set([...(lineItem.details || []), value]));

    if (isMultiSelect) {
      return {
        ...lineItem,
        status: "options" as const,
        helper: valueAlreadySelected ? "Extra removed" : "Extras updated",
        details: nextDetails,
        options: lineItem.options || [],
        optionSelectionMode: "multi" as const,
      };
    }

    return {
      ...lineItem,
      status: "ready" as const,
      helper: "Choice selected",
      details: nextDetails,
      options: undefined,
      optionSelectionMode: "single" as const,
    };
  });

  return {
    lines: nextLines,
    ...totals(nextLines),
  };
}

export function foodTrioRemoveLine(
  lines: SmartBarMobileOrderLine[],
  selectedLine: SmartBarMobileOrderLine,
): SmartBarMobileOrderResult {
  const keyToRemove = selectedLine.cartLineKey || selectedLine.id;
  const nextLines = lines.filter((lineItem) => (lineItem.cartLineKey || lineItem.id) !== keyToRemove);

  return {
    lines: nextLines,
    ...totals(nextLines),
  };
}
