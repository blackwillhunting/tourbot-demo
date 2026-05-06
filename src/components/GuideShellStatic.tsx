import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Compass,
  MessageSquare,
  Minus,
  SendHorizonal,
  Sparkles,
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

let activeSpotlightCleanup: (() => void) | null = null;
let activeSpotlightOverlay: HTMLDivElement | null = null;

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
      placeholder: "Describe your trip, preferences, dates, guests, or budget...",
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
          prompt: "I want a nice room with a view and breakfast, but not too expensive.",
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

type CommerceSessionContext = {
  dates?: { checkIn: string; checkOut: string; label: string } | null;
  guests?: { adults: number; children: number; label: string } | null;
  budget?: { band: string } | null;
  breakfast?: { requested: boolean; label: string } | null;
};

type ExtractedBookingContext = {
  checkInDate?: string | null;
  checkOutDate?: string | null;
  adults?: number | null;
  children?: number | null;
  budgetBand?: BudgetBand | string | null;
  breakfastRequested?: boolean | null;
};

type GuideConversationContext = {
  lastUserMessage?: string;
  recentUserMessages?: string[];
  recentBotSummary?: string;
  currentGuideStepIndex?: number;
  currentGuideSteps?: SuggestedAction[];
  currentGuideStep?: SuggestedAction | null;
  lastRefinementChipClicked?: string | null;
  commerceContext?: CommerceSessionContext;
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
};

