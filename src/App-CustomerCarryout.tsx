import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Coffee,
  MapPin,
  Menu,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";
import TourBarOrdering, { type TourBarOrderingFocusTarget } from "./components/tourbar/TourBarOrdering";

type MenuTab =
  | "featured"
  | "appetizers"
  | "burgers"
  | "chicken"
  | "nuggets"
  | "sides"
  | "drinks"
  | "desserts";

type Offer = {
  id: string;
  title: string;
  price: string;
  description: string;
  chips?: string[];
  badge?: string;
  section?: string;
};

type Combo = Offer & {
  includes: string[];
};

const RESTAURANT_NAME = "Grand Cheesecake Kitchen";
const RESTAURANT_TAGLINE = "A big-menu dining site built for realistic TourBot ordering";

const menuTabs: { id: MenuTab; label: string; targetId: string }[] = [
  { id: "featured", label: "Featured", targetId: "section-combos" },
  { id: "appetizers", label: "Small Plates", targetId: "qualifier-completion-panel" },
  { id: "burgers", label: "Burgers", targetId: "section-burgers" },
  { id: "chicken", label: "Chicken", targetId: "section-chicken" },
  { id: "nuggets", label: "Bites", targetId: "section-nuggets" },
  { id: "sides", label: "Sides", targetId: "section-sides" },
  { id: "drinks", label: "Drinks", targetId: "section-drinks" },
  { id: "desserts", label: "Desserts", targetId: "section-desserts" },
];

const combos: Combo[] = [
  {
    id: "combo-double-stack",
    title: "Double Stack Cheeseburger Platter",
    price: "$17.95",
    description:
      "A double cheeseburger with fries or green salad and a fountain drink. Built to show how TourBot groups mains, sides, and drinks into a single orderable meal.",
    includes: ["Double cheeseburger", "Side", "Drink"],
    chips: ["Popular", "Side choice", "Drink choice"],
    badge: "Guest favorite",
  },
  {
    id: "combo-classic-burger",
    title: "Classic Burger Lunch Plate",
    price: "$14.95",
    description:
      "A lighter burger plate with a flexible side and drink. This keeps the original carryout target ID while presenting like a real casual-dining menu item.",
    includes: ["Classic burger", "Side", "Drink"],
    chips: ["Value", "Flexible side", "Lunch"],
    badge: "Best value",
  },
  {
    id: "combo-spicy-chicken",
    title: "Spicy Crispy Chicken Plate",
    price: "$16.95",
    description:
      "Crispy spicy chicken sandwich with fries, onion rings, or salad plus a drink. Good for modifier and heat-level demos.",
    includes: ["Spicy chicken", "Side", "Drink"],
    chips: ["Spicy", "Crispy", "Meal deal"],
  },
  {
    id: "combo-nugget-box",
    title: "Crispy Bites Box",
    price: "$13.95",
    description:
      "Crispy chicken bites, sauce, side, and drink. Useful for required count, sauce, and size choices.",
    includes: ["Chicken bites", "Sauce", "Side", "Drink"],
    chips: ["Sauce choice", "Shareable", "Quick order"],
  },
  {
    id: "combo-family-bundle",
    title: "Family Carryout Bundle",
    price: "$42.95",
    description:
      "Two burgers, crispy bites, two sides, and four drinks. A group-order target with multiple repeated items.",
    includes: ["2 burgers", "Bites", "2 sides", "4 drinks"],
    chips: ["Group order", "Multiple drinks", "Shareable"],
  },
  {
    id: "combo-kids-meal",
    title: "Little Guest Meal",
    price: "$8.95",
    description:
      "Small burger or chicken bites with a simple side and drink. Simple choices without overwhelming the visitor.",
    includes: ["Main", "Side", "Drink"],
    chips: ["Small portions", "Choice-based", "Simple"],
  },
];

