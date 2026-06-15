import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  ListOrdered,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  getSmartBarMobileShellStyles,
  smartBarMobileHandoffRowSurfaceClass,
  smartBarMobileRibbonPillClass,
  smartBarMobileRowSurfaceClass,
  statusClass,
} from "./smartBarMobileStyles";

/**
 * SmartBarMobileShell
 *
 * Proof build for the keyboard-safe SmartBar mobile architecture.
 *
 * The important split:
 * - Real entry composer is a stable fixed-height textarea surface.
 * - The real textarea never stretches into the cart.
 * - On submit, the real textarea blurs and disappears.
 * - A separate fake cart surface starts from the same rectangle and stretches upward.
 * - Bottom Safari-style chrome row keeps the original geometry.
 */

type SmartBarMobilePhase = "rest" | "entry" | "building_cart" | "cart";
type SmartBarMobileHandoffState = "idle" | "handing_off" | "complete";
export type SmartBarMobileOrderStatus = "ready" | "pending" | "options" | "unknown";
type SmartBarMobileCartStatusFilter = SmartBarMobileOrderStatus | null;

export type SmartBarMobileOrderLine = {
  id: string;
  /** Page target to scroll/focus when this known cart row is selected. */
  targetId?: string;
  /** Unique, UI-only cart-row instance key. Use this for row identity/removal. */
  cartLineKey?: string;
  /** Backend cart line identity. This can differ from the UI id when duplicate items exist. */
  sourceLineItemId?: string;
  /** Original backend item id, preserved separately from the UI instance key. */
  sourceItemId?: string;
  /** Index of the backend source line before visual sorting/grouping. */
  sourceLineIndex?: number;
  title: string;
  /** Optional demo-only title override for visual teaching rows. */
  demoDisplayTitle?: string;
  /** Optional demo-only flag that hides helper/price/remove chrome on teaching rows while preserving row size. */
  demoHideMeta?: boolean;
  status: SmartBarMobileOrderStatus;
  helper: string;
  price: string;
  details: string[];
  options?: string[];
  optionSelectionMode?: "single" | "multi";
  retryPrompt?: string;
};

export type SmartBarMobileOrderResult = {
  lines: SmartBarMobileOrderLine[];
  /** Demo/controlled-flow flag: keep result.lines exactly after retry instead of subtracting the selected unknown row. */
  preserveResultLinesOnRetry?: boolean;
  estimatedSubtotal?: string;
  estimatedTax?: string;
  estimatedTotal?: string;
};

export type SmartBarMobileGenericAction = {
  id: string;
  label: string;
  helper?: string;
  variant?: "primary" | "secondary" | "back" | "next";
  disabled?: boolean;
};

export type SmartBarMobileGenericResult = {
  surfaceKind: "info" | "chat" | "chat_shell" | "booking_tour" | "booking_summary";
  eyebrow?: string;
  title: string;
  body?: string;
  helper?: string;
  statusLabel?: string;
  actions?: SmartBarMobileGenericAction[];
  progressLabel?: string;
  progressCurrent?: number;
  progressTotal?: number;
  /** Optional preferred expanded height for the shared SmartBar stretch surface. */
  height?: number;
  /** Optional custom content for non-cart SmartBar templates. */
  content?: ReactNode;
  /** Delay opening the result panel so navigation/spotlight can complete first. */
  navigationRevealDelayMs?: number;
  /** Temporary ThinkingText label while navigation/spotlight is running. */
  navigationRevealLabel?: string;
};

export type SmartBarMobileSubmitResult = SmartBarMobileOrderResult | SmartBarMobileGenericResult;

export type SmartBarMobileSubmitMeta = {
  intent?: "replace_unknown";
  replaceLineId?: string;
  replaceLineTitle?: string;
};

export type SmartBarMobileDemoSubmission = {
  id: number;
  query: string;
  meta?: SmartBarMobileSubmitMeta;
  /** Demo-only: visibly open the entry box, type the query, then submit it. */
  typing?: boolean;
  /** Demo-only typing cadence in milliseconds per character. */
  typeDelayMs?: number;
  /** Demo-only pause after typing before submit. */
  submitDelayMs?: number;
  /** Demo-only: type the query and wait for an external scripted click to submit. */
  manualSubmit?: boolean;
};

type DemoLineOverride = Partial<Pick<SmartBarMobileOrderLine, "status" | "helper" | "price" | "details" | "options" | "optionSelectionMode" | "retryPrompt">>;

const demoLines: SmartBarMobileOrderLine[] = [
  {
    id: "line-1",
    title: "2 Chili Dogs",
    status: "ready",
    helper: "Matched and ready",
    price: "$11.98",
    details: ["2 items", "Chili", "Regular buns"],
    options: ["Chili", "No onions", "Add cheese"],
  },
  {
    id: "line-2",
    title: "Fries",
    status: "pending",
    helper: "Choose a size",
    price: "$4.49",
    details: ["Size needed"],
    options: ["Small", "Medium", "Large"],
    optionSelectionMode: "single",
  },
  {
    id: "line-3",
    title: "Lemonade",
    status: "options",
    helper: "Options available",
    price: "$2.99",
    details: ["Medium suggested", "Ice normal"],
    options: ["Small", "Medium", "Large"],
    optionSelectionMode: "multi",
  },
  {
    id: "line-4",
    title: "Chocolate shake",
    status: "unknown",
    helper: "Could not match item",
    price: "—",
    details: [],
    retryPrompt: "Re-enter the item so SmartBar can match it.",
  },
];

const estimatedTotal = "$19.46";

const SMARTBAR_MOBILE_CHECKOUT_COLLAPSE_DURATION_MS = 760;
const SMARTBAR_MOBILE_CHECKOUT_RESET_AFTER_COLLAPSE_MS = 980;

const SMARTBAR_ADAPTIVE_RAIL_DESKTOP_QUERY = "(min-width: 768px)";
const SMARTBAR_ADAPTIVE_RAIL_SURFACE_SELECTOR = "[data-smartbar-mobile-adaptive-surface='true']";
const SMARTBAR_ADAPTIVE_RAIL_MIN_NUDGE_PX = 36;
const SMARTBAR_ADAPTIVE_RAIL_SAFETY_MARGIN_PX = 28;
const SMARTBAR_ADAPTIVE_RAIL_MEASURE_DELAY_MS = 80;

type SmartBarAdaptiveSpotlightRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width?: number;
  height?: number;
};

type SmartBarAdaptiveSpotlightDetail = {
  targetRect?: SmartBarAdaptiveSpotlightRect;
  durationMs?: number;
};

function smartBarAdaptiveRailElementVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function smartBarAdaptiveRailUnionRect(elements: HTMLElement[]) {
  const rects = elements
    .filter(smartBarAdaptiveRailElementVisible)
    .map((element) => element.getBoundingClientRect());

  if (!rects.length) return null;

  return rects.reduce(
    (union, rect) => ({
      left: Math.min(union.left, rect.left),
      right: Math.max(union.right, rect.right),
      top: Math.min(union.top, rect.top),
      bottom: Math.max(union.bottom, rect.bottom),
      width: Math.max(union.right, rect.right) - Math.min(union.left, rect.left),
      height: Math.max(union.bottom, rect.bottom) - Math.min(union.top, rect.top),
    }),
    {
      left: rects[0].left,
      right: rects[0].right,
      top: rects[0].top,
      bottom: rects[0].bottom,
      width: rects[0].width,
      height: rects[0].height,
    },
  );
}

function smartBarAdaptiveRailMaxMove(viewportWidth: number) {
  return Math.max(80, Math.min(360, viewportWidth * 0.28));
}

function smartBarClampAdaptiveRailOffset(offset: number, viewportWidth: number) {
  const maxMove = smartBarAdaptiveRailMaxMove(viewportWidth);
  return Math.max(-maxMove, Math.min(maxMove, offset));
}

function smartBarAdaptiveRailOffsetWithMinimumNudge(offset: number) {
  if (Math.abs(offset) < 1) return 0;

  const direction = offset < 0 ? -1 : 1;
  return direction * Math.max(Math.abs(offset), SMARTBAR_ADAPTIVE_RAIL_MIN_NUDGE_PX);
}

function smartBarAdaptiveRailShiftRect(
  rect: SmartBarAdaptiveSpotlightRect,
  deltaX: number,
): SmartBarAdaptiveSpotlightRect {
  return {
    ...rect,
    left: rect.left + deltaX,
    right: rect.right + deltaX,
  };
}

function smartBarAdaptiveRailOverlapArea(
  targetRect: SmartBarAdaptiveSpotlightRect,
  shellRect: SmartBarAdaptiveSpotlightRect,
  margin: number,
) {
  const overlapWidth = Math.max(
    0,
    Math.min(targetRect.right, shellRect.right + margin) -
      Math.max(targetRect.left, shellRect.left - margin),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(targetRect.bottom, shellRect.bottom + margin) -
      Math.max(targetRect.top, shellRect.top - margin),
  );

  return overlapWidth * overlapHeight;
}

function smartBarAdaptiveRailUniqueOffsets(offsets: number[], viewportWidth: number) {
  const seen = new Set<number>();

  return offsets.reduce<number[]>((acc, offset) => {
    const clamped = Math.round(smartBarClampAdaptiveRailOffset(offset, viewportWidth));
    if (seen.has(clamped)) return acc;

    seen.add(clamped);
    acc.push(clamped);
    return acc;
  }, []);
}

type SmartBarAdaptiveRailCandidate = {
  offset: number;
  shellRect: SmartBarAdaptiveSpotlightRect;
};

function smartBarAdaptiveRailCandidateScore(
  candidate: SmartBarAdaptiveRailCandidate,
  targetRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
) {
  const margin = SMARTBAR_ADAPTIVE_RAIL_SAFETY_MARGIN_PX;
  const overlapArea = smartBarAdaptiveRailOverlapArea(targetRect, candidate.shellRect, margin);
  const edgeOverflow =
    Math.max(0, 18 - candidate.shellRect.left) +
    Math.max(0, candidate.shellRect.right - (viewportWidth - 18));

  // Collision is the real failure. Distance from center is a small tie-breaker,
  // so the rail naturally returns to center whenever center is clear.
  return overlapArea * 1000 + edgeOverflow * 1000 + Math.abs(candidate.offset) * 0.18;
}

function smartBarAdaptiveRailOffsetForTarget(
  targetRect: SmartBarAdaptiveSpotlightRect,
  currentShellRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
  currentOffset: number,
) {
  const margin = SMARTBAR_ADAPTIVE_RAIL_SAFETY_MARGIN_PX;
  const baseShellRect = smartBarAdaptiveRailShiftRect(currentShellRect, -currentOffset);

  const moveLeftToClear =
    targetRect.left - margin - baseShellRect.right;
  const moveRightToClear =
    targetRect.right + margin - baseShellRect.left;

  const candidateOffsets = smartBarAdaptiveRailUniqueOffsets(
    [
      0,
      currentOffset,
      smartBarAdaptiveRailOffsetWithMinimumNudge(moveLeftToClear),
      smartBarAdaptiveRailOffsetWithMinimumNudge(moveRightToClear),
      -smartBarAdaptiveRailMaxMove(viewportWidth),
      smartBarAdaptiveRailMaxMove(viewportWidth),
    ],
    viewportWidth,
  );

  const candidates = candidateOffsets.map<SmartBarAdaptiveRailCandidate>((offset) => ({
    offset,
    shellRect: smartBarAdaptiveRailShiftRect(baseShellRect, offset),
  }));

  return candidates.reduce((best, candidate) => {
    const bestScore = smartBarAdaptiveRailCandidateScore(best, targetRect, viewportWidth);
    const candidateScore = smartBarAdaptiveRailCandidateScore(candidate, targetRect, viewportWidth);

    return candidateScore < bestScore ? candidate : best;
  }, candidates[0]).offset;
}




const SMARTBAR_MOBILE_ACTION_PILL_INTENSITY: "soft" | "strong" = "strong";
const SMARTBAR_MOBILE_STRONG_ACTION_PILLS = SMARTBAR_MOBILE_ACTION_PILL_INTENSITY === "strong";

// Foggy glass is applied only to the shared SmartBar substrate/chrome.
// The objects sitting on top of the glass keep their existing crisp styling.
const SMARTBAR_MOBILE_FOG_GLASS_STYLE: CSSProperties = {
  background:
    "radial-gradient(circle at 78% 18%, rgba(103,232,249,0.22) 0%, rgba(103,232,249,0.11) 20%, transparent 46%), radial-gradient(circle at 10% 82%, rgba(147,197,253,0.20) 0%, rgba(147,197,253,0.10) 24%, transparent 50%), linear-gradient(180deg, rgba(226,232,240,0.42) 0%, rgba(148,163,184,0.50) 36%, rgba(71,85,105,0.58) 100%)",
  borderColor: "rgba(255,255,255,0.34)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 0 34px rgba(255,255,255,0.12), inset 0 -1px 0 rgba(15,23,42,0.50), 0 22px 52px rgba(2,6,23,0.44), 0 6px 18px rgba(2,6,23,0.28)",
  backdropFilter: "blur(38px) saturate(155%) brightness(1.08)",
  WebkitBackdropFilter: "blur(38px) saturate(155%) brightness(1.08)",
};

const SMARTBAR_MOBILE_BLUE_CONTROL_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(20,34,92,0.96) 0%, rgba(17,29,82,0.98) 52%, rgba(13,23,68,0.99) 100%)",
  borderColor: "rgba(255,255,255,0.30)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(2,6,23,0.48), 0 16px 38px rgba(2,6,23,0.30), 0 5px 14px rgba(2,6,23,0.18)",
  backdropFilter: "blur(18px) saturate(120%)",
  WebkitBackdropFilter: "blur(18px) saturate(120%)",
};

const SMARTBAR_MOBILE_FOOTER_RED_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(239,68,68,0.98) 0%, rgba(220,38,38,0.98) 52%, rgba(153,27,27,0.99) 100%)",
  borderColor: "rgba(254,226,226,0.74)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(127,29,29,0.50), 0 16px 38px rgba(127,29,29,0.26), 0 5px 14px rgba(2,6,23,0.18)",
  backdropFilter: "blur(18px) saturate(125%)",
  WebkitBackdropFilter: "blur(18px) saturate(125%)",
};

