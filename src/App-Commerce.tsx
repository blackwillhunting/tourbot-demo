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
  Pencil,
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
import TourBarBooking from "./components/tourbar/TourBarBooking";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "./components/tourbar/smartbarFocusController";
import type {
  TourBarShellActions,
  TourBarShellResult,
  TourBarShellTurnContext,
} from "./components/tourbar/TourBarShell";
import DemoController, { type DemoStatus } from "./demo/DemoController";
import {
  guidedCommerceRichIntentDemo,
  guidedCommerceAssistedCompletionDemo,
  type DemoScript,
} from "./demo/demoScripts";
import { commerceGuideConfig } from "./commerce/commerceGuideConfig";

const TOURBAR_HOTEL_BOOKING_ENDPOINT = "/api/guide_ai";
const TOURBAR_HOTEL_BOOKING_MODE = "tourbar_hotel_booking";

type TourBarHotelBookingBackendResponse = Record<string, any>;

type AppCommerceProps = {
  tourBarMode?: boolean;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asRecordArray(value: unknown): Record<string, any>[] {
  return Array.isArray(value)
    ? value
        .map((item) => asRecord(item))
        .filter((item) => Object.keys(item).length > 0)
    : [];
}

function guestCountFromLabel(label: string): number | null {
  const direct = Number(label);
  if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);

  const numbers = Array.from(label.matchAll(/\d+/g)).map((match) => Number(match[0]));
  if (!numbers.length) return null;

  // Labels like "2 adults, 1 child" should carry the total guest count.
  if (/adult|child|children|kid|guest|people|traveler|traveller/i.test(label)) {
    return numbers.reduce((total, value) => total + value, 0);
  }

  return numbers[0] || null;
}

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
      className={`overflow-hidden rounded-[18px] border border-white/35 bg-slate-50/82 shadow-sm shadow-slate-950/20 ring-1 ring-white/[0.08] backdrop-blur sm:rounded-[30px] ${className}`}
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
  showDemoControls = true,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  demoStatus: DemoStatus;
  onStartDemo: () => void;
  onPauseDemo: () => void;
  onResumeDemo: () => void;
  onStopDemo: () => void;
  showDemoControls?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2.5 sm:px-6 md:flex-row md:items-center md:justify-between md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-sm shadow-slate-950/30 sm:h-11 sm:w-11">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight sm:text-lg">
              Domi Coast Resort
            </div>
            <div className="truncate text-xs text-slate-400 sm:text-sm">
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

          {showDemoControls && (
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 p-1 shadow-sm shadow-slate-950/30">
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
                  className="rounded-full px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Stop
                </button>
              )}
            </div>
          )}
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
                    : "border-slate-700 bg-slate-900/75 text-slate-200 hover:bg-slate-800")
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
        className={`relative overflow-hidden rounded-[20px] bg-gradient-to-br ${visual.gradient} px-3 py-4 text-white shadow-2xl shadow-slate-950/50 sm:rounded-[40px] sm:px-6 sm:py-8 md:px-10 md:py-12`}
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

function formatBookingDate(value: string) {
  if (!value) return "Select date";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Select date";

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tourBarGuestLabel(adults: number, children: number) {
  const safeAdults = Math.max(1, Math.floor(adults || 1));
  const safeChildren = Math.max(0, Math.floor(children || 0));
  const adultsLabel = `${safeAdults} adult${safeAdults === 1 ? "" : "s"}`;
  const childrenLabel =
    safeChildren > 0 ? `, ${safeChildren} child${safeChildren === 1 ? "" : "ren"}` : "";
  return `${adultsLabel}${childrenLabel}`;
}

function tourBarGuestCountsFromLabel(label: string) {
  const text = String(label || "");
  const adultMatch = text.match(/(\d+)\s*adult/i);
  const childMatch = text.match(/(\d+)\s*(?:child|children|kid|kids)/i);
  const total = guestCountFromLabel(text);

  if (adultMatch || childMatch) {
    return {
      adults: Math.max(1, Number(adultMatch?.[1] || total || 1)),
      children: Math.max(0, Number(childMatch?.[1] || 0)),
    };
  }

  if (total) return { adults: Math.max(1, total), children: 0 };
  return null;
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
  spotlighted = false,
  spotlightNonce = 0,
  pageId,
  index,
  selectedRoom,
  onBookRoom,
  onNextRoomOption,
}: {
  section: Section;
  emphasized: boolean;
  spotlighted?: boolean;
  spotlightNonce?: number;
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
  const highlighted = emphasized || spotlighted;
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
      animate={{ scale: highlighted || isSelectedRoom ? 1.018 : 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`relative scroll-mt-20 sm:scroll-mt-28 ${spotlighted ? "z-[70]" : ""}`}
    >
      {spotlighted && (
        <>
          <motion.div
            key={`tourbar-focus-fog-${section.id}-${spotlightNonce}`}
            aria-hidden="true"
            initial={{ opacity: 0.98, scale: 1.018, backdropFilter: "blur(18px)" }}
            animate={{ opacity: [0.98, 0.84, 0], scale: [1.018, 1.006, 1], backdropFilter: ["blur(18px)", "blur(10px)", "blur(0px)"] }}
            transition={{ duration: 1.12, times: [0, 0.34, 1], ease: "easeOut" }}
            className="pointer-events-none absolute -inset-1 z-30 rounded-[32px] bg-slate-100/75 shadow-[inset_0_0_46px_rgba(255,255,255,0.96)] ring-1 ring-white/80 backdrop-blur-xl"
          />
          <motion.div
            key={`tourbar-focus-glow-${section.id}-${spotlightNonce}`}
            aria-hidden="true"
            initial={{ opacity: 0.86, scale: 0.992 }}
            animate={{ opacity: [0.86, 0.62, 0.18], scale: [1, 1.006, 1] }}
            transition={{ duration: 3.4, times: [0, 0.35, 1], ease: "easeOut" }}
            className="pointer-events-none absolute -inset-2 z-20 rounded-[34px] ring-2 ring-cyan-300/65 shadow-[0_0_0_10px_rgba(34,211,238,0.12),0_24px_80px_rgba(34,211,238,0.34)]"
          />
        </>
      )}
      <Card
        className={`md:hidden transition-all ${
          highlighted
            ? "border-white/70 ring-1 ring-cyan-200/70 shadow-xl shadow-cyan-200/25"
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
          highlighted
            ? "border-white/70 ring-1 ring-cyan-200/70 shadow-xl shadow-cyan-200/25"
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
      initial={{ opacity: 0, x: -28, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, y: 14, scale: 0.98 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="fixed bottom-24 left-4 right-4 z-[10050] max-h-[calc(100dvh-8rem)] w-[min(calc(100vw-2rem),26rem)] overflow-y-auto rounded-[24px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-950/[0.04] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 pb-4 pt-4 text-white">
        <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2.5 backdrop-blur">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-lg font-semibold tracking-tight">{title}</div>
      </div>
      <div className="space-y-3 px-4 py-4">
        <p className="text-sm font-medium leading-6 text-slate-600">
          Choose a demo.
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.label}
              onClick={option.onClick}
              className="flex w-full items-start justify-between rounded-2xl bg-slate-950 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-800"
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
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
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
      initial={{ opacity: 0, x: -28, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, y: 14, scale: 0.98 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="fixed bottom-24 left-4 right-4 z-[10050] w-[min(calc(100vw-2rem),26rem)] overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-950/[0.04] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight text-slate-950">
            Demo complete
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            The self-drive walkthrough is finished.
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Done
      </button>
    </motion.div>
  );
}


function pageIdFromTourBarTarget(targetId?: string | null): PageId {
  const target = String(targetId || "");

  if (target.startsWith("package-")) return "packages";
  if (target.startsWith("amenity-")) return "amenities";
  if (target.startsWith("booking-") || target === "payment-module") return "booking";
  if (target.startsWith("room-")) return "rooms";

  return "home";
}

function sectionIdFromTourBarTarget(targetId?: string | null) {
  const target = String(targetId || "").trim();
  if (!target) return "";

  const sections = Object.values(PAGES).flatMap((page) => page.sections);
  const exact = sections.find((section) => section.id === target);
  if (exact) return exact.id;

  const prefix = sections
    .slice()
    .sort((a, b) => b.id.length - a.id.length)
    .find((section) => target.startsWith(`${section.id}-`) || target.startsWith(`${section.id}_`));

  return prefix?.id || target;
}

function primaryTourBarTarget(raw: TourBarHotelBookingBackendResponse) {
  const action = asRecord(raw.action || raw.suggestedAction);
  const ranked = Array.isArray(raw.rankedDestinations) ? raw.rankedDestinations : [];
  const firstRanked = asRecord(ranked[0]);
  const selected = tourBarCombinationFromRaw(raw);
  const packageIds = packageIdsFromTourBarCombination(selected);
  const bookingAction = String(raw.commerceAction || raw.intent || raw.displayMode || "");
  const plannerText = [
    asRecord(raw.bookingArtifacts).normalizedPrompt,
    asRecord(raw.bookingArtifacts).rawPrompt,
    raw.answer,
    raw.body,
  ].join(" ").toLowerCase();
  const packageFocused =
    packageIds.length > 0 &&
    /\b(parking|breakfast|package|bundle|add-?on|transfer|shuttle|spa|conference|wifi|late checkout|lounge)\b/.test(plannerText);

  const targetId =
    action.targetId ||
    firstRanked.targetId ||
    (packageFocused ? packageIds[0] : selected.roomId) ||
    raw.targetId ||
    raw.focusAreaId ||
    "";

  const pageId =
    action.pageId ||
    firstRanked.pageId ||
    raw.pageId ||
    pageIdFromTourBarTarget(targetId);

  const targetSelector =
    action.targetSelector ||
    firstRanked.targetSelector ||
    (targetId ? `[data-tour-id="${targetId}"], #${targetId}` : undefined);

  const explicitBookingActionText = [
    bookingAction,
    action.type,
    action.kind,
    action.intent,
    action.action,
    action.commerceAction,
    action.displayMode,
    raw.commerceAction,
    raw.intent,
    raw.displayMode,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return {
    pageId: pageId as PageId,
    targetId: String(targetId || ""),
    targetSelector: typeof targetSelector === "string" ? targetSelector : undefined,
    // Do not treat every result that merely mentions or links to booking as a
    // handoff. Normal room recommendations should stay as answer sheets; the
    // booking handoff sheet opens only for explicit booking actions or CTA clicks.
    isBookingAction:
      explicitBookingActionText.includes("prepare_booking") ||
      explicitBookingActionText.includes("booking_handoff") ||
      explicitBookingActionText.includes("checkout_handoff") ||
      targetId === "booking-panel" ||
      action.targetId === "booking-panel",
  };
}


type TourBarPageTarget = {
  pageId: PageId;
  targetId: string;
  targetSelector?: string;
  targetText?: string;
  reason?: string;
};

type TourBarNavigationState = {
  steps: TourBarPageTarget[];
  activeIndex: number;
};

type TourBarWorkingStayContext = {
  roomId: string | null;
  packageIds: string[];
  activeTargetId: string | null;
  activeRoomId: string | null;
  activePackageId: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  datesLabel?: string | null;
  adults?: number | null;
  children?: number | null;
  guests?: number | null;
  guestLabel?: string | null;
  budgetBand?: string | null;
  lastPlannerIntent?: string | null;
  lastResultTitle?: string | null;
  lastResultAction?: string | null;
};

type TourBarBookingWidget = "dates" | "guests" | null;
type TourBarDatePickerKind = "check-in" | "check-out" | null;
type TourBarCalendarMonth = { year: number; monthIndex: number };

type TourBarRequiredBookingField = "dates" | "guests";

type TourBarBookingContextOverride = {
  datesSelected?: boolean;
  guestsSelected?: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  guestAdults?: number;
  guestChildren?: number;
  guestLabel?: string;
  budgetBand?: string;
};

type TourBarParsedDates = {
  checkInDate: string;
  checkOutDate: string;
  datesLabel: string;
};

type TourBarParsedGuests = {
  adults: number;
  children: number;
  guests: number;
  guestLabel: string;
};

const TOURBAR_DEFAULT_BOOKING_YEAR = 2026;
const TOURBAR_MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};
const TOURBAR_MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const TOURBAR_NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function tourBarNumberFromText(value?: string | null) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;

  const direct = Number(text);
  if (Number.isFinite(direct) && direct >= 0) return Math.floor(direct);

  return TOURBAR_NUMBER_WORDS[text] ?? null;
}

function tourBarYearFromText(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return TOURBAR_DEFAULT_BOOKING_YEAR;

  const year = Number(raw);
  if (!Number.isFinite(year)) return TOURBAR_DEFAULT_BOOKING_YEAR;
  if (year < 100) return 2000 + year;
  return year;
}

function tourBarIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function tourBarMonthIndex(value?: string | null) {
  const key = String(value || "").trim().toLowerCase();
  return TOURBAR_MONTH_NAMES[key] ?? null;
}

function extractTourBarDatesFromPrompt(prompt: string): TourBarParsedDates | null {
  const text = String(prompt || "").replace(/[–—]/g, "-");
  const monthRange = new RegExp(
    `\\b(${TOURBAR_MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|through|thru|until)\\s*(?:(${TOURBAR_MONTH_PATTERN})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}|\\d{2}))?`,
    "i",
  );
  const monthMatch = text.match(monthRange);

  if (monthMatch) {
    const startMonth = tourBarMonthIndex(monthMatch[1]);
    const startDay = Number(monthMatch[2]);
    const endMonth = tourBarMonthIndex(monthMatch[3]) ?? startMonth;
    const endDay = Number(monthMatch[4]);
    const year = tourBarYearFromText(monthMatch[5]);

    if (
      startMonth != null &&
      endMonth != null &&
      Number.isFinite(startDay) &&
      Number.isFinite(endDay)
    ) {
      const checkInDate = tourBarIsoDate(year, startMonth, startDay);
      const checkOutYear = endMonth < startMonth ? year + 1 : year;
      const checkOutDate = tourBarIsoDate(checkOutYear, endMonth, endDay);
      if (checkOutDate > checkInDate) {
        return {
          checkInDate,
          checkOutDate,
          datesLabel: formatBookingDateRange(checkInDate, checkOutDate),
        };
      }
    }
  }

  const numericRange = text.match(
    /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:-|to|through|thru|until)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i,
  );

  if (numericRange) {
    const startMonth = Number(numericRange[1]) - 1;
    const startDay = Number(numericRange[2]);
    const startYear = tourBarYearFromText(numericRange[3] || numericRange[6]);
    const endMonth = Number(numericRange[4]) - 1;
    const endDay = Number(numericRange[5]);
    const endYear = tourBarYearFromText(numericRange[6] || numericRange[3]);

    if (
      startMonth >= 0 &&
      startMonth <= 11 &&
      endMonth >= 0 &&
      endMonth <= 11 &&
      Number.isFinite(startDay) &&
      Number.isFinite(endDay)
    ) {
      const checkInDate = tourBarIsoDate(startYear, startMonth, startDay);
      const checkOutDate = tourBarIsoDate(endYear, endMonth, endDay);
      if (checkOutDate > checkInDate) {
        return {
          checkInDate,
          checkOutDate,
          datesLabel: formatBookingDateRange(checkInDate, checkOutDate),
        };
      }
    }
  }

  return null;
}

function extractTourBarGuestsFromPrompt(prompt: string): TourBarParsedGuests | null {
  const text = String(prompt || "").toLowerCase();
  const numberPattern = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)";

  if (/\b(just me|solo|only me|by myself|myself)\b/i.test(text)) {
    const guestLabel = tourBarGuestLabel(1, 0);
    return { adults: 1, children: 0, guests: 1, guestLabel };
  }

  const adultMatch = text.match(new RegExp(`\\b${numberPattern}\\s+adults?\\b`, "i"));
  const childMatch = text.match(new RegExp(`\\b${numberPattern}\\s+(?:children|child|kids?|kid)\\b`, "i"));
  const totalMatch = text.match(
    new RegExp(`\\b(?:for\\s+)?${numberPattern}\\s+(?:guests?|people|travelers?|travellers?)\\b`, "i"),
  );
  const familyMatch = text.match(new RegExp(`\\bfamily\\s+of\\s+${numberPattern}\\b`, "i"));

  const explicitAdults = tourBarNumberFromText(adultMatch?.[1]);
  const explicitChildren = tourBarNumberFromText(childMatch?.[1]);
  const explicitTotal = tourBarNumberFromText(totalMatch?.[1] || familyMatch?.[1]);

  if (explicitAdults != null || explicitChildren != null) {
    const adults = Math.max(1, explicitAdults ?? Math.max(1, (explicitTotal || 1) - (explicitChildren || 0)));
    const children = Math.max(0, explicitChildren ?? 0);
    const guestLabel = tourBarGuestLabel(adults, children);
    return { adults, children, guests: adults + children, guestLabel };
  }

  if (explicitTotal != null && explicitTotal > 0) {
    const adults = Math.max(1, explicitTotal);
    const children = 0;
    const guestLabel = tourBarGuestLabel(adults, children);
    return { adults, children, guests: adults + children, guestLabel };
  }

  return null;
}

