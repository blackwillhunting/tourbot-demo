import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Coffee,
  CreditCard,
  Database,
  Flame,
  Handshake,
  Landmark,
  MessageSquare,
  Network,
  Package,
  Plus,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { SmartBarSpeedSurface } from "./smartBarSpeedScript";

type AppPageId = "home" | "solutions" | "cyber" | "hedge-fund" | "compliance";

type NexaPathSection = {
  id: string;
  pageId: AppPageId;
  pageIndex: number;
  title: string;
  body: string;
  Icon: LucideIcon;
  tone: string;
  chips: string[];
  shape: "hero" | "grid" | "proof" | "split" | "cta" | "feature" | "comparison" | "dark" | "timeline";
};

type TargetCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  badge?: string;
  Icon: LucideIcon;
  shape?: "wide" | "tall" | "large" | "compact";
  tone?: "emerald" | "slate" | "teal" | "amber" | "sky" | "violet";
};

type FillerCard = {
  kind: "filler";
  eyebrow: string;
  title: string;
  body?: string;
  badge?: string;
  Icon: LucideIcon;
  shape: "wide" | "tall" | "large" | "compact" | "strip" | "pill";
  tone: "emerald" | "slate" | "teal" | "amber" | "sky" | "violet" | "rose";
};

type WallItem = { kind: "target"; target: TargetCard } | FillerCard;
type WallCardShape = NonNullable<TargetCard["shape"]> | FillerCard["shape"];

const NEXAPATH_SECTIONS: NexaPathSection[] = [
  {
    id: "hero-modern-provider",
    pageId: "home",
    pageIndex: 0,
    title: "Who we are",
    body:
      "We position ourselves as a modern intelligent services partner helping regulated and financial firms modernize infrastructure, strengthen resilience, and improve decision support.",
    Icon: Building2,
    tone: "from-slate-950 to-slate-700",
    chips: ["Advisory", "Operations", "Modernization"],
    shape: "hero",
  },
  {
    id: "solutions-grid",
    pageId: "home",
    pageIndex: 1,
    title: "Core solution families",
    body:
      "Explore four major capability lanes: AI & Data Solutions, Cloud & Infrastructure, Cybersecurity & Compliance, and Managed Solutions.",
    Icon: Briefcase,
    tone: "from-indigo-900 to-slate-700",
    chips: ["AI", "Cloud", "Cyber", "Managed"],
    shape: "grid",
  },
  {
    id: "industries-preview",
    pageId: "home",
    pageIndex: 3,
    title: "Industries served",
    body:
      "We organize value around industry reality, not just technology. Sample focus areas include hedge funds, private equity, insurance, and biotech.",
    Icon: Landmark,
    tone: "from-emerald-900 to-slate-700",
    chips: ["Hedge funds", "PE", "Insurance"],
    shape: "split",
  },
  {
    id: "compliance-preview",
    pageId: "home",
    pageIndex: 4,
    title: "Compliance lens",
    body:
      "Regulatory and policy pressure shapes nearly every technology decision in this mock site. The compliance center gives visitors a way to explore that lens directly.",
    Icon: Shield,
    tone: "from-amber-800 to-slate-700",
    chips: ["Policy", "Controls", "Risk"],
    shape: "split",
  },
  {
    id: "hedgefund-overview",
    pageId: "hedge-fund",
    pageIndex: 0,
    title: "Industry overview",
    body:
      "Hedge funds need secure, scalable platforms, disciplined operations, strong resilience, and a technology partner that understands regulated pressure.",
    Icon: BarChart3,
    tone: "from-emerald-950 to-slate-800",
    chips: ["Trading", "Operations", "Controls"],
    shape: "hero",
  },
  {
    id: "hedgefund-cloud",
    pageId: "hedge-fund",
    pageIndex: 1,
    title: "Cloud and operations backbone",
    body:
      "Stable infrastructure and secure collaboration support both trading operations and broader firm operations.",
    Icon: Cloud,
    tone: "from-cyan-900 to-slate-700",
    chips: ["Backbone", "Collaboration", "Reliability"],
    shape: "feature",
  },
  {
    id: "hedgefund-cyber",
    pageId: "hedge-fund",
    pageIndex: 2,
    title: "Cyber resilience and compliance",
    body:
      "Cyber and compliance needs are not side concerns. They shape how the operating model must be designed and maintained.",
    Icon: Shield,
    tone: "from-rose-900 to-slate-800",
    chips: ["Resilience", "Compliance", "Defense"],
    shape: "feature",
  },
  {
    id: "hedgefund-ai-data",
    pageId: "hedge-fund",
    pageIndex: 3,
    title: "AI and data",
    body:
      "Data modernization and selective AI can improve visibility, insight, and operating efficiency when built on governed foundations.",
    Icon: Sparkles,
    tone: "from-indigo-900 to-slate-700",
    chips: ["Insight", "Data", "AI"],
    shape: "feature",
  },
  {
    id: "hedgefund-modern-work",
    pageId: "hedge-fund",
    pageIndex: 4,
    title: "Modern work",
    body:
      "The collaboration layer matters too. Strong knowledge flow and practical workflow tooling can improve execution across teams.",
    Icon: Network,
    tone: "from-slate-800 to-emerald-800",
    chips: ["Teams", "Knowledge", "Execution"],
    shape: "split",
  },
  {
    id: "hedgefund-copilot",
    pageId: "hedge-fund",
    pageIndex: 5,
    title: "Copilot journeys",
    body:
      "Copilot-style productivity can enhance workflows, but only when paired with security, policy, and realistic operating priorities.",
    Icon: Sparkles,
    tone: "from-violet-900 to-slate-800",
    chips: ["M365 Copilot", "Workflow", "Adoption"],
    shape: "dark",
  },
  {
    id: "hedgefund-contact-cta",
    pageId: "hedge-fund",
    pageIndex: 6,
    title: "Talk through your firm model",
    body:
      "A guided industry tour should end by narrowing toward a concrete next step for the buyer.",
    Icon: ArrowRight,
    tone: "from-slate-950 to-indigo-800",
    chips: ["Sales", "Workshop", "Discovery"],
    shape: "cta",
  },
  {
    id: "topic-dora",
    pageId: "compliance",
    pageIndex: 5,
    title: "DORA",
    body:
      "This section is a useful deeper-drill destination for resilience, ICT risk management, incident handling, testing, and third-party oversight.",
    Icon: Landmark,
    tone: "from-amber-900 to-slate-800",
    chips: ["ICT risk", "Resilience", "Third-party"],
    shape: "dark",
  },
];

const ORDERING_TARGETS: TargetCard[] = [
  {
    id: "smartbar-order-menu",
    eyebrow: "Menu surface",
    title: "Menu categories",
    body: "Combos, sides, drinks, and modifiers stay readable while SmartBar does the work.",
    badge: "Menu",
    Icon: Utensils,
    shape: "wide",
    tone: "amber",
  },
  {
    id: "smartbar-order-combo",
    eyebrow: "Messy request",
    title: "Double cheeseburger combo",
    body: "Plain-English shorthand can still become a structured cart line.",
    badge: "$11.99",
    Icon: Search,
    shape: "large",
    tone: "slate",
  },
  {
    id: "smartbar-order-qualifiers",
    eyebrow: "Missing details",
    title: "Required choices",
    body: "SmartBar pauses checkout and asks for the exact choices needed to complete the order.",
    badge: "Needs choice",
    Icon: ClipboardList,
    shape: "tall",
    tone: "amber",
  },
  {
    id: "smartbar-order-cart",
    eyebrow: "Cart state",
    title: "Ready cart",
    body: "Items, quantities, modifiers, and totals are assembled into a reviewable order.",
    badge: "Ready",
    Icon: ShoppingCart,
    shape: "wide",
    tone: "teal",
  },
  {
    id: "smartbar-order-checkout",
    eyebrow: "Handoff",
    title: "Checkout handoff",
    body: "When the order is complete, SmartBar can hand a clean cart to the next system.",
    badge: "Checkout",
    Icon: CreditCard,
    shape: "large",
    tone: "emerald",
  },
];

