import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Coffee,
  Flame,
  Menu,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Utensils,
} from "lucide-react";
import GuideShellStatic, { type GuideShellDemoCommand } from "./components/GuideShellStatic";
import TourBarOrdering, { type TourBarOrderingFocusTarget } from "./components/tourbar/TourBarOrdering";
import DemoController, { type DemoStatus } from "./demo/DemoController";
import { guidedCarryoutPanelDemo } from "./demo/demoScripts";

type MenuTab = "combos" | "burgers" | "chicken" | "nuggets" | "sides" | "drinks" | "desserts";

type Offer = {
  id: string;
  title: string;
  price: string;
  description: string;
  chips?: string[];
  badge?: string;
};

type Combo = Offer & {
  includes: string[];
};

const menuTabs: { id: MenuTab; label: string; targetId: string }[] = [
  { id: "combos", label: "Combos", targetId: "section-combos" },
  { id: "burgers", label: "Burgers", targetId: "section-burgers" },
  { id: "chicken", label: "Chicken", targetId: "section-chicken" },
  { id: "nuggets", label: "Nuggets", targetId: "section-nuggets" },
  { id: "sides", label: "Sides", targetId: "section-sides" },
  { id: "drinks", label: "Drinks", targetId: "section-drinks" },
  { id: "desserts", label: "Desserts", targetId: "section-desserts" },
];

const combos: Combo[] = [
  {
    id: "combo-double-stack",
    title: "Double Stack Combo",
    price: "$11.99",
    description: "Double cheeseburger, fries, and a fountain drink bundled for the fastest order path.",
    includes: ["Double cheeseburger", "Fries", "Drink"],
    chips: ["Popular", "Needs drink", "Needs fry size"],
    badge: "Best seller",
  },
  {
    id: "combo-classic-burger",
    title: "Classic Burger Combo",
    price: "$9.49",
    description: "Classic burger with a side and drink. Easy default for a standard lunch order.",
    includes: ["Classic burger", "Side", "Drink"],
    chips: ["Value", "Flexible side", "Quick lunch"],
  },
  {
    id: "combo-spicy-chicken",
    title: "Spicy Chicken Combo",
    price: "$10.49",
    description: "Crispy spicy chicken sandwich with fries or onion rings and a drink.",
    includes: ["Spicy chicken", "Side", "Drink"],
    chips: ["Spicy", "Crispy", "Meal deal"],
  },
  {
    id: "combo-nugget-box",
    title: "Nugget Box Combo",
    price: "$8.99",
    description: "Nuggets, sauce, fries, and a drink. Great when count and sauce matter.",
    includes: ["Nuggets", "Sauce", "Fries", "Drink"],
    chips: ["6 / 10 / 20", "Sauce choice", "Kid-friendly"],
  },
  {
    id: "combo-family-bundle",
    title: "Family Bundle",
    price: "$29.99",
    description: "Two burgers, nuggets, two fries, and four drinks for group carryout.",
    includes: ["2 burgers", "Nuggets", "2 fries", "4 drinks"],
    chips: ["Group order", "Multiple drinks", "Shareable"],
  },
  {
    id: "combo-kids-meal",
    title: "Kids Meal",
    price: "$6.49",
    description: "Small burger or nuggets with apple slices, small fries, or milk.",
    includes: ["Main", "Side", "Drink"],
    chips: ["Small portions", "Choice-based", "Simple"],
  },
];

