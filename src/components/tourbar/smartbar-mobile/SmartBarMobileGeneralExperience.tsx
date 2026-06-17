import { useCallback, useEffect, useRef, useState } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
  type SmartBarMobileSubmitResult,
} from "./SmartBarMobileShell";
import BurgerRushMobileExperience from "./burgerrush/BurgerRushMobileExperience";
import DomiMobileExperience from "./domi/DomiMobileExperience";
import NexaPathMobileExperience from "./nexapath/NexaPathMobileExperience";
import {
  SmartBarFakePointerOverlay,
  makeSmartBarFakePointerState,
  type SmartBarFakePointerState,
} from "../speed-demo/SmartBarFakePointer";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_CROSSOVER_MS,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../speed-demo/SmartBarFlashCardRail";
import {
  SmartBarFlashCardStack,
  type SmartBarFlashCardStackItem,
} from "../speed-demo/SmartBarFlashCardStack";
import type { SmartBarSpeedSurface } from "../speed-demo/smartBarSpeedScript";

type SmartBarMobileGeneralExperienceProps = {
  autoPlay?: boolean;
  /**
   * Mobile keeps its current compact fixtures. Desktop legacy uses the old
   * desktop SmartBar speed-demo copy inside the new mobile-shell chrome.
   */
  contentProfile?: "mobile" | "desktopLegacy";
};

const SMARTBAR_MOBILE_GENERAL_START_KEY = "smartbar_mobile_general_start";
const SMARTBAR_MOBILE_GENERAL_FAST_KEY = "smartbar_mobile_general_fast";

type MobileFocusSnapshot = {
  element: HTMLElement;
  outline: string;
  outlineOffset: string;
  boxShadow: string;
  position: string;
  zIndex: string;
  transition: string;
  scrollMarginTop: string;
};

type SmartBarGeneralMobileAutoStep = {
  /** Desktop scene id from SMARTBAR_SPEED_STEPS / opening tutor cards. */
  desktopStepId: string;
  query?: string;
  cards: string[];
  targetSelector?: string;
  label?: string;
  introMs?: number;
  cardMs?: number;
  afterSubmitMs?: number;
  surface?: SmartBarSpeedSurface;
};