const BOOKING_TARGETS: TargetCard[] = [
  {
    id: "smartbar-booking-rooms",
    eyebrow: "Room path",
    title: "Room recommendations",
    body: "SmartBar compares options against view, budget, breakfast, and booking intent.",
    badge: "Rooms",
    Icon: BedDouble,
    shape: "large",
    tone: "sky",
  },
  {
    id: "smartbar-booking-breakfast",
    eyebrow: "Package",
    title: "Breakfast add-on",
    body: "Add-ons can be matched, priced, and attached without losing the room context.",
    badge: "+$32/night",
    Icon: Coffee,
    shape: "wide",
    tone: "amber",
  },
  {
    id: "smartbar-booking-context",
    eyebrow: "Required context",
    title: "Dates & guests",
    body: "Booking details are collected only when needed, then reused by the recommendation path.",
    badge: "Required",
    Icon: CalendarDays,
    shape: "tall",
    tone: "violet",
  },
  {
    id: "smartbar-booking-summary",
    eyebrow: "Handoff",
    title: "Booking summary",
    body: "The selected room, package, dates, guests, and pricing move into a clean handoff.",
    badge: "Summary",
    Icon: CheckCircle2,
    shape: "wide",
    tone: "emerald",
  },
  {
    id: "smartbar-booking-toolbelt",
    eyebrow: "Finale",
    title: "Response tools",
    body: "Text, choices, carts, selectors, summaries, and live chat can all appear from the same bar.",
    badge: "Toolbelt",
    Icon: MessageSquare,
    shape: "large",
    tone: "slate",
  },
];

const TARGETS_BY_SURFACE: Record<Exclude<SmartBarSpeedSurface, "info">, TargetCard[]> = {
  ordering: ORDERING_TARGETS,
  booking: BOOKING_TARGETS,
};

const SURFACE_COPY: Record<SmartBarSpeedSurface, { eyebrow: string; title: string; body: string }> = {
  info: {
    eyebrow: "Demo 1 · informational site",
    title: "NexaPath Advisory",
    body: "The target wall now uses the same real section-card language as the NexaPath site instead of invented demo objects.",
  },
  ordering: {
    eyebrow: "Demo 2 · ordering site",
    title: "BurgerRush Carryout",
    body: "A carryout surface where SmartBar turns messy food requests into structured cart actions.",
  },
  booking: {
    eyebrow: "Demo 3 · booking site",
    title: "Domi Hotel",
    body: "A booking surface where SmartBar keeps room, package, date, and guest context together.",
  },
};

const FILLERS_BY_SURFACE: Record<Exclude<SmartBarSpeedSurface, "info">, FillerCard[]> = {
  ordering: [
    { kind: "filler", eyebrow: "Menu object", title: "Featured combos", body: "Meal tiles, modifiers, sauces", badge: "Combos", Icon: Utensils, shape: "large", tone: "amber" },
    { kind: "filler", eyebrow: "Promo", title: "Lunch rush bundle", badge: "Promo", Icon: Sparkles, shape: "compact", tone: "rose" },
    { kind: "filler", eyebrow: "Menu object", title: "Sides drawer", body: "Fries, rings, pies, seasonal sides", badge: "Sides", Icon: ClipboardList, shape: "wide", tone: "slate" },
    { kind: "filler", eyebrow: "Qualifier", title: "Sauce choices", body: "Required selections hidden in plain sight", badge: "Choice", Icon: Search, shape: "tall", tone: "teal" },
    { kind: "filler", eyebrow: "Drink row", title: "Fountain drinks", badge: "Drinks", Icon: Coffee, shape: "pill", tone: "amber" },
    { kind: "filler", eyebrow: "Cart object", title: "Subtotal preview", body: "Tax, modifiers, and quantities", badge: "$", Icon: ShoppingCart, shape: "wide", tone: "emerald" },
    { kind: "filler", eyebrow: "POS", title: "Kitchen notes", badge: "POS", Icon: Database, shape: "compact", tone: "slate" },
    { kind: "filler", eyebrow: "Handoff object", title: "Payment lane", body: "Checkout only when every required choice is complete", badge: "Pay", Icon: CreditCard, shape: "large", tone: "rose" },
  ],
  booking: [
    { kind: "filler", eyebrow: "Hotel object", title: "Stay dates", body: "Calendar context shapes every result", badge: "Dates", Icon: CalendarDays, shape: "wide", tone: "sky" },
    { kind: "filler", eyebrow: "Room object", title: "View ladder", badge: "Views", Icon: BedDouble, shape: "compact", tone: "violet" },
    { kind: "filler", eyebrow: "Package object", title: "Parking package", body: "Add-ons are attached only when compatible", badge: "Add-on", Icon: CreditCard, shape: "tall", tone: "amber" },
    { kind: "filler", eyebrow: "Guest object", title: "Guest count", body: "Capacity filters room recommendations", badge: "Guests", Icon: MessageSquare, shape: "large", tone: "slate" },
    { kind: "filler", eyebrow: "Amenity", title: "Breakfast paths", badge: "Food", Icon: Coffee, shape: "pill", tone: "emerald" },
    { kind: "filler", eyebrow: "Booking object", title: "Rate comparison", body: "Nightly, stay-level, and package prices", badge: "Rates", Icon: CheckCircle2, shape: "wide", tone: "sky" },
    { kind: "filler", eyebrow: "Selector", title: "Children and adults", badge: "Guests", Icon: ClipboardList, shape: "compact", tone: "violet" },
    { kind: "filler", eyebrow: "Handoff object", title: "Reservation summary", body: "Clean package for booking handoff", badge: "Book", Icon: Handshake, shape: "large", tone: "emerald" },
  ],
};

const TONE_CLASS: Record<NonNullable<TargetCard["tone"]> | FillerCard["tone"], {
  card: string;
  glow: string;
  eyebrow: string;
  badge: string;
  icon: string;
  body: string;
}> = {
  emerald: {
    card: "border-emerald-300/35 bg-emerald-900/88 text-emerald-50 ring-emerald-300/20",
    glow: "bg-[radial-gradient(circle_at_18%_10%,rgba(110,231,183,0.30),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.92),rgba(15,118,110,0.78))]",
    eyebrow: "text-emerald-200/80",
    badge: "bg-emerald-200 text-emerald-950",
    icon: "bg-emerald-200/18 text-emerald-100 ring-emerald-200/30",
    body: "text-emerald-50/78",
  },
  slate: {
    card: "border-slate-400/35 bg-slate-900/90 text-slate-50 ring-slate-300/20",
    glow: "bg-[radial-gradient(circle_at_16%_8%,rgba(148,163,184,0.34),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(51,65,85,0.82))]",
    eyebrow: "text-slate-300/80",
    badge: "bg-slate-100 text-slate-950",
    icon: "bg-white/10 text-slate-100 ring-white/20",
    body: "text-slate-100/74",
  },
  teal: {
    card: "border-teal-300/35 bg-teal-900/88 text-teal-50 ring-teal-300/20",
    glow: "bg-[radial-gradient(circle_at_18%_10%,rgba(94,234,212,0.28),transparent_34%),linear-gradient(135deg,rgba(19,78,74,0.94),rgba(17,94,89,0.80))]",
    eyebrow: "text-teal-200/80",
    badge: "bg-teal-200 text-teal-950",
    icon: "bg-teal-200/18 text-teal-100 ring-teal-200/30",
    body: "text-teal-50/76",
  },
  amber: {
    card: "border-orange-300/38 bg-orange-950/88 text-orange-50 ring-orange-300/20",
    glow: "bg-[radial-gradient(circle_at_18%_10%,rgba(251,146,60,0.34),transparent_34%),linear-gradient(135deg,rgba(67,20,7,0.94),rgba(154,52,18,0.76))]",
    eyebrow: "text-orange-200/82",
    badge: "bg-orange-200 text-orange-950",
    icon: "bg-orange-200/18 text-orange-100 ring-orange-200/30",
    body: "text-orange-50/76",
  },
  sky: {
    card: "border-sky-300/36 bg-sky-950/88 text-sky-50 ring-sky-300/20",
    glow: "bg-[radial-gradient(circle_at_18%_10%,rgba(125,211,252,0.30),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.94),rgba(12,74,110,0.78))]",
    eyebrow: "text-sky-200/80",
    badge: "bg-sky-200 text-sky-950",
    icon: "bg-sky-200/18 text-sky-100 ring-sky-200/30",
    body: "text-sky-50/76",
  },
  violet: {
    card: "border-violet-300/36 bg-violet-950/88 text-violet-50 ring-violet-300/20",
    glow: "bg-[radial-gradient(circle_at_18%_10%,rgba(196,181,253,0.30),transparent_34%),linear-gradient(135deg,rgba(46,16,101,0.94),rgba(91,33,182,0.76))]",
    eyebrow: "text-violet-200/80",
    badge: "bg-violet-200 text-violet-950",
    icon: "bg-violet-200/18 text-violet-100 ring-violet-200/30",
    body: "text-violet-50/76",
  },
  rose: {
    card: "border-rose-300/36 bg-rose-950/86 text-rose-50 ring-rose-300/20",
    glow: "bg-[radial-gradient(circle_at_18%_10%,rgba(253,164,175,0.28),transparent_34%),linear-gradient(135deg,rgba(76,5,25,0.92),rgba(159,18,57,0.74))]",
    eyebrow: "text-rose-200/80",
    badge: "bg-rose-200 text-rose-950",
    icon: "bg-rose-200/18 text-rose-100 ring-rose-200/30",
    body: "text-rose-50/76",
  },
};