const burgers: Offer[] = [
  {
    id: "item-classic-burger",
    title: "Old Fashioned Burger",
    price: "$13.95",
    description: "Certified beef, pickles, onion, lettuce, tomato, and house sauce on a toasted brioche bun.",
    chips: ["No onions", "No pickles", "Add cheese"],
  },
  {
    id: "item-cheeseburger",
    title: "Classic Cheeseburger",
    price: "$14.95",
    description: "A traditional cheeseburger with American cheese and a clean modifier path for common requests.",
    chips: ["Cheese", "No onions", "Extra sauce"],
    badge: "Common ask",
  },
  {
    id: "item-double-cheeseburger",
    title: "Double Smash Cheeseburger",
    price: "$16.95",
    description: "Two seared patties, melted cheese, pickles, onions, and special sauce.",
    chips: ["Double", "No onions", "Add bacon"],
    badge: "TourBot favorite",
  },
  {
    id: "item-bacon-burger",
    title: "Bacon-Bistro Burger",
    price: "$17.95",
    description: "Bacon, cheese, lettuce, tomato, and house sauce. A premium burger with easy upgrades.",
    chips: ["Bacon", "House sauce", "Premium"],
  },
  {
    id: "item-spicy-deluxe-burger",
    title: "Spicy Deluxe Burger",
    price: "$16.50",
    description: "Pepper jack, jalapeños, lettuce, tomato, and spicy sauce.",
    chips: ["Spicy", "Pepper jack", "Jalapeños"],
  },
  {
    id: "item-veggie-burger",
    title: "Veggie Burger",
    price: "$15.50",
    description: "Crispy veggie patty, lettuce, tomato, pickles, onions, and tangy sauce.",
    chips: ["Meatless", "No onions", "Add cheese"],
  },
];

const chickenItems: Offer[] = [
  {
    id: "item-crispy-chicken",
    title: "Crispy Chicken Sandwich",
    price: "$15.95",
    description: "Crispy chicken breast, pickles, lettuce, and mayo on a toasted bun.",
    chips: ["No mayo", "Extra pickles", "Add cheese"],
  },
  {
    id: "item-spicy-chicken",
    title: "Spicy Chicken Sandwich",
    price: "$16.50",
    description: "Crispy chicken with spicy sauce and pickles. Good for heat and sauce preferences.",
    chips: ["Spicy", "Pickles", "Crispy"],
    badge: "Heat pick",
  },
  {
    id: "item-grilled-chicken",
    title: "Grilled Chicken Sandwich",
    price: "$16.95",
    description: "Grilled chicken breast with lettuce, tomato, and herb mayo.",
    chips: ["Grilled", "Lighter", "No mayo"],
  },
];

const sides: Offer[] = [
  {
    id: "side-fries",
    title: "French Fries",
    price: "$5.95+",
    description: "Crisp salted fries. Requires size: small, medium, or large.",
    chips: ["Small", "Medium", "Large"],
    badge: "Requires size",
  },
  {
    id: "side-cheese-fries",
    title: "Loaded Cheese Fries",
    price: "$8.95+",
    description: "Fries with warm cheese sauce. A good premium side with upgrade language.",
    chips: ["Medium", "Large", "Add bacon"],
  },
  {
    id: "side-onion-rings",
    title: "Crispy Onion Rings",
    price: "$7.95+",
    description: "Battered onion rings with dipping sauce and a required size choice.",
    chips: ["Small", "Medium", "Large"],
  },
  {
    id: "side-apple-slices",
    title: "Fresh Apple Slices",
    price: "$3.95",
    description: "A simple lighter side with no required qualifier.",
    chips: ["Kid-friendly", "No size", "Fresh"],
  },
];

const drinks: Offer[] = [
  {
    id: "drink-soda",
    title: "Fountain Soda",
    price: "$3.95+",
    description: "Choose a size and flavor. Coke, Diet Coke, Sprite, or Root Beer.",
    chips: ["Size", "Flavor", "Refillable"],
    badge: "Needs size + flavor",
  },
  {
    id: "drink-lemonade",
    title: "Fresh Lemonade",
    price: "$4.95+",
    description: "Classic lemonade with small, medium, and large sizes.",
    chips: ["Small", "Medium", "Large"],
  },
  {
    id: "drink-iced-tea",
    title: "Fresh Brewed Iced Tea",
    price: "$4.50+",
    description: "Sweet or unsweetened iced tea with a size choice.",
    chips: ["Sweet", "Unsweet", "Size"],
  },
  {
    id: "drink-water",
    title: "Bottled Water",
    price: "$2.95",
    description: "Simple bottled water. No required qualifier.",
    chips: ["No qualifier", "Bottle", "Simple"],
  },
  {
    id: "drink-milkshake",
    title: "Creamy Milkshake",
    price: "$7.95+",
    description: "Vanilla, chocolate, or strawberry shake.",
    chips: ["Vanilla", "Chocolate", "Strawberry"],
  },
];

