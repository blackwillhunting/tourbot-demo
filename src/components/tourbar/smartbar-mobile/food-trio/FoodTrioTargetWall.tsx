import { motion } from "framer-motion";
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

type FoodTargetRouteBreak = {
  label: string;
  note: string;
  depth: "short" | "medium" | "long";
};

type FoodTrioTargetWallProps = {
  activeScenario: FoodTrioScenarioId;
  activeTargetId?: string | null;
  onScenarioSelect?: (scenarioId: FoodTrioScenarioId) => void;
  onSamplePrompt?: (scenarioId: FoodTrioScenarioId) => void;
};

const SECTION_TONES: Record<FoodTrioScenarioId, string> = {
  coffee:
    "border-amber-200/18 bg-[radial-gradient(circle_at_20%_0%,rgba(245,158,11,0.20),transparent_38%),linear-gradient(180deg,rgba(31,19,13,0.98),rgba(8,11,18,0.94))]",
  "fast-food":
    "border-orange-300/18 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.22),transparent_38%),linear-gradient(180deg,rgba(46,16,8,0.98),rgba(9,12,18,0.94))]",
  "casual-dining":
    "border-rose-200/18 bg-[radial-gradient(circle_at_20%_0%,rgba(251,113,133,0.20),transparent_38%),linear-gradient(180deg,rgba(43,13,27,0.98),rgba(9,12,18,0.94))]",
};

const TONES: Record<Tone, string> = {
  espresso: "border-amber-200/28 bg-[#23150d] text-amber-50 ring-amber-200/14",
  cream: "border-orange-100/26 bg-[#2a2017] text-orange-50 ring-orange-100/12",
  ember: "border-orange-300/30 bg-[#2b120a] text-orange-50 ring-orange-300/14",
  burgundy: "border-rose-200/28 bg-[#280d18] text-rose-50 ring-rose-200/14",
  slate: "border-slate-300/24 bg-slate-950 text-slate-50 ring-slate-300/12",
  olive: "border-lime-200/24 bg-[#152113] text-lime-50 ring-lime-200/12",
  blue: "border-sky-200/24 bg-[#081b2d] text-sky-50 ring-sky-200/12",
};

const GLOWS: Record<Tone, string> = {
  espresso:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(245,158,11,0.30),transparent_35%),linear-gradient(135deg,rgba(36,20,10,0.96),rgba(80,43,18,0.80))]",
  cream:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(254,215,170,0.24),transparent_35%),linear-gradient(135deg,rgba(42,32,23,0.96),rgba(92,57,29,0.70))]",
  ember:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(249,115,22,0.34),transparent_35%),linear-gradient(135deg,rgba(48,17,8,0.96),rgba(127,29,29,0.76))]",
  burgundy:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(251,113,133,0.28),transparent_35%),linear-gradient(135deg,rgba(47,13,28,0.96),rgba(88,28,55,0.76))]",
  slate:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(148,163,184,0.26),transparent_35%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(30,41,59,0.82))]",
  olive:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(190,242,100,0.22),transparent_35%),linear-gradient(135deg,rgba(20,33,19,0.96),rgba(63,98,18,0.60))]",
  blue:
    "bg-[radial-gradient(circle_at_18%_8%,rgba(125,211,252,0.25),transparent_35%),linear-gradient(135deg,rgba(8,27,45,0.96),rgba(12,74,110,0.66))]",
};

const SHAPES: Record<Shape, string> = {
  feature: "col-span-2 min-h-[134px] rounded-[1.35rem] border px-3.5 py-3.5 shadow-xl ring-1",
  square: "col-span-1 min-h-[122px] rounded-[1.15rem] border px-3 py-3 shadow-lg ring-1",
  line: "col-span-2 min-h-[74px] rounded-none border-x-0 border-t border-b px-3 py-2.5 ring-0 shadow-none",
};

const ROUTE_BREAK_DEPTHS: Record<FoodTargetRouteBreak["depth"], string> = {
  short: "min-h-[5.5rem]",
  medium: "min-h-[8.5rem]",
  long: "min-h-[12rem]",
};

const FOOD_TARGET_ROUTE_BREAKS: Partial<Record<string, FoodTargetRouteBreak>> = {
  "foodtrio-coffee-iced-vanilla-latte": {
    label: "Espresso bar match",
    note: "The cart item lands on the matching menu card.",
    depth: "medium",
  },
  "foodtrio-coffee-cappuccino": {
    label: "Across to the matcha bar",
    note: "The second drink should visibly land on the matching menu item.",
    depth: "long",
  },
  "foodtrio-fast-spicy-sandwich-meal": {
    label: "Jump to the group-order clutter",
    note: "Meals, sides, drinks, sauces, and mistakes are spread out like a real menu.",
    depth: "medium",
  },
  "foodtrio-fast-original-sandwich-meal": {
    label: "Down to drinks and kids items",
    note: "Required choices should feel like page navigation, not adjacent checklist taps.",
    depth: "long",
  },
  "foodtrio-fast-drinks": {
    label: "Back through the sides lane",
    note: "The wall now gives the pointer room to visibly travel.",
    depth: "medium",
  },
  "foodtrio-casual-herb-salmon": {
    label: "Across the dining menu",
    note: "Entrees, sides, desserts, and drinks are deliberately separated.",
    depth: "long",
  },
  "foodtrio-casual-chicken-madeira": {
    label: "Dessert is not adjacent",
    note: "The demo should show a real restaurant-page jump.",
    depth: "medium",
  },
  "foodtrio-casual-cheesecake": {
    label: "Below the dessert rail",
    note: "Extra page depth prevents the whole flow from feeling staged.",
    depth: "medium",
  },
};