function buildTourBarCollectionResult(
  field: TourBarRequiredBookingField,
  pendingQuery: string,
): TourBarShellResult {
  const isDates = field === "dates";

  return {
    title: isDates ? "Select your stay dates" : "Add guests for this stay",
    body: isDates
      ? "I need the travel dates before I can price and rank rooms. Choose check-in and check-out dates to continue."
      : "I need the guest count before I can filter rooms correctly. Add adults and children to continue.",
    canFollowUp: false,
    answerMode: `tourbar_collect_${field}`,
    mode: `tourbar_collect_${field}`,
    action: `tourbar_collect_${field}`,
    label: isDates ? "Dates required" : "Guests required",
    raw: {
      mode: `tourbar_collect_${field}`,
      action: `tourbar_collect_${field}`,
      requiredField: field,
      pendingQuery,
    },
  };
}

function tourBarCollectionWidgetFromResult(
  result?: TourBarShellResult | null,
): Exclude<TourBarBookingWidget, null> | null {
  const raw = asRecord(result?.raw);
  const field = String(raw.requiredField || result?.action || result?.mode || "");

  if (field.includes("dates")) return "dates";
  if (field.includes("guests")) return "guests";
  return null;
}

function tourBarPendingQueryFromResult(result?: TourBarShellResult | null) {
  const raw = asRecord(result?.raw);
  return typeof raw.pendingQuery === "string" ? raw.pendingQuery : "";
}


void extractTourBarDatesFromPrompt;
void extractTourBarGuestsFromPrompt;
void buildTourBarCollectionResult;
void tourBarCollectionWidgetFromResult;
void tourBarPendingQueryFromResult;

function addTourBarNavigationTarget(
  targets: TourBarPageTarget[],
  value: Record<string, any>,
) {
  const rawTargetId = String(value.targetId || value.focusAreaId || "").trim();
  const targetId = sectionIdFromTourBarTarget(rawTargetId);
  if (!targetId || targetId === "booking-panel" || targetId.startsWith("booking-")) {
    return;
  }

  const pageId = String(value.pageId || pageIdFromTourBarTarget(targetId)) as PageId;
  const targetSelector =
    typeof value.targetSelector === "string" && value.targetSelector.trim()
      ? value.targetSelector.trim()
      : `[data-tour-id="${targetId}"], #${targetId}`;
  const key = `${pageId}:${targetId}`;
  if (targets.some((item) => `${item.pageId}:${item.targetId}` === key)) {
    return;
  }

  targets.push({
    pageId,
    targetId,
    targetSelector,
    targetText: typeof value.targetText === "string" ? value.targetText : undefined,
    reason: typeof value.reason === "string" ? value.reason : undefined,
  });
}

function roomIdFromTourBarTarget(targetId?: string | null) {
  const sectionId = sectionIdFromTourBarTarget(targetId);
  return roomBookingMeta[sectionId] ? sectionId : "";
}

function packageIdFromTourBarTarget(targetId?: string | null) {
  const sectionId = sectionIdFromTourBarTarget(targetId);
  return packageBookingMeta[sectionId] ? sectionId : "";
}

function buildTourBarActiveStayPlan(
  workingStay: TourBarWorkingStayContext,
  fallbackRoomId: string | null,
  fallbackPackageIds: string[],
) {
  const roomId = workingStay.roomId || fallbackRoomId || "";
  const roomMeta = getRoomMeta(roomId);
  const packageIds = normalizeBookingPackageIds([
    ...fallbackPackageIds,
    ...workingStay.packageIds,
  ]);

  return {
    roomId: roomId || null,
    roomTargetId: roomId || null,
    room: roomId
      ? {
          roomId,
          targetId: roomId,
          title: roomMeta?.title || roomId,
          price: roomMeta?.price || "",
          signal: roomMeta?.signal || "",
        }
      : null,
    packageIds,
    packages: packageIds.map((packageId) => {
      const meta = getPackageMeta(packageId);
      return {
        packageId,
        targetId: packageId,
        title: meta?.title || packageId,
        price: meta?.price || "",
        signal: meta?.signal || "",
      };
    }),
    activeTargetId: workingStay.activeTargetId || roomId || null,
    activeRoomId: workingStay.activeRoomId || roomId || null,
    activePackageId: workingStay.activePackageId || packageIds[0] || null,
    bookingContext: {
      checkInDate: workingStay.checkInDate || null,
      checkOutDate: workingStay.checkOutDate || null,
      datesLabel: workingStay.datesLabel || null,
      adults: workingStay.adults ?? null,
      children: workingStay.children ?? null,
      guests: workingStay.guests ?? null,
      guestLabel: workingStay.guestLabel || null,
      budgetBand: workingStay.budgetBand || null,
    },
    lastPlannerIntent: workingStay.lastPlannerIntent || null,
    lastResultTitle: workingStay.lastResultTitle || null,
    lastResultAction: workingStay.lastResultAction || null,
  };
}


