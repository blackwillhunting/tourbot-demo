import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleHelp,
  Pencil,
  ChevronDown,
  ChevronUp,
  Compass,
  GitBranch,
  ListOrdered,
  LoaderCircle,
  Package,
  Paperclip,
  Plus,
  SlidersHorizontal,
  ShoppingCart,
  Sparkles,
  StickyNote,
  Store,
  Trash2,
  X,
} from "lucide-react";
import {
  getSmartBarMobileShellStyles,
  smartBarMobileDetailTheme,
  smartBarMobileHandoffRowSurfaceClass,
  smartBarMobileRowSurfaceClass,
  statusClass,
} from "./smartBarMobileStyles";
import { smartBarMobileSelectionSummaryGroups } from "./smartBarMobileSelectionDetails";
import {
  smartBarMobileAttachUnknownNoteToLineInLines,
  smartBarMobileLineHasAttachedCustomerNote,
  smartBarMobileSaveUnknownAsNoteInLines,
  smartBarMobileUnknownNoteDraft,
} from "./smartBarMobileCustomerNotes";
import { smartBarMobileConditionalNavigationTarget } from "./smartBarMobileConditionalNavigation";

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

export type SmartBarMobileSelectionRule = {
  /** Reserved for a later conditional-limit phase; not evaluated in this shell. */
  when?: Record<string, unknown>;
  minSelections?: number;
  maxSelections?: number | null;
};

export type SmartBarMobileQualifierActivationRule = {
  parentQualifierId: string;
  parentOptionId: string;
};

export type SmartBarMobileOptionGroup = {
  /** Stable backend qualifier/modifier group identity. */
  id: string;
  label: string;
  required?: boolean;
  kind?: string;
  /** False for a conditional child whose activating parent option is not selected. */
  active?: boolean;
  conditional?: boolean;
  activationRules?: SmartBarMobileQualifierActivationRule[];
  options: string[];
  /** Exact backend option IDs aligned by index with options. */
  optionIds?: string[];
  /** Child group IDs aligned by index with options. */
  optionChildGroupIds?: string[][];
  selectedOptions?: string[];
  selectedOptionIds?: string[];
  optionQuantities?: number[];
  optionMaxQuantities?: number[];
  selectionMode?: "single" | "multi";
  minSelections?: number;
  maxSelections?: number | null;
  selectionRules?: SmartBarMobileSelectionRule[];
};

export type SmartBarMobileCandidateResolutionCandidate = {
  itemId: string;
  label: string;
  rank: number;
};

export type SmartBarMobileCandidateResolution = {
  schemaVersion: "smartbar.candidateResolution.v1";
  resolutionId: string;
  sourceText: string;
  candidates: SmartBarMobileCandidateResolutionCandidate[];
  selectionMode: "authoritative_item";
  manualEntryMode: "direct_gray_note";
};

export type SmartBarMobileCandidateSelection = {
  schemaVersion: "smartbar.candidateSelection.v1";
  resolutionId: string;
  sourceText: string;
  itemId: string;
  selectionMode: "authoritative_item";
};

export type SmartBarMobileAiTrace = {
  prescreenReturnedValues?: string[];
  prescreenAcceptedItemIds?: string[];
  prescreenRejectedValues?: string[];
  prescreenUnmatchedCount?: number;
  prescreenUnmatchedReasons?: string[];
  cartBuilderScope?: "filtered_menu" | "full_menu_fallback" | "full_menu" | string;
  cartBuilderReceivedItemIds?: string[];
  cartBuilderReturnedValues?: string[];
  cartBuilderProposedValues?: string[];
  cartBuilderRejectedValues?: string[];
  cartBuilderCannotMatchReasons?: string[];
  cartBuilderParserResult?: string;
  fallbackReason?: string;
  finalResult?: string;
  traceId?: string;
};

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
  /** Backend collection that owns this occurrence. */
  sourceBucket?: "items" | "cannot_match" | "customer_note";
  title: string;
  /** Quantity supplied by the authoritative AI cart. */
  quantity?: number;
  /** Optional demo-only title override for visual teaching rows. */
  demoDisplayTitle?: string;
  /** Optional demo-only flag that hides helper/price/remove chrome on teaching rows while preserving row size. */
  demoHideMeta?: boolean;
  status: SmartBarMobileOrderStatus;
  helper: string;
  price: string;
  details: string[];
  /** All available choice groups for this line. Singular option fields below mirror the active group. */
  optionGroups?: SmartBarMobileOptionGroup[];
  /** Group currently displayed in the detail panel. */
  activeOptionGroupId?: string;
  options?: string[];
  /** Exact backend option IDs aligned by index with options. */
  optionIds?: string[];
  /** Conditional child group IDs aligned by index with options. */
  optionChildGroupIds?: string[][];
  /** Canonical selected control labels retained for display and demo compatibility. */
  selectedOptions?: string[];
  /** Exact backend-selected option IDs. These are authoritative for control state. */
  selectedOptionIds?: string[];
  /** Selected portion count aligned by index with options. Zero means unselected. */
  optionQuantities?: number[];
  /** Per-option repeat cap aligned by index with options. */
  optionMaxQuantities?: number[];
  /** Machine-readable gray reason for non-orderable lines. */
  grayReason?: "not_on_menu" | "not_recognized" | "not_sold_separately" | "selection_limit_exceeded" | string;
  /** Short user-facing reason shown on gray lines. */
  displayReason?: string;
  /** Sanitized per-request AI routing evidence available only on gray lines. */
  aiTrace?: SmartBarMobileAiTrace;
  /** Structured three-item recovery choice shown only after Stage 1 found no item. */
  candidateResolution?: SmartBarMobileCandidateResolution;
  /** True when an unresolved request was deliberately preserved as a restaurant note. */
  isCustomerNote?: boolean;
  /** Exact unresolved wording preserved before the line became a note. */
  originalUnknownText?: string;
  /** Customer-authored note sent to the restaurant. */
  customerNote?: string;
  optionSelectionMode?: "single" | "multi";
  optionGroupLabel?: string;
  optionMinSelections?: number;
  optionMaxSelections?: number | null;
  /** Transport-only reservation for future conditional selection limits. */
  selectionRules?: SmartBarMobileSelectionRule[];
  retryPrompt?: string;
  /** True when this cart line is the one priced aggregate for nested bundle components. */
  isExpandableBundle?: boolean;
  /** Parent-only state before nested component statuses are rolled up. */
  bundleOwnStatus?: SmartBarMobileOrderStatus;
  /** Price-suppressed component rows shown only while their aggregate bundle is expanded. */
  bundleComponents?: SmartBarMobileOrderLine[];
  /** Qualified path back to the aggregate bundle that owns this component. */
  bundleParentCartLineKey?: string;
  bundleParentSourceLineItemId?: string;
  bundleSlotId?: string;
  /** Component rows never display or contribute their standalone menu price. */
  priceSuppressed?: boolean;
  /** Render-only role used while an expandable bundle temporarily unpacks in the cart. */
  bundleDisplayRole?: "component" | "dimmed_parent" | "dimmed_other";
};

export type SmartBarMobileOrderResult = {
  lines: SmartBarMobileOrderLine[];
  pricingMode?: "restaurant-calculated" | "exact" | string;
  /** AI-direct responses replace the entire current cart and must not be reinterpreted. */
  authoritativeReplacement?: boolean;
  source?: string;
  cartStatus?: "ready" | "needs_required_details" | "needs_review" | "has_unknowns" | string;
  answer?: string;
  /** Demo/controlled-flow flag: keep result.lines exactly after retry instead of subtracting the selected unknown row. */
  preserveResultLinesOnRetry?: boolean;
  /** Candidate selection did not complete; keep the recovery panel and original cart unchanged. */
  candidateSelectionFailed?: boolean;
  candidateSelectionFailureMessage?: string;
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
  /** Entry composer reopened while a cart exists, so this request is adding another item. */
  requestIntent?: "add_item";
  /** Authoritative recovery-candidate selection; skips Stage 1 and enters Stage 2. */
  candidateSelection?: SmartBarMobileCandidateSelection;
  replaceLineId?: string;
  replaceLineTitle?: string;
  replaceCartLineKey?: string;
  replaceSourceLineItemId?: string;
  replaceSourceLineIndex?: number;
  replaceSourceBucket?: "items" | "cannot_match" | "customer_note";
};

export type SmartBarMobileDemoTypingStep =
  | { action: "type"; text: string; delayMs?: number }
  | { action: "pause"; ms: number }
  | { action: "backspace"; count: number; delayMs?: number };

export type SmartBarMobileDemoSubmission = {
  id: number;
  query: string;
  meta?: SmartBarMobileSubmitMeta;
  /** Demo-only: visibly open the entry box, type the query, then submit it. */
  typing?: boolean;
  /** Demo-only typing cadence in milliseconds per character. */
  typeDelayMs?: number;
  /** Demo-only pause after opening the entry composer before typing begins. */
  startDelayMs?: number;
  /** Demo-only: optional scripted typing with pauses and visible corrections. */
  typingScript?: SmartBarMobileDemoTypingStep[];
  /** Demo-only pause after typing before submit. */
  submitDelayMs?: number;
  /** Demo-only: type the query and wait for an external scripted click to submit. */
  manualSubmit?: boolean;
};

type DemoLineOverride = Partial<Pick<SmartBarMobileOrderLine, "status" | "helper" | "price" | "details" | "optionGroups" | "activeOptionGroupId" | "options" | "optionIds" | "optionChildGroupIds" | "selectedOptions" | "selectedOptionIds" | "optionQuantities" | "optionMaxQuantities" | "optionSelectionMode" | "optionGroupLabel" | "optionMinSelections" | "optionMaxSelections" | "selectionRules" | "retryPrompt">>;

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
    price: "-",
    details: [],
    retryPrompt: "Re-enter the item so SmartBar can match it.",
  },
];

const smartBarMobileSocialMontageLines: SmartBarMobileOrderLine[] = [
  {
    id: "social-montage-burger",
    title: "Classic burger combo",
    status: "ready",
    helper: "Matched and ready",
    price: "$11.99",
    details: ["Cheese", "Lettuce", "House sauce"],
    options: ["No onion", "Extra cheese", "Add bacon"],
  },
  {
    id: "social-montage-requirement",
    title: "Fries",
    status: "pending",
    helper: "Choose a size",
    price: "$4.49",
    details: ["Size needed"],
    options: ["Small", "Medium", "Large"],
    optionSelectionMode: "single",
  },
  {
    id: "social-montage-extras",
    title: "Chocolate shake",
    status: "options",
    helper: "Optional extras available",
    price: "$5.99",
    details: ["Chocolate", "Medium"],
    options: ["Whipped cream", "Extra chocolate", "Cherry"],
    optionSelectionMode: "multi",
  },
  {
    id: "social-montage-correction",
    title: "cho c snd",
    status: "unknown",
    helper: "Could not match item",
    price: "-",
    details: [],
    retryPrompt: "Clarify or replace this item.",
  },
];

const smartBarMobileWalkthroughPizzaLines: SmartBarMobileOrderLine[] = [
  {
    id: "walkthrough-pizza-wings",
    title: "Buffalo Wings",
    demoDisplayTitle: "Buffalo Wings",
    status: "pending",
    helper: "Must choose",
    price: "$9.99",
    details: ["Blue cheese or ranch"],
    options: ["Blue cheese", "Ranch"],
    optionSelectionMode: "single",
  },
  {
    id: "walkthrough-pizza-spaghetti",
    title: "Spaghetti",
    demoDisplayTitle: "Spaghetti",
    status: "options",
    helper: "Add-ons",
    price: "$10.99",
    details: ["Meatballs", "Sausage", "Mush/peppers"],
    options: ["Meatballs", "Sausage", "Mush/peppers"],
    optionSelectionMode: "multi",
  },
  {
    id: "walkthrough-pizza-garstix",
    title: "gar-stix",
    demoDisplayTitle: "gar-stix",
    status: "unknown",
    helper: "Garlic knots or breadsticks?",
    price: "-",
    details: [],
    retryPrompt: "Clarify as garlic knots or breadsticks.",
  },
];



function smartBarMobileWalkthroughPizzaLinesForState(
  resolvedState?: SmartBarMobileSocialMontageResolvedState | null,
): SmartBarMobileOrderLine[] {
  if (!resolvedState) return smartBarMobileWalkthroughPizzaLines;

  return smartBarMobileWalkthroughPizzaLines.map((line) => {
    if (line.id === "walkthrough-pizza-wings") {
      return {
        ...line,
        status: "ready" as const,
        helper: "Choice selected",
        details: ["Ranch"],
      };
    }

    if ((resolvedState === "extras" || resolvedState === "correction") && line.id === "walkthrough-pizza-spaghetti") {
      return {
        ...line,
        status: "ready" as const,
        helper: "Extras accepted",
        details: ["Meatballs"],
      };
    }

    if (resolvedState === "correction" && line.id === "walkthrough-pizza-garstix") {
      return {
        ...line,
        title: "Garlic Breadsticks",
        demoDisplayTitle: "Garlic Breadsticks",
        status: "ready" as const,
        helper: "Matched and ready",
        price: "$5.99",
        details: ["Garlic breadsticks"],
        retryPrompt: undefined,
      };
    }

    return line;
  });
}

const smartBarMobileSocialMontageReadyLines: SmartBarMobileOrderLine[] = [
  {
    id: "social-montage-ready-burger",
    title: "Classic burger combo",
    status: "ready",
    helper: "Ready for checkout",
    price: "$11.99",
    details: ["Cheese", "Lettuce", "House sauce"],
    options: ["No onion", "Extra cheese", "Add bacon"],
  },
  {
    id: "social-montage-ready-fries",
    title: "Medium fries",
    status: "ready",
    helper: "Ready for checkout",
    price: "$4.49",
    details: ["Medium"],
    options: ["Small", "Medium", "Large"],
  },
  {
    id: "social-montage-ready-shake",
    title: "Chocolate shake",
    status: "ready",
    helper: "Ready for checkout",
    price: "$5.99",
    details: ["Chocolate", "Whipped cream"],
    options: ["Whipped cream", "Extra chocolate", "Cherry"],
  },
  {
    id: "social-montage-ready-sundae",
    title: "Chocolate sundae",
    status: "ready",
    helper: "Ready for checkout",
    price: "$4.99",
    details: ["Chocolate", "Sundae"],
    options: ["Hot fudge", "Whipped cream", "Cherry"],
  },
];

const smartBarMobileSocialMontageSubtotal = "$27.46";
const smartBarMobileSocialMontageTax = "$2.27";
const smartBarMobileSocialMontageTotal = "$29.73";

type SmartBarMobileSocialMontageResolvedState = "requirement" | "extras" | "correction";

function smartBarMobileSocialMontageLinesForState(
  resolvedState?: SmartBarMobileSocialMontageResolvedState | null,
): SmartBarMobileOrderLine[] {
  if (!resolvedState) return smartBarMobileSocialMontageLines;

  return smartBarMobileSocialMontageLines.map((line) => {
    if (line.id === "social-montage-requirement") {
      return {
        ...line,
        title: "Medium fries",
        status: "ready" as const,
        helper: "Size selected",
        details: ["Medium"],
      };
    }

    if ((resolvedState === "extras" || resolvedState === "correction") && line.id === "social-montage-extras") {
      return {
        ...line,
        title: "Chocolate shake",
        status: "ready" as const,
        helper: "Extras accepted",
        details: ["Chocolate", "Medium", "Whipped cream", "Cherry"],
      };
    }

    if (resolvedState === "correction" && line.id === "social-montage-correction") {
      return {
        ...line,
        title: "Chocolate sundae",
        status: "ready" as const,
        helper: "Matched and ready",
        price: "$4.99",
        details: ["Chocolate", "Sundae"],
        retryPrompt: undefined,
      };
    }

    return line;
  });
}


function smartBarMobileSocialBookingMontageResult(stage: SmartBarMobileDemoMontageStage): SmartBarMobileGenericResult {
  type SmartBarSocialBookingStayBlockTone = "ready" | "pending" | "optional" | "neutral" | "accounting" | "choice" | "empty";

  type SmartBarSocialBookingStayBlock = {
    id: string;
    label: string;
    value: string;
    helper?: string;
    tone: SmartBarSocialBookingStayBlockTone;
    actionId?: string;
    actionLabel?: string;
    actionVariant?: "primary" | "secondary";
    removeActionId?: string;
    removeActionLabel?: string;
    trailingIcon?: "trash";
    valueIcon?: "package";
  };

  type SmartBarSocialBookingStayCartProps = {
    responseBody?: string;
    essentials: SmartBarSocialBookingStayBlock[];
    room: SmartBarSocialBookingStayBlock;
    packages: SmartBarSocialBookingStayBlock[];
    estimate: SmartBarSocialBookingStayBlock;
    packagePanelOpen?: boolean;
    packageOptions?: SmartBarSocialBookingStayBlock[];
    summary?: boolean;
    spotlightBlockIds?: string[];
    spotlightKey?: string;
  };

  const renderSmartBarSocialBookingFormattedText = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    return (
      <div className="space-y-1.5">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          const isBullet = trimmed.startsWith("- ");
          const clean = trimmed
            .replace(/^-\s*/, "")
            .replace(/^\*\*/, "")
            .replace(/\*\*$/, "");

          return (
            <div
              key={`${clean}-${index}`}
              className={isBullet ? "flex gap-2 text-[12px] font-semibold leading-4 text-white/74" : "text-[14px] font-black leading-5 text-white"}
            >
              {isBullet ? <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-200/78" /> : null}
              <span>{clean}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const smartBarSocialBookingStayBlockClass = (tone: SmartBarSocialBookingStayBlockTone) => {
    if (tone === "empty") {
      return "border-transparent bg-transparent text-transparent shadow-none ring-transparent";
    }

    if (tone === "pending") {
      return "border-red-200/70 bg-red-500/92 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_rgba(127,29,29,0.24)] ring-red-100/28";
    }

    if (tone === "ready") {
      return "border-emerald-100/55 bg-emerald-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_10px_22px_rgba(16,185,129,0.18)] ring-emerald-100/30";
    }

    if (tone === "optional") {
      return "border-amber-100/58 bg-amber-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_10px_22px_rgba(180,83,9,0.18)] ring-amber-100/30";
    }

    if (tone === "accounting") {
      return "border-blue-300/52 bg-blue-800/96 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_22px_rgba(30,64,175,0.26)] ring-blue-100/24";
    }

    if (tone === "choice") {
      return "border-slate-200/70 bg-white/94 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.70),0_10px_22px_rgba(15,23,42,0.16)] ring-white/46";
    }

    return "border-white/18 bg-slate-950/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_22px_rgba(2,6,23,0.18)] ring-white/12";
  };

  const SmartBarSocialBookingStayBlockTile = ({
    block,
    compact = false,
    spotlighted = false,
    dimmed = false,
    spotlightKey = "booking-spotlight",
  }: {
    block: SmartBarSocialBookingStayBlock;
    compact?: boolean;
    spotlighted?: boolean;
    dimmed?: boolean;
    spotlightKey?: string;
  }) => {
    if (block.tone === "empty") {
      return (
        <div
          className="min-h-[76px] rounded-[18px] border border-transparent bg-transparent"
          aria-hidden="true"
        />
      );
    }

    const className = [
      "relative min-w-0 overflow-hidden rounded-[18px] border text-left ring-1 transition active:scale-[0.985]",
      block.removeActionId ? "p-0" : "px-2.5 py-2",
      block.actionId ? "cursor-pointer hover:brightness-[1.04]" : "cursor-default",
      smartBarSocialBookingStayBlockClass(block.tone),
      spotlighted
        ? "z-[80]"
        : dimmed
          ? ""
          : "",
    ].join(" ");

    const tileContent = (
      <>
        {spotlighted ? (
          <>
            <motion.div
              key={`booking-nav-focus-fog-${block.id}-${spotlightKey}`}
              aria-hidden="true"
              initial={{ opacity: 0.98, scale: 1.018, backdropFilter: "blur(18px)" }}
              animate={{ opacity: [0.98, 0.84, 0], scale: [1.018, 1.006, 1], backdropFilter: ["blur(18px)", "blur(10px)", "blur(0px)"] }}
              transition={{ duration: 1.12, times: [0, 0.34, 1], ease: "easeOut" }}
              className="pointer-events-none absolute -inset-1 z-30 rounded-[20px] bg-slate-100/75 shadow-[inset_0_0_46px_rgba(255,255,255,0.96)] ring-1 ring-white/80 backdrop-blur-xl [transform:translateZ(0)] [will-change:opacity,transform,backdrop-filter]"
            />
            <motion.div
              key={`booking-nav-focus-glow-${block.id}-${spotlightKey}`}
              aria-hidden="true"
              initial={{ opacity: 0.86, scale: 0.992 }}
              animate={{ opacity: [0.86, 0.62, 0.18], scale: [1, 1.006, 1] }}
              transition={{ duration: 3.4, times: [0, 0.35, 1], ease: "easeOut" }}
              className="pointer-events-none absolute -inset-2 z-20 rounded-[22px] ring-2 ring-cyan-300/65 shadow-[0_0_0_10px_rgba(34,211,238,0.12),0_24px_80px_rgba(34,211,238,0.34)] [transform:translateZ(0)] [will-change:opacity,transform]"
            />
          </>
        ) : null}
        <span className="relative z-10 block truncate text-[9px] font-black uppercase tracking-[0.11em] opacity-70">
          {block.label}
        </span>
        <span className={`${compact ? "text-[14px]" : "text-[15px]"} relative z-10 mt-0.5 flex min-w-0 items-center gap-1.5 font-black leading-4 tracking-[-0.02em]`}>
          {block.valueIcon === "package" ? <Package className="h-4 w-4 shrink-0" /> : null}
          <span className="truncate">{block.value}</span>
        </span>
        {block.helper ? (
          <span className="relative z-10 mt-0.5 block truncate text-[10px] font-bold leading-3 opacity-68">
            {block.helper}
          </span>
        ) : null}
      </>
    );

    if (block.removeActionId) {
      return (
        <div className={className}>
          <button
            type="button"
            data-smartbar-mobile-content-action={block.actionId || "booking-focus-room"}
            data-smartbar-mobile-content-action-label={block.actionLabel || block.label}
            data-smartbar-mobile-content-action-variant={block.actionVariant || "secondary"}
            className="block w-full px-2.5 py-2 pr-12 text-left"
          >
            {tileContent}
          </button>
          <button
            type="button"
            data-smartbar-mobile-content-action={block.removeActionId}
            data-smartbar-mobile-content-action-label={block.removeActionLabel || "Remove"}
            data-smartbar-mobile-content-action-variant="secondary"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/96 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_16px_rgba(2,6,23,0.28)] ring-1 ring-white/14 transition active:scale-[0.96]"
            aria-label={block.removeActionLabel || "Remove"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    }

    if (!block.actionId) {
      return <div className={className}>{tileContent}</div>;
    }

    return (
      <button
        type="button"
        data-smartbar-mobile-content-action={block.actionId}
        data-smartbar-mobile-content-action-label={block.actionLabel || block.label}
        data-smartbar-mobile-content-action-variant={block.actionVariant || "primary"}
        className={className}
      >
        {tileContent}
      </button>
    );
  };

  const SmartBarSocialBookingStayCart = ({
    responseBody,
    essentials,
    room,
    packages,
    estimate,
    packagePanelOpen = false,
    packageOptions = [],
    summary = false,
    spotlightBlockIds = [],
    spotlightKey = "booking-spotlight",
  }: SmartBarSocialBookingStayCartProps) => {
    const isSpotlighted = (block: SmartBarSocialBookingStayBlock) => spotlightBlockIds.includes(block.id);
    const isDimmed = (_block: SmartBarSocialBookingStayBlock) => false;
    if (summary) {
      const checkIn = essentials.find((block) => block.id === "stay-check-in")?.value || "Missing";
      const checkOut = essentials.find((block) => block.id === "stay-checkout")?.value || "Missing";
      const guests = (essentials.find((block) => block.id === "stay-guests")?.value || "Missing").replace(/\s*-\s*/g, ", ");
      const selectedPackages = packages.filter((block) => block.tone !== "empty" && block.tone === "ready");
      const addOns = selectedPackages.length && !/reviewed/i.test(selectedPackages[0]?.value || "")
        ? selectedPackages.map((block) => block.valueIcon === "package" ? block.helper || block.value : block.value).join(", ")
        : "No package selected";
      const dates = checkIn !== "Missing" && checkOut !== "Missing" ? `${checkIn} to ${checkOut}, 2026` : "Dates needed";
      const summaryRows = [
        ["Room", room.value || "Selected room"],
        ["Add-ons", addOns],
        ["Dates", dates],
        ["Guests", guests],
        ["Estimate", estimate.value || "Rate ready"],
      ];

      return (
        <div className="rounded-[28px] border border-white/18 bg-slate-950/74 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/12">
          <div className="mb-2 rounded-[22px] border border-white/16 bg-slate-950/88 px-4 py-3 text-[13px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10">
            Booking summary
          </div>
          <div className="overflow-hidden rounded-[24px] border border-white/14 bg-slate-950/84 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10">
            {summaryRows.map(([label, value]) => {
              const editActionId = label === "Dates" ? "booking-edit-dates" : label === "Guests" ? "booking-edit-guests" : "";
              const rowClass = "flex w-full items-center justify-between gap-3 border-b border-white/12 px-4 py-3 text-left last:border-b-0";
              const labelNode = (
                <span className="flex items-center gap-1.5 text-white/72">
                  {label}
                  {editActionId ? (
                    <span className="rounded-full bg-sky-200/18 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-sky-100/86 ring-1 ring-sky-100/14">Edit</span>
                  ) : null}
                </span>
              );
              const valueNode = <strong className="max-w-[62%] text-right text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">{value}</strong>;

              if (editActionId) {
                return (
                  <button
                    key={label}
                    type="button"
                    data-smartbar-mobile-content-action={editActionId}
                    data-smartbar-mobile-content-action-label={`Edit ${label.toLowerCase()}`}
                    className={`${rowClass} transition hover:bg-white/[0.04] active:bg-white/[0.07]`}
                  >
                    {labelNode}
                    {valueNode}
                  </button>
                );
              }

              return <div key={label} className={rowClass}>{labelNode}{valueNode}</div>;
            })}
          </div>
        </div>
      );
    }

    if (packagePanelOpen) {
      return (
        <div className="rounded-[26px] border border-white/18 bg-slate-950/82 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/12">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/78">Packages</div>
              <div className="mt-0.5 text-[14px] font-black leading-4 text-white">Review available add-ons</div>
            </div>
            <div className="rounded-full bg-amber-300/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-950">Multi-select</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {packageOptions.map((block) => (
              <SmartBarSocialBookingStayBlockTile
                key={block.id}
                block={block}
                spotlighted={isSpotlighted(block)}
                dimmed={isDimmed(block)}
                spotlightKey={spotlightKey}
              />
            ))}
          </div>
          <div className="mt-3 rounded-[18px] border border-white/14 bg-white/[0.08] px-3 py-2 text-[12px] font-semibold leading-4 text-white/72 ring-1 ring-white/8">
            Leave selected packages on. Use the footer when done.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {responseBody ? (
          <div className="rounded-[24px] border border-white/22 bg-slate-950/88 px-4 py-3 text-[14px] font-normal leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(2,6,23,0.26)] ring-1 ring-white/14 [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">
            {renderSmartBarSocialBookingFormattedText(responseBody)}
          </div>
        ) : null}

        <div className="rounded-[26px] border border-white/18 bg-slate-950/72 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/12">
          <div className="mb-2">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/74">Stay cart</div>
          </div>

          <div className="grid grid-cols-[0.72fr_0.72fr_1.34fr] gap-1.5">
            {essentials.map((block) => (
              <SmartBarSocialBookingStayBlockTile
                key={block.id}
                block={block}
                compact
                spotlighted={isSpotlighted(block)}
                dimmed={isDimmed(block)}
                spotlightKey={spotlightKey}
              />
            ))}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-1.5">
            <SmartBarSocialBookingStayBlockTile
              block={room}
              spotlighted={isSpotlighted(room)}
              dimmed={isDimmed(room)}
              spotlightKey={spotlightKey}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {packages.map((block) => (
              <SmartBarSocialBookingStayBlockTile
                key={block.id}
                block={block}
                spotlighted={isSpotlighted(block)}
                dimmed={isDimmed(block)}
                spotlightKey={spotlightKey}
              />
            ))}
            <SmartBarSocialBookingStayBlockTile
              block={estimate}
              spotlighted={isSpotlighted(estimate)}
              dimmed={isDimmed(estimate)}
              spotlightKey={spotlightKey}
            />
          </div>
        </div>
      </div>
    );
  };

  const roomPreviews = [
    {
      roomLabel: "Matching room 1 of 3",
      roomValue: "Garden Terrace King",
      roomHelper: "Preview",
      estimate: "$289/night",
      footer: "Previewing 1 of 3",
      body: "**Garden Terrace King** is the value-fit option.\n- Keeps the stay in a better-value band.\n- Still matches the requested view.\n- Breakfast can be added without moving into premium pricing.",
    },
    {
      roomLabel: "Matching room 2 of 3",
      roomValue: "Ocean View Suite",
      roomHelper: "Preview",
      estimate: "$379/night",
      footer: "Previewing 2 of 3",
      body: "**Ocean View Suite** is the balanced upgrade.\n- Stronger view and comfort than the value room.\n- Breakfast compatibility stays intact.\n- Avoids the Coastal Villa price jump.",
    },
    {
      roomLabel: "Matching room 3 of 3",
      roomValue: "Coastal Villa Suite",
      roomHelper: "Preview",
      estimate: "$429/night",
      footer: "Previewing 3 of 3",
      body: "**Coastal Villa Suite** is the premium option.\n- Best view and most space.\n- Highest nightly rate in this set.\n- Useful for comparison, not the value recommendation.",
    },
  ];

  const roomIndex = stage.id.includes("two") ? 1 : stage.id.includes("three") ? 2 : 0;
  const activePreview = roomPreviews[roomIndex];

  const essentialsReady: SmartBarSocialBookingStayBlock[] = [
    {
      id: "stay-check-in",
      label: "In",
      value: "Aug 4",
      helper: "Required",
      tone: "ready",
      actionId: "booking-edit-dates",
      actionLabel: "Edit dates",
    },
    {
      id: "stay-checkout",
      label: "Out",
      value: "Aug 9",
      helper: "Required",
      tone: "ready",
      actionId: "booking-edit-dates",
      actionLabel: "Edit dates",
    },
    {
      id: "stay-guests",
      label: "Guests",
      value: "1 adult - 0 kids",
      helper: "Required",
      tone: "ready",
      actionId: "booking-edit-guests",
      actionLabel: "Edit guests",
    },
  ];

  const emptyRoom: SmartBarSocialBookingStayBlock = {
    id: "stay-room",
    label: "Room",
    value: "Not selected",
    helper: "Required",
    tone: "pending",
    actionId: "booking-nav-next",
    actionLabel: "Choose room",
  };

  const emptyPackage: SmartBarSocialBookingStayBlock = {
    id: "stay-package-placeholder",
    label: "",
    value: "",
    helper: "",
    tone: "empty",
  };

  const liveEstimate = (value: string, helper = "Live estimate"): SmartBarSocialBookingStayBlock => ({
    id: "stay-estimate",
    label: "Estimate",
    value,
    helper,
    tone: "accounting",
  });

  const roomPreviewBlock = (preview = activePreview): SmartBarSocialBookingStayBlock => ({
    id: "stay-room",
    label: preview.roomLabel,
    value: preview.roomValue,
    helper: preview.roomHelper,
    tone: "optional",
    actionId: "booking-focus-room-preview",
    actionLabel: "Preview room",
    actionVariant: "primary",
  });

  const selectedRoomBlock: SmartBarSocialBookingStayBlock = {
    id: "stay-room",
    label: "Room",
    value: "Ocean View Suite",
    helper: "$379/night",
    tone: "ready",
    actionId: "booking-focus-room",
    actionLabel: "Focus room",
    actionVariant: "secondary",
    removeActionId: "booking-remove-room",
    removeActionLabel: "Remove room",
    trailingIcon: "trash",
  };

  const selectedPackageBlock: SmartBarSocialBookingStayBlock = {
    id: "stay-packages-selected",
    label: "Packages",
    value: "Breakfast Flex Plan",
    helper: "+$32/night",
    tone: "ready",
    valueIcon: "package",
    actionId: "booking-review-packages",
    actionLabel: "Review packages",
    actionVariant: "secondary",
  };

  const packageOptions: SmartBarSocialBookingStayBlock[] = [
    {
      id: "package-option-breakfast",
      label: "Breakfast",
      value: "Breakfast Flex Plan",
      helper: "+$32/night",
      tone: "ready",
      valueIcon: "package",
      actionId: "booking-focus-package-breakfast",
      actionLabel: "Focus Breakfast Flex Plan",
    },
    {
      id: "package-option-parking",
      label: "Package",
      value: "Valet Parking",
      helper: "+$24/night",
      tone: "choice",
      valueIcon: "package",
      actionId: "booking-package-toggle-parking",
      actionLabel: "Toggle Valet Parking on",
    },
    {
      id: "package-option-spa",
      label: "Package",
      value: "Spa Credit",
      helper: "+$45/night",
      tone: "choice",
      valueIcon: "package",
      actionId: "booking-package-toggle-spa",
      actionLabel: "Toggle Spa Credit on",
    },
  ];

  const roomPreviewActions: SmartBarMobileGenericAction[] = [
    { id: "booking-nav-back", label: "Back", variant: "back" },
    { id: "booking-add-room", label: "Add room", helper: "Select preview", variant: "primary" },
    { id: "booking-edit-room-search", label: "Edit", helper: "Search", variant: "secondary" },
    { id: "booking-nav-next", label: "Next", variant: "next" },
  ];

  const packageActions: SmartBarMobileGenericAction[] = [
    { id: "booking-nav-back", label: "Back", variant: "back" },
    { id: "booking-review-packages", label: "Review packages", helper: "Add or skip", variant: "primary" },
    { id: "booking-edit-room-search", label: "Edit", helper: "Search", variant: "secondary" },
    { id: "booking-nav-next", label: "Next", variant: "next" },
  ];

  const renderCalendar = () => {
    const cells = [
      "", "", "", "", "", "", "2026-08-01",
      "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08",
      "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15",
      "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22",
      "2026-08-23", "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29",
      "2026-08-30", "2026-08-31", "", "", "", "", "",
    ];

    const dateDraft = {
      checkInDate: "2026-08-04",
      checkOutDate: "2026-08-09",
    };
    const datesComplete = true;

    const dateState = (value: string) => {
      if (value === dateDraft.checkInDate || value === dateDraft.checkOutDate) return "selected";
      if (dateDraft.checkInDate && dateDraft.checkOutDate && value > dateDraft.checkInDate && value < dateDraft.checkOutDate) return "range";
      return "default";
    };

    return (
      <div className="space-y-1.5 pb-5">
        <div className="rounded-[18px] border border-white/20 bg-slate-950/86 px-3.5 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_22px_rgba(2,6,23,0.20)] ring-1 ring-white/14">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-100/82">
            Trip details needed
          </div>
        </div>

        <div className="rounded-[22px] border border-white/18 bg-slate-950/80 px-2.5 pb-4 pt-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-black text-white ring-1 ring-white/12"
              aria-label="Previous month"
            >
              {"<"}
            </button>
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/62">
                {datesComplete ? "Select check-out" : "Select check-in"}
              </div>
              <div className="mt-0.5 text-[14px] font-black leading-4 text-white">
                August 2026
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-black text-white ring-1 ring-white/12"
              aria-label="Next month"
            >
              {">"}
            </button>
          </div>

          <div className="mb-1.5 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] bg-sky-200/92 px-3 py-1.5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-sky-100/34">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">Check-in</div>
              <div className="mt-0.5 text-[13px] font-black leading-4">Aug 4</div>
            </div>
            <div className="rounded-[16px] bg-sky-200/70 px-3 py-1.5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.30)] ring-1 ring-sky-100/24">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">Check-out</div>
              <div className="mt-0.5 text-[13px] font-black leading-4">Aug 9</div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-[0.06em] text-white/44">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div key={`${day}-${index}`} className="py-0.5">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((value, index) => {
              if (!value) return <div key={`empty-${index}`} className="h-7" />;

              const state = dateState(value);
              const className =
                state === "selected"
                  ? "h-7 rounded-full bg-sky-200 text-[12px] font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_6px_14px_rgba(14,165,233,0.20)] ring-1 ring-sky-100/40"
                  : state === "range"
                    ? "h-7 rounded-full bg-sky-200/34 text-[12px] font-black text-white ring-1 ring-sky-100/16"
                    : "h-7 rounded-full bg-white/[0.07] text-[12px] font-black text-white ring-1 ring-white/8";

              return (
                <button
                  key={value}
                  type="button"
                  className={className}
                  aria-label={`Select ${value}`}
                  data-tourbar-calendar-date={value}
                >
                  {String(Number(value.slice(-2)))}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderGuestCounterRow = (label: string, helper: string, value: number, min: number, max: number) => {
    const buttonClass =
      "flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/12 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35";

    return (
      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/14 bg-white/[0.08] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/8">
        <div className="min-w-0">
          <div className="text-[13px] font-black leading-4 text-white">{label}</div>
          <div className="mt-0.5 text-[11px] font-semibold leading-4 text-white/58">{helper}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-tourbar-guest-control={`${label.toLowerCase().startsWith("adult") ? "adults" : "children"}-decrement`}
            disabled={value <= min}
            className={buttonClass}
            aria-label={`Decrease ${label.toLowerCase()}`}
          >
            -
          </button>
          <div className="flex h-10 min-w-[46px] items-center justify-center rounded-full bg-emerald-300/92 px-3 text-[16px] font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-emerald-100/34">
            {value}
          </div>
          <button
            type="button"
            data-tourbar-guest-control={`${label.toLowerCase().startsWith("adult") ? "adults" : "children"}-increment`}
            disabled={value >= max}
            className={buttonClass}
            aria-label={`Increase ${label.toLowerCase()}`}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  const renderGuests = () => (
    <div className="rounded-[24px] border border-white/18 bg-slate-950/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-[20px] border border-sky-100/16 bg-sky-200/16 px-3 py-2 text-left text-xs font-black text-sky-100 ring-1 ring-white/8"
      >
        <span>Aug 4-Aug 9</span>
        <span>Edit</span>
      </button>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/62">Guests</div>
          <div className="mt-0.5 text-[15px] font-black leading-5 text-white">1 adult, 0 kids</div>
        </div>
      </div>

      <div className="space-y-2">
        {renderGuestCounterRow("Adults", "Age 18+", 1, 1, 6)}
        {renderGuestCounterRow("Kids", "Children", 0, 0, 6)}
      </div>
    </div>
  );

  if (stage.surface === "booking_details") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Dates confirmed",
      statusLabel: "Details captured",
      height: 330,
      content: (
        <SmartBarSocialBookingStayCart
          essentials={essentialsReady}
          room={emptyRoom}
          packages={[emptyPackage]}
          estimate={liveEstimate("Pending", "Needs room")}
          spotlightBlockIds={stage.spotlightBlockIds}
          spotlightKey={stage.id}
        />
      ),
    };
  }

  if (stage.surface === "booking_room_preview") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Room previewed",
      statusLabel: "Previewing 1 of 3",
      height: 560,
      actions: roomPreviewActions,
      content: (
        <SmartBarSocialBookingStayCart
          responseBody={roomPreviews[0].body}
          essentials={essentialsReady}
          room={roomPreviewBlock(roomPreviews[0])}
          packages={[emptyPackage]}
          estimate={liveEstimate(roomPreviews[0].estimate)}
          spotlightBlockIds={stage.spotlightBlockIds}
          spotlightKey={stage.id}
        />
      ),
    };
  }

  if (stage.surface === "booking_rooms") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Rooms compared",
      statusLabel: activePreview.footer,
      height: 560,
      actions: roomPreviewActions,
      content: (
        <SmartBarSocialBookingStayCart
          responseBody={activePreview.body}
          essentials={essentialsReady}
          room={roomPreviewBlock(activePreview)}
          packages={[emptyPackage]}
          estimate={liveEstimate(activePreview.estimate)}
          spotlightBlockIds={stage.spotlightBlockIds}
          spotlightKey={stage.id}
        />
      ),
    };
  }

  if (stage.surface === "booking_room_chosen") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Room selected",
      statusLabel: "Room set",
      height: 360,
      content: (
        <SmartBarSocialBookingStayCart
          essentials={essentialsReady}
          room={selectedRoomBlock}
          packages={[emptyPackage]}
          estimate={liveEstimate("$1,895", "Room selected")}
          spotlightBlockIds={stage.spotlightBlockIds}
          spotlightKey={stage.id}
        />
      ),
    };
  }

  if (stage.surface === "booking_packages") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Packages reviewed",
      statusLabel: "Tap when done",
      height: 390,
      actions: packageActions,
      content: (
        <SmartBarSocialBookingStayCart
          essentials={essentialsReady}
          room={selectedRoomBlock}
          packages={[selectedPackageBlock]}
          estimate={liveEstimate("$1,895", "Room + breakfast")}
          packagePanelOpen
          packageOptions={packageOptions}
          spotlightBlockIds={stage.spotlightBlockIds}
          spotlightKey={stage.id}
        />
      ),
    };
  }

  if (stage.surface === "booking_dates") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Dates gathered",
      statusLabel: "Dates selected",
      height: 548,
      content: renderCalendar(),
    };
  }

  if (stage.surface === "booking_guests") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Guests set",
      statusLabel: "Guests selected",
      height: 340,
      content: renderGuests(),
    };
  }

  if (stage.surface === "booking_finalized") {
    return {
      surfaceKind: "booking_tour",
      eyebrow: "Hotel booking",
      title: "Booking finalized",
      statusLabel: "Ready to summarize",
      height: 382,
      content: (
        <SmartBarSocialBookingStayCart
          essentials={essentialsReady}
          room={selectedRoomBlock}
          packages={[selectedPackageBlock]}
          estimate={liveEstimate("$1,895", "Ready")}
          spotlightBlockIds={stage.spotlightBlockIds}
          spotlightKey={stage.id}
        />
      ),
    };
  }

  return {
    surfaceKind: "booking_summary",
    eyebrow: "Hotel booking",
    title: "Booking summary",
    statusLabel: "Tap for booking",
    height: 352,
    actions: [
      { id: "booking-summary", label: "Tap for booking", helper: "Review handoff", variant: "primary" },
    ],
    content: (
      <SmartBarSocialBookingStayCart
        essentials={essentialsReady}
        room={selectedRoomBlock}
        packages={[selectedPackageBlock]}
        estimate={liveEstimate("$1,895", "Ready")}
        summary
        spotlightBlockIds={stage.spotlightBlockIds}
      />
    ),
  };
}