const SMARTBAR_MOBILE_FOOTER_YELLOW_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(254,240,138,0.98) 0%, rgba(250,204,21,0.98) 52%, rgba(234,179,8,0.99) 100%)",
  borderColor: "rgba(254,249,195,0.84)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(161,98,7,0.40), 0 16px 38px rgba(161,98,7,0.24), 0 5px 14px rgba(2,6,23,0.16)",
  backdropFilter: "blur(18px) saturate(125%)",
  WebkitBackdropFilter: "blur(18px) saturate(125%)",
};

const SMARTBAR_MOBILE_FOOTER_GRAY_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(226,232,240,0.98) 0%, rgba(203,213,225,0.98) 52%, rgba(148,163,184,0.99) 100%)",
  borderColor: "rgba(248,250,252,0.82)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(71,85,105,0.42), 0 16px 38px rgba(71,85,105,0.24), 0 5px 14px rgba(2,6,23,0.16)",
  backdropFilter: "blur(18px) saturate(120%)",
  WebkitBackdropFilter: "blur(18px) saturate(120%)",
};

function smartBarMobileFooterPolicyStyle(status: SmartBarMobileOrderStatus | null): CSSProperties {
  if (status === "pending") return SMARTBAR_MOBILE_FOOTER_RED_STYLE;
  if (status === "options") return SMARTBAR_MOBILE_FOOTER_YELLOW_STYLE;
  if (status === "unknown") return SMARTBAR_MOBILE_FOOTER_GRAY_STYLE;

  return SMARTBAR_MOBILE_BLUE_CONTROL_STYLE;
}

function smartBarMobileFooterPolicyTextClass(status: SmartBarMobileOrderStatus | null) {
  if (status === "pending") {
    return "!font-black text-white";
  }

  if (status === "options" || status === "unknown") {
    return "!font-black text-slate-950 [text-shadow:0_1px_0_rgba(255,255,255,0.28)]";
  }

  return "text-white";
}



function smartBarMobileResultIsGeneric(
  result: SmartBarMobileSubmitResult,
): result is SmartBarMobileGenericResult {
  return Boolean(
    result &&
      typeof result === "object" &&
      "surfaceKind" in result,
  );
}

function statusLabel(status: SmartBarMobileOrderStatus) {
  if (status === "ready") return "Ready";
  if (status === "pending") return "Pending";
  if (status === "options") return "Options?";
  return "Unknown";
}

function smartBarMobileCartRowPrimaryTextClass(status: SmartBarMobileOrderStatus, handoffLocked = false) {
  if (handoffLocked) return "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.42)]";
  if (status === "pending") return "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.42)]";

  return "text-slate-950 [text-shadow:0_1px_0_rgba(255,255,255,0.34)]";
}

function smartBarMobileCartRowSecondaryTextClass(status: SmartBarMobileOrderStatus, handoffLocked = false) {
  if (handoffLocked) return "text-white/78";
  if (status === "pending") return "text-white/84";

  return "text-slate-800/84";
}

const SMARTBAR_MOBILE_TAX_RATE = 0.0825;