function tourBarWait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function tourBarNextFrame(frames = 1) {
  return new Promise<void>((resolve) => {
    let remaining = Math.max(1, frames);
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  });
}

function tourBarTargetElement(sectionId: string, selector?: string) {
  return (
    (selector ? document.querySelector<HTMLElement>(selector) : null) ||
    document.querySelector<HTMLElement>(`[data-tour-id="${sectionId}"]`) ||
    document.getElementById(sectionId)
  );
}

function tourBarStickyHeaderBottom() {
  const header = document.querySelector<HTMLElement>("header");
  if (!header) return 0;

  const rect = header.getBoundingClientRect();
  return Math.max(0, Math.min(window.innerHeight * 0.35, rect.bottom));
}

function tourBarSafeViewport() {
  const top = Math.min(window.innerHeight - 180, tourBarStickyHeaderBottom() + 22);
  const bottom = Math.max(top + 160, window.innerHeight - 34);

  return {
    top,
    bottom,
    height: bottom - top,
    center: top + (bottom - top) / 2,
  };
}

function tourBarTargetScrollTop(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const safe = tourBarSafeViewport();
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
  );
  const maxScroll = Math.max(0, documentHeight - window.innerHeight);

  const desiredTop =
    rect.height > safe.height
      ? window.scrollY + rect.top - safe.top
      : window.scrollY + rect.top - (safe.top + (safe.height - rect.height) / 2);

  return Math.max(0, Math.min(maxScroll, Math.round(desiredTop)));
}

function tourBarTargetIsSafelyPlaced(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const safe = tourBarSafeViewport();

  if (rect.width <= 0 || rect.height <= 0) return false;

  if (rect.height > safe.height) {
    return rect.top >= safe.top - 8 && rect.top <= safe.top + 56;
  }

  const center = rect.top + rect.height / 2;
  const centerTolerance = Math.max(24, Math.min(82, safe.height * 0.14));

  return (
    rect.top >= safe.top - 8 &&
    rect.bottom <= safe.bottom + 8 &&
    Math.abs(center - safe.center) <= centerTolerance
  );
}

async function tourBarFindTargetWhenReady(
  sectionId: string,
  selector: string,
  isCurrentRun: () => boolean,
) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (!isCurrentRun()) return null;

    const el = tourBarTargetElement(sectionId, selector);
    if (el) return el;

    await tourBarNextFrame(1);
    await tourBarWait(35);
  }

  return null;
}

async function tourBarCenterTargetWithVerification(
  el: HTMLElement,
  isCurrentRun: () => boolean,
) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!isCurrentRun()) return false;

    const top = tourBarTargetScrollTop(el);
    window.scrollTo({
      top,
      behavior: attempt === 3 ? "auto" : "smooth",
    });

    await tourBarWait(attempt === 0 ? 440 : 260);
    await tourBarNextFrame(2);

    if (tourBarTargetIsSafelyPlaced(el)) return true;
  }

  if (!isCurrentRun()) return false;

  window.scrollTo({
    top: tourBarTargetScrollTop(el),
    behavior: "auto",
  });
  await tourBarNextFrame(3);

  return tourBarTargetIsSafelyPlaced(el);
}

// These older Domi-specific centering helpers stay parked for now while
// booking focus moves to the shared SmartBar controller. Keeping references
// avoids turning this visual wiring patch into a helper-deletion refactor.
void tourBarFindTargetWhenReady;
void tourBarCenterTargetWithVerification;

function packageNavigationTargetsFromCombo(combo: Record<string, any>) {
  const packageTargets = asRecordArray(combo.packageTargets);
  const packageIds = packageIdsFromTourBarCombination(combo);

  return packageIds.map((packageId, index) => {
    const target = asRecord(packageTargets[index]);
    const targetId = String(target.targetId || packageId);
    return {
      pageId: String(target.pageId || pageIdFromTourBarTarget(targetId)) as PageId,
      targetId,
      targetSelector:
        typeof target.targetSelector === "string" && target.targetSelector.trim()
          ? target.targetSelector.trim()
          : `[data-tour-id="${targetId}"], #${targetId}`,
      targetText:
        asStringArray(combo.packageTitles)[index] ||
        getPackageMeta(packageId)?.title ||
        "Package",
      reason: "Recommended add-on for this stay.",
    };
  });
}

function comboNavigationTargets(
  combo: Record<string, any>,
  { packageFirst = false }: { packageFirst?: boolean } = {},
) {
  const targets: TourBarPageTarget[] = [];
  const roomTarget = asRecord(combo.roomTarget);
  const roomId = String(combo.roomId || roomTarget.targetId || "").trim();
  const roomStep = roomId
    ? {
        pageId: String(roomTarget.pageId || pageIdFromTourBarTarget(roomId)) as PageId,
        targetId: roomId,
        targetSelector:
          typeof roomTarget.targetSelector === "string" && roomTarget.targetSelector.trim()
            ? roomTarget.targetSelector.trim()
            : `[data-tour-id="${roomId}"], #${roomId}`,
        targetText: String(combo.roomShortTitle || combo.roomTitle || getRoomMeta(roomId)?.title || "Room"),
        reason: "Recommended room option.",
      }
    : null;
  const packageSteps = packageNavigationTargetsFromCombo(combo);

  [...(packageFirst ? packageSteps : []), ...(roomStep ? [roomStep] : []), ...(packageFirst ? [] : packageSteps)]
    .forEach((target) => addTourBarNavigationTarget(targets, target));

  return targets;
}

function tourBarNavigationTargets(raw: TourBarHotelBookingBackendResponse) {
  const targets: TourBarPageTarget[] = [];
  const action = asRecord(raw.action || raw.suggestedAction);
  const ranked = asRecordArray(raw.rankedDestinations);
  const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
  const packageIds = packageIdsFromTourBarCombination(selected);
  const plannerText = [
    asRecord(raw.bookingArtifacts).normalizedPrompt,
    asRecord(raw.bookingArtifacts).rawPrompt,
    raw.answer,
    raw.body,
    raw.message,
    raw.reply,
  ].join(" ").toLowerCase();
  const packageFocused =
    packageIds.length > 0 &&
    /\b(parking|breakfast|package|bundle|add-?on|transfer|shuttle|spa|conference|wifi|late checkout|lounge)\b/.test(plannerText);

  addTourBarNavigationTarget(targets, action);
  ranked.forEach((item) => addTourBarNavigationTarget(targets, item));

  const combos = [
    tourBarCombinationFromRaw(raw, { preferNextStep: true }),
    asRecord(raw.selectedCombination),
    ...asRecordArray(raw.matrixResults),
    ...asRecordArray(raw.alternatives),
  ];

  combos.forEach((combo) => {
    if (!combo.comboId && !combo.roomId) return;
    comboNavigationTargets(combo, { packageFirst: packageFocused })
      .forEach((target) => addTourBarNavigationTarget(targets, target));
  });

  return targets.slice(0, 4);
}

function stripInlineNextStepPrompt(body: string, nextStepLabel: string) {
  if (!nextStepLabel) return body;

  const cleaned = body
    .replace(
      /\s*(?:Would you like me to|Would you like to|Do you want me to|Want me to|Should I|Ready to)\s+[^.?!\n]*(?:\?|$)\s*$/i,
      "",
    )
    .trim();

  return cleaned || body;
}

function isBookingNextStepLabel(value?: string | null) {
  const text = String(value || "").toLowerCase();
  return /\b(prepare|book|booking|reserve|reservation|checkout|stage|line\s+up|move\s+this)\b/.test(text);
}

function isExplicitTourBarBookingRequest(raw: TourBarHotelBookingBackendResponse) {
  const artifacts = asRecord(raw.bookingArtifacts);
  const promptText = [artifacts.normalizedPrompt, artifacts.rawPrompt, raw.message, raw.prompt]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return /\b(book|booking|reserve|reservation|checkout|prepare|stage|line\s+up|move\s+this)\b/.test(promptText);
}

function buildTourBarShellResult(raw: TourBarHotelBookingBackendResponse): TourBarShellResult {
  const target = primaryTourBarTarget(raw);
  const legacyChips = asStringArray(raw.chips || raw.refinementChips);
  const nextStep = asRecord(raw.nextStep);
  const nextStepLabel =
    typeof nextStep.label === "string" && nextStep.label.trim()
      ? nextStep.label.trim()
      : legacyChips[0] || "";
  const nextStepQuery =
    typeof nextStep.query === "string" && nextStep.query.trim()
      ? nextStep.query.trim()
      : nextStepLabel;
  const nextStepType =
    typeof nextStep.type === "string" && nextStep.type.trim()
      ? nextStep.type.trim()
      : "tourbar_next_step";
  const selected = asRecord(raw.selectedCombination);
  const title =
    selected.roomShortTitle ||
    selected.roomTitle ||
    raw.title ||
    "TourBar booking match";
  const rawBody =
    raw.body ||
    raw.answer ||
    raw.message ||
    raw.reply ||
    "TourBar found a booking option.";
  const body = stripInlineNextStepPrompt(String(rawBody), nextStepLabel);

  return {
    title: String(title),
    body,
    invitation: nextStepLabel ? { kind: "next_step", text: nextStepLabel } : undefined,
    nextMove: nextStepLabel ? { type: nextStepType, label: nextStepLabel, query: nextStepQuery } : undefined,
    canFollowUp: true,
    focusAreaId: target.targetId || undefined,
    answerMode: String(raw.displayMode || raw.intent || "tourbar_hotel_booking"),
    pageId: target.pageId,
    targetId: target.targetId || undefined,
    targetSelector: target.targetSelector,
    label: String(raw.label || title),
    mode: String(raw.mode || TOURBAR_HOTEL_BOOKING_MODE),
    action: String(raw.commerceAction || raw.intent || "tourbar_booking_recommendation"),
    raw,

  };
}

type TourBarBookingHandoff = {
  roomTitle: string;
  packageTitle: string;
  datesLabel: string;
  guestsLabel: string;
  budgetLabel: string;
  priceLabel: string;
};

function priceLabelFromTourBarCombination(selected: Record<string, any>) {
  const pricing = asRecord(selected.pricing);
  const effectiveNightly =
    typeof pricing.effectiveNightlyUsd === "number"
      ? pricing.effectiveNightlyUsd
      : Number(pricing.effectiveNightlyUsd || selected.oneNightTotalUsd || selected.effectiveNightlyUsd || 0);

  if (Number.isFinite(effectiveNightly) && effectiveNightly > 0) {
    return `$${Math.round(effectiveNightly).toLocaleString("en-US")}/night`;
  }

  return "Rate ready";
}