const estimatedTotal = "$19.46";

const SMARTBAR_MOBILE_SEND_ORDER_COLLAPSE_DURATION_MS = 760;
const SMARTBAR_MOBILE_SEND_ORDER_REVEAL_DELAY_MS = 220;

const SMARTBAR_ADAPTIVE_RAIL_DESKTOP_QUERY = "(min-width: 768px)";
const SMARTBAR_ADAPTIVE_RAIL_SURFACE_SELECTOR = "[data-smartbar-mobile-adaptive-surface='true']";
const SMARTBAR_ADAPTIVE_RAIL_MIN_NUDGE_PX = 36;
const SMARTBAR_ADAPTIVE_RAIL_SAFETY_MARGIN_PX = 28;
const SMARTBAR_ADAPTIVE_RAIL_MEASURE_DELAY_MS = 80;
const SMARTBAR_ADAPTIVE_RAIL_OFFSCREEN_LEFT_ALLOWANCE_RATIO = 0.62;

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

type SmartBarAdaptiveRailCandidate = {
  offset: number;
  shellRect: SmartBarAdaptiveSpotlightRect;
};

function smartBarAdaptiveRailBoundOffset(
  offset: number,
  viewportWidth: number,
  minViewportOffset: number,
  maxViewportOffset: number,
) {
  const maxMove = smartBarAdaptiveRailMaxMove(viewportWidth);
  const moveBounded = Math.max(-maxMove, Math.min(maxMove, offset));
  const viewportMin = Math.min(minViewportOffset, maxViewportOffset);
  const viewportMax = Math.max(minViewportOffset, maxViewportOffset);

  return Math.max(viewportMin, Math.min(viewportMax, moveBounded));
}

function smartBarAdaptiveRailUniqueBoundedOffsets(
  offsets: number[],
  viewportWidth: number,
  minViewportOffset: number,
  maxViewportOffset: number,
) {
  const seen = new Set<number>();

  return offsets.reduce<number[]>((acc, offset) => {
    const bounded = Math.round(
      smartBarAdaptiveRailBoundOffset(
        offset,
        viewportWidth,
        minViewportOffset,
        maxViewportOffset,
      ),
    );

    if (seen.has(bounded)) return acc;

    seen.add(bounded);
    acc.push(bounded);
    return acc;
  }, []);
}

function smartBarAdaptiveRailCandidateMetrics(
  candidate: SmartBarAdaptiveRailCandidate,
  targetRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
) {
  const margin = SMARTBAR_ADAPTIVE_RAIL_SAFETY_MARGIN_PX;
  const overlapArea = smartBarAdaptiveRailOverlapArea(targetRect, candidate.shellRect, margin);
  const edgeOverflow =
    Math.max(0, 18 - candidate.shellRect.left) +
    Math.max(0, candidate.shellRect.right - (viewportWidth - 18));
  const leftPinned = candidate.shellRect.left <= 22;
  const rightPinned = candidate.shellRect.right >= viewportWidth - 22;
  const pinnedWhileColliding = overlapArea > 0 && (leftPinned || rightPinned);

  return {
    overlapArea,
    edgeOverflow,
    leftPinned,
    rightPinned,
    pinnedWhileColliding,
  };
}

function smartBarAdaptiveRailCandidateScore(
  candidate: SmartBarAdaptiveRailCandidate,
  targetRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
) {
  const metrics = smartBarAdaptiveRailCandidateMetrics(candidate, targetRect, viewportWidth);

  // Collision is the real failure. A pinned rail that still collides is worse
  // than a wider jump across the target, because it reads as the SmartBar being
  // trapped on the wrong side. This keeps left-safe FoodTrio targets from
  // pushing an already-left rail farther left; the rail crosses to the open side.
  return (
    metrics.overlapArea * 1000 +
    metrics.edgeOverflow * 6000 +
    (metrics.pinnedWhileColliding ? metrics.overlapArea * 2400 + 1600000 : 0) +
    Math.abs(candidate.offset) * 0.18
  );
}

function smartBarAdaptiveRailBestCandidate(
  candidates: SmartBarAdaptiveRailCandidate[],
  targetRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
) {
  return candidates.reduce((best, candidate) => {
    const bestScore = smartBarAdaptiveRailCandidateScore(best, targetRect, viewportWidth);
    const candidateScore = smartBarAdaptiveRailCandidateScore(candidate, targetRect, viewportWidth);

    return candidateScore < bestScore ? candidate : best;
  }, candidates[0]);
}

function smartBarAdaptiveRailEscapePinnedCandidate(
  best: SmartBarAdaptiveRailCandidate,
  candidates: SmartBarAdaptiveRailCandidate[],
  targetRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
) {
  const bestMetrics = smartBarAdaptiveRailCandidateMetrics(best, targetRect, viewportWidth);
  if (!bestMetrics.pinnedWhileColliding) return best;

  const escapeCandidates = candidates
    .map((candidate) => ({
      candidate,
      metrics: smartBarAdaptiveRailCandidateMetrics(candidate, targetRect, viewportWidth),
      score: smartBarAdaptiveRailCandidateScore(candidate, targetRect, viewportWidth),
    }))
    .filter(({ candidate, metrics }) => {
      if (metrics.pinnedWhileColliding) return false;
      if (bestMetrics.leftPinned) return candidate.offset > best.offset;
      if (bestMetrics.rightPinned) return candidate.offset < best.offset;
      return false;
    })
    .sort((left, right) => {
      const overlapDelta = left.metrics.overlapArea - right.metrics.overlapArea;
      if (Math.abs(overlapDelta) > 1) return overlapDelta;

      const overflowDelta = left.metrics.edgeOverflow - right.metrics.edgeOverflow;
      if (Math.abs(overflowDelta) > 1) return overflowDelta;

      if (bestMetrics.leftPinned) return right.candidate.offset - left.candidate.offset;
      if (bestMetrics.rightPinned) return left.candidate.offset - right.candidate.offset;

      return left.score - right.score;
    });

  return escapeCandidates[0]?.candidate ?? best;
}

function smartBarAdaptiveRailOffsetForTarget(
  targetRect: SmartBarAdaptiveSpotlightRect,
  currentShellRect: SmartBarAdaptiveSpotlightRect,
  viewportWidth: number,
  currentOffset: number,
) {
  const margin = SMARTBAR_ADAPTIVE_RAIL_SAFETY_MARGIN_PX;
  const maxMove = smartBarAdaptiveRailMaxMove(viewportWidth);
  const baseShellRect = smartBarAdaptiveRailShiftRect(currentShellRect, -currentOffset);
  const offscreenLeftAllowance = Math.floor(
    (baseShellRect.width || 0) * SMARTBAR_ADAPTIVE_RAIL_OFFSCREEN_LEFT_ALLOWANCE_RATIO,
  );
  const minViewportOffset = Math.max(-maxMove, Math.ceil(18 - baseShellRect.left - offscreenLeftAllowance));
  const maxViewportOffset = Math.min(maxMove, Math.floor(viewportWidth - 18 - baseShellRect.right));

  const moveLeftToClear =
    targetRect.left - margin - baseShellRect.right;
  const moveRightToClear =
    targetRect.right + margin - baseShellRect.left;

  const candidateOffsets = smartBarAdaptiveRailUniqueBoundedOffsets(
    [
      0,
      currentOffset,
      smartBarAdaptiveRailOffsetWithMinimumNudge(moveLeftToClear),
      smartBarAdaptiveRailOffsetWithMinimumNudge(moveRightToClear),
      minViewportOffset,
      maxViewportOffset,
      -maxMove,
      maxMove,
    ],
    viewportWidth,
    minViewportOffset,
    maxViewportOffset,
  );

  const candidates = candidateOffsets.map<SmartBarAdaptiveRailCandidate>((offset) => ({
    offset,
    shellRect: smartBarAdaptiveRailShiftRect(baseShellRect, offset),
  }));

  const currentOverlapArea = smartBarAdaptiveRailOverlapArea(targetRect, currentShellRect, margin);
  const currentShellCenterX = (currentShellRect.left + currentShellRect.right) / 2;
  const targetCenterX = (targetRect.left + targetRect.right) / 2;
  const isLeftShiftedIntoTargetLane =
    currentOverlapArea > 0 &&
    targetCenterX >= currentShellCenterX - 12 &&
    (currentShellCenterX < viewportWidth / 2 - SMARTBAR_ADAPTIVE_RAIL_MIN_NUDGE_PX ||
      currentOffset < -SMARTBAR_ADAPTIVE_RAIL_MIN_NUDGE_PX);

  if (isLeftShiftedIntoTargetLane) {
    const leftMostCandidate = candidates.reduce((leftMost, candidate) =>
      candidate.offset < leftMost.offset ? candidate : leftMost,
    );
    const rightMostCandidate = candidates.reduce((rightMost, candidate) =>
      candidate.offset > rightMost.offset ? candidate : rightMost,
    );
    const leftMostMetrics = smartBarAdaptiveRailCandidateMetrics(
      leftMostCandidate,
      targetRect,
      viewportWidth,
    );
    const rightMostMetrics = smartBarAdaptiveRailCandidateMetrics(
      rightMostCandidate,
      targetRect,
      viewportWidth,
    );
    const leftEscapeStillCoversTarget = leftMostMetrics.overlapArea > 0;
    const rightEscapeHasClearance =
      rightMostCandidate.offset > Math.max(0, currentOffset + SMARTBAR_ADAPTIVE_RAIL_MIN_NUDGE_PX) &&
      rightMostMetrics.edgeOverflow <= 1;

    // Covered-target escape rule: when the SmartBar is already sitting left and
    // the highlighted target is still underneath it, a softer score-based move
    // can keep pushing left into the wall. If the far-left escape still covers
    // the target, cross to the open right side instead.
    if (leftEscapeStillCoversTarget && rightEscapeHasClearance) {
      return rightMostCandidate.offset;
    }
  }

  const best = smartBarAdaptiveRailBestCandidate(candidates, targetRect, viewportWidth);
  return smartBarAdaptiveRailEscapePinnedCandidate(best, candidates, targetRect, viewportWidth).offset;
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

const SMARTBAR_MOBILE_GREEN_CONTROL_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(52,211,153,0.99) 0%, rgba(16,185,129,0.99) 52%, rgba(5,150,105,0.99) 100%)",
  borderColor: "rgba(209,250,229,0.82)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(6,95,70,0.46), 0 16px 38px rgba(5,150,105,0.26), 0 5px 14px rgba(2,6,23,0.18)",
  backdropFilter: "blur(18px) saturate(125%)",
  WebkitBackdropFilter: "blur(18px) saturate(125%)",
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
  if (status === "unknown") return SMARTBAR_MOBILE_FOOTER_GRAY_STYLE;

  return SMARTBAR_MOBILE_BLUE_CONTROL_STYLE;
}