const FOOD_TARGETS: FoodTarget[] = [
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

function targetToneClass(target: FoodTarget) {
  return `${TONES[target.tone]} ${GLOWS[target.tone]}`;
}

function FoodMenuTarget({
  target,
  active,
  dimmed = false,
}: {
  target: FoodTarget;
  active: boolean;
  dimmed?: boolean;
}) {
  const Icon = target.Icon;
  const lineStyle = target.shape === "line";

  return (
    <motion.article
      data-tour-id={target.id}
      data-foodtrio-target={target.id}
      data-smartbar-focus-surface="foodtrio-mobile"
      data-spotlight-mode={target.shape === "line" ? "region" : "card"}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: dimmed ? 0.64 : 1,
        y: 0,
        scale: active ? 1.006 : 1,
      }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={[
        "relative overflow-hidden transition-[filter,opacity,transform] duration-300",
        SHAPES[target.shape],
        targetToneClass(target),
        active ? "z-10 brightness-110" : "",
        dimmed ? "brightness-90 saturate-75" : "",
      ].join(" ")}
    >
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">{target.group}</div>
            <h3 className={lineStyle ? "mt-0.5 text-[13px] font-semibold leading-tight text-white" : "mt-1 text-[15px] font-semibold leading-tight text-white"}>
              {target.title}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <div className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow-sm">{target.price}</div>
          </div>
        </div>

        <p className={lineStyle ? "text-[11px] leading-snug text-white/62" : "text-[12px] leading-snug text-white/68"}>{target.description}</p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/12 bg-white/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/66">
            {target.badge}
          </span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/78">
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function FoodMenuRouteBreak({ routeBreak }: { routeBreak: FoodTargetRouteBreak }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "col-span-2 flex items-center justify-center rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.035] px-4 text-center",
        ROUTE_BREAK_DEPTHS[routeBreak.depth],
      ].join(" ")}
    >
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/56">{routeBreak.label}</div>
        <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-white/22 to-transparent" />
        <p className="mx-auto mt-2 max-w-[18rem] text-[11px] font-semibold leading-relaxed text-white/42">{routeBreak.note}</p>
      </div>
    </div>
  );
}

function scenarioAnchorId(scenarioId: FoodTrioScenarioId) {
  return `foodtrio-scenario-${scenarioId}`;
}

export default function FoodTrioTargetWall({
  activeScenario,
  activeTargetId,
  onScenarioSelect,
  onSamplePrompt,
}: FoodTrioTargetWallProps) {
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-14 px-3 pb-40 pt-4 text-white">
      <header className="rounded-[1.7rem] border border-white/12 bg-slate-950/88 p-4 shadow-2xl shadow-black/30">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">FoodTrio mobile demo</div>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight">Three food orders. One SmartBar.</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-white/64">
          Menu-like targets use tight blocks, split squares, divider rows, and visible prices so spotlighting lands on believable ordering objects.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {FOOD_TRIO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onScenarioSelect?.(scenario.id)}
              className={[
                "rounded-full border px-2 py-1.5 text-[10px] font-semibold transition",
                activeScenario === scenario.id
                  ? "border-cyan-200/70 bg-cyan-200 text-slate-950"
                  : "border-white/12 bg-white/8 text-white/70",
              ].join(" ")}
            >
              {scenario.brand.split(" ")[0]}
            </button>
          ))}
        </div>
      </header>

      {FOOD_TRIO_SCENARIOS.map((scenario) => {
        const targets = FOOD_TARGETS.filter((target) => target.scenarioId === scenario.id);
        const isActiveScenario = activeScenario === scenario.id;

        return (
          <section
            key={scenario.id}
            id={scenarioAnchorId(scenario.id)}
            data-foodtrio-scenario={scenario.id}
            className={[
              "scroll-mt-24 rounded-[2rem] border p-4 shadow-2xl shadow-black/30",
              SECTION_TONES[scenario.id],
              isActiveScenario ? "ring-2 ring-cyan-200/28" : "ring-1 ring-white/5",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3 px-1 pb-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.20em] text-white/48">{scenario.category}</div>
                <h2 className="mt-1 text-[19px] font-semibold leading-tight text-white">{scenario.brand}</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-white/62">{scenario.proof}</p>
              </div>
              <button
                type="button"
                onClick={() => onSamplePrompt?.(scenario.id)}
                className="shrink-0 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/78 shadow-sm"
              >
                Try
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {targets.flatMap((target) => {
                const routeBreak = FOOD_TARGET_ROUTE_BREAKS[target.id];

                return [
                  <FoodMenuTarget
                    key={target.id}
                    target={target}
                    active={activeTargetId === target.id}
                    dimmed={Boolean(activeTargetId && isActiveScenario && activeTargetId !== target.id)}
                  />,
                  routeBreak ? (
                    <FoodMenuRouteBreak
                      key={`${target.id}-route-break`}
                      routeBreak={routeBreak}
                    />
                  ) : null,
                ];
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
