import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
} from "../smartbar-mobile/SmartBarMobileShell";
import SmartBarOrderBoardMock from "../order-board/SmartBarOrderBoardMock";

const totalScenes = 3;
const customerFlowBuiltSteps = 9;
const slideOneCaption = "Tap to say or type your order";
const customerEntryPrompt = "Med pep pizza spagh wings gar-stix";
const TUMBLER_GLIDE_MS = 720;

const restaurantWalkthroughHiddenTailBoardTileCss = `
.restaurant-walkthrough-four-tile-board *:has(> [data-smartbar-order-board-tile="S-180"]),
.restaurant-walkthrough-four-tile-board *:has(> [data-smartbar-order-board-tile="S-179"]),
.restaurant-walkthrough-four-tile-board [data-smartbar-order-board-tile="S-180"],
.restaurant-walkthrough-four-tile-board [data-smartbar-order-board-tile="S-179"] {
  display: none !important;
}
`;

type RestaurantWalkthroughSceneNumber = 1 | 2 | 3;
type CustomerFlowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type WalkthroughSlidePhase = "read" | "watch" | "done";

type CustomerStepContent = {
  eyebrow: string;
  copy: string;
};

const customerStepContent: Record<CustomerFlowStep, CustomerStepContent> = {
  1: {
    eyebrow: "Customer flow",
    copy: "SmartBar is a search bar.\nAt the bottom of your site.",
  },
  2: {
    eyebrow: "Customer flow",
    copy: "Customers talk or type orders.",
  },
  3: {
    eyebrow: "Customer flow",
    copy: "SmartBar builds a cart.\nWith color codes.",
  },
  4: {
    eyebrow: "Customer flow",
    copy: "You tap to complete items.",
  },
  5: {
    eyebrow: "Pickup ticket",
    copy: "Confirming generates a pickup ticket.",
  },
  6: {
    eyebrow: "Restaurant side",
    copy: "Requests show on your order board.",
  },
  7: {
    eyebrow: "Restaurant side",
    copy: "Staff opens the complete ticket.",
  },
  8: {
    eyebrow: "Restaurant side",
    copy: "Staff marks it handled.",
  },
  9: {
    eyebrow: "Private sandbox",
    copy: "Phone calls → AI-generated tickets.\nUse private sandbox to test your menu.",
  },
};

const walkthroughOrderBoardOrders = [
  {
    id: "S-184",
    minutesAgo: 0,
    status: "new" as const,
    customer: "SmartBar",
    phone: "202-555-0184",
    pickup: "ASAP",
    itemCount: 4,
    groups: [
      {
        title: "Pizza",
        items: [{ quantity: 1, name: "Medium Pepperoni Pizza" }],
      },
      {
        title: "Pasta",
        items: [{ quantity: 1, name: "Spaghetti", details: ["Meatballs"] }],
      },
      {
        title: "Sides",
        items: [
          { quantity: 1, name: "Hot Buffalo Wings", details: ["Ranch"] },
          { quantity: 1, name: "Garlic Breadsticks" },
        ],
      },
    ],
    notes: "Generated from SmartBar pickup confirmation.",
  },
  {
    id: "S-183",
    minutesAgo: 4,
    status: "new" as const,
    customer: "Sam",
    phone: "202-555-0191",
    pickup: "ASAP",
    itemCount: 3,
    groups: [
      {
        title: "Pizza",
        items: [
          { quantity: 1, name: "Large pepperoni", details: ["Half no cheese"] },
        ],
      },
      {
        title: "Sides",
        items: [{ quantity: 1, name: "Wings", details: ["Mumbo sauce"] }],
      },
      { title: "Drinks", items: [{ quantity: 1, name: "Ginger beer" }] },
    ],
  },
  {
    id: "S-182",
    minutesAgo: 9,
    status: "new" as const,
    customer: "Maya",
    phone: "202-555-0177",
    pickup: "12:45 PM",
    itemCount: 4,
    groups: [
      {
        title: "Mains",
        items: [
          {
            quantity: 1,
            name: "Jerk chicken dinner",
            details: ["Rice and peas", "Cabbage"],
          },
          {
            quantity: 1,
            name: "Curry chicken dinner",
            details: ["White rice", "Plantains"],
          },
        ],
      },
      { title: "Sides", items: [{ quantity: 1, name: "Mac and cheese" }] },
      { title: "Drinks", items: [{ quantity: 1, name: "Sorrel" }] },
    ],
  },
  {
    id: "S-181",
    minutesAgo: 18,
    status: "new" as const,
    customer: "Dana",
    phone: "202-555-0104",
    pickup: "ASAP",
    itemCount: 5,
    groups: [
      {
        title: "Appetizers",
        items: [{ quantity: 1, name: "Avocado Eggrolls" }],
      },
      { title: "Salads", items: [{ quantity: 2, name: "Dinner Salads" }] },
      {
        title: "Entrees",
        items: [
          {
            quantity: 1,
            name: "Chicken Madeira",
            details: ["Mashed potatoes"],
          },
        ],
      },
    ],
  },
  {
    id: "S-180",
    minutesAgo: 26,
    status: "entered" as const,
    customer: "Andre",
    phone: "202-555-0189",
    pickup: "12:20 PM",
    itemCount: 5,
    groups: [
      {
        title: "Sandwiches",
        items: [{ quantity: 2, name: "Cheeseburger", details: ["No pickles"] }],
      },
      { title: "Sides", items: [{ quantity: 2, name: "Fries" }] },
      { title: "Drinks", items: [{ quantity: 1, name: "Cola" }] },
    ],
  },
  {
    id: "S-179",
    minutesAgo: 35,
    status: "entered" as const,
    customer: "Lee",
    phone: "202-555-0130",
    pickup: "12:05 PM",
    itemCount: 2,
    groups: [
      {
        title: "Mains",
        items: [
          { quantity: 1, name: "Chicken bowl", details: ["Extra sauce"] },
        ],
      },
      { title: "Drinks", items: [{ quantity: 1, name: "Water" }] },
    ],
  },
];


function useViewportSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return { width: 390, height: 844 };
    return {
      width: window.innerWidth || document.documentElement.clientWidth || 390,
      height:
        window.innerHeight || document.documentElement.clientHeight || 844,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateSize = () => {
      setSize({
        width: window.innerWidth || document.documentElement.clientWidth || 390,
        height:
          window.innerHeight || document.documentElement.clientHeight || 844,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return size;
}

function RestaurantWalkthroughProgressDots({
  activeScene,
}: {
  activeScene: RestaurantWalkthroughSceneNumber;
}) {
  return (
    <div
      className="pointer-events-none flex items-center justify-center gap-1.5 sm:gap-2"
      aria-label={`Scene ${activeScene} of ${totalScenes}`}
    >
      {Array.from({ length: totalScenes }).map((_, index) => (
        <span
          key={`restaurant-walkthrough-progress-${index}`}
          className={
            index === activeScene - 1
              ? "h-1.5 w-7 rounded-full bg-[#012169] shadow-[0_4px_12px_rgba(1,33,105,0.20)] sm:h-2 sm:w-8"
              : "h-1.5 w-1.5 rounded-full bg-slate-300 sm:h-2 sm:w-2"
          }
        />
      ))}
    </div>
  );
}

function CustomerFlowStepDots({
  activeStep,
}: {
  activeStep: CustomerFlowStep;
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`Customer flow step ${activeStep}`}
    >
      {Array.from({ length: customerFlowBuiltSteps }).map((_, index) => {
        const step = index + 1;
        const isActive = step === activeStep;

        return (
          <span
            key={`restaurant-walkthrough-customer-step-${step}`}
            className={
              isActive
                ? "h-1.5 w-5 rounded-full bg-[#012169]/88"
                : "h-1.5 w-1.5 rounded-full bg-slate-300"
            }
          />
        );
      })}
    </div>
  );
}

function RestaurantWalkthroughNavigator({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onRerun,
  onRestart,
  onFinish,
  isVisible = true,
  rerunLabel = "Rerun",
  finalMode = false,
}: {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onRerun: () => void;
  onRestart?: () => void;
  onFinish?: () => void;
  isVisible?: boolean;
  rerunLabel?: string;
  finalMode?: boolean;
}) {
  if (!isVisible) return null;

  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-full bg-white/92 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] sm:px-4";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-full bg-[#012169] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-55 sm:px-4";

  return (
    <div className="absolute inset-x-5 bottom-8 z-[13090] flex items-center justify-between gap-3 sm:inset-x-10 sm:bottom-10">
      {canGoBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-full bg-white/86 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:px-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>
      ) : (
        <div className="hidden min-w-[6.25rem] sm:block" aria-hidden="true" />
      )}

      {finalMode ? (
        <>
          <button
            type="button"
            onClick={onRestart}
            className={secondaryButtonClass}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </button>

          <button
            type="button"
            onClick={onFinish}
            className={primaryButtonClass}
          >
            Finish
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onRerun}
            className={secondaryButtonClass}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {rerunLabel}
          </button>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={onNext}
            className={primaryButtonClass}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

type WalkthroughColorPointerTarget = {
  id: string;
  status: "ready" | "pending" | "options" | "unknown";
  label: string;
  fallbackTopPct: number;
  fallbackXPct?: number;
};

const colorPointerTargets: WalkthroughColorPointerTarget[] = [
  {
    id: "pizza",
    status: "ready",
    label: "Ready",
    fallbackTopPct: 37,
    fallbackXPct: 50,
  },
  {
    id: "wings",
    status: "pending",
    label: "Needs choice",
    fallbackTopPct: 48,
    fallbackXPct: 50,
  },
  {
    id: "spaghetti",
    status: "options",
    label: "Extras",
    fallbackTopPct: 59,
    fallbackXPct: 50,
  },
  {
    id: "breadsticks",
    status: "unknown",
    label: "Unknown",
    fallbackTopPct: 70,
    fallbackXPct: 50,
  },
];

type DecisionPanelStage =
  | "cart"
  | "tapWings"
  | "wings"
  | "wingsSelected"
  | "cartAfterWings"
  | "tapSpaghetti"
  | "spaghetti"
  | "spaghettiSelected"
  | "spaghettiBackToCart"
  | "cartAfterSpaghetti"
  | "tapGarstix"
  | "garstix"
  | "garstixSelected"
  | "garstixBackToCart"
  | "final";

type DecisionPanelConfig = {
  surface: "carts" | "requirements" | "extras" | "corrections";
  selectedOptions?: string[];
  retryDraft?: string;
  resolvedState?: "requirement" | "extras" | "correction";
  optionCueValue?: string;
  cartGuidanceStatus?: "pending" | "options" | "unknown" | null;
};

function decisionPanelConfigForStage(
  stage: DecisionPanelStage,
): DecisionPanelConfig {
  switch (stage) {
    case "tapWings":
      return { surface: "carts", cartGuidanceStatus: "pending" };
    case "wings":
      return { surface: "requirements" };
    case "wingsSelected":
      return {
        surface: "requirements",
        selectedOptions: ["Ranch"],
        optionCueValue: "Ranch",
      };
    case "cartAfterWings":
      return {
        surface: "carts",
        resolvedState: "requirement",
        cartGuidanceStatus: "options",
      };
    case "tapSpaghetti":
      return {
        surface: "carts",
        resolvedState: "requirement",
        cartGuidanceStatus: "options",
      };
    case "spaghetti":
      return { surface: "extras", resolvedState: "requirement" };
    case "spaghettiSelected":
      return {
        surface: "extras",
        selectedOptions: ["Meatballs"],
        resolvedState: "requirement",
        optionCueValue: "Meatballs",
      };
    case "spaghettiBackToCart":
      return {
        surface: "extras",
        selectedOptions: ["Meatballs"],
        resolvedState: "requirement",
      };
    case "cartAfterSpaghetti":
      return {
        surface: "carts",
        resolvedState: "extras",
        cartGuidanceStatus: "unknown",
      };
    case "tapGarstix":
      return {
        surface: "carts",
        resolvedState: "extras",
        cartGuidanceStatus: "unknown",
      };
    case "garstix":
      return {
        surface: "corrections",
        resolvedState: "extras",
        retryDraft: "",
      };
    case "garstixSelected":
      return {
        surface: "corrections",
        resolvedState: "extras",
        retryDraft: "Garlic Breadsticks",
      };
    case "garstixBackToCart":
      return {
        surface: "corrections",
        resolvedState: "extras",
        retryDraft: "Garlic Breadsticks",
      };
    case "final":
      return {
        surface: "carts",
        resolvedState: "correction",
        cartGuidanceStatus: null,
      };
    case "cart":
    default:
      return { surface: "carts" };
  }
}

function WalkthroughColorPointer({
  runId,
  overlayRef,
}: {
  runId: number;
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);
  const activeTarget = colorPointerTargets[activeTargetIndex];
  const [position, setPosition] = useState<{
    x: number | string;
    y: number | string;
  }>(() => ({
    x: `${colorPointerTargets[0].fallbackXPct ?? 50}%`,
    y: `${colorPointerTargets[0].fallbackTopPct}%`,
  }));

  useEffect(() => {
    setActiveTargetIndex(0);

    const timers = colorPointerTargets
      .slice(1)
      .map((_, index) =>
        window.setTimeout(
          () => setActiveTargetIndex(index + 1),
          1425 * (index + 1),
        ),
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [runId]);

  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;

      const overlay = overlayRef.current;
      const row = document.querySelector<HTMLElement>(
        `[data-smartbar-mobile-cart-line="true"][data-smartbar-mobile-line-status="${activeTarget.status}"]`,
      );

      if (!overlay || !row) {
        setPosition({
          x: `${activeTarget.fallbackXPct ?? 50}%`,
          y: `${activeTarget.fallbackTopPct}%`,
        });
        return;
      }

      const overlayRect = overlay.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();

      setPosition({
        x: Math.round(rowRect.left + rowRect.width * 0.5 - overlayRect.left),
        y: Math.round(rowRect.top + rowRect.height * 0.5 - overlayRect.top),
      });
    };

    const frame = window.requestAnimationFrame(measure);
    const timers = [80, 240, 560].map((delay) =>
      window.setTimeout(measure, delay),
    );
    window.addEventListener("resize", measure);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", measure);
    };
  }, [activeTarget, overlayRef, runId]);

  return (
    <motion.div
      key={`restaurant-walkthrough-color-pointer-${runId}`}
      className="pointer-events-none absolute left-0 top-0 z-[13070]"
      initial={{
        opacity: 0,
        left: position.x,
        top: position.y,
      }}
      animate={{
        opacity: activeTargetIndex >= colorPointerTargets.length ? 0 : 1,
        left: position.x,
        top: position.y,
      }}
      transition={{
        opacity: { duration: 0.22, ease: "easeOut" },
        left: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
        top: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <div className="relative h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#012169] bg-white/58 shadow-[0_12px_28px_rgba(1,33,105,0.16)] ring-4 ring-white/72 backdrop-blur-sm">
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
      </div>

      <motion.div
        key={`restaurant-walkthrough-color-tooltip-${activeTarget.id}`}
        className="absolute left-7 top-[-18px] max-w-[min(13rem,calc(100vw-7rem))] whitespace-normal rounded-2xl bg-slate-950 px-3 py-2 text-center text-[11px] font-black uppercase leading-[1.05] tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(15,23,42,0.20)] ring-1 ring-white/10 sm:max-w-none sm:whitespace-nowrap sm:rounded-full sm:py-1.5 sm:text-xs"
        initial={{ opacity: 0, x: -5, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 4, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {activeTarget.label}
      </motion.div>
    </motion.div>
  );
}

type WalkthroughDecisionRowCueTarget = {
  status: "pending" | "options" | "unknown";
  fallbackTopPct: number;
  fallbackXPct?: number;
};

const decisionRowCueTargets: Record<
  "tapWings" | "tapSpaghetti" | "tapGarstix",
  WalkthroughDecisionRowCueTarget
> = {
  tapWings: { status: "pending", fallbackTopPct: 48, fallbackXPct: 50 },
  tapSpaghetti: { status: "options", fallbackTopPct: 59, fallbackXPct: 50 },
  tapGarstix: { status: "unknown", fallbackTopPct: 70, fallbackXPct: 50 },
};

function WalkthroughDecisionRowTapCue({
  runId,
  stage,
  overlayRef,
}: {
  runId: number;
  stage: "tapWings" | "tapSpaghetti" | "tapGarstix";
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const target = decisionRowCueTargets[stage];
  const [position, setPosition] = useState<{
    x: number | string;
    y: number | string;
  }>(() => ({
    x: `${target.fallbackXPct ?? 50}%`,
    y: `${target.fallbackTopPct}%`,
  }));

  useLayoutEffect(() => {
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;

      const overlay = overlayRef.current;
      const row = document.querySelector<HTMLElement>(
        `[data-smartbar-mobile-cart-line="true"][data-smartbar-mobile-line-status="${target.status}"]`,
      );

      if (!overlay || !row) {
        setPosition({
          x: `${target.fallbackXPct ?? 50}%`,
          y: `${target.fallbackTopPct}%`,
        });
        return;
      }

      const overlayRect = overlay.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();

      setPosition({
        x: Math.round(rowRect.left + rowRect.width * 0.5 - overlayRect.left),
        y: Math.round(rowRect.top + rowRect.height * 0.5 - overlayRect.top),
      });
    };

    const frame = window.requestAnimationFrame(measure);
    const timers = [80, 220, 420].map((delay) =>
      window.setTimeout(measure, delay),
    );
    window.addEventListener("resize", measure);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", measure);
    };
  }, [overlayRef, runId, stage, target]);

  return (
    <motion.div
      key={`restaurant-walkthrough-decision-row-tap-${runId}-${stage}`}
      className="pointer-events-none absolute left-0 top-0 z-[13072]"
      initial={{ opacity: 0, left: position.x, top: position.y, scale: 0.94 }}
      animate={{ opacity: 1, left: position.x, top: position.y, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        opacity: { duration: 0.16, ease: "easeOut" },
        scale: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        left: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        top: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <div className="relative h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#012169] bg-white/62 shadow-[0_12px_28px_rgba(1,33,105,0.16)] ring-4 ring-white/72 backdrop-blur-sm">
        <motion.span
          aria-hidden="true"
          className="absolute inset-[-9px] rounded-full border-2 border-[#012169]/70"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: [0, 0.72, 0], scale: [0.72, 1.18, 1.52] }}
          transition={{ duration: 0.72, ease: "easeOut", times: [0, 0.32, 1] }}
        />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
      </div>
    </motion.div>
  );
}

function WalkthroughClosingSandboxCta({
  onRequestPrivateSandbox,
  onBack,
  onRestart,
  onFinish,
}: {
  onRequestPrivateSandbox: () => void;
  onBack: () => void;
  onRestart: () => void;
  onFinish: () => void;
}) {
  void onRequestPrivateSandbox;

  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-full bg-white/92 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/75 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] sm:px-4 sm:text-sm";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-full bg-[#012169] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] sm:px-4 sm:text-sm";

  return (
    <motion.div
      className="relative z-[5] mt-4 flex max-w-2xl flex-col items-start gap-3 sm:mt-5"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="flex w-full flex-nowrap items-center justify-start gap-2 pt-0 sm:gap-3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.22, ease: "easeOut" }}
      >
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <button
          type="button"
          onClick={onRestart}
          className={secondaryButtonClass}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restart
        </button>

        <button type="button" onClick={onFinish} className={primaryButtonClass}>
          Finish
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}

function CustomerFlowScene({
  activeStep,
  runId,
  isCompact,
  shellViewportTop,
  navReserveHeight,
  onBack,
  onNext,
  onRerun,
  onRestart,
  onFinish,
  onRequestPrivateSandbox,
  slidePhase = "done",
}: {
  activeStep: CustomerFlowStep;
  runId: number;
  isCompact: boolean;
  shellViewportTop: number;
  navReserveHeight: number;
  onBack: () => void;
  onNext: () => void;
  onRerun: () => void;
  onRestart: () => void;
  onFinish: () => void;
  onRequestPrivateSandbox: () => void;
  slidePhase?: WalkthroughSlidePhase;
}) {
  const content = customerStepContent[activeStep];
  const shellDropY = isCompact ? -500 : -460;
  const isCapsuleStep = activeStep === 1;
  const isEntryStep = activeStep === 2;
  const isCartStep = activeStep === 3;
  const isDecisionStep = activeStep === 4;
  const isSendStep = activeStep === 5;
  const isBoardStep = activeStep === 6;
  const isTicketStep = activeStep === 7;
  const isHandledStep = activeStep === 8;
  const isCloseStep = activeStep === 9;
  const usesReadWatchDecide =
    isCapsuleStep ||
    isEntryStep ||
    isCartStep ||
    isDecisionStep ||
    isSendStep ||
    isBoardStep ||
    isTicketStep ||
    isHandledStep ||
    isCloseStep;
  const isSlideRead = usesReadWatchDecide && slidePhase === "read";
  const isSlideWatch = usesReadWatchDecide && slidePhase === "watch";
  const isSlideDone = !usesReadWatchDecide || slidePhase === "done";
  const shouldShowShell =
    !isBoardStep &&
    !isTicketStep &&
    !isHandledStep &&
    !isCloseStep &&
    (!isCapsuleStep || !isSlideRead);
  const shouldShowBoard =
    (isBoardStep && !isSlideRead) || isTicketStep || isHandledStep;
  const shouldShowCopy = !usesReadWatchDecide || isSlideRead || isCloseStep;
  const shouldShowNavigator = !usesReadWatchDecide || isSlideDone;
  const visibleWalkthroughOrderBoardOrders = walkthroughOrderBoardOrders;
  const isTicketFlowStep = isTicketStep || isHandledStep;
  const boardViewportTop =
    isCompact && isTicketFlowStep ? Math.max(42, shellViewportTop - 28) : shellViewportTop;
  const boardViewportBottom =
    isCompact && isTicketFlowStep ? Math.max(48, navReserveHeight - 44) : navReserveHeight;
  const shellControls = useAnimationControls();
  const colorPointerOverlayRef = useRef<HTMLDivElement | null>(null);
  const [entryCueComplete, setEntryCueComplete] = useState(false);
  const [cartCueComplete, setCartCueComplete] = useState(false);
  const [decisionPanelStage, setDecisionPanelStage] =
    useState<DecisionPanelStage>("cart");
  const [sendStage, setSendStage] = useState<"ready" | "sending" | "ticket">(
    "ready",
  );

  useEffect(() => {
    setEntryCueComplete(false);

    if (!isEntryStep || slidePhase !== "watch") return;

    const timer = window.setTimeout(() => {
      setEntryCueComplete(true);
    }, 1540);

    return () => window.clearTimeout(timer);
  }, [isEntryStep, slidePhase, runId]);

  useEffect(() => {
    if (!isCartStep) {
      setCartCueComplete(false);
      return;
    }

    if (slidePhase === "read") {
      setCartCueComplete(false);
      return;
    }

    if (slidePhase !== "watch") return;

    const timer = window.setTimeout(() => {
      setCartCueComplete(true);
    }, 1540);

    return () => window.clearTimeout(timer);
  }, [isCartStep, slidePhase, runId]);

  useEffect(() => {
    if (!isDecisionStep) {
      setDecisionPanelStage("cart");
      return;
    }

    if (slidePhase === "read") {
      setDecisionPanelStage("cart");
      return;
    }

    if (slidePhase === "done") {
      setDecisionPanelStage("final");
      return;
    }

    setDecisionPanelStage("cart");
    const steps: Array<[number, DecisionPanelStage]> = [
      [520, "tapWings"],
      [1280, "wings"],
      [2360, "wingsSelected"],
      [3460, "cartAfterWings"],
      [4200, "tapSpaghetti"],
      [4980, "spaghetti"],
      [6080, "spaghettiSelected"],
      [7240, "spaghettiBackToCart"],
      [8700, "cartAfterSpaghetti"],
      [9360, "tapGarstix"],
      [10140, "garstix"],
      [11240, "garstixSelected"],
      [12400, "garstixBackToCart"],
      [13860, "final"],
    ];

    const timers = steps.map(([delay, stage]) =>
      window.setTimeout(() => setDecisionPanelStage(stage), delay),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isDecisionStep, slidePhase, runId]);

  useEffect(() => {
    if (!isSendStep) {
      setSendStage("ready");
      return;
    }

    if (slidePhase === "read") {
      setSendStage("ready");
      return;
    }

    if (slidePhase === "done") {
      setSendStage("ticket");
      return;
    }

    setSendStage("ready");
    const steps: Array<[number, "sending" | "ticket"]> = [
      [1760, "sending"],
      [3820, "ticket"],
    ];

    const timers = steps.map(([delay, stage]) =>
      window.setTimeout(() => setSendStage(stage), delay),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isSendStep, slidePhase, runId]);

  useEffect(() => {
    if (isCapsuleStep && isSlideRead) {
      shellControls.set({ opacity: 0, y: shellDropY, scale: 0.985 });
      return;
    }

    if (isCapsuleStep && isSlideWatch) {
      shellControls.set({ opacity: 0, y: shellDropY, scale: 0.985 });
      void shellControls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 1.04,
          delay: 0.18,
          ease: [0.16, 1, 0.3, 1],
        },
      });
      return;
    }

    void shellControls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: isCartStep || isDecisionStep || isSendStep ? 0.34 : 0.24,
        ease: [0.16, 1, 0.3, 1],
      },
    });
  }, [
    isCapsuleStep,
    isCartStep,
    isDecisionStep,
    isSendStep,
    isSlideRead,
    isSlideWatch,
    runId,
    shellControls,
    shellDropY,
  ]);

  const demoSubmission = useMemo<SmartBarMobileDemoSubmission | null>(() => {
    if (!isEntryStep || !entryCueComplete) return null;

    return {
      id: runId + 2000,
      query: customerEntryPrompt,
      typing: true,
      manualSubmit: true,
      typeDelayMs: isCompact ? 34 : 38,
    };
  }, [entryCueComplete, isCompact, isEntryStep, runId]);

  const demoMontageStage = useMemo(() => {
    if (isCartStep) {
      if (!cartCueComplete) return null;

      return {
        id: `restaurant-walkthrough-cart-colors-${runId}`,
        label: "",
        surface: "carts" as const,
        open: true,
      };
    }

    if (isDecisionStep) {
      const stage = slidePhase === "read" ? "cart" : decisionPanelStage;
      const config = decisionPanelConfigForStage(stage);

      return {
        id: `restaurant-walkthrough-decisions-${runId}-${slidePhase}-${stage}`,
        label: "",
        surface: config.surface,
        open: true,
        selectedOptions: config.selectedOptions,
        retryDraft: config.retryDraft,
        resolvedState: config.resolvedState,
        status: config.cartGuidanceStatus ?? undefined,
      };
    }

    if (isSendStep) {
      const stage = slidePhase === "read" ? "ready" : sendStage;

      if (stage === "ticket") {
        return {
          id: `restaurant-walkthrough-pickup-ticket-${runId}-${slidePhase}-${stage}`,
          label: "",
          surface: "confirmation" as const,
          open: true,
          resolvedState: "correction" as const,
        };
      }

      return {
        id: `restaurant-walkthrough-pickup-ticket-${runId}-${slidePhase}-${stage}`,
        label: "",
        surface:
          stage === "sending" ? ("checkout" as const) : ("carts" as const),
        open: true,
        resolvedState: "correction" as const,
      };
    }

    return null;
  }, [
    cartCueComplete,
    decisionPanelStage,
    isCartStep,
    isDecisionStep,
    isSendStep,
    runId,
    sendStage,
    slidePhase,
  ]);

  const demoOptionCue = useMemo(() => {
    if (!isDecisionStep || slidePhase !== "watch") return null;
    const optionCueValue =
      decisionPanelConfigForStage(decisionPanelStage).optionCueValue;
    if (!optionCueValue) return null;

    return {
      active: true,
      value: optionCueValue,
      runKey: `restaurant-walkthrough-decision-option-${runId}-${decisionPanelStage}`,
    };
  }, [decisionPanelStage, isDecisionStep, runId, slidePhase]);

  const decisionRowCueStage =
    isDecisionStep &&
    slidePhase === "watch" &&
    (decisionPanelStage === "tapWings" ||
      decisionPanelStage === "tapSpaghetti" ||
      decisionPanelStage === "tapGarstix")
      ? decisionPanelStage
      : null;

  return (
    <div className="relative h-full px-5 pt-4 pb-7 sm:px-10 sm:pt-5 sm:pb-10">
      <div className="relative z-[5] flex items-center">
        <CustomerFlowStepDots activeStep={activeStep} />
      </div>

      <AnimatePresence mode="wait">
        {shouldShowCopy && (
          <motion.div
            key={
              isCloseStep
                ? "restaurant-walkthrough-customer-copy-close"
                : `restaurant-walkthrough-customer-copy-${activeStep}-${isSlideRead ? "read" : "active"}`
            }
            className={[
              "relative z-[5] max-w-2xl whitespace-pre-line text-[1rem] font-semibold leading-[1.16] tracking-[-0.03em] text-slate-950 sm:text-[1.42rem] sm:leading-[1.1]",
              isCloseStep ? "mt-4 sm:mt-5" : "mt-3 sm:mt-4",
            ].join(" ")}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {content.copy}
          </motion.div>
        )}
      </AnimatePresence>

      {shouldShowShell && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-[4] overflow-visible"
          style={{ top: shellViewportTop, bottom: navReserveHeight }}
          initial={false}
          animate={shellControls}
        >
          <div className="relative h-full w-full [transform:translateZ(0)]">
            <SmartBarMobileShell
              mode="overlay"
              introCallout={
                (isCapsuleStep && !isSlideRead) || isEntryStep
                  ? {
                      title: slideOneCaption,
                      startDelayMs: 1120,
                      typeDelayMs: 34,
                    }
                  : null
              }
              demoLauncherCue={
                isEntryStep && slidePhase === "watch" && !entryCueComplete
                  ? { active: true, runKey: runId, showTooltip: false }
                  : null
              }
              demoCompanionCue={
                isCartStep && slidePhase === "watch" && !cartCueComplete
                  ? { active: true, runKey: runId }
                  : isDecisionStep &&
                      slidePhase === "watch" &&
                      (decisionPanelStage === "spaghettiBackToCart" ||
                        decisionPanelStage === "garstixBackToCart")
                    ? {
                        active: true,
                        runKey: `decision-footer-${runId}-${decisionPanelStage}`,
                      }
                    : isSendStep &&
                        slidePhase === "watch" &&
                        sendStage === "ready"
                      ? {
                          active: true,
                          runKey: `send-order-${runId}-${sendStage}`,
                        }
                      : null
              }
              demoOptionCue={demoOptionCue}
              demoPresetEntryDraft={
                isCartStep && !cartCueComplete && slidePhase !== "done"
                  ? {
                      draft: customerEntryPrompt,
                      runKey: `cart-entry-${runId}-${slidePhase}`,
                    }
                  : null
              }
              demoRestCompanion={{ label: "SmartBar", showLogo: true }}
              demoSubmission={demoSubmission}
              demoMontageStage={demoMontageStage}
              compactCartRows
              demoWalkthroughCartMode={
                isCartStep || isDecisionStep || isSendStep
              }
              demoSuppressEntryFocus
              demoResetToRestKey={
                isCapsuleStep
                  ? `restaurant-customer-rest-${runId}`
                  : isEntryStep
                    ? `restaurant-customer-entry-rest-${runId}`
                    : null
              }
              entryModeLabel="Say or type order"
            />
          </div>
        </motion.div>
      )}

      {shouldShowBoard && (
        <motion.div
          key={`restaurant-walkthrough-order-board-${isTicketStep || isHandledStep ? "ticket-flow" : isCloseStep ? "closing" : "receive"}-${runId}-${isTicketStep || isHandledStep || isCloseStep ? "stable" : slidePhase}`}
          className={[
            "restaurant-walkthrough-four-tile-board absolute inset-x-0 z-[4] rounded-[28px] bg-[#e9f6ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ring-1 ring-sky-100/80",
            isCompact && isTicketFlowStep ? "overflow-visible" : "overflow-hidden",
          ].join(" ")}
          style={{ top: boardViewportTop, bottom: boardViewportBottom }}
          initial={
            isTicketStep || isHandledStep || isCloseStep
              ? false
              : { opacity: 0, y: 10, scale: 0.985 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          transition={{
            duration:
              isTicketStep || isHandledStep || isCloseStep ? 0.18 : 0.38,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <style>{restaurantWalkthroughHiddenTailBoardTileCss}</style>
          <SmartBarOrderBoardMock
            demoMode={
              isTicketStep || isHandledStep || isCloseStep
                ? true
                : slidePhase === "watch"
            }
            demoSocialPortrait
            demoCompactBoard
            demoRevealOrderId={isBoardStep ? "S-184" : undefined}
            demoRevealDelayMs={760}
            demoAutoOpenOrderId={isTicketStep ? "S-184" : undefined}
            demoAutoOpenKey={
              isTicketStep && slidePhase === "watch"
                ? `ticket-open-${runId}`
                : undefined
            }
            demoAutoOpenDelayMs={860}
            demoShowAutoOpenCue={isTicketStep}
            demoContainedSheet={isTicketStep || (isHandledStep && isSlideWatch)}
            demoInitialOpenOrderId={isHandledStep && isSlideWatch ? "S-184" : undefined}
            demoAutoMarkEnteredOrderId={isHandledStep && isSlideWatch ? "S-184" : undefined}
            demoAutoMarkEnteredKey={
              isHandledStep && slidePhase === "watch"
                ? `mark-handled-${runId}`
                : undefined
            }
            demoAutoMarkEnteredDelayMs={2100}
            demoShowAutoMarkEnteredCue={isHandledStep}
            demoMarkEnteredLabel={isHandledStep ? "Mark handled" : undefined}
            demoOrders={visibleWalkthroughOrderBoardOrders}
            className={[
              "!min-h-0 h-full !px-2 !py-2 sm:!px-4 sm:!py-3",
              isCompact && isTicketFlowStep ? "!overflow-visible" : "!overflow-hidden",
            ].join(" ")}
          />
        </motion.div>
      )}

      {isCloseStep && !isSlideRead && (
        <WalkthroughClosingSandboxCta
          onRequestPrivateSandbox={onRequestPrivateSandbox}
          onBack={onBack}
          onRestart={onRestart}
          onFinish={onFinish}
        />
      )}

      {isCartStep && cartCueComplete && slidePhase === "watch" && (
        <div
          ref={colorPointerOverlayRef}
          className="pointer-events-none absolute inset-x-0 z-[13050] overflow-visible"
          style={{ top: shellViewportTop, bottom: navReserveHeight }}
        >
          <WalkthroughColorPointer
            runId={runId}
            overlayRef={colorPointerOverlayRef}
          />
        </div>
      )}

      {decisionRowCueStage && (
        <div
          ref={colorPointerOverlayRef}
          className="pointer-events-none absolute inset-x-0 z-[13050] overflow-visible"
          style={{ top: shellViewportTop, bottom: navReserveHeight }}
        >
          <WalkthroughDecisionRowTapCue
            runId={runId}
            stage={decisionRowCueStage}
            overlayRef={colorPointerOverlayRef}
          />
        </div>
      )}

      <RestaurantWalkthroughNavigator
        canGoBack={activeStep > 1}
        canGoNext={activeStep < customerFlowBuiltSteps}
        onBack={onBack}
        onNext={onNext}
        onRerun={onRerun}
        onRestart={onRestart}
        onFinish={onFinish}
        isVisible={!isCloseStep && shouldShowNavigator}
        rerunLabel={usesReadWatchDecide ? "See again" : "Rerun"}
        finalMode={isCloseStep}
      />
    </div>
  );
}

type RestaurantWalkthroughProps = {
  onFinish?: () => void;
  onRequestPrivateSandbox?: () => void;
  chrome?: "full" | "content";
};

export default function RestaurantWalkthrough({
  onFinish,
  onRequestPrivateSandbox,
  chrome = "full",
}: RestaurantWalkthroughProps = {}) {
  const [activeScene, setActiveScene] =
    useState<RestaurantWalkthroughSceneNumber>(1);
  const [customerStep, setCustomerStep] = useState<CustomerFlowStep>(1);
  const [runId, setRunId] = useState(0);
  const [slidePhase, setSlidePhase] = useState<WalkthroughSlidePhase>("read");
  const [ribbonY, setRibbonY] = useState(0);
  const [ribbonHeight, setRibbonHeight] = useState<number | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const isCompact = viewportWidth < 700;

  useEffect(() => {
    if (
      activeScene !== 1 ||
      customerStep < 1 ||
      customerStep > customerFlowBuiltSteps
    ) {
      setSlidePhase("done");
      return;
    }

    setSlidePhase("read");
    const watchTimer = window.setTimeout(() => setSlidePhase("watch"), 2000);
    const doneDelay =
      customerStep === 1
        ? 5600
        : customerStep === 2
          ? 6500
          : customerStep === 3
            ? 9000
            : customerStep === 4
              ? 15000
              : customerStep === 5
                ? 8200
                : customerStep === 6
                  ? 7200
                  : customerStep === 7
                    ? 7600
                    : customerStep === 8
                      ? 7800
                      : 7600;
    const doneTimer = window.setTimeout(() => setSlidePhase("done"), doneDelay);

    return () => {
      window.clearTimeout(watchTimer);
      window.clearTimeout(doneTimer);
    };
  }, [activeScene, customerStep, runId]);

  const embeddedViewportHeight = isCompact ? 590 : 675;
  const cardTop = chrome === "content"
    ? 0
    : isCompact
      ? Math.max(92, Math.round(viewportHeight * 0.12))
      : Math.max(198, Math.round(viewportHeight * 0.24));
  const initialCardHeight = isCompact ? 252 : 278;
  const finalCardHeight = chrome === "content"
    ? embeddedViewportHeight
    : Math.max(
        initialCardHeight,
        viewportHeight - cardTop - (isCompact ? 12 : 36),
      );
  const progressTop = Math.max(
    isCompact ? 72 : 104,
    cardTop - (isCompact ? 26 : 42),
  );
  const shellViewportTop = isCompact ? 70 : 82;
  const navReserveHeight = isCompact ? 92 : 108;

  const activeSegmentIndex = activeScene - 1;
  const slideOneReadHeight =
    activeScene === 1 && customerStep === 1 && slidePhase === "read";
  const closingCardHeight = isCompact ? 340 : initialCardHeight;
  const isClosingStep = activeScene === 1 && customerStep === 9;
  const cardTargetHeight = slideOneReadHeight
    ? initialCardHeight
    : isClosingStep
      ? closingCardHeight
      : (ribbonHeight ?? finalCardHeight);

  const measureActiveSegment = () => {
    const activeSegment = segmentRefs.current[activeSegmentIndex];
    if (!activeSegment) return;

    setRibbonY(-activeSegment.offsetTop);
    setRibbonHeight(activeSegment.offsetHeight);
  };

  useLayoutEffect(() => {
    measureActiveSegment();
  }, [
    activeSegmentIndex,
    finalCardHeight,
    isCompact,
    viewportHeight,
    viewportWidth,
    slidePhase,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => measureActiveSegment();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeSegmentIndex, finalCardHeight]);

  const goBack = () => {
    if (activeScene === 1 && customerStep > 1) {
      setCustomerStep((value) => (value - 1) as CustomerFlowStep);
      setRunId((value) => value + 1);
      return;
    }

    if (activeScene > 1) {
      setActiveScene(
        (value) => (value - 1) as RestaurantWalkthroughSceneNumber,
      );
      setRunId((value) => value + 1);
    }
  };

  const goNext = () => {
    if (activeScene === 1 && customerStep < customerFlowBuiltSteps) {
      setCustomerStep((value) => (value + 1) as CustomerFlowStep);
      setRunId((value) => value + 1);
      return;
    }

    if (activeScene < 1) {
      setActiveScene(
        (value) => (value + 1) as RestaurantWalkthroughSceneNumber,
      );
      setRunId((value) => value + 1);
    }
  };

  const rerun = () => setRunId((value) => value + 1);

  const restartWalkthrough = () => {
    setActiveScene(1);
    setCustomerStep(1);
    setSlidePhase("read");
    setRunId((value) => value + 1);
  };

  const finishWalkthrough = () => {
    if (onFinish) {
      onFinish();
      return;
    }

    window.location.assign("/");
  };

  const requestPrivateSandbox = () => {
    if (onRequestPrivateSandbox) {
      onRequestPrivateSandbox();
      return;
    }

    window.location.assign("/social/smartbar-setup-line");
  };

  const showChrome = chrome === "full";
  const isEmbeddedContent = chrome === "content";

  return (
    <main
      className={
        (isEmbeddedContent
          ? "relative h-full min-h-0 overflow-hidden text-slate-950 "
          : "relative h-[100svh] min-h-[100svh] overflow-hidden text-slate-950 sm:h-screen ") +
        (showChrome
          ? "bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_45%,_#f8fafc_100%)]"
          : "bg-transparent")
      }
    >
      {showChrome && (
      <header className="relative z-[13020] shrink-0 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[16px] bg-[#012169] text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950 sm:text-lg">
                SmartBar
              </div>
              <div className="text-[11px] font-medium leading-tight text-slate-700 sm:text-sm sm:font-normal sm:text-slate-500">
                A search bar that does
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
              <Sparkles className="h-4 w-4 text-slate-500" />
              Restaurant walkthrough
            </div>
          </div>
        </div>
      </header>
      )}

      {showChrome && (
        <div
          className="absolute inset-x-0 z-[13000]"
          style={{ top: progressTop }}
        >
          <RestaurantWalkthroughProgressDots activeScene={activeScene} />
        </div>
      )}

      <motion.section
        className="absolute left-1/2 z-[12000] w-[min(52rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-[30px] bg-white/88 text-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur-sm sm:rounded-[36px]"
        style={{ top: cardTop, transformOrigin: "top center" }}
        initial={
          isEmbeddedContent
            ? { height: initialCardHeight, opacity: 1, y: 0, scale: 1 }
            : { height: initialCardHeight, opacity: 0, y: 12, scale: 0.985 }
        }
        animate={{
          height: cardTargetHeight,
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          height: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.32, ease: "easeOut" },
          y: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
        }}
      >
        <motion.div
          animate={{ y: ribbonY }}
          initial={false}
          transition={{
            duration: TUMBLER_GLIDE_MS / 1000,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div
            ref={(node) => {
              segmentRefs.current[0] = node;
            }}
            style={{ height: finalCardHeight }}
          >
            <CustomerFlowScene
              activeStep={customerStep}
              runId={runId}
              isCompact={isCompact}
              shellViewportTop={shellViewportTop}
              navReserveHeight={navReserveHeight}
              onBack={goBack}
              onNext={goNext}
              onRerun={rerun}
              onRestart={restartWalkthrough}
              onFinish={finishWalkthrough}
              onRequestPrivateSandbox={requestPrivateSandbox}
              slidePhase={slidePhase}
            />
          </div>
        </motion.div>
      </motion.section>
    </main>
  );
}
