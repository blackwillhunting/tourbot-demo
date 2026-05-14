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
      className={`overflow-hidden rounded-[18px] border border-white/70 bg-white/92 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/[0.03] backdrop-blur sm:rounded-[30px] ${className}`}
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
    title: "Domi Coast Resort & Conference Hotel",
    subtitle: "AI-guided resort commerce playground",
    hero:
      "A synthetic 1,050-room coastal resort and conference hotel designed to prove Guided Commerce at real scale: property discovery, room/tower matching, package optimization, amenity routing, and booking preload.",
    sections: [
      {
        id: "travel-hero",
        eyebrow: "Large resort playground",
        title: "A stay planner for a property with real choice complexity",
        body:
          "Domi Coast combines oceanfront resort amenities with a major conference hotel footprint: three guest towers, villa inventory, family zones, quiet business floors, dining, spa, pools, shuttle service, and event support. TourBot can answer general property questions before narrowing guests toward the right stay.",
        tags: ["1,050 rooms", "3 towers", "Resort + conference"],
      },
      {
        id: "property-overview",
        eyebrow: "Core knowledge",
        title: "What the resort is known for",
        body:
          "The property is known for blending business logistics with vacation-style amenities: conference access, quiet work-ready floors, ocean-view leisure stays, family pool access, spa weekends, and extended-stay convenience.",
        tags: ["Oceanfront", "Conference center", "Family friendly"],
      },
      {
        id: "room-finder",
        eyebrow: "Search assist",
        title: "Room and tower matcher",
        body:
          "A guide can compare tower, view, budget, guest count, work needs, trip purpose, and arrival logistics before recommending a starting room instead of forcing visitors to browse every configuration.",
        tags: ["Tower", "View", "Budget", "Trip type"],
      },
      {
        id: "featured-stays",
        eyebrow: "Curated paths",
        title: "Common resort journeys",
        body:
          "The strongest paths include conference business travel, ocean-view anniversaries, family resort stays, longer visits, accessible stays, and villa-style premium trips. Each journey maps to rooms, packages, and amenity anchors.",
        tags: ["Conference", "Anniversary", "Family", "Long stay"],
      },
      {
        id: "booking-preview",
        eyebrow: "Preload behavior",
        title: "Booking preview",
        body:
          "When a user clicks Book, known context should carry forward: selected room, dates, guests, budget, package signals, and missing fields. The user keeps momentum instead of starting over in a generic form.",
        tags: ["Book this", "Partial form", "Missing fields"],
      },
    ],
  },
  rooms: {
    id: "rooms",
    title: "Rooms, Towers & Villas",
    subtitle: "A broad inventory field ranked by guest intent",
    hero:
      "Domi Coast has multiple stay zones: an executive conference tower, quiet coastal floors, family-friendly rooms, extended-stay studios, villas, and accessible options. TourBot can rank these based on what the guest actually needs.",
    sections: [
      {
        id: "room-business-king",
        eyebrow: "Best for work trips",
        title: "Business King Suite",
        price: "$289/night",
        body:
          "A quiet upper-floor king suite in the Executive Tower with ergonomic desk, fast Wi‑Fi, blackout curtains, lounge access, and easy conference-center routing.",
        details: ["King bed", "Executive Tower", "Desk + task lighting", "Lounge access", "Quiet wing"],
        tags: ["Quiet", "Business", "Wi‑Fi", "Desk"],
      },
      {
        id: "room-executive-tower-king",
        eyebrow: "Best for conferences",
        title: "Executive Tower King",
        price: "$259/night",
        body:
          "A practical conference-hotel room closest to meeting floors, elevators, lobby coffee, and business services. Strong for attendees who value logistics over views.",
        details: ["Conference tower", "Fast elevator access", "Lobby coffee", "Work desk"],
        tags: ["Conference", "Convenient", "Work", "Value"],
      },
      {
        id: "room-ocean-view-suite",
        eyebrow: "Best for leisure",
        title: "Ocean View Suite",
        price: "$379/night",
        body:
          "A larger suite with private balcony, ocean-facing seating area, soaking tub, and late checkout eligibility. Strong for romantic trips, views, and premium leisure stays.",
        details: ["Ocean balcony", "Soaking tub", "Late checkout", "Premium view"],
        tags: ["View", "Romantic", "Premium", "Balcony"],
      },
      {
        id: "room-family-double",
        eyebrow: "Best for families",
        title: "Family Double Room",
        price: "$249/night",
        body:
          "Two queen beds, extra floor space, a small dining nook, and easy access to the family pool wing. Practical for families that need comfort without suite pricing.",
        details: ["Two queens", "Sleeps 4", "Dining nook", "Near family pool"],
        tags: ["Family", "Group", "Value", "Pool access"],
      },
      {
        id: "room-extended-stay-studio",
        eyebrow: "Best for longer stays",
        title: "Extended Stay Studio",
        price: "$219/night",
        body:
          "A studio with kitchenette, laundry access, storage, and weekly-rate eligibility. Best for guests staying five nights or more or wanting a self-sufficient setup.",
        details: ["Kitchenette", "Weekly rate", "Laundry access", "Storage"],
        tags: ["Long stay", "Kitchenette", "Value", "Practical"],
      },
      {
        id: "room-garden-terrace",
        eyebrow: "Best value resort feel",
        title: "Garden Terrace King",
        price: "$239/night",
        body:
          "A quieter garden-facing room with terrace seating and easy access to walking paths. Good for guests who want a resort feel without paying for full oceanfront views.",
        details: ["Garden terrace", "Walking paths", "Quiet zone", "Good value"],
        tags: ["Garden", "Quiet", "Value", "Terrace"],
      },
      {
        id: "room-coastal-villa",
        eyebrow: "Best premium stay",
        title: "Coastal Villa Suite",
        price: "$549/night",
        body:
          "A villa-style suite with separate living space, resort shuttle pickup, premium views, and concierge support. Strong for anniversaries, VIP stays, and longer premium trips.",
        details: ["Separate living room", "Concierge", "Premium view", "Resort shuttle"],
        tags: ["Villa", "Premium", "Concierge", "Anniversary"],
      },
      {
        id: "room-accessible-king",
        eyebrow: "Best accessible option",
        title: "Accessible King Room",
        price: "$229/night",
        body:
          "A step-free king room near main elevators with accessible bathroom features and close routing to lobby, dining, and shuttle pickup areas.",
        details: ["Step-free route", "Accessible bath", "Near elevator", "Lobby access"],
        tags: ["Accessible", "Elevator", "Practical", "King"],
      },
    ],
  },
  packages: {
    id: "packages",
    title: "Packages & Stay Add-ons",
    subtitle: "Deals and upgrades layered onto the stay decision",
    hero:
      "Packages turn discovery into commerce. The guide can attach breakfast, business services, conference convenience, family support, spa upgrades, transfer bundles, or romance amenities after the room path is clear.",
    sections: [
      {
        id: "package-business-ready",
        eyebrow: "Work upgrade",
        title: "Business Ready Package",
        price: "+$45/night",
        body:
          "Includes breakfast, meeting pod credit, premium Wi‑Fi tier, and 6pm late checkout. Best paired with Business King or Executive Tower rooms.",
        details: ["Breakfast", "Meeting pod credit", "Premium Wi‑Fi", "Late checkout"],
        tags: ["Business", "Meetings", "Productivity"],
      },
      {
        id: "package-conference-convenience",
        eyebrow: "Event upgrade",
        title: "Conference Convenience Package",
        price: "+$65/stay",
        body:
          "Adds early coffee, badge pickup support, conference-floor wayfinding, bag hold, and late checkout priority for event attendees.",
        details: ["Badge pickup", "Bag hold", "Early coffee", "Late checkout priority"],
        tags: ["Conference", "Logistics", "Convenience"],
      },
      {
        id: "package-breakfast-flex",
        eyebrow: "Meal plan",
        title: "Breakfast Flex Plan",
        price: "+$32/night",
        body:
          "Daily breakfast credit that works across the lobby café, buffet, and grab-and-go market. Useful when guests mention breakfast but not a full package.",
        details: ["Daily credit", "Café", "Buffet", "Grab-and-go"],
        tags: ["Breakfast", "Flexible", "Value"],
      },
      {
        id: "package-relaxation-weekend",
        eyebrow: "Leisure upgrade",
        title: "Relaxation Weekend Package",
        price: "+$95/stay",
        body:
          "Includes spa credit, welcome drinks, breakfast for two, and guaranteed late checkout. Best for romantic weekends or premium leisure stays.",
        details: ["Spa credit", "Welcome drinks", "Breakfast for two", "Late checkout"],
        tags: ["Romantic", "Spa", "Weekend"],
      },
      {
        id: "package-family-comfort",
        eyebrow: "Family upgrade",
        title: "Family Comfort Bundle",
        price: "+$55/stay",
        body:
          "Adds parking, snack credit, extra towels, pool wristbands, and flexible check-in support. Best for families arriving with children or extra luggage.",
        details: ["Parking", "Snack credit", "Pool wristbands", "Flexible arrival"],
        tags: ["Family", "Parking", "Convenience"],
      },
      {
        id: "package-transfer-parking",
        eyebrow: "Arrival bundle",
        title: "Transfer + Parking Bundle",
        price: "+$40/stay",
        body:
          "Combines airport shuttle priority, secured parking discount, and luggage hold for guests juggling arrival logistics.",
        details: ["Shuttle priority", "Parking discount", "Luggage hold", "Arrival support"],
        tags: ["Shuttle", "Parking", "Arrival"],
      },
    ],
  },
  amenities: {
    id: "amenities",
    title: "Amenities & Experiences",
    subtitle: "Property knowledge that explains the recommendation",
    hero:
      "A resort guide needs more than inventory. Amenities, dining, events, transportation, policies, and trip-style signals explain why one stay path is better than another.",
    sections: [
      {
        id: "amenity-quiet-zone",
        eyebrow: "Noise control",
        title: "Quiet Zone Floors",
        body:
          "Upper-floor rooms away from elevators and event spaces are marked as quiet-zone eligible. This is a major signal for business travelers and light sleepers.",
        tags: ["Quiet", "Upper floor", "Sleep"],
      },
      {
        id: "amenity-conference-center",
        eyebrow: "Events",
        title: "Conference Center",
        body:
          "The property includes a connected conference wing with ballroom space, breakout rooms, badge pickup, coffee stations, and direct routing from the Executive Tower.",
        tags: ["Conference", "Events", "Ballroom"],
      },
      {
        id: "amenity-work-lounge",
        eyebrow: "Productivity",
        title: "Work Lounge & Meeting Pods",
        body:
          "Semi-private work pods, coffee service, printing support, and reservable meeting space create a stronger business-travel experience.",
        tags: ["Work", "Meetings", "Coffee"],
      },
      {
        id: "amenity-pool-spa",
        eyebrow: "Relaxation",
        title: "Pool, Spa & Rooftop Deck",
        body:
          "The leisure layer includes a family pool, quieter rooftop deck, spa treatment rooms, and evening deck service for couples or premium leisure guests.",
        tags: ["Spa", "Pool", "Rooftop"],
      },
      {
        id: "amenity-dining-district",
        eyebrow: "Dining",
        title: "Dining District",
        body:
          "Guests can choose lobby café breakfast, coastal seafood dining, a market for quick meals, poolside service, and private dining options for events or special occasions.",
        tags: ["Breakfast", "Seafood", "Poolside"],
      },
      {
        id: "amenity-kids-club",
        eyebrow: "Family",
        title: "Kids Club & Family Pool",
        body:
          "Family travelers can use supervised activity windows, splash-zone access, snack credits, and family pool routing near the family room wing.",
        tags: ["Kids", "Pool", "Family"],
      },
      {
        id: "amenity-airport-shuttle",
        eyebrow: "Arrival support",
        title: "Airport Shuttle & Parking",
        body:
          "A predictable shuttle and secured parking make arrival easier for business travelers, families, conference attendees, and guests with rental cars.",
        tags: ["Shuttle", "Parking", "Arrival"],
      },
      {
        id: "amenity-accessibility-pets",
        eyebrow: "Policy support",
        title: "Accessibility & Pet-Friendly Stays",
        body:
          "Accessible room routing, step-free public areas, service animal support, and limited pet-friendly room blocks help the guide answer practical pre-booking questions.",
        tags: ["Accessibility", "Pets", "Policies"],
      },
    ],
  },
  booking: {
    id: "booking",
    title: "Booking Panel",
    subtitle: "Preloaded summary with missing-field completion",
    hero:
      "The booking module demonstrates the commercial layer: Book commits intent, opens the form, preloads known data, and highlights missing required fields without blocking the user.",
    sections: [
      {
        id: "booking-panel",
        eyebrow: "Checkout preload",
        title: "Booking Summary",
        body:
          "The selected room is carried into the booking panel. If dates, guests, budget, package, or arrival needs are missing, the module shows them as required next steps while preserving momentum.",
        tags: ["Selected room", "Dates required", "Guests required", "Ready for payment"],
      },
      {
        id: "booking-missing-fields",
        eyebrow: "Completion chips",
        title: "Missing details",
        body:
          "Incomplete input becomes completion guidance: Select dates, add guests, adjust budget, choose a package, or change room. The user is not pushed backward into chat.",
        tags: ["Select dates", "Add guests", "Adjust budget"],
      },
      {
        id: "payment-module",
        eyebrow: "Mock payment",
        title: "Payment module",
        body:
          "A simulated payment area shows how the final step could become transactional once room, dates, guests, policies, and package choices are confirmed.",
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
    eyebrow: "Resort + conference intelligence",
    gradient: "from-cyan-950 via-slate-900 to-indigo-900",
    accent: "from-cyan-950 to-slate-800",
    metricA: "1,050 rooms",
    metricB: "3 towers + villas",
    proof: "Discovery + booking",
  },
  rooms: {
    eyebrow: "Room, tower, and villa inventory",
    gradient: "from-indigo-950 via-slate-900 to-cyan-900",
    accent: "from-indigo-950 to-cyan-800",
    metricA: "8 room anchors",
    metricB: "Tower + view logic",
    proof: "Ranked by intent",
  },
  packages: {
    eyebrow: "Deal and upgrade routing",
    gradient: "from-violet-950 via-slate-900 to-rose-900",
    accent: "from-violet-950 to-rose-800",
    metricA: "Business · leisure",
    metricB: "Family · events",
    proof: "Layered add-ons",
  },
  amenities: {
    eyebrow: "Property knowledge layer",
    gradient: "from-emerald-950 via-slate-900 to-cyan-900",
    accent: "from-emerald-950 to-cyan-800",
    metricA: "Dining · spa",
    metricB: "Kids · conference",
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
    chips: ["1,050 rooms", "3 towers", "Resort"],
    shape: "hero",
  },
  "property-overview": {
    icon: Hotel,
    tone: "from-slate-950 to-cyan-800",
    chips: ["Property", "Known for", "Discovery"],
    shape: "feature",
  },
  "room-finder": {
    icon: Search,
    tone: "from-slate-950 to-cyan-800",
    chips: ["Tower", "View", "Budget"],
    shape: "feature",
  },
  "featured-stays": {
    icon: Sparkles,
    tone: "from-indigo-950 to-violet-800",
    chips: ["Conference", "Family", "Anniversary"],
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
  "room-executive-tower-king": {
    icon: Hotel,
    tone: "from-indigo-950 to-slate-800",
    chips: ["Conference", "Convenient", "Work"],
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
  "room-garden-terrace": {
    icon: Moon,
    tone: "from-emerald-950 to-cyan-800",
    chips: ["Garden", "Quiet", "Value"],
    shape: "room",
  },
  "room-coastal-villa": {
    icon: Sparkles,
    tone: "from-violet-950 to-cyan-800",
    chips: ["Villa", "Concierge", "Premium"],
    shape: "room",
  },
  "room-accessible-king": {
    icon: Hotel,
    tone: "from-slate-950 to-emerald-800",
    chips: ["Accessible", "Elevator", "Practical"],
    shape: "room",
  },
  "package-business-ready": {
    icon: Coffee,
    tone: "from-slate-950 to-indigo-800",
    chips: ["Breakfast", "Meeting pod", "Late checkout"],
    shape: "dark",
  },
  "package-conference-convenience": {
    icon: CalendarDays,
    tone: "from-indigo-950 to-slate-800",
    chips: ["Badge", "Bag hold", "Events"],
    shape: "dark",
  },
  "package-breakfast-flex": {
    icon: Coffee,
    tone: "from-amber-900 to-slate-800",
    chips: ["Breakfast", "Café", "Flexible"],
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
    chips: ["Parking", "Pool", "Family"],
    shape: "dark",
  },
  "package-transfer-parking": {
    icon: Plane,
    tone: "from-cyan-950 to-slate-800",
    chips: ["Shuttle", "Parking", "Arrival"],
    shape: "dark",
  },
  "amenity-quiet-zone": {
    icon: Moon,
    tone: "from-slate-950 to-blue-800",
    chips: ["Sleep", "Quiet", "Upper floor"],
    shape: "feature",
  },
  "amenity-conference-center": {
    icon: CalendarDays,
    tone: "from-indigo-950 to-slate-800",
    chips: ["Conference", "Events", "Ballroom"],
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
  "amenity-dining-district": {
    icon: Coffee,
    tone: "from-rose-950 to-amber-800",
    chips: ["Breakfast", "Seafood", "Poolside"],
    shape: "feature",
  },
  "amenity-kids-club": {
    icon: Users,
    tone: "from-emerald-950 to-teal-700",
    chips: ["Kids", "Pool", "Family"],
    shape: "feature",
  },
  "amenity-airport-shuttle": {
    icon: Plane,
    tone: "from-amber-900 to-slate-800",
    chips: ["Shuttle", "Parking", "Arrival"],
    shape: "feature",
  },
  "amenity-accessibility-pets": {
    icon: Hotel,
    tone: "from-slate-950 to-emerald-800",
    chips: ["Accessibility", "Pets", "Policies"],
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
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2.5 sm:px-6 md:flex-row md:items-center md:justify-between md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight sm:text-lg">
              Domi Coast Resort
            </div>
            <div className="truncate text-xs text-slate-500 sm:text-sm">
              Resort commerce playground
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
                Self-Drive Stay
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

        <nav className="flex w-full gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === currentPage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={
                  "inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition " +
                  (active
                    ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                    : "border-slate-200 bg-white/80 text-slate-700 hover:bg-white")
                }
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Hero({ page }: { page: Page }) {
  const visual = pageVisuals[page.id];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-3 pt-3 sm:px-6 sm:pb-10 sm:pt-10">
      <div
        className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${visual.gradient} px-3 py-4 text-white shadow-2xl shadow-slate-300/40 sm:rounded-[40px] sm:px-6 sm:py-8 md:px-10 md:py-12`}
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative grid gap-2 sm:gap-8 lg:grid-cols-[1.18fr_0.82fr] lg:items-end">
          <div>
            <div className="mb-1.5 inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 sm:mb-4 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
              {visual.eyebrow}
            </div>
            <h1 className="max-w-4xl text-xl font-semibold tracking-tight sm:text-4xl md:text-6xl">
              {page.title}
            </h1>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
              {page.hero}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-7 sm:gap-3">
              {[visual.metricA, visual.metricB, visual.proof].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/90 sm:px-4 sm:py-2 sm:text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            id="hero-booking-widget"
            data-tour-id="hero-booking-widget"
            className="rounded-[16px] border border-white/15 bg-white/12 p-3 shadow-2xl backdrop-blur sm:rounded-[32px] sm:p-5"
          >
            <div className="mb-2 flex items-center justify-between sm:mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Stay planner
                </div>
                <div className="mt-1 text-base font-semibold sm:text-xl">
                  Tell us the trip
                </div>
              </div>
              <Search className="h-5 w-5 text-white/70" />
            </div>
            <div className="grid gap-2">
              {[
                "Conference stay with quiet nights",
                "Ocean view without villa pricing",
                "Family pool access + breakfast",
                "Airport shuttle and late arrival",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-[11px] text-slate-100 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-950 sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
              Ask about the resort → compare options → booking preloads
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
      title: "Conference business stay",
      icon: Wifi,
      text: "Prioritizes Executive Tower access, quiet floors, breakfast, and late checkout.",
      tone: "from-slate-950 to-cyan-800",
    },
    {
      title: "Anniversary coast weekend",
      icon: Waves,
      text: "Balances view quality, spa access, dining, and package value without defaulting to the villa.",
      tone: "from-blue-950 to-violet-800",
    },
    {
      title: "Family resort trip",
      icon: Users,
      text: "Connects family rooms, pool access, kids club, parking, snacks, and arrival support.",
      tone: "from-emerald-950 to-teal-700",
    },
    {
      title: "Longer value stay",
      icon: Luggage,
      text: "Surfaces studios, weekly rates, laundry, kitchenette access, and practical add-ons.",
      tone: "from-amber-900 to-slate-800",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 sm:pb-10">
      <div className="mb-3 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-sm sm:tracking-[0.18em]">
            Guided paths
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-2xl">
            Resort journeys that need discovery before booking
          </h2>
        </div>
        <div className="hidden rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm md:block">
          Built for guided optimization
        </div>
      </div>

      <div className="grid gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {paths.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <div className="p-3 sm:p-6">
                <div
                  className={`mb-2 inline-flex rounded-lg bg-gradient-to-br ${item.tone} p-2 text-white shadow-sm sm:mb-5 sm:rounded-2xl sm:p-3`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="text-sm font-semibold sm:text-lg">{item.title}</div>
                <p className="mt-1.5 text-xs leading-4 text-slate-600 sm:leading-6">
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
  "room-executive-tower-king": {
    title: "Executive Tower King",
    price: "$259/night",
    signal: "Conference access and practical business logistics",
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
  "room-garden-terrace": {
    title: "Garden Terrace King",
    price: "$239/night",
    signal: "Quiet resort feel without oceanfront pricing",
  },
  "room-coastal-villa": {
    title: "Coastal Villa Suite",
    price: "$549/night",
    signal: "Premium villa-style stay with concierge support",
  },
  "room-accessible-king": {
    title: "Accessible King Room",
    price: "$229/night",
    signal: "Step-free practical room near key resort routes",
  },
};

const roomStepOrder = [
  "room-business-king",
  "room-executive-tower-king",
  "room-ocean-view-suite",
  "room-family-double",
  "room-extended-stay-studio",
  "room-garden-terrace",
  "room-coastal-villa",
  "room-accessible-king",
];

function getRoomMeta(roomId?: string | null) {
  if (!roomId) return null;
  return roomBookingMeta[roomId] || null;
}

const packageBookingMeta: Record<
  string,
  { title: string; price: string; signal: string }
> = Object.fromEntries(
  PAGES.packages.sections.map((section) => [
    section.id,
    {
      title: section.title,
      price: section.price || "",
      signal: section.eyebrow || "Package add-on",
    },
  ]),
);

function getPackageMeta(packageId?: string | null) {
  if (!packageId) return null;
  return packageBookingMeta[packageId] || null;
}

function normalizeBookingPackageIds(values?: Array<string | null | undefined> | null) {
  const seen = new Set<string>();
  return (values || [])
    .map((value) => String(value || "").trim())
    .filter((value) => value && Boolean(packageBookingMeta[value]))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function parseBookingPrice(price?: string | null) {
  const text = price || "";
  const match = text.match(/\$([0-9,]+(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const unit = /stay/i.test(text) ? "per_stay" : "per_night";
  return { amount, unit };
}

function formatBookingCurrency(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "Pending";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function bookingNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return null;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return nights > 0 ? nights : null;
}

function lineTotalForBookingPrice(price: string | undefined, nights: number | null) {
  const parsed = parseBookingPrice(price);
  if (!parsed) return null;
  if (parsed.unit === "per_stay") return parsed.amount;
  if (!nights) return null;
  return parsed.amount * nights;
}

function bookingRateLabel(price?: string | null, nights?: number | null) {
  const parsed = parseBookingPrice(price);
  if (!parsed) return price || "Pending";
  if (parsed.unit === "per_stay") return `$${parsed.amount}/stay`;
  return nights ? `$${parsed.amount} × ${nights} night${nights === 1 ? "" : "s"}` : `$${parsed.amount}/night`;
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
  selectedPackages = [],
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
  selectedPackages?: string[];
  datesSelected?: boolean;
  guestsSelected?: boolean;
  activeFormSpotlight?: "guests" | null;
  guestLabel?: string;
  budgetBand?: string;
  checkInDate: string;
  checkOutDate: string;
}) {
  const roomMeta = getRoomMeta(selectedRoom);
  const packageItems = normalizeBookingPackageIds(selectedPackages)
    .map((packageId) => ({ packageId, meta: getPackageMeta(packageId) }))
    .filter((item): item is { packageId: string; meta: NonNullable<ReturnType<typeof getPackageMeta>> } => Boolean(item.meta));
  const missingItems = [
    !datesSelected ? "Select dates" : null,
    !guestsSelected ? "Add guests" : null,
  ].filter(Boolean) as string[];
  const dateLabel = formatBookingDateRange(checkInDate, checkOutDate);
  const nights = datesSelected ? bookingNights(checkInDate, checkOutDate) : null;
  const roomSubtotal = roomMeta ? lineTotalForBookingPrice(roomMeta.price, nights) : null;
  const packageSubtotal = packageItems.reduce((total, item) => {
    const lineTotal = lineTotalForBookingPrice(item.meta.price, nights);
    return total + (lineTotal || 0);
  }, 0);
  const estimatedSubtotal = roomSubtotal == null ? null : roomSubtotal + packageSubtotal;
  const nightsLabel = nights ? `${nights} night${nights === 1 ? "" : "s"}` : "Dates required";

  return (
    <div
      id="booking-summary-card"
      data-tour-id="booking-summary-card"
      className="relative rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm transition sm:rounded-[28px] sm:p-5"
    >
      <div
        data-tour-id="booking-panel-main"
        className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Reservation draft
          </div>
          <div className="mt-1 text-base font-semibold text-slate-950">
            {roomMeta?.title || "No room selected"}
          </div>
          {roomMeta && !compact && (
            <div className="mt-1 text-xs font-medium text-slate-500">
              {roomMeta.signal}
            </div>
          )}
        </div>
        <CreditCard className="mt-1 h-5 w-5 text-slate-500" />
      </div>

      <div className="mt-2 space-y-1 text-[11px] sm:mt-4 sm:space-y-2 sm:text-sm">
        <div
          data-tour-id="booking-selected-room"
          className={`flex justify-between rounded-lg px-2.5 py-1.5 sm:rounded-2xl sm:py-2 ${
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
          className={`flex justify-between rounded-lg px-2.5 py-1.5 sm:rounded-2xl sm:py-2 ${
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
          className={`flex justify-between rounded-lg px-2.5 py-1.5 sm:rounded-2xl sm:py-2 ${
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
            className={`relative rounded-xl border p-2.5 text-xs transition sm:rounded-2xl sm:p-3 sm:text-sm ${
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
            className={`flex justify-between rounded-lg px-2.5 py-1.5 sm:rounded-2xl sm:py-2 ${
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
            data-tour-id="booking-package-summary"
            className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-slate-700"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Packages
              </span>
              <strong className="text-xs text-slate-900">
                {packageItems.length ? `${packageItems.length} selected` : "None selected"}
              </strong>
            </div>
            {packageItems.length ? (
              <div className="space-y-1.5">
                {packageItems.map(({ packageId, meta }) => {
                  const lineTotal = lineTotalForBookingPrice(meta.price, nights);
                  return (
                    <div key={packageId} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-900">{meta.title}</div>
                        <div className="text-[11px] text-slate-500">{bookingRateLabel(meta.price, nights)}</div>
                      </div>
                      <strong className="shrink-0 text-xs text-slate-900">
                        {lineTotal == null ? meta.price : formatBookingCurrency(lineTotal)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500">No packages or add-ons have been added yet.</div>
            )}
          </div>
        )}

        {!compact && (
          <div
            data-tour-id="booking-estimate"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 shadow-sm"
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Stay charges
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span>Room subtotal</span>
                <strong className="text-slate-900">
                  {roomMeta && nights ? `${bookingRateLabel(roomMeta.price, nights)} · ${formatBookingCurrency(roomSubtotal)}` : roomMeta?.price || "Pending"}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Package subtotal</span>
                <strong className="text-slate-900">
                  {packageItems.length ? formatBookingCurrency(packageSubtotal) : "$0"}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-1.5">
                <span className="font-semibold text-slate-900">Estimated stay subtotal</span>
                <strong className="text-sm text-slate-950">{formatBookingCurrency(estimatedSubtotal)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>Taxes & fees</span>
                <strong className="font-semibold text-slate-500">Calculated at checkout</strong>
              </div>
              <div className="text-[11px] text-slate-500">{nightsLabel}</div>
            </div>
          </div>
        )}
      </div>

      <div
        data-tour-id="booking-completion-chips"
        className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2"
      >
        {missingItems.length > 0 ? (
          missingItems.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 sm:px-3 sm:py-1 sm:text-xs"
            >
              {chip}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:px-3 sm:py-1 sm:text-xs">
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
  const mobileChips = (section.tags || visual.chips).slice(0, 3);
  const mobileSignal = section.price
    ? `${section.price} · ${visual.chips.slice(0, 2).join(" · ")}`
    : visual.chips.slice(0, 2).join(" · ");

  return (
    <motion.section
      id={section.id}
      data-tour-id={section.id}
      layout
      initial={false}
      animate={{ scale: emphasized || isSelectedRoom ? 1.012 : 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="scroll-mt-20 sm:scroll-mt-28"
    >
      <Card
        className={`md:hidden transition-all ${
          emphasized
            ? "border-slate-900 ring-2 ring-slate-300 shadow-2xl shadow-slate-300/60"
            : "border-slate-200 ring-1 ring-slate-200/80"
        } ${
          isSelectedRoom
            ? "border-cyan-800 ring-2 ring-cyan-300 shadow-2xl shadow-cyan-200/70"
            : ""
        }`}
      >
        <div className={`h-1.5 bg-gradient-to-r ${visual.tone}`} />
        <div className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${visual.tone} text-white shadow-sm`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {section.eyebrow || `${pageId} / ${String(index + 1).padStart(2, "0")}`}
                </div>
                <h2 className="mt-0.5 text-[15px] font-semibold leading-5 tracking-tight text-slate-950">
                  {section.title}
                </h2>
              </div>
            </div>
            {section.price && (
              <div className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                {section.price}
              </div>
            )}
          </div>

          {mobileSignal && !section.price && (
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-slate-400">
              {mobileSignal}
            </div>
          )}

          <p className="mt-2 overflow-hidden text-xs leading-4 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {section.body}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {mobileChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
              >
                {chip}
              </span>
            ))}
          </div>

          {isRecommendedStart && (
            <div className="mt-2 inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
              Recommended start
            </div>
          )}

          {isRoom && (
            <div
              data-tour-id={`${section.id}-cta`}
              className="mt-3 flex gap-1.5"
            >
              <button
                type="button"
                onClick={() => onBookRoom?.(section)}
                className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                Book this
              </button>
              <button
                type="button"
                onClick={() => onNextRoomOption?.(section)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
              >
                Next option
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card
        className={`hidden md:block ${
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
            <div className="relative min-h-[96px] overflow-hidden border-b text-white sm:min-h-[240px] md:min-h-[280px] md:border-b-0 md:border-r md:border-white/10">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${visual.tone}`}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.42),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_45%)]" />
              <div className="absolute bottom-3 right-3 h-12 w-12 rounded-[26px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur sm:bottom-5 sm:right-5 sm:h-28 sm:w-28 sm:rounded-[34px]" />
              <div className="absolute bottom-6 right-8 h-8 w-8 rotate-12 rounded-[18px] border border-white/10 bg-white/10 sm:bottom-10 sm:right-12 sm:h-16 sm:w-16 sm:rounded-[24px]" />

              <div className="relative z-10 flex h-full min-h-[96px] flex-row items-end justify-between gap-3 p-3 sm:flex-col sm:items-stretch sm:min-h-[240px] sm:p-5 md:min-h-[280px] md:p-6">
                <div>
                  <div className="inline-flex rounded-xl bg-white/15 p-2 text-white shadow-sm backdrop-blur sm:rounded-2xl sm:p-3">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70 sm:mt-5 sm:text-[11px] sm:tracking-[0.18em]">
                    {section.eyebrow ||
                      `${pageId} / ${String(index + 1).padStart(2, "0")}`}
                  </div>
                  <div className="mt-1 hidden break-all text-xs text-white/65 sm:block">
                    #{section.id}
                  </div>
                </div>

                <div>
                  {isSelectedRoom && (
                    <div className="mb-1.5 inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-50 ring-1 ring-emerald-200/30">
                      Selected for booking
                    </div>
                  )}
                  {section.price && (
                    <div className="text-lg font-semibold tracking-tight sm:text-3xl">
                      {section.price}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] font-medium text-white/70">
                    Premium commerce object
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`${dark ? "border-white/10 bg-white/10" : `bg-gradient-to-br ${visual.tone} text-white`} min-h-[86px] border-b p-3 sm:min-h-[190px] md:min-h-[220px] md:border-b-0 md:border-r md:p-6`}
            >
              <div className="inline-flex rounded-xl bg-white/15 p-2 text-white shadow-sm sm:rounded-2xl sm:p-3">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">
                {section.eyebrow ||
                  `${pageId} / ${String(index + 1).padStart(2, "0")}`}
              </div>
              <div className="mt-1 hidden break-all text-xs text-white/65 sm:block">
                #{section.id}
              </div>
              {section.price && (
                <div className="mt-2 text-lg font-semibold tracking-tight sm:mt-5 sm:text-3xl">
                  {section.price}
                </div>
              )}
            </div>
          )}

          <div className="p-3 sm:p-5 md:p-8">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(section.tags || visual.chips).map((chip) => (
                <span
                  key={chip}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs ${dark ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"}`}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div data-tour-id={isRoom ? `${section.id}-details` : undefined}>
              <h2
                className={`mt-2 text-lg font-semibold tracking-tight sm:mt-4 sm:text-2xl ${dark ? "text-white" : "text-slate-950"}`}
              >
                {section.title}
              </h2>
              {isRecommendedStart && (
                <div className="mt-1.5 inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                  Recommended starting point for quiet business travel
                </div>
              )}
              <p
                className={`mt-2 max-w-4xl text-[13px] leading-5 sm:mt-4 sm:text-base sm:leading-8 ${dark ? "text-slate-200" : "text-slate-600"}`}
              >
                {section.body}
              </p>
            </div>

            {section.details?.length ? (
              <div className="mt-3 grid gap-1.5 sm:mt-6 sm:gap-3 sm:grid-cols-2">
                {section.details.map((detail) => (
                  <div
                    key={detail}
                    className={`rounded-lg p-2 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                  >
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-[0.11em] sm:text-xs sm:tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}
                    >
                      Included
                    </div>
                    <div className="mt-1 text-xs font-semibold sm:mt-2 sm:text-sm">{detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid gap-1.5 sm:mt-6 sm:gap-3 sm:grid-cols-2">
                <div
                  className={`rounded-lg p-2 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                >
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-[0.11em] sm:text-xs sm:tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}
                  >
                    Guide signal
                  </div>
                  <div className="mt-1 text-xs font-semibold sm:mt-2 sm:text-sm">
                    Anchor-ready commerce stop
                  </div>
                </div>
                <div
                  className={`rounded-lg p-2 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                >
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-[0.11em] sm:text-xs sm:tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}
                  >
                    Action
                  </div>
                  <div className="mt-1 text-xs font-semibold sm:mt-2 sm:text-sm">
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
                className="mt-4 flex flex-wrap gap-1.5 sm:gap-2 sm:mt-6 sm:gap-3"
              >
                {isRoom ? (
                  <>
                    <Button
                      onClick={() => onBookRoom?.(section)}
                      className="rounded-full px-4 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm"
                    >
                      Book this room
                    </Button>
                    <Button
                      onClick={() => onNextRoomOption?.(section)}
                      variant="outline"
                      className="rounded-full px-4 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm"
                    >
                      See next option →
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      data-demo-target="booking-continue"
                      className="rounded-full px-4 py-1.5 text-xs sm:px-5 sm:py-2 sm:text-sm"
                    >
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
  options,
  onClose,
}: {
  title: string;
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
      </div>
      <div className="space-y-3 px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5">
        <p className="text-sm font-medium leading-6 text-slate-600">
          Click below to start a demo.
        </p>
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
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
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
    setSelectedPackages([]);
    openBookingPanel();
  };

  useEffect(() => {
    const handleGuideBook = (event: Event) => {
      const detail =
        (event as CustomEvent<{
          targetId?: string | null;
          packageIds?: Array<string | null | undefined>;
          stayPlan?: {
            packages?: Array<{ targetId?: string | null }>;
          } | null;
          commerceContext?: {
            dates?: { checkIn?: string; checkOut?: string; label?: string } | null;
            guests?: { adults?: number; children?: number; label?: string } | null;
            budget?: { band?: string } | null;
            savedTrip?: {
              packages?: Array<{ targetId?: string | null }>;
            } | null;
          };
        }>).detail || {};
      const targetId =
        detail.targetId || activeAnchor || selectedRoom || "room-business-king";
      const normalizedRoomId = roomStepOrder.includes(targetId)
        ? targetId
        : roomStepOrder.find((roomId) => targetId.startsWith(roomId)) ||
          selectedRoom ||
          "room-business-king";
      const normalizedPackageIds = normalizeBookingPackageIds([
        ...(detail.packageIds || []),
        ...((detail.stayPlan?.packages || []).map((item) => item?.targetId)),
        ...((detail.commerceContext?.savedTrip?.packages || []).map((item) => item?.targetId)),
      ]);

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
      setSelectedPackages(normalizedPackageIds);
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
            options={[
              {
                label: "Natural Language Booking",
                description: "A rich resort request becomes a recommended room, package, and preloaded booking summary.",
                onClick: () => startSelectedDemo(guidedCommerceRichIntentDemo),
              },
              {
                label: "Assisted Completion",
                description: "A sparse stay request produces passive chips for dates, guests, budget, and refinement.",
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

      <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div className="space-y-4 sm:space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-5"
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
            <div className="p-3 sm:p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Page map
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Commerce anchors for spotlighting, guided steps, and
                booking-flow demos.
              </p>
              <div className="mt-3 space-y-2 sm:mt-4">
                {anchorButtons.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => jumpToAnchor(section.id)}
                    className={`flex w-full items-start justify-between rounded-xl border px-3 py-2.5 text-left transition sm:rounded-2xl sm:px-4 sm:py-3 ${activeAnchor === section.id ? "border-slate-900 bg-slate-100 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}
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
              selectedPackages={selectedPackages}
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
            <div className="p-3 sm:p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
                Guided commerce rule
              </div>
              <p className="mt-3 text-sm leading-5 text-slate-200 sm:mt-4 sm:leading-6">
                Book means commit intent, open the booking panel, preload known
                stay context, and expose missing fields without blocking momentum.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
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
        demoStatus={demoStatus}
      />
    </div>
  );
}
