import { useState } from "react";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellResult,
  type TourBarThreadMessage,
} from "./TourBarShell";

const GUIDE_AI_URL = "/api/guide_ai";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";

export type TourBarOrderingFocusTarget = {
  targetId?: string;
  targetSelector?: string;
  label?: string;
};

type CarryoutQualifierOption = {
  label?: string;
  value?: string;
  qualifierId?: string;
  itemId?: string;
  lineItemId?: string;
  targetId?: string;
  selected?: boolean;
  state?: string;
};

type CarryoutQualifierGroup = {
  kind?: string;
  qualifierId?: string;
  label?: string;
  targetId?: string;
  itemId?: string;
  lineItemId?: string;
  required?: boolean;
  missing?: boolean;
  selectedValue?: string;
  selectedLabel?: string;
  options?: CarryoutQualifierOption[];
};

type CarryoutLine = {
  lineItemId?: string;
  id?: string;
  title?: string;
  quantity?: number;
  targetId?: string;
  lineSubtotal?: number;
  priceLabel?: string;
  status?: string;
  knownSelections?: string[];
  missingQualifiers?: Array<{ qualifierId?: string; label?: string; targetId?: string }>;
  qualifierGroups?: CarryoutQualifierGroup[];
};

type CarryoutOrder = {
  type?: string;
  status?: "ready_cart" | "needs_qualifier" | "cannot_match" | string;
  nextAction?: string;
  completeItems?: CarryoutLine[];
  pendingItems?: CarryoutLine[];
  items?: CarryoutLine[];
  currentStep?: {
    type?: string;
    itemId?: string | null;
    targetId?: string;
    qualifierId?: string | null;
    question?: string;
    label?: string;
  };
  currentQualifierControls?: CarryoutQualifierGroup[];
  navigationOrder?: string[];
  totals?: {
    status?: string;
    subtotal?: number | null;
    estimatedTax?: number | null;
    estimatedTotal?: number | null;
    currency?: string;
  };
};

type SuggestedAction = {
  type?: string;
  targetId?: string;
  targetSelector?: string;
  targetText?: string;
  lineItemId?: string | null;
  itemId?: string | null;
  qualifierGroups?: CarryoutQualifierGroup[];
};

type StepNarrative = {
  targetId?: string;
  targetText?: string;
  body?: string;
  lineItemId?: string | null;
  itemId?: string | null;
  qualifierGroups?: CarryoutQualifierGroup[];
};

type GuideAiCarryoutResponse = {
  title?: string;
  answer?: string;
  body?: string;
  message?: string;
  reply?: string;
  commerceAction?: string;
  displayMode?: string;
  suggestedAction?: SuggestedAction | null;
  rankedDestinations?: SuggestedAction[];
  stepNarratives?: StepNarrative[];
  navigationOrder?: string[];
  refinementChips?: string[];
  visibleContext?: { carryoutOrder?: CarryoutOrder | null } | null;
  carryoutOrder?: CarryoutOrder | null;
};

type PageSection = {
  id: string;
  label: string;
  summary: string;
};

const guideConfig = {
  mode: "commerce",
  label: "BurgerRush Carryout",
  catalogMode: "carryout_ordering",
  features: {
    refinementChips: true,
    bookingActions: true,
    navigation: true,
  },
  packIds: {
    catalog: "carryout_cart_catalog",
  },
};

function getTourBotDemoToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOURBOT_AUTH_TOKEN_KEY) || "";
}