function smartBarMobileParseMoney(value?: string) {
  const cleaned = String(value || "").replace(/[^0-9.-]+/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function smartBarMobileMoneyFromNumber(value: number) {
  return `$${value.toFixed(2)}`;
}

function smartBarMobileTotalsFromLines(
  lines: SmartBarMobileOrderLine[],
  authoritative?: { subtotal?: string; tax?: string; total?: string },
) {
  const subtotal = lines.reduce((sum, line) => {
    const value = smartBarMobileParseMoney(line.price);
    return value === null ? sum : sum + value;
  }, 0);
  const tax = subtotal > 0 ? subtotal * SMARTBAR_MOBILE_TAX_RATE : 0;
  const total = subtotal + tax;

  const authoritativeSubtotal = smartBarMobileParseMoney(authoritative?.subtotal);
  const authoritativeTax = smartBarMobileParseMoney(authoritative?.tax);
  const authoritativeTotal = smartBarMobileParseMoney(authoritative?.total);

  return {
    subtotal: authoritativeSubtotal ?? subtotal,
    tax: authoritativeTax ?? tax,
    total: authoritativeTotal ?? total,
    subtotalLabel: authoritativeSubtotal !== null
      ? smartBarMobileMoneyFromNumber(authoritativeSubtotal)
      : subtotal > 0 ? smartBarMobileMoneyFromNumber(subtotal) : "—",
    taxLabel: authoritativeTax !== null
      ? smartBarMobileMoneyFromNumber(authoritativeTax)
      : subtotal > 0 ? smartBarMobileMoneyFromNumber(tax) : "—",
    totalLabel: authoritativeTotal !== null
      ? smartBarMobileMoneyFromNumber(authoritativeTotal)
      : subtotal > 0 ? smartBarMobileMoneyFromNumber(total) : "—",
  };
}

function SmartBarMobileOdometerText({ value, motionKey }: { value: string; motionKey?: string }) {
  return (
    <span className="relative inline-flex min-w-[70px] justify-end overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={motionKey || value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function smartBarMobileRowAnimate(status: SmartBarMobileOrderStatus): TargetAndTransition {
  if (status === "pending" || status === "options") {
    return { x: 0, scale: [1, 1.006, 1] };
  }

  return { x: 0, scale: 1 };
}

function smartBarMobileRowTransition(status: SmartBarMobileOrderStatus): Transition {
  if (status === "pending" || status === "options") {
    return {
      x: { type: "spring", stiffness: 520, damping: 36 },
      scale: { duration: 1.45, repeat: Infinity, ease: "easeInOut" },
    };
  }

  return { type: "spring", stiffness: 520, damping: 36 };
}

function ThinkingText({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center justify-center whitespace-nowrap" aria-label={text}>
      {Array.from(text).map((character, index) => (
        <motion.span
          // eslint-disable-next-line react/no-array-index-key
          key={`${character}-${index}`}
          className="inline-block"
          animate={{ y: [0, -1.5, 0], opacity: [0.78, 1, 0.78] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.035,
          }}
        >
          {character === " " ? " " : character}
        </motion.span>
      ))}
    </span>
  );
}


function smartBarMobileTitlePrefix(value: string) {
  const match = value.match(/^\s*(\d+)\s*[×x]\s*(.+)$/i);
  return match ? { prefix: `${match[1]} × `, body: match[2] } : { prefix: "", body: value };
}

function smartBarMobileShortLabel(value: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const key = text.toLowerCase();

  const exact: Record<string, string> = {
    chocolate: "Choc",
    strawberry: "Straw",
    vanilla: "Van",
    caramel: "Caramel",
    medium: "Med",
    large: "Lrg",
    small: "Sm",
    "medium fries": "Med fries",
    "large fries": "Lrg fries",
    "small fries": "Sm fries",
    "medium drink": "Med drink",
    "large drink": "Lrg drink",
    "small drink": "Sm drink",
    "medium sprite": "Med Sprite",
    "large sprite": "Lrg Sprite",
    "medium coke": "Med Coke",
    "large coke": "Lrg Coke",
    "diet coke": "Diet Coke",
    "root beer": "Root Beer",
    "honey mustard": "Honey Must",
    "no onions": "No onion",
    "no pickles": "No pickle",
    "extra cheese": "X cheese",
    "add cheese": "Cheese",
    "extra sauce": "X sauce",
    "choice needed": "Choice",
    "size needed": "Size",
  };

  if (exact[key]) return exact[key];

  return text
    .replace(/\bChocolate\b/gi, "Choc")
    .replace(/\bStrawberry\b/gi, "Straw")
    .replace(/\bMedium\b/gi, "Med")
    .replace(/\bLarge\b/gi, "Lrg")
    .replace(/\bSmall\b/gi, "Sm")
    .replace(/\bHoney Mustard\b/gi, "Honey Must")
    .replace(/\bExtra\b/gi, "X")
    .replace(/\s+/g, " ")
    .trim();
}

function smartBarMobileShortTitle(value: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const { prefix, body } = smartBarMobileTitlePrefix(text);
  const key = body.toLowerCase();

  const exact: Record<string, string> = {
    "classic burger combo": "Classic Combo",
    "classic burger combo meal": "Classic Combo",
    "burger combo meal": "Burger Combo",
    "double stack combo": "Double Combo",
    "double cheeseburger combo": "Double Combo",
    "double cheeseburger combo meal": "Double Combo",
    "spicy chicken combo": "Spicy Combo",
    "nugget box combo": "Nugget Box",
    "family bundle": "Family Bundle",
    "medium onion rings": "Med Rings",
    "large onion rings": "Lrg Rings",
    "small onion rings": "Sm Rings",
    "medium fries": "Med Fries",
    "large fries": "Lrg Fries",
    "small fries": "Sm Fries",
    "medium diet coke": "Med Diet Coke",
    "large diet coke": "Lrg Diet Coke",
    "medium sprite": "Med Sprite",
    "large sprite": "Lrg Sprite",
    "chocolate milkshake": "Choc Shake",
    "strawberry milkshake": "Straw Shake",
  };

  if (exact[key]) return `${prefix}${exact[key]}`;

  return `${prefix}${body
    .replace(/\bCombo Meal\b/gi, "Combo")
    .replace(/\bClassic Burger Combo\b/gi, "Classic Combo")
    .replace(/\bDouble Cheeseburger Combo\b/gi, "Double Combo")
    .replace(/\bSpicy Chicken Combo\b/gi, "Spicy Combo")
    .replace(/\bChocolate\b/gi, "Choc")
    .replace(/\bStrawberry\b/gi, "Straw")
    .replace(/\bMedium\b/gi, "Med")
    .replace(/\bLarge\b/gi, "Lrg")
    .replace(/\bSmall\b/gi, "Sm")
    .replace(/\s+/g, " ")
    .trim()}`;
}


function smartBarMobileDemoKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/^\s*\d+\s*[×x]\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function smartBarMobileLineInstanceKey(line: SmartBarMobileOrderLine) {
  return String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || "");
}

function smartBarMobileReviewedOptionLineKeys(line: SmartBarMobileOrderLine) {
  return [
    line.cartLineKey,
    line.id,
    line.sourceLineItemId,
    line.sourceItemId,
    smartBarMobileDemoKey(line.title),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function smartBarMobileReviewedOptionLineKeyPatch(line: SmartBarMobileOrderLine): Record<string, true> {
  return smartBarMobileReviewedOptionLineKeys(line).reduce<Record<string, true>>((nextKeys, key) => {
    nextKeys[key] = true;
    return nextKeys;
  }, {});
}

function smartBarMobileHasReviewedOptionLineKey(
  line: SmartBarMobileOrderLine,
  reviewedKeys: Record<string, true>,
) {
  return smartBarMobileReviewedOptionLineKeys(line).some((key) => reviewedKeys[key]);
}

function smartBarMobileLineComparableTitle(line: SmartBarMobileOrderLine) {
  return smartBarMobileDemoKey(String(line.title || "").replace(/^\s*\d+\s*[×x]\s*/i, ""));
}

function smartBarMobileLineSourceItemKey(line: SmartBarMobileOrderLine) {
  return smartBarMobileDemoKey(String(line.sourceItemId || line.targetId || ""));
}

function smartBarMobileLinesAreSameInstance(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftExactKeys = [left.cartLineKey, left.id]
    .map((value) => smartBarMobileDemoKey(String(value || "")))
    .filter(Boolean);
  const rightExactKeys = [right.cartLineKey, right.id]
    .map((value) => smartBarMobileDemoKey(String(value || "")))
    .filter(Boolean);

  if (leftExactKeys.some((leftKey) => rightExactKeys.includes(leftKey))) return true;

  const leftLineItemKey = smartBarMobileDemoKey(String(left.sourceLineItemId || ""));
  const rightLineItemKey = smartBarMobileDemoKey(String(right.sourceLineItemId || ""));
  const lineItemMatches = Boolean(leftLineItemKey && rightLineItemKey && leftLineItemKey === rightLineItemKey);
  const leftItemKey = smartBarMobileLineSourceItemKey(left);
  const rightItemKey = smartBarMobileLineSourceItemKey(right);
  const leftTitleKey = smartBarMobileLineComparableTitle(left);
  const rightTitleKey = smartBarMobileLineComparableTitle(right);
  const sourceIndexMatches = left.sourceLineIndex !== undefined &&
    right.sourceLineIndex !== undefined &&
    left.sourceLineIndex === right.sourceLineIndex;

  // Backend repricing can move a line from pending -> complete, which changes
  // sourceBucket/lineItemId. Treat the item identity + visible title as the
  // durable match so the freshly selected green line is not overwritten by the
  // older red/pending shell instance on the first add-on edit.
  if (lineItemMatches && (leftItemKey === rightItemKey || leftTitleKey === rightTitleKey || sourceIndexMatches)) {
    return true;
  }

  if (leftItemKey && rightItemKey && leftItemKey === rightItemKey) {
    if (!leftTitleKey || !rightTitleKey || leftTitleKey === rightTitleKey) return true;
    if (sourceIndexMatches) return true;
  }

  if (leftTitleKey && rightTitleKey && leftTitleKey === rightTitleKey) {
    if (sourceIndexMatches) return true;

    const leftPrice = smartBarMobileDemoKey(String(left.price || ""));
    const rightPrice = smartBarMobileDemoKey(String(right.price || ""));
    return Boolean(!leftPrice || !rightPrice || leftPrice === rightPrice);
  }

  return false;
}

function smartBarMobileRemoveOneLineInstance(
  lines: SmartBarMobileOrderLine[],
  lineToRemove: SmartBarMobileOrderLine,
) {
  const removeIndex = lines.findIndex((candidate) => smartBarMobileLinesAreSameInstance(candidate, lineToRemove));
  if (removeIndex < 0) return lines;

  const nextLines = [...lines];
  nextLines.splice(removeIndex, 1);
  return nextLines;
}

type SmartBarMobileIntroCallout = {
  eyebrow?: string;
  title: string;
  body?: string;
};

export type SmartBarMobileApplyChoiceMeta = {
  selected: boolean;
  multiSelect: boolean;
  valueAlreadySelected: boolean;
};

type SmartBarMobileShellProps = {
  mode?: "lab" | "overlay";
  /** Demo-only underlay guard to prevent page controls from flashing through the scripted submit transition. */
  demoTransitionShield?: boolean;
  /** Optional first-load callout shown above the footer launcher while SmartBar is at rest. */
  introCallout?: SmartBarMobileIntroCallout | null;
  /** Label shown in the companion pill when the entry box is empty. */
  entryModeLabel?: string;
  /** Label shown in the companion pill while the shared surface is being prepared. */
  buildingLabel?: string;
  /** Demo-only command hook for scripted mobile replays. Omit in normal use. */
  demoSubmission?: SmartBarMobileDemoSubmission | null;
  onSubmitPrompt?: (query: string, meta?: SmartBarMobileSubmitMeta) => SmartBarMobileSubmitResult | Promise<SmartBarMobileSubmitResult>;
  onApplyLineChoice?: (line: SmartBarMobileOrderLine, value: string, meta?: SmartBarMobileApplyChoiceMeta) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onRemoveLine?: (line: SmartBarMobileOrderLine) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onNavigateToLine?: (line: SmartBarMobileOrderLine) => void;
  onGenericAction?: (action: SmartBarMobileGenericAction, result: SmartBarMobileGenericResult) => SmartBarMobileSubmitResult | Promise<SmartBarMobileSubmitResult> | void;
  onCartReady?: (result: SmartBarMobileOrderResult) => void;
  onResetCart?: () => void;
};

export default function SmartBarMobileShell({
  mode = "lab",
  demoTransitionShield = false,
  introCallout = null,
  entryModeLabel = "Type order",
  buildingLabel = "Building cart...",
  demoSubmission = null,
  onSubmitPrompt,
  onApplyLineChoice,
  onRemoveLine,
  onNavigateToLine,
  onGenericAction,
  onCartReady,
  onResetCart,
}: SmartBarMobileShellProps) {
  const isOverlay = mode === "overlay";
  const entryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const retryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const genericContentMeasureRef = useRef<HTMLDivElement | null>(null);
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const closeArmTimeoutRef = useRef<number | null>(null);
  const buildTimerRef = useRef<number | null>(null);
  const handoffCollapseTimerRef = useRef<number | null>(null);
  const handoffResetTimerRef = useRef<number | null>(null);
  const choiceLockedLineIdRef = useRef<string | null>(null);
  const adaptiveRailReturnTimerRef = useRef<number | null>(null);
  const adaptiveRailOffsetRef = useRef(0);

  const [phase, setPhase] = useState<SmartBarMobilePhase>("rest");
  const [entryDraft, setEntryDraft] = useState("");
  const [entryFocused, setEntryFocused] = useState(false);
  const [hasEditedEntryDraft, setHasEditedEntryDraft] = useState(false);
  const [submittedPromptPreview, setSubmittedPromptPreview] = useState("");
  const [buildingStatusLabel, setBuildingStatusLabel] = useState(buildingLabel);
  const [retryDraft, setRetryDraft] = useState("");
  const [orderLines, setOrderLines] = useState<SmartBarMobileOrderLine[]>(demoLines);
  const [orderEstimatedSubtotal, setOrderEstimatedSubtotal] = useState<string | undefined>(undefined);
  const [orderEstimatedTax, setOrderEstimatedTax] = useState<string | undefined>(undefined);
  const [orderEstimatedTotal, setOrderEstimatedTotal] = useState(estimatedTotal);
  const [genericResult, setGenericResult] = useState<SmartBarMobileGenericResult | null>(null);
  const [measuredGenericPanelHeight, setMeasuredGenericPanelHeight] = useState<number | null>(null);
  const [hasCart, setHasCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [handoffState, setHandoffState] = useState<SmartBarMobileHandoffState>("idle");
  const [closeArmed, setCloseArmed] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [cartStatusFilter, setCartStatusFilter] = useState<SmartBarMobileCartStatusFilter>(null);
  const [lineOverrides, setLineOverrides] = useState<Record<string, DemoLineOverride>>({});
  const [reviewedOptionLineKeys, setReviewedOptionLineKeys] = useState<Record<string, true>>({});
  const [retryCheckingLineId, setRetryCheckingLineId] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<{ lineId: string; value: string } | null>(null);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [adaptiveRailOffset, setAdaptiveRailOffset] = useState(0);
  const [introTypedTitle, setIntroTypedTitle] = useState("");
  const [introCalloutDismissed, setIntroCalloutDismissed] = useState(false);
  const [stableViewportWidth] = useState(() => {
    if (typeof window === "undefined") return 390;

    return Math.round(
      window.innerWidth || document.documentElement.clientWidth || 390,
    );
  });
  const [stableViewportHeight] = useState(() => {
    if (typeof window === "undefined") return 844;

    return Math.round(
      window.innerHeight || document.documentElement.clientHeight || 844,
    );
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const clearRailTimer = () => {
      if (adaptiveRailReturnTimerRef.current === null) return;
      window.clearTimeout(adaptiveRailReturnTimerRef.current);
      adaptiveRailReturnTimerRef.current = null;
    };

    const setRailOffset = (nextOffset: number) => {
      const roundedOffset = Math.round(nextOffset);
      adaptiveRailOffsetRef.current = roundedOffset;
      setAdaptiveRailOffset(roundedOffset);
    };

    const returnRailToCenter = () => {
      clearRailTimer();
      setRailOffset(0);
    };

    const measureAndMoveForTarget = (targetRect: SmartBarAdaptiveSpotlightRect) => {
      const surfaces = Array.from(
        document.querySelectorAll<HTMLElement>(SMARTBAR_ADAPTIVE_RAIL_SURFACE_SELECTOR),
      );
      const shellRect = smartBarAdaptiveRailUnionRect(surfaces);

      if (!shellRect) {
        returnRailToCenter();
        return;
      }

      const nextOffset = smartBarAdaptiveRailOffsetForTarget(
        targetRect,
        shellRect,
        window.innerWidth,
        adaptiveRailOffsetRef.current,
      );

      setRailOffset(nextOffset);
    };

    const handleSpotlightTarget = (event: Event) => {
      clearRailTimer();

      const isDesktop = window.matchMedia(SMARTBAR_ADAPTIVE_RAIL_DESKTOP_QUERY).matches;

      if (!isDesktop) {
        setRailOffset(0);
        return;
      }

      const detail = ((event as CustomEvent<SmartBarAdaptiveSpotlightDetail>).detail || {}) as SmartBarAdaptiveSpotlightDetail;
      const targetRect = detail.targetRect;

      if (!targetRect) {
        setRailOffset(0);
        return;
      }

      // Let the page/spotlight settle for a beat, then choose the best position.
      // Every target gets a fresh center/left/right candidate check, so a held
      // offset can be corrected when it blocks the next target.
      adaptiveRailReturnTimerRef.current = window.setTimeout(() => {
        adaptiveRailReturnTimerRef.current = null;
        measureAndMoveForTarget(targetRect);
      }, SMARTBAR_ADAPTIVE_RAIL_MEASURE_DELAY_MS);
    };

    const handleSpotlightClear = () => { /* hold rail position until next spotlight target */ };
    const handleResize = () => returnRailToCenter();

    window.addEventListener("smartbar:spotlight-target", handleSpotlightTarget);
    window.addEventListener("smartbar:spotlight-clear", handleSpotlightClear);
    window.addEventListener("resize", handleResize);

    return () => {
      clearRailTimer();
      window.removeEventListener("smartbar:spotlight-target", handleSpotlightTarget);
      window.removeEventListener("smartbar:spotlight-clear", handleSpotlightClear);
      window.removeEventListener("resize", handleResize);
    };
  }, []);


  useEffect(() => {
    setIntroCalloutDismissed(false);
  }, [introCallout?.title]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const title = introCallout?.title || "";
    if (!title || phase !== "rest") {
      setIntroTypedTitle("");
      return;
    }

    let index = 0;
    let intervalId: number | null = null;
    setIntroTypedTitle("");

    const delayId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setIntroTypedTitle(title.slice(0, index));

        if (index >= title.length && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }, 36);
    }, 260);

    return () => {
      window.clearTimeout(delayId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [introCallout?.title, phase]);

  const mobileShellSideInset = 36;
  const mobileShellMaxWidth = 390;
  const entryPillWidth = Math.min(Math.max(stableViewportWidth - mobileShellSideInset * 2, 240), mobileShellMaxWidth);
  const introTypeCharCount = Math.max(1, introTypedTitle.length);
  const introTypeMaxWidth = Math.min(entryPillWidth - 22, 336);
  const introTypeCapsuleWidth = Math.min(Math.max(42, introTypeCharCount * 8.35 + 34), introTypeMaxWidth);
  const introTypeGlassWidth = Math.min(Math.max(70, introTypeCapsuleWidth + 24), entryPillWidth);
  const smartBarAdaptiveRailStyle: CSSProperties = {
    transform: `translate3d(${adaptiveRailOffset}px, 0, 0)`,
    transition: "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
    willChange: "transform",
  };

  const cartTogglePillSize = 46;
  const safariControlLeftGap = 8;
  const safariControlRightGap = 8;
  const launcherPillWidth = Math.min(
    entryPillWidth -
      (cartTogglePillSize * 2) -
      safariControlLeftGap -
      safariControlRightGap,
    260,
  );
  const launcherPillLeft = Math.max(0, (entryPillWidth - launcherPillWidth) / 2);
  const realComposerHeight = 90;
  const entryComposerMaxHeight = Math.max(realComposerHeight, stableViewportHeight - 154 - keyboardLift);
  const smartBarMobileDraftLineCount = (value: string) => {
    return value.split("\n").reduce((sum, line) => {
      return sum + Math.max(1, Math.ceil(Math.max(line.length, 1) / 31));
    }, 0);
  };
  const smartBarMobileComposerHeightForDraft = (value: string) => {
    const lineCount = Math.max(1, smartBarMobileDraftLineCount(value));
    return Math.min(entryComposerMaxHeight, Math.max(realComposerHeight, 54 + lineCount * 25));
  };
  const entryComposerHeight = phase === "entry"
    ? smartBarMobileComposerHeightForDraft(entryDraft)
    : realComposerHeight;
  const submittedPromptPreviewHeight = submittedPromptPreview.trim()
    ? smartBarMobileComposerHeightForDraft(submittedPromptPreview)
    : realComposerHeight;
  const buildPanelHeight = phase === "building_cart" ? submittedPromptPreviewHeight : realComposerHeight;
  const entryComposerRadius = entryComposerHeight > realComposerHeight + 18 ? 30 : 999;
  const buildPanelRadius = buildPanelHeight > realComposerHeight + 18 ? 30 : 999;
  const collapsedCartPanelHeight = 90;
  const maxCartPanelHeight = Math.max(360, stableViewportHeight - 128);

  const lines = useMemo(() => {
    return orderLines.map((line) => {
      const mergedLine: SmartBarMobileOrderLine = {
        ...line,
        ...(lineOverrides[line.id] || {}),
      };
      if (smartBarMobileHasReviewedOptionLineKey(mergedLine, reviewedOptionLineKeys) && mergedLine.status === "options") {
        return {
          ...mergedLine,
          status: "ready" as const,
          helper: "Reviewed and ready",
          options: mergedLine.options || line.options || [],
          optionSelectionMode: mergedLine.optionSelectionMode || "multi",
        };
      }

      return mergedLine;
    });
  }, [lineOverrides, orderLines, reviewedOptionLineKeys]);

  const selectedLine = selectedLineId
    ? lines.find((line) => line.id === selectedLineId) || null
    : null;
  const completeCount = lines.filter((line) => line.status === "ready").length;
  const blockingIssueCount = lines.filter((line) => line.status === "pending").length;
  const optionCount = lines.filter((line) => line.status === "options").length;
  const unknownCount = lines.filter((line) => line.status === "unknown").length;
  const cartGuidanceStatus: SmartBarMobileOrderStatus | null = !genericResult && lines.length > 0
    ? blockingIssueCount > 0
      ? "pending"
      : unknownCount > 0
        ? "unknown"
        : optionCount > 0
          ? "options"
          : null
    : null;
  const unresolvedReviewCount = blockingIssueCount + unknownCount + optionCount;
  const visibleCartLines = cartStatusFilter
    ? lines.filter((line) => line.status === cartStatusFilter)
    : lines;
  const filteredCartCount = visibleCartLines.length;
  const checkoutReady = !genericResult && lines.length > 0 && cartGuidanceStatus === null;
  const handoffLocked = handoffState !== "idle";
  const cartTotals = smartBarMobileTotalsFromLines(lines, {
    subtotal: orderEstimatedSubtotal,
    tax: orderEstimatedTax,
    total: orderEstimatedTotal,
  });
  const cartTotalMotionKey = `${phase}-${lines.length}-${cartTotals.totalLabel}`;
  const measuredGenericSurfaceHeight = measuredGenericPanelHeight
    ? Math.min(maxCartPanelHeight, Math.max(220, measuredGenericPanelHeight + 2))
    : null;
  const chatPanelEstimatedHeight = measuredGenericSurfaceHeight
    ? Math.min(maxCartPanelHeight, Math.max(200, measuredGenericSurfaceHeight))
    : Math.min(maxCartPanelHeight, Math.max(200, genericResult?.height ?? 200));
  const shellChatPanelHeight = Math.min(maxCartPanelHeight, Math.max(456, genericResult?.height ?? 456));
  const bookingPanelMeasuredHeight =
    genericResult &&
    (genericResult.surfaceKind === "booking_tour" || genericResult.surfaceKind === "booking_summary") &&
    measuredGenericSurfaceHeight
      ? Math.min(maxCartPanelHeight, Math.max(260, measuredGenericSurfaceHeight))
      : null;
  const genericPanelHeight = genericResult
    ? genericResult.surfaceKind === "chat_shell"
      ? shellChatPanelHeight
      : genericResult.surfaceKind === "chat"
        ? chatPanelEstimatedHeight
        : genericResult.surfaceKind === "info"
          ? Math.min(maxCartPanelHeight, Math.max(280, (genericResult.height ?? 320) + 18))
          : bookingPanelMeasuredHeight ?? Math.min(maxCartPanelHeight, Math.max(280, (genericResult.height ?? 388) + 18))
    : 0;

  useEffect(() => {
    if (!genericResult) {
      setMeasuredGenericPanelHeight(null);
      return;
    }

    const node = genericContentMeasureRef.current;
    const isChat = genericResult.surfaceKind === "chat";
    const fallbackHeight = Math.min(maxCartPanelHeight, Math.max(isChat ? 200 : 240, genericResult.height ?? (isChat ? 200 : 280)));
    setMeasuredGenericPanelHeight(fallbackHeight);

    let frame = 0;
    const measureSurface = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextHeight = Math.ceil(node?.scrollHeight || 0);
        if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;

        setMeasuredGenericPanelHeight((current) => {
          const clampedHeight = Math.min(
            maxCartPanelHeight,
            Math.max(isChat ? 200 : 240, nextHeight),
          );
          return current === clampedHeight ? current : clampedHeight;
        });
      });
    };

    window.setTimeout(measureSurface, 40);
    window.setTimeout(measureSurface, 180);
    window.setTimeout(measureSurface, 520);

    let observer: ResizeObserver | null = null;
    if (node && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measureSurface);
      observer.observe(node);
    }

    const handleChatHeight = (event: Event) => {
      if (!isChat) return;

      const detail = (event as CustomEvent<{ height?: number }>).detail;
      const nextHeight = Number(detail?.height);

      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;

      setMeasuredGenericPanelHeight((current) => {
        const clampedHeight = Math.min(maxCartPanelHeight, Math.max(200, Math.ceil(nextHeight)));
        return current === clampedHeight ? current : clampedHeight;
      });
    };

    window.addEventListener("smartbar-mobile-chat-height", handleChatHeight as EventListener);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("smartbar-mobile-chat-height", handleChatHeight as EventListener);
    };
  }, [genericResult?.surfaceKind, genericResult?.title, genericResult?.content, genericResult?.height, maxCartPanelHeight]);

  const cartSummaryHeight = genericResult
    ? genericPanelHeight
    : Math.min(
        maxCartPanelHeight,
        Math.max(388, 272 + lines.length * 98 + Math.max(0, lines.length - 1) * 10),
      );
  const selectedOptionCount = selectedLine?.options?.length || 0;
  const selectedOptionRows = Math.ceil(selectedOptionCount / 2);
  const selectedDetailTitle = smartBarMobileShortTitle(selectedLine?.demoDisplayTitle || selectedLine?.title || "");
  const selectedDetailTitleLines = selectedDetailTitle.length > 15 ? 2 : 1;
  const cartDetailHeightFromShape = (optionRows: number, titleLines: number) => {
    const twoLineTitle = titleLines > 1;

    if (optionRows <= 0) return twoLineTitle ? 286 : 260;
    if (optionRows === 1) return twoLineTitle ? 300 : 280;
    if (optionRows === 2) return twoLineTitle ? 316 : 292;
    if (optionRows === 3) return twoLineTitle ? 366 : 346;
    if (optionRows === 4) return twoLineTitle ? 418 : 376;
    if (optionRows === 5) return twoLineTitle ? 456 : 416;

    return twoLineTitle ? 496 : 456;
  };
  const cartDetailHeight = selectedLine?.status === "unknown"
    ? 260
    : Math.min(
        maxCartPanelHeight,
        cartDetailHeightFromShape(selectedOptionRows, selectedDetailTitleLines),
      );
  const fakeCartPanelHeight = handoffState === "complete"
    ? 0
    : phase === "cart"
      ? cartExpanded ? selectedLine ? cartDetailHeight : cartSummaryHeight : collapsedCartPanelHeight
      : buildPanelHeight;
  const fakeCartPanelRadius = phase === "building_cart"
    ? buildPanelRadius
    : handoffState === "complete" || (phase === "cart" && !cartExpanded) ? 999 : 30;
  const fakeCartPanelTransition: Transition = handoffState === "complete"
    ? {
        height: {
          duration: SMARTBAR_MOBILE_CHECKOUT_COLLAPSE_DURATION_MS / 1000,
          ease: [0.16, 1, 0.3, 1],
        },
        borderRadius: {
          duration: 0.68,
          ease: [0.16, 1, 0.3, 1],
        },
      }
    : { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

  const applyOrderResultEstimates = (result: SmartBarMobileOrderResult, fallbackTotal = orderEstimatedTotal) => {
    setOrderEstimatedSubtotal(result.estimatedSubtotal);
    setOrderEstimatedTax(result.estimatedTax);
    setOrderEstimatedTotal(result.estimatedTotal || fallbackTotal);
  };

  const clearCloseArmTimer = () => {
    if (closeArmTimeoutRef.current === null) return;

    window.clearTimeout(closeArmTimeoutRef.current);
    closeArmTimeoutRef.current = null;
  };

  const clearBuildTimer = () => {
    if (buildTimerRef.current === null) return;

    window.clearTimeout(buildTimerRef.current);
    buildTimerRef.current = null;
  };

  const clearHandoffTimers = () => {
    if (handoffCollapseTimerRef.current !== null) {
      window.clearTimeout(handoffCollapseTimerRef.current);
      handoffCollapseTimerRef.current = null;
    }

    if (handoffResetTimerRef.current !== null) {
      window.clearTimeout(handoffResetTimerRef.current);
      handoffResetTimerRef.current = null;
    }
  };

  const scrollSmartBarMobileCartBy = (amount: number) => {
    const node = cartScrollRef.current;
    if (!node) return;

    const maxTop = Math.max(0, node.scrollHeight - node.clientHeight);
    const nextTop = Math.min(maxTop, Math.max(0, node.scrollTop + amount));

    node.scrollTo({ top: nextTop, left: 0, behavior: "smooth" });
  };

  const disarmClose = () => {
    clearCloseArmTimer();
    setCloseArmed(false);
  };

  const resetAdaptiveRailToCenter = () => {
    if (typeof window !== "undefined" && adaptiveRailReturnTimerRef.current !== null) {
      window.clearTimeout(adaptiveRailReturnTimerRef.current);
      adaptiveRailReturnTimerRef.current = null;
    }

    adaptiveRailOffsetRef.current = 0;
    setAdaptiveRailOffset(0);
  };

  useEffect(() => {
    if (phase !== "building_cart") {
      setBuildingStatusLabel(buildingLabel);
    }
  }, [buildingLabel, phase]);

  useEffect(() => {
    return () => {
      clearCloseArmTimer();
      clearBuildTimer();
      clearHandoffTimers();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined" || !window.visualViewport) {
      setKeyboardLift(0);
      return;
    }

    const viewport = window.visualViewport;
    const smartBarKeyboardEditableIsFocused = () => {
      const activeElement = document.activeElement;
      return activeElement === entryTextareaRef.current || activeElement === retryTextareaRef.current;
    };
    const updateKeyboardLift = () => {
      if (!smartBarKeyboardEditableIsFocused()) {
        setKeyboardLift(0);
        return;
      }

      const lift = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
      );

      // iOS Safari can report a small visualViewport delta when the browser
      // toolbar settles. That is not the keyboard. Only lift SmartBar when one
      // of our textareas is focused and the delta is keyboard-sized.
      setKeyboardLift(lift > 96 ? lift : 0);
    };
    const clearKeyboardLiftAfterBlur = () => {
      window.setTimeout(updateKeyboardLift, 60);
    };

    updateKeyboardLift();
    viewport.addEventListener("resize", updateKeyboardLift);
    viewport.addEventListener("scroll", updateKeyboardLift);
    window.addEventListener("orientationchange", updateKeyboardLift);
    document.addEventListener("focusin", updateKeyboardLift);
    document.addEventListener("focusout", clearKeyboardLiftAfterBlur);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardLift);
      viewport.removeEventListener("scroll", updateKeyboardLift);
      window.removeEventListener("orientationchange", updateKeyboardLift);
      document.removeEventListener("focusin", updateKeyboardLift);
      document.removeEventListener("focusout", clearKeyboardLiftAfterBlur);
    };
  }, []);

  const submitPromptValue = (submittedDraftValue: string, meta?: SmartBarMobileSubmitMeta) => {
    const submittedDraft = submittedDraftValue.trim();
    if (!submittedDraft) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    setEntryFocused(false);

    const activeElement = typeof document !== "undefined"
      ? document.activeElement as HTMLElement | null
      : null;
    activeElement?.blur?.();

    disarmClose();
    clearBuildTimer();
    clearHandoffTimers();
    resetAdaptiveRailToCenter();
    setHandoffState("idle");
    setSelectedLineId(null);
    setCartStatusFilter(null);
    setLineOverrides({});
    // Keep reviewed option keys across follow-up submits so yellow rows do not revert after add-item.
    setGenericResult(null);
    setMeasuredGenericPanelHeight(null);
    setCartExpanded(true);
    setSubmittedPromptPreview(submittedDraft);
    setBuildingStatusLabel(buildingLabel);
    setPhase("building_cart");

    const orderResultPromise = onSubmitPrompt
      ? Promise.resolve(onSubmitPrompt(submittedDraft, meta))
      : Promise.resolve<SmartBarMobileSubmitResult>({ lines: demoLines, estimatedTotal });

    buildTimerRef.current = window.setTimeout(() => {
      buildTimerRef.current = null;

      orderResultPromise
        .then((result) => {
          const revealResult = () => {
            if (smartBarMobileResultIsGeneric(result)) {
              setGenericResult(result);
              setOrderLines([]);
              setOrderEstimatedSubtotal(undefined);
              setOrderEstimatedTax(undefined);
              setOrderEstimatedTotal("—");
            } else {
              setGenericResult(null);
              if (result.lines.length > 0) {
                setOrderLines(result.lines);
                applyOrderResultEstimates(result, estimatedTotal);
                window.setTimeout(() => {
                  onCartReady?.(result);
                }, 140);
              }
            }
            setHasCart(true);
            setPhase("cart");
          };

          if (smartBarMobileResultIsGeneric(result) && result.navigationRevealDelayMs && result.navigationRevealDelayMs > 0) {
            setBuildingStatusLabel(result.navigationRevealLabel || "Spotlighting...");
            buildTimerRef.current = window.setTimeout(() => {
              buildTimerRef.current = null;
              revealResult();
            }, result.navigationRevealDelayMs);
            return;
          }

          revealResult();
        })
        .catch(() => {
          setGenericResult(null);
          setOrderLines(demoLines);
          setOrderEstimatedSubtotal(undefined);
          setOrderEstimatedTax(undefined);
          setOrderEstimatedTotal(estimatedTotal);
          setHasCart(true);
          setPhase("cart");
        });
    }, 900);
  };

  const submitPrompt = () => {
    submitPromptValue(entryDraft);
  };

  useEffect(() => {
    if (!demoSubmission) return;

    let cancelled = false;
    const timers: number[] = [];

    const waitFor = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, Math.max(0, ms));
        timers.push(timer);
      });

    const runDemoSubmission = async () => {
      if (!demoSubmission.typing) {
        submitPromptValue(demoSubmission.query, demoSubmission.meta);
        return;
      }

      const query = demoSubmission.query || "";
      const typeDelayMs = demoSubmission.typeDelayMs ?? 24;
      const submitDelayMs = demoSubmission.submitDelayMs ?? 320;

      disarmClose();
      clearBuildTimer();
      clearHandoffTimers();
      setHandoffState("idle");
      setSelectedLineId(null);
      setLineOverrides({});
      setReviewedOptionLineKeys({});
      setGenericResult(null);
      setCartExpanded(false);
      setSubmittedPromptPreview("");
      setEntryDraft("");
      setHasEditedEntryDraft(true);
      setPhase("entry");

      await waitFor(180);
      if (cancelled) return;

      entryTextareaRef.current?.focus({ preventScroll: true });
      setEntryFocused(document.activeElement === entryTextareaRef.current);

      for (let index = 1; index <= query.length; index += 1) {
        if (cancelled) return;
        setEntryDraft(query.slice(0, index));
        await waitFor(typeDelayMs);
      }

      if (demoSubmission.manualSubmit) return;

      await waitFor(submitDelayMs);
      if (cancelled) return;

      submitPromptValue(query, demoSubmission.meta);
    };

    void runDemoSubmission();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoSubmission?.id]);

  const selectLine = (line: SmartBarMobileOrderLine) => {
    if (handoffLocked) return;

    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setSelectedLineId(line.id);
    setCartExpanded(true);

    if (line.status !== "unknown") {
      onNavigateToLine?.(line);
    }

    if (line.status === "unknown") {
      setRetryDraft("");
      setRetryCheckingLineId(null);
    }
  };

  const applyLineChoice = (line: SmartBarMobileOrderLine, value: string) => {
    const multiSelect = line.optionSelectionMode === "multi" || line.status === "options";
    if (handoffLocked || (!multiSelect && choiceLockedLineIdRef.current === line.id)) return;

    const selectedOptionKey = value.trim().toLowerCase();
    const valueAlreadySelected = (line.details || []).some((detail) => {
      return detail.trim().toLowerCase() === selectedOptionKey;
    });

    if (!multiSelect) choiceLockedLineIdRef.current = line.id;
    setSelectedChoice(multiSelect && valueAlreadySelected ? null : { lineId: line.id, value });
    disarmClose();

    const optionKeys = new Set((line.options || []).map((option) => option.trim().toLowerCase()));
    const cleanedDetails = (line.details || []).filter((detail) => {
      const detailKey = detail.trim().toLowerCase();
      if (/^(choice needed|size needed)$/i.test(detail.trim())) return false;
      if (!multiSelect && optionKeys.has(detailKey) && detailKey !== selectedOptionKey) return false;
      return true;
    });
    const nextDetails = multiSelect && valueAlreadySelected
      ? cleanedDetails.filter((detail) => detail.trim().toLowerCase() !== selectedOptionKey)
      : Array.from(new Set([...cleanedDetails, value]));
    const resolvedLine: SmartBarMobileOrderLine = {
      ...line,
      status: "ready",
      helper: multiSelect ? "Reviewed and ready" : `${value} selected`,
      details: nextDetails,
      options: multiSelect ? line.options || [] : undefined,
      optionSelectionMode: line.optionSelectionMode || (multiSelect ? "multi" : "single"),
    };
    const parentResultPromise = onApplyLineChoice
      ? Promise.resolve(onApplyLineChoice(resolvedLine, value, {
          selected: !(multiSelect && valueAlreadySelected),
          multiSelect,
          valueAlreadySelected,
        }))
      : Promise.resolve<SmartBarMobileOrderResult | void>(undefined);

    // Required choices are single-select and close the detail view after a short
    // confirmation beat. Optional extras stay multi-select for stacking, but
    // after any review/edit the row becomes green because it is now prepared.
    if (multiSelect) {
      setReviewedOptionLineKeys((current) => ({
        ...current,
        ...smartBarMobileReviewedOptionLineKeyPatch(line),
      }));
    }

    setLineOverrides((current) => ({
      ...current,
      [line.id]: {
        ...(current[line.id] || {}),
        status: resolvedLine.status,
        helper: resolvedLine.helper,
        details: resolvedLine.details,
        options: line.options || [],
        optionSelectionMode: resolvedLine.optionSelectionMode,
      },
    }));

    window.setTimeout(() => {
      const optimisticResult: SmartBarMobileOrderResult = {
        lines: lines.map((candidate) => smartBarMobileLinesAreSameInstance(candidate, resolvedLine) ? resolvedLine : candidate),
      };

      setOrderLines(optimisticResult.lines);
      applyOrderResultEstimates(optimisticResult, "");
      setLineOverrides({});
      choiceLockedLineIdRef.current = null;
      setSelectedChoice(null);
      setSelectedLineId((current) => (multiSelect && current === line.id ? line.id : null));
      setCartExpanded(true);

      parentResultPromise
        .then((parentResult) => {
          if (!parentResult || parentResult.lines.length === 0) return;

          const reviewedParentResult: SmartBarMobileOrderResult = {
            ...parentResult,
            lines: parentResult.lines.map((candidate) => (
              smartBarMobileLinesAreSameInstance(candidate, resolvedLine)
                ? {
                    ...candidate,
                    status: resolvedLine.status,
                    helper: resolvedLine.helper,
                    details: resolvedLine.details,
                    options: candidate.options || resolvedLine.options || line.options || [],
                    optionSelectionMode: candidate.optionSelectionMode || resolvedLine.optionSelectionMode,
                  }
                : candidate
            )),
          };

          setOrderLines(reviewedParentResult.lines);
          applyOrderResultEstimates(reviewedParentResult);
          if (multiSelect) {
            setSelectedLineId((current) => (current === line.id ? line.id : current));
          }
        })
        .catch(() => {
          // Keep the optimistic cart if the pricing refresh fails.
        });
    }, 360);
  };


  const removeLine = (line: SmartBarMobileOrderLine) => {
    if (handoffLocked) return;

    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);

    const parentResultPromise = onRemoveLine
      ? Promise.resolve(onRemoveLine(line))
      : Promise.resolve<SmartBarMobileOrderResult | void>(undefined);
    const fallbackLines = smartBarMobileRemoveOneLineInstance(orderLines, line);
    const optimisticResult: SmartBarMobileOrderResult = {
      lines: fallbackLines,
      estimatedTotal: fallbackLines.length ? undefined : "—",
    };

    setOrderLines(optimisticResult.lines);
    applyOrderResultEstimates(optimisticResult, optimisticResult.lines.length ? "" : "—");
    setLineOverrides({});
    setSelectedLineId(null);
    setCartExpanded(true);

    if (optimisticResult.lines.length === 0) {
      setHasCart(false);
      setEntryDraft("");
      setHasEditedEntryDraft(false);
      setSubmittedPromptPreview("");
      setPhase("entry");
    }

    parentResultPromise
      .then((parentResult) => {
        if (!parentResult) return;
        setOrderLines(parentResult.lines);
        applyOrderResultEstimates(parentResult, parentResult.lines.length ? "" : "—");

        if (parentResult.lines.length === 0) {
          setHasCart(false);
          setEntryDraft("");
          setHasEditedEntryDraft(false);
          setSubmittedPromptPreview("");
          setPhase("entry");
        }
      })
      .catch(() => {
        // Keep the optimistic removal if the pricing refresh fails.
      });
  };


  const submitRetry = () => {
    const submittedRetry = retryDraft.trim();
    if (handoffLocked || !selectedLine || selectedLine.status !== "unknown" || !submittedRetry || retryCheckingLineId) return;

    retryTextareaRef.current?.blur();
    disarmClose();
    setRetryCheckingLineId(selectedLine.id);

    const replacementPromise = onSubmitPrompt
      ? Promise.resolve(
          onSubmitPrompt(submittedRetry, {
            intent: "replace_unknown",
            replaceLineId: selectedLine.id,
            replaceLineTitle: selectedLine.title,
          }),
        )
      : Promise.resolve<SmartBarMobileOrderResult>({
          lines: [
            {
              ...selectedLine,
              id: `${selectedLine.id}-retry`,
              title: submittedRetry,
              status: "ready",
              helper: "Re-entered and matched",
              price: "$5.49",
              details: [submittedRetry],
              options: [],
            },
          ],
          estimatedTotal: orderEstimatedTotal,
        });

    replacementPromise
      .then((result) => {
        if (smartBarMobileResultIsGeneric(result)) {
          setGenericResult(result);
          setOrderLines([]);
          setOrderEstimatedSubtotal(undefined);
          setOrderEstimatedTax(undefined);
          setOrderEstimatedTotal("—");
          setRetryDraft("");
          setLineOverrides({});
          setSelectedLineId(null);
          setCartExpanded(true);
          return;
        }

        const replacementLines = result.preserveResultLinesOnRetry
          ? result.lines
          : smartBarMobileRemoveOneLineInstance(result.lines, selectedLine);

        if (replacementLines.length > 0) {
          setGenericResult(null);
          setOrderLines(replacementLines);
          applyOrderResultEstimates(result);
        } else {
          setOrderLines((current) => smartBarMobileRemoveOneLineInstance(current, selectedLine));
        }

        setRetryDraft("");
        setLineOverrides({});
        setSelectedLineId(null);
        setCartExpanded(true);
      })
      .catch(() => {
        setLineOverrides((current) => ({
          ...current,
          [selectedLine.id]: {
            ...(current[selectedLine.id] || {}),
            status: "unknown",
            helper: "Still could not match item",
            details: [submittedRetry],
            retryPrompt: "Try the item again with a BurgerRush menu name.",
          } as DemoLineOverride,
        }));
      })
      .finally(() => {
        setRetryCheckingLineId(null);
      });
  };

  const returnToEntryFromCart = () => {
    if (handoffLocked) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    setEntryFocused(false);
    clearBuildTimer();
    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setSelectedLineId(null);
    setCartStatusFilter(null);
    setCartExpanded(true);
    setEntryDraft("");
    setHasEditedEntryDraft(false);
    setSubmittedPromptPreview("");
    setPhase("entry");
  };

  const openCartFromEntry = () => {
    if (handoffLocked || !hasCart) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    clearBuildTimer();
    disarmClose();
    setSelectedLineId(null);
    setCartExpanded(true);
    setPhase("cart");
  };

  const resetToRest = () => {
    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    setEntryFocused(false);
    clearBuildTimer();
    clearHandoffTimers();
    setHandoffState("idle");
    setPhase("rest");
    setEntryDraft("");
    setHasEditedEntryDraft(false);
    setSubmittedPromptPreview("");
    setRetryDraft("");
    setOrderLines(demoLines);
    setOrderEstimatedSubtotal(undefined);
    setOrderEstimatedTax(undefined);
    setOrderEstimatedTotal(estimatedTotal);
    setGenericResult(null);
    setMeasuredGenericPanelHeight(null);
    setLineOverrides({});
    setReviewedOptionLineKeys({});
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setHasCart(false);
    onResetCart?.();
    disarmClose();
    setSelectedLineId(null);
    setCartStatusFilter(null);
    setCartExpanded(true);
  };


  const startCheckoutHandoff = () => {
    if (!checkoutReady || handoffLocked) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    clearBuildTimer();
    clearHandoffTimers();
    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setSelectedLineId(null);
    setCartStatusFilter(null);
    setCartExpanded(true);
    setHandoffState("handing_off");

    handoffCollapseTimerRef.current = window.setTimeout(() => {
      handoffCollapseTimerRef.current = null;
      setHandoffState("complete");
      setCartExpanded(false);

      handoffResetTimerRef.current = window.setTimeout(() => {
        handoffResetTimerRef.current = null;
        resetToRest();
      }, SMARTBAR_MOBILE_CHECKOUT_RESET_AFTER_COLLAPSE_MS);
    }, 3000);
  };

  const toggleCartStatusFilter = (status: SmartBarMobileOrderStatus, count: number) => {
    if (handoffLocked || count <= 0) return;

    setSelectedLineId(null);
    setCartStatusFilter((current) => current === status ? null : status);
  };

  const clearCartStatusFilter = () => {
    if (handoffLocked) return;

    setSelectedLineId(null);
    setCartStatusFilter(null);
  };

  const cartFilterButtonClass = (active: boolean, disabled = false) => [
    "flex min-h-[42px] items-center justify-center rounded-full px-2 text-center font-black tabular-nums transition",
    active ? "scale-[1.03] ring-2 ring-white/80 shadow-[0_10px_24px_rgba(2,6,23,0.24)]" : "ring-1 ring-white/18",
    disabled ? "opacity-35" : "active:scale-95",
  ].join(" ");

  const unknownFilterPillClass = isOverlay
    ? "border border-slate-400/30 bg-slate-900/86 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_18px_rgba(2,6,23,0.28)]"
    : "border border-slate-400/35 bg-slate-800 text-slate-50 shadow-sm";

  const companionLabel = (() => {
    if (phase === "rest") return "SmartBar";
    if (closeArmed) return "Tap again...";
    if (handoffState === "handing_off") return "Sending...";
    if (handoffState === "complete") return "Complete";
    if (phase === "entry") return hasEditedEntryDraft && entryDraft.trim() ? "Tap to submit" : entryModeLabel;
    if (phase === "building_cart") {
      return buildingStatusLabel && buildingStatusLabel !== buildingLabel
        ? buildingStatusLabel
        : hasCart ? "Updating..." : buildingStatusLabel;
    }
    if (phase === "cart" && genericResult) return genericResult.statusLabel || genericResult.title || "SmartBar result";
    if (phase === "cart" && selectedLine?.status === "unknown") {
      return retryCheckingLineId === selectedLine.id
        ? "Checking..."
        : retryDraft.trim() ? "Tap to retry" : "Retry gray entry";
    }
    if (phase === "cart" && selectedLine?.status === "options") return "Mark reviewed";
    if (phase === "cart" && selectedLine) return "Back to cart";
    if (phase === "cart" && cartGuidanceStatus === "pending") return "Tap red entries";
    if (phase === "cart" && cartGuidanceStatus === "unknown") return "Retry gray entries";
    if (phase === "cart" && cartGuidanceStatus === "options") return "Review yellow entries";
    if (phase === "cart") return "Tap for checkout";
    if (checkoutReady) return `Ready checkout · ${cartTotals.totalLabel}`;
    return `${unresolvedReviewCount} need attention · ${cartTotals.totalLabel}`;
  })();

  const handleCompanionClick = () => {
    if (closeArmed) disarmClose();

    if (handoffLocked) return;

    if (phase === "rest") {
      setPhase("entry");
      return;
    }

    if (phase === "entry") {
      if (entryDraft.trim()) {
        submitPrompt();
        return;
      }

      entryTextareaRef.current?.focus();
      return;
    }

    if (phase === "building_cart") return;

    if (phase === "cart" && genericResult) return;

    if (phase === "cart" && selectedLine?.status === "unknown") {
      submitRetry();
      return;
    }

    if (phase === "cart" && selectedLine) {
      if (selectedLine.status === "options") {
        const reviewedLine: SmartBarMobileOrderLine = {
          ...selectedLine,
          status: "ready",
          helper: "Reviewed and ready",
          options: selectedLine.options || [],
          optionSelectionMode: selectedLine.optionSelectionMode || "multi",
        };
        const reviewedResult: SmartBarMobileOrderResult = {
          lines: lines.map((candidate) => smartBarMobileLinesAreSameInstance(candidate, selectedLine) ? reviewedLine : candidate),
        };

        setReviewedOptionLineKeys((current) => ({
          ...current,
          ...smartBarMobileReviewedOptionLineKeyPatch(selectedLine),
        }));

        setOrderLines(reviewedResult.lines);
        applyOrderResultEstimates(reviewedResult, "");
        setLineOverrides({});
        setSelectedChoice(null);
      }

      setSelectedLineId(null);
      setCartExpanded(true);
      return;
    }

    if (phase === "cart" && cartGuidanceStatus) {
      setSelectedLineId(null);
      setCartExpanded(true);
      setCartStatusFilter(cartGuidanceStatus);
      return;
    }

    if (phase === "cart" && checkoutReady) {
      startCheckoutHandoff();
    }
  };

  const handleClosePillClick = () => {
    if (phase === "rest" || handoffLocked) return;

    if (closeArmed) {
      resetToRest();
      return;
    }

    setCloseArmed(true);
    clearCloseArmTimer();
    closeArmTimeoutRef.current = window.setTimeout(() => {
      closeArmTimeoutRef.current = null;
      setCloseArmed(false);
    }, 2000);
  };

  const handleCartToggleClick = () => {
    if (handoffLocked) return;

    if (phase === "cart") {
      returnToEntryFromCart();
      return;
    }

    if (phase === "entry" && hasCart) {
      openCartFromEntry();
      return;
    }

    disarmClose();
    setCartExpanded((expanded) => !expanded);
  };

  const handleGenericActionClick = (action: SmartBarMobileGenericAction, result: SmartBarMobileGenericResult) => {
    if (handoffLocked || action.disabled) return;

    const actionResult = onGenericAction?.(action, result);
    if (!actionResult) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    clearBuildTimer();
    clearHandoffTimers();
    disarmClose();
    setHandoffState("idle");
    setSelectedLineId(null);
    setLineOverrides({});
    setCartExpanded(true);
    setSubmittedPromptPreview(action.label);
    setBuildingStatusLabel(buildingLabel);
    setGenericResult(null);
    setPhase("building_cart");

    const revealGenericActionResult = (nextResult: SmartBarMobileSubmitResult) => {
      if (smartBarMobileResultIsGeneric(nextResult)) {
        setGenericResult(nextResult);
        setOrderLines([]);
        setOrderEstimatedSubtotal(undefined);
        setOrderEstimatedTax(undefined);
        setOrderEstimatedTotal("—");
      } else {
        setGenericResult(null);
        setOrderLines(nextResult.lines);
        applyOrderResultEstimates(nextResult, estimatedTotal);
      }
      setHasCart(true);
      setPhase("cart");
    };

    Promise.resolve(actionResult)
      .then((nextResult) => {
        buildTimerRef.current = window.setTimeout(() => {
          buildTimerRef.current = null;

          if (smartBarMobileResultIsGeneric(nextResult) && nextResult.navigationRevealDelayMs && nextResult.navigationRevealDelayMs > 0) {
            setBuildingStatusLabel(nextResult.navigationRevealLabel || "Spotlighting...");
            buildTimerRef.current = window.setTimeout(() => {
              buildTimerRef.current = null;
              revealGenericActionResult(nextResult);
            }, nextResult.navigationRevealDelayMs);
            return;
          }

          revealGenericActionResult(nextResult);
        }, 850);
      })
      .catch(() => {
        setGenericResult({
          surfaceKind: "info",
          eyebrow: "SmartBar",
          title: "Could not continue",
          body: "SmartBar could not complete that next step. Try typing your request instead.",
          statusLabel: "Retry",
          height: 320,
        });
        setOrderLines([]);
        setOrderEstimatedSubtotal(undefined);
        setOrderEstimatedTax(undefined);
        setOrderEstimatedTotal("—");
        setHasCart(true);
        setPhase("cart");
      });
  };

  useEffect(() => {
    const handleDemoGenericAction = (event: Event) => {
      const detail = (event as CustomEvent<{ actionId?: string }>).detail;
      const actionId = String(detail?.actionId || "").trim();

      if (!actionId || !genericResult || handoffLocked) return;

      const action = (genericResult.actions || []).find((candidate) => candidate.id === actionId);
      if (!action || action.disabled) return;

      handleGenericActionClick(action, genericResult);
    };

    window.addEventListener("smartbar-mobile-run-generic-action", handleDemoGenericAction as EventListener);

    return () => {
      window.removeEventListener("smartbar-mobile-run-generic-action", handleDemoGenericAction as EventListener);
    };
  }, [genericResult, handoffLocked, handleGenericActionClick]);

  useEffect(() => {
    const handleDomiDemoResult = (event: Event) => {
      const detail = (event as CustomEvent<{ result?: SmartBarMobileSubmitResult; actionId?: string }>).detail;
      const result = detail?.result;
      const actionId = String(detail?.actionId || "");

      if (!result) return;

      const revealDomiDemoResult = (nextResult: SmartBarMobileSubmitResult) => {
        if (smartBarMobileResultIsGeneric(nextResult)) {
          setGenericResult(nextResult);
          setOrderLines([]);
          setOrderEstimatedSubtotal(undefined);
          setOrderEstimatedTax(undefined);
          setOrderEstimatedTotal("—");
        } else {
          setGenericResult(null);
          setOrderLines(nextResult.lines);
          applyOrderResultEstimates(nextResult, estimatedTotal);
        }

        setHasCart(true);
        setCartExpanded(true);
        setPhase("cart");
      };

      entryTextareaRef.current?.blur();
      retryTextareaRef.current?.blur();
      clearBuildTimer();
      clearHandoffTimers();
      disarmClose();
      setHandoffState("idle");
      setSelectedLineId(null);
      setLineOverrides({});
      setMeasuredGenericPanelHeight(null);
      setCartExpanded(false);
      setSubmittedPromptPreview(
        actionId === "booking-nav-next"
          ? "Next"
          : actionId === "booking-context-continue"
            ? "Continue search"
            : actionId === "booking-summary" || actionId === "booking-handoff"
              ? "Prepare booking summary"
              : "SmartBar action",
      );
      setBuildingStatusLabel(
        smartBarMobileResultIsGeneric(result) && result.navigationRevealLabel
          ? result.navigationRevealLabel
          : actionId === "booking-summary" || actionId === "booking-handoff"
            ? "Preparing booking..."
            : buildingLabel,
      );
      setGenericResult(null);
      setPhase("building_cart");

      if (
        smartBarMobileResultIsGeneric(result) &&
        result.navigationRevealDelayMs &&
        result.navigationRevealDelayMs > 0
      ) {
        setBuildingStatusLabel(result.navigationRevealLabel || "Spotlighting...");

        buildTimerRef.current = window.setTimeout(() => {
          buildTimerRef.current = null;
          revealDomiDemoResult(result);
        }, result.navigationRevealDelayMs);
        return;
      }

      buildTimerRef.current = window.setTimeout(() => {
        buildTimerRef.current = null;
        revealDomiDemoResult(result);
      }, actionId === "booking-nav-next" ? 1200 : 850);
    };

    window.addEventListener("smartbar-mobile-domi-demo-result", handleDomiDemoResult as EventListener);

    return () => {
      window.removeEventListener("smartbar-mobile-domi-demo-result", handleDomiDemoResult as EventListener);
    };
  }, [buildingLabel]);

  useEffect(() => {
    const handleDomiOpenEntry = () => {
      entryTextareaRef.current?.blur();
      retryTextareaRef.current?.blur();
      clearBuildTimer();
      clearHandoffTimers();
      disarmClose();
      choiceLockedLineIdRef.current = null;
      setSelectedChoice(null);
      setRetryCheckingLineId(null);
      setSelectedLineId(null);
      setLineOverrides({});
      setGenericResult(null);
      setMeasuredGenericPanelHeight(null);
      setOrderLines([]);
      setOrderEstimatedSubtotal(undefined);
      setOrderEstimatedTax(undefined);
      setOrderEstimatedTotal("—");
      setHasCart(false);
      setCartExpanded(false);
      setSubmittedPromptPreview("");
      setEntryDraft("");
      setHasEditedEntryDraft(false);
      setPhase("entry");
    };

    window.addEventListener("smartbar-mobile-domi-open-entry", handleDomiOpenEntry as EventListener);

    return () => {
      window.removeEventListener("smartbar-mobile-domi-open-entry", handleDomiOpenEntry as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleDomiDemoPreAction = (event: Event) => {
      const detail = (event as CustomEvent<{ actionId?: string }>).detail;
      const actionId = String(detail?.actionId || "");

      entryTextareaRef.current?.blur();
      retryTextareaRef.current?.blur();
      clearBuildTimer();
      clearHandoffTimers();
      disarmClose();
      setHandoffState("idle");
      setSelectedLineId(null);
      setLineOverrides({});
      setMeasuredGenericPanelHeight(null);
      setCartExpanded(false);
      setSubmittedPromptPreview(
        actionId === "booking-nav-next"
          ? "Next"
          : actionId === "booking-context-continue"
            ? "Continue search"
            : actionId === "booking-summary" || actionId === "booking-handoff"
              ? "Prepare booking summary"
              : "SmartBar action",
      );
      setBuildingStatusLabel(
        actionId === "booking-summary" || actionId === "booking-handoff"
          ? "Preparing booking..."
          : "Spotlighting...",
      );
      setGenericResult(null);
      setPhase("building_cart");
    };

    window.addEventListener("smartbar-mobile-domi-demo-preaction", handleDomiDemoPreAction as EventListener);

    return () => {
      window.removeEventListener("smartbar-mobile-domi-demo-preaction", handleDomiDemoPreAction as EventListener);
    };
  }, []);

  const handleShellContentActionClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const actionElement = target?.closest<HTMLElement>("[data-smartbar-mobile-content-action]");

    if (!actionElement || !genericResult || handoffLocked) return;

    const actionId = actionElement.getAttribute("data-smartbar-mobile-content-action") || "";
    if (!actionId) return;

    const actionLabel =
      actionElement.getAttribute("data-smartbar-mobile-content-action-label") ||
      actionElement.textContent ||
      actionId;

    handleGenericActionClick(
      {
        id: actionId,
        label: actionLabel.replace(/→/g, "").replace(/\s+/g, " ").trim(),
        variant: actionElement.getAttribute("data-smartbar-mobile-content-action-variant") === "secondary"
          ? "secondary"
          : "primary",
      },
      genericResult,
    );
  };

  const showCartToggle = handoffState === "idle" && hasCart && (phase === "entry" || phase === "cart");
  const cartToggleShowsUp = phase === "entry" || !cartExpanded;
  const companionPolicyStatus: SmartBarMobileOrderStatus | null = phase === "cart" && !genericResult
    ? selectedLine?.status === "options" || selectedLine?.status === "unknown" || selectedLine?.status === "pending"
      ? selectedLine.status
      : !selectedLine
        ? cartGuidanceStatus
        : null
    : null;
  const companionPillStyle = smartBarMobileFooterPolicyStyle(companionPolicyStatus);
  const companionTextClass = smartBarMobileFooterPolicyTextClass(companionPolicyStatus);
  const {
    rootTextClass,
    upperGlassClass,
    chromePillClass,
    inputDraftCapsuleClass,
    skyEyebrowClass,
    retryInputClass,
    issuePillClass,
    lineButtonClass,
    handoffTitleClass,
    totalsBoxClass,
  } = getSmartBarMobileShellStyles(isOverlay, checkoutReady);

  const genericActions = genericResult?.actions || [];
  const bookingNavActions = genericActions.filter((action) =>
    action.id === "booking-nav-back" || action.id === "booking-nav-next",
  );
  const standardGenericActions = genericActions
    .filter((action) => action.id !== "booking-nav-back" && action.id !== "booking-nav-next")
    .filter((action) => {
      const isBookingSurface =
        genericResult?.surfaceKind === "booking_tour" ||
        genericResult?.surfaceKind === "booking_summary";

      if (!isBookingSurface) return true;

      // Booking surfaces already render their deliberate CTA and Back/Next rail.
      // Do not also render suggestion chips as extra dark default buttons.
      return !action.id.startsWith("suggestion");
    })
    .filter((action, index, actions) => {
      const isBookingSurface =
        genericResult?.surfaceKind === "booking_tour" ||
        genericResult?.surfaceKind === "booking_summary";

      if (!isBookingSurface) return true;

      const labelKey = `${String(action.label || "").trim().toLowerCase()}|${String(action.helper || "").trim().toLowerCase()}`;
      return actions.findIndex((candidate) => {
        const candidateKey = `${String(candidate.label || "").trim().toLowerCase()}|${String(candidate.helper || "").trim().toLowerCase()}`;
        return candidateKey === labelKey;
      }) === index;
    });
  const genericActionButtonClass = (action: SmartBarMobileGenericAction) => {
    const strongPills = SMARTBAR_MOBILE_STRONG_ACTION_PILLS;

    if (action.id === "booking-nav-back") {
      return strongPills
        ? "flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/26 bg-slate-950/92 px-4 py-3 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(2,6,23,0.28)] ring-1 ring-white/18 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        : "flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full border border-white/18 bg-slate-950/82 px-4 py-3 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(2,6,23,0.22)] ring-1 ring-white/12 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";
    }

    if (action.id === "booking-nav-next") {
      return strongPills
        ? "flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-sky-200/98 px-4 py-3 text-center text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.52),0_10px_24px_rgba(14,165,233,0.28)] ring-1 ring-sky-50/56 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        : "flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-sky-200/94 px-4 py-3 text-center text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_10px_24px_rgba(14,165,233,0.22)] ring-1 ring-sky-100/46 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";
    }

    if (action.variant === "secondary") {
      return strongPills
        ? "flex h-[62px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border border-white/26 bg-slate-950/90 px-4 py-0 text-left text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(2,6,23,0.26)] ring-1 ring-white/16 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        : "flex h-[62px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border border-white/18 bg-slate-950/76 px-4 py-0 text-left text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/10 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
    }

    return strongPills
      ? "flex h-[62px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] bg-sky-200/98 px-4 py-0 text-left text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.50),0_10px_24px_rgba(14,165,233,0.26)] ring-1 ring-sky-50/54 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      : "flex h-[62px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] bg-sky-200/92 px-4 py-0 text-left text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_10px_24px_rgba(14,165,233,0.18)] ring-1 ring-sky-100/42 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
  };

  return (
    <div
      data-smartbar-mobile-shell="true"
      data-smartbar-mobile-phase={phase}
      data-smartbar-mobile-cart-open={phase === "cart" ? "true" : undefined}
      onClick={handleShellContentActionClick}
      className={`fixed inset-0 z-[10080] overflow-visible ${rootTextClass} ${
        isOverlay
          ? "pointer-events-none bg-transparent"
          : "bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.24),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_46%_92%,rgba(249,115,22,0.16),transparent_30%),linear-gradient(180deg,#172033_0%,#263449_44%,#182235_100%)]"
      }`}
    >
      {!isOverlay && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.24] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="absolute inset-x-4 bottom-[18px] top-5 flex flex-col justify-between gap-3">
            <div className="rounded-[30px] border border-white/20 bg-slate-950/54 p-4 shadow-xl shadow-slate-950/20 ring-1 ring-white/10">
              <div className="h-3 w-32 rounded-full bg-emerald-300/80" />
              <div className="mt-4 h-8 w-56 rounded-2xl bg-white/84" />
              <div className="mt-3 h-3 w-full rounded-full bg-white/42" />
              <div className="mt-2 h-3 w-5/6 rounded-full bg-white/30" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[26px] border border-emerald-200/32 bg-emerald-400/30 p-4 shadow-lg shadow-slate-950/16 ring-1 ring-white/10">
                <div className="h-10 w-10 rounded-2xl bg-emerald-200/88" />
                <div className="mt-4 h-3 w-24 rounded-full bg-white/76" />
                <div className="mt-2 h-3 w-full rounded-full bg-white/36" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-white/24" />
              </div>
              <div className="rounded-[26px] border border-sky-200/32 bg-sky-400/30 p-4 shadow-lg shadow-slate-950/16 ring-1 ring-white/10">
                <div className="h-10 w-10 rounded-2xl bg-sky-200/88" />
                <div className="mt-4 h-3 w-24 rounded-full bg-white/76" />
                <div className="mt-2 h-3 w-full rounded-full bg-white/36" />
                <div className="mt-2 h-3 w-2/3 rounded-full bg-white/24" />
              </div>
            </div>

            <div className="rounded-[30px] border border-white/18 bg-white/18 p-4 shadow-lg shadow-slate-950/16 ring-1 ring-white/12">
              <div className="flex gap-3">
                <div className="h-20 w-20 rounded-[24px] bg-orange-300/78" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-40 rounded-full bg-white/86" />
                  <div className="h-3 w-full rounded-full bg-white/44" />
                  <div className="h-3 w-5/6 rounded-full bg-white/34" />
                  <div className="h-3 w-2/3 rounded-full bg-white/24" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_0.72fr] gap-3">
              <div className="rounded-[28px] border border-violet-200/28 bg-violet-400/24 p-4 shadow-lg shadow-slate-950/16 ring-1 ring-white/10">
                <div className="h-3 w-28 rounded-full bg-white/78" />
                <div className="mt-3 h-12 rounded-[22px] bg-white/24" />
                <div className="mt-3 h-3 w-full rounded-full bg-white/34" />
              </div>
              <div className="rounded-[28px] border border-amber-200/30 bg-amber-300/30 p-4 shadow-lg shadow-slate-950/16 ring-1 ring-white/10">
                <div className="h-14 rounded-[22px] bg-white/30" />
                <div className="mt-3 h-3 w-full rounded-full bg-white/42" />
              </div>
            </div>

            <div className="mb-[84px] rounded-[30px] border border-white/20 bg-slate-950/48 p-4 shadow-xl shadow-slate-950/22 ring-1 ring-white/12">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-300/78" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-44 rounded-full bg-white/86" />
                  <div className="h-3 w-full rounded-full bg-white/38" />
                  <div className="h-3 w-3/4 rounded-full bg-white/28" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`relative z-[1] min-h-0 pb-[88px] ${isOverlay ? "pointer-events-none overflow-visible" : "h-full overflow-hidden"}`}>
        <AnimatePresence mode="wait">
          {!isOverlay && phase === "rest" && (
            <motion.section
              key="rest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex h-full items-end justify-center px-5 pb-[92px]"
            >
              <div className="max-w-[360px] rounded-[30px] border border-white/10 bg-white/[0.055] p-4 text-center shadow-2xl backdrop-blur-xl">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/16 text-emerald-200 ring-1 ring-emerald-200/25">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-lg font-black tracking-tight">
                  Order in plain English
                </div>
                <div className="mt-1 text-sm font-semibold leading-6 text-slate-300">
                  Tap the SmartBar pill to start a guided web order.
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence initial={false}>
        {isOverlay && demoTransitionShield && (
          phase === "building_cart" ||
          (phase === "cart" && cartExpanded && !selectedLine && handoffState === "idle")
        ) && (
          <motion.div
            key="demo-transition-shield"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[10081] h-[58svh] bg-slate-950/70 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {phase === "entry" && (
          <motion.section
            key="real-entry-composer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="pointer-events-auto fixed inset-x-0 z-[10083] flex justify-center px-0"
            style={{ bottom: 76 + keyboardLift, ...smartBarAdaptiveRailStyle }}
          >
            <div
              data-smartbar-mobile-adaptive-surface="true"
              className={upperGlassClass}
              style={{ ...SMARTBAR_MOBILE_BLUE_CONTROL_STYLE, width: entryPillWidth, height: entryComposerHeight, borderRadius: entryComposerRadius }}
            >
              <div className="relative h-full px-3 py-2">
                {entryFocused && !entryDraft.trim() && (
                  <div
                    data-smartbar-mobile-entry-ready-cursor="true"
                    className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="h-6 w-[2px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.92),0_0_24px_rgba(56,189,248,0.58)] animate-pulse" />
                  </div>
                )}
                <textarea
                  data-smartbar-mobile-entry-input="true"
                  ref={entryTextareaRef}
                  value={entryDraft}
                  onChange={(event) => {
                    setEntryDraft(event.target.value);
                    setHasEditedEntryDraft(true);
                  }}
                  onFocus={() => setEntryFocused(true)}
                  onBlur={() => setEntryFocused(false)}
                  className="relative z-[2] h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-center text-[16px] font-normal leading-5 text-transparent outline-none ring-0 placeholder:text-transparent caret-transparent selection:bg-slate-900/15"
                  placeholder=""
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="none"
                />
                <AnimatePresence initial={false}>
                  {entryDraft.trim() && (
                    <motion.div
                      key="smartbar-live-entry-capsule"
                      initial={{ opacity: 0, y: 3, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 2, scale: 0.99 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-x-4 inset-y-2 z-[1] flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <div
                        className={`${inputDraftCapsuleClass} max-w-full !rounded-[28px] !border-transparent !bg-transparent !text-[16px] !font-semibold !tracking-[-0.01em] !text-white !shadow-none ![text-shadow:none]`}
                        style={{
                          maxHeight: Math.max(42, entryComposerHeight - 24),
                          whiteSpace: "pre-wrap",
                          overflow: "hidden",
                          display: "block",
                          textAlign: "left",
                        }}
                      >
                        {entryDraft}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {(phase === "building_cart" || phase === "cart") && (
          <motion.section
            key="fake-cart-surface"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="pointer-events-auto fixed inset-x-0 z-[10083] flex justify-center px-0"
            style={{ bottom: 76 + keyboardLift, ...smartBarAdaptiveRailStyle }}
          >
            <motion.div
              data-smartbar-mobile-adaptive-surface="true"
              className={upperGlassClass}
              style={{ ...SMARTBAR_MOBILE_FOG_GLASS_STYLE, width: entryPillWidth, maxHeight: Math.max(260, stableViewportHeight - 88 - keyboardLift) }}
              initial={{
                height: phase === "building_cart" ? buildPanelHeight : realComposerHeight,
                borderRadius: phase === "building_cart" ? buildPanelRadius : 999,
              }}
              animate={{
                height: fakeCartPanelHeight,
                borderRadius: fakeCartPanelRadius,
              }}
              transition={fakeCartPanelTransition}
            >
              <AnimatePresence initial={false}>
                {phase === "building_cart" && (
                  <motion.div
                    key="fake-building-cart-content"
                    initial={{ opacity: 0.78 }}
                    animate={{ opacity: 0.78 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="h-full px-3 py-2"
                    aria-live="polite"
                  >
                    <div className="flex h-full items-center justify-center px-3 py-2">
                      <div
                        className={`${inputDraftCapsuleClass} max-w-full !rounded-[28px] !border !border-slate-500/18 !bg-white/46 !text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_8px_18px_rgba(15,23,42,0.12)] [text-shadow:0_1px_0_rgba(255,255,255,0.64)]`}
                        style={{
                          maxHeight: Math.max(42, buildPanelHeight - 24),
                          whiteSpace: "pre-wrap",
                          overflow: "hidden",
                          display: "block",
                          textAlign: "left",
                        }}
                      >
                        {submittedPromptPreview}
                      </div>
                    </div>
                  </motion.div>
                )}

                {phase === "cart" && cartExpanded && selectedLine && (
                  <motion.div
                    key={`fake-item-detail-${selectedLine.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="flex h-full min-h-0 flex-col p-3"
                  >
                    <div className={(genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat") ? "hidden" : "flex shrink-0 items-start justify-between gap-3 rounded-[24px] border border-white/18 bg-slate-950/82 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(2,6,23,0.24)] ring-1 ring-white/12"}>
                      <div className="min-w-0">
                        <div className="inline-flex max-w-full items-center rounded-full border border-white/18 bg-white/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(2,6,23,0.18)]">
                          {selectedLine.status === "unknown" ? "Retry item" : "Item details"}
                        </div>
                        <div className={`mt-1 max-h-[58px] overflow-hidden text-xl font-black leading-tight tracking-tight ${selectedLine.status === "unknown" ? "italic" : ""}`}>
                          {selectedLine.demoDisplayTitle !== undefined ? selectedLine.demoDisplayTitle : smartBarMobileShortTitle(selectedLine.title)}
                        </div>
                      </div>
                      <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${statusClass(selectedLine.status)}`}>
                        {statusLabel(selectedLine.status)}
                      </div>
                    </div>

                    {selectedLine.status === "unknown" ? (
                      <div className="mt-4 flex min-h-0 flex-1 flex-col">
                        <div className="mb-3 inline-flex max-w-full items-center self-start rounded-full border border-white/20 bg-slate-950/78 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_18px_rgba(2,6,23,0.24)]">
                          {selectedLine.retryPrompt || "Re-enter this item."}
                        </div>
                        <textarea
                          data-smartbar-mobile-retry-input="true"
                          ref={retryTextareaRef}
                          value={retryDraft}
                          onChange={(event) => {
                            setRetryDraft(event.target.value);
                          }}
                          disabled={retryCheckingLineId === selectedLine.id}
                          className={retryInputClass}
                          placeholder=""
                        />
                      </div>
                    ) : (
                      <div
                        className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                      >
                        {!!selectedLine.options?.length && (
                          <div className="mt-4">
                            <div className="mb-2 inline-flex max-w-full items-center rounded-full border border-white/20 bg-slate-950/78 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_18px_rgba(2,6,23,0.24)]">
                              {selectedLine.optionSelectionMode === "multi" || selectedLine.status === "options" ? "Choose extras" : "Choose one"}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {selectedLine.options.map((option) => {
                                const persistedSelected = (selectedLine.details || []).some((detail) => {
                                  return detail.trim().toLowerCase() === option.trim().toLowerCase();
                                });
                                const isSelected = persistedSelected ||
                                  (selectedChoice?.lineId === selectedLine.id && selectedChoice.value === option);
                                const isMultiSelect = selectedLine.optionSelectionMode === "multi" || selectedLine.status === "options";
                                const isLocked = !isMultiSelect && selectedChoice?.lineId === selectedLine.id && !isSelected;

                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    data-smartbar-mobile-option="true"
                                    data-smartbar-mobile-option-key={smartBarMobileDemoKey(option)}
                                    data-smartbar-mobile-option-selected={isSelected ? "true" : undefined}
                                    data-smartbar-mobile-option-mode={isMultiSelect ? "multi" : "single"}
                                    onClick={() => applyLineChoice(selectedLine, option)}
                                    disabled={Boolean(!isMultiSelect && selectedChoice?.lineId === selectedLine.id)}
                                    className={`min-w-0 rounded-[22px] px-3 py-3 text-sm font-black shadow-lg transition ${
                                      isSelected
                                        ? SMARTBAR_MOBILE_STRONG_ACTION_PILLS
                                          ? "bg-emerald-300/98 text-slate-950 ring-2 ring-emerald-50/54"
                                          : "bg-emerald-300 text-slate-950 ring-2 ring-emerald-500/40"
                                        : isLocked
                                          ? SMARTBAR_MOBILE_STRONG_ACTION_PILLS
                                            ? "bg-white/68 text-slate-600"
                                            : "bg-white/50 text-slate-500"
                                          : SMARTBAR_MOBILE_STRONG_ACTION_PILLS
                                            ? "bg-white/96 text-slate-950 ring-1 ring-white/54"
                                            : "bg-white/88 text-slate-950"
                                    }`}
                                  >
                                    <span className="inline-flex min-w-0 max-w-full items-center justify-center gap-1.5">
                                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                      <span className="min-w-0 truncate">{smartBarMobileShortLabel(option)}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {phase === "cart" && cartExpanded && !selectedLine && genericResult && (
                  <motion.div
                    key={`fake-generic-content-${genericResult.surfaceKind}`}
                    data-smartbar-mobile-generic-surface={genericResult.surfaceKind}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    ref={genericContentMeasureRef}
                    className={genericResult?.surfaceKind === "info" ? "flex min-h-0 flex-col px-3 pb-3 pt-2" : genericResult?.surfaceKind === "chat" ? "flex min-h-0 flex-col px-2 pb-2 pt-2" : "flex min-h-0 flex-col px-4 pb-2 pt-3"}
                  >
                    <div className="hidden">
                      <div className="min-w-0">
                        {genericResult.eyebrow && (
                          <div className={`text-[11px] font-black uppercase tracking-[0.16em] ${skyEyebrowClass}`}>
                            {genericResult.eyebrow}
                          </div>
                        )}
                        <div className="mt-1 text-xl font-black leading-tight tracking-tight">
                          {genericResult.title}
                        </div>
                      </div>

                      {genericResult.progressLabel && (
                        <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ${issuePillClass}`}>
                          {genericResult.progressLabel}
                        </div>
                      )}
                    </div>

                    <div
                      className={genericResult?.surfaceKind === "chat"
                        ? "mt-0 min-h-0 shrink-0 overflow-visible pr-0 pb-0"
                        : `${genericResult?.surfaceKind === "info" ? "mt-0 max-h-[calc(100svh-260px)] shrink-0" : "mt-0 max-h-[calc(100svh-300px)] shrink-0"} min-h-0 overflow-y-auto overflow-x-hidden pr-0 pb-0 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
                      style={genericResult?.surfaceKind === "chat" ? undefined : { WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                    >
                      {genericResult.content ? (
                        <div
                          onClick={(event) => {
                            const target = event.target as HTMLElement | null;
                            const actionElement = target?.closest("[data-smartbar-mobile-content-action]") as HTMLElement | null;
                            const actionId = actionElement?.dataset.smartbarMobileContentAction;
                            if (!actionId) return;

                            event.preventDefault();
                            event.stopPropagation();

                            handleGenericActionClick({
                              id: actionId,
                              label: actionElement.dataset.smartbarMobileContentActionLabel || "Edit",
                              variant: "secondary",
                            }, genericResult);
                          }}
                          className={genericResult?.surfaceKind === "chat" ? "min-h-0 text-[15px] leading-6 text-white/86" : genericResult?.surfaceKind === "info" ? "space-y-0 text-[15px] leading-6 text-white/86" : "space-y-3 text-[15px] leading-6 text-white/86"}
                        >
                          {genericResult.content}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {genericResult.body && (
                            <div className="rounded-[24px] border border-white/18 bg-slate-950/68 px-4 py-3 text-[15px] font-semibold leading-6 text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
                              {genericResult.body}
                            </div>
                          )}
                          {genericResult.helper && (
                            <div className="rounded-[22px] border border-white/16 bg-white/[0.10] px-4 py-3 text-sm font-semibold leading-5 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-white/10">
                              {genericResult.helper}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!!genericActions.length && (
                      <div className={genericResult?.surfaceKind === "info" ? "mt-3 shrink-0 space-y-2 pb-0" : "mt-3 shrink-0 space-y-2 pb-0"}>
                        {!!bookingNavActions.length && (
                          <div className="grid grid-cols-2 gap-2">
                            {bookingNavActions.map((action) => (
                              <button
                                key={action.id}
                                type="button"
                                data-smartbar-mobile-generic-action={action.id}
                                data-domi-demo-next-target={action.id === "booking-nav-next" ? "true" : undefined}
                                data-domi-demo-summary-target={action.id === "booking-summary" || action.id === "booking-handoff" || /prepare booking summary/i.test(action.label) ? "true" : undefined}
                                disabled={action.disabled}
                                onClick={() => handleGenericActionClick(action, genericResult)}
                                className={genericActionButtonClass(action)}
                              >
                                {action.id === "booking-nav-back" && <ArrowRight className="h-4 w-4 shrink-0 rotate-180" />}
                                <span className="min-w-0">
                                  <span className="block leading-5">{action.label}</span>
                                  {action.helper && <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-72">{action.helper}</span>}
                                </span>
                                {action.id === "booking-nav-next" && <ArrowRight className="h-4 w-4 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}

                        {standardGenericActions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            data-smartbar-mobile-generic-action={action.id}
                            data-domi-demo-summary-target={action.id === "booking-summary" || action.id === "booking-handoff" || /prepare booking summary/i.test(action.label) ? "true" : undefined}
                            disabled={action.disabled}
                            onClick={() => handleGenericActionClick(action, genericResult)}
                            className={genericActionButtonClass(action)}
                          >
                            <span className="min-w-0 flex-1 pr-2">
                              <span className="block truncate leading-5">{action.label}</span>
                              {action.helper && <span className="mt-0.5 block truncate text-[10px] font-semibold leading-3 opacity-70">{action.helper}</span>}
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {phase === "cart" && cartExpanded && !selectedLine && !genericResult && (
                  <motion.div
                    key="fake-cart-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative flex h-full min-h-0 flex-col p-4"
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="block w-fit text-xl font-black tracking-tight text-[#06143A]">
                          Review order
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${issuePillClass}`}>
                        {checkoutReady ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Complete
                          </>
                        ) : `${unresolvedReviewCount} open`}
                      </div>
                    </div>

                    <div className="mt-3 grid shrink-0 grid-cols-5 gap-1.5">
                      <button
                        type="button"
                        data-smartbar-mobile-cart-view="default"
                        onClick={clearCartStatusFilter}
                        className={`${cartFilterButtonClass(!cartStatusFilter)} border border-white/18 bg-slate-950/88 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(2,6,23,0.26)]`}
                        aria-label="Show original order"
                        aria-pressed={!cartStatusFilter}
                      >
                        <ListOrdered className="h-4.5 w-4.5" />
                      </button>
                      <button
                        type="button"
                        data-smartbar-mobile-status-filter="ready"
                        onClick={() => toggleCartStatusFilter("ready", completeCount)}
                        disabled={completeCount <= 0}
                        className={`${cartFilterButtonClass(cartStatusFilter === "ready", completeCount <= 0)} ${smartBarMobileRibbonPillClass("complete", isOverlay)}`}
                        aria-label={`Show ready items, ${completeCount}`}
                        aria-pressed={cartStatusFilter === "ready"}
                      >
                        {completeCount}
                      </button>
                      <button
                        type="button"
                        data-smartbar-mobile-status-filter="pending"
                        onClick={() => toggleCartStatusFilter("pending", blockingIssueCount)}
                        disabled={blockingIssueCount <= 0}
                        className={`${cartFilterButtonClass(cartStatusFilter === "pending", blockingIssueCount <= 0)} ${smartBarMobileRibbonPillClass("pending", isOverlay)}`}
                        aria-label={`Show required items, ${blockingIssueCount}`}
                        aria-pressed={cartStatusFilter === "pending"}
                      >
                        {blockingIssueCount}
                      </button>
                      <button
                        type="button"
                        data-smartbar-mobile-status-filter="options"
                        onClick={() => toggleCartStatusFilter("options", optionCount)}
                        disabled={optionCount <= 0}
                        className={`${cartFilterButtonClass(cartStatusFilter === "options", optionCount <= 0)} ${smartBarMobileRibbonPillClass("extras", isOverlay)}`}
                        aria-label={`Show optional items, ${optionCount}`}
                        aria-pressed={cartStatusFilter === "options"}
                      >
                        {optionCount}
                      </button>
                      <button
                        type="button"
                        data-smartbar-mobile-status-filter="unknown"
                        onClick={() => toggleCartStatusFilter("unknown", unknownCount)}
                        disabled={unknownCount <= 0}
                        className={`${cartFilterButtonClass(cartStatusFilter === "unknown", unknownCount <= 0)} ${unknownFilterPillClass}`}
                        aria-label={`Show unknown items, ${unknownCount}`}
                        aria-pressed={cartStatusFilter === "unknown"}
                      >
                        {unknownCount}
                      </button>
                    </div>

                    <div
                      ref={cartScrollRef}
                      data-smartbar-mobile-cart-scroll="true"
                      className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1 pb-2 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                    >
                      {visibleCartLines.map((line) => (
                        <motion.div
                          key={smartBarMobileLineInstanceKey(line)}
                          role="button"
                          tabIndex={0}
                          data-smartbar-mobile-cart-line="true"
                          data-smartbar-mobile-line-title-key={smartBarMobileDemoKey(line.title)}
                          data-smartbar-mobile-line-status={line.status}
                          data-smartbar-mobile-line-target={line.targetId || line.sourceItemId || undefined}
                          animate={handoffLocked ? { x: 0, scale: 1 } : smartBarMobileRowAnimate(line.status)}
                          transition={handoffLocked ? { type: "spring", stiffness: 520, damping: 36 } : smartBarMobileRowTransition(line.status)}
                          onClick={() => {
                            if (!handoffLocked) selectLine(line);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              if (!handoffLocked) selectLine(line);
                            }
                          }}
                          className={`${lineButtonClass} ${line.demoHideMeta ? "!min-h-[2.35rem] !px-3 !py-1.5" : ""} ${handoffLocked ? smartBarMobileHandoffRowSurfaceClass(isOverlay) : smartBarMobileRowSurfaceClass(line.status, isOverlay)} ${handoffLocked ? "cursor-default" : "cursor-pointer"}`}
                          style={{ touchAction: "pan-y" }}
                        >
                          <div className={`flex justify-between gap-3 ${line.demoHideMeta ? "min-h-[1.35rem] items-center" : "items-start"}`}>
                            <div className={`min-w-0 ${line.demoHideMeta ? "flex min-h-[1.35rem] flex-1 items-center" : ""}`}>
                              <div
                                className={[
                                  "truncate font-black",
                                  line.demoHideMeta
                                    ? `text-[15px] leading-tight tracking-[-0.025em] ${smartBarMobileCartRowPrimaryTextClass(line.status, handoffLocked)}`
                                    : `text-base ${handoffLocked ? handoffTitleClass : smartBarMobileCartRowPrimaryTextClass(line.status, false)}`,
                                ].join(" ")}
                              >
                                {line.demoDisplayTitle !== undefined ? line.demoDisplayTitle : smartBarMobileShortTitle(line.title)}
                              </div>
                              {!line.demoHideMeta ? (
                                <div className={`mt-1 text-sm font-semibold ${smartBarMobileCartRowSecondaryTextClass(line.status, handoffLocked)} ${line.status === "unknown" ? "italic" : ""}`}>
                                  {line.helper}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                              {!line.demoHideMeta ? <div className={`text-sm font-black ${smartBarMobileCartRowPrimaryTextClass(line.status, handoffLocked)}`}>{line.price}</div> : null}
                              {!handoffLocked && !line.demoHideMeta && (
                                <button
                                  type="button"
                                  data-smartbar-mobile-remove-line="true"
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                  }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeLine(line);
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/50 bg-slate-900/92 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_5px_12px_rgba(2,6,23,0.30)] ring-1 ring-white/18 transition active:scale-95"
                                  aria-label={`Remove ${line.title}`}
                                >
                                  <Trash2 className="h-4 w-4 stroke-[2.75]" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {cartStatusFilter && filteredCartCount === 0 && (
                        <div className="rounded-[1.25rem] border border-white/14 bg-slate-950/38 px-4 py-5 text-center text-sm font-black text-white/70">
                          Nothing in this color.
                        </div>
                      )}
                    </div>

                    <div
                      className="pointer-events-none absolute bottom-[104px] right-1 z-30 flex w-[82px] flex-col items-stretch gap-3"
                      aria-hidden="true"
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        data-smartbar-mobile-cart-scroll-button="up"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          scrollSmartBarMobileCartBy(-280);
                        }}
                        className="pointer-events-auto h-12 w-full rounded-full bg-transparent opacity-0"
                        aria-label="Scroll cart up"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        data-smartbar-mobile-cart-scroll-button="down"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          scrollSmartBarMobileCartBy(320);
                        }}
                        className="pointer-events-auto h-14 w-full rounded-full bg-transparent opacity-0"
                        aria-label="Scroll cart down"
                      />
                    </div>

                    <div className={totalsBoxClass}>
                      <div className="flex items-center justify-between gap-4 text-[12px] font-black uppercase tracking-[0.12em]">
                        <span className="text-white/64 [text-shadow:0_1px_2px_rgba(0,0,0,0.50)]">Subtotal</span>
                        <span className="tabular-nums">{cartTotals.subtotalLabel}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4 text-[12px] font-black uppercase tracking-[0.12em]">
                        <span className="text-white/64 [text-shadow:0_1px_2px_rgba(0,0,0,0.50)]">Est. tax</span>
                        <span className="tabular-nums">{cartTotals.taxLabel}</span>
                      </div>
                      <div className={`mt-2 flex items-center justify-between gap-4 border-t pt-2 text-[17px] font-black tracking-[-0.02em] ${isOverlay ? "border-white/24" : "border-white/20"}`}>
                        <span>Total</span>
                        <SmartBarMobileOdometerText value={cartTotals.totalLabel} motionKey={cartTotalMotionKey} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {introCallout && !introCalloutDismissed && phase === "rest" && (
          <motion.div
            key="smartbar-intro-callout"
            data-smartbar-mobile-intro-callout="true"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="button"
            tabIndex={0}
            aria-label="Dismiss SmartBar intro hint"
            onClick={() => setIntroCalloutDismissed(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIntroCalloutDismissed(true);
              }
            }}
            className="pointer-events-auto fixed inset-x-0 z-[10082] flex cursor-pointer justify-center px-0"
            style={{ bottom: 68 + keyboardLift, ...smartBarAdaptiveRailStyle }}
          >
            <div
              className="relative flex h-[52px] items-center justify-center px-2 text-center text-white shadow-2xl"
              style={{
                ...SMARTBAR_MOBILE_FOG_GLASS_STYLE,
                width: introTypeGlassWidth,
                borderRadius: 999,
                transition: "width 160ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div
                className="flex h-[34px] items-center justify-center overflow-hidden rounded-full px-3.5 text-[13px] font-black tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_10px_24px_rgba(2,6,23,0.26)]"
                style={{
                  ...SMARTBAR_MOBILE_BLUE_CONTROL_STYLE,
                  width: introTypeCapsuleWidth,
                  transition: "width 160ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <span className="truncate whitespace-nowrap">
                  {introTypedTitle}
                </span>
                {introTypedTitle.length < introCallout.title.length && (
                  <span className="ml-0.5 inline-block animate-pulse text-white/86">|</span>
                )}
              </div>

              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/18 bg-slate-900/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer
        className="pointer-events-none fixed inset-x-0 z-[10084] flex justify-center px-0"
        style={{ bottom: 12 + keyboardLift, ...smartBarAdaptiveRailStyle }}
      >
        <div
          data-smartbar-mobile-adaptive-surface="true"
          className="relative h-[46px]"
          style={{ width: entryPillWidth }}
        >
          <AnimatePresence initial={false}>
            {phase !== "rest" && handoffState !== "complete" && (
              <motion.button
                type="button"
                data-smartbar-mobile-close="true"
                data-smartbar-mobile-close-armed={closeArmed ? "true" : undefined}
                onClick={handleClosePillClick}
                className={`${chromePillClass} left-0`}
                style={{ ...SMARTBAR_MOBILE_BLUE_CONTROL_STYLE, width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={closeArmed ? "Tap again to close SmartBar" : "Close SmartBar"}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white">
                  <X className="h-5 w-5" />
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            data-smartbar-mobile-companion="true"
            data-smartbar-mobile-launcher={phase === "rest" ? "true" : undefined}
            data-smartbar-mobile-submit={phase === "entry" && entryDraft.trim() ? "true" : undefined}
            data-smartbar-mobile-checkout={phase === "cart" && !selectedLine && checkoutReady ? "true" : undefined}
            data-smartbar-mobile-guidance-status={phase === "cart" && !selectedLine && cartGuidanceStatus ? cartGuidanceStatus : undefined}
            data-smartbar-mobile-detail-close={phase === "cart" && selectedLine && selectedLine.status !== "unknown" ? "true" : undefined}
            data-smartbar-mobile-retry-submit={phase === "cart" && selectedLine?.status === "unknown" && retryDraft.trim() ? "true" : undefined}
            onClick={handleCompanionClick}
            className={`${chromePillClass} h-[46px] min-w-0 justify-center px-4`}
            style={{ ...companionPillStyle, width: launcherPillWidth, left: launcherPillLeft }}
            aria-label={phase === "rest" ? "Open SmartBar" : companionLabel}
          >
            {phase === "rest" ? (
              <span className={`inline-flex h-8 max-w-full items-center justify-center gap-1.5 whitespace-nowrap px-4 text-[18px] font-semibold tracking-[-0.025em] ${companionTextClass}`}>
                <Compass className={`h-[18px] w-[18px] shrink-0 ${companionTextClass}`} strokeWidth={2.25} />
                <span>{companionLabel}</span>
              </span>
            ) : closeArmed || phase === "building_cart" || handoffState === "handing_off" || Boolean(retryCheckingLineId) ? (
              <span className={`inline-flex h-8 max-w-full items-center justify-center whitespace-nowrap px-3 text-[16px] font-semibold tracking-[-0.015em] ${companionTextClass}`}>
                <ThinkingText text={companionLabel} />
              </span>
            ) : (
              <span className={`inline-flex h-8 max-w-full items-center justify-center whitespace-nowrap px-3 text-[16px] font-semibold tracking-[-0.015em] ${companionTextClass}`}>
                {companionLabel}
              </span>
            )}
          </button>

          <AnimatePresence initial={false}>
            {showCartToggle && (
              <motion.button
                type="button"
                data-smartbar-mobile-cart-toggle="true"
                data-domi-demo-down-target={phase === "cart" ? "true" : undefined}
                onClick={handleCartToggleClick}
                className={`${chromePillClass} right-0`}
                style={{ ...SMARTBAR_MOBILE_BLUE_CONTROL_STYLE, width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={phase === "cart" ? "Return to entry" : "Reopen cart"}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white">
                  {cartToggleShowsUp ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}