const SHAPE_CLASS: Record<WallCardShape, string> = {
  compact: "min-h-[92px] sm:min-h-[150px] md:col-span-2 xl:col-span-3",
  pill: "min-h-[64px] sm:min-h-[112px] md:col-span-3 xl:col-span-4 rounded-[999px]",
  wide: "min-h-[118px] sm:min-h-[190px] md:col-span-4 xl:col-span-6",
  tall: "min-h-[150px] sm:min-h-[300px] md:col-span-3 xl:col-span-4 md:row-span-2",
  large: "min-h-[142px] sm:min-h-[260px] md:col-span-6 xl:col-span-7",
  strip: "min-h-[78px] sm:min-h-[128px] md:col-span-6 xl:col-span-8",
};

function fillerAt(surface: Exclude<SmartBarSpeedSurface, "info">, index: number) {
  return FILLERS_BY_SURFACE[surface][index % FILLERS_BY_SURFACE[surface].length];
}

function legacyWallItemsFor(surface: Exclude<SmartBarSpeedSurface, "info">): WallItem[] {
  const targets = TARGETS_BY_SURFACE[surface];

  return [
    fillerAt(surface, 0),
    fillerAt(surface, 1),
    fillerAt(surface, 2),
    fillerAt(surface, 3),
    fillerAt(surface, 4),
    { kind: "target", target: targets[0] },
    fillerAt(surface, 5),
    fillerAt(surface, 6),
    fillerAt(surface, 7),
    { kind: "target", target: targets[1] },
    fillerAt(surface, 2),
    fillerAt(surface, 4),
    fillerAt(surface, 1),
    { kind: "target", target: targets[2] },
    fillerAt(surface, 6),
    fillerAt(surface, 0),
    fillerAt(surface, 3),
    { kind: "target", target: targets[3] },
    fillerAt(surface, 7),
    fillerAt(surface, 5),
    fillerAt(surface, 4),
    { kind: "target", target: targets[4] },
    fillerAt(surface, 1),
    fillerAt(surface, 6),
  ];
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-white/80 bg-white/94 shadow-sm shadow-slate-900/10 ring-1 ring-slate-950/[0.04] backdrop-blur sm:rounded-[28px] ${className}`}
    >
      {children}
    </div>
  );
}

function CardContent({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}

function NexaPathHeroReplica() {
  return (
    <section className="pb-2 pt-2 sm:pb-8 sm:pt-8">
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800 px-3 py-3 text-white shadow-2xl shadow-slate-950/24 sm:rounded-[36px] sm:px-6 sm:py-8 md:px-10 md:py-12">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 hidden h-40 w-40 rotate-12 rounded-[42px] border border-white/10 bg-white/5 lg:block" />

        <div className="relative grid gap-3 sm:gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80 sm:mb-4 sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.18em]">
              Industry operating model
            </div>
            <h1 className="max-w-4xl text-lg font-semibold tracking-tight sm:text-4xl md:text-6xl">
              Hedge Fund
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-4 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
              This prototype page demonstrates how a tour can shift from generic solution language to an industry-specific operating narrative.
            </p>
            <div className="mt-2 flex flex-wrap gap-1 sm:mt-7 sm:gap-3">
              {["Fund operations", "Copilot journeys", "Scenario-first buyer path"].map((item) => (
                <span key={item} className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-white/90 sm:px-4 sm:py-2 sm:text-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[14px] border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:rounded-[28px] sm:p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Guide readiness</div>
              <div className="mt-1 text-sm font-semibold sm:mt-3 sm:text-2xl">7 anchored stops</div>
              <p className="mt-1 text-[10px] leading-4 text-slate-200 sm:text-sm sm:leading-6">
                Each section remains addressable for spotlighting, multi-step navigation, and AI-guided explanations.
              </p>
            </div>
            <div className="rounded-[14px] border border-white/15 bg-white/10 p-2.5 backdrop-blur sm:rounded-[28px] sm:p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Current path</div>
              <div className="mt-1 text-sm font-semibold sm:mt-3 sm:text-2xl">Industry-specific path for regulated investment operations</div>
              <p className="mt-1 text-[10px] leading-4 text-slate-200 sm:text-sm sm:leading-6">
                A more realistic page canvas gives the guide better visual moments to land on during demos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NexaPathSectionCard({ section }: { section: NexaPathSection }) {
  const Icon = section.Icon;
  const wide = section.shape === "hero" || section.shape === "dark" || section.shape === "cta";
  const dark = section.shape === "dark" || section.shape === "cta";
  const mobileChips = section.chips.slice(0, 3);

  return (
    <motion.section
      id={section.id}
      data-tour-id={section.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode={wide ? "region" : "card"}
      layout
      initial={false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="scroll-mt-20 sm:scroll-mt-28"
    >
      <Card className={`md:hidden transition-all border-slate-200 ring-1 ring-slate-200/80 ${dark ? `bg-gradient-to-br ${section.tone} text-white` : ""}`}>
        <div className={`h-1.5 ${dark ? "bg-white/25" : `bg-gradient-to-r ${section.tone}`}`} />
        <div className="p-2.5 sm:p-3">
          <div className="flex items-start gap-2.5">
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${
                dark ? "bg-white/15 text-white" : `bg-gradient-to-br ${section.tone} text-white`
              } shadow-sm`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <div className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/60" : "text-slate-400"}`}>
                {section.pageId} / {String(section.pageIndex + 1).padStart(2, "0")}
              </div>
              <h2 className={`mt-0.5 text-sm font-semibold leading-5 tracking-tight sm:text-[15px] ${dark ? "text-white" : "text-slate-950"}`}>
                {section.title}
              </h2>
            </div>
          </div>

          <p
            className={`mt-1.5 overflow-hidden text-[11px] leading-4 [display:-webkit-box] sm:text-xs [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
              dark ? "text-slate-200" : "text-slate-600"
            }`}
          >
            {section.body}
          </p>

          <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
            {mobileChips.map((chip) => (
              <span
                key={chip}
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px] ${
                  dark ? "bg-white/10 text-white/80" : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card className={`hidden md:block transition-all ${dark ? `bg-gradient-to-br ${section.tone} text-white` : ""}`}>
        <CardContent className={`p-0 ${wide ? "md:p-0" : ""}`}>
          <div className={`grid ${wide ? "md:grid-cols-[0.9fr_1.35fr]" : "md:grid-cols-[180px_1fr]"}`}>
            <div className={`${dark ? "border-white/10 bg-white/10" : "border-slate-100 bg-slate-50"} border-b p-3 md:border-b-0 md:border-r md:p-6`}>
              <div className={`inline-flex rounded-2xl ${dark ? "bg-white/15 text-white" : `bg-gradient-to-br ${section.tone} text-white`} p-2 shadow-sm sm:p-3`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className={`mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] sm:mt-5 sm:text-[11px] sm:tracking-[0.18em] ${dark ? "text-white/60" : "text-slate-500"}`}>
                {section.pageId} / {String(section.pageIndex + 1).padStart(2, "0")}
              </div>
              <div className={`mt-1 hidden break-all text-xs sm:block ${dark ? "text-white/70" : "text-slate-400"}`}>
                #{section.id}
              </div>
            </div>

            <div className="p-3 sm:p-5 md:p-8">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {section.chips.map((chip) => (
                  <span
                    key={chip}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs ${
                      dark ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <h2 className={`mt-2 text-lg font-semibold tracking-tight sm:mt-4 sm:text-2xl ${dark ? "text-white" : "text-slate-950"}`}>
                {section.title}
              </h2>
              <p className={`mt-2 max-w-4xl text-[13px] leading-5 sm:mt-4 sm:text-base sm:leading-8 ${dark ? "text-slate-200" : "text-slate-600"}`}>
                {section.body}
              </p>

              <div className={`mt-3 hidden gap-2 sm:mt-6 sm:grid sm:gap-3 ${wide ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div className={`rounded-lg p-2.5 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>Guide signal</div>
                  <div className="mt-2 text-sm font-semibold">Anchor-ready stop</div>
                </div>
                <div className={`rounded-lg p-2.5 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>Buyer lens</div>
                  <div className="mt-2 text-sm font-semibold">Explain, compare, route</div>
                </div>
                {wide && (
                  <div className={`rounded-lg p-2.5 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>Next action</div>
                    <div className="mt-2 text-sm font-semibold">Continue guided path</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

function PageMapCard() {
  const sections = NEXAPATH_SECTIONS.filter((section) => section.pageId === "hedge-fund");

  return (
    <aside className="hidden space-y-5 md:block lg:sticky lg:top-4 lg:self-start">
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Page map
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            These remain the same tour anchors used by the guide shell.
          </p>
          <div className="mt-3 space-y-2 sm:mt-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="flex w-full items-start justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left sm:rounded-2xl sm:px-4 sm:py-3"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{section.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{section.id}</div>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 text-slate-500" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-950 to-slate-800 text-white">
        <CardContent className="p-3 sm:p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
            Recommended path
          </div>
          <p className="mt-3 text-sm leading-5 text-slate-200 sm:mt-4 sm:leading-6">
            This page now behaves like the real NexaPath destination: section cards, page-map objects, and true anchors only.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white">Previous page</span>
            <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950">Next page</span>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function InfoSurfaceLayer({ active }: { active: boolean }) {
  return (
    <motion.section
      aria-hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className={`${active ? "relative" : "pointer-events-none absolute inset-x-0 top-0"} min-h-[2200px] sm:min-h-[3200px]`}
    >
      <NexaPathHeroReplica />

      <main className="grid gap-3 pb-14 sm:gap-5 sm:pb-20 lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="space-y-2.5 sm:space-y-5">
          {NEXAPATH_SECTIONS.map((section) => (
            <NexaPathSectionCard key={section.id} section={section} />
          ))}
        </div>

        <PageMapCard />
      </main>
    </motion.section>
  );
}


type CarryoutOffer = {
  id: string;
  title: string;
  price: string;
  description: string;
  chips?: string[];
  badge?: string;
};

type CarryoutCombo = CarryoutOffer & {
  includes: string[];
};

const CARRYOUT_COMBOS: CarryoutCombo[] = [
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
];

const CARRYOUT_BURGERS: CarryoutOffer[] = [
  {
    id: "modifier-burger-toppings",
    title: "Common burger modifiers",
    price: "",
    description: "No onions, no pickles, extra cheese, add bacon, extra sauce, and no mayo.",
    chips: ["No onions", "No pickles", "Extra cheese", "Add bacon", "Extra sauce", "No mayo"],
    badge: "Modifiers",
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
    id: "item-cheeseburger",
    title: "Cheeseburger",
    price: "$5.49",
    description: "Classic burger with American cheese. A clean baseline for modifier demos.",
    chips: ["Cheese", "No onions", "Extra sauce"],
    badge: "Common ask",
  },
];

const CARRYOUT_SIDES: CarryoutOffer[] = [
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
];

const CARRYOUT_DRINKS: CarryoutOffer[] = [
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
    id: "drink-milkshake",
    title: "Milkshake",
    price: "$4.29+",
    description: "Vanilla, chocolate, or strawberry shake.",
    chips: ["Vanilla", "Chocolate", "Strawberry"],
  },
];

const CARRYOUT_DESSERTS: CarryoutOffer[] = [
  {
    id: "dessert-apple-pie",
    title: "Apple Pie",
    price: "$1.99",
    description: "Handheld apple pie with cinnamon filling.",
    chips: ["Warm", "Classic"],
  },
  {
    id: "dessert-cookie",
    title: "Chocolate Chip Cookie",
    price: "$1.49",
    description: "Warm cookie with chocolate chunks.",
    chips: ["Single", "Easy add-on"],
  },
];

function CarryoutPrice({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-950 shadow-sm">{children}</span>;
}

function CarryoutBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-orange-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-200 ring-1 ring-orange-300/20">{children}</span>;
}

function CarryoutChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-semibold text-orange-100">{children}</span>;
}

function CarryoutAddButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      data-tour-id={`${targetId}-add-button`}
      data-spotlight-mode="control"
      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-sm"
    >
      <Plus className="mr-1.5 h-3.5 w-3.5" />
      Add
    </button>
  );
}

function CarryoutDarkCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-[18px] border border-white/10 bg-slate-900/90 sm:rounded-[28px] shadow-xl shadow-slate-950/30 ring-1 ring-white/[0.04] ${className}`}>
      {children}
    </div>
  );
}

function CarryoutSectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mb-3 flex flex-col gap-1.5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">{title}</h2>
      </div>
      <p className="max-w-xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">{body}</p>
    </div>
  );
}

function CarryoutHeroReplica() {
  return (
    <section
      id="carryout-hero"
      data-tour-id="carryout-hero"
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      className="relative overflow-hidden rounded-[22px] bg-slate-950 text-white shadow-2xl shadow-orange-200/40 sm:rounded-[34px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.55),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(248,113,113,0.36),_transparent_36%)]" />
      <div className="relative grid gap-4 p-4 sm:gap-8 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-orange-100 ring-1 ring-white/15 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.16em]">
            <Sparkles className="h-4 w-4" />
            Natural-language carryout demo
          </div>
          <h1 className="mt-3 max-w-3xl text-2xl font-black tracking-tight sm:mt-5 sm:text-6xl">
            Say the order. TourBot builds the cart.
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-orange-50/90 sm:mt-5 sm:text-lg sm:leading-7">
            BurgerRush is built to show a realistic fast-food menu: combos, independent sides,
            drinks, modifiers, required choices, and a cart handoff that can be driven by plain English.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm sm:px-5 sm:py-3 sm:text-sm">
              Browse combos
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15 sm:px-5 sm:py-3 sm:text-sm">
              How TourBot works
            </span>
          </div>
        </div>

        <div
          id="featured-double-stack-combo"
          data-tour-id="featured-double-stack-combo"
          data-smartbar-focus-surface="speed-demo"
          data-spotlight-mode="card"
          className="rounded-[20px] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur sm:rounded-[32px] sm:p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-400 text-slate-950 shadow-lg shadow-orange-950/20 sm:h-16 sm:w-16 sm:rounded-[24px]">
              <Flame className="h-5 w-5 sm:h-8 sm:w-8" />
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-orange-50 ring-1 ring-white/15">
              Featured combo
            </div>
          </div>
          <div className="mt-4 text-3xl font-black leading-none tracking-tight sm:mt-8 sm:text-5xl">Double Stack</div>
          <div className="mt-1 text-3xl font-black leading-none tracking-tight text-orange-300 sm:mt-2 sm:text-5xl">Combo</div>
          <p className="mt-3 text-xs leading-5 text-orange-50/85 sm:mt-5 sm:text-sm sm:leading-6">
            Double cheeseburger, fries, and drink. A perfect target for showing how TourBot maps separate requests into a combo.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold text-orange-50 sm:mt-5 sm:gap-2 sm:text-xs">
            <div className="rounded-xl bg-white/10 p-2 sm:rounded-2xl sm:p-3">Burger</div>
            <div className="rounded-xl bg-white/10 p-2 sm:rounded-2xl sm:p-3">Fries</div>
            <div className="rounded-xl bg-white/10 p-2 sm:rounded-2xl sm:p-3">Drink</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CarryoutQualifierPanelReplica() {
  return (
    <section
      id="qualifier-completion-panel"
      data-tour-id="qualifier-completion-panel"
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      className="rounded-[20px] border border-amber-300/20 bg-slate-900/85 p-4 shadow-xl shadow-slate-950/20 ring-1 ring-white/[0.03] sm:rounded-[30px] sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-300">
            <CheckCircle2 className="h-4 w-4" />
            Guided order completion
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Missing choices become chips</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            When a requested item needs a required qualifier, TourBot can keep the item in the order and attach the right choices to that step: size, piece count, sauce, flavor, or combo options.
          </p>
        </div>
        <div
          data-tour-id="sample-qualifier-chips"
          data-smartbar-focus-surface="speed-demo"
          data-spotlight-mode="card"
          className="rounded-2xl bg-slate-950/70 p-3 shadow-sm ring-1 ring-white/10 sm:rounded-3xl sm:p-4"
        >
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Example chips</div>
          <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
            {["Small", "Medium", "Large"].map((item) => (
              <span key={item} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CarryoutComboCard({ combo, index }: { combo: CarryoutCombo; index: number }) {
  const featured = index === 0;

  return (
    <article
      id={combo.id}
      data-tour-id={combo.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="card"
      className={`group relative overflow-hidden rounded-[30px] border bg-slate-900/90 shadow-xl shadow-slate-950/25 ring-1 ring-white/[0.03] ${
        featured ? "border-orange-400/40 md:col-span-2" : "border-white/10"
      }`}
    >
      <div className={`grid h-full ${featured ? "md:grid-cols-[0.95fr_1.2fr]" : ""}`}>
        <div className={`${featured ? "min-h-[132px] sm:min-h-[250px]" : "min-h-[105px] sm:min-h-[170px]"} bg-gradient-to-br from-orange-500 via-red-500 to-amber-400 p-4 text-white sm:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/20 sm:h-12 sm:w-12 sm:rounded-2xl">
              <Package className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            {combo.badge ? <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold ring-1 ring-white/20">{combo.badge}</span> : null}
          </div>
          <div className="mt-4 text-3xl font-black leading-none tracking-tight sm:mt-8 sm:text-6xl">{featured ? "2x" : "Meal"}</div>
          <div className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-white/75">BurgerRush combo</div>
        </div>
        <div className="flex h-full flex-col p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">{combo.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-300 sm:mt-2 sm:text-sm sm:leading-6">{combo.description}</p>
            </div>
            <CarryoutPrice>{combo.price}</CarryoutPrice>
          </div>
          <div className="mt-3 rounded-xl bg-slate-800/80 p-2.5 ring-1 ring-white/10 sm:mt-5 sm:rounded-2xl sm:p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Includes</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {combo.includes.map((item) => (
                <span key={item} className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-slate-200 shadow-sm ring-1 ring-white/10">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
            {combo.chips?.map((chip) => <CarryoutChip key={chip}>{chip}</CarryoutChip>)}
          </div>
          <div className="mt-auto pt-3 sm:pt-5">
            <CarryoutAddButton targetId={combo.id} />
          </div>
        </div>
      </div>
    </article>
  );
}

function CarryoutMenuRow({ item }: { item: CarryoutOffer }) {
  const isModifierPanel = item.id === "modifier-burger-toppings";

  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode={isModifierPanel ? "card" : "row"}
      className="group grid gap-2 rounded-[20px] border border-white/10 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/20 sm:grid-cols-[1fr_auto] sm:items-center sm:rounded-3xl sm:p-5"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black tracking-tight text-white sm:text-lg">{item.title}</h3>
          {item.badge ? <CarryoutBadge>{item.badge}</CarryoutBadge> : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-300 sm:mt-1.5 sm:text-sm sm:leading-6">{item.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
          {item.chips?.map((chip) => <CarryoutChip key={chip}>{chip}</CarryoutChip>)}
        </div>
      </div>
      {item.price ? (
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <CarryoutPrice>{item.price}</CarryoutPrice>
          <CarryoutAddButton targetId={item.id} />
        </div>
      ) : null}
    </article>
  );
}

function CarryoutSmallOfferTile({ item }: { item: CarryoutOffer }) {
  return (
    <article
      id={item.id}
      data-tour-id={item.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="card"
      className="rounded-[18px] border border-white/10 bg-slate-900/90 p-3 shadow-lg shadow-slate-950/20 sm:rounded-[26px] sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/20">
          <Utensils className="h-5 w-5" />
        </div>
        <CarryoutPrice>{item.price}</CarryoutPrice>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:gap-2">
        <h3 className="text-base font-black tracking-tight text-white">{item.title}</h3>
        {item.badge ? <CarryoutBadge>{item.badge}</CarryoutBadge> : null}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-slate-300 sm:mt-2 sm:text-sm">{item.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.chips?.map((chip) => <CarryoutChip key={chip}>{chip}</CarryoutChip>)}
      </div>
    </article>
  );
}

function CarryoutDrinksRackReplica() {
  return (
    <section
      id="section-drinks"
      data-tour-id="section-drinks"
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      className="scroll-mt-28"
    >
      <CarryoutSectionHeader
        eyebrow="Grouped drink orders"
        title="Drinks"
        body="The drink rack gives TourBot a realistic grouping challenge: five sodas should be clarified as a group, not one at a time."
      />
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {CARRYOUT_DRINKS.map((drink) => <CarryoutSmallOfferTile key={drink.id} item={drink} />)}
        </div>
        <CarryoutDarkCard>
          <div
            id="drink-qualifiers"
            data-tour-id="drink-qualifiers"
            data-smartbar-focus-surface="speed-demo"
            data-spotlight-mode="card"
            className="p-4 sm:p-6"
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600">
              <Coffee className="h-4 w-4" />
              Drink qualifiers
            </div>
            <div id="qualifier-drink-size" data-tour-id="qualifier-drink-size" data-smartbar-focus-surface="speed-demo" className="mt-3 rounded-2xl bg-slate-800/80 p-3 sm:mt-5 sm:rounded-3xl sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Size</div>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                {["Small", "Medium", "Large"].map((item) => <CarryoutChip key={item}>{item}</CarryoutChip>)}
              </div>
            </div>
            <div id="qualifier-drink-flavor" data-tour-id="qualifier-drink-flavor" data-smartbar-focus-surface="speed-demo" className="mt-3 rounded-2xl bg-slate-800/80 p-3 sm:mt-4 sm:rounded-3xl sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Flavor</div>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                {["Coke", "Diet Coke", "Sprite", "Root Beer"].map((item) => <CarryoutChip key={item}>{item}</CarryoutChip>)}
              </div>
            </div>
          </div>
        </CarryoutDarkCard>
      </div>
    </section>
  );
}

function CarryoutExplainerPanelReplica() {
  const steps = [
    { label: "Match", detail: "TourBot maps plain-English requests to real BurgerRush menu items." },
    { label: "Complete", detail: "Missing sizes, sauces, flavors, and toppings become focused choices." },
    { label: "Handoff", detail: "The sheet locks the matched order into a checkout-ready payload." },
  ];

  return (
    <aside id="carryout-flow-panel" data-tour-id="carryout-flow-panel" data-smartbar-focus-surface="speed-demo" data-spotlight-mode="region" className="lg:sticky lg:top-4">
      <CarryoutDarkCard className="border-orange-300/20 bg-slate-950/85">
        <div className="relative overflow-hidden p-4 text-white sm:p-5">
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
                <div key={step.label} className="rounded-xl bg-white/8 p-2.5 ring-1 ring-white/10 sm:rounded-2xl sm:p-3">
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

            <div className="mt-3 rounded-2xl bg-orange-400/10 p-3 ring-1 ring-orange-300/20 sm:mt-5 sm:rounded-3xl sm:p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-orange-200">
                <CheckCircle2 className="h-4 w-4" />
                Checkout happens in the sheet
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                When the order is ready, TourBot locks the matched items and presents the final handoff there.
              </p>
            </div>
          </div>
        </div>
      </CarryoutDarkCard>
    </aside>
  );
}

function CarryoutSurfaceLayer({ active }: { active: boolean }) {
  return (
    <motion.section
      aria-hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className={`${active ? "relative" : "pointer-events-none absolute inset-x-0 top-0"} min-h-[2300px] text-white sm:min-h-[3200px]`}
    >
      <div className="space-y-5 sm:space-y-8">
        <CarryoutHeroReplica />

        <main className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5 sm:space-y-8">
            <CarryoutQualifierPanelReplica />

            <section
              id="section-combos"
              data-tour-id="section-combos"
              data-smartbar-focus-surface="speed-demo"
              data-spotlight-mode="region"
              className="scroll-mt-28"
            >
              <CarryoutSectionHeader
                eyebrow="Combos as packages"
                title="Combos"
                body="Combos are the carryout version of packages: bundled offers with required side and drink choices."
              />
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {CARRYOUT_COMBOS.map((combo, index) => <CarryoutComboCard key={combo.id} combo={combo} index={index} />)}
              </div>
            </section>

            <section
              id="section-burgers"
              data-tour-id="section-burgers"
              data-smartbar-focus-surface="speed-demo"
              data-spotlight-mode="region"
              className="scroll-mt-28"
            >
              <CarryoutSectionHeader
                eyebrow="Independent offers"
                title="Burgers"
                body="Every burger is orderable on its own, and can also be included inside combos."
              />
              <div className="grid gap-2.5 sm:gap-3">
                {CARRYOUT_BURGERS.map((item) => <CarryoutMenuRow key={item.id} item={item} />)}
              </div>
            </section>

            <section
              id="section-sides"
              data-tour-id="section-sides"
              data-smartbar-focus-surface="speed-demo"
              data-spotlight-mode="region"
              className="scroll-mt-28"
            >
              <CarryoutSectionHeader
                eyebrow="Required side sizing"
                title="Sides"
                body="Sides show why a simple item request can still require one focused follow-up."
              />
              <div className="grid gap-2.5 sm:gap-3">
                {CARRYOUT_SIDES.map((item) => <CarryoutMenuRow key={item.id} item={item} />)}
              </div>
            </section>

            <CarryoutDrinksRackReplica />

            <section
              id="section-desserts"
              data-tour-id="section-desserts"
              data-smartbar-focus-surface="speed-demo"
              data-spotlight-mode="region"
              className="scroll-mt-28"
            >
              <CarryoutSectionHeader
                eyebrow="Add-on friendly"
                title="Desserts"
                body="Desserts are simple add-ons that SmartBar can include without opening a qualifier loop."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {CARRYOUT_DESSERTS.map((item) => <CarryoutSmallOfferTile key={item.id} item={item} />)}
              </div>
            </section>
          </div>

          <CarryoutExplainerPanelReplica />
        </main>
      </div>
    </motion.section>
  );
}



type DomiPageId = "home" | "rooms" | "packages" | "amenities" | "booking";

type DomiSection = {
  id: string;
  pageId: DomiPageId;
  title: string;
  body: string;
  eyebrow?: string;
  price?: string;
  details?: string[];
  tags?: string[];
  Icon: LucideIcon;
  tone: string;
  kind: "hero" | "room" | "package" | "amenity" | "booking";
};

const DOMI_SECTIONS: DomiSection[] = [
  {
    id: "travel-hero",
    pageId: "home",
    eyebrow: "Large resort playground",
    title: "A stay planner for a property with real choice complexity",
    body:
      "Domi Coast combines oceanfront resort amenities with a major conference hotel footprint: three guest towers, villa inventory, family zones, quiet business floors, dining, spa, pools, shuttle service, and event support.",
    tags: ["1,050 rooms", "3 towers", "Resort + conference"],
    Icon: Sparkles,
    tone: "from-slate-950 via-slate-900 to-sky-800",
    kind: "hero",
  },
  {
    id: "room-finder",
    pageId: "home",
    eyebrow: "Search assist",
    title: "Room and tower matcher",
    body:
      "A guide can compare tower, view, budget, guest count, work needs, trip purpose, and arrival logistics before recommending a starting room.",
    tags: ["Tower", "View", "Budget", "Trip type"],
    Icon: Search,
    tone: "from-cyan-900 via-slate-900 to-slate-700",
    kind: "hero",
  },
  {
    id: "room-garden-terrace",
    pageId: "rooms",
    eyebrow: "Best value resort feel",
    title: "Garden Terrace King",
    price: "$239/night",
    body:
      "A quieter garden-facing room with terrace seating and easy access to walking paths. Good for guests who want a resort feel without paying for full oceanfront views.",
    details: ["Garden terrace", "Walking paths", "Quiet zone", "Good value"],
    tags: ["Garden", "Quiet", "Value", "Terrace"],
    Icon: BedDouble,
    tone: "from-emerald-900 via-teal-800 to-slate-700",
    kind: "room",
  },
  {
    id: "room-ocean-view-suite",
    pageId: "rooms",
    eyebrow: "Best for leisure",
    title: "Ocean View Suite",
    price: "$379/night",
    body:
      "A larger suite with private balcony, ocean-facing seating area, soaking tub, and late checkout eligibility. Strong for romantic trips, views, and premium leisure stays.",
    details: ["Ocean balcony", "Soaking tub", "Late checkout", "Premium view"],
    tags: ["View", "Romantic", "Premium", "Balcony"],
    Icon: BedDouble,
    tone: "from-sky-900 via-cyan-800 to-slate-700",
    kind: "room",
  },
  {
    id: "room-coastal-villa",
    pageId: "rooms",
    eyebrow: "Best premium stay",
    title: "Coastal Villa Suite",
    price: "$549/night",
    body:
      "A villa-style suite with separate living space, resort shuttle pickup, premium views, and concierge support. Strong for anniversaries, VIP stays, and longer premium trips.",
    details: ["Separate living room", "Concierge", "Premium view", "Resort shuttle"],
    tags: ["Villa", "Premium", "Concierge", "Anniversary"],
    Icon: BedDouble,
    tone: "from-indigo-950 via-sky-900 to-slate-800",
    kind: "room",
  },
  {
    id: "room-extended-stay-studio",
    pageId: "rooms",
    eyebrow: "Best for longer stays",
    title: "Extended Stay Studio",
    price: "$219/night",
    body:
      "A studio with kitchenette, laundry access, storage, and weekly-rate eligibility. Best for guests staying five nights or more or wanting a self-sufficient setup.",
    details: ["Kitchenette", "Weekly rate", "Laundry access", "Storage"],
    tags: ["Long stay", "Kitchenette", "Value", "Practical"],
    Icon: BedDouble,
    tone: "from-slate-900 via-slate-800 to-cyan-900",
    kind: "room",
  },
  {
    id: "room-family-double",
    pageId: "rooms",
    eyebrow: "Best for families",
    title: "Family Double Room",
    price: "$249/night",
    body:
      "Two queen beds, extra floor space, a small dining nook, and easy access to the family pool wing. Practical for families that need comfort without suite pricing.",
    details: ["Two queens", "Sleeps 4", "Dining nook", "Near family pool"],
    tags: ["Family", "Group", "Value", "Pool access"],
    Icon: BedDouble,
    tone: "from-cyan-900 via-sky-800 to-slate-700",
    kind: "room",
  },
  {
    id: "package-breakfast-flex",
    pageId: "packages",
    eyebrow: "Meal plan",
    title: "Breakfast Flex Plan",
    price: "+$32/night",
    body:
      "Daily breakfast credit that works across the lobby café, buffet, and grab-and-go market. Useful when guests mention breakfast but not a full package.",
    details: ["Daily credit", "Café", "Buffet", "Grab-and-go"],
    tags: ["Breakfast", "Flexible", "Value"],
    Icon: Coffee,
    tone: "from-amber-700 via-orange-700 to-slate-800",
    kind: "package",
  },
  {
    id: "package-relaxation-weekend",
    pageId: "packages",
    eyebrow: "Leisure upgrade",
    title: "Relaxation Weekend Package",
    price: "+$95/stay",
    body:
      "Includes spa credit, welcome drinks, breakfast for two, and guaranteed late checkout. Best for romantic weekends or premium leisure stays.",
    details: ["Spa credit", "Welcome drinks", "Breakfast for two", "Late checkout"],
    tags: ["Romantic", "Spa", "Weekend"],
    Icon: Coffee,
    tone: "from-violet-900 via-indigo-800 to-slate-800",
    kind: "package",
  },
  {
    id: "package-family-comfort",
    pageId: "packages",
    eyebrow: "Family upgrade",
    title: "Family Comfort Bundle",
    price: "+$55/stay",
    body:
      "Adds parking, snack credit, extra towels, pool wristbands, and flexible check-in support. Best for families arriving with children or extra luggage.",
    details: ["Parking", "Snack credit", "Pool wristbands", "Flexible arrival"],
    tags: ["Family", "Parking", "Convenience"],
    Icon: CreditCard,
    tone: "from-cyan-900 via-sky-800 to-slate-700",
    kind: "package",
  },
];

function DomiCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border border-white/35 bg-slate-50/82 shadow-sm shadow-slate-950/20 ring-1 ring-white/[0.08] backdrop-blur sm:rounded-[30px] ${className}`}
    >
      {children}
    </div>
  );
}

function DomiSectionCard({ section, index }: { section: DomiSection; index: number }) {
  const Icon = section.Icon;
  const isRoom = section.kind === "room";
  const dark = section.kind === "hero" || section.kind === "booking";
  const tags = section.tags || [];
  const details = section.details || [];
  const isRecommended = section.id === "room-garden-terrace" || section.id === "room-ocean-view-suite";

  return (
    <motion.section
      id={section.id}
      data-tour-id={section.id}
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      layout
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative scroll-mt-20 sm:scroll-mt-28"
    >
      <DomiCard className={`${dark ? `bg-gradient-to-br ${section.tone} text-white` : ""}`}>
        <div className={`grid ${isRoom || dark ? "lg:grid-cols-[0.82fr_1.18fr]" : "md:grid-cols-[190px_1fr]"}`}>
          <div className={`relative min-h-[132px] overflow-hidden border-b text-white sm:min-h-[220px] md:border-b-0 md:border-r md:border-white/10 ${dark ? "bg-white/10" : ""}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${section.tone}`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.42),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_45%)]" />
            {isRoom ? (
              <>
                <div className="absolute bottom-3 right-3 h-16 w-16 rounded-[22px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur sm:bottom-5 sm:right-5 sm:h-28 sm:w-28 sm:rounded-[34px]" />
                <div className="absolute bottom-7 right-8 h-9 w-9 rotate-12 rounded-[16px] border border-white/10 bg-white/10 sm:bottom-10 sm:right-12 sm:h-16 sm:w-16 sm:rounded-[24px]" />
              </>
            ) : null}

            <div className="relative z-10 flex h-full min-h-[132px] flex-col justify-between p-4 sm:min-h-[220px] sm:p-6">
              <div>
                <div className="inline-flex rounded-xl bg-white/15 p-2 text-white shadow-sm backdrop-blur sm:rounded-2xl sm:p-3">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:mt-5 sm:text-[11px] sm:tracking-[0.18em]">
                  {section.eyebrow || `${section.pageId} / ${String(index + 1).padStart(2, "0")}`}
                </div>
                <div className="mt-1 break-all text-xs text-white/65">
                  #{section.id}
                </div>
              </div>

              <div>
                {section.price ? (
                  <div className="text-xl font-semibold tracking-tight sm:text-3xl">
                    {section.price}
                  </div>
                ) : null}
                <div className="mt-1 text-[10px] font-medium text-white/70">
                  {isRoom ? "Premium commerce object" : "Guide-ready resort stop"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-8">
            <div className="flex flex-wrap gap-2">
              {tags.map((chip) => (
                <span
                  key={chip}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs ${dark ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"}`}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div data-tour-id={isRoom ? `${section.id}-details` : undefined}>
              <h2 className={`mt-2 text-xl font-semibold tracking-tight sm:mt-4 sm:text-2xl ${dark ? "text-white" : "text-slate-950"}`}>
                {section.title}
              </h2>
              {isRecommended ? (
                <div className="mt-1.5 inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                  Recommendation path
                </div>
              ) : null}
              <p className={`mt-2 max-w-4xl text-xs leading-5 sm:mt-4 sm:text-base sm:leading-8 ${dark ? "text-slate-200" : "text-slate-600"}`}>
                {section.body}
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
              {(details.length ? details : ["Anchor-ready commerce stop", "Recommend, refine, book"]).map((detail) => (
                <div
                  key={detail}
                  className={`rounded-xl p-2.5 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>
                    {details.length ? "Included" : "Guide signal"}
                  </div>
                  <div className="mt-2 text-sm font-semibold">{detail}</div>
                </div>
              ))}
            </div>

            {isRoom ? (
              <div
                data-tour-id={`${section.id}-cta`}
                className="mt-3 flex flex-wrap gap-2 sm:mt-6 sm:gap-3"
              >
                <button className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:px-5 sm:py-2 sm:text-sm">
                  Book this room
                </button>
                <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 sm:px-5 sm:py-2 sm:text-sm">
                  See next option →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </DomiCard>
    </motion.section>
  );
}

function DomiBookingPanelReplica() {
  return (
    <motion.section
      id="booking-panel"
      data-tour-id="booking-panel"
      data-smartbar-focus-surface="speed-demo"
      data-spotlight-mode="region"
      layout
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative scroll-mt-20 sm:scroll-mt-28"
    >
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1fr_0.78fr]">
        <DomiCard className="bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 text-white">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white shadow-sm backdrop-blur">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="mt-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65 sm:mt-5 sm:text-[11px] sm:tracking-[0.18em]">
              Booking page / booking-panel
            </div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">
              Booking preview
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-200 sm:mt-4 sm:text-base sm:leading-8">
              Known stay context carries forward: selected room, dates, guests, budget, package signals, and missing fields. The user keeps momentum instead of starting over in a generic form.
            </p>

            <div data-tour-id="booking-panel-cta" className="mt-3 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
              <button className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950">
                Continue booking
              </button>
              <button className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white">
                Fill missing details
              </button>
            </div>
          </div>
        </DomiCard>

        <div
          id="booking-summary-card"
          data-tour-id="booking-summary-card"
          data-smartbar-focus-surface="speed-demo"
          data-spotlight-mode="region"
          className="relative rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm transition sm:rounded-[28px] sm:p-5"
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
                Ocean View Suite
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                Premium view and leisure-ready layout
              </div>
            </div>
            <CreditCard className="mt-1 h-5 w-5 text-slate-500" />
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div
              data-tour-id="booking-selected-room"
              className="flex justify-between rounded-2xl bg-emerald-50 px-2.5 py-2 text-emerald-800"
            >
              <span>Room</span>
              <strong>Selected</strong>
            </div>
            <div
              data-tour-id="booking-missing-dates"
              className="flex justify-between rounded-2xl bg-amber-50 px-2.5 py-2 text-amber-900"
            >
              <span>Dates</span>
              <strong>Required</strong>
            </div>
            <div
              data-tour-id="booking-missing-guests"
              className="flex justify-between rounded-2xl bg-amber-50 px-2.5 py-2 text-amber-900"
            >
              <span>Guests</span>
              <strong>Required</strong>
            </div>
            <div
              data-tour-id="booking-guests-module"
              className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/70">
                Guest profile
              </div>
              <div className="mt-1 font-semibold">2 adults, 2 children</div>
              <div className="mt-1 text-xs text-emerald-800/80">
                Contact details and payment can be collected after the stay details are complete.
              </div>
            </div>
            <div
              data-tour-id="booking-budget-preference"
              className="flex justify-between rounded-2xl bg-emerald-50 px-2.5 py-2 text-emerald-800"
            >
              <span>Budget</span>
              <strong>Good view, not villa tier</strong>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function DomiSurfaceLayer({ active }: { active: boolean }) {
  const copy = SURFACE_COPY.booking;

  return (
    <motion.section
      aria-hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className={`${active ? "relative" : "pointer-events-none absolute inset-x-0 top-0"} min-h-[3000px] sm:min-h-[4300px]`}
    >
      <div className="mb-5 grid gap-3 sm:mb-8 sm:gap-5 md:grid-cols-6 xl:grid-cols-12">
        <div className="rounded-[22px] border border-sky-200/70 bg-white/90 p-4 text-slate-950 shadow-xl shadow-sky-950/10 ring-1 ring-white/80 backdrop-blur-xl sm:rounded-[34px] sm:p-6 md:col-span-6 xl:col-span-7">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-700/80">
            {copy.eyebrow}
          </div>
          <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:mt-2 sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-xs font-medium leading-5 text-slate-600 sm:mt-3 sm:text-base sm:leading-7">
            The booking layer now mirrors real Domi room cards, package cards, and the booking preview panel instead of invented demo objects.
          </p>
        </div>
      </div>

      <div className="space-y-5 sm:space-y-8">
        {DOMI_SECTIONS.slice(0, 2).map((section, index) => (
          <DomiSectionCard key={section.id} section={section} index={index} />
        ))}

        <div className="grid gap-5 sm:gap-8 xl:grid-cols-2">
          {DOMI_SECTIONS.slice(2, 7).map((section, index) => (
            <DomiSectionCard key={section.id} section={section} index={index + 2} />
          ))}
        </div>

        <div className="grid gap-5 sm:gap-8 xl:grid-cols-2">
          {DOMI_SECTIONS.slice(7).map((section, index) => (
            <DomiSectionCard key={section.id} section={section} index={index + 7} />
          ))}
        </div>

        <DomiBookingPanelReplica />
      </div>
    </motion.section>
  );
}


function LegacyCardShell({
  item,
  targetId,
  children,
}: {
  item: TargetCard | FillerCard;
  targetId?: string;
  children: ReactNode;
}) {
  const tone = TONE_CLASS[item.tone || "slate"];
  const shape = SHAPE_CLASS[item.shape || "compact"];

  return (
    <article
      id={targetId}
      data-tour-id={targetId}
      data-smartbar-focus-surface={targetId ? "speed-demo" : undefined}
      data-spotlight-mode={targetId ? "region" : undefined}
      className={`group relative overflow-hidden rounded-[30px] border p-5 shadow-xl shadow-slate-950/14 ring-1 backdrop-blur-xl ${tone.card} ${shape}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${tone.glow}`} />
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/8 blur-2xl" />
      <div className="relative flex h-full flex-col">{children}</div>
    </article>
  );
}

function LegacyCardContent({ item, target = false }: { item: TargetCard | FillerCard; target?: boolean }) {
  const Icon = item.Icon;
  const tone = TONE_CLASS[item.tone || "slate"];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black shadow-sm ${tone.badge}`}>
          {item.badge || item.eyebrow}
        </span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ring-1 ${tone.icon}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </div>

      <div className="mt-auto pt-8">
        <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${tone.eyebrow}`}>
          {item.eyebrow}
        </div>
        <h3 className={`${target ? "text-xl sm:text-2xl" : "text-base sm:text-lg"} mt-2 font-black tracking-tight text-white`}>
          {item.title}
        </h3>
        {item.body ? <p className={`mt-2 text-sm font-medium leading-6 ${tone.body}`}>{item.body}</p> : null}
      </div>
    </>
  );
}

function LegacyWallItemView({ item }: { item: WallItem }) {
  if (item.kind === "target") {
    return (
      <LegacyCardShell item={item.target} targetId={item.target.id}>
        <LegacyCardContent item={item.target} target />
      </LegacyCardShell>
    );
  }

  return (
    <LegacyCardShell item={item}>
      <LegacyCardContent item={item} />
    </LegacyCardShell>
  );
}

function LegacySurfaceLayer({
  surface,
  active,
}: {
  surface: Exclude<SmartBarSpeedSurface, "info">;
  active: boolean;
}) {
  const copy = SURFACE_COPY[surface];
  const items = legacyWallItemsFor(surface);

  return (
    <motion.section
      aria-hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className={`${active ? "relative" : "pointer-events-none absolute inset-x-0 top-0"} min-h-[2200px] sm:min-h-[3200px]`}
    >
      <div className="mb-5 grid gap-3 sm:mb-10 sm:gap-5 md:grid-cols-6 xl:grid-cols-12">
        <div className="rounded-[22px] border border-slate-700/50 bg-slate-900/88 p-4 text-white shadow-xl shadow-slate-950/14 ring-1 ring-slate-300/15 sm:rounded-[34px] sm:p-6 md:col-span-6 xl:col-span-7">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/80">
            {copy.eyebrow}
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-200/78">
            {copy.body}
          </p>
        </div>
      </div>

      <div className="grid auto-rows-[minmax(74px,auto)] gap-3 sm:auto-rows-[minmax(108px,auto)] sm:gap-5 md:grid-cols-6 xl:grid-cols-12">
        {items.map((item, index) => (
          <LegacyWallItemView key={item.kind === "target" ? item.target.id : `${item.eyebrow}-${item.title}-${index}`} item={item} />
        ))}
      </div>
    </motion.section>
  );
}

export default function SmartBarSpeedTargetWall({ surface }: { surface: SmartBarSpeedSurface }) {
  return (
    <div
      data-smartbar-speed-target-wall="true"
      className="relative z-10 mx-auto max-w-7xl px-2 pb-44 pt-3 sm:px-6 sm:pb-56 sm:pt-8"
    >
      <div className="relative min-h-[2200px] sm:min-h-[3200px]">
        <InfoSurfaceLayer active={surface === "info"} />
        <CarryoutSurfaceLayer active={surface === "ordering"} />
        {surface === "booking" ? <DomiSurfaceLayer active /> : <LegacySurfaceLayer surface="booking" active={false} />}
      </div>
    </div>
  );
}
