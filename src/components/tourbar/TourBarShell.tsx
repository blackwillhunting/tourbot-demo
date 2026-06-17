import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  buildTourBarCollectionResult,
  buildTourBarScopeLimitResult,
  isTourBarAnswerOnlyResult,
  TourBarBookingContextPanel,
  tourBarCollectionFieldFromResult,
  tourBarPendingQueryFromResult,
  tourBarScopeLimitKindFromPrompt,
  useTourBarBookingContext,
  type TourBarBookingContext,
  type TourBarDatePickerKind,
  type TourBarRequiredBookingField,
} from "./tourbarBookingContext";
import { smartbarFocusTarget } from "./smartbarFocusController";
import ThinkingText from "./ThinkingText";
import TourBarConsultantChat, {
  type TourBarConsultantChatMessage,
  type TourBarConsultantChatCopy,
} from "./TourBarConsultantChat";
import { getSmartBarMobileShellStyles } from "./smartbar-mobile/smartBarMobileStyles";
import {
  ArrowRight,
  Compass,
  Loader2,
  MessageSquare,
  Search,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";

const TOURBAR_SHEET_TRANSITION_SECONDS = 0.66;
const TOURBAR_MOBILE_SHEET_TRANSITION_SECONDS = 1.04;
const TOURBAR_SHEET_RETRACT_MS = 680;
const TOURBAR_MOBILE_SHEET_RETRACT_MS = 1060;

export type TourBarInvitation = {
  kind?: string;
  text: string;
};

export type TourBarNextMove = {
  type?:
    | "ask_deeper"
    | "simplify"
    | "show_steps"
    | "show_use_cases"
    | "compare_options"
    | "show_related_area"
    | "collect_context"
    | "handoff"
    | "stop"
    | string;
  label?: string;
  query?: string;
  focusAreaId?: string;
};

export type TourBarThreadMessage = {
  role: "visitor" | "tourbar";
  content: string;
  focusAreaId?: string;
  answerMode?: string;
};

export type TourBarShellResult = {
  title: string;
  body?: string;
  invitation?: TourBarInvitation;
  nextMove?: TourBarNextMove;
  canFollowUp?: boolean;
  focusAreaId?: string;
  answerMode?: string;
  pageId?: string;
  targetId?: string;
  targetSelector?: string;
  label?: string;
  mode?: string;
  action?: string;
  raw?: unknown;
};

export type TourBarShellTurnContext = {
  currentResult: TourBarShellResult | null;
  thread: TourBarThreadMessage[];
  bookingContext?: TourBarBookingContext | null;
};

export type TourBarShellTurnKind = "primary" | "followup";

export type TourBarShellActions = {
  submitFollowUp: (query: string) => void;
  submitPrimary: (query: string, bookingContextOverride?: TourBarBookingContext | null) => void;
  openStandaloneSheet: (result?: TourBarShellResult | null) => void;
  closeSheet: () => void;
  openBookingContextSheet: (field: TourBarRequiredBookingField) => void;
  bookingContext: TourBarBookingContext;
};

export type TourBarConsultantChatConfig = TourBarConsultantChatCopy & {
  enabled?: boolean;
};

export type TourBarShellDemoCommand = {
  id: number;
  type:
    | "open"
    | "closeBar"
    | "closeSheet"
    | "closeChat"
    | "clearChat"
    | "closeAll"
    | "setPrimary"
    | "submitPrimary"
    | "setFollowUp"
    | "submitFollowUp"
    | "runNextMove"
    | "openChat"
    | "setChatDraft"
    | "submitChat"
    | "openBookingContext"
    | "setBookingContext"
    | "selectBookingDate"
    | "setBookingGuestCount"
    | "commitBookingContext"
    | "showThinking"
    | "showResult";
  value?: string;
  field?: TourBarRequiredBookingField;
  dateKind?: Exclude<TourBarDatePickerKind, null>;
  guestAdults?: number;
  guestChildren?: number;
  bookingContext?: TourBarBookingContext;
  result?: TourBarShellResult;
};

export type TourBarShellAppearance = "auto" | "light" | "dark";
export type TourBarShellSheetRevealMode = "native" | "composerClip";
export type TourBarShellChromeVariant = "default" | "blueCoreGlass";

export type TourBarShellProps = {
  primaryPlaceholder?: string;
  followUpPlaceholder?: string;
  launcherTitle?: string;
  launcherAriaLabel?: string;
  resultEyebrow?: string;
  initialLoadingMessage?: string;
  followUpLoadingMessage?: string;
  requireBookingContext?: boolean;
  appearance?: TourBarShellAppearance;
  smartBarMobileChrome?: boolean;
  desktopCompassChrome?: boolean;
  sheetRevealMode?: TourBarShellSheetRevealMode;
  chromeVariant?: TourBarShellChromeVariant;
  consultantChat?: TourBarConsultantChatConfig;
  demoCommand?: TourBarShellDemoCommand | null;
  onPrimarySubmit: (query: string, context: TourBarShellTurnContext) => Promise<TourBarShellResult>;
  onFollowUpSubmit?: (query: string, context: TourBarShellTurnContext) => Promise<TourBarShellResult>;
  getNextMoveTurnKind?: (nextMove: TourBarNextMove | undefined, currentResult: TourBarShellResult | null) => TourBarShellTurnKind;
  onResult?: (result: TourBarShellResult, turnKind: TourBarShellTurnKind) => void;
  onNextMove?: (result: TourBarShellResult, nextMove: TourBarNextMove | undefined) => boolean | void;
  buildThreadMessage?: (result: TourBarShellResult) => string;
  renderResultExtras?: (result: TourBarShellResult, actions: TourBarShellActions) => ReactNode;
  renderStandaloneSheet?: (result: TourBarShellResult, actions: TourBarShellActions) => ReactNode;
  renderMobileControls?: (result: TourBarShellResult, actions: TourBarShellActions) => ReactNode;
  beforeResultReveal?: (result: TourBarShellResult, turnKind: TourBarShellTurnKind) => Promise<void> | void;
};

function resultMessage(result: TourBarShellResult | null) {
  if (!result) return "";
  const invitation = result.invitation?.text || result.nextMove?.label || "";
  return [result.title, result.body, invitation].filter(Boolean).join("\n");
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function dismissSmartBarKeyboard() {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;
  if (activeElement && activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

function makeConsultantChatId() {
  return Math.random().toString(36).slice(2, 10);
}

function compactIntentText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function textLooksLikeConsultantRequest(value?: string | null) {
  const text = compactIntentText(value);
  if (!text) return false;

  return /\b(talk|speak|chat|connect|contact|call|reach)\b/.test(text) &&
    /\b(consultant|specialist|advisor|adviser|expert|sales|someone|person|human|representative|rep|team)\b/.test(text);
}

function textLooksLikeConsultantAcceptance(value?: string | null) {
  const text = compactIntentText(value);
  if (!text) return false;

  return (
    /^(yes|yeah|yep|sure|ok|okay|please|do that|that works|sounds good)\b/.test(text) ||
    /\b(connect me|talk to someone|speak to someone|contact me|put me in touch|consultant|specialist|human)\b/.test(text)
  );
}

function resultLooksLikeConsultantOffer(result?: TourBarShellResult | null, nextMove?: TourBarNextMove) {
  const text = compactIntentText([
    result?.title,
    result?.body,
    result?.invitation?.text,
    result?.nextMove?.label,
    result?.nextMove?.query,
    result?.nextMove?.type,
    nextMove?.label,
    nextMove?.query,
    nextMove?.type,
  ].filter(Boolean).join(" "));

  if (!text) return false;

  const hasHumanTarget = /\b(consultant|consultation|specialist|advisor|adviser|expert|sales|someone|person|human|representative|rep|team)\b/.test(text);
  const hasHandoffVerb = /\b(talk|speak|chat|connect|contact|call|handoff|consultation|intake)\b/.test(text);

  return hasHumanTarget && hasHandoffVerb;
}

function consultantChatIsEnabled(config?: TourBarConsultantChatConfig) {
  return Boolean(config?.enabled);
}

type TourBarSpeedDemoMeta = {
  keepSheetOpenNextMove?: boolean;
  separateSheetNextMove?: boolean;
  stableSheetKey?: string;
  readyPillLabel?: string;
  thinkingOnNextMove?: boolean;
  nextMoveLoadingMessage?: string;
};

export type TourBarMobileFooterMode =
  | "launch"
  | "compose"
  | "thinking"
  | "result"
  | "chat"
  | "collection"
  | "error";

function speedDemoMeta(result?: TourBarShellResult | null): TourBarSpeedDemoMeta {
  const raw = result?.raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const meta = (raw as { __speedDemo?: unknown }).__speedDemo;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};

  return meta as TourBarSpeedDemoMeta;
}

function normalizeMarkdownLite(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/:\s+-\s+/g, ":\n- ")
    .replace(/\s+-\s+(?=[A-Z0-9])/g, "\n- ")
    .trim();
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${part}-${index}`} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function MarkdownLite({ text }: { text: string }) {
  const lines = normalizeMarkdownLite(text).split("\n");
  const blocks: Array<{ type: "paragraph" | "bullets" | "ordered"; items: string[] }> = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", items: [paragraph.join(" ").replace(/\s+/g, " ").trim()] });
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch || orderedMatch) {
      flushParagraph();
      const type = bulletMatch ? "bullets" : "ordered";
      const item = (bulletMatch?.[1] || orderedMatch?.[1] || "").trim();
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.type === type) {
        lastBlock.items.push(item);
      } else {
        blocks.push({ type, items: [item] });
      }
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  if (!blocks.length) return null;

  return (
    <div className="space-y-2.5 text-sm leading-6 text-slate-700">
      {blocks.map((block, blockIndex) => {
        if (block.type === "bullets") {
          return (
            <ul key={`bullets-${blockIndex}`} className="ml-4 list-disc space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered") {
          return (
            <ol key={`ordered-${blockIndex}`} className="ml-4 list-decimal space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="pl-1">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`}>
            {renderInlineMarkdown(block.items[0] || "")}
          </p>
        );
      })}
    </div>
  );
}


