type FoodTrioMenuItem = {
  id: string;
  title: string;
  description: string;
  price?: string;
  badge?: string;
  lane?: "left" | "midLeft" | "deepLeft";
  gapBefore?: "none" | "short" | "medium" | "long" | "cinematic";
};

type FoodTrioSection = {
  id: string;
  eyebrow: string;
  title: string;
  proof: string;
  tone: string;
  items: FoodTrioMenuItem[];
};

const FOOD_TRIO_SECTIONS: FoodTrioSection[] = [
  {
    id: "coffee",
    eyebrow: "Coffee shop ordering",
    title: "Beanstack Coffee",
    proof: "Coffee proves SmartBar captures dense drink detail on the first pass.",
    tone: "from-amber-950 via-stone-950 to-slate-950",
    items: [
      {
        id: "foodtrio-coffee-cappuccino",
        title: "Matcha Latte",
        description: "Almond milk, no foam, light ice. Captured details are already on the item.",
        price: "$6.95",
        badge: "detail",
        lane: "deepLeft",
        gapBefore: "none",
      },
      {
        id: "foodtrio-coffee-iced-vanilla-latte",
        title: "Iced Vanilla Latte",
        description: "Oat milk, half sweet, light ice, extra shot. A long jump up proves first-pass detail capture.",
        price: "$7.25",
        badge: "review",
        lane: "left",
        gapBefore: "cinematic",
      },
      {
        id: "foodtrio-coffee-cold-brew",
        title: "Cold Brew",
        description: "Black with vanilla cold foam. Optional extras remain one tap away.",
        price: "$6.25",
        badge: "optional",
        lane: "deepLeft",
        gapBefore: "long",
      },
    ],
  },
  {
    id: "fast-food",
    eyebrow: "Fast food ordering",
    title: "Cluck & Fry",
    proof: "Messy shorthand becomes a mostly-ready green cart.",
    tone: "from-orange-950 via-red-950 to-slate-950",
    items: [
      {
        id: "foodtrio-fast-spicy-sandwich-meal",
        title: "Spicy Chicken Sandwich Meal",
        description: "Parsed from “1 spicy” with medium fries and Diet Coke.",
        price: "$10.99",
        badge: "green",
        lane: "left",
        gapBefore: "short",
      },
      {
        id: "foodtrio-fast-original-sandwich-meal",
        title: "Mild Chicken Sandwich Meal",
        description: "The second chicken meal stays ready with the same Diet Coke default.",
        price: "$10.49",
        badge: "green",
        lane: "midLeft",
        gapBefore: "medium",
      },
      {
        id: "foodtrio-fast-nuggets",
        title: "Kids Nuggets",
        description: "Six-count nuggets with BBQ sauce captured from shorthand.",
        price: "$5.99",
        badge: "green",
        lane: "left",
        gapBefore: "short",
      },
      {
        id: "foodtrio-fast-sauces",
        title: "Sauce bundle",
        description: "Optional extras stay surfaced without blocking checkout.",
        price: "$0.00",
        badge: "yellow",
        lane: "deepLeft",
        gapBefore: "cinematic",
      },
      {
        id: "foodtrio-fast-crispy-wrap",
        title: "Crispy Chicken Wrap",
        description: "The retry match for “crunch wrap.” Gray becomes a clean matched line.",
        price: "$8.99",
        badge: "retry",
        lane: "left",
        gapBefore: "long",
      },
    ],
  },
  {
    id: "casual-dining",
    eyebrow: "Casual dining ordering",
    title: "Tablehouse Grill",
    proof: "Full-service ordering shows required choices, green edits, and captured extras.",
    tone: "from-rose-950 via-fuchsia-950 to-slate-950",
    items: [
      {
        id: "foodtrio-casual-avocado-rolls",
        title: "Avocado Eggrolls",
        description: "Share plate with tamarind-cashew dipping sauce.",
        price: "$14.95",
        badge: "starter",
        lane: "left",
        gapBefore: "short",
      },
      {
        id: "foodtrio-casual-dinner-salad",
        title: "2 × Dinner Salads",
        description: "One ranch, one vinaigrette. Same product, different dressings.",
        price: "$17.90",
        badge: "ready",
        lane: "deepLeft",
        gapBefore: "medium",
      },
      {
        id: "foodtrio-casual-chicken-madeira",
        title: "Chicken Madeira",
        description: "Mashed potatoes were captured, but green items can still be changed.",
        price: "$24.95",
        badge: "green edit",
        lane: "deepLeft",
        gapBefore: "long",
      },
      {
        id: "foodtrio-casual-herb-salmon",
        title: "Herb-Crusted Salmon",
        description: "The entree is recognized, but the required side still needs one choice.",
        price: "$27.95",
        badge: "red",
        lane: "left",
        gapBefore: "cinematic",
      },
      {
        id: "foodtrio-casual-cheesecake",
        title: "Original Cheesecake",
        description: "Whipped cream and extra whipped cream are already captured.",
        price: "$10.50",
        badge: "yellow review",
        lane: "deepLeft",
        gapBefore: "cinematic",
      },
    ],
  },
];