const SMARTBAR_GENERAL_MOBILE_AUTO_STEPS: SmartBarGeneralMobileAutoStep[] = [
  {
    desktopStepId: "open",
    cards: ["Example 1: **NexaPath Advisory**", "Hidden-cart advisory site", "SmartBar finds the buyer's next step"],
    targetSelector: '[data-smartbar-mobile-launcher="true"], [data-smartbar-mobile-companion="true"]',
    label: "Open",
    introMs: 700,
    cardMs: 3600,
    afterSubmitMs: 650,
    surface: "info",
  },
  {
    desktopStepId: "hedge-fund-ask",
    query: "we're a hedge fund, need help wih IT and setting up copilots",
    cards: ["Messy buyer question", "Reads intent", "moves visitor to the answer"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Ask",
    cardMs: 3600,
    afterSubmitMs: 4300,
    surface: "info",
  },
  {
    desktopStepId: "prove-it",
    query: "that doesn't say what you actually do",
    cards: ["Visitor challenges the answer", "SmartBar gets specific"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Specifics",
    cardMs: 3400,
    afterSubmitMs: 3600,
    surface: "info",
  },
  {
    desktopStepId: "case-studies",
    query: "__case_studies",
    cards: ["Proof points", "then a handoff path"],
    targetSelector: '[data-smartbar-mobile-generic-action="show-proof"], [data-smartbar-mobile-companion="true"]',
    label: "Proof",
    cardMs: 3000,
    afterSubmitMs: 3600,
    surface: "info",
  },
  {
    desktopStepId: "consultant-chat",
    query: "Perfect, can I talk to someone?",
    cards: ["Context is carried forward", "Lead capture without a dead end"],
    targetSelector: '[data-smartbar-mobile-generic-action="consultant"], [data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Handoff",
    cardMs: 3300,
    afterSubmitMs: 4200,
    surface: "info",
  },
  {
    desktopStepId: "complete-order",
    query: "dbl chzbrger combo lg friez diet coke pie",
    cards: ["Example 2: **BurgerRush**", "Native ordering site", "Rough text becomes a cart"],
    targetSelector: '[data-smartbar-mobile-generic-action="start-order"], [data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Order",
    cardMs: 3700,
    afterSubmitMs: 4600,
    surface: "ordering",
  },
  {
    desktopStepId: "checkout",
    cards: ["Plain English", "Typos included", "Cart loaded", "Checkout-ready"],
    targetSelector: '[data-smartbar-mobile-checkout="true"], [data-smartbar-mobile-companion="true"]',
    label: "Checkout",
    cardMs: 3800,
    afterSubmitMs: 2400,
    surface: "ordering",
  },
  {
    desktopStepId: "booking-complete",
    query: "Aug 4 to 9, nice room with a view and breakfast, just me",
    cards: ["Example 3: **Domi Hotel**", "Choice-heavy booking site", "Ranks the best fit"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Booking",
    cardMs: 3700,
    afterSubmitMs: 3800,
    surface: "booking",
  },
  {
    desktopStepId: "booking-next-ocean",
    query: "__booking_next",
    cards: ["Compare without restarting"],
    targetSelector: '[data-smartbar-mobile-generic-action="booking-nav-next"], [data-smartbar-mobile-generic-action="booking-next"], [data-smartbar-mobile-companion="true"]',
    label: "Next",
    cardMs: 2200,
    afterSubmitMs: 2900,
    surface: "booking",
  },
  {
    desktopStepId: "booking-next-villa",
    query: "__booking_next",
    cards: ["Same context", "next option"],
    targetSelector: '[data-smartbar-mobile-generic-action="booking-nav-next"], [data-smartbar-mobile-generic-action="booking-next"]',
    label: "Next",
    cardMs: 2500,
    afterSubmitMs: 2900,
    surface: "booking",
  },
  {
    desktopStepId: "booking-breakfast",
    query: "add breakfast",
    cards: ["Package attaches", "active room stays selected"],
    targetSelector: '[data-smartbar-mobile-generic-action="add-breakfast"], [data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Breakfast",
    cardMs: 3000,
    afterSubmitMs: 3600,
    surface: "booking",
  },
  {
    desktopStepId: "booking-summary",
    query: "prepare booking summary",
    cards: ["Room", "package", "dates", "guest context"],
    targetSelector: '[data-smartbar-mobile-generic-action="prepare-booking"], [data-smartbar-mobile-companion="true"]',
    label: "Summary",
    cardMs: 3300,
    afterSubmitMs: 4200,
    surface: "booking",
  },
  {
    desktopStepId: "booking-incomplete",
    query: "need a family room",
    cards: ["Incomplete request", "dates missing", "guests missing"],
    targetSelector: '[data-smartbar-mobile-submit="true"], [data-smartbar-mobile-companion="true"]',
    label: "Context",
    cardMs: 3300,
    afterSubmitMs: 3500,
    surface: "booking",
  },
  {
    desktopStepId: "booking-selectors",
    query: "__booking_selectors",
    cards: ["Selectors beat typing", "context becomes structured"],
    targetSelector: '[data-smartbar-mobile-generic-action="select-dates"], [data-smartbar-mobile-companion="true"]',
    label: "Select",
    cardMs: 3000,
    afterSubmitMs: 3500,
    surface: "booking",
  },
  {
    desktopStepId: "booking-family-summary",
    query: "show family recommendation",
    cards: ["Now SmartBar can filter", "family-ready recommendation"],
    targetSelector: '[data-smartbar-mobile-generic-action="show-family-recommendation"], [data-smartbar-mobile-companion="true"]',
    label: "Recommend",
    cardMs: 3200,
    afterSubmitMs: 4200,
    surface: "booking",
  },
  {
    desktopStepId: "finale-setup",
    cards: ["Same bar. Different jobs.", "Like a caddy", "with a bag full of clubs"],
    targetSelector: '[data-smartbar-mobile-companion="true"]',
    label: "Toolbelt",
    cardMs: 4200,
    afterSubmitMs: 900,
    surface: "finale",
  },
  {
    desktopStepId: "finale",
    query: "show me the short version",
    cards: ["Search bar with a toolbelt"],
    targetSelector: '[data-smartbar-mobile-companion="true"]',
    label: "Finale",
    cardMs: 2400,
    afterSubmitMs: 4600,
    surface: "finale",
  },
];
function smartBarGeneralMobileReadStartIndex() {
  if (typeof window === "undefined") return 0;

  const params = new URLSearchParams(window.location.search);
  const rawStart =
    params.get("mobileDemoStart") ||
    params.get("mobileStart") ||
    params.get("mobileStep") ||
    window.sessionStorage.getItem(SMARTBAR_MOBILE_GENERAL_START_KEY) ||
    "";

  if (!rawStart) return 0;

  const normalized = rawStart.trim().toLowerCase();
  const aliases: Record<string, string> = {
    start: "open",
    nexa: "open",
    info: "open",
    proof: "case-studies",
    consultant: "consultant-chat",
    burger: "complete-order",
    burgerrush: "complete-order",
    order: "complete-order",
    ordering: "complete-order",
    checkout: "checkout",
    domi: "booking-complete",
    booking: "booking-complete",
    hotel: "booking-complete",
    nextroom: "booking-next-ocean",
    breakfast: "booking-breakfast",
    summary: "booking-summary",
    family: "booking-incomplete",
    selectors: "booking-selectors",
    finale: "finale-setup",
  };

  const requestedId = aliases[normalized] || normalized;
  const numeric = Number(requestedId);

  if (Number.isFinite(numeric)) {
    // 1-based is friendlier in a URL. 0 also works and means the first step.
    const zeroBased = numeric > 0 ? numeric - 1 : 0;
    return Math.min(Math.max(0, zeroBased), SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.length - 1);
  }

  const exactIndex = SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.findIndex(
    (step) => step.desktopStepId.toLowerCase() === requestedId,
  );

  return exactIndex >= 0 ? exactIndex : 0;
}

function smartBarGeneralMobileReadFastMode() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("mobileDemoFast") === "1" ||
    params.get("mobileFast") === "1" ||
    params.get("fast") === "1" ||
    window.sessionStorage.getItem(SMARTBAR_MOBILE_GENERAL_FAST_KEY) === "1"
  );
}

function smartBarGeneralMobileWaitMs(ms: number, fastMode: boolean) {
  if (!fastMode) return ms;
  if (ms <= 0) return 0;

  return Math.min(900, Math.max(80, Math.round(ms * 0.16)));
}

function smartBarGeneralShouldTypeQuery(query: string) {
  const trimmed = query.trim();
  return Boolean(trimmed) && !trimmed.startsWith("__");
}

function smartBarGeneralTypeDelayMs() {
  return smartBarGeneralMobileReadFastMode() ? 6 : 22;
}

function smartBarGeneralSubmitDelayMs() {
  return smartBarGeneralMobileReadFastMode() ? 80 : 320;
}

function smartBarGeneralEstimatedTypingSettleMs(query: string) {
  if (!smartBarGeneralShouldTypeQuery(query)) return 0;

  return Math.min(2600, Math.max(520, query.length * smartBarGeneralTypeDelayMs() + smartBarGeneralSubmitDelayMs() + 260));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function SmartBarMobileGeneralRealSurface({ surface }: { surface: SmartBarSpeedSurface }) {
  const child =
    surface === "ordering" ? (
      <BurgerRushMobileExperience demoFixtureMode />
    ) : surface === "booking" ? (
      <DomiMobileExperience />
    ) : surface === "finale" ? (
      <div data-tour-id="smartbar-booking-toolbelt" id="smartbar-booking-toolbelt">
        <NexaPathMobileExperience />
      </div>
    ) : (
      <NexaPathMobileExperience />
    );

  return (
    <div className="smartbar-mobile-general-real-surface relative min-h-[100dvh] overflow-x-hidden">
      <style>
        {`
          .smartbar-mobile-general-real-surface [data-smartbar-mobile-shell="true"] {
            display: none !important;
          }
        `}
      </style>
      {child}
    </div>
  );
}

function smartBarGeneralElementLooksVisible(element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 1 &&
    rect.height > 1 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    Number(style.opacity || "1") > 0.02
  );
}

function smartBarGeneralFindPointerTarget(selector?: string) {
  if (typeof document === "undefined" || !selector) return null;
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return matches.find(smartBarGeneralElementLooksVisible) || null;
}


function smartBarGeneralShouldClickPointerTarget(
  target: HTMLElement | null,
  step: SmartBarGeneralMobileAutoStep,
) {
  if (!target) return false;

  if (target.closest('[data-smartbar-mobile-generic-action]')) return true;
  if (target.closest('[data-smartbar-mobile-launcher="true"]')) return true;
  if (target.closest('[data-smartbar-mobile-checkout="true"]')) return true;

  return !step.query && Boolean(target.closest('[data-smartbar-mobile-companion="true"]'));
}


function smartBarGeneralCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function smartBarGeneralCompact(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

type GeneralDomiRoom = {
  id: string;
  label: string;
  title: string;
  body: string;
  price: string;
};

const GENERAL_DOMI_ROOMS: GeneralDomiRoom[] = [
  {
    id: "garden",
    label: "Value fit",
    title: "Garden Terrace King",
    body: "Comfortable and breakfast-compatible, but not the strongest view for this request.",
    price: "$239/night",
  },
  {
    id: "ocean",
    label: "Best fit",
    title: "Ocean View Suite",
    body: "Best balance of view, comfort, and breakfast compatibility without jumping to villa pricing.",
    price: "$379/night",
  },
  {
    id: "villa",
    label: "Premium",
    title: "Coastal Villa Suite",
    body: "The strongest view and most space, but more room than this solo stay probably needs.",
    price: "$549/night",
  },
];

function GeneralNarratorCards({ cards }: { cards: string[] }) {
  const sequenceRef = useRef(0);
  const [stackCards, setStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    const visibleCards = cards.map((card) => card.trim()).filter(Boolean);
    const sequenceId = sequenceRef.current + 1;
    sequenceRef.current = sequenceId;

    const clearAll = async () => {
      setActiveLane(null);
      setStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
      if (cancelled) return;
      setNoticeA(null);
      setNoticeB(null);
    };

    const runCards = async () => {
      if (!visibleCards.length) {
        await clearAll();
        return;
      }

      if (visibleCards.length > 1) {
        setActiveLane(null);
        setNoticeA(null);
        setNoticeB(null);
        setStackCards([]);

        const nextStack: SmartBarFlashCardStackItem[] = [];
        for (let index = 0; index < visibleCards.length; index += 1) {
          if (cancelled) return;

          nextStack.push({
            id: `${sequenceId}-${index}-${visibleCards[index]}`,
            variant: "prelude",
            title: visibleCards[index],
            density: visibleCards.length >= 4 ? "micro" : "compact",
          });

          setStackCards([...nextStack]);
          await wait(260);
        }

        return;
      }

      setStackCards([]);
      const notice: SmartBarFlashCardNotice = {
        variant: "prelude",
        title: visibleCards[0],
      };

      const nextLane: SmartBarFlashCardLaneName = activeLane === "a" ? "b" : "a";
      if (nextLane === "a") setNoticeA(notice);
      else setNoticeB(notice);

      setActiveLane(nextLane);
    };

    void runCards();

    return () => {
      cancelled = true;
    };
  }, [cards, activeLane]);

  if (!cards.length && !noticeA && !noticeB && !stackCards.length) return null;

  return (
    <SmartBarFlashCardRail className="pointer-events-none !fixed inset-x-0 !top-[34%] z-[10120]">
      <SmartBarFlashCardStack cards={stackCards} mode={stackCards.length >= 4 ? "flurry" : "standard"} />
      <SmartBarFlashCardLane active={activeLane === "a"}>
        <SmartBarFlashCard notice={noticeA} />
      </SmartBarFlashCardLane>
      <SmartBarFlashCardLane active={activeLane === "b"}>
        <SmartBarFlashCard notice={noticeB} />
      </SmartBarFlashCardLane>
    </SmartBarFlashCardRail>
  );
}

function readyGeneralCarryoutOrder(): SmartBarMobileOrderResult {
  return {
    lines: [
      {
        id: "general-double-combo",
        cartLineKey: "general-double-combo",
        targetId: "smartbar-order-cart",
        sourceItemId: "smartbar-order-cart",
        title: "Double cheeseburger combo",
        status: "ready",
        helper: "Matched and ready",
        price: "$11.99",
        details: ["Large fries", "Large Diet Coke", "No onions"],
      },
      {
        id: "general-apple-pie",
        cartLineKey: "general-apple-pie",
        targetId: "smartbar-order-menu",
        sourceItemId: "smartbar-order-menu",
        title: "Apple pie",
        status: "ready",
        helper: "Matched and ready",
        price: "$2.49",
        details: ["Warm"],
      },
      {
        id: "general-large-diet-coke",
        cartLineKey: "general-large-diet-coke",
        targetId: "smartbar-order-cart",
        sourceItemId: "smartbar-order-cart",
        title: "Large Diet Coke",
        status: "ready",
        helper: "Matched and ready",
        price: "$2.19",
        details: ["Large", "Diet Coke"],
      },
    ],
    estimatedSubtotal: "$16.67",
    estimatedTax: "$1.33",
    estimatedTotal: "$18.00",
  };
}

function legacyDesktopInfoResult(kind: "primary" | "specifics" | "proof" = "primary"): SmartBarMobileGenericResult {
  if (kind === "specifics") {
    return {
      surfaceKind: "info",
      eyebrow: "NexaPath Advisory",
      title: "What we would actually do",
      statusLabel: "Use cases",
      body:
        "For a hedge fund, the practical Copilot/agent work would usually look like this:\n\n- **Readiness review:** confirm Microsoft 365 permissions, data exposure, identity controls, and security boundaries before anyone turns agents loose.\n- **Use-case selection:** pick a few high-value workflows — investment committee prep, policy lookup, vendor-risk intake, ticket triage, or research summarization.\n- **Agent design:** define what each agent can answer, what systems it can touch, and when it must escalate for review.\n- **Pilot support:** build a small controlled rollout, train the first users, measure adoption, and tighten governance before expanding.",
      actions: [
        { id: "show-case-studies", label: "Show relevant case studies", helper: "Show relevant case studies" },
        { id: "consultant", label: "Talk to consultant", variant: "secondary" },
      ],
      height: 560,
    };
  }

  if (kind === "proof") {
    return {
      surfaceKind: "info",
      eyebrow: "NexaPath Advisory",
      title: "Relevant case studies",
      statusLabel: "Case studies",
      body:
        "- **Hedge-fund operations assistant:** mapped analyst and operations questions to approved knowledge sources, then routed sensitive requests to human review.\n- **Compliance evidence helper:** organized policy, vendor-risk, and incident-response materials so leaders could ask plain-English questions before audits and tabletop reviews.\n- **Copilot adoption sprint:** coached a regulated firm through safe rollout patterns, permission cleanup, user training, and a short list of practical first agents.",
      actions: [
        { id: "consultant", label: "Talk to someone about Copilot support", helper: "Open handoff" },
        { id: "start-order", label: "Next: ordering demo", variant: "secondary" },
      ],
      height: 520,
    };
  }

  return {
    surfaceKind: "info",
    eyebrow: "NexaPath Advisory",
    title: "Showing: Hedge Fund industry path",
    statusLabel: "Industry path",
    body:
      "Yes — this hedge-fund path covers both core IT support needs and AI/copilot-related modernization. In this context, that typically means:\n\n- Secure trading and collaboration infrastructure\n- Cyber/compliance operating model support\n- AI/data visibility and workflow enhancement, including governed copilot-style capabilities\n\nFor a hedge fund, the site frames this as a combined approach: stable infrastructure first, then security/compliance, then AI/data and workflow opportunities in a regulated operating model.",
    actions: [
      { id: "show-copilot-use-cases", label: "Show Copilot use cases", helper: "AI & Data lane" },
      { id: "consultant", label: "Talk to consultant", variant: "secondary" },
    ],
    height: 560,
  };
}

function legacyDesktopChatResult(): SmartBarMobileGenericResult {
  return {
    surfaceKind: "chat",
    eyebrow: "Live handoff",
    title: "Talk to a consultant",
    statusLabel: "Context received",
    body: "Context received — connecting consultant. The handoff carries the hedge-fund, IT support, and Copilot setup context forward.",
    actions: [
      { id: "start-order", label: "Next: ordering demo", helper: "Move to BurgerRush" },
    ],
    height: 340,
  };
}

function legacyDesktopBookingTourResult(step: number): SmartBarMobileGenericResult {
  const safeStep = Math.min(Math.max(step, 0), 2);
  const rows = [
    {
      title: "Recommendation 1 of 3",
      statusLabel: "Garden Terrace King",
      body: "$239/night. A quieter garden-facing option with a resort feel and lower price. It is a value fit, but the view is softer than the Ocean View Suite.",
    },
    {
      title: "Recommendation 2 of 3",
      statusLabel: "Ocean View Suite",
      body: "$379/night. Best fit for a strong view without jumping to the villa tier. Breakfast can be attached with the Breakfast Flex Plan.",
    },
    {
      title: "Recommendation 3 of 3",
      statusLabel: "Coastal Villa Suite",
      body: "$549/night. The premium view-and-space option. It is stronger than needed for this request, so the Ocean View Suite remains the practical recommendation.",
    },
  ] as const;
  const row = rows[safeStep];

  return {
    surfaceKind: "booking_tour",
    eyebrow: "Domi Hotel",
    title: row.title,
    statusLabel: row.statusLabel,
    progressLabel: "Rooms",
    progressCurrent: safeStep + 1,
    progressTotal: 3,
    body: row.body,
    actions: [
      { id: "booking-nav-back", label: "Previous room", variant: "secondary", disabled: safeStep === 0 },
      { id: "booking-nav-next", label: "Next stop", disabled: safeStep === 2 },
      { id: "add-breakfast", label: "Add breakfast", variant: "secondary" },
    ],
    height: 380,
  };
}

function legacyDesktopBreakfastResult(): SmartBarMobileGenericResult {
  return {
    surfaceKind: "booking_tour",
    eyebrow: "Domi Hotel",
    title: "Breakfast Flex Plan",
    statusLabel: "Package",
    body: "Daily breakfast credit across the lobby café, buffet, and grab-and-go market. +$32/night.",
    actions: [
      { id: "prepare-booking", label: "Book this" },
      { id: "show-rooms", label: "Review rooms", variant: "secondary" },
    ],
    height: 340,
  };
}

function legacyDesktopBookingSummaryResult(): SmartBarMobileGenericResult {
  return {
    surfaceKind: "booking_summary",
    eyebrow: "Domi Hotel",
    title: "Booking summary ready",
    statusLabel: "Summary ready",
    body: "Ocean View Suite · Breakfast Flex Plan · Aug 4–9, 2026 · 1 guest · Good view, not villa tier · $379/night + $32/night.",
    actions: [
      { id: "restart-info", label: "Back to SmartBar overview", variant: "secondary" },
    ],
    height: 340,
  };
}

function legacyDesktopMissingContextResult(): SmartBarMobileGenericResult {
  return {
    surfaceKind: "booking_tour",
    eyebrow: "Domi Hotel",
    title: "Select your stay dates",
    statusLabel: "Dates required",
    body: "I need stay dates before I can price and rank family-room options. Choose check-in and check-out dates to continue.",
    actions: [
      { id: "select-dates", label: "Select dates" },
    ],
    height: 340,
  };
}

function legacyDesktopFamilyRecommendationResult(): SmartBarMobileGenericResult {
  return {
    surfaceKind: "booking_summary",
    eyebrow: "Domi Hotel",
    title: "Family Double Room recommended",
    statusLabel: "Family fit",
    body: "Family Double Room · $249/night.\nFamily Comfort Bundle · +$55/stay.\nStay context: Jun 12–15, 2026 · 2 adults / 2 children.",
    actions: [
      { id: "restart-info", label: "Back to SmartBar overview", variant: "secondary" },
    ],
    height: 360,
  };
}

function legacyDesktopFinaleResult(): SmartBarMobileGenericResult {
  return {
    surfaceKind: "info",
    eyebrow: "Finale",
    title: "SmartBar in one line",
    statusLabel: "Short version",
    body:
      "SmartBar turns a plain visitor question into the next useful action.\nIt can answer, guide, qualify, compare, collect, and hand off without making the user hunt through the site.\nOn content-heavy sites, it behaves like a navigator.\nOn ordering or booking sites, it behaves like a completion layer.\nThe CTA is simple: ask for what you want, then let SmartBar open the right next step.",
    actions: [
      { id: "restart-info", label: "Replay from the top", variant: "secondary" },
    ],
    height: 430,
  };
}

export default function SmartBarMobileGeneralExperience({ autoPlay = false, contentProfile = "mobile" }: SmartBarMobileGeneralExperienceProps) {
  const [surface, setSurface] = useState<SmartBarSpeedSurface>("info");
  const [bookingStep, setBookingStep] = useState(1);
  const [, setBreakfastAdded] = useState(false);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const submissionIdRef = useRef(0);
  const autoPlayStartedRef = useRef(false);
  const focusSnapshotRef = useRef<MobileFocusSnapshot | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef(0);
  const [narratorCards, setNarratorCards] = useState<string[]>([]);
  const [pointer, setPointer] = useState<SmartBarFakePointerState | null>(null);
  const desktopLegacyContent = contentProfile === "desktopLegacy";

  const clearFocus = useCallback(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    const snapshot = focusSnapshotRef.current;
    if (!snapshot) return;

    snapshot.element.style.outline = snapshot.outline;
    snapshot.element.style.outlineOffset = snapshot.outlineOffset;
    snapshot.element.style.boxShadow = snapshot.boxShadow;
    snapshot.element.style.position = snapshot.position;
    snapshot.element.style.zIndex = snapshot.zIndex;
    snapshot.element.style.transition = snapshot.transition;
    snapshot.element.style.scrollMarginTop = snapshot.scrollMarginTop;
    focusSnapshotRef.current = null;
  }, []);

  const focusTarget = useCallback((targetId: string, options: { resetToTop?: boolean } = {}) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    clearFocus();

    if (options.resetToTop) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // Surface changes are state-driven. When the script moves from NexaPath to
    // BurgerRush or Domi, the new target wall does not exist until React commits
    // the next surface. Defer the lookup so the active surface is in the real
    // document flow before we scroll to a target inside it.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const escaped = smartBarGeneralCssEscape(targetId);
        const stage = document.querySelector<HTMLElement>('[data-smartbar-speed-stage="true"]');
        const target =
          stage?.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`) ||
          document.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`);

        if (!target) {
          if (options.resetToTop) {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          }
          return;
        }

        target.scrollIntoView({ block: "start", behavior: "smooth" });

        focusTimerRef.current = window.setTimeout(() => {
          focusTimerRef.current = null;
          focusSnapshotRef.current = {
            element: target,
            outline: target.style.outline,
            outlineOffset: target.style.outlineOffset,
            boxShadow: target.style.boxShadow,
            position: target.style.position,
            zIndex: target.style.zIndex,
            transition: target.style.transition,
            scrollMarginTop: target.style.scrollMarginTop,
          };

          if (!target.style.position) target.style.position = "relative";
          target.style.zIndex = "60";
          target.style.scrollMarginTop = "18px";
          target.style.transition = target.style.transition
            ? `${target.style.transition}, outline 180ms ease, box-shadow 180ms ease`
            : "outline 180ms ease, box-shadow 180ms ease";
          target.style.outline = "3px solid rgba(14,165,233,0.92)";
          target.style.outlineOffset = "4px";
          target.style.boxShadow = "0 0 0 7px rgba(14,165,233,0.18), 0 22px 50px rgba(2,6,23,0.28)";
        }, 760);
      });
    });
  }, [clearFocus]);

  const submitDemoQuery = useCallback((query: string, meta?: SmartBarMobileSubmitMeta) => {
    submissionIdRef.current += 1;
    setDemoSubmission({
      id: submissionIdRef.current,
      query,
      meta,
      typing: smartBarGeneralShouldTypeQuery(query),
      typeDelayMs: smartBarGeneralTypeDelayMs(),
      submitDelayMs: smartBarGeneralSubmitDelayMs(),
    });
  }, []);

  const pointToStep = useCallback(async (step: SmartBarGeneralMobileAutoStep) => {
    const target = smartBarGeneralFindPointerTarget(step.targetSelector);
    if (!target) return null;

    pointerIdRef.current += 1;
    const id = pointerIdRef.current;
    setPointer(makeSmartBarFakePointerState(target, { id, label: step.label, anchorY: 0.58, offsetY: 4 }));
    await wait(360);

    setPointer(makeSmartBarFakePointerState(target, { id: id + 10000, label: step.label, phase: "pulse", anchorY: 0.58, offsetY: 4 }));
    await wait(760);
    setPointer(null);
    return target;
  }, []);

  useEffect(() => () => clearFocus(), [clearFocus]);

  useEffect(() => {
    if (!autoPlay || autoPlayStartedRef.current) return;
    autoPlayStartedRef.current = true;
    let cancelled = false;

    const run = async () => {
      const startIndex = smartBarGeneralMobileReadStartIndex();
      const fastMode = smartBarGeneralMobileReadFastMode();

      for (const step of SMARTBAR_GENERAL_MOBILE_AUTO_STEPS.slice(startIndex)) {
        await wait(smartBarGeneralMobileWaitMs(step.introMs ?? 0, fastMode));
        if (cancelled) return;

        if (step.surface) setSurface(step.surface);
        setNarratorCards(step.cards);
        await wait(smartBarGeneralMobileWaitMs(step.cardMs ?? 2000, fastMode));
        if (cancelled) return;

        const target = await pointToStep(step);
        if (cancelled) return;

        const clickedTarget = smartBarGeneralShouldClickPointerTarget(target, step);
        if (clickedTarget) {
          target?.click();
          await wait(180);
        }

        if (step.query && !clickedTarget) {
          submitDemoQuery(step.query);
          await wait(smartBarGeneralMobileWaitMs(smartBarGeneralEstimatedTypingSettleMs(step.query), fastMode));
          if (cancelled) return;
        }
        await wait(smartBarGeneralMobileWaitMs(step.afterSubmitMs ?? 5000, fastMode));
        if (cancelled) return;

        setNarratorCards([]);
      }

      await wait(smartBarGeneralMobileWaitMs(900, fastMode));
      if (!cancelled) setNarratorCards(["Same bar. Different jobs.", "Answers, carts, bookings, and handoffs."]);
    };

    void run();

    return () => {
      cancelled = true;
      setPointer(null);
      setNarratorCards([]);
    };
  }, [autoPlay, pointToStep, submitDemoQuery]);

  const buildInfoResult = useCallback((kind: "primary" | "specifics" | "proof" = "primary"): SmartBarMobileGenericResult => {
    setSurface("info");
    focusTarget(kind === "primary" ? "hedgefund-copilot" : "hedgefund-contact-cta");

    if (desktopLegacyContent) return legacyDesktopInfoResult(kind);

    if (kind === "specifics") {
      return {
        surfaceKind: "info",
        eyebrow: "NexaPath Advisory",
        title: "What NexaPath would actually do",
        statusLabel: "Use cases",
        body: "For a hedge fund, NexaPath would start with Copilot readiness, data/security review, policy boundaries, and a controlled pilot for internal workflows.",
        helper: "Fixture snapshot shaped like the live informational adapter: answer, next actions, and handoff path.",
        actions: [
          { id: "show-proof", label: "Show relevant case studies", helper: "Surface proof points" },
          { id: "consultant", label: "Talk to consultant", variant: "secondary" },
        ],
        height: 310,
      };
    }

    if (kind === "proof") {
      return {
        surfaceKind: "info",
        eyebrow: "NexaPath Advisory",
        title: "Relevant proof points",
        statusLabel: "Proof ready",
        body: "Comparable work: Copilot adoption sprint, compliance evidence assistant, and operations assistant for controlled internal rollout.",
        helper: "The point is not a fake content panel; it is the real shell renderer receiving a deterministic adapter-shaped answer.",
        actions: [
          { id: "consultant", label: "Talk to someone about Copilot support", helper: "Open handoff" },
          { id: "start-order", label: "Next: ordering demo", variant: "secondary" },
        ],
        height: 310,
      };
    }

    return {
      surfaceKind: "info",
      eyebrow: "NexaPath Advisory",
      title: "Copilot journey found",
      statusLabel: "Answer ready",
      body: "SmartBar routes the hedge-fund visitor toward a secure Copilot implementation path instead of dumping them into a generic search result.",
      helper: "The visible site carries the page context. The SmartBar shell carries the answer and next actions.",
      actions: [
        { id: "show-proof", label: "Show proof points", helper: "Drill into concrete examples" },
        { id: "consultant", label: "Talk to consultant", variant: "secondary" },
      ],
      height: 310,
    };
  }, [focusTarget]);

  const buildChatResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("info");
    focusTarget("hedgefund-contact-cta");

    if (desktopLegacyContent) return legacyDesktopChatResult();

    return {
      surfaceKind: "chat",
      eyebrow: "Live handoff",
      title: "Consultant handoff ready",
      statusLabel: "Context carried",
      body: "Context received: hedge fund, IT support, Copilot setup, and desire to talk with someone.",
      helper: "A real deployment would pass this context into chat/lead capture. This demo snapshot keeps the same shell shape without fake transcript UI.",
      actions: [
        { id: "start-order", label: "Next: ordering demo", helper: "Move to BurgerRush" },
      ],
      height: 300,
    };
  }, [focusTarget]);

  const buildOrderResult = useCallback((): SmartBarMobileOrderResult => {
    setSurface("ordering");
    focusTarget("smartbar-order-combo", { resetToTop: true });
    return readyGeneralCarryoutOrder();
  }, [focusTarget]);

  const buildBookingTourResult = useCallback((nextStep = bookingStep): SmartBarMobileGenericResult => {
    const safeStep = Math.min(Math.max(nextStep, 0), GENERAL_DOMI_ROOMS.length - 1);
    setBookingStep(safeStep);
    setSurface("booking");
    focusTarget("smartbar-booking-rooms", { resetToTop: true });

    if (desktopLegacyContent) return legacyDesktopBookingTourResult(safeStep);

    const activeRoom = GENERAL_DOMI_ROOMS[safeStep];

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: activeRoom.title,
      statusLabel: activeRoom.label,
      progressLabel: "Rooms",
      progressCurrent: safeStep + 1,
      progressTotal: GENERAL_DOMI_ROOMS.length,
      body: `${activeRoom.body} ${activeRoom.price}.`,
      helper: "Deterministic booking snapshot shaped for the real mobile shell renderer.",
      actions: [
        { id: "booking-nav-back", label: "Previous room", variant: "secondary", disabled: safeStep === 0 },
        { id: "booking-nav-next", label: "Next room", disabled: safeStep === GENERAL_DOMI_ROOMS.length - 1 },
        { id: "add-breakfast", label: "Add breakfast", variant: "secondary" },
        { id: "prepare-booking", label: "Prepare booking summary", variant: "secondary" },
      ],
      height: 330,
    };
  }, [bookingStep, focusTarget]);

  const buildBookingBreakfastResult = useCallback((): SmartBarMobileGenericResult => {
    setBreakfastAdded(true);
    setBookingStep(1);
    setSurface("booking");
    focusTarget("smartbar-booking-breakfast", { resetToTop: true });

    if (desktopLegacyContent) return legacyDesktopBreakfastResult();

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Breakfast added",
      statusLabel: "Add-on attached",
      progressLabel: "Package",
      progressCurrent: 2,
      progressTotal: 3,
      body: "Breakfast Flex Plan is attached to the Ocean View Suite without losing the room, date, or guest context.",
      helper: "The fixture now fills the real shell result area instead of opening an empty status box.",
      actions: [
        { id: "show-rooms", label: "Review rooms", variant: "secondary" },
        { id: "prepare-booking", label: "Prepare booking summary" },
      ],
      height: 320,
    };
  }, [focusTarget]);

  const buildBookingSummaryResult = useCallback((): SmartBarMobileGenericResult => {
    setBreakfastAdded(true);
    setBookingStep(1);
    setSurface("booking");
    focusTarget("smartbar-booking-summary", { resetToTop: true });

    if (desktopLegacyContent) return legacyDesktopBookingSummaryResult();

    return {
      surfaceKind: "booking_summary",
      eyebrow: "Domi Hotel",
      title: "Booking summary ready",
      statusLabel: "Summary ready",
      body: "Ocean View Suite, Breakfast Flex Plan, Aug 4–9, 2026, 1 guest. Estimate: $379/night + $32/night.",
      helper: "Ready to hand off to booking with room, package, dates, and guest context preserved.",
      actions: [
        { id: "restart-info", label: "Back to SmartBar overview", variant: "secondary" },
      ],
      height: 310,
    };
  }, [focusTarget]);

  const buildBookingMissingContextResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("smartbar-booking-context", { resetToTop: true });

    if (desktopLegacyContent) return legacyDesktopMissingContextResult();

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Need dates and guests",
      statusLabel: "Missing context",
      body: "SmartBar pauses before recommending a family room because dates and guest count change availability and fit.",
      helper: "The real booking adapter follows this same principle: collect required context before filtering inventory.",
      actions: [
        { id: "select-dates", label: "Set dates and guests" },
      ],
      height: 300,
    };
  }, [focusTarget]);

  const buildBookingSelectorsResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("smartbar-booking-context", { resetToTop: true });

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi Hotel",
      title: "Dates and guests selected",
      statusLabel: "Context set",
      body: "June 12–15, 2026 with 2 adults and 2 children. SmartBar can now filter for a family-capable room.",
      helper: "Selector output becomes structured booking context for the next recommendation.",
      actions: [
        { id: "show-family-recommendation", label: "Show family recommendation" },
      ],
      height: 300,
    };
  }, [focusTarget]);

  const buildFamilyRecommendationResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("booking");
    focusTarget("smartbar-booking-summary", { resetToTop: true });

    if (desktopLegacyContent) return legacyDesktopFamilyRecommendationResult();

    return {
      surfaceKind: "booking_summary",
      eyebrow: "Domi Hotel",
      title: "Family recommendation ready",
      statusLabel: "Family fit",
      body: "Family Double Room with the Family Comfort Bundle fits the selected dates and four-guest stay.",
      helper: "The recommendation carries room, dates, guests, and package context forward.",
      actions: [
        { id: "restart-info", label: "Back to SmartBar overview", variant: "secondary" },
      ],
      height: 310,
    };
  }, [focusTarget]);

  const buildFinaleResult = useCallback((): SmartBarMobileGenericResult => {
    setSurface("finale");
    focusTarget("smartbar-booking-toolbelt", { resetToTop: true });

    if (desktopLegacyContent) return legacyDesktopFinaleResult();

    return {
      surfaceKind: "info",
      eyebrow: "Finale",
      title: "Search bar with a toolbelt",
      statusLabel: "Toolbelt",
      body: "Same bar, different jobs: answer, action choices, cart, selectors, summary, lead capture, and handoff.",
      helper: "The demo should now show real entry typing, real shell rendering, sliding cards, pointer choreography, and deterministic snapshots.",
      actions: [
        { id: "restart-info", label: "Replay from the top", variant: "secondary" },
      ],
      height: 310,
    };
  }, [focusTarget]);

  const handleSubmitPrompt = useCallback((query: string): SmartBarMobileSubmitResult => {
    const text = smartBarGeneralCompact(query);

    if (text.includes("__case_studies") || text.includes("__nexa_proof") || text.includes("proof")) return buildInfoResult("proof");
    if (text.includes("__copilot_use_cases")) return buildInfoResult("specifics");
    if (
      text.includes("specific") ||
      text.includes("actually do") ||
      text.includes("doesn't say") ||
      text.includes("doesnt say")
    ) return buildInfoResult("specifics");
    if (text.includes("consultant") || text.includes("pricing") || text.includes("talk to someone")) return buildChatResult();
    if (text.includes("dbl") || text.includes("chzbrger") || text.includes("friez") || text.includes("burger")) return buildOrderResult();
    if (text.includes("__booking_back")) return buildBookingTourResult(bookingStep - 1);
    if (text.includes("__booking_next")) return buildBookingTourResult(bookingStep + 1);
    if (text.includes("__booking_selectors")) return buildBookingSelectorsResult();
    if (text.includes("need a family room")) return buildBookingMissingContextResult();
    if (text.includes("show family recommendation")) return buildFamilyRecommendationResult();
    if (text.includes("prepare booking") || text.includes("booking summary") || text.includes("summary")) return buildBookingSummaryResult();
    if (text.includes("breakfast") || text.includes("package")) return buildBookingBreakfastResult();
    if (text.includes("show me the short version") || text.includes("toolbelt")) return buildFinaleResult();
    if (text.includes("room") || text.includes("view") || text.includes("aug") || text.includes("hotel")) return buildBookingTourResult(0);

    return buildInfoResult("primary");
  }, [
    bookingStep,
    buildBookingBreakfastResult,
    buildBookingMissingContextResult,
    buildBookingSelectorsResult,
    buildBookingSummaryResult,
    buildBookingTourResult,
    buildChatResult,
    buildFamilyRecommendationResult,
    buildFinaleResult,
    buildInfoResult,
    buildOrderResult,
  ]);

  const handleGenericAction = useCallback((action: SmartBarMobileGenericAction) => {
    if (action.disabled) return;
    if (action.id === "show-proof") submitDemoQuery("__nexa_proof");
    if (action.id === "show-copilot-use-cases") submitDemoQuery("__copilot_use_cases");
    if (action.id === "show-case-studies") submitDemoQuery("__case_studies");
    if (action.id === "consultant") submitDemoQuery("Perfect, can I talk to someone?");
    if (action.id === "start-order") submitDemoQuery("dbl chzbrger combo lg friez diet coke pie");
    if (action.id === "booking-back" || action.id === "booking-nav-back") submitDemoQuery("__booking_back");
    if (action.id === "booking-next" || action.id === "booking-nav-next") submitDemoQuery("__booking_next");
    if (action.id === "booking-summary") submitDemoQuery("prepare booking summary");
    if (action.id === "add-breakfast") submitDemoQuery("add breakfast");
    if (action.id === "prepare-booking") submitDemoQuery("prepare booking summary");
    if (action.id === "show-rooms") submitDemoQuery("show ocean view room");
    if (action.id === "select-dates") submitDemoQuery("__booking_selectors");
    if (action.id === "show-family-recommendation") submitDemoQuery("show family recommendation");
    if (action.id === "restart-info") submitDemoQuery("we're a hedge fund, need help with IT and setting up copilots");
  }, [submitDemoQuery]);

  return (
    <main
      data-smartbar-mobile-general="true"
      className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_16%_10%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_54%,#f8fafc_100%)] text-slate-950"
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <GeneralNarratorCards cards={narratorCards} />
      <SmartBarFakePointerOverlay pointer={pointer} />
      <section
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface={surface}
        className="relative z-10 min-h-[100dvh] overflow-x-hidden pb-[680px]"
      >
        <SmartBarMobileGeneralRealSurface surface={surface} />
      </section>
      <SmartBarMobileShell
        mode="overlay"
        entryModeLabel="Ask SmartBar"
        buildingLabel="Thinking..."
        demoSubmission={demoSubmission}
        onSubmitPrompt={handleSubmitPrompt}
        onGenericAction={handleGenericAction}
      />
    </main>
  );
}
