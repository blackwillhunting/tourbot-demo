import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
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
  estimatedSubtotal?: string;
  estimatedTax?: string;
  estimatedTotal?: string;
};

export type SmartBarMobileGenericAction = {
  id: string;
  label: string;
  helper?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export type SmartBarMobileGenericResult = {
  surfaceKind: "info" | "chat" | "booking_tour" | "booking_summary";
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

function smartBarMobileLinesAreSameInstance(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftKey = smartBarMobileLineInstanceKey(left);
  const rightKey = smartBarMobileLineInstanceKey(right);

  if (leftKey && rightKey) return leftKey === rightKey;

  if (left.sourceLineIndex !== undefined && right.sourceLineIndex !== undefined) {
    return left.sourceLineIndex === right.sourceLineIndex;
  }

  return Boolean(left.id && right.id && left.id === right.id);
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

type SmartBarMobileShellProps = {
  mode?: "lab" | "overlay";
  /** Demo-only underlay guard to prevent page controls from flashing through the scripted submit transition. */
  demoTransitionShield?: boolean;
  /** Label shown in the companion pill when the entry box is empty. */
  entryModeLabel?: string;
  /** Label shown in the companion pill while the shared surface is being prepared. */
  buildingLabel?: string;
  /** Demo-only command hook for scripted mobile replays. Omit in normal use. */
  demoSubmission?: SmartBarMobileDemoSubmission | null;
  onSubmitPrompt?: (query: string, meta?: SmartBarMobileSubmitMeta) => SmartBarMobileSubmitResult | Promise<SmartBarMobileSubmitResult>;
  onApplyLineChoice?: (line: SmartBarMobileOrderLine, value: string) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onRemoveLine?: (line: SmartBarMobileOrderLine) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onNavigateToLine?: (line: SmartBarMobileOrderLine) => void;
  onGenericAction?: (action: SmartBarMobileGenericAction, result: SmartBarMobileGenericResult) => SmartBarMobileSubmitResult | Promise<SmartBarMobileSubmitResult> | void;
  onResetCart?: () => void;
};

export default function SmartBarMobileShell({
  mode = "lab",
  demoTransitionShield = false,
  entryModeLabel = "Type order",
  buildingLabel = "Building cart...",
  demoSubmission = null,
  onSubmitPrompt,
  onApplyLineChoice,
  onRemoveLine,
  onNavigateToLine,
  onGenericAction,
  onResetCart,
}: SmartBarMobileShellProps) {
  const isOverlay = mode === "overlay";
  const entryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const retryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const closeArmTimeoutRef = useRef<number | null>(null);
  const buildTimerRef = useRef<number | null>(null);
  const handoffCollapseTimerRef = useRef<number | null>(null);
  const handoffResetTimerRef = useRef<number | null>(null);
  const choiceLockedLineIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<SmartBarMobilePhase>("rest");
  const [entryDraft, setEntryDraft] = useState("");
  const [hasEditedEntryDraft, setHasEditedEntryDraft] = useState(false);
  const [submittedPromptPreview, setSubmittedPromptPreview] = useState("");
  const [retryDraft, setRetryDraft] = useState("");
  const [orderLines, setOrderLines] = useState<SmartBarMobileOrderLine[]>(demoLines);
  const [orderEstimatedSubtotal, setOrderEstimatedSubtotal] = useState<string | undefined>(undefined);
  const [orderEstimatedTax, setOrderEstimatedTax] = useState<string | undefined>(undefined);
  const [orderEstimatedTotal, setOrderEstimatedTotal] = useState(estimatedTotal);
  const [genericResult, setGenericResult] = useState<SmartBarMobileGenericResult | null>(null);
  const [hasCart, setHasCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [handoffState, setHandoffState] = useState<SmartBarMobileHandoffState>("idle");
  const [closeArmed, setCloseArmed] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [lineOverrides, setLineOverrides] = useState<Record<string, DemoLineOverride>>({});
  const [retryCheckingLineId, setRetryCheckingLineId] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<{ lineId: string; value: string } | null>(null);
  const [keyboardLift, setKeyboardLift] = useState(0);
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

  const mobileShellSideInset = 36;
  const mobileShellMaxWidth = 390;
  const entryPillWidth = Math.min(Math.max(stableViewportWidth - mobileShellSideInset * 2, 240), mobileShellMaxWidth);

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
  const buildPanelHeight = realComposerHeight;
  const collapsedCartPanelHeight = 90;
  const maxCartPanelHeight = Math.max(360, stableViewportHeight - 128);

  const lines = useMemo(() => {
    return orderLines.map((line) => ({
      ...line,
      ...(lineOverrides[line.id] || {}),
    }));
  }, [lineOverrides, orderLines]);

  const selectedLine = selectedLineId
    ? lines.find((line) => line.id === selectedLineId) || null
    : null;
  const completeCount = lines.filter((line) => line.status === "ready").length;
  const blockingIssueCount = lines.filter((line) => line.status === "pending").length;
  const optionCount = lines.filter((line) => line.status === "options").length;
  const checkoutReady = !genericResult && lines.length > 0 && blockingIssueCount === 0;
  const handoffLocked = handoffState !== "idle";
  const cartTotals = smartBarMobileTotalsFromLines(lines, {
    subtotal: orderEstimatedSubtotal,
    tax: orderEstimatedTax,
    total: orderEstimatedTotal,
  });
  const cartTotalMotionKey = `${phase}-${lines.length}-${cartTotals.totalLabel}`;
  const genericPanelHeight = genericResult
    ? genericResult.surfaceKind === "info"
      ? Math.min(maxCartPanelHeight, Math.max(260, genericResult.height ?? 320))
      : Math.min(maxCartPanelHeight, Math.max(260, genericResult.height ?? 388))
    : 0;
  const cartSummaryHeight = genericResult
    ? genericPanelHeight
    : Math.min(
        maxCartPanelHeight,
        Math.max(388, 272 + lines.length * 98 + Math.max(0, lines.length - 1) * 10),
      );
  const selectedDetailChipRows = Math.max(1, Math.ceil((selectedLine?.details.length || 0) / 2));
  const selectedOptionRows = Math.ceil((selectedLine?.options?.length || 0) / 2);
  const cartDetailHeight = selectedLine?.status === "unknown"
    ? 260
    : Math.min(
        maxCartPanelHeight,
        Math.max(
          220,
          150 +
            selectedDetailChipRows * 34 +
            (selectedOptionRows > 0 ? 38 + selectedOptionRows * 54 : 0),
        ),
      );
  const fakeCartPanelHeight = handoffState === "complete"
    ? 0
    : phase === "cart"
      ? cartExpanded ? selectedLine ? cartDetailHeight : cartSummaryHeight : collapsedCartPanelHeight
      : buildPanelHeight;
  const fakeCartPanelRadius = handoffState === "complete" || (phase === "cart" && !cartExpanded) ? 999 : 30;

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

  const disarmClose = () => {
    clearCloseArmTimer();
    setCloseArmed(false);
  };

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

    const activeElement = typeof document !== "undefined"
      ? document.activeElement as HTMLElement | null
      : null;
    activeElement?.blur?.();

    disarmClose();
    clearBuildTimer();
    clearHandoffTimers();
    setHandoffState("idle");
    setSelectedLineId(null);
    setLineOverrides({});
    setGenericResult(null);
    setCartExpanded(true);
    setSubmittedPromptPreview(submittedDraft);
    setPhase("building_cart");

    const orderResultPromise = onSubmitPrompt
      ? Promise.resolve(onSubmitPrompt(submittedDraft, meta))
      : Promise.resolve<SmartBarMobileSubmitResult>({ lines: demoLines, estimatedTotal });

    buildTimerRef.current = window.setTimeout(() => {
      buildTimerRef.current = null;

      orderResultPromise
        .then((result) => {
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
            }
          }
          setHasCart(true);
          setPhase("cart");
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
    submitPromptValue(demoSubmission.query, demoSubmission.meta);
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

    if (!multiSelect) choiceLockedLineIdRef.current = line.id;
    setSelectedChoice({ lineId: line.id, value });
    disarmClose();

    const selectedOptionKey = value.trim().toLowerCase();
    const optionKeys = new Set((line.options || []).map((option) => option.trim().toLowerCase()));
    const cleanedDetails = (line.details || []).filter((detail) => {
      const detailKey = detail.trim().toLowerCase();
      if (/^(choice needed|size needed)$/i.test(detail.trim())) return false;
      if (!multiSelect && optionKeys.has(detailKey) && detailKey !== selectedOptionKey) return false;
      return true;
    });
    const resolvedLine: SmartBarMobileOrderLine = {
      ...line,
      status: multiSelect ? "options" : "ready",
      helper: multiSelect ? "Extras updated" : `${value} selected`,
      details: Array.from(new Set([...cleanedDetails, value])),
      options: line.options || [],
      optionSelectionMode: line.optionSelectionMode || (multiSelect ? "multi" : "single"),
    };
    const parentResultPromise = onApplyLineChoice
      ? Promise.resolve(onApplyLineChoice(line, value))
      : Promise.resolve<SmartBarMobileOrderResult | void>(undefined);

    // Required choices are single-select and close the detail view after a short
    // confirmation beat. Optional extras are multi-select, so keep the detail
    // view open and let the visitor stack more extras.
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
        lines: orderLines.map((candidate) => candidate.id === line.id ? resolvedLine : candidate),
      };

      setOrderLines(optimisticResult.lines);
      applyOrderResultEstimates(optimisticResult, "");
      setLineOverrides({});
      choiceLockedLineIdRef.current = null;
      setSelectedChoice(null);
      setSelectedLineId(multiSelect ? line.id : null);
      setCartExpanded(true);

      parentResultPromise
        .then((parentResult) => {
          if (!parentResult || parentResult.lines.length === 0) return;
          setOrderLines(parentResult.lines);
          applyOrderResultEstimates(parentResult);
          if (multiSelect) setSelectedLineId(line.id);
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

        const replacementLines = smartBarMobileRemoveOneLineInstance(result.lines, selectedLine);

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
    clearBuildTimer();
    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setSelectedLineId(null);
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
    setLineOverrides({});
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setHasCart(false);
    onResetCart?.();
    disarmClose();
    setSelectedLineId(null);
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
    setCartExpanded(true);
    setHandoffState("handing_off");

    handoffCollapseTimerRef.current = window.setTimeout(() => {
      handoffCollapseTimerRef.current = null;
      setHandoffState("complete");
      setCartExpanded(false);

      handoffResetTimerRef.current = window.setTimeout(() => {
        handoffResetTimerRef.current = null;
        resetToRest();
      }, 2000);
    }, 3000);
  };

  const companionLabel = (() => {
    if (phase === "rest") return "SmartBar";
    if (closeArmed) return "Tap again...";
    if (handoffState === "handing_off") return "Handing off";
    if (handoffState === "complete") return "Handoff complete";
    if (phase === "entry") return hasEditedEntryDraft && entryDraft.trim() ? "Tap to submit" : entryModeLabel;
    if (phase === "building_cart") return hasCart ? "Updating SmartBar..." : buildingLabel;
    if (phase === "cart" && genericResult) return genericResult.statusLabel || genericResult.title || "SmartBar result";
    if (phase === "cart" && selectedLine?.status === "unknown") {
      return retryCheckingLineId === selectedLine.id ? "Checking menu..." : "Re-enter";
    }
    if (phase === "cart" && selectedLine) return "Tap to reopen";
    if (phase === "cart") return checkoutReady ? "Tap for checkout" : `${blockingIssueCount} need attention`;
    if (checkoutReady) return `Ready checkout · ${cartTotals.totalLabel}`;
    return `${blockingIssueCount} need attention · ${cartTotals.totalLabel}`;
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
      setSelectedLineId(null);
      setCartExpanded(true);
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
    setGenericResult(null);
    setPhase("building_cart");

    Promise.resolve(actionResult)
      .then((nextResult) => {
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

  const showCartToggle = handoffState === "idle" && hasCart && (phase === "entry" || phase === "cart");
  const cartToggleShowsUp = phase === "entry" || !cartExpanded;
  const {
    rootTextClass,
    upperGlassClass,
    chromePillClass,
    chromeBlueBadgeClass,
    chromeBlueIconClass,
    chromeBlueLabelClass,
    inputDraftCapsuleClass,
    mainMutedTextClass,
    softTextClass,
    quietTextClass,
    skyEyebrowClass,
    retryInputClass,
    issuePillClass,
    lineButtonClass,
    unknownTitleClass,
    handoffTitleClass,
    totalsBoxClass,
  } = getSmartBarMobileShellStyles(isOverlay, checkoutReady);

  return (
    <div
      data-smartbar-mobile-shell="true"
      data-smartbar-mobile-phase={phase}
      data-smartbar-mobile-cart-open={phase === "cart" ? "true" : undefined}
      className={`fixed inset-0 z-[10080] overflow-visible ${rootTextClass} ${
        isOverlay
          ? "pointer-events-none bg-transparent"
          : "bg-[radial-gradient(circle_at_24%_16%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_84%_74%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(180deg,#07111f_0%,#020617_100%)]"
      }`}
    >
      {!isOverlay && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:38px_38px]" />
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
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto fixed inset-x-0 z-[10083] flex justify-center px-0"
            style={{ bottom: 76 + keyboardLift }}
          >
            <div
              className={upperGlassClass}
              style={{ width: entryPillWidth, height: realComposerHeight, borderRadius: 999 }}
            >
              <div className="relative h-full px-3 py-2">
                <textarea
                  data-smartbar-mobile-entry-input="true"
                  ref={entryTextareaRef}
                  value={entryDraft}
                  onChange={(event) => {
                    setEntryDraft(event.target.value);
                    setHasEditedEntryDraft(true);
                  }}
                  className="relative z-[2] h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-center text-[16px] font-normal leading-5 text-transparent outline-none ring-0 placeholder:text-transparent caret-white selection:bg-white/20"
                  placeholder=""
                />
                <AnimatePresence initial={false}>
                  {entryDraft.trim() && (
                    <motion.div
                      key="smartbar-live-entry-capsule"
                      initial={{ opacity: 0, y: 3, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 2, scale: 0.99 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      className="pointer-events-none absolute inset-x-5 top-1/2 z-[1] flex -translate-y-1/2 justify-center"
                      aria-hidden="true"
                    >
                      <div className={inputDraftCapsuleClass}>
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
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto fixed inset-x-0 z-[10083] flex justify-center px-0"
            style={{ bottom: 76 + keyboardLift }}
          >
            <motion.div
              className={upperGlassClass}
              style={{ width: entryPillWidth, maxHeight: `calc(100svh - ${88 + keyboardLift}px)` }}
              initial={{ height: realComposerHeight, borderRadius: 999 }}
              animate={{
                height: phase === "cart" && cartExpanded && !selectedLine && (genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat")
                  ? "auto"
                  : fakeCartPanelHeight,
                borderRadius: fakeCartPanelRadius,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
            >
              <AnimatePresence mode="wait" initial={false}>
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
                      <div className={inputDraftCapsuleClass}>
                        {submittedPromptPreview}
                      </div>
                    </div>
                  </motion.div>
                )}

                {phase === "cart" && cartExpanded && selectedLine && (
                  <motion.div
                    key={`fake-item-detail-${selectedLine.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex h-full min-h-0 flex-col p-3"
                  >
                    <div className={(genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat") ? "hidden" : "flex shrink-0 items-start justify-between gap-3"}>
                      <div className="min-w-0">
                        <div className={`text-[11px] font-black uppercase tracking-[0.16em] ${skyEyebrowClass}`}>
                          {selectedLine.status === "unknown" ? "Retry item" : "Item details"}
                        </div>
                        <div className={`mt-1 max-h-[58px] overflow-hidden text-xl font-black leading-tight tracking-tight ${selectedLine.status === "unknown" ? "italic" : ""}`}>
                          {smartBarMobileShortTitle(selectedLine.title)}
                        </div>
                      </div>
                      <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${statusClass(selectedLine.status)}`}>
                        {statusLabel(selectedLine.status)}
                      </div>
                    </div>

                    {selectedLine.status === "unknown" ? (
                      <div className="mt-4 flex min-h-0 flex-1 flex-col">
                        <div className={`text-sm font-semibold leading-5 ${softTextClass}`}>
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
                        <div className={`text-[12px] font-black uppercase tracking-[0.14em] ${quietTextClass}`}>
                          Item page opened
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedLine.details.map((detail) => (
                            <button
                              key={detail}
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-300/90 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {smartBarMobileShortLabel(detail)}
                            </button>
                          ))}
                        </div>

                        {!!selectedLine.options?.length && (
                          <div className="mt-4">
                            <div className={`mb-2 text-[11px] font-black uppercase tracking-[0.14em] ${quietTextClass}`}>
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
                                        ? "bg-emerald-300 text-slate-950 ring-2 ring-emerald-500/40"
                                        : isLocked
                                          ? "bg-white/50 text-slate-500"
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
                    className={genericResult?.surfaceKind === "info" ? "flex min-h-0 flex-col px-3 pb-3 pt-2" : genericResult?.surfaceKind === "chat" ? "flex min-h-0 flex-col px-2 pb-2 pt-1" : "flex h-full min-h-0 flex-col p-4"}
                  >
                    <div className={(genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat") ? "hidden" : "flex shrink-0 items-start justify-between gap-3"}>
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

                    {(genericResult.progressCurrent !== undefined && genericResult.progressTotal !== undefined) && (
                      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
                        <div className={`flex min-h-[48px] flex-col items-center justify-center rounded-full px-2 py-1.5 text-center font-black uppercase ${smartBarMobileRibbonPillClass("complete", isOverlay)}`}>
                          <span className="text-[10px] leading-none tracking-[0.14em]">Step</span>
                          <span className="mt-1 text-[14px] leading-none tracking-normal">{genericResult.progressCurrent}</span>
                        </div>
                        <div className={`flex min-h-[48px] flex-col items-center justify-center rounded-full px-2 py-1.5 text-center font-black uppercase ${smartBarMobileRibbonPillClass("extras", isOverlay)}`}>
                          <span className="text-[10px] leading-none tracking-[0.14em]">Total</span>
                          <span className="mt-1 text-[14px] leading-none tracking-normal">{genericResult.progressTotal}</span>
                        </div>
                      </div>
                    )}

                    <div
                      className={`${genericResult?.surfaceKind === "info" ? "mt-0 max-h-[calc(100svh-260px)] shrink-0" : genericResult?.surfaceKind === "chat" ? "mt-0 shrink-0 overflow-visible" : "mt-3 flex-1"} min-h-0 overflow-y-auto overflow-x-hidden pr-0 pb-0 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`} 
                      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                    >
                      {genericResult.content ? (
                        <div className={(genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat") ? "space-y-0 text-[15px] leading-6 text-white/86" : "space-y-3 text-[15px] leading-6 text-white/86"}>{genericResult.content}</div>
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

                    {!!genericResult.actions?.length && (
                      <div className={genericResult?.surfaceKind === "info" ? "mt-2 shrink-0 space-y-2" : "mt-2 shrink-0 space-y-2"}>
                        {genericResult.actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            data-smartbar-mobile-generic-action={action.id}
                            disabled={action.disabled}
                            onClick={() => handleGenericActionClick(action, genericResult)}
                            className={action.variant === "secondary"
                              ? "flex w-full items-center justify-between gap-3 rounded-[22px] border border-white/18 bg-slate-950/76 px-4 py-3 text-left text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/10 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                              : "flex w-full items-center justify-between gap-3 rounded-[22px] bg-sky-200/92 px-4 py-3 text-left text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_10px_24px_rgba(14,165,233,0.18)] ring-1 ring-sky-100/42 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                            }
                          >
                            <span className="min-w-0 flex-1 pr-2">
                              <span className="block whitespace-normal break-words leading-5">{action.label}</span>
                              {action.helper && <span className="mt-0.5 block truncate text-xs font-semibold opacity-72">{action.helper}</span>}
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
                    className="flex h-full min-h-0 flex-col p-4"
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xl font-black tracking-tight">
                          Review order
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${issuePillClass}`}>
                        {checkoutReady ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Complete
                          </>
                        ) : `${blockingIssueCount} open`}
                      </div>
                    </div>

                    <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
                      <div className={`flex min-h-[48px] flex-col items-center justify-center rounded-full px-2 py-1.5 text-center font-black uppercase ${smartBarMobileRibbonPillClass("complete", isOverlay)}`}>
                        <span className="text-[10px] leading-none tracking-[0.14em]">Complete</span>
                        <span className="mt-1 text-[14px] leading-none tracking-normal">{completeCount}</span>
                      </div>
                      <div className={`flex min-h-[48px] flex-col items-center justify-center rounded-full px-2 py-1.5 text-center font-black uppercase ${smartBarMobileRibbonPillClass("pending", isOverlay)}`}>
                        <span className="text-[10px] leading-none tracking-[0.14em]">Pending</span>
                        <span className="mt-1 text-[14px] leading-none tracking-normal">{blockingIssueCount}</span>
                      </div>
                      <div className={`flex min-h-[48px] flex-col items-center justify-center rounded-full px-2 py-1.5 text-center font-black uppercase ${smartBarMobileRibbonPillClass("extras", isOverlay)}`}>
                        <span className="text-[10px] leading-none tracking-[0.14em]">Extras</span>
                        <span className="mt-1 text-[14px] leading-none tracking-normal">{optionCount}</span>
                      </div>
                    </div>

                    <div
                      className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1 pb-2 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                    >
                      {lines.map((line) => (
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
                          className={`${lineButtonClass} ${handoffLocked ? smartBarMobileHandoffRowSurfaceClass(isOverlay) : smartBarMobileRowSurfaceClass(line.status, isOverlay)} ${handoffLocked ? "cursor-default" : "cursor-pointer"}`}
                          style={{ touchAction: "pan-y" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`truncate text-base font-black ${handoffLocked ? handoffTitleClass : line.status === "unknown" ? unknownTitleClass : ""}`}>
                                {smartBarMobileShortTitle(line.title)}
                              </div>
                              <div className={`mt-1 text-sm font-semibold ${mainMutedTextClass} ${line.status === "unknown" ? "italic" : ""}`}>
                                {line.helper}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                              <div className="text-sm font-black">{line.price}</div>
                              {!handoffLocked && (
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
                                  className={
                                    isOverlay
                                      ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-white/74 ring-1 ring-white/12 transition active:scale-95"
                                      : "inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-white/74 ring-1 ring-white/12 transition active:scale-95"
                                  }
                                  aria-label={`Remove ${line.title}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className={totalsBoxClass}>
                      <div className="flex items-center justify-between gap-4 text-[12px] font-black uppercase tracking-[0.12em]">
                        <span className={quietTextClass}>Subtotal</span>
                        <span className="tabular-nums">{cartTotals.subtotalLabel}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4 text-[12px] font-black uppercase tracking-[0.12em]">
                        <span className={quietTextClass}>Est. tax</span>
                        <span className="tabular-nums">{cartTotals.taxLabel}</span>
                      </div>
                      <div className={`mt-2 flex items-center justify-between gap-4 border-t pt-2 text-[17px] font-black tracking-[-0.02em] ${isOverlay ? "border-white/12" : "border-slate-950/10"}`}>
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

      <footer
        className="pointer-events-none fixed inset-x-0 z-[10084] flex justify-center px-0"
        style={{ bottom: 12 + keyboardLift }}
      >
        <div
          className="relative h-[46px]"
          style={{ width: entryPillWidth }}
        >
          <AnimatePresence initial={false}>
            {phase !== "rest" && (
              <motion.button
                type="button"
                onClick={handleClosePillClick}
                className={`${chromePillClass} left-0`}
                style={{ width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={closeArmed ? "Tap again to close SmartBar" : "Close SmartBar"}
              >
                <span className={chromeBlueIconClass}>
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
            data-smartbar-mobile-detail-close={phase === "cart" && selectedLine && selectedLine.status !== "unknown" ? "true" : undefined}
            data-smartbar-mobile-retry-submit={phase === "cart" && selectedLine?.status === "unknown" && retryDraft.trim() ? "true" : undefined}
            onClick={handleCompanionClick}
            className={`${chromePillClass} h-[46px] min-w-0 ${
              phase === "rest" ? "justify-between gap-2 px-2.5" : "justify-center px-4"
            }`}
            style={{ width: launcherPillWidth, left: launcherPillLeft }}
            aria-label={phase === "rest" ? "Open SmartBar" : companionLabel}
          >
            {phase === "rest" ? (
              <>
                <span className={chromeBlueIconClass}>
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className={`${chromeBlueBadgeClass} h-8 flex-1 px-3 text-[16px]`}>
                  <span className={chromeBlueLabelClass}>{companionLabel}</span>
                </span>
                <span className={chromeBlueIconClass}>
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
              </>
            ) : closeArmed || phase === "building_cart" || handoffState === "handing_off" || Boolean(retryCheckingLineId) ? (
              <span className={`${chromeBlueBadgeClass} h-8 max-w-full px-4 text-[16px]`}>
                <span className={chromeBlueLabelClass}>
                  <ThinkingText text={companionLabel} />
                </span>
              </span>
            ) : (
              <span className={`${chromeBlueBadgeClass} h-8 max-w-full px-4 text-[16px]`}>
                <span className={chromeBlueLabelClass}>{companionLabel}</span>
              </span>
            )}
          </button>

          <AnimatePresence initial={false}>
            {showCartToggle && (
              <motion.button
                type="button"
                data-smartbar-mobile-cart-toggle="true"
                onClick={handleCartToggleClick}
                className={`${chromePillClass} right-0`}
                style={{ width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={phase === "cart" ? "Return to entry" : "Reopen cart"}
              >
                <span className={chromeBlueIconClass}>
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




