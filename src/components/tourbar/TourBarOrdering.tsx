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
  qualifiers?: Array<{ qualifierId?: string; label?: string; value?: string; valueLabel?: string; targetId?: string }>;
  modifiers?: Array<{ label?: string; priceDelta?: number | null }>;
  upgrades?: Array<{ label?: string; priceDelta?: number | null }>;
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
    const positionalNarrative = narratives[index];
    const narrative =
      positionalNarrative && actionMatchesLine(positionalNarrative, line)
        ? positionalNarrative
        : narratives.find((item) => actionMatchesLine(item, line));
    const fallbackTarget =
      response.navigationOrder?.[index] ||
      response.rankedDestinations?.[index]?.targetId ||
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
  const pendingItem = items.find((item) => item.pending);
  const initialItem = pendingItem || items[initialReviewIndexFor(response, order)];

  if (action.includes("checkout")) return "checkout-handoff";
  if (action.includes("show_cart") || displayMode.includes("cart_panel")) return "cart-preview";
  if (items.length && !pendingItem) return "cart-preview";
  if (initialItem?.targetId) return initialItem.targetId;

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
      return "Pick the missing choices, or open the cart to review everything.";
    }
    return "Review the cart before checkout.";
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

type ReviewMode = "review" | "cart";

function formatPriceDelta(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return "";
  const sign = value > 0 ? "+" : "-";
  return ` ${sign}$${Math.abs(value).toFixed(2)}`;
}

function cleanDetail(value: unknown, line?: CarryoutLine) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const normalized = text.toLowerCase();
  const title = String(line?.title || line?.id || "").trim().toLowerCase();
  if (title && normalized === title) return "";
  if (normalized === "ready") return "";
  if (normalized.includes("bundled for savings")) return "";

  return text;
}

function selectedGroupDetail(group: CarryoutQualifierGroup) {
  return cleanDetail(
    group.selectedLabel ||
      group.selectedValue ||
      group.options?.find((option) => optionIsSelected(group, option))?.label ||
      group.options?.find((option) => optionIsSelected(group, option))?.value,
  );
}

function lineDetails(line: CarryoutLine, groups: CarryoutQualifierGroup[] = []) {
  const details = [
    ...(line.knownSelections || []),
    ...(line.qualifiers || []).map((qualifier) => qualifier.valueLabel || qualifier.value || qualifier.label),
    ...(line.modifiers || []).map((modifier) => `${modifier.label || "Modifier"}${formatPriceDelta(modifier.priceDelta)}`),
    ...(line.upgrades || []).map((upgrade) => `${upgrade.label || "Upgrade"}${formatPriceDelta(upgrade.priceDelta)}`),
    ...groups.map(selectedGroupDetail),
  ]
    .map((detail) => cleanDetail(detail, line))
    .filter(Boolean);

  return Array.from(new Set(details));
}

function lineMissingSummary(line: CarryoutLine, groups: CarryoutQualifierGroup[]) {
  const missing = missingLabels(line, groups);
  if (!missing.length) return "Ready";
  return `${missing.map((item) => item.label || item.qualifierId || "Choice").join(", ")} needed`;
}

function formatLinePrice(line: CarryoutLine) {
  return linePrice(line) || "—";
}

function itemStatusClass(pending: boolean) {
  return pending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
}

