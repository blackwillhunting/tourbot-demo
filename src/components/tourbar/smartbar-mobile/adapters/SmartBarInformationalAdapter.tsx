import { useRef, type ReactNode } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileGenericAction,
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

type TourBarNextMove = {
  type?: string;
  label?: string;
  query?: string;
  focusAreaId?: string;
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
  nextMove?: TourBarNextMove;
  invitation?: {
    kind?: string;
    text: string;
  };
  handoffRecommended?: boolean;
};

type SmartBarInformationalThreadMessage = {
  role: "visitor" | "tourbar";
  content: string;
  focusAreaId?: string;
  answerMode?: string;
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
  return compactText(result.answer || result.responseText || "");
}

function messageFromResult(result: TourBarResult) {
  const invitation = result.invitation?.text || result.nextMove?.label || "";
  return [resultTitle(result), resultBody(result), invitation].filter(Boolean).join("\n");
}

function queryLooksLikeNewRoute(query: string) {
  return /\b(show|find|open|go to|where|pricing|services|implementation|consultation|contact|support|options|plans?|cyber|security|ai|data|cloud|compliance|dora|hedge|fund)\b/i.test(query);
}

function helperText(result: TourBarResult) {
  if (result.action === "CLARIFY") return "SmartBar needs one more detail before it can point you to the right section.";
  if (result.action === "OUT_OF_SCOPE") return "This SmartBar is scoped to this site.";
  if (hasNavigation(result)) return "SmartBar opened the matching part of the page.";
  if (result.nextMove?.label || result.invitation?.text || result.suggestions?.length) return "Use a suggested next step or ask another question.";
  return "Ask another question to continue.";
}

function actionId(prefix: string, value: string, index = 0) {
  return `${prefix}-${index}-${value}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function actionsFor(result: TourBarResult): SmartBarMobileGenericAction[] {
  const actions: SmartBarMobileGenericAction[] = [];
  const nextLabel = result.nextMove?.label || result.invitation?.text || "";
  const nextQuery = result.nextMove?.query || result.nextMove?.label || result.invitation?.text || "";

  if (nextLabel && nextQuery) {
    actions.push({
      id: actionId("next", nextQuery),
      label: nextLabel,
      helper: "Continue with SmartBar",
      variant: "primary",
    });
  }

  (result.suggestions || []).slice(0, 3).forEach((suggestion, index) => {
    actions.push({
      id: actionId("suggestion", suggestion, index),
      label: suggestion,
      helper: "Ask this next",
      variant: actions.length ? "secondary" : "primary",
    });
  });

  return actions;
}

function renderInlineEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function contentFor(result: TourBarResult): ReactNode | undefined {
  const body = resultBody(result);

  if (!body) return undefined;

  return (
    <div className="contents">
      <div className="rounded-[24px] border border-white/16 bg-slate-950/68 px-4 py-2 text-[15px] font-semibold leading-6 text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(2,6,23,0.14)] ring-1 ring-white/10">
        {renderInlineEmphasis(body)}
      </div>
    </div>
  );
}

function estimateInfoResultHeight(body: string, actionCount: number) {
  const cleanBody = compactText(body);
  const estimatedLines = Math.max(1, Math.ceil(cleanBody.length / 48));
  const answerBlockHeight = 46 + estimatedLines * 26;
  const actionBlockHeight = actionCount > 0 ? 18 + actionCount * 68 : 0;

  return Math.min(620, Math.max(actionCount > 0 ? 300 : 240, answerBlockHeight + actionBlockHeight + 24));
}

function toGenericResult(result: TourBarResult): SmartBarMobileGenericResult {
  const actions = actionsFor(result);
  const body = resultBody(result);
  const estimatedHeight = estimateInfoResultHeight(body, actions.length);

  return {
    surfaceKind: "info",
    eyebrow: hasNavigation(result) ? "Site match" : result.action === "ANSWER_ONLY" ? "SmartBar answer" : "SmartBar guide",
    title: resultTitle(result),
    body: contentFor(result) ? undefined : resultBody(result),
    helper: helperText(result),
    statusLabel: hasNavigation(result) ? "Site match" : result.action === "CLARIFY" ? "Clarify" : "Answer ready",
    actions,
    height: estimatedHeight,
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
  const activeResultRef = useRef<TourBarResult | null>(null);
  const threadRef = useRef<SmartBarInformationalThreadMessage[]>([]);

  const submitPrompt = async (query: string): Promise<SmartBarMobileSubmitResult> => {
    const activeResult = activeResultRef.current;
    const shouldAnswerFollowUp = Boolean(activeResult?.focusAreaId && !queryLooksLikeNewRoute(query));
    const response = shouldAnswerFollowUp
      ? await postTourBar({
          mode: "answer",
          siteId,
          query,
          focusAreaId: activeResult?.focusAreaId,
          answerMode: activeResult?.answerMode,
          thread: threadRef.current.slice(-8),
          url: window.location.href,
        })
      : await postTourBar({
          mode: "route",
          siteId,
          query,
          currentPageId,
          domOutline: collectDomOutline(),
          url: window.location.href,
        });

    activeResultRef.current = response;
    threadRef.current = [
      ...threadRef.current.slice(-6),
      { role: "visitor", content: query },
      {
        role: "tourbar",
        content: messageFromResult(response),
        focusAreaId: response.focusAreaId,
        answerMode: response.answerMode,
      },
    ];

    focusResult(response, currentPageId, onNavigateToFocus);
    return toGenericResult(response);
  };

  const submitGenericAction = (action: SmartBarMobileGenericAction) => {
    return submitPrompt(action.label);
  };

  return (
    <SmartBarMobileShell
      mode="overlay"
      entryModeLabel="Ask SmartBar"
      buildingLabel="Searching site..."
      onSubmitPrompt={submitPrompt}
      onGenericAction={submitGenericAction}
      onResetCart={() => {
        activeResultRef.current = null;
        threadRef.current = [];
      }}
    />
  );
}
