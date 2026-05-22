import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Search,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";

const TOURBAR_API_URL = "/api/tourbar";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";
const TOURBAR_SHEET_TRANSITION_SECONDS = 0.66;
const TOURBAR_SHEET_RETRACT_MS = 680;
const THINKING_WIGGLE_DURATION = 1.15;
const THINKING_WIGGLE_STAGGER = 0.025;

export type TourBarFocusTarget = {
  pageId?: string;
  targetId?: string;
  targetSelector?: string;
  label?: string;
};

type TourBarInvitation = {
  kind?: string;
  text: string;
};

type TourBarResult = {
  ok?: boolean;
  mode?: "route" | "answer";
  action?: "NAVIGATE_ONLY" | "NAVIGATE_AND_ANSWER" | "NAVIGATE_AND_SUMMARIZE" | "ANSWER_ONLY" | "CLARIFY" | "OUT_OF_SCOPE";
  focusAreaId?: string;
  label?: string;
  pageId?: string;
  targetId?: string;
  targetSelector?: string;
  responseText?: string;
  answer?: string;
  invitation?: TourBarInvitation;
  answerMode?: string;
  suggestions?: string[];
};

type DomOutlineItem = {
  id: string;
  label: string;
  selector: string;
  textSample: string;
  tagName: string;
};

function getTourBotDemoToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOURBOT_AUTH_TOKEN_KEY) || "";
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function selectorForElement(element: Element) {
  const id = element.getAttribute("id");
  if (id) return `#${CSS.escape(id)}`;

  const tourId = element.getAttribute("data-tour-id");
  if (tourId) return `[data-tour-id="${CSS.escape(tourId)}"]`;

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;

  return element.tagName.toLowerCase();
}

function collectDomOutline(): DomOutlineItem[] {
  if (typeof document === "undefined") return [];

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        "main section[id]",
        "main article[id]",
        "main [data-tour-id]",
        "main h1[id]",
        "main h2[id]",
        "main h3[id]",
      ].join(","),
    ),
  );

  const seen = new Set<string>();

  return candidates
    .map((element) => {
      const id = element.getAttribute("id") || element.getAttribute("data-tour-id") || "";
      if (!id || seen.has(id)) return null;
      seen.add(id);

      const heading =
        element.querySelector("h1,h2,h3")?.textContent ||
        element.getAttribute("aria-label") ||
        element.getAttribute("data-tour-id") ||
        id;

      return {
        id,
        label: compactText(heading),
        selector: selectorForElement(element),
        textSample: compactText(element.innerText || element.textContent || "").slice(0, 420),
        tagName: element.tagName.toLowerCase(),
      };
    })
    .filter((item): item is DomOutlineItem => Boolean(item));
}