const desserts: Offer[] = [
  {
    id: "dessert-cookie",
    title: "Chocolate Chunk Cookie",
    price: "$4.95",
    description: "Warm cookie with chocolate chunks. A simple optional add-on.",
    chips: ["Single", "Easy add-on"],
  },
  {
    id: "dessert-apple-pie",
    title: "Warm Apple Pie",
    price: "$7.95",
    description: "Cinnamon apple filling in a flaky crust. Good for dessert add-on demos.",
    chips: ["Warm", "Classic"],
  },
  {
    id: "dessert-sundae",
    title: "Ice Cream Sundae",
    price: "$8.95",
    description: "Vanilla ice cream with chocolate or caramel topping.",
    chips: ["Chocolate", "Caramel"],
  },
];

function menuTabForTargetId(targetId?: string): MenuTab | undefined {
  const target = targetId || "";
  if (target.includes("combo")) return "featured";
  if (target.includes("burger") || target.includes("modifier-burger")) return "burgers";
  if (target.includes("chicken")) return "chicken";
  if (target.includes("nugget")) return "nuggets";
  if (target.includes("side") || target.includes("fries") || target.includes("onion-ring")) return "sides";
  if (target.includes("drink") || target.includes("soda") || target.includes("tea") || target.includes("milkshake")) return "drinks";
  if (target.includes("dessert") || target.includes("cookie") || target.includes("pie") || target.includes("sundae")) return "desserts";
  return menuTabs.find((tab) => tab.targetId === target)?.id;
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-xl shadow-stone-950/8 ring-1 ring-stone-950/[0.03] ${className}`}>
      {children}
    </div>
  );
}

function Price({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-bold text-white shadow-sm">{children}</span>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-900 ring-1 ring-amber-200">{children}</span>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700">{children}</span>;
}

function AddButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      data-tour-id={`${targetId}-add-button`}
      data-spotlight-mode="control"
      className="inline-flex items-center justify-center rounded-full bg-stone-950 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800"
    >
      <Plus className="mr-1.5 h-3.5 w-3.5" />
      Add
    </button>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">{eyebrow}</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function Header({
  activeTab,
  onTabClick,
  tourBarNode,
}: {
  activeTab: MenuTab;
  onTabClick: (tab: MenuTab) => void;
  tourBarNode?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/92 text-stone-950 shadow-lg shadow-stone-950/5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-white shadow-sm">
            <Menu className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-black tracking-tight text-stone-950">{RESTAURANT_NAME}</div>
            <div className="truncate text-sm text-stone-500">{RESTAURANT_TAGLINE}</div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end">
          <nav data-tour-id="menu-category-tabs" data-spotlight-mode="navigation" className="min-w-0 flex-1 overflow-x-auto rounded-full bg-stone-100 p-1 ring-1 ring-stone-200 lg:flex-none">
            <div className="flex gap-2">
              {menuTabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.targetId}`}
                  data-tour-id={`tab-${tab.id}`}
                  onClick={() => onTabClick(tab.id)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition outline-none focus:outline-none focus-visible:outline-none sm:px-4 ${
                    activeTab === tab.id ? "bg-stone-950 text-white shadow-sm" : "text-stone-700 hover:bg-white"
                  }`}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </nav>

          {tourBarNode && <div className="relative z-[10070] shrink-0">{tourBarNode}</div>}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="carryout-hero"
      data-tour-id="carryout-hero"
      data-spotlight-mode="region"
      className="relative overflow-hidden rounded-[34px] border border-amber-200 bg-[#f8efe1] text-stone-950 shadow-2xl shadow-stone-950/10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.20),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(120,53,15,0.18),_transparent_34%)]" />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-stone-700 ring-1 ring-stone-200">
            <Sparkles className="h-4 w-4" />
            Big-menu carryout demo
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
            A real restaurant menu is messy. TourBot makes it orderable.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
            This stand-in site mimics a large casual-dining restaurant: dense categories, broad food styles,
            required choices, modifiers, desserts, drinks, and a checkout handoff.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#section-combos" className="inline-flex items-center rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5">
              Explore featured plates
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a href="#carryout-flow-panel" className="inline-flex items-center rounded-full bg-white/75 px-5 py-3 text-sm font-black text-stone-950 ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:bg-white">
              How TourBot works
            </a>
          </div>
        </div>

        <div
          id="featured-double-stack-combo"
          data-tour-id="featured-double-stack-combo"
          data-spotlight-mode="card"
          className="rounded-[32px] border border-white/70 bg-white/70 p-5 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-stone-950 text-white shadow-lg shadow-stone-950/20">
              <Star className="h-8 w-8" />
            </div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-900 ring-1 ring-amber-200">Featured plate</div>
          </div>
          <div className="mt-8 text-5xl font-black leading-none tracking-tight">Burger</div>
          <div className="mt-2 text-5xl font-black leading-none tracking-tight text-amber-800">Dinner</div>
          <p className="mt-5 text-sm leading-6 text-stone-700">
            Main, side, and drink choices let TourBot demonstrate bundled ordering without relying on a toy fast-food layout.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-stone-700">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">Main</div>
            <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">Side</div>
            <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">Drink</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QualifierPanel() {
  return (
    <section
      id="qualifier-completion-panel"
      data-tour-id="qualifier-completion-panel"
      data-spotlight-mode="region"
      className="rounded-[30px] border border-stone-200 bg-white p-5 shadow-xl shadow-stone-950/8 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">
            <CheckCircle className="h-4 w-4" />
            Guided order completion
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950">Missing choices become focused chips</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Large restaurant menus are full of qualifier traps: sizes, sauces, side choices, drink flavors, toppings, and dessert options. TourBot keeps the item in the order and asks only for what is missing.
          </p>
        </div>
        <div className="rounded-3xl bg-stone-50 p-4 shadow-sm ring-1 ring-stone-200" data-tour-id="sample-qualifier-chips" data-spotlight-mode="card">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Example chips</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Small", "Medium", "Large"].map((item) => (
              <span key={item} className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ComboCard({ combo, index }: { combo: Combo; index: number }) {
  const featured = index === 0;

  return (
    <article
      id={combo.id}
      data-tour-id={combo.id}
      data-spotlight-mode="card"
      className={`group relative overflow-hidden rounded-[30px] border bg-white shadow-xl shadow-stone-950/8 ring-1 ring-stone-950/[0.03] transition hover:-translate-y-0.5 hover:shadow-2xl ${
        featured ? "border-amber-200 md:col-span-2" : "border-stone-200"
      }`}
    >
      <div className={`grid h-full ${featured ? "md:grid-cols-[0.95fr_1.2fr]" : ""}`}>
        <div className={`${featured ? "min-h-[250px]" : "min-h-[170px]"} bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 p-5 text-white`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Package className="h-6 w-6" />
            </div>
            {combo.badge && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">{combo.badge}</span>}
          </div>
          <div className="mt-8 text-5xl font-black leading-none tracking-tight sm:text-6xl">{featured ? "Plate" : "Meal"}</div>
          <div className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-white/75">Featured carryout</div>
        </div>
        <div className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black tracking-tight text-stone-950">{combo.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{combo.description}</p>
            </div>
            <Price>{combo.price}</Price>
          </div>
          <div className="mt-5 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Includes</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {combo.includes.map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-stone-200">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {combo.chips?.map((chip) => <Chip key={chip}>{chip}</Chip>)}
          </div>
          <div className="mt-auto pt-5">
            <AddButton targetId={combo.id} />
          </div>
        </div>
      </div>
    </article>
  );
}

function MenuRow({ item }: { item: Offer }) {
  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-spotlight-mode="row"
      className="group grid gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-950/6 transition hover:-translate-y-0.5 hover:shadow-xl sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black tracking-tight text-stone-950 sm:text-lg">{item.title}</h3>
          {item.badge && <Badge>{item.badge}</Badge>}
        </div>
        <p className="mt-1.5 text-sm leading-6 text-stone-600">{item.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.chips?.map((chip) => <Chip key={chip}>{chip}</Chip>)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Price>{item.price}</Price>
        <AddButton targetId={item.id} />
      </div>
    </article>
  );
}

function FoodCard({ item, tone = "stone" }: { item: Offer; tone?: "stone" | "amber" | "cream" }) {
  const toneClass =
    tone === "amber"
      ? "from-amber-700 to-amber-500"
      : tone === "cream"
        ? "from-stone-200 to-amber-100 text-stone-950"
        : "from-stone-900 to-stone-700";

  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-spotlight-mode="card"
      className="overflow-hidden rounded-[30px] border border-stone-200 bg-white shadow-xl shadow-stone-950/8 transition hover:-translate-y-0.5 hover:shadow-2xl"
    >
      <div className={`h-28 bg-gradient-to-br ${toneClass} p-4 text-white`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/20">
          <Utensils className="h-6 w-6" />
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-stone-950">{item.title}</h3>
              {item.badge && <Badge>{item.badge}</Badge>}
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
          </div>
          <Price>{item.price}</Price>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.chips?.map((chip) => <Chip key={chip}>{chip}</Chip>)}
        </div>
        <div className="mt-5">
          <AddButton targetId={item.id} />
        </div>
      </div>
    </article>
  );
}

function SmallOfferTile({ item }: { item: Offer }) {
  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-spotlight-mode="card"
      className="rounded-[26px] border border-stone-200 bg-white p-4 shadow-lg shadow-stone-950/6 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 ring-1 ring-amber-200">
          <Utensils className="h-5 w-5" />
        </div>
        <Price>{item.price}</Price>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-black tracking-tight text-stone-950">{item.title}</h3>
        {item.badge && <Badge>{item.badge}</Badge>}
      </div>
      <p className="mt-2 text-sm leading-5 text-stone-600">{item.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.chips?.map((chip) => <Chip key={chip}>{chip}</Chip>)}
      </div>
    </article>
  );
}

function NuggetModule() {
  return (
    <section id="section-nuggets" data-tour-id="section-nuggets" data-spotlight-mode="region" className="scroll-mt-28">
      <SectionHeader
        eyebrow="Bites with choices"
        title="Crispy Bites"
        body="A large restaurant site needs items that require count, sauce, and preference choices. These bites give TourBot a realistic qualifier path."
      />
      <Card>
        <div id="item-nuggets" data-tour-id="item-nuggets" data-spotlight-mode="card" className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-gradient-to-br from-stone-900 to-amber-900 p-6 text-white sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Utensils className="h-7 w-7" />
            </div>
            <div className="mt-7 text-4xl font-black tracking-tight">Crispy Chicken Bites</div>
            <p className="mt-3 text-sm leading-6 text-white/85">Choose 6-piece, 10-piece, or 20-piece. Sauce can be BBQ, Ranch, or Honey Mustard.</p>
          </div>
          <div className="grid gap-5 p-6 sm:p-8 md:grid-cols-2">
            <div id="qualifier-nugget-count" data-tour-id="qualifier-nugget-count" data-spotlight-mode="card" className="rounded-[26px] bg-stone-50 p-5 ring-1 ring-stone-200">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Piece count</div>
              <div className="mt-4 grid gap-2">
                {["6-piece", "10-piece", "20-piece"].map((item) => (
                  <button key={item} type="button" className="rounded-2xl bg-white px-4 py-3 text-left text-sm font-black text-stone-800 shadow-sm ring-1 ring-stone-200">{item}</button>
                ))}
              </div>
            </div>
            <div id="qualifier-nugget-sauce" data-tour-id="qualifier-nugget-sauce" data-spotlight-mode="card" className="rounded-[26px] bg-stone-50 p-5 ring-1 ring-stone-200">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Sauce</div>
              <div className="mt-4 grid gap-2">
                {["BBQ", "Ranch", "Honey Mustard"].map((item) => (
                  <button key={item} type="button" className="rounded-2xl bg-white px-4 py-3 text-left text-sm font-black text-stone-800 shadow-sm ring-1 ring-stone-200">{item}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function DrinksRack() {
  return (
    <section id="section-drinks" data-tour-id="section-drinks" data-spotlight-mode="region" className="scroll-mt-28">
      <SectionHeader
        eyebrow="Beverages"
        title="Drinks"
        body="The drink rack gives TourBot a realistic grouping challenge: sizes, flavors, refills, tea sweetness, and milkshake flavors."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drinks.map((drink) => <SmallOfferTile key={drink.id} item={drink} />)}
        </div>
        <Card>
          <div id="drink-qualifiers" data-tour-id="drink-qualifiers" data-spotlight-mode="card" className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">
              <Coffee className="h-4 w-4" />
              Drink qualifiers
            </div>
            <div id="qualifier-drink-size" data-tour-id="qualifier-drink-size" className="mt-5 rounded-3xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Size</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Small", "Medium", "Large"].map((item) => <Chip key={item}>{item}</Chip>)}
              </div>
            </div>
            <div id="qualifier-drink-flavor" data-tour-id="qualifier-drink-flavor" className="mt-4 rounded-3xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Flavor</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Coke", "Diet Coke", "Sprite", "Root Beer"].map((item) => <Chip key={item}>{item}</Chip>)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function CarryoutExplainerPanel() {
  const steps = [
    { label: "Match", detail: "TourBot maps plain-English requests to visible menu items and real target IDs." },
    { label: "Complete", detail: "Missing sizes, sauces, flavors, toppings, and side choices become focused chips." },
    { label: "Handoff", detail: "The TourBar sheet turns the matched order into a checkout-ready payload." },
  ];

  return (
    <aside id="carryout-flow-panel" className="lg:sticky lg:top-28">
      <Card className="border-amber-200 bg-white">
        <div className="relative overflow-hidden p-5 text-stone-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(180,83,9,0.10),_transparent_42%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">TourBot flow</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">From request to order</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 ring-1 ring-amber-200">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-600">
              The customer site stays visually independent. TourBot uses existing page targets and a single SmartBar focus controller to navigate and clarify.
            </p>

            <div className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <div key={step.label} className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-950 text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-black text-stone-950">{step.label}</div>
                      <div className="mt-0.5 text-xs leading-5 text-stone-600">{step.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-900">
                <ShoppingCart className="h-4 w-4" />
                Checkout lives in TourBar
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                The page looks like a restaurant site. The ordering intelligence stays in the TourBar sheet.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </aside>
  );
}

export default function AppCustomerCarryout() {
  const [activeTab, setActiveTab] = useState<MenuTab>("featured");
  const todaysHighlight = useMemo(() => "Fresh cheesecake slices, lunch plates, crispy bites, burgers, drinks, and family bundles.", []);

  const goToTourBarOrderingFocus = (target: TourBarOrderingFocusTarget) => {
    const tab = menuTabForTargetId(target.targetId);
    if (tab) setActiveTab(tab);
  };

  return (
    <div id="grand-cheesecake-kitchen-app" data-tour-id="grand-cheesecake-kitchen-app" className="min-h-screen bg-[linear-gradient(135deg,_#fff7ed_0%,_#f5efe5_42%,_#e7d7bf_100%)] text-stone-950">
      <Header
        activeTab={activeTab}
        onTabClick={setActiveTab}
        tourBarNode={<TourBarOrdering
            onNavigateToFocus={goToTourBarOrderingFocus}
            siteLabel={`${RESTAURANT_NAME} Carryout`}
            orderTitle={`${RESTAURANT_NAME} order`}
            notOnMenuLabel={`Not on the ${RESTAURANT_NAME} menu`}
            primaryPlaceholder="Tell SmartBar what you want to order..."
            followUpPlaceholder="Add items, pick choices, or say checkout..."
            launcherTitle={`${RESTAURANT_NAME} SmartBar ordering`}
            launcherAriaLabel={`Open ${RESTAURANT_NAME} SmartBar ordering`}
            resultEyebrow="Restaurant order"
            initialLoadingMessage="Building your restaurant draft cart…"
            followUpLoadingMessage="Updating your restaurant order…"
            appearance="light"
            blueGlassSurface
            chromeVariant="blueCoreGlass"
          />}
      />

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:py-8">
        <div className="space-y-8">
          <Hero />

          <section data-tour-id="restaurant-info-strip" data-spotlight-mode="region" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-lg shadow-stone-950/5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-stone-500"><MapPin className="h-4 w-4" /> Pickup</div>
              <div className="mt-2 text-sm font-bold text-stone-950">Downtown demo location</div>
              <div className="mt-1 text-xs leading-5 text-stone-600">Customer-site stand-in with order handoff behavior.</div>
            </div>
            <div className="rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-lg shadow-stone-950/5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-stone-500"><Clock className="h-4 w-4" /> Today</div>
              <div className="mt-2 text-sm font-bold text-stone-950">Open for lunch and dinner</div>
              <div className="mt-1 text-xs leading-5 text-stone-600">{todaysHighlight}</div>
            </div>
            <div className="rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-lg shadow-stone-950/5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-stone-500"><ShoppingCart className="h-4 w-4" /> Order</div>
              <div className="mt-2 text-sm font-bold text-stone-950">Use TourBar for plain English</div>
              <div className="mt-1 text-xs leading-5 text-stone-600">Try: “I want two burgers, fries, sodas, iced tea, and a milkshake.”</div>
            </div>
          </section>

          <QualifierPanel />

          <section id="section-combos" data-tour-id="section-combos" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Featured plates"
              title="Popular Carryout Plates"
              body="Featured plates act like packages: one customer request can become a main, a side, a drink, and required choices."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {combos.map((combo, index) => <ComboCard key={combo.id} combo={combo} index={index} />)}
            </div>
          </section>

          <section id="section-burgers" data-tour-id="section-burgers" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Glamburger-style choices"
              title="Burgers"
              body="A big casual-dining burger section gives TourBot room to handle toppings, removals, substitutions, and plate pairings."
            />
            <div id="modifier-burger-toppings" data-tour-id="modifier-burger-toppings" data-spotlight-mode="card" className="mb-4 rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-lg shadow-stone-950/6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Common burger modifiers</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["No onions", "No pickles", "Extra cheese", "Add bacon", "Extra sauce", "No mayo"].map((item) => <Chip key={item}>{item}</Chip>)}
              </div>
            </div>
            <div className="grid gap-3">
              {burgers.map((item) => <MenuRow key={item.id} item={item} />)}
            </div>
          </section>

          <section id="section-chicken" data-tour-id="section-chicken" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Sandwiches and specialties"
              title="Chicken"
              body="Chicken items broaden the site beyond burgers while preserving clean TourBot target IDs."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {chickenItems.map((item, index) => <FoodCard key={item.id} item={item} tone={index === 1 ? "amber" : "stone"} />)}
            </div>
          </section>

          <NuggetModule />

          <section id="section-sides" data-tour-id="section-sides" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Sides and shareables"
              title="Fries & Sides"
              body="Sides are independently orderable offers and also appear inside plates and bundles."
            />
            <div id="qualifier-fries-size" data-tour-id="qualifier-fries-size" data-spotlight-mode="card" className="mb-4 rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-lg shadow-stone-950/6">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-900">Fries size choices</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Small", "Medium", "Large"].map((item) => <span key={item} className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white shadow-sm">{item}</span>)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sides.map((item) => <SmallOfferTile key={item.id} item={item} />)}
            </div>
          </section>

          <DrinksRack />

          <section id="section-desserts" data-tour-id="section-desserts" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Cheesecake-style finish"
              title="Desserts"
              body="Desserts make the site feel like a full restaurant instead of a fast-food mockup, while still preserving the carryout router’s target IDs."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {desserts.map((item, index) => <FoodCard key={item.id} item={item} tone={index === 0 ? "cream" : "amber"} />)}
            </div>
          </section>

          <section id="checkout-section" data-tour-id="checkout-section" data-spotlight-mode="region" className="rounded-[34px] border border-stone-200 bg-stone-950 p-6 text-white shadow-2xl shadow-stone-950/20 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
                  <Clock className="h-4 w-4" />
                  Carryout handoff
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Order completion ends at checkout handoff.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
                  TourBot should build the validated cart, ask qualifier chips only when needed, and hand the completed order to checkout as one full order — not the currently active spotlight item.
                </p>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-white/10">
                <ShoppingCart className="h-8 w-8" />
              </div>
            </div>
          </section>
        </div>

        <CarryoutExplainerPanel />
      </main>
    </div>
  );
}

