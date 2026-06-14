import {
  BadgeCheck,
  Beef,
  CakeSlice,
  ChefHat,
  Coffee,
  CupSoda,
  Flame,
  GlassWater,
  Milk,
  Sandwich,
  Soup,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { FOOD_TRIO_SCENARIOS, type FoodTrioScenarioId } from "./foodTrioScript";

type Tone = "espresso" | "cream" | "ember" | "burgundy" | "slate" | "olive" | "blue";
type Shape = "feature" | "square" | "line";

type FoodTarget = {
  id: string;
  scenarioId: FoodTrioScenarioId;
  group: string;
  title: string;
  description: string;
  price: string;
  badge: string;
  Icon: LucideIcon;
  tone: Tone;
  shape: Shape;
};

type FoodTrioDesktopTargetWallProps = {
  activeScenario: FoodTrioScenarioId;
  activeTargetId?: string | null;
  onScenarioSelect?: (scenarioId: FoodTrioScenarioId) => void;
  onSamplePrompt?: (scenarioId: FoodTrioScenarioId) => void;
};

const DESKTOP_SECTION_TONES: Record<FoodTrioScenarioId, string> = {
  coffee:
    "border-amber-200/18 bg-[radial-gradient(circle_at_18%_0%,rgba(245,158,11,0.18),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.10),transparent_34%),linear-gradient(180deg,rgba(22,14,10,0.98),rgba(7,11,20,0.96))]",
  "fast-food":
    "border-orange-300/18 bg-[radial-gradient(circle_at_14%_0%,rgba(249,115,22,0.22),transparent_38%),radial-gradient(circle_at_86%_16%,rgba(248,113,113,0.10),transparent_35%),linear-gradient(180deg,rgba(38,13,8,0.98),rgba(7,11,20,0.96))]",
  "casual-dining":
    "border-rose-200/18 bg-[radial-gradient(circle_at_16%_0%,rgba(251,113,133,0.18),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.10),transparent_36%),linear-gradient(180deg,rgba(35,11,24,0.98),rgba(7,11,20,0.96))]",
};

const DESKTOP_CARD_TONES: Record<Tone, string> = {
  espresso:
    "border-amber-200/26 bg-[radial-gradient(circle_at_16%_0%,rgba(245,158,11,0.30),transparent_36%),linear-gradient(135deg,rgba(36,20,10,0.98),rgba(80,43,18,0.76))] text-amber-50",
  cream:
    "border-orange-100/24 bg-[radial-gradient(circle_at_16%_0%,rgba(254,215,170,0.24),transparent_36%),linear-gradient(135deg,rgba(42,32,23,0.98),rgba(92,57,29,0.66))] text-orange-50",
  ember:
    "border-orange-300/28 bg-[radial-gradient(circle_at_16%_0%,rgba(249,115,22,0.32),transparent_36%),linear-gradient(135deg,rgba(48,17,8,0.98),rgba(127,29,29,0.72))] text-orange-50",
  burgundy:
    "border-rose-200/26 bg-[radial-gradient(circle_at_16%_0%,rgba(251,113,133,0.26),transparent_36%),linear-gradient(135deg,rgba(47,13,28,0.98),rgba(88,28,55,0.72))] text-rose-50",
  slate:
    "border-slate-300/22 bg-[radial-gradient(circle_at_16%_0%,rgba(148,163,184,0.22),transparent_36%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(30,41,59,0.82))] text-slate-50",
  olive:
    "border-lime-200/24 bg-[radial-gradient(circle_at_16%_0%,rgba(190,242,100,0.20),transparent_36%),linear-gradient(135deg,rgba(20,33,19,0.98),rgba(63,98,18,0.58))] text-lime-50",
  blue:
    "border-sky-200/24 bg-[radial-gradient(circle_at_16%_0%,rgba(125,211,252,0.24),transparent_36%),linear-gradient(135deg,rgba(8,27,45,0.98),rgba(12,74,110,0.64))] text-sky-50",
};

const DESKTOP_TARGET_LAYOUT: Partial<Record<string, string>> = {
  "foodtrio-coffee-iced-vanilla-latte": "col-span-12 lg:col-span-5 min-h-[17.5rem]",
  "foodtrio-coffee-cappuccino": "col-span-6 lg:col-span-3 min-h-[13.5rem]",
  "foodtrio-coffee-turkey-pesto": "col-span-6 lg:col-span-4 min-h-[13.5rem]",
  "foodtrio-coffee-oat-milk": "col-span-12 lg:col-span-6 min-h-[8.5rem]",
  "foodtrio-coffee-vanilla-syrup": "col-span-12 lg:col-span-6 min-h-[8.5rem]",
  "foodtrio-coffee-cold-brew": "col-span-6 lg:col-span-4 min-h-[14rem]",
  "foodtrio-coffee-pickup": "col-span-6 lg:col-span-8 min-h-[9rem]",

  "foodtrio-fast-spicy-sandwich-meal": "col-span-6 lg:col-span-4 min-h-[14rem]",
  "foodtrio-fast-waffle-fries": "col-span-6 lg:col-span-3 min-h-[13rem]",
  "foodtrio-fast-sauces": "col-span-12 lg:col-span-5 min-h-[8.5rem]",
  "foodtrio-fast-cookie": "col-span-6 lg:col-span-3 min-h-[9rem]",
  "foodtrio-fast-original-sandwich-meal": "col-span-12 lg:col-span-5 min-h-[17rem]",
  "foodtrio-fast-grilled-sandwich-meal": "col-span-6 lg:col-span-4 min-h-[15rem]",
  "foodtrio-fast-drinks": "col-span-12 lg:col-span-7 min-h-[8.5rem]",
  "foodtrio-fast-nuggets": "col-span-6 lg:col-span-5 min-h-[13.5rem]",

  "foodtrio-casual-avocado-rolls": "col-span-12 lg:col-span-5 min-h-[17rem]",
  "foodtrio-casual-herb-salmon": "col-span-6 lg:col-span-4 min-h-[14rem]",
  "foodtrio-casual-soup": "col-span-6 lg:col-span-3 min-h-[8.5rem]",
  "foodtrio-casual-dinner-salad": "col-span-6 lg:col-span-3 min-h-[13rem]",
  "foodtrio-casual-chicken-madeira": "col-span-12 lg:col-span-5 min-h-[17rem]",
  "foodtrio-casual-mocktails": "col-span-12 lg:col-span-4 min-h-[8.5rem]",
  "foodtrio-casual-kids-pasta": "col-span-6 lg:col-span-3 min-h-[13rem]",
  "foodtrio-casual-cheesecake": "col-span-12 lg:col-span-6 min-h-[9rem]",
  "foodtrio-casual-loaded-nachos": "col-span-6 lg:col-span-3 min-h-[13rem]",
  "foodtrio-casual-bottom-buffer-bread": "col-span-12 lg:col-span-4 min-h-[8.5rem]",
  "foodtrio-casual-bottom-buffer-asparagus": "col-span-6 lg:col-span-4 min-h-[12rem]",
  "foodtrio-casual-bottom-buffer-coffee": "col-span-6 lg:col-span-4 min-h-[12rem]",
  "foodtrio-casual-bottom-buffer-sundae": "col-span-12 lg:col-span-4 min-h-[8.5rem]",
};

const DESKTOP_FOOD_TARGETS: FoodTarget[] = [
{
    id: "foodtrio-coffee-iced-vanilla-latte",
    scenarioId: "coffee",
    group: "Espresso Bar",
    title: "Iced Vanilla Latte",
    description: "Oat milk, half sweet, light ice, extra shot. Modifiers stay visible and editable.",
    price: "$7.25",
    badge: "Latte",
    Icon: Coffee,
    tone: "espresso",
    shape: "feature",
  },

{
    id: "foodtrio-coffee-cappuccino",
    scenarioId: "coffee",
    group: "Tea Bar",
    title: "Matcha Latte",
    description: "Matcha base with optional extra matcha and ice level choices.",
    price: "$6.25",
    badge: "Matcha",
    Icon: Milk,
    tone: "cream",
    shape: "square",
  },

{
    id: "foodtrio-coffee-turkey-pesto",
    scenarioId: "coffee",
    group: "Food Case",
    title: "Turkey Pesto Panini",
    description: "No tomato, warmed. Food prep rides with the drink order.",
    price: "$8.75",
    badge: "Warm",
    Icon: Sandwich,
    tone: "olive",
    shape: "square",
  },

{
    id: "foodtrio-coffee-oat-milk",
    scenarioId: "coffee",
    group: "Modifiers",
    title: "Oat Milk / Almond Milk",
    description: "Alternative milks are small-price modifiers, not separate items.",
    price: "+$0.80",
    badge: "Milk",
    Icon: Milk,
    tone: "blue",
    shape: "line",
  },

{
    id: "foodtrio-coffee-vanilla-syrup",
    scenarioId: "coffee",
    group: "Modifiers",
    title: "Vanilla Syrup · Light Ice · Extra Hot",
    description: "Tiny details sit near the product targets for camouflage and spotlight contrast.",
    price: "+$0.75",
    badge: "Mods",
    Icon: Sparkles,
    tone: "slate",
    shape: "line",
  },

{
    id: "foodtrio-coffee-cold-brew",
    scenarioId: "coffee",
    group: "Cold Bar",
    title: "Cold Brew",
    description: "Black with vanilla cold foam. Optional foam, oat splash, light ice, and sweetness choices.",
    price: "$6.25",
    badge: "Cold",
    Icon: Coffee,
    tone: "blue",
    shape: "square",
  },

{
    id: "foodtrio-coffee-pickup",
    scenarioId: "coffee",
    group: "Pickup",
    title: "ASAP Pickup + Rewards",
    description: "Pickup timing and loyalty choices stay out of the food math.",
    price: "$0.00",
    badge: "ASAP",
    Icon: BadgeCheck,
    tone: "slate",
    shape: "line",
  },

{
    id: "foodtrio-fast-spicy-sandwich-meal",
    scenarioId: "fast-food",
    group: "Chicken Meals",
    title: "Spicy Chicken Sandwich Meal",
    description: "Spicy filet, fries, drink. Similar item, separate cart line.",
    price: "$11.49",
    badge: "Spicy",
    Icon: Flame,
    tone: "burgundy",
    shape: "square",
  },

{
    id: "foodtrio-fast-waffle-fries",
    scenarioId: "fast-food",
    group: "Sides",
    title: "Large Waffle Fries",
    description: "Repeated sides prove volume and set up the cart-scroll moment.",
    price: "$3.75",
    badge: "Side",
    Icon: Sparkles,
    tone: "blue",
    shape: "square",
  },

{
    id: "foodtrio-fast-sauces",
    scenarioId: "fast-food",
    group: "Sauces",
    title: "Ranch · Polynesian · Honey Mustard",
    description: "Free but important. These tiny choices are where phone ordering gets annoying.",
    price: "$0.00",
    badge: "Sauces",
    Icon: CupSoda,
    tone: "espresso",
    shape: "line",
  },

{
    id: "foodtrio-fast-cookie",
    scenarioId: "fast-food",
    group: "Treats",
    title: "Chocolate Chunk Cookie",
    description: "Small add-ons should not derail checkout.",
    price: "$1.85",
    badge: "Add",
    Icon: CakeSlice,
    tone: "burgundy",
    shape: "line",
  },

{
    id: "foodtrio-fast-original-sandwich-meal",
    scenarioId: "fast-food",
    group: "Chicken Meals",
    title: "Original Chicken Sandwich Meal",
    description: "Original filet, bun, pickles, large waffle fries, lemonade.",
    price: "$10.99",
    badge: "Meal",
    Icon: Utensils,
    tone: "ember",
    shape: "feature",
  },

{
    id: "foodtrio-fast-grilled-sandwich-meal",
    scenarioId: "fast-food",
    group: "Chicken Meals",
    title: "Grilled Chicken Sandwich Meal",
    description: "No pickles, fruit cup, unsweet tea.",
    price: "$11.79",
    badge: "Grilled",
    Icon: ChefHat,
    tone: "olive",
    shape: "square",
  },

{
    id: "foodtrio-fast-drinks",
    scenarioId: "fast-food",
    group: "Drinks",
    title: "Lemonade / Sweet Tea / Unsweet Tea",
    description: "Generic drink lane, because sodas and fountain drinks are group targets.",
    price: "$2.90",
    badge: "Drinks",
    Icon: GlassWater,
    tone: "blue",
    shape: "line",
  },

{
    id: "foodtrio-fast-nuggets",
    scenarioId: "fast-food",
    group: "Shareables",
    title: "Chicken Nuggets",
    description: "Choose the count first, then attach sauces.",
    price: "From $5.95",
    badge: "Count",
    Icon: Beef,
    tone: "slate",
    shape: "square",
  },

{
    id: "foodtrio-casual-avocado-rolls",
    scenarioId: "casual-dining",
    group: "Appetizers",
    title: "Avocado Eggrolls",
    description: "Share plate with tamarind-cashew dipping sauce.",
    price: "$14.95",
    badge: "App",
    Icon: Utensils,
    tone: "olive",
    shape: "feature",
  },

{
    id: "foodtrio-casual-herb-salmon",
    scenarioId: "casual-dining",
    group: "Entrees",
    title: "Herb-Crusted Salmon",
    description: "Asparagus, sauce on side.",
    price: "$27.95",
    badge: "Entree",
    Icon: Beef,
    tone: "olive",
    shape: "square",
  },

{
    id: "foodtrio-casual-soup",
    scenarioId: "casual-dining",
    group: "Salads + Soup",
    title: "Soup of the Day · Cup",
    description: "Course timing matters: before entree.",
    price: "$7.95",
    badge: "Soup",
    Icon: Soup,
    tone: "slate",
    shape: "line",
  },

{
    id: "foodtrio-casual-dinner-salad",
    scenarioId: "casual-dining",
    group: "Salads + Soup",
    title: "Dinner Salad",
    description: "One ranch, one vinaigrette. Same product, different dressings.",
    price: "$8.95",
    badge: "Salad",
    Icon: Sparkles,
    tone: "blue",
    shape: "square",
  },

{
    id: "foodtrio-casual-chicken-madeira",
    scenarioId: "casual-dining",
    group: "Entrees",
    title: "Chicken Madeira",
    description: "Mashed potatoes, extra mushroom sauce. Rich entree modifier example.",
    price: "$24.95",
    badge: "Entree",
    Icon: ChefHat,
    tone: "burgundy",
    shape: "feature",
  },

{
    id: "foodtrio-casual-mocktails",
    scenarioId: "casual-dining",
    group: "Drinks",
    title: "Sparkling Berry / Citrus Mocktails",
    description: "Two drinks, different flavors, optional light ice/no garnish.",
    price: "$7.50 ea",
    badge: "Drinks",
    Icon: GlassWater,
    tone: "blue",
    shape: "line",
  },

{
    id: "foodtrio-casual-kids-pasta",
    scenarioId: "casual-dining",
    group: "Kids",
    title: "Kids Butter Pasta",
    description: "Pasta shape still needed.",
    price: "$8.95",
    badge: "Choice",
    Icon: Utensils,
    tone: "cream",
    shape: "square",
  },

{
    id: "foodtrio-casual-cheesecake",
    scenarioId: "casual-dining",
    group: "Dessert",
    title: "Original Cheesecake",
    description: "Strawberries on side.",
    price: "$10.50",
    badge: "Dessert",
    Icon: CakeSlice,
    tone: "burgundy",
    shape: "line",
  },

{
    id: "foodtrio-casual-loaded-nachos",
    scenarioId: "casual-dining",
    group: "Appetizers",
    title: "Loaded Chicken Nachos",
    description: "Jalapeños on side, chicken added.",
    price: "$16.50",
    badge: "App",
    Icon: Flame,
    tone: "ember",
    shape: "square",
  },

  {
    id: "foodtrio-casual-bottom-buffer-bread",
    scenarioId: "casual-dining",
    group: "Table Extras",
    title: "Warm Bread Basket",
    description: "Harmless bottom menu filler so dessert targets can land higher in the viewport.",
    price: "$5.95",
    badge: "Extra",
    Icon: Utensils,
    tone: "cream",
    shape: "line",
  },
  {
    id: "foodtrio-casual-bottom-buffer-asparagus",
    scenarioId: "casual-dining",
    group: "Sides",
    title: "Roasted Asparagus",
    description: "A believable side card that is not part of the scripted cart.",
    price: "$7.50",
    badge: "Side",
    Icon: Sparkles,
    tone: "olive",
    shape: "square",
  },
  {
    id: "foodtrio-casual-bottom-buffer-coffee",
    scenarioId: "casual-dining",
    group: "After Dinner",
    title: "Coffee / Decaf / Espresso",
    description: "End-of-meal options create natural scroll room below dessert.",
    price: "$4.50",
    badge: "Drink",
    Icon: Coffee,
    tone: "espresso",
    shape: "square",
  },
  {
    id: "foodtrio-casual-bottom-buffer-sundae",
    scenarioId: "casual-dining",
    group: "Dessert",
    title: "Kids Sundae",
    description: "Extra dessert padding only; not referenced by the SmartBar cart.",
    price: "$6.95",
    badge: "Dessert",
    Icon: CakeSlice,
    tone: "burgundy",
    shape: "line",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function scenarioAnchorId(scenarioId: FoodTrioScenarioId) {
  return `foodtrio-scenario-${scenarioId}`;
}

function FoodTrioDesktopMenuCard({
  target,
  active,
  dimmed,
}: {
  target: FoodTarget;
  active: boolean;
  dimmed?: boolean;
}) {
  const Icon = target.Icon;
  const compact = target.shape === "line";

  return (
    <article
      data-tour-id={target.id}
      data-foodtrio-target={target.id}
      data-smartbar-focus-surface="foodtrio-desktop"
      data-spotlight-mode={target.shape === "line" ? "region" : "card"}
      className={cx(
        "relative overflow-hidden rounded-[1.7rem] border p-5 shadow-[0_22px_60px_rgba(2,6,23,0.30)] ring-1 ring-white/8 transition-[filter,opacity,transform] duration-300",
        DESKTOP_CARD_TONES[target.tone],
        DESKTOP_TARGET_LAYOUT[target.id] || "col-span-6 lg:col-span-3 min-h-[13rem]",
        active && "z-10 scale-[1.012] brightness-110 ring-2 ring-cyan-200/50",
        dimmed && "brightness-75 saturate-75 opacity-60",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),transparent_34%,rgba(0,0,0,0.14))]" />
      <div className="relative z-10 flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/48">{target.group}</div>
            <h3 className={compact ? "mt-1 text-[17px] font-black leading-tight text-white" : "mt-2 text-[22px] font-black leading-tight tracking-[-0.03em] text-white"}>
              {target.title}
            </h3>
          </div>
          <div className="shrink-0 rounded-full bg-white/92 px-3 py-1 text-[12px] font-black text-slate-950 shadow-sm">
            {target.price}
          </div>
        </div>

        <p className={compact ? "max-w-[44rem] text-[13px] font-semibold leading-relaxed text-white/64" : "text-[14px] font-semibold leading-relaxed text-white/66"}>
          {target.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/66">
            {target.badge}
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/78">
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

export default function FoodTrioDesktopTargetWall({
  activeScenario,
  activeTargetId,
  onScenarioSelect,
  onSamplePrompt,
}: FoodTrioDesktopTargetWallProps) {
  return (
    <div className="w-full min-w-0 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/88 px-8 py-4 shadow-[0_16px_50px_rgba(2,6,23,0.28)] backdrop-blur-2xl lg:px-12">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-8">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">FoodTrio ordering demo</div>
            <h1 className="mt-1 text-[28px] font-black leading-tight tracking-[-0.04em] text-white">Three food orders. One SmartBar.</h1>
          </div>
          <div className="grid min-w-[34rem] grid-cols-3 gap-2">
            {FOOD_TRIO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onScenarioSelect?.(scenario.id)}
                className={cx(
                  "rounded-full border px-4 py-2 text-[12px] font-black transition",
                  activeScenario === scenario.id
                    ? "border-cyan-200/70 bg-cyan-200 text-slate-950 shadow-[0_0_26px_rgba(125,211,252,0.24)]"
                    : "border-white/12 bg-white/8 text-white/70 hover:bg-white/12",
                )}
              >
                {scenario.brand.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {FOOD_TRIO_SCENARIOS.map((scenario) => {
        const targets = DESKTOP_FOOD_TARGETS.filter((target) => target.scenarioId === scenario.id);
        const isActiveScenario = activeScenario === scenario.id;

        return (
          <section
            key={scenario.id}
            id={scenarioAnchorId(scenario.id)}
            data-foodtrio-scenario={scenario.id}
            className="min-h-[100svh] scroll-mt-20 px-6 py-8 lg:px-10 xl:px-12"
          >
            <div
              className={cx(
                "mx-auto w-full max-w-[1680px] rounded-[2.25rem] border p-6 shadow-[0_30px_90px_rgba(2,6,23,0.34)] lg:p-8",
                DESKTOP_SECTION_TONES[scenario.id],
                isActiveScenario ? "ring-2 ring-cyan-200/26" : "ring-1 ring-white/5",
              )}
            >
              <div className="mb-6 flex items-end justify-between gap-8">
                <div className="max-w-[48rem]">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/48">{scenario.category}</div>
                  <h2 className="mt-2 text-[38px] font-black leading-none tracking-[-0.055em] text-white">{scenario.brand}</h2>
                  <p className="mt-3 text-[15px] font-semibold leading-relaxed text-white/62">{scenario.proof}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSamplePrompt?.(scenario.id)}
                  className="shrink-0 rounded-full border border-white/12 bg-white/10 px-5 py-2.5 text-[12px] font-black text-white/82 shadow-sm hover:bg-white/14"
                >
                  Try sample
                </button>
              </div>

              <div className="grid grid-cols-12 gap-5 lg:gap-6">
                {targets.map((target) => (
                  <FoodTrioDesktopMenuCard
                    key={target.id}
                    target={target}
                    active={activeTargetId === target.id}
                    dimmed={Boolean(activeTargetId && isActiveScenario && activeTargetId !== target.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