function buildGuideAiHeaders() {
  const token = getTourBotDemoToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function compact(value: unknown, maxChars = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function getPageSections(): PageSection[] {
  if (typeof document === "undefined") return [];

  return Array.from(document.querySelectorAll<HTMLElement>("section[id], [data-tour-id], [id]"))
    .slice(0, 80)
    .map((node) => {
      const id = node.getAttribute("data-tour-id") || node.id;
      const heading = node.querySelector("h1,h2,h3")?.textContent?.trim();
      const summary = compact(node.innerText || node.textContent || "", 500);
      return {
        id: id || "",
        label: heading || id || "Page section",
        summary,
      };
    })
    .filter((section) => section.id && section.summary);
}

function extractCarryoutOrder(response: GuideAiCarryoutResponse): CarryoutOrder | null {
  return response.carryoutOrder ?? response.visibleContext?.carryoutOrder ?? null;
}

async function postGuideAi(
  message: string,
  carryoutOrder: CarryoutOrder | null,
  thread: TourBarThreadMessage[],
) {
  const recentUserMessages = thread
    .filter((item) => item.role === "visitor")
    .map((item) => item.content)
    .slice(-4);

  const response = await fetch(GUIDE_AI_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: buildGuideAiHeaders(),
    body: JSON.stringify({
      mode: "commerce",
      guideConfig,
      message,
      conversationContext: {
        singleTurn: thread.length === 0,
        lastUserMessage: message,
        recentUserMessages,
        commerceContext: {
          carryoutOrder,
        },
      },
      visibleContext: {
        carryoutOrder,
      },
      pageContext: {
        url: window.location.href,
        title: document.title,
        sections: getPageSections(),
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as GuideAiCarryoutResponse & { message?: string };

  if (!response.ok) {
    throw new Error(body.answer || body.message || body.body || "TourBar could not process that order.");
  }

  return body;
}

function money(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `$${value.toFixed(2)}`;
}

function primaryTarget(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const action = response.commerceAction || "";
  const displayMode = response.displayMode || "";

  if (action.includes("checkout")) return "checkout-handoff";
  if (action.includes("show_cart") || displayMode.includes("cart_panel")) return "cart-preview";

  return (
    response.suggestedAction?.targetId ||
    response.rankedDestinations?.find((item) => item?.targetId)?.targetId ||
    response.stepNarratives?.find((item) => item?.targetId)?.targetId ||
    order?.currentStep?.targetId ||
    order?.navigationOrder?.[0] ||
    "cart-preview"
  );
}

function titleFor(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const action = response.commerceAction || "";
  const status = order?.status || "";

  if (action.includes("checkout_handoff")) return "Ready for checkout";
  if (action.includes("checkout_blocked")) return "Choices needed before checkout";
  if (action.includes("show_cart")) return "Draft cart";
  if (status === "ready_cart" || action.includes("ready_cart")) return "Ready cart";
  if (status === "needs_qualifier" || action.includes("needs_qualifier")) return "Needs choices";
  if (status === "cannot_match" || action.includes("cannot_match")) return "Could not match that order";
  return response.title || "BurgerRush order";
}

function bodyFor(response: GuideAiCarryoutResponse) {
  return response.answer || response.body || response.reply || response.message || "I received the order, but the backend did not return a response.";
}

function invitationFor(order: CarryoutOrder | null, response: GuideAiCarryoutResponse) {
  const action = response.commerceAction || "";
  const pendingCount = order?.pendingItems?.length || 0;
  const readyCount = order?.completeItems?.length || 0;

  if (action.includes("checkout_handoff")) return undefined;
  if (pendingCount > 0) return undefined;
  if (readyCount > 0 || order?.status === "ready_cart") {
    return {
      invitation: { kind: "checkout", text: "Review checkout handoff" },
      nextMove: { type: "handoff", label: "Review checkout handoff", query: "checkout" },
    };
  }
  return undefined;
}

function toShellResult(response: GuideAiCarryoutResponse): TourBarShellResult {
  const order = extractCarryoutOrder(response);
  const invitation = invitationFor(order, response);

  return {
    title: titleFor(response, order),
    body: bodyFor(response),
    invitation: invitation?.invitation,
    nextMove: invitation?.nextMove,
    canFollowUp: true,
    targetId: primaryTarget(response, order),
    label: response.suggestedAction?.targetText || titleFor(response, order),
    mode: response.displayMode,
    action: response.commerceAction,
    raw: response,
  };
}

function lineKey(line: CarryoutLine) {
  return line.lineItemId || line.id || line.title || Math.random().toString(36);
}

function allLines(order: CarryoutOrder | null) {
  const complete = order?.completeItems || [];
  const pending = order?.pendingItems || [];
  return [...complete, ...pending];
}

function lineTitleForGroup(order: CarryoutOrder | null, group: CarryoutQualifierGroup) {
  const line = allLines(order).find((item) => {
    const key = item.lineItemId || item.id;
    return key && (key === group.lineItemId || key === group.itemId);
  });

  return line?.title || "this item";
}

function qualifierGroupsForOrder(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const direct = order?.currentQualifierControls || [];
  if (direct.length) return direct;

  const firstPending = order?.pendingItems?.find((item) => item.qualifierGroups?.length);
  if (firstPending?.qualifierGroups?.length) return firstPending.qualifierGroups;

  const narrative = response.stepNarratives?.find((item) => item.qualifierGroups?.length);
  return narrative?.qualifierGroups || [];
}

function OrderSummary({ result, actions }: { result: TourBarShellResult; actions: TourBarShellActions }) {
  const response = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = extractCarryoutOrder(response);
  if (!order) return null;

  const lines = allLines(order);
  const groups = qualifierGroupsForOrder(response, order);
  const totals = order.totals || {};
  const estimatedTotal = money(totals.estimatedTotal);

  return (
    <div className="space-y-3">
      {lines.length > 0 && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">
              Draft cart
            </div>
            {estimatedTotal && (
              <div className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black text-white">
                {estimatedTotal}
              </div>
            )}
          </div>

          <div className="mt-2 space-y-2">
            {lines.slice(0, 6).map((line) => {
              const pending = Boolean(line.missingQualifiers?.length);
              return (
                <button
                  key={lineKey(line)}
                  type="button"
                  onClick={() => {
                    if (line.targetId) actions.submitFollowUp(`Show me ${line.title || "this item"}`);
                  }}
                  className="w-full rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-orange-100/80 transition hover:bg-orange-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black text-slate-950">
                        {(line.quantity || 1) > 1 ? `${line.quantity} × ` : ""}{line.title || line.id || "Item"}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                        {pending ? "Needs choices" : "Ready"}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${pending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {pending ? "Pending" : "Ready"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
          {groups.map((group) => (
            <div key={`${group.lineItemId || group.itemId || "line"}-${group.qualifierId || group.label}`}>
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {group.label || "Choose option"}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(group.options || []).map((option) => {
                  const selected = Boolean(option.selected || option.state === "selected");
                  return (
                    <button
                      key={`${group.qualifierId || option.qualifierId}-${option.value || option.label}`}
                      type="button"
                      onClick={() => {
                        const lineTitle = lineTitleForGroup(order, group);
                        actions.submitFollowUp(`Set ${lineTitle} ${group.label || "choice"} to ${option.label || option.value}`);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                        selected
                          ? "bg-slate-950 text-white"
                          : "bg-orange-50 text-orange-800 ring-1 ring-orange-100 hover:bg-orange-100"
                      }`}
                    >
                      {option.label || option.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function messageFromResult(result: TourBarShellResult) {
  const response = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = extractCarryoutOrder(response);
  const itemCount = allLines(order).length;
  const cartLine = itemCount ? `Draft cart lines: ${itemCount}` : "";
  return [result.title, result.body, cartLine].filter(Boolean).join("\n");
}

export default function TourBarOrdering({
  onNavigateToFocus,
}: {
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void;
}) {
  const [carryoutOrder, setCarryoutOrder] = useState<CarryoutOrder | null>(null);

  const submit = async (query: string, thread: TourBarThreadMessage[]) => {
    const response = await postGuideAi(query, carryoutOrder, thread);
    const nextOrder = extractCarryoutOrder(response);
    if (response.visibleContext && "carryoutOrder" in response.visibleContext) {
      setCarryoutOrder(nextOrder);
    } else if (response.carryoutOrder !== undefined) {
      setCarryoutOrder(nextOrder);
    }
    return toShellResult(response);
  };

  return (
    <TourBarShell
      primaryPlaceholder="Tell TourBar your BurgerRush order..."
      followUpPlaceholder="Add items, pick choices, or say checkout..."
      launcherTitle="TourBar carryout ordering"
      launcherAriaLabel="Open TourBar carryout ordering"
      resultEyebrow="BurgerRush order"
      initialLoadingMessage="Building your BurgerRush draft cart…"
      followUpLoadingMessage="Updating your order…"
      buildThreadMessage={messageFromResult}
      onPrimarySubmit={async (query) => submit(query, [])}
      onFollowUpSubmit={async (query, context) => submit(query, context.thread.slice(-8))}
      getNextMoveTurnKind={() => "followup"}
      renderResultExtras={(result, actions) => <OrderSummary result={result} actions={actions} />}
      onResult={(result) => {
        if (result.targetId || result.targetSelector) {
          onNavigateToFocus?.({
            targetId: result.targetId,
            targetSelector: result.targetSelector,
            label: result.label,
          });
        }
      }}
    />
  );
}
