import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  type TourBarRequiredBookingField,
} from "./tourbarBookingContext";
import { smartbarFocusTarget } from "./smartbarFocusController";
import {
  ArrowRight,
  Loader2,
  Search,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";

const TOURBAR_SHEET_TRANSITION_SECONDS = 0.66;
const TOURBAR_SHEET_RETRACT_MS = 680;
const THINKING_WIGGLE_DURATION = 1.15;
const THINKING_WIGGLE_STAGGER = 0.025;

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
  openBookingContextSheet: (field: TourBarRequiredBookingField) => void;
  bookingContext: TourBarBookingContext;
};

export type TourBarShellProps = {
  primaryPlaceholder?: string;
  followUpPlaceholder?: string;
  launcherTitle?: string;
  launcherAriaLabel?: string;
  resultEyebrow?: string;
  initialLoadingMessage?: string;
  followUpLoadingMessage?: string;
  requireBookingContext?: boolean;
  onPrimarySubmit: (query: string, context: TourBarShellTurnContext) => Promise<TourBarShellResult>;
  onFollowUpSubmit?: (query: string, context: TourBarShellTurnContext) => Promise<TourBarShellResult>;
  getNextMoveTurnKind?: (nextMove: TourBarNextMove | undefined, currentResult: TourBarShellResult | null) => TourBarShellTurnKind;
  onResult?: (result: TourBarShellResult, turnKind: TourBarShellTurnKind) => void;
  onNextMove?: (result: TourBarShellResult, nextMove: TourBarNextMove | undefined) => boolean | void;
  buildThreadMessage?: (result: TourBarShellResult) => string;
  renderResultExtras?: (result: TourBarShellResult, actions: TourBarShellActions) => ReactNode;
  renderStandaloneSheet?: (result: TourBarShellResult, actions: TourBarShellActions) => ReactNode;
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

function ThinkingText({ body }: { body: string }) {
  const tokens = body.match(/\S+|\s+/g) || [];
  let characterIndex = 0;

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {tokens.map((token, tokenIndex) => {
        if (/^\s+$/.test(token)) {
          characterIndex += token.length;
          return (
            <span key={`space-${tokenIndex}`}>
              {token.includes("\n") ? token : " "}
            </span>
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

export default function TourBarShell({
  primaryPlaceholder = "Ask SmartBar in plain English...",
  followUpPlaceholder = "Ask a follow-up...",
  launcherTitle = "TourBar natural-language search",
  launcherAriaLabel = "Open TourBar natural-language search",
  resultEyebrow = "Focus result",
  initialLoadingMessage = "Finding the right part of this site…",
  followUpLoadingMessage = "Thinking through that follow-up…",
  requireBookingContext = false,
  onPrimarySubmit,
  onFollowUpSubmit,
  getNextMoveTurnKind,
  onResult,
  onNextMove,
  buildThreadMessage = resultMessage,
  renderResultExtras,
  renderStandaloneSheet,
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

  const canSubmit = query.trim().length > 1 && !isLoading && !isAnswering;
  const canAskFollowUp =
    followUp.trim().length > 1 &&
    !isLoading &&
    !isAnswering &&
    Boolean(onFollowUpSubmit && result?.canFollowUp !== false);

  useEffect(() => {
    if (!isOpen) return;
    window.requestAnimationFrame(() => {
      queryRef.current?.focus();
      resizeTextarea(queryRef.current);
    });
  }, [isOpen]);

  useEffect(() => {
    resizeTextarea(queryRef.current);
  }, [query]);

  useEffect(() => {
    resizeTextarea(followUpRef.current);
  }, [followUp, result?.canFollowUp]);

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

  const submitQuery = async (
    nextQuery = query,
    bookingContextOverride?: TourBarBookingContext | null,
  ) => {
    const cleanQuery = nextQuery.trim();
    if (!cleanQuery || isLoading || isAnswering) return;

    const shouldRetractSheet = Boolean(result || standaloneResult || error);

    setBookingContextReturnResult(null);
    setIsOpen(true);
    setQuery(cleanQuery);
    setFollowUp("");

    if (shouldRetractSheet) {
      setError("");
      setResult(null);
      setStandaloneResult(null);
      setIsLoading(false);
      await wait(TOURBAR_SHEET_RETRACT_MS);
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

      setResult(response);
      appendThread([], cleanQuery, response);
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
    const activeResult = result;

    if (!cleanFollowUp || isLoading || isAnswering || !activeResult || !onFollowUpSubmit) return;

    const priorThread = thread.slice(-8);

    setBookingContextReturnResult(null);
    setIsOpen(true);
    setError("");
    setFollowUp("");
    setIsAnswering(true);
    setResult(null);
    setStandaloneResult(null);
    setLoadingMessage(followUpLoadingMessage);

    await wait(TOURBAR_SHEET_RETRACT_MS);

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

    setIsLoading(true);
    setIsAnswering(false);

    try {
      const response = await onFollowUpSubmit(cleanFollowUp, {
        currentResult: activeResult,
        thread: priorThread,
        bookingContext: bookingGate.context,
      });

      setResult(response);
      appendThread(priorThread, cleanFollowUp, response);
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
    await wait(TOURBAR_SHEET_RETRACT_MS);
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

  const runNextMove = async () => {
    const activeResult = result;
    const nextMove = activeResult?.nextMove;
    if (!activeResult || isLoading || isAnswering) return;

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

    void submitFollowUp(nextQuery);
  };

  const sheetVisible = isLoading || Boolean(error) || Boolean(result) || Boolean(standaloneResult);

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
    openBookingContextSheet: (field) => {
      openBookingContextSheet(field);
    },
    bookingContext: bookingContextController.context,
  };

  const standaloneSheet =
    standaloneResult && !isLoading && !error ? renderStandaloneSheet?.(standaloneResult, shellActions) : null;
  const isStandaloneSheet = Boolean(standaloneResult);
  const activeCollectionField = tourBarCollectionFieldFromResult(result);
  const activeCollectionPendingQuery = tourBarPendingQueryFromResult(result);
  const answerOnlyResult = isTourBarAnswerOnlyResult(result);

  const followUpComposer =
    onFollowUpSubmit && result?.canFollowUp !== false ? (
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
          onClick={() => void submitFollowUp()}
          disabled={!canAskFollowUp}
          className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Ask TourBar follow-up"
        >
          {isAnswering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    ) : null;

  return (
    <div data-tourbar-shell-root="true" className="relative z-[10060] h-9 w-9 shrink-0">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="tourbar-launcher"
            type="button"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onClick={() => setIsOpen(true)}
            className="group absolute inset-0 inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-950 text-white shadow-sm ring-1 ring-slate-950/10 transition hover:bg-slate-800"
            aria-label={launcherAriaLabel}
            title={launcherTitle}
          >
            <span className="pointer-events-none inline-flex h-full w-full items-center justify-center rounded-full animate-pulse">
              <Sparkles className="h-4 w-4" />
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="tourbar-open"
            data-tourbar-open-panel="true"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 top-1/2 w-[calc(100vw-2rem)] -translate-y-1/2 sm:w-[430px] md:w-[470px]"
          >
            <div className="relative">
              <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white/96 shadow-xl shadow-slate-950/12 ring-1 ring-white/70 backdrop-blur-xl">
                <div className="flex items-end gap-2 px-2.5 py-2">
                  <span className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                    <Search className="h-4 w-4" />
                  </span>
                  <textarea
                    ref={queryRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submitQuery();
                      }
                    }}
                    placeholder={primaryPlaceholder}
                    rows={1}
                    className="max-h-32 min-h-8 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm font-medium leading-6 text-slate-950 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => void submitQuery()}
                    disabled={!canSubmit}
                    className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Submit TourBar query"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close TourBar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {sheetVisible && (
                  <motion.div
                    key={`${standaloneResult ? "standalone" : result?.focusAreaId || result?.action || "sheet"}-${standaloneResult?.mode || result?.mode || (isLoading ? "loading" : "state")}`}
                    data-tourbar-sheet-panel="true"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: TOURBAR_SHEET_TRANSITION_SECONDS, ease: "easeInOut" }}
                    className="absolute left-0 right-0 top-[calc(100%-1px)] overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: "-100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "-100%" }}
                      transition={{ duration: TOURBAR_SHEET_TRANSITION_SECONDS, ease: "easeInOut" }}
                      className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain rounded-b-[24px] rounded-t-[14px] border border-slate-200 bg-white/96 shadow-2xl shadow-slate-950/16 ring-1 ring-white/70 backdrop-blur-xl"
                    >
                      {isLoading && (
                        <div className="px-4 py-4 text-sm font-medium text-slate-600">
                          <ThinkingText body={loadingMessage} />
                        </div>
                      )}

                      {error && (
                        <div className="px-4 py-4 text-sm leading-5 text-rose-700">
                          {error}
                        </div>
                      )}

                      {(result || standaloneResult) && (
                        <div>
                          {isStandaloneSheet ? (
                            <>
                              <div className="border-b border-emerald-100 bg-emerald-50/90 px-4 py-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700/70">
                                  Booking handoff
                                </div>
                                <div className="mt-1 text-sm font-semibold text-emerald-950">
                                  {standaloneResult?.title || result?.title || "Booking handoff"}
                                </div>
                              </div>

                              <div className="space-y-3 px-4 py-3">
                                {standaloneSheet}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  {resultEyebrow}
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">{result!.title}</div>
                              </div>

                              <div className="space-y-3 px-4 py-3">
                                {result!.body && (
                                  <MarkdownLite text={result!.body} />
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

                                {result!.invitation?.text && (
                                  result!.nextMove?.query || result!.nextMove?.focusAreaId ? (
                                    <button
                                      type="button"
                                      onClick={() => void runNextMove()}
                                      disabled={isLoading || isAnswering}
                                      className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold leading-5 text-slate-900 ring-1 ring-slate-200/80 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-55"
                                    >
                                      <span>{result!.invitation!.text}</span>
                                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5" />
                                    </button>
                                  ) : (
                                    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-5 text-slate-900 ring-1 ring-slate-200/80">
                                      {result!.invitation!.text}
                                    </div>
                                  )
                                )}

                                {followUpComposer}
                              </div>
                            </>
                          )}
                        </div>
                      )}
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
}