const burgers: Offer[] = [
  {
    id: "item-classic-burger",
    title: "Classic Burger",
    price: "$4.99",
    description: "Beef patty, pickles, onions, ketchup, and mustard on a toasted bun.",
    chips: ["No onions", "No pickles", "Add cheese"],
  },
  {
    id: "item-cheeseburger",
    title: "Cheeseburger",
    price: "$5.49",
    description: "Classic burger with American cheese. A clean baseline for modifier demos.",
    chips: ["Cheese", "No onions", "Extra sauce"],
    badge: "Common ask",
  },
  {
    id: "item-double-cheeseburger",
    title: "Double Cheeseburger",
    price: "$7.49",
    description: "Two patties, two slices of cheese, pickles, onions, ketchup, and mustard.",
    chips: ["Double", "No onions", "Add bacon"],
    badge: "TourBot favorite",
  },
  {
    id: "item-bacon-burger",
    title: "Bacon Burger",
    price: "$7.99",
    description: "Classic burger with smoked bacon, cheese, lettuce, tomato, and house sauce.",
    chips: ["Bacon", "House sauce", "Premium"],
  },
  {
    id: "item-spicy-deluxe-burger",
    title: "Spicy Deluxe Burger",
    price: "$7.79",
    description: "Pepper jack, jalapeÃ±os, shredded lettuce, tomato, and spicy rush sauce.",
    chips: ["Spicy", "Pepper jack", "JalapeÃ±os"],
  },
  {
    id: "item-veggie-burger",
    title: "Veggie Burger",
    price: "$6.49",
    description: "Crispy veggie patty, lettuce, tomato, pickles, onions, and tangy sauce.",
    chips: ["Meatless", "No onions", "Add cheese"],
  },
];

const chickenItems: Offer[] = [
  {
    id: "item-crispy-chicken",
    title: "Crispy Chicken Sandwich",
    price: "$6.49",
    description: "Crispy chicken filet, pickles, lettuce, and mayo.",
    chips: ["No mayo", "Extra pickles", "Add cheese"],
  },
  {
    id: "item-spicy-chicken",
    title: "Spicy Chicken Sandwich",
    price: "$6.79",
    description: "Crispy chicken filet with spicy sauce and pickles.",
    chips: ["Spicy", "Pickles", "Crispy"],
    badge: "Heat pick",
  },
  {
    id: "item-grilled-chicken",
    title: "Grilled Chicken Sandwich",
    price: "$6.99",
    description: "Grilled chicken breast with lettuce, tomato, and herb mayo.",
    chips: ["Grilled", "Lighter", "No mayo"],
  },
];

const sides: Offer[] = [
  {
    id: "side-fries",
    title: "Fries",
    price: "$2.99+",
    description: "Crispy salted fries. Requires size: small, medium, or large.",
    chips: ["Small", "Medium", "Large"],
    badge: "Requires size",
  },
  {
    id: "side-cheese-fries",
    title: "Cheese Fries",
    price: "$4.49+",
    description: "Fries topped with warm cheddar sauce. Size still matters.",
    chips: ["Medium", "Large", "Add bacon"],
  },
  {
    id: "side-onion-rings",
    title: "Onion Rings",
    price: "$3.99+",
    description: "Crispy battered onion rings with dipping sauce.",
    chips: ["Small", "Medium", "Large"],
  },
  {
    id: "side-apple-slices",
    title: "Apple Slices",
    price: "$1.99",
    description: "Fresh sliced apples for a lighter side choice.",
    chips: ["Kid-friendly", "No size", "Fresh"],
  },
];

const drinks: Offer[] = [
  {
    id: "drink-soda",
    title: "Fountain Soda",
    price: "$1.99+",
    description: "Choose a size and flavor. Coke, Diet Coke, Sprite, or Root Beer.",
    chips: ["Size", "Flavor", "Refillable"],
    badge: "Needs size + flavor",
  },
  {
    id: "drink-lemonade",
    title: "Lemonade",
    price: "$2.49+",
    description: "Classic lemonade with small, medium, and large sizes.",
    chips: ["Small", "Medium", "Large"],
  },
  {
    id: "drink-iced-tea",
    title: "Iced Tea",
    price: "$2.29+",
    description: "Sweet or unsweetened iced tea.",
    chips: ["Sweet", "Unsweet", "Size"],
  },
  {
    id: "drink-water",
    title: "Bottled Water",
    price: "$1.79",
    description: "Simple bottled water. No required qualifier.",
    chips: ["No qualifier", "Bottle", "Simple"],
  },
  {
    id: "drink-milkshake",
    title: "Milkshake",
    price: "$4.29+",
    description: "Vanilla, chocolate, or strawberry shake.",
    chips: ["Vanilla", "Chocolate", "Strawberry"],
  },
];

