import { Coffee, Flame, ShoppingCart, Sparkles, Utensils } from "lucide-react";

const FOOD_TRIO_DESKTOP_SCENARIOS = [
  {
    id: "food-trio-fast-food",
    eyebrow: "Fast food",
    title: "Speed",
    proof: "Big messy order in. Clean cart out.",
    prompt: "Two cheeseburger meals, large fries, Diet Cokes, apple pie, no onions on one burger.",
    bullets: ["Combo meals", "Size choices", "Item edits", "Checkout-ready"],
    Icon: Flame,
    tone: "from-orange-100 via-amber-50 to-white",
    badge: "Speed",
  },
  {
    id: "food-trio-coffee",
    eyebrow: "Coffee",
    title: "Detail",
    proof: "Small order. Many modifiers. Nothing gets lost.",
    prompt: "Iced vanilla latte, oat milk, half sweet, extra shot, light ice, no whip.",
    bullets: ["Milk swap", "Sweetness", "Extra shot", "Prep details"],
    Icon: Coffee,
    tone: "from-sky-100 via-cyan-50 to-white",
    badge: "Detail",
  },
  {
    id: "food-trio-casual-dining",
    eyebrow: "Casual dining",
    title: "Range",
    proof: "Apps, entrees, sides, dessert, drinks - organized cleanly.",
    prompt: "Spinach dip, salmon with asparagus, burger with fries, kids pasta, cheesecake, and two iced teas.",
    bullets: ["Courses", "Sides", "Kids meal", "Dessert and drinks"],
    Icon: Utensils,
    tone: "from-emerald-100 via-teal-50 to-white",
    badge: "Range",
  },
];

function FoodTrioScenarioRow({
  scenario,
  index,
}: {
  scenario: (typeof FOOD_TRIO_DESKTOP_SCENARIOS)[number];
  index: number;
}) {
  const Icon = scenario.Icon;

  return (
    <section
      id={scenario.id}
      data-tour-id={scenario.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      className="scroll-mt-28"
    >
      <div className={`relative overflow-hidden rounded-[34px] border border-white/80 bg-gradient-to-br ${scenario.tone} p-6 shadow-2xl shadow-slate-950/10 ring-1 ring-white/80`}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="flex min-h-[360px] flex-col justify-between rounded-[28px] border border-white/80 bg-white/84 p-6 shadow-xl shadow-slate-950/8 backdrop-blur">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    {scenario.eyebrow}
                  </p>
                  <h2 className="mt-2 text-5xl font-black tracking-[-0.06em] text-slate-950">
                    {scenario.title}
                  </h2>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-xl">
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Customer says
                </p>
                <p className="mt-3 text-2xl font-semibold leading-snug tracking-[-0.03em] text-slate-950">
                  "{scenario.prompt}"
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                SmartBar result
              </p>
              <p className="mt-3 text-2xl font-black leading-snug tracking-[-0.035em] text-emerald-950">
                {scenario.proof}
              </p>
            </div>
          </div>

          <aside className="grid content-between gap-4">
            <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-xl shadow-slate-950/8">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                  0{index + 1}
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 ring-1 ring-slate-200">
                  {scenario.badge}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {scenario.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700"
                  >
                    {bullet}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan-200 bg-cyan-50 p-5 shadow-xl shadow-slate-950/8">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-cyan-700" />
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-800">
                  Plain English to cart
                </p>
              </div>
              <p className="mt-4 text-lg font-semibold leading-7 text-slate-800">
                SmartBar reads the order, preserves the details, flags what is missing, and moves the customer toward checkout.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default function FoodTrioDesktopTargetWall() {
  return (
    <div className="min-h-[3600px] space-y-24">
      <section
        id="food-trio-desktop-hero"
        data-tour-id="food-trio-desktop-hero"
        data-smartbar-focus-surface="speed-demo"
        data-spotlight-mode="region"
        className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.34),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.24),transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">
              FoodTrio Desktop Demo
            </p>
            <h1 className="mt-4 max-w-4xl text-6xl font-black leading-[0.92] tracking-[-0.07em]">
              Three orders. One SmartBar.
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-medium leading-8 text-white/72">
              Fast food proves speed. Coffee proves detail. Casual dining proves range.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <ShoppingCart className="mb-5 h-8 w-8 text-cyan-200" />
            <p className="text-4xl font-black leading-tight tracking-[-0.05em]">
              Words in.<br />
              Cart out.<br />
              Missing details,<br />
              simple taps.
            </p>
          </div>
        </div>
      </section>

      {FOOD_TRIO_DESKTOP_SCENARIOS.map((scenario, index) => (
        <FoodTrioScenarioRow key={scenario.id} scenario={scenario} index={index} />
      ))}
    </div>
  );
}