function foodTrioLaneClass(lane: FoodTrioMenuItem["lane"]) {
  // FOODTRIO_TARGET_WALL_LEFT_SAFE_V1:
  // Keep every target out of the right-side SmartBar shell zone.
  // Travel still varies horizontally, but only inside the left-safe corridor.
  if (lane === "deepLeft") return "ml-32 mr-auto";
  if (lane === "midLeft") return "ml-14 mr-auto";
  return "ml-0 mr-auto";
}

function foodTrioGapClass(gap: FoodTrioMenuItem["gapBefore"]) {
  if (gap === "cinematic") return "mt-32";
  if (gap === "long") return "mt-24";
  if (gap === "medium") return "mt-16";
  if (gap === "short") return "mt-8";
  return "mt-0";
}

function FoodTrioMenuCard({ item, index }: { item: FoodTrioMenuItem; index: number }) {
  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      data-foodtrio-geography="left-safe-staggered"
      className={`relative min-h-[158px] w-full max-w-[460px] overflow-hidden rounded-[1.35rem] border border-white/14 bg-white/[0.075] p-4 shadow-xl shadow-black/24 ring-1 ring-white/8 backdrop-blur-xl ${foodTrioLaneClass(item.lane)}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/44">{item.badge}</div>
            <h3 className="mt-1 text-lg font-black tracking-tight text-white">{item.title}</h3>
          </div>
          {item.price ? <div className="rounded-full border border-white/14 bg-white/10 px-2.5 py-1 text-sm font-black text-white/84">{item.price}</div> : null}
        </div>
        <p className="mt-3 text-sm font-medium leading-6 text-white/66">{item.description}</p>
        <div className="mt-auto pt-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/28">Target {index + 1}</div>
      </div>
    </article>
  );
}

export default function FoodTrioDesktopTargetWall() {
  return (
    <div className="space-y-10 pb-24">
      {/* FOODTRIO_TARGET_WALL_GEOGRAPHY_V1:
          The desktop FoodTrio wall is intentionally staggered, not a compact grid.
          This gives spotlight navigation visible travel: up, down, short hops, and long jumps.

          FOODTRIO_TARGET_WALL_LEFT_SAFE_V1:
          No cards are placed on the right side because the fixed SmartBar shell lives there. */}
      <section
        id="foodtrio-desktop-hero"
        data-tour-id="foodtrio-desktop-hero"
        data-smartbar-focus-surface="speed-demo"
        data-spotlight-mode="region"
        className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-7 shadow-2xl shadow-slate-950/10 ring-1 ring-white/70"
      >
        <div className="max-w-3xl">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-sky-700">FoodTrio Desktop</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Three food orders. One SmartBar.</h1>
          <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
            Coffee proves detail capture. Fast food proves ready-cart speed. Casual dining proves required choices and editability.
          </p>
        </div>
      </section>

      {FOOD_TRIO_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={`foodtrio-section-${section.id}`}
          data-tour-id={`foodtrio-section-${section.id}`}
          data-smartbar-focus-surface="speed-demo"
          data-spotlight-mode="region"
          className={`scroll-mt-28 overflow-hidden rounded-[2rem] border border-white/14 bg-gradient-to-br ${section.tone} p-5 shadow-2xl shadow-slate-950/20 ring-1 ring-white/8`}
        >
          <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/48">{section.eyebrow}</div>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-white">{section.title}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/62">{section.proof}</p>
            </div>
          </header>

          <div className="relative min-h-[980px] px-1 pb-6">
            <div className="pointer-events-none absolute left-[18rem] top-2 h-[calc(100%-1rem)] w-px bg-white/10" />
            {section.items.map((item, index) => (
              <div key={item.id} className={foodTrioGapClass(index === 0 ? "none" : item.gapBefore)}>
                <FoodTrioMenuCard item={item} index={index} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