type GuidedAction = SuggestedAction & {
  stepNarrative?: StepNarrative;
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
  extractedBookingContext?: ExtractedBookingContext;
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
): Promise<{
  title: string;
  body: string;
  answerParts?: AnswerParts;
  suggestedAction?: SuggestedAction;
  rankedDestinations?: SuggestedAction[];
  stepNarratives?: StepNarrative[];
  refinementChips?: string[];
  commerceAction?: string;
  extractedBookingContext?: ExtractedBookingContext;
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

  return {
    title: data.title || "Guide response",
    body:
      answer ||
      data.answerParts?.intro ||
      "I received the request, but the backend did not return an answer.",
    answerParts: data.answerParts,
    suggestedAction: data.suggestedAction,
    rankedDestinations: Array.isArray(data.rankedDestinations) ? data.rankedDestinations : [],
    stepNarratives: Array.isArray(data.stepNarratives) ? data.stepNarratives : [],
    refinementChips: Array.isArray(data.refinementChips) ? data.refinementChips.filter(Boolean).slice(0, 6) : [],
    commerceAction: typeof data.commerceAction === "string" ? data.commerceAction : undefined,
    extractedBookingContext: data.extractedBookingContext,
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
      'nav, header, footer, button, [role="navigation"], [aria-label*="navigation" i], [class*="sticky"], [class*="fixed"], [class*="top-"]',
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

function normalizeGuideSteps(reply: { suggestedAction?: SuggestedAction; rankedDestinations?: SuggestedAction[]; stepNarratives?: StepNarrative[] }): GuidedAction[] {
  const rawSteps = Array.isArray(reply.rankedDestinations) && reply.rankedDestinations.length > 0
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
      const key = `${step.pageUrl || step.pageId || ""}::${step.targetId || ""}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6)
    .map((step) => ({
      ...step,
      stepNarrative: narrativesByTarget.get((step.targetId || "").toLowerCase()),
    }));
}

function answerPartsForGuideStep(step: GuidedAction, index: number, total: number): AnswerParts {
  const narrative = step.stepNarrative;
  const label = narrative?.targetText || step.targetText || phraseFromId(step.targetId) || "this section";
  const intro = narrative?.intro || (
    total > 1
      ? `${index === 0 ? "Let’s start with" : "Next, let’s look at"} **${label}**.`
      : `Here’s the most relevant section: **${label}**.`
  );

  return {
    intro,
    bullets: Array.isArray(narrative?.bullets) ? narrative?.bullets.filter(Boolean) : [],
    closing: narrative?.closing || step.reason || "",
  };
}

function answerBodyFromParts(parts: AnswerParts) {
  const chunks: string[] = [];
  if (parts.intro) chunks.push(parts.intro);
  if (parts.bullets?.length) chunks.push(parts.bullets.map((item) => `- ${item}`).join("\n"));
  if (parts.closing) chunks.push(parts.closing);
  return chunks.join("\n\n").trim();
}

function guideStepLabel(step?: SuggestedAction | null) {
  if (!step) return "Step";
  return step.targetText || phraseFromId(step.targetId) || step.pageId || "Step";
}


type CompletionWidget = "dates" | "guests" | "budget" | null;
type DatePickerKind = "check-in" | "check-out" | null;
type BudgetBand = "Value" | "Moderate" | "Premium" | "Luxury";

const BUDGET_BANDS: BudgetBand[] = ["Value", "Moderate", "Premium", "Luxury"];

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
  const childrenLabel = children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : "";
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
      .querySelectorAll<HTMLElement>('[data-guide-spotlight-overlay="true"]')
      .forEach((node) => node.remove());

    document
      .querySelectorAll<HTMLElement>('[data-guide-spotlight-target="true"]')
      .forEach((node) => node.removeAttribute("data-guide-spotlight-target"));
  }
}

function spotlightTarget(target: HTMLElement) {
  clearActiveSpotlight();

  const overlay = document.createElement("div");
  overlay.setAttribute("data-guide-spotlight-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "8998";
  overlay.style.pointerEvents = "none";
  overlay.style.background = "rgba(15, 23, 42, 0.34)";
  overlay.style.backdropFilter = "saturate(0.9)";
  overlay.style.transition = "opacity 220ms ease";
  overlay.style.opacity = "0";
  document.body.appendChild(overlay);
  activeSpotlightOverlay = overlay;
  window.requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });

  const previousPosition = target.style.position;
  const previousZIndex = target.style.zIndex;
  const previousOutline = target.style.outline;
  const previousOutlineOffset = target.style.outlineOffset;
  const previousBoxShadow = target.style.boxShadow;
  const previousBorderRadius = target.style.borderRadius;
  const previousTransition = target.style.transition;
  const computedPosition = window.getComputedStyle(target).position;

  target.setAttribute("data-guide-spotlight-target", "true");
  target.style.position = computedPosition === "static" ? "relative" : previousPosition;
  target.style.zIndex = "8999";
  target.style.transition =
    "box-shadow 220ms ease, outline 220ms ease, outline-offset 220ms ease";
  target.style.outline = "3px solid rgba(255, 255, 255, 0.92)";
  target.style.outlineOffset = "8px";
  target.style.boxShadow =
    "0 24px 90px rgba(15, 23, 42, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.72)";
  target.style.borderRadius = target.style.borderRadius || "24px";

  activeSpotlightCleanup = () => {
    if (activeSpotlightOverlay) {
      activeSpotlightOverlay.remove();
      activeSpotlightOverlay = null;
    }

    target.style.position = previousPosition;
    target.style.zIndex = previousZIndex;
    target.style.outline = previousOutline;
    target.style.outlineOffset = previousOutlineOffset;
    target.style.boxShadow = previousBoxShadow;
    target.style.borderRadius = previousBorderRadius;
    target.style.transition = previousTransition;
    target.removeAttribute("data-guide-spotlight-target");
  };
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
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const rawTargetY =
    block === "center"
      ? startY + rect.top - viewportHeight / 2 + rect.height / 2
      : startY + rect.top;
  const maxY = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
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
  delays = [250, 650, 1100, 1700, 2400],
  onSpotlightActive?: () => void,
) {
  let found = false;

  delays.forEach((delay) => {
    window.setTimeout(() => {
      if (found) return;

      const target = findTourTarget(action);
      if (!target) return;

      found = true;
      smoothScrollElementIntoView(target);
      window.setTimeout(() => {
        spotlightTarget(target);
        onSpotlightActive?.();
      }, GUIDE_NAVIGATION_SCROLL_MS + 120);
    }, delay);
  });
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
  if (target) {
    smoothScrollElementIntoView(target);
    window.setTimeout(() => {
      spotlightTarget(target);
      onSpotlightActive?.();
    }, GUIDE_NAVIGATION_SCROLL_MS + 120);
    return;
  }

  console.warn("Guide navigation target not found:", {
    targetId: action.targetId,
    pageId: action.pageId,
    pageUrl: action.pageUrl,
    reason: action.reason,
    visibleTargets: Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section[id], main [data-tour-id], main article, main [role='region']",
      ),
    )
      .slice(0, 40)
      .map((node) => ({
        id: node.id,
        tourId: node.getAttribute("data-tour-id"),
        heading: node.querySelector("h1,h2,h3")?.textContent?.trim(),
      })),
  });
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
  const [currentGuideMessageId, setCurrentGuideMessageId] = useState<string | null>(null);
  const [activeCompletionWidget, setActiveCompletionWidget] = useState<CompletionWidget>(null);
  const [shellCheckInDate, setShellCheckInDate] = useState("2026-06-12");
  const [shellCheckOutDate, setShellCheckOutDate] = useState("2026-06-15");
  const [shellDatesApplied, setShellDatesApplied] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<DatePickerKind>(null);
  const [shellAdults, setShellAdults] = useState(1);
  const [shellChildren, setShellChildren] = useState(0);
  const [shellGuestsApplied, setShellGuestsApplied] = useState(false);
  const [shellBudgetBand, setShellBudgetBand] = useState<BudgetBand | "">("");
  const [shellBreakfastRequested, setShellBreakfastRequested] = useState(false);
  const [lastRefinementChipClicked, setLastRefinementChipClicked] = useState<string | null>(null);

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
  const modeCopy = guideModeCopy(guideConfig);
  const [visualViewportHeight, setVisualViewportHeight] = useState(() => {
    if (typeof window === "undefined") return 760;
    return Math.round(window.visualViewport?.height || window.innerHeight || 760);
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
    if (isCoarsePointer() || isBotTyping || autoMinimizeDisabledRef.current) {
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

  const collapsePanelForMobileAction = (nextThread?: ThreadItem[]) => {
    if (!isCoarsePointer()) return;

    const threadToKeep = nextThread?.length ? nextThread : threadStateRef.current;
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

    setIsBotTyping(false);
    setDraftFocus(false);
    setDraftValue("");
    setThread([]);
    setSpotlightActive(false);
    setGuideSteps([]);
    setCurrentGuideStepIndex(0);
    setCurrentGuideMessageId(null);
    setActiveCompletionWidget(null);
    setActiveDatePicker(null);
    setLastRefinementChipClicked(null);
    setShowWelcome(true);
    setShellState("welcome");
  };

  useEffect(() => {
    const updateViewportState = () => {
      const viewportHeight = Math.round(
        window.visualViewport?.height || window.innerHeight || 760,
      );
      const viewportOffsetTop = Math.round(window.visualViewport?.offsetTop || 0);
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
        (event as CustomEvent<{
          targetId?: string;
          selector?: string;
          targetText?: string;
          pageId?: string;
          pageUrl?: string;
        }>).detail || {};

      const targetId = (detail.targetId || "").trim();
      const selector = (detail.selector || "").trim();
      if (!targetId && !selector) return;

      clearActiveSpotlight();
      setSpotlightActive(false);

      let found = false;
      [80, 220, 420, 700, 1100, 1500].forEach((delay) => {
        window.setTimeout(() => {
          if (found) return;

          const target = findExactExternalSpotlightTarget(targetId, selector);
          if (!target) return;

          found = true;
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });

          window.setTimeout(() => {
            spotlightTarget(target);
            setSpotlightActive(true);
          }, 260);
        }, delay);
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

  const buildConversationContext = (currentMessage: string): GuideConversationContext => {
    const recentUserMessages = threadStateRef.current
      .filter((item) => item.role === "user" && item.status !== "thinking")
      .slice(-4)
      .map((item) => item.body)
      .filter(Boolean);

    const recentBot = [...threadStateRef.current]
      .reverse()
      .find((item) => item.role === "bot" && item.status !== "thinking");

    const trimmedSteps = guideSteps.slice(0, 6).map((step) => ({
      type: step.type,
      targetId: step.targetId,
      pageId: step.pageId,
      pageUrl: step.pageUrl,
      targetText: step.targetText,
      reason: step.reason,
    }));

    return {
      lastUserMessage: currentMessage || recentUserMessages[recentUserMessages.length - 1] || undefined,
      recentUserMessages,
      recentBotSummary: recentBot?.body?.slice(0, 900),
      currentGuideStepIndex,
      currentGuideSteps: trimmedSteps,
      currentGuideStep: trimmedSteps[currentGuideStepIndex] || null,
      lastRefinementChipClicked,
      commerceContext: buildCommerceContext(),
    };
  };

  const normalizeBudgetBand = (value?: string | null): BudgetBand | "" => {
    const normalized = (value || "").trim().toLowerCase();
    const match = BUDGET_BANDS.find((band) => band.toLowerCase() === normalized);
    return match || "";
  };

  const mergeExtractedBookingContext = (context?: ExtractedBookingContext | null) => {
    if (!context || guideConfig?.mode !== "commerce") return;

    const nextCheckIn = typeof context.checkInDate === "string" ? context.checkInDate : "";
    const nextCheckOut = typeof context.checkOutDate === "string" ? context.checkOutDate : "";
    if (nextCheckIn && nextCheckOut && nextCheckOut > nextCheckIn) {
      setShellCheckInDate(nextCheckIn);
      setShellCheckOutDate(nextCheckOut);
      setShellDatesApplied(true);
      setActiveCompletionWidget((current) => (current === "dates" ? null : current));
    }

    const adults = typeof context.adults === "number" ? context.adults : null;
    const children = typeof context.children === "number" ? context.children : null;
    if (adults !== null || children !== null) {
      setShellAdults(Math.max(1, Math.min(8, Math.round(adults ?? 1))));
      setShellChildren(Math.max(0, Math.min(8, Math.round(children ?? 0))));
      setShellGuestsApplied(true);
      setActiveCompletionWidget((current) => (current === "guests" ? null : current));
    }

    const budgetBand = normalizeBudgetBand(context.budgetBand || null);
    if (budgetBand) {
      setShellBudgetBand(budgetBand);
      setActiveCompletionWidget((current) => (current === "budget" ? null : current));
    }

    if (context.breakfastRequested === true) {
      setShellBreakfastRequested(true);
    }
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

    clearReplyTimer();
    clearMinimizeTimer();
    clearActiveSpotlight();
    setSpotlightActive(false);
    setGuideSteps([]);
    setCurrentGuideStepIndex(0);
    setCurrentGuideMessageId(null);

    suppressNextDraftScrollRef.current = true;

    const submittedId = makeId();

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
      const reply = await callGuideAi(trimmed, guideConfig, conversationContext);
      mergeExtractedBookingContext(reply.extractedBookingContext);
      const remaining = Math.max(
        0,
        MIN_THINKING_MS - (performance.now() - startedAt),
      );
      if (remaining > 0) {
        await wait(remaining);
      }

      const nextGuideSteps = normalizeGuideSteps(reply);
      const isMultiStepGuide = nextGuideSteps.length > 1;
      const botMessageId = makeId();
      const firstStepParts = isMultiStepGuide
        ? answerPartsForGuideStep(nextGuideSteps[0], 0, nextGuideSteps.length)
        : reply.answerParts;
      const botBody = isMultiStepGuide
        ? answerBodyFromParts(firstStepParts || {}) || reply.body
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
          refinementChips: reply.refinementChips,
          suggestedAction: reply.suggestedAction,
        },
      ];
      threadStateRef.current = completedThread;
      setThread(completedThread);
      rememberShellSession("panel", completedThread);

      setGuideSteps(nextGuideSteps);
      setCurrentGuideStepIndex(0);
      setCurrentGuideMessageId(isMultiStepGuide ? botMessageId : null);
      setLastRefinementChipClicked(null);

      window.setTimeout(() => {
        runSuggestedNavigation(nextGuideSteps[0] || reply.suggestedAction, completedThread, () =>
          setSpotlightActive(true),
        );
        collapsePanelAfterMobileResponse(completedThread);
      }, 350);

      emitDemoResponseComplete({
        ok: true,
        hasNavigation: nextGuideSteps.length > 0 || reply.suggestedAction?.type === "navigate",
        stepCount: nextGuideSteps.length,
        isMultiStep: isMultiStepGuide,
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

  const hasGuideSteps = guideSteps.length > 0;
  const hasMultipleGuideSteps = guideSteps.length > 1;
  const currentGuideStep = hasGuideSteps ? guideSteps[currentGuideStepIndex] : null;
  const showBookAction = Boolean(
    guideConfig?.mode === "commerce" &&
      guideConfig?.features?.bookingActions &&
      guideSteps.some((step) => step?.targetId?.startsWith("room-")),
  );

  const navigateToGuideStep = (nextIndex: number) => {
    if (!guideSteps.length) return;

    const boundedIndex = Math.max(0, Math.min(nextIndex, guideSteps.length - 1));
    const step = guideSteps[boundedIndex];
    if (!step) return;

    clearActiveSpotlight();
    setSpotlightActive(false);
    setCurrentGuideStepIndex(boundedIndex);

    let nextThread = threadStateRef.current;
    if (currentGuideMessageId) {
      const parts = answerPartsForGuideStep(step, boundedIndex, guideSteps.length);
      const body = answerBodyFromParts(parts);
      nextThread = threadStateRef.current.map((item) =>
        item.id === currentGuideMessageId
          ? { ...item, body, answerParts: parts, suggestedAction: step }
          : item,
      );
      threadStateRef.current = nextThread;
      setThread(nextThread);
      rememberShellSession(isCoarsePointer() ? "launcher" : shellState, nextThread);
    }

    collapsePanelForMobileAction(nextThread);

    window.setTimeout(() => {
      runSuggestedNavigation(step, nextThread, () => setSpotlightActive(true));
    }, isCoarsePointer() ? 60 : 120);
  };

  const acknowledgeSpotlight = () => {
    clearActiveSpotlight();
    setSpotlightActive(false);
    setGuideSteps([]);
    setCurrentGuideStepIndex(0);
    setCurrentGuideMessageId(null);
    setActiveCompletionWidget(null);
    setActiveDatePicker(null);

    try {
      window.sessionStorage.removeItem(GUIDE_PENDING_SPOTLIGHT_KEY);
    } catch {
      // Ignore storage failures in private/incognito contexts.
    }
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
  });

  const bookCurrentGuideStep = () => {
    const bookableStep =
      currentGuideStep?.targetId?.startsWith("room-")
        ? currentGuideStep
        : guideSteps.find((step) => step?.targetId?.startsWith("room-")) ||
          currentGuideStep ||
          guideSteps[0] ||
          null;
    const targetId = bookableStep?.targetId || null;

    window.dispatchEvent(
      new CustomEvent("guide-commerce-book", {
        detail: {
          targetId,
          step: bookableStep,
          commerceContext: buildCommerceContext(),
        },
      }),
    );

    collapsePanelForMobileAction(threadStateRef.current);
  };

  const chipToPrompt = (chip: string) => {
    const clean = chip.trim();
    if (!clean) return "";

    const lower = clean.toLowerCase();
    if (lower === "select dates") return "I want to select dates.";
    if (lower === "add guests") return "I want to add guests.";
    if (lower === "add breakfast") return "Add breakfast to this stay.";
    if (lower === "set budget") return "I want to set a budget.";
    if (lower.startsWith("show ")) return clean.endsWith(".") ? clean : `${clean}.`;
    if (lower.startsWith("add ")) return clean.endsWith(".") ? clean : `${clean}.`;
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

  const selectShellCalendarDate = (kind: Exclude<DatePickerKind, null>, value: string) => {
    if (kind === "check-in") {
      setShellCheckInDate(value);
      if (!shellCheckOutDate || shellCheckOutDate <= value) {
        setShellCheckOutDate(addDaysToIsoDate(value, 1));
      }
    } else {
      setShellCheckOutDate(value);
    }

    setShellDatesApplied(false);
    setActiveDatePicker(null);
  };

  const renderShellCalendar = (kind: Exclude<DatePickerKind, null>) => {
    const year = 2026;
    const monthIndex = 6; // July 2026. Kept fixed for the scripted demo path.
    const monthName = new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    const selected = kind === "check-in" ? shellCheckInDate : shellCheckOutDate;

    return (
      <motion.div
        key={`calendar-${kind}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {kind === "check-in" ? "Check-in calendar" : "Check-out calendar"}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-950">{monthName}</div>
          </div>
          <button
            type="button"
            onClick={() => setActiveDatePicker(null)}
            className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            Collapse
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {blanks.map((_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {days.map((day) => {
            const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = selected === value;
            const isDemoTarget =
              (kind === "check-in" && value === "2026-07-10") ||
              (kind === "check-out" && value === "2026-07-14");
            const disabled = Boolean(kind === "check-out" && shellCheckInDate && value <= shellCheckInDate);

            return (
              <button
                key={value}
                data-demo-target={isDemoTarget ? `calendar-${kind}-${value}` : undefined}
                type="button"
                disabled={disabled}
                onClick={() => selectShellCalendarDate(kind, value)}
                className={`rounded-xl px-0 py-2 text-xs font-semibold transition ${
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

  const appendDraftInstruction = (instruction: string) => {
    const cleanInstruction = instruction.trim();
    if (!cleanInstruction) return;

    const sentence =
      cleanInstruction.endsWith(".") ||
      cleanInstruction.endsWith("?") ||
      cleanInstruction.endsWith("!")
        ? cleanInstruction
        : `${cleanInstruction}.`;

    clearMinimizeTimer();
    suppressNextDraftScrollRef.current = true;

    setDraftValue((current) => {
      const trimmedCurrent = current.trim();
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
    const lower = clean.toLowerCase();
    if (clean) setLastRefinementChipClicked(clean);

    if (guideConfig?.mode === "commerce" && lower === "select dates") {
      setActiveCompletionWidget("dates");
      setActiveDatePicker(null);
      clearMinimizeTimer();
      return;
    }

    if (guideConfig?.mode === "commerce" && lower === "add guests") {
      setActiveCompletionWidget("guests");
      clearMinimizeTimer();
      return;
    }

    if (guideConfig?.mode === "commerce" && lower === "set budget") {
      setActiveCompletionWidget("budget");
      clearMinimizeTimer();
      return;
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
      navigateToGuideStep(currentGuideStepIndex + 1);
      return;
    }

    if (demoCommand.type === "got-it") {
      acknowledgeSpotlight();
      return;
    }

    if (demoCommand.type === "book") {
      bookCurrentGuideStep();
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
                TourBot answers questions, guides users through the right site sections, and preloads forms or booking steps from natural-language intent.
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
              <div className={`flex shrink-0 items-center justify-between border-b border-slate-200 px-4 ${keyboardCompressed ? "py-2" : "py-3 sm:px-5 sm:py-4"}`}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-2xl bg-slate-900 p-2 text-white">
                    <Compass className="h-4 w-4" />
                  </span>

                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      TourBot
                    </div>
                    <div className="text-xs text-slate-500">
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
                  keyboardCompressed || (coarsePointer && thread.length > 1)
                    ? "hidden"
                    : "shrink-0 border-b border-slate-200 px-4 py-2.5 sm:px-5 sm:py-3"
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
                className={`min-h-0 flex-1 overflow-y-auto bg-slate-50 ${keyboardCompressed ? "px-2 py-2" : "px-3 py-3 sm:px-5 sm:py-4"}` }
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
                className={`shrink-0 bg-white ${keyboardCompressed ? "px-2 py-2" : "px-3 py-3 sm:px-5 sm:py-4"}` }
              >
                {(spotlightActive || hasGuideSteps) && (
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
                      ) : (
                        <div className="font-semibold text-slate-700">Guide spotlight</div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {hasMultipleGuideSteps && (
                        <>
                          <button
                            onClick={() => navigateToGuideStep(currentGuideStepIndex - 1)}
                            disabled={currentGuideStepIndex <= 0}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Back
                          </button>
                          <button
                            data-demo-target="guide-next"
                            onClick={() => navigateToGuideStep(currentGuideStepIndex + 1)}
                            disabled={currentGuideStepIndex >= guideSteps.length - 1}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next
                          </button>
                        </>
                      )}

                      {showBookAction && (
                        <button
                          data-demo-target="guide-book"
                          onClick={bookCurrentGuideStep}
                          className="rounded-full bg-cyan-950 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-900"
                        >
                          Book this
                        </button>
                      )}

                      <button
                        data-demo-target="guide-got-it"
                        onClick={acknowledgeSpotlight}
                        className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {activeCompletionWidget && guideConfig?.mode === "commerce" && (
                    <motion.div
                      key={activeCompletionWidget}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 shadow-sm sm:p-3"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {activeCompletionWidget === "dates"
                              ? "Select dates"
                              : activeCompletionWidget === "guests"
                                ? "Add guests"
                                : "Set budget"}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            {activeCompletionWidget === "dates"
                              ? "Choose check-in and check-out before handing off to booking."
                              : activeCompletionWidget === "guests"
                                ? "Set the guest count so the guide can preserve capacity context."
                                : "Choose a budget band to steer recommendations without forcing exact pricing."}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCompletionWidget(null);
                            setActiveDatePicker(null);
                          }}
                          className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white"
                        >
                          Close
                        </button>
                      </div>

                      {activeCompletionWidget === "dates" && (
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              data-demo-target="date-check-in-expand"
                              type="button"
                              onClick={() => setActiveDatePicker((current) => current === "check-in" ? null : "check-in")}
                              className={`rounded-xl bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 ${
                                activeDatePicker === "check-in" ? "ring-2 ring-slate-900/10" : ""
                              }`}
                            >
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Check-in
                              </span>
                              <span className="mt-1 block text-sm font-semibold text-slate-950">
                                {formatShellDate(shellCheckInDate)}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                Expand calendar
                              </span>
                            </button>

                            <button
                              data-demo-target="date-check-out-expand"
                              type="button"
                              onClick={() => setActiveDatePicker((current) => current === "check-out" ? null : "check-out")}
                              className={`rounded-xl bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50 ${
                                activeDatePicker === "check-out" ? "ring-2 ring-slate-900/10" : ""
                              }`}
                            >
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Check-out
                              </span>
                              <span className="mt-1 block text-sm font-semibold text-slate-950">
                                {formatShellDate(shellCheckOutDate)}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                Expand calendar
                              </span>
                            </button>
                          </div>

                          <AnimatePresence mode="wait">
                            {activeDatePicker === "check-in" && renderShellCalendar("check-in")}
                            {activeDatePicker === "check-out" && renderShellCalendar("check-out")}
                          </AnimatePresence>
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className="text-xs text-slate-500">
                              {shellDatesApplied
                                ? `Saved: ${formatShellDateRange(shellCheckInDate, shellCheckOutDate)}`
                                : shellCheckInDate && shellCheckOutDate && shellCheckOutDate > shellCheckInDate
                                  ? "Ready to save dates."
                                  : "Choose a check-out date after check-in."}
                            </div>
                            <button
                              data-demo-target="apply-dates"
                              type="button"
                              disabled={!shellCheckInDate || !shellCheckOutDate || shellCheckOutDate <= shellCheckInDate}
                              onClick={() => {
                                const dateLabel = formatShellDateRange(shellCheckInDate, shellCheckOutDate);
                                setShellDatesApplied(true);
                                setActiveCompletionWidget(null);
                                setActiveDatePicker(null);
                                appendDraftInstruction(`Use ${dateLabel} for this stay.`);
                              }}
                              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              Apply dates
                            </button>
                          </div>
                        </div>
                      )}

                      {activeCompletionWidget === "guests" && (
                        <div className="space-y-3">
                          {[
                            { label: "Adults", value: shellAdults, setValue: setShellAdults, min: 1 },
                            { label: "Children", value: shellChildren, setValue: setShellChildren, min: 0 },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  {item.label}
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">
                                  {item.value}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  data-demo-target={item.label === "Adults" ? "guest-adults-minus" : "guest-children-minus"}
                                  type="button"
                                  onClick={() => {
                                    item.setValue(Math.max(item.min, item.value - 1));
                                    setShellGuestsApplied(false);
                                  }}
                                  className="h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  −
                                </button>
                                <button
                                  data-demo-target={item.label === "Adults" ? "guest-adults-plus" : "guest-children-plus"}
                                  type="button"
                                  onClick={() => {
                                    item.setValue(item.value + 1);
                                    setShellGuestsApplied(false);
                                  }}
                                  className="h-8 w-8 rounded-full bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className="text-xs text-slate-500">
                              {shellGuestsApplied ? `Saved: ${guestSummary(shellAdults, shellChildren)}` : "Ready to save guests."}
                            </div>
                            <button
                              data-demo-target="apply-guests"
                              type="button"
                              onClick={() => {
                                const guestsLabel = guestSummary(shellAdults, shellChildren);
                                setShellGuestsApplied(true);
                                setActiveCompletionWidget(null);
                                appendDraftInstruction(`Add ${guestsLabel} for this stay.`);
                              }}
                              className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                            >
                              Apply guests
                            </button>
                          </div>
                        </div>
                      )}

                      {activeCompletionWidget === "budget" && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {BUDGET_BANDS.map((band) => (
                            <button
                              key={band}
                              data-demo-target={`budget-${band.toLowerCase()}`}
                              type="button"
                              onClick={() => {
                                const budgetPrompt = `Use a ${band.toLowerCase()} budget for this stay.`;
                                setShellBudgetBand(band);
                                setActiveCompletionWidget(null);
                                appendDraftInstruction(budgetPrompt);
                              }}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                shellBudgetBand === band
                                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="text-sm font-semibold">{band}</div>
                              <div className={`mt-1 text-xs ${shellBudgetBand === band ? "text-white/70" : "text-slate-500"}`}>
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

                      {(shellDatesApplied || shellGuestsApplied || shellBudgetBand || shellBreakfastRequested) && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                          {shellDatesApplied && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              {formatShellDateRange(shellCheckInDate, shellCheckOutDate)}
                            </span>
                          )}
                          {shellGuestsApplied && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              {guestSummary(shellAdults, shellChildren)}
                            </span>
                          )}
                          {shellBudgetBand && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
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
                      if (!submitInFlightRef.current) setKeyboardCompressed(false);
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

      {shellState === "launcher" && (
        <motion.button
          key="launcher"
          {...baseMotion}
          style={toastPosition}
          data-demo-target="guide-launcher"
          onClick={openPanel}
          className="inline-flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-xl transition hover:bg-slate-50"
        >
          <span className="inline-flex rounded-full bg-slate-900 p-2 text-white animate-pulse">
            <Compass className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-slate-900">
            TourBot active
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default GuideShellStatic;
