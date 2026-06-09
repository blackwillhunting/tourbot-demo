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
    proof: "A reckless group order becomes sortable by red, yellow, and gray.",
    shortPrompt: "Messy group order with typos",
    samplePrompt:
      "need 4 chx sandwch meals 2 spicy 1 no pickels one reg, larg fryz, 3 dr peperrs, kid nugs bbq, xtra sauces, and that crunchy wrap thing if u have it",
  },
  {
    id: "casual-dining",
    brand: "Tablehouse Grill",
    category: "Casual dining ordering",
    proof: "Full-service menus have weird choices, and ready items stay editable.",
    shortPrompt: "Full table order with weird choices",
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
    retryPrompt: status === "unknown" ? "Re-enter the item so SmartBar can match it to the menu." : undefined,
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
    "foodtrio-coffee-pickup",
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
  line(
    "fast-spicy-meals",
    "foodtrio-fast-spicy-sandwich-meal",
    "2 × Spicy Chicken Sandwich Meals",
    "$22.98",
    ["Large fries", "Dr Pepper", "No edits needed"],
  ),
  line(
    "fast-regular-meal",
    "foodtrio-fast-original-sandwich-meal",
    "Regular Chicken Sandwich Meal",
    "$10.99",
    ["No pickles", "Choice needed"],
    "Choose side and drink",
    "pending",
    ["Large fries + Dr Pepper", "Waffle fries + lemonade", "Fruit cup + water"],
  ),
  line(
    "fast-kids-nuggets",
    "foodtrio-fast-nuggets",
    "Kids Nuggets",
    "$6.95",
    ["BBQ sauce", "Count missing"],
    "Choose nugget count",
    "pending",
    ["6-count", "8-count", "12-count"],
  ),
  line(
    "fast-large-fries",
    "foodtrio-fast-waffle-fries",
    "Large Fries",
    "$7.50",
    ["Large", "Group order"],
    "Extras available",
    "options",
    ["No salt", "Extra crispy", "Add cheese", "Side ketchup"],
    "multi",
  ),
  line(
    "fast-sauces",
    "foodtrio-fast-sauces",
    "Sauce bundle",
    "$0.00",
    ["BBQ"],
    "Add group sauces",
    "options",
    ["Ranch", "Buffalo", "Honey mustard", "Extra BBQ"],
    "multi",
  ),
  line(
    "fast-dr-peppers",
    "foodtrio-fast-drinks",
    "3 × Dr Pepper",
    "$8.70",
    ["Size unclear"],
    "Choose drink size",
    "pending",
    ["Medium", "Large", "No ice"],
  ),
  line(
    "fast-crunchy-wrap",
    "foodtrio-fast-original-sandwich-meal",
    "crunchy wrap thing",
    "—",
    [],
    "Could not match exact item",
    "unknown",
    undefined,
    "single",
  ),
];

const CASUAL_DINING_LINES: SmartBarMobileOrderLine[] = [
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
    "casual-madeira",
    "foodtrio-casual-chicken-madeira",
    "Chicken Madeira",
    "$24.95",
    ["Mashed potatoes", "Extra mushroom sauce"],
    "Ready, but side can change",
    "ready",
    ["Mashed potatoes", "Asparagus", "Rice pilaf", "Side salad"],
  ),
  line(
    "casual-salmon",
    "foodtrio-casual-herb-salmon",
    "Herb-Crusted Salmon",
    "$27.95",
    ["Side needed"],
    "Choose entree side",
    "pending",
    ["Asparagus", "Rice pilaf", "Mashed potatoes", "Side salad"],
  ),
  line(
    "casual-cheesecake",
    "foodtrio-casual-cheesecake",
    "Original Cheesecake",
    "$10.50",
    ["Whipped cream"],
    "Dessert option available",
    "options",
    ["Extra whipped cream", "No whipped cream", "Strawberry sauce"],
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
  if (/\b(chx|sandwch|nugget|nugs|fries|fryz|waffle|sauce|sauces|dr pepper|pepper|wrap|spicy|grilled sandwich)\b/.test(text)) return "fast-food";

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