const desserts: Offer[] = [
  {
    id: "dessert-cookie",
    title: "Chocolate Chip Cookie",
    price: "$1.49",
    description: "Warm cookie with chocolate chunks.",
    chips: ["Single", "Easy add-on"],
  },
  {
    id: "dessert-apple-pie",
    title: "Apple Pie",
    price: "$1.99",
    description: "Handheld apple pie with cinnamon filling.",
    chips: ["Warm", "Classic"],
  },
  {
    id: "dessert-sundae",
    title: "Sundae",
    price: "$3.49",
    description: "Vanilla soft serve with chocolate or caramel topping.",
    chips: ["Chocolate", "Caramel"],
  },
];


function isSelfDriveEntry() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "self_drive";
}

const CARRYOUT_CLOSE_URL = "https://tourbot.getn2ai.com/?close=carryout";

function menuTabForTargetId(targetId?: string) {
  const target = targetId || "";
  if (target.includes("combo")) return "combos" as const;
  if (target.includes("burger") || target.includes("modifier-burger")) return "burgers" as const;
  if (target.includes("chicken")) return "chicken" as const;
  if (target.includes("nugget")) return "nuggets" as const;
  if (target.includes("side") || target.includes("fries") || target.includes("onion-ring")) return "sides" as const;
  if (target.includes("drink") || target.includes("soda") || target.includes("tea") || target.includes("milkshake")) return "drinks" as const;
  if (target.includes("dessert") || target.includes("cookie") || target.includes("pie") || target.includes("sundae")) return "desserts" as const;

  return menuTabs.find((tab) => tab.targetId === target)?.id;
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/90 shadow-xl shadow-slate-950/30 ring-1 ring-white/[0.04] ${className}`}>
      {children}
    </div>
  );
}

function Price({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-950 shadow-sm">{children}</span>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-orange-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-200 ring-1 ring-orange-300/20">{children}</span>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-semibold text-orange-100">{children}</span>;
}

function AddButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      data-tour-id={`${targetId}-add-button`}
      data-spotlight-mode="control"
      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
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
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{eyebrow}</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function ComboCard({ combo, index }: { combo: Combo; index: number }) {
  const featured = index === 0;
  const compactMobile = combo.id === "combo-classic-burger";

  return (
    <article
      id={combo.id}
      data-tour-id={combo.id}
      data-spotlight-mode="card"
      className={`group relative overflow-hidden rounded-[30px] border bg-slate-900/90 shadow-xl shadow-slate-950/25 ring-1 ring-white/[0.03] transition hover:-translate-y-0.5 hover:shadow-2xl ${
        featured ? "border-orange-400/40 md:col-span-2" : "border-white/10"
      } ${compactMobile ? "max-sm:rounded-[22px] max-sm:border-orange-400/40 max-sm:shadow-md" : ""}`}
    >
      {compactMobile && (
        <div className="sm:hidden">
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-400 px-3.5 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/20">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                    Combo
                  </div>
                  <h3 className="text-base font-black leading-tight tracking-tight">
                    {combo.title}
                  </h3>
                </div>
              </div>
              <Price>{combo.price}</Price>
            </div>
          </div>

          <div className="p-3.5">
            <p className="text-xs leading-5 text-slate-300">
              {combo.description}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {combo.includes.map((item) => (
                <span
                  key={item}
                  className="rounded-xl bg-white/10 px-2 py-1.5 text-center text-[11px] font-black text-orange-100 ring-1 ring-white/10"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {combo.chips?.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-800/80 px-3 py-2 ring-1 ring-white/10">
              <div className="text-[11px] font-bold leading-4 text-slate-300">
                Side + drink choices ready for TourBot.
              </div>
              <AddButton targetId={combo.id} />
            </div>
          </div>
        </div>
      )}

      <div className={`${compactMobile ? "hidden sm:grid" : "grid"} h-full ${featured ? "md:grid-cols-[0.95fr_1.2fr]" : ""}`}>
        <div className={`${featured ? "min-h-[250px]" : "min-h-[170px]"} bg-gradient-to-br from-orange-500 via-red-500 to-amber-400 p-5 text-white`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/20">
              <Package className="h-6 w-6" />
            </div>
            {combo.badge && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold ring-1 ring-white/20">{combo.badge}</span>}
          </div>
          <div className="mt-8 text-5xl font-black leading-none tracking-tight sm:text-6xl">{featured ? "2x" : "Meal"}</div>
          <div className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-white/75">BurgerRush combo</div>
        </div>
        <div className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">{combo.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{combo.description}</p>
            </div>
            <Price>{combo.price}</Price>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-white/10">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Includes</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {combo.includes.map((item) => (
                <span key={item} className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-slate-200 shadow-sm ring-1 ring-white/10">
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
      className="group grid gap-3 rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-xl sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black tracking-tight text-white sm:text-lg">{item.title}</h3>
          {item.badge && <Badge>{item.badge}</Badge>}
        </div>
        <p className="mt-1.5 text-sm leading-6 text-slate-300">{item.description}</p>
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

function FoodCard({ item, tone = "orange" }: { item: Offer; tone?: "orange" | "yellow" | "red" }) {
  const toneClass =
    tone === "red"
      ? "from-red-500 to-orange-400"
      : tone === "yellow"
        ? "from-amber-400 to-yellow-300"
        : "from-orange-500 to-amber-400";

  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-spotlight-mode="card"
      className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/90 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-2xl"
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
              <h3 className="text-lg font-black tracking-tight text-white">{item.title}</h3>
              {item.badge && <Badge>{item.badge}</Badge>}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
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
      className="rounded-[26px] border border-white/10 bg-slate-900/90 p-4 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-orange-400/40 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/20">
          <Utensils className="h-5 w-5" />
        </div>
        <Price>{item.price}</Price>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-black tracking-tight text-white">{item.title}</h3>
        {item.badge && <Badge>{item.badge}</Badge>}
      </div>
      <p className="mt-2 text-sm leading-5 text-slate-300">{item.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.chips?.map((chip) => <Chip key={chip}>{chip}</Chip>)}
      </div>
    </article>
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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 text-white shadow-xl shadow-slate-950/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Menu className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-black tracking-tight text-white">BurgerRush Carryout</div>
            <div className="truncate text-sm text-slate-300">Fast food ordering without the menu maze</div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end">
          <nav data-tour-id="menu-category-tabs" data-spotlight-mode="navigation" className="min-w-0 flex-1 overflow-x-auto rounded-full bg-slate-900/90 p-1 ring-1 ring-white/10 lg:flex-none">
            <div className="flex gap-2">
              {menuTabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.targetId}`}
                  data-tour-id={`tab-${tab.id}`}
                  onClick={() => onTabClick(tab.id)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition outline-none focus:outline-none focus-visible:outline-none sm:px-4 ${
                    activeTab === tab.id ? "bg-orange-400 text-slate-950 shadow-sm" : "text-orange-100 hover:bg-white/10"
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
      className="relative overflow-hidden rounded-[34px] bg-slate-950 text-white shadow-2xl shadow-orange-200/50"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.55),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(248,113,113,0.36),_transparent_36%)]" />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-orange-100 ring-1 ring-white/15">
            <Sparkles className="h-4 w-4" />
            Natural-language carryout demo
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
            Say the order. TourBot builds the cart.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-orange-50/90 sm:text-lg">
            BurgerRush is built to show a realistic fast-food menu: combos, independent sides,
            drinks, modifiers, required choices, and a cart handoff that can be driven by plain English.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#section-combos" className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:-translate-y-0.5">
              Browse combos
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a href="#carryout-flow-panel" className="inline-flex items-center rounded-full bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/15">
              How TourBot works
            </a>
          </div>
        </div>

        <div
          id="featured-double-stack-combo"
          data-tour-id="featured-double-stack-combo"
          data-spotlight-mode="card"
          className="rounded-[32px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-orange-400 text-slate-950 shadow-lg shadow-orange-950/20">
              <Flame className="h-8 w-8" />
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange-50 ring-1 ring-white/15">Featured combo</div>
          </div>
          <div className="mt-8 text-5xl font-black leading-none tracking-tight">Double Stack</div>
          <div className="mt-2 text-5xl font-black leading-none tracking-tight text-orange-300">Combo</div>
          <p className="mt-5 text-sm leading-6 text-orange-50/85">
            Double cheeseburger, fries, and drink. A perfect target for showing how TourBot maps separate requests into a combo.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-orange-50">
            <div className="rounded-2xl bg-white/10 p-3">Burger</div>
            <div className="rounded-2xl bg-white/10 p-3">Fries</div>
            <div className="rounded-2xl bg-white/10 p-3">Drink</div>
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
      className="rounded-[30px] border border-amber-300/20 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/20 ring-1 ring-white/[0.03] sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            <CheckCircle className="h-4 w-4" />
            Guided order completion
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Missing choices become chips</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            When a requested item needs a required qualifier, TourBot can keep the item in the order and attach the right choices to that step: size, piece count, sauce, flavor, or combo options.
          </p>
        </div>
        <div className="rounded-3xl bg-slate-950/70 p-4 shadow-sm ring-1 ring-white/10" data-tour-id="sample-qualifier-chips" data-spotlight-mode="card">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Example chips</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Small', 'Medium', 'Large'].map((item) => (
              <span key={item} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NuggetModule() {
  return (
    <section id="section-nuggets" data-tour-id="section-nuggets" data-spotlight-mode="region" className="scroll-mt-28">
      <SectionHeader
        eyebrow="Required count + sauce"
        title="Nuggets"
        body="Nuggets are a perfect demo object because piece count is required and sauce can be handled as a modifier or qualifier."
      />
      <Card>
        <div id="item-nuggets" data-tour-id="item-nuggets" data-spotlight-mode="card" className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/20">
              <Utensils className="h-7 w-7" />
            </div>
            <div className="mt-7 text-4xl font-black tracking-tight">Chicken Nuggets</div>
            <p className="mt-3 text-sm leading-6 text-white/85">Choose 6-piece, 10-piece, or 20-piece. Sauce can be BBQ, Ranch, or Honey Mustard.</p>
          </div>
          <div className="grid gap-5 p-6 sm:p-8 md:grid-cols-2">
            <div id="qualifier-nugget-count" data-tour-id="qualifier-nugget-count" data-spotlight-mode="card" className="rounded-[26px] bg-slate-800/80 p-5 ring-1 ring-white/10">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Piece count</div>
              <div className="mt-4 grid gap-2">
                {['6-piece', '10-piece', '20-piece'].map((item) => (
                  <button key={item} type="button" className="rounded-2xl bg-slate-950/70 px-4 py-3 text-left text-sm font-black text-slate-100 shadow-sm ring-1 ring-white/10">{item}</button>
                ))}
              </div>
            </div>
            <div id="qualifier-nugget-sauce" data-tour-id="qualifier-nugget-sauce" data-spotlight-mode="card" className="rounded-[26px] bg-slate-800/80 p-5 ring-1 ring-white/10">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Sauce</div>
              <div className="mt-4 grid gap-2">
                {['BBQ', 'Ranch', 'Honey Mustard'].map((item) => (
                  <button key={item} type="button" className="rounded-2xl bg-slate-950/70 px-4 py-3 text-left text-sm font-black text-slate-100 shadow-sm ring-1 ring-white/10">{item}</button>
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
        eyebrow="Grouped drink orders"
        title="Drinks"
        body="The drink rack gives TourBot a realistic grouping challenge: five sodas should be clarified as a group, not one at a time."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drinks.map((drink) => <SmallOfferTile key={drink.id} item={drink} />)}
        </div>
        <Card>
          <div id="drink-qualifiers" data-tour-id="drink-qualifiers" data-spotlight-mode="card" className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
              <Coffee className="h-4 w-4" />
              Drink qualifiers
            </div>
            <div id="qualifier-drink-size" data-tour-id="qualifier-drink-size" className="mt-5 rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Size</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Small', 'Medium', 'Large'].map((item) => <Chip key={item}>{item}</Chip>)}
              </div>
            </div>
            <div id="qualifier-drink-flavor" data-tour-id="qualifier-drink-flavor" className="mt-4 rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Flavor</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Coke', 'Diet Coke', 'Sprite', 'Root Beer'].map((item) => <Chip key={item}>{item}</Chip>)}
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
    { label: "Match", detail: "TourBot maps plain-English requests to real BurgerRush menu items." },
    { label: "Complete", detail: "Missing sizes, sauces, flavors, and toppings become focused choices." },
    { label: "Handoff", detail: "The sheet locks the matched order into a checkout-ready payload." },
  ];

  return (
    <aside id="carryout-flow-panel" className="lg:sticky lg:top-28">
      <Card className="border-orange-300/20 bg-slate-950/85">
        <div className="relative overflow-hidden p-5 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,146,60,0.22),_transparent_42%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">TourBot flow</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">From request to handoff</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-100 ring-1 ring-orange-300/20">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              The live cart now lives inside the TourBar sheet. This panel stays in the background as a simple explanation of what the ordering agent is doing.
            </p>

            <div className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <div key={step.label} className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-400/15 text-xs font-black text-orange-100 ring-1 ring-orange-300/20">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{step.label}</div>
                      <div className="mt-0.5 text-xs leading-5 text-slate-300">{step.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl bg-orange-400/10 p-4 ring-1 ring-orange-300/20">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-orange-200">
                <CheckCircle className="h-4 w-4" />
                Checkout happens in the sheet
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                When the order is ready, TourBot locks the matched items and presents the final handoff there.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </aside>
  );
}

function DemoClosingCard({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -28, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, y: 14, scale: 0.98 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="fixed bottom-24 left-4 right-4 z-[10050] w-[min(calc(100vw-2rem),27rem)] overflow-hidden rounded-[24px] border border-orange-100 bg-white/95 p-4 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-950/[0.04] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
            
          </div>
          <div className="mt-1 text-base font-black tracking-tight text-slate-950">
            
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            TourBot converted plain English into a rapid order flow that can prefill most checkout system forms.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        Done
      </button>
    </motion.div>
  );
}

type BurgerRushCarryoutSiteProps = {
  showTourBarOrdering?: boolean;
  tourBarNode?: React.ReactNode;
  children?: React.ReactNode;
};

export function BurgerRushCarryoutSite({
  showTourBarOrdering = true,
  tourBarNode,
  children,
}: BurgerRushCarryoutSiteProps) {
  const [activeTab, setActiveTab] = useState<MenuTab>("combos");

  const goToTourBarOrderingFocus = (target: TourBarOrderingFocusTarget) => {
    const tab = menuTabForTargetId(target.targetId);
    if (tab) setActiveTab(tab);
  };

  const resolvedTourBarNode = tourBarNode !== undefined
    ? tourBarNode
    : showTourBarOrdering
      ? <TourBarOrdering onNavigateToFocus={goToTourBarOrderingFocus} />
      : undefined;

  return (
    <div id="burger-rush-app" data-tour-id="burger-rush-app" className="min-h-[100lvh] bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(127,29,29,0.28),_transparent_34%),linear-gradient(135deg,_#020617_0%,_#111827_45%,_#1f1308_100%)] text-white">
      <Header
        activeTab={activeTab}
        onTabClick={setActiveTab}
        tourBarNode={resolvedTourBarNode}
      />

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:py-8">
        <div className="space-y-8">
          <Hero />

          <QualifierPanel />

          <section id="section-combos" data-tour-id="section-combos" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Combos as packages"
              title="Combos"
              body="Combos are the carryout version of packages: bundled offers with required side and drink choices."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {combos.map((combo, index) => <ComboCard key={combo.id} combo={combo} index={index} />)}
            </div>
          </section>

          <section id="section-burgers" data-tour-id="section-burgers" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Independent offers"
              title="Burgers"
              body="Every burger is orderable on its own, and can also be included inside combos."
            />
            <div id="modifier-burger-toppings" data-tour-id="modifier-burger-toppings" data-spotlight-mode="card" className="mb-4 rounded-[28px] border border-white/10 bg-slate-900/85 p-4 shadow-lg shadow-slate-950/20">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Common burger modifiers</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['No onions', 'No pickles', 'Extra cheese', 'Add bacon', 'Extra sauce', 'No mayo'].map((item) => <Chip key={item}>{item}</Chip>)}
              </div>
            </div>
            <div className="grid gap-3">
              {burgers.map((item) => <MenuRow key={item.id} item={item} />)}
            </div>
          </section>

          <section id="section-chicken" data-tour-id="section-chicken" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Sandwich cards"
              title="Chicken"
              body="A smaller product family with card-style layouts so spotlighting has a different shape than menu rows."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {chickenItems.map((item, index) => <FoodCard key={item.id} item={item} tone={index === 1 ? 'red' : 'orange'} />)}
            </div>
          </section>

          <NuggetModule />

          <section id="section-sides" data-tour-id="section-sides" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Sides are offers"
              title="Fries & sides"
              body="Sides are independently orderable offers, not just add-ons. Combos can include them, but customers can also order them directly."
            />
            <div id="qualifier-fries-size" data-tour-id="qualifier-fries-size" data-spotlight-mode="card" className="mb-4 rounded-[28px] border border-orange-300/20 bg-orange-500/10 p-4 shadow-lg shadow-slate-950/20">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Fries size choices</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Small', 'Medium', 'Large'].map((item) => <span key={item} className="rounded-full bg-slate-950/80 px-4 py-2 text-xs font-black text-orange-100 shadow-sm ring-1 ring-white/10">{item}</span>)}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sides.map((item) => <SmallOfferTile key={item.id} item={item} />)}
            </div>
          </section>

          <DrinksRack />

          <section id="section-desserts" data-tour-id="section-desserts" data-spotlight-mode="region" className="scroll-mt-28">
            <SectionHeader
              eyebrow="Small addable offers"
              title="Desserts"
              body="Desserts are simple independent offers that let TourBot show optional cart expansion after the main order is complete."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {desserts.map((item, index) => <FoodCard key={item.id} item={item} tone={index === 0 ? 'yellow' : 'orange'} />)}
            </div>
          </section>

          <section id="checkout-section" data-tour-id="checkout-section" data-spotlight-mode="region" className="rounded-[34px] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/30 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-orange-200">
                  <Clock className="h-4 w-4" />
                  Carryout handoff
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Order completion ends at checkout handoff.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  The future carryout router should build the validated cart, ask qualifier chips only when needed, then hand the completed order to checkout as one full order â€” not the currently active spotlight item.
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

      {children}
    </div>
  );
}

export default function AppCarryout() {
  const selfDrive = useMemo(() => isSelfDriveEntry(), []);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>(() =>
    selfDrive ? "running" : "idle",
  );
  const [guideDemoCommand, setGuideDemoCommand] =
    useState<GuideShellDemoCommand | null>(null);
  const [demoClosingOpen, setDemoClosingOpen] = useState(false);

  const closeCarryoutDemo = () => {
    window.location.href = CARRYOUT_CLOSE_URL;
  };

  return (
    <BurgerRushCarryoutSite showTourBarOrdering={!selfDrive}>
      {selfDrive && (
        <GuideShellStatic
          demoCommand={guideDemoCommand}
          demoStatus={demoStatus}
          demoInteractionLocked={demoStatus !== "idle"}
          initialShellState="launcher"
          suppressWelcomeCard
          guideConfig={{
            mode: "commerce",
            label: "BurgerRush Carryout",
            catalogMode: "carryout_ordering",
            features: {
              refinementChips: true,
              bookingActions: true,
              navigation: true,
            },
            packIds: {
              catalog: "carryout_cart_catalog",
            },
          }}
        />
      )}

      {selfDrive && (
        <DemoController
          script={guidedCarryoutPanelDemo}
          status={demoStatus}
          onStatusChange={setDemoStatus}
          onGuideCommand={setGuideDemoCommand}
          onFinished={() => setDemoClosingOpen(true)}
          finishDelayMs={2600}
        />
      )}

      <AnimatePresence>
        {demoClosingOpen && <DemoClosingCard onClose={closeCarryoutDemo} />}
      </AnimatePresence>
    </BurgerRushCarryoutSite>
  );
}
