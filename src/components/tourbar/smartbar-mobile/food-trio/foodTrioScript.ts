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
    proof: "Detail-heavy drinks with easy-to-miss modifiers.",
    shortPrompt: "Two complex coffee drinks",
    samplePrompt:
      "Two grande iced vanilla lattes with oat milk, one half-caf extra hot cappuccino with almond milk, and a turkey pesto sandwich with no tomato.",
  },
  {
    id: "fast-food",
    brand: "Cluck & Fry",
    category: "Fast food ordering",
    proof: "Large messy order, repeated items, sauces, sides, and quick fixes.",
    shortPrompt: "A big fast-food order",
    samplePrompt:
      "Four chicken sandwich meals, two spicy, one grilled, one no pickles, three large waffle fries, a 12-count nugget box, two lemonades, one sweet tea, and lots of sauce.",
  },
  {
    id: "casual-dining",
    brand: "Tablehouse Grill",
    category: "Casual dining ordering",
    proof: "Wide range across appetizers, soups, salads, entrees, sides, desserts, and drinks.",
    shortPrompt: "A full casual dining order",
    samplePrompt:
      "Start with avocado rolls and loaded nachos, add two salads, chicken madeira with mashed potatoes, salmon with asparagus, a kids pasta, cheesecake, and two mocktails.",
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
    "coffee-iced-vanilla-lattes",
    "foodtrio-coffee-iced-vanilla-latte",
    "2 × Grande Iced Vanilla Lattes",
    "$13.50",
    ["Oat milk", "Vanilla syrup", "Light ice", "Grande"],
  ),
  line(
    "coffee-cappuccino",
    "foodtrio-coffee-cappuccino",
    "Half-caf Cappuccino",
    "$5.95",
    ["Half-caf", "Extra hot", "Almond milk"],
    "Confirm size",
    "pending",
    ["Tall", "Grande", "Venti"],
  ),
  line(
    "coffee-turkey-pesto",
    "foodtrio-coffee-turkey-pesto",
    "Turkey Pesto Sandwich",
    "$8.75",
    ["No tomato", "Warm it"],
  ),
  line(
    "coffee-loyalty",
    "foodtrio-coffee-pickup",
    "Pickup timing",
    "$0.00",
    ["ASAP pickup", "Rewards eligible"],
    "Options available",
    "options",
    ["ASAP", "Schedule pickup", "Use rewards"],
    "multi",
  ),
];

const FAST_FOOD_LINES: SmartBarMobileOrderLine[] = [
  line("fast-regular-sandwiches", "foodtrio-fast-original-sandwich-meal", "2 × Chicken Sandwich Meals", "$21.98", ["Original sandwich", "Large waffle fries", "Lemonade"]),
  line("fast-spicy-sandwiches", "foodtrio-fast-spicy-sandwich-meal", "2 × Spicy Sandwich Meals", "$22.98", ["Spicy filet", "Large waffle fries", "Sweet tea"]),
  line("fast-grilled", "foodtrio-fast-grilled-sandwich-meal", "Grilled Sandwich Meal", "$11.79", ["No pickles", "Fruit cup", "Unsweet tea"]),
  line("fast-nuggets", "foodtrio-fast-nuggets", "12-count Nugget Box", "$8.95", ["Shareable", "Add sauces"]),
  line("fast-waffle-fries", "foodtrio-fast-waffle-fries", "3 × Large Waffle Fries", "$11.25", ["Crispy", "Separate bags"]),
  line(
    "fast-sauces",
    "foodtrio-fast-sauces",
    "Sauce bundle",
    "$0.00",
    ["Ranch", "Polynesian", "Honey mustard"],
    "Confirm sauce count",
    "options",
    ["2 Ranch", "2 Polynesian", "2 Honey mustard", "Add buffalo"],
    "multi",
  ),
  line("fast-drinks", "foodtrio-fast-drinks", "Drink set", "$8.70", ["2 lemonades", "1 sweet tea", "1 unsweet tea"]),
  line("fast-dessert", "foodtrio-fast-cookie", "Chocolate chunk cookie", "$1.85", ["Add one treat"]),
];

const CASUAL_DINING_LINES: SmartBarMobileOrderLine[] = [
  line("casual-avocado-rolls", "foodtrio-casual-avocado-rolls", "Avocado Rolls", "$14.95", ["Share plate", "Tamarind sauce"]),
  line("casual-nachos", "foodtrio-casual-loaded-nachos", "Loaded Nachos", "$16.50", ["Chicken added", "Jalapeños on side"]),
  line("casual-salads", "foodtrio-casual-dinner-salad", "2 × Dinner Salads", "$17.90", ["One ranch", "One vinaigrette"]),
  line("casual-soup", "foodtrio-casual-soup", "Soup of the Day", "$7.95", ["Cup", "Before entree"]),
  line("casual-madeira", "foodtrio-casual-chicken-madeira", "Chicken Madeira", "$24.95", ["Mashed potatoes", "Extra mushroom sauce"]),
  line("casual-salmon", "foodtrio-casual-herb-salmon", "Herb Salmon", "$27.95", ["Asparagus", "Sauce on side"]),
  line(
    "casual-kids-pasta",
    "foodtrio-casual-kids-pasta",
    "Kids Pasta",
    "$8.95",
    ["Butter sauce"],
    "Choose pasta shape",
    "pending",
    ["Penne", "Spaghetti", "Bowtie"],
  ),
  line("casual-cheesecake", "foodtrio-casual-cheesecake", "Original Cheesecake", "$10.50", ["Strawberries on side"]),
  line(
    "casual-mocktails",
    "foodtrio-casual-mocktails",
    "2 × Sparkling Mocktails",
    "$15.00",
    ["One berry", "One citrus"],
    "Options available",
    "options",
    ["Light ice", "No garnish", "Extra mint"],
    "multi",
  ),
];

export function foodTrioPromptForScenario(scenarioId: FoodTrioScenarioId) {
  return FOOD_TRIO_SCENARIOS.find((scenario) => scenario.id === scenarioId)?.samplePrompt || FOOD_TRIO_SCENARIOS[0].samplePrompt;
}

export function foodTrioScenarioFromQuery(query: string, fallback: FoodTrioScenarioId = "coffee"): FoodTrioScenarioId {
  const text = query.toLowerCase();

  if (/\b(coffee|latte|cappuccino|espresso|oat|almond|sandwich)\b/.test(text)) return "coffee";
  if (/\b(chicken|nugget|fries|waffle|sauce|lemonade|tea|spicy|grilled)\b/.test(text)) return "fast-food";
  if (/\b(nachos|salad|salmon|madeira|pasta|cheesecake|mocktail|appetizer|entree)\b/.test(text)) return "casual-dining";

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
  const nextLines = lines.map((lineItem) => {
    if ((lineItem.cartLineKey || lineItem.id) !== (selectedLine.cartLineKey || selectedLine.id)) return lineItem;

    return {
      ...lineItem,
      status: "ready" as const,
      helper: "Choice selected",
      details: [...lineItem.details, value],
      options: undefined,
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