function tourBarCombinationFromRaw(
  raw: TourBarHotelBookingBackendResponse,
  { preferNextStep = false }: { preferNextStep?: boolean } = {},
) {
  const nextStep = asRecord(raw.nextStep);
  const nextStepComboId = String(nextStep.comboId || "").trim();
  const candidates = [
    asRecord(raw.nextStepCombination),
    asRecord(raw.selectedCombination),
    ...asRecordArray(raw.matrixResults),
    ...asRecordArray(raw.alternatives),
  ];

  if (preferNextStep && nextStepComboId) {
    const match = candidates.find((combo) => String(combo.comboId || "") === nextStepComboId);
    if (match) return match;
  }

  const nextStepCombination = asRecord(raw.nextStepCombination);
  if (preferNextStep && nextStepCombination.comboId) return nextStepCombination;

  const selected = asRecord(raw.selectedCombination);
  if (selected.comboId || selected.roomId) return selected;

  return nextStepCombination.comboId || nextStepCombination.roomId ? nextStepCombination : {};
}

function packageIdsFromTourBarCombination(combo: Record<string, any>) {
  return normalizeBookingPackageIds(asStringArray(combo.packageIds));
}

function packageIdsFromStayPlan(stayPlan: Record<string, any>) {
  return normalizeBookingPackageIds([
    ...asStringArray(stayPlan.packageIds),
    ...asRecordArray(stayPlan.packages).map((item) => String(item.targetId || item.packageId || "")),
  ]);
}

function buildTourBarBookingHandoff(
  raw: TourBarHotelBookingBackendResponse,
  bookingContextOverride: Record<string, any> = {},
): TourBarBookingHandoff {
  const visibleContext = asRecord(raw.visibleContext);
  const bookingContext = {
    ...asRecord(visibleContext.bookingContext),
    ...bookingContextOverride,
  };
  const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
  const activeRoom = asRecord(activeStayPlan.room);
  const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
  const roomId = String(
    activeStayPlan.roomId ||
      activeStayPlan.roomTargetId ||
      activeRoom.targetId ||
      activeRoom.roomId ||
      selected.roomId ||
      visibleContext.selectedRoomId ||
      "",
  );
  const roomMeta = getRoomMeta(roomId);
  const packageIds = normalizeBookingPackageIds([
    ...packageIdsFromStayPlan(activeStayPlan),
    ...packageIdsFromTourBarCombination(selected),
    ...asStringArray(visibleContext.selectedPackageIds),
  ]);
  const packageTitles = asStringArray(selected.packageTitles);
  const derivedPackageTitles = packageIds
    .map((packageId) => getPackageMeta(packageId)?.title)
    .filter((title): title is string => Boolean(title));

  const datesLabel =
    bookingContext.checkInDate && bookingContext.checkOutDate
      ? formatBookingDateRange(String(bookingContext.checkInDate), String(bookingContext.checkOutDate))
      : "Dates can be added in the next step";
  const guestsLabel =
    typeof bookingContext.guestLabel === "string" && bookingContext.guestLabel.trim()
      ? bookingContext.guestLabel.trim()
      : bookingContext.guests
        ? `${bookingContext.guests} guest${Number(bookingContext.guests) === 1 ? "" : "s"}`
        : "Guests can be added in the next step";
  const budgetLabel =
    bookingContext.maxNightlyBudgetUsd
      ? `Under $${bookingContext.maxNightlyBudgetUsd}/night`
      : bookingContext.maxTotalBudgetUsd
        ? `Under $${bookingContext.maxTotalBudgetUsd} total`
        : bookingContext.budgetBand
          ? String(bookingContext.budgetBand)
          : "No budget limit set";

  return {
    roomTitle: String(selected.roomShortTitle || selected.roomTitle || roomMeta?.title || "Selected room"),
    packageTitle: (packageTitles[0] || derivedPackageTitles[0] || "No package selected").replace(/\s+/g, " "),
    datesLabel,
    guestsLabel,
    budgetLabel,
    priceLabel: priceLabelFromTourBarCombination(selected),
  };

}

function tourBarBookingFocusTarget(raw: TourBarHotelBookingBackendResponse): TourBarPageTarget | null {
  const visibleContext = asRecord(raw.visibleContext);
  const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
  const activeRoom = asRecord(activeStayPlan.room);
  const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
  const roomId = String(
    activeStayPlan.roomId ||
      activeStayPlan.roomTargetId ||
      activeRoom.targetId ||
      activeRoom.roomId ||
      selected.roomId ||
      visibleContext.selectedRoomId ||
      "",
  );
  const targetId = sectionIdFromTourBarTarget(roomId);
  if (!targetId || !roomStepOrder.includes(targetId)) return null;

  return {
    pageId: pageIdFromTourBarTarget(targetId),
    targetId,
    targetSelector: `[data-tour-id="${targetId}"], #${targetId}`,
    targetText: String(selected.roomShortTitle || selected.roomTitle || getRoomMeta(targetId)?.title || "Selected room"),
    reason: "Room staged for booking handoff.",
  };
}

function TourBarHotelBookingHandoffSheet({
  bookingHandoff,
  actions,
}: {
  bookingHandoff: TourBarBookingHandoff | null;
  actions?: TourBarShellActions;
}) {
  // This is rendered as a standalone TourBar sheet so booking handoff details
  // do not stretch the answer sheet or force the page into a cutoff position.
  if (!bookingHandoff) return null;

  const liveBookingContext = actions?.bookingContext;
  const datesLabel =
    liveBookingContext?.datesSelected && liveBookingContext.datesLabel
      ? liveBookingContext.datesLabel
      : bookingHandoff.datesLabel;
  const guestsLabel =
    liveBookingContext?.guestsSelected && liveBookingContext.guestLabel
      ? liveBookingContext.guestLabel
      : bookingHandoff.guestsLabel;

  const editableRowClass =
    "group flex w-full items-start justify-between gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-300";
  const staticRowClass = "flex items-start justify-between gap-3 px-2 py-1.5";

  const renderStaticRow = (label: string, value: string, bordered = false) => (
    <div className={`${staticRowClass} ${bordered ? "border-t border-emerald-100 pt-2" : ""}`}>
      <span className="text-emerald-800/75">{label}</span>
      <strong className="text-right font-semibold">{value}</strong>
    </div>
  );

  const renderEditableRow = (
    label: string,
    value: string,
    field: "dates" | "guests",
  ) => (
    <button
      type="button"
      onClick={() => actions?.openBookingContextSheet(field)}
      className={editableRowClass}
      aria-label={`Edit ${label.toLowerCase()}`}
    >
      <span className="text-emerald-800/75">{label}</span>
      <span className="flex min-w-0 items-start justify-end gap-2 text-right">
        <strong className="font-semibold">{value}</strong>
        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700/55 transition group-hover:text-emerald-900" />
      </span>
    </button>
  );

  return (
    <div
      data-tour-id="tourbar-booking-handoff"
      className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-sm text-emerald-950 shadow-sm ring-1 ring-emerald-100/80"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/70">
        Booking handoff
      </div>
      <div className="mt-2 space-y-0.5">
        {renderStaticRow("Room", bookingHandoff.roomTitle)}
        {renderStaticRow("Add-ons", bookingHandoff.packageTitle)}
        {actions
          ? renderEditableRow("Dates", datesLabel, "dates")
          : renderStaticRow("Dates", datesLabel)}
        {actions
          ? renderEditableRow("Guests", guestsLabel, "guests")
          : renderStaticRow("Guests", guestsLabel)}
        {renderStaticRow("Budget", bookingHandoff.budgetLabel)}
        {renderStaticRow("Estimate", bookingHandoff.priceLabel, true)}
      </div>
    </div>
  );
}