const SMARTBAR_MOBILE_ACTION_RESULT_MODES = new Set([
  "speed_order",
  "speed_needs_context",
  "speed_booking_reco",
  "speed_package",
  "speed_family_reco",
  "speed_booking_confirm",
  "speed_after_hours",
  "speed_tiles",
  "tourbar_collect_dates",
  "tourbar_collect_guests",
]);

function shouldUseMobileActionResult(result?: TourBarShellResult | null) {
  if (!result?.mode) return false;
  return SMARTBAR_MOBILE_ACTION_RESULT_MODES.has(result.mode);
}

function stripMobileMarkdownText(text: string) {
  return normalizeMarkdownLite(text)
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function compactMobileResultText(text: string) {
  const clean = stripMobileMarkdownText(text);
  if (clean.length <= 240) return clean;

  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [];
  const firstTwoSentences = sentences.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();

  if (firstTwoSentences && firstTwoSentences.length <= 260) return firstTwoSentences;
  if (firstTwoSentences) return `${firstTwoSentences.slice(0, 257).trim()}…`;

  return `${clean.slice(0, 237).trim()}…`;
}

function MobilePlainText({ text, appearance = "dark" }: { text: string; appearance?: TourBarShellAppearance }) {
  if (!text) return null;

  return (
    <p className={`text-[15px] font-semibold leading-6 ${appearance === "light" ? "text-slate-700" : "text-slate-100/88"}`}>
      {text}
    </p>
  );
}

function MobileSheetTitleRail({ title, appearance = "dark" }: { title?: string; appearance?: TourBarShellAppearance }) {
  if (!title) return null;

  return (
    <div className={`shrink-0 px-3 pb-2 pt-1 text-left text-[12px] font-black uppercase tracking-[0.14em] ${appearance === "light" ? "text-slate-600" : "text-white/86"}`}>
      {title}
    </div>
  );
}




export type TourBarPageFocusTarget = {
  pageId?: string;
  targetId?: string;
  targetSelector?: string;
  label?: string;
};

export async function focusTourBarPageTarget(
  target: TourBarPageFocusTarget,
  options: { initialDelayMs?: number } = {},
) {
  return smartbarFocusTarget(target, {
    initialDelayMs: options.initialDelayMs,
    dispatchLegacyEvent: false,
  });
}


function resolveTourBarShellAppearance(appearance: TourBarShellAppearance, _isPhoneViewport: boolean) {
  if (appearance === "auto") return "light";
  return appearance;
}

function isSmartBarPhoneViewport() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(max-width: 767px)").matches ||
    /Android|iPhone|iPod|Mobile/i.test(window.navigator.userAgent)
  );
}

