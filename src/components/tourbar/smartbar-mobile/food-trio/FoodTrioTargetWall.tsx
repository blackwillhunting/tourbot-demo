
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
  IceCreamBowl,
  Milk,
  Sandwich,
  Soup,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { FOOD_TRIO_SCENARIOS, type FoodTrioScenarioId } from "./foodTrioScript";

type Tone = "espresso" | "ember" | "burgundy" | "slate" | "olive" | "blue";
type Shape = "hero" | "wide" | "tall" | "small" | "strip";

type FoodTarget = {
  id: string;
  scenarioId: FoodTrioScenarioId;
  eyebrow: string;
  title: string;
  body: string;
  badge: string;
  Icon: LucideIcon;
  tone: Tone;
  shape: Shape;
};

type FoodTrioTargetWallProps = {
  activeScenario: FoodTrioScenarioId;
  activeTargetId?: string | null;
  onScenarioSelect?: (scenarioId: FoodTrioScenarioId) => void;
  onSamplePrompt?: (scenarioId: FoodTrioScenarioId) => void;
};

const TONES: Record<Tone, string> = {
  espresso: "border-amber-200/28 bg-[#21140e] text-amber-50 shadow-black/24 ring-amber-200/14",
  ember: "border-orange-300/30 bg-[#2a120b] text-orange-50 shadow-black/24 ring-orange-300/14",
  burgundy: "border-rose-200/28 bg-[#260d18] text-rose-50 shadow-black/24 ring-rose-200/14",
  slate: "border-slate-300/24 bg-slate-950 text-slate-50 shadow-black/24 ring-slate-300/12",
  olive: "border-lime-200/24 bg-[#142013] text-lime-50 shadow-black/24 ring-lime-200/12",
  blue: "border-sky-200/24 bg-[#081b2d] text-sky-50 shadow-black/24 ring-sky-200/12",
};

const GLOWS: Record<Tone, string> = {
  espresso: "bg-[radial-gradient(circle_at_20%_8%,rgba(245,158,11,0.34),transparent_34%),linear-gradient(135deg,rgba(32,18,9,0.96),rgba(67,35,16,0.82))]",
  ember: "bg-[radial-gradient(circle_at_18%_8%,rgba(249,115,22,0.36),transparent_34%),linear-gradient(135deg,rgba(45,16,8,0.96),rgba(127,29,29,0.78))]",
  burgundy: "bg-[radial-gradient(circle_at_18%_8%,rgba(251,113,133,0.30),transparent_34%),linear-gradient(135deg,rgba(45,12,27,0.96),rgba(88,28,55,0.78))]",
  slate: "bg-[radial-gradient(circle_at_18%_8%,rgba(148,163,184,0.28),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(30,41,59,0.82))]",
  olive: "bg-[radial-gradient(circle_at_18%_8%,rgba(190,242,100,0.25),transparent_34%),linear-gradient(135deg,rgba(20,32,19,0.96),rgba(63,98,18,0.62))]",
  blue: "bg-[radial-gradient(circle_at_18%_8%,rgba(125,211,252,0.28),transparent_34%),linear-gradient(135deg,rgba(8,27,45,0.96),rgba(12,74,110,0.66))]",
};

const SHAPES: Record<Shape, string> = {
  hero: "min-h-[154px] md:col-span-6 xl:col-span-7",
  wide: "min-h-[118px] md:col-span-4 xl:col-span-6",
  tall: "min-h-[160px] md:col-span-3 xl:col-span-4 md:row-span-2",
  small: "min-h-[94px] md:col-span-2 xl:col-span-3",
  strip: "min-h-[78px] md:col-span-6 xl:col-span-8",
};

const SCENARIO_TONES: Record<FoodTrioScenarioId, string> = {
  coffee: "border-amber-200/20 bg-[radial-gradient(circle_at_18%_0%,rgba(245,158,11,0.20),transparent_38%),linear-gradient(180deg,rgba(30,18,12,0.96),rgba(9,12,18,0.92))]",
  "fast-food": "border-orange-300/20 bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.22),transparent_38%),linear-gradient(180deg,rgba(42,15,9,0.96),rgba(9,12,18,0.92))]",
  "casual-dining": "border-rose-200/20 bg-[radial-gradient(circle_at_18%_0%,rgba(251,113,133,0.20),transparent_38%),linear-gradient(180deg,rgba(39,12,24,0.96),rgba(9,12,18,0.92))]",
};

