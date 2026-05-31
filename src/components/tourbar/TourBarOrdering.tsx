import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LockKeyhole, Trash2 } from "lucide-react";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellResult,
  type TourBarThreadMessage,
} from "./TourBarShell";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "./smartbarFocusController";

const GUIDE_AI_URL = "/api/guide_ai";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";
const TOURBAR_ORDERING_FOCUS_DELAY_MS = 180;

export type TourBarOrderingFocusTarget = {
  targetId?: string;
  targetSelector?: string;
  label?: string;
};

export type CarryoutQualifierOption = {
  label?: string;
  value?: string;
  qualifierId?: string;
  itemId?: string;
  lineItemId?: string;
  targetId?: string;
  selected?: boolean;
  state?: string;
  priceDelta?: number | null;
};

export type CarryoutQualifierGroup = {
  kind?: string;
  qualifierId?: string;
  label?: string;
  targetId?: string;
  itemId?: string;
  lineItemId?: string;
  required?: boolean;
  missing?: boolean;
  selectionMode?: "single" | "multi" | string;
  selectedValue?: string;
  selectedLabel?: string;
  options?: CarryoutQualifierOption[];
};

export type CarryoutLine = {
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

export type CannotMatchItem = {
  text?: string;
  label?: string;
  title?: string;
  item?: string;
  reason?: string;
  suggestion?: string;
};

export type CarryoutOrder = {
  type?: string;
  status?: "ready_cart" | "needs_qualifier" | "cannot_match" | string;
  nextAction?: string;
  completeItems?: CarryoutLine[];
  pendingItems?: CarryoutLine[];
  cannotMatchItems?: CannotMatchItem[];
  lockedForHandoff?: boolean;
  handoffStatus?: string;
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

export type SuggestedAction = {
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

export type StepNarrative = {
  targetId?: string;
  targetText?: string;
  body?: string;
  lineItemId?: string | null;
  itemId?: string | null;
  qualifierGroups?: CarryoutQualifierGroup[];
  reviewIndex?: number | null;
  reviewCount?: number | null;
};

export type GuideAiCarryoutResponse = {
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

export type ReviewItem = {
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

const DEFAULT_SITE_LABEL = "BurgerRush Carryout";
const DEFAULT_ORDER_TITLE = "BurgerRush order";
const DEFAULT_NOT_ON_MENU_LABEL = "Not on the BurgerRush menu";

function buildGuideConfig(siteLabel = DEFAULT_SITE_LABEL) {
  return {
    mode: "commerce",
    label: siteLabel,
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
}

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
  siteLabel = DEFAULT_SITE_LABEL,
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
      guideConfig: buildGuideConfig(siteLabel),
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

  const base = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];

  // Keep review traversal occurrence-based. Repeated menu items can share the
  // same catalog id, so id-based map merging causes selections from item 1 to
  // appear on item 2. Only the backend-provided lineItemId is treated as a
  // globally stable identity; otherwise the line's position is part of identity.
  //
  // Important: when local deletion removes the final matched line, `items` is
  // intentionally an empty array. Do not fall back to the old complete/pending
  // arrays in that case or the deleted final item will reappear.
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

function optionHasRawSelection(option: CarryoutQualifierOption) {
  return Boolean(option.selected || option.state === "selected");
}

function groupAllowsMultipleSelections(group: CarryoutQualifierGroup) {
  const kind = String(group.kind || "").toLowerCase();
  const selectionMode = String(group.selectionMode || "").toLowerCase();

  return selectionMode === "multi" || kind === "modifier" || kind === "upgrade";
}

function firstRawSelectedOption(group: CarryoutQualifierGroup) {
  return (group.options || []).find(optionHasRawSelection);
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
  if (groupAllowsMultipleSelections(group)) {
    return (group.options || []).some(optionHasRawSelection);
  }

  return Boolean(groupSelectedValue(group) || groupSelectedLabel(group));
}

function mergeQualifierGroups(
  preferred: CarryoutQualifierGroup,
  fallback: CarryoutQualifierGroup,
) {
  const allowsMultipleSelections =
    groupAllowsMultipleSelections(preferred) || groupAllowsMultipleSelections(fallback);
  const preferredSelected = groupHasSelection(preferred);
  const fallbackSelected = groupHasSelection(fallback);
  const selectedValue = allowsMultipleSelections
    ? ""
    : groupSelectedValue(preferred) || groupSelectedValue(fallback);
  const selectedLabel = allowsMultipleSelections
    ? ""
    : groupSelectedLabel(preferred) || groupSelectedLabel(fallback);

  const options = new Map<string, CarryoutQualifierOption>();
  const addOption = (option: CarryoutQualifierOption) => {
    const key = optionKey(option);
    const existing = options.get(key);
    if (!existing) {
      const selected = optionHasRawSelection(option);
      options.set(key, {
        ...option,
        selected,
        state: selected ? "selected" : option.state,
      });
      return;
    }

    const selected = optionHasRawSelection(existing) || optionHasRawSelection(option);
    options.set(key, {
      ...option,
      ...existing,
      selected,
      state: selected ? "selected" : existing.state || option.state,
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
      const selected = allowsMultipleSelections
        ? optionHasRawSelection(option)
        : selectedValue || selectedLabel
          ? Boolean(
              (selectedValue && valuesEqual(option.value || option.label, selectedValue)) ||
                (selectedLabel && valuesEqual(option.label || option.value, selectedLabel)),
            )
          : optionHasRawSelection(option);

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

  const items = lines.map((line, index) => {
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

  // The carryout review sheet should read as a forward walkthrough. Backend
  // cart lines arrive in reverse review order, so flip the display sequence
  // while preserving each item's stable key for local row updates.
  return [...items].reverse().map((item, index) => ({
    ...item,
    index,
  }));
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

const INTERNAL_SHEET_TARGETS = new Set([
  "cart-preview",
  "checkout-handoff",
  "__tourbar_order_review",
  "tourbar-order-review",
]);

function pageTarget(targetId?: string | null) {
  const clean = String(targetId || "").trim();
  if (!clean || INTERNAL_SHEET_TARGETS.has(clean)) return undefined;
  return clean;
}

function primaryTarget(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const action = response.commerceAction || "";
  const displayMode = response.displayMode || "";
  const status = order?.status || "";
  const cannotCount = (order?.cannotMatchItems || []).filter((item) => cannotMatchLabel(item)).length;
  const items = reviewItemsFrom(response, order);
  const pendingItem = items.find((item) => item.pending);
  const initialItem = pendingItem || items[initialReviewIndexFor(response, order)];

  // Incomplete orders must navigate straight to the first item needing a
  // choice. Cart/review/checkout are internal sheet states only after every
  // matched line is complete.
  if (pendingItem) {
    const pendingTarget =
      pageTarget(pendingItem.targetId) ||
      pageTarget(response.stepNarratives?.find((item) => actionMatchesLine(item, pendingItem.line))?.targetId) ||
      pageTarget(response.rankedDestinations?.find((item) => actionMatchesLine(item, pendingItem.line))?.targetId) ||
      pageTarget(order?.currentStep?.targetId);

    if (pendingTarget) return pendingTarget;
  }

  // Ready/cart/checkout/cannot-match states now live inside the TourBar
  // sheet. Do not spotlight a background page target for those internal review
  // states. This also prevents unmatched-only prompts from scrolling the
  // BurgerRush page to the top while the gray retry row is already visible.
  if (
    action.includes("checkout") ||
    action.includes("show_cart") ||
    action.includes("cannot_match") ||
    status === "cannot_match" ||
    displayMode.includes("cart_panel") ||
    cannotCount > 0 ||
    (items.length && !pendingItem)
  ) {
    return undefined;
  }

  const initialTarget = pageTarget(initialItem?.targetId);
  if (initialTarget) return initialTarget;

  return (
    pageTarget(response.suggestedAction?.targetId) ||
    pageTarget(response.rankedDestinations?.find((item) => pageTarget(item?.targetId))?.targetId) ||
    pageTarget(response.stepNarratives?.find((item) => pageTarget(item?.targetId))?.targetId) ||
    pageTarget(order?.currentStep?.targetId) ||
    pageTarget(order?.navigationOrder?.find((targetId) => pageTarget(targetId)))
  );
}

function titleFor(response: GuideAiCarryoutResponse, order: CarryoutOrder | null, fallbackTitle = DEFAULT_ORDER_TITLE) {
  const action = response.commerceAction || "";
  const status = order?.status || "";

  if (action.includes("checkout") && action.includes("handoff")) return "Ready for checkout";
  if (action.includes("checkout_blocked")) return "Choices needed before checkout";
  if (status === "ready_cart" || action.includes("ready_cart")) return "Review order";
  if (status === "partial_match" || action.includes("partial_match")) return "Partial order";
  if (status === "needs_qualifier" || action.includes("needs_qualifier")) return "Needs choices";
  if (status === "cannot_match" || action.includes("cannot_match")) return fallbackTitle;
  if (action.includes("show_cart")) return "Review order";
  return response.title || fallbackTitle;
}

function bodyFor(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const items = reviewItemsFrom(response, order);
  const cannotCount = (order?.cannotMatchItems || []).filter((item) => cannotMatchLabel(item)).length;
  if (items.length) {
    const pendingCount = items.filter((item) => item.pending).length;
    if (pendingCount > 0) {
      return cannotCount
        ? "Pick the missing choices and review anything TourBar could not add."
        : "Pick the missing choices, or open the cart to review everything.";
    }
    if (cannotCount > 0) return "";
    return "Review the cart before checkout.";
  }

  if (cannotCount > 0) return "";

  return response.answer || response.body || response.reply || response.message || "I received the order, but the backend did not return a response.";
}

function invitationFor(order: CarryoutOrder | null, response: GuideAiCarryoutResponse) {
  const action = response.commerceAction || "";
  const pendingCount = order?.pendingItems?.length || 0;
  const readyCount = order?.completeItems?.length || 0;

  if (action.includes("checkout") && action.includes("handoff")) return undefined;
  if (pendingCount > 0) return undefined;
  if (readyCount > 0 || order?.status === "ready_cart") {
    return {
      invitation: { kind: "checkout", text: "Review checkout handoff" },
      nextMove: { type: "handoff", label: "Review checkout handoff", query: "checkout" },
    };
  }
  return undefined;
}

function toShellResult(response: GuideAiCarryoutResponse, fallbackTitle = DEFAULT_ORDER_TITLE): TourBarShellResult {
  const order = extractCarryoutOrder(response);
  const invitation = invitationFor(order, response);
  const lockedForCheckout = checkoutIsLocked(response, order);

  return {
    title: titleFor(response, order, fallbackTitle),
    body: bodyFor(response, order),
    invitation: invitation?.invitation,
    nextMove: invitation?.nextMove,
    canFollowUp: !lockedForCheckout,
    targetId: primaryTarget(response, order),
    label: response.suggestedAction?.targetText || titleFor(response, order, fallbackTitle),
    mode: response.displayMode,
    action: response.commerceAction,
    raw: response,
  };
}

function optionIsSelected(group: CarryoutQualifierGroup, option: CarryoutQualifierOption) {
  if (groupAllowsMultipleSelections(group)) {
    return optionHasRawSelection(option);
  }

  const selectedValue = groupSelectedValue(group);
  const selectedLabel = groupSelectedLabel(group);

  if (selectedValue || selectedLabel) {
    return Boolean(
      (selectedValue && valuesEqual(option.value || option.label, selectedValue)) ||
        (selectedLabel && valuesEqual(option.label || option.value, selectedLabel)),
    );
  }

  return optionHasRawSelection(option);
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

function optionRawId(option: CarryoutQualifierOption) {
  return String(option.value || option.label || "").trim();
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
  const selectedLabel = option.label || option.value || "";
  const selectedValue = option.value || option.label || "";
  const nextLine: CarryoutLine = { ...line };
  const groupKind = String(group.kind || "").toLowerCase();
  const optionId = optionRawId(option);

  if (groupKind === "modifier" && optionId) {
    const currentModifiers = nextLine.modifiers || [];
    const alreadySelected = currentModifiers.some((modifier) => valuesEqual(modifier.label, option.label) || valuesEqual((modifier as { modifierId?: string }).modifierId, optionId));
    nextLine.modifiers = alreadySelected
      ? currentModifiers.filter((modifier) => !(valuesEqual(modifier.label, option.label) || valuesEqual((modifier as { modifierId?: string }).modifierId, optionId)))
      : [
          ...currentModifiers,
          {
            modifierId: optionId,
            label: selectedLabel || selectedValue,
            priceDelta: option.priceDelta ?? 0,
          } as NonNullable<CarryoutLine["modifiers"]>[number],
        ];

    nextLine.qualifierGroups = (nextLine.qualifierGroups || []).map((candidate) => {
      if (!groupMatchesGroup(candidate, group)) return candidate;
      return {
        ...candidate,
        options: (candidate.options || []).map((candidateOption) => {
          const candidateSelected = optionMatchesOption(candidateOption, option) ? !alreadySelected : optionIsSelected(candidate, candidateOption);
          return { ...candidateOption, selected: candidateSelected, state: candidateSelected ? "selected" : "available" };
        }),
      };
    });

    const knownSelections = new Set((nextLine.knownSelections || []).filter(Boolean));
    if (alreadySelected) knownSelections.delete(selectedLabel || selectedValue);
    else if (selectedLabel || selectedValue) knownSelections.add(selectedLabel || selectedValue);
    nextLine.knownSelections = Array.from(knownSelections);
    nextLine.status = lineIsPending(nextLine) ? "needs_qualifier" : "ready";
    return nextLine;
  }

  if (groupKind === "upgrade" && optionId) {
    const currentUpgrades = nextLine.upgrades || [];
    const alreadySelected = currentUpgrades.some((upgrade) => valuesEqual(upgrade.label, option.label) || valuesEqual((upgrade as { id?: string }).id, optionId));
    nextLine.upgrades = alreadySelected
      ? currentUpgrades.filter((upgrade) => !(valuesEqual(upgrade.label, option.label) || valuesEqual((upgrade as { id?: string }).id, optionId)))
      : [
          ...currentUpgrades,
          {
            id: optionId,
            label: selectedLabel || selectedValue,
            priceDelta: option.priceDelta ?? 0,
          } as NonNullable<CarryoutLine["upgrades"]>[number],
        ];

    nextLine.qualifierGroups = (nextLine.qualifierGroups || []).map((candidate) => {
      if (!groupMatchesGroup(candidate, group)) return candidate;
      return {
        ...candidate,
        options: (candidate.options || []).map((candidateOption) => {
          const candidateSelected = optionMatchesOption(candidateOption, option) ? !alreadySelected : optionIsSelected(candidate, candidateOption);
          return { ...candidateOption, selected: candidateSelected, state: candidateSelected ? "selected" : "available" };
        }),
      };
    });

    const knownSelections = new Set((nextLine.knownSelections || []).filter(Boolean));
    if (alreadySelected) knownSelections.delete(selectedLabel || selectedValue);
    else if (selectedLabel || selectedValue) knownSelections.add(selectedLabel || selectedValue);
    nextLine.knownSelections = Array.from(knownSelections);
    nextLine.status = lineIsPending(nextLine) ? "needs_qualifier" : "ready";
    return nextLine;
  }

  const oldSelectedLabels = selectedOptionLabels(group);
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

function applyLocalLineRemoval(order: CarryoutOrder | null, item: ReviewItem): CarryoutOrder | null {
  if (!order) return order;

  const nextItems = allLines(order).filter((line, index) => lineStableKey(line, index) !== item.key);
  const nextOrder: CarryoutOrder = {
    ...order,
    items: nextItems,
    lockedForHandoff: false,
    handoffStatus: undefined,
  };

  return rebuildOrderCollections(nextOrder);
}

function checkoutIsLocked(response: GuideAiCarryoutResponse, order: CarryoutOrder | null) {
  const action = String(response.commerceAction || "").toLowerCase();
  return Boolean(
    order?.lockedForHandoff ||
      order?.handoffStatus === "ready" ||
      (action.includes("checkout") && action.includes("handoff")),
  );
}

function missingLabels(line: CarryoutLine, groups: CarryoutQualifierGroup[]) {
  const covered = new Set(groups.map((group) => group.qualifierId).filter(Boolean));
  return (line.missingQualifiers || []).filter((missing) => !missing.qualifierId || !covered.has(missing.qualifierId));
}

function orderNeedsBackendReprice(order: CarryoutOrder | null) {
  if (!order) return false;
  const lines = allLines(order);
  if (!lines.length) return false;
  if (lines.some(lineIsPending)) return false;

  // Local qualifier clicks can make a variant-priced line ready before the
  // backend has recomputed catalog prices. Reconcile once the matched order is
  // complete so variant items like medium fries get lineSubtotal/totals back.
  return lines.some((line) => !linePrice(line));
}

export type ReviewMode = "review" | "cart";

type CartLineState = "ready" | "optional" | "pending" | "unrecognized";

type CartActionPanel =
  | { kind: "required" | "optional"; itemKey: string }
  | { kind: "retry"; index: number }
  | null;

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

function escapeRegExpLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactQualifierSubject(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^choose\s+/i, "")
    .replace(/\s+(size|choice|flavor|setup|option|options)$/i, "")
    .trim();
}

function compactQualifierOptionLabel(
  option: CarryoutQualifierOption,
  group: CarryoutQualifierGroup,
  item?: ReviewItem,
) {
  const label = String(option.label || option.value || "Option").replace(/\s+/g, " ").trim();
  if (!label) return "Option";

  const removableSubjects = [
    compactQualifierSubject(item?.line.title),
    compactQualifierSubject(group.label),
  ]
    .filter((value) => value.length > 2)
    .sort((a, b) => b.length - a.length);

  let compactLabel = label;

  for (const subject of removableSubjects) {
    compactLabel = compactLabel.replace(
      new RegExp(`\\s+${escapeRegExpLiteral(subject)}$`, "i"),
      "",
    );
  }

  return compactLabel.trim() || label;
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
    ...groups
      .filter((group) => !["modifier", "upgrade"].includes(String(group.kind || "").toLowerCase()))
      .map(selectedGroupDetail),
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

function cannotMatchLabel(item: CannotMatchItem) {
  return String(item.text || item.label || item.title || item.item || "Requested item").replace(/\s+/g, " ").trim();
}

function cannotMatchReason(item: CannotMatchItem, notOnMenuLabel = DEFAULT_NOT_ON_MENU_LABEL) {
  const reason = String(item.reason || "not_on_menu").replace(/[_-]+/g, " ").trim().toLowerCase();
  if (!reason || reason === "not on menu") return notOnMenuLabel;
  if (reason === "no matching catalog offer or bundle") return notOnMenuLabel;
  return reason.charAt(0).toUpperCase() + reason.slice(1);
}

function formatLinePrice(line: CarryoutLine) {
  return linePrice(line) || "—";
}

function lineHasOptionalChoices(entry: ReviewItem) {
  if (entry.pending) return false;
  return entry.groups.some(
    (group) =>
      !group.required &&
      !group.missing &&
      (group.options || []).length > 0,
  );
}

function optionMatchesCartSelection(option: CarryoutQualifierOption, selection: { label?: string; modifierId?: string; id?: string }) {
  const optionId = optionRawId(option);
  const optionLabel = option.label || option.value || "";
  const selectionLabel = selection.label || "";

  return Boolean(
    (optionId && selection.modifierId && valuesEqual(optionId, selection.modifierId)) ||
      (optionId && selection.id && valuesEqual(optionId, selection.id)) ||
      (selectionLabel && optionLabel && valuesEqual(selectionLabel, optionLabel)) ||
      (selectionLabel && option.value && valuesEqual(selectionLabel, option.value)),
  );
}

function optionMatchesCartLineSelection(line: CarryoutLine, option: CarryoutQualifierOption) {
  const optionLabel = option.label || option.value || "";
  const optionValue = option.value || option.label || "";
  const cartSelections = [...(line.modifiers || []), ...(line.upgrades || [])];

  return Boolean(
    cartSelections.some((selection) => optionMatchesCartSelection(option, selection)) ||
      (line.knownSelections || []).some(
        (selection) =>
          (optionLabel && valuesEqual(selection, optionLabel)) ||
          (optionValue && valuesEqual(selection, optionValue)),
      ),
  );
}

function groupWithLineSelections(group: CarryoutQualifierGroup, line: CarryoutLine, panelKind: "required" | "optional") {
  if (panelKind !== "optional" || !(group.options || []).length) return group;

  // Optional extras are cart-state driven. The backend/group payload can keep a
  // stale single selectedValue, while the cart line has the real modifier and
  // upgrade arrays. Make the overlay reflect the cart line exactly.
  return {
    ...group,
    selectedValue: "",
    selectedLabel: "",
    options: (group.options || []).map((option) => {
      const selected = optionMatchesCartLineSelection(line, option);
      return {
        ...option,
        selected,
        state: selected ? "selected" : "available",
      };
    }),
  };
}

function syncCartPanelGroupsToLine(item: ReviewItem, groups: CarryoutQualifierGroup[], panelKind: "required" | "optional") {
  return groups.map((group) => groupWithLineSelections(group, item.line, panelKind));
}

function groupsForCartPanel(item: ReviewItem, kind: "required" | "optional") {
  if (kind === "optional") {
    return syncCartPanelGroupsToLine(
      item,
      item.groups.filter(
        (group) => !group.required && !group.missing && (group.options || []).length > 0,
      ),
      kind,
    );
  }

  const requiredGroups = item.groups.filter(
    (group) => Boolean(group.required || group.missing || missingLabels(item.line, [group]).length),
  );

  return syncCartPanelGroupsToLine(item, requiredGroups.length ? requiredGroups : item.groups, kind);
}

function itemStatusClass(state: CartLineState) {
  if (state === "pending") return "bg-transparent text-rose-300 ring-0 md:bg-rose-100 md:text-rose-800 md:ring-1 md:ring-rose-200";
  if (state === "optional") return "bg-transparent text-yellow-300 ring-0 md:bg-amber-100 md:text-amber-800 md:ring-1 md:ring-amber-200";
  if (state === "unrecognized") return "bg-transparent text-slate-300 ring-0 md:bg-slate-200 md:text-slate-700 md:ring-1 md:ring-slate-300";
  return "bg-transparent text-green-300 ring-0 md:bg-emerald-200 md:text-emerald-950 md:ring-1 md:ring-emerald-300";
}

function sectionStatusClass(state: CartLineState) {
  if (state === "pending") return "border-rose-400/25 bg-transparent text-rose-300 ring-1 ring-rose-400/10 md:border-rose-200 md:bg-rose-50 md:text-rose-900 md:ring-0";
  if (state === "optional") return "border-yellow-400/25 bg-transparent text-yellow-300 ring-1 ring-yellow-400/10 md:border-amber-200 md:bg-amber-50 md:text-amber-900 md:ring-0";
  if (state === "unrecognized") return "border-slate-400/25 bg-transparent text-slate-300 ring-1 ring-slate-400/10 md:border-slate-200 md:bg-slate-50 md:text-slate-800 md:ring-0";
  return "border-green-400/25 bg-transparent text-green-300 ring-1 ring-green-400/10 md:border-emerald-300 md:bg-emerald-50 md:text-emerald-950 md:ring-emerald-100";
}

function cartLineCardClass(state: CartLineState, isLocked: boolean) {
  if (isLocked) {
    return "border-green-400/20 bg-transparent text-green-300 ring-1 ring-green-400/10 opacity-90 md:border-slate-200 md:bg-slate-50/90 md:text-slate-900 md:ring-0 md:opacity-85";
  }

  if (state === "pending") return "border-rose-400/25 bg-transparent text-rose-300 ring-1 ring-rose-400/10 md:border-rose-200 md:bg-rose-50/95 md:text-rose-950 md:ring-rose-100";
  if (state === "optional") return "border-yellow-400/25 bg-transparent text-yellow-300 ring-1 ring-yellow-400/10 md:border-amber-300 md:bg-amber-50/95 md:text-amber-950 md:ring-amber-100";
  if (state === "unrecognized") return "border-slate-400/25 bg-transparent text-slate-300 ring-1 ring-slate-400/10 md:border-slate-200 md:bg-slate-50/95 md:text-slate-800 md:ring-slate-100";
  return "border-green-400/25 bg-transparent text-green-300 ring-1 ring-green-400/10 md:border-emerald-300 md:bg-emerald-50/95 md:text-emerald-950 md:ring-emerald-100";
}

function cartLineDetailClass(state: CartLineState, isLocked: boolean) {
  if (isLocked) return "bg-transparent text-green-200/75 ring-1 ring-green-400/10 md:bg-white md:text-slate-500 md:ring-slate-200";
  if (state === "pending") return "bg-transparent text-rose-200/85 ring-1 ring-rose-400/15 md:bg-rose-100 md:text-rose-800 md:ring-rose-200";
  if (state === "optional") return "bg-transparent text-yellow-200/85 ring-1 ring-yellow-400/15 md:bg-amber-100 md:text-amber-900 md:ring-amber-200";
  if (state === "unrecognized") return "bg-transparent text-slate-200/80 ring-1 ring-slate-400/15 md:bg-slate-200 md:text-slate-700 md:ring-slate-300";
  return "bg-transparent text-green-200/85 ring-1 ring-green-400/15 md:bg-emerald-100 md:text-emerald-900 md:ring-emerald-200";
}

function cartLineTitleClass(state: CartLineState, isLocked: boolean) {
  if (isLocked) return "text-slate-300 italic md:text-slate-600";
  if (state === "pending") return "text-rose-300 md:text-rose-950";
  if (state === "optional") return "text-yellow-300 md:text-amber-950";
  if (state === "unrecognized") return "text-slate-300 md:text-slate-700";
  return "text-green-300 md:text-emerald-950";
}

function cartLineHelperClass(state: CartLineState, isLocked: boolean) {
  if (isLocked) return "text-slate-400 italic md:text-slate-500";
  if (state === "pending") return "text-rose-200/85 md:text-rose-700";
  if (state === "optional") return "text-yellow-200/85 md:text-amber-800";
  if (state === "unrecognized") return "text-slate-300/80 md:text-slate-500";
  return "text-green-200/85 md:text-emerald-800";
}

function navigateToItem(
  item: ReviewItem | undefined,
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void,
) {
  const targetId = pageTarget(item?.targetId);
  if (!targetId && !item?.targetSelector) return;
  onNavigateToFocus?.({
    targetId,
    targetSelector: item?.targetSelector,
    label: item?.label,
  });
}

function cartEntryMatchesKey(entry: ReviewItem, key?: string) {
  const cleanKey = String(key || "").trim();
  if (!cleanKey) return false;

  return Boolean(
    valuesEqual(entry.key, cleanKey) ||
      lineIdentityKeys(entry.line).some((lineKey) => valuesEqual(lineKey, cleanKey)) ||
      valuesEqual(entry.line.targetId, cleanKey),
  );
}

function promoteCartEntries(entries: ReviewItem[], promotedKey?: string) {
  if (!promotedKey || !entries.some((entry) => cartEntryMatchesKey(entry, promotedKey))) {
    return entries;
  }

  return [...entries].sort((a, b) => {
    const aPromoted = cartEntryMatchesKey(a, promotedKey);
    const bPromoted = cartEntryMatchesKey(b, promotedKey);

    if (aPromoted === bPromoted) return a.index - b.index;
    return aPromoted ? -1 : 1;
  });
}

export function OrderReview({
  result,
  actions,
  carryoutOrder,
  activeIndex,
  reviewMode,
  onActiveIndexChange,
  onReviewModeChange,
  onLocalOptionSelect,
  onSilentReprice,
  onRemoveItem,
  onRetryItemReplace,
  onNavigateToFocus,
  notOnMenuLabel = DEFAULT_NOT_ON_MENU_LABEL,
}: {
  result: TourBarShellResult;
  actions: TourBarShellActions;
  carryoutOrder: CarryoutOrder | null;
  activeIndex: number;
  reviewMode: ReviewMode;
  onActiveIndexChange: (index: number) => void;
  onReviewModeChange: (mode: ReviewMode) => void;
  onLocalOptionSelect: (item: ReviewItem, group: CarryoutQualifierGroup, option: CarryoutQualifierOption) => CarryoutOrder | null;
  onSilentReprice: (order: CarryoutOrder | null) => void;
  onRemoveItem: (item: ReviewItem, actions?: TourBarShellActions) => void;
  onRetryItemReplace: (retryIndex: number, retryValue: string, actions: TourBarShellActions) => void;
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void;
  notOnMenuLabel?: string;
}) {
  void reviewMode;
  void activeIndex;

  const [cartActionPanel, setCartActionPanel] = useState<CartActionPanel>(null);
  const [recentlyCompletedItemKey, setRecentlyCompletedItemKey] = useState("");
  const response = (result.raw || {}) as GuideAiCarryoutResponse;
  const order = carryoutOrder || extractCarryoutOrder(response);
  const speedDemoPromotedReadyLineItemId = String(
    ((response as GuideAiCarryoutResponse & { __speedDemo?: { promoteReadyLineItemId?: string } }).__speedDemo?.promoteReadyLineItemId || ""),
  ).trim();
  const items = order ? reviewItemsFrom(response, order) : [];
  const pendingItems = items.filter((entry) => entry.pending);
  const optionalItems = items.filter(lineHasOptionalChoices);
  const readyItems = promoteCartEntries(
    items.filter((entry) => !entry.pending && !lineHasOptionalChoices(entry)),
    speedDemoPromotedReadyLineItemId || recentlyCompletedItemKey,
  );
  const cannotMatchItems = (order?.cannotMatchItems || []).filter((entry) => cannotMatchLabel(entry));
  const hasPendingItems = pendingItems.length > 0;
  const hasOptionalItems = optionalItems.length > 0;
  const hasCannotMatchItems = cannotMatchItems.length > 0;
  const estimatedTotal = money(order?.totals?.estimatedTotal);
  const subtotal = money(order?.totals?.subtotal);
  const isLocked = checkoutIsLocked(response, order);
  const canCheckoutMatchedItems = items.length > 0 && !hasPendingItems;
  const speedDemoReadyPillLabel =
    !isLocked && !hasPendingItems && !hasOptionalItems && !hasCannotMatchItems
      ? String((response as { __speedDemo?: { readyPillLabel?: string } }).__speedDemo?.readyPillLabel || "")
      : "";
  const itemSignature = items
    .map((entry) => `${entry.key}:${entry.pending ? "pending" : lineHasOptionalChoices(entry) ? "optional" : "ready"}`)
    .join("|");
  const cannotSignature = cannotMatchItems.map((entry, index) => `${index}:${cannotMatchLabel(entry)}`).join("|");

  useEffect(() => {
    if (isLocked) {
      setCartActionPanel(null);
      return;
    }

    setCartActionPanel((current) => {
      if (!current) return current;
      if (current.kind === "retry") return cannotMatchItems[current.index] ? current : null;

      const currentItem = items.find((entry) => entry.key === current.itemKey);
      if (!currentItem) return null;
      if (current.kind === "required" && !currentItem.pending) return null;
      if (current.kind === "optional" && !lineHasOptionalChoices(currentItem)) return null;
      return current;
    });
  }, [cannotSignature, isLocked, itemSignature]);

  useEffect(() => {
    if (isLocked || cartActionPanel || !pendingItems.length) return;

    const pending = pendingItems[0];
    setCartActionPanel({ kind: "required", itemKey: pending.key });
    onReviewModeChange("cart");
    onActiveIndexChange(pending.index);
    navigateToItem(pending, onNavigateToFocus);
  }, [cartActionPanel, isLocked, onActiveIndexChange, onNavigateToFocus, onReviewModeChange, pendingItems[0]?.key]);

  if (!order) return null;

  const openLineActionPanel = (kind: "required" | "optional", entry: ReviewItem) => {
    if (isLocked) return;
    onReviewModeChange("cart");
    onActiveIndexChange(entry.index);
    setCartActionPanel({ kind, itemKey: entry.key });
    navigateToItem(entry, onNavigateToFocus);
  };

  const openRetryPanel = (index: number) => {
    if (isLocked) return;
    onReviewModeChange("cart");
    setCartActionPanel({ kind: "retry", index });
  };

  const handlePanelOptionSelect = (panelItem: ReviewItem, panelKind: "required" | "optional", group: CarryoutQualifierGroup, option: CarryoutQualifierOption) => {
    const nextOrder = onLocalOptionSelect(panelItem, group, option);
    const nextItems = reviewItemsFrom(response, nextOrder);
    const nextPanelItem = nextItems.find((entry) => entry.key === panelItem.key);

    if (panelKind === "optional" || orderNeedsBackendReprice(nextOrder)) {
      onSilentReprice(nextOrder);
    }

    if (panelKind === "optional") {
      setRecentlyCompletedItemKey("");
      if (nextPanelItem && lineHasOptionalChoices(nextPanelItem)) {
        setCartActionPanel({ kind: "optional", itemKey: nextPanelItem.key });
      }
      return;
    }

    if (nextPanelItem?.pending) {
      setCartActionPanel({ kind: "required", itemKey: nextPanelItem.key });
      return;
    }

    const completedItemKey = nextPanelItem?.key || panelItem.key;
    const nextPending = nextItems.find((entry) => entry.pending);
    if (nextPending) {
      setRecentlyCompletedItemKey(completedItemKey);
      onActiveIndexChange(nextPending.index);
      setCartActionPanel({ kind: "required", itemKey: nextPending.key });
      navigateToItem(nextPending, onNavigateToFocus);
      return;
    }

    setRecentlyCompletedItemKey(completedItemKey);
    setCartActionPanel(null);
    onReviewModeChange("cart");
  };

  const renderCartLine = (entry: ReviewItem, state: Exclude<CartLineState, "unrecognized">, index = 0) => {
    const qty = typeof entry.line.quantity === "number" && entry.line.quantity > 1 ? `${entry.line.quantity} × ` : "";
    const details = lineDetails(entry.line, entry.groups);
    const missingSummary = lineMissingSummary(entry.line, entry.groups);
    const helperText =
      state === "pending"
        ? missingSummary
        : state === "optional"
          ? "Optional extras available."
          : details.length
            ? ""
            : "No extra choices.";
    const stateCardClass = cartLineCardClass(state, isLocked);
    const interactiveClass = isLocked
      ? ""
      : "transform-gpu transition duration-150 ease-out hover:-translate-y-0.5 hover:ring-1 hover:ring-slate-200 hover:shadow-md hover:shadow-slate-200/80";
    const statusLabel = isLocked
      ? "Locked"
      : state === "pending"
        ? "Required"
        : state === "optional"
          ? "Options"
          : "Ready";

    const lineBody = (
      <div className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`truncate text-sm font-semibold ${cartLineTitleClass(state, isLocked)}`}>
            {qty}{entry.line.title || entry.line.id || entry.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] ${isLocked ? "bg-transparent text-green-300 ring-0 md:bg-slate-200 md:text-slate-600" : itemStatusClass(state)}`}>
            {statusLabel}
          </span>
        </div>
        {helperText && (
          <div className={`mt-1 text-[11px] leading-4 ${cartLineHelperClass(state, isLocked)}`}>
            {helperText}
          </div>
        )}
        {details.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {details.slice(0, 5).map((selection) => (
              <span
                key={`${entry.key}-detail-${selection}`}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cartLineDetailClass(state, isLocked)}`}
              >
                {selection}
              </span>
            ))}
          </div>
        )}
        {!isLocked && state === "pending" && (
          <div className="mt-1 text-[11px] font-semibold text-rose-300 md:text-rose-700">
            Tap to choose now
          </div>
        )}
        {!isLocked && state === "optional" && (
          <div className="mt-1 text-[11px] font-semibold text-yellow-300 md:text-amber-700">
            Tap to customize
          </div>
        )}
      </div>
    );

    return (
      <div
        key={`${entry.key}-cart-${state}-${index}`}
        data-tourbar-cart-line-state={state}
        data-tourbar-cart-line-key={entry.key}
        className={`rounded-xl border p-2.5 shadow-sm ${interactiveClass} ${stateCardClass}`}
      >
        <div className="flex items-start justify-between gap-2">
          {isLocked ? (
            lineBody
          ) : (
            <button
              type="button"
              onClick={() => {
                if (state === "pending") {
                  openLineActionPanel("required", entry);
                  return;
                }
                if (state === "optional") {
                  openLineActionPanel("optional", entry);
                }
              }}
              className="min-w-0 flex-1 cursor-pointer text-left"
            >
              {lineBody}
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-transparent px-2 py-1 text-[11px] font-bold text-white/82 ring-1 ring-white/15 md:bg-slate-950 md:text-white md:ring-0">
              {formatLinePrice(entry.line)}
            </span>
            {!isLocked && (
              <button
                type="button"
                onClick={() => onRemoveItem(entry, actions)}
                aria-label={`Remove ${entry.label}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-transparent text-white/45 shadow-sm transition hover:border-red-400/40 hover:bg-red-950/30 hover:text-red-300 md:border-slate-200 md:bg-white md:text-slate-400 md:hover:border-red-200 md:hover:bg-red-50 md:hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCartSection = (label: string, entries: ReviewItem[], state: Exclude<CartLineState, "unrecognized">) => {
    if (!entries.length) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${state === "pending" ? "text-rose-300 md:text-rose-700" : state === "optional" ? "text-yellow-300 md:text-amber-700" : "text-green-300 md:text-emerald-700"}`}>
            {label}
          </div>
          {state === "ready" && (
            <div className="rounded-full bg-transparent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-green-300 ring-1 ring-green-400/15 md:bg-emerald-100 md:text-emerald-800 md:ring-emerald-200">
              {isLocked ? "LOCKED" : "READY"}
            </div>
          )}
          {state === "optional" && (
            <div className="rounded-full bg-transparent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-yellow-300 ring-1 ring-yellow-400/15 md:bg-amber-100 md:text-amber-800 md:ring-amber-200">
              CHECKOUT OK
            </div>
          )}
        </div>
        {entries.map((entry, index) => renderCartLine(entry, state, index))}
      </div>
    );
  };

  const renderCannotMatchSection = () => {
    if (!cannotMatchItems.length) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 md:text-slate-600">
            Retry needed
          </div>
          <div className="rounded-full bg-transparent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300 ring-1 ring-slate-400/15 md:bg-slate-200 md:text-slate-700 md:ring-slate-300">
            Not charged
          </div>
        </div>
        <div className="space-y-1.5">
          {cannotMatchItems.map((entry, index) => {
            const label = cannotMatchLabel(entry);
            return (
              <button
                key={`cannot-match-${label}-${index}`}
                type="button"
                data-tourbar-cart-line-state="unrecognized"
                data-tourbar-cart-retry-index={index}
                onClick={() => openRetryPanel(index)}
                className={`w-full rounded-xl border p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:hover:shadow-slate-200/80 ${cartLineCardClass("unrecognized", isLocked)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className={`text-sm font-semibold ${cartLineTitleClass("unrecognized", isLocked)}`}>
                        {label}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] ${itemStatusClass("unrecognized")}`}>
                        Retry
                      </span>
                    </div>
                    <div
                      title={cannotMatchReason(entry, notOnMenuLabel)}
                      className={`mt-1 text-[11px] leading-4 ${cartLineHelperClass("unrecognized", isLocked)}`}
                    >
                      Not priced.
                    </div>
                    {entry.suggestion && (
                      <div className="mt-1 text-[11px] font-semibold text-slate-200 md:text-slate-700">
                        Try: {entry.suggestion}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-transparent px-2 py-1 text-[11px] font-bold text-slate-300 ring-1 ring-slate-400/15 md:bg-slate-200 md:text-slate-700 md:ring-slate-300">
                    —
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActionPanel = () => {
    if (!cartActionPanel || isLocked) return null;

    if (cartActionPanel.kind === "retry") {
      const entry = cannotMatchItems[cartActionPanel.index];
      if (!entry) return null;
      const label = cannotMatchLabel(entry);
      return (
        <AnimatePresence>
          <motion.div
            key={`retry-panel-${cartActionPanel.index}`}
            variants={{
              hidden: { y: "125%" },
              visible: { y: 0, transition: { duration: 1.35, ease: "easeOut" } },
              exit: { y: "125%", transition: { duration: 0.24, ease: "easeIn" } },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            data-tourbar-cart-action-panel="retry"
            className="pointer-events-none absolute inset-x-0 bottom-[86px] z-20 px-1 md:left-auto md:max-w-sm"
          >
            <div className="pointer-events-auto rounded-2xl border border-slate-400/25 bg-slate-950/96 p-3 text-white shadow-2xl shadow-black/35 ring-1 ring-white/10 backdrop-blur md:border-slate-200 md:bg-white md:text-slate-950 md:ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 md:text-slate-500">Retry item</div>
                  <div className="mt-1 text-sm font-bold">{label}</div>
                  <div className="mt-1 text-[11px] leading-4 text-slate-300 md:text-slate-500">
                    No menu match.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCartActionPanel(null)}
                  data-tourbar-cart-action-close="retry"
                  aria-label="Close retry panel"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/65 transition hover:bg-white/10 md:border-slate-200 md:text-slate-500 md:hover:bg-slate-50"
                >
                  ×
                </button>
              </div>
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 md:text-slate-500">
                Try again
              </label>
              <input
                defaultValue=""
                placeholder="Type item"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const retryValue = (event.currentTarget.value || "").trim();
                  if (!retryValue) return;
                  setCartActionPanel(null);
                  onRetryItemReplace(cartActionPanel.index, retryValue, actions);
                }}
                data-tourbar-cart-retry-input="true"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/25 md:border-slate-200 md:bg-slate-50 md:text-slate-950 md:focus:border-slate-400"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    const panel = event.currentTarget.closest('[data-tourbar-cart-action-panel="retry"]');
                    const input = panel?.querySelector<HTMLInputElement>('[data-tourbar-cart-retry-input="true"]');
                    const retryValue = (input?.value || "").trim();
                    if (!retryValue) return;
                    setCartActionPanel(null);
                    onRetryItemReplace(cartActionPanel.index, retryValue, actions);
                  }}
                  data-tourbar-cart-retry-submit="true"
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white md:bg-slate-950 md:text-white md:hover:bg-slate-800"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setCartActionPanel(null)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/10 md:border-slate-200 md:text-slate-600 md:hover:bg-slate-50"
                >
                  Leave out
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }

    const panelItem = items.find((entry) => entry.key === cartActionPanel.itemKey);
    if (!panelItem) return null;
    const panelKind = cartActionPanel.kind;
    const panelGroups = groupsForCartPanel(panelItem, panelKind);
    const panelMissing = panelKind === "required" ? missingLabels(panelItem.line, panelGroups) : [];
    const state: CartLineState = panelKind === "required" ? "pending" : "optional";

    return (
      <AnimatePresence>
        <motion.div
          key={`${panelKind}-panel-${panelItem.key}`}
          variants={{
            hidden: { y: "125%" },
            visible: { y: 0, transition: { duration: 1.35, ease: "easeOut" } },
            exit: { y: "125%", transition: { duration: 0.24, ease: "easeIn" } },
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          data-tourbar-cart-action-panel={panelKind}
          className="pointer-events-none absolute inset-x-0 bottom-[86px] z-20 px-1 md:left-auto md:max-w-sm"
        >
          <div className={`pointer-events-auto rounded-2xl border p-3 shadow-2xl shadow-black/35 backdrop-blur ${panelKind === "required" ? "border-rose-400/25 bg-slate-950/96 text-white ring-1 ring-rose-400/10 md:border-rose-200 md:bg-white md:text-slate-950 md:ring-rose-100" : "border-yellow-400/25 bg-slate-950/96 text-white ring-1 ring-yellow-400/10 md:border-amber-200 md:bg-white md:text-slate-950 md:ring-amber-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${panelKind === "required" ? "text-rose-300 md:text-rose-600" : "text-yellow-300 md:text-amber-600"}`}>
                  {panelKind === "required" ? "Required choice" : "Optional extras"}
                </div>
                <div className="mt-1 truncate text-sm font-bold">{panelKind === "required" ? panelGroups[0]?.label || panelItem.label : `Customize ${panelItem.line.title || panelItem.label}`}</div>
                <div className={`mt-1 text-[11px] leading-4 ${cartLineHelperClass(state, false)}`}>
                  {panelKind === "required" ? "Choose one to finish the cart." : "Checkout is already available; add extras only if wanted."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartActionPanel(null)}
                data-tourbar-cart-action-close={panelKind}
                aria-label="Close cart action panel"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/65 transition hover:bg-white/10 md:border-slate-200 md:text-slate-500 md:hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            {panelGroups.length > 0 && (
              <div className="mt-3 space-y-3">
                {panelGroups.map((group, groupIndex) => {
                  const selectedValue = groupSelectedValue(group);
                  const isMissing = Boolean(group.missing && !selectedValue);
                  return (
                    <div key={`${panelItem.key}-${group.qualifierId || group.label || group.targetId}`} className="space-y-2">
                      {panelGroups.length > 1 && (
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45 md:text-slate-500">
                          {group.label || "Choices"}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {(group.options || []).map((option, optionIndex) => {
                          const selected = panelKind === "optional"
                            ? optionMatchesCartLineSelection(panelItem.line, option)
                            : optionIsSelected(group, option);
                          const displayLabel = compactQualifierOptionLabel(option, group, panelItem);
                          return (
                            <button
                              key={`${panelItem.key}-${group.qualifierId || option.qualifierId}-${option.value || option.label}`}
                              type="button"
                              data-demo-active-group-index={groupIndex}
                              data-demo-active-option-index={optionIndex}
                              data-tourbar-qualifier-group={qualifierKey(group)}
                              data-tourbar-qualifier-option={optionKey(option)}
                              data-tourbar-qualifier-label={option.label || option.value || ""}
                              onClick={() => handlePanelOptionSelect(panelItem, panelKind, group, option)}
                              aria-pressed={selected}
                              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                                selected
                                  ? "border-green-400/30 bg-transparent text-green-300 ring-1 ring-green-400/20 md:border-emerald-300 md:bg-emerald-600 md:text-white md:ring-0 md:shadow-emerald-100"
                                  : isMissing || panelKind === "required"
                                    ? "border-rose-400/30 bg-transparent text-rose-300 hover:bg-rose-950/20 md:border-rose-200 md:bg-rose-50 md:text-rose-800 md:hover:bg-rose-100"
                                    : "border-yellow-400/30 bg-transparent text-yellow-300 hover:bg-yellow-950/20 md:border-amber-200 md:bg-amber-50 md:text-amber-800 md:hover:bg-amber-100"
                              }`}
                            >
                              {selected ? "✓ " : ""}
                              {displayLabel}
                              {formatPriceDelta((option as { priceDelta?: number | null }).priceDelta)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {panelMissing.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {panelMissing.map((missingItem) => (
                  <div key={`${panelItem.key}-${missingItem.qualifierId || missingItem.label}`} className="rounded-xl bg-transparent px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/15 md:bg-rose-50 md:text-rose-800 md:ring-rose-100">
                    {missingItem.label || missingItem.qualifierId || "Choice"} needed
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const summaryState: CartLineState = hasPendingItems ? "pending" : hasOptionalItems ? "optional" : hasCannotMatchItems ? "unrecognized" : "ready";

  return (
    <div data-demo-surface="carryout-review-panel" className="relative flex min-h-0 flex-col gap-2 overflow-hidden">
      {speedDemoReadyPillLabel ? (
        <div className="shrink-0">
          <span className="inline-flex w-fit rounded-full bg-transparent px-3 py-1.5 text-xs font-bold text-green-300 ring-1 ring-green-400/20 md:bg-emerald-50 md:text-emerald-800 md:ring-emerald-200">
            {speedDemoReadyPillLabel}
          </span>
        </div>
      ) : (
        <div className={`shrink-0 rounded-xl border px-3 py-2 text-xs leading-5 ${isLocked ? "border-green-400/20 bg-transparent text-green-300 ring-1 ring-green-400/10 md:border-slate-200 md:bg-slate-50 md:text-slate-800 md:ring-0" : sectionStatusClass(summaryState)}`}>
          {isLocked
            ? hasCannotMatchItems
              ? `Checkout handoff is locked for matched items. ${cannotMatchItems.length} raw item${cannotMatchItems.length === 1 ? "" : "s"} stayed out.`
              : "Checkout handoff is locked and ready."
            : hasPendingItems
              ? hasCannotMatchItems
                ? `${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} need required choices. ${cannotMatchItems.length} raw item${cannotMatchItems.length === 1 ? "" : "s"} need retry.`
                : `${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} need required choices before checkout.`
              : hasCannotMatchItems
                ? items.length
                  ? "Matched items are ready. Gray rows are not priced or included."
                  : "Gray rows are not priced or included."
                : hasOptionalItems
                  ? `${optionalItems.length} ready item${optionalItems.length === 1 ? "" : "s"} have optional extras available.`
                  : "All items are ready for checkout."}
        </div>
      )}

      <div className="max-h-[clamp(180px,34dvh,340px)] min-h-0 space-y-2 overflow-x-hidden overflow-y-auto pb-2 pr-1 [overscroll-behavior:contain]">
        {items.length || cannotMatchItems.length ? (
          <>
            {renderCannotMatchSection()}
            {renderCartSection(isLocked ? "Locked matched items" : "Ready items", readyItems, "ready")}
            {renderCartSection("Required choices", pendingItems, "pending")}
            {renderCartSection("Options available", optionalItems, "optional")}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-transparent px-3 py-3 text-xs text-white/50 md:border-slate-200 md:bg-white md:text-slate-500">
            No food items saved yet.
          </div>
        )}
      </div>

      {renderActionPanel()}

      <div className="shrink-0 rounded-xl border border-white/15 bg-transparent p-2.5 text-white shadow-none md:border-slate-200 md:bg-white md:text-slate-950 md:shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className={`text-xs font-semibold ${isLocked || canCheckoutMatchedItems ? "text-green-300 md:text-slate-900" : "text-rose-300 md:text-slate-900"}`}>
              {isLocked ? "Checkout handoff ready" : hasPendingItems ? "Complete required choices" : hasCannotMatchItems ? "Checkout matched items" : "Review and checkout"}
            </div>
            <div className={`mt-0.5 text-[11px] leading-4 ${isLocked || canCheckoutMatchedItems ? "text-green-200/75 md:text-slate-500" : "text-rose-200/80 md:text-slate-500"}`}>
              {isLocked
                ? hasCannotMatchItems
                  ? "Only matched items are included in this handoff."
                  : "Items are read-only for the checkout handoff."
                : estimatedTotal
                  ? hasCannotMatchItems
                    ? `Estimated total for matched items: ${estimatedTotal}`
                    : `Estimated total: ${estimatedTotal}`
                  : subtotal
                    ? hasCannotMatchItems
                      ? `Current subtotal for matched items: ${subtotal}`
                      : `Current subtotal: ${subtotal}`
                    : hasPendingItems
                      ? "Choose the required options to finish the draft cart."
                      : hasCannotMatchItems
                        ? "Gray rows are not included in checkout."
                        : "Checkout handoff is ready once items are complete."}
            </div>
          </div>
          {isLocked ? (
            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-transparent px-3 py-2 text-xs font-semibold text-green-300 shadow-sm ring-1 ring-green-400/20 md:bg-slate-950 md:text-white md:ring-0">
              <LockKeyhole className="h-3.5 w-3.5" />
              Handoff ready
            </div>
          ) : (
            <button
              type="button"
              data-tourbar-order-cta={hasPendingItems ? "review-choices" : "checkout"}
              data-tourbar-order-checkout={!hasPendingItems ? "true" : undefined}
              data-tourbar-order-review-choices={hasPendingItems ? "true" : undefined}
              onClick={() => {
                if (hasPendingItems) {
                  const pending = pendingItems[0];
                  if (pending) openLineActionPanel("required", pending);
                  return;
                }
                actions.submitFollowUp("checkout");
              }}
              disabled={!items.length}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                hasPendingItems
                  ? "bg-transparent text-rose-300 ring-1 ring-rose-400/25 hover:bg-rose-950/20 md:bg-rose-600 md:text-white md:ring-0 md:hover:bg-rose-700"
                  : hasCannotMatchItems
                    ? "bg-transparent text-green-300 ring-1 ring-green-400/25 hover:bg-green-950/20 md:bg-slate-950 md:text-white md:ring-0 md:hover:bg-slate-800"
                    : "bg-transparent text-green-300 ring-1 ring-green-400/25 hover:bg-green-950/20 md:bg-emerald-700 md:text-white md:ring-0 md:hover:bg-emerald-800"
              }`}
            >
              {hasPendingItems ? "Choose required" : hasCannotMatchItems ? "Checkout matched" : "Checkout"}
            </button>
          )}
        </div>
      </div>
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

export type TourBarOrderingProps = {
  onNavigateToFocus?: (target: TourBarOrderingFocusTarget) => void;
  siteLabel?: string;
  orderTitle?: string;
  notOnMenuLabel?: string;
  primaryPlaceholder?: string;
  followUpPlaceholder?: string;
  launcherTitle?: string;
  launcherAriaLabel?: string;
  resultEyebrow?: string;
  initialLoadingMessage?: string;
  followUpLoadingMessage?: string;
};

export default function TourBarOrdering({
  onNavigateToFocus,
  siteLabel = DEFAULT_SITE_LABEL,
  orderTitle = DEFAULT_ORDER_TITLE,
  notOnMenuLabel = DEFAULT_NOT_ON_MENU_LABEL,
  primaryPlaceholder = "Tell TourBar your BurgerRush order...",
  followUpPlaceholder = "Add items, pick choices, or say checkout...",
  launcherTitle = "TourBar carryout ordering",
  launcherAriaLabel = "Open TourBar carryout ordering",
  resultEyebrow = "BurgerRush order",
  initialLoadingMessage = "Building your BurgerRush draft cart…",
  followUpLoadingMessage = "Updating your order…",
}: TourBarOrderingProps) {
  const [carryoutOrder, setCarryoutOrderState] = useState<CarryoutOrder | null>(null);
  const carryoutOrderRef = useRef<CarryoutOrder | null>(null);
  const suppressNextOrderingFocusRef = useRef(false);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("cart");

  const setCarryoutOrder = useCallback((nextOrder: CarryoutOrder | null) => {
    carryoutOrderRef.current = nextOrder;
    setCarryoutOrderState(nextOrder);
  }, []);

  const focusOrderingTarget = useCallback(
    (target: TourBarOrderingFocusTarget) => {
      if (suppressNextOrderingFocusRef.current) {
        suppressNextOrderingFocusRef.current = false;
        clearSmartBarFocusOverlay();
        return;
      }

      const targetId = pageTarget(target.targetId);
      const focusTarget = {
        targetId,
        targetSelector: target.targetSelector,
        label: target.label,
      };

      if (!focusTarget.targetId && !focusTarget.targetSelector) return;

      // Let the carryout host reveal the right menu lane/tab only. The shared
      // SmartBar controller owns the actual scroll, verified placement, and
      // frost-cover spotlight so the older orange border animation cannot win.
      onNavigateToFocus?.(focusTarget);
      void smartbarFocusTarget(focusTarget, {
        initialDelayMs: TOURBAR_ORDERING_FOCUS_DELAY_MS,
        attempts: 22,
        overlayDurationMs: 3600,
        dispatchLegacyEvent: false,
      });
    },
    [onNavigateToFocus],
  );

  const updateLocalOption = (item: ReviewItem, group: CarryoutQualifierGroup, option: CarryoutQualifierOption) => {
    const nextOrder = applyLocalQualifierSelection(carryoutOrderRef.current, item, group, option);
    setCarryoutOrder(nextOrder);
    return nextOrder;
  };

  const removeLocalItem = (item: ReviewItem, actions?: TourBarShellActions) => {
    const next = applyLocalLineRemoval(carryoutOrderRef.current, item);
    const nextLength = allLines(next).length;
    const cannotMatchCount = next?.cannotMatchItems?.length || 0;
    const shouldCloseSheet = nextLength === 0 && cannotMatchCount === 0;

    setCarryoutOrder(shouldCloseSheet ? null : next);
    setActiveReviewIndex((index) => (nextLength ? Math.min(index, nextLength - 1) : 0));

    if (shouldCloseSheet) {
      setReviewMode("review");
      actions?.closeSheet();
      return;
    }

    setReviewMode("cart");
  };

  const replaceCannotMatchItem = (_retryIndex: number, retryValue: string, actions: TourBarShellActions) => {
    // Retry is a menu lookup, not a local cart toggle. Let the shell retract the
    // current cart, show ThinkingText, and then mount the backend/fixture result.
    clearSmartBarFocusOverlay();
    actions.submitFollowUp(retryValue);
  };

  const silentReprice = async (nextOrder: CarryoutOrder | null) => {
    if (!nextOrder) return;

    try {
      const response = await postGuideAi("show cart", nextOrder, [], siteLabel);
      const repricedOrder = extractCarryoutOrder(response);
      if (!repricedOrder) return;

      setCarryoutOrder(repricedOrder);
      const nextItems = reviewItemsFrom(response, repricedOrder);
      setActiveReviewIndex((index) =>
        nextItems.length ? Math.min(Math.max(index, 0), nextItems.length - 1) : 0,
      );
      setReviewMode("cart");
    } catch (error) {
      // Silent repricing should not collapse/reopen the visible sheet. If the
      // backend reprice fails, keep the locally completed order visible.
      console.warn("TourBar silent reprice failed", error);
    }
  };

  const submit = async (query: string, thread: TourBarThreadMessage[]) => {
    const response = await postGuideAi(query, carryoutOrderRef.current, thread, siteLabel);
    const nextOrder = extractCarryoutOrder(response);
    if (response.visibleContext && "carryoutOrder" in response.visibleContext) {
      setCarryoutOrder(nextOrder);
    } else if (response.carryoutOrder !== undefined) {
      setCarryoutOrder(nextOrder);
    }

    const nextItems = reviewItemsFrom(response, nextOrder);
    const pendingIndex = nextItems.findIndex((item) => item.pending);
    setActiveReviewIndex(pendingIndex >= 0 ? pendingIndex : 0);

    const cannotCount = nextOrder?.cannotMatchItems?.length || 0;
    setReviewMode(nextItems.length > 0 || cannotCount > 0 ? "cart" : "review");

    return toShellResult(response, orderTitle);
  };

  return (
    <TourBarShell
      primaryPlaceholder={primaryPlaceholder}
      followUpPlaceholder={followUpPlaceholder}
      launcherTitle={launcherTitle}
      launcherAriaLabel={launcherAriaLabel}
      resultEyebrow={resultEyebrow}
      initialLoadingMessage={initialLoadingMessage}
      followUpLoadingMessage={followUpLoadingMessage}
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
          onSilentReprice={silentReprice}
          onRemoveItem={removeLocalItem}
          onRetryItemReplace={replaceCannotMatchItem}
          onNavigateToFocus={focusOrderingTarget}
          notOnMenuLabel={notOnMenuLabel}
        />
      )}
      renderStandaloneSheet={(result, actions) => (
        <OrderReview
          result={result}
          actions={actions}
          carryoutOrder={carryoutOrder}
          activeIndex={activeReviewIndex}
          reviewMode={reviewMode}
          onActiveIndexChange={setActiveReviewIndex}
          onReviewModeChange={setReviewMode}
          onLocalOptionSelect={updateLocalOption}
          onSilentReprice={silentReprice}
          onRemoveItem={removeLocalItem}
          onRetryItemReplace={replaceCannotMatchItem}
          onNavigateToFocus={focusOrderingTarget}
          notOnMenuLabel={notOnMenuLabel}
        />
      )}
      onResult={(result) => {
        const response = (result.raw || {}) as GuideAiCarryoutResponse;
        const order = extractCarryoutOrder(response);
        const items = reviewItemsFrom(response, order);
        const pendingItem = items.find((item) => item.pending);
        if (pendingItem) {
          // OrderReview owns item-level focus after it mounts. Calling focus
          // here as well creates duplicate overlays: one from onResult and
          // another from the review useEffect.
          return;
        }

        const targetId = pageTarget(result.targetId);
        if (targetId || result.targetSelector) {
          focusOrderingTarget({
            targetId,
            targetSelector: result.targetSelector,
            label: result.label,
          });
        }
      }}
    />
  );
}
