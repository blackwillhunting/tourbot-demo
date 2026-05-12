import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Eye,
  Compass,
  MessageSquare,
  Minus,
  SendHorizonal,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { TourStep } from "../App";

const baseMotion = {
  initial: { opacity: 0, x: 80 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 120 },
  transition: { duration: 0.24, ease: "easeOut" as const },
};

const toastPosition = {
  position: "fixed" as const,
  right: "16px",
  bottom: "16px",
  zIndex: 9999,
};

const MIN_TEXTAREA_HEIGHT = 64;
const KEYBOARD_TEXTAREA_HEIGHT = 52;
const MAX_TEXTAREA_HEIGHT = 160;
const MESSAGE_FADE_DURATION = 0.2;
const THREAD_REVEAL_SCROLL_MS = 900;
const GUIDE_NAVIGATION_SCROLL_MS = 1500;
const BOT_REPLY_DELAY_MS = 3000;
void BOT_REPLY_DELAY_MS;
const THINKING_WIGGLE_DURATION = 1.15;
const THINKING_WIGGLE_STAGGER = 0.025;
const THREAD_BOOTSTRAP_SCROLL_PX = 240;
const MIN_REVEAL_DISTANCE_PX = 96;
const REOPEN_GLIDE_START_OFFSET_PX = 420;
const REOPEN_GLIDE_SETTLE_DELAYS_MS = [80, 220, 420, 700];
const GUIDE_AI_URL =
  "https://ttoolbot-backend-aebdaegjbjckcrdg.canadacentral-01.azurewebsites.net/api/guide_ai";
const MIN_THINKING_MS = 900;
const GUIDE_SHELL_SESSION_KEY = "guide_shell_session";
const GUIDE_PENDING_SPOTLIGHT_KEY = "guide_pending_spotlight";
const GUIDE_DEMO_RESPONSE_COMPLETE_EVENT = "guide-demo-response-complete";
const GUIDE_EXTERNAL_SPOTLIGHT_EVENT = "guide-spotlight-target";
const GUIDE_CLEAR_SPOTLIGHT_EVENT = "guide-clear-spotlight";
const MAX_GUIDED_STEPS = 10;

let activeSpotlightCleanup: (() => void) | null = null;
let activeSpotlightOverlay: HTMLDivElement | null = null;
let activeSpotlightRunId = 0;
let activeSpotlightTimers: number[] = [];

function clearScheduledSpotlightTimers() {
  activeSpotlightTimers.forEach((timer) => window.clearTimeout(timer));
  activeSpotlightTimers = [];
}

function beginSpotlightRun() {
  activeSpotlightRunId += 1;
  clearScheduledSpotlightTimers();
  clearActiveSpotlight();
  return activeSpotlightRunId;
}

function isCurrentSpotlightRun(runId: number) {
  return runId === activeSpotlightRunId;
}

function scheduleSpotlightTimer(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    activeSpotlightTimers = activeSpotlightTimers.filter((item) => item !== timer);
    callback();
  }, delay);
  activeSpotlightTimers.push(timer);
  return timer;
}

type ShellState = "welcome" | "panel" | "launcher";

export type GuideShellDemoCommand = {
  id: number;
  type: "open" | "type" | "submit" | "next" | "got-it" | "minimize" | "book";
  value?: string;
};

type AnswerParts = {
  intro?: string;
  bullets?: string[];
  closing?: string;
};

export type GuideMode = "discovery" | "commerce";

export type GuideConfig = {
  mode?: GuideMode;
  label?: string;
  features?: {
    refinementChips?: boolean;
    bookingActions?: boolean;
    navigation?: boolean;
  };
  packIds?: Record<string, string>;
};

type GuideQuickStart = {
  label: string;
  prompt: string;
};

function guideModeCopy(guideConfig?: GuideConfig): {
  statusLabel: string;
  greeting: string;
  placeholder: string;
  quickStarts: GuideQuickStart[];
} {
  if (guideConfig?.mode === "commerce") {
    return {
      statusLabel: "Commerce self-drive ready",
      greeting:
        "Hi — I’m TourBot. Activate me when you want this commerce playground to self-drive through best-fit rooms, packages, and booking context from what you share.",
      placeholder:
        "Describe your trip, preferences, dates, guests, or budget...",
      quickStarts: [
        {
          label: "Rich intent",
          prompt:
            "I'm traveling from May 8 thru May 12 and need a simple room with breakfast, just me traveling",
        },
        {
          label: "Room options",
          prompt: "Show me room options for a moderate budget.",
        },
        {
          label: "View + value",
          prompt:
            "I want a nice room with a view and breakfast, but not too expensive.",
        },
      ],
    };
  }

  return {
    statusLabel: "Discovery self-drive ready",
    greeting:
      "Hi — I’m TourBot. Activate me when you want this discovery playground to self-drive through the right site sections from what you ask for.",
    placeholder: "Ask a question or describe what you want to explore...",
    quickStarts: [
      {
        label: "Overview",
        prompt: "Give me a quick overview of the site.",
      },
      {
        label: "Cyber",
        prompt: "Show me the cybersecurity angle.",
      },
      {
        label: "Guided tour",
        prompt: "Take me on a guided tour.",
      },
    ],
  };
}

type SavedCommerceItem = {
  id: string;
  type: "room" | "package" | "extra";
  title: string;
  targetId?: string | null;
  pageId?: string | null;
  priceLabel?: string | null;
  priceUsd?: number | null;
  priceUnit?: string | null;
};

type SavedTripContext = {
  room?: SavedCommerceItem | null;
  packages: SavedCommerceItem[];
  extras: SavedCommerceItem[];
};

type CommerceSessionContext = {
  dates?: { checkIn: string; checkOut: string; label: string } | null;
  guests?: { adults: number; children: number; label: string } | null;
  budget?: { band: string } | null;
  breakfast?: { requested: boolean; label: string } | null;
  savedTrip?: SavedTripContext | null;
};

type ExtractedBookingContext = {
  checkInDate?: string | null;
  checkOutDate?: string | null;
  nights?: number | null;
  adults?: number | null;
  children?: number | null;
  guests?: number | null;
  budgetBand?: BudgetBand | string | null;
  breakfastRequested?: boolean | null;
};

type VisibleContext = {
  bookingContext?: ExtractedBookingContext | null;
  selectedRoomId?: string | null;
  suggestedPackageId?: string | null;
  activeStayPlan?: StayPlan | null;
  savedItems?: unknown[];
  pendingSave?: unknown;
  lastPlannerIntent?: unknown;
  [key: string]: unknown;
};

type StayPlanRoom = {
  targetId?: string | null;
  title?: string | null;
  nightlyRateUsd?: number | null;
};

type StayPlanPackage = {
  targetId?: string | null;
  title?: string | null;
  priceUsd?: number | null;
  priceUnit?: string | null;
  priceLabel?: string | null;
  fulfills?: string[];
  summary?: string | null;
};

type StayPlan = {
  type?: string;
  room?: StayPlanRoom | null;
  packages?: StayPlanPackage[];
  extras?: string[];
  nights?: number | null;
  addOnNightlyUsd?: number | null;
  addOnStayUsd?: number | null;
  estimatedNightlyTotalUsd?: number | null;
  estimatedStaySubtotalUsd?: number | null;
  navigationOrder?: string[];
};

function isStayPlan(value: unknown): value is StayPlan {
  return Boolean(value && typeof value === "object" && (value as StayPlan).room);
}

type CommerceOrderMutation = "add" | "remove" | "start" | "none";

function commerceOrderMutationFromMessage(message: string, hasActiveStayPlan: boolean): CommerceOrderMutation {
  const text = (message || "").toLowerCase().trim();
  if (!text) return "none";

  if (
    /\b(start over|new order|new booking|clear order|clear cart|reset|restart)\b/.test(text)
  ) {
    return "start";
  }

  if (
    hasActiveStayPlan &&
    /\b(remove|delete|drop|take off|take out|without|no longer|don'?t need|cancel the)\b/.test(text)
  ) {
    return "remove";
  }

  const addsBookingFields =
    /\b(add|use|set|for this stay|for the stay|check.?in|check.?out|dates?|guests?|adults?|children|kids|budget|premium wi-?fi|wifi|breakfast|parking|package|bundle|add-?on)\b/.test(text);

  return hasActiveStayPlan && addsBookingFields ? "add" : "none";
}

type GuideConversationContext = {
  singleTurn?: boolean;
  lastUserMessage?: string;
  recentUserMessages?: string[];
  recentBotSummary?: string;
  currentGuideStepIndex?: number;
  currentGuideSteps?: SuggestedAction[];
  currentGuideStep?: SuggestedAction | null;
  lastRefinementChipClicked?: string | null;
  commerceContext?: CommerceSessionContext;
  activeStayPlan?: StayPlan | null;
};

type SuggestedAction = {
  type?: string;
  targetId?: string;
  pageId?: string;
  pageUrl?: string;
  reason?: string;
  targetText?: string;
  targetCandidates?: string[];
};

type StepNarrative = {
  targetId?: string;
  pageId?: string;
  pageUrl?: string;
  targetText?: string;
  intro?: string;
  bullets?: string[];
  closing?: string;
  offerComposition?: unknown;
  stayPlan?: StayPlan;
};

type GuidedAction = SuggestedAction & {
  stepNarrative?: StepNarrative;
  stayPlan?: StayPlan;
};

type ThreadItem = {
  id: string;
  role: "bot" | "user";
  title?: string;
  body: string;
  answerParts?: AnswerParts;
  refinementChips?: string[];
  suggestedAction?: SuggestedAction;
  status?: "thinking" | "done";
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function emitDemoResponseComplete(detail: {
  ok: boolean;
  hasNavigation?: boolean;
  stepCount?: number;
  isMultiStep?: boolean;
  message?: string;
  displayMode?: string;
  hasStayPlan?: boolean;
}) {
  window.dispatchEvent(
    new CustomEvent(GUIDE_DEMO_RESPONSE_COMPLETE_EVENT, { detail }),
  );
}

function buildFakeReply(userText: string) {
  const input = userText.trim().toLowerCase();

  if (input.includes("tour")) {
    return {
      title: "Prototype response",
      body: "I can do that. In the real version, this is where I’d decide whether to answer directly or begin a guided path through the site.",
    };
  }

  if (input.includes("security") || input.includes("cyber")) {
    return {
      title: "Prototype response",
      body: "Cybersecurity looks like the best lane for that question. Once we wire real behavior, I’d keep the shell readable, then guide you to the most relevant destination on the site.",
    };
  }

  if (input.includes("hello") || input.includes("hi")) {
    return {
      title: "Prototype response",
      body: "Hi — I’m here. This version removes the typing loader and slows the message entrance so each row can slide up from behind the composer.",
    };
  }

  return {
    title: "Prototype response",
    body: "Got it. The thread stays scrollable above a stable composer, and messages now enter more slowly without a typing-loader row interrupting the motion.",
  };
}
void buildFakeReply;

type GuideAiResponse = {
  answer?: string;
  answerParts?: AnswerParts;
  message?: string;
  reply?: string;
  body?: string;
  title?: string;
  suggestedAction?: SuggestedAction;
  rankedDestinations?: SuggestedAction[];
  stepNarratives?: StepNarrative[];
  refinementChips?: string[];
  commerceAction?: string;
  displayMode?: string;
  stayPlan?: StayPlan;
  navigationOrder?: string[];
  bookingUpdate?: { stayPlan?: StayPlan; [key: string]: unknown };
  extractedBookingContext?: ExtractedBookingContext;
  visibleContext?: VisibleContext;
  followups?: string[];
};

function getPageSections() {
  const sectionNodes = Array.from(
    document.querySelectorAll<HTMLElement>("section[id], [data-tour-id], [id]"),
  ).slice(0, 80);

  return sectionNodes
    .map((node) => {
      const id = node.getAttribute("data-tour-id") || node.id;
      const heading = node.querySelector("h1,h2,h3")?.textContent?.trim();
      const text = (node.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      return {
        id,
        label: heading || id || "Page section",
        summary: text,
      };
    })
    .filter((section) => section.id && section.summary);
}

async function callGuideAi(
  message: string,
  guideConfig?: GuideConfig,
  conversationContext?: GuideConversationContext,
  visibleContext?: VisibleContext,
): Promise<{
  title: string;
  body: string;
  answerParts?: AnswerParts;
  suggestedAction?: SuggestedAction;
  rankedDestinations?: SuggestedAction[];
  stepNarratives?: StepNarrative[];
  refinementChips?: string[];
  commerceAction?: string;
  displayMode?: string;
  stayPlan?: StayPlan | null;
  navigationOrder?: string[];
  extractedBookingContext?: ExtractedBookingContext;
  visibleContext?: VisibleContext;
}> {
  const response = await fetch(GUIDE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      mode: guideConfig?.mode || "discovery",
      guideConfig,
      message,
      conversationContext,
      visibleContext,
      pageContext: {
        url: window.location.href,
        title: document.title,
        sections: getPageSections(),
      },
    }),
  });

  let data: GuideAiResponse = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const detail =
      data.answer || data.message || data.body || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const answer = data.answer || data.reply || data.message || data.body;
  const responseVisibleContext =
    data.visibleContext && typeof data.visibleContext === "object"
      ? data.visibleContext
      : undefined;
  const responseBookingContext =
    responseVisibleContext?.bookingContext &&
    typeof responseVisibleContext.bookingContext === "object"
      ? (responseVisibleContext.bookingContext as ExtractedBookingContext)
      : undefined;
  const visibleStayPlan = isStayPlan(responseVisibleContext?.activeStayPlan)
    ? responseVisibleContext?.activeStayPlan
    : null;

  return {
    title: data.title || "Guide response",
    body:
      answer ||
      data.answerParts?.intro ||
      "I received the request, but the backend did not return an answer.",
    answerParts: data.answerParts,
    suggestedAction: data.suggestedAction,
    rankedDestinations: Array.isArray(data.rankedDestinations)
      ? data.rankedDestinations
      : [],
    stepNarratives: Array.isArray(data.stepNarratives)
      ? data.stepNarratives
      : [],
    refinementChips: Array.isArray(data.refinementChips)
      ? data.refinementChips.filter(Boolean).slice(0, 6)
      : [],
    commerceAction:
      typeof data.commerceAction === "string" ? data.commerceAction : undefined,
    displayMode: typeof data.displayMode === "string" ? data.displayMode : undefined,
    stayPlan: isStayPlan(data.stayPlan)
      ? data.stayPlan
      : isStayPlan(data.bookingUpdate?.stayPlan)
        ? data.bookingUpdate?.stayPlan
        : visibleStayPlan,
    navigationOrder: Array.isArray(data.navigationOrder)
      ? data.navigationOrder.filter(Boolean)
      : [],
    extractedBookingContext: data.extractedBookingContext || responseBookingContext,
    visibleContext: responseVisibleContext,
  };
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

const TARGET_ALIASES: Record<string, string[]> = {
  "solution-cloud": [
    "solution-cloud",
    "cloud",
    "cloud-infrastructure",
    "cloud-platforms",
    "cloud-support",
  ],
  "solution-cyber": [
    "solution-cyber",
    "cyber",
    "cybersecurity",
    "cybersecurity-compliance",
    "managed-xdr",
  ],
  "managed-xdr": [
    "managed-xdr",
    "solution-cyber",
    "cyber",
    "cybersecurity",
    "cybersecurity-compliance",
  ],
  "governance-risk": [
    "governance-risk",
    "risk",
    "compliance",
    "cybersecurity-compliance",
  ],
  "solution-ai-data": ["solution-ai-data", "ai-data", "ai", "data", "copilot"],
  "solution-managed": [
    "solution-managed",
    "managed",
    "managed-solutions",
    "managed-it",
  ],
  "solutions-grid": ["solutions-grid", "solutions", "solution-comparison"],
};

function phraseFromId(value?: string | null) {
  return (value || "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isVisibleElement(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 4 &&
    rect.height > 4 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function isInsideChrome(el: HTMLElement) {
  return Boolean(
    el.closest(
      'nav, header, footer, [role="navigation"], [aria-label*="navigation" i], [class*="sticky"], [class*="fixed"], [class*="top-"]',
    ),
  );
}

function isLikelyContentTarget(el: HTMLElement) {
  if (!isVisibleElement(el)) return false;
  if (isInsideChrome(el)) return false;

  const tag = el.tagName.toLowerCase();
  const hasTourId = Boolean(el.getAttribute("data-tour-id"));
  const hasSectionId = tag === "section" && Boolean(el.id);
  const hasHeading = Boolean(el.querySelector("h1,h2,h3,h4"));
  const textLength = (el.innerText || el.textContent || "").trim().length;

  return (
    hasTourId ||
    hasSectionId ||
    tag === "article" ||
    hasHeading ||
    textLength > 80
  );
}

function contentContainerFor(node: HTMLElement): HTMLElement | null {
  const container = node.closest<HTMLElement>(
    'main [data-tour-id], main section[id], main article, main [role="region"], main [class*="card"], main [class*="Card"], main [class*="rounded"]',
  );

  if (container && isLikelyContentTarget(container)) return container;
  if (isLikelyContentTarget(node)) return node;
  return null;
}

function isExactInteractiveTourTarget(node: HTMLElement) {
  const tag = node.tagName.toLowerCase();
  return Boolean(
    isVisibleElement(node) &&
      (node.getAttribute("data-tour-id") || node.id) &&
      (tag === "button" ||
        tag === "a" ||
        node.matches('button, a, input, select, textarea, [role="button"], [role="link"], [data-demo-target]'))
  );
}

function getTargetCandidates(
  actionOrTarget?: SuggestedAction | string | null,
): string[] {
  const action =
    typeof actionOrTarget === "object" && actionOrTarget !== null
      ? actionOrTarget
      : undefined;
  const raw =
    typeof actionOrTarget === "string" ? actionOrTarget : action?.targetId;
  const targetId = (raw || "").trim();
  const lower = targetId.toLowerCase();

  const direct = [
    targetId,
    lower,
    phraseFromId(targetId),
    action?.targetText,
    action?.pageId,
    ...(Array.isArray(action?.targetCandidates)
      ? (action?.targetCandidates ?? [])
      : []),
    ...(TARGET_ALIASES[lower] || []),
  ];

  const expanded = direct.flatMap((item) => {
    const clean = (item || "").trim();
    if (!clean) return [];
    return [clean, clean.toLowerCase(), phraseFromId(clean)];
  });

  return Array.from(new Set(expanded.filter(Boolean)));
}

function closestSpotlightContainer(node: HTMLElement): HTMLElement {
  return (
    contentContainerFor(node) ||
    node.closest<HTMLElement>(
      'main [data-tour-id], main section, main article, main [role="region"], main [class*="card"], main [class*="Card"], main [class*="rounded"]',
    ) ||
    node
  );
}
void closestSpotlightContainer;

function findByExactTarget(candidates: string[]): HTMLElement | null {
  for (const candidate of candidates) {
    const escaped = cssEscape(candidate);
    const exact =
      document.querySelector<HTMLElement>(`[data-tour-id="${escaped}"]`) ||
      document.querySelector<HTMLElement>(`[aria-label="${escaped}"]`) ||
      document.getElementById(candidate) ||
      document.querySelector<HTMLElement>(`#${escaped}`);

    if (exact) {
      // Exact interactive anchors, such as adaptive-contact-button, must resolve
      // to the control itself. Wrapping them in a larger content container makes
      // action focus degrade into a broad area effect.
      if (isExactInteractiveTourTarget(exact)) return exact;

      const target = contentContainerFor(exact);
      if (target) return target;
    }
  }

  return null;
}

function nodePriority(node: HTMLElement) {
  const tag = node.tagName.toLowerCase();
  if (node.getAttribute("data-tour-id")) return 4;
  if (tag === "section" && node.id) return 3;
  if (tag === "article") return 2;
  return 1;
}

function scoreTextMatch(
  text: string,
  candidates: string[],
  node?: HTMLElement,
) {
  let score = 0;

  for (const candidate of candidates) {
    if (!candidate || candidate.length < 3) continue;

    if (text === candidate) score += 80;
    else if (text.startsWith(candidate)) score += 45;
    else if (text.includes(candidate)) score += 25;

    const words = candidate.split(" ").filter((word) => word.length >= 4);
    for (const word of words) {
      if (text.includes(word)) score += 4;
    }
  }

  if (node) {
    const idText = normalizeText(
      node.id || node.getAttribute("data-tour-id") || "",
    );
    const headingText = normalizeText(
      node.querySelector("h1,h2,h3,h4")?.textContent || "",
    );

    for (const candidate of candidates) {
      if (!candidate || candidate.length < 3) continue;
      if (idText === candidate) score += 160;
      else if (idText.includes(candidate) || candidate.includes(idText))
        score += 80;
      if (headingText === candidate) score += 140;
      else if (
        headingText.includes(candidate) ||
        candidate.includes(headingText)
      )
        score += 70;
    }

    score += nodePriority(node) * 10;
  }

  return score;
}

function findByHeadingOrText(candidates: string[]): HTMLElement | null {
  const normalizedCandidates = candidates
    .map(normalizeText)
    .filter((candidate) => candidate.length >= 3);

  if (!normalizedCandidates.length) return null;

  type ScoredTarget = { node: HTMLElement; score: number; length: number };
  let best: ScoredTarget | null = null;

  const consider = (node: HTMLElement, text: string) => {
    const target = contentContainerFor(node);
    if (!target) return;

    const targetText = normalizeText(
      target.innerText || target.textContent || "",
    );
    const combinedText = normalizeText(`${text} ${targetText}`);
    const score = scoreTextMatch(combinedText, normalizedCandidates, target);
    if (score <= 0) return;

    const length = combinedText.length;
    if (
      !best ||
      score > best.score ||
      (score === best.score &&
        nodePriority(target) > nodePriority(best.node)) ||
      (score === best.score &&
        nodePriority(target) === nodePriority(best.node) &&
        length < best.length)
    ) {
      best = { node: target, score, length };
    }
  };

  const headingNodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      "main h1, main h2, main h3, main h4, main h5, main h6, main [data-tour-label]",
    ),
  ).filter(isVisibleElement);

  for (const heading of headingNodes) {
    consider(
      heading,
      normalizeText(
        heading.textContent || heading.getAttribute("data-tour-label") || "",
      ),
    );
  }

  const contentNodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      'main [data-tour-id], main section, main article, main li, main div, main [role="region"]',
    ),
  )
    .filter(isLikelyContentTarget)
    .map((node) => {
      const text = normalizeText(node.innerText || node.textContent || "");
      return { node, text, length: text.length };
    })
    .filter(({ text, length }) => text && length >= 3 && length <= 1800);

  for (const { node, text } of contentNodes) {
    consider(node, text);
  }

  const bestTarget = best as ScoredTarget | null;
  if (bestTarget && bestTarget.score >= 20) return bestTarget.node;
  return null;
}