const TARGETS: FoodTarget[] = [
  {
    id: "foodtrio-coffee-espresso",
    scenarioId: "coffee",
    eyebrow: "Drink builder",
    title: "Espresso base",
    body: "Half-caf, decaf, shots, temperature, and size stay attached to the right drink.",
    badge: "Shots",
    Icon: Coffee,
    tone: "espresso",
    shape: "hero",
  },
  {
    id: "foodtrio-coffee-milk",
    scenarioId: "coffee",
    eyebrow: "Modifier lane",
    title: "Milk + syrup stack",
    body: "Oat milk, almond milk, vanilla, light ice, and extra-hot notes are easy to miss manually.",
    badge: "Modifiers",
    Icon: Milk,
    tone: "blue",
    shape: "wide",
  },
  {
    id: "foodtrio-coffee-food",
    scenarioId: "coffee",
    eyebrow: "Food add-on",
    title: "Sandwich case",
    body: "Food items can carry prep instructions alongside drink modifiers.",
    badge: "Warm",
    Icon: Sandwich,
    tone: "olive",
    shape: "tall",
  },
  {
    id: "foodtrio-coffee-checkout",
    scenarioId: "coffee",
    eyebrow: "Pickup",
    title: "Timing + rewards",
    body: "SmartBar keeps ordering details separate from pickup and loyalty choices.",
    badge: "ASAP",
    Icon: BadgeCheck,
    tone: "slate",
    shape: "small",
  },
  {
    id: "foodtrio-fast-combos",
    scenarioId: "fast-food",
    eyebrow: "Combo board",
    title: "Meal bundles",
    body: "Repeated combo meals are structured without forcing the visitor through item-by-item menus.",
    badge: "Combos",
    Icon: Utensils,
    tone: "ember",
    shape: "hero",
  },
  {
    id: "foodtrio-fast-spicy",
    scenarioId: "fast-food",
    eyebrow: "Variant",
    title: "Spicy sandwiches",
    body: "Similar items with different setups stay separate in the cart.",
    badge: "Spicy",
    Icon: Flame,
    tone: "burgundy",
    shape: "wide",
  },
  {
    id: "foodtrio-fast-grilled",
    scenarioId: "fast-food",
    eyebrow: "Variant",
    title: "Grilled lane",
    body: "One healthier variant can coexist with the fried combo rush.",
    badge: "Grilled",
    Icon: ChefHat,
    tone: "olive",
    shape: "small",
  },
  {
    id: "foodtrio-fast-nuggets",
    scenarioId: "fast-food",
    eyebrow: "Box item",
    title: "Nuggets",
    body: "Box counts, sides, and sauces become reviewable lines.",
    badge: "12 ct",
    Icon: Beef,
    tone: "slate",
    shape: "small",
  },
  {
    id: "foodtrio-fast-sides",
    scenarioId: "fast-food",
    eyebrow: "Sides",
    title: "Fries + extras",
    body: "Large orders prove volume. The cart should eventually scroll on purpose.",
    badge: "Volume",
    Icon: Sparkles,
    tone: "blue",
    shape: "wide",
  },
  {
    id: "foodtrio-fast-sauces",
    scenarioId: "fast-food",
    eyebrow: "Small choices",
    title: "Sauce matrix",
    body: "Tiny choices are where phone ordering becomes whack-a-mole.",
    badge: "Sauces",
    Icon: CupSoda,
    tone: "espresso",
    shape: "tall",
  },
  {
    id: "foodtrio-fast-drinks",
    scenarioId: "fast-food",
    eyebrow: "Drinks",
    title: "Lemonade + tea",
    body: "Drink sets stay attached to the right meal or group.",
    badge: "Drinks",
    Icon: GlassWater,
    tone: "blue",
    shape: "small",
  },
  {
    id: "foodtrio-fast-treats",
    scenarioId: "fast-food",
    eyebrow: "Treat",
    title: "Cookie add-on",
    body: "Small impulse items should not derail checkout.",
    badge: "Add",
    Icon: CakeSlice,
    tone: "burgundy",
    shape: "small",
  },
  {
    id: "foodtrio-casual-apps",
    scenarioId: "casual-dining",
    eyebrow: "Starters",
    title: "Apps for the table",
    body: "Casual dining proves breadth: starters, shared plates, and prep notes.",
    badge: "Apps",
    Icon: Utensils,
    tone: "burgundy",
    shape: "hero",
  },
  {
    id: "foodtrio-casual-salads",
    scenarioId: "casual-dining",
    eyebrow: "Salads",
    title: "Dressings + sides",
    body: "Small salad choices often get buried in full dinner orders.",
    badge: "Dressings",
    Icon: Sparkles,
    tone: "olive",
    shape: "wide",
  },
  {
    id: "foodtrio-casual-soup",
    scenarioId: "casual-dining",
    eyebrow: "Soup",
    title: "Course timing",
    body: "Soup-before-entree is a simple detail that matters to diners.",
    badge: "Course",
    Icon: Soup,
    tone: "espresso",
    shape: "small",
  },
  {
    id: "foodtrio-casual-entrees",
    scenarioId: "casual-dining",
    eyebrow: "Entrees",
    title: "Sides + sauces",
    body: "Entrees carry side choices, sauce notes, doneness, substitutions, and sequencing.",
    badge: "Entrees",
    Icon: ChefHat,
    tone: "blue",
    shape: "tall",
  },
  {
    id: "foodtrio-casual-kids",
    scenarioId: "casual-dining",
    eyebrow: "Kids",
    title: "Kids pasta",
    body: "A missing pasta shape should become one simple tap, not a form hunt.",
    badge: "Choice",
    Icon: Sandwich,
    tone: "slate",
    shape: "wide",
  },
  {
    id: "foodtrio-casual-dessert",
    scenarioId: "casual-dining",
    eyebrow: "Dessert",
    title: "Cheesecake",
    body: "Dessert and side notes remain part of the same order.",
    badge: "Dessert",
    Icon: CakeSlice,
    tone: "burgundy",
    shape: "small",
  },
  {
    id: "foodtrio-casual-drinks",
    scenarioId: "casual-dining",
    eyebrow: "Drinks",
    title: "Mocktails",
    body: "Beverage variants and garnish notes are preserved.",
    badge: "Drinks",
    Icon: IceCreamBowl,
    tone: "blue",
    shape: "small",
  },
];

