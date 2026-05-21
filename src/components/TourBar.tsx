import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Loader2,
  Search,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";

const TOURBAR_API_URL = "/api/tourbar";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";

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

  const canSubmit = query.trim().length > 1 && !isLoading;
  const canAskFollowUp = followUp.trim().length > 1 && !isAnswering && Boolean(result?.focusAreaId);

  const promptSuggestions = useMemo(
    () => [
      "Do you help with DORA compliance?",
      "What services do you offer?",
      "Show me cybersecurity.",
      "How can I contact someone?",
    ],
    [],
  );

  const submitQuery = async (nextQuery = query) => {
    const cleanQuery = nextQuery.trim();
    if (!cleanQuery || isLoading) return;

    setIsOpen(true);
    setQuery(cleanQuery);
    setFollowUp("");
    setError("");
    setResult(null);
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

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[10040] sm:left-auto sm:right-5 sm:w-[420px]">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="tourbar-launcher"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => setIsOpen(true)}
            className="ml-auto flex w-full items-center justify-between rounded-full border border-slate-200 bg-white/94 px-3 py-2.5 text-left shadow-2xl shadow-slate-950/15 ring-1 ring-white/70 backdrop-blur-xl transition hover:bg-white sm:w-auto sm:min-w-[260px] sm:px-4"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                <Compass className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">TourBar</span>
                <span className="block truncate text-xs text-slate-500">Ask. Focus. Understand.</span>
              </span>
            </span>
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
          </motion.button>
        ) : (
          <motion.div
            key="tourbar-open"
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-950/[0.04] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-950">TourBar</div>
                  <div className="text-xs text-slate-500">Generative site search</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close TourBar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <textarea
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (result) setResult(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitQuery();
                    }
                  }}
                  placeholder="Ask what you're looking for..."
                  rows={1}
                  className="min-h-9 flex-1 resize-none bg-transparent text-sm font-medium leading-6 text-slate-950 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => void submitQuery()}
                  disabled={!canSubmit}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Submit TourBar query"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                </button>
              </div>

              {!result && !isLoading && !error && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submitQuery(suggestion)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Finding the best focus area…
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-3 text-sm leading-5 text-rose-700">
                  {error}
                </div>
              )}

              <AnimatePresence>
                {result && (
                  <motion.div
                    key={`${result.focusAreaId || result.action || "result"}-${result.mode || "route"}`}
                    initial={{ opacity: 0, y: 12, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 8, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50"
                  >
                    <div className="border-b border-slate-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Focus result
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">{resultTitle(result)}</div>
                    </div>

                    <div className="space-y-3 px-4 py-3">
                      {resultBody(result) && (
                        <p className="text-sm leading-6 text-slate-700">{resultBody(result)}</p>
                      )}

                      {result.invitation?.text && (
                        <div className="rounded-2xl bg-white px-3 py-2.5 text-sm font-medium leading-5 text-slate-900 shadow-sm">
                          {result.invitation.text}
                        </div>
                      )}

                      {result.focusAreaId && (
                        <div className="flex items-end gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                          <input
                            value={followUp}
                            onChange={(event) => setFollowUp(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void submitFollowUp();
                              }
                            }}
                            placeholder="Ask a follow-up..."
                            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => void submitFollowUp()}
                            disabled={!canAskFollowUp}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                            aria-label="Ask TourBar follow-up"
                          >
                            {isAnswering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          </button>
                        </div>
                      )}
                    </div>
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