function sectionStatusClass(hasPendingItems: boolean) {
  return hasPendingItems
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-emerald-200 bg-emerald-50 text-emerald-900";
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
  reviewMode,
  onActiveIndexChange,
  onReviewModeChange,
  onLocalOptionSelect,
  onNavigateToFocus,
}: {
  result: TourBarShellResult;
  actions: TourBarShellActions;
  carryoutOrder: CarryoutOrder | null;
  activeIndex: number;
  reviewMode: ReviewMode;
  onActiveIndexChange: (index: number) => void;
  onReviewModeChange: (mode: ReviewMode) => void;
  onLocalOptionSelect: (item: ReviewItem, group: CarryoutQualifierGroup, option: CarryoutQualifierOption) => void;
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void;
}) {
  const response = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = carryoutOrder || extractCarryoutOrder(response);
  const items = order ? reviewItemsFrom(response, order) : [];
  const safeIndex = items.length ? Math.min(Math.max(activeIndex, 0), items.length - 1) : 0;
  const item = items[safeIndex];

  useEffect(() => {
    if (reviewMode === "review") navigateToItem(item, onNavigateToFocus);
  }, [item?.key, item?.targetId, item?.targetSelector, onNavigateToFocus, reviewMode]);

  if (!order || !item) return null;

  const pendingItems = items.filter((entry) => entry.pending);
  const readyItems = items.filter((entry) => !entry.pending);
  const hasPendingItems = pendingItems.length > 0;
  const estimatedTotal = money(order.totals?.estimatedTotal);
  const subtotal = money(order.totals?.subtotal);
  const price = linePrice(item.line);

  const goTo = (nextIndex: number) => {
    const clamped = Math.min(Math.max(nextIndex, 0), items.length - 1);
    onReviewModeChange("review");
    onActiveIndexChange(clamped);
    navigateToItem(items[clamped], onNavigateToFocus);
  };

  const openItem = (nextItem: ReviewItem) => {
    onReviewModeChange("review");
    onActiveIndexChange(nextItem.index);
    navigateToItem(nextItem, onNavigateToFocus);
  };

  const openFirstPending = () => {
    const pending = pendingItems[0];
    if (pending) openItem(pending);
  };

  const renderCartLine = (entry: ReviewItem, status: "ready" | "pending", index = 0) => {
    const pending = status === "pending";
    const qty = typeof entry.line.quantity === "number" && entry.line.quantity > 1 ? `${entry.line.quantity} × ` : "";
    const details = lineDetails(entry.line, entry.groups);
    const missingSummary = lineMissingSummary(entry.line, entry.groups);

    return (
      <div
        key={`${entry.key}-cart-${status}-${index}`}
        className={`rounded-xl border bg-white p-2.5 shadow-sm ${pending ? "border-amber-200" : "border-emerald-100"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => openItem(entry)}
            className="min-w-0 flex-1 cursor-pointer text-left"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900">
                {qty}{entry.line.title || entry.line.id || entry.label}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] ${itemStatusClass(pending)}`}>
                {pending ? "Needs choices" : "Ready"}
              </span>
            </div>
            <div className="mt-1 text-[11px] leading-4 text-slate-500">
              {pending ? missingSummary : details.length ? "Tap to review or edit" : "No extra choices."}
            </div>
            {details.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {details.slice(0, 5).map((selection) => (
                  <span
                    key={`${entry.key}-detail-${selection}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    {selection}
                  </span>
                ))}
              </div>
            )}
            <div className={`mt-1 text-[11px] font-semibold ${pending ? "text-amber-700" : "text-slate-500"}`}>
              {pending ? "Tap to choose now" : "Tap to edit"}
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-white">
              {formatLinePrice(entry.line)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderCartSection = (label: string, entries: ReviewItem[], status: "ready" | "pending") => {
    if (!entries.length) return null;
    return (
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </div>
        {entries.map((entry, index) => renderCartLine(entry, status, index))}
      </div>
    );
  };

  const renderCartView = () => (
    <div data-demo-surface="carryout-review-panel" className="relative flex min-h-0 flex-col gap-2 overflow-hidden">
      <div className={`shrink-0 rounded-xl border px-3 py-2 text-xs leading-5 ${sectionStatusClass(hasPendingItems)}`}>
        {hasPendingItems
          ? `${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} need choices before checkout.`
          : "All items are ready for checkout."}
      </div>

      <div className="max-h-[min(62dvh,560px)] min-h-0 space-y-2 overflow-y-auto pr-1 [overscroll-behavior:contain]">
        {items.length ? (
          <>
            {renderCartSection("Needs choices", pendingItems, "pending")}
            {renderCartSection("Ready items", readyItems, "ready")}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
            No food items saved yet.
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900">
              {hasPendingItems ? "Complete choices first" : "Review and checkout"}
            </div>
            <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
              {estimatedTotal
                ? `Estimated total: ${estimatedTotal}`
                : subtotal
                  ? `Current subtotal: ${subtotal}`
                  : hasPendingItems
                    ? "Choose the pending item options to finish the draft cart."
                    : "Checkout handoff is ready once items are complete."}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (hasPendingItems) {
                openFirstPending();
                return;
              }
              actions.submitFollowUp("checkout");
            }}
            disabled={!items.length}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
              hasPendingItems
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-emerald-700 text-white hover:bg-emerald-800"
            }`}
          >
            {hasPendingItems ? "Review choices" : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );

  const groups = item.groups;
  const missing = missingLabels(item.line, groups);

  const renderReviewView = () => (
    <div className="space-y-3">
      <div className={`rounded-xl border px-3 py-2 text-xs leading-5 ${sectionStatusClass(item.pending)}`}>
        {item.pending
          ? "This item needs choices before checkout."
          : "This item is ready. Review or change any choice."}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.09, ease: "easeOut" }}
          className={`rounded-xl border bg-white p-2.5 shadow-sm ${item.pending ? "border-amber-200" : "border-emerald-100"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {item.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] ${itemStatusClass(item.pending)}`}>
                  {item.pending ? "Needs choices" : "Ready"}
                </span>
              </div>
              <div className="mt-1 text-[11px] leading-4 text-slate-500">
                Reviewing item {safeIndex + 1} of {items.length}
              </div>
            </div>
            {price && (
              <span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-white">
                {price}
              </span>
            )}
          </div>

          {(groups.length > 0 || missing.length > 0) && (
            <div className="mt-3 space-y-3 rounded-2xl border border-white/55 bg-white/45 p-3 shadow-sm backdrop-blur-sm">
              {groups.map((group, groupIndex) => {
                const selectedValue = groupSelectedValue(group);
                const isMissing = Boolean(group.missing && !selectedValue);
                return (
                  <div key={`${item.key}-${group.qualifierId || group.label || group.targetId}`} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      <span>{group.label || "Qualifier"}</span>
                      {isMissing ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                          Required
                        </span>
                      ) : selectedValue ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(group.options || []).map((option, optionIndex) => {
                        const selected = optionIsSelected(group, option);
                        return (
                          <button
                            key={`${item.key}-${group.qualifierId || option.qualifierId}-${option.value || option.label}`}
                            type="button"
                            data-demo-active-group-index={groupIndex}
                            data-demo-active-option-index={optionIndex}
                            onClick={() => onLocalOptionSelect(item, group, option)}
                            aria-pressed={selected}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                              selected
                                ? "border-emerald-300 bg-emerald-600 text-white shadow-emerald-100"
                                : isMissing
                                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border-white/70 bg-white/70 text-slate-700 hover:bg-white/85"
                            }`}
                          >
                            {selected ? "✓ " : ""}
                            {option.label || option.value}
                            {formatPriceDelta((option as { priceDelta?: number | null }).priceDelta)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {missing.length > 0 && (
                <div className="space-y-1.5">
                  {missing.map((missingItem) => (
                    <div key={`${item.key}-${missingItem.qualifierId || missingItem.label}`} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
                      {missingItem.label || missingItem.qualifierId || "Choice"} needed
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
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <div className="text-[11px] font-semibold text-slate-400">
          {safeIndex + 1}/{items.length}
        </div>
        <button
          type="button"
          onClick={() => goTo(safeIndex + 1)}
          disabled={safeIndex >= items.length - 1}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <button
        type="button"
        onClick={() => actions.submitFollowUp("show cart")}
        className="flex w-full items-center justify-center rounded-full bg-cyan-950 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-900"
      >
        Show cart
      </button>
    </div>
  );

  return reviewMode === "cart" ? renderCartView() : renderReviewView();
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
  const [reviewMode, setReviewMode] = useState<ReviewMode>("review");

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

    const nextItems = reviewItemsFrom(response, nextOrder);
    const pendingIndex = nextItems.findIndex((item) => item.pending);
    setActiveReviewIndex(pendingIndex >= 0 ? pendingIndex : 0);

    const action = response.commerceAction || "";
    const displayMode = response.displayMode || "";
    setReviewMode(
      action.includes("show_cart") ||
        displayMode.includes("cart_panel") ||
        (nextItems.length > 0 && pendingIndex < 0)
        ? "cart"
        : "review",
    );

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
          reviewMode={reviewMode}
          onActiveIndexChange={setActiveReviewIndex}
          onReviewModeChange={setReviewMode}
          onLocalOptionSelect={updateLocalOption}
          onNavigateToFocus={onNavigateToFocus}
        />
      )}
      onResult={(result) => {
        const response = (result.raw || {}) as GuideAiCarryoutResponse;
        const order = extractCarryoutOrder(response);
        const items = reviewItemsFrom(response, order);
        const pendingItem = items.find((item) => item.pending);
        if (pendingItem) {
          navigateToItem(pendingItem, onNavigateToFocus);
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
