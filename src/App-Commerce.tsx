import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Coffee,
  Compass,
  CreditCard,
  Hotel,
  Luggage,
  Moon,
  Plane,
  Search,
  Sparkles,
  Users,
  Waves,
  Wifi,
} from "lucide-react";
import GuideShellStatic, {
  type GuideShellDemoCommand,
} from "./components/GuideShellStatic";
import DemoController, { type DemoStatus } from "./demo/DemoController";
import {
  guidedCommerceRichIntentDemo,
  guidedCommerceAssistedCompletionDemo,
  type DemoScript,
} from "./demo/demoScripts";
import { commerceGuideConfig } from "./commerce/commerceGuideConfig";

export type PageId = "home" | "rooms" | "packages" | "amenities" | "booking";

export type Section = {
  id: string;
  title: string;
  body: string;
  eyebrow?: string;
  price?: string;
  details?: string[];
  tags?: string[];
};

export type Page = {
  id: PageId;
  title: string;
  subtitle: string;
  hero: string;
  sections: Section[];
};

export type TourStep = {
  pageId: PageId;
  anchorId: string;
  title: string;
  summary: string;
  bridge?: string;
};

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-white/70 bg-white/92 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/[0.03] backdrop-blur sm:rounded-[30px] ${className}`}
    >
      {children}
    </div>
  );
}

function Button({
  className = "",
  variant = "default",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
}) {
  const variantClass =
    variant === "outline"
      ? "border border-slate-300 bg-white/80 text-slate-900 hover:bg-white hover:shadow-sm"
      : "bg-slate-950 text-white shadow-sm hover:bg-slate-800";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export const PAGES: Record<PageId, Page> = {
  home: {
    id: "home",
    title: "StayPilot Suites",
    subtitle: "AI-ready hotel booking demo",
    hero: "A synthetic travel site designed for Guided Commerce demos: room discovery, provisional recommendations, booking preload, and missing-field completion without forcing users into a traditional form.",
    sections: [
      {
        id: "travel-hero",
        eyebrow: "AI-guided stays",
        title: "Find the right stay without browsing every room",
        body: "Tell the guide what matters: quiet, work setup, view, budget, guests, dates, or trip purpose. The site is intentionally structured so AI can answer, route, compare, and preload a booking summary.",
        tags: ["Guided commerce", "Hotel booking", "Decision support"],
      },
      {
        id: "room-finder",
        eyebrow: "Search assist",
        title: "Room finder",
        body: "A lightweight search panel collects the most useful dimensions: stay length, dates, guests, work needs, budget, and preferred style. Users can skip details and still get a provisional recommendation.",
        tags: ["Dates", "Budget", "Guests", "Intent"],
      },
      {
        id: "featured-stays",
        eyebrow: "Curated options",
        title: "Featured stays",
        body: "The homepage previews the strongest paths: quiet business travel, ocean-view leisure, family comfort, and flexible extended stay. Each path maps to a specific room or package anchor.",
        tags: ["Business", "Leisure", "Family", "Extended stay"],
      },
      {
        id: "booking-preview",
        eyebrow: "Preload behavior",
        title: "Booking preview",
        body: "When a user clicks Book, the booking panel should open with known information preloaded and missing required fields highlighted instead of blocking the action.",
        tags: ["Book this", "Partial form", "Missing fields"],
      },
    ],
  },
  rooms: {
    id: "rooms",
    title: "Rooms & Suites",
    subtitle: "One option at a time, ranked by intent",
    hero: "Room sections are built as clear commerce destinations. The guide can spotlight one best starting room or step through multiple strong options with Back, Next, and Book controls.",
    sections: [
      {
        id: "room-business-king",
        eyebrow: "Best for work trips",
        title: "Business King Suite",
        price: "$289/night",
        body: "A quiet upper-floor king suite with an ergonomic desk, fast Wi‑Fi, blackout curtains, and lounge access. This is the best starting anchor for business travelers who mention quiet, work, calls, or productivity.",
        details: [
          "King bed",
          "Upper floor",
          "Desk + task lighting",
          "Lounge access",
          "Quiet wing",
        ],
        tags: ["Quiet", "Business", "Wi‑Fi", "Desk"],
      },
      {
        id: "room-ocean-view-suite",
        eyebrow: "Best for leisure",
        title: "Ocean View Suite",
        price: "$379/night",
        body: "A larger suite with a private balcony, ocean-facing seating area, soaking tub, and late checkout eligibility. Strong for romantic trips, views, relaxation, and premium stays.",
        details: [
          "Ocean balcony",
          "Soaking tub",
          "Late checkout",
          "Premium view",
        ],
        tags: ["View", "Romantic", "Premium", "Balcony"],
      },
      {
        id: "room-family-double",
        eyebrow: "Best for families",
        title: "Family Double Room",
        price: "$249/night",
        body: "Two queen beds, extra floor space, a small dining nook, and close elevator access. A practical option for families or groups that need comfort without suite pricing.",
        details: ["Two queens", "Sleeps 4", "Dining nook", "Near elevator"],
        tags: ["Family", "Group", "Value", "Flexible"],
      },
      {
        id: "room-extended-stay-studio",
        eyebrow: "Best for longer stays",
        title: "Extended Stay Studio",
        price: "$219/night",
        body: "A studio room with kitchenette, laundry access, storage, and weekly-rate eligibility. Best for guests staying five nights or more or wanting a more self-sufficient setup.",
        details: ["Kitchenette", "Weekly rate", "Laundry access", "Storage"],
        tags: ["Long stay", "Kitchenette", "Value", "Practical"],
      },
    ],
  },
  packages: {
    id: "packages",
    title: "Packages & Upgrades",
    subtitle: "Add-ons that can be guided into the booking path",
    hero: "Packages are commerce destinations too. The guide can recommend upgrades based on trip purpose, budget, and missing context after a room is selected.",
    sections: [
      {
        id: "package-business-ready",
        eyebrow: "Work upgrade",
        title: "Business Ready Package",
        price: "+$45/night",
        body: "Includes breakfast, meeting pod credit, premium Wi‑Fi tier, and 6pm late checkout. Best paired with the Business King Suite.",
        details: [
          "Breakfast",
          "Meeting pod credit",
          "Premium Wi‑Fi",
          "Late checkout",
        ],
        tags: ["Business", "Meetings", "Productivity"],
      },
      {
        id: "package-relaxation-weekend",
        eyebrow: "Leisure upgrade",
        title: "Relaxation Weekend Package",
        price: "+$95/stay",
        body: "Includes spa credit, welcome drinks, breakfast for two, and guaranteed late checkout. Best for romantic weekends or premium leisure stays.",
        details: [
          "Spa credit",
          "Welcome drinks",
          "Breakfast for two",
          "Late checkout",
        ],
        tags: ["Romantic", "Spa", "Weekend"],
      },
      {
        id: "package-family-comfort",
        eyebrow: "Family upgrade",
        title: "Family Comfort Bundle",
        price: "+$55/stay",
        body: "Adds parking, snack credit, extra towels, and flexible check-in support. Best for families arriving with children or extra luggage.",
        details: [
          "Parking",
          "Snack credit",
          "Extra towels",
          "Flexible arrival",
        ],
        tags: ["Family", "Parking", "Convenience"],
      },
    ],
  },
  amenities: {
    id: "amenities",
    title: "Amenities",
    subtitle: "Decision-support details for refining recommendations",
    hero: "Amenities give the guide useful secondary signals. They help explain why a room is recommended and what tradeoffs may matter.",
    sections: [
      {
        id: "amenity-quiet-zone",
        eyebrow: "Noise control",
        title: "Quiet Zone Floors",
        body: "Upper-floor rooms away from elevators and event spaces are marked as quiet-zone eligible. This is a major signal for business travelers and light sleepers.",
        tags: ["Quiet", "Upper floor", "Sleep"],
      },
      {
        id: "amenity-work-lounge",
        eyebrow: "Productivity",
        title: "Work Lounge & Meeting Pods",
        body: "Semi-private work pods, coffee service, printing support, and reservable meeting space create a stronger business-travel experience.",
        tags: ["Work", "Meetings", "Coffee"],
      },
      {
        id: "amenity-pool-spa",
        eyebrow: "Relaxation",
        title: "Pool, Spa & Rooftop Deck",
        body: "The leisure layer includes a rooftop pool, spa treatment rooms, and evening deck service. This supports premium and romantic recommendation paths.",
        tags: ["Spa", "Pool", "Rooftop"],
      },
      {
        id: "amenity-airport-shuttle",
        eyebrow: "Arrival support",
        title: "Airport Shuttle & Parking",
        body: "A predictable shuttle and secured parking make arrival easier for business travelers, families, and guests with rental cars.",
        tags: ["Shuttle", "Parking", "Arrival"],
      },
    ],
  },
  booking: {
    id: "booking",
    title: "Booking Panel",
    subtitle: "Preloaded summary with missing-field completion",
    hero: "The booking module demonstrates the key commerce behavior: Book commits intent, opens the form, preloads known data, and highlights missing required fields without blocking the user.",
    sections: [
      {
        id: "booking-panel",
        eyebrow: "Checkout preload",
        title: "Booking Summary",
        body: "The selected room is carried into the booking panel. If dates, guests, or budget are missing, the module shows them as required next steps while preserving momentum.",
        tags: [
          "Selected room",
          "Dates required",
          "Guests required",
          "Ready for payment",
        ],
      },
      {
        id: "booking-missing-fields",
        eyebrow: "Completion chips",
        title: "Missing details",
        body: "Incomplete input becomes completion guidance: Select dates, add guests, adjust budget, or change room. The user is not pushed backward into chat.",
        tags: ["Select dates", "Add guests", "Adjust budget"],
      },
      {
        id: "payment-module",
        eyebrow: "Mock payment",
        title: "Payment module",
        body: "A simulated payment area shows how the final step could become transactional once room, dates, guests, and policies are confirmed.",
        tags: ["Payment", "Confirm", "Policies"],
      },
    ],
  },
};

const pageOrder: PageId[] = [
  "home",
  "rooms",
  "packages",
  "amenities",
  "booking",
];

const navItems: {
  id: PageId;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { id: "home", label: "Home", icon: Hotel },
  { id: "rooms", label: "Rooms", icon: Moon },
  { id: "packages", label: "Packages", icon: Sparkles },
  { id: "amenities", label: "Amenities", icon: Coffee },
  { id: "booking", label: "Booking", icon: CreditCard },
];

const pageVisuals: Record<
  PageId,
  {
    eyebrow: string;
    gradient: string;
    accent: string;
    metricA: string;
    metricB: string;
    proof: string;
  }
> = {
  home: {
    eyebrow: "Guided travel commerce",
    gradient: "from-cyan-950 via-slate-900 to-indigo-900",
    accent: "from-cyan-950 to-slate-800",
    metricA: "Intent → option",
    metricB: "Book → preload",
    proof: "Built for guide demos",
  },
  rooms: {
    eyebrow: "Room catalog",
    gradient: "from-indigo-950 via-slate-900 to-cyan-900",
    accent: "from-indigo-950 to-cyan-800",
    metricA: "4 room anchors",
    metricB: "3–5 step paths",
    proof: "One option at a time",
  },
  packages: {
    eyebrow: "Upgrade routing",
    gradient: "from-violet-950 via-slate-900 to-rose-900",
    accent: "from-violet-950 to-rose-800",
    metricA: "Business · leisure",
    metricB: "Family bundles",
    proof: "Optional add-ons",
  },
  amenities: {
    eyebrow: "Refinement signals",
    gradient: "from-emerald-950 via-slate-900 to-cyan-900",
    accent: "from-emerald-950 to-cyan-800",
    metricA: "Quiet · work",
    metricB: "Spa · shuttle",
    proof: "Explains recommendations",
  },
  booking: {
    eyebrow: "Booking preload",
    gradient: "from-slate-950 via-slate-900 to-amber-900",
    accent: "from-slate-950 to-amber-800",
    metricA: "Partial forms OK",
    metricB: "Missing fields shown",
    proof: "Momentum over friction",
  },
};

const sectionVisuals: Record<
  string,
  {
    icon: React.ComponentType<any>;
    tone: string;
    chips: string[];
    shape: "hero" | "room" | "dark" | "feature" | "booking";
  }
> = {
  "travel-hero": {
    icon: Compass,
    tone: "from-cyan-950 to-indigo-800",
    chips: ["Guide", "Search", "Book"],
    shape: "hero",
  },
  "room-finder": {
    icon: Search,
    tone: "from-slate-950 to-cyan-800",
    chips: ["Dates", "Budget", "Guests"],
    shape: "feature",
  },
  "featured-stays": {
    icon: Sparkles,
    tone: "from-indigo-950 to-violet-800",
    chips: ["Quiet", "Views", "Family"],
    shape: "feature",
  },
  "booking-preview": {
    icon: CreditCard,
    tone: "from-slate-950 to-amber-800",
    chips: ["Preload", "Missing fields", "Payment"],
    shape: "booking",
  },
  "room-business-king": {
    icon: Wifi,
    tone: "from-slate-950 to-cyan-800",
    chips: ["Quiet", "Desk", "Lounge"],
    shape: "room",
  },
  "room-ocean-view-suite": {
    icon: Waves,
    tone: "from-blue-950 to-cyan-700",
    chips: ["Balcony", "View", "Romantic"],
    shape: "room",
  },
  "room-family-double": {
    icon: Users,
    tone: "from-emerald-950 to-teal-700",
    chips: ["Sleeps 4", "Value", "Family"],
    shape: "room",
  },
  "room-extended-stay-studio": {
    icon: Luggage,
    tone: "from-amber-900 to-slate-800",
    chips: ["Kitchenette", "Weekly", "Laundry"],
    shape: "room",
  },
  "package-business-ready": {
    icon: Coffee,
    tone: "from-slate-950 to-indigo-800",
    chips: ["Breakfast", "Meeting pod", "Late checkout"],
    shape: "dark",
  },
  "package-relaxation-weekend": {
    icon: Sparkles,
    tone: "from-rose-950 to-violet-800",
    chips: ["Spa", "Drinks", "Weekend"],
    shape: "dark",
  },
  "package-family-comfort": {
    icon: Users,
    tone: "from-emerald-950 to-slate-800",
    chips: ["Parking", "Snacks", "Family"],
    shape: "dark",
  },
  "amenity-quiet-zone": {
    icon: Moon,
    tone: "from-slate-950 to-blue-800",
    chips: ["Sleep", "Quiet", "Upper floor"],
    shape: "feature",
  },
  "amenity-work-lounge": {
    icon: Wifi,
    tone: "from-indigo-950 to-slate-800",
    chips: ["Work", "Coffee", "Pods"],
    shape: "feature",
  },
  "amenity-pool-spa": {
    icon: Waves,
    tone: "from-cyan-900 to-blue-700",
    chips: ["Pool", "Spa", "Rooftop"],
    shape: "feature",
  },
  "amenity-airport-shuttle": {
    icon: Plane,
    tone: "from-amber-900 to-slate-800",
    chips: ["Shuttle", "Parking", "Arrival"],
    shape: "feature",
  },
  "booking-panel": {
    icon: CreditCard,
    tone: "from-slate-950 to-amber-800",
    chips: ["Room selected", "Dates missing", "Guests missing"],
    shape: "booking",
  },
  "booking-missing-fields": {
    icon: CalendarDays,
    tone: "from-amber-900 to-slate-800",
    chips: ["Select dates", "Add guests", "Budget"],
    shape: "booking",
  },
  "payment-module": {
    icon: CreditCard,
    tone: "from-emerald-950 to-slate-800",
    chips: ["Confirm", "Policies", "Pay"],
    shape: "booking",
  },
};

function getSectionVisual(section: Section, index: number) {
  return (
    sectionVisuals[section.id] || {
      icon: index % 2 === 0 ? Sparkles : Hotel,
      tone:
        index % 2 === 0
          ? "from-slate-900 to-cyan-800"
          : "from-indigo-900 to-slate-700",
      chips: section.tags || ["Guide stop", "Commerce anchor"],
      shape: "feature" as const,
    }
  );
}

function Header({
  currentPage,
  onNavigate,
  demoStatus,
  onStartDemo,
  onPauseDemo,
  onResumeDemo,
  onStopDemo,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  demoStatus: DemoStatus;
  onStartDemo: () => void;
  onPauseDemo: () => void;
  onResumeDemo: () => void;
  onStopDemo: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight sm:text-lg">
              StayPilot Suites
            </div>
            <div className="truncate text-xs text-slate-500 sm:text-sm">
              Guided Commerce travel demo
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-3 md:w-auto">
          <nav className="hidden gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === currentPage;
              return (
                <Button
                  key={item.id}
                  variant={active ? "default" : "outline"}
                  onClick={() => onNavigate(item.id)}
                  className="rounded-full px-4"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
            {demoStatus === "idle" && (
              <button
                data-demo-target="start-demo"
                onClick={onStartDemo}
                className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Self-Drive Booking
              </button>
            )}
            {demoStatus === "running" && (
              <button
                onClick={onPauseDemo}
                className="rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
              >
                Pause
              </button>
            )}
            {demoStatus === "paused" && (
              <button
                onClick={onResumeDemo}
                className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-200"
              >
                Resume
              </button>
            )}
            {demoStatus !== "idle" && (
              <button
                onClick={onStopDemo}
                className="rounded-full px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero({ page }: { page: Page }) {
  const visual = pageVisuals[page.id];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-10">
      <div
        className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${visual.gradient} px-5 py-7 text-white shadow-2xl shadow-slate-300/40 sm:rounded-[40px] sm:px-6 sm:py-8 md:px-10 md:py-12`}
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.18fr_0.82fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {visual.eyebrow}
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl">
              {page.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
              {page.hero}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {[visual.metricA, visual.metricB, visual.proof].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            id="hero-booking-widget"
            data-tour-id="hero-booking-widget"
            className="rounded-[32px] border border-white/15 bg-white/12 p-5 shadow-2xl backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Trip starter
                </div>
                <div className="mt-1 text-xl font-semibold">
                  Tell us what matters
                </div>
              </div>
              <Search className="h-5 w-5 text-white/70" />
            </div>
            <div className="grid gap-3">
              {[
                "Quiet room for work",
                "3 nights",
                "Under $325/night",
                "Near airport shuttle",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
              AI can recommend → you can refine → booking preloads
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeExtras() {
  const paths = [
    {
      title: "Quiet business trip",
      icon: Wifi,
      text: "Starts with Business King Suite and work-friendly amenities.",
      tone: "from-slate-950 to-cyan-800",
    },
    {
      title: "Romantic weekend",
      icon: Waves,
      text: "Starts with Ocean View Suite and relaxation upgrades.",
      tone: "from-blue-950 to-violet-800",
    },
    {
      title: "Family stay",
      icon: Users,
      text: "Starts with Family Double Room and convenience bundles.",
      tone: "from-emerald-950 to-teal-700",
    },
    {
      title: "Longer visit",
      icon: Luggage,
      text: "Starts with Extended Stay Studio and weekly-rate logic.",
      tone: "from-amber-900 to-slate-800",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Guided paths
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Commerce journeys with clear visual destinations
          </h2>
        </div>
        <div className="hidden rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm md:block">
          Designed for AI + spotlighting
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {paths.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <div className="p-6">
                <div
                  className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${item.tone} p-3 text-white shadow-sm`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

const roomBookingMeta: Record<
  string,
  { title: string; price: string; signal: string }
> = {
  "room-business-king": {
    title: "Business King Suite",
    price: "$289/night",
    signal: "Quiet, work-ready, upper-floor room",
  },
  "room-ocean-view-suite": {
    title: "Ocean View Suite",
    price: "$379/night",
    signal: "Premium view and leisure-ready layout",
  },
  "room-family-double": {
    title: "Family Double Room",
    price: "$249/night",
    signal: "Flexible room for families or groups",
  },
  "room-extended-stay-studio": {
    title: "Extended Stay Studio",
    price: "$219/night",
    signal: "Kitchenette and longer-stay convenience",
  },
};

const roomStepOrder = [
  "room-business-king",
  "room-ocean-view-suite",
  "room-family-double",
  "room-extended-stay-studio",
];

function getRoomMeta(roomId?: string | null) {
  if (!roomId) return null;
  return roomBookingMeta[roomId] || null;
}

function formatBookingDateRange(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return "Required";
  const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
  const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);
  const start = new Date(inYear, inMonth - 1, inDay);
  const end = new Date(outYear, outMonth - 1, outDay);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel}–${endLabel}`;
}

function BookingMock({
  compact = false,
  selectedRoom,
  datesSelected = false,
  guestsSelected = false,
  activeFormSpotlight = null,
  guestLabel = "1 guest",
  budgetBand = "",
  checkInDate,
  checkOutDate,
}: {
  compact?: boolean;
  selectedRoom?: string | null;
  datesSelected?: boolean;
  guestsSelected?: boolean;
  activeFormSpotlight?: "guests" | null;
  guestLabel?: string;
  budgetBand?: string;
  checkInDate: string;
  checkOutDate: string;
}) {
  const roomMeta = getRoomMeta(selectedRoom);
  const missingItems = [
    !datesSelected ? "Select dates" : null,
    !guestsSelected ? "Add guests" : null,
  ].filter(Boolean) as string[];
  const dateLabel = formatBookingDateRange(checkInDate, checkOutDate);

  return (
    <div
      id="booking-summary-card"
      data-tour-id="booking-summary-card"
      className="relative rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition"
    >
      <div
        data-tour-id="booking-panel-main"
        className="flex items-center justify-between gap-3"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Booking summary
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-950">
            {roomMeta?.title || "No room selected"}
          </div>
          {roomMeta && !compact && (
            <div className="mt-1 text-xs font-medium text-slate-500">
              {roomMeta.signal}
            </div>
          )}
        </div>
        <CreditCard className="h-5 w-5 text-slate-500" />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div
          data-tour-id="booking-selected-room"
          className={`flex justify-between rounded-2xl px-3 py-2 ${
            roomMeta
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          <span>Room</span>
          <strong>{roomMeta ? "Selected" : "Required"}</strong>
        </div>

        <div
          data-tour-id="booking-missing-dates"
          className={`flex justify-between rounded-2xl px-3 py-2 ${
            datesSelected
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          <span>Dates</span>
          <strong>{datesSelected ? dateLabel : "Required"}</strong>
        </div>

        <div
          data-tour-id="booking-missing-guests"
          className={`flex justify-between rounded-2xl px-3 py-2 ${
            guestsSelected
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          <span>Guests</span>
          <strong>{guestsSelected ? guestLabel : "Required"}</strong>
        </div>

        {guestsSelected && !compact && (
          <div
            data-tour-id="booking-guests-module"
            className={`relative rounded-2xl border p-3 text-sm transition ${
              activeFormSpotlight === "guests"
                ? "z-[8999] scale-[1.01] border-white bg-white text-slate-950 shadow-2xl ring-4 ring-white/80"
                : "border-emerald-100 bg-emerald-50/70 text-emerald-900"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/70">
              Guest profile
            </div>
            <div className="mt-1 font-semibold">{guestLabel}</div>
            <div className="mt-1 text-xs text-emerald-800/80">
              Contact details and payment can be collected after the stay
              details are complete.
            </div>
          </div>
        )}

        {!compact && (
          <div
            data-tour-id="booking-budget-preference"
            className={`flex justify-between rounded-2xl px-3 py-2 ${
              budgetBand
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-50 text-slate-700"
            }`}
          >
            <span>Budget</span>
            <strong>{budgetBand ? `${budgetBand}` : "Not set"}</strong>
          </div>
        )}

        {!compact && (
          <div
            data-tour-id="booking-estimate"
            className="flex justify-between rounded-2xl bg-slate-50 px-3 py-2 text-slate-700"
          >
            <span>Estimate</span>
            <strong>{roomMeta?.price || "Pending"}</strong>
          </div>
        )}
      </div>

      <div
        data-tour-id="booking-completion-chips"
        className="mt-4 flex flex-wrap gap-2"
      >
        {missingItems.length > 0 ? (
          missingItems.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {chip}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Ready for contact info
          </span>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  emphasized,
  pageId,
  index,
  selectedRoom,
  onBookRoom,
  onNextRoomOption,
}: {
  section: Section;
  emphasized: boolean;
  pageId: PageId;
  index: number;
  selectedRoom?: string | null;
  onBookRoom?: (section: Section) => void;
  onNextRoomOption?: (section: Section) => void;
}) {
  const visual = getSectionVisual(section, index);
  const Icon = visual.icon;
  const dark = visual.shape === "dark" || visual.shape === "booking";
  const isRoom = visual.shape === "room";
  const isSelectedRoom = isRoom && selectedRoom === section.id;
  const isRecommendedStart = section.id === "room-business-king";

  return (
    <motion.section
      id={section.id}
      data-tour-id={section.id}
      layout
      initial={false}
      animate={{ scale: emphasized || isSelectedRoom ? 1.012 : 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="scroll-mt-28"
    >
      <Card
        className={`${
          emphasized
            ? "border-slate-900 ring-2 ring-slate-300 shadow-2xl shadow-slate-300/60"
            : ""
        } ${
          isSelectedRoom
            ? "border-cyan-800 ring-2 ring-cyan-300 shadow-2xl shadow-cyan-200/70"
            : ""
        } ${dark ? `bg-gradient-to-br ${visual.tone} text-white` : ""}`}
      >
        <div
          className={`grid ${isRoom || dark ? "lg:grid-cols-[0.82fr_1.18fr]" : "md:grid-cols-[190px_1fr]"}`}
        >
          {isRoom ? (
            <div className="relative min-h-[280px] overflow-hidden border-b text-white md:border-b-0 md:border-r md:border-white/10">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${visual.tone}`}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.42),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_45%)]" />
              <div className="absolute bottom-5 right-5 h-28 w-28 rounded-[34px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur" />
              <div className="absolute bottom-10 right-12 h-16 w-16 rotate-12 rounded-[24px] border border-white/10 bg-white/10" />

              <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between p-6">
                <div>
                  <div className="inline-flex rounded-2xl bg-white/15 p-3 text-white shadow-sm backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    {section.eyebrow ||
                      `${pageId} / ${String(index + 1).padStart(2, "0")}`}
                  </div>
                  <div className="mt-3 break-all text-xs text-white/65">
                    #{section.id}
                  </div>
                </div>

                <div>
                  {isSelectedRoom && (
                    <div className="mb-3 inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-50 ring-1 ring-emerald-200/30">
                      Selected for booking
                    </div>
                  )}
                  {section.price && (
                    <div className="text-3xl font-semibold tracking-tight">
                      {section.price}
                    </div>
                  )}
                  <div className="mt-2 text-xs font-medium text-white/70">
                    Premium commerce object
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`${dark ? "border-white/10 bg-white/10" : `bg-gradient-to-br ${visual.tone} text-white`} min-h-[220px] border-b p-6 md:border-b-0 md:border-r`}
            >
              <div className="inline-flex rounded-2xl bg-white/15 p-3 text-white shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                {section.eyebrow ||
                  `${pageId} / ${String(index + 1).padStart(2, "0")}`}
              </div>
              <div className="mt-3 break-all text-xs text-white/65">
                #{section.id}
              </div>
              {section.price && (
                <div className="mt-5 text-3xl font-semibold tracking-tight">
                  {section.price}
                </div>
              )}
            </div>
          )}

          <div className="p-7 md:p-8">
            <div className="flex flex-wrap gap-2">
              {(section.tags || visual.chips).map((chip) => (
                <span
                  key={chip}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${dark ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"}`}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div data-tour-id={isRoom ? `${section.id}-details` : undefined}>
              <h2
                className={`mt-4 text-2xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-950"}`}
              >
                {section.title}
              </h2>
              {isRecommendedStart && (
                <div className="mt-2 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  Recommended starting point for quiet business travel
                </div>
              )}
              <p
                className={`mt-4 max-w-4xl text-base leading-8 ${dark ? "text-slate-200" : "text-slate-600"}`}
              >
                {section.body}
              </p>
            </div>

            {section.details?.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {section.details.map((detail) => (
                  <div
                    key={detail}
                    className={`rounded-2xl p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                  >
                    <div
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}
                    >
                      Included
                    </div>
                    <div className="mt-2 text-sm font-semibold">{detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div
                  className={`rounded-2xl p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                >
                  <div
                    className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}
                  >
                    Guide signal
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    Anchor-ready commerce stop
                  </div>
                </div>
                <div
                  className={`rounded-2xl p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                >
                  <div
                    className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}
                  >
                    Action
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    Recommend, refine, book
                  </div>
                </div>
              </div>
            )}

            {(isRoom || section.id === "booking-panel") && (
              <div
                data-tour-id={
                  isRoom ? `${section.id}-cta` : "booking-panel-cta"
                }
                className="mt-6 flex flex-wrap gap-3"
              >
                {isRoom ? (
                  <>
                    <Button
                      onClick={() => onBookRoom?.(section)}
                      className="rounded-full px-5 py-2"
                    >
                      Book this room
                    </Button>
                    <Button
                      onClick={() => onNextRoomOption?.(section)}
                      variant="outline"
                      className="rounded-full px-5 py-2"
                    >
                      See next option →
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="rounded-full px-5 py-2">
                      Continue booking
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                    >
                      Fill missing details
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.section>
  );
}


type DemoPreviewOption = {
  label: string;
  description: string;
  onClick: () => void;
};

function DemoPreviewCard({
  title,
  siteType,
  contentType,
  guideShows,
  options,
  onClose,
}: {
  title: string;
  siteType: string;
  contentType: string;
  guideShows: string;
  options: DemoPreviewOption[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed left-4 right-4 top-4 z-[10050] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-6 sm:top-20 sm:w-[420px] sm:rounded-[28px]"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 pb-5 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-5">
        <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2.5 backdrop-blur sm:p-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-lg font-semibold tracking-tight sm:text-xl">{title}</div>
        <p className="mt-2 text-sm leading-6 text-slate-200 sm:mt-3">{guideShows}</p>
      </div>
      <div className="space-y-3 px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5">
        <div className="grid gap-2 text-sm leading-6 text-slate-600 sm:gap-3">
          <div>
            <span className="font-semibold text-slate-950">Website:</span> {siteType}
          </div>
          <div>
            <span className="font-semibold text-slate-950">Content:</span> {contentType}
          </div>
        </div>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.label}
              onClick={option.onClick}
              className="flex w-full items-start justify-between rounded-2xl bg-slate-950 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-800 sm:py-3"
            >
              <span>
                <span className="block">{option.label}</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-300">
                  {option.description}
                </span>
              </span>
              <ArrowRight className="ml-3 mt-0.5 h-4 w-4 shrink-0" />
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:py-3"
        >
          Not now
        </button>
      </div>
    </motion.div>
  );
}

function DemoClosingCard({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed left-4 right-4 top-4 z-[10050] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-6 sm:top-20 sm:w-[420px] sm:rounded-[28px]"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 pb-5 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-5">
        <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2.5 backdrop-blur sm:p-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-lg font-semibold tracking-tight sm:text-xl">Demo complete</div>
        <p className="mt-2 text-sm leading-6 text-slate-200 sm:mt-3">
          You can now use TourBot as a playground. Ask your own questions, request a tour, or test how the guide navigates the site.
        </p>
      </div>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:py-3"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

export default function AppCommerce() {
  const [currentPage, setCurrentPage] = useState<PageId>("home");
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("idle");
  const [guideDemoCommand, setGuideDemoCommand] =
    useState<GuideShellDemoCommand | null>(null);
  const [demoPreviewOpen, setDemoPreviewOpen] = useState(false);
  const [demoClosingOpen, setDemoClosingOpen] = useState(false);
  const [activeDemoScript, setActiveDemoScript] = useState<DemoScript>(
    guidedCommerceRichIntentDemo,
  );
  const [selectedRoom, setSelectedRoom] = useState<string | null>(
    "room-business-king",
  );
  const [datesSelected, setDatesSelected] = useState(false);
  const [guestsSelected, setGuestsSelected] = useState(false);
  const [guestLabel, setGuestLabel] = useState("1 guest");
  const [budgetBand, setBudgetBand] = useState("");
  const [activeFormSpotlight, setActiveFormSpotlight] = useState<
    "guests" | null
  >(null);
  const [bookingRailSpotlight, setBookingRailSpotlight] = useState(false);
  const [checkInDate, setCheckInDate] = useState("2026-06-12");
  const [checkOutDate, setCheckOutDate] = useState("2026-06-15");

  const page = PAGES[currentPage];
  const pageIndex = pageOrder.indexOf(currentPage);

  const onNavigate = (nextPage: PageId) => {
    setCurrentPage(nextPage);
    setActiveAnchor(null);
    setBookingRailSpotlight(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDemoPreview = () => {
    setDemoClosingOpen(false);
    setDemoPreviewOpen(true);
  };

  const startSelectedDemo = (script: DemoScript) => {
    setActiveDemoScript(script);
    setDemoPreviewOpen(false);
    setDemoClosingOpen(false);
    setDemoStatus("running");
  };

  const stopDemo = () => {
    setDemoStatus("idle");
    setDemoPreviewOpen(false);
    setDemoClosingOpen(false);
  };

  const disengageDemo = () => {
    setDemoStatus("idle");
    setDemoPreviewOpen(false);
    setDemoClosingOpen(false);
    setBookingRailSpotlight(false);
    setActiveFormSpotlight(null);
    window.dispatchEvent(new CustomEvent("guide-clear-spotlight"));
    setGuideDemoCommand((prev) => ({
      id: (prev?.id || 0) + 1,
      type: "got-it",
    }));
  };


  const jumpToAnchor = (anchorId: string) => {
    setActiveAnchor(anchorId);
    requestAnimationFrame(() => {
      const el = document.getElementById(anchorId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openBookingPanel = () => {
    setCurrentPage("booking");
    setActiveAnchor("booking-panel");
    window.setTimeout(() => {
      const el = document.getElementById("booking-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 220);
  };

  const onBookRoom = (section: Section) => {
    setSelectedRoom(section.id);
    openBookingPanel();
  };

  useEffect(() => {
    const handleGuideBook = (event: Event) => {
      const detail =
        (event as CustomEvent<{
          targetId?: string | null;
          commerceContext?: {
            dates?: { checkIn?: string; checkOut?: string; label?: string } | null;
            guests?: { adults?: number; children?: number; label?: string } | null;
            budget?: { band?: string } | null;
          };
        }>).detail || {};
      const targetId =
        detail.targetId || activeAnchor || selectedRoom || "room-business-king";
      const normalizedRoomId = roomStepOrder.includes(targetId)
        ? targetId
        : roomStepOrder.find((roomId) => targetId.startsWith(roomId)) ||
          selectedRoom ||
          "room-business-king";

      const context = detail.commerceContext || {};
      if (context.dates?.checkIn && context.dates?.checkOut) {
        setCheckInDate(context.dates.checkIn);
        setCheckOutDate(context.dates.checkOut);
        setDatesSelected(true);
        setActiveFormSpotlight(null);
      }

      if (context.guests) {
        setGuestLabel(context.guests.label || "1 guest");
        setGuestsSelected(true);
        setActiveFormSpotlight(null);
      }

      if (context.budget?.band) {
        setBudgetBand(context.budget.band);
      }

      setSelectedRoom(normalizedRoomId);
      setActiveFormSpotlight(null);
      setBookingRailSpotlight(true);
      openBookingPanel();
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(
          '[data-tour-id="booking-summary-card"]',
        );
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

        window.dispatchEvent(
          new CustomEvent("guide-spotlight-target", {
            detail: {
              targetId: "booking-summary-card",
              selector: '[data-tour-id="booking-summary-card"]',
            },
          }),
        );
      }, 620);
    };

    const handleSelectDates = () => {
      setActiveFormSpotlight(null);
      setBookingRailSpotlight(true);
      openBookingPanel();
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(
          '[data-tour-id="booking-missing-dates"]',
        );
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

        window.dispatchEvent(
          new CustomEvent("guide-spotlight-target", {
            detail: {
              targetId: "booking-missing-dates",
              selector: '[data-tour-id="booking-missing-dates"]',
            },
          }),
        );
      }, 620);
    };

    const handleAddGuests = () => {
      setGuestLabel("1 guest");
      setGuestsSelected(true);
      setActiveFormSpotlight("guests");
      setBookingRailSpotlight(true);
      openBookingPanel();
      window.setTimeout(() => {
        const el =
          document.querySelector<HTMLElement>(
            '[data-tour-id="booking-guests-module"]',
          ) ||
          document.querySelector<HTMLElement>(
            '[data-tour-id="booking-missing-guests"]',
          );
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 260);
    };

    window.addEventListener("guide-commerce-book", handleGuideBook);
    window.addEventListener("guide-commerce-select-dates", handleSelectDates);
    window.addEventListener("guide-commerce-add-guests", handleAddGuests);

    return () => {
      window.removeEventListener("guide-commerce-book", handleGuideBook);
      window.removeEventListener(
        "guide-commerce-select-dates",
        handleSelectDates,
      );
      window.removeEventListener("guide-commerce-add-guests", handleAddGuests);
    };
  }, [activeAnchor, selectedRoom]);

  const onNextRoomOption = (section: Section) => {
    const currentIndex = roomStepOrder.indexOf(section.id);
    const nextRoomId =
      roomStepOrder[(currentIndex + 1) % roomStepOrder.length] ||
      roomStepOrder[0];
    setCurrentPage("rooms");
    setActiveAnchor(nextRoomId);
    window.setTimeout(() => {
      const el = document.getElementById(nextRoomId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
  };

  const nextPage = pageOrder[pageIndex + 1] ?? null;
  const prevPage = pageOrder[pageIndex - 1] ?? null;
  const anchorButtons = useMemo(() => page.sections.slice(0, 7), [page]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef7fb_48%,#f8fafc_100%)] text-slate-950">
      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        demoStatus={demoStatus}
        onStartDemo={openDemoPreview}
        onPauseDemo={() => setDemoStatus("paused")}
        onResumeDemo={() => setDemoStatus("running")}
        onStopDemo={stopDemo}
      />

      <AnimatePresence>
        {demoPreviewOpen && demoStatus === "idle" && (
          <DemoPreviewCard
            title="Guided Commerce Demo"
            siteType="A synthetic hotel booking website with rooms, packages, amenities, and a booking summary."
            contentType="Room catalog, upgrade packages, guest/date/budget signals, and a preloaded booking handoff."
            guideShows="TourBot will walk through best-fit rooms and packages, collect or infer missing details, and carry intent into a booking summary."
            options={[
              {
                label: "Natural Language Booking",
                description: "A rich request becomes a recommended room, package, and preloaded booking summary.",
                onClick: () => startSelectedDemo(guidedCommerceRichIntentDemo),
              },
              {
                label: "Assisted Completion",
                description: "A sparse request produces passive chips for dates, guests, budget, and refinement.",
                onClick: () => startSelectedDemo(guidedCommerceAssistedCompletionDemo),
              },
            ]}
            onClose={() => setDemoPreviewOpen(false)}
          />
        )}
        {demoClosingOpen && demoStatus === "idle" && (
          <DemoClosingCard onClose={disengageDemo} />
        )}
      </AnimatePresence>

      <Hero page={page} />
      {currentPage === "home" && <HomeExtras />}

      <main className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {page.sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  emphasized={activeAnchor === section.id}
                  pageId={currentPage}
                  index={index}
                  selectedRoom={selectedRoom}
                  onBookRoom={onBookRoom}
                  onNextRoomOption={onNextRoomOption}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside
          className={`space-y-5 lg:sticky lg:top-24 lg:self-start ${
            bookingRailSpotlight ? "relative z-[9000]" : ""
          }`}
        >
          <Card>
            <div className="p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Page map
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Commerce anchors for spotlighting, guided steps, and
                booking-flow demos.
              </p>
              <div className="mt-4 space-y-2">
                {anchorButtons.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => jumpToAnchor(section.id)}
                    className={`flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition ${activeAnchor === section.id ? "border-slate-900 bg-slate-100 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {section.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {section.id}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div>
            <BookingMock
              compact={currentPage !== "booking"}
              selectedRoom={selectedRoom}
              datesSelected={datesSelected}
              guestsSelected={guestsSelected}
              guestLabel={guestLabel}
              budgetBand={budgetBand}
              activeFormSpotlight={activeFormSpotlight}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
            />
          </div>

          <Card
            className={`bg-gradient-to-br ${pageVisuals[currentPage].accent} text-white`}
          >
            <div className="p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
                Guided commerce rule
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-200">
                Book means commit intent, open the booking panel, preload known
                data, and expose missing fields without blocking momentum.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {prevPage && (
                  <Button
                    variant="outline"
                    onClick={() => onNavigate(prevPage)}
                    className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                  >
                    Previous
                  </Button>
                )}
                {nextPage && (
                  <Button
                    onClick={() => onNavigate(nextPage)}
                    className="bg-white text-slate-950 hover:bg-slate-100"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </aside>
      </main>

      <DemoController
        script={activeDemoScript}
        status={demoStatus}
        onStatusChange={setDemoStatus}
        onGuideCommand={setGuideDemoCommand}
        onFinished={() => setDemoClosingOpen(true)}
        finishDelayMs={5000}
      />
      <GuideShellStatic
        demoCommand={guideDemoCommand}
        guideConfig={commerceGuideConfig}
        suppressWelcomeCard={demoPreviewOpen || demoClosingOpen}
      />
    </div>
  );
}