function FoodTargetCard({ target, active }: { target: FoodTarget; active: boolean }) {
  const Icon = target.Icon;
  return (
    <motion.article
      id={target.id}
      data-tour-id={target.id}
      data-foodtrio-target={target.id}
      layout
      initial={false}
      animate={active ? { scale: 1.018, y: -3 } : { scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 440, damping: 34 }}
      className={[
        "relative overflow-hidden rounded-[24px] border p-4 shadow-xl ring-1",
        "scroll-mt-24",
        TONES[target.tone],
        SHAPES[target.shape],
        active ? "z-20 border-white/75 ring-4 ring-white/35" : "",
      ].join(" ")}
    >
      <div className={["absolute inset-0 opacity-95", GLOWS[target.tone]].join(" ")} />
      <div className="absolute inset-x-3 top-3 h-16 rounded-full bg-white/8 blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/58">{target.eyebrow}</div>
            <h3 className="mt-2 text-lg font-black leading-tight tracking-tight text-white">{target.title}</h3>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm font-semibold leading-5 text-white/72">{target.body}</p>
        <div className="inline-flex w-fit rounded-full bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-950">
          {target.badge}
        </div>
      </div>
    </motion.article>
  );
}

export default function FoodTrioTargetWall({
  activeScenario,
  activeTargetId,
  onScenarioSelect,
  onSamplePrompt,
}: FoodTrioTargetWallProps) {
  const scenario = FOOD_TRIO_SCENARIOS.find((item) => item.id === activeScenario) || FOOD_TRIO_SCENARIOS[0];

  return (
    <div
      data-foodtrio-target-wall="true"
      className="relative z-10 mx-auto max-w-7xl px-3 pb-52 pt-4 sm:px-6 sm:pb-60 sm:pt-8"
    >
      <div className="mb-4 rounded-[28px] border border-slate-600/36 bg-slate-950/92 p-4 text-white shadow-2xl shadow-black/30 ring-1 ring-white/10">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200/80">FoodTrio mobile demo</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Three food ordering proofs</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-200/78">
          Coffee proves detail. Fast food proves speed and volume. Casual dining proves range.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {FOOD_TRIO_SCENARIOS.map((item) => {
            const selected = item.id === activeScenario;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onScenarioSelect?.(item.id)}
                className={[
                  "rounded-2xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-white/50 bg-white text-slate-950"
                    : "border-white/12 bg-white/7 text-white hover:bg-white/12",
                ].join(" ")}
              >
                <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{item.category}</div>
                <div className="mt-1 text-sm font-black">{item.brand}</div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onSamplePrompt?.(activeScenario)}
          className="mt-4 w-full rounded-full border border-cyan-200/34 bg-cyan-300/16 px-4 py-3 text-sm font-black text-cyan-50 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-200/10"
        >
          Type sample order for {scenario.brand}
        </button>
      </div>

      <div className="space-y-5">
        {FOOD_TRIO_SCENARIOS.map((item) => {
          const selected = item.id === activeScenario;
          const targets = TARGETS.filter((target) => target.scenarioId === item.id);

          return (
            <motion.section
              key={item.id}
              id={`foodtrio-section-${item.id}`}
              data-foodtrio-scenario={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className={[
                "scroll-mt-20 rounded-[30px] border p-3 shadow-2xl shadow-black/24 ring-1 ring-white/8 sm:p-4",
                SCENARIO_TONES[item.id],
                selected ? "border-white/35" : "",
              ].join(" ")}
            >
              <div className="mb-3 flex items-start justify-between gap-3 px-1 py-1">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">{item.category}</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{item.brand}</h2>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-white/66">{item.proof}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSamplePrompt?.(item.id)}
                  className="shrink-0 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/82"
                >
                  Type
                </button>
              </div>

              <div className="grid auto-rows-[minmax(76px,auto)] gap-3 md:grid-cols-6 xl:grid-cols-12">
                {targets.map((target) => (
                  <FoodTargetCard key={target.id} target={target} active={activeTargetId === target.id} />
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
