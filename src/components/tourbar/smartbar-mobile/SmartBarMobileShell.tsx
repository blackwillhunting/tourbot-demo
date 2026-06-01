import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

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
export type SmartBarMobileOrderStatus = "ready" | "pending" | "options" | "unknown";

export type SmartBarMobileOrderLine = {
  id: string;
  title: string;
  status: SmartBarMobileOrderStatus;
  helper: string;
  price: string;
  details: string[];
  options?: string[];
  retryPrompt?: string;
};

export type SmartBarMobileOrderResult = {
  lines: SmartBarMobileOrderLine[];
  estimatedTotal?: string;
};

export type SmartBarMobileSubmitMeta = {
  intent?: "replace_unknown";
  replaceLineId?: string;
  replaceLineTitle?: string;
};

type DemoLineOverride = Partial<Pick<SmartBarMobileOrderLine, "status" | "helper" | "price" | "details" | "options" | "retryPrompt">>;

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
  },
  {
    id: "line-3",
    title: "Lemonade",
    status: "options",
    helper: "Options available",
    price: "$2.99",
    details: ["Medium suggested", "Ice normal"],
    options: ["Small", "Medium", "Large"],
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

function statusLabel(status: SmartBarMobileOrderStatus) {
  if (status === "ready") return "Ready";
  if (status === "pending") return "Pending";
  if (status === "options") return "Options?";
  return "Unknown";
}

function statusClass(status: SmartBarMobileOrderStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (status === "pending") return "bg-rose-100 text-rose-900 ring-rose-200";
  if (status === "options") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-slate-200 text-slate-700 ring-slate-300";
}

function smartBarMobileRibbonPillClass(kind: "complete" | "pending" | "extras", isOverlay: boolean) {
  if (kind === "complete") {
    return isOverlay
      ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
      : "bg-emerald-300/18 text-emerald-100 ring-1 ring-emerald-200/20";
  }

  if (kind === "pending") {
    return isOverlay
      ? "bg-rose-100 text-rose-900 ring-1 ring-rose-200"
      : "bg-rose-300/18 text-rose-100 ring-1 ring-rose-200/20";
  }

  return isOverlay
    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
    : "bg-amber-300/18 text-amber-100 ring-1 ring-amber-200/20";
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

function smartBarMobileTotalsFromLines(lines: SmartBarMobileOrderLine[]) {
  const subtotal = lines.reduce((sum, line) => {
    const value = smartBarMobileParseMoney(line.price);
    return value === null ? sum : sum + value;
  }, 0);
  const tax = subtotal > 0 ? subtotal * SMARTBAR_MOBILE_TAX_RATE : 0;
  const total = subtotal + tax;

  return {
    subtotal,
    tax,
    total,
    subtotalLabel: subtotal > 0 ? smartBarMobileMoneyFromNumber(subtotal) : "—",
    taxLabel: subtotal > 0 ? smartBarMobileMoneyFromNumber(tax) : "—",
    totalLabel: subtotal > 0 ? smartBarMobileMoneyFromNumber(total) : "—",
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

function smartBarMobileRowSurfaceClass(status: SmartBarMobileOrderStatus, isOverlay: boolean) {
  if (isOverlay) {
    if (status === "ready") {
      return "border-emerald-300/70 bg-emerald-50/94 text-slate-950 shadow-[0_10px_26px_rgba(16,185,129,0.18)] ring-1 ring-emerald-200/80";
    }
    if (status === "pending") {
      return "border-rose-300/75 bg-rose-50/94 text-slate-950 shadow-[0_10px_30px_rgba(244,63,94,0.22)] ring-1 ring-rose-200/85";
    }
    if (status === "options") {
      return "border-amber-300/80 bg-amber-50/94 text-slate-950 shadow-[0_10px_30px_rgba(245,158,11,0.22)] ring-1 ring-amber-200/85";
    }
    return "border-slate-300/85 bg-slate-100/94 text-slate-800 shadow-[0_10px_26px_rgba(100,116,139,0.18)] ring-1 ring-slate-200/85";
  }

  if (status === "ready") {
    return "border-emerald-300/30 bg-emerald-300/18 text-white shadow-[0_12px_28px_rgba(16,185,129,0.16)] ring-1 ring-emerald-200/20";
  }
  if (status === "pending") {
    return "border-rose-300/35 bg-rose-400/22 text-white shadow-[0_12px_30px_rgba(244,63,94,0.22)] ring-1 ring-rose-200/22";
  }
  if (status === "options") {
    return "border-amber-300/35 bg-amber-300/22 text-white shadow-[0_12px_30px_rgba(245,158,11,0.20)] ring-1 ring-amber-200/22";
  }
  return "border-white/12 bg-slate-500/20 text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)] ring-1 ring-white/10";
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

type SmartBarMobileShellProps = {
  mode?: "lab" | "overlay";
  onSubmitPrompt?: (query: string, meta?: SmartBarMobileSubmitMeta) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult>;
  onApplyLineChoice?: (line: SmartBarMobileOrderLine, value: string) => SmartBarMobileOrderResult | void;
  onRemoveLine?: (line: SmartBarMobileOrderLine) => SmartBarMobileOrderResult | void;
  onResetCart?: () => void;
};

export default function SmartBarMobileShell({
  mode = "lab",
  onSubmitPrompt,
  onApplyLineChoice,
  onRemoveLine,
  onResetCart,
}: SmartBarMobileShellProps) {
  const isOverlay = mode === "overlay";
  const entryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const retryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const closeArmTimeoutRef = useRef<number | null>(null);
  const buildTimerRef = useRef<number | null>(null);
  const choiceLockedLineIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<SmartBarMobilePhase>("rest");
  const [entryDraft, setEntryDraft] = useState("");
  const [hasEditedEntryDraft, setHasEditedEntryDraft] = useState(false);
  const [submittedPromptPreview, setSubmittedPromptPreview] = useState("");
  const [retryDraft, setRetryDraft] = useState("");
  const [orderLines, setOrderLines] = useState<SmartBarMobileOrderLine[]>(demoLines);
  const [orderEstimatedTotal, setOrderEstimatedTotal] = useState(estimatedTotal);
  const [hasCart, setHasCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(true);
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

  const entryPillWidth = Math.min(Math.max(stableViewportWidth - 64, 240), 430);
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
  const launcherPillLeft = cartTogglePillSize + safariControlLeftGap;
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
  const checkoutReady = lines.length > 0 && blockingIssueCount === 0;
  const cartTotals = smartBarMobileTotalsFromLines(lines);
  const cartTotalMotionKey = `${phase}-${lines.length}-${cartTotals.totalLabel}`;
  const cartSummaryHeight = Math.min(
    maxCartPanelHeight,
    Math.max(388, 272 + lines.length * 98 + Math.max(0, lines.length - 1) * 10),
  );
  const selectedDetailChipRows = Math.max(1, Math.ceil((selectedLine?.details.length || 0) / 2));
  const selectedOptionRows = Math.ceil((selectedLine?.options?.length || 0) / 3);
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
  const fakeCartPanelHeight = phase === "cart"
    ? cartExpanded ? selectedLine ? cartDetailHeight : cartSummaryHeight : collapsedCartPanelHeight
    : buildPanelHeight;
  const fakeCartPanelRadius = phase === "cart" && !cartExpanded ? 999 : 30;

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

  const disarmClose = () => {
    clearCloseArmTimer();
    setCloseArmed(false);
  };

  useEffect(() => {
    return () => {
      clearCloseArmTimer();
      clearBuildTimer();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      setKeyboardLift(0);
      return;
    }

    const viewport = window.visualViewport;
    const updateKeyboardLift = () => {
      const lift = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
      );

      setKeyboardLift(lift > 24 ? lift : 0);
    };

    updateKeyboardLift();
    viewport.addEventListener("resize", updateKeyboardLift);
    viewport.addEventListener("scroll", updateKeyboardLift);
    window.addEventListener("orientationchange", updateKeyboardLift);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardLift);
      viewport.removeEventListener("scroll", updateKeyboardLift);
      window.removeEventListener("orientationchange", updateKeyboardLift);
    };
  }, []);

  const submitPrompt = () => {
    const submittedDraft = entryDraft.trim();
    if (!submittedDraft) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();

    const activeElement = typeof document !== "undefined"
      ? document.activeElement as HTMLElement | null
      : null;
    activeElement?.blur?.();

    disarmClose();
    clearBuildTimer();
    setSelectedLineId(null);
    setLineOverrides({});
    setCartExpanded(true);
    setSubmittedPromptPreview(submittedDraft);
    setPhase("building_cart");

    const orderResultPromise = onSubmitPrompt
      ? Promise.resolve(onSubmitPrompt(submittedDraft))
      : Promise.resolve<SmartBarMobileOrderResult>({ lines: demoLines, estimatedTotal });

    buildTimerRef.current = window.setTimeout(() => {
      buildTimerRef.current = null;

      orderResultPromise
        .then((result) => {
          if (result.lines.length > 0) {
            setOrderLines(result.lines);
            setOrderEstimatedTotal(result.estimatedTotal || estimatedTotal);
          }
          setHasCart(true);
          setPhase("cart");
        })
        .catch(() => {
          setOrderLines(demoLines);
          setOrderEstimatedTotal(estimatedTotal);
          setHasCart(true);
          setPhase("cart");
        });
    }, 900);
  };

  const selectLine = (line: SmartBarMobileOrderLine) => {
    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setSelectedLineId(line.id);
    setCartExpanded(true);
    if (line.status === "unknown") {
      setRetryDraft("");
      setRetryCheckingLineId(null);
    }
  };

  const applyLineChoice = (line: SmartBarMobileOrderLine, value: string) => {
    if (choiceLockedLineIdRef.current === line.id) return;

    choiceLockedLineIdRef.current = line.id;
    setSelectedChoice({ lineId: line.id, value });
    disarmClose();

    const selectedOptionKey = value.trim().toLowerCase();
    const optionKeys = new Set((line.options || []).map((option) => option.trim().toLowerCase()));
    const cleanedDetails = (line.details || []).filter((detail) => {
      const detailKey = detail.trim().toLowerCase();
      if (/^(choice needed|size needed)$/i.test(detail.trim())) return false;
      if (optionKeys.has(detailKey) && detailKey !== selectedOptionKey) return false;
      return true;
    });
    const resolvedLine: SmartBarMobileOrderLine = {
      ...line,
      status: "ready",
      helper: `${value} selected`,
      details: Array.from(new Set([...cleanedDetails, value])),
      options: line.options || [],
    };
    const parentResult = onApplyLineChoice?.(line, value);

    // Keep the action buttons visible long enough for the selected tile to turn
    // green with a checkmark. Commit the real cart update after that beat.
    setLineOverrides((current) => ({
      ...current,
      [line.id]: {
        ...(current[line.id] || {}),
        status: "ready",
        helper: resolvedLine.helper,
        details: resolvedLine.details,
        options: line.options || [],
      },
    }));

    window.setTimeout(() => {
      const nextResult = parentResult && parentResult.lines.length > 0
        ? parentResult
        : {
            lines: orderLines.map((candidate) => candidate.id === line.id ? resolvedLine : candidate),
            estimatedTotal: orderEstimatedTotal,
          };

      setOrderLines(nextResult.lines);
      setOrderEstimatedTotal(nextResult.estimatedTotal || orderEstimatedTotal);
      setLineOverrides({});
      choiceLockedLineIdRef.current = null;
      setSelectedChoice(null);
      setSelectedLineId(null);
      setCartExpanded(true);
    }, 360);
  };


  const removeLine = (line: SmartBarMobileOrderLine) => {
    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);

    const parentResult = onRemoveLine?.(line);
    const fallbackLines = orderLines.filter((candidate) => candidate.id !== line.id);
    const nextResult = parentResult && parentResult.lines
      ? parentResult
      : {
          lines: fallbackLines,
          estimatedTotal: fallbackLines.length ? orderEstimatedTotal : "—",
        };

    setOrderLines(nextResult.lines);
    setOrderEstimatedTotal(nextResult.estimatedTotal || (nextResult.lines.length ? orderEstimatedTotal : "—"));
    setLineOverrides({});
    setSelectedLineId(null);
    setCartExpanded(true);

    if (nextResult.lines.length === 0) {
      setHasCart(false);
      setEntryDraft("");
      setHasEditedEntryDraft(false);
      setSubmittedPromptPreview("");
      setPhase("entry");
    }
  };

  const submitRetry = () => {
    const submittedRetry = retryDraft.trim();
    if (!selectedLine || selectedLine.status !== "unknown" || !submittedRetry || retryCheckingLineId) return;

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
        const replacementLines = result.lines.filter((line) => line.id !== selectedLine.id);

        if (replacementLines.length > 0) {
          setOrderLines(replacementLines);
          setOrderEstimatedTotal(result.estimatedTotal || orderEstimatedTotal);
        } else {
          setOrderLines((current) => current.filter((line) => line.id !== selectedLine.id));
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
    if (!hasCart) return;

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
    setPhase("rest");
    setEntryDraft("");
    setHasEditedEntryDraft(false);
    setSubmittedPromptPreview("");
    setRetryDraft("");
    setOrderLines(demoLines);
    setOrderEstimatedTotal(estimatedTotal);
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

  const companionLabel = (() => {
    if (phase === "rest") return "SmartBar";
    if (closeArmed) return "Tap again...";
    if (phase === "entry") return hasEditedEntryDraft && entryDraft.trim() ? "Tap to submit" : "Type order";
    if (phase === "building_cart") return hasCart ? "Adding to cart..." : "Building cart...";
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

    if (phase === "cart" && selectedLine?.status === "unknown") {
      submitRetry();
      return;
    }

    if (phase === "cart" && selectedLine) {
      setSelectedLineId(null);
      setCartExpanded(true);
      return;
    }
  };

  const handleClosePillClick = () => {
    if (phase === "rest") return;

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

  const showCartToggle = hasCart && (phase === "entry" || phase === "cart");
  const cartToggleShowsUp = phase === "entry" || !cartExpanded;
  const rootTextClass = isOverlay ? "text-slate-950" : "text-white";
  const upperGlassClass = isOverlay
    ? "overflow-hidden border border-slate-950/10 bg-white/78 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-xl"
    : "overflow-hidden border border-white/12 bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-xl";
  const chromePillClass = isOverlay
    ? "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-slate-950/10 bg-white/82 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_16px_36px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-xl transition active:scale-[0.985]"
    : "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/12 bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-xl transition active:scale-[0.985]";
  const chromeIconBubbleClass = isOverlay
    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950/7 text-slate-950 shadow-sm ring-1 ring-slate-950/10"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-sm ring-1 ring-white/10";
  const mainMutedTextClass = isOverlay ? "text-slate-600" : "text-slate-300";
  const softTextClass = isOverlay ? "text-slate-600" : "text-white/62";
  const quietTextClass = isOverlay ? "text-slate-500" : "text-white/44";
  const skyEyebrowClass = isOverlay ? "text-sky-700" : "text-sky-200";
  const inputTextClass = isOverlay ? "text-slate-950 caret-slate-950" : "text-white caret-white";
  const retryInputClass = isOverlay
    ? "mt-3 h-[96px] w-full resize-none rounded-[26px] border border-slate-950/10 bg-white/66 px-4 py-3 text-center text-[16px] font-bold leading-5 text-slate-950 outline-none ring-0 placeholder:text-slate-400 caret-slate-950"
    : "mt-3 h-[96px] w-full resize-none rounded-[26px] border border-white/10 bg-slate-950/28 px-4 py-3 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-white/28 caret-white";
  const issuePillClass = checkoutReady
    ? "bg-emerald-300 text-slate-950"
    : isOverlay
      ? "bg-slate-950/7 text-slate-700 ring-1 ring-slate-950/10"
      : "bg-white/10 text-white ring-1 ring-white/12";
  const lineButtonClass = "w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]";
  const unknownTitleClass = isOverlay ? "italic text-slate-600" : "italic text-white/82";

  return (
    <div
      className={`fixed inset-0 z-[10080] overflow-hidden ${rootTextClass} ${
        isOverlay
          ? "pointer-events-none bg-transparent"
          : "bg-[radial-gradient(circle_at_24%_16%,rgba(16,185,129,0.18),transparent_34%),radial-gradient(circle_at_84%_74%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(180deg,#07111f_0%,#020617_100%)]"
      }`}
    >
      {!isOverlay && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:38px_38px]" />
      )}

      <main className={`relative z-[1] h-full min-h-0 overflow-hidden pb-[88px] ${isOverlay ? "pointer-events-none" : ""}`}>
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
              <div className="h-full px-3 py-2">
                <textarea
                  ref={entryTextareaRef}
                  value={entryDraft}
                  onChange={(event) => {
                    setEntryDraft(event.target.value);
                    setHasEditedEntryDraft(true);
                  }}
                  className={`h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-center text-[16px] font-bold leading-5 outline-none ring-0 placeholder:text-transparent ${inputTextClass}`}
                  placeholder=""
                />
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
              style={{ width: entryPillWidth }}
              initial={{ height: realComposerHeight, borderRadius: 999 }}
              animate={{ height: fakeCartPanelHeight, borderRadius: fakeCartPanelRadius }}
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
                    <textarea
                      value={submittedPromptPreview}
                      readOnly
                      disabled
                      className={`pointer-events-none h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-center text-[16px] font-bold leading-5 outline-none ring-0 placeholder:text-transparent disabled:opacity-100 ${inputTextClass}`}
                      placeholder=""
                    />
                  </motion.div>
                )}

                {phase === "cart" && cartExpanded && selectedLine && (
                  <motion.div
                    key={`fake-item-detail-${selectedLine.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex h-full min-h-0 flex-col p-4"
                  >
                    <div className="flex shrink-0 items-start justify-between gap-3">
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
                      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
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
                              Choose one
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {selectedLine.options.map((option) => {
                                const persistedSelected = (selectedLine.details || []).some((detail) => {
                                  return detail.trim().toLowerCase() === option.trim().toLowerCase();
                                });
                                const isSelected = persistedSelected ||
                                  (selectedChoice?.lineId === selectedLine.id && selectedChoice.value === option);
                                const isLocked = selectedChoice?.lineId === selectedLine.id && !isSelected;

                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => applyLineChoice(selectedLine, option)}
                                    disabled={Boolean(selectedChoice?.lineId === selectedLine.id)}
                                    className={`rounded-[22px] px-3 py-3 text-sm font-black shadow-lg transition ${
                                      isSelected
                                        ? "bg-emerald-300 text-slate-950 ring-2 ring-emerald-500/40"
                                        : isLocked
                                          ? "bg-white/50 text-slate-500"
                                          : "bg-white/88 text-slate-950"
                                    }`}
                                  >
                                    <span className="inline-flex items-center justify-center gap-1.5">
                                      {isSelected && <Check className="h-3.5 w-3.5" />}
                                      {smartBarMobileShortLabel(option)}
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

                {phase === "cart" && cartExpanded && !selectedLine && (
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
                      <div className={`rounded-full px-2.5 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.12em] ${smartBarMobileRibbonPillClass("complete", isOverlay)}`}>
                        Complete {completeCount}
                      </div>
                      <div className={`rounded-full px-2.5 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.12em] ${smartBarMobileRibbonPillClass("pending", isOverlay)}`}>
                        Pending {blockingIssueCount}
                      </div>
                      <div className={`rounded-full px-2.5 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.12em] ${smartBarMobileRibbonPillClass("extras", isOverlay)}`}>
                        Extras {optionCount}
                      </div>
                    </div>

                    <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-2 overscroll-contain touch-pan-y">
                      {lines.map((line) => (
                        <motion.div
                          key={line.id}
                          role="button"
                          tabIndex={0}
                          animate={smartBarMobileRowAnimate(line.status)}
                          transition={smartBarMobileRowTransition(line.status)}
                          onClick={() => selectLine(line)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectLine(line);
                            }
                          }}
                          className={`${lineButtonClass} ${smartBarMobileRowSurfaceClass(line.status, isOverlay)} cursor-pointer`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`truncate text-base font-black ${line.status === "unknown" ? unknownTitleClass : ""}`}>
                                {smartBarMobileShortTitle(line.title)}
                              </div>
                              <div className={`mt-1 text-sm font-semibold ${mainMutedTextClass} ${line.status === "unknown" ? "italic" : ""}`}>
                                {line.helper}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                              <div className="text-sm font-black">{line.price}</div>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeLine(line);
                                }}
                                className={
                                  isOverlay
                                    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/7 text-slate-600 ring-1 ring-slate-950/10 transition active:scale-95"
                                    : "inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 ring-1 ring-white/12 transition active:scale-95"
                                }
                                aria-label={`Remove ${line.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div
                      className={
                        isOverlay
                          ? "mt-3 shrink-0 rounded-[24px] border border-slate-950/10 bg-white/84 px-4 py-3 text-slate-950 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] ring-1 ring-white/80"
                          : "mt-3 shrink-0 rounded-[24px] border border-white/10 bg-slate-950/44 px-4 py-3 text-white shadow-[0_-8px_24px_rgba(2,6,23,0.22)] ring-1 ring-white/10"
                      }
                    >
                      <div className="flex items-center justify-between gap-4 text-[12px] font-black uppercase tracking-[0.12em]">
                        <span className={quietTextClass}>Subtotal</span>
                        <span className="tabular-nums">{cartTotals.subtotalLabel}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4 text-[12px] font-black uppercase tracking-[0.12em]">
                        <span className={quietTextClass}>Est. tax</span>
                        <span className="tabular-nums">{cartTotals.taxLabel}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-950/10 pt-2 text-[17px] font-black tracking-[-0.02em]">
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
                <X className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleCompanionClick}
            className={`${chromePillClass} h-[46px] min-w-0 ${
              phase === "rest" ? "justify-between gap-2 px-2.5" : "justify-center px-4"
            }`}
            style={{ width: launcherPillWidth, left: launcherPillLeft }}
            aria-label={phase === "rest" ? "Open SmartBar" : companionLabel}
          >
            {phase === "rest" ? (
              <>
                <span className={chromeIconBubbleClass}>
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-center text-[16px] font-medium tracking-normal">
                  {companionLabel}
                </span>
                <span className={chromeIconBubbleClass}>
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
              </>
            ) : closeArmed || phase === "building_cart" || Boolean(retryCheckingLineId) ? (
              <span className="min-w-0 truncate text-center text-[16px] font-medium tracking-normal">
                <ThinkingText text={companionLabel} />
              </span>
            ) : (
              <span className="min-w-0 truncate text-center text-[16px] font-medium tracking-normal">
                {companionLabel}
              </span>
            )}
          </button>

          <AnimatePresence initial={false}>
            {showCartToggle && (
              <motion.button
                type="button"
                onClick={handleCartToggleClick}
                className={`${chromePillClass} right-0`}
                style={{ width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={phase === "cart" ? "Return to entry" : "Reopen cart"}
              >
                {cartToggleShowsUp ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}
