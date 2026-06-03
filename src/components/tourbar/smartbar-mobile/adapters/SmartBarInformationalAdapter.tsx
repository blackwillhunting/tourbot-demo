import type { ReactNode } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileGenericResult,
  type SmartBarMobileSubmitResult,
} from "../SmartBarMobileShell";
import { smartbarFocusTarget } from "../../smartbarFocusController";

const TOURBAR_API_URL = "/api/tourbar";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";

type TourBarFocusTarget = {
  pageId?: string;
  targetId?: string;
  targetSelector?: string;
  label?: string;
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
  answerMode?: string;
  suggestions?: string[];
  nextMove?: {
    type?: string;
    label?: string;
    query?: string;
    focusAreaId?: string;
  };
  invitation?: {
    kind?: string;
    text: string;
  };
  handoffRecommended?: boolean;
};

type DomOutlineItem = {
  id: string;
  label: string;
  selector: string;
  textSample: string;
  tagName: string;
};

type SmartBarInformationalAdapterProps = {
  siteId?: string;
  currentPageId?: string;
  onNavigateToFocus?: (target: TourBarFocusTarget) => void;
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
    throw new Error(body.message || "SmartBar could not process that request.");
  }

  return body;
}

function hasNavigation(result: TourBarResult | null) {
  return Boolean(result?.targetId || result?.targetSelector);
}

function resultTitle(result: TourBarResult | null) {
  if (!result) return "SmartBar";
  if (hasNavigation(result)) return result.label || "Best match";
  if (result.action === "CLARIFY") return "Help me narrow that down";
  if (result.action === "OUT_OF_SCOPE") return "This site is my focus";
  return result.label || "SmartBar response";
}

function resultBody(result: TourBarResult | null) {
  if (!result) return "";
  return result.answer || result.responseText || "";
}

function helperText(result: TourBarResult) {
  if (result.action === "CLARIFY") return "SmartBar needs one more detail before it can point you to the right section.";
  if (result.action === "OUT_OF_SCOPE") return "This SmartBar is scoped to this site.";
  if (hasNavigation(result)) return "SmartBar opened the matching part of the page.";
  return "Ask another question to continue.";
}

function contentFor(result: TourBarResult): ReactNode | undefined {
  const suggestions = result.suggestions || [];
  if (!suggestions.length) return undefined;

  return (
    <div className="space-y-2">
      {resultBody(result) && (
        <div className="rounded-[24px] border border-sky-100/42 bg-sky-400/78 px-4 py-3 text-[15px] font-bold leading-6 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(14,165,233,0.20)] ring-1 ring-sky-100/30">
          {resultBody(result)}
        </div>
      )}
      <div className="rounded-[22px] border border-white/24 bg-slate-950/86 px-4 py-3 text-sm font-semibold leading-5 text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(2,6,23,0.22)] ring-1 ring-white/14">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/48">Suggested next questions</div>
        <div className="mt-2 space-y-1.5">
          {suggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/82">
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function toGenericResult(result: TourBarResult): SmartBarMobileGenericResult {
  return {
    surfaceKind: "info",
    eyebrow: hasNavigation(result) ? "Site match" : "SmartBar answer",
    title: resultTitle(result),
    body: contentFor(result) ? undefined : resultBody(result),
    helper: helperText(result),
    statusLabel: hasNavigation(result) ? "Opened" : "Answer",
    height: result.suggestions?.length ? 430 : 360,
    content: contentFor(result),
  };
}

function focusResult(result: TourBarResult, currentPageId?: string, onNavigateToFocus?: (target: TourBarFocusTarget) => void) {
  if (!result.targetId && !result.targetSelector) return;

  const target = {
    pageId: result.pageId,
    targetId: result.targetId,
    targetSelector: result.targetSelector,
    label: result.label,
  };
  const pageWillChange = Boolean(result.pageId && result.pageId !== currentPageId);

  onNavigateToFocus?.(target);
  void smartbarFocusTarget(target, {
    initialDelayMs: pageWillChange ? 980 : 420,
    attempts: 28,
    scrollBehavior: "auto",
    overlayDurationMs: 3600,
    dispatchLegacyEvent: false,
  });
}

export default function SmartBarInformationalAdapter({
  siteId = "nexapath",
  currentPageId,
  onNavigateToFocus,
}: SmartBarInformationalAdapterProps) {
  const submitPrompt = async (query: string): Promise<SmartBarMobileSubmitResult> => {
    const response = await postTourBar({
      mode: "route",
      siteId,
      query,
      currentPageId,
      domOutline: collectDomOutline(),
      url: window.location.href,
    });

    focusResult(response, currentPageId, onNavigateToFocus);
    return toGenericResult(response);
  };

  return (
    <SmartBarMobileShell
      mode="overlay"
      entryModeLabel="Ask SmartBar"
      buildingLabel="Searching site..."
      onSubmitPrompt={submitPrompt}
    />
  );
}
