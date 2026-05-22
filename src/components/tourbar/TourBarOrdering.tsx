import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  reviewIndex?: number | null;
  reviewCount?: number | null;
};

type StepNarrative = {
  targetId?: string;
  targetText?: string;
  body?: string;
  lineItemId?: string | null;
  itemId?: string | null;
  qualifierGroups?: CarryoutQualifierGroup[];
  reviewIndex?: number | null;
  reviewCount?: number | null;
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

type ReviewItem = {
  key: string;
  index: number;
  line: CarryoutLine;
  label: string;
  targetId?: string;
  targetSelector?: string;
  targetText?: string;
  pending: boolean;
  groups: CarryoutQualifierGroup[];
  narrative?: StepNarrative;
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

function lineStableKey(line: CarryoutLine, index = 0) {
  if (line.lineItemId) return line.lineItemId;
  const base = line.id || line.title || "item";
  return `${base}-${index}`;
}

function lineIdentityKeys(line: CarryoutLine): string[] {
  return [line.lineItemId, line.id].filter((value): value is string => Boolean(value));
}

function allLines(order: CarryoutOrder | null) {
  if (!order) return [];

  const base = order.items?.length
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];

  // Keep review traversal occurrence-based. Repeated menu items can share the
  // same catalog id, so id-based map merging causes selections from item 1 to
  // appear on item 2. Only the backend-provided lineItemId is treated as a
  // globally stable identity; otherwise the line's position is part of identity.
  return base.map((line) => ({ ...line }));
}

function lineIsPending(line: CarryoutLine) {
  const status = String(line.status || "").toLowerCase();
  return Boolean(
    status.includes("pending") ||
      status.includes("need") ||
      line.missingQualifiers?.length ||
      line.qualifierGroups?.some((group) => group.missing),
  );
}

function linePrice(line: CarryoutLine) {
  return line.priceLabel || money(line.lineSubtotal);
}

function lineLabel(line: CarryoutLine) {
  return `${(line.quantity || 1) > 1 ? `${line.quantity} × ` : ""}${line.title || line.id || "Item"}`;
}

function targetForLine(line: CarryoutLine, narrative?: StepNarrative, fallbackTarget?: string) {
  return narrative?.targetId || line.targetId || fallbackTarget;
}

function actionMatchesLine(action: SuggestedAction | StepNarrative | null | undefined, line: CarryoutLine) {
  if (!action) return false;
  const lineKeys = lineIdentityKeys(line);
  return Boolean(
    (action.lineItemId && lineKeys.includes(action.lineItemId)) ||
      (action.itemId && lineKeys.includes(action.itemId)) ||
      (action.targetId && action.targetId === line.targetId),
  );
}

function groupMatchesLine(group: CarryoutQualifierGroup, line: CarryoutLine, order: CarryoutOrder | null, firstPendingKey?: string) {
  const lineKeys = lineIdentityKeys(line);
  if (group.lineItemId || group.itemId) {
    return Boolean(
      (group.lineItemId && lineKeys.includes(group.lineItemId)) ||
        (group.itemId && lineKeys.includes(group.itemId)),
    );
  }

  const currentStepItemId = order?.currentStep?.itemId || "";
  if (currentStepItemId && lineKeys.includes(currentStepItemId)) return true;

  return Boolean(firstPendingKey && lineStableKey(line) === firstPendingKey);
}

function qualifierKey(group: CarryoutQualifierGroup) {
  return String(group.qualifierId || group.label || group.targetId || "options")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionKey(option: CarryoutQualifierOption) {
  return String(option.value || option.label || "option")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function firstRawSelectedOption(group: CarryoutQualifierGroup) {
  return (group.options || []).find((option) => option.selected || option.state === "selected");
}

function groupSelectedValue(group: CarryoutQualifierGroup) {
  const selected = firstRawSelectedOption(group);
  return group.selectedValue || group.selectedLabel || selected?.value || selected?.label || "";
}

function groupSelectedLabel(group: CarryoutQualifierGroup) {
  const selected = firstRawSelectedOption(group);
  return group.selectedLabel || group.selectedValue || selected?.label || selected?.value || "";
}

function groupHasSelection(group: CarryoutQualifierGroup) {
  return Boolean(groupSelectedValue(group) || groupSelectedLabel(group));
}

function mergeQualifierGroups(
  preferred: CarryoutQualifierGroup,
  fallback: CarryoutQualifierGroup,
) {
  const preferredSelected = groupHasSelection(preferred);
  const fallbackSelected = groupHasSelection(fallback);
  const selectedValue = groupSelectedValue(preferred) || groupSelectedValue(fallback);
  const selectedLabel = groupSelectedLabel(preferred) || groupSelectedLabel(fallback);

  const options = new Map<string, CarryoutQualifierOption>();
  const addOption = (option: CarryoutQualifierOption) => {
    const key = optionKey(option);
    const existing = options.get(key);
    if (!existing) {
      options.set(key, option);
      return;
    }

    options.set(key, {
      ...option,
      ...existing,
    });
  };

  (preferred.options || []).forEach(addOption);
  (fallback.options || []).forEach(addOption);

  const merged: CarryoutQualifierGroup = {
    ...fallback,
    ...preferred,
    selectedValue,
    selectedLabel,
    missing: preferredSelected || fallbackSelected ? false : Boolean(preferred.missing || fallback.missing),
    options: Array.from(options.values()).map((option) => {
      const selected = selectedValue || selectedLabel
        ? Boolean(
            (selectedValue && valuesEqual(option.value || option.label, selectedValue)) ||
              (selectedLabel && valuesEqual(option.label || option.value, selectedLabel)),
          )
        : Boolean(option.selected || option.state === "selected");

      return {
        ...option,
        selected,
        state: selected ? "selected" : "available",
      };
    }),
  };

  return merged;
}


function coalesceQualifierGroups(groups: CarryoutQualifierGroup[]) {
  const byQualifier = new Map<string, CarryoutQualifierGroup>();

  for (const group of groups) {
    if (!(group.options || []).length) continue;

    const key = qualifierKey(group);
    const existing = byQualifier.get(key);
    byQualifier.set(key, existing ? mergeQualifierGroups(existing, group) : group);
  }

  return Array.from(byQualifier.values());
}

function groupsForLine(
  response: GuideAiCarryoutResponse,
  order: CarryoutOrder | null,
  line: CarryoutLine,
  narrative?: StepNarrative,
) {
  const lines = allLines(order);
  const firstPending = lines.find(lineIsPending);
  const firstPendingKey = firstPending ? lineStableKey(firstPending) : undefined;
  const direct = line.qualifierGroups || [];
  const current = (order?.currentQualifierControls || []).filter((group) => groupMatchesLine(group, line, order, firstPendingKey));
  const fromNarrative = (narrative?.qualifierGroups || []).filter((group) => groupMatchesLine(group, line, order, firstPendingKey));
  const fromActions = [response.suggestedAction, ...(response.rankedDestinations || [])]
    .filter((action): action is SuggestedAction => Boolean(action && actionMatchesLine(action, line)))
    .flatMap((action) => action.qualifierGroups || []);

  // Keep one active sheet per order line. The backend can return the same
  // qualifier controls through multiple channels; render each qualifier once,
  // preferring the line-local review state and using current/action data only
  // to fill gaps.
  return coalesceQualifierGroups([...direct, ...current, ...fromNarrative, ...fromActions]);
}

function reviewItemsFrom(response: GuideAiCarryoutResponse, order: CarryoutOrder | null): ReviewItem[] {
  const lines = allLines(order);
  const narratives = response.stepNarratives || [];

  return lines.map((line, index) => {
    const narrative = narratives.find((item) => actionMatchesLine(item, line));
    const fallbackTarget =
      response.navigationOrder?.[index] ||
      response.rankedDestinations?.find((item) => actionMatchesLine(item, line))?.targetId ||
      order?.currentStep?.targetId;

    return {
      key: lineStableKey(line, index),
      index,
      line,
      label: lineLabel(line),
      targetId: targetForLine(line, narrative, fallbackTarget),
      targetText: narrative?.targetText,
      pending: lineIsPending(line),
      groups: groupsForLine(response, order, line, narrative),
      narrative,
    };
  });
}

function initialReviewIndexFor(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const items = reviewItemsFrom(response, order);
  if (!items.length) return 0;

  const currentItemId = order?.currentStep?.itemId;
  if (currentItemId) {
    const currentIndex = items.findIndex((item) => lineIdentityKeys(item.line).includes(currentItemId));
    if (currentIndex >= 0) return currentIndex;
  }

  const pendingIndex = items.findIndex((item) => item.pending);
  return pendingIndex >= 0 ? pendingIndex : 0;
}

function primaryTarget(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const action = response.commerceAction || "";
  const displayMode = response.displayMode || "";
  const items = reviewItemsFrom(response, order);
  const initialItem = items[initialReviewIndexFor(response, order)];

  if (action.includes("checkout")) return "checkout-handoff";
  if (initialItem?.targetId) return initialItem.targetId;
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
  if (status === "ready_cart" || action.includes("ready_cart")) return "Review order";
  if (status === "needs_qualifier" || action.includes("needs_qualifier")) return "Needs choices";
  if (status === "cannot_match" || action.includes("cannot_match")) return "Could not match that order";
  if (action.includes("show_cart")) return "Review order";
  return response.title || "BurgerRush order";
}

function bodyFor(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const items = reviewItemsFrom(response, order);
  if (items.length) {
    const pendingCount = items.filter((item) => item.pending).length;
    if (pendingCount > 0) {
      return "Review items and pick the missing choices.";
    }
    return "Review items or show the cart.";
  }

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
    body: bodyFor(response, order),
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

function optionIsSelected(group: CarryoutQualifierGroup, option: CarryoutQualifierOption) {
  const selectedValue = groupSelectedValue(group);
  const selectedLabel = groupSelectedLabel(group);

  if (selectedValue || selectedLabel) {
    return Boolean(
      (selectedValue && valuesEqual(option.value || option.label, selectedValue)) ||
        (selectedLabel && valuesEqual(option.label || option.value, selectedLabel)),
    );
  }

  return Boolean(option.selected || option.state === "selected");
}

function valuesEqual(a: unknown, b: unknown) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function optionMatchesOption(a: CarryoutQualifierOption, b: CarryoutQualifierOption) {
  return Boolean(
    (a.value && b.value && valuesEqual(a.value, b.value)) ||
      (a.label && b.label && valuesEqual(a.label, b.label)),
  );
}

function groupMatchesGroup(a: CarryoutQualifierGroup, b: CarryoutQualifierGroup) {
  return Boolean(
    (a.qualifierId && b.qualifierId && a.qualifierId === b.qualifierId) ||
      (a.label && b.label && a.label === b.label),
  );
}

function selectedOptionLabels(group: CarryoutQualifierGroup) {
  return (group.options || [])
    .filter((option) => optionIsSelected(group, option))
    .map((option) => option.label || option.value)
    .filter(Boolean) as string[];
}

function withSelectedOption(group: CarryoutQualifierGroup, option: CarryoutQualifierOption) {
  const selectedValue = option.value || option.label || "";
  const selectedLabel = option.label || option.value || "";

  return {
    ...group,
    missing: false,
    selectedValue,
    selectedLabel,
    options: (group.options || []).map((candidate) => {
      const selected = optionMatchesOption(candidate, option);
      return {
        ...candidate,
        selected,
        state: selected ? "selected" : "available",
      };
    }),
  };
}

function updateLineWithLocalSelection(
  line: CarryoutLine,
  item: ReviewItem,
  group: CarryoutQualifierGroup,
  option: CarryoutQualifierOption,
) {
  const oldSelectedLabels = selectedOptionLabels(group);
  const selectedLabel = option.label || option.value || "";
  const selectedValue = option.value || option.label || "";
  const nextLine: CarryoutLine = { ...line };
  let foundGroup = false;

  const updatedGroups = (nextLine.qualifierGroups || []).map((candidate) => {
    if (!groupMatchesGroup(candidate, group)) return candidate;
    foundGroup = true;
    return withSelectedOption(candidate, option);
  });

  if (!foundGroup) {
    updatedGroups.push(withSelectedOption({ ...group, lineItemId: group.lineItemId || item.line.lineItemId, itemId: group.itemId || item.line.id }, option));
  }

  nextLine.qualifierGroups = updatedGroups;
  nextLine.missingQualifiers = (nextLine.missingQualifiers || []).filter((missing) => {
    if (group.qualifierId && missing.qualifierId === group.qualifierId) return false;
    if (group.label && missing.label === group.label) return false;
    return true;
  });

  const groupOptionLabels = (group.options || [])
    .flatMap((candidate) => [candidate.label, candidate.value])
    .filter(Boolean) as string[];
  const knownSelections = new Set((nextLine.knownSelections || []).filter(Boolean));
  for (const label of [...oldSelectedLabels, ...groupOptionLabels]) knownSelections.delete(label);
  if (group.selectedLabel) knownSelections.delete(group.selectedLabel);
  if (group.selectedValue) knownSelections.delete(group.selectedValue);
  if (selectedLabel) knownSelections.add(selectedLabel);
  if (!selectedLabel && selectedValue) knownSelections.add(selectedValue);
  nextLine.knownSelections = Array.from(knownSelections);

  const stillPending = Boolean(
    nextLine.missingQualifiers?.length ||
      nextLine.qualifierGroups?.some((candidate) => candidate.missing && candidate.options?.every((option) => !optionIsSelected(candidate, option))),
  );

  nextLine.status = stillPending ? "needs_qualifier" : "ready";
  return nextLine;
}

function rebuildOrderCollections(order: CarryoutOrder) {
  const lines = allLines(order);
  const completeItems = lines.filter((line) => !lineIsPending(line));
  const pendingItems = lines.filter(lineIsPending);

  return {
    ...order,
    items: lines,
    completeItems,
    pendingItems,
    status: pendingItems.length ? "needs_qualifier" : "ready_cart",
    nextAction: pendingItems.length ? order.nextAction : "show_cart",
  };
}

function applyLocalQualifierSelection(
  order: CarryoutOrder | null,
  item: ReviewItem,
  group: CarryoutQualifierGroup,
  option: CarryoutQualifierOption,
): CarryoutOrder | null {
  if (!order) return order;

  const nextItems = allLines(order).map((line, index) =>
    lineStableKey(line, index) === item.key
      ? updateLineWithLocalSelection(line, item, group, option)
      : line,
  );

  const nextOrder: CarryoutOrder = {
    ...order,
    // Store local review changes on the occurrence list only. Do not mutate
    // currentQualifierControls here; those controls can be shared fallback
    // data, which would let selections bleed into repeated items.
    items: nextItems,
  };

  return rebuildOrderCollections(nextOrder);
}

function missingLabels(line: CarryoutLine, groups: CarryoutQualifierGroup[]) {
  const covered = new Set(groups.map((group) => group.qualifierId).filter(Boolean));
  return (line.missingQualifiers || []).filter((missing) => !missing.qualifierId || !covered.has(missing.qualifierId));
}


function navigateToItem(
  item: ReviewItem | undefined,
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void,
) {
  if (!item?.targetId && !item?.targetSelector) return;
  onNavigateToFocus?.({
    targetId: item.targetId,
    targetSelector: item.targetSelector,
    label: item.label,
  });
}

function OrderReview({
  result,
  actions,
  carryoutOrder,
  activeIndex,
  onActiveIndexChange,
  onLocalOptionSelect,
  onNavigateToFocus,
}: {
  result: TourBarShellResult;
  actions: TourBarShellActions;
  carryoutOrder: CarryoutOrder | null;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onLocalOptionSelect: (item: ReviewItem, group: CarryoutQualifierGroup, option: CarryoutQualifierOption) => void;
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void;
}) {
  const response = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = carryoutOrder || extractCarryoutOrder(response);
  const items = order ? reviewItemsFrom(response, order) : [];
  const safeIndex = items.length ? Math.min(Math.max(activeIndex, 0), items.length - 1) : 0;
  const item = items[safeIndex];

  useEffect(() => {
    navigateToItem(item, onNavigateToFocus);
  }, [item?.key, item?.targetId, item?.targetSelector, onNavigateToFocus]);

  if (!order || !item) return null;

  const groups = item.groups;
  const missing = missingLabels(item.line, groups);
  const pendingCount = items.filter((entry) => entry.pending).length;
  const estimatedTotal = money(order.totals?.estimatedTotal);
  const price = linePrice(item.line);

  const goTo = (nextIndex: number) => {
    const clamped = Math.min(Math.max(nextIndex, 0), items.length - 1);
    onActiveIndexChange(clamped);
    navigateToItem(items[clamped], onNavigateToFocus);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0 text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">
          {items.length} items · {pendingCount} needs choices
        </div>
        {estimatedTotal && (
          <div className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black text-white">
            {estimatedTotal}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.09, ease: "easeOut" }}
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Reviewing item {safeIndex + 1} of {items.length}
              </div>
              <div className="mt-1 truncate text-sm font-black text-slate-950">
                {item.label}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${item.pending ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
                  {item.pending ? "Needs choices" : "Ready"}
                </span>
                {price && <span className="text-[11px] font-black text-slate-500">{price}</span>}
              </div>
            </div>
          </div>

          {(groups.length > 0 || missing.length > 0) && (
            <div className="mt-3 space-y-3">
              {groups.map((group) => (
                <div key={`${item.key}-${group.qualifierId || group.label || group.targetId}`}>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {group.label || "Options"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(group.options || []).map((option) => {
                      const selected = optionIsSelected(group, option);
                      return (
                        <button
                          key={`${item.key}-${group.qualifierId || option.qualifierId}-${option.value || option.label}`}
                          type="button"
                          onClick={() => onLocalOptionSelect(item, group, option)}
                          className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                            selected
                              ? "bg-slate-950 text-white"
                              : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span aria-hidden="true">{selected ? "✓ " : "○ "}</span>
                          {option.label || option.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {missing.length > 0 && (
                <div className="space-y-1.5">
                  {missing.map((missingItem) => (
                    <div key={`${item.key}-${missingItem.qualifierId || missingItem.label}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                      ○ {missingItem.label || missingItem.qualifierId || "Choice"} needed
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <div className="text-[11px] font-black text-slate-400">
          {safeIndex + 1}/{items.length}
        </div>
        <button
          type="button"
          onClick={() => goTo(safeIndex + 1)}
          disabled={safeIndex >= items.length - 1}
          className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <button
        type="button"
        onClick={() => actions.submitFollowUp("show cart")}
        className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
      >
        Show cart
      </button>
    </div>
  );
}

function messageFromResult(result: TourBarShellResult) {
  const response = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = extractCarryoutOrder(response);
  const itemCount = allLines(order).length;
  const cartLine = itemCount ? `Review items: ${itemCount}` : "";
  return [result.title, result.body, cartLine].filter(Boolean).join("\n");
}

export default function TourBarOrdering({
  onNavigateToFocus,
}: {
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void;
}) {
  const [carryoutOrder, setCarryoutOrder] = useState<CarryoutOrder | null>(null);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  const updateLocalOption = (item: ReviewItem, group: CarryoutQualifierGroup, option: CarryoutQualifierOption) => {
    setCarryoutOrder((current) => applyLocalQualifierSelection(current, item, group, option));
  };

  const submit = async (query: string, thread: TourBarThreadMessage[]) => {
    const response = await postGuideAi(query, carryoutOrder, thread);
    const nextOrder = extractCarryoutOrder(response);
    if (response.visibleContext && "carryoutOrder" in response.visibleContext) {
      setCarryoutOrder(nextOrder);
    } else if (response.carryoutOrder !== undefined) {
      setCarryoutOrder(nextOrder);
    }
    setActiveReviewIndex(initialReviewIndexFor(response, nextOrder));
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
      renderResultExtras={(result, actions) => (
        <OrderReview
          result={result}
          actions={actions}
          carryoutOrder={carryoutOrder}
          activeIndex={activeReviewIndex}
          onActiveIndexChange={setActiveReviewIndex}
          onLocalOptionSelect={updateLocalOption}
          onNavigateToFocus={onNavigateToFocus}
        />
      )}
      onResult={(result) => {
        const response = (result.raw || {}) as GuideAiCarryoutResponse;
        const order = extractCarryoutOrder(response);
        const items = reviewItemsFrom(response, order);
        const item = items[initialReviewIndexFor(response, order)];
        if (item) {
          navigateToItem(item, onNavigateToFocus);
          return;
        }

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
