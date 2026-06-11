type FoodTrioMenuItem = {
  id: string;
  title: string;
  description: string;
  price?: string;
  badge?: string;
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
    proof: "A few drinks can hide a lot of tiny modifiers.",
    tone: "from-amber-950 via-stone-950 to-slate-950",
    items: [
      {
        id: "foodtrio-coffee-iced-vanilla-latte",
        title: "Iced Vanilla Latte",
        description: "Oat milk, half sweet, light ice, extra shot. Modifier stack stays visible.",
        price: "$7.25",
        badge: "detail",
      },
      {
        id: "foodtrio-coffee-cappuccino",
        title: "Matcha Latte",
        description: "Almond milk, no foam, light ice. Easy-to-miss drink notes stay attached.",
        price: "$6.95",
        badge: "options",
      },
      {
        id: "foodtrio-coffee-cold-brew",
        title: "Cold Brew",
        description: "Black with vanilla cold foam. Small modifiers are still reviewable.",
        price: "$6.25",
        badge: "ready",
      },
    ],
  },
  {
    id: "fast-food",
    eyebrow: "Fast food ordering",
    title: "Cluck & Fry",
    proof: "A reckless group order becomes sortable by ready, required, optional, and unmatched items.",
    tone: "from-orange-950 via-red-950 to-slate-950",
    items: [
      {
        id: "foodtrio-fast-spicy-sandwich-meal",
        title: "Spicy Chicken Sandwich Meals",
        description: "Two spicy meals with fries and drinks. Ready lines should not slow down the cart.",
        price: "$22.98",
        badge: "ready",
      },
      {
        id: "foodtrio-fast-original-sandwich-meal",
        title: "Regular Chicken Sandwich Meal",
        description: "No pickles captured, but side and drink still need one tap.",
        price: "$10.99",
        badge: "required",
      },
      {
        id: "foodtrio-fast-nuggets",
        title: "Kids Nuggets",
        description: "BBQ sauce captured; count still required.",
        price: "$6.95",
        badge: "required",
      },
      {
        id: "foodtrio-fast-waffle-fries",
        title: "Large Fries",
        description: "Group fries with optional salt, crispness, cheese, and ketchup choices.",
        price: "$7.50",
        badge: "options",
      },
      {
        id: "foodtrio-fast-sauces",
        title: "Sauce bundle",
        description: "Free but important. Tiny sauce choices stay surfaced.",
        price: "$0.00",
        badge: "options",
      },
      {
        id: "foodtrio-fast-drinks",
        title: "3 × Dr Pepper",
        description: "Quantity is clear, size still needs a quick selection.",
        price: "$8.70",
        badge: "required",
      },
    ],
  },
  {
    id: "casual-dining",
    eyebrow: "Casual dining ordering",
    title: "Tablehouse Grill",
    proof: "Full-service menus mix appetizers, entrees, sides, desserts, and edits.",
    tone: "from-rose-950 via-fuchsia-950 to-slate-950",
    items: [
      {
        id: "foodtrio-casual-avocado-rolls",
        title: "Avocado Eggrolls",
        description: "Share plate with tamarind-cashew dipping sauce.",
        price: "$14.95",
        badge: "starter",
      },
      {
        id: "foodtrio-casual-dinner-salad",
        title: "2 × Dinner Salads",
        description: "One ranch, one vinaigrette. Same product, different dressings.",
        price: "$17.90",
        badge: "ready",
      },
      {
        id: "foodtrio-casual-chicken-madeira",
        title: "Chicken Madeira",
        description: "Mashed potatoes and extra mushroom sauce ride with the entree.",
        price: "$24.95",
        badge: "entree",
      },
      {
        id: "foodtrio-casual-herb-salmon",
        title: "Herb-Crusted Salmon",
        description: "The entree is recognized, but the side still needs selection.",
        price: "$27.95",
        badge: "required",
      },
      {
        id: "foodtrio-casual-cheesecake",
        title: "Original Cheesecake",
        description: "Whipped cream captured; extra whipped cream remains available.",
        price: "$10.50",
        badge: "dessert",
      },
    ],
  },
];

function FoodTrioMenuCard({ item }: { item: FoodTrioMenuItem }) {
  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      className="relative min-h-[152px] overflow-hidden rounded-[1.35rem] border border-white/14 bg-white/[0.075] p-4 shadow-xl shadow-black/24 ring-1 ring-white/8 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/44">{item.badge}</div>
            <h3 className="mt-1 text-lg font-black tracking-tight text-white">{item.title}</h3>
          </div>
          {item.price ? <div className="rounded-full border border-white/14 bg-white/10 px-2.5 py-1 text-sm font-black text-white/84">{item.price}</div> : null}
        </div>
        <p className="mt-3 text-sm font-medium leading-6 text-white/66">{item.description}</p>
      </div>
    </article>
  );
}

export default function FoodTrioDesktopTargetWall() {
  return (
    <div className="space-y-8 pb-10">
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
            Coffee proves detail. Fast food proves speed. Casual dining proves range. The same desktop SmartBar turns plain-English food intent into a reviewable cart.
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
          <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/48">{section.eyebrow}</div>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-white">{section.title}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/62">{section.proof}</p>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => <FoodTrioMenuCard key={item.id} item={item} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