function smartBarMobileFooterPolicyTextClass(status: SmartBarMobileOrderStatus | null) {
  if (status === "pending") {
    return "!font-black text-white";
  }

  if (status === "unknown") {
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

function smartBarMobileCandidateSelectionFailureMessage(result: SmartBarMobileSubmitResult) {
  if (smartBarMobileResultIsGeneric(result)) {
    return "That choice did not finish. Tap it to try again.";
  }

  if (result.candidateSelectionFailed) {
    return String(
      result.candidateSelectionFailureMessage ||
      "That choice did not finish. Tap it to try again.",
    ).replace(/\s+/g, " ").trim();
  }

  const hasFunctionalLine = (result.lines || []).some((line) => (
    line.status !== "unknown" && !line.isCustomerNote
  ));
  return hasFunctionalLine ? "" : "That choice did not finish. Tap it to try again.";
}

function smartBarMobileDisplayedLineHelper(line: SmartBarMobileOrderLine) {
  return line.candidateResolution
    ? "One quick choice will narrow this down"
    : line.helper;
}


const SMARTBAR_MOBILE_FORCED_SPOTLIGHT_MS = 7000;

function smartBarMobileActionShouldForceSpotlight(actionId: string) {
  const id = String(actionId || "");

  return (
    id === "booking-focus-room-preview" ||
    id === "booking-focus-room" ||
    id === "booking-focus-package" ||
    id.startsWith("booking-focus-package-") ||
    id.startsWith("booking-package-toggle-")
  );
}


function smartBarMobileRenderInlineMarkdown(text: string, keyPrefix = "inline"): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

function SmartBarMobileFormattedBody({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/g).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split(/\n+/g).map((line) => line.trim()).filter(Boolean);
        const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));

        if (bulletLines.length && bulletLines.length === lines.length) {
          return (
            <ul key={`block-${blockIndex}`} className="space-y-2">
              {bulletLines.map((line, lineIndex) => {
                const cleanLine = line.replace(/^[-*]\s+/, "");
                return (
                  <li key={`block-${blockIndex}-line-${lineIndex}`} className="flex gap-2">
                    <span className="mt-[0.18rem] text-white/54">-</span>
                    <span className="min-w-0 flex-1">
                      {smartBarMobileRenderInlineMarkdown(cleanLine, `block-${blockIndex}-line-${lineIndex}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={`block-${blockIndex}`}>
            {lines.map((line, lineIndex) => (
              <span key={`block-${blockIndex}-line-${lineIndex}`}>
                {smartBarMobileRenderInlineMarkdown(line, `block-${blockIndex}-line-${lineIndex}`)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function statusLabel(status: SmartBarMobileOrderStatus) {
  if (status === "ready") return "Ready";
  if (status === "pending") return "Pending";
  if (status === "options") return "Optional";
  return "Unknown";
}

function smartBarMobileCompactRowHelper(line: SmartBarMobileOrderLine) {
  if (line.candidateResolution) return "Quick choice";

  if (line.id.startsWith("walkthrough-pizza")) {
    if (line.status === "ready") return "Ready";
    if (line.status === "pending") return "Missing requirement";
    if (line.status === "options") return "Extras available";
    return "No matching item";
  }

  if (line.status === "ready") return "Ready";
  if (line.status === "pending") return "Size needed";
  if (line.status === "options") return "Options available";
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
      : subtotal > 0 ? smartBarMobileMoneyFromNumber(subtotal) : "-",
    taxLabel: authoritativeTax !== null
      ? smartBarMobileMoneyFromNumber(authoritativeTax)
      : subtotal > 0 ? smartBarMobileMoneyFromNumber(tax) : "-",
    totalLabel: authoritativeTotal !== null
      ? smartBarMobileMoneyFromNumber(authoritativeTotal)
      : subtotal > 0 ? smartBarMobileMoneyFromNumber(total) : "-",
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
  if (status === "pending") {
    return { x: 0, scale: [1, 1.006, 1] };
  }

  return { x: 0, scale: 1 };
}

function smartBarMobileRowTransition(status: SmartBarMobileOrderStatus): Transition {
  if (status === "pending") {
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
          {character === " " ? "\u00A0" : character}
        </motion.span>
      ))}
    </span>
  );
}


function smartBarMobileTitlePrefix(value: string) {
  const match = value.match(/^\s*(\d+)\s*[x]\s*(.+)$/i);
  return match ? { prefix: `${match[1]}x `, body: match[2] } : { prefix: "", body: value };
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
    "chocolate shake": "Choc Shake",
    "chocolate sundae": "Choc Sundae",
    "choc sunday": "Choc Sundae",
    "choc sundae": "Choc Sundae",
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
    .replace(/^\s*\d+\s*[x]\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function smartBarMobileOptionLabelsEqual(left: string, right: string) {
  const leftKey = smartBarMobileDemoKey(left);
  const rightKey = smartBarMobileDemoKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function smartBarMobileLineHasOptionDetail(line: SmartBarMobileOrderLine, option: string) {
  const optionIndex = (line.options || []).findIndex((candidate) => candidate === option);
  const optionId = optionIndex >= 0 ? String(line.optionIds?.[optionIndex] || "") : "";
  if (optionId && Array.isArray(line.selectedOptionIds)) {
    return line.selectedOptionIds.some((selectedId) => String(selectedId) === optionId);
  }

  const canonicalSelected = line.selectedOptions || [];
  if (canonicalSelected.some((selected) => smartBarMobileOptionLabelsEqual(option, selected))) {
    return true;
  }
  if (line.status === "pending") {
    return false;
  }

  return (line.details || []).some((detail) => smartBarMobileOptionLabelsEqual(option, detail));
}

function smartBarMobileLineOptionQuantity(line: SmartBarMobileOrderLine, option: string) {
  const optionIndex = (line.options || []).findIndex((candidate) => candidate === option);
  if (optionIndex < 0 || !smartBarMobileLineHasOptionDetail(line, option)) return 0;
  const parsed = Number(line.optionQuantities?.[optionIndex]);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(2, Math.floor(parsed))) : 1;
}

function smartBarMobileLineOptionMaximum(line: SmartBarMobileOrderLine, option: string) {
  const optionIndex = (line.options || []).findIndex((candidate) => candidate === option);
  if (optionIndex < 0) return 1;
  const parsed = Number(line.optionMaxQuantities?.[optionIndex]);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(2, Math.floor(parsed))) : 1;
}

function smartBarMobileSelectionBound(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

function smartBarMobileLineSelectionCount(line: SmartBarMobileOrderLine) {
  if (line.optionSelectionMode !== "multi" && line.status !== "options") {
    return (line.selectedOptions || []).length || (line.options || []).some((option) => smartBarMobileLineHasOptionDetail(line, option)) ? 1 : 0;
  }
  return (line.options || []).reduce(
    (count, option) => count + smartBarMobileLineOptionQuantity(line, option),
    0,
  );
}

function smartBarMobileLineMinimumSelections(line: SmartBarMobileOrderLine) {
  return smartBarMobileSelectionBound(line.optionMinSelections) ?? (line.status === "pending" ? 1 : 0);
}

function smartBarMobileLineMaximumSelections(line: SmartBarMobileOrderLine) {
  const explicit = smartBarMobileSelectionBound(line.optionMaxSelections);
  if (explicit !== undefined) return Math.max(smartBarMobileLineMinimumSelections(line), explicit);
  return line.optionSelectionMode === "multi" || line.status === "options" ? undefined : 1;
}

function smartBarMobileLineAtSelectionLimit(line: SmartBarMobileOrderLine) {
  const maximum = smartBarMobileLineMaximumSelections(line);
  return maximum !== undefined && smartBarMobileLineSelectionCount(line) >= maximum;
}

function smartBarMobileLineSelectionInstruction(line: SmartBarMobileOrderLine) {
  const minimum = smartBarMobileLineMinimumSelections(line);
  const maximum = smartBarMobileLineMaximumSelections(line);
  if (maximum !== undefined && minimum === maximum) return `Choose ${maximum}`;
  if (minimum > 0 && maximum !== undefined) return `Choose ${minimum}–${maximum}`;
  if (maximum !== undefined) return `Choose up to ${maximum}`;
  if (minimum > 0) return `Choose at least ${minimum}`;
  return line.optionGroupLabel || "Choose extras";
}

function smartBarMobileFallbackOptionGroupId(line: SmartBarMobileOrderLine) {
  const labelKey = smartBarMobileDemoKey(line.optionGroupLabel || "options");
  return `legacy-${labelKey || "options"}`;
}

function smartBarMobileAllLineOptionGroups(line: SmartBarMobileOrderLine): SmartBarMobileOptionGroup[] {
  if (Array.isArray(line.optionGroups) && line.optionGroups.length) {
    return line.optionGroups.filter((group) => Array.isArray(group.options) && group.options.length);
  }

  if (!line.options?.length) return [];

  return [{
    id: line.activeOptionGroupId || smartBarMobileFallbackOptionGroupId(line),
    label: line.optionGroupLabel || (line.status === "pending" ? "Required choice" : "Options"),
    required: line.status === "pending" || smartBarMobileLineMinimumSelections(line) > 0,
    active: true,
    options: line.options,
    optionIds: line.optionIds,
    optionChildGroupIds: line.optionChildGroupIds,
    selectedOptions: line.selectedOptions,
    selectedOptionIds: line.selectedOptionIds,
    optionQuantities: line.optionQuantities,
    optionMaxQuantities: line.optionMaxQuantities,
    selectionMode: line.optionSelectionMode || (line.status === "options" ? "multi" : "single"),
    minSelections: line.optionMinSelections,
    maxSelections: line.optionMaxSelections,
    selectionRules: line.selectionRules,
  }];
}

function smartBarMobileLineOptionGroups(line: SmartBarMobileOrderLine): SmartBarMobileOptionGroup[] {
  return smartBarMobileAllLineOptionGroups(line).filter((group) => group.active !== false);
}

function smartBarMobileOptionGroupIsOptional(group: SmartBarMobileOptionGroup) {
  const minimum = smartBarMobileSelectionBound(group.minSelections) ?? (group.required ? 1 : 0);
  return !group.required && minimum === 0;
}

function smartBarMobileOptionGroupSelectionCount(group: SmartBarMobileOptionGroup) {
  const quantities = group.optionQuantities || [];
  if (quantities.some((quantity) => Number(quantity) > 0)) {
    return quantities.reduce((sum, quantity) => {
      const parsed = Number(quantity);
      return sum + (Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0);
    }, 0);
  }

  return Math.max(group.selectedOptionIds?.length || 0, group.selectedOptions?.length || 0);
}

function smartBarMobileOptionGroupNeedsRequiredChoice(group: SmartBarMobileOptionGroup) {
  const minimum = smartBarMobileSelectionBound(group.minSelections) ?? (group.required ? 1 : 0);
  const maximum = smartBarMobileSelectionBound(group.maxSelections);
  const count = smartBarMobileOptionGroupSelectionCount(group);
  return count < minimum || (maximum !== undefined && count > maximum);
}

function smartBarMobileLineWithActiveOptionGroup(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
): SmartBarMobileOrderLine {
  return {
    ...line,
    activeOptionGroupId: group.id,
    options: group.options,
    optionIds: group.optionIds,
    optionChildGroupIds: group.optionChildGroupIds,
    selectedOptions: group.selectedOptions,
    selectedOptionIds: group.selectedOptionIds,
    optionQuantities: group.optionQuantities,
    optionMaxQuantities: group.optionMaxQuantities,
    optionSelectionMode: group.selectionMode,
    optionGroupLabel: group.label,
    optionMinSelections: group.minSelections,
    optionMaxSelections: group.maxSelections,
    selectionRules: group.selectionRules,
  };
}

function smartBarMobileReplaceActiveOptionGroup(
  line: SmartBarMobileOrderLine,
  replacement: SmartBarMobileOptionGroup,
) {
  const groups = smartBarMobileAllLineOptionGroups(line);
  const optionGroups = groups.length
    ? groups.map((group) => group.id === replacement.id ? replacement : group)
    : [replacement];

  return smartBarMobileLineWithActiveOptionGroup(
    {
      ...line,
      optionGroups,
      activeOptionGroupId: replacement.id,
    },
    replacement,
  );
}

function smartBarMobileOptionGroupSelectedIds(group: SmartBarMobileOptionGroup) {
  const selectedIds = (group.selectedOptionIds || []).map((value) => String(value || "").trim()).filter(Boolean);
  if (selectedIds.length) return selectedIds;

  return (group.options || []).reduce<string[]>((ids, option, index) => {
    const selected = (group.selectedOptions || []).some((value) => smartBarMobileOptionLabelsEqual(value, option)) ||
      Number(group.optionQuantities?.[index] || 0) > 0;
    const optionId = String(group.optionIds?.[index] || option || "").trim();
    if (selected && optionId && !ids.includes(optionId)) ids.push(optionId);
    return ids;
  }, []);
}

function smartBarMobileConditionalDescendantGroupIds(
  line: SmartBarMobileOrderLine,
  initialGroupIds: string[],
) {
  const groups = smartBarMobileAllLineOptionGroups(line);
  const descendants = new Set<string>();
  const queue = [...initialGroupIds];
  while (queue.length) {
    const groupId = String(queue.shift() || "").trim();
    if (!groupId || descendants.has(groupId)) continue;
    descendants.add(groupId);
    const group = groups.find((candidate) => candidate.id === groupId);
    (group?.optionChildGroupIds || []).flat().forEach((childId) => {
      if (childId && !descendants.has(childId)) queue.push(childId);
    });
  }
  return Array.from(descendants);
}

function smartBarMobileConditionalChildrenForOption(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
  optionId: string,
  optionLabel: string,
) {
  const optionIndex = (group.options || []).findIndex((option, index) => {
    const candidateId = String(group.optionIds?.[index] || "").trim();
    return (candidateId && candidateId === optionId) || smartBarMobileOptionLabelsEqual(option, optionLabel);
  });
  if (optionIndex < 0) return [];
  return smartBarMobileConditionalDescendantGroupIds(
    line,
    group.optionChildGroupIds?.[optionIndex] || [],
  );
}

function smartBarMobileActiveConditionalParentGroup(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
) {
  const groups = smartBarMobileAllLineOptionGroups(line);
  const selectedByGroup = new Map(
    groups.map((candidate) => [candidate.id, new Set(smartBarMobileOptionGroupSelectedIds(candidate))]),
  );
  const activeRule = (group.activationRules || []).find((rule) => {
    const parent = groups.find((candidate) => candidate.id === rule.parentQualifierId);
    return Boolean(
      parent?.active !== false &&
      selectedByGroup.get(rule.parentQualifierId)?.has(rule.parentOptionId)
    );
  });
  if (!activeRule) return null;
  return groups.find((candidate) => candidate.id === activeRule.parentQualifierId) || null;
}

function smartBarMobileConditionalParentOptionLabel(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
) {
  const groups = smartBarMobileAllLineOptionGroups(line);
  const selectedByGroup = new Map(
    groups.map((candidate) => [candidate.id, new Set(smartBarMobileOptionGroupSelectedIds(candidate))]),
  );
  const activeRule = (group.activationRules || []).find((rule) => {
    const parent = groups.find((candidate) => candidate.id === rule.parentQualifierId);
    return Boolean(
      parent?.active !== false &&
      selectedByGroup.get(rule.parentQualifierId)?.has(rule.parentOptionId)
    );
  });
  if (!activeRule) return "";

  const parent = groups.find((candidate) => candidate.id === activeRule.parentQualifierId);
  if (!parent) return "";

  const optionIndex = (parent.optionIds || []).findIndex((optionId) => (
    String(optionId || "").trim() === String(activeRule.parentOptionId || "").trim()
  ));
  return optionIndex >= 0
    ? String(parent.options?.[optionIndex] || "").replace(/\s+/g, " ").trim()
    : String(activeRule.parentOptionId || "").replace(/\s+/g, " ").trim();
}

function smartBarMobileConditionalOwnerOptionLabel(
  line: SmartBarMobileOrderLine,
  parentGroup: SmartBarMobileOptionGroup,
  childGroupId: string,
) {
  const selectedIds = new Set(smartBarMobileOptionGroupSelectedIds(parentGroup));
  const normalizedChildGroupId = String(childGroupId || "").trim();
  if (!normalizedChildGroupId) return "";

  const ownerIndex = (parentGroup.options || []).findIndex((option, index) => {
    const optionId = String(parentGroup.optionIds?.[index] || option || "").trim();
    if (!optionId || !selectedIds.has(optionId)) return false;
    return smartBarMobileConditionalChildrenForOption(
      line,
      parentGroup,
      optionId,
      option,
    ).includes(normalizedChildGroupId);
  });

  return ownerIndex >= 0
    ? String(parentGroup.options?.[ownerIndex] || "").replace(/\s+/g, " ").trim()
    : "";
}

function smartBarMobileSimplifyConditionalChildLabel(
  label: string,
  parentOptionLabel: string,
) {
  const normalizedLabel = String(label || "").replace(/\s+/g, " ").trim();
  const normalizedParent = String(parentOptionLabel || "").replace(/\s+/g, " ").trim();
  if (!normalizedLabel || !normalizedParent) return normalizedLabel;

  const escapedParent = normalizedParent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return normalizedLabel
    .replace(new RegExp(escapedParent, "ig"), " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim() || normalizedLabel;
}


function smartBarMobileConditionalReturnGroup(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
) {
  let current: SmartBarMobileOptionGroup | null = group;
  let returnGroup: SmartBarMobileOptionGroup | null = null;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = smartBarMobileActiveConditionalParentGroup(line, current);
    if (!parent) break;
    if (parent.selectionMode === "multi") returnGroup = parent;
    current = parent;
  }

  return returnGroup;
}

function smartBarMobileOptionGroupDescendantIds(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
) {
  return smartBarMobileConditionalDescendantGroupIds(
    line,
    (group.optionChildGroupIds || []).flat(),
  );
}

function smartBarMobileOptionGroupHasSelectedActiveChild(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
) {
  const groups = smartBarMobileAllLineOptionGroups(line);
  const selectedIds = new Set(smartBarMobileOptionGroupSelectedIds(group));
  return (group.options || []).some((option, index) => {
    const optionId = String(group.optionIds?.[index] || option || "").trim();
    if (!optionId || !selectedIds.has(optionId)) return false;
    return (group.optionChildGroupIds?.[index] || []).some((childId) => (
      groups.some((candidate) => candidate.id === childId && candidate.active !== false)
    ));
  });
}

function smartBarMobileOptionGroupDirectChildAttentionGroup(
  line: SmartBarMobileOrderLine,
  group: SmartBarMobileOptionGroup,
  reviewedKeys: Record<string, true>,
) {
  const activeGroups = smartBarMobileLineOptionGroups(line);
  const activeById = new Map(activeGroups.map((candidate) => [candidate.id, candidate]));
  const selectedIds = new Set(smartBarMobileOptionGroupSelectedIds(group));
  const directChildren: SmartBarMobileOptionGroup[] = [];
  const seen = new Set<string>();

  (group.options || []).forEach((option, index) => {
    const optionId = String(group.optionIds?.[index] || option || "").trim();
    if (!optionId || !selectedIds.has(optionId)) return;

    (group.optionChildGroupIds?.[index] || []).forEach((childId) => {
      const child = activeById.get(String(childId || "").trim());
      if (!child || seen.has(child.id)) return;
      seen.add(child.id);
      directChildren.push(child);
    });
  });

  return directChildren.find((child) => (
    !smartBarMobileOptionGroupIsOptional(child) &&
    smartBarMobileOptionGroupNeedsRequiredChoice(child)
  )) || directChildren.find((child) => (
    smartBarMobileOptionGroupIsOptional(child) &&
    !smartBarMobileHasReviewedOptionGroupKey(line, child.id, reviewedKeys)
  )) || null;
}

function smartBarMobileConditionalFooterLabel(group: SmartBarMobileOptionGroup) {
  const label = String(group.label || "options").replace(/\s+/g, " ").trim();
  const subject = label.replace(/^(choose|review)\s+/i, "").trim();

  if (/\bdipping sauces?\b/i.test(subject)) return "Choose dipping sauce";
  if (/\bpreferences?\b/i.test(subject)) return "Review preferences";
  if (/\bflavou?r\b/i.test(subject)) return "Choose flavor";
  if (/\bsauces?\b/i.test(subject)) return "Choose sauce";

  if (/^(choose|review)\b/i.test(label)) return label;
  return smartBarMobileOptionGroupIsOptional(group)
    ? `Review ${label}`
    : `Choose ${label}`;
}

function smartBarMobileRecomputeConditionalOptionGroups(line: SmartBarMobileOrderLine) {
  const sourceGroups = smartBarMobileAllLineOptionGroups(line);
  if (!sourceGroups.length) return sourceGroups;

  let groups = sourceGroups.map((group) => ({ ...group }));
  const selectedByGroup = () => new Map(
    groups.map((group) => [group.id, new Set(smartBarMobileOptionGroupSelectedIds(group))]),
  );

  for (let pass = 0; pass <= groups.length; pass += 1) {
    const selected = selectedByGroup();
    let changed = false;
    groups = groups.map((group) => {
      const rules = group.activationRules || [];
      const active = rules.length === 0 || rules.some((rule) => {
        const parent = groups.find((candidate) => candidate.id === rule.parentQualifierId);
        return Boolean(parent?.active !== false && selected.get(rule.parentQualifierId)?.has(rule.parentOptionId));
      });
      if (Boolean(group.active !== false) !== active) changed = true;
      if (active) return { ...group, active: true };
      return {
        ...group,
        active: false,
        selectedOptions: [],
        selectedOptionIds: [],
        optionQuantities: (group.options || []).map(() => 0),
      };
    });
    if (!changed) break;
  }

  return groups;
}

function smartBarMobileResolveConditionalLine(
  line: SmartBarMobileOrderLine,
  preferredGroupIds: string[] = [],
) {
  const optionGroups = smartBarMobileRecomputeConditionalOptionGroups(line);
  const activeGroups = optionGroups.filter((group) => group.active !== false);
  const requiredGroup = activeGroups.find((group) => (
    !smartBarMobileOptionGroupIsOptional(group) && smartBarMobileOptionGroupNeedsRequiredChoice(group)
  ));
  const preferredGroup = preferredGroupIds
    .map((groupId) => activeGroups.find((group) => group.id === groupId))
    .find(Boolean);
  const currentGroup = activeGroups.find((group) => group.id === line.activeOptionGroupId);
  const optionalGroup = activeGroups.find(smartBarMobileOptionGroupIsOptional);
  const nextGroup = preferredGroup || requiredGroup || currentGroup || optionalGroup || activeGroups[0];
  const hasOptionalGroups = activeGroups.some(smartBarMobileOptionGroupIsOptional);
  const status: SmartBarMobileOrderStatus = requiredGroup
    ? "pending"
    : hasOptionalGroups
      ? "options"
      : "ready";
  const helper = requiredGroup
    ? `Choose ${requiredGroup.label.toLowerCase()}`
    : hasOptionalGroups
      ? `Review ${(nextGroup || optionalGroup)?.label.toLowerCase() || "options"}`
      : "Reviewed and ready";

  const allOptionLabels = optionGroups.flatMap((group) => group.options || []);
  const selectedLabels = activeGroups.flatMap((group) => group.selectedOptions || []);
  const details = Array.from(new Set([
    ...(line.details || []).filter((detail) => (
      !/^(choice needed|size needed)$/i.test(String(detail || "").trim()) &&
      !allOptionLabels.some((option) => smartBarMobileOptionLabelsEqual(option, detail))
    )),
    ...selectedLabels,
  ]));

  const baseLine: SmartBarMobileOrderLine = {
    ...line,
    status,
    helper,
    details,
    optionGroups,
  };
  return nextGroup ? smartBarMobileLineWithActiveOptionGroup(baseLine, nextGroup) : baseLine;
}

function smartBarMobileActiveOptionGroup(
  line: SmartBarMobileOrderLine,
  reviewedKeys: Record<string, true>,
) {
  const groups = smartBarMobileLineOptionGroups(line);
  if (!groups.length) return null;
  const explicitGroup = groups.find((group) => group.id === line.activeOptionGroupId);

  if (line.status === "pending") {
    if (
      explicitGroup &&
      !smartBarMobileOptionGroupIsOptional(explicitGroup) &&
      smartBarMobileOptionGroupNeedsRequiredChoice(explicitGroup)
    ) {
      return explicitGroup;
    }

    const missingRequired = groups.find((group) => (
      !smartBarMobileOptionGroupIsOptional(group) &&
      smartBarMobileOptionGroupNeedsRequiredChoice(group)
    ));
    if (missingRequired) return missingRequired;

    return explicitGroup || groups.find((group) => !smartBarMobileOptionGroupIsOptional(group)) || groups[0];
  }

  if (
    explicitGroup &&
    smartBarMobileOptionGroupIsOptional(explicitGroup) &&
    !smartBarMobileHasReviewedOptionGroupKey(line, explicitGroup.id, reviewedKeys)
  ) {
    return explicitGroup;
  }

  const unreviewedOptional = groups.find((group) => (
    smartBarMobileOptionGroupIsOptional(group) &&
    !smartBarMobileHasReviewedOptionGroupKey(line, group.id, reviewedKeys)
  ));
  if (unreviewedOptional) return unreviewedOptional;

  return groups.find((group) => group.id === line.activeOptionGroupId) || groups[0];
}

function smartBarMobileUnreviewedOptionalGroups(
  line: SmartBarMobileOrderLine,
  reviewedKeys: Record<string, true>,
) {
  return smartBarMobileLineOptionGroups(line).filter((group) => (
    smartBarMobileOptionGroupIsOptional(group) &&
    !smartBarMobileHasReviewedOptionGroupKey(line, group.id, reviewedKeys)
  ));
}

function smartBarMobileUniqueText(values: string[]) {
  const seen: Record<string, true> = {};
  const result: string[] = [];

  values.forEach((value) => {
    const textValue = String(value || "").replace(/\s+/g, " ").trim();
    if (!textValue) return;

    const key = smartBarMobileDemoKey(textValue);
    if (!key || seen[key]) return;

    seen[key] = true;
    result.push(textValue);
  });

  return result;
}

function smartBarMobileLineFullTitle(line?: SmartBarMobileOrderLine | null) {
  if (!line) return "";
  return String(line.demoDisplayTitle !== undefined ? line.demoDisplayTitle : line.title || "").replace(/\s+/g, " ").trim();
}

function smartBarMobileLineMissingDetails(line?: SmartBarMobileOrderLine | null) {
  if (!line) return [];

  const missingFromDetails = (line.details || []).filter((detail) => {
    const textValue = String(detail || "").trim();
    return /(?:choice|size|detail|selection|option).*(?:needed|required|missing)|(?:needed|required|missing)/i.test(textValue);
  });

  if (missingFromDetails.length) return smartBarMobileUniqueText(missingFromDetails);
  if (line.status === "pending" && line.helper) return smartBarMobileUniqueText([line.helper]);
  return [];
}

function smartBarMobileLineSelectedDetails(line?: SmartBarMobileOrderLine | null) {
  if (!line) return [];

  const missingKeys = smartBarMobileLineMissingDetails(line).reduce<Record<string, true>>((keys, detail) => {
    keys[smartBarMobileDemoKey(detail)] = true;
    return keys;
  }, {});
  const itemTitleKeys = [smartBarMobileLineFullTitle(line), line.title]
    .map((value) => smartBarMobileDemoKey(String(value || "")))
    .filter(Boolean)
    .reduce<Record<string, true>>((keys, key) => {
      keys[key] = true;
      return keys;
    }, {});

  return smartBarMobileUniqueText([
    ...(line.selectedOptions || []),
    ...(line.details || []).filter((detail) => {
      const key = smartBarMobileDemoKey(detail);
      if (!key || missingKeys[key] || itemTitleKeys[key]) return false;
      if (/^(choice needed|size needed)$/i.test(String(detail || "").trim())) return false;
      return true;
    }),
  ]);
}


function smartBarMobileLineInstanceKey(line: SmartBarMobileOrderLine) {
  return String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || "");
}

type SmartBarMobileNoteTargetChoice = {
  key: string;
  label: string;
  line: SmartBarMobileOrderLine;
};

function smartBarMobileNoteTargetChoices(lines: SmartBarMobileOrderLine[]) {
  const collected: Array<{ key: string; baseLabel: string; line: SmartBarMobileOrderLine }> = [];

  const visit = (line: SmartBarMobileOrderLine, parentLabel = "") => {
    const lineLabel = String(line.demoDisplayTitle || line.title || "Cart item").replace(/\s+/g, " ").trim();
    const baseLabel = parentLabel ? `${parentLabel}: ${lineLabel}` : lineLabel;

    if (line.status !== "unknown" && !line.isCustomerNote) {
      const key = smartBarMobileLineInstanceKey(line);
      if (key) collected.push({ key, baseLabel, line });
    }

    (line.bundleComponents || []).forEach((component) => visit(component, lineLabel));
  };

  lines.forEach((line) => visit(line));

  const totals = collected.reduce<Map<string, number>>((counts, choice) => {
    const key = choice.baseLabel.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
  const occurrences = new Map<string, number>();

  return collected.map<SmartBarMobileNoteTargetChoice>((choice) => {
    const labelKey = choice.baseLabel.toLowerCase();
    const occurrence = (occurrences.get(labelKey) || 0) + 1;
    occurrences.set(labelKey, occurrence);
    const label = (totals.get(labelKey) || 0) > 1
      ? `${choice.baseLabel} — ${occurrence}`
      : choice.baseLabel;

    return { key: choice.key, label, line: choice.line };
  });
}

function smartBarMobileFindLineInTree(
  lines: SmartBarMobileOrderLine[],
  lineId: string | null,
): SmartBarMobileOrderLine | null {
  if (!lineId) return null;

  for (const line of lines) {
    if (smartBarMobileLineInstanceKey(line) === lineId) return line;
    const nested = smartBarMobileFindLineInTree(line.bundleComponents || [], lineId);
    if (nested) return nested;
  }

  return null;
}

function smartBarMobileFindMatchingLineInTree(
  lines: SmartBarMobileOrderLine[],
  referenceLine: SmartBarMobileOrderLine,
): SmartBarMobileOrderLine | null {
  for (const line of lines) {
    if (smartBarMobileLinesAreSameInstance(line, referenceLine)) return line;
    const nested = smartBarMobileFindMatchingLineInTree(
      line.bundleComponents || [],
      referenceLine,
    );
    if (nested) return nested;
  }

  return null;
}

function smartBarMobileMapLineTree(
  lines: SmartBarMobileOrderLine[],
  mapLine: (line: SmartBarMobileOrderLine) => SmartBarMobileOrderLine,
): SmartBarMobileOrderLine[] {
  return lines.map((line) => {
    const mapped = mapLine(line);
    const bundleComponents = mapped.bundleComponents?.length
      ? smartBarMobileMapLineTree(mapped.bundleComponents, mapLine)
      : mapped.bundleComponents;

    return bundleComponents === mapped.bundleComponents
      ? mapped
      : { ...mapped, bundleComponents };
  });
}

function smartBarMobileReplaceLineInTree(
  lines: SmartBarMobileOrderLine[],
  replacement: SmartBarMobileOrderLine,
) {
  return smartBarMobileMapLineTree(lines, (line) => (
    smartBarMobileLinesAreSameInstance(line, replacement) ? replacement : line
  ));
}

function smartBarMobileBundleIsComplete(line?: SmartBarMobileOrderLine | null) {
  const components = line?.bundleComponents || [];
  return Boolean(
    components.length &&
      components.every((component) => component.status === "ready" || component.status === "options"),
  );
}

function smartBarMobileRollupBundleTree(lines: SmartBarMobileOrderLine[]): SmartBarMobileOrderLine[] {
  return lines.map((line) => {
    const bundleComponents = line.bundleComponents?.length
      ? smartBarMobileRollupBundleTree(line.bundleComponents)
      : line.bundleComponents;
    if (!bundleComponents?.length) return line;

    const statuses = [
      line.bundleOwnStatus || "ready",
      ...bundleComponents.map((component) => component.status),
    ];
    const status: SmartBarMobileOrderStatus = statuses.includes("unknown")
      ? "unknown"
      : statuses.includes("pending")
        ? "pending"
        : statuses.includes("options")
          ? "options"
          : "ready";
    const helper = status === "unknown"
      ? "Check included items"
      : status === "pending"
        ? "Finish included items"
        : status === "options"
          ? "Optional choices available"
          : "All included items ready";

    return {
      ...line,
      status,
      helper,
      bundleComponents,
    };
  });
}

function smartBarMobileReviewedOptionGroupKeys(
  line: SmartBarMobileOrderLine,
  optionGroupId: string,
) {
  const normalizedGroupId = String(optionGroupId || "").trim();
  const lineInstanceKey = smartBarMobileLineInstanceKey(line).trim();
  if (!normalizedGroupId || !lineInstanceKey) return [];

  return [`line-instance:${lineInstanceKey}::option-group:${normalizedGroupId}`];
}

function smartBarMobileReviewedOptionGroupKeyPatch(
  line: SmartBarMobileOrderLine,
  optionGroupId: string,
): Record<string, true> {
  return smartBarMobileReviewedOptionGroupKeys(line, optionGroupId).reduce<Record<string, true>>((nextKeys, key) => {
    nextKeys[key] = true;
    return nextKeys;
  }, {});
}

function smartBarMobileHasReviewedOptionGroupKey(
  line: SmartBarMobileOrderLine,
  optionGroupId: string,
  reviewedKeys: Record<string, true>,
) {
  return smartBarMobileReviewedOptionGroupKeys(line, optionGroupId).some((key) => reviewedKeys[key]);
}

function smartBarMobileLinesAreSameInstance(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftCartLineKey = String(left.cartLineKey || "").trim();
  const rightCartLineKey = String(right.cartLineKey || "").trim();
  if (leftCartLineKey || rightCartLineKey) {
    return Boolean(
      leftCartLineKey &&
      rightCartLineKey &&
      leftCartLineKey === rightCartLineKey
    );
  }

  const leftSourceIndex = left.sourceLineIndex;
  const rightSourceIndex = right.sourceLineIndex;
  const leftSourceBucket = left.sourceBucket || "items";
  const rightSourceBucket = right.sourceBucket || "items";
  const leftHasSourcePosition = typeof leftSourceIndex === "number";
  const rightHasSourcePosition = typeof rightSourceIndex === "number";
  if (leftHasSourcePosition || rightHasSourcePosition) {
    return Boolean(
      leftHasSourcePosition &&
      rightHasSourcePosition &&
      leftSourceIndex === rightSourceIndex &&
      leftSourceBucket === rightSourceBucket
    );
  }

  const leftLineItemId = String(left.sourceLineItemId || "").trim();
  const rightLineItemId = String(right.sourceLineItemId || "").trim();
  if (leftLineItemId || rightLineItemId) {
    return Boolean(
      leftLineItemId &&
      rightLineItemId &&
      leftLineItemId === rightLineItemId
    );
  }

  const leftId = String(left.id || "").trim();
  const rightId = String(right.id || "").trim();
  return Boolean(leftId && rightId && leftId === rightId);
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
  /** Demo-only: override the typing cadence for scripted callouts. */
  typeDelayMs?: number;
  /** Demo-only: override the delay before typing starts. */
  startDelayMs?: number;
};

type SmartBarMobileRestCompanion = {
  label?: string;
  showLogo?: boolean;
  blank?: boolean;
};

type SmartBarMobileCompanionMessage = {
  label: string;
  status?: SmartBarMobileOrderStatus | null;
};

type SmartBarMobileDemoMontageSurface =
  | "carts"
  | "requirements"
  | "extras"
  | "corrections"
  | "checkout"
  | "confirmation"
  | "booking_details"
  | "booking_room_preview"
  | "booking_room_chosen"
  | "booking_rooms"
  | "booking_packages"
  | "booking_dates"
  | "booking_guests"
  | "booking_finalized"
  | "booking_summary";

export type SmartBarMobileDemoMontageStage = {
  id: string;
  label: string;
  surface: SmartBarMobileDemoMontageSurface;
  open: boolean;
  status?: SmartBarMobileOrderStatus | null;
  /** Demo-only: preselect option pills so the focus panel visibly resolves. */
  selectedOptions?: string[];
  /** Demo-only: prefill gray retry text. */
  retryDraft?: string;
  /** Demo-only: apply the navigation-gloss spotlight to a cart row before opening the related focus panel. */
  shakeLineId?: string;
  /** Demo-only: show the cart after one or more color-coded issues have resolved. */
  resolvedState?: "requirement" | "extras" | "correction";
  /** Demo-only: spotlight booking tracker tiles without changing the surface. */
  spotlightBlockIds?: string[];
};

export type SmartBarMobileApplyChoiceMeta = {
  selected: boolean;
  multiSelect: boolean;
  valueAlreadySelected: boolean;
  /** Stable identity of the specific group being edited. */
  optionGroupId?: string;
  optionGroupLabel?: string;
  /** Final requested portion count for this option. */
  quantity?: number;
};

type SmartBarMobileShellProps = {
  mode?: "lab" | "overlay";
  /** Demo-only underlay guard to prevent page controls from flashing through the scripted submit transition. */
  demoTransitionShield?: boolean;
  /** Demo-only: block direct user clicks, taps, focus, and typing while preserving scripted animation. */
  demoInteractionLocked?: boolean;
  /** Optional first-load callout shown above the footer launcher while SmartBar is at rest. */
  introCallout?: SmartBarMobileIntroCallout | null;
  /** Demo-only: render an element-owned cue directly on the rest-state SmartBar launcher capsule. */
  demoLauncherCue?: { active: boolean; label?: string; runKey?: string | number; showTooltip?: boolean } | null;
  /** Demo-only: render an element-owned cue directly on the active companion/submit capsule. */
  demoCompanionCue?: { active: boolean; label?: string; runKey?: string | number; showTooltip?: boolean } | null;
  /** Demo-only: render a pulse cue directly on one selected option pill inside a focus panel. */
  demoOptionCue?: { active: boolean; value: string; runKey?: string | number } | null;
  /** Demo-only: preload the entry composer with a draft before a scripted submit/open-cart step. */
  demoPresetEntryDraft?: { draft: string; runKey?: string | number } | null;
  /** Demo-only override for the rest-state center launcher pill content. */
  demoRestCompanion?: SmartBarMobileRestCompanion | null;
  /** Label shown in the companion pill when the entry box is empty. */
  entryModeLabel?: string;
  /** Label shown in the companion pill while the shared surface is being prepared. */
  buildingLabel?: string;
  /** Demo-only command hook for scripted mobile replays. Omit in normal use. */
  demoSubmission?: SmartBarMobileDemoSubmission | null;
  /** Demo-only: open/type the entry composer without moving browser focus, avoiding a mobile keyboard pop. */
  demoSuppressEntryFocus?: boolean;
  /** Demo-only staged surface hook for social reels. Omit in normal use. */
  demoMontageStage?: SmartBarMobileDemoMontageStage | null;
  /** Demo-only: let walkthrough mode use the staged social-reel capsule caption instead of native cart labels. */
  demoAllowWalkthroughMontageCaption?: boolean;
  /** Demo-only: force the active companion capsule to speak a scripted line without changing the open surface. */
  demoCompanionMessage?: SmartBarMobileCompanionMessage | null;
  /** Demo-only: hide the collapsed upper surface while keeping the footer controls alive. */
  demoHideCollapsedSurface?: boolean;
  /** Demo-only: force dense one-line cart rows outside the social montage state machine. */
  compactCartRows?: boolean;
  /** Demo-only: raise fixed overlay rails for contained playground/demo surfaces. */
  demoBottomLiftPx?: number;
  /** Optional maximum height for panels rendered inside a shorter contained preview. */
  containedPanelMaxHeight?: number;
  /** Demo-only: trimmed pizza cart for the restaurant walkthrough color explanation. */
  demoWalkthroughCartMode?: boolean;
  /** Demo-only reset hook for social reels that need to return the shell to rest. */
  demoResetToRestKey?: string | null;
  /** Confirmation number shown after a ready cart is sent as a SmartBar ticket. */
  sendOrderNumber?: string;
  onSubmitPrompt?: (query: string, meta?: SmartBarMobileSubmitMeta) => SmartBarMobileSubmitResult | Promise<SmartBarMobileSubmitResult>;
  onApplyLineChoice?: (line: SmartBarMobileOrderLine, value: string, meta?: SmartBarMobileApplyChoiceMeta) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onRemoveLine?: (line: SmartBarMobileOrderLine) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onSaveUnknownAsNote?: (line: SmartBarMobileOrderLine, note: string) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onAttachUnknownAsNote?: (
    line: SmartBarMobileOrderLine,
    targetLine: SmartBarMobileOrderLine,
    note: string,
  ) => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void;
  onNavigateToLine?: (line: SmartBarMobileOrderLine) => void;
  onGenericAction?: (action: SmartBarMobileGenericAction, result: SmartBarMobileGenericResult) => SmartBarMobileSubmitResult | Promise<SmartBarMobileSubmitResult> | void;
  onCartReady?: (result: SmartBarMobileOrderResult) => void;
  /** Notifies contained demos when the cart/review surface opens or closes. */
  onCartOpenChange?: (open: boolean) => void;
  /** Notifies contained demos only while the sent-order pickup confirmation is visible. */
  onPickupConfirmationOpenChange?: (open: boolean) => void;
  onOrderSent?: () => string | Promise<string | void> | void;
  onResetCart?: () => void;
};

function SmartBarPickupConfirmationCard({
  orderNumber,
  isDemo = false,
}: {
  orderNumber: string;
  isDemo?: boolean;
}) {
  return (
    <div
      data-smartbar-mobile-social-montage-stage={isDemo ? "confirmation" : undefined}
      className="overflow-hidden rounded-[24px] border border-white/14 bg-slate-950/68 px-5 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_26px_rgba(2,6,23,0.18)] ring-1 ring-white/10"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-200 text-emerald-950 shadow-[0_5px_14px_rgba(52,211,153,0.20)] ring-1 ring-white/50">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/90">
          Order sent
        </span>
      </div>

      <div className="mt-3 text-[3.35rem] font-black leading-none tracking-[-0.045em] text-white sm:text-[3.75rem]">
        {orderNumber}
      </div>
      <div className="mt-1.5 text-[13px] font-bold tracking-[-0.01em] text-white/86">
        Show at pickup
      </div>

      <div className="mx-auto mt-3.5 h-px max-w-[220px] bg-white/14" />
      <div className="mx-auto mt-3 max-w-[250px] text-[12px] font-semibold leading-4 text-white/58">
        Restaurant received your order.
      </div>
    </div>
  );
}

export default function SmartBarMobileShell({
  mode = "lab",
  demoTransitionShield = false,
  demoInteractionLocked = false,
  introCallout = null,
  demoLauncherCue = null,
  demoCompanionCue = null,
  demoOptionCue = null,
  demoPresetEntryDraft = null,
  demoRestCompanion = null,
  entryModeLabel = "Use phone mic or type",
  buildingLabel = "Building cart...",
  demoSubmission = null,
  demoSuppressEntryFocus = false,
  demoMontageStage = null,
  demoAllowWalkthroughMontageCaption = false,
  demoCompanionMessage = null,
  demoHideCollapsedSurface = false,
  compactCartRows = false,
  demoBottomLiftPx = 0,
  containedPanelMaxHeight,
  demoWalkthroughCartMode = false,
  demoResetToRestKey = null,
  sendOrderNumber = "S-184",
  onSubmitPrompt,
  onApplyLineChoice,
  onRemoveLine,
  onSaveUnknownAsNote,
  onAttachUnknownAsNote,
  onNavigateToLine,
  onGenericAction,
  onCartReady,
  onCartOpenChange,
  onPickupConfirmationOpenChange,
  onOrderSent,
  onResetCart,
}: SmartBarMobileShellProps) {
  const isOverlay = mode === "overlay";
  const demoInteractionPointerClass = demoInteractionLocked ? "pointer-events-none" : "pointer-events-auto";
  const overlayBottomLiftPx = Number.isFinite(demoBottomLiftPx) ? demoBottomLiftPx : 0;
  const entryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const retryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const genericContentMeasureRef = useRef<HTMLDivElement | null>(null);
  const selectedDetailMeasureRef = useRef<HTMLDivElement | null>(null);
  const selectedSummaryContentMeasureRef = useRef<HTMLDivElement | null>(null);
  const selectedChoiceContentMeasureRef = useRef<HTMLDivElement | null>(null);
  const selectedUnknownContentMeasureRef = useRef<HTMLDivElement | null>(null);
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const closeArmTimeoutRef = useRef<number | null>(null);
  const buildTimerRef = useRef<number | null>(null);
  const handoffCollapseTimerRef = useRef<number | null>(null);
  const handoffResetTimerRef = useRef<number | null>(null);
  const choiceLockedLineIdRef = useRef<string | null>(null);
  const choiceMutationRevisionRef = useRef(0);
  const adaptiveRailReturnTimerRef = useRef<number | null>(null);
  const adaptiveRailOffsetRef = useRef(0);
  const expandedBundleCompletionRef = useRef<{ lineId: string | null; complete: boolean }>({
    lineId: null,
    complete: false,
  });

  const [phase, setPhase] = useState<SmartBarMobilePhase>("rest");

  useEffect(() => {
    onCartOpenChange?.(phase === "building_cart" || phase === "cart");
  }, [onCartOpenChange, phase]);

  const [entryDraft, setEntryDraft] = useState("");
  const [entryFocused, setEntryFocused] = useState(false);
  const [hasEditedEntryDraft, setHasEditedEntryDraft] = useState(false);
  const [submittedPromptPreview, setSubmittedPromptPreview] = useState("");
  const [buildingStatusLabel, setBuildingStatusLabel] = useState(buildingLabel);
  const [retryDraft, setRetryDraft] = useState("");
  const [candidateManualEntryOpen, setCandidateManualEntryOpen] = useState(false);
  const [candidateSubmittingItemId, setCandidateSubmittingItemId] = useState<string | null>(null);
  const [candidateFailedItemId, setCandidateFailedItemId] = useState<string | null>(null);
  const [orderLines, setOrderLines] = useState<SmartBarMobileOrderLine[]>(demoLines);
  const [orderPricingMode, setOrderPricingMode] = useState<string>("exact");
  const [orderEstimatedSubtotal, setOrderEstimatedSubtotal] = useState<string | undefined>(undefined);
  const [orderEstimatedTax, setOrderEstimatedTax] = useState<string | undefined>(undefined);
  const [orderEstimatedTotal, setOrderEstimatedTotal] = useState(estimatedTotal);
  const [genericResult, setGenericResult] = useState<SmartBarMobileGenericResult | null>(null);
  const [measuredGenericPanelHeight, setMeasuredGenericPanelHeight] = useState<number | null>(null);
  const [measuredSelectedSummaryPanelHeight, setMeasuredSelectedSummaryPanelHeight] = useState<number | null>(null);
  const [measuredSelectedChoicePanelHeight, setMeasuredSelectedChoicePanelHeight] = useState<number | null>(null);
  const [measuredSelectedUnknownPanelHeight, setMeasuredSelectedUnknownPanelHeight] = useState<number | null>(null);
  const [hasCart, setHasCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [handoffState, setHandoffState] = useState<SmartBarMobileHandoffState>("idle");
  const [closeArmed, setCloseArmed] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedOptionGroupOverride, setSelectedOptionGroupOverride] = useState<{ lineKey: string; groupId: string } | null>(null);
  const [conditionalReturnContext, setConditionalReturnContext] = useState<{ lineKey: string; groupId: string } | null>(null);
  const [expandedBundleLineId, setExpandedBundleLineId] = useState<string | null>(null);
  const [selectedDetailMode, setSelectedDetailMode] = useState<"choices" | "summary">("choices");
  const [lineOverrides, setLineOverrides] = useState<Record<string, DemoLineOverride>>({});
  const [reviewedOptionLineKeys, setReviewedOptionLineKeys] = useState<Record<string, true>>({});
  const [retryCheckingLineId, setRetryCheckingLineId] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<{ lineId: string; groupId?: string; value: string } | null>(null);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [adaptiveRailOffset, setAdaptiveRailOffset] = useState(0);
  const [introTypedTitle, setIntroTypedTitle] = useState("");
  const [introCalloutDismissed, setIntroCalloutDismissed] = useState(false);
  const pickupConfirmationOpen =
    phase === "cart" &&
    genericResult?.surfaceKind === "info" &&
    genericResult.statusLabel === "Order sent";

  useEffect(() => {
    setCandidateManualEntryOpen(false);
    setCandidateSubmittingItemId(null);
    setCandidateFailedItemId(null);
  }, [selectedLineId]);

  useEffect(() => {
    if (!selectedLineId) {
      setSelectedOptionGroupOverride(null);
      setConditionalReturnContext(null);
      return;
    }

    setConditionalReturnContext((current) => (
      current && current.lineKey !== selectedLineId ? null : current
    ));
  }, [selectedLineId]);

  useEffect(() => {
    onPickupConfirmationOpenChange?.(pickupConfirmationOpen);
  }, [onPickupConfirmationOpenChange, pickupConfirmationOpen]);

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
    const handleAdaptiveRailReset = () => returnRailToCenter();
    const handleResize = () => returnRailToCenter();

    window.addEventListener("smartbar:spotlight-target", handleSpotlightTarget);
    window.addEventListener("smartbar:spotlight-clear", handleSpotlightClear);
    window.addEventListener("smartbar:adaptive-rail-reset", handleAdaptiveRailReset);
    window.addEventListener("resize", handleResize);

    return () => {
      clearRailTimer();
      window.removeEventListener("smartbar:spotlight-target", handleSpotlightTarget);
      window.removeEventListener("smartbar:spotlight-clear", handleSpotlightClear);
      window.removeEventListener("smartbar:adaptive-rail-reset", handleAdaptiveRailReset);
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

    const typeDelayMs = introCallout?.typeDelayMs ?? 36;
    const startDelayMs = introCallout?.startDelayMs ?? 260;

    const delayId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setIntroTypedTitle(title.slice(0, index));

        if (index >= title.length && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }, typeDelayMs);
    }, startDelayMs);

    return () => {
      window.clearTimeout(delayId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [introCallout?.title, introCallout?.typeDelayMs, introCallout?.startDelayMs, phase]);

  const mobileShellSideInset = 36;
  const isBookingGenericSurface =
    genericResult?.surfaceKind === "booking_tour" ||
    genericResult?.surfaceKind === "booking_summary";
  const isDesktopBookingGenericSurface = isOverlay && stableViewportWidth >= 768 && isBookingGenericSurface;
  const mobileShellMaxWidth = 390;
  const entryPillWidth = Math.min(Math.max(stableViewportWidth - mobileShellSideInset * 2, 240), mobileShellMaxWidth);
  const introTypeCharCount = Math.max(1, introTypedTitle.length);
  const introTypeMaxWidth = Math.min(entryPillWidth - 22, 336);
  const introTypeCapsuleWidth = Math.min(Math.max(42, introTypeCharCount * 8.35 + 34), introTypeMaxWidth);
  const introTypeGlassWidth = Math.min(Math.max(70, introTypeCapsuleWidth + 24), entryPillWidth);
  const smartBarAdaptiveRailVisibleOffset = phase === "rest" ? 0 : adaptiveRailOffset;
  const smartBarAdaptiveRailStyle: CSSProperties = {
    transform: `translate3d(${smartBarAdaptiveRailVisibleOffset}px, 0, 0)`,
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
  const containedPanelHeightLimit = Number.isFinite(containedPanelMaxHeight)
    ? Math.max(260, Math.floor(containedPanelMaxHeight as number))
    : null;
  const viewportCartPanelHeight = Math.max(360, stableViewportHeight - 128);
  const maxCartPanelHeight = containedPanelHeightLimit === null
    ? viewportCartPanelHeight
    : Math.min(viewportCartPanelHeight, containedPanelHeightLimit);
  const isDemoConfirmationPanel = demoMontageStage?.surface === "confirmation";
  const viewportGenericPanelHeight = Math.max(320, Math.floor(stableViewportHeight * (isDesktopBookingGenericSurface ? 0.88 : isDemoConfirmationPanel ? 0.88 : 0.75)));
  const maxGenericPanelHeight = containedPanelHeightLimit === null
    ? viewportGenericPanelHeight
    : Math.min(viewportGenericPanelHeight, containedPanelHeightLimit);
  const adaptiveSurfaceMaxHeight = containedPanelHeightLimit === null
    ? Math.max(260, stableViewportHeight - 88 - keyboardLift)
    : Math.min(
        containedPanelHeightLimit,
        Math.max(260, stableViewportHeight - 88 - keyboardLift),
      );

  const lines = useMemo(() => {
    const overriddenLines = smartBarMobileMapLineTree(orderLines, (line) => {
      const lineInstanceKey = smartBarMobileLineInstanceKey(line);
      const mergedLine: SmartBarMobileOrderLine = {
        ...line,
        ...(lineOverrides[lineInstanceKey] || {}),
      };
      const optionGroups = smartBarMobileLineOptionGroups(mergedLine);
      const optionalGroups = optionGroups.filter(smartBarMobileOptionGroupIsOptional);
      const unreviewedOptionalGroups = smartBarMobileUnreviewedOptionalGroups(
        mergedLine,
        reviewedOptionLineKeys,
      );
      const activeGroup = smartBarMobileActiveOptionGroup(mergedLine, reviewedOptionLineKeys);
      const activeLine = activeGroup
        ? smartBarMobileLineWithActiveOptionGroup(
            { ...mergedLine, optionGroups },
            activeGroup,
          )
        : mergedLine;

      if (
        optionalGroups.length > 0 &&
        mergedLine.status !== "pending" &&
        mergedLine.status !== "unknown"
      ) {
        if (unreviewedOptionalGroups.length > 0) {
          return {
            ...activeLine,
            status: "options" as const,
            helper: activeGroup?.label
              ? `Review ${activeGroup.label.toLowerCase()}`
              : "Options available",
          };
        }

        return {
          ...activeLine,
          status: "ready" as const,
          helper: "Reviewed and ready",
        };
      }

      return activeLine;
    });
    return smartBarMobileRollupBundleTree(overriddenLines);
  }, [lineOverrides, orderLines, reviewedOptionLineKeys]);

  const noteTargetChoices = useMemo(() => smartBarMobileNoteTargetChoices(lines), [lines]);
  const selectedLineSource = smartBarMobileFindLineInTree(lines, selectedLineId);
  const selectedLineSourceInstanceKey = selectedLineSource
    ? smartBarMobileLineInstanceKey(selectedLineSource)
    : "";
  const selectedLineSourceOptionGroups = selectedLineSource
    ? smartBarMobileLineOptionGroups(selectedLineSource)
    : [];
  const requestedOptionGroupOverrideId = selectedOptionGroupOverride?.lineKey === selectedLineSourceInstanceKey
    ? selectedOptionGroupOverride.groupId
    : null;
  const selectedOptionGroupOverrideGroup = requestedOptionGroupOverrideId
    ? selectedLineSourceOptionGroups.find((group) => group.id === requestedOptionGroupOverrideId) || null
    : null;
  const selectedOptionGroupOverrideId = selectedOptionGroupOverrideGroup?.id || null;
  const selectedLine = selectedLineSource && selectedOptionGroupOverrideGroup
    ? smartBarMobileLineWithActiveOptionGroup(
        {
          ...selectedLineSource,
          activeOptionGroupId: selectedOptionGroupOverrideGroup.id,
        },
        selectedOptionGroupOverrideGroup,
      )
    : selectedLineSource;
  const expandedBundleLine = smartBarMobileFindLineInTree(lines, expandedBundleLineId);
  const selectedLineInstanceKey = selectedLine ? smartBarMobileLineInstanceKey(selectedLine) : "";

  const selectedLineOptionGroups = selectedLine ? smartBarMobileLineOptionGroups(selectedLine) : [];
  const selectedLineActiveOptionGroup = selectedLine
    ? selectedLineOptionGroups.find((group) => group.id === selectedLine.activeOptionGroupId) ||
      smartBarMobileActiveOptionGroup(selectedLine, reviewedOptionLineKeys)
    : null;
  const selectedLineActiveOptionGroupIndex = selectedLineActiveOptionGroup
    ? selectedLineOptionGroups.findIndex((group) => group.id === selectedLineActiveOptionGroup.id)
    : -1;
  const selectedLineActiveConditionalParentOptionGroup = selectedLine && selectedLineActiveOptionGroup
    ? smartBarMobileActiveConditionalParentGroup(selectedLine, selectedLineActiveOptionGroup)
    : null;
  const selectedLinePreviousOptionGroup = selectedLineActiveConditionalParentOptionGroup || (
    selectedLineActiveOptionGroupIndex > 0
      ? selectedLineOptionGroups[selectedLineActiveOptionGroupIndex - 1]
      : null
  );
  const selectedLineNextOptionGroup = (
    selectedLineActiveOptionGroupIndex >= 0 &&
    selectedLineActiveOptionGroupIndex < selectedLineOptionGroups.length - 1
  )
    ? selectedLineOptionGroups[selectedLineActiveOptionGroupIndex + 1]
    : null;
  const selectedLineConditionalReturnOptionGroup = selectedLine && selectedLineActiveOptionGroup
    ? (
        conditionalReturnContext?.lineKey === selectedLineInstanceKey
          ? selectedLineOptionGroups.find((group) => group.id === conditionalReturnContext.groupId) || null
          : smartBarMobileConditionalReturnGroup(selectedLine, selectedLineActiveOptionGroup)
      )
    : null;
  const selectedLineActiveOptionGroupConditionalDescendantIds = selectedLine && selectedLineActiveOptionGroup
    ? smartBarMobileOptionGroupDescendantIds(selectedLine, selectedLineActiveOptionGroup)
    : [];
  const selectedLineActiveOptionGroupIsMultiSelectConditionalRoot = Boolean(
    selectedLine &&
    selectedLineActiveOptionGroup &&
    selectedLineActiveOptionGroup.selectionMode === "multi" &&
    selectedLineActiveOptionGroupConditionalDescendantIds.length > 0 &&
    !smartBarMobileActiveConditionalParentGroup(selectedLine, selectedLineActiveOptionGroup),
  );
  const selectedLineConditionalHomeOptionGroup = selectedLineConditionalReturnOptionGroup || (
    selectedLineActiveOptionGroupIsMultiSelectConditionalRoot
      ? selectedLineActiveOptionGroup
      : null
  );
  const selectedLineAtConditionalHomeGroup = Boolean(
    selectedLineConditionalHomeOptionGroup &&
    selectedLineActiveOptionGroup?.id === selectedLineConditionalHomeOptionGroup.id,
  );
  const selectedLineActiveGroupHasSelectedChild = Boolean(
    selectedLine &&
    selectedLineActiveOptionGroup &&
    smartBarMobileOptionGroupHasSelectedActiveChild(selectedLine, selectedLineActiveOptionGroup),
  );
  const selectedLineActiveDirectChildAttentionGroup = selectedLine && selectedLineActiveOptionGroup
    ? smartBarMobileOptionGroupDirectChildAttentionGroup(
        selectedLine,
        selectedLineActiveOptionGroup,
        reviewedOptionLineKeys,
      )
    : null;
  const selectedLineConditionalBranchIsTerminal = Boolean(
    selectedLineConditionalReturnOptionGroup &&
    selectedLineActiveOptionGroup &&
    selectedLineActiveOptionGroup.id !== selectedLineConditionalReturnOptionGroup.id &&
    !selectedLineActiveGroupHasSelectedChild,
  );
  const selectedLineConditionalDescendantIds = selectedLine && selectedLineConditionalHomeOptionGroup
    ? new Set(smartBarMobileOptionGroupDescendantIds(selectedLine, selectedLineConditionalHomeOptionGroup))
    : new Set<string>();
  const selectedLineConditionalDescendantAttentionGroup = selectedLineAtConditionalHomeGroup && selectedLine
    ? selectedLineOptionGroups.find((group) => (
        selectedLineConditionalDescendantIds.has(group.id) &&
        (
          (!smartBarMobileOptionGroupIsOptional(group) && smartBarMobileOptionGroupNeedsRequiredChoice(group)) ||
          (
            smartBarMobileOptionGroupIsOptional(group) &&
            !smartBarMobileHasReviewedOptionGroupKey(selectedLine, group.id, reviewedOptionLineKeys)
          )
        )
      )) || null
    : null;
  const selectedLineNextMainOptionGroup = selectedLineAtConditionalHomeGroup && selectedLineConditionalHomeOptionGroup
    ? selectedLineOptionGroups.find((group, index) => (
        index > selectedLineActiveOptionGroupIndex &&
        !selectedLineConditionalDescendantIds.has(group.id)
      )) || null
    : null;
  const selectedLineActiveOptionGroupIsOptional = Boolean(
    selectedLineActiveOptionGroup &&
    smartBarMobileOptionGroupIsOptional(selectedLineActiveOptionGroup),
  );
  const selectedLineActiveOptionGroupIsReviewed = Boolean(
    selectedLine &&
    selectedLineActiveOptionGroup &&
    smartBarMobileHasReviewedOptionGroupKey(
      selectedLine,
      selectedLineActiveOptionGroup.id,
      reviewedOptionLineKeys,
    ),
  );
  const selectedLineActiveOptionGroupNeedsRequiredChoice = Boolean(
    selectedLineActiveOptionGroup &&
    !selectedLineActiveOptionGroupIsOptional &&
    smartBarMobileOptionGroupNeedsRequiredChoice(selectedLineActiveOptionGroup),
  );
  const selectedLineUnreviewedOptionalGroups = selectedLine
    ? smartBarMobileUnreviewedOptionalGroups(selectedLine, reviewedOptionLineKeys)
    : [];
  const selectedLineRemainingOptionalReviewCount = selectedLineUnreviewedOptionalGroups.length;
  const selectedLineFullTitle = smartBarMobileLineFullTitle(selectedLine);
  const selectedLineSelectedDetails = smartBarMobileLineSelectedDetails(selectedLine);
  const selectedLineSummaryGroups = smartBarMobileSelectionSummaryGroups(selectedLine);
  const selectedLineSummarySelections = selectedLineSummaryGroups.flatMap((group) => group.selections);
  const selectedLineMissingDetails = smartBarMobileLineMissingDetails(selectedLine);
  const selectedLineHasOptions = Boolean(selectedLine?.options?.length);
  const selectedLineCandidateResolution = selectedLine?.status === "unknown"
    ? selectedLine.candidateResolution || null
    : null;
  const selectedLineDirectNoteRouting = Boolean(
    selectedLine?.status === "unknown" &&
      !selectedLineCandidateResolution,
  );
  const selectedLineGrayReason = selectedLine?.status === "unknown"
    ? String(selectedLine.displayReason || selectedLine.helper || "Not recognized").replace(/\s+/g, " ").trim()
    : "";
  const selectedLineGrayPlaceholder = selectedLineCandidateResolution
    ? "Type exactly what you want the restaurant to receive..."
    : "Retry menu item or leave note...";
  const selectedLineHasSummarySelections = selectedLineSummarySelections.length > 0;
  const selectedLineNoChoicesNeeded = Boolean(
    selectedLine &&
      selectedLine.status === "ready" &&
      !selectedLineHasOptions &&
      !smartBarMobileLineHasAttachedCustomerNote(selectedLine) &&
      selectedLineSelectedDetails.length === 0 &&
      selectedLineMissingDetails.length === 0,
  );
  const selectedLineIsReviewedReady = Boolean(
    selectedLine &&
      selectedLine.status === "ready" &&
      /reviewed and ready/i.test(String(selectedLine.helper || "")),
  );
  const selectedLineUseLightReadyDetail = Boolean(
    selectedLine &&
      selectedLine.status === "ready" &&
      !selectedLine.isCustomerNote,
  );
  const selectedLineUseLightChoiceDetail = Boolean(
    selectedLine &&
      (selectedLine.status === "pending" || selectedLine.status === "options") &&
      !selectedLine.isCustomerNote,
  );
  const selectedLineUseLightUnknownDetail = Boolean(
    selectedLine &&
      selectedLine.status === "unknown",
  );
  const selectedLineUseLightCustomerNoteDetail = Boolean(
    selectedLine?.isCustomerNote,
  );
  const selectedLineUseLightThemedDetail = Boolean(
    selectedLineUseLightReadyDetail ||
      selectedLineUseLightChoiceDetail ||
      selectedLineUseLightUnknownDetail ||
      selectedLineUseLightCustomerNoteDetail,
  );
  const selectedLineUseLightThemedSummary = Boolean(
    selectedLineUseLightThemedDetail &&
      selectedDetailMode === "summary",
  );
  const selectedLineUseConditionalDetail = Boolean(
    selectedLine &&
      selectedLineActiveOptionGroup &&
      selectedLineUseLightThemedDetail &&
      (
        selectedLineActiveConditionalParentOptionGroup ||
        selectedLineActiveOptionGroupConditionalDescendantIds.length > 0 ||
        selectedLineConditionalReturnOptionGroup
      ),
  );
  const selectedLineConditionalContextParentLabel = selectedLine && selectedLineActiveOptionGroup
    ? (
        selectedLineActiveConditionalParentOptionGroup
          ? smartBarMobileConditionalParentOptionLabel(selectedLine, selectedLineActiveOptionGroup)
          : selectedLineConditionalDescendantAttentionGroup
            ? smartBarMobileConditionalOwnerOptionLabel(
                selectedLine,
                selectedLineActiveOptionGroup,
                selectedLineConditionalDescendantAttentionGroup.id,
              )
            : ""
      )
    : "";
  const selectedLineConditionalContextChildLabel = String(
    selectedLineAtConditionalHomeGroup && selectedLineConditionalDescendantAttentionGroup
      ? selectedLineConditionalDescendantAttentionGroup.label
      : selectedLineActiveOptionGroup?.label || selectedLine?.optionGroupLabel || "Choices",
  ).replace(/\s+/g, " ").trim();
  const selectedLineConditionalDisplayTitle = selectedLineActiveConditionalParentOptionGroup
    ? selectedLineConditionalContextParentLabel || selectedLineConditionalContextChildLabel
    : selectedLineConditionalContextChildLabel;
  const selectedLineConditionalDisplayPrompt = selectedLineActiveConditionalParentOptionGroup
    ? smartBarMobileSimplifyConditionalChildLabel(
        selectedLineConditionalContextChildLabel,
        selectedLineConditionalContextParentLabel,
      )
    : "";
  const selectedLineReadyHeaderLabel = selectedLineIsReviewedReady ? "Reviewed" : "Ready";
  const selectedLineCustomerOriginalRequest = selectedLine?.isCustomerNote
    ? String(
        selectedLine.originalUnknownText ||
        selectedLine.details?.find((detail) => /^original request\s*:/i.test(String(detail || "")))?.replace(
          /^original request\s*:\s*/i,
          "",
        ) ||
        "",
      ).replace(/\s+/g, " ").trim()
    : "";
  const selectedLineCustomerNoteText = selectedLine?.isCustomerNote
    ? String(
        selectedLine.customerNote ||
        selectedLine.details?.find((detail) => /^customer note\s*:/i.test(String(detail || "")))?.replace(
          /^customer note\s*:\s*/i,
          "",
        ) ||
        selectedLine.helper ||
        "",
      ).replace(/\s+/g, " ").trim()
    : "";
  const selectedLineThemedHeaderEyebrow = selectedLineUseLightUnknownDetail
    ? selectedLineCandidateResolution ? "Quick clarification" : "Attach note"
    : selectedLineUseLightCustomerNoteDetail
      ? "Customer note"
      : "Item details";
  const selectedLineThemedHeaderStatusLabel = selectedLineUseLightUnknownDetail
    ? selectedLineCandidateResolution ? "3 close matches" : "Select item"
    : selectedLineUseLightCustomerNoteDetail
      ? "Saved"
      : selectedLineUseLightReadyDetail
        ? selectedLineReadyHeaderLabel
        : statusLabel(selectedLine?.status || "unknown");
  const selectedLineThemedHeaderAriaLabel = selectedLineUseLightUnknownDetail
    ? selectedLineCandidateResolution
      ? "Three close menu matches; choose one to continue"
      : "Select the item this note belongs with"
    : selectedLineUseLightCustomerNoteDetail
      ? "Saved customer note"
      : selectedLineUseLightReadyDetail
        ? selectedLineIsReviewedReady ? "Reviewed and ready" : "Ready"
        : statusLabel(selectedLine?.status || "unknown");
  const selectedLineThemedHeaderTitle = selectedLineDirectNoteRouting
    ? "Attach note to?"
    : selectedLineUseLightCustomerNoteDetail
      ? selectedLineCustomerNoteText || selectedLineFullTitle || "Customer note"
      : selectedLineFullTitle || smartBarMobileShortTitle(selectedLine?.title || "");

  useEffect(() => {
    if (selectedLineNoChoicesNeeded) {
      setSelectedDetailMode("summary");
    }
  }, [selectedLineId, selectedLineNoChoicesNeeded]);

  const selectedSummaryMeasurementKey = [
    selectedLineInstanceKey,
    selectedLine?.status || "",
    selectedLine?.price || "",
    selectedLineCustomerOriginalRequest,
    selectedLineCustomerNoteText,
    ...selectedLineSummaryGroups.flatMap((group) => [group.label, ...group.selections]),
    ...selectedLineMissingDetails,
  ].join("\u001f");
  const selectedChoiceMeasurementKey = [
    selectedLineInstanceKey,
    selectedLine?.status || "",
    selectedLineActiveOptionGroup?.id || "",
    selectedLineConditionalDisplayTitle,
    selectedLineConditionalDisplayPrompt,
    ...(selectedLine?.options || []),
    ...(selectedLine?.details || []),
  ].join("\u001f");
  const selectedUnknownMinimumPanelHeight = selectedLineCandidateResolution
    ? candidateManualEntryOpen ? 420 : 300
    : selectedLineDirectNoteRouting ? 300 : 430;
  const selectedUnknownMeasurementKey = [
    selectedLineInstanceKey,
    selectedLine?.status || "",
    selectedLineGrayReason,
    selectedLineGrayPlaceholder,
    candidateManualEntryOpen ? "candidate-manual-open" : "candidate-manual-closed",
    ...(selectedLineCandidateResolution?.candidates || []).flatMap((candidate) => [
      candidate.itemId,
      candidate.label,
    ]),
  ].join("\u001f");

  useLayoutEffect(() => {
    const shouldMeasureUnknown = Boolean(
      phase === "cart" &&
      cartExpanded &&
      selectedLine?.status === "unknown",
    );

    if (!shouldMeasureUnknown) {
      setMeasuredSelectedUnknownPanelHeight(null);
      return;
    }

    let frame = 0;
    let firstTimer = 0;
    let secondTimer = 0;

    const measureUnknown = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const detailNode = selectedDetailMeasureRef.current;
        const intrinsicUnknownNode = selectedUnknownContentMeasureRef.current;
        if (!detailNode || !intrinsicUnknownNode) return;

        const detailRect = detailNode.getBoundingClientRect();
        const unknownRect = intrinsicUnknownNode.getBoundingClientRect();
        const contentTop = Math.max(0, unknownRect.top - detailRect.top);
        const intrinsicContentHeight = Math.ceil(intrinsicUnknownNode.scrollHeight);
        const desiredHeight = Math.ceil(contentTop + intrinsicContentHeight + 28);
        if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) return;

        const clampedHeight = Math.min(
          maxCartPanelHeight,
          Math.max(selectedUnknownMinimumPanelHeight, desiredHeight),
        );

        setMeasuredSelectedUnknownPanelHeight((current) => (
          current === clampedHeight ? current : clampedHeight
        ));
      });
    };

    measureUnknown();
    firstTimer = window.setTimeout(measureUnknown, 60);
    secondTimer = window.setTimeout(measureUnknown, 220);

    const intrinsicUnknownNode = selectedUnknownContentMeasureRef.current;
    const observer = intrinsicUnknownNode && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measureUnknown)
      : null;
    observer?.observe(intrinsicUnknownNode as Element);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      observer?.disconnect();
    };
  }, [
    cartExpanded,
    maxCartPanelHeight,
    phase,
    selectedLine?.status,
    selectedUnknownMeasurementKey,
    selectedUnknownMinimumPanelHeight,
  ]);

  useLayoutEffect(() => {
    const shouldMeasureChoices = Boolean(
      phase === "cart" &&
      cartExpanded &&
      selectedLine &&
      selectedDetailMode === "choices" &&
      selectedLineUseConditionalDetail,
    );

    if (!shouldMeasureChoices) {
      setMeasuredSelectedChoicePanelHeight(null);
      return;
    }

    let frame = 0;
    let firstTimer = 0;
    let secondTimer = 0;

    const measureChoices = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const detailNode = selectedDetailMeasureRef.current;
        const intrinsicChoicesNode = selectedChoiceContentMeasureRef.current;
        if (!detailNode || !intrinsicChoicesNode) return;

        const detailRect = detailNode.getBoundingClientRect();
        const choicesRect = intrinsicChoicesNode.getBoundingClientRect();
        const contentTop = Math.max(0, choicesRect.top - detailRect.top);
        const intrinsicContentHeight = Math.ceil(intrinsicChoicesNode.scrollHeight);
        const desiredHeight = Math.ceil(contentTop + intrinsicContentHeight + 28);
        if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) return;

        const clampedHeight = Math.min(
          maxCartPanelHeight,
          Math.max(320, desiredHeight),
        );

        setMeasuredSelectedChoicePanelHeight((current) => (
          current === clampedHeight ? current : clampedHeight
        ));
      });
    };

    measureChoices();
    firstTimer = window.setTimeout(measureChoices, 60);
    secondTimer = window.setTimeout(measureChoices, 220);

    const intrinsicChoicesNode = selectedChoiceContentMeasureRef.current;
    const observer = intrinsicChoicesNode && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measureChoices)
      : null;
    observer?.observe(intrinsicChoicesNode as Element);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      observer?.disconnect();
    };
  }, [
    cartExpanded,
    maxCartPanelHeight,
    phase,
    selectedChoiceMeasurementKey,
    selectedDetailMode,
    selectedLine,
    selectedLineUseConditionalDetail,
  ]);

  useLayoutEffect(() => {
    const shouldMeasureSummary = Boolean(
      phase === "cart" &&
      cartExpanded &&
      selectedLine &&
      !selectedLineNoChoicesNeeded &&
      selectedDetailMode === "summary",
    );

    if (!shouldMeasureSummary) {
      setMeasuredSelectedSummaryPanelHeight(null);
      return;
    }

    let frame = 0;
    let firstTimer = 0;
    let secondTimer = 0;

    const measureSummary = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const detailNode = selectedDetailMeasureRef.current;
        const summaryNode = selectedSummaryContentMeasureRef.current;
        if (!detailNode || !summaryNode) return;

        const detailRect = detailNode.getBoundingClientRect();
        const summaryRect = summaryNode.getBoundingClientRect();
        const contentTop = Math.max(0, summaryRect.top - detailRect.top);
        const intrinsicContentHeight = Math.ceil(summaryNode.scrollHeight);
        const desiredHeight = Math.ceil(contentTop + intrinsicContentHeight + 28);
        if (!Number.isFinite(desiredHeight) || desiredHeight <= 0) return;

        const clampedHeight = Math.min(
          maxCartPanelHeight,
          Math.max(320, desiredHeight),
        );

        setMeasuredSelectedSummaryPanelHeight((current) => (
          current === clampedHeight ? current : clampedHeight
        ));
      });
    };

    measureSummary();
    firstTimer = window.setTimeout(measureSummary, 60);
    secondTimer = window.setTimeout(measureSummary, 220);

    const summaryNode = selectedSummaryContentMeasureRef.current;
    const observer = summaryNode && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measureSummary)
      : null;
    observer?.observe(summaryNode as Element);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      observer?.disconnect();
    };
  }, [
    cartExpanded,
    maxCartPanelHeight,
    phase,
    selectedDetailMode,
    selectedLine,
    selectedLineNoChoicesNeeded,
    selectedSummaryMeasurementKey,
  ]);

  const expandedBundleCompletionKey = (expandedBundleLine?.bundleComponents || [])
    .map((component) => `${smartBarMobileLineInstanceKey(component)}:${component.status}`)
    .join("|");

  useEffect(() => {
    if (!expandedBundleLineId || !expandedBundleLine) {
      expandedBundleCompletionRef.current = { lineId: null, complete: false };
      if (expandedBundleLineId && !expandedBundleLine) setExpandedBundleLineId(null);
      return;
    }

    const complete = smartBarMobileBundleIsComplete(expandedBundleLine);
    const previous = expandedBundleCompletionRef.current;
    if (previous.lineId !== expandedBundleLineId) {
      expandedBundleCompletionRef.current = { lineId: expandedBundleLineId, complete };
      return;
    }

    expandedBundleCompletionRef.current = { lineId: expandedBundleLineId, complete };
    if (previous.complete || !complete) return;

    const timer = window.setTimeout(() => {
      setSelectedLineId(null);
      setSelectedDetailMode("choices");
      setExpandedBundleLineId(null);
      setCartExpanded(true);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [expandedBundleCompletionKey, expandedBundleLine, expandedBundleLineId]);

  const blockingIssueCount = lines.filter((line) => line.status === "pending").length;
  const unknownCount = lines.filter((line) => line.status === "unknown").length;
  const cartGuidanceStatus: SmartBarMobileOrderStatus | null = !genericResult && lines.length > 0
    ? blockingIssueCount > 0
      ? "pending"
      : unknownCount > 0
        ? "unknown"
        : null
    : null;
  const walkthroughGuidanceStatusOverride: SmartBarMobileOrderStatus | null =
    demoWalkthroughCartMode && demoMontageStage?.status ? demoMontageStage.status : null;
  const effectiveCartGuidanceStatus: SmartBarMobileOrderStatus | null =
    walkthroughGuidanceStatusOverride ?? cartGuidanceStatus;
  const unresolvedBlockingCount = blockingIssueCount + unknownCount;
  const visibleCartLines: SmartBarMobileOrderLine[] = expandedBundleLineId
    ? lines.flatMap<SmartBarMobileOrderLine>((line) => {
        const lineKey = smartBarMobileLineInstanceKey(line);
        if (lineKey !== expandedBundleLineId) {
          return [{ ...line, bundleDisplayRole: "dimmed_other" as const }];
        }

        return [
          { ...line, bundleDisplayRole: "dimmed_parent" as const },
          ...(line.bundleComponents || []).map((component) => ({
            ...component,
            price: "",
            priceSuppressed: true,
            bundleDisplayRole: "component" as const,
          })),
        ];
      })
    : lines;
  const checkoutReady = !genericResult && lines.length > 0 && cartGuidanceStatus === null;
  const handoffLocked = handoffState !== "idle";
  const restaurantCalculatedPricing = orderPricingMode === "restaurant-calculated";
  const cartTotals = smartBarMobileTotalsFromLines(lines, {
    subtotal: orderEstimatedSubtotal,
    tax: orderEstimatedTax,
    total: orderEstimatedTotal,
  });
  const cartTotalMotionKey = `${phase}-${lines.length}-${cartTotals.totalLabel}`;
  const measuredGenericSurfaceHeight = measuredGenericPanelHeight
    ? Math.min(maxGenericPanelHeight, Math.max(240, measuredGenericPanelHeight + 18))
    : null;
  const chatPanelEstimatedHeight = measuredGenericSurfaceHeight
    ? Math.min(maxGenericPanelHeight, Math.max(200, measuredGenericSurfaceHeight))
    : Math.min(maxGenericPanelHeight, Math.max(200, genericResult?.height ?? 200));
  const shellChatPanelHeight = Math.min(maxGenericPanelHeight, Math.max(456, genericResult?.height ?? 456));
  const bookingPanelMeasuredHeight =
    genericResult &&
    genericResult.surfaceKind === "booking_summary" &&
    measuredGenericSurfaceHeight
      ? Math.min(maxGenericPanelHeight, Math.max(260, measuredGenericSurfaceHeight))
      : null;
  const genericPanelHeight = genericResult
    ? genericResult.surfaceKind === "chat_shell"
      ? shellChatPanelHeight
      : genericResult.surfaceKind === "chat"
        ? chatPanelEstimatedHeight
        : genericResult.surfaceKind === "info"
          ? measuredGenericSurfaceHeight ?? Math.min(maxGenericPanelHeight, Math.max(360, (genericResult.height ?? 420) + 18))
          : genericResult.surfaceKind === "booking_tour"
            ? measuredGenericSurfaceHeight ?? Math.min(maxGenericPanelHeight, Math.max(280, (genericResult.height ?? 320) + 18))
            : bookingPanelMeasuredHeight ?? Math.min(maxGenericPanelHeight, Math.max(280, (genericResult.height ?? 388) + 18))
    : 0;

  const genericMeasurementContentDependency =
    genericResult &&
    (genericResult.surfaceKind === "booking_tour" || genericResult.surfaceKind === "booking_summary")
      ? null
      : genericResult?.content;

  useEffect(() => {
    if (!genericResult) {
      setMeasuredGenericPanelHeight(null);
      return;
    }

    const node = genericContentMeasureRef.current;
    const isChat = genericResult.surfaceKind === "chat";
    const fallbackHeight = Math.min(maxGenericPanelHeight, Math.max(isChat ? 200 : 280, genericResult.height ?? (isChat ? 200 : 360)));
    setMeasuredGenericPanelHeight((current) => current === fallbackHeight ? current : fallbackHeight);

    let frame = 0;
    const measureSurface = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextHeight = Math.ceil(node?.scrollHeight || 0);
        if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;

        setMeasuredGenericPanelHeight((current) => {
          const clampedHeight = Math.min(
            maxGenericPanelHeight,
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
        const clampedHeight = Math.min(maxGenericPanelHeight, Math.max(200, Math.ceil(nextHeight)));
        return current === clampedHeight ? current : clampedHeight;
      });
    };

    window.addEventListener("smartbar-mobile-chat-height", handleChatHeight as EventListener);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("smartbar-mobile-chat-height", handleChatHeight as EventListener);
    };
  }, [genericResult?.surfaceKind, genericResult?.title, genericMeasurementContentDependency, genericResult?.height, maxGenericPanelHeight]);

  const demoWalkthroughCleanCartSurface = Boolean(
    demoWalkthroughCartMode &&
      demoMontageStage &&
      !genericResult &&
      !selectedLine &&
      (demoMontageStage.surface === "carts" ||
        demoMontageStage.surface === "checkout" ||
        demoMontageStage.surface === "confirmation"),
  );
  const demoWalkthroughDecisionPanelSwap = Boolean(
    demoWalkthroughCartMode &&
      demoMontageStage?.id?.includes("restaurant-walkthrough-decisions"),
  );
  const demoWalkthroughHideCartChrome = Boolean(
    demoWalkthroughCleanCartSurface || demoWalkthroughDecisionPanelSwap,
  );
  const demoCompactCartRows = Boolean(compactCartRows);
  const demoCollapsedSurfaceHidden = Boolean(
    demoHideCollapsedSurface &&
      demoMontageStage &&
      !demoMontageStage.open &&
      phase === "cart" &&
      !cartExpanded &&
      !selectedLine &&
      handoffState === "idle",
  );
  const cartSummaryHeight = genericResult
    ? genericPanelHeight
    : Math.min(
        maxCartPanelHeight,
        demoCompactCartRows
          ? Math.max(342, 148 + lines.length * 58 + Math.max(0, lines.length - 1) * 8)
          : demoWalkthroughCartMode
            ? Math.max(360, 104 + lines.length * 108 + Math.max(0, lines.length - 1) * 10)
            : Math.max(388, 116 + lines.length * 104 + Math.max(0, lines.length - 1) * 12),
      );
  const selectedOptionRows = (() => {
    const options = selectedLine?.options || [];
    if (!options.length) return 0;

    const availableWidth = Math.max(208, entryPillWidth - 32);
    let rowCount = 1;
    let usedWidth = 0;

    options.forEach((option) => {
      const estimatedTextWidth = Math.max(34, String(option || "").trim().length * 7.4);
      const estimatedPillWidth = Math.min(availableWidth, Math.max(68, estimatedTextWidth + 32));
      const nextWidth = usedWidth ? usedWidth + 8 + estimatedPillWidth : estimatedPillWidth;

      if (nextWidth > availableWidth && usedWidth) {
        rowCount += 1;
        usedWidth = estimatedPillWidth;
      } else {
        usedWidth = nextWidth;
      }
    });

    return rowCount;
  })();
  const selectedDetailTitle = selectedLineFullTitle || smartBarMobileShortTitle(selectedLine?.demoDisplayTitle || selectedLine?.title || "");
  const selectedDetailTitleLines = selectedDetailTitle.length > 28 ? 2 : 1;
  const cartDetailHeightFromShape = (optionRows: number, titleLines: number) => {
    const twoLineTitle = titleLines > 1;

    if (optionRows <= 0) return twoLineTitle ? 342 : 320;
    if (optionRows === 1) return twoLineTitle ? 344 : 324;
    if (optionRows === 2) return twoLineTitle ? 388 : 364;
    if (optionRows === 3) return twoLineTitle ? 432 : 408;
    if (optionRows === 4) return twoLineTitle ? 476 : 452;
    if (optionRows === 5) return twoLineTitle ? 520 : 496;

    return twoLineTitle ? 560 : 536;
  };
  const cartDetailBaseHeight = selectedLine?.status === "unknown"
    ? selectedUnknownMinimumPanelHeight
    : selectedLineNoChoicesNeeded
      ? selectedDetailTitleLines > 1 ? 270 : 248
      : Math.min(
          maxCartPanelHeight,
          cartDetailHeightFromShape(selectedOptionRows, selectedDetailTitleLines),
        );
  const cartDetailHeight = selectedLine?.status === "unknown" && measuredSelectedUnknownPanelHeight
    ? Math.min(
        maxCartPanelHeight,
        Math.max(cartDetailBaseHeight, measuredSelectedUnknownPanelHeight),
      )
    : selectedDetailMode === "summary" && measuredSelectedSummaryPanelHeight
      ? Math.min(
          maxCartPanelHeight,
          Math.max(cartDetailBaseHeight, measuredSelectedSummaryPanelHeight),
        )
      : selectedDetailMode === "choices" && measuredSelectedChoicePanelHeight
        ? Math.min(
            maxCartPanelHeight,
            Math.max(cartDetailBaseHeight, measuredSelectedChoicePanelHeight),
          )
        : cartDetailBaseHeight;
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
          duration: SMARTBAR_MOBILE_SEND_ORDER_COLLAPSE_DURATION_MS / 1000,
          ease: [0.16, 1, 0.3, 1],
        },
        borderRadius: {
          duration: 0.68,
          ease: [0.16, 1, 0.3, 1],
        },
      }
    : demoWalkthroughDecisionPanelSwap
      ? { duration: 0 }
      : { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

  const applyOrderResultEstimates = (result: SmartBarMobileOrderResult, fallbackTotal = orderEstimatedTotal) => {
    const nextPricingMode = String(result.pricingMode || orderPricingMode || "exact");
    setOrderPricingMode(nextPricingMode);
    if (nextPricingMode === "restaurant-calculated") {
      setOrderEstimatedSubtotal(undefined);
      setOrderEstimatedTax(undefined);
      setOrderEstimatedTotal("");
      return;
    }
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
    if (!demoResetToRestKey) return;

    // SmartBar social finale reset: clear staged panels so the native introCallout
    // can type above the bottom rail again.
    clearBuildTimer();
    clearHandoffTimers();
    disarmClose();
    resetAdaptiveRailToCenter();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setSubmittedPromptPreview("");
    setEntryDraft("");
    setRetryDraft("");
    setEntryFocused(false);
    setHasEditedEntryDraft(false);
    setGenericResult(null);
    setMeasuredGenericPanelHeight(null);
    setSelectedLineId(null);
    setLineOverrides({});
    setReviewedOptionLineKeys({});
    setHasCart(false);
    setCartExpanded(false);
    setHandoffState("idle");
    setPhase("rest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoResetToRestKey]);

  useEffect(() => {
    if (!demoPresetEntryDraft) return;

    clearBuildTimer();
    clearHandoffTimers();
    disarmClose();
    resetAdaptiveRailToCenter();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setSubmittedPromptPreview("");
    setRetryDraft("");
    setEntryFocused(false);
    setHasEditedEntryDraft(true);
    setGenericResult(null);
    setMeasuredGenericPanelHeight(null);
    setSelectedLineId(null);
    setLineOverrides({});
    setReviewedOptionLineKeys({});
    setHasCart(false);
    setCartExpanded(false);
    setHandoffState("idle");
    setEntryDraft(demoPresetEntryDraft.draft);
    setPhase("entry");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoPresetEntryDraft?.runKey]);


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
    choiceMutationRevisionRef.current += 1;
    setHandoffState("idle");
    setSelectedLineId(null);
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
              setOrderEstimatedTotal("-");
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
    submitPromptValue(
      entryDraft,
      hasCart ? { requestIntent: "add_item" } : undefined,
    );
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
      const startDelayMs = demoSubmission.startDelayMs ?? 0;

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

      if (demoSuppressEntryFocus) {
        setEntryFocused(false);
      } else {
        entryTextareaRef.current?.focus({ preventScroll: true });
        setEntryFocused(document.activeElement === entryTextareaRef.current);
      }

      if (startDelayMs > 0) {
        await waitFor(startDelayMs);
        if (cancelled) return;
      }

      const typingScript = demoSubmission.typingScript ?? [];

      if (typingScript.length > 0) {
        let scriptedDraft = "";

        for (const step of typingScript) {
          if (cancelled) return;

          if (step.action === "pause") {
            await waitFor(step.ms);
            continue;
          }

          if (step.action === "backspace") {
            const count = Math.max(0, step.count);
            const stepDelayMs = step.delayMs ?? typeDelayMs;

            for (let index = 0; index < count; index += 1) {
              if (cancelled) return;
              scriptedDraft = scriptedDraft.slice(0, -1);
              setEntryDraft(scriptedDraft);
              await waitFor(stepDelayMs);
            }

            continue;
          }

          const stepDelayMs = step.delayMs ?? typeDelayMs;

          for (const char of step.text) {
            if (cancelled) return;
            scriptedDraft += char;
            setEntryDraft(scriptedDraft);
            await waitFor(stepDelayMs);
          }
        }

        if (!cancelled && scriptedDraft !== query) {
          setEntryDraft(query);
        }
      } else {
        for (let index = 1; index <= query.length; index += 1) {
          if (cancelled) return;
          setEntryDraft(query.slice(0, index));
          await waitFor(typeDelayMs);
        }
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

  useLayoutEffect(() => {
    if (!demoMontageStage) return;

    clearBuildTimer();
    clearHandoffTimers();
    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setSubmittedPromptPreview("");
    setEntryDraft("");
    setEntryFocused(false);
    setHasEditedEntryDraft(true);
    setHasCart(true);
    setHandoffState("idle");
    setReviewedOptionLineKeys({});
    setLineOverrides({});

    if (!demoMontageStage.open) {
      setPhase("cart");
      setCartExpanded(false);
      return;
    }

    setPhase("cart");
    setCartExpanded(true);

    if (demoMontageStage.surface.startsWith("booking_")) {
      setSelectedLineId(null);
      setOrderLines([]);
      setOrderEstimatedSubtotal(undefined);
      setOrderEstimatedTax(undefined);
      setOrderEstimatedTotal("$1,684");
      setGenericResult(smartBarMobileSocialBookingMontageResult(demoMontageStage));
      return;
    }

    if (demoMontageStage.surface === "confirmation") {
      const isWalkthroughConfirmation = demoWalkthroughCartMode;
      setSelectedLineId(null);
      if (isWalkthroughConfirmation) {
        setOrderLines(smartBarMobileWalkthroughPizzaLinesForState("correction"));
        setOrderEstimatedSubtotal("$26.97");
        setOrderEstimatedTax("$2.23");
        setOrderEstimatedTotal("$29.20");
      } else {
        setOrderLines(smartBarMobileSocialMontageReadyLines);
        setOrderEstimatedSubtotal(smartBarMobileSocialMontageSubtotal);
        setOrderEstimatedTax(smartBarMobileSocialMontageTax);
        setOrderEstimatedTotal(smartBarMobileSocialMontageTotal);
      }
      setGenericResult({
        surfaceKind: "info",
        eyebrow: isWalkthroughConfirmation ? "Pickup ticket" : "Order sent",
        title: `SmartBar Order ${sendOrderNumber}`,
        statusLabel: isWalkthroughConfirmation ? "Pickup ticket" : "Confirmation",
        height: 220,
        content: <SmartBarPickupConfirmationCard orderNumber={sendOrderNumber} isDemo />,
      });
      return;
    }

    setGenericResult(null);

    if (demoMontageStage.surface === "carts") {
      if (demoWalkthroughCartMode) {
        setOrderLines(smartBarMobileWalkthroughPizzaLinesForState(demoMontageStage.resolvedState));
        setOrderEstimatedSubtotal(demoMontageStage.resolvedState === "correction" ? "$26.97" : "$20.98");
        setOrderEstimatedTax(demoMontageStage.resolvedState === "correction" ? "$2.23" : "$1.73");
        setOrderEstimatedTotal(demoMontageStage.resolvedState === "correction" ? "$29.20" : "$22.71");
      } else {
        setOrderLines(smartBarMobileSocialMontageLinesForState(demoMontageStage.resolvedState));
        setOrderEstimatedSubtotal(smartBarMobileSocialMontageSubtotal);
        setOrderEstimatedTax(smartBarMobileSocialMontageTax);
        setOrderEstimatedTotal(smartBarMobileSocialMontageTotal);
      }
      setSelectedLineId(null);
      return;
    }

    if (demoMontageStage.surface === "checkout") {
      if (demoWalkthroughCartMode) {
        setOrderLines(smartBarMobileWalkthroughPizzaLinesForState("correction"));
        setOrderEstimatedSubtotal("$26.97");
        setOrderEstimatedTax("$2.23");
        setOrderEstimatedTotal("$29.20");
      } else {
        setOrderLines(smartBarMobileSocialMontageReadyLines);
        setOrderEstimatedSubtotal(smartBarMobileSocialMontageSubtotal);
        setOrderEstimatedTax(smartBarMobileSocialMontageTax);
        setOrderEstimatedTotal(smartBarMobileSocialMontageTotal);
      }
      setSelectedLineId(null);
      setHandoffState("handing_off");
      return;
    }

    if (demoWalkthroughCartMode) {
      const walkthroughBaseState =
        demoMontageStage.surface === "extras"
          ? "requirement"
          : demoMontageStage.surface === "corrections"
            ? "extras"
            : null;
      setOrderLines(smartBarMobileWalkthroughPizzaLinesForState(walkthroughBaseState));
      setOrderEstimatedSubtotal(walkthroughBaseState === "extras" ? "$20.98" : "$20.98");
      setOrderEstimatedTax(walkthroughBaseState === "extras" ? "$1.73" : "$1.73");
      setOrderEstimatedTotal(walkthroughBaseState === "extras" ? "$22.71" : "$22.71");
    } else {
      setOrderLines(smartBarMobileSocialMontageLines);
      setOrderEstimatedSubtotal(smartBarMobileSocialMontageSubtotal);
      setOrderEstimatedTax(smartBarMobileSocialMontageTax);
      setOrderEstimatedTotal(smartBarMobileSocialMontageTotal);
    }

    if (demoMontageStage.surface === "requirements") {
      const selectedOptions = demoMontageStage.selectedOptions || [];
      if (demoWalkthroughCartMode) {
        if (selectedOptions.length) {
          setLineOverrides({
            "walkthrough-pizza-wings": {
              status: "ready",
              helper: "Choice selected",
              details: selectedOptions,
              options: ["Blue cheese", "Ranch"],
              optionSelectionMode: "single",
            },
          });
        }
        setSelectedLineId("walkthrough-pizza-wings");
      } else {
        if (selectedOptions.length) {
          setLineOverrides({
            "social-montage-requirement": {
              status: "ready",
              helper: "Required choice set",
              details: selectedOptions,
              options: ["Small", "Medium", "Large"],
              optionSelectionMode: "single",
            },
          });
        }
        setSelectedLineId("social-montage-requirement");
      }
      return;
    }

    if (demoMontageStage.surface === "extras") {
      const selectedOptions = demoMontageStage.selectedOptions || [];
      if (demoWalkthroughCartMode) {
        setLineOverrides({
          "walkthrough-pizza-spaghetti": selectedOptions.length
            ? {
                status: "ready",
                helper: "Extras accepted",
                details: selectedOptions,
                options: ["Meatballs", "Sausage", "Mush/peppers"],
                optionSelectionMode: "multi",
              }
            : {
                status: "options",
                helper: "Add-ons",
                details: [],
                options: ["Meatballs", "Sausage", "Mush/peppers"],
                optionSelectionMode: "multi",
              },
        });
        setSelectedLineId("walkthrough-pizza-spaghetti");
      } else {
        if (selectedOptions.length) {
          setLineOverrides({
            "social-montage-extras": {
              status: "ready",
              helper: "Extras accepted",
              details: Array.from(new Set(["Chocolate", "Medium", ...selectedOptions])),
              options: ["Whipped cream", "Extra chocolate", "Cherry"],
              optionSelectionMode: "multi",
            },
          });
        }
        setSelectedLineId("social-montage-extras");
      }
      return;
    }

    if (demoMontageStage.surface === "corrections") {
      setSelectedLineId(demoWalkthroughCartMode ? "walkthrough-pizza-garstix" : "social-montage-correction");
      setRetryDraft(demoMontageStage.retryDraft || "");
      return;
    }

    setSelectedLineId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMontageStage?.id, demoMontageStage?.open, demoMontageStage?.surface, demoWalkthroughCartMode, sendOrderNumber]);

  const selectLine = (line: SmartBarMobileOrderLine) => {
    if (handoffLocked) return;

    disarmClose();
    choiceLockedLineIdRef.current = null;
    setSelectedChoice(null);
    setSelectedOptionGroupOverride(null);
    setConditionalReturnContext(null);
    if (line.isExpandableBundle && line.bundleComponents?.length) {
      setSelectedLineId(null);
      setSelectedDetailMode("choices");
      setExpandedBundleLineId(smartBarMobileLineInstanceKey(line));
      setCartExpanded(true);
      return;
    }

    const lineHasNoChoicesNeeded = Boolean(
      line.isCustomerNote ||
      (
        line.status === "ready" &&
        !line.options?.length &&
        smartBarMobileLineSelectedDetails(line).length === 0 &&
        smartBarMobileLineMissingDetails(line).length === 0
      ),
    );
    const lineInstanceKey = smartBarMobileLineInstanceKey(line);
    const firstReviewGroup = line.status === "pending" || line.status === "unknown"
      ? null
      : smartBarMobileLineOptionGroups(line)[0] || null;

    if (firstReviewGroup) {
      setSelectedOptionGroupOverride({
        lineKey: lineInstanceKey,
        groupId: firstReviewGroup.id,
      });
    }

    setSelectedLineId(lineInstanceKey);
    setSelectedDetailMode(lineHasNoChoicesNeeded ? "summary" : "choices");
    setCartExpanded(true);

    if (line.status !== "unknown") {
      onNavigateToLine?.(line);
    }

    if (line.status === "unknown") {
      setRetryDraft(smartBarMobileUnknownNoteDraft(line));
      setRetryCheckingLineId(null);
    }
  };

  const openSelectedLineOptionGroup = (group: SmartBarMobileOptionGroup | null) => {
    if (!selectedLine || !group) return;
    setSelectedOptionGroupOverride({
      lineKey: selectedLineInstanceKey,
      groupId: group.id,
    });
    setSelectedChoice(null);
    setSelectedDetailMode("choices");
    setSelectedLineId(selectedLineInstanceKey);
    setCartExpanded(true);
  };

  const openSelectedLinePreviousOptionGroup = () => {
    openSelectedLineOptionGroup(selectedLinePreviousOptionGroup);
  };

  const applyLineChoice = (
    line: SmartBarMobileOrderLine,
    value: string,
    requestedQuantity?: number,
  ) => {
    const activeGroup = selectedOptionGroupOverrideId
      ? smartBarMobileLineOptionGroups(line).find((group) => group.id === selectedOptionGroupOverrideId) ||
        smartBarMobileActiveOptionGroup(line, reviewedOptionLineKeys)
      : smartBarMobileActiveOptionGroup(line, reviewedOptionLineKeys);
    const lineInstanceKey = smartBarMobileLineInstanceKey(line);
    const existingConditionalReturnGroup = activeGroup
      ? (
          conditionalReturnContext?.lineKey === lineInstanceKey
            ? smartBarMobileLineOptionGroups(line).find((group) => group.id === conditionalReturnContext.groupId) || null
            : smartBarMobileConditionalReturnGroup(line, activeGroup)
        )
      : null;
    const activeGroupId = activeGroup?.id || line.activeOptionGroupId || smartBarMobileFallbackOptionGroupId(line);
    const activeGroupLabel = activeGroup?.label || line.optionGroupLabel || "options";
    const optionalReview = activeGroup
      ? smartBarMobileOptionGroupIsOptional(activeGroup)
      : line.status === "options";
    const multiSelect = activeGroup
      ? activeGroup.selectionMode === "multi"
      : line.optionSelectionMode === "multi" || line.status === "options";
    const choiceLockKey = `${lineInstanceKey}::${activeGroupId}`;
    if (
      handoffLocked ||
      (!multiSelect && !optionalReview && choiceLockedLineIdRef.current === choiceLockKey)
    ) return;

    const valueAlreadySelected = smartBarMobileLineHasOptionDetail(line, value);
    const optionIndex = (line.options || []).findIndex((option) => option === value);
    const optionId = optionIndex >= 0 ? String(line.optionIds?.[optionIndex] || "") : "";
    const activatedChildGroupIds = activeGroup
      ? smartBarMobileConditionalChildrenForOption(line, activeGroup, optionId, value)
      : [];
    const directActivatedChildGroupIds = activeGroup && optionIndex >= 0
      ? (activeGroup.optionChildGroupIds?.[optionIndex] || [])
          .map((groupId) => String(groupId || "").trim())
          .filter(Boolean)
      : [];
    const previouslySelectedChildGroupIds = activeGroup
      ? smartBarMobileOptionGroupSelectedIds(activeGroup).flatMap((selectedId) => {
          const selectedIndex = (activeGroup.optionIds || []).findIndex((candidate) => String(candidate || "") === selectedId);
          const selectedLabel = selectedIndex >= 0 ? activeGroup.options[selectedIndex] || "" : "";
          return smartBarMobileConditionalChildrenForOption(line, activeGroup, selectedId, selectedLabel);
        })
      : [];
    const currentQuantity = smartBarMobileLineOptionQuantity(line, value);
    const maximumForOption = smartBarMobileLineOptionMaximum(line, value);
    const nextQuantity = requestedQuantity === undefined
      ? valueAlreadySelected ? 0 : 1
      : Math.max(1, Math.min(maximumForOption, Math.floor(requestedQuantity)));
    const optionSelectionChanged = multiSelect
      ? (currentQuantity > 0) !== (nextQuantity > 0)
      : nextQuantity === 0 || !valueAlreadySelected;
    const childReviewKeysToClear = !optionSelectionChanged
      ? []
      : Array.from(new Set(
          multiSelect
            ? activatedChildGroupIds
            : [
                ...activatedChildGroupIds,
                ...previouslySelectedChildGroupIds,
              ],
        ));
    if (childReviewKeysToClear.length) {
      setReviewedOptionLineKeys((current) => {
        const next = { ...current };
        childReviewKeysToClear.forEach((groupId) => {
          smartBarMobileReviewedOptionGroupKeys(line, groupId).forEach((key) => {
            delete next[key];
          });
        });
        return next;
      });
    }
    const selectedOptionActivatesChild = nextQuantity > 0 && directActivatedChildGroupIds.length > 0;
    const activeGroupIsMultiSelectConditionalHome = Boolean(
      activeGroup &&
      activeGroup.selectionMode === "multi" &&
      smartBarMobileOptionGroupDescendantIds(line, activeGroup).length > 0 &&
      !smartBarMobileActiveConditionalParentGroup(line, activeGroup)
    );
    const conditionalReturnGroup = existingConditionalReturnGroup || (
      activeGroupIsMultiSelectConditionalHome ? activeGroup : null
    );
    if (conditionalReturnGroup) {
      setConditionalReturnContext({
        lineKey: lineInstanceKey,
        groupId: conditionalReturnGroup.id,
      });
    }
    const shouldAutoReturnToConditionalParent = Boolean(
      conditionalReturnGroup &&
      activeGroup &&
      activeGroup.id !== conditionalReturnGroup.id &&
      activeGroup.selectionMode !== "multi" &&
      nextQuantity > 0 &&
      !selectedOptionActivatesChild
    );
    const nextSelectedCount = multiSelect
      ? smartBarMobileLineSelectionCount(line) - currentQuantity + nextQuantity
      : nextQuantity;
    const maximum = smartBarMobileLineMaximumSelections(line);
    if (multiSelect && maximum !== undefined && nextSelectedCount > maximum) return;
    if (multiSelect && nextQuantity > 0 && !valueAlreadySelected && smartBarMobileLineAtSelectionLimit(line)) return;

    if (!multiSelect && !optionalReview) choiceLockedLineIdRef.current = choiceLockKey;
    setSelectedChoice(
      multiSelect && nextQuantity === 0
        ? null
        : { lineId: lineInstanceKey, groupId: activeGroupId, value },
    );
    disarmClose();

    const cleanedDetails = (line.details || []).filter((detail) => {
      if (/^(choice needed|size needed)$/i.test(detail.trim())) return false;

      const detailMatchesAnyOption = (line.options || []).some((option) => {
        return smartBarMobileOptionLabelsEqual(option, detail);
      });
      const detailMatchesSelectedValue = smartBarMobileOptionLabelsEqual(value, detail);

      if (!multiSelect && detailMatchesAnyOption && !detailMatchesSelectedValue) return false;
      return true;
    });
    const nextDetails = multiSelect && nextQuantity === 0
      ? cleanedDetails.filter((detail) => !smartBarMobileOptionLabelsEqual(value, detail))
      : Array.from(new Set([...cleanedDetails, value]));
    const nextSelectedOptions = multiSelect
      ? nextQuantity === 0
        ? (line.selectedOptions || []).filter((selected) => !smartBarMobileOptionLabelsEqual(value, selected))
        : Array.from(new Set([...(line.selectedOptions || []), value]))
      : [value];
    const nextSelectedOptionIds = optionId
      ? multiSelect
        ? nextQuantity === 0
          ? (line.selectedOptionIds || []).filter((selectedId) => String(selectedId) !== optionId)
          : Array.from(new Set([...(line.selectedOptionIds || []), optionId]))
        : [optionId]
      : line.selectedOptionIds;
    const nextOptionQuantities = (line.options || []).map((option, index) => {
      if (index === optionIndex) return nextQuantity;
      return multiSelect ? smartBarMobileLineOptionQuantity(line, option) : 0;
    });
    const minimum = smartBarMobileLineMinimumSelections(line);
    const stillPending = nextSelectedCount < minimum ||
      (maximum !== undefined && nextSelectedCount > maximum);
    const resolvedStatus: SmartBarMobileOrderStatus = stillPending
      ? "pending"
      : optionalReview
        ? "options"
        : multiSelect
          ? "ready"
          : line.status;
    const resolvedHelper = stillPending
      ? `${Math.max(0, minimum - nextSelectedCount)} more required`
      : optionalReview
        ? `Review ${activeGroupLabel.toLowerCase()} when finished`
        : multiSelect
          ? "Reviewed and ready"
          : `${value} selected`;

    let appliedLine: SmartBarMobileOrderLine = {
      ...line,
      status: resolvedStatus,
      helper: resolvedHelper,
      details: nextDetails,
      options: line.options || [],
      optionIds: line.optionIds || [],
      optionChildGroupIds: line.optionChildGroupIds || [],
      optionQuantities: nextOptionQuantities,
      optionMaxQuantities: line.optionMaxQuantities || [],
      selectedOptions: nextSelectedOptions,
      ...(nextSelectedOptionIds ? { selectedOptionIds: nextSelectedOptionIds } : {}),
      optionSelectionMode: line.optionSelectionMode || (multiSelect ? "multi" : "single"),
    };

    if (activeGroup) {
      const resolvedGroup: SmartBarMobileOptionGroup = {
        ...activeGroup,
        selectedOptions: nextSelectedOptions,
        selectedOptionIds: nextSelectedOptionIds,
        optionQuantities: nextOptionQuantities,
      };
      appliedLine = smartBarMobileReplaceActiveOptionGroup(appliedLine, resolvedGroup);
    }
    appliedLine = smartBarMobileResolveConditionalLine(
      appliedLine,
      nextQuantity > 0 ? activatedChildGroupIds : [],
    );

    if (
      shouldAutoReturnToConditionalParent &&
      activeGroup &&
      smartBarMobileOptionGroupIsOptional(activeGroup)
    ) {
      setReviewedOptionLineKeys((current) => ({
        ...current,
        ...smartBarMobileReviewedOptionGroupKeyPatch(line, activeGroup.id),
      }));
    }

    const resolvedGroups = smartBarMobileLineOptionGroups(appliedLine);
    const resolvedActiveGroup = activeGroup
      ? resolvedGroups.find((group) => group.id === activeGroup.id) || null
      : null;
    const resolvedConditionalHomeGroup = conditionalReturnGroup
      ? resolvedGroups.find((group) => group.id === conditionalReturnGroup.id) || null
      : null;
    const resolvedActiveGroupNeedsRequiredChoice = Boolean(
      resolvedActiveGroup &&
      !smartBarMobileOptionGroupIsOptional(resolvedActiveGroup) &&
      smartBarMobileOptionGroupNeedsRequiredChoice(resolvedActiveGroup)
    );
    const navigationDecision = smartBarMobileConditionalNavigationTarget({
      currentGroupId: resolvedActiveGroup?.id || activeGroupId,
      resolverGroupId: appliedLine.activeOptionGroupId || null,
      conditionalHomeGroupId: resolvedConditionalHomeGroup?.id || null,
      directChildGroupIds: directActivatedChildGroupIds,
      activeGroupIds: resolvedGroups
        .filter((group) => group.active !== false)
        .map((group) => group.id),
      selected: nextQuantity > 0,
      currentGroupSelectionMode: resolvedActiveGroup?.selectionMode || activeGroup?.selectionMode,
      currentGroupNeedsRequiredChoice: resolvedActiveGroupNeedsRequiredChoice,
      currentGroupIsConditionalHome: activeGroupIsMultiSelectConditionalHome,
    });
    const displayedGroup = resolvedGroups.find((group) => (
      group.id === navigationDecision.visibleGroupId
    )) || resolvedActiveGroup || resolvedGroups[0] || null;
    let displayedLine = displayedGroup
      ? smartBarMobileLineWithActiveOptionGroup(appliedLine, displayedGroup)
      : appliedLine;
    const conditionalReturnGroupId = navigationDecision.conditionalHomeGroupId;
    const visibleOptionGroupId = displayedGroup?.id || displayedLine.activeOptionGroupId || null;

    if (
      conditionalReturnGroupId &&
      visibleOptionGroupId === conditionalReturnGroupId
    ) {
      displayedLine = {
        ...displayedLine,
        helper: "Continue selections",
      };
    }

    const mutationLine = activeGroup
      ? smartBarMobileLineWithActiveOptionGroup(
          {
            ...line,
            activeOptionGroupId: activeGroup.id,
          },
          activeGroup,
        )
      : line;
    const mutationRevision = choiceMutationRevisionRef.current + 1;
    choiceMutationRevisionRef.current = mutationRevision;
    const keepDetailOpen = Boolean(
      selectedOptionActivatesChild ||
      conditionalReturnGroupId ||
      displayedLine.status === "pending" ||
      displayedLine.status === "options" ||
      optionalReview ||
      multiSelect
    );

    const parentResultPromise = onApplyLineChoice
      ? Promise.resolve(onApplyLineChoice(mutationLine, value, {
          selected: nextQuantity > 0,
          multiSelect,
          valueAlreadySelected,
          optionGroupId: activeGroupId,
          optionGroupLabel: activeGroupLabel,
          quantity: nextQuantity > 0 ? nextQuantity : undefined,
        }))
      : Promise.resolve<SmartBarMobileOrderResult | void>(undefined);

    // Keep conditional parents visible after they activate a child. The footer
    // explicitly opens that child, then continues the established review flow.
    setLineOverrides((current) => ({
      ...current,
      [lineInstanceKey]: {
        ...(current[lineInstanceKey] || {}),
        status: displayedLine.status,
        helper: displayedLine.helper,
        details: displayedLine.details,
        optionGroups: displayedLine.optionGroups,
        activeOptionGroupId: displayedLine.activeOptionGroupId,
        options: displayedLine.options || [],
        optionIds: displayedLine.optionIds || [],
        optionChildGroupIds: displayedLine.optionChildGroupIds || [],
        selectedOptions: displayedLine.selectedOptions,
        selectedOptionIds: displayedLine.selectedOptionIds,
        optionQuantities: displayedLine.optionQuantities,
        optionMaxQuantities: displayedLine.optionMaxQuantities,
        optionSelectionMode: displayedLine.optionSelectionMode,
        optionGroupLabel: displayedLine.optionGroupLabel,
        optionMinSelections: displayedLine.optionMinSelections,
        optionMaxSelections: displayedLine.optionMaxSelections,
        selectionRules: displayedLine.selectionRules,
      },
    }));
    if (conditionalReturnGroupId) {
      setConditionalReturnContext({
        lineKey: lineInstanceKey,
        groupId: conditionalReturnGroupId,
      });
    } else {
      setConditionalReturnContext(null);
    }
    if (visibleOptionGroupId && keepDetailOpen) {
      setSelectedOptionGroupOverride({
        lineKey: lineInstanceKey,
        groupId: visibleOptionGroupId,
      });
    } else {
      setSelectedOptionGroupOverride(null);
    }
    setSelectedLineId(keepDetailOpen ? lineInstanceKey : null);
    setSelectedDetailMode("choices");
    setCartExpanded(true);

    window.setTimeout(() => {
      // A newer option click owns the visible panel and cart state. Older
      // delayed commits must not overwrite that newer navigation decision.
      if (choiceMutationRevisionRef.current !== mutationRevision) {
        parentResultPromise.catch(() => {
          // The newer mutation remains authoritative even if this stale
          // pricing request fails.
        });
        return;
      }

      const optimisticResult: SmartBarMobileOrderResult = {
        lines: smartBarMobileReplaceLineInTree(lines, displayedLine),
      };

      setOrderLines(optimisticResult.lines);
      applyOrderResultEstimates(optimisticResult, "");
      setLineOverrides({});
      choiceLockedLineIdRef.current = null;
      setSelectedChoice(null);
      if (conditionalReturnGroupId) {
        setConditionalReturnContext({
          lineKey: lineInstanceKey,
          groupId: conditionalReturnGroupId,
        });
      }
      if (visibleOptionGroupId && keepDetailOpen) {
        setSelectedOptionGroupOverride({
          lineKey: lineInstanceKey,
          groupId: visibleOptionGroupId,
        });
      }
      setSelectedLineId(keepDetailOpen ? lineInstanceKey : null);
      setCartExpanded(true);

      parentResultPromise
        .then((parentResult) => {
          if (choiceMutationRevisionRef.current !== mutationRevision) return;
          if (!parentResult || parentResult.lines.length === 0) return;

          setOrderLines(parentResult.lines);
          applyOrderResultEstimates(parentResult);
          setLineOverrides({});
          choiceLockedLineIdRef.current = null;
          setSelectedChoice(null);

          const replacementLine = smartBarMobileFindMatchingLineInTree(
            parentResult.lines,
            mutationLine,
          );
          if (!replacementLine) {
            // Keep the already-rendered optimistic conditional parent open.
            // A backend refresh that cannot be matched must not dismiss the
            // footer instruction the customer still needs to follow.
            if (!keepDetailOpen) {
              setSelectedOptionGroupOverride(null);
              setConditionalReturnContext(null);
              setSelectedLineId(null);
            }
            return;
          }
          if (!keepDetailOpen) {
            setSelectedOptionGroupOverride(null);
            setConditionalReturnContext(null);
            setSelectedLineId(null);
            return;
          }

          const replacementLineKey = smartBarMobileLineInstanceKey(replacementLine);
          const replacementGroups = smartBarMobileLineOptionGroups(replacementLine);
          const replacementVisibleGroup = visibleOptionGroupId
            ? replacementGroups.find((group) => (
                group.id === visibleOptionGroupId &&
                group.active !== false
              )) || null
            : null;
          const replacementHomeGroup = conditionalReturnGroupId
            ? replacementGroups.find((group) => (
                group.id === conditionalReturnGroupId &&
                group.active !== false
              )) || null
            : null;
          const replacementFallbackGroup = replacementGroups.find((group) => (
            group.id === replacementLine.activeOptionGroupId
          )) || replacementGroups[0] || null;
          const preservedVisibleGroup = replacementVisibleGroup ||
            replacementHomeGroup ||
            replacementFallbackGroup;

          if (replacementHomeGroup) {
            setConditionalReturnContext({
              lineKey: replacementLineKey,
              groupId: replacementHomeGroup.id,
            });
          } else {
            setConditionalReturnContext(null);
          }
          if (preservedVisibleGroup) {
            setSelectedOptionGroupOverride({
              lineKey: replacementLineKey,
              groupId: preservedVisibleGroup.id,
            });
          } else {
            setSelectedOptionGroupOverride(null);
          }
          setSelectedLineId(replacementLineKey);
          setCartExpanded(true);
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
    choiceMutationRevisionRef.current += 1;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    const removedLineReviewPrefix = `line-instance:${smartBarMobileLineInstanceKey(line)}::option-group:`;
    setReviewedOptionLineKeys((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(removedLineReviewPrefix)),
    ));

    const parentResultPromise = onRemoveLine
      ? Promise.resolve(onRemoveLine(line))
      : Promise.resolve<SmartBarMobileOrderResult | void>(undefined);
    const fallbackLines = smartBarMobileRemoveOneLineInstance(orderLines, line);
    const optimisticResult: SmartBarMobileOrderResult = {
      lines: fallbackLines,
      pricingMode: orderPricingMode,
      estimatedTotal: restaurantCalculatedPricing ? undefined : fallbackLines.length ? undefined : "-",
    };

    setOrderLines(optimisticResult.lines);
    applyOrderResultEstimates(optimisticResult, optimisticResult.lines.length ? "" : "-");
    setLineOverrides({});
    setSelectedLineId(null);
    setSelectedDetailMode("choices");
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
        applyOrderResultEstimates(parentResult, parentResult.lines.length ? "" : "-");

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


  const completeUnknownNoteAction = (
    action: () => SmartBarMobileOrderResult | Promise<SmartBarMobileOrderResult> | void,
    fallbackResult: SmartBarMobileOrderResult,
  ) => {
    if (!selectedLine) return;

    setRetryCheckingLineId(selectedLineInstanceKey);
    Promise.resolve()
      .then(action)
      .then((result) => {
        const savedResult = result || fallbackResult;
        setOrderLines(savedResult.lines);
        applyOrderResultEstimates(savedResult);
        setRetryDraft("");
        setLineOverrides({});
        setSelectedLineId(null);
        setSelectedDetailMode("choices");
        setCartExpanded(true);
      })
      .catch(() => {
        const lineInstanceKey = smartBarMobileLineInstanceKey(selectedLine);
        setLineOverrides((current) => ({
          ...current,
          [lineInstanceKey]: {
            ...(current[lineInstanceKey] || {}),
            status: "unknown",
            helper: "Could not save note",
            retryPrompt: "Try saving the note again.",
          } as DemoLineOverride,
        }));
      })
      .finally(() => {
        setRetryCheckingLineId(null);
      });
  };

  const saveUnknownAsGeneralNote = () => {
    const submittedNote = retryDraft.trim();
    if (
      handoffLocked ||
      !selectedLine ||
      selectedLine.status !== "unknown" ||
      !submittedNote ||
      retryCheckingLineId
    ) return;

    disarmClose();
    const fallbackResult: SmartBarMobileOrderResult = {
      lines: smartBarMobileSaveUnknownAsNoteInLines(orderLines, selectedLine, submittedNote),
      pricingMode: orderPricingMode,
      estimatedTotal: restaurantCalculatedPricing ? undefined : orderEstimatedTotal,
    };

    completeUnknownNoteAction(
      () => onSaveUnknownAsNote?.(selectedLine, submittedNote) || fallbackResult,
      fallbackResult,
    );
  };

  const attachUnknownAsNote = (targetLine: SmartBarMobileOrderLine) => {
    const submittedNote = retryDraft.trim();
    if (
      handoffLocked ||
      !selectedLine ||
      selectedLine.status !== "unknown" ||
      !submittedNote ||
      retryCheckingLineId
    ) return;

    disarmClose();
    const fallbackResult: SmartBarMobileOrderResult = {
      lines: smartBarMobileAttachUnknownNoteToLineInLines(
        orderLines,
        selectedLine,
        targetLine,
        submittedNote,
      ),
      pricingMode: orderPricingMode,
      estimatedTotal: restaurantCalculatedPricing ? undefined : orderEstimatedTotal,
    };

    completeUnknownNoteAction(
      () => onAttachUnknownAsNote?.(selectedLine, targetLine, submittedNote) || fallbackResult,
      fallbackResult,
    );
  };

  const submitRetry = (
    candidateSelection?: SmartBarMobileCandidateSelection,
    candidateUi?: { restoreManualEntryOnFailure?: boolean },
  ) => {
    const submittedRetry = String(candidateSelection?.sourceText || retryDraft).trim();
    if (handoffLocked || !selectedLine || selectedLine.status !== "unknown" || !submittedRetry || retryCheckingLineId) return;

    retryTextareaRef.current?.blur();
    disarmClose();
    setRetryCheckingLineId(selectedLineInstanceKey);

    const replacementPromise = onSubmitPrompt
      ? Promise.resolve(
          onSubmitPrompt(submittedRetry, {
            intent: "replace_unknown",
            replaceLineId: selectedLineInstanceKey,
            replaceLineTitle: selectedLine.title,
            replaceCartLineKey: selectedLine.cartLineKey,
            replaceSourceLineItemId: selectedLine.sourceLineItemId,
            replaceSourceLineIndex: selectedLine.sourceLineIndex,
            replaceSourceBucket: selectedLine.sourceBucket,
            ...(candidateSelection ? { candidateSelection } : {}),
          }),
        )
      : Promise.resolve<SmartBarMobileOrderResult>({
          lines: [
            {
              ...selectedLine,
              id: `${selectedLineInstanceKey}-retry`,
              title: submittedRetry,
              status: "ready",
              helper: "Re-entered and matched",
              price: restaurantCalculatedPricing ? "" : "$5.49",
              details: [submittedRetry],
              options: [],
            },
          ],
          pricingMode: orderPricingMode,
          estimatedTotal: restaurantCalculatedPricing ? undefined : orderEstimatedTotal,
        });

    replacementPromise
      .then((result) => {
        if (candidateSelection) {
          const candidateFailureMessage = smartBarMobileCandidateSelectionFailureMessage(result);
          if (candidateFailureMessage) {
            setCandidateFailedItemId(candidateSelection.itemId);
            setCandidateManualEntryOpen(Boolean(candidateUi?.restoreManualEntryOnFailure));
            return;
          }
        }

        setCandidateFailedItemId(null);

        if (smartBarMobileResultIsGeneric(result)) {
          setGenericResult(result);
          setOrderLines([]);
          setOrderEstimatedSubtotal(undefined);
          setOrderEstimatedTax(undefined);
          setOrderEstimatedTotal("-");
          setRetryDraft("");
          setLineOverrides({});
          setSelectedLineId(null);
          setCartExpanded(true);
          return;
        }

        if (result.authoritativeReplacement) {
          setGenericResult(null);
          setOrderLines(result.lines);
          applyOrderResultEstimates(result, result.lines.length ? "" : "-");
          if (result.lines.length === 0) {
            setHasCart(false);
            setEntryDraft("");
            setHasEditedEntryDraft(false);
            setSubmittedPromptPreview("");
            setPhase("entry");
          }
        } else {
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
        }

        setRetryDraft("");
        setLineOverrides({});
        setSelectedLineId(null);
        setCartExpanded(true);
      })
      .catch(() => {
        if (candidateSelection) {
          setCandidateFailedItemId(candidateSelection.itemId);
          setCandidateManualEntryOpen(Boolean(candidateUi?.restoreManualEntryOnFailure));
          return;
        }

        const lineInstanceKey = smartBarMobileLineInstanceKey(selectedLine);
        setLineOverrides((current) => ({
          ...current,
          [lineInstanceKey]: {
            ...(current[lineInstanceKey] || {}),
            status: "unknown",
            helper: "Still could not match item",
            details: [submittedRetry],
            retryPrompt: "Try again using an item name from this menu.",
          } as DemoLineOverride,
        }));
      })
      .finally(() => {
        setRetryCheckingLineId(null);
        setCandidateSubmittingItemId(null);
      });
  };

  const submitCandidateSelection = (candidate: SmartBarMobileCandidateResolutionCandidate) => {
    if (!selectedLineCandidateResolution || retryCheckingLineId) return;

    const restoreManualEntryOnFailure = candidateManualEntryOpen;
    setCandidateManualEntryOpen(false);
    setCandidateFailedItemId(null);
    setCandidateSubmittingItemId(candidate.itemId);
    submitRetry(
      {
        schemaVersion: "smartbar.candidateSelection.v1",
        resolutionId: selectedLineCandidateResolution.resolutionId,
        sourceText: selectedLineCandidateResolution.sourceText,
        itemId: candidate.itemId,
        selectionMode: "authoritative_item",
      },
      { restoreManualEntryOnFailure },
    );
  };

  const openCandidateManualEntry = () => {
    if (!selectedLineCandidateResolution || retryCheckingLineId || demoInteractionLocked) return;

    setCandidateManualEntryOpen(true);
    setCandidateSubmittingItemId(null);
    setCandidateFailedItemId(null);
    window.requestAnimationFrame(() => {
      const input = retryTextareaRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
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
    setExpandedBundleLineId(null);
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
    setExpandedBundleLineId(null);
    setCartExpanded(true);
    setPhase("cart");
  };

  const resetToRest = () => {
    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    setEntryFocused(false);
    clearBuildTimer();
    clearHandoffTimers();
    resetAdaptiveRailToCenter();
    setHandoffState("idle");
    setPhase("rest");
    setEntryDraft("");
    setHasEditedEntryDraft(false);
    setSubmittedPromptPreview("");
    setRetryDraft("");
    setOrderLines(demoLines);
    setOrderPricingMode("exact");
    setOrderEstimatedSubtotal(undefined);
    setOrderEstimatedTax(undefined);
    setOrderEstimatedTotal(estimatedTotal);
    setGenericResult(null);
    setMeasuredGenericPanelHeight(null);
    setLineOverrides({});
    setReviewedOptionLineKeys({});
    choiceLockedLineIdRef.current = null;
    choiceMutationRevisionRef.current += 1;
    setSelectedChoice(null);
    setRetryCheckingLineId(null);
    setHasCart(false);
    onResetCart?.();
    disarmClose();
    setSelectedLineId(null);
    setExpandedBundleLineId(null);
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
    setExpandedBundleLineId(null);
    setCartExpanded(true);
    setHandoffState("handing_off");

    handoffCollapseTimerRef.current = window.setTimeout(() => {
      handoffCollapseTimerRef.current = null;
      setCartExpanded(false);

      handoffResetTimerRef.current = window.setTimeout(async () => {
        handoffResetTimerRef.current = null;

        let resolvedOrderNumber = sendOrderNumber;

        try {
          const persistedOrderNumber = await onOrderSent?.();
          if (typeof persistedOrderNumber === "string" && persistedOrderNumber.trim()) {
            resolvedOrderNumber = persistedOrderNumber.trim();
          }
        } catch (error) {
          console.error("SmartBar order handoff failed", error);
        }

        setGenericResult({
          surfaceKind: "info",
          eyebrow: "Order sent",
          title: `SmartBar Order ${resolvedOrderNumber}`,
          statusLabel: "Order sent",
          height: 220,
          content: <SmartBarPickupConfirmationCard orderNumber={resolvedOrderNumber} />,
        });
        setHandoffState("idle");
        setCartExpanded(true);
      }, SMARTBAR_MOBILE_SEND_ORDER_REVEAL_DELAY_MS);
    }, SMARTBAR_MOBILE_SEND_ORDER_COLLAPSE_DURATION_MS);
  };

  const companionLabel = (() => {
    if (demoCompanionMessage?.label && phase !== "rest") return demoCompanionMessage.label;
    if (
      demoMontageStage?.label &&
      phase !== "rest" &&
      (!demoWalkthroughCartMode || demoAllowWalkthroughMontageCaption)
    ) {
      return demoMontageStage.label;
    }
    if (phase === "rest") {
      if (demoRestCompanion?.blank) return "";
      return demoRestCompanion?.label || "SmartBar";
    }
    if (pickupConfirmationOpen) return "Tap X to close";
    if (closeArmed) return "Tap X again";
    if (handoffState === "handing_off") return "Sending...";
    if (handoffState === "complete") return "Sent";
    if (phase === "entry") return hasEditedEntryDraft && entryDraft.trim() ? "Tap to submit" : entryModeLabel;
    if (phase === "building_cart") {
      return buildingStatusLabel && buildingStatusLabel !== buildingLabel
        ? buildingStatusLabel
        : hasCart ? "Updating..." : buildingStatusLabel;
    }
    if (phase === "cart" && genericResult) return genericResult.statusLabel || genericResult.title || "SmartBar result";
    if (
      phase === "cart" &&
      selectedLine &&
      selectedDetailMode === "summary"
    ) return "Back to cart";
    if (
      phase === "cart" &&
      selectedLine &&
      selectedLineActiveDirectChildAttentionGroup
    ) return smartBarMobileConditionalFooterLabel(selectedLineActiveDirectChildAttentionGroup);
    if (
      phase === "cart" &&
      selectedLine &&
      selectedLineConditionalReturnOptionGroup &&
      selectedLineActiveOptionGroupNeedsRequiredChoice
    ) return "Make a choice";
    if (
      phase === "cart" &&
      selectedLine &&
      selectedLineAtConditionalHomeGroup &&
      !selectedLineActiveOptionGroupNeedsRequiredChoice
    ) {
      return selectedLineConditionalDescendantAttentionGroup
        ? smartBarMobileConditionalFooterLabel(selectedLineConditionalDescendantAttentionGroup)
        : "Done choosing";
    }
    if (
      phase === "cart" &&
      selectedLine &&
      selectedLineConditionalBranchIsTerminal &&
      !selectedLineActiveOptionGroupNeedsRequiredChoice &&
      (
        selectedLineActiveOptionGroup?.selectionMode === "multi" ||
        selectedLineActiveOptionGroupIsOptional
      )
    ) return "Continue selections";
    if (
      phase === "cart" &&
      selectedLine &&
      selectedLineNextOptionGroup &&
      !selectedLineActiveOptionGroupNeedsRequiredChoice
    ) return "Next options";
    if (phase === "cart" && expandedBundleLineId && selectedLine?.status === "options") return selectedLineRemainingOptionalReviewCount > 1 ? "Next options" : "Done";
    if (phase === "cart" && expandedBundleLineId && selectedLine) return "Back to special";
    if (phase === "cart" && expandedBundleLineId) return "Finish included items";
    if (phase === "cart" && selectedLine && demoWalkthroughCartMode) return "Back to cart";
    if (phase === "cart" && selectedLine?.status === "unknown") {
      if (retryCheckingLineId === selectedLineInstanceKey) return "Working...";
      if (selectedLineCandidateResolution) {
        return candidateManualEntryOpen && retryDraft.trim() ? "Use typed wording" : "Choose an item";
      }
      return "Back to cart";
    }
    if (phase === "cart" && selectedLine?.status === "options") return selectedLineRemainingOptionalReviewCount > 1 ? "Next options" : "Done";
    if (phase === "cart" && selectedLine) return "Back to cart";
    if (phase === "cart" && effectiveCartGuidanceStatus === "pending") return "Tap red entries";
    if (phase === "cart" && effectiveCartGuidanceStatus === "unknown") return "Tap gray entries";
    if (phase === "cart") return "Send order";
    if (checkoutReady) return restaurantCalculatedPricing ? "Ready to send" : `Ready to send - ${cartTotals.totalLabel}`;
    return restaurantCalculatedPricing
      ? `${unresolvedBlockingCount} need attention`
      : `${unresolvedBlockingCount} need attention - ${cartTotals.totalLabel}`;
  })();

  const demoRestCompanionIsBlank = phase === "rest" && Boolean(demoRestCompanion?.blank);
  const demoRestCompanionShowLogo = phase === "rest"
    ? demoRestCompanion
      ? Boolean(demoRestCompanion.showLogo) && !demoRestCompanion.blank
      : true
    : false;

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

    if (phase === "cart" && genericResult) {
      const footerLabel = String(genericResult.statusLabel || "");
      const footerAction = genericResult.actions?.find((action) => {
        if (/tap for booking/i.test(footerLabel)) return action.id === "booking-summary" || action.id === "booking-handoff";
        if (/choose room|add room/i.test(footerLabel)) return action.id === "booking-add-room";
        if (/tap packages/i.test(footerLabel)) return action.id === "booking-review-packages";
        if (/tap when done/i.test(footerLabel)) return action.id === "booking-packages-done";
        if (/review packages/i.test(footerLabel)) return false;
        return false;
      });

      if (footerAction) {
        handleGenericActionClick(footerAction, genericResult);
      } else if (/tap for booking/i.test(footerLabel)) {
        handleGenericActionClick({
          id: "booking-summary",
          label: "Tap for booking",
          helper: "Review handoff",
          variant: "primary",
        }, genericResult);
      }
      return;
    }

    if (
      phase === "cart" &&
      selectedLine &&
      selectedDetailMode === "summary"
    ) {
      retryTextareaRef.current?.blur();
      disarmClose();
      setRetryDraft("");
      setSelectedOptionGroupOverride(null);
      setConditionalReturnContext(null);
      setSelectedLineId(null);
      setSelectedDetailMode("choices");
      setCartExpanded(true);
      return;
    }

    if (phase === "cart" && selectedLine?.status === "unknown") {
      if (selectedLineCandidateResolution && candidateManualEntryOpen && retryDraft.trim()) {
        saveUnknownAsGeneralNote();
      } else if (selectedLineCandidateResolution) {
        return;
      } else {
        retryTextareaRef.current?.blur();
        disarmClose();
        setRetryDraft("");
        setSelectedLineId(null);
        setSelectedDetailMode("choices");
        setCartExpanded(true);
      }
      return;
    }

    if (phase === "cart" && selectedLine) {
      if (selectedLineActiveDirectChildAttentionGroup) {
        openSelectedLineOptionGroup(selectedLineActiveDirectChildAttentionGroup);
        return;
      }

      if (
        selectedLineConditionalReturnOptionGroup &&
        selectedLineActiveOptionGroupNeedsRequiredChoice
      ) return;

      if (
        selectedLineAtConditionalHomeGroup &&
        !selectedLineActiveOptionGroupNeedsRequiredChoice
      ) {
        if (selectedLineConditionalDescendantAttentionGroup) {
          openSelectedLineOptionGroup(selectedLineConditionalDescendantAttentionGroup);
          return;
        }

        let nextReviewedKeys = reviewedOptionLineKeys;
        if (
          selectedLineActiveOptionGroup &&
          selectedLineActiveOptionGroupIsOptional &&
          !selectedLineActiveOptionGroupIsReviewed
        ) {
          nextReviewedKeys = {
            ...reviewedOptionLineKeys,
            ...smartBarMobileReviewedOptionGroupKeyPatch(
              selectedLine,
              selectedLineActiveOptionGroup.id,
            ),
          };
          setReviewedOptionLineKeys(nextReviewedKeys);
        }

        setConditionalReturnContext(null);
        if (selectedLineNextMainOptionGroup) {
          openSelectedLineOptionGroup(selectedLineNextMainOptionGroup);
          return;
        }

        setSelectedOptionGroupOverride(null);
        setSelectedLineId(null);
        setCartExpanded(true);
        return;
      }

      if (
        selectedLineConditionalBranchIsTerminal &&
        selectedLineConditionalReturnOptionGroup &&
        !selectedLineActiveOptionGroupNeedsRequiredChoice &&
        (
          selectedLineActiveOptionGroup?.selectionMode === "multi" ||
          selectedLineActiveOptionGroupIsOptional
        )
      ) {
        let returnedLine = selectedLine;
        if (
          selectedLineActiveOptionGroup &&
          selectedLineActiveOptionGroupIsOptional &&
          !selectedLineActiveOptionGroupIsReviewed
        ) {
          setReviewedOptionLineKeys((current) => ({
            ...current,
            ...smartBarMobileReviewedOptionGroupKeyPatch(
              selectedLine,
              selectedLineActiveOptionGroup.id,
            ),
          }));
        }

        returnedLine = smartBarMobileLineWithActiveOptionGroup(
          {
            ...returnedLine,
            helper: "Continue selections",
          },
          selectedLineConditionalReturnOptionGroup,
        );
        const returnedResult: SmartBarMobileOrderResult = {
          lines: smartBarMobileReplaceLineInTree(lines, returnedLine),
        };

        setOrderLines(returnedResult.lines);
        applyOrderResultEstimates(returnedResult, "");
        setLineOverrides({});
        setSelectedChoice(null);
        setConditionalReturnContext({
          lineKey: selectedLineInstanceKey,
          groupId: selectedLineConditionalReturnOptionGroup.id,
        });
        setSelectedOptionGroupOverride({
          lineKey: selectedLineInstanceKey,
          groupId: selectedLineConditionalReturnOptionGroup.id,
        });
        setSelectedLineId(selectedLineInstanceKey);
        setSelectedDetailMode("choices");
        setCartExpanded(true);
        return;
      }

      if (
        selectedLineActiveOptionGroup &&
        selectedLineActiveOptionGroupIsOptional &&
        !selectedLineActiveOptionGroupIsReviewed
      ) {
        const reviewedPatch = smartBarMobileReviewedOptionGroupKeyPatch(
          selectedLine,
          selectedLineActiveOptionGroup.id,
        );
        const nextReviewedKeys = {
          ...reviewedOptionLineKeys,
          ...reviewedPatch,
        };
        const remainingOptionalGroups = smartBarMobileLineOptionGroups(selectedLine).filter((group) => (
          smartBarMobileOptionGroupIsOptional(group) &&
          !smartBarMobileHasReviewedOptionGroupKey(selectedLine, group.id, nextReviewedKeys)
        ));
        const nextGroup = selectedLineNextOptionGroup || remainingOptionalGroups[0] || null;
        const hasUnreviewedOptionalGroups = remainingOptionalGroups.length > 0;
        const reviewedLine: SmartBarMobileOrderLine = nextGroup
          ? smartBarMobileLineWithActiveOptionGroup(
              {
                ...selectedLine,
                status: hasUnreviewedOptionalGroups ? "options" : "ready",
                helper: smartBarMobileOptionGroupIsOptional(nextGroup) &&
                  !smartBarMobileHasReviewedOptionGroupKey(selectedLine, nextGroup.id, nextReviewedKeys)
                    ? `Review ${nextGroup.label.toLowerCase()}`
                    : "Review item selections",
              },
              nextGroup,
            )
          : {
              ...selectedLine,
              status: hasUnreviewedOptionalGroups ? "options" : "ready",
              helper: hasUnreviewedOptionalGroups ? "Options available" : "Reviewed and ready",
            };
        const reviewedResult: SmartBarMobileOrderResult = {
          lines: smartBarMobileReplaceLineInTree(lines, reviewedLine),
        };

        setReviewedOptionLineKeys(nextReviewedKeys);
        setOrderLines(reviewedResult.lines);
        applyOrderResultEstimates(reviewedResult, "");
        setLineOverrides({});
        setSelectedChoice(null);

        if (nextGroup) {
          setSelectedOptionGroupOverride({
            lineKey: selectedLineInstanceKey,
            groupId: nextGroup.id,
          });
          setSelectedLineId(selectedLineInstanceKey);
          setSelectedDetailMode("choices");
          setCartExpanded(true);
          return;
        }
      } else if (
        selectedLineNextOptionGroup &&
        !selectedLineActiveOptionGroupNeedsRequiredChoice
      ) {
        openSelectedLineOptionGroup(selectedLineNextOptionGroup);
        return;
      }

      setConditionalReturnContext(null);
      setSelectedOptionGroupOverride(null);
      setSelectedLineId(null);
      setCartExpanded(true);
      return;
    }

    if (phase === "cart" && expandedBundleLineId) return;

    if (phase === "cart" && checkoutReady) {
      startCheckoutHandoff();
    }
  };

  const handleClosePillClick = () => {
    if (phase === "rest" || handoffLocked) return;

    if (pickupConfirmationOpen) {
      resetToRest();
      return;
    }

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

    if (phase === "cart" && expandedBundleLineId) {
      retryTextareaRef.current?.blur();
      disarmClose();
      setRetryDraft("");
      setSelectedLineId(null);
      setSelectedDetailMode("choices");
      setExpandedBundleLineId(null);
      setCartExpanded(true);
      return;
    }

    if (phase === "cart" && selectedLine) {
      retryTextareaRef.current?.blur();
      disarmClose();
      setSelectedLineId(null);
      setSelectedOptionGroupOverride(null);
      setSelectedDetailMode("choices");
      setCartExpanded(true);
      return;
    }

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

    if (action.id === "booking-edit-room-search") {
      returnToEntryFromCart();
      window.setTimeout(() => entryTextareaRef.current?.focus(), 80);
      return;
    }

    const actionResult = onGenericAction?.(action, result);
    if (!actionResult) return;

    entryTextareaRef.current?.blur();
    retryTextareaRef.current?.blur();
    clearBuildTimer();
    clearHandoffTimers();
    disarmClose();
    setHandoffState("idle");
    setSelectedLineId(null);
    setExpandedBundleLineId(null);
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
        setOrderEstimatedTotal("-");
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

          const forcedSpotlightDelayMs = smartBarMobileActionShouldForceSpotlight(action.id)
            ? SMARTBAR_MOBILE_FORCED_SPOTLIGHT_MS
            : 0;
          const resultSpotlightDelayMs = smartBarMobileResultIsGeneric(nextResult) && nextResult.navigationRevealDelayMs && nextResult.navigationRevealDelayMs > 0
            ? nextResult.navigationRevealDelayMs
            : 0;
          const spotlightDelayMs = Math.max(forcedSpotlightDelayMs, resultSpotlightDelayMs);

          if (spotlightDelayMs > 0) {
            const spotlightLabel = smartBarMobileResultIsGeneric(nextResult)
              ? nextResult.navigationRevealLabel || "Spotlighting"
              : "Spotlighting";
            setSubmittedPromptPreview(spotlightLabel);
            setBuildingStatusLabel(spotlightLabel);
            setCartExpanded(false);
            buildTimerRef.current = window.setTimeout(() => {
              buildTimerRef.current = null;
              revealGenericActionResult(nextResult);
            }, spotlightDelayMs);
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
        setOrderEstimatedTotal("-");
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
          setOrderEstimatedTotal("-");
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
      setExpandedBundleLineId(null);
      setLineOverrides({});
      setMeasuredGenericPanelHeight(null);
      setCartExpanded(false);
      setSubmittedPromptPreview(
        actionId === "booking-nav-next"
          ? "Next"
          : actionId === "booking-nav-back"
            ? "Back"
            : actionId === "booking-context-continue"
            ? "Continue search"
            : actionId === "booking-summary" || actionId === "booking-handoff"
              ? "Prepare booking summary"
              : "SmartBar action",
      );
      const forcedDomiSpotlight = smartBarMobileActionShouldForceSpotlight(actionId);

      setBuildingStatusLabel(
        forcedDomiSpotlight
          ? "Spotlighting"
          : smartBarMobileResultIsGeneric(result) && result.navigationRevealLabel
            ? result.navigationRevealLabel
            : actionId === "booking-summary" || actionId === "booking-handoff"
              ? "Preparing booking..."
              : buildingLabel,
      );
      setGenericResult(null);
      setPhase("building_cart");

      const resultDomiSpotlightDelayMs = smartBarMobileResultIsGeneric(result) && result.navigationRevealDelayMs && result.navigationRevealDelayMs > 0
        ? result.navigationRevealDelayMs
        : 0;
      const forcedDomiSpotlightDelayMs = forcedDomiSpotlight
        ? SMARTBAR_MOBILE_FORCED_SPOTLIGHT_MS
        : 0;
      const domiSpotlightDelayMs = Math.max(resultDomiSpotlightDelayMs, forcedDomiSpotlightDelayMs);

      if (domiSpotlightDelayMs > 0) {
        const spotlightLabel = smartBarMobileResultIsGeneric(result)
          ? result.navigationRevealLabel || "Spotlighting"
          : "Spotlighting";
        setSubmittedPromptPreview(spotlightLabel);
        setBuildingStatusLabel(spotlightLabel);
        setCartExpanded(false);

        buildTimerRef.current = window.setTimeout(() => {
          buildTimerRef.current = null;
          revealDomiDemoResult(result);
        }, domiSpotlightDelayMs);
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
    const handleDomiOpenEntry = (event: Event) => {
      const shouldResetDomiState = Boolean((event as CustomEvent<{ reset?: boolean }>).detail?.reset);
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
      setOrderPricingMode("exact");
      setOrderEstimatedSubtotal(undefined);
      setOrderEstimatedTax(undefined);
      setOrderEstimatedTotal("-");
      setHasCart(false);
      setCartExpanded(false);
      setSubmittedPromptPreview("");
      setEntryDraft("");
      setHasEditedEntryDraft(false);
      if (shouldResetDomiState) onResetCart?.();
      setPhase("entry");
    };

    window.addEventListener("smartbar-mobile-domi-open-entry", handleDomiOpenEntry as EventListener);

    return () => {
      window.removeEventListener("smartbar-mobile-domi-open-entry", handleDomiOpenEntry as EventListener);
    };
  }, [onResetCart]);

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
          : actionId === "booking-nav-back"
            ? "Back"
            : actionId === "booking-context-continue"
            ? "Continue search"
            : actionId === "booking-summary" || actionId === "booking-handoff"
              ? "Prepare booking summary"
              : "SmartBar action",
      );
      setBuildingStatusLabel(
        actionId === "booking-summary" || actionId === "booking-handoff"
          ? "Preparing booking..."
          : "Spotlighting",
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
        label: actionLabel.replace(/->/g, "").replace(/\s+/g, " ").trim(),
        variant: actionElement.getAttribute("data-smartbar-mobile-content-action-variant") === "secondary"
          ? "secondary"
          : "primary",
      },
      genericResult,
    );
  };

  const showCartToggle = handoffState === "idle" && hasCart && (phase === "entry" || phase === "cart");
  const cartToggleShowsUp = phase === "entry" || !cartExpanded;
  const cartToggleShowsAdd =
    phase === "cart" &&
    cartExpanded &&
    !expandedBundleLineId &&
    !selectedLine &&
    !genericResult;
  const genericCompanionPolicyStatus: SmartBarMobileOrderStatus | null = phase === "cart" && genericResult
    ? /previewing|choose room|add room|tap packages|tap when done|review packages/i.test(genericResult.statusLabel || "")
      ? "options"
      : null
    : null;
  const companionPolicyStatus: SmartBarMobileOrderStatus | null = demoCompanionMessage
    ? demoCompanionMessage.status ?? null
    : demoMontageStage
      ? demoMontageStage.status ?? null
      : phase === "cart" && genericResult
        ? genericCompanionPolicyStatus
        : phase === "cart"
          ? selectedLine?.status === "options" || selectedLine?.status === "unknown" || selectedLine?.status === "pending"
            ? selectedLine.status
            : expandedBundleLineId && expandedBundleLine
              ? expandedBundleLine.status
            : !selectedLine
              ? effectiveCartGuidanceStatus
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
  } = getSmartBarMobileShellStyles(isOverlay, checkoutReady);

  const genericActions = genericResult?.actions || [];
  const bookingNavActions = genericActions.filter((action) =>
    action.id === "booking-nav-back" ||
    action.id === "booking-add-room" ||
    action.id === "booking-edit-room-search" ||
    action.id === "booking-review-packages" ||
    action.id === "booking-nav-next",
  );
  const standardGenericActions = genericActions
    .filter((action) =>
      action.id !== "booking-nav-back" &&
      action.id !== "booking-add-room" &&
      action.id !== "booking-edit-room-search" &&
      action.id !== "booking-review-packages" &&
      action.id !== "booking-nav-next",
    )
    .filter((action) => {
      const isBookingSurface =
        genericResult?.surfaceKind === "booking_tour" ||
        genericResult?.surfaceKind === "booking_summary";

      if (!isBookingSurface) return true;

      if (/tap for booking/i.test(genericResult?.statusLabel || "") &&
        (action.id === "booking-summary" || action.id === "booking-handoff")) {
        return false;
      }

      if (/tap when done/i.test(genericResult?.statusLabel || "") && action.id === "booking-packages-done") {
        return false;
      }

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
        ? "flex h-[58px] w-[64px] shrink-0 items-center justify-center rounded-full border border-rose-100/44 bg-rose-500/95 px-0 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_24px_rgba(225,29,72,0.28)] ring-1 ring-rose-100/34 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        : "flex h-[58px] w-[64px] shrink-0 items-center justify-center rounded-full border border-rose-100/34 bg-rose-500/88 px-0 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_24px_rgba(225,29,72,0.22)] ring-1 ring-rose-100/26 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
    }

    if (action.id === "booking-nav-next") {
      return strongPills
        ? "flex h-[58px] w-[64px] shrink-0 items-center justify-center rounded-full bg-emerald-300/98 px-0 text-center text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.54),0_10px_24px_rgba(16,185,129,0.30)] ring-1 ring-emerald-50/58 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        : "flex h-[58px] w-[64px] shrink-0 items-center justify-center rounded-full bg-emerald-300/94 px-0 text-center text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_10px_24px_rgba(16,185,129,0.24)] ring-1 ring-emerald-100/50 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
    }

    if (action.id === "booking-edit-room-search") {
      return strongPills
        ? "flex h-[58px] w-[54px] shrink-0 items-center justify-center rounded-full border border-white/24 bg-slate-950/92 px-0 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(2,6,23,0.30)] ring-1 ring-white/18 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        : "flex h-[58px] w-[54px] shrink-0 items-center justify-center rounded-full border border-white/18 bg-slate-950/78 px-0 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.22)] ring-1 ring-white/12 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
    }

    if (action.id === "booking-add-room" || action.id === "booking-review-packages") {
      return strongPills
        ? "flex h-[58px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-amber-100/60 bg-amber-300/98 px-3 py-2 text-center text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_10px_24px_rgba(180,83,9,0.28)] ring-1 ring-amber-50/54 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        : "flex h-[58px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-amber-100/46 bg-amber-300/92 px-3 py-2 text-center text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_10px_24px_rgba(180,83,9,0.20)] ring-1 ring-amber-100/40 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
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
            className={`${demoInteractionPointerClass} fixed inset-x-0 z-[10083] flex justify-center px-0`}
            aria-hidden={demoInteractionLocked ? true : undefined}
            style={{ bottom: 76 + keyboardLift + overlayBottomLiftPx, ...smartBarAdaptiveRailStyle }}
          >
            <div
              data-smartbar-mobile-adaptive-surface="true"
              className={upperGlassClass}
              style={{ ...SMARTBAR_MOBILE_BLUE_CONTROL_STYLE, width: entryPillWidth, height: entryComposerHeight, borderRadius: entryComposerRadius }}
            >
              <div className="relative h-full px-3 py-2">
                {demoInteractionLocked && entryFocused && !entryDraft.trim() && (
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
                    if (demoInteractionLocked) return;
                    setEntryDraft(event.target.value);
                    setHasEditedEntryDraft(true);
                  }}
                  onFocus={() => {
                    if (demoInteractionLocked) return;
                    setEntryFocused(true);
                  }}
                  onBlur={() => setEntryFocused(false)}
                  readOnly={demoInteractionLocked}
                  tabIndex={demoInteractionLocked ? -1 : undefined}
                  className={`relative z-[2] h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-left text-[16px] font-normal leading-5 outline-none ring-0 placeholder:text-white/40 ${
                    demoInteractionLocked
                      ? "text-white caret-transparent selection:bg-transparent"
                      : "text-white caret-white selection:bg-white/24"
                  }`}
                  style={{
                    caretColor: demoInteractionLocked ? "transparent" : "#fff",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                  }}
                  placeholder=""
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="none"
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {(phase === "building_cart" || (phase === "cart" && !demoCollapsedSurfaceHidden)) && (
          <motion.section
            key="fake-cart-surface"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`${demoInteractionPointerClass} fixed inset-x-0 z-[10083] flex justify-center px-0`}
            aria-hidden={demoInteractionLocked ? true : undefined}
            style={{ bottom: 76 + keyboardLift + overlayBottomLiftPx, ...smartBarAdaptiveRailStyle }}
          >
            <motion.div
              data-smartbar-mobile-adaptive-surface="true"
              className={upperGlassClass}
              style={{ ...SMARTBAR_MOBILE_FOG_GLASS_STYLE, width: entryPillWidth, maxHeight: adaptiveSurfaceMaxHeight }}
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
                    ref={selectedDetailMeasureRef}
                    key={`fake-item-detail-${selectedLine.id}`}
                    initial={demoWalkthroughDecisionPanelSwap ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={demoWalkthroughDecisionPanelSwap ? { opacity: 0 } : { opacity: 0 }}
                    transition={demoWalkthroughDecisionPanelSwap ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
                    className="flex h-full min-h-0 flex-col p-3"
                  >
                    {selectedLineUseLightThemedDetail ? (
                      <div
                        data-smartbar-mobile-detail-theme="canonical"
                        className={(genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat") ? "hidden" : smartBarMobileDetailTheme.lightHeader}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={smartBarMobileDetailTheme.lightHeaderIcon}>
                              {selectedLineUseLightUnknownDetail ? (
                                <CircleHelp className="h-[18px] w-[18px] stroke-[2.2]" aria-hidden="true" />
                              ) : selectedLineUseLightCustomerNoteDetail ? (
                                <StickyNote className="h-[18px] w-[18px] stroke-[2.2]" aria-hidden="true" />
                              ) : selectedLineUseConditionalDetail ? (
                                <GitBranch className="h-[18px] w-[18px] stroke-[2.2]" aria-hidden="true" />
                              ) : selectedLineUseLightReadyDetail ? (
                                <Package className="h-[18px] w-[18px] stroke-[2.2]" aria-hidden="true" />
                              ) : (
                                <SlidersHorizontal className="h-[18px] w-[18px] stroke-[2.2]" aria-hidden="true" />
                              )}
                            </span>
                            <div className={smartBarMobileDetailTheme.eyebrow}>
                              {selectedLineThemedHeaderEyebrow}
                            </div>
                          </div>
                          <div
                            className={`inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ring-1 ${statusClass(selectedLine.status)}`}
                            aria-label={selectedLineThemedHeaderAriaLabel}
                          >
                            {selectedLineUseLightUnknownDetail ? (
                              <CircleHelp className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
                            ) : selectedLineUseLightReadyDetail || selectedLineUseLightCustomerNoteDetail ? (
                              <BadgeCheck className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
                            ) : null}
                            <span>{selectedLineThemedHeaderStatusLabel}</span>
                          </div>
                        </div>
                        <div className={smartBarMobileDetailTheme.title}>
                          {selectedLineThemedHeaderTitle}
                        </div>
                      </div>
                    ) : (
                      <div className={(genericResult?.surfaceKind === "info" || genericResult?.surfaceKind === "chat") ? "hidden" : "flex shrink-0 items-start justify-between gap-3 rounded-[24px] border border-white/18 bg-slate-950/82 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(2,6,23,0.24)] ring-1 ring-white/12"}>
                        <div className="min-w-0 flex-1">
                          <div className="inline-flex max-w-full items-center rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_12px_rgba(2,6,23,0.14)]">
                            {selectedLine.status === "unknown" ? "Clarify item" : selectedLine.isCustomerNote ? "Customer note" : "Item details"}
                          </div>
                          <div className="mt-1 max-h-[58px] overflow-hidden text-xl font-black leading-tight tracking-tight">
                            {selectedLineFullTitle || smartBarMobileShortTitle(selectedLine.title)}
                          </div>
                        </div>
                        {selectedLine.status !== "unknown" ? (
                          <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${statusClass(selectedLine.status)}`}>
                            {statusLabel(selectedLine.status)}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {!demoWalkthroughHideCartChrome && !selectedLine.demoHideMeta && selectedLine.status !== "unknown" && !selectedLine.priceSuppressed && (
                      <div
                        data-smartbar-mobile-detail-utilities="dark"
                        className="mt-2 flex shrink-0 items-center justify-center gap-2"
                      >
                        {selectedLinePreviousOptionGroup ? (
                          <button
                            type="button"
                            data-smartbar-mobile-previous-options="true"
                            onClick={openSelectedLinePreviousOptionGroup}
                            className={`${smartBarMobileDetailTheme.darkUtilityButton} gap-1.5 bg-slate-950/82 px-3 text-xs font-black text-white`}
                            aria-label={`Back to ${selectedLinePreviousOptionGroup.label}`}
                            title={`Back to ${selectedLinePreviousOptionGroup.label}`}
                          >
                            <ArrowLeft className="h-[16px] w-[16px] shrink-0 stroke-[2.7]" aria-hidden="true" />
                            <span>Back</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          data-smartbar-mobile-item-summary="true"
                          onClick={() => setSelectedDetailMode((current) => (current === "summary" && selectedLineHasOptions ? "choices" : "summary"))}
                          className={selectedLineUseLightThemedDetail
                            ? `${smartBarMobileDetailTheme.darkUtilityButton} w-11 text-white`
                            : `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_7px_14px_rgba(2,6,23,0.22)] ring-1 ring-white/12 transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] ${selectedDetailMode === "summary" ? "bg-sky-200 text-slate-950" : "bg-slate-950/82 text-white"}`}
                          aria-pressed={selectedDetailMode === "summary"}
                          aria-label={selectedLineUseLightThemedDetail && selectedDetailMode === "summary" ? "Edit item choices" : "Show item summary"}
                          title={selectedLineUseLightThemedDetail && selectedDetailMode === "summary" ? "Edit choices" : "Summary"}
                        >
                          {selectedLineUseLightThemedDetail && selectedDetailMode === "summary" ? (
                            <Pencil className="h-[17px] w-[17px] shrink-0 stroke-[2.4]" aria-hidden="true" />
                          ) : (
                            <ListOrdered className="h-[18px] w-[18px] shrink-0 stroke-[2.5]" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          data-smartbar-mobile-detail-remove="true"
                          onClick={() => removeLine(selectedLine)}
                          className={`${smartBarMobileDetailTheme.darkUtilityButton} w-11 text-white/88`}
                          aria-label={`Remove ${selectedLine.title}`}
                          title="Remove item"
                        >
                          <Trash2 className="h-[18px] w-[18px] shrink-0 stroke-[2.5]" aria-hidden="true" />
                        </button>
                      </div>
                    )}

                    {selectedLineNoChoicesNeeded ? (
                      <div className="mt-4 flex min-h-0 flex-1 items-start justify-center">
                        <div className="inline-flex min-h-[42px] max-w-full items-center justify-center gap-2 rounded-full border border-emerald-100/70 bg-emerald-100/92 px-4 py-2.5 text-sm font-black leading-5 text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_7px_14px_rgba(15,23,42,0.12)] ring-1 ring-emerald-900/8">
                          <Check className="h-4 w-4 shrink-0 stroke-[2.75]" aria-hidden="true" />
                          <span>Ready as is</span>
                        </div>
                      </div>
                    ) : selectedDetailMode === "summary" ? (
                      <div
                        className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                      >
                        <div
                          ref={selectedSummaryContentMeasureRef}
                          data-smartbar-mobile-summary-content-measure="true"
                          className="pb-4"
                        >
                          {!selectedLine.isCustomerNote ? (
                            selectedLineUseLightThemedSummary ? (
                              <div className={smartBarMobileDetailTheme.lightSectionRow}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className={smartBarMobileDetailTheme.lightSectionIcon}>
                                    <ListOrdered className="h-4 w-4 stroke-[2.3]" aria-hidden="true" />
                                  </span>
                                  <span className={smartBarMobileDetailTheme.glassSectionLabel}>
                                    Item summary
                                  </span>
                                </div>
                                {!restaurantCalculatedPricing && !selectedLine.priceSuppressed ? (
                                  <span className={smartBarMobileDetailTheme.lightPricePill}>
                                    {selectedLine.price}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-white/18 bg-slate-950/80 px-3.5 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_18px_rgba(2,6,23,0.18)] ring-1 ring-white/10">
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/66">Item summary</div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <span className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.10em] ring-1 ${statusClass(selectedLine.status)}`}>
                                    {statusLabel(selectedLine.status)}
                                  </span>
                                  {!restaurantCalculatedPricing && !selectedLine.priceSuppressed ? (
                                    <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/14 bg-white/[0.10] px-3 py-1 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                                      {selectedLine.price}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )
                          ) : null}

                        {selectedLine.isCustomerNote ? (
                          <div className="space-y-4 px-1" data-smartbar-mobile-customer-note-detail="true">
                            <div>
                              <div className={smartBarMobileDetailTheme.lightSectionRow}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className={smartBarMobileDetailTheme.lightSectionIcon}>
                                    <CircleHelp className="h-4 w-4 stroke-[2.3]" aria-hidden="true" />
                                  </span>
                                  <span className={smartBarMobileDetailTheme.glassSectionLabel}>
                                    Original request
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2.5 rounded-[18px] border border-white/58 bg-white/76 px-3.5 py-3 text-[14px] font-bold leading-5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_4px_10px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/5">
                                {selectedLineCustomerOriginalRequest || "Unresolved request"}
                              </div>
                            </div>
                            <div>
                              <div className={smartBarMobileDetailTheme.lightSectionRow}>
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className={smartBarMobileDetailTheme.lightSectionIcon}>
                                    <StickyNote className="h-4 w-4 stroke-[2.3]" aria-hidden="true" />
                                  </span>
                                  <span className={smartBarMobileDetailTheme.glassSectionLabel}>
                                    Note for restaurant
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2.5 rounded-[18px] border border-sky-100/72 bg-sky-50/78 px-3.5 py-3 text-[15px] font-black leading-5 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.80),0_5px_12px_rgba(14,116,144,0.08)] ring-1 ring-sky-900/5">
                                {selectedLineCustomerNoteText || "Saved for restaurant"}
                              </div>
                            </div>
                          </div>
                        ) : (
                              <div className="mt-3 px-1">
                          <div className="text-[12px] font-black uppercase tracking-[0.08em] text-[#334155]">Selections</div>
                          {selectedLineHasSummarySelections ? (
                            <div className="mt-2 space-y-3">
                              {selectedLineSummaryGroups.map((group) => (
                                <div key={group.id}>
                                  {group.label ? (
                                    <div className="mb-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#334155]">
                                      {group.label}
                                    </div>
                                  ) : null}
                                  <div className="flex flex-wrap items-start gap-2">
                                    {group.selections.map((detail) => (
                                      <div
                                        key={`${group.id}-${detail}`}
                                        className="inline-flex min-h-[40px] max-w-full basis-auto items-center gap-2 rounded-full border border-white/44 bg-white/94 px-3.5 py-2 text-sm font-black leading-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_6px_12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/6"
                                      >
                                        <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.75]" />
                                        <span className="min-w-0 whitespace-normal break-words">{detail}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 inline-flex min-h-[40px] max-w-full items-center rounded-full border border-white/36 bg-white/88 px-3.5 py-2 text-sm font-black leading-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.66),0_6px_12px_rgba(15,23,42,0.10)]">
                              {selectedLine.helper || "No selections yet."}
                            </div>
                          )}
                        </div>
                        )}
                          {!!selectedLineMissingDetails.length && (
                            <div className="mt-3 px-1">
                              <div className="text-[12px] font-black uppercase tracking-[0.08em] text-rose-800">Missing</div>
                              <div className="mt-2 flex flex-wrap items-start gap-2">
                                {selectedLineMissingDetails.map((detail) => (
                                  <div
                                    key={detail}
                                    className="inline-flex min-h-[40px] max-w-full basis-auto items-center rounded-full border border-red-100/44 bg-white/92 px-3.5 py-2 text-sm font-black leading-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_6px_12px_rgba(15,23,42,0.12)]"
                                  >
                                    {detail}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : selectedLine.status === "unknown" ? (
                      <div
                        className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                      >
                        <div
                          ref={selectedUnknownContentMeasureRef}
                          data-smartbar-mobile-unknown-content-measure="true"
                          className="space-y-2.5 pb-4"
                        >
                        {selectedLineDirectNoteRouting ? (
                          <>
                            <div className="shrink-0 px-1" data-smartbar-mobile-note-target-picker="true">
                              <div
                                data-smartbar-mobile-note-preview="true"
                                title={retryDraft.trim()}
                                className="max-h-[84px] min-h-[44px] overflow-y-auto whitespace-pre-wrap break-words rounded-[18px] border border-white/54 bg-white/84 px-3.5 py-3 text-[14px] font-extrabold leading-5 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_6px_12px_rgba(15,23,42,0.08)] [scrollbar-width:thin]"
                              >
                                {retryDraft.trim()}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-start gap-2 px-1">
                              {noteTargetChoices.map((choice) => (
                                <button
                                  key={choice.key}
                                  type="button"
                                  data-smartbar-mobile-note-target="item"
                                  data-smartbar-mobile-note-target-key={choice.key}
                                  onClick={() => attachUnknownAsNote(choice.line)}
                                  disabled={demoInteractionLocked || retryCheckingLineId === selectedLineInstanceKey}
                                  className={`relative inline-flex min-h-[44px] max-w-full basis-auto items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-bold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_14px_rgba(2,6,23,0.18)] ring-1 ring-white/54 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                    SMARTBAR_MOBILE_STRONG_ACTION_PILLS ? "bg-white/96" : "bg-white/88"
                                  }`}
                                >
                                  <span className="min-w-0 whitespace-normal break-words">{choice.label}</span>
                                </button>
                              ))}
                              <button
                                type="button"
                                data-smartbar-mobile-note-target="general"
                                onClick={saveUnknownAsGeneralNote}
                                disabled={demoInteractionLocked || retryCheckingLineId === selectedLineInstanceKey}
                                className="relative inline-flex min-h-[44px] max-w-full basis-auto items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-center text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_7px_14px_rgba(2,6,23,0.20)] ring-1 ring-white/18 transition disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <StickyNote className="h-4 w-4 shrink-0 stroke-[2.4]" aria-hidden="true" />
                                <span className="min-w-0 whitespace-normal break-words">General order note</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                              <>
                                <div className="flex flex-wrap items-start gap-2 px-1" data-smartbar-mobile-candidate-resolution="true">
                                  {selectedLineCandidateResolution?.candidates.map((candidate) => {
                                    const candidateIsSubmitting = Boolean(
                                      retryCheckingLineId === selectedLineInstanceKey &&
                                      candidateSubmittingItemId === candidate.itemId,
                                    );
                                    const candidateFailed = Boolean(
                                      !candidateIsSubmitting &&
                                      candidateFailedItemId === candidate.itemId,
                                    );

                                    return (
                                      <button
                                        key={candidate.itemId}
                                        type="button"
                                        data-smartbar-mobile-candidate-item="true"
                                        data-smartbar-mobile-candidate-item-id={candidate.itemId}
                                        data-smartbar-mobile-candidate-selected={candidateIsSubmitting ? "true" : undefined}
                                        data-smartbar-mobile-candidate-failed={candidateFailed ? "true" : undefined}
                                        onClick={() => submitCandidateSelection(candidate)}
                                        disabled={demoInteractionLocked || retryCheckingLineId === selectedLineInstanceKey}
                                        aria-busy={candidateIsSubmitting}
                                        aria-label={candidateFailed ? `${candidate.label}. Did not finish. Tap to try again.` : candidate.label}
                                        className={`relative inline-flex min-h-[44px] max-w-full basis-auto items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_14px_rgba(2,6,23,0.18)] ring-1 transition disabled:cursor-wait ${
                                          candidateFailed ? "flex-col gap-0.5" : "gap-2"
                                        } ${
                                          candidateIsSubmitting
                                            ? "bg-[#012169] text-white ring-[#012169]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_rgba(1,33,105,0.28)]"
                                            : candidateFailed
                                              ? "bg-amber-100/96 text-amber-950 ring-amber-300/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_18px_rgba(120,53,15,0.16)]"
                                              : `${SMARTBAR_MOBILE_STRONG_ACTION_PILLS ? "bg-white/96" : "bg-white/88"} text-slate-950 ring-white/54`
                                        }`}
                                      >
                                        {candidateIsSubmitting ? (
                                          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin stroke-[2.5]" aria-hidden="true" />
                                        ) : null}
                                        <span className="min-w-0 whitespace-normal break-words">{candidate.label}</span>
                                        {candidateFailed ? (
                                          <span className="text-[10px] font-black uppercase tracking-[0.06em] text-amber-800">
                                            Tap to try again
                                          </span>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    data-smartbar-mobile-candidate-manual-toggle="true"
                                    data-smartbar-mobile-candidate-manual-open={candidateManualEntryOpen ? "true" : undefined}
                                    onClick={openCandidateManualEntry}
                                    disabled={demoInteractionLocked || retryCheckingLineId === selectedLineInstanceKey}
                                    className={`relative inline-flex min-h-[44px] max-w-full basis-auto items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_14px_rgba(2,6,23,0.18)] ring-1 transition disabled:cursor-wait ${
                                      candidateManualEntryOpen
                                        ? "bg-slate-950 text-white ring-white/18"
                                        : `${SMARTBAR_MOBILE_STRONG_ACTION_PILLS ? "bg-white/96" : "bg-white/88"} text-slate-950 ring-white/54`
                                    }`}
                                  >
                                    <Pencil className="h-4 w-4 shrink-0 stroke-[2.4]" aria-hidden="true" />
                                    <span>Type it in</span>
                                  </button>
                                </div>
                                {candidateManualEntryOpen ? (
                                  <div className="relative shrink-0 px-1 pt-1" data-smartbar-mobile-candidate-manual-panel="true">
                                    <Pencil
                                      className="pointer-events-none absolute left-5 top-5 z-10 h-4 w-4 text-slate-500"
                                      strokeWidth={2.4}
                                      aria-hidden="true"
                                    />
                                    <textarea
                                      data-smartbar-mobile-candidate-manual-input="true"
                                      ref={retryTextareaRef}
                                      value={retryDraft}
                                      onChange={(event) => {
                                        if (demoInteractionLocked) return;
                                        setRetryDraft(event.target.value);
                                      }}
                                      disabled={demoInteractionLocked || retryCheckingLineId === selectedLineInstanceKey}
                                      readOnly={demoInteractionLocked}
                                      tabIndex={demoInteractionLocked ? -1 : undefined}
                                      className={`${retryInputClass} !min-h-[92px] !w-full !rounded-[20px] !border !border-slate-900/10 !bg-white/92 !py-3.5 !pl-11 !pr-4 !text-[15px] !font-bold !leading-6 !text-slate-950 !caret-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.80),0_8px_18px_rgba(15,23,42,0.10)] placeholder:!font-semibold placeholder:!text-slate-500 focus:!border-sky-400/80 focus:!outline-none focus:!ring-2 focus:!ring-sky-300/55 focus:placeholder:!text-transparent disabled:!opacity-70`}
                                      placeholder={selectedLineGrayPlaceholder}
                                      aria-label="Type the request exactly as a restaurant note"
                                      rows={3}
                                    />
                                  </div>
                                ) : null}
                              </>
                          </>
                        )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-4 pr-1 touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                      >
                        {!selectedLine.options?.length && (
                          <div className="rounded-[24px] border border-white/18 bg-slate-950/78 px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(2,6,23,0.20)] ring-1 ring-white/10">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/66">Summary</div>
                            <div className="mt-2 rounded-[18px] bg-white/92 px-3 py-3 text-sm font-black leading-5 text-slate-950">
                              {selectedLine.helper || "No choices needed for this item."}
                            </div>
                          </div>
                        )}
                        {!!selectedLine.options?.length && (
                          <div
                            ref={selectedChoiceContentMeasureRef}
                            data-smartbar-mobile-choice-content-measure="true"
                            className="mt-1"
                          >
                            {selectedLineUseConditionalDetail ? (
                              <div className="mb-2.5" data-smartbar-mobile-conditional-context="true">
                                <div className={smartBarMobileDetailTheme.lightSectionRow}>
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <span className={smartBarMobileDetailTheme.lightSectionIcon}>
                                      <GitBranch className="h-4 w-4 stroke-[2.3]" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0">
                                      <div className={smartBarMobileDetailTheme.glassSectionLabel}>
                                        {selectedLineConditionalDisplayTitle}
                                      </div>
                                      {selectedLineConditionalDisplayPrompt &&
                                      selectedLineConditionalDisplayPrompt.toLocaleLowerCase() !==
                                        selectedLineConditionalDisplayTitle.toLocaleLowerCase() ? (
                                        <div className="mt-0.5 text-[13px] font-extrabold leading-4 text-[#06143A]">
                                          {selectedLineConditionalDisplayPrompt}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 px-1 text-[13px] font-bold leading-5 tracking-[0.01em] text-slate-700">
                                  {smartBarMobileLineSelectionInstruction(selectedLine)}
                                </div>
                              </div>
                            ) : (
                              <div className="mb-2.5 px-1 text-[13px] font-bold leading-5 tracking-[0.01em] text-slate-700">
                                {smartBarMobileLineSelectionInstruction(selectedLine)}
                              </div>
                            )}
                            <div className="flex flex-wrap items-start gap-2">
                              {selectedLine.options.map((option) => {
                                const persistedSelected = smartBarMobileLineHasOptionDetail(selectedLine, option);
                                const isSelected = persistedSelected ||
                                  (
                                    selectedChoice?.lineId === selectedLineInstanceKey &&
                                    (!selectedChoice.groupId || selectedChoice.groupId === selectedLine.activeOptionGroupId) &&
                                    selectedChoice.value === option
                                  );
                                const isMultiSelect = selectedLine.optionSelectionMode
                                  ? selectedLine.optionSelectionMode === "multi"
                                  : selectedLine.status === "options";
                                const conditionalLockOptionIndex = selectedLineActiveOptionGroup
                                  ? selectedLineActiveOptionGroup.options.findIndex((candidate) => (
                                      smartBarMobileOptionLabelsEqual(candidate, option)
                                    ))
                                  : -1;
                                const conditionalLockOptionId = conditionalLockOptionIndex >= 0
                                  ? String(selectedLineActiveOptionGroup?.optionIds?.[conditionalLockOptionIndex] || "")
                                  : "";
                                const optionOwnsPendingConditionalChild = Boolean(
                                  selectedLineAtConditionalHomeGroup &&
                                  selectedLineConditionalDescendantAttentionGroup &&
                                  selectedLineActiveOptionGroup &&
                                  smartBarMobileConditionalChildrenForOption(
                                    selectedLine,
                                    selectedLineActiveOptionGroup,
                                    conditionalLockOptionId,
                                    option,
                                  ).includes(selectedLineConditionalDescendantAttentionGroup.id)
                                );
                                const conditionalChildResolutionLock = Boolean(
                                  selectedLineAtConditionalHomeGroup &&
                                  selectedLineConditionalDescendantAttentionGroup &&
                                  !optionOwnsPendingConditionalChild
                                );
                                const selectionLimitReached = isMultiSelect && !isSelected && smartBarMobileLineAtSelectionLimit(selectedLine);
                                const selectedChoiceLocksActiveGroup = Boolean(
                                  selectedChoice?.lineId === selectedLineInstanceKey &&
                                  (!selectedChoice.groupId || selectedChoice.groupId === selectedLine.activeOptionGroupId)
                                );
                                const isLocked = conditionalChildResolutionLock || selectionLimitReached || (!isMultiSelect && selectedChoiceLocksActiveGroup && !isSelected);
                                const optionQuantity = smartBarMobileLineOptionQuantity(selectedLine, option);
                                const optionMaximum = smartBarMobileLineOptionMaximum(selectedLine, option);
                                const showDoubleControl = isMultiSelect && isSelected && optionMaximum === 2;
                                const totalSelectionCount = smartBarMobileLineSelectionCount(selectedLine);
                                const maximumSelections = smartBarMobileLineMaximumSelections(selectedLine);
                                const doubleWouldExceedLimit = optionQuantity === 1 &&
                                  maximumSelections !== undefined &&
                                  totalSelectionCount >= maximumSelections;

                                return (
                                  <div
                                    key={`${selectedLine.activeOptionGroupId || "options"}:${option}`}
                                    className="inline-flex max-w-full items-stretch"
                                  >
                                  <button
                                    type="button"
                                    data-smartbar-mobile-option="true"
                                    data-smartbar-mobile-option-key={smartBarMobileDemoKey(option)}
                                    data-smartbar-mobile-option-group-id={selectedLine.activeOptionGroupId}
                                    data-smartbar-mobile-option-selected={isSelected ? "true" : undefined}
                                    data-smartbar-mobile-option-mode={isMultiSelect ? "multi" : "single"}
                                    onClick={() => applyLineChoice(selectedLine, option)}
                                    disabled={Boolean(conditionalChildResolutionLock || selectionLimitReached || (!isMultiSelect && selectedChoiceLocksActiveGroup))}
                                    aria-disabled={isLocked}
                                    className={`relative inline-flex min-h-[44px] max-w-full basis-auto items-center justify-center overflow-visible ${showDoubleControl ? "rounded-l-full pl-4 pr-3" : "rounded-full px-4"} py-2.5 text-center text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_14px_rgba(2,6,23,0.18)] transition ${
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
                                    {demoOptionCue?.active && demoOptionCue.value.trim().toLowerCase() === option.trim().toLowerCase() ? (
                                      <motion.span
                                        key={`smartbar-demo-option-cue-${selectedLine.id}-${smartBarMobileDemoKey(option)}-${demoOptionCue.runKey ?? "cue"}`}
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -right-1 -top-1 z-20 h-8 w-8 rounded-full border-2 border-[#012169] bg-white/72 shadow-[0_12px_24px_rgba(1,33,105,0.20)] ring-4 ring-white/70"
                                        initial={{ opacity: 0, scale: 0.72 }}
                                        animate={{ opacity: [0, 1, 0.9, 0], scale: [0.72, 1.05, 1.2, 1.5] }}
                                        transition={{ duration: 1.02, times: [0, 0.16, 0.58, 1], ease: "easeOut" }}
                                      >
                                        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169]" />
                                      </motion.span>
                                    ) : null}
                                    <span className="flex min-w-0 max-w-full items-center justify-center gap-2.5 text-center">
                                      <span className="min-w-0 whitespace-normal break-words leading-tight">{option}</span>
                                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                    </span>
                                  </button>
                                  {showDoubleControl ? (
                                    <button
                                      type="button"
                                      data-smartbar-mobile-option-quantity="true"
                                      data-smartbar-mobile-option-quantity-value={optionQuantity}
                                      onClick={() => applyLineChoice(
                                        selectedLine,
                                        option,
                                        optionQuantity === 2 ? 1 : 2,
                                      )}
                                      disabled={conditionalChildResolutionLock || doubleWouldExceedLimit}
                                      aria-label={
                                        optionQuantity === 2
                                          ? `Change ${option} to single`
                                          : `Double ${option}`
                                      }
                                      className={`min-h-[44px] shrink-0 rounded-r-full border-l border-emerald-950/18 px-3 py-2.5 text-[12px] font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_14px_rgba(2,6,23,0.18)] transition ${
                                        optionQuantity === 2
                                          ? "bg-emerald-200 text-emerald-950 ring-2 ring-emerald-50/54"
                                          : conditionalChildResolutionLock || doubleWouldExceedLimit
                                            ? "bg-emerald-200/55 text-emerald-950/45"
                                            : "bg-emerald-200 text-emerald-950 hover:bg-emerald-100"
                                      }`}
                                    >
                                      {optionQuantity === 2 ? "2×" : "+ Double"}
                                    </button>
                                  ) : null}
                                  </div>
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
                    initial={demoWalkthroughDecisionPanelSwap ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={demoWalkthroughDecisionPanelSwap ? { opacity: 0, y: 0 } : { opacity: 0, y: -8 }}
                    transition={demoWalkthroughDecisionPanelSwap ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
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
                        : `${genericResult?.surfaceKind === "info" ? "mt-0 max-h-[75svh] shrink-0" : isBookingGenericSurface ? "mt-0 max-h-[80svh] shrink-0" : "mt-0 max-h-[72svh] shrink-0"} min-h-0 overflow-y-auto overflow-x-hidden pr-0 pb-0 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
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
                          {typeof genericResult.content === "string" ? (
                            <SmartBarMobileFormattedBody text={genericResult.content} />
                          ) : (
                            genericResult.content
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {genericResult.body && (
                            <div className="rounded-[24px] border border-white/18 bg-slate-950/68 px-4 py-3 text-[15px] font-semibold leading-6 text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
                              <SmartBarMobileFormattedBody text={genericResult.body} />
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
                          <div className="flex items-stretch gap-2">
                            {bookingNavActions.map((action) => {
                              const isBack = action.id === "booking-nav-back";
                              const isNext = action.id === "booking-nav-next";
                              const isEdit = action.id === "booking-edit-room-search";
                              const isPrimaryBookingWizardAction =
                                action.id === "booking-add-room" || action.id === "booking-review-packages";

                              return (
                                <button
                                  key={action.id}
                                  type="button"
                                  data-smartbar-mobile-generic-action={action.id}
                                  data-domi-demo-next-target={isNext ? "true" : undefined}
                                  data-domi-demo-summary-target={action.id === "booking-summary" || action.id === "booking-handoff" || /prepare booking summary/i.test(action.label) ? "true" : undefined}
                                  disabled={action.disabled}
                                  onClick={() => handleGenericActionClick(action, genericResult)}
                                  className={genericActionButtonClass(action)}
                                  aria-label={action.label}
                                >
                                  {isBack ? (
                                    <ArrowRight className="h-5 w-5 shrink-0 rotate-180" />
                                  ) : isNext ? (
                                    <ArrowRight className="h-5 w-5 shrink-0" />
                                  ) : isEdit ? (
                                    <Pencil className="h-[18px] w-[18px] shrink-0" />
                                  ) : isPrimaryBookingWizardAction ? (
                                    <>
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950/12 text-[22px] font-black leading-none ring-1 ring-slate-950/10">
                                        +
                                      </span>
                                      <span className="min-w-0 text-left">
                                        <span className="block truncate leading-5">{action.label}</span>
                                        {action.helper && <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-72">{action.helper}</span>}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="min-w-0">
                                      <span className="block leading-5">{action.label}</span>
                                      {action.helper && <span className="mt-0.5 block truncate text-[11px] font-semibold opacity-72">{action.helper}</span>}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
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
                    initial={demoWalkthroughDecisionPanelSwap ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={demoWalkthroughDecisionPanelSwap ? { opacity: 0, y: 0 } : { opacity: 0, y: -8 }}
                    transition={demoWalkthroughDecisionPanelSwap ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                    className={`relative flex h-full min-h-0 flex-col ${demoCompactCartRows ? "p-3" : "p-4"}`}
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="block w-fit text-xl font-black tracking-tight text-[#06143A]">
                          <span className="sm:hidden">Order</span>
                          <span className="hidden sm:inline">Review order</span>
                        </div>
                      </div>

                      {restaurantCalculatedPricing ? (
                        <div
                          className="flex shrink-0 items-center gap-2.5 text-left"
                          aria-label="Pay at pickup. Calculated onsite."
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/58 bg-white/55 text-[#172554] shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_4px_10px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
                            <Store className="h-[17px] w-[17px] stroke-[2.2]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 max-w-[160px]">
                            <span className="block text-[12px] font-bold leading-4 text-[#06143A]">
                              Pay at pickup
                            </span>
                            <span className="block text-[12px] font-medium leading-4 text-slate-600">
                              Calculated onsite
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[13px] font-black uppercase tracking-[0.08em] text-white tabular-nums ring-1 ring-white/28"
                          style={SMARTBAR_MOBILE_BLUE_CONTROL_STYLE}
                          aria-label={`Order total ${cartTotals.totalLabel}`}
                        >
                          <span className="text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.52)]">Total</span>
                          <SmartBarMobileOdometerText value={cartTotals.totalLabel} motionKey={cartTotalMotionKey} />
                        </div>
                      )}
                    </div>

                    <div
                      ref={cartScrollRef}
                      data-smartbar-mobile-cart-scroll="true"
                      className={`${demoCompactCartRows ? "mt-3 space-y-2 pb-1" : demoWalkthroughCartMode ? "mt-3.5 space-y-2.5 pb-0" : "mt-4 space-y-3 pb-2"} min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 overscroll-contain touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
                      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}
                    >
                      {visibleCartLines.map((line) => (
                        <div
                          key={smartBarMobileLineInstanceKey(line)}
                          className="relative"
                        >
                          <motion.div
                            role="button"
                            tabIndex={0}
                            data-smartbar-mobile-cart-line="true"
                            data-smartbar-mobile-line-title-key={smartBarMobileDemoKey(line.title)}
                            data-smartbar-mobile-line-status={line.status}
                            data-smartbar-mobile-line-target={line.targetId || line.sourceItemId || undefined}
                            data-smartbar-mobile-bundle-component={line.bundleDisplayRole === "component" ? "true" : undefined}
                            data-smartbar-mobile-bundle-dimmed={line.bundleDisplayRole === "dimmed_parent" || line.bundleDisplayRole === "dimmed_other" ? "true" : undefined}
                            animate={
                              handoffLocked || demoMontageStage?.shakeLineId
                                ? { x: 0, y: 0, scale: 1, opacity: 1 }
                                : smartBarMobileRowAnimate(line.status)
                            }
                            transition={
                              handoffLocked
                                ? { type: "spring", stiffness: 520, damping: 36 }
                                : demoMontageStage?.shakeLineId
                                  ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                                  : smartBarMobileRowTransition(line.status)
                            }
                            onClick={() => {
                              if (
                                !handoffLocked &&
                                line.bundleDisplayRole !== "dimmed_parent" &&
                                line.bundleDisplayRole !== "dimmed_other"
                              ) {
                                selectLine(line);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (
                                  !handoffLocked &&
                                  line.bundleDisplayRole !== "dimmed_parent" &&
                                  line.bundleDisplayRole !== "dimmed_other"
                                ) {
                                  selectLine(line);
                                }
                              }
                            }}
                            className={`${lineButtonClass} relative overflow-hidden ${!handoffLocked && !line.demoHideMeta && !demoCompactCartRows && line.bundleDisplayRole !== "component" ? "!pr-14" : ""} ${demoCompactCartRows ? "!min-h-[3.1rem] !rounded-[20px] !px-3.5 !py-2" : line.demoHideMeta ? "!min-h-[2.35rem] !px-3 !py-1.5" : line.bundleDisplayRole === "component" ? "!min-h-[4.25rem] !rounded-[18px] !px-3.5 !py-2.5" : demoWalkthroughCartMode ? "!min-h-[6.75rem] !px-4 !py-4" : ""} ${handoffLocked ? smartBarMobileHandoffRowSurfaceClass(isOverlay) : smartBarMobileRowSurfaceClass(line.status, isOverlay)} ${
                              demoMontageStage?.shakeLineId === line.id ? "z-[80]" : ""
                            } ${line.bundleDisplayRole === "dimmed_parent" || line.bundleDisplayRole === "dimmed_other" ? "pointer-events-none opacity-30 saturate-50" : handoffLocked ? "cursor-default" : "cursor-pointer"} ${line.bundleDisplayRole === "component" ? "!mx-[6%] !w-[88%]" : ""}`}
                            style={{ touchAction: "pan-y", transformOrigin: "center center" }}
                          >
                          {demoMontageStage?.shakeLineId === line.id ? (
                            <>
                              <motion.div
                                key={`food-nav-focus-fog-${line.id}-${demoMontageStage.id}`}
                                aria-hidden="true"
                                initial={{ opacity: 0.98, scale: 1.018, backdropFilter: "blur(18px)" }}
                                animate={{ opacity: [0.98, 0.84, 0], scale: [1.018, 1.006, 1], backdropFilter: ["blur(18px)", "blur(10px)", "blur(0px)"] }}
                                transition={{ duration: 1.12, times: [0, 0.34, 1], ease: "easeOut" }}
                                className="pointer-events-none absolute -inset-1 z-30 rounded-[1.6rem] bg-slate-100/75 shadow-[inset_0_0_46px_rgba(255,255,255,0.96)] ring-1 ring-white/80 backdrop-blur-xl [transform:translateZ(0)] [will-change:opacity,transform,backdrop-filter]"
                              />
                              <motion.div
                                key={`food-nav-focus-glow-${line.id}-${demoMontageStage.id}`}
                                aria-hidden="true"
                                initial={{ opacity: 0.86, scale: 0.992 }}
                                animate={{ opacity: [0.86, 0.62, 0.18], scale: [1, 1.006, 1] }}
                                transition={{ duration: 3.4, times: [0, 0.35, 1], ease: "easeOut" }}
                                className="pointer-events-none absolute -inset-2 z-20 rounded-[1.75rem] ring-2 ring-cyan-300/65 shadow-[0_0_0_10px_rgba(34,211,238,0.12),0_24px_80px_rgba(34,211,238,0.34)] [transform:translateZ(0)] [will-change:opacity,transform]"
                              />
                            </>
                          ) : null}
                          <div className={`relative z-10 flex justify-between gap-2.5 ${demoCompactCartRows || line.demoHideMeta ? "min-h-[1.35rem] items-center" : "items-start"}`}>
                            <div className={`min-w-0 flex-1 ${demoCompactCartRows ? "flex min-h-[1.35rem] items-baseline gap-1.5" : line.demoHideMeta ? "flex min-h-[1.35rem] items-center" : ""}`}>
                              <div
                                className={[
                                  demoCompactCartRows || line.demoHideMeta
                                    ? "truncate font-black"
                                    : "overflow-hidden break-words font-medium leading-[1.22] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
                                  demoCompactCartRows
                                    ? `text-[15px] leading-tight tracking-[-0.03em] ${smartBarMobileCartRowPrimaryTextClass(line.status, handoffLocked)}`
                                    : line.demoHideMeta
                                      ? `text-[15px] leading-tight tracking-[-0.025em] ${smartBarMobileCartRowPrimaryTextClass(line.status, handoffLocked)}`
                                      : `text-base ${handoffLocked ? handoffTitleClass : smartBarMobileCartRowPrimaryTextClass(line.status, false)}`,
                                ].join(" ")}
                              >
                                {line.demoDisplayTitle !== undefined
                                  ? line.demoDisplayTitle
                                  : demoCompactCartRows || line.demoHideMeta
                                    ? smartBarMobileShortTitle(line.title)
                                    : line.title}
                              </div>
                              {demoCompactCartRows && !demoWalkthroughHideCartChrome && !line.demoHideMeta ? (
                                <div className={`min-w-[3.4rem] shrink-0 truncate text-[11px] font-black leading-none ${smartBarMobileCartRowSecondaryTextClass(line.status, handoffLocked)} ${line.status === "unknown" ? "italic" : ""}`}>
                                  - {smartBarMobileCompactRowHelper(line)}
                                </div>
                              ) : !demoCompactCartRows && !line.demoHideMeta && line.status !== "options" ? (
                                line.status === "ready" ? (
                                  <div
                                    data-smartbar-mobile-ready-indicator="true"
                                    data-smartbar-mobile-customer-note={line.isCustomerNote ? "true" : undefined}
                                    className={`mt-2 inline-flex min-h-[34px] max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[15px] font-medium leading-[1.15] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_2px_6px_rgba(15,23,42,0.08)] ring-1 ${line.isCustomerNote ? "border-sky-100/78 bg-sky-50/76 ring-sky-200/54" : "border-white/72 bg-white/48 ring-emerald-100/58"}`}
                                  >
                                    {line.isCustomerNote ? (
                                      <StickyNote className="h-4 w-4 shrink-0 stroke-[2.35]" aria-hidden="true" />
                                    ) : (
                                      <BadgeCheck className="h-4 w-4 shrink-0 stroke-[2.35]" aria-hidden="true" />
                                    )}
                                    <span>{smartBarMobileDisplayedLineHelper(line)}</span>
                                  </div>
                                ) : (
                                  <div className={`mt-1 text-sm font-semibold ${smartBarMobileCartRowSecondaryTextClass(line.status, handoffLocked)} ${line.status === "unknown" ? "italic" : ""}`}>
                                    {smartBarMobileDisplayedLineHelper(line)}
                                  </div>
                                )
                              ) : null}
                            </div>
                            <div className={`flex shrink-0 items-end text-right ${demoCompactCartRows ? "flex-row gap-2" : "flex-col gap-2"}`}>
                              {!line.demoHideMeta && smartBarMobileLineHasAttachedCustomerNote(line) ? (
                                <span
                                  data-smartbar-mobile-attached-note="true"
                                  className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/72 bg-white/76 text-[#172554] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_3px_8px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/8 ${demoCompactCartRows ? "h-[22px] w-[22px]" : "h-8 w-8"}`}
                                  aria-label="Note attached"
                                  title="Note attached"
                                >
                                  <Paperclip className={`${demoCompactCartRows ? "h-3 w-3" : "h-4 w-4"} stroke-[2.55]`} aria-hidden="true" />
                                </span>
                              ) : null}
                              {!line.demoHideMeta && demoCompactCartRows && line.status === "options" ? (
                                <span
                                  data-smartbar-mobile-optional-indicator="true"
                                  className="inline-flex min-h-[22px] items-center gap-1 rounded-full border border-amber-200/82 bg-amber-200/96 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_3px_8px_rgba(146,64,14,0.12)] ring-1 ring-amber-50/76"
                                >
                                  <SlidersHorizontal className="h-3 w-3 shrink-0 stroke-[2.5]" aria-hidden="true" />
                                  Options
                                </span>
                              ) : null}
                              {!restaurantCalculatedPricing && !line.demoHideMeta && !line.priceSuppressed && line.bundleDisplayRole !== "component" ? <div className={`${demoCompactCartRows ? "text-[13px] leading-none" : "text-sm"} font-black ${smartBarMobileCartRowPrimaryTextClass(line.status, handoffLocked)}`}>{line.price}</div> : null}
                            </div>
                          </div>
                          {!line.demoHideMeta && !demoCompactCartRows && line.status === "options" ? (
                            <div
                              data-smartbar-mobile-optional-indicator="true"
                              className="relative z-10 mt-2.5 mr-10 inline-flex min-h-[34px] max-w-[calc(100%_-_2.5rem)] items-center gap-2 rounded-full border border-amber-200/82 bg-amber-100/92 px-3 py-1.5 text-[15px] font-medium leading-[1.15] text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_2px_6px_rgba(146,64,14,0.10)] ring-1 ring-amber-50/72"
                            >
                              <SlidersHorizontal className="h-4 w-4 shrink-0 stroke-[2.35]" aria-hidden="true" />
                              <span>Customize if you’d like</span>
                            </div>
                          ) : null}
                          </motion.div>

                          {!handoffLocked && !line.demoHideMeta && !demoCompactCartRows && !line.bundleDisplayRole && (
                            <button
                              type="button"
                              data-smartbar-mobile-remove-line="true"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                removeLine(line);
                              }}
                              className="pointer-events-auto absolute bottom-4 right-4 z-[90] inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border border-slate-300/50 bg-slate-900/92 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_5px_12px_rgba(2,6,23,0.30)] ring-1 ring-white/18 transition active:scale-95"
                              aria-label={`Remove ${line.title}`}
                            >
                              <Trash2 className="pointer-events-none h-4 w-4 stroke-[2.75]" />
                            </button>
                          )}
                        </div>
                      ))}
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
                        className={`${demoInteractionPointerClass} h-12 w-full rounded-full bg-transparent opacity-0`}
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
                        className={`${demoInteractionPointerClass} h-14 w-full rounded-full bg-transparent opacity-0`}
                        aria-label="Scroll cart down"
                      />
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
            role={demoInteractionLocked ? undefined : "button"}
            tabIndex={demoInteractionLocked ? -1 : 0}
            aria-label="Open SmartBar entry"
            aria-disabled={demoInteractionLocked ? true : undefined}
            onClick={demoInteractionLocked ? undefined : handleCompanionClick}
            onKeyDown={(event) => {
              if (demoInteractionLocked) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleCompanionClick();
              }
            }}
            className={`${demoInteractionPointerClass} fixed inset-x-0 z-[10082] flex ${demoInteractionLocked ? "cursor-default" : "cursor-pointer"} justify-center px-0`}
            style={{ bottom: 68 + keyboardLift + overlayBottomLiftPx, ...smartBarAdaptiveRailStyle }}
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
        style={{ bottom: 12 + keyboardLift + overlayBottomLiftPx, ...smartBarAdaptiveRailStyle }}
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
                disabled={demoInteractionLocked}
                onClick={demoInteractionLocked ? undefined : handleClosePillClick}
                className={`${chromePillClass} ${demoInteractionLocked ? "pointer-events-none" : ""} left-0`}
                style={{ ...SMARTBAR_MOBILE_BLUE_CONTROL_STYLE, width: cartTogglePillSize, height: cartTogglePillSize }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={closeArmed ? "Tap X again to close SmartBar" : "Close SmartBar"}
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
            data-smartbar-mobile-send-order={phase === "cart" && !selectedLine && checkoutReady ? "true" : undefined}
            data-smartbar-mobile-guidance-status={phase === "cart" && !selectedLine && effectiveCartGuidanceStatus ? effectiveCartGuidanceStatus : undefined}
            data-smartbar-mobile-detail-close={
              phase === "cart" &&
              selectedLine &&
              (
                selectedLine.status !== "unknown" ||
                selectedLineDirectNoteRouting ||
                (selectedLineCandidateResolution ? !candidateManualEntryOpen : !retryDraft.trim())
              )
                ? "true"
                : undefined
            }
            data-smartbar-mobile-retry-submit={
              phase === "cart" &&
              selectedLine?.status === "unknown" &&
              Boolean(selectedLineCandidateResolution) &&
              candidateManualEntryOpen &&
              Boolean(retryDraft.trim())
                ? "true"
                : undefined
            }
            disabled={demoInteractionLocked}
            onClick={demoInteractionLocked ? undefined : handleCompanionClick}
            className={`${chromePillClass} ${demoInteractionLocked ? "pointer-events-none" : ""} h-[46px] min-w-0 justify-center px-4`}
            style={{ ...companionPillStyle, width: launcherPillWidth, left: launcherPillLeft }}
            aria-label={phase === "rest" ? "Open SmartBar" : companionLabel}
          >
            {phase === "rest" ? (
              <span className={`inline-flex h-8 max-w-full items-center justify-center gap-1.5 whitespace-nowrap ${demoRestCompanionIsBlank ? "px-0" : "px-4"} text-[18px] font-semibold tracking-[-0.025em] ${companionTextClass}`}>
                {demoRestCompanionShowLogo ? (
                  <Compass className={`h-[18px] w-[18px] shrink-0 ${companionTextClass}`} strokeWidth={2.25} />
                ) : null}
                {companionLabel ? <span>{companionLabel}</span> : null}
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

          {demoLauncherCue?.active && phase === "rest" && (
            <motion.div
              key={`smartbar-launcher-owned-cue-${demoLauncherCue.runKey ?? companionLabel}`}
              className="pointer-events-none absolute top-1/2 z-20"
              style={{ left: launcherPillLeft + 12 }}
              initial={{ opacity: 0, scale: 0.96, x: -2, y: "-50%" }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.96, 1, 1, 0.98],
                x: [-2, 0, 0, 0],
                y: "-50%",
              }}
              transition={{
                duration: 1.48,
                times: [0, 0.14, 0.72, 1],
                ease: "easeOut",
              }}
            >
              <div className="relative h-11 w-11 rounded-full border-2 border-[#012169] bg-white/58 shadow-[0_12px_28px_rgba(1,33,105,0.16)] ring-4 ring-white/72 backdrop-blur-sm">
                <motion.span
                  className="absolute inset-[-8px] rounded-full border-2 border-[#012169]/34"
                  initial={{ opacity: 0, scale: 0.62 }}
                  animate={{ opacity: [0, 0, 0.72, 0], scale: [0.62, 0.62, 1.55, 2.05] }}
                  transition={{
                    duration: 1.48,
                    times: [0, 0.44, 0.58, 0.9],
                    ease: "easeOut",
                  }}
                />
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
              </div>

              {demoLauncherCue.showTooltip !== false && (
                <motion.div
                  className="absolute left-1/2 top-[-3.55rem] w-max max-w-[14.5rem] -translate-x-1/2 origin-bottom rounded-[18px] border border-white/60 bg-slate-950/90 px-4 py-2 text-center text-[12px] font-black leading-tight tracking-[-0.01em] text-white shadow-[0_16px_34px_rgba(15,23,42,0.42),0_0_24px_rgba(56,189,248,0.22)] backdrop-blur-xl will-change-transform"
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {demoLauncherCue.label || "Tap to open"}
                                  <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/45 bg-slate-950/88" /></motion.div>
              )}
            </motion.div>
          )}

          {demoCompanionCue?.active && (phase === "entry" || (phase === "cart" && (Boolean(selectedLine) || (!genericResult && !selectedLine && checkoutReady)))) && (
            <motion.div
              key={`smartbar-companion-owned-cue-${demoCompanionCue.runKey ?? companionLabel}`}
              className="pointer-events-none absolute top-1/2 z-20"
              style={{ left: launcherPillLeft + 12 }}
              initial={{ opacity: 0, scale: 0.96, x: -2, y: "-50%" }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.96, 1, 1, 0.98],
                x: [-2, 0, 0, 0],
                y: "-50%",
              }}
              transition={{
                duration: 1.48,
                times: [0, 0.14, 0.72, 1],
                ease: "easeOut",
              }}
            >
              <div className="relative h-11 w-11 rounded-full border-2 border-[#012169] bg-white/58 shadow-[0_12px_28px_rgba(1,33,105,0.16)] ring-4 ring-white/72 backdrop-blur-sm">
                <motion.span
                  className="absolute inset-[-8px] rounded-full border-2 border-[#012169]/34"
                  initial={{ opacity: 0, scale: 0.62 }}
                  animate={{ opacity: [0, 0, 0.72, 0], scale: [0.62, 0.62, 1.55, 2.05] }}
                  transition={{
                    duration: 1.48,
                    times: [0, 0.44, 0.58, 0.9],
                    ease: "easeOut",
                  }}
                />
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
              </div>
              {demoCompanionCue.showTooltip !== false && demoCompanionCue.label && (
                <motion.div
                  className="absolute left-1/2 top-[-3.55rem] w-max max-w-[14.5rem] -translate-x-1/2 origin-bottom rounded-[18px] border border-white/60 bg-slate-950/90 px-4 py-2 text-center text-[12px] font-black leading-tight tracking-[-0.01em] text-white shadow-[0_16px_34px_rgba(15,23,42,0.42),0_0_24px_rgba(56,189,248,0.22)] backdrop-blur-xl will-change-transform"
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {demoCompanionCue.label}
                                  <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/45 bg-slate-950/88" /></motion.div>
              )}
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {showCartToggle && (
              <motion.button
                type="button"
                data-smartbar-mobile-cart-toggle="true"
                data-smartbar-mobile-bundle-close={expandedBundleLineId ? "true" : undefined}
                data-smartbar-mobile-detail-close={phase === "cart" && selectedLine ? "true" : undefined}
                data-domi-demo-down-target={phase === "cart" ? "true" : undefined}
                disabled={demoInteractionLocked}
                onClick={demoInteractionLocked ? undefined : handleCartToggleClick}
                className={`${chromePillClass} ${demoInteractionLocked ? "pointer-events-none" : ""} right-0`}
                style={{
                  ...(phase === "cart" && (expandedBundleLineId || selectedLine)
                    ? SMARTBAR_MOBILE_BLUE_CONTROL_STYLE
                    : cartToggleShowsAdd
                      ? SMARTBAR_MOBILE_GREEN_CONTROL_STYLE
                      : SMARTBAR_MOBILE_BLUE_CONTROL_STYLE),
                  width: cartTogglePillSize,
                  height: cartTogglePillSize,
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                aria-label={
                  phase === "cart" && (expandedBundleLineId || selectedLine)
                    ? "Back to cart"
                    : cartToggleShowsAdd
                    ? "Add more items"
                    : phase === "cart" ? "Return to entry" : "Reopen cart"
                }
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white">
                  {phase === "cart" && (expandedBundleLineId || selectedLine) ? (
                    <ShoppingCart className="h-5 w-5" />
                  ) : cartToggleShowsAdd ? (
                    <Plus className="h-5 w-5" />
                  ) : cartToggleShowsUp ? (
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