function findTourTarget(
  actionOrTarget?: SuggestedAction | string | null,
): HTMLElement | null {
  const candidates = getTargetCandidates(actionOrTarget);
  if (!candidates.length) return null;

  return findByExactTarget(candidates) || findByHeadingOrText(candidates);
}

function findExactExternalSpotlightTarget(
  targetId?: string | null,
  selector?: string | null,
): HTMLElement | null {
  const selectors: string[] = [];

  if (selector?.trim()) selectors.push(selector.trim());

  const cleanTargetId = (targetId || "").trim();
  if (cleanTargetId) {
    const escaped = cssEscape(cleanTargetId);
    selectors.push(`[data-tour-id="${escaped}"]`);
    selectors.push(`#${escaped}`);
  }

  for (const item of selectors) {
    try {
      const node = document.querySelector<HTMLElement>(item);
      if (node && isVisibleElement(node)) return node;
    } catch {
      // Ignore malformed selectors supplied by callers.
    }
  }

  if (cleanTargetId) {
    const byId = document.getElementById(cleanTargetId);
    if (byId instanceof HTMLElement && isVisibleElement(byId)) return byId;
  }

  return null;
}

function samePath(pageUrl?: string | null) {
  if (!pageUrl) return true;
  try {
    const target = new URL(pageUrl, window.location.origin);
    return target.pathname === window.location.pathname;
  } catch {
    return true;
  }
}
void samePath;

function rememberPendingSpotlight(action: SuggestedAction) {
  if (!action.targetId) return;

  try {
    window.sessionStorage.setItem(
      GUIDE_PENDING_SPOTLIGHT_KEY,
      JSON.stringify({ action, savedAt: Date.now() }),
    );
  } catch {
    // Ignore storage failures in private/incognito contexts.
  }
}

function readPendingSpotlight(): SuggestedAction | null {
  try {
    const raw = window.sessionStorage.getItem(GUIDE_PENDING_SPOTLIGHT_KEY);
    if (!raw) return null;

    window.sessionStorage.removeItem(GUIDE_PENDING_SPOTLIGHT_KEY);
    const parsed = JSON.parse(raw);
    const action = parsed?.action || {
      targetId: parsed?.targetId,
      type: "navigate",
    };
    if (!action?.targetId || Date.now() - Number(parsed.savedAt || 0) > 15000) {
      return null;
    }

    return action;
  } catch {
    return null;
  }
}

