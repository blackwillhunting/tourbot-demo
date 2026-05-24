import TourBarShell, {
  type TourBarInvitation,
  type TourBarNextMove,
  type TourBarShellResult,
  type TourBarThreadMessage,
} from "./TourBarShell";
import { smartbarFocusTarget } from "./smartbarFocusController";

const TOURBAR_API_URL = "/api/tourbar";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";

export type TourBarFocusTarget = {
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
  invitation?: TourBarInvitation;
  answerMode?: string;
  suggestions?: string[];
  nextMove?: TourBarNextMove;
  knowledgeKey?: string;
  relatedFocusAreaIds?: string[];
  confidence?: string;
  canAnswer?: boolean;
  handoffRecommended?: boolean;
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

function messageFromResult(result: TourBarShellResult) {
  const invitation = result.invitation?.text || result.nextMove?.label || "";
  return [result.title, result.body, invitation].filter(Boolean).join("\n");
}

function toShellResult(result: TourBarResult, fallback?: TourBarShellResult | null): TourBarShellResult {
  return {
    title: resultTitle(result),
    body: resultBody(result),
    invitation: result.invitation || fallback?.invitation,
    nextMove: result.nextMove || fallback?.nextMove,
    canFollowUp: Boolean(result.focusAreaId || fallback?.focusAreaId),
    focusAreaId: result.focusAreaId || fallback?.focusAreaId,
    answerMode: result.answerMode || fallback?.answerMode,
    pageId: result.pageId || fallback?.pageId,
    targetId: result.targetId || fallback?.targetId,
    targetSelector: result.targetSelector || fallback?.targetSelector,
    label: result.label || fallback?.label,
    mode: result.mode || fallback?.mode,
    action: result.action || fallback?.action,
    raw: result,
  };
}

function nextMoveShouldRoute(nextMove?: TourBarNextMove, currentFocusAreaId?: string) {
  if (!nextMove) return false;

  const nextFocusAreaId = nextMove.focusAreaId?.trim();

  if (nextMove.type === "show_related_area" || nextMove.type === "handoff") {
    return Boolean(nextFocusAreaId && nextFocusAreaId !== currentFocusAreaId);
  }

  return false;
}

export default function TourBarInformational({
  siteId = "nexapath",
  currentPageId,
  onNavigateToFocus,
}: {
  siteId?: string;
  currentPageId?: string;
  onNavigateToFocus?: (target: TourBarFocusTarget) => void;
}) {
  return (
    <TourBarShell
      consultantChat={{
        enabled: true,
        eyebrow: "Consultant handoff",
        title: "Talk to a consultant",
        placeholder: "Tell us what you would like help with...",
        waitingMessage: "Hold for next consultant...",
        confirmationMessage: "Thanks — someone will be with you shortly.",
      }}
      buildThreadMessage={messageFromResult}
      getNextMoveTurnKind={(nextMove, currentResult) =>
        nextMoveShouldRoute(nextMove, currentResult?.focusAreaId) ? "primary" : "followup"
      }
      onPrimarySubmit={async (query) => {
        const response = await postTourBar({
          mode: "route",
          siteId,
          query,
          currentPageId,
          domOutline: collectDomOutline(),
          url: window.location.href,
        });

        return toShellResult(response);
      }}
      onFollowUpSubmit={async (query, context) => {
        const activeResult = context.currentResult;
        if (!activeResult?.focusAreaId) {
          throw new Error("TourBar needs a focus area before answering a follow-up.");
        }

        const response = await postTourBar({
          mode: "answer",
          siteId,
          query,
          focusAreaId: activeResult.focusAreaId,
          answerMode: activeResult.answerMode,
          thread: context.thread.slice(-8) as TourBarThreadMessage[],
          url: window.location.href,
        });

        return toShellResult(response, activeResult);
      }}
      onResult={(result) => {
        if (result.targetId || result.targetSelector) {
          const target = {
            pageId: result.pageId,
            targetId: result.targetId,
            targetSelector: result.targetSelector,
            label: result.label,
          };
          onNavigateToFocus?.(target);
          void smartbarFocusTarget(target, { initialDelayMs: 720 });
        }
      }}
    />
  );
}