async function postTourBar(payload: Record<string, unknown>) {
  const token = getTourBotDemoToken();

  const response = await fetch(TOURBAR_API_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as TourBarResult & { message?: string };

  if (!response.ok) {
    throw new Error(body.message || "TourBar could not process that request.");
  }

  return body;
}

function hasNavigation(result: TourBarResult | null) {
  return Boolean(result?.targetId || result?.targetSelector);
}

function resultTitle(result: TourBarResult | null) {
  if (!result) return "TourBar";
  if (hasNavigation(result)) return `Showing: ${result.label || "Best match"}`;
  if (result.action === "CLARIFY") return "Help me narrow that down";
  if (result.action === "OUT_OF_SCOPE") return "This site is my focus";
  return result.label || "TourBar response";
}

function resultBody(result: TourBarResult | null) {
  if (!result) return "";
  return result.answer || result.responseText || "";
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

export default function TourBar({
  siteId = "nexapath",
  currentPageId,
  onNavigateToFocus,
}: {
  siteId?: string;
  currentPageId?: string;
  onNavigateToFocus?: (target: TourBarFocusTarget) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [result, setResult] = useState<TourBarResult | null>(null);
  const [error, setError] = useState("");
  const queryRef = useRef<HTMLTextAreaElement | null>(null);
  const followUpRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = query.trim().length > 1 && !isLoading;
  const canAskFollowUp = followUp.trim().length > 1 && !isAnswering && Boolean(result?.focusAreaId);


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
  }, [followUp, result?.focusAreaId]);

  const submitQuery = async (nextQuery = query) => {
    const cleanQuery = nextQuery.trim();
    if (!cleanQuery || isLoading) return;

    const shouldRetractSheet = Boolean(result || error);

    setIsOpen(true);
    setQuery(cleanQuery);
    setFollowUp("");

    if (shouldRetractSheet) {
      setError("");
      setResult(null);
      setIsLoading(false);
      await wait(TOURBAR_SHEET_RETRACT_MS);
    } else {
      setError("");
      setResult(null);
    }

    setIsLoading(true);

    try {
      const response = await postTourBar({
        mode: "route",
        siteId,
        query: cleanQuery,
        currentPageId,
        domOutline: collectDomOutline(),
        url: window.location.href,
      });

      setResult(response);

      if (hasNavigation(response)) {
        onNavigateToFocus?.({
          pageId: response.pageId,
          targetId: response.targetId,
          targetSelector: response.targetSelector,
          label: response.label,
        });
      }
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "TourBar hit an unexpected error.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitFollowUp = async () => {
    const cleanFollowUp = followUp.trim();
    if (!cleanFollowUp || isAnswering || !result?.focusAreaId) return;

    setError("");
    setIsAnswering(true);

    try {
      const response = await postTourBar({
        mode: "answer",
        siteId,
        query: cleanFollowUp,
        focusAreaId: result.focusAreaId,
        answerMode: result.answerMode,
        url: window.location.href,
      });

      setResult({
        ...result,
        ...response,
        mode: "answer",
        label: response.label || result.label,
        pageId: response.pageId || result.pageId,
        targetId: response.targetId || result.targetId,
        targetSelector: response.targetSelector || result.targetSelector,
        focusAreaId: response.focusAreaId || result.focusAreaId,
        invitation: response.invitation || result.invitation,
      });
      setFollowUp("");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "TourBar could not answer that follow-up.");
    } finally {
      setIsAnswering(false);
    }
  };

  const sheetVisible = isLoading || Boolean(error) || Boolean(result);

  return (
    <div className="relative z-[10060] h-9 w-9 shrink-0">
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
            aria-label="Open TourBar natural-language search"
            title="TourBar natural-language search"
          >
            <span className="pointer-events-none inline-flex h-full w-full items-center justify-center rounded-full animate-pulse">
              <Sparkles className="h-4 w-4" />
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="tourbar-open"
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
                    placeholder="Ask TourBar in plain English..."
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
                    key={`${result?.focusAreaId || result?.action || "sheet"}-${result?.mode || (isLoading ? "loading" : "state")}`}
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
                      className="rounded-b-[24px] rounded-t-[14px] border border-slate-200 bg-white/96 shadow-2xl shadow-slate-950/16 ring-1 ring-white/70 backdrop-blur-xl"
                    >
                      {isLoading && (
                        <div className="px-4 py-4 text-sm font-medium text-slate-600">
                          <ThinkingText body="Finding the right part of this site…" />
                        </div>
                      )}

                      {error && (
                        <div className="px-4 py-4 text-sm leading-5 text-rose-700">
                          {error}
                        </div>
                      )}

                      {result && (
                        <div>
                          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Focus result
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-950">{resultTitle(result)}</div>
                          </div>

                          <div className="space-y-3 px-4 py-3">
                            {resultBody(result) && (
                              <p className="text-sm leading-6 text-slate-700">{resultBody(result)}</p>
                            )}

                            {result.invitation?.text && (
                              <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-5 text-slate-900 ring-1 ring-slate-200/80">
                                {result.invitation.text}
                              </div>
                            )}

                            {result.focusAreaId && (
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
                                  placeholder="Ask a follow-up..."
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
                            )}
                          </div>
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