function TourBarBookingContextPanel({
  datesSelected,
  guestsSelected,
  checkInDate,
  checkOutDate,
  guestAdults,
  guestChildren,
  activeWidget,
  activeDatePicker,
  calendarMonth,
  onOpenWidget,
  onCloseWidget,
  onOpenDatePicker,
  onSelectCalendarDate,
  onShiftCalendarMonth,
  onApplyDates,
  onClearDates,
  onGuestAdultsChange,
  onGuestChildrenChange,
  onApplyGuests,
  onClearGuests,
  lockedWidget = null,
}: {
  datesSelected: boolean;
  guestsSelected: boolean;
  checkInDate: string;
  checkOutDate: string;
  guestAdults: number;
  guestChildren: number;
  activeWidget: TourBarBookingWidget;
  activeDatePicker: TourBarDatePickerKind;
  calendarMonth: TourBarCalendarMonth;
  onOpenWidget: (widget: Exclude<TourBarBookingWidget, null>) => void;
  onCloseWidget: () => void;
  onOpenDatePicker: (kind: Exclude<TourBarDatePickerKind, null>) => void;
  onSelectCalendarDate: (kind: Exclude<TourBarDatePickerKind, null>, value: string) => void;
  onShiftCalendarMonth: (delta: number) => void;
  onApplyDates: () => void;
  onClearDates: () => void;
  onGuestAdultsChange: (value: number) => void;
  onGuestChildrenChange: (value: number) => void;
  onApplyGuests: () => void;
  onClearGuests: () => void;
  lockedWidget?: Exclude<TourBarBookingWidget, null> | null;
}) {
  const datesReady = Boolean(checkInDate && checkOutDate && checkOutDate > checkInDate);
  const guestLabel = tourBarGuestLabel(guestAdults, guestChildren);
  const dateLabel = datesSelected
    ? formatBookingDateRange(checkInDate, checkOutDate)
    : "Add dates";
  const monthName = new Date(
    calendarMonth.year,
    calendarMonth.monthIndex,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(calendarMonth.year, calendarMonth.monthIndex, 1).getDay();
  const daysInMonth = new Date(calendarMonth.year, calendarMonth.monthIndex + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const selectedDate = activeDatePicker === "check-in" ? checkInDate : checkOutDate;
  const effectiveWidget = lockedWidget || activeWidget;
  const lockedTitle = lockedWidget === "dates" ? "Dates required" : "Guests required";
  const lockedBody =
    lockedWidget === "dates"
      ? "Choose check-in and check-out dates to continue."
      : lockedWidget === "guests"
        ? "Confirm the adults and children for this stay."
        : "Dates and guests are carried into every follow-up and booking handoff.";

  return (
    <div
      data-tour-id="tourbar-booking-context-controls"
      className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-white/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {lockedWidget ? lockedTitle : "Stay details"}
          </div>
          <div className="mt-1 text-xs leading-4 text-slate-500">
            {lockedBody}
          </div>
        </div>
        {activeWidget && !lockedWidget && (
          <button
            type="button"
            onClick={onCloseWidget}
            className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900"
          >
            Close
          </button>
        )}
      </div>

      {!lockedWidget && (
        <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onOpenWidget("dates")}
          className={`rounded-xl border px-3 py-2 text-left transition ${
            effectiveWidget === "dates"
              ? "border-slate-900 bg-white shadow-sm"
              : datesSelected
                ? "border-emerald-100 bg-emerald-50 text-emerald-900"
                : "border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <CalendarDays className="h-3 w-3" /> Dates
          </span>
          <strong className="mt-1 block truncate text-xs text-slate-950">{dateLabel}</strong>
        </button>

        <button
          type="button"
          onClick={() => onOpenWidget("guests")}
          className={`rounded-xl border px-3 py-2 text-left transition ${
            effectiveWidget === "guests"
              ? "border-slate-900 bg-white shadow-sm"
              : guestsSelected
                ? "border-emerald-100 bg-emerald-50 text-emerald-900"
                : "border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <Users className="h-3 w-3" /> Guests
          </span>
          <strong className="mt-1 block truncate text-xs text-slate-950">
            {guestsSelected ? guestLabel : "Add guests"}
          </strong>
        </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {effectiveWidget === "dates" && (
          <motion.div
            key="tourbar-dates-widget"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-2">
              {[
                { kind: "check-in" as const, label: "Check-in", value: checkInDate },
                { kind: "check-out" as const, label: "Check-out", value: checkOutDate },
              ].map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => onOpenDatePicker(item.kind)}
                  className={`rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100 ${
                    activeDatePicker === item.kind ? "ring-2 ring-slate-900/10" : ""
                  }`}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </span>
                  <strong className="mt-1 block text-xs text-slate-950">
                    {formatBookingDate(item.value)}
                  </strong>
                </button>
              ))}
            </div>

            {activeDatePicker && (
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {activeDatePicker === "check-in" ? "Check-in calendar" : "Check-out calendar"}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-950">{monthName}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onShiftCalendarMonth(-1)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => onShiftCalendarMonth(1)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-0.5">{day}</div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {blanks.map((_, index) => (
                    <div key={`blank-${index}`} />
                  ))}
                  {days.map((day) => {
                    const value = `${calendarMonth.year}-${String(calendarMonth.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const disabled = Boolean(
                      activeDatePicker === "check-out" && checkInDate && value <= checkInDate,
                    );
                    const isSelected = selectedDate === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelectCalendarDate(activeDatePicker, value)}
                        className={`min-h-8 rounded-lg px-0 py-1 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-slate-950 text-white shadow-sm"
                            : disabled
                              ? "cursor-not-allowed bg-slate-50 text-slate-300"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-4 text-slate-500">
                {datesSelected
                  ? `Saved: ${formatBookingDateRange(checkInDate, checkOutDate)}`
                  : datesReady
                    ? "Ready to save dates."
                    : "Choose a check-out date after check-in."}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {datesSelected && (
                  <button
                    type="button"
                    onClick={onClearDates}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-rose-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  disabled={!datesReady}
                  onClick={onApplyDates}
                  className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Apply dates
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {effectiveWidget === "guests" && (
          <motion.div
            key="tourbar-guests-widget"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            {[
              {
                label: "Adults",
                value: guestAdults,
                min: 1,
                onChange: onGuestAdultsChange,
              },
              {
                label: "Children",
                value: guestChildren,
                min: 0,
                onChange: onGuestChildrenChange,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-950">{item.value}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => item.onChange(Math.max(item.min, item.value - 1))}
                    className="h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => item.onChange(item.value + 1)}
                    className="h-8 w-8 rounded-full bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-4 text-slate-500">
                {guestsSelected ? `Saved: ${guestLabel}` : `Ready to save ${guestLabel}.`}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {guestsSelected && (
                  <button
                    type="button"
                    onClick={onClearGuests}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-rose-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onApplyGuests}
                  className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Apply guests
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function TourBarNavigationControls({
  state,
  onBack,
  onNext,
  onBook,
}: {
  state: TourBarNavigationState | null;
  onBack: () => void;
  onNext: () => void;
  onBook: () => void;
}) {
  if (!state || state.steps.length < 2) return null;

  const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
  const active = state.steps[activeIndex];
  const previous = state.steps[activeIndex - 1];
  const next = state.steps[activeIndex + 1];
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= state.steps.length - 1;

  return (
    <div
      data-tour-id="tourbar-navigation-controls"
      className="rounded-2xl border border-cyan-100 bg-cyan-50/85 px-3 py-2.5 text-sm text-cyan-950 shadow-sm ring-1 ring-cyan-100/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700/70">
            Guided stops · {activeIndex + 1} of {state.steps.length}
          </div>
          <div className="mt-1 truncate font-semibold">
            {active.targetText || active.targetId}
          </div>
          {previous && (
            <div className="mt-0.5 truncate text-xs font-medium text-cyan-800/55">
              Back: {previous.targetText || previous.targetId}
            </div>
          )}
          {next && (
            <div className="mt-0.5 truncate text-xs font-medium text-cyan-800/70">
              Next: {next.targetText || next.targetId}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBack();
            }}
            disabled={isFirst}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBook();
            }}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            Book
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onNext();
            }}
            disabled={isLast}
            className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLast ? "Last stop" : "Next stop"}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function AppCommerce({ tourBarMode = false }: AppCommerceProps = {}) {
  const [currentPage, setCurrentPage] = useState<PageId>("home");
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [tourBarSpotlightTarget, setTourBarSpotlightTarget] = useState<string | null>(null);
  const [tourBarSpotlightNonce, setTourBarSpotlightNonce] = useState(0);
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
  const [guestAdults, setGuestAdults] = useState(1);
  const [guestChildren, setGuestChildren] = useState(0);
  const [guestLabel, setGuestLabel] = useState(tourBarGuestLabel(1, 0));
  const [budgetBand, setBudgetBand] = useState("");
  const [activeTourBarBookingWidget, setActiveTourBarBookingWidget] =
    useState<TourBarBookingWidget>(null);
  const [tourBarDatePicker, setTourBarDatePicker] =
    useState<TourBarDatePickerKind>(null);
  const [tourBarCalendarMonth, setTourBarCalendarMonth] =
    useState<TourBarCalendarMonth>({ year: 2026, monthIndex: 5 });
  const [activeFormSpotlight, setActiveFormSpotlight] = useState<
    "guests" | null
  >(null);
  const [bookingRailSpotlight, setBookingRailSpotlight] = useState(false);
  const [checkInDate, setCheckInDate] = useState("2026-06-12");
  const [checkOutDate, setCheckOutDate] = useState("2026-06-15");
  const [tourBarBookingHandoff, setTourBarBookingHandoff] =
    useState<TourBarBookingHandoff | null>(null);
  const [tourBarBookingHandoffOpen, setTourBarBookingHandoffOpen] =
    useState(false);
  const [tourBarNavigationState, setTourBarNavigationState] =
    useState<TourBarNavigationState | null>(null);
  const [tourBarWorkingStay, setTourBarWorkingStay] =
    useState<TourBarWorkingStayContext>({
      roomId: "room-business-king",
      packageIds: [],
      activeTargetId: "room-business-king",
      activeRoomId: "room-business-king",
      activePackageId: null,
      checkInDate: null,
      checkOutDate: null,
      datesLabel: null,
      adults: null,
      children: null,
      guests: null,
      guestLabel: null,
    });
  const tourBarNavigationRunRef = React.useRef(0);
  const tourBarBookingResumeOverrideRef =
    React.useRef<TourBarBookingContextOverride | null>(null);

  const isSelfDriveEntry = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("mode") === "self_drive";
  }, []);

  const page = PAGES[currentPage];
  const pageIndex = pageOrder.indexOf(currentPage);

  const onNavigate = (nextPage: PageId) => {
    tourBarNavigationRunRef.current += 1;
    setTourBarNavigationState(null);
    setCurrentPage(nextPage);
    setActiveAnchor(null);
    setBookingRailSpotlight(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDemoPreview = () => {
    setDemoClosingOpen(false);
    setDemoPreviewOpen(true);
  };

  useEffect(() => {
    if (!isSelfDriveEntry) return;

    const timer = window.setTimeout(() => {
      setDemoClosingOpen(false);
      setDemoPreviewOpen(true);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isSelfDriveEntry]);

  const closeDemoPreview = () => {
    if (isSelfDriveEntry) {
      window.location.href = "/";
      return;
    }

    setDemoPreviewOpen(false);
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

    if (isSelfDriveEntry) {
      window.location.href = "/?close=transactional";
    }
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

  const currentTourBarBookingContext = (
    overrides: TourBarBookingContextOverride = {},
  ) => {
    const nextDatesSelected = overrides.datesSelected ?? datesSelected;
    const nextGuestsSelected = overrides.guestsSelected ?? guestsSelected;
    const nextCheckInDate = overrides.checkInDate ?? checkInDate;
    const nextCheckOutDate = overrides.checkOutDate ?? checkOutDate;
    const nextGuestAdults = overrides.guestAdults ?? guestAdults;
    const nextGuestChildren = overrides.guestChildren ?? guestChildren;
    const nextGuestLabel =
      overrides.guestLabel ?? tourBarGuestLabel(nextGuestAdults, nextGuestChildren);
    const nextBudgetBand = overrides.budgetBand ?? budgetBand;

    return {
      checkInDate: nextDatesSelected ? nextCheckInDate : null,
      checkOutDate: nextDatesSelected ? nextCheckOutDate : null,
      datesLabel: nextDatesSelected
        ? formatBookingDateRange(nextCheckInDate, nextCheckOutDate)
        : null,
      nights: nextDatesSelected ? bookingNights(nextCheckInDate, nextCheckOutDate) : null,
      adults: nextGuestsSelected ? nextGuestAdults : null,
      children: nextGuestsSelected ? nextGuestChildren : null,
      guests: nextGuestsSelected ? nextGuestAdults + nextGuestChildren : null,
      guestLabel: nextGuestsSelected ? nextGuestLabel : null,
      budgetBand: nextBudgetBand,
    };
  };

  const commitTourBarBookingContextToWorkingStay = (next: {
    checkInDate?: string | null;
    checkOutDate?: string | null;
    datesLabel?: string | null;
    adults?: number | null;
    children?: number | null;
    guests?: number | null;
    guestLabel?: string | null;
    budgetBand?: string | null;
  }) => {
    setTourBarWorkingStay((current) => ({
      ...current,
      ...next,
    }));
  };

  const queueTourBarBookingResumeOverride = (
    next: TourBarBookingContextOverride,
  ) => {
    tourBarBookingResumeOverrideRef.current = {
      ...(tourBarBookingResumeOverrideRef.current || {}),
      ...next,
    };
  };

  const syncTourBarCalendarMonthToDate = (value: string) => {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    setTourBarCalendarMonth({ year, monthIndex: month - 1 });
  };

  const openTourBarBookingWidget = (widget: Exclude<TourBarBookingWidget, null>) => {
    setActiveTourBarBookingWidget(widget);
    if (widget === "dates") {
      syncTourBarCalendarMonthToDate(checkInDate || "2026-06-12");
      setTourBarDatePicker("check-in");
      return;
    }

    setTourBarDatePicker(null);
  };

  const closeTourBarBookingWidget = () => {
    setActiveTourBarBookingWidget(null);
    setTourBarDatePicker(null);
  };

  const openTourBarDatePicker = (kind: Exclude<TourBarDatePickerKind, null>) => {
    syncTourBarCalendarMonthToDate(kind === "check-in" ? checkInDate : checkOutDate || checkInDate);
    setTourBarDatePicker(kind);
  };

  const selectTourBarCalendarDate = (
    kind: Exclude<TourBarDatePickerKind, null>,
    value: string,
  ) => {
    if (kind === "check-in") {
      setCheckInDate(value);
      if (checkOutDate && checkOutDate <= value) {
        setCheckOutDate("");
      }
      setDatesSelected(false);
      syncTourBarCalendarMonthToDate(checkOutDate && checkOutDate > value ? checkOutDate : value);
      setTourBarDatePicker("check-out");
      commitTourBarBookingContextToWorkingStay({
        checkInDate: null,
        checkOutDate: null,
        datesLabel: null,
      });
      return;
    }

    setCheckOutDate(value);
    setDatesSelected(false);
    setTourBarDatePicker(null);
    commitTourBarBookingContextToWorkingStay({
      checkInDate: null,
      checkOutDate: null,
      datesLabel: null,
    });
  };

  const shiftTourBarCalendarMonth = (delta: number) => {
    setTourBarCalendarMonth((current) => {
      const next = new Date(current.year, current.monthIndex + delta, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
  };

  const resumeTourBarPendingQuery = (
    actions?: TourBarShellActions,
    pendingQuery?: string | null,
  ) => {
    const cleanQuery = String(pendingQuery || "").trim();
    if (!actions || !cleanQuery) return;

    window.setTimeout(() => {
      actions.submitPrimary(cleanQuery);
    }, 80);
  };

  const applyTourBarDates = (
    actions?: TourBarShellActions,
    pendingQuery?: string | null,
  ) => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return;
    const datesLabel = formatBookingDateRange(checkInDate, checkOutDate);
    queueTourBarBookingResumeOverride({
      datesSelected: true,
      guestsSelected,
      checkInDate,
      checkOutDate,
      guestAdults,
      guestChildren,
      guestLabel,
      budgetBand,
    });
    setDatesSelected(true);
    setTourBarDatePicker(null);
    setTourBarBookingHandoff((current) =>
      current ? { ...current, datesLabel } : current,
    );
    commitTourBarBookingContextToWorkingStay({
      checkInDate,
      checkOutDate,
      datesLabel,
    });

    if (!guestsSelected) {
      setActiveTourBarBookingWidget("guests");
      resumeTourBarPendingQuery(actions, pendingQuery);
      return;
    }

    setActiveTourBarBookingWidget(null);
    resumeTourBarPendingQuery(actions, pendingQuery);
  };

  const clearTourBarDates = () => {
    setDatesSelected(false);
    setCheckInDate("2026-06-12");
    setCheckOutDate("2026-06-15");
    setTourBarBookingHandoff((current) =>
      current ? { ...current, datesLabel: "Dates can be added in the next step" } : current,
    );
    setTourBarDatePicker("check-in");
    syncTourBarCalendarMonthToDate("2026-06-12");
    commitTourBarBookingContextToWorkingStay({
      checkInDate: null,
      checkOutDate: null,
      datesLabel: null,
    });
  };

  const applyTourBarGuests = (
    actions?: TourBarShellActions,
    pendingQuery?: string | null,
  ) => {
    const safeAdults = Math.max(1, Math.floor(guestAdults || 1));
    const safeChildren = Math.max(0, Math.floor(guestChildren || 0));
    const nextGuestLabel = tourBarGuestLabel(safeAdults, safeChildren);
    queueTourBarBookingResumeOverride({
      datesSelected: Boolean(checkInDate && checkOutDate && checkOutDate > checkInDate),
      guestsSelected: true,
      checkInDate,
      checkOutDate,
      guestAdults: safeAdults,
      guestChildren: safeChildren,
      guestLabel: nextGuestLabel,
      budgetBand,
    });
    setGuestAdults(safeAdults);
    setGuestChildren(safeChildren);
    setGuestLabel(nextGuestLabel);
    setGuestsSelected(true);
    setTourBarBookingHandoff((current) =>
      current ? { ...current, guestsLabel: nextGuestLabel } : current,
    );
    commitTourBarBookingContextToWorkingStay({
      adults: safeAdults,
      children: safeChildren,
      guests: safeAdults + safeChildren,
      guestLabel: nextGuestLabel,
    });
    setActiveTourBarBookingWidget(null);
    setActiveFormSpotlight(null);
    resumeTourBarPendingQuery(actions, pendingQuery);
  };

  const clearTourBarGuests = () => {
    setGuestsSelected(false);
    setGuestAdults(1);
    setGuestChildren(0);
    setGuestLabel(tourBarGuestLabel(1, 0));
    setTourBarBookingHandoff((current) =>
      current ? { ...current, guestsLabel: "Guests can be added in the next step" } : current,
    );
    commitTourBarBookingContextToWorkingStay({
      adults: null,
      children: null,
      guests: null,
      guestLabel: null,
    });
  };

  const renderTourBarBookingContextPanel = (
    actions?: TourBarShellActions,
    lockedWidget: Exclude<TourBarBookingWidget, null> | null = null,
    pendingQuery = "",
  ) => (
    <TourBarBookingContextPanel
      datesSelected={datesSelected}
      guestsSelected={guestsSelected}
      checkInDate={checkInDate}
      checkOutDate={checkOutDate}
      guestAdults={guestAdults}
      guestChildren={guestChildren}
      activeWidget={activeTourBarBookingWidget}
      activeDatePicker={tourBarDatePicker}
      calendarMonth={tourBarCalendarMonth}
      onOpenWidget={openTourBarBookingWidget}
      onCloseWidget={closeTourBarBookingWidget}
      onOpenDatePicker={openTourBarDatePicker}
      onSelectCalendarDate={selectTourBarCalendarDate}
      onShiftCalendarMonth={shiftTourBarCalendarMonth}
      onApplyDates={() => applyTourBarDates(actions, pendingQuery)}
      onClearDates={clearTourBarDates}
      onGuestAdultsChange={(value) => {
        setGuestAdults(Math.max(1, value));
        setGuestsSelected(false);
        commitTourBarBookingContextToWorkingStay({
          adults: null,
          children: null,
          guests: null,
          guestLabel: null,
        });
      }}
      onGuestChildrenChange={(value) => {
        setGuestChildren(Math.max(0, value));
        setGuestsSelected(false);
        commitTourBarBookingContextToWorkingStay({
          adults: null,
          children: null,
          guests: null,
          guestLabel: null,
        });
      }}
      onApplyGuests={() => applyTourBarGuests(actions, pendingQuery)}
      onClearGuests={clearTourBarGuests}
      lockedWidget={lockedWidget}
    />
  );
  void renderTourBarBookingContextPanel;

  const updateTourBarWorkingStayFromTarget = (target?: TourBarPageTarget | null) => {
    if (!target) return;

    const targetId = sectionIdFromTourBarTarget(target.targetId);
    const roomId = roomIdFromTourBarTarget(targetId);
    const packageId = packageIdFromTourBarTarget(targetId);

    if (roomId) {
      setSelectedRoom(roomId);
    }

    if (packageId) {
      setSelectedPackages((current) => normalizeBookingPackageIds([...current, packageId]));
    }

    setTourBarWorkingStay((current) => {
      const currentPackages = normalizeBookingPackageIds(current.packageIds);
      const nextPackageIds = packageId
        ? normalizeBookingPackageIds([...currentPackages, packageId])
        : currentPackages;
      const nextRoomId = roomId || current.roomId || selectedRoom || null;

      return {
        ...current,
        roomId: nextRoomId,
        packageIds: nextPackageIds,
        activeTargetId: targetId || current.activeTargetId || nextRoomId,
        activeRoomId: roomId || current.activeRoomId || nextRoomId,
        activePackageId: packageId || current.activePackageId || nextPackageIds[0] || null,
      };
    });
  };

  const applyTourBarBookingContext = (raw: TourBarHotelBookingBackendResponse, { preferNextStep = false }: { preferNextStep?: boolean } = {}) => {
    const visibleContext = asRecord(raw.visibleContext);
    const bookingContext = asRecord(visibleContext.bookingContext);
    const activeStayPlan = asRecord(
      preferNextStep
        ? raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan
        : raw.activeStayPlan || visibleContext.activeStayPlan,
    );
    const activeRoom = asRecord(activeStayPlan.room);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep });
    const roomId = String(
      activeStayPlan.roomId ||
      activeStayPlan.roomTargetId ||
      activeRoom.targetId ||
      activeRoom.roomId ||
      selected.roomId ||
      visibleContext.selectedRoomId ||
      "",
    );
    const packageIds = normalizeBookingPackageIds([
      ...packageIdsFromStayPlan(activeStayPlan),
      ...packageIdsFromTourBarCombination(selected),
      ...(visibleContext.suggestedPackageId ? [String(visibleContext.suggestedPackageId)] : []),
    ]);
    const validRoomId = roomId && roomStepOrder.includes(roomId) ? roomId : "";
    const activeTargetId =
      validRoomId ||
      packageIds[0] ||
      sectionIdFromTourBarTarget(visibleContext.activeTargetId || visibleContext.activeAnchor || "") ||
      null;

    if (validRoomId) {
      setSelectedRoom(validRoomId);
    }

    setSelectedPackages(packageIds);
    setTourBarWorkingStay((current) => ({
      ...current,
      roomId: validRoomId || current.roomId || selectedRoom || null,
      packageIds,
      activeTargetId: activeTargetId || current.activeTargetId || validRoomId || selectedRoom || null,
      activeRoomId: validRoomId || current.activeRoomId || selectedRoom || null,
      activePackageId: packageIds[0] || current.activePackageId || null,
      lastPlannerIntent: String(raw.intent || raw.displayMode || raw.commerceAction || current.lastPlannerIntent || ""),
      lastResultTitle: String(raw.title || selected.roomShortTitle || selected.roomTitle || current.lastResultTitle || ""),
      lastResultAction: String(raw.commerceAction || raw.intent || current.lastResultAction || ""),
    }));

    const nextCheckInDate = bookingContext.checkInDate ? String(bookingContext.checkInDate) : "";
    const nextCheckOutDate = bookingContext.checkOutDate ? String(bookingContext.checkOutDate) : "";
    const nextGuests = Number(bookingContext.guests || 0);
    const nextAdults = Number(bookingContext.adults || 0);
    const nextChildren = Number(bookingContext.children || 0);

    if (nextCheckInDate && nextCheckOutDate) {
      setCheckInDate(nextCheckInDate);
      setCheckOutDate(nextCheckOutDate);
      setDatesSelected(true);
      setActiveFormSpotlight(null);
      commitTourBarBookingContextToWorkingStay({
        checkInDate: nextCheckInDate,
        checkOutDate: nextCheckOutDate,
        datesLabel: formatBookingDateRange(nextCheckInDate, nextCheckOutDate),
      });
    }

    if (bookingContext.guests || bookingContext.guestLabel || bookingContext.adults) {
      const fromLabel = tourBarGuestCountsFromLabel(String(bookingContext.guestLabel || ""));
      const adults = Math.max(1, nextAdults || fromLabel?.adults || nextGuests || 1);
      const children = Math.max(0, nextChildren || fromLabel?.children || 0);
      const nextGuestLabel = String(
        bookingContext.guestLabel || tourBarGuestLabel(adults, children),
      );
      setGuestAdults(adults);
      setGuestChildren(children);
      setGuestLabel(nextGuestLabel);
      setGuestsSelected(true);
      setActiveFormSpotlight(null);
      commitTourBarBookingContextToWorkingStay({
        adults,
        children,
        guests: adults + children,
        guestLabel: nextGuestLabel,
      });
    }

    if (bookingContext.maxNightlyBudgetUsd || bookingContext.maxTotalBudgetUsd) {
      setBudgetBand(
        bookingContext.maxNightlyBudgetUsd
          ? `Under $${bookingContext.maxNightlyBudgetUsd}/night`
          : `Under $${bookingContext.maxTotalBudgetUsd} total`,
      );
    }
  };

  const stageTourBarBooking = (raw: TourBarHotelBookingBackendResponse) => {
    applyTourBarBookingContext(raw, { preferNextStep: true });
    setTourBarBookingHandoff(buildTourBarBookingHandoff(raw, currentTourBarBookingContext()));
    setTourBarBookingHandoffOpen(true);
    setBookingRailSpotlight(false);
    setActiveFormSpotlight(null);
    setTourBarNavigationState(null);
    setTourBarSpotlightTarget(null);

    const bookingTarget = tourBarBookingFocusTarget(raw);
    if (bookingTarget) {
      tourBarNavigationRunRef.current += 1;
      setCurrentPage(bookingTarget.pageId);
      spotlightTourBarAnchor(bookingTarget.targetId, bookingTarget.targetSelector, 560);
    }
  };

  const spotlightTourBarAnchor = (targetId: string, targetSelector?: string, delay = 420) => {
    const sectionId = sectionIdFromTourBarTarget(targetId);
    if (!sectionId) return;

    const runToken = tourBarNavigationRunRef.current;
    const selector = targetSelector || `[data-tour-id="${sectionId}"], #${sectionId}`;
    const pageId = pageIdFromTourBarTarget(sectionId);

    // Booking now uses the SmartBar-owned focus controller for scroll,
    // placement verification, and the frost/glow overlay. Keep App-Commerce
    // responsible only for page state and active anchor bookkeeping.
    setTourBarSpotlightTarget(null);
    setTourBarSpotlightNonce((current) => current + 1);
    clearSmartBarFocusOverlay();

    window.setTimeout(() => {
      const isCurrentRun = () => tourBarNavigationRunRef.current === runToken;
      if (!isCurrentRun()) return;

      setActiveAnchor(sectionId);
      void smartbarFocusTarget(
        {
          pageId,
          targetId: sectionId,
          targetSelector: selector,
        },
        { initialDelayMs: 0 },
      ).then(() => {
        if (!isCurrentRun()) clearSmartBarFocusOverlay();
      });
    }, delay);
  };


  const runTourBarNavigationSequence = (
    targets: TourBarPageTarget[],
    { initialDelay = 520 }: { initialDelay?: number } = {},
  ) => {
    const steps: TourBarPageTarget[] = [];
    targets.forEach((target) => addTourBarNavigationTarget(steps, target));
    const cappedSteps = steps.slice(0, 4);
    if (!cappedSteps.length) return;

    tourBarNavigationRunRef.current += 1;
    const first = cappedSteps[0];
    const pageId = first.pageId || pageIdFromTourBarTarget(first.targetId);

    setTourBarNavigationState(
      cappedSteps.length > 1
        ? { steps: cappedSteps, activeIndex: 0 }
        : null,
    );
    updateTourBarWorkingStayFromTarget(first);
    setCurrentPage(pageId);
    spotlightTourBarAnchor(first.targetId, first.targetSelector, initialDelay);
  };

  const backTourBarNavigationStep = () => {
    const current = tourBarNavigationState;
    if (!current || current.steps.length < 2) return;

    const previousIndex = Math.max(current.activeIndex - 1, 0);
    if (previousIndex === current.activeIndex) return;

    const target = current.steps[previousIndex];
    const pageId = target.pageId || pageIdFromTourBarTarget(target.targetId);

    tourBarNavigationRunRef.current += 1;
    setTourBarNavigationState({ ...current, activeIndex: previousIndex });
    updateTourBarWorkingStayFromTarget(target);
    setCurrentPage(pageId);
    spotlightTourBarAnchor(target.targetId, target.targetSelector, 180);
  };

  const advanceTourBarNavigationStep = () => {
    const current = tourBarNavigationState;
    if (!current || current.steps.length < 2) return;

    const nextIndex = Math.min(current.activeIndex + 1, current.steps.length - 1);
    if (nextIndex === current.activeIndex) return;

    const target = current.steps[nextIndex];
    const pageId = target.pageId || pageIdFromTourBarTarget(target.targetId);

    tourBarNavigationRunRef.current += 1;
    setTourBarNavigationState({ ...current, activeIndex: nextIndex });
    updateTourBarWorkingStayFromTarget(target);
    setCurrentPage(pageId);
    spotlightTourBarAnchor(target.targetId, target.targetSelector, 180);
  };

  const bookCurrentTourBarNavigationStep = (
    actions: TourBarShellActions,
    result: TourBarShellResult,
  ) => {
    const current = tourBarNavigationState;
    if (!current || current.steps.length < 2) return;

    const activeIndex = Math.min(Math.max(current.activeIndex, 0), current.steps.length - 1);
    const active = current.steps[activeIndex];
    const activeTargetId = sectionIdFromTourBarTarget(active.targetId);
    const activePackageId = packageBookingMeta[activeTargetId] ? activeTargetId : "";
    const roomId = roomStepOrder.includes(activeTargetId)
      ? activeTargetId
      : tourBarWorkingStay.roomId || selectedRoom || "room-business-king";
    const roomMeta = getRoomMeta(roomId);
    const nextPackageIds = normalizeBookingPackageIds(
      activePackageId
        ? [...selectedPackages, ...tourBarWorkingStay.packageIds, activePackageId]
        : [...selectedPackages, ...tourBarWorkingStay.packageIds],
    );
    const packageTitles = nextPackageIds
      .map((packageId) => getPackageMeta(packageId)?.title)
      .filter((title): title is string => Boolean(title));

    tourBarNavigationRunRef.current += 1;
    setTourBarNavigationState(null);
    setTourBarSpotlightTarget(null);
    setSelectedRoom(roomId);
    setSelectedPackages(nextPackageIds);
    setTourBarWorkingStay({
      roomId,
      packageIds: nextPackageIds,
      activeTargetId: activeTargetId || roomId,
      activeRoomId: roomId,
      activePackageId: activePackageId || nextPackageIds[0] || null,
      ...currentTourBarBookingContext(),
      lastPlannerIntent: tourBarWorkingStay.lastPlannerIntent || null,
      lastResultTitle: roomMeta?.title || active.targetText || null,
      lastResultAction: "tourbar_guided_stop_booking",
    });
    setTourBarBookingHandoff({
      roomTitle: roomMeta?.title || active.targetText || "Selected room",
      packageTitle: packageTitles[0] || "No package selected",
      datesLabel: datesSelected
        ? formatBookingDateRange(checkInDate, checkOutDate)
        : "Dates can be added in the next step",
      guestsLabel: guestsSelected ? guestLabel : "Guests can be added in the next step",
      budgetLabel: budgetBand || "No budget limit set",
      priceLabel: roomMeta?.price || "Rate ready",
    });
    setTourBarBookingHandoffOpen(true);
    setBookingRailSpotlight(false);
    setActiveFormSpotlight(null);

    setCurrentPage(pageIdFromTourBarTarget(roomId));
    spotlightTourBarAnchor(roomId, `[data-tour-id="${roomId}"], #${roomId}`, 180);

    actions.openStandaloneSheet({
      ...result,
      title: roomMeta?.title || active.targetText || result.title || "Booking handoff",
      focusAreaId: roomId,
      targetId: roomId,
      targetSelector: `[data-tour-id="${roomId}"], #${roomId}`,
      pageId: pageIdFromTourBarTarget(roomId),
      mode: "tourbar_booking_handoff",
      action: "tourbar_guided_stop_booking",
    });
  };


  const focusTourBarTarget = (result: TourBarShellResult) => {
    const raw = asRecord(result.raw);
    const target = primaryTourBarTarget(raw);

    applyTourBarBookingContext(raw);

    if (target.isBookingAction && isExplicitTourBarBookingRequest(raw)) {
      stageTourBarBooking(raw);
      return;
    }

    const navigationTargets = tourBarNavigationTargets(raw);
    if (navigationTargets.length) {
      runTourBarNavigationSequence(navigationTargets, { initialDelay: 520 });
      return;
    }

    const pageId = target.pageId || pageIdFromTourBarTarget(target.targetId);
    setCurrentPage(pageId);
    spotlightTourBarAnchor(target.targetId, target.targetSelector, 520);
  };

  const handleTourBarNextMove = (result: TourBarShellResult) => {
    const raw = asRecord(result.raw);
    const nextStep = asRecord(raw.nextStep);
    const label = String(
      result.nextMove?.label ||
        result.invitation?.text ||
        nextStep.label ||
        "",
    );
    const query = String(result.nextMove?.query || nextStep.query || "");

    if (!isBookingNextStepLabel(`${label} ${query}`)) {
      return false;
    }

    stageTourBarBooking(raw);
    return true;
  };

  const submitTourBarHotelBooking = async (
    query: string,
    context: TourBarShellTurnContext,
  ): Promise<TourBarShellResult> => {
    tourBarNavigationRunRef.current += 1;
    setTourBarNavigationState(null);
    setTourBarSpotlightTarget(null);
    setTourBarBookingHandoff(null);
    setTourBarBookingHandoffOpen(false);

    const shellBookingContext = context.bookingContext || null;
    const effectiveDatesSelected = Boolean(shellBookingContext?.datesSelected || datesSelected);
    const effectiveGuestsSelected = Boolean(shellBookingContext?.guestsSelected || guestsSelected);
    const effectiveCheckInDate = String(shellBookingContext?.checkInDate || checkInDate || "");
    const effectiveCheckOutDate = String(shellBookingContext?.checkOutDate || checkOutDate || "");
    const effectiveGuestAdults = Math.max(
      1,
      Number(shellBookingContext?.guestAdults ?? shellBookingContext?.adults ?? guestAdults ?? 1),
    );
    const effectiveGuestChildren = Math.max(
      0,
      Number(shellBookingContext?.guestChildren ?? shellBookingContext?.children ?? guestChildren ?? 0),
    );
    const effectiveGuestLabel =
      shellBookingContext?.guestLabel ||
      guestLabel ||
      tourBarGuestLabel(effectiveGuestAdults, effectiveGuestChildren);

    if (shellBookingContext?.datesSelected && effectiveCheckInDate && effectiveCheckOutDate) {
      setCheckInDate(effectiveCheckInDate);
      setCheckOutDate(effectiveCheckOutDate);
      setDatesSelected(true);
      setTourBarDatePicker(null);
      commitTourBarBookingContextToWorkingStay({
        checkInDate: effectiveCheckInDate,
        checkOutDate: effectiveCheckOutDate,
        datesLabel: formatBookingDateRange(effectiveCheckInDate, effectiveCheckOutDate),
      });
    }

    if (shellBookingContext?.guestsSelected) {
      setGuestAdults(effectiveGuestAdults);
      setGuestChildren(effectiveGuestChildren);
      setGuestLabel(effectiveGuestLabel);
      setGuestsSelected(true);
      commitTourBarBookingContextToWorkingStay({
        adults: effectiveGuestAdults,
        children: effectiveGuestChildren,
        guests: effectiveGuestAdults + effectiveGuestChildren,
        guestLabel: effectiveGuestLabel,
      });
    }

    setActiveTourBarBookingWidget(null);
    setTourBarDatePicker(null);

    const bookingContext = currentTourBarBookingContext({
      datesSelected: effectiveDatesSelected,
      guestsSelected: effectiveGuestsSelected,
      checkInDate: effectiveCheckInDate,
      checkOutDate: effectiveCheckOutDate,
      guestAdults: effectiveGuestAdults,
      guestChildren: effectiveGuestChildren,
      guestLabel: effectiveGuestLabel,
    });
    const activeStayPlan = {
      ...buildTourBarActiveStayPlan(
        {
          ...tourBarWorkingStay,
          checkInDate: bookingContext.checkInDate,
          checkOutDate: bookingContext.checkOutDate,
          datesLabel: bookingContext.datesLabel,
          adults: bookingContext.adults,
          children: bookingContext.children,
          guests: bookingContext.guests,
          guestLabel: bookingContext.guestLabel,
        },
        selectedRoom,
        selectedPackages,
      ),
      bookingContext,
    };

    const response = await fetch(TOURBAR_HOTEL_BOOKING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mode: TOURBAR_HOTEL_BOOKING_MODE,
        catalogMode: TOURBAR_HOTEL_BOOKING_MODE,
        message: query,
        guideConfig: {
          ...commerceGuideConfig,
          mode: TOURBAR_HOTEL_BOOKING_MODE,
          catalogMode: TOURBAR_HOTEL_BOOKING_MODE,
          packIds: {
            ...commerceGuideConfig.packIds,
            catalog: "tourbar_hotel_booking_matrix",
          },
        },
        visibleContext: {
          currentPage,
          activeAnchor,
          activeTargetId: tourBarWorkingStay.activeTargetId || activeAnchor,
          activeRoomId: activeStayPlan.activeRoomId,
          activePackageId: activeStayPlan.activePackageId,
          selectedRoomId: activeStayPlan.roomId || selectedRoom,
          selectedPackageIds: activeStayPlan.packageIds,
          activeStayPlan,
          tourBarWorkingStay: {
            ...tourBarWorkingStay,
            checkInDate: bookingContext.checkInDate,
            checkOutDate: bookingContext.checkOutDate,
            datesLabel: bookingContext.datesLabel,
            adults: bookingContext.adults,
            children: bookingContext.children,
            guests: bookingContext.guests,
            guestLabel: bookingContext.guestLabel,
          },
          bookingContext,
        },
        conversationContext: {
          currentResult: context.currentResult?.raw || context.currentResult || null,
          thread: context.thread,
          activeStayPlan,
          commerceContext: {
            activeStayPlan,
            tourBarWorkingStay: {
              ...tourBarWorkingStay,
              checkInDate: bookingContext.checkInDate,
              checkOutDate: bookingContext.checkOutDate,
              datesLabel: bookingContext.datesLabel,
              adults: bookingContext.adults,
              children: bookingContext.children,
              guests: bookingContext.guests,
              guestLabel: bookingContext.guestLabel,
            },
            dates: effectiveDatesSelected
              ? {
                  checkIn: effectiveCheckInDate,
                  checkOut: effectiveCheckOutDate,
                  label: formatBookingDateRange(effectiveCheckInDate, effectiveCheckOutDate),
                }
              : null,
            guests: effectiveGuestsSelected
              ? {
                  adults: effectiveGuestAdults,
                  children: effectiveGuestChildren,
                  label: effectiveGuestLabel,
                }
              : null,
            budget: budgetBand ? { band: budgetBand } : null,
          },
        },
      }),
    });

    const raw = (await response.json().catch(() => ({}))) as TourBarHotelBookingBackendResponse;

    if (!response.ok) {
      throw new Error(
        String(raw.message || raw.error || "TourBar hotel booking request failed."),
      );
    }

    return buildTourBarShellResult(raw);
  };

  const onBookRoom = (section: Section) => {
    setSelectedRoom(section.id);
    setSelectedPackages([]);
    setTourBarWorkingStay({
      roomId: section.id,
      packageIds: [],
      activeTargetId: section.id,
      activeRoomId: section.id,
      activePackageId: null,
      ...currentTourBarBookingContext(),
      lastPlannerIntent: tourBarWorkingStay.lastPlannerIntent || null,
      lastResultTitle: section.title,
      lastResultAction: "manual_room_book",
    });

    if (tourBarMode) {
      setCurrentPage("rooms");
      setActiveAnchor(section.id);
      setTourBarBookingHandoff({
        roomTitle: section.title,
        packageTitle: "No package selected",
        datesLabel: datesSelected ? formatBookingDateRange(checkInDate, checkOutDate) : "Dates can be added in the next step",
        guestsLabel: guestsSelected ? guestLabel : "Guests can be added in the next step",
        budgetLabel: budgetBand || "No budget limit set",
        priceLabel: section.price || "Rate ready",
      });
      return;
    }

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
        const adults = Math.max(1, Number(context.guests.adults || 1));
        const children = Math.max(0, Number(context.guests.children || 0));
        const nextGuestLabel = context.guests.label || tourBarGuestLabel(adults, children);
        setGuestAdults(adults);
        setGuestChildren(children);
        setGuestLabel(nextGuestLabel);
        setGuestsSelected(true);
        setActiveFormSpotlight(null);
      }

      if (context.budget?.band) {
        setBudgetBand(context.budget.band);
      }

      setSelectedRoom(normalizedRoomId);
      setSelectedPackages(normalizedPackageIds);
      setTourBarWorkingStay((current) => ({
        ...current,
        roomId: normalizedRoomId,
        packageIds: normalizedPackageIds,
        activeTargetId: normalizedRoomId,
        activeRoomId: normalizedRoomId,
        activePackageId: normalizedPackageIds[0] || null,
        ...(context.dates?.checkIn && context.dates?.checkOut
          ? {
              checkInDate: context.dates.checkIn,
              checkOutDate: context.dates.checkOut,
              datesLabel: context.dates.label || formatBookingDateRange(context.dates.checkIn, context.dates.checkOut),
            }
          : {}),
        ...(context.guests
          ? {
              adults: Math.max(1, Number(context.guests.adults || 1)),
              children: Math.max(0, Number(context.guests.children || 0)),
              guests:
                Math.max(1, Number(context.guests.adults || 1)) +
                Math.max(0, Number(context.guests.children || 0)),
              guestLabel:
                context.guests.label ||
                tourBarGuestLabel(
                  Math.max(1, Number(context.guests.adults || 1)),
                  Math.max(0, Number(context.guests.children || 0)),
                ),
            }
          : {}),
      }));
      setActiveFormSpotlight(null);

      if (tourBarMode) {
        setBookingRailSpotlight(false);
        return;
      }

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

      if (tourBarMode) {
        setBookingRailSpotlight(false);
        openTourBarBookingWidget("dates");
        return;
      }

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
      if (tourBarMode) {
        setBookingRailSpotlight(false);
        openTourBarBookingWidget("guests");
        return;
      }

      setGuestAdults(1);
      setGuestChildren(0);
      setGuestLabel(tourBarGuestLabel(1, 0));
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
  }, [activeAnchor, selectedRoom, tourBarMode]);

  const onNextRoomOption = (section: Section) => {
    const currentIndex = roomStepOrder.indexOf(section.id);
    const nextRoomId =
      roomStepOrder[(currentIndex + 1) % roomStepOrder.length] ||
      roomStepOrder[0];
    setCurrentPage("rooms");
    setActiveAnchor(nextRoomId);
    setSelectedRoom(nextRoomId);
    setTourBarWorkingStay((current) => ({
      ...current,
      roomId: nextRoomId,
      activeTargetId: nextRoomId,
      activeRoomId: nextRoomId,
    }));
    window.setTimeout(() => {
      const el = document.getElementById(nextRoomId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
  };

  const nextPage = pageOrder[pageIndex + 1] ?? null;
  const prevPage = pageOrder[pageIndex - 1] ?? null;
  const anchorButtons = useMemo(() => page.sections.slice(0, 7), [page]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.26),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_46%,#111827_100%)] text-slate-100">
      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        demoStatus={demoStatus}
        onStartDemo={openDemoPreview}
        onPauseDemo={() => setDemoStatus("paused")}
        onResumeDemo={() => setDemoStatus("running")}
        onStopDemo={stopDemo}
        showDemoControls={!tourBarMode}
      />

      <AnimatePresence>
        {!tourBarMode && demoPreviewOpen && demoStatus === "idle" && (
          <DemoPreviewCard
            title="Guided Commerce"
            options={[
              {
                label: "Natural Language Booking",
                description: "Visitor gives lots of detail.",
                onClick: () => startSelectedDemo(guidedCommerceRichIntentDemo),
              },
              {
                label: "Assisted Completion",
                description: "Visitor gives a vague request.",
                onClick: () => startSelectedDemo(guidedCommerceAssistedCompletionDemo),
              },
            ]}
            onClose={closeDemoPreview}
          />
        )}
        {!tourBarMode && demoClosingOpen && demoStatus === "idle" && (
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
                  spotlighted={tourBarSpotlightTarget === section.id}
                  spotlightNonce={tourBarSpotlightNonce}
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

          {!tourBarMode && (
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
          )}

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

      {tourBarMode ? (
        <div className="fixed right-4 top-4 z-[10060] sm:right-6 sm:top-6">
          <TourBarBooking
            onSubmit={submitTourBarHotelBooking}
            onResult={focusTourBarTarget}
            onNextMove={handleTourBarNextMove}
            renderResultExtras={(result, actions) => (
              <TourBarNavigationControls
                state={tourBarNavigationState}
                onBack={backTourBarNavigationStep}
                onNext={advanceTourBarNavigationStep}
                onBook={() => bookCurrentTourBarNavigationStep(actions, result)}
              />
            )}
            renderStandaloneSheet={(_result, actions) => (
              tourBarBookingHandoffOpen ? (
                <TourBarHotelBookingHandoffSheet
                  bookingHandoff={tourBarBookingHandoff}
                  actions={actions}
                />
              ) : null
            )}
          />
        </div>
      ) : (
        <>
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
            initialShellState={isSelfDriveEntry ? "launcher" : "welcome"}
            suppressWelcomeCard={isSelfDriveEntry || demoPreviewOpen || demoClosingOpen}
            demoStatus={demoStatus}
            demoInteractionLocked={isSelfDriveEntry}
          />
        </>
      )}
    </div>
  );
}
