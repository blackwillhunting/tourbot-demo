import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Search,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type SmartBarSpeedTool = "info" | "tiles" | "selector" | "cart" | "summary" | "chat";

export type SmartBarSpeedBeat = {
  id: string;
  chapter: "Open" | "Discovery" | "Ordering" | "Booking" | "Finale";
  label: string;
  prompt?: string;
  targetId?: string;
  tool?: SmartBarSpeedTool;
  title: string;
  body: string;
  callout: string;
  calloutTone?: "before" | "during" | "after";
  chips?: string[];
  icon: LucideIcon;
};

export const SMARTBAR_SPEED_BEATS: SmartBarSpeedBeat[] = [
  {
    id: "open",
    chapter: "Open",
    label: "A search bar that does",
    title: "SmartBar reads intent and picks a tool.",
    body: "One compact input can navigate, explain, collect choices, build carts, summarize, and hand off.",
    callout: "A search bar that does.",
    calloutTone: "before",
    icon: Sparkles,
    tool: "info",
  },
  {
    id: "discovery-dora",
    chapter: "Discovery",
    label: "Understand the target",
    prompt: "Do you help with DORA and third-party risk?",
    targetId: "speed-nexa-dora",
    tool: "info",
    title: "DORA readiness is the strongest match.",
    body: "SmartBar does more than route to a service card. It explains why this lane fits, surfaces related risk work, and offers a clean consult path.",
    callout: "Search finds the target. SmartBar handles what comes next.",
    calloutTone: "after",
    chips: ["Compare related services", "Show intake questions", "Talk to a consultant"],
    icon: Search,
  },
  {
    id: "discovery-chat",
    chapter: "Discovery",
    label: "Human handoff",
    prompt: "Can I talk to someone?",
    targetId: "speed-nexa-handoff",
    tool: "chat",
    title: "Hold for next consultant...",
    body: "A chat thread opens only when the visitor asks for help or accepts a handoff.",
    callout: "When it is time for a person, SmartBar changes tools.",
    calloutTone: "during",
    chips: ["Send intake note", "Attach context", "Keep exploring"],
    icon: MessageSquare,
  },
  {
    id: "ordering-typo",
    chapter: "Ordering",
    label: "Messy input to cart",
    prompt: "dbl chzbrger combo lg friez diet coke apple pie",
    targetId: "speed-burger-combo",
    tool: "cart",
    title: "Messy input became a structured cart.",
    body: "SmartBar understood the order, normalized the items, and built the fastest path to review instead of forcing menu browsing.",
    callout: "Messy input. Structured output.",
    calloutTone: "after",
    chips: ["Large fries", "Large Diet Coke", "Add apple pie"],
    icon: ShoppingCart,
  },
  {
    id: "ordering-selector",
    chapter: "Ordering",
    label: "Missing choice",
    prompt: "make the drink a large diet coke",
    targetId: "speed-burger-selector",
    tool: "tiles",
    title: "SmartBar asks only for the missing choice.",
    body: "Instead of another paragraph, the right response is a set of fast action tiles.",
    callout: "The response is not always text.",
    calloutTone: "during",
    chips: ["Diet Coke", "Lemonade", "Iced tea"],
    icon: ClipboardList,
  },
  {
    id: "booking-optimize",
    chapter: "Booking",
    label: "Optimized booking",
    prompt: "nice room with a view and breakfast, not most expensive",
    targetId: "speed-domi-room",
    tool: "summary",
    title: "Ocean View + breakfast is the best fit.",
    body: "SmartBar weighs view, price, and package fit, then produces the shortest booking path instead of a long list of rooms.",
    callout: "One request. Multiple constraints. One next move.",
    calloutTone: "before",
    chips: ["Ocean View Suite", "Breakfast package", "Prepare summary"],
    icon: CalendarCheck,
  },
  {
    id: "booking-selector",
    chapter: "Booking",
    label: "Collect details",
    prompt: "book it for next weekend for 2 adults",
    targetId: "speed-domi-selector",
    tool: "selector",
    title: "Dates and guests become selectors.",
    body: "When the next best tool is a selector, SmartBar becomes a selector instead of pretending text is enough.",
    callout: "SmartBar pulls the right tool from the bag.",
    calloutTone: "during",
    chips: ["Set dates", "2 adults", "Prepare booking"],
    icon: CheckCircle2,
  },
  {
    id: "finale",
    chapter: "Finale",
    label: "Toolbelt finale",
    title: "A search bar with a toolbelt.",
    body: "Info sheets, action tiles, selectors, carts, summaries, and chat threads — all from one compact SmartBar.",
    callout: "A search bar with a toolbelt.",
    calloutTone: "after",
    icon: Sparkles,
    tool: "info",
  },
];

export const SMARTBAR_SPEED_TOOL_FLASHES: Array<{ tool: SmartBarSpeedTool; label: string }> = [
  { tool: "info", label: "Info sheet" },
  { tool: "tiles", label: "Action tiles" },
  { tool: "selector", label: "Selectors" },
  { tool: "cart", label: "Cart" },
  { tool: "summary", label: "Summary" },
  { tool: "chat", label: "Chat thread" },
];