function rememberShellSession(shellState: ShellState, thread: ThreadItem[]) {
  try {
    if (shellState === "welcome") {
      window.sessionStorage.removeItem(GUIDE_SHELL_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(
      GUIDE_SHELL_SESSION_KEY,
      JSON.stringify({ shellState, thread, savedAt: Date.now() }),
    );
  } catch {
    // Ignore storage failures in private/incognito contexts.
  }
}

function readShellSession(): {
  shellState: ShellState;
  thread: ThreadItem[];
} | null {
  try {
    const raw = window.sessionStorage.getItem(GUIDE_SHELL_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - Number(parsed.savedAt || 0) > 30 * 60 * 1000) return null;
    if (!["panel", "launcher"].includes(parsed?.shellState)) return null;
    if (!Array.isArray(parsed?.thread)) return null;

    return {
      shellState: parsed.shellState as ShellState,
      thread: parsed.thread as ThreadItem[],
    };
  } catch {
    return null;
  }
}

function normalizeGuideSteps(reply: {
  suggestedAction?: SuggestedAction;
  rankedDestinations?: SuggestedAction[];
  stepNarratives?: StepNarrative[];
}): GuidedAction[] {
  const rawSteps =
    Array.isArray(reply.rankedDestinations) &&
    reply.rankedDestinations.length > 0
      ? reply.rankedDestinations
      : reply.suggestedAction
        ? [reply.suggestedAction]
        : [];

  const narrativesByTarget = new Map<string, StepNarrative>();
  if (Array.isArray(reply.stepNarratives)) {
    reply.stepNarratives.forEach((narrative) => {
      const key = (narrative?.targetId || "").toLowerCase();
      if (key) narrativesByTarget.set(key, narrative);
    });
  }

  const seen = new Set<string>();
  return rawSteps
    .filter((step) => step && step.type === "navigate" && step.targetId)
    .filter((step) => {
      const key =
        `${step.pageUrl || step.pageId || ""}::${step.targetId || ""}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_GUIDED_STEPS)
    .map((step) => ({
      ...step,
      stepNarrative: narrativesByTarget.get(
        (step.targetId || "").toLowerCase(),
      ),
    }));
}

function stayPlanFromGuidedStep(step?: GuidedAction | null): StayPlan | null {
  if (!step) return null;
  if (isStayPlan(step.stayPlan)) return step.stayPlan;
  if (isStayPlan(step.stepNarrative?.stayPlan)) return step.stepNarrative?.stayPlan || null;
  if (isStayPlan((step as { offerComposition?: unknown }).offerComposition)) {
    return (step as { offerComposition?: StayPlan }).offerComposition || null;
  }
  if (isStayPlan((step.stepNarrative as { offerComposition?: unknown } | undefined)?.offerComposition)) {
    return ((step.stepNarrative as { offerComposition?: StayPlan } | undefined)?.offerComposition || null);
  }
  return null;
}

function primaryRoomStepForStayPlan(
  stayPlan: StayPlan | null,
  steps: GuidedAction[],
): GuidedAction | null {
  const roomTargetId = stayPlan?.room?.targetId || null;
  if (!roomTargetId) return null;
  return (
    steps.find((step) => step?.targetId === roomTargetId) ||
    ({
      type: "navigate",
      targetId: roomTargetId,
      targetText: stayPlan?.room?.title || undefined,
    } as GuidedAction)
  );
}

function answerPartsForGuideStep(
  step: GuidedAction,
  index: number,
  total: number,
): AnswerParts {
  const narrative = step.stepNarrative;
  const label =
    narrative?.targetText ||
    step.targetText ||
    phraseFromId(step.targetId) ||
    "this section";
  const intro =
    narrative?.intro ||
    (total > 1
      ? `${index === 0 ? "Let’s start with" : "Next, let’s look at"} **${label}**.`
      : `Here’s the most relevant section: **${label}**.`);

  return {
    intro,
    bullets: Array.isArray(narrative?.bullets)
      ? narrative?.bullets.filter(Boolean)
      : [],
    closing: narrative?.closing || step.reason || "",
  };
}

function answerBodyFromParts(parts: AnswerParts) {
  const chunks: string[] = [];
  if (parts.intro) chunks.push(parts.intro);
  if (parts.bullets?.length)
    chunks.push(parts.bullets.map((item) => `- ${item}`).join("\n"));
  if (parts.closing) chunks.push(parts.closing);
  return chunks.join("\n\n").trim();
}

function guideStepLabel(step?: SuggestedAction | null) {
  if (!step) return "Step";
  return (
    step.targetText || phraseFromId(step.targetId) || step.pageId || "Step"
  );
}

type CompletionWidget = "dates" | "guests" | "budget" | "saved-trip" | "upsell" | null;
type DatePickerKind = "check-in" | "check-out" | null;
type BudgetBand = "Value" | "Moderate" | "Premium" | "Luxury";

const BUDGET_BANDS: BudgetBand[] = ["Value", "Moderate", "Premium", "Luxury"];

type UpsellSuggestion = {
  label: string;
  prompt: string;
  helper: string;
};

const DEFAULT_UPSELL_SUGGESTIONS: UpsellSuggestion[] = [
  {
    label: "Add breakfast",
    prompt: "Show me breakfast packages I can add to this stay.",
    helper: "Morning value and coffee coverage.",
  },
  {
    label: "Better view",
    prompt: "Show me room upgrades with better views for this stay.",
    helper: "Ocean, terrace, balcony, or premium view options.",
  },
  {
    label: "Quieter room",
    prompt: "Show me quieter room options or quiet-floor upgrades for this stay.",
    helper: "Better sleep, business travel, lower noise.",
  },
  {
    label: "Parking / shuttle",
    prompt: "Show me parking or airport transfer packages I can add to this stay.",
    helper: "Convenience add-ons before checkout.",
  },
  {
    label: "Late checkout",
    prompt: "Show me packages with late checkout for this stay.",
    helper: "More flexibility on departure day.",
  },
  {
    label: "Spa / relaxation",
    prompt: "Show me spa, rooftop, or relaxation packages I can add to this stay.",
    helper: "Premium leisure upsell.",
  },
  {
    label: "Business upgrade",
    prompt: "Show me business-friendly upgrades with premium Wi-Fi or meeting pods for this stay.",
    helper: "Work lounge, Wi-Fi, meeting support.",
  },
  {
    label: "Family comfort",
    prompt: "Show me family comfort packages or kid-friendly amenities for this stay.",
    helper: "Kids Club, towels, snacks, pool support.",
  },
];

function formatShellDate(value: string) {
  if (!value) return "Select date";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShellDateRange(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return "Dates not selected";
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

function guestSummary(adults: number, children: number) {
  const adultsLabel = `${adults} adult${adults === 1 ? "" : "s"}`;
  const childrenLabel =
    children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : "";
  return `${adultsLabel}${childrenLabel}`;
}

function clearShellSession() {
  try {
    window.sessionStorage.removeItem(GUIDE_SHELL_SESSION_KEY);
  } catch {
    // Ignore storage failures in private/incognito contexts.
  }
}

function clearActiveSpotlight() {
  clearScheduledSpotlightTimers();

  if (activeSpotlightCleanup) {
    activeSpotlightCleanup();
    activeSpotlightCleanup = null;
  }

  if (activeSpotlightOverlay) {
    activeSpotlightOverlay.remove();
    activeSpotlightOverlay = null;
  }

  // Defensive cleanup for demo teardown. If a spotlight overlay was created
  // during an async navigation/booking handoff, closing the demo card should
  // still remove every remaining dimming layer even if the active ref is stale.
  if (typeof document !== "undefined") {
    document
      .querySelectorAll<HTMLElement>('[data-guide-spotlight-overlay="true"], [data-guide-spotlight-label="true"]')
      .forEach((node) => node.remove());

    document
      .querySelectorAll<HTMLElement>('[data-guide-spotlight-target="true"]')
      .forEach((node) => {
        node.removeAttribute("data-guide-spotlight-target");
        node.removeAttribute("data-guide-spotlight-mode");
        node.style.outline = "";
        node.style.outlineOffset = "";
        node.style.boxShadow = "";
        node.style.zIndex = "";
        node.style.transition = "";
        node.style.borderRadius = "";
      });
  }
}

type SpotlightMode = "card" | "area" | "control" | "navigation";

function visibleHeadingInside(target: HTMLElement): HTMLElement | null {
  if (target.tagName.toLowerCase().match(/^h[1-6]$/) || target.hasAttribute("data-tour-heading")) {
    return isVisibleElement(target) ? target : null;
  }

  const headings = Array.from(
    target.querySelectorAll<HTMLElement>("h1,h2,h3,h4,[data-tour-heading]"),
  );

  return headings.find(isVisibleElement) || null;
}

function isNavigationSpotlightTarget(target: HTMLElement) {
  const targetId = (
    target.getAttribute("data-tour-id") || target.id || target.getAttribute("aria-label") || ""
  ).toLowerCase();

  return Boolean(
    targetId.includes("menu-path") ||
      target.closest("header, nav, [role='navigation']"),
  );
}

function isControlSpotlightTarget(target: HTMLElement) {
  const targetId = (
    target.getAttribute("data-tour-id") || target.id || target.getAttribute("aria-label") || ""
  ).toLowerCase();
  const tag = target.tagName.toLowerCase();
  const interactiveSelector =
    'button, a, input, select, textarea, [role="button"], [role="link"], [data-demo-target]';

  return Boolean(
    targetId.includes("contact-button") ||
      tag === "button" ||
      tag === "a" ||
      target.matches(interactiveSelector),
  );
}

const AREA_FOCUS_TARGET_IDS = new Set([
  // Area focus is deliberately opt-in. It is a fallback for truly broad,
  // uncontainable demo regions — not the default treatment for normal tours.
  "adaptive-global-content-band",
  "adaptive-ai-human-workflow",
]);

function targetIdentity(target: HTMLElement) {
  return (
    target.getAttribute("data-tour-id") || target.id || target.getAttribute("aria-label") || ""
  ).toLowerCase();
}

function isLargeCoherentArea(target: HTMLElement) {
  const targetId = targetIdentity(target);
  return AREA_FOCUS_TARGET_IDS.has(targetId);
}

function effectiveSpotlightTarget(target: HTMLElement): HTMLElement {
  const targetId = targetIdentity(target);

  if (targetId.includes("expert-cta")) {
    const buttonTarget = target.querySelector<HTMLElement>(
      '[data-tour-id="adaptive-contact-button"], #adaptive-contact-button, button, a, [role="button"]',
    );
    if (buttonTarget && isVisibleElement(buttonTarget)) return buttonTarget;
  }

  // Default to the actual selected target. Earlier heuristic retargeting made
  // ordinary tours look like area-focus blankets. Border/card spotlight should
  // be the normal fallback unless a target is explicitly whitelisted for area focus.
  return target;
}

function scrollTargetForSpotlight(target: HTMLElement): HTMLElement {
  const effectiveTarget = effectiveSpotlightTarget(target);
  return isLargeCoherentArea(effectiveTarget)
    ? visibleHeadingInside(effectiveTarget) || effectiveTarget
    : effectiveTarget;
}

function getAdaptiveSpotlightMode(target: HTMLElement): SpotlightMode {
  if (isNavigationSpotlightTarget(target)) return "navigation";
  if (isControlSpotlightTarget(target)) return "control";
  if (isLargeCoherentArea(target)) return "area";
  return "card";
}
void getAdaptiveSpotlightMode;

function expandedSpotlightRect(target: HTMLElement, padding: number) {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

  return {
    top: Math.max(12, rect.top - padding),
    left: Math.max(12, rect.left - padding),
    width: Math.min(viewportWidth - 24, rect.width + padding * 2),
    height: Math.min(viewportHeight - 24, rect.height + padding * 2),
    raw: rect,
  };
}

function visibleAreaRect(target: HTMLElement, padding = 14) {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const safeTop = 92;
  const safeBottom = viewportHeight - 18;
  const left = Math.max(12, rect.left - padding);
  const right = Math.min(viewportWidth - 12, rect.right + padding);
  const top = Math.max(safeTop, rect.top - padding);
  const bottom = Math.min(safeBottom, rect.bottom + padding);

  return {
    left,
    top,
    width: Math.max(220, right - left),
    height: Math.max(150, bottom - top),
  };
}
void visibleAreaRect;

function applySpotlightBox(layer: HTMLElement, rect: ReturnType<typeof expandedSpotlightRect>) {
  layer.style.top = `${rect.top}px`;
  layer.style.left = `${rect.left}px`;
  layer.style.width = `${rect.width}px`;
  layer.style.height = `${rect.height}px`;
}

function createAreaFocusLayer(target: HTMLElement) {
  // Simplified demo-safe spotlight path: area/card/control/navigation now all
  // share the same plain ring behavior. This intentionally removes the old
  // experimental area-focus shimmer/label system that could leave the page dimmed
  // without a visible target.
  return createSpotlightLayer("area", target);
}
void createAreaFocusLayer;

function createSpotlightLayer(_mode: SpotlightMode, target: HTMLElement) {
  const layer = document.createElement("div");
  layer.setAttribute("data-guide-spotlight-overlay", "true");
  layer.setAttribute("data-guide-spotlight-mode", "ring");
  layer.style.position = "fixed";
  layer.style.zIndex = "8998";
  layer.style.pointerEvents = "none";
  layer.style.opacity = "0";
  layer.style.transition = "opacity 220ms ease, transform 220ms ease";
  layer.style.transform = "translateY(4px)";
  layer.style.border = "3px solid rgba(255,255,255,0.94)";
  layer.style.borderRadius = "24px";
  layer.style.boxShadow =
    "0 0 0 8px rgba(255,255,255,0.14), 0 22px 70px rgba(15,23,42,0.32)";
  layer.style.background = "rgba(255,255,255,0.03)";
  applySpotlightBox(layer, expandedSpotlightRect(target, 10));
  document.body.appendChild(layer);
  return layer;
}

function spotlightTarget(rawTarget: HTMLElement) {
  clearActiveSpotlight();

  const target = effectiveSpotlightTarget(rawTarget);
  if (!target || !target.isConnected || !isVisibleElement(target)) {
    clearActiveSpotlight();
    return false;
  }

  const overlay = document.createElement("div");
  overlay.setAttribute("data-guide-spotlight-overlay", "true");
  overlay.setAttribute("data-guide-spotlight-mode", "dim");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "8997";
  overlay.style.pointerEvents = "none";
  overlay.style.background = "rgba(15, 23, 42, 0.34)";
  overlay.style.backdropFilter = "saturate(0.9)";
  overlay.style.transition = "opacity 320ms ease";
  overlay.style.opacity = "0";
  document.body.appendChild(overlay);
  activeSpotlightOverlay = overlay;

  const focusLayer = createSpotlightLayer("card", target);

  const previousPosition = target.style.position;
  const previousZIndex = target.style.zIndex;
  const previousOutline = target.style.outline;
  const previousOutlineOffset = target.style.outlineOffset;
  const previousBoxShadow = target.style.boxShadow;
  const previousBorderRadius = target.style.borderRadius;
  const previousTransition = target.style.transition;
  const computedPosition = window.getComputedStyle(target).position;

  target.setAttribute("data-guide-spotlight-target", "true");
  target.setAttribute("data-guide-spotlight-mode", "card");
  target.style.position = computedPosition === "static" ? "relative" : previousPosition;
  target.style.zIndex = "8999";
  target.style.transition = "box-shadow 220ms ease, outline 220ms ease, outline-offset 220ms ease";
  target.style.outline = "3px solid rgba(255, 255, 255, 0.94)";
  target.style.outlineOffset = "8px";
  target.style.boxShadow =
    "0 24px 90px rgba(15, 23, 42, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.72)";
  target.style.borderRadius = target.style.borderRadius || "24px";

  const positionLayer = () => {
    if (!target.isConnected || !isVisibleElement(target)) return;
    applySpotlightBox(focusLayer, expandedSpotlightRect(target, 10));
  };

  const onViewportChange = () => positionLayer();
  window.addEventListener("scroll", onViewportChange, { passive: true });
  window.addEventListener("resize", onViewportChange);

  window.requestAnimationFrame(() => {
    positionLayer();
    overlay.style.opacity = "1";
    focusLayer.style.opacity = "1";
    focusLayer.style.transform = "translateY(0)";
  });

  activeSpotlightCleanup = () => {
    window.removeEventListener("scroll", onViewportChange);
    window.removeEventListener("resize", onViewportChange);

    if (activeSpotlightOverlay) {
      activeSpotlightOverlay.remove();
      activeSpotlightOverlay = null;
    }

    document
      .querySelectorAll<HTMLElement>('[data-guide-spotlight-overlay="true"], [data-guide-spotlight-label="true"]')
      .forEach((node) => node.remove());

    target.style.position = previousPosition;
    target.style.zIndex = previousZIndex;
    target.style.outline = previousOutline;
    target.style.outlineOffset = previousOutlineOffset;
    target.style.boxShadow = previousBoxShadow;
    target.style.borderRadius = previousBorderRadius;
    target.style.transition = previousTransition;
    target.removeAttribute("data-guide-spotlight-target");
    target.removeAttribute("data-guide-spotlight-mode");
  };

  return true;
}
function suggestedActionToTourStep(action: SuggestedAction): TourStep {
  const targetId = (action.targetId || "").trim();
  const pageUrl = (action.pageUrl || "").trim();
  const title =
    action.targetText ||
    (targetId ? `Navigate to ${targetId}` : "Suggested destination");
  const selector = getTargetCandidates(action)
    .map((candidate) => `[data-tour-id="${candidate}"], #${candidate}`)
    .join(", ");

  return {
    title,
    summary:
      action.reason || "Recommended destination based on the guide response.",
    bridge: "",
    targetId,
    anchorId: targetId,
    pageId: action.pageId || "",
    pageUrl,
    url: pageUrl,
    href: pageUrl,
    path: pageUrl,
    route: pageUrl,
    selector,
    targetText: action.targetText || phraseFromId(targetId),
    targetCandidates: getTargetCandidates(action),
  } as unknown as TourStep;
}

function runGuideNavigation(
  action?: SuggestedAction,
  onRunStep?: (step: TourStep) => void,
) {
  if (!action || action.type !== "navigate" || !action.targetId) return;

  if (onRunStep) {
    onRunStep(suggestedActionToTourStep(action));
    return;
  }

  runSuggestedNavigation(action);
}
void runGuideNavigation;

function pageIntentLabels(action: SuggestedAction): string[] {
  const values = [
    action.pageId,
    action.pageUrl,
    action.targetId,
    action.targetText,
  ]
    .filter(Boolean)
    .map(String);
  const joined = values.join(" ").toLowerCase();

  if (joined.includes("cyber"))
    return ["cyber", "cybersecurity", "cybersecurity & compliance"];
  if (joined.includes("cloud") || joined.includes("solutions"))
    return ["solutions", "cloud", "cloud & infrastructure"];
  if (joined.includes("hedge")) return ["hedge fund", "hedge"];
  if (joined.includes("compliance")) return ["compliance", "global compliance"];
  if (joined.includes("home") || joined === "/") return ["home"];

  return values
    .flatMap((value) => [value, phraseFromId(value)])
    .filter(Boolean);
}

function findPageNavigationControl(
  action: SuggestedAction,
): HTMLElement | null {
  const labels = pageIntentLabels(action).map(normalizeText).filter(Boolean);
  if (!labels.length) return null;

  const controls = Array.from(
    document.querySelectorAll<HTMLElement>(
      "header button, header a, nav button, nav a, [role='navigation'] button, [role='navigation'] a",
    ),
  );

  return (
    controls.find((control) => {
      const text = normalizeText(
        control.innerText ||
          control.textContent ||
          control.getAttribute("aria-label") ||
          "",
      );
      if (!text) return false;
      return labels.some(
        (label) =>
          text === label || text.includes(label) || label.includes(text),
      );
    }) || null
  );
}

function smoothScrollElementIntoView(
  target: HTMLElement,
  options: { duration?: number; block?: "center" | "start" } = {},
) {
  const duration = options.duration ?? GUIDE_NAVIGATION_SCROLL_MS;
  const block = options.block ?? "center";
  const rect = target.getBoundingClientRect();
  const startY = window.scrollY || window.pageYOffset || 0;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 0;
  const rawTargetY =
    block === "center"
      ? startY + rect.top - viewportHeight / 2 + rect.height / 2
      : startY + rect.top;
  const maxY = Math.max(
    0,
    document.documentElement.scrollHeight - viewportHeight,
  );
  const targetY = Math.max(0, Math.min(rawTargetY, maxY));
  const distance = targetY - startY;

  if (Math.abs(distance) < 4) return;

  const startedAt = performance.now();
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
}

function runSpotlightWithRetries(
  action: SuggestedAction,
  delays = [120, 320, 700, 1200, 1900, 2800],
  onSpotlightActive?: () => void,
) {
  const runId = beginSpotlightRun();
  let completed = false;
  const mobileSettleDelay = isCoarsePointer() ? 300 : 0;
  const spotlightAfterScrollDelay =
    GUIDE_NAVIGATION_SCROLL_MS + (isCoarsePointer() ? 240 : 120);

  const failSafely = () => {
    if (!isCurrentSpotlightRun(runId) || completed) return;
    completed = true;
    clearActiveSpotlight();
    console.warn("Guide spotlight target not found after retries:", {
      targetId: action.targetId,
      pageId: action.pageId,
      pageUrl: action.pageUrl,
    });
  };

  delays.forEach((delay) => {
    scheduleSpotlightTimer(() => {
      if (!isCurrentSpotlightRun(runId) || completed) return;

      const initialTarget = findTourTarget(action);
      if (!initialTarget || !initialTarget.isConnected || !isVisibleElement(initialTarget)) return;

      completed = true;
      scheduleSpotlightTimer(() => {
        if (!isCurrentSpotlightRun(runId)) return;

        smoothScrollElementIntoView(scrollTargetForSpotlight(initialTarget));
        scheduleSpotlightTimer(() => {
          if (!isCurrentSpotlightRun(runId)) return;

          const settledTarget = findTourTarget(action) || initialTarget;
          if (!settledTarget || !settledTarget.isConnected || !isVisibleElement(settledTarget)) {
            clearActiveSpotlight();
            return;
          }

          const attached = spotlightTarget(settledTarget);
          if (attached) onSpotlightActive?.();
          else clearActiveSpotlight();
        }, spotlightAfterScrollDelay);
      }, mobileSettleDelay);
    }, delay + mobileSettleDelay);
  });

  scheduleSpotlightTimer(failSafely, Math.max(...delays) + spotlightAfterScrollDelay + 900);
}

function softNavigateToPage(
  action: SuggestedAction,
  onSpotlightActive?: () => void,
) {
  const control = findPageNavigationControl(action);
  if (!control) return false;

  rememberPendingSpotlight(action);
  control.click();
  runSpotlightWithRetries(action, undefined, onSpotlightActive);
  return true;
}

function runSuggestedNavigation(
  action?: SuggestedAction,
  currentThread?: ThreadItem[],
  onSpotlightActive?: () => void,
) {
  if (!action || action.type !== "navigate" || !action.targetId) return;

  const hasPageDestination = Boolean(action.pageUrl || action.pageId);

  // Navigate through the existing React page controls rather than hard-reloading.
  // This keeps the shell alive and lets the new page content render before spotlighting.
  if (hasPageDestination && softNavigateToPage(action, onSpotlightActive)) {
    if (currentThread?.length) {
      rememberShellSession("panel", currentThread);
    }
    return;
  }

  const target = findTourTarget(action);
  if (target && target.isConnected && isVisibleElement(target)) {
    const runId = beginSpotlightRun();
    const mobileSettleDelay = isCoarsePointer() ? 300 : 0;
    scheduleSpotlightTimer(() => {
      if (!isCurrentSpotlightRun(runId)) return;

      smoothScrollElementIntoView(scrollTargetForSpotlight(target));
      scheduleSpotlightTimer(
        () => {
          if (!isCurrentSpotlightRun(runId)) return;

          const settledTarget = findTourTarget(action) || target;
          if (!settledTarget || !settledTarget.isConnected || !isVisibleElement(settledTarget)) {
            clearActiveSpotlight();
            return;
          }

          const attached = spotlightTarget(settledTarget);
          if (attached) onSpotlightActive?.();
          else clearActiveSpotlight();
        },
        GUIDE_NAVIGATION_SCROLL_MS + (isCoarsePointer() ? 240 : 120),
      );
    }, mobileSettleDelay);
    return;
  }

  // No immediate target: use the same bounded retry path as page navigation.
  // The fail-safe clears all dimming if the target never appears.
  runSpotlightWithRetries(action, undefined, onSpotlightActive);
}
function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isCoarsePointer() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(pointer: coarse)").matches)
  );
}

function ThinkingText({ body }: { body: string }) {
  const tokens = body.match(/\S+|\s+/g) || [];
  let characterIndex = 0;

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {tokens.map((token, tokenIndex) => {
        if (/^\s+$/.test(token)) {
          characterIndex += token.length;
          return token.includes("\n") ? (
            <React.Fragment key={`space-${tokenIndex}`}>{token}</React.Fragment>
          ) : (
            <React.Fragment key={`space-${tokenIndex}`}> </React.Fragment>
          );
        }

        const startIndex = characterIndex;
        characterIndex += token.length;

        return (
          <span
            key={`${token}-${tokenIndex}`}
            className="inline-block whitespace-nowrap align-baseline"
          >
            {token.split("").map((char, index) => (
              <motion.span
                key={`${char}-${tokenIndex}-${index}`}
                className="inline-block"
                animate={{
                  y: [0, -1.5, 0, 1, 0],
                  opacity: [0.72, 1, 0.82, 1, 0.72],
                }}
                transition={{
                  duration: THINKING_WIGGLE_DURATION,
                  repeat: Infinity,
                  delay: (startIndex + index) * THINKING_WIGGLE_STAGGER,
                  ease: "easeInOut",
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

function FinalUserRow({
  body,
  status,
}: {
  body: string;
  status?: "thinking" | "done";
}) {
  const isThinking = status === "thinking";

  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MESSAGE_FADE_DURATION, ease: "easeOut" }}
      className="w-full bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 sm:px-4 sm:py-3"
    >
      {isThinking ? <ThinkingText body={body} /> : body}
    </motion.div>
  );
}

function MarkdownInline({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <span>{children}</span>,
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-950">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ children }) => <span>{children}</span>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function StructuredAnswer({
  parts,
  fallback,
}: {
  parts?: AnswerParts;
  fallback: string;
}) {
  const bullets = Array.isArray(parts?.bullets)
    ? (parts?.bullets.filter(Boolean) ?? [])
    : [];
  const hasStructuredContent = Boolean(
    parts?.intro || bullets.length || parts?.closing,
  );

  if (!hasStructuredContent) {
    return (
      <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-strong:font-semibold">
        <ReactMarkdown>{fallback}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm leading-6 text-slate-900">
      {parts?.intro && (
        <p className="m-0">
          <MarkdownInline>{parts.intro}</MarkdownInline>
        </p>
      )}

      {bullets.length > 0 && (
        <ul className="m-0 list-disc space-y-1 pl-5">
          {bullets.map((item, index) => (
            <li key={`${item}-${index}`} className="pl-1">
              <MarkdownInline>{item}</MarkdownInline>
            </li>
          ))}
        </ul>
      )}

      {parts?.closing && (
        <p className="m-0 text-slate-700">
          <MarkdownInline>{parts.closing}</MarkdownInline>
        </p>
      )}
    </div>
  );
}

function BotRow({
  title,
  body,
  answerParts,
  refinementChips,
  onChipClick,
}: {
  title?: string;
  body: string;
  answerParts?: AnswerParts;
  refinementChips?: string[];
  onChipClick?: (chip: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MESSAGE_FADE_DURATION, ease: "easeOut" }}
      className="w-full bg-slate-100 px-3 py-2.5 text-sm leading-6 text-slate-900 sm:px-4 sm:py-3"
    >
      {title && (
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </div>
      )}
      <StructuredAnswer parts={answerParts} fallback={body} />
      {refinementChips?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {refinementChips.map((chip) => {
            const demoTarget = `chip-${chip
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")}`;

            return (
              <button
                key={chip}
                data-demo-target={demoTarget}
                type="button"
                onClick={() => onChipClick?.(chip)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {chip}
              </button>
            );
          })}
        </div>
      ) : null}
    </motion.div>
  );
}

type DraftRowProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  disabled?: boolean;
  hasFocus: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
};

function DraftRow({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  onFocus,
  onBlur,
  disabled,
  hasFocus,
  textareaRef,
  placeholder = "Ask a question or describe what you want to explore...",
}: DraftRowProps) {
  const hasContent = value.trim().length > 0;

  return (
    <motion.div
      layout
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full bg-white"
    >
      <div className="flex items-end gap-2 border border-slate-200 bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <textarea
          data-demo-target="guide-textarea"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={
            "block w-full resize-none bg-transparent text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 " +
            (disabled ? "cursor-not-allowed opacity-70" : "")
          }
          style={{
            minHeight: `${isCoarsePointer() && hasFocus ? KEYBOARD_TEXTAREA_HEIGHT : MIN_TEXTAREA_HEIGHT}px`,
            boxShadow: hasFocus ? "inset 0 0 0 0 rgba(0,0,0,0)" : "none",
          }}
        />

        <button
          data-demo-target="guide-submit"
          type="button"
          onPointerDown={(event) => {
            // Mobile Safari can blur the textarea and reflow the fixed shell
            // before a normal click reaches this button. Submit on touch/pointer
            // down so the prompt is captured before the keyboard/layout shifts.
            if (event.pointerType === "mouse") return;
            if (disabled || !hasContent) return;
            event.preventDefault();
            onSubmit();
          }}
          onClick={onSubmit}
          disabled={disabled || !hasContent}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function GuideShellStatic({
  demoCommand,
  guideConfig,
  suppressWelcomeCard = false,
}: {
  demoCommand?: GuideShellDemoCommand | null;
  guideConfig?: GuideConfig;
  suppressWelcomeCard?: boolean;
} = {}) {
  const restoredShellRef = useRef(readShellSession());
  const [shellState, setShellState] = useState<ShellState>(
    restoredShellRef.current?.shellState || "welcome",
  );
  const [thread, setThread] = useState<ThreadItem[]>(
    restoredShellRef.current?.thread || [],
  );
  const threadStateRef = useRef<ThreadItem[]>(
    restoredShellRef.current?.thread || [],
  );
  const [draftValue, setDraftValue] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [draftFocus, setDraftFocus] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    Boolean(restoredShellRef.current),
  );
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [guideSteps, setGuideSteps] = useState<GuidedAction[]>([]);
  const [currentGuideStepIndex, setCurrentGuideStepIndex] = useState(0);
  const [activeStayPlan, setActiveStayPlan] = useState<StayPlan | null>(null);
  const [savedTripContext, setSavedTripContext] = useState<SavedTripContext>({
    room: null,
    packages: [],
    extras: [],
  });
  const [currentGuideMessageId, setCurrentGuideMessageId] = useState<
    string | null
  >(null);
  const [activeCompletionWidget, setActiveCompletionWidget] =
    useState<CompletionWidget>(null);
  const [shellCheckInDate, setShellCheckInDate] = useState("2026-06-12");
  const [shellCheckOutDate, setShellCheckOutDate] = useState("2026-06-15");
  const [shellDatesApplied, setShellDatesApplied] = useState(false);
  const [activeDatePicker, setActiveDatePicker] =
    useState<DatePickerKind>(null);
  const [shellCalendarMonth, setShellCalendarMonth] = useState(() => ({
    year: 2026,
    monthIndex: 6,
  }));
  const [shellAdults, setShellAdults] = useState(1);
  const [shellChildren, setShellChildren] = useState(0);
  const [shellGuestsApplied, setShellGuestsApplied] = useState(false);
  const [shellBudgetBand, setShellBudgetBand] = useState<BudgetBand | "">("");
  const [shellBreakfastRequested, setShellBreakfastRequested] = useState(false);
  const [lastRefinementChipClicked, setLastRefinementChipClicked] = useState<
    string | null
  >(null);
  const [bookingPreloadConfirmed, setBookingPreloadConfirmed] = useState(false);

  const minimizeTimerRef = useRef<number | null>(null);
  const greetingTimerRef = useRef<number | null>(null);
  const replyTimerRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const suppressNextDraftScrollRef = useRef(false);
  const pendingRevealDistanceRef = useRef(0);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const forceBottomOnNextPanelPaintRef = useRef(
    Boolean(restoredShellRef.current?.thread?.length),
  );
  const reopenGlideTimerRefs = useRef<number[]>([]);
  const demoTypingDraftUpdateRef = useRef(false);
  const forceWelcomeVisibleRef = useRef(false);
  const autoMinimizeDisabledRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const pendingRoomSaveRef = useRef<SavedCommerceItem | null>(null);
  const pendingRoomSaveSubmitIdRef = useRef<string | null>(null);
  const confirmedBookingContextKeyRef = useRef("");
  const visibleContextRef = useRef<VisibleContext>({
    bookingContext: {},
    selectedRoomId: null,
    suggestedPackageId: null,
    savedItems: [],
    pendingSave: null,
    lastPlannerIntent: null,
  });
  const modeCopy = guideModeCopy(guideConfig);
  const [visualViewportHeight, setVisualViewportHeight] = useState(() => {
    if (typeof window === "undefined") return 760;
    return Math.round(
      window.visualViewport?.height || window.innerHeight || 760,
    );
  });
  const [visualViewportOffsetTop, setVisualViewportOffsetTop] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Math.round(window.visualViewport?.offsetTop || 0);
  });
  const [keyboardCompressed, setKeyboardCompressed] = useState(false);

  const coarsePointer = isCoarsePointer();
  const constrainedViewportHeight = Math.max(300, visualViewportHeight);
  const floatingCardMaxHeight = `${Math.max(280, constrainedViewportHeight - 32)}px`;
  const keyboardPanelMaxHeight = Math.max(240, constrainedViewportHeight - 20);
  const mobilePanelMaxHeight = Math.max(
    360,
    Math.min(560, constrainedViewportHeight - 128),
  );
  const panelHeight = keyboardCompressed
    ? `min(300px, ${keyboardPanelMaxHeight}px)`
    : coarsePointer
      ? `${mobilePanelMaxHeight}px`
      : `min(760px, ${Math.max(360, constrainedViewportHeight - 32)}px)`;
  const panelToastStyle = keyboardCompressed
    ? {
        position: "fixed" as const,
        left: "12px",
        right: "12px",
        top: `${Math.max(8, visualViewportOffsetTop + 8)}px`,
        bottom: "auto",
        width: "auto",
        zIndex: 9999,
      }
    : coarsePointer
      ? {
          position: "fixed" as const,
          left: "12px",
          right: "12px",
          bottom: "16px",
          width: "auto",
          zIndex: 9999,
        }
      : {
          ...toastPosition,
          width: "min(calc(100vw - 32px), 480px)",
        };

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const animateThreadReveal = () => {
    const el = laneRef.current;
    if (!el) return;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    const end = Math.max(0, el.scrollHeight - el.clientHeight);
    const requestedDistance = pendingRevealDistanceRef.current;
    pendingRevealDistanceRef.current = 0;

    if (requestedDistance > 0) {
      const forcedDistance = Math.min(
        requestedDistance,
        Math.max(end, requestedDistance),
      );
      el.scrollTop = Math.max(0, end - forcedDistance);
    }

    const start = el.scrollTop;
    const distance = end - start;

    if (Math.abs(distance) < 1) {
      el.scrollTop = end;
      return;
    }

    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / THREAD_REVEAL_SCROLL_MS, 1);
      el.scrollTop = start + distance * easeOutCubic(progress);

      if (progress < 1) {
        scrollFrameRef.current = window.requestAnimationFrame(step);
      } else {
        el.scrollTop = end;
        scrollFrameRef.current = null;
      }
    };

    scrollFrameRef.current = window.requestAnimationFrame(step);
  };

  const clearMinimizeTimer = () => {
    if (minimizeTimerRef.current !== null) {
      window.clearTimeout(minimizeTimerRef.current);
      minimizeTimerRef.current = null;
    }
  };

  const clearGreetingTimer = () => {
    if (greetingTimerRef.current !== null) {
      window.clearTimeout(greetingTimerRef.current);
      greetingTimerRef.current = null;
    }
  };

  const clearReplyTimer = () => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  };

  const clearReopenGlideTimers = () => {
    reopenGlideTimerRefs.current.forEach((timer) => window.clearTimeout(timer));
    reopenGlideTimerRefs.current = [];
  };

  const startMinimizeTimer = () => {
    clearMinimizeTimer();

    // Hover-based auto-minimize is desktop behavior. On phones, touch/keyboard
    // focus can accidentally produce leave/blur events and collapse the shell
    // before the submit click is delivered.
    // Desktop timeout should only be suspended while the user has unsent text
    // in the composer or while a backend response/preloader is in flight.
    // Do not keep the panel open merely because commerce chips, saved-trip
    // tools, booking widgets, or pending-save state are visible.
    if (
      isCoarsePointer() ||
      isBotTyping ||
      submitInFlightRef.current ||
      autoMinimizeDisabledRef.current ||
      draftValue.trim().length > 0
    ) {
      return;
    }

    minimizeTimerRef.current = window.setTimeout(() => {
      if (!isBotTyping && !autoMinimizeDisabledRef.current) {
        setShellState("launcher");
      }
    }, 1800);
  };

  const scrollThreadToBottom = (behavior: ScrollBehavior = "auto") => {
    const lane = laneRef.current;
    if (!lane) return;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    const bottom = Math.max(0, lane.scrollHeight - lane.clientHeight);

    if (behavior === "smooth") {
      lane.scrollTo({ top: bottom, behavior: "smooth" });
      return;
    }

    lane.scrollTop = bottom;
  };
  void scrollThreadToBottom;

  const glideThreadToBottom = (fromRevealOffset = false) => {
    const lane = laneRef.current;
    if (!lane) return;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    const end = Math.max(0, lane.scrollHeight - lane.clientHeight);

    if (fromRevealOffset && end > 0) {
      // Reopen should feel like the greeting/new-message reveal: start slightly
      // above the latest content, then glide down instead of snapping.
      lane.scrollTop = Math.max(0, end - REOPEN_GLIDE_START_OFFSET_PX);
    }

    const start = lane.scrollTop;
    const distance = end - start;

    if (Math.abs(distance) < 1) {
      lane.scrollTop = end;
      return;
    }

    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / THREAD_REVEAL_SCROLL_MS, 1);
      lane.scrollTop = start + distance * easeOutCubic(progress);

      if (progress < 1) {
        scrollFrameRef.current = window.requestAnimationFrame(step);
      } else {
        lane.scrollTop = end;
        scrollFrameRef.current = null;
      }
    };

    scrollFrameRef.current = window.requestAnimationFrame(step);
  };

  const scheduleReopenGlide = () => {
    clearReopenGlideTimers();

    const run = (fromRevealOffset = false) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() =>
          glideThreadToBottom(fromRevealOffset),
        );
      });
    };

    // First pass creates the visible glide. Later passes catch markdown/framer/textarea
    // layout changes and finish at the true bottom without a visible jump.
    run(true);
    reopenGlideTimerRefs.current = REOPEN_GLIDE_SETTLE_DELAYS_MS.map((delay) =>
      window.setTimeout(() => run(false), delay),
    );
  };

  const openPanel = () => {
    clearMinimizeTimer();
    autoMinimizeDisabledRef.current = false;
    forceWelcomeVisibleRef.current = false;
    forceBottomOnNextPanelPaintRef.current = true;
    setShellState("panel");
    // Covers launcher -> panel reopen when the thread array does not change.
    // The layout effect below covers restored sessions and first panel mount.
    scheduleReopenGlide();
  };

  const collapsePanelAfterMobileResponse = (completedThread?: ThreadItem[]) => {
    if (!isCoarsePointer()) return;

    const threadToKeep = completedThread?.length
      ? completedThread
      : threadStateRef.current;

    if (threadToKeep.length > 0) {
      threadStateRef.current = threadToKeep;
      rememberShellSession("launcher", threadToKeep);
    }

    textareaRef.current?.blur();
    setDraftFocus(false);
    setKeyboardCompressed(false);
    clearMinimizeTimer();
    forceWelcomeVisibleRef.current = false;
    autoMinimizeDisabledRef.current = false;

    // Mobile-only: collapse after the response has been committed and after
    // navigation has had a moment to start. Reopening the launcher restores
    // the completed thread instead of starting from the greeting again.
    window.setTimeout(() => {
      if (threadToKeep.length > 0) {
        rememberShellSession("launcher", threadToKeep);
      }
      setShellState("launcher");
    }, 650);
  };

  const collapsePanelForMobileAction = (
    threadToKeep: ThreadItem[] = threadStateRef.current,
  ) => {
    if (!isCoarsePointer()) return;

    if (threadToKeep.length > 0) {
      threadStateRef.current = threadToKeep;
      rememberShellSession("launcher", threadToKeep);
    }

    textareaRef.current?.blur();
    setDraftFocus(false);
    setKeyboardCompressed(false);
    clearMinimizeTimer();
    forceWelcomeVisibleRef.current = false;
    autoMinimizeDisabledRef.current = false;
    setShellState("launcher");
  };

  const resetShellToWelcome = () => {
    textareaRef.current?.blur();
    setKeyboardCompressed(false);
    clearMinimizeTimer();
    clearGreetingTimer();
    clearReplyTimer();
    clearReopenGlideTimers();
    clearActiveSpotlight();
    clearShellSession();

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }

    try {
      window.sessionStorage.removeItem(GUIDE_PENDING_SPOTLIGHT_KEY);
    } catch {
      // Ignore storage failures in private/incognito contexts.
    }

    restoredShellRef.current = null;
    forceWelcomeVisibleRef.current = true;
    autoMinimizeDisabledRef.current = true;
    pendingRevealDistanceRef.current = 0;
    forceBottomOnNextPanelPaintRef.current = false;
    suppressNextDraftScrollRef.current = false;
    demoTypingDraftUpdateRef.current = false;
    pendingRoomSaveRef.current = null;
    pendingRoomSaveSubmitIdRef.current = null;
    confirmedBookingContextKeyRef.current = "";
    visibleContextRef.current = {
      bookingContext: {},
      selectedRoomId: null,
      suggestedPackageId: null,
      savedItems: [],
      pendingSave: null,
      lastPlannerIntent: null,
    };

    setIsBotTyping(false);
    setDraftFocus(false);
    setDraftValue("");
    setThread([]);
    setSpotlightActive(false);
    setGuideSteps([]);
    setCurrentGuideStepIndex(0);
    setActiveStayPlan(null);
    setSavedTripContext({ room: null, packages: [], extras: [] });
    setCurrentGuideMessageId(null);
    setActiveCompletionWidget(null);
    setActiveDatePicker(null);
    setShellCalendarMonth({ year: 2026, monthIndex: 6 });
    setLastRefinementChipClicked(null);
    setBookingPreloadConfirmed(false);
    setShowWelcome(true);
    setShellState("welcome");
  };

  useEffect(() => {
    const updateViewportState = () => {
      const viewportHeight = Math.round(
        window.visualViewport?.height || window.innerHeight || 760,
      );
      const viewportOffsetTop = Math.round(
        window.visualViewport?.offsetTop || 0,
      );
      setVisualViewportHeight(viewportHeight);
      setVisualViewportOffsetTop(viewportOffsetTop);

      const layoutHeight = window.innerHeight || viewportHeight;
      const textareaActive = document.activeElement === textareaRef.current;
      setKeyboardCompressed(
        Boolean(
          isCoarsePointer() &&
          textareaActive &&
          (viewportHeight < layoutHeight - 80 || viewportHeight < 620),
        ),
      );
    };

    updateViewportState();

    window.visualViewport?.addEventListener("resize", updateViewportState);
    window.visualViewport?.addEventListener("scroll", updateViewportState);
    window.addEventListener("resize", updateViewportState);
    window.addEventListener("focusin", updateViewportState);
    window.addEventListener("focusout", updateViewportState);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportState);
      window.visualViewport?.removeEventListener("scroll", updateViewportState);
      window.removeEventListener("resize", updateViewportState);
      window.removeEventListener("focusin", updateViewportState);
      window.removeEventListener("focusout", updateViewportState);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearMinimizeTimer();
      clearGreetingTimer();
      clearReplyTimer();
      clearReopenGlideTimers();
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      clearActiveSpotlight();
    };
  }, []);

  useEffect(() => {
    if (shellState !== "panel") {
      clearMinimizeTimer();
    }
  }, [shellState]);

  useEffect(() => {
    if (restoredShellRef.current || shellState !== "welcome") {
      setShowWelcome(true);
      return;
    }

    if (forceWelcomeVisibleRef.current) {
      forceWelcomeVisibleRef.current = false;
      setShowWelcome(true);
      return;
    }

    setShowWelcome(false);
    const timer = window.setTimeout(() => {
      setShowWelcome(true);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [shellState]);

  useEffect(() => {
    const pendingAction = readPendingSpotlight();
    if (!pendingAction) return;
    runSpotlightWithRetries(pendingAction, undefined, () =>
      setSpotlightActive(true),
    );
  }, []);

  useEffect(() => {
    const handleExternalSpotlight = (event: Event) => {
      const detail =
        (
          event as CustomEvent<{
            targetId?: string;
            selector?: string;
            targetText?: string;
            pageId?: string;
            pageUrl?: string;
          }>
        ).detail || {};

      const targetId = (detail.targetId || "").trim();
      const selector = (detail.selector || "").trim();
      if (!targetId && !selector) return;

      const runId = beginSpotlightRun();
      setSpotlightActive(false);

      let found = false;
      const mobileSettleDelay = isCoarsePointer() ? 380 : 0;
      [80, 220, 420, 700, 1100, 1500].forEach((delay) => {
        scheduleSpotlightTimer(() => {
          if (!isCurrentSpotlightRun(runId) || found) return;

          const target = findExactExternalSpotlightTarget(targetId, selector);
          if (!target) return;

          found = true;
          scheduleSpotlightTimer(() => {
            if (!isCurrentSpotlightRun(runId)) return;

            smoothScrollElementIntoView(scrollTargetForSpotlight(target));
            scheduleSpotlightTimer(() => {
              if (!isCurrentSpotlightRun(runId)) return;

              spotlightTarget(target);
              setSpotlightActive(true);
            }, GUIDE_NAVIGATION_SCROLL_MS + (isCoarsePointer() ? 260 : 120));
          }, mobileSettleDelay);
        }, delay + mobileSettleDelay);
      });
    };

    window.addEventListener(
      GUIDE_EXTERNAL_SPOTLIGHT_EVENT,
      handleExternalSpotlight as EventListener,
    );

    return () =>
      window.removeEventListener(
        GUIDE_EXTERNAL_SPOTLIGHT_EVENT,
        handleExternalSpotlight as EventListener,
      );
  }, []);

  useEffect(() => {
    threadStateRef.current = thread;
    rememberShellSession(shellState, thread);
  }, [shellState, thread]);

  useEffect(() => {
    clearGreetingTimer();
    clearReplyTimer();
    setIsBotTyping(false);
    setDraftValue("");

    if (restoredShellRef.current) {
      if (shellState === "panel" && threadStateRef.current.length > 0) {
        forceBottomOnNextPanelPaintRef.current = true;
      }
      restoredShellRef.current = null;
      return;
    }

    if (shellState === "welcome") {
      clearActiveSpotlight();
      setSpotlightActive(false);
      setGuideSteps([]);
      setCurrentGuideStepIndex(0);
      clearShellSession();
      setThread([]);
      return;
    }

    if (shellState === "panel" && threadStateRef.current.length === 0) {
      greetingTimerRef.current = window.setTimeout(() => {
        pendingRevealDistanceRef.current = MIN_REVEAL_DISTANCE_PX;
        setThread([
          {
            id: makeId(),
            role: "bot",
            title: "Guide online",
            body: modeCopy.greeting,
          },
        ]);
      }, 450);
    }
  }, [shellState]);

  useLayoutEffect(() => {
    requestAnimationFrame(animateThreadReveal);
  }, [thread]);

  useLayoutEffect(() => {
    if (shellState !== "panel" || thread.length === 0) return;
    if (!forceBottomOnNextPanelPaintRef.current) return;

    forceBottomOnNextPanelPaintRef.current = false;
    scheduleReopenGlide();

    return clearReopenGlideTimers;
  }, [shellState, thread.length]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "0px";
    const nextHeight = Math.max(
      MIN_TEXTAREA_HEIGHT,
      Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT),
    );
    el.style.height = `${nextHeight}px`;
    el.style.overflowY =
      el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";

    if (demoTypingDraftUpdateRef.current) {
      demoTypingDraftUpdateRef.current = false;
      suppressNextDraftScrollRef.current = false;
      return;
    }

    if (suppressNextDraftScrollRef.current) {
      suppressNextDraftScrollRef.current = false;
      return;
    }

    if (forceBottomOnNextPanelPaintRef.current) return;

    const lane = laneRef.current;
    if (lane) {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      requestAnimationFrame(() => {
        lane.scrollTop = Math.max(0, lane.scrollHeight - lane.clientHeight);
      });
    }
  }, [draftValue]);

  const buildConversationContext = (
    currentMessage: string,
  ): GuideConversationContext => {
    const trimmedSteps = guideSteps.slice(0, MAX_GUIDED_STEPS).map((step) => ({
      type: step.type,
      targetId: step.targetId,
      pageId: step.pageId,
      pageUrl: step.pageUrl,
      targetText: step.targetText,
      reason: step.reason,
    }));

    // Single-turn contract: the backend gets the latest prompt plus the
    // current visible UI state. It should not receive prior chat text that can
    // poison a fresh catalog search like "packages with coffee" after a
    // previous parking query.
    return {
      singleTurn: true,
      lastUserMessage: currentMessage || undefined,
      currentGuideStepIndex,
      currentGuideSteps: trimmedSteps,
      currentGuideStep: trimmedSteps[currentGuideStepIndex] || null,
      lastRefinementChipClicked,
      commerceContext: buildCommerceContext(),
      activeStayPlan,
    };
  };

  const normalizeBudgetBand = (value?: string | null): BudgetBand | "" => {
    const normalized = (value || "").trim().toLowerCase();
    const match = BUDGET_BANDS.find(
      (band) => band.toLowerCase() === normalized,
    );
    return match || "";
  };

  const mergeExtractedBookingContext = (
    context?: ExtractedBookingContext | null,
  ) => {
    if (!context || guideConfig?.mode !== "commerce") return;

    const nextCheckIn =
      typeof context.checkInDate === "string" ? context.checkInDate : "";
    const nextCheckOut =
      typeof context.checkOutDate === "string" ? context.checkOutDate : "";
    if (nextCheckIn && nextCheckOut && nextCheckOut > nextCheckIn) {
      setShellCheckInDate(nextCheckIn);
      setShellCheckOutDate(nextCheckOut);
      setShellDatesApplied(true);
      setActiveCompletionWidget((current) =>
        current === "dates" ? null : current,
      );
    }

    const adults = typeof context.adults === "number" ? context.adults : null;
    const children =
      typeof context.children === "number" ? context.children : null;
    if (adults !== null || children !== null) {
      setShellAdults(Math.max(1, Math.min(8, Math.round(adults ?? 1))));
      setShellChildren(Math.max(0, Math.min(8, Math.round(children ?? 0))));
      setShellGuestsApplied(true);
      setActiveCompletionWidget((current) =>
        current === "guests" ? null : current,
      );
    }

    const budgetBand = normalizeBudgetBand(context.budgetBand || null);
    if (budgetBand) {
      setShellBudgetBand(budgetBand);
      setActiveCompletionWidget((current) =>
        current === "budget" ? null : current,
      );
    }

    if (context.breakfastRequested === true) {
      setShellBreakfastRequested(true);
    }
  };


  const bookingContextFromShell = (): ExtractedBookingContext => {
    const booking: ExtractedBookingContext = {};

    if (shellDatesApplied && shellCheckInDate && shellCheckOutDate) {
      booking.checkInDate = shellCheckInDate;
      booking.checkOutDate = shellCheckOutDate;
      const nights = savedTripNights();
      if (nights) booking.nights = nights;
    }

    if (shellGuestsApplied) {
      booking.adults = shellAdults;
      booking.children = shellChildren;
      booking.guests = shellAdults + shellChildren;
    }

    if (shellBudgetBand) booking.budgetBand = shellBudgetBand;
    if (shellBreakfastRequested) booking.breakfastRequested = true;

    return booking;
  };

  const buildVisibleContext = (): VisibleContext => {
    const previous = visibleContextRef.current || {};
    const bookingContext = {
      ...((previous.bookingContext as ExtractedBookingContext | undefined) || {}),
      ...bookingContextFromShell(),
    };
    const activeRoomId = activeStayPlan?.room?.targetId || null;
    const activePackageId = activeStayPlan?.packages?.find((pkg) => pkg?.targetId)?.targetId || null;

    return {
      ...previous,
      bookingContext,
      selectedRoomId: activeRoomId || previous.selectedRoomId || null,
      suggestedPackageId: activePackageId || previous.suggestedPackageId || null,
      activeStayPlan: activeStayPlan || previous.activeStayPlan || null,
      savedItems: Array.isArray(previous.savedItems) ? previous.savedItems : [],
      pendingSave: previous.pendingSave ?? null,
      lastPlannerIntent: previous.lastPlannerIntent ?? null,
    };
  };

  const roomFromStayPlan = (stayPlan?: StayPlan | null): SavedCommerceItem | null => {
    const room = stayPlan?.room;
    if (!room?.targetId) return null;
    return {
      id: room.targetId,
      type: "room",
      title: room.title || phraseFromId(room.targetId),
      targetId: room.targetId,
      pageId: null,
      priceUsd: room.nightlyRateUsd ?? null,
      priceUnit: room.nightlyRateUsd ? "per_night" : null,
      priceLabel: room.nightlyRateUsd ? `$${room.nightlyRateUsd}/night` : null,
    };
  };

  const savedTripFromStayPlan = (stayPlan?: StayPlan | null): SavedTripContext | null => {
    const room = roomFromStayPlan(stayPlan);
    if (!room) return null;
    return {
      room,
      packages: (stayPlan?.packages || [])
        .map(packageToSavedItem)
        .filter((item): item is SavedCommerceItem => Boolean(item)),
      extras: [],
    };
  };

  const mergeSavedTrip = (next: SavedTripContext) => {
    setSavedTripContext((current) => {
      const packages = [...current.packages];
      next.packages.forEach((pkg) => {
        if (!packages.some((entry) => entry.id === pkg.id)) packages.push(pkg);
      });

      const extras = [...current.extras];
      next.extras.forEach((extra) => {
        if (!extras.some((entry) => entry.id === extra.id)) extras.push(extra);
      });

      return {
        room: next.room || current.room,
        packages,
        extras,
      };
    });
  };

  const mergeBackendVisibleContext = (context?: VisibleContext | null) => {
    if (!context || guideConfig?.mode !== "commerce") return;

    visibleContextRef.current = {
      ...visibleContextRef.current,
      ...context,
      bookingContext: {
        ...((visibleContextRef.current.bookingContext as ExtractedBookingContext | undefined) || {}),
        ...((context.bookingContext as ExtractedBookingContext | undefined) || {}),
      },
    };

    if (context.bookingContext && typeof context.bookingContext === "object") {
      mergeExtractedBookingContext(context.bookingContext as ExtractedBookingContext);
    }

    if (isStayPlan(context.activeStayPlan)) {
      setActiveStayPlan(context.activeStayPlan);
    }

    const savedItems = Array.isArray(context.savedItems) ? context.savedItems : [];
    const latestSavedStay = [...savedItems]
      .reverse()
      .find((item): item is StayPlan => isStayPlan(item));
    const savedTrip = savedTripFromStayPlan(latestSavedStay);
    if (savedTrip) mergeSavedTrip(savedTrip);
  };

  const filterSatisfiedRefinementChips = (
    chips?: string[],
    extracted?: ExtractedBookingContext | null,
    sentContext?: GuideConversationContext,
  ) => {
    if (!Array.isArray(chips) || guideConfig?.mode !== "commerce") {
      return chips || [];
    }

    const commerceContext = sentContext?.commerceContext;
    const datesSatisfied = Boolean(
      shellDatesApplied ||
        commerceContext?.dates ||
        (extracted?.checkInDate && extracted?.checkOutDate),
    );
    const guestsSatisfied = Boolean(
      shellGuestsApplied || commerceContext?.guests || extracted?.adults,
    );
    const budgetSatisfied = Boolean(
      shellBudgetBand || commerceContext?.budget || extracted?.budgetBand,
    );
    const breakfastSatisfied = Boolean(
      shellBreakfastRequested ||
        commerceContext?.breakfast?.requested ||
        extracted?.breakfastRequested === true,
    );

    return chips.filter((chip) => {
      const lower = chip.trim().toLowerCase();
      if (datesSatisfied && lower === "select dates") return false;
      if (guestsSatisfied && lower === "add guests") return false;
      if (budgetSatisfied && lower === "set budget") return false;
      if (
        breakfastSatisfied &&
        (lower === "add breakfast" || lower === "show breakfast packages")
      ) {
        return false;
      }
      return true;
    });
  };

  const bookingContextKeyFromParts = (
    dates?: { checkIn?: string | null; checkOut?: string | null } | null,
    guests?: { adults?: number | null; children?: number | null } | null,
  ) => {
    const checkIn = dates?.checkIn || "";
    const checkOut = dates?.checkOut || "";
    const adults = guests?.adults ?? null;
    const children = guests?.children ?? 0;
    if (!checkIn || !checkOut || adults === null) return "";
    return `${checkIn}|${checkOut}|${adults}|${children}`;
  };

  const currentBookingContextKey = () =>
    bookingContextKeyFromParts(
      shellDatesApplied
        ? { checkIn: shellCheckInDate, checkOut: shellCheckOutDate }
        : null,
      shellGuestsApplied
        ? { adults: shellAdults, children: shellChildren }
        : null,
    );

  const bookingContextKeyFromSubmittedContext = (
    sentContext?: GuideConversationContext,
    extracted?: ExtractedBookingContext,
  ) => {
    const sentDates = sentContext?.commerceContext?.dates;
    const sentGuests = sentContext?.commerceContext?.guests;

    return bookingContextKeyFromParts(
      sentDates
        ? { checkIn: sentDates.checkIn, checkOut: sentDates.checkOut }
        : extracted?.checkInDate && extracted?.checkOutDate
          ? { checkIn: extracted.checkInDate, checkOut: extracted.checkOutDate }
          : null,
      sentGuests
        ? { adults: sentGuests.adults, children: sentGuests.children }
        : extracted?.adults !== undefined && extracted?.adults !== null
          ? { adults: extracted.adults, children: extracted.children ?? 0 }
          : null,
    );
  };

  const markBookingContextConfirmed = (
    sentContext?: GuideConversationContext,
    extracted?: ExtractedBookingContext,
  ) => {
    const key = bookingContextKeyFromSubmittedContext(sentContext, extracted);
    if (key) {
      confirmedBookingContextKeyRef.current = key;
    }
  };

  const isCurrentBookingContextConfirmed = () => {
    const key = currentBookingContextKey();
    return Boolean(key && confirmedBookingContextKeyRef.current === key);
  };

  const savedRoomConfirmationParts = (room: SavedCommerceItem): AnswerParts => ({
    intro: `✅ Your selection is now saved: **${room.title}**.`,
    bullets: [
      `Dates: ${formatShellDateRange(shellCheckInDate, shellCheckOutDate)}`,
      `Guests: ${guestSummary(shellAdults, shellChildren)}`,
    ],
    closing:
      "You can search for additional purchases or select Book to checkout.",
  });

  const completePendingRoomSaveFromContextUpdate = (
    submittedId: string,
    extracted?: ExtractedBookingContext,
  ): SavedCommerceItem | null => {
    const pendingRoom = pendingRoomSaveRef.current;
    if (!pendingRoom) return null;

    // Only auto-save for the exact backend response generated by the pending
    // save completion submit. This prevents stale pending saves from firing
    // after timeout/reopen or unrelated context updates.
    if (pendingRoomSaveSubmitIdRef.current !== submittedId) return null;

    const confirmedKey = bookingContextKeyFromSubmittedContext(
      buildConversationContext(""),
      extracted,
    );
    if (!confirmedKey || confirmedBookingContextKeyRef.current !== confirmedKey) {
      return null;
    }

    const bundledPackages = stayPlanPackagesForCurrentSelection();
    setSavedTripContext((current) => {
      const packages = [...current.packages];
      bundledPackages.forEach((pkg) => {
        if (!packages.some((entry) => entry.id === pkg.id)) packages.push(pkg);
      });
      return {
        ...current,
        room: pendingRoom,
        packages,
      };
    });
    pendingRoomSaveRef.current = null;
    pendingRoomSaveSubmitIdRef.current = null;
    setActiveCompletionWidget("saved-trip");
    return pendingRoom;
  };

  const submitDraft = async () => {
    if (submitInFlightRef.current) return;

    const rawDraft = draftValue || textareaRef.current?.value || "";
    const trimmed = rawDraft.trim();
    if (!trimmed || isBotTyping) return;

    submitInFlightRef.current = true;

    // On phones, leaving the textarea focused keeps the soft keyboard open,
    // shrinking the viewport and hiding the page navigation/spotlight behind the shell.
    textareaRef.current?.blur();
    setDraftFocus(false);
    window.setTimeout(() => setKeyboardCompressed(false), 80);

    const conversationContext = buildConversationContext(trimmed);
    const orderMutation = commerceOrderMutationFromMessage(
      trimmed,
      Boolean(conversationContext.activeStayPlan),
    );
    const previousGuideSteps = guideSteps;
    const previousGuideStepIndex = currentGuideStepIndex;
    const previousGuideMessageId = currentGuideMessageId;
    const preserveGuideActionsDuringSubmit =
      previousGuideSteps.length > 0 && isCommerceContextUpdateDraft(trimmed);

    clearReplyTimer();
    clearMinimizeTimer();
    clearActiveSpotlight();
    setSpotlightActive(false);
    if (!preserveGuideActionsDuringSubmit) {
      setGuideSteps([]);
      setCurrentGuideStepIndex(0);
      setCurrentGuideMessageId(null);
    }
    if (orderMutation === "start") {
      setActiveStayPlan(null);
    }

    suppressNextDraftScrollRef.current = true;

    const submittedId = makeId();
    const isPendingRoomSaveContextSubmit = Boolean(
      pendingRoomSaveRef.current && isCommerceContextUpdateDraft(trimmed),
    );
    pendingRoomSaveSubmitIdRef.current = isPendingRoomSaveContextSubmit
      ? submittedId
      : pendingRoomSaveSubmitIdRef.current;

    pendingRevealDistanceRef.current = MIN_REVEAL_DISTANCE_PX;
    const thinkingThread: ThreadItem[] = [
      ...threadStateRef.current,
      {
        id: submittedId,
        role: "user",
        body: trimmed,
        status: "thinking",
      },
    ];
    threadStateRef.current = thinkingThread;
    setThread(thinkingThread);
    rememberShellSession("panel", thinkingThread);

    setDraftValue("");
    setIsBotTyping(true);

    const startedAt = performance.now();

    try {
      const sentVisibleContext = buildVisibleContext();
      const reply = await callGuideAi(
        trimmed,
        guideConfig,
        conversationContext,
        sentVisibleContext,
      );
      mergeExtractedBookingContext(reply.extractedBookingContext);
      mergeBackendVisibleContext(reply.visibleContext);
      const isBookingContextUpdateResponse =
        reply.commerceAction === "booking_context_update";
      const shouldTreatAsContextUpdate = Boolean(
        guideConfig?.mode === "commerce" &&
          (isBookingContextUpdateResponse ||
            (isPendingRoomSaveContextSubmit &&
              isCommerceContextUpdateDraft(trimmed))),
      );
      if (shouldTreatAsContextUpdate) {
        markBookingContextConfirmed(conversationContext, reply.extractedBookingContext);
      }
      const autoSavedPendingRoom = isBookingContextUpdateResponse
        ? completePendingRoomSaveFromContextUpdate(
            submittedId,
            reply.extractedBookingContext,
          )
        : null;
      const remaining = Math.max(
        0,
        MIN_THINKING_MS - (performance.now() - startedAt),
      );
      if (remaining > 0) {
        await wait(remaining);
      }

      const visibleStayPlan = isStayPlan(reply.visibleContext?.activeStayPlan)
        ? reply.visibleContext?.activeStayPlan
        : null;
      const replyStayPlan =
        reply.stayPlan ||
        visibleStayPlan ||
        reply.stepNarratives
          ?.map((step) => step?.stayPlan)
          .find((plan): plan is StayPlan => isStayPlan(plan)) ||
        null;
      const normalizedGuideSteps = shouldTreatAsContextUpdate
        ? []
        : normalizeGuideSteps(reply).map((step) => {
        if (!replyStayPlan) return step;
        return {
          ...step,
          stayPlan: step.stayPlan || replyStayPlan,
          stepNarrative: step.stepNarrative
            ? {
                ...step.stepNarrative,
                stayPlan: step.stepNarrative.stayPlan || replyStayPlan,
              }
            : step.stepNarrative,
        };
      });
      const preservePreviousGuideSteps =
        shouldTreatAsContextUpdate && previousGuideSteps.length > 0;
      const nextGuideSteps = preservePreviousGuideSteps
        ? previousGuideSteps
        : normalizedGuideSteps;
      const nextGuideStepIndex = preservePreviousGuideSteps
        ? Math.min(previousGuideStepIndex, Math.max(0, nextGuideSteps.length - 1))
        : 0;
      const nextGuideMessageId = preservePreviousGuideSteps
        ? previousGuideMessageId
        : null;
      const isMultiStepGuide =
        !shouldTreatAsContextUpdate &&
        !preservePreviousGuideSteps &&
        nextGuideSteps.length > 1;
      const botMessageId = makeId();
      const responseAnswerParts = autoSavedPendingRoom
        ? savedRoomConfirmationParts(autoSavedPendingRoom)
        : reply.answerParts;
      const firstStepParts = isMultiStepGuide
        ? answerPartsForGuideStep(nextGuideSteps[0], 0, nextGuideSteps.length)
        : responseAnswerParts;
      const botBody = isMultiStepGuide
        ? answerBodyFromParts(firstStepParts || {}) || reply.body
        : autoSavedPendingRoom
          ? answerBodyFromParts(responseAnswerParts || {}) || reply.body
          : reply.body;

      pendingRevealDistanceRef.current = MIN_REVEAL_DISTANCE_PX;
      const completedThread: ThreadItem[] = [
        ...threadStateRef.current.map((item) =>
          item.id === submittedId ? { ...item, status: "done" as const } : item,
        ),
        {
          id: botMessageId,
          role: "bot",
          title: reply.title,
          body: botBody,
          answerParts: firstStepParts,
          refinementChips: filterSatisfiedRefinementChips(
            reply.refinementChips,
            reply.extractedBookingContext,
            conversationContext,
          ),
          suggestedAction: reply.suggestedAction,
        },
      ];
      threadStateRef.current = completedThread;
      setThread(completedThread);
      rememberShellSession("panel", completedThread);

      setGuideSteps(nextGuideSteps);
      setCurrentGuideStepIndex(nextGuideStepIndex);
      setCurrentGuideMessageId(isMultiStepGuide ? botMessageId : nextGuideMessageId);
      if (replyStayPlan) {
        setActiveStayPlan(replyStayPlan);
      } else if (orderMutation === "start") {
        setActiveStayPlan(null);
      }
      setLastRefinementChipClicked(null);

      const hasNavigation =
        !shouldTreatAsContextUpdate &&
        (normalizedGuideSteps.length > 0 || reply.suggestedAction?.type === "navigate");

      window.setTimeout(() => {
        if (hasNavigation) {
          runSuggestedNavigation(
            nextGuideSteps[0] || reply.suggestedAction,
            completedThread,
            () => setSpotlightActive(true),
          );
          collapsePanelAfterMobileResponse(completedThread);
        }
      }, 350);

      emitDemoResponseComplete({
        ok: true,
        hasNavigation,
        stepCount: nextGuideSteps.length,
        isMultiStep: isMultiStepGuide,
        displayMode: reply.displayMode,
        hasStayPlan: Boolean(replyStayPlan),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown backend error";

      pendingRevealDistanceRef.current = MIN_REVEAL_DISTANCE_PX;
      const errorThread: ThreadItem[] = [
        ...threadStateRef.current.map((item) =>
          item.id === submittedId ? { ...item, status: "done" as const } : item,
        ),
        {
          id: makeId(),
          role: "bot",
          title: "Guide connection issue",
          body: `I could not reach the AI backend. ${message}`,
        },
      ];
      threadStateRef.current = errorThread;
      setThread(errorThread);
      rememberShellSession("panel", errorThread);

      emitDemoResponseComplete({ ok: false, message });
    } finally {
      submitInFlightRef.current = false;
      setIsBotTyping(false);
      if (!isCoarsePointer()) {
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    }
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitDraft();
    }
  };

  const isCommerceContextUpdateDraft = (message: string) => {
    if (guideConfig?.mode !== "commerce") return false;
    const text = message.trim().toLowerCase();
    if (!text) return false;

    const hasContextSignal =
      /\bfor this stay\b/.test(text) ||
      /\b(check-?in|check-?out|dates?|guests?|adults?|children|kids)\b/.test(text);
    if (!hasContextSignal) return false;

    const hasBrowseOrSelectionSignal =
      /\b(show|find|recommend|suggest|compare|options?|available|availability|save|book|rooms?|suites?|villas?|packages?|bundles?|deals?|upgrades?)\b/.test(text);

    return !hasBrowseOrSelectionSignal;
  };

  const hasGuideSteps = guideSteps.length > 0;
  const hasMultipleGuideSteps = guideSteps.length > 1;
  const currentGuideStep = hasGuideSteps
    ? guideSteps[currentGuideStepIndex]
    : null;
  const latestBotRefinementChips = [...thread]
    .reverse()
    .find((item) => item.role === "bot" && (item.refinementChips?.length || 0) > 0)
    ?.refinementChips || [];
  const hasCommerceRefinementChips = Boolean(
    guideConfig?.mode === "commerce" && latestBotRefinementChips.length > 0,
  );
  const hasSavedTripItems = Boolean(
    savedTripContext.room ||
      savedTripContext.packages.length > 0 ||
      savedTripContext.extras.length > 0,
  );
  // Hard rule: commerce action tools stay visible for answer-only commerce
  // turns when the user still has visible trip state or refinement actions.
  // This prevents informational follow-ups like "what amenities do you offer?"
  // from collapsing the action strip after a room/package has been saved.
  const keepCommerceActionStripOpen = Boolean(
    guideConfig?.mode === "commerce" &&
      !hasGuideSteps &&
      (hasCommerceRefinementChips || hasSavedTripItems || activeStayPlan),
  );
  const showGuideActionStrip = Boolean(
    spotlightActive || hasGuideSteps || keepCommerceActionStripOpen,
  );
  const hasBookableSavedTrip = Boolean(savedTripContext.room?.targetId);
  const hasBookableActiveStayPlan = Boolean(activeStayPlan?.room?.targetId);
  const showBookAction = Boolean(
    guideConfig?.mode === "commerce" &&
      guideConfig?.features?.bookingActions &&
      (guideSteps.some((step) => step?.targetId?.startsWith("room-")) ||
        hasBookableActiveStayPlan ||
        hasBookableSavedTrip),
  );

  const navigateToGuideStep = (nextIndex: number, collapseOnMobile = false) => {
    if (!guideSteps.length) return;

    const boundedIndex = Math.max(
      0,
      Math.min(nextIndex, guideSteps.length - 1),
    );
    const step = guideSteps[boundedIndex];
    if (!step) return;

    clearActiveSpotlight();
    setSpotlightActive(false);
    setCurrentGuideStepIndex(boundedIndex);

    let nextThread = threadStateRef.current;

    if (currentGuideMessageId) {
      const parts = answerPartsForGuideStep(
        step,
        boundedIndex,
        guideSteps.length,
      );
      const body = answerBodyFromParts(parts);
      nextThread = threadStateRef.current.map((item) =>
        item.id === currentGuideMessageId
          ? { ...item, body, answerParts: parts, suggestedAction: step }
          : item,
      );
      threadStateRef.current = nextThread;
      setThread(nextThread);
      rememberShellSession(
        collapseOnMobile && isCoarsePointer() ? "launcher" : "panel",
        nextThread,
      );
    }

    if (collapseOnMobile) {
      collapsePanelForMobileAction(nextThread);
    }

    window.setTimeout(
      () => {
        runSuggestedNavigation(step, nextThread, () =>
          setSpotlightActive(true),
        );
      },
      collapseOnMobile && isCoarsePointer() ? 80 : 120,
    );
  };

  const acknowledgeSpotlight = () => {
    clearActiveSpotlight();
    setSpotlightActive(false);
    setGuideSteps([]);
    setCurrentGuideStepIndex(0);
    setActiveStayPlan(null);
    setCurrentGuideMessageId(null);
    setActiveCompletionWidget(null);
    setActiveDatePicker(null);

    try {
      window.sessionStorage.removeItem(GUIDE_PENDING_SPOTLIGHT_KEY);
    } catch {
      // Ignore storage failures in private/incognito contexts.
    }
  };

  const savedTripNights = () => {
    if (!shellDatesApplied || !shellCheckInDate || !shellCheckOutDate) return null;
    const checkIn = new Date(`${shellCheckInDate}T00:00:00`);
    const checkOut = new Date(`${shellCheckOutDate}T00:00:00`);
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Number.isFinite(nights) && nights > 0 ? nights : null;
  };

  const savedTripItemCount = () =>
    (savedTripContext.room ? 1 : 0) +
    savedTripContext.packages.length +
    savedTripContext.extras.length;

  const currentGuideStepToSavedItem = (): SavedCommerceItem | null => {
    if (!currentGuideStep?.targetId) return null;

    const targetId = currentGuideStep.targetId;
    const stayPlan = stayPlanFromGuidedStep(currentGuideStep) || activeStayPlan;
    const label = guideStepLabel(currentGuideStep);

    if (targetId.startsWith("room-")) {
      const room = stayPlan?.room?.targetId === targetId ? stayPlan.room : null;
      return {
        id: targetId,
        type: "room",
        title: room?.title || currentGuideStep.targetText || label,
        targetId,
        pageId: currentGuideStep.pageId || null,
        priceUsd: room?.nightlyRateUsd ?? null,
        priceUnit: room?.nightlyRateUsd ? "per_night" : null,
        priceLabel: room?.nightlyRateUsd ? `$${room.nightlyRateUsd}/night` : null,
      };
    }

    if (targetId.startsWith("package-")) {
      const pkg = stayPlan?.packages?.find((item) => item.targetId === targetId);
      return {
        id: targetId,
        type: "package",
        title: pkg?.title || currentGuideStep.targetText || label,
        targetId,
        pageId: currentGuideStep.pageId || null,
        priceUsd: pkg?.priceUsd ?? null,
        priceUnit: pkg?.priceUnit || null,
        priceLabel: pkg?.priceLabel || null,
      };
    }

    // Amenities are informational navigation/explanation objects in this demo,
    // not selectable booking items.
    if (targetId.startsWith("amenity-")) {
      return null;
    }

    return null;
  };

  const packageToSavedItem = (pkg: StayPlanPackage): SavedCommerceItem | null => {
    if (!pkg?.targetId) return null;
    return {
      id: pkg.targetId,
      type: "package",
      title: pkg.title || phraseFromId(pkg.targetId),
      targetId: pkg.targetId,
      pageId: null,
      priceUsd: pkg.priceUsd ?? null,
      priceUnit: pkg.priceUnit || null,
      priceLabel: pkg.priceLabel || null,
    };
  };

  const stayPlanPackagesForCurrentSelection = (): SavedCommerceItem[] => {
    const stayPlan = currentGuideStep
      ? stayPlanFromGuidedStep(currentGuideStep) || activeStayPlan
      : activeStayPlan;
    return (stayPlan?.packages || [])
      .map(packageToSavedItem)
      .filter((item): item is SavedCommerceItem => Boolean(item));
  };

  const saveCurrentGuideStep = () => {
    const item = currentGuideStepToSavedItem();
    if (!item) {
      setActiveCompletionWidget("saved-trip");
      return;
    }

    if (item.type === "room") {
      if (!shellDatesApplied) {
        pendingRoomSaveRef.current = item;
        setActiveCompletionWidget("dates");
        setActiveDatePicker("check-in");
        if (isCoarsePointer()) openPanel();
        return;
      }

      if (!shellGuestsApplied) {
        pendingRoomSaveRef.current = item;
        setActiveCompletionWidget("guests");
        setActiveDatePicker(null);
        if (isCoarsePointer()) openPanel();
        return;
      }

      if (!isCurrentBookingContextConfirmed()) {
        pendingRoomSaveRef.current = item;
        setActiveCompletionWidget(null);
        setActiveDatePicker(null);
        if (isCoarsePointer()) openPanel();
        return;
      }
    }

    setSavedTripContext((current) => {
      if (item.type === "room") {
        // Room recommendations can arrive as room + package stay plans.
        // Saving the room should preserve the whole recommended combo so the
        // traveler does not lose bundled breakfast/parking/business add-ons by
        // saving from the room step.
        const bundledPackages = stayPlanPackagesForCurrentSelection();
        const packages = [...current.packages];
        bundledPackages.forEach((pkg) => {
          if (!packages.some((entry) => entry.id === pkg.id)) {
            packages.push(pkg);
          }
        });
        return { ...current, room: item, packages };
      }

      if (item.type === "package") {
        const stayPlan = currentGuideStep
          ? stayPlanFromGuidedStep(currentGuideStep) || activeStayPlan
          : activeStayPlan;
        const bundledRoom = roomFromStayPlan(stayPlan);
        const bundledPackages = stayPlanPackagesForCurrentSelection();
        const packages = [...current.packages];

        [...bundledPackages, item].forEach((pkg) => {
          if (!packages.some((entry) => entry.id === pkg.id)) packages.push(pkg);
        });

        return {
          ...current,
          room: current.room || bundledRoom,
          packages,
        };
      }

      const existing = current.extras.some((entry) => entry.id === item.id);
      return existing ? current : { ...current, extras: [...current.extras, item] };
    });

    if (item.type === "room") {
      pendingRoomSaveRef.current = null;
      pendingRoomSaveSubmitIdRef.current = null;
    }
    setActiveCompletionWidget("saved-trip");
    setActiveDatePicker(null);
    if (isCoarsePointer()) {
      openPanel();
    }
  };

  const removeSavedTripItem = (type: SavedCommerceItem["type"], id: string) => {
    setSavedTripContext((current) => {
      if (type === "room") return { ...current, room: null };
      if (type === "package") {
        return {
          ...current,
          packages: current.packages.filter((item) => item.id !== id),
        };
      }      return {
        ...current,
        extras: current.extras.filter((item) => item.id !== id),
      };
    });
  };

  const estimateSavedTripSubtotal = () => {
    const nights = savedTripNights();
    if (!nights || !savedTripContext.room?.priceUsd) return null;

    const roomSubtotal = savedTripContext.room.priceUsd * nights;
    const packageSubtotal = savedTripContext.packages.reduce((total, item) => {
      if (!item.priceUsd) return total;
      return total + (item.priceUnit === "per_stay" ? item.priceUsd : item.priceUsd * nights);
    }, 0);

    return roomSubtotal + packageSubtotal;
  };

  const buildCommerceContext = () => ({
    dates: shellDatesApplied
      ? {
          checkIn: shellCheckInDate,
          checkOut: shellCheckOutDate,
          label: formatShellDateRange(shellCheckInDate, shellCheckOutDate),
        }
      : null,
    guests: shellGuestsApplied
      ? {
          adults: shellAdults,
          children: shellChildren,
          label: guestSummary(shellAdults, shellChildren),
        }
      : null,
    budget: shellBudgetBand ? { band: shellBudgetBand } : null,
    breakfast: shellBreakfastRequested
      ? { requested: true, label: "Breakfast requested" }
      : null,
    savedTrip: savedTripContext,
  });

  const stayPlanFromSavedTrip = (): StayPlan | null => {
    const savedRoom = savedTripContext.room;
    if (!savedRoom?.targetId) return null;

    return {
      type: "saved_trip",
      room: {
        targetId: savedRoom.targetId,
        title: savedRoom.title,
        nightlyRateUsd:
          savedRoom.priceUnit === "per_night" ? savedRoom.priceUsd ?? null : null,
      },
      packages: savedTripContext.packages
        .filter((item) => item.targetId)
        .map((item) => ({
          targetId: item.targetId,
          title: item.title,
          priceUsd: item.priceUsd ?? null,
          priceUnit: item.priceUnit ?? null,
          priceLabel: item.priceLabel ?? null,
          summary: null,
        })),
      extras: savedTripContext.extras.map((item) => item.title),
      navigationOrder: [
        savedRoom.targetId,
        ...savedTripContext.packages
          .map((item) => item.targetId)
          .filter(Boolean),
      ] as string[],
    };
  };

  const bookCurrentGuideStep = (collapseOnMobile = false, forceCheckout = false) => {
    if (guideConfig?.mode === "commerce" && !forceCheckout) {
      clearMinimizeTimer();
      if (shellState !== "panel") openPanel();
      setBookingPreloadConfirmed(false);
      setActiveCompletionWidget("upsell");
      setActiveDatePicker(null);
      return;
    }
    const stepStayPlan = stayPlanFromGuidedStep(currentGuideStep);
    const savedTripStayPlan = stayPlanFromSavedTrip();
    const fallbackStepStayPlan =
      stepStayPlan ||
      activeStayPlan ||
      guideSteps.map((step) => stayPlanFromGuidedStep(step)).find(Boolean) ||
      savedTripStayPlan ||
      null;
    const savedRoomStep = savedTripContext.room?.targetId
      ? ({
          type: "navigate",
          targetId: savedTripContext.room.targetId,
          pageId: savedTripContext.room.pageId || undefined,
          targetText: savedTripContext.room.title,
        } as GuidedAction)
      : null;
    const bookableStep = fallbackStepStayPlan
      ? primaryRoomStepForStayPlan(fallbackStepStayPlan, guideSteps) ||
        currentGuideStep ||
        guideSteps[0] ||
        savedRoomStep ||
        null
      : currentGuideStep?.targetId?.startsWith("room-")
        ? currentGuideStep
        : guideSteps.find((step) => step?.targetId?.startsWith("room-")) ||
          currentGuideStep ||
          guideSteps[0] ||
          savedRoomStep ||
          null;
    const targetId =
      fallbackStepStayPlan?.room?.targetId ||
      bookableStep?.targetId ||
      savedTripContext.room?.targetId ||
      null;

    if (guideConfig?.mode === "commerce" && forceCheckout) {
      setBookingPreloadConfirmed(true);
      setActiveCompletionWidget("upsell");
    }

    const dispatchBook = () => {
      window.dispatchEvent(
        new CustomEvent("guide-commerce-book", {
          detail: {
            targetId,
            step: bookableStep,
            stayPlan: fallbackStepStayPlan,
            packageIds: fallbackStepStayPlan?.packages
              ?.map((item) => item.targetId)
              .filter(Boolean),
            extras: fallbackStepStayPlan?.extras || [],
            commerceContext: buildCommerceContext(),
          },
        }),
      );
    };

    if (collapseOnMobile && isCoarsePointer()) {
      collapsePanelForMobileAction();
      window.setTimeout(dispatchBook, 80);
      return;
    }

    dispatchBook();
  };

  const normalizeCommerceChip = (chip: string) =>
    chip
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const chipToPrompt = (chip: string) => {
    const clean = chip.trim();
    if (!clean) return "";

    const lower = normalizeCommerceChip(clean);
    // Completion chips are handled by handleRefinementChipClick. They should
    // never be converted into composer text, especially during pending Save
    // flows where Select dates/Add guests must open the inline widgets.
    if (guideConfig?.mode === "commerce") {
      if (lower === "select dates" || lower === "add dates") return "";
      if (lower === "add guests" || lower === "select guests") return "";
      if (lower === "set budget" || lower === "add budget") return "";
    }

    if (lower === "add breakfast") return "Add breakfast to this stay.";
    if (lower.startsWith("show "))
      return clean.endsWith(".") ? clean : `${clean}.`;
    if (lower.startsWith("add "))
      return clean.endsWith(".") ? clean : `${clean}.`;
    return clean.endsWith(".") || clean.endsWith("?") ? clean : `${clean}.`;
  };

  const addDaysToIsoDate = (value: string, days: number) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day + days);
    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
    const nextDay = String(date.getDate()).padStart(2, "0");
    return `${nextYear}-${nextMonth}-${nextDay}`;
  };

  const syncShellCalendarMonthToDate = (value: string) => {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    setShellCalendarMonth({ year, monthIndex: month - 1 });
  };

  const openShellDatePicker = (kind: Exclude<DatePickerKind, null>) => {
    const value = kind === "check-in" ? shellCheckInDate : shellCheckOutDate;
    syncShellCalendarMonthToDate(value);
    setActiveDatePicker((current) => (current === kind ? null : kind));
  };

  const closeMobileDateSheet = () => {
    setActiveDatePicker(null);
  };

  const selectShellCalendarDate = (
    kind: Exclude<DatePickerKind, null>,
    value: string,
  ) => {
    if (kind === "check-in") {
      setShellCheckInDate(value);
      if (!shellCheckOutDate || shellCheckOutDate <= value) {
        setShellCheckOutDate(addDaysToIsoDate(value, 1));
      }
    } else {
      setShellCheckOutDate(value);
    }

    setShellDatesApplied(false);

    if (isCoarsePointer() && kind === "check-in") {
      const nextCheckout =
        !shellCheckOutDate || shellCheckOutDate <= value
          ? addDaysToIsoDate(value, 1)
          : shellCheckOutDate;
      syncShellCalendarMonthToDate(nextCheckout);
      setActiveDatePicker("check-out");
      return;
    }

    setActiveDatePicker(null);
  };

  const shiftShellCalendarMonth = (delta: number) => {
    setShellCalendarMonth((current) => {
      const next = new Date(current.year, current.monthIndex + delta, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
  };

  const renderShellCalendar = (
    kind: Exclude<DatePickerKind, null>,
    presentation: "inline" | "sheet" = "inline",
  ) => {
    const year = shellCalendarMonth.year;
    const monthIndex = shellCalendarMonth.monthIndex;
    const monthName = new Date(year, monthIndex, 1).toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      },
    );
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    const selected = kind === "check-in" ? shellCheckInDate : shellCheckOutDate;
    const isSheet = presentation === "sheet";

    return (
      <motion.div
        key={`calendar-${kind}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={
          isSheet
            ? "rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl"
            : "rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:rounded-2xl sm:p-3"
        }
      >
        <div
          className={
            isSheet
              ? "mb-3 flex items-center justify-between gap-3"
              : "mb-1.5 flex items-center justify-between gap-2 sm:mb-3 sm:gap-3"
          }
        >
          <div>
            <div
              className={
                isSheet
                  ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  : "text-[8px] font-semibold uppercase tracking-[0.10em] text-slate-400 sm:text-[10px] sm:tracking-[0.14em]"
              }
            >
              {kind === "check-in" ? "Check-in calendar" : "Check-out calendar"}
            </div>
            <div
              className={
                isSheet
                  ? "mt-1 text-base font-semibold text-slate-950"
                  : "mt-0.5 text-[11px] font-semibold text-slate-950 sm:mt-1 sm:text-sm"
              }
            >
              {monthName}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => shiftShellCalendarMonth(-1)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 sm:py-1 sm:text-xs"
              aria-label="Previous month"
              title="Previous month"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => shiftShellCalendarMonth(1)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 sm:py-1 sm:text-xs"
              aria-label="Next month"
              title="Next month"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => setActiveDatePicker(null)}
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 sm:py-1 sm:text-xs"
            >
              {isSheet ? "Close" : "Collapse"}
            </button>
          </div>
        </div>

        <div
          className={
            isSheet
              ? "grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
              : "grid grid-cols-7 gap-0.5 text-center text-[8px] font-semibold uppercase tracking-[0.02em] text-slate-400 sm:gap-1 sm:text-[10px] sm:tracking-[0.08em]"
          }
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-0.5 sm:py-1">
              {day}
            </div>
          ))}
        </div>

        <div
          className={
            isSheet
              ? "mt-1 grid grid-cols-7 gap-1"
              : "mt-0.5 grid grid-cols-7 gap-0.5 sm:mt-1 sm:gap-1"
          }
        >
          {blanks.map((_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {days.map((day) => {
            const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = selected === value;
            const isDemoTarget =
              (kind === "check-in" && value === "2026-07-10") ||
              (kind === "check-out" && value === "2026-07-14");
            const disabled = Boolean(
              kind === "check-out" &&
              shellCheckInDate &&
              value <= shellCheckInDate,
            );

            return (
              <button
                key={value}
                data-demo-target={
                  isDemoTarget ? `calendar-${kind}-${value}` : undefined
                }
                type="button"
                disabled={disabled}
                onClick={() => selectShellCalendarDate(kind, value)}
                className={`${
                  isSheet
                    ? "rounded-xl px-0 py-1.5 text-sm font-semibold leading-6"
                    : "rounded-md px-0 py-0.5 text-[10px] font-semibold leading-5 sm:rounded-xl sm:py-2 sm:text-xs"
                } transition ${
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
      </motion.div>
    );
  };

  const completionInstructionPatterns: Partial<Record<
    Exclude<CompletionWidget, null>,
    RegExp
  >> = {
    dates:
      /(?:^|\s)Use\s+[A-Z][a-z]{2}\s+\d{1,2}(?:,\s*\d{4})?[–-][A-Z][a-z]{2}\s+\d{1,2},\s*\d{4}\s+for this stay\./gi,
    guests:
      /(?:^|\s)Add\s+\d+\s+adult(?:s)?(?:,\s*\d+\s+child(?:ren)?)?\s+for this stay\./gi,
    budget:
      /(?:^|\s)Use\s+a\s+(?:value|moderate|premium|luxury)\s+budget\s+for this stay\./gi,
  };

  const appendDraftInstruction = (
    instruction: string,
    completionType: CompletionWidget = null,
  ) => {
    const cleanInstruction = instruction.trim();
    if (!cleanInstruction) return;

    const sentence =
      cleanInstruction.endsWith(".") ||
      cleanInstruction.endsWith("?") ||
      cleanInstruction.endsWith("!")
        ? cleanInstruction
        : `${cleanInstruction}.`;

    clearMinimizeTimer();
    if (shellState !== "panel") {
      openPanel();
    }
    suppressNextDraftScrollRef.current = true;

    setDraftValue((current) => {
      let trimmedCurrent = current.trim();
      const pattern = completionType
        ? completionInstructionPatterns[completionType]
        : null;
      if (pattern) {
        trimmedCurrent = trimmedCurrent
          .replace(pattern, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      if (!trimmedCurrent) return sentence;

      const normalizedCurrent = trimmedCurrent.toLowerCase();
      const normalizedSentence = sentence.toLowerCase();
      if (normalizedCurrent.includes(normalizedSentence)) return trimmedCurrent;

      return `${trimmedCurrent} ${sentence}`;
    });

    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (!isCoarsePointer()) {
        textarea.focus({ preventScroll: true });
      }
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }, 40);
  };

  const handleRefinementChipClick = (chip: string) => {
    const clean = chip.trim();
    const lower = normalizeCommerceChip(clean);
    if (clean) setLastRefinementChipClicked(clean);

    if (guideConfig?.mode === "commerce") {
      if (lower === "select dates" || lower === "add dates") {
        clearMinimizeTimer();
        if (shellState !== "panel") openPanel();
        setActiveCompletionWidget("dates");
        syncShellCalendarMonthToDate(shellCheckInDate);
        setActiveDatePicker("check-in");
        return;
      }

      if (lower === "add guests" || lower === "select guests") {
        clearMinimizeTimer();
        if (shellState !== "panel") openPanel();
        setActiveCompletionWidget("guests");
        setActiveDatePicker(null);
        return;
      }

      if (lower === "set budget" || lower === "add budget") {
        clearMinimizeTimer();
        if (shellState !== "panel") openPanel();
        setActiveCompletionWidget("budget");
        setActiveDatePicker(null);
        return;
      }
    }

    const nextPrompt = chipToPrompt(clean);
    if (!nextPrompt) return;

    appendDraftInstruction(nextPrompt);
  };

  useEffect(() => {
    if (!demoCommand) return;

    if (demoCommand.type === "open") {
      openPanel();
      return;
    }

    if (demoCommand.type === "type") {
      if (shellState !== "panel") {
        openPanel();
      } else {
        clearMinimizeTimer();
      }

      demoTypingDraftUpdateRef.current = true;
      suppressNextDraftScrollRef.current = true;
      setDraftValue(demoCommand.value || "");

      window.setTimeout(() => {
        if (!isCoarsePointer()) {
          textareaRef.current?.focus({ preventScroll: true });
        }
      }, 120);
      return;
    }

    if (demoCommand.type === "submit") {
      window.setTimeout(() => submitDraft(), 80);
      return;
    }

    if (demoCommand.type === "next") {
      navigateToGuideStep(currentGuideStepIndex + 1, true);
      return;
    }

    if (demoCommand.type === "got-it") {
      acknowledgeSpotlight();
      return;
    }

    if (demoCommand.type === "book") {
      bookCurrentGuideStep(true);
      return;
    }

    if (demoCommand.type === "minimize") {
      autoMinimizeDisabledRef.current = false;
      forceWelcomeVisibleRef.current = false;
      setShellState("launcher");
    }
  }, [demoCommand?.id]);

  useEffect(() => {
    const handleClearSpotlight = () => acknowledgeSpotlight();

    window.addEventListener(
      GUIDE_CLEAR_SPOTLIGHT_EVENT,
      handleClearSpotlight as EventListener,
    );

    return () =>
      window.removeEventListener(
        GUIDE_CLEAR_SPOTLIGHT_EVENT,
        handleClearSpotlight as EventListener,
      );
  }, [acknowledgeSpotlight]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!suppressWelcomeCard && shellState === "welcome" && showWelcome && (
        <motion.div
          key="welcome"
          {...baseMotion}
          style={{
            ...toastPosition,
            width: "min(calc(100vw - 32px), 380px)",
            maxHeight: floatingCardMaxHeight,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl sm:rounded-[28px]">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-7 sm:pt-6">
              <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2.5 backdrop-blur sm:mb-4 sm:p-3">
                <Compass className="h-5 w-5" />
              </div>

              <div className="text-lg font-semibold tracking-tight sm:text-xl">
                Meet TourBot
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-200 sm:mt-3">
                TourBot answers questions, guides users through the right site
                sections, and preloads forms or booking steps from
                natural-language intent.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Self-drive mode
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Playground guide
                </span>
              </div>
            </div>

            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <div className="space-y-2">
                <button
                  data-demo-target="guide-open"
                  onClick={openPanel}
                  className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-800 sm:py-3"
                >
                  Activate TourBot
                  <MessageSquare className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    autoMinimizeDisabledRef.current = false;
                    forceWelcomeVisibleRef.current = false;
                    setShellState("launcher");
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-2.5 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:py-3"
                >
                  Browse playground first
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {shellState === "panel" && (
        <motion.div
          key="panel"
          {...baseMotion}
          style={panelToastStyle}
          onMouseEnter={clearMinimizeTimer}
          onMouseLeave={() => {
            if (!isCoarsePointer()) startMinimizeTimer();
          }}
        >
          <div
            data-demo-target="guide-shell"
            className={`overflow-hidden border border-slate-200 bg-white shadow-2xl ${keyboardCompressed ? "rounded-[20px]" : "rounded-[24px] sm:rounded-[30px]"}`}
            style={{
              height: panelHeight,
              maxHeight: keyboardCompressed
                ? `${keyboardPanelMaxHeight}px`
                : coarsePointer
                  ? `${mobilePanelMaxHeight}px`
                  : floatingCardMaxHeight,
            }}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div
                className={`flex shrink-0 items-center justify-between border-b border-slate-200 px-4 ${keyboardCompressed ? "py-2" : "py-3 sm:px-5 sm:py-4"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-2xl bg-slate-900 p-2 text-white">
                    <Compass className="h-4 w-4" />
                  </span>

                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      TourBot
                    </div>
                    <div className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                      {modeCopy.statusLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    data-demo-target="guide-minimize"
                    onClick={() => {
                      textareaRef.current?.blur();
                      setKeyboardCompressed(false);
                      textareaRef.current?.blur();
                      setKeyboardCompressed(false);
                      autoMinimizeDisabledRef.current = false;
                      forceWelcomeVisibleRef.current = false;
                      setShellState("launcher");
                    }}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <button
                    onClick={resetShellToWelcome}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                className={
                  keyboardCompressed
                    ? "hidden"
                    : "hidden shrink-0 border-b border-slate-200 px-4 py-2.5 sm:block sm:px-5 sm:py-3"
                }
              >
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Self-drive starters
                </div>

                <div className="flex flex-wrap gap-2">
                  {modeCopy.quickStarts.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setDraftValue(item.prompt)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <motion.div
                ref={laneRef}
                className={`min-h-0 flex-1 overflow-y-auto bg-slate-50 ${keyboardCompressed ? "px-2 py-2" : "px-3 py-3 sm:px-5 sm:py-4"}`}
                style={{ overflowAnchor: "none" }}
              >
                <div
                  className="flex flex-col justify-end"
                  style={{
                    minHeight: `calc(100% + ${THREAD_BOOTSTRAP_SCROLL_PX}px)`,
                  }}
                >
                  <motion.div className="space-y-0">
                    <AnimatePresence initial={false}>
                      {thread.length === 0 ? (
                        <motion.div
                          key="waking"
                          initial={{ opacity: 0.92 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: MESSAGE_FADE_DURATION,
                            ease: "easeOut",
                          }}
                          className="w-full bg-slate-100 px-4 py-3 text-sm text-slate-400"
                        >
                          TourBot warming up…
                        </motion.div>
                      ) : (
                        thread.map((item) =>
                          item.role === "user" ? (
                            <FinalUserRow
                              key={item.id}
                              body={item.body}
                              status={item.status}
                            />
                          ) : (
                            <BotRow
                              key={item.id}
                              title={item.title}
                              body={item.body}
                              answerParts={item.answerParts}
                              refinementChips={item.refinementChips}
                              onChipClick={handleRefinementChipClick}
                            />
                          ),
                        )
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                layout
                initial={false}
                animate={{
                  boxShadow: draftFocus
                    ? "0 -1px 0 rgba(148,163,184,0.22)"
                    : "0 -1px 0 rgba(226,232,240,1)",
                }}
                className={`shrink-0 bg-white ${keyboardCompressed ? "px-2 py-2" : "px-3 py-3 sm:px-5 sm:py-4"}`}
              >
                {showGuideActionStrip && (
                  <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1 text-xs text-slate-500">
                      {hasGuideSteps ? (
                        <div className="min-w-0 leading-tight">
                          <div className="font-semibold text-slate-700">
                            {guideSteps.length > 1
                              ? `Step ${currentGuideStepIndex + 1} of ${guideSteps.length}`
                              : "Guide spotlight"}
                          </div>
                          {currentGuideStep && (
                            <div className="mt-0.5 truncate text-slate-500">
                              {guideStepLabel(currentGuideStep)}
                            </div>
                          )}
                        </div>
                      ) : keepCommerceActionStripOpen ? (
                        <div className="min-w-0 leading-tight">
                          <div className="font-semibold text-slate-700">
                            Trip tools stay open
                          </div>
                          <div className="mt-0.5 truncate text-slate-500">
                            Continue the saved trip, or use the suggested actions above.
                          </div>
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-700">
                          Guide spotlight
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {hasMultipleGuideSteps && (
                        <>
                          <button
                            data-demo-target="guide-back"
                            type="button"
                            aria-label="Back"
                            title="Back"
                            onClick={() =>
                              navigateToGuideStep(
                                currentGuideStepIndex - 1,
                                true,
                              )
                            }
                            disabled={currentGuideStepIndex <= 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            data-demo-target="guide-next"
                            type="button"
                            aria-label="Next"
                            title="Next"
                            onClick={() =>
                              navigateToGuideStep(
                                currentGuideStepIndex + 1,
                                true,
                              )
                            }
                            disabled={
                              currentGuideStepIndex >= guideSteps.length - 1
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}

                      {guideConfig?.mode === "commerce" &&
                        (hasGuideSteps || keepCommerceActionStripOpen) && (
                        <>
                          {hasGuideSteps && (
                            <button
                              data-demo-target="guide-save"
                              type="button"
                              aria-label="Save current recommendation"
                              title="Save"
                              onClick={saveCurrentGuideStep}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            data-demo-target="guide-view"
                            type="button"
                            aria-label="View saved trip"
                            title="View"
                            onClick={() => { clearMinimizeTimer(); if (shellState !== "panel") openPanel(); setActiveCompletionWidget("saved-trip"); }}
                            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {savedTripItemCount() > 0 && (
                              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-cyan-950 px-1 text-[10px] font-bold leading-4 text-white">
                                {savedTripItemCount()}
                              </span>
                            )}
                          </button>
                        </>
                      )}

                      {showBookAction && (
                        <button
                          data-demo-target="guide-book"
                          type="button"
                          aria-label="Book selected stay"
                          title="Book"
                          onClick={() => bookCurrentGuideStep(true)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-950 text-white shadow-sm transition hover:bg-cyan-900"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {guideConfig?.mode !== "commerce" && (
                        <button
                          data-demo-target="guide-got-it"
                          type="button"
                          aria-label="Clear spotlight"
                          title="Got it"
                          onClick={acknowledgeSpotlight}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-800"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {activeCompletionWidget &&
                    guideConfig?.mode === "commerce" && (
                      <motion.div
                        key={activeCompletionWidget}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="mb-2 max-h-[min(54dvh,390px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm sm:mb-3 sm:max-h-none sm:rounded-2xl sm:p-3"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500 sm:text-[11px] sm:tracking-[0.16em]">
                              {activeCompletionWidget === "dates"
                                ? "Select dates"
                                : activeCompletionWidget === "guests"
                                  ? "Add guests"
                                  : activeCompletionWidget === "saved-trip"
                                    ? "Saved trip"
                                    : activeCompletionWidget === "upsell"
                                      ? "Enhance your stay"
                                      : "Set budget"}
                            </div>
                            <div className="mt-0.5 text-[10px] leading-[14px] text-slate-500 sm:mt-1 sm:text-xs sm:leading-5">
                              {activeCompletionWidget === "dates"
                                ? "Choose check-in and check-out before handing off to booking."
                                : activeCompletionWidget === "guests"
                                  ? "Set the guest count so the guide can preserve capacity context."
                                  : activeCompletionWidget === "saved-trip"
                                    ? "Review selected room, packages, and trip details."
                                    : activeCompletionWidget === "upsell"
                                      ? "Optional quality modifiers before the cart handoff. Pick one to preload a request, or continue to booking."
                                      : "Choose a budget band to steer recommendations without forcing exact pricing."}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCompletionWidget(null);
                              setActiveDatePicker(null);
                              setBookingPreloadConfirmed(false);
                            }}
                            className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white"
                          >
                            Close
                          </button>
                        </div>

                        {activeCompletionWidget === "dates" && (
                          <div className="space-y-1.5 sm:space-y-3">
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                              <button
                                data-demo-target="date-check-in-expand"
                                type="button"
                                onClick={() => openShellDatePicker("check-in")}
                                className={`rounded-lg bg-white px-2 py-1.5 text-left shadow-sm transition hover:bg-slate-50 sm:rounded-xl sm:px-3 sm:py-2 ${
                                  activeDatePicker === "check-in"
                                    ? "ring-2 ring-slate-900/10"
                                    : ""
                                }`}
                              >
                                <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-[10px] sm:tracking-[0.14em]">
                                  Check-in
                                </span>
                                <span className="mt-0.5 block text-[11px] font-semibold text-slate-950 sm:mt-1 sm:text-sm">
                                  {formatShellDate(shellCheckInDate)}
                                </span>
                                <span className="mt-0.5 hidden text-[10px] text-slate-500 min-[390px]:block sm:mt-1 sm:text-xs">
                                  Expand calendar
                                </span>
                              </button>

                              <button
                                data-demo-target="date-check-out-expand"
                                type="button"
                                onClick={() => openShellDatePicker("check-out")}
                                className={`rounded-lg bg-white px-2 py-1.5 text-left shadow-sm transition hover:bg-slate-50 sm:rounded-xl sm:px-3 sm:py-2 ${
                                  activeDatePicker === "check-out"
                                    ? "ring-2 ring-slate-900/10"
                                    : ""
                                }`}
                              >
                                <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-[10px] sm:tracking-[0.14em]">
                                  Check-out
                                </span>
                                <span className="mt-0.5 block text-[11px] font-semibold text-slate-950 sm:mt-1 sm:text-sm">
                                  {formatShellDate(shellCheckOutDate)}
                                </span>
                                <span className="mt-0.5 hidden text-[10px] text-slate-500 min-[390px]:block sm:mt-1 sm:text-xs">
                                  Expand calendar
                                </span>
                              </button>
                            </div>

                            {!coarsePointer && (
                              <AnimatePresence mode="wait">
                                {activeDatePicker === "check-in" &&
                                  renderShellCalendar("check-in")}
                                {activeDatePicker === "check-out" &&
                                  renderShellCalendar("check-out")}
                              </AnimatePresence>
                            )}
                            <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                              <div className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                                {shellDatesApplied
                                  ? `Saved: ${formatShellDateRange(shellCheckInDate, shellCheckOutDate)}`
                                  : shellCheckInDate &&
                                      shellCheckOutDate &&
                                      shellCheckOutDate > shellCheckInDate
                                    ? "Ready to save dates."
                                    : "Choose a check-out date after check-in."}
                              </div>
                              <button
                                data-demo-target="apply-dates"
                                type="button"
                                disabled={
                                  !shellCheckInDate ||
                                  !shellCheckOutDate ||
                                  shellCheckOutDate <= shellCheckInDate
                                }
                                onClick={() => {
                                  clearMinimizeTimer();
                                  if (shellState !== "panel") openPanel();
                                  const dateLabel = formatShellDateRange(
                                    shellCheckInDate,
                                    shellCheckOutDate,
                                  );
                                  setShellDatesApplied(true);
                                  setActiveCompletionWidget(null);
                                  setActiveDatePicker(null);
                                  appendDraftInstruction(
                                    `Use ${dateLabel} for this stay.`,
                                    "dates",
                                  );
                                }}
                                className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:py-2 sm:text-xs"
                              >
                                Apply dates
                              </button>
                            </div>
                          </div>
                        )}

                        {activeCompletionWidget === "guests" && (
                          <div className="space-y-1.5 sm:space-y-3">
                            {[
                              {
                                label: "Adults",
                                value: shellAdults,
                                setValue: setShellAdults,
                                min: 1,
                              },
                              {
                                label: "Children",
                                value: shellChildren,
                                setValue: setShellChildren,
                                min: 0,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 shadow-sm sm:rounded-xl sm:px-3"
                              >
                                <div>
                                  <div className="text-[8px] font-semibold uppercase tracking-[0.10em] text-slate-400 sm:text-[10px] sm:tracking-[0.14em]">
                                    {item.label}
                                  </div>
                                  <div className="mt-0.5 text-[11px] font-semibold text-slate-950 sm:mt-1 sm:text-sm">
                                    {item.value}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    data-demo-target={
                                      item.label === "Adults"
                                        ? "guest-adults-minus"
                                        : "guest-children-minus"
                                    }
                                    type="button"
                                    onClick={() => {
                                      item.setValue(
                                        Math.max(item.min, item.value - 1),
                                      );
                                      confirmedBookingContextKeyRef.current = "";
                                      setShellGuestsApplied(false);
                                    }}
                                    className="h-7 w-7 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:h-8 sm:w-8 sm:text-sm"
                                  >
                                    −
                                  </button>
                                  <button
                                    data-demo-target={
                                      item.label === "Adults"
                                        ? "guest-adults-plus"
                                        : "guest-children-plus"
                                    }
                                    type="button"
                                    onClick={() => {
                                      item.setValue(item.value + 1);
                                      confirmedBookingContextKeyRef.current = "";
                                      setShellGuestsApplied(false);
                                    }}
                                    className="h-7 w-7 rounded-full bg-slate-950 text-xs font-semibold text-white transition hover:bg-slate-800 sm:h-8 sm:w-8 sm:text-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                            <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                              <div className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                                {shellGuestsApplied
                                  ? `Saved: ${guestSummary(shellAdults, shellChildren)}`
                                  : "Ready to save guests."}
                              </div>
                              <button
                                data-demo-target="apply-guests"
                                type="button"
                                onClick={() => {
                                  clearMinimizeTimer();
                                  if (shellState !== "panel") openPanel();
                                  const guestsLabel = guestSummary(
                                    shellAdults,
                                    shellChildren,
                                  );
                                  setShellGuestsApplied(true);
                                  setActiveCompletionWidget(null);
                                  appendDraftInstruction(
                                    `Add ${guestsLabel} for this stay.`,
                                    "guests",
                                  );
                                }}
                                className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-xs"
                              >
                                Apply guests
                              </button>
                            </div>
                          </div>
                        )}

                        {activeCompletionWidget === "saved-trip" && (
                          <div className="space-y-2 sm:space-y-3">
                            <div className="rounded-xl bg-white p-2.5 shadow-sm sm:p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Selected room
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-500">
                                    A room is required before checkout.
                                  </div>
                                </div>
                              </div>
                              {savedTripContext.room ? (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                      {savedTripContext.room.title}
                                    </div>
                                    {savedTripContext.room.priceLabel && (
                                      <div className="mt-0.5 text-xs text-slate-500">
                                        {savedTripContext.room.priceLabel}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    aria-label="Remove selected room"
                                    onClick={() =>
                                      removeSavedTripItem("room", savedTripContext.room?.id || "")
                                    }
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
                                  No room saved yet. Step to a room recommendation and tap Save.
                                </div>
                              )}
                            </div>

                            <div className="grid gap-2">
                              <div className="rounded-xl bg-white p-2.5 shadow-sm sm:p-3">
                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  Packages / add-ons
                                </div>
                                {savedTripContext.packages.length ? (
                                  <div className="space-y-1.5">
                                    {savedTripContext.packages.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate text-xs font-semibold text-slate-900">
                                            {item.title}
                                          </div>
                                          {item.priceLabel && (
                                            <div className="mt-0.5 text-[11px] text-slate-500">
                                              {item.priceLabel}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          aria-label={`Remove ${item.title}`}
                                          onClick={() => removeSavedTripItem("package", item.id)}
                                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-rose-600"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
                                    No packages saved.
                                  </div>
                                )}
                              </div>

                            </div>

                            <div className="rounded-xl bg-white p-2.5 shadow-sm sm:p-3">
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Trip details
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {shellDatesApplied ? (
                                  <button
                                    type="button"
                                    onClick={() => { confirmedBookingContextKeyRef.current = ""; setShellDatesApplied(false); }}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-rose-50 hover:text-rose-700"
                                  >
                                    {formatShellDateRange(shellCheckInDate, shellCheckOutDate)}
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { clearMinimizeTimer(); if (shellState !== "panel") openPanel(); setActiveCompletionWidget("dates"); syncShellCalendarMonthToDate(shellCheckInDate); setActiveDatePicker("check-in"); }}
                                    className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                                  >
                                    Add dates
                                  </button>
                                )}
                                {shellGuestsApplied ? (
                                  <button
                                    type="button"
                                    onClick={() => { confirmedBookingContextKeyRef.current = ""; setShellGuestsApplied(false); }}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-rose-50 hover:text-rose-700"
                                  >
                                    {guestSummary(shellAdults, shellChildren)}
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { clearMinimizeTimer(); if (shellState !== "panel") openPanel(); setActiveCompletionWidget("guests"); }}
                                    className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                                  >
                                    Add guests
                                  </button>
                                )}
                                {shellBudgetBand ? (
                                  <button
                                    type="button"
                                    onClick={() => setShellBudgetBand("")}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-rose-50 hover:text-rose-700"
                                  >
                                    {shellBudgetBand} budget
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { clearMinimizeTimer(); if (shellState !== "panel") openPanel(); setActiveCompletionWidget("budget"); }}
                                    className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                                  >
                                    Add budget
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-950">
                              {estimateSavedTripSubtotal() !== null
                                ? `Estimated room + package subtotal: $${estimateSavedTripSubtotal()?.toLocaleString()} before taxes and fees.`
                                : "Estimate appears here after a saved room has a nightly rate and dates are applied."}
                            </div>
                          </div>
                        )}

                        {activeCompletionWidget === "upsell" && (
                          <div className="space-y-2 sm:space-y-3">
                            <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs leading-5 text-cyan-950">
                              Before checkout, TourBot can check for useful stay enhancers the traveler may not know to ask for.
                            </div>

                            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900">
                                  Ready to book now?
                                </div>
                                <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
                                  Skip enhancements and continue with the current saved stay.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => bookCurrentGuideStep(true, true)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cyan-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-900"
                              >
                                <ShoppingBag className="h-3.5 w-3.5" />
                                Continue
                              </button>
                            </div>

                            {bookingPreloadConfirmed && (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900 shadow-sm">
                                <span className="font-semibold">Booking form preloaded.</span>{" "}
                                The current room, saved packages, dates, guests, and trip context have been sent to checkout.
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
                              {DEFAULT_UPSELL_SUGGESTIONS.map((suggestion) => (
                                <button
                                  key={suggestion.label}
                                  type="button"
                                  onClick={() => {
                                    clearMinimizeTimer();
                                    if (shellState !== "panel") openPanel();
                                    setBookingPreloadConfirmed(false);
                                    appendDraftInstruction(suggestion.prompt);
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-cyan-200 hover:bg-cyan-50 sm:rounded-xl sm:px-3 sm:py-3"
                                >
                                  <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                                    {suggestion.label}
                                  </div>
                                  <div className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:mt-1 sm:text-xs">
                                    {suggestion.helper}
                                  </div>
                                </button>
                              ))}
                            </div>

                            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur sm:p-3">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900">
                                  Ready to checkout?
                                </div>
                                <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
                                  Continue with the current room, dates, guests, and saved trip context.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => bookCurrentGuideStep(true, true)}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cyan-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-900"
                              >
                                <ShoppingBag className="h-3.5 w-3.5" />
                                Continue
                              </button>
                            </div>
                          </div>
                        )}

                        {activeCompletionWidget === "budget" && (
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            {BUDGET_BANDS.map((band) => (
                              <button
                                key={band}
                                data-demo-target={`budget-${band.toLowerCase()}`}
                                type="button"
                                onClick={() => {
                                  clearMinimizeTimer();
                                  if (shellState !== "panel") openPanel();
                                  const budgetPrompt = `Use a ${band.toLowerCase()} budget for this stay.`;
                                  setShellBudgetBand(band);
                                  setActiveCompletionWidget(null);
                                  appendDraftInstruction(budgetPrompt, "budget");
                                }}
                                className={`rounded-lg border px-2.5 py-2 text-left transition sm:rounded-xl sm:px-3 sm:py-3 ${
                                  shellBudgetBand === band
                                    ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <div className="text-xs font-semibold sm:text-sm">
                                  {band}
                                </div>
                                <div
                                  className={`mt-0.5 text-[11px] leading-4 sm:mt-1 sm:text-xs ${shellBudgetBand === band ? "text-white/70" : "text-slate-500"}`}
                                >
                                  {band === "Value"
                                    ? "Prioritize lower rates."
                                    : band === "Moderate"
                                      ? "Balance comfort and cost."
                                      : band === "Premium"
                                        ? "Allow nicer rooms and views."
                                        : "Prioritize the best experience."}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {(shellDatesApplied ||
                          shellGuestsApplied ||
                          shellBudgetBand ||
                          shellBreakfastRequested) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2 sm:mt-3 sm:gap-2 sm:pt-3">
                            {shellDatesApplied && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:px-3 sm:py-1 sm:text-xs">
                                {formatShellDateRange(
                                  shellCheckInDate,
                                  shellCheckOutDate,
                                )}
                              </span>
                            )}
                            {shellGuestsApplied && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:px-3 sm:py-1 sm:text-xs">
                                {guestSummary(shellAdults, shellChildren)}
                              </span>
                            )}
                            {shellBudgetBand && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:px-3 sm:py-1 sm:text-xs">
                                {shellBudgetBand} budget
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                </AnimatePresence>

                <DraftRow
                  value={draftValue}
                  onChange={setDraftValue}
                  onSubmit={submitDraft}
                  onKeyDown={handleDraftKeyDown}
                  onFocus={() => {
                    setDraftFocus(true);
                    if (isCoarsePointer()) setKeyboardCompressed(true);
                  }}
                  onBlur={() => {
                    setDraftFocus(false);
                    window.setTimeout(() => {
                      if (!submitInFlightRef.current)
                        setKeyboardCompressed(false);
                    }, 120);
                  }}
                  disabled={isBotTyping}
                  hasFocus={draftFocus}
                  textareaRef={textareaRef}
                  placeholder={modeCopy.placeholder}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}



      {coarsePointer &&
        activeCompletionWidget === "dates" &&
        activeDatePicker && (
          <motion.div
            key="mobile-date-sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed inset-0 z-[10000] bg-slate-950/35 px-3 pb-3 pt-12 backdrop-blur-[1px]"
            onClick={closeMobileDateSheet}
          >
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-x-3 bottom-3 max-h-[calc(100dvh-24px)] overflow-hidden rounded-[28px] border border-white/70 bg-white p-3 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-between gap-3 px-1">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Select dates
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">
                    {activeDatePicker === "check-in"
                      ? "Choose check-in"
                      : "Choose check-out"}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    {formatShellDateRange(shellCheckInDate, shellCheckOutDate)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMobileDateSheet}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                >
                  Done
                </button>
              </div>

              {renderShellCalendar(activeDatePicker, "sheet")}
            </motion.div>
          </motion.div>
        )}

      {shellState === "launcher" && (
        <motion.div
          key="launcher"
          {...baseMotion}
          style={
            coarsePointer
              ? {
                  position: "fixed" as const,
                  left: "12px",
                  right: "12px",
                  bottom: "16px",
                  zIndex: 9999,
                }
              : toastPosition
          }
          className="flex max-w-[calc(100vw-24px)] items-center justify-end gap-2"
        >
          {coarsePointer && (showGuideActionStrip || showBookAction) && (
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur">
              {hasMultipleGuideSteps && (
                <>
                  <button
                    data-demo-target="guide-back"
                    type="button"
                    aria-label="Back"
                    title="Back"
                    onClick={() =>
                      navigateToGuideStep(currentGuideStepIndex - 1, true)
                    }
                    disabled={currentGuideStepIndex <= 0}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    data-demo-target="guide-next"
                    type="button"
                    aria-label="Next"
                    title="Next"
                    onClick={() =>
                      navigateToGuideStep(currentGuideStepIndex + 1, true)
                    }
                    disabled={currentGuideStepIndex >= guideSteps.length - 1}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {guideConfig?.mode === "commerce" &&
                (hasGuideSteps || keepCommerceActionStripOpen) && (
                <>
                  {hasGuideSteps && (
                    <button
                      data-demo-target="guide-save"
                      type="button"
                      aria-label="Save current recommendation"
                      title="Save"
                      onClick={saveCurrentGuideStep}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    data-demo-target="guide-view"
                    type="button"
                    aria-label="View saved trip"
                    title="View"
                    onClick={() => {
                      clearMinimizeTimer();
                      openPanel();
                      setActiveCompletionWidget("saved-trip");
                    }}
                    className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
                  >
                    <Eye className="h-4 w-4" />
                    {savedTripItemCount() > 0 && (
                      <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-cyan-950 px-1 text-[10px] font-bold leading-4 text-white">
                        {savedTripItemCount()}
                      </span>
                    )}
                  </button>
                </>
              )}

              {showBookAction && (
                <button
                  data-demo-target="guide-book"
                  type="button"
                  aria-label="Book selected stay"
                  title="Book"
                  onClick={() => bookCurrentGuideStep(true)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-white shadow-sm transition hover:bg-cyan-900"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
              )}

              <button
                data-demo-target="guide-open-answer"
                onClick={openPanel}
                aria-label="Open message"
                title="Open message"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-800"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            data-demo-target="guide-launcher"
            onClick={openPanel}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-3 shadow-xl transition hover:bg-slate-50 sm:gap-3 sm:px-4"
          >
            <span className="inline-flex rounded-full bg-slate-900 p-2 text-white animate-pulse">
              <Compass className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-medium text-slate-900 sm:inline">
              TourBot active
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GuideShellStatic;