export default function TourBarShell({
  primaryPlaceholder = "Ask in plain English...",
  followUpPlaceholder = "Ask a follow-up...",
  launcherTitle = "TourBar natural-language search",
  launcherAriaLabel = "Open TourBar natural-language search",
  resultEyebrow = "Focus result",
  initialLoadingMessage = "Finding the right part of this site…",
  followUpLoadingMessage = "Thinking through that follow-up…",
  requireBookingContext = false,
  appearance = "dark",
  smartBarMobileChrome = false,
  desktopCompassChrome = false,
  sheetRevealMode = "native",
  chromeVariant = "default",
  consultantChat,
  demoCommand,
  onPrimarySubmit,
  onFollowUpSubmit,
  getNextMoveTurnKind,
  onResult,
  onNextMove,
  buildThreadMessage = resultMessage,
  renderResultExtras,
  renderStandaloneSheet,
  renderMobileControls,
  beforeResultReveal,
}: TourBarShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(initialLoadingMessage);
  const [result, setResult] = useState<TourBarShellResult | null>(null);
  const [standaloneResult, setStandaloneResult] = useState<TourBarShellResult | null>(null);
  const [thread, setThread] = useState<TourBarThreadMessage[]>([]);
  const [error, setError] = useState("");
  const queryRef = useRef<HTMLTextAreaElement | null>(null);
  const followUpRef = useRef<HTMLTextAreaElement | null>(null);
  const bookingContextController = useTourBarBookingContext();
  const [bookingContextReturnResult, setBookingContextReturnResult] = useState<TourBarShellResult | null>(null);
  const [consultantChatAvailable, setConsultantChatAvailable] = useState(false);
  const [consultantChatOpen, setConsultantChatOpen] = useState(false);
  const [consultantChatDraft, setConsultantChatDraft] = useState("");
  const [consultantChatThread, setConsultantChatThread] = useState<TourBarConsultantChatMessage[]>([]);
  const [consultantChatWaiting, setConsultantChatWaiting] = useState(false);
  const pendingConsultantOfferRef = useRef(false);
  const consultantChatAutoStartedRef = useRef(false);
  const [isPhoneShellViewport, setIsPhoneShellViewport] = useState(() => isSmartBarPhoneViewport());
  const [mobileComposerCollapsed, setMobileComposerCollapsed] = useState(false);
  const [primaryComposerFocused, setPrimaryComposerFocused] = useState(false);

  useEffect(() => {
    const viewportQuery = window.matchMedia("(max-width: 767px)");
    const updatePhoneViewport = () => setIsPhoneShellViewport(isSmartBarPhoneViewport());

    updatePhoneViewport();
    viewportQuery.addEventListener("change", updatePhoneViewport);
    window.addEventListener("orientationchange", updatePhoneViewport);

    return () => {
      viewportQuery.removeEventListener("change", updatePhoneViewport);
      window.removeEventListener("orientationchange", updatePhoneViewport);
    };
  }, []);

  useEffect(() => {
    if (!isPhoneShellViewport) setMobileComposerCollapsed(false);
  }, [isPhoneShellViewport]);

  const openComposer = () => {
    setIsOpen(true);
    setMobileComposerCollapsed(false);

    if (isPhoneShellViewport) {
      window.requestAnimationFrame(() => {
        queryRef.current?.focus();
        resizeTextarea(queryRef.current);
      });
    }
  };

  const collapseMobileComposer = () => {
    if (isPhoneShellViewport) setMobileComposerCollapsed(true);
  };

  const activeFollowUpResult = standaloneResult || result;
  const canUseMobilePrimaryFollowUp =
    isPhoneShellViewport &&
    Boolean(onFollowUpSubmit && activeFollowUpResult && activeFollowUpResult.canFollowUp !== false);
  const canSubmit = query.trim().length > 1 && !isLoading && !isAnswering;
  const canAskFollowUp =
    followUp.trim().length > 1 &&
    !isLoading &&
    !isAnswering &&
    Boolean(onFollowUpSubmit && activeFollowUpResult?.canFollowUp !== false);
  const primaryComposerPlaceholder = canUseMobilePrimaryFollowUp ? followUpPlaceholder : primaryPlaceholder;
  const sheetTransitionSeconds = isPhoneShellViewport
    ? TOURBAR_MOBILE_SHEET_TRANSITION_SECONDS
    : TOURBAR_SHEET_TRANSITION_SECONDS;
  const sheetRetractMs = isPhoneShellViewport
    ? TOURBAR_MOBILE_SHEET_RETRACT_MS
    : TOURBAR_SHEET_RETRACT_MS;

  useEffect(() => {
    if (!isOpen || mobileComposerCollapsed) return;
    window.requestAnimationFrame(() => {
      queryRef.current?.focus();
      resizeTextarea(queryRef.current);
    });
  }, [isOpen, mobileComposerCollapsed]);

  useEffect(() => {
    resizeTextarea(queryRef.current);
  }, [query]);

  useEffect(() => {
    resizeTextarea(followUpRef.current);
  }, [followUp, activeFollowUpResult?.canFollowUp]);

  const appendThread = (priorThread: TourBarThreadMessage[], visitorMessage: string, tourBarResult: TourBarShellResult) => {
    setThread([
      ...priorThread,
      { role: "visitor", content: visitorMessage },
      {
        role: "tourbar",
        content: buildThreadMessage(tourBarResult),
        focusAreaId: tourBarResult.focusAreaId,
        answerMode: tourBarResult.answerMode,
      },
    ]);
  };

  const waitForResultReveal = async (tourBarResult: TourBarShellResult, turnKind: TourBarShellTurnKind) => {
    const shouldRunResultReveal = isPhoneShellViewport || desktopCompassChrome;
    if (!shouldRunResultReveal || !beforeResultReveal) return;

    try {
      await beforeResultReveal(tourBarResult, turnKind);
    } catch (exc) {
      console.warn("SmartBar result reveal wait failed", exc);
    }
  };
  const startConsultantChatWithContext = (
    _activeResult?: TourBarShellResult | null,
    _triggerMessage?: string | null,
  ) => {
    if (consultantChatAutoStartedRef.current || consultantChatWaiting) return;

    consultantChatAutoStartedRef.current = true;
    const handoffStatusMessage =
      consultantChat?.autoStartMessage || "Context received — handing this to a consultant.";
    const consultantOpeningMessage =
      consultantChat?.autoStartConsultantMessage || "Hi there — You’re interested in Copilot support?";
    const statusId = makeConsultantChatId();

    setConsultantChatThread([
      {
        id: statusId,
        role: "smartbar",
        body: handoffStatusMessage,
        status: "thinking",
      },
    ]);
    setConsultantChatDraft("");
    setConsultantChatWaiting(true);

    // Keep the first handoff line visibly in ThinkingText long enough for the
    // sheet entrance animation to finish before the consultant response lands.
    window.setTimeout(() => {
      setConsultantChatThread((items) =>
        items.map((item) =>
          item.id === statusId
            ? { ...item, status: "done" }
            : item,
        ),
      );

      window.setTimeout(() => {
        setConsultantChatThread((items) => [
          ...items,
          {
            id: makeConsultantChatId(),
            role: "consultant",
            body: consultantOpeningMessage,
            status: "done",
          },
        ]);
        setConsultantChatWaiting(false);
      }, 650);
    }, 2100);
  };

  const activateConsultantChat = (
    activeResult?: TourBarShellResult | null,
    triggerMessage?: string | null,
  ) => {
    if (!consultantChatIsEnabled(consultantChat)) return;

    pendingConsultantOfferRef.current = false;
    setConsultantChatAvailable(true);
    setConsultantChatOpen(true);
    setIsOpen(true);
    collapseMobileComposer();
    setError("");
    setResult(null);
    setStandaloneResult(null);
    setFollowUp("");
    startConsultantChatWithContext(activeResult, triggerMessage);
  };

  const noteConsultantOffer = (tourBarResult: TourBarShellResult) => {
    pendingConsultantOfferRef.current = resultLooksLikeConsultantOffer(tourBarResult);
  };

  const shouldOpenConsultantChatForMessage = (
    message: string,
    activeResult?: TourBarShellResult | null,
  ) => {
    if (!consultantChatIsEnabled(consultantChat)) return false;
    if (textLooksLikeConsultantRequest(message)) return true;
    return Boolean(pendingConsultantOfferRef.current && resultLooksLikeConsultantOffer(activeResult) && textLooksLikeConsultantAcceptance(message));
  };

  const submitConsultantChatMessage = (message = consultantChatDraft) => {
    const cleanMessage = message.trim();
    if (!cleanMessage || consultantChatWaiting) return;

    const confirmationMessage =
      consultantChat?.replyConfirmationMessage || consultantChat?.confirmationMessage || "Excellent, lets set up a call to chat";
    const consultantResponseMessage = consultantChat?.replyConsultantResponseMessage || consultantChat?.consultantResponseMessage || "";
    const visitorId = makeConsultantChatId();

    setConsultantChatThread((items) => [
      ...items,
      {
        id: visitorId,
        role: "visitor",
        body: cleanMessage,
        status: "thinking",
      },
    ]);
    setConsultantChatDraft("");
    setConsultantChatWaiting(true);

    // For the scripted handoff, the visitor's reply is the active thinking
    // moment. After it settles, the consultant response appears.
    window.setTimeout(() => {
      setConsultantChatThread((items) =>
        items.map((item) =>
          item.id === visitorId
            ? { ...item, status: "done" }
            : item,
        ),
      );

      window.setTimeout(() => {
        setConsultantChatThread((items) => [
          ...items,
          {
            id: makeConsultantChatId(),
            role: "consultant",
            body: confirmationMessage,
            status: "done",
          },
        ]);

        if (consultantResponseMessage) {
          window.setTimeout(() => {
            setConsultantChatThread((items) => [
              ...items,
              {
                id: makeConsultantChatId(),
                role: "consultant",
                body: consultantResponseMessage,
                status: "done",
              },
            ]);
            setConsultantChatWaiting(false);
          }, 900);
          return;
        }

        setConsultantChatWaiting(false);
      }, 650);
    }, 1450);
  };

  const submitQuery = async (
    nextQuery = query,
    bookingContextOverride?: TourBarBookingContext | null,
  ) => {
    const cleanQuery = nextQuery.trim();
    if (!cleanQuery || isLoading || isAnswering) return;

    if (isPhoneShellViewport) dismissSmartBarKeyboard();

    if (shouldOpenConsultantChatForMessage(cleanQuery)) {
      setQuery("");
      activateConsultantChat(null, cleanQuery);
      return;
    }

    const shouldRetractSheet = Boolean(result || standaloneResult || error);

    setBookingContextReturnResult(null);
    setIsOpen(true);
    // Phone and official blue/glass desktop both keep the primary composer as the
    // continuing input surface, so clear it after submission instead of leaving
    // the submitted prompt parked in the box.
    const shouldClearPrimaryComposerOnSubmit =
      isPhoneShellViewport || chromeVariant === "blueCoreGlass" || desktopCompassChrome;
    setQuery(shouldClearPrimaryComposerOnSubmit ? "" : cleanQuery);
    setFollowUp("");
    collapseMobileComposer();

    if (shouldRetractSheet) {
      setError("");
      setResult(null);
      setStandaloneResult(null);
      setIsLoading(false);
      await wait(sheetRetractMs);
    } else {
      setError("");
      setResult(null);
      setStandaloneResult(null);
    }

    const scopeLimitKind = requireBookingContext ? tourBarScopeLimitKindFromPrompt(cleanQuery) : null;
    if (scopeLimitKind) {
      const scopeResult = buildTourBarScopeLimitResult(cleanQuery) as TourBarShellResult;
      setResult(scopeResult);
      appendThread([], cleanQuery, scopeResult);
      return;
    }

    const bookingGate = requireBookingContext
      ? bookingContextController.prepareSubmission(cleanQuery, bookingContextOverride)
      : { context: bookingContextOverride || bookingContextController.context, missingField: null };

    if (bookingGate.missingField) {
      bookingContextController.openCollection(bookingGate.missingField);
      const collectionResult = buildTourBarCollectionResult(bookingGate.missingField, cleanQuery) as TourBarShellResult;
      setResult(collectionResult);
      appendThread([], cleanQuery, collectionResult);
      return;
    }

    setLoadingMessage(initialLoadingMessage);
    setIsLoading(true);

    try {
      const response = await onPrimarySubmit(cleanQuery, {
        currentResult: null,
        thread: [],
        bookingContext: bookingGate.context,
      });

      await waitForResultReveal(response, "primary");
      setResult(response);
      appendThread([], cleanQuery, response);
      noteConsultantOffer(response);
      onResult?.(response, "primary");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "TourBar hit an unexpected error.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitFollowUp = async (
    nextFollowUp = followUp,
    bookingContextOverride?: TourBarBookingContext | null,
  ) => {
    const cleanFollowUp = nextFollowUp.trim();
    const activeResult = standaloneResult || result;

    if (!cleanFollowUp || isLoading || isAnswering || !activeResult || !onFollowUpSubmit) return;

    if (isPhoneShellViewport) dismissSmartBarKeyboard();

    if (shouldOpenConsultantChatForMessage(cleanFollowUp, activeResult)) {
      setFollowUp("");
      activateConsultantChat(activeResult, cleanFollowUp);
      return;
    }

    const priorThread = thread.slice(-8);
    const activeSpeedMeta = speedDemoMeta(activeResult);
    const shouldKeepSpeedSheetOpen = Boolean(activeSpeedMeta.keepSheetOpenNextMove);

    setBookingContextReturnResult(null);
    setIsOpen(true);
    setError("");
    setFollowUp("");
    collapseMobileComposer();
    setIsAnswering(true);
    setStandaloneResult(null);
    setLoadingMessage(activeSpeedMeta.nextMoveLoadingMessage || followUpLoadingMessage);

    if (!shouldKeepSpeedSheetOpen) {
      setResult(null);
      await wait(sheetRetractMs);
    }

    const scopeLimitKind = requireBookingContext ? tourBarScopeLimitKindFromPrompt(cleanFollowUp) : null;
    if (scopeLimitKind) {
      const scopeResult = buildTourBarScopeLimitResult(cleanFollowUp) as TourBarShellResult;
      setResult(scopeResult);
      appendThread(priorThread, cleanFollowUp, scopeResult);
      setIsAnswering(false);
      return;
    }

    const bookingGate = requireBookingContext
      ? bookingContextController.prepareSubmission(cleanFollowUp, bookingContextOverride)
      : { context: bookingContextOverride || bookingContextController.context, missingField: null };

    if (bookingGate.missingField) {
      bookingContextController.openCollection(bookingGate.missingField);
      const collectionResult = buildTourBarCollectionResult(bookingGate.missingField, cleanFollowUp) as TourBarShellResult;
      setResult(collectionResult);
      appendThread(priorThread, cleanFollowUp, collectionResult);
      setIsAnswering(false);
      return;
    }

    setIsLoading(!shouldKeepSpeedSheetOpen);
    setIsAnswering(false);

    try {
      const response = await onFollowUpSubmit(cleanFollowUp, {
        currentResult: activeResult,
        thread: priorThread,
        bookingContext: bookingGate.context,
      });

      await waitForResultReveal(response, "followup");
      setResult(response);
      appendThread(priorThread, cleanFollowUp, response);
      noteConsultantOffer(response);
      onResult?.(response, "followup");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "TourBar could not answer that follow-up.");
    } finally {
      setIsLoading(false);
      setIsAnswering(false);
    }
  };

  const openStandaloneSheet = async (nextStandaloneResult?: TourBarShellResult | null) => {
    const activeResult = nextStandaloneResult || result;
    if (!activeResult || isLoading || isAnswering || !renderStandaloneSheet) return;

    setFollowUp("");
    setError("");
    setStandaloneResult(null);
    setIsAnswering(true);
    setResult(null);
    await wait(sheetRetractMs);
    setStandaloneResult(activeResult);
    setIsAnswering(false);
  };

  const openBookingContextSheet = (field: TourBarRequiredBookingField) => {
    if (isLoading || isAnswering) return;

    const activeResult = standaloneResult || result;
    const collectionResult = {
      ...(buildTourBarCollectionResult(field, "") as TourBarShellResult),
      title: field === "dates" ? "Edit stay dates" : "Edit guests",
      body:
        field === "dates"
          ? "Update the check-in and check-out dates for this booking."
          : "Update the guest count for this stay.",
    };

    bookingContextController.openCollection(field);
    setIsOpen(true);
    collapseMobileComposer();
    setError("");
    setFollowUp("");
    setBookingContextReturnResult(activeResult || null);
    setStandaloneResult(null);
    setResult(collectionResult);
  };

  const completeBookingContextCollection = (
    pendingQuery: string,
    bookingContext: TourBarBookingContext,
  ) => {
    if (!pendingQuery && bookingContextReturnResult) {
      setResult(null);
      setStandaloneResult(bookingContextReturnResult);
      setBookingContextReturnResult(null);
      return;
    }

    setBookingContextReturnResult(null);
    void submitQuery(pendingQuery, bookingContext);
  };

  const closeSheet = () => {
    setError("");
    setResult(null);
    setStandaloneResult(null);
    setFollowUp("");
    setIsLoading(false);
    setIsAnswering(false);
    setBookingContextReturnResult(null);
  };

  const closeChat = () => {
    setConsultantChatOpen(false);
    setConsultantChatDraft("");
    setConsultantChatWaiting(false);
  };

  const closeAll = () => {
    closeSheet();
    closeChat();
    consultantChatAutoStartedRef.current = false;
    setConsultantChatThread([]);
    setIsOpen(false);
    setMobileComposerCollapsed(false);
    setQuery("");
  };

  const runNextMove = async () => {
    const activeResult = result;
    const nextMove = activeResult?.nextMove;
    if (!activeResult || isLoading || isAnswering) return;

    if (consultantChatIsEnabled(consultantChat) && resultLooksLikeConsultantOffer(activeResult, nextMove)) {
      activateConsultantChat(activeResult, nextMove?.label || nextMove?.query);
      return;
    }

    const handled = onNextMove?.(activeResult, nextMove);
    if (handled) {
      await openStandaloneSheet(activeResult);
      return;
    }

    const nextQuery = (nextMove?.query || nextMove?.label || activeResult.invitation?.text || "").trim();
    if (!nextQuery) return;

    const nextTurnKind = getNextMoveTurnKind?.(nextMove, activeResult) || "followup";

    if (nextTurnKind === "primary") {
      void submitQuery(nextQuery);
      return;
    }

    const activeSpeedMeta = speedDemoMeta(activeResult);

    if (activeSpeedMeta.separateSheetNextMove && onFollowUpSubmit) {
      const priorThread = thread.slice(-8);
      const shouldShowNextMoveThinking = Boolean(activeSpeedMeta.thinkingOnNextMove);

      setBookingContextReturnResult(null);
      setIsOpen(true);
      setError("");
      setFollowUp("");
      setIsAnswering(true);

      if (shouldShowNextMoveThinking) {
        setStandaloneResult(null);
        setResult(null);
        setLoadingMessage(activeSpeedMeta.nextMoveLoadingMessage || followUpLoadingMessage);
        setIsLoading(true);
      }

      try {
        const response = await onFollowUpSubmit(nextQuery, {
          currentResult: activeResult,
          thread: priorThread,
          bookingContext: bookingContextController.context,
        });

        setStandaloneResult(null);
        setResult(null);
        appendThread(priorThread, nextQuery, response);
        noteConsultantOffer(response);
        onResult?.(response, "followup");

        if (shouldShowNextMoveThinking) {
          setIsLoading(false);
        }

        await waitForResultReveal(response, "followup");
        await wait(sheetRetractMs);
        setResult(response);
      } catch (exc) {
        setError(exc instanceof Error ? exc.message : "TourBar could not answer that follow-up.");
      } finally {
        setIsLoading(false);
        setIsAnswering(false);
      }
      return;
    }

    if (activeSpeedMeta.keepSheetOpenNextMove && onFollowUpSubmit) {
      const priorThread = thread.slice(-8);

      setBookingContextReturnResult(null);
      setIsOpen(true);
      setError("");
      setFollowUp("");
      setIsAnswering(true);

      try {
        const response = await onFollowUpSubmit(nextQuery, {
          currentResult: activeResult,
          thread: priorThread,
          bookingContext: bookingContextController.context,
        });

        await waitForResultReveal(response, "followup");
        setStandaloneResult(null);
        setResult(response);
        appendThread(priorThread, nextQuery, response);
        noteConsultantOffer(response);
        onResult?.(response, "followup");
      } catch (exc) {
        setError(exc instanceof Error ? exc.message : "TourBar could not answer that follow-up.");
      } finally {
        setIsAnswering(false);
      }
      return;
    }

    void submitFollowUp(nextQuery);
  };

  useEffect(() => {
    if (!demoCommand) return;

    switch (demoCommand.type) {
      case "open":
        openComposer();
        return;
      case "closeBar":
        setIsOpen(false);
        setMobileComposerCollapsed(false);
        return;
      case "closeSheet":
        closeSheet();
        return;
      case "closeChat":
        closeChat();
        return;
      case "clearChat":
        consultantChatAutoStartedRef.current = false;
        setConsultantChatThread([]);
        setConsultantChatDraft("");
        setConsultantChatWaiting(false);
        return;
      case "closeAll":
        closeAll();
        return;
      case "setPrimary":
        openComposer();
        setQuery(demoCommand.value || "");
        return;
      case "submitPrimary":
        setIsOpen(true);
        void submitQuery(demoCommand.value || query);
        return;
      case "setFollowUp":
        openComposer();
        setFollowUp(demoCommand.value || "");
        return;
      case "submitFollowUp":
        setIsOpen(true);
        if (isPhoneShellViewport) setQuery("");
        void submitFollowUp(demoCommand.value || followUp);
        return;
      case "runNextMove":
        setIsOpen(true);
        void runNextMove();
        return;
      case "openChat":
        activateConsultantChat(standaloneResult || result, demoCommand.value);
        return;
      case "setChatDraft":
        if (consultantChatIsEnabled(consultantChat)) {
          setConsultantChatAvailable(true);
          setConsultantChatOpen(true);
          openComposer();
          setConsultantChatDraft(demoCommand.value || "");
        }
        return;
      case "submitChat":
        if (consultantChatIsEnabled(consultantChat)) {
          setConsultantChatAvailable(true);
          setConsultantChatOpen(true);
          setIsOpen(true);
          submitConsultantChatMessage(demoCommand.value || consultantChatDraft);
        }
        return;
      case "openBookingContext":
        if (demoCommand.field) {
          setIsOpen(true);
          openBookingContextSheet(demoCommand.field);
        }
        return;
      case "setBookingContext":
        if (demoCommand.bookingContext) {
          bookingContextController.setDraftContext({
            ...bookingContextController.context,
            ...demoCommand.bookingContext,
          });
        }
        return;
      case "selectBookingDate":
        if (demoCommand.dateKind && demoCommand.value) {
          bookingContextController.selectCalendarDate(demoCommand.dateKind, demoCommand.value);
        }
        return;
      case "setBookingGuestCount":
        bookingContextController.setDraftContext({
          ...bookingContextController.context,
          guestsSelected: false,
          guestAdults: Math.max(1, Math.floor(Number(demoCommand.guestAdults ?? bookingContextController.context.guestAdults ?? 1) || 1)),
          guestChildren: Math.max(0, Math.floor(Number(demoCommand.guestChildren ?? bookingContextController.context.guestChildren ?? 0) || 0)),
          guestLabel: null,
        });
        return;
      case "commitBookingContext":
        if (demoCommand.field === "dates") {
          bookingContextController.commitDates();
        } else if (demoCommand.field === "guests") {
          bookingContextController.commitGuests();
        }
        return;
      case "showThinking":
        setIsOpen(true);
        collapseMobileComposer();
        setConsultantChatOpen(false);
        setConsultantChatDraft("");
        setConsultantChatWaiting(false);
        setError("");
        setFollowUp("");
        setResult(null);
        setStandaloneResult(null);
        setBookingContextReturnResult(null);
        setIsAnswering(false);
        setLoadingMessage(demoCommand.value || initialLoadingMessage);
        setIsLoading(true);
        return;
      case "showResult":
        if (demoCommand.result) {
          setIsOpen(true);
          collapseMobileComposer();
          setConsultantChatOpen(false);
          setConsultantChatDraft("");
          setConsultantChatWaiting(false);
          setError("");
          setFollowUp("");
          setIsLoading(false);
          setIsAnswering(false);
          setStandaloneResult(null);
          setBookingContextReturnResult(null);
          setResult(demoCommand.result);
        }
        return;
      default:
        return;
    }
  }, [demoCommand?.id]);

  const showLoadingSheet = isLoading && !isPhoneShellViewport;
  const sheetVisible = showLoadingSheet || Boolean(error) || Boolean(result) || Boolean(standaloneResult);
  const consultantChatVisible = consultantChatIsEnabled(consultantChat) && consultantChatOpen;
  const regularSheetVisible = sheetVisible && !consultantChatVisible;

  const shellActions: TourBarShellActions = {
    submitFollowUp: (nextQuery) => {
      void submitFollowUp(nextQuery);
    },
    submitPrimary: (nextQuery, bookingContextOverride) => {
      void submitQuery(nextQuery, bookingContextOverride);
    },
    openStandaloneSheet: (nextResult) => {
      void openStandaloneSheet(nextResult);
    },
    closeSheet,
    openBookingContextSheet: (field) => {
      openBookingContextSheet(field);
    },
    bookingContext: bookingContextController.context,
  };

  const activeRegularSheetResult = standaloneResult || result;
  const mobileControls =
    isPhoneShellViewport && activeRegularSheetResult && !isLoading && !isAnswering
      ? renderMobileControls?.(activeRegularSheetResult, shellActions)
      : null;
  const activeRegularSheetMeta = speedDemoMeta(activeRegularSheetResult);
  const regularSheetKey = activeRegularSheetMeta.stableSheetKey
    ? `speed-demo-${activeRegularSheetMeta.stableSheetKey}`
    : `${standaloneResult ? "standalone" : result?.focusAreaId || result?.action || "sheet"}-${standaloneResult?.mode || result?.mode || (isLoading ? "loading" : "state")}`;
  const standaloneSheet =
    standaloneResult && !isLoading && !error ? renderStandaloneSheet?.(standaloneResult, shellActions) : null;
  const isStandaloneSheet = Boolean(standaloneResult);
  const activeCollectionField = tourBarCollectionFieldFromResult(result);
  const activeCollectionPendingQuery = tourBarPendingQueryFromResult(result);
  const answerOnlyResult = isTourBarAnswerOnlyResult(result);
  const useMobileActionResult = isPhoneShellViewport && shouldUseMobileActionResult(result);
  const resultBodyForDisplay =
    result?.body && isPhoneShellViewport
      ? compactMobileResultText(result.body)
      : result?.body || "";
  const shouldShowResultBody = Boolean(resultBodyForDisplay) && !useMobileActionResult && !(!isPhoneShellViewport && (chromeVariant === "blueCoreGlass" || desktopCompassChrome));
  const mobileFooterMode: TourBarMobileFooterMode | null = isPhoneShellViewport
    ? consultantChatVisible
      ? "chat"
      : isLoading
        ? "thinking"
        : activeCollectionField
          ? "collection"
          : error
            ? "error"
            : activeRegularSheetResult
              ? "result"
              : isOpen && !mobileComposerCollapsed
                ? "compose"
                : "launch"
    : null;
  const mobileFooterStatusText = isPhoneShellViewport
    ? mobileFooterMode === "thinking"
      ? loadingMessage
      : mobileFooterMode === "chat"
        ? consultantChatWaiting
          ? consultantChat?.autoStartMessage || "Handing context to a consultant."
          : "Consultant desk is open."
        : mobileFooterMode === "collection"
          ? activeCollectionField === "dates"
            ? "Choose stay dates."
            : "Choose guests."
          : mobileFooterMode === "error"
            ? "SmartBar needs attention."
            : mobileFooterMode === "result"
              ? activeRegularSheetMeta.readyPillLabel || activeRegularSheetResult?.title || "SmartBar result mounted."
              : ""
    : "";
  const mobileFooterStatusIsThinking = isPhoneShellViewport && mobileFooterMode === "thinking" && Boolean(mobileFooterStatusText);
  const mobileFooterHasStatus = isPhoneShellViewport && Boolean(mobileFooterStatusText);
  const mobileRegularSheetTitle = isPhoneShellViewport
    ? error
      ? "SmartBar needs attention"
      : activeCollectionField === "dates"
        ? "Choose stay dates"
        : activeCollectionField === "guests"
          ? "Choose guests"
          : isStandaloneSheet
            ? standaloneResult?.title || result?.title || "SmartBar"
            : activeRegularSheetResult?.title || "SmartBar"
    : "";
  const mobileConsultantSheetTitle = isPhoneShellViewport
    ? consultantChat?.title || "Consultant chat"
    : "";
  const mobileSheetMaxHeight = activeCollectionField === "dates"
    ? "min(82svh, 680px)"
    : activeCollectionField === "guests"
      ? "min(82svh, 640px)"
      : "min(78svh, 680px)";
  const mobileSheetInnerMaxHeight = `calc(${mobileSheetMaxHeight} - 56px)`;
  // Desktop blue/glass sheets are anchored below the composer, so cap the whole
  // dropdown assembly against the remaining visual space, not just the cart list.
  // The list/accounting blocks inside OrderReview then scroll within this outer guard.
  const desktopBlueCoreGlassSheetMaxHeight = "min(85dvh, calc(100dvh - 8.5rem))";

  const resolvedAppearance = resolveTourBarShellAppearance(appearance, isPhoneShellViewport);
  const isLightShell = resolvedAppearance === "light";
  const mobileGlassChrome = isPhoneShellViewport && smartBarMobileChrome;
  const mobileVisualAppearance: TourBarShellAppearance = mobileGlassChrome ? "dark" : resolvedAppearance;
  const mobileShellStyles = getSmartBarMobileShellStyles(true, false);
  const desktopBlueCoreGlass = !isPhoneShellViewport && (chromeVariant === "blueCoreGlass" || desktopCompassChrome);
  const desktopUsesCompass = !isPhoneShellViewport && (desktopCompassChrome || desktopBlueCoreGlass);
  const primaryComposerCaretClass =
    primaryComposerFocused && query.length === 0 && !isLoading && !isAnswering
      ? desktopBlueCoreGlass || !isLightShell
        ? "caret-white"
        : "caret-slate-950"
      : "caret-transparent";

  const showPrimaryComposerReadyCursor =
    isOpen && !mobileComposerCollapsed && query.length === 0 && !isLoading && !isAnswering;
  const primaryComposerReadyCursorClass = [
    "pointer-events-none block w-[3px] shrink-0 rounded-full opacity-100 animate-pulse",
    isPhoneShellViewport ? "mt-[0.72rem] h-8" : "mb-1 h-5",
    desktopBlueCoreGlass || !isLightShell
      ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.88),0_0_22px_rgba(56,189,248,0.46)]"
      : "bg-slate-950 shadow-[0_0_10px_rgba(15,23,42,0.38)]",
  ].join(" ");

  const shellRootClass = isPhoneShellViewport
    ? mobileGlassChrome
      ? "pointer-events-none fixed bottom-3 left-1/2 z-[10060] h-[72px] w-[calc(100vw-24px)] max-w-[430px] -translate-x-1/2 shrink-0"
      : "fixed inset-x-0 bottom-0 z-[10060] h-[76px] shrink-0"
    : "relative z-[10060] h-9 w-9 shrink-0";

  const shellOpenPanelClass = isPhoneShellViewport
    ? mobileGlassChrome
      ? "pointer-events-none fixed bottom-3 left-1/2 top-auto z-[10060] min-h-[72px] w-[calc(100vw-24px)] max-w-[430px] -translate-x-1/2 overflow-visible text-white"
      : isLightShell
        ? "fixed inset-x-0 bottom-0 top-auto z-[10060] min-h-[76px] w-auto overflow-visible border-t border-slate-200/80 bg-white/96 text-slate-950 shadow-[0_-18px_42px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        : "fixed inset-x-0 bottom-0 top-auto z-[10060] min-h-[76px] w-auto overflow-visible bg-slate-950 text-white shadow-[0_-18px_42px_rgba(2,6,23,0.38)]"
    : desktopBlueCoreGlass
      ? "absolute right-0 top-1/2 w-[calc(100vw-2rem)] -translate-y-1/2 text-white sm:w-[430px] md:w-[470px]"
      : "absolute right-0 top-1/2 w-[calc(100vw-2rem)] -translate-y-1/2 sm:w-[430px] md:w-[470px]";

  const shellSheetAnchorClass = isPhoneShellViewport
    ? mobileGlassChrome
      ? "pointer-events-auto absolute left-0 right-0 bottom-[calc(100%+8px)] max-h-[78svh] min-h-0 overflow-hidden rounded-[30px]"
      : "absolute left-0 right-0 bottom-[calc(100%-1px)] max-h-[78svh] min-h-0 overflow-hidden"
    : "absolute left-0 right-0 top-[calc(100%-1px)] overflow-hidden";

  const shellSheetPanelClass = isPhoneShellViewport
    ? mobileGlassChrome
      ? `${mobileShellStyles.upperGlassClass} max-h-[78svh] min-h-0 rounded-[30px] p-2`
      : isLightShell
        ? "max-h-[78svh] min-h-0 overflow-hidden border border-slate-200/80 bg-white/96 p-2 text-slate-950 shadow-[0_28px_76px_rgba(15,23,42,0.18)] ring-1 ring-white/90 backdrop-blur-xl"
        : "max-h-[78svh] min-h-0 overflow-hidden bg-slate-950 p-2 text-white shadow-[0_28px_76px_rgba(2,6,23,0.50)]"
    : desktopBlueCoreGlass
      ? "max-h-[min(85dvh,calc(100dvh-8.5rem))] min-h-0 overflow-hidden rounded-b-[24px] rounded-t-[14px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(226,238,246,0.74))] text-slate-950 shadow-[0_28px_76px_rgba(23,34,124,0.22),inset_0_1px_1px_rgba(255,255,255,0.72)] ring-1 ring-white/70 backdrop-blur-xl"
      : "max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain rounded-b-[24px] rounded-t-[14px] border border-slate-200 bg-white/96 shadow-2xl shadow-slate-950/16 ring-1 ring-white/70 backdrop-blur-xl";

  const shellSheetMaxHeightStyle = isPhoneShellViewport
    ? { maxHeight: mobileSheetMaxHeight }
    : desktopBlueCoreGlass
      ? { maxHeight: desktopBlueCoreGlassSheetMaxHeight }
      : undefined;

  const shellSheetInnerMaxHeightStyle = isPhoneShellViewport
    ? { maxHeight: mobileSheetInnerMaxHeight }
    : desktopBlueCoreGlass
      ? { maxHeight: desktopBlueCoreGlassSheetMaxHeight }
      : undefined;

  const shellSheetFrameClass = isPhoneShellViewport
    ? "grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
    : desktopBlueCoreGlass
      ? "grid max-h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
      : undefined;

  const shellSheetBodyClass = isPhoneShellViewport
    ? mobileGlassChrome
      ? "min-h-0 space-y-2 overflow-y-auto overscroll-contain px-2 pb-3 pt-1"
      : "min-h-0 space-y-2 overflow-y-auto overscroll-contain p-2 pb-3"
    : desktopBlueCoreGlass
      ? "min-h-0 space-y-2 overflow-hidden px-4 pb-3 pt-2"
      : "space-y-3 px-4 py-3";

  const shellSheetFooterClass = desktopBlueCoreGlass
    ? "shrink-0 border-t border-white/40 bg-white/58 px-3 py-2 shadow-[0_-12px_28px_rgba(23,34,124,0.12)] backdrop-blur-xl"
    : isLightShell
      ? "shrink-0 border-t border-slate-200 bg-white/98 px-3 py-2 shadow-[0_-12px_28px_rgba(15,23,42,0.10)]"
      : "shrink-0 border-t border-slate-800 bg-slate-950 px-3 py-2 shadow-[0_-12px_28px_rgba(2,6,23,0.32)]";

  const shellSheetInitialY = isPhoneShellViewport ? "100%" : "-100%";
  const desktopSheetRevealMode = isPhoneShellViewport ? "native" : sheetRevealMode;
  const showMobileCollapsedComposer = isPhoneShellViewport && mobileComposerCollapsed;

  const submitPrimaryComposer = () => {
    const cleanQuery = query.trim();
    if (!cleanQuery || isLoading || isAnswering) return;

    if (isPhoneShellViewport) dismissSmartBarKeyboard();

    if (canUseMobilePrimaryFollowUp) {
      setQuery("");
      void submitFollowUp(cleanQuery);
      return;
    }

    void submitQuery(cleanQuery);
  };

  const followUpComposer =
    !isPhoneShellViewport && onFollowUpSubmit && activeFollowUpResult?.canFollowUp !== false ? (
      <div className={desktopBlueCoreGlass ? "flex items-end gap-2 rounded-2xl border border-white/35 bg-white/58 px-3 py-2 shadow-[0_14px_34px_rgba(23,34,124,0.12)] ring-1 ring-white/55 backdrop-blur-xl" : "flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"}>
        <textarea
          ref={followUpRef}
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitFollowUp();
            }
          }}
          placeholder={followUpPlaceholder}
          rows={1}
          className="max-h-28 min-h-8 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm font-medium leading-6 text-slate-950 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          data-smartbar-followup-submit="true"
          data-smartbar-pointer-kind="submit"
          onClick={() => void submitFollowUp()}
          disabled={!canAskFollowUp}
          className={desktopBlueCoreGlass ? "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17227c] text-white shadow-[0_10px_24px_rgba(23,34,124,0.24)] transition hover:bg-[#1d2b91] disabled:cursor-not-allowed disabled:opacity-45" : "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"}
          aria-label="Ask TourBar follow-up"
        >
          {isAnswering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    ) : null;

  const shellMarkup = (
    <div
      data-tourbar-shell-root="true"
      data-tourbar-appearance={resolvedAppearance}
      data-tourbar-viewport={isPhoneShellViewport ? "phone" : "desktop"}
      data-smartbar-mobile-footer-mode={mobileFooterMode || undefined}
      data-smartbar-desktop-compass-chrome={desktopUsesCompass ? "true" : undefined}
      data-smartbar-chrome-variant={desktopBlueCoreGlass ? "blueCoreGlass" : undefined}
      className={shellRootClass}
    >
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="tourbar-launcher"
            type="button"
            initial={isPhoneShellViewport ? false : { opacity: 0, scale: 0.98 }}
            animate={isPhoneShellViewport ? undefined : { opacity: 1, scale: 1 }}
            exit={isPhoneShellViewport ? undefined : { opacity: 0, scale: 0.98 }}
            transition={isPhoneShellViewport ? undefined : { duration: 0.16, ease: "easeInOut" }}
            onClick={openComposer}
            data-smartbar-launcher="true"
            data-smartbar-pointer-kind="launcher"
            className={
              isPhoneShellViewport
                ? mobileGlassChrome
                  ? `${mobileShellStyles.chromePillClass} left-0 right-0 h-[60px] px-5`
                  : isLightShell
                    ? "group absolute inset-0 flex items-center justify-center overflow-hidden border-t border-slate-200/80 bg-white/96 px-4 text-slate-600 shadow-[0_-16px_36px_rgba(15,23,42,0.14)] transition hover:bg-white hover:text-slate-950"
                    : "group absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950 px-4 text-white/70 shadow-[0_-16px_36px_rgba(2,6,23,0.34)] transition hover:bg-slate-900 hover:text-white/90"
                : desktopBlueCoreGlass
                  ? "group absolute inset-0 inline-flex items-center justify-center overflow-hidden rounded-full bg-[#17227c] text-white shadow-[0_18px_40px_rgba(23,34,124,0.24),inset_0_1px_1px_rgba(255,255,255,0.18)] ring-1 ring-white/15 transition hover:bg-[#1d2b91]"
                  : isLightShell
                    ? "group absolute inset-0 inline-flex items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-700 shadow-md shadow-slate-950/10 ring-1 ring-white transition hover:bg-slate-50 hover:text-slate-950"
                    : "group absolute inset-0 inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-950 text-white shadow-md shadow-slate-950/20 ring-1 ring-slate-950/10 transition hover:bg-slate-800"
            }
            aria-label={launcherAriaLabel}
            title={launcherTitle}
          >
            <span
              data-smartbar-launcher-hotspot="true"
              className={
                isPhoneShellViewport
                  ? mobileGlassChrome
                    ? "pointer-events-none inline-flex items-center justify-center gap-2"
                    : `pointer-events-none inline-flex items-center justify-center gap-2 ${isLightShell ? "text-slate-600" : "text-white/70"}`
                  : "pointer-events-none inline-flex h-full w-full items-center justify-center rounded-full animate-pulse"
              }
            >
              {desktopUsesCompass ? (
                <Compass className="h-4 w-4" />
              ) : (
                <Sparkles className={isPhoneShellViewport ? `h-4 w-4 animate-pulse ${mobileGlassChrome ? "text-white/88" : isLightShell ? "text-orange-500" : "text-white/75"}` : "h-4 w-4"} />
              )}
              {isPhoneShellViewport ? (
                <span className={`text-[13px] font-black uppercase tracking-[0.14em] ${mobileGlassChrome ? mobileShellStyles.chromeLabelClass : isLightShell ? "text-slate-700" : "text-white/70"}`}>SmartBar</span>
              ) : null}
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="tourbar-open"
            data-tourbar-open-panel="true"
            initial={isPhoneShellViewport ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={isPhoneShellViewport ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={isPhoneShellViewport ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={isPhoneShellViewport ? undefined : { duration: 0.2, ease: "easeInOut" }}
            className={shellOpenPanelClass}
          >
            <div className={isPhoneShellViewport ? mobileGlassChrome ? "relative min-h-[72px] overflow-visible" : `relative min-h-[76px] ${isLightShell ? "bg-white/96" : "bg-slate-950"}` : "relative"}>
              <AnimatePresence initial={false} mode={isPhoneShellViewport ? "sync" : "wait"}>
                {showMobileCollapsedComposer ? (
                  <motion.button
                    key="tourbar-mobile-collapsed-dock"
                    type="button"
                    initial={false}
                    onClick={openComposer}
                    data-smartbar-launcher="true"
                    data-smartbar-pointer-kind="launcher"
                    className={mobileGlassChrome
                      ? `${mobileShellStyles.chromePillClass} left-0 right-0 h-[60px] px-5`
                      : isLightShell
                        ? "flex h-[76px] w-full items-center justify-center overflow-hidden border-t border-slate-200/80 bg-white/96 px-4 text-slate-600 shadow-[0_-14px_32px_rgba(15,23,42,0.12)] transition hover:bg-white hover:text-slate-950"
                        : "flex h-[76px] w-full items-center justify-center overflow-hidden bg-slate-950 px-4 text-white/70 transition hover:bg-slate-900 hover:text-white/90"
                    }
                    aria-label={launcherAriaLabel}
                    title={launcherTitle}
                  >
                    <span
                      data-smartbar-launcher-hotspot="true"
                      data-smartbar-mobile-status={mobileFooterHasStatus ? "true" : undefined}
                      className={mobileFooterHasStatus
                        ? mobileGlassChrome
                          ? "pointer-events-none flex min-h-[60px] w-full items-center justify-center px-5 py-2 text-center text-[13px] font-semibold leading-5 text-white/88"
                          : `pointer-events-none flex min-h-[76px] w-full items-center justify-center px-6 py-3 text-center text-[13px] font-semibold leading-5 ${isLightShell ? "text-slate-600" : "text-white/72"}`
                        : "pointer-events-none inline-flex h-7 min-w-20 items-center justify-center px-5 py-1.5"
                      }
                    >
                      {mobileFooterHasStatus ? (
                        mobileFooterStatusIsThinking ? (
                          <ThinkingText body={mobileFooterStatusText} />
                        ) : (
                          <span className={mobileGlassChrome ? "block max-w-[360px] whitespace-normal" : "block max-w-[92vw] whitespace-normal"}>{mobileFooterStatusText}</span>
                        )
                      ) : (
                        <span className={`h-1.5 w-10 rounded-full ${mobileGlassChrome ? "bg-white/42" : isLightShell ? "bg-slate-300" : "bg-white/35"}`} />
                      )}
                    </span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="tourbar-mobile-entry-composer"
                    initial={false}
                  >
                    <div className={isPhoneShellViewport ? mobileGlassChrome ? `pointer-events-auto min-h-[76px] overflow-visible rounded-[30px] ${mobileShellStyles.upperGlassClass}` : `min-h-[76px] overflow-visible ${isLightShell ? "border-t border-slate-200/80 bg-white/96 text-slate-950 shadow-[0_-14px_32px_rgba(15,23,42,0.12)]" : "bg-slate-950 text-white"}` : desktopBlueCoreGlass ? "overflow-hidden rounded-[22px] border border-white/25 bg-[linear-gradient(180deg,rgba(29,43,145,0.98),rgba(23,34,124,0.96))] text-white shadow-[0_24px_62px_rgba(23,34,124,0.28),inset_0_1px_1px_rgba(255,255,255,0.18)] ring-1 ring-white/15 backdrop-blur-xl" : "overflow-hidden rounded-[22px] border border-slate-200 bg-white/96 shadow-xl shadow-slate-950/12 ring-1 ring-white/70 backdrop-blur-xl"}>
                  <div className={isPhoneShellViewport ? "relative flex min-h-[76px] items-start gap-2 px-3 pb-2 pt-3" : "relative flex items-end gap-2 px-3 py-2"}>
                    <span className={isPhoneShellViewport ? mobileGlassChrome ? `mt-1 ${mobileShellStyles.chromeIconBubbleClass}` : `mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center ${isLightShell ? "text-orange-500" : "text-white/85"}` : desktopBlueCoreGlass ? "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] ring-1 ring-white/18" : "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white"}>
                      {desktopUsesCompass ? <Compass className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </span>
                    {showPrimaryComposerReadyCursor ? (
                      <span
                        aria-hidden="true"
                        data-smartbar-entry-ready-cursor="true"
                        className={primaryComposerReadyCursorClass}
                      />
                    ) : null}
                    <textarea
                      ref={queryRef}
                      value={query}
                      onFocus={() => setPrimaryComposerFocused(true)}
                      onBlur={() => setPrimaryComposerFocused(false)}
                      onChange={(event) => {
                        setQuery(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          submitPrimaryComposer();
                        }
                      }}
                      placeholder={primaryComposerPlaceholder}
                      rows={isPhoneShellViewport ? 2 : 1}
                      className={[
                        isPhoneShellViewport
                          ? mobileGlassChrome
                            ? `max-h-32 min-h-[52px] flex-1 resize-none overflow-y-auto bg-transparent px-0 pb-1 pt-1.5 text-[16px] font-semibold leading-6 outline-none placeholder:text-white/38 md:text-sm ${mobileShellStyles.inputTextClass}`
                            : `max-h-32 min-h-[52px] flex-1 resize-none overflow-y-auto bg-transparent px-0 pb-1 pt-1.5 text-[16px] font-medium leading-6 outline-none md:text-sm ${isLightShell ? "text-slate-950 placeholder:text-slate-400" : "text-white placeholder:text-white/40"}`
                          : desktopBlueCoreGlass
                            ? "max-h-32 min-h-8 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm font-semibold leading-6 text-white/86 outline-none placeholder:text-white/38"
                            : "max-h-32 min-h-8 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm font-medium leading-6 text-slate-950 outline-none placeholder:text-slate-400",
                        primaryComposerCaretClass,
                      ].join(" ")}
                    />
                    <button
                      type="button"
                      data-smartbar-primary-submit={canUseMobilePrimaryFollowUp ? undefined : "true"}
                      data-smartbar-followup-submit={canUseMobilePrimaryFollowUp ? "true" : undefined}
                      data-smartbar-pointer-kind="submit"
                      onClick={submitPrimaryComposer}
                      disabled={!canSubmit}
                      className={isPhoneShellViewport ? mobileGlassChrome ? "mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.18] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.26)] ring-1 ring-white/22 transition hover:bg-white/[0.24] disabled:cursor-not-allowed disabled:opacity-45" : `mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-45 ${isLightShell ? "text-slate-700 hover:text-slate-950" : "text-white hover:text-white/80"}` : desktopBlueCoreGlass ? "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] ring-1 ring-white/18 transition hover:bg-white/22 disabled:cursor-not-allowed disabled:opacity-45" : "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"}
                      aria-label={canUseMobilePrimaryFollowUp ? "Ask SmartBar follow-up" : "Submit SmartBar query"}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                    </button>
                    {consultantChatIsEnabled(consultantChat) && consultantChatAvailable && (
                      <button
                        type="button"
                        onClick={() => {
                          openComposer();
                          setConsultantChatOpen((open) => {
                            const nextOpen = !open;
                            if (nextOpen) startConsultantChatWithContext(standaloneResult || result);
                            return nextOpen;
                          });
                        }}
                        className={`${isPhoneShellViewport ? "mt-0.5 h-10 w-10" : "mb-0.5 h-8 w-8"} inline-flex shrink-0 items-center justify-center rounded-full transition ${
                          consultantChatOpen
                            ? isPhoneShellViewport
                              ? mobileGlassChrome ? "text-white" : isLightShell ? "text-sky-700" : "text-white"
                              : "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                            : isPhoneShellViewport
                              ? mobileGlassChrome ? "text-white/62 hover:text-white" : isLightShell ? "text-slate-500 hover:text-slate-950" : "text-white/60 hover:text-white"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        aria-label={consultantChatOpen ? "Close consultant chat" : "Open consultant chat"}
                        title={consultantChatOpen ? "Close consultant chat" : "Open consultant chat"}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (isPhoneShellViewport) {
                          setMobileComposerCollapsed(true);
                        } else {
                          setIsOpen(false);
                        }
                      }}
                      className={isPhoneShellViewport ? mobileGlassChrome ? "mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.10] text-white/58 ring-1 ring-white/14 transition hover:bg-white/[0.18] hover:text-white" : `mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center transition ${isLightShell ? "text-slate-400 hover:text-slate-900" : "text-white/50 hover:text-white"}` : desktopBlueCoreGlass ? "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/62 transition hover:bg-white/12 hover:text-white" : "mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"}
                      aria-label="Close TourBar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {regularSheetVisible && (
                  <motion.div
                    key={regularSheetKey}
                    data-tourbar-sheet-panel="true"
                    data-tourbar-sheet-reveal-mode={desktopSheetRevealMode}
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: sheetTransitionSeconds, ease: "easeInOut" }}
                    className={shellSheetAnchorClass}
                    style={shellSheetMaxHeightStyle}
                  >
                    <motion.div
                      initial={{ y: shellSheetInitialY }}
                      animate={{ y: "0%" }}
                      exit={{ y: shellSheetInitialY }}
                      transition={{ duration: sheetTransitionSeconds, ease: "easeInOut" }}
                      className={shellSheetPanelClass}
                      style={shellSheetMaxHeightStyle}
                    >
                      {isPhoneShellViewport && !isLoading && (
                        <MobileSheetTitleRail title={mobileRegularSheetTitle} appearance={mobileVisualAppearance} />
                      )}

                      {isLoading && (
                        <div className={isPhoneShellViewport ? mobileGlassChrome ? "px-4 py-4 text-[15px] font-semibold leading-6 text-white/84" : `px-4 py-4 text-[15px] font-semibold leading-6 ${isLightShell ? "text-slate-600" : "text-white/80"}` : desktopBlueCoreGlass ? "px-4 py-4 text-sm font-semibold text-slate-700" : "px-4 py-4 text-sm font-medium text-slate-600"}>
                          <ThinkingText body={loadingMessage} />
                        </div>
                      )}

                      {error && (
                        <div className={isPhoneShellViewport ? `rounded-[19px] px-4 py-4 text-[15px] font-semibold leading-6 ring-1 ${isLightShell ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-rose-950/55 text-rose-100 ring-rose-300/20"}` : "px-4 py-4 text-sm leading-5 text-rose-700"}>
                          {error}
                        </div>
                      )}

                      {(result || standaloneResult) && (
                        <div className={shellSheetFrameClass} style={shellSheetInnerMaxHeightStyle}>
                          {isStandaloneSheet ? (
                            <>
                              {!isPhoneShellViewport && (
                                <div className={desktopBlueCoreGlass ? "shrink-0 border-b border-white/45 bg-white/52 px-4 py-3 backdrop-blur-xl" : "shrink-0 border-b border-emerald-100 bg-emerald-50/90 px-4 py-3"}>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700/70">
                                    Booking handoff
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-emerald-950">
                                    {standaloneResult?.title || result?.title || "Booking handoff"}
                                  </div>
                                </div>
                              )}

                              <div className={shellSheetBodyClass}>
                                {standaloneSheet}
                                {isPhoneShellViewport && mobileControls}
                                {!isPhoneShellViewport && !desktopBlueCoreGlass && followUpComposer}
                              </div>
                              {isPhoneShellViewport && followUpComposer && (
                                <div className={shellSheetFooterClass}>
                                  {followUpComposer}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {!isPhoneShellViewport && (
                                <div className={desktopBlueCoreGlass ? "shrink-0 px-4 pb-1.5 pt-3" : "shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3"}>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {resultEyebrow}
                                  </div>
                                  {!desktopBlueCoreGlass && (
                                    <div className="mt-1 text-sm font-semibold text-slate-950">{result!.title}</div>
                                  )}
                                </div>
                              )}

                              <div className={shellSheetBodyClass}>
                                {shouldShowResultBody && (
                                  isPhoneShellViewport ? (
                                    <MobilePlainText text={resultBodyForDisplay} appearance={mobileVisualAppearance} />
                                  ) : (
                                    <MarkdownLite text={resultBodyForDisplay} />
                                  )
                                )}

                                {activeCollectionField ? (
                                  <TourBarBookingContextPanel
                                    controller={bookingContextController}
                                    field={activeCollectionField}
                                    pendingQuery={activeCollectionPendingQuery}
                                    mode={activeCollectionPendingQuery ? "required" : "edit"}
                                    onResume={(pendingQuery, bookingContext) => {
                                      completeBookingContextCollection(pendingQuery, bookingContext);
                                    }}
                                  />
                                ) : answerOnlyResult ? null : (
                                  renderResultExtras?.(result!, shellActions)
                                )}

                                {isPhoneShellViewport && mobileControls}

                                {!isPhoneShellViewport && result!.invitation?.text && (
                                  result!.nextMove?.query || result!.nextMove?.focusAreaId ? (
                                    <button
                                      type="button"
                                      data-tourbar-nextmove-button="true"
                                      data-tourbar-nextmove-label={result!.nextMove?.label || result!.invitation!.text}
                                      data-tourbar-nextmove-query={result!.nextMove?.query || ""}
                                      data-tourbar-nextmove-invitation={result!.invitation!.text}
                                      onClick={() => void runNextMove()}
                                      disabled={isLoading || isAnswering}
                                      className={desktopBlueCoreGlass ? "group flex w-full items-center justify-between gap-3 rounded-2xl bg-[#17227c] px-3 py-2.5 text-left text-sm font-semibold leading-5 text-white shadow-[0_14px_34px_rgba(23,34,124,0.20)] ring-1 ring-white/25 transition hover:bg-[#1d2b91] disabled:cursor-not-allowed disabled:opacity-55" : "group flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold leading-5 text-slate-900 ring-1 ring-slate-200/80 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55"}
                                    >
                                      <span>{result!.invitation!.text}</span>
                                      <ArrowRight className={desktopBlueCoreGlass ? "h-4 w-4 shrink-0 text-white/78 transition group-hover:translate-x-0.5" : "h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5"} />
                                    </button>
                                  ) : (
                                    <div className={desktopBlueCoreGlass ? "rounded-2xl bg-white/58 px-3 py-2.5 text-sm font-semibold leading-5 text-slate-900 ring-1 ring-white/55 backdrop-blur-xl" : "rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-5 text-slate-900 ring-1 ring-slate-200/80"}>
                                      {result!.invitation!.text}
                                    </div>
                                  )
                                )}

                                {!isPhoneShellViewport && !desktopBlueCoreGlass && followUpComposer}
                              </div>
                              {isPhoneShellViewport && followUpComposer && (
                                <div className={shellSheetFooterClass}>
                                  {followUpComposer}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {consultantChatVisible && (
                  <motion.div
                    key="consultant-chat-sheet"
                    data-tourbar-sheet-panel="true"
                    data-tourbar-sheet-reveal-mode={desktopSheetRevealMode}
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: sheetTransitionSeconds, ease: "easeInOut" }}
                    className={shellSheetAnchorClass}
                    style={shellSheetMaxHeightStyle}
                  >
                    <motion.div
                      initial={{ y: shellSheetInitialY }}
                      animate={{ y: "0%" }}
                      exit={{ y: shellSheetInitialY }}
                      transition={{ duration: sheetTransitionSeconds, ease: "easeInOut" }}
                      className={shellSheetPanelClass}
                      style={shellSheetMaxHeightStyle}
                    >
                      {isPhoneShellViewport && (
                        <MobileSheetTitleRail title={mobileConsultantSheetTitle} appearance={mobileVisualAppearance} />
                      )}

                      <div
                        className={isPhoneShellViewport ? "max-h-full overflow-hidden" : undefined}
                        style={shellSheetInnerMaxHeightStyle}
                      >
                        <TourBarConsultantChat
                          copy={consultantChat}
                          draft={consultantChatDraft}
                          isWaiting={consultantChatWaiting}
                          thread={consultantChatThread}
                          onDraftChange={setConsultantChatDraft}
                          onSubmit={() => submitConsultantChatMessage()}
                        />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return isPhoneShellViewport ? createPortal(shellMarkup, document.body) : shellMarkup;
}
