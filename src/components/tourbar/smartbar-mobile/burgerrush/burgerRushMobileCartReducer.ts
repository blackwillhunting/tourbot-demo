import type { CarryoutOrder } from "../../TourBarOrdering";
import type {
  SmartBarMobileOrderLine,
  SmartBarMobileOrderResult,
  SmartBarMobileOrderStatus,
  SmartBarMobileSubmitMeta,
} from "../SmartBarMobileShell";

function burgerRushMobileCompactText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function smartBarMobileQueryStartsFreshCart(value: string) {
  const text = burgerRushMobileCompactText(value);
  if (!text) return false;

  return /^(new order|start over|start again|clear cart|clear order|reset cart|reset order|replace cart|replace order)\b/.test(text) ||
    /\b(start over|clear the cart|clear my cart|reset the cart|replace the order)\b/.test(text);
}

export function smartBarMobileQueryShouldUseExistingCart(value: string, hasExistingCart: boolean) {
  if (!hasExistingCart) return false;
  if (smartBarMobileQueryStartsFreshCart(value)) return false;

  // On the separated mobile surface, the entry box reopens specifically so the
  // visitor can add more food to the current cart. Treat follow-up food prompts
  // as additive by default instead of requiring "add/also/plus" wording.
  return true;
}

function smartBarMobileMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `$${value.toFixed(2)}`;
}

function smartBarMobileMoneyLabel(value: unknown) {
  if (typeof value === "number") return smartBarMobileMoney(value);

  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text === "—") return "";
  if (/^\$\d/.test(text)) return text;

  const numeric = Number(text.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(numeric) && /\d/.test(text) ? smartBarMobileMoney(numeric) : text;
}

function smartBarMobilePriceFromLine(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const looseLine = line as NonNullable<CarryoutOrder["items"]>[number] & Record<string, unknown>;

  return (
    smartBarMobileMoneyLabel(line.priceLabel) ||
    smartBarMobileMoneyLabel(looseLine.displayPrice) ||
    smartBarMobileMoneyLabel(looseLine.price) ||
    smartBarMobileMoneyLabel(looseLine.priceLabelShort) ||
    smartBarMobileMoneyLabel(looseLine.itemTotal) ||
    smartBarMobileMoneyLabel(looseLine.total) ||
    smartBarMobileMoneyLabel(looseLine.subtotal) ||
    smartBarMobileMoneyLabel(line.lineSubtotal) ||
    smartBarMobileMoneyLabel(looseLine.unitPrice) ||
    "—"
  );
}

function smartBarMobileSelectionKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function smartBarMobileDetailAlreadyCovers(details: string[], value: string) {
  const key = smartBarMobileSelectionKey(value);
  if (!key) return true;

  return details.some((detail) => {
    const detailKey = smartBarMobileSelectionKey(detail);
    return detailKey === key || detailKey.includes(key) || key.includes(detailKey);
  });
}

function smartBarMobilePushDetail(details: string[], rawValue: unknown) {
  const value = String(rawValue || "").replace(/\s+/g, " ").trim();
  if (!value) return;

  if (smartBarMobileDetailAlreadyCovers(details, value)) return;

  const sizeOnly = /^(small|medium|large)$/i.test(value);
  if (sizeOnly && details.some((detail) => smartBarMobileSelectionKey(detail).includes(smartBarMobileSelectionKey(value)))) {
    return;
  }

  details.push(value);
}

function smartBarMobileValuesFromLine(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const details: string[] = [];

  (line.knownSelections || []).forEach((value) => smartBarMobilePushDetail(details, value));
  (line.qualifiers || []).forEach((item) => {
    smartBarMobilePushDetail(details, item.valueLabel || item.label || item.value);
  });
  (line.modifiers || []).forEach((item) => smartBarMobilePushDetail(details, item.label));
  (line.upgrades || []).forEach((item) => smartBarMobilePushDetail(details, item.label));

  return details.slice(0, 6);
}

function smartBarMobileGroupOptionLabels(group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]) {
  const labels: string[] = [];

  (group.options || []).forEach((option) => {
    const label = String(option.label || option.value || "").replace(/\s+/g, " ").trim();
    if (!label) return;
    if (labels.some((existing) => smartBarMobileSelectionKey(existing) === smartBarMobileSelectionKey(label))) return;
    labels.push(label);
  });

  return labels;
}

function smartBarMobileGroupOptionIds(group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]) {
  const ids: string[] = [];

  (group.options || []).forEach((option) => {
    const optionRecord = option as typeof option & { id?: string };
    const optionId = String(optionRecord.value || optionRecord.id || optionRecord.label || "").trim();
    if (!optionId) return;
    ids.push(optionId);
  });

  return ids;
}


function smartBarMobileSelectedOptionLabelsFromLine(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const labels: string[] = [];

  const add = (rawValue: unknown) => {
    const value = String(rawValue || "").replace(/\s+/g, " ").trim();
    if (!value) return;
    if (labels.some((existing) => smartBarMobileKeysMatch(
      smartBarMobileSelectionKey(existing),
      smartBarMobileSelectionKey(value),
    ))) return;
    labels.push(value);
  };

  (line.qualifierGroups || []).forEach((group) => {
    add(group.selectedLabel);

    const selectedValue = String(group.selectedValue || "").trim();
    if (selectedValue && !group.selectedLabel) {
      const selectedOption = (group.options || []).find((option) => {
        const optionValue = String(option.value || option.label || "").trim();
        return Boolean(optionValue && smartBarMobileKeysMatch(
          smartBarMobileSelectionKey(optionValue),
          smartBarMobileSelectionKey(selectedValue),
        ));
      });
      add(selectedOption?.label || selectedOption?.value || selectedValue);
    }

    (group.options || []).forEach((option) => {
      if (option.selected || option.state === "selected") {
        add(option.label || option.value);
      }
    });
  });

  return labels;
}


function smartBarMobileSelectedOptionIdsFromLine(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const ids: string[] = [];

  const add = (rawValue: unknown) => {
    const value = String(rawValue || "").trim();
    if (!value || ids.includes(value)) return;
    ids.push(value);
  };

  (line.qualifierGroups || []).forEach((group) => {
    add(group.selectedValue);
    (group.options || []).forEach((option) => {
      if (!(option.selected || option.state === "selected")) return;
      const optionRecord = option as typeof option & { id?: string };
      add(optionRecord.value || optionRecord.id);
    });
  });

  return ids;
}


function smartBarMobileGroupIsOptional(group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]) {
  const kind = String(group.kind || "").toLowerCase();
  const selectionMode = String(group.selectionMode || "").toLowerCase();
  return Boolean(!group.required || kind === "modifier" || kind === "upgrade" || selectionMode === "multi");
}

function smartBarMobileGroupSelectionMode(group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]) {
  return smartBarMobileGroupIsOptional(group) ? "multi" as const : "single" as const;
}

function smartBarMobileOptionLabelMatchesValue(option: unknown, value: string) {
  const optionRecord = option as Record<string, unknown>;
  const candidates = [optionRecord.label, optionRecord.value, optionRecord.id]
    .map((candidate) => smartBarMobileSelectionKey(String(candidate || "")))
    .filter(Boolean);
  const valueKey = smartBarMobileSelectionKey(value);

  return Boolean(valueKey && candidates.some((candidate) => smartBarMobileKeysMatch(candidate, valueKey)));
}

function smartBarMobileOptionalGroupsForLine(line: NonNullable<CarryoutOrder["items"]>[number]) {
  return (line.qualifierGroups || []).filter((group) => {
    return Boolean(smartBarMobileGroupIsOptional(group) && (group.options || []).length);
  });
}

function smartBarMobileActiveOptionGroupFromLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  const missingQualifierIds = new Set(
    (line.missingQualifiers || [])
      .map((missing) => String(missing.qualifierId || ""))
      .filter(Boolean),
  );

  const groups = line.qualifierGroups || [];

  const activeMissingGroup = groups.find((group) => {
    const qualifierId = String(group.qualifierId || "");
    return Boolean(
      group.missing ||
        (qualifierId && missingQualifierIds.has(qualifierId)) ||
        (group.required && !(group.selectedValue || group.selectedLabel)),
    );
  });

  const activeOptionalGroup = smartBarMobileOptionalGroupsForLine(line).find((group) => {
    return Boolean((group.options || []).length);
  });

  const selectedGroup = groups.find((group) => {
    return Boolean(
      group.required &&
        (
          group.selectedValue ||
          group.selectedLabel ||
          (group.options || []).some((option) => option.selected || option.state === "selected")
        )
    );
  });

  const reusableRequiredGroup = groups.find((group) => {
    return Boolean(group.required && (group.options || []).length);
  });

  return activeMissingGroup ||
    (status === "options" ? activeOptionalGroup : undefined) ||
    selectedGroup ||
    (status === "ready" ? reusableRequiredGroup : undefined);
}

function smartBarMobileOptionsFromLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  const activeGroup = smartBarMobileActiveOptionGroupFromLine(line, status);
  return activeGroup ? smartBarMobileGroupOptionLabels(activeGroup) : [];
}

function smartBarMobileOptionIdsFromLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  const activeGroup = smartBarMobileActiveOptionGroupFromLine(line, status);
  return activeGroup ? smartBarMobileGroupOptionIds(activeGroup) : [];
}

function smartBarMobileOptionSelectionModeFromLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  const activeGroup = smartBarMobileActiveOptionGroupFromLine(line, status);
  return activeGroup ? smartBarMobileGroupSelectionMode(activeGroup) : undefined;
}

function smartBarMobileStatusForLine(line: NonNullable<CarryoutOrder["items"]>[number]): SmartBarMobileOrderStatus {
  const rawStatus = String(line.status || "").toLowerCase();
  const priceStatus = String((line as NonNullable<CarryoutOrder["items"]>[number] & { priceStatus?: string }).priceStatus || "").toLowerCase();
  const hasMissingQualifiers = Boolean(
    line.missingQualifiers?.length ||
      line.qualifierGroups?.some((group) => group.missing),
  );

  if (rawStatus.includes("pending") || rawStatus.includes("need") || hasMissingQualifiers || priceStatus === "incomplete") return "pending";
  if (smartBarMobileOptionalGroupsForLine(line).length > 0) return "options";
  return "ready";
}

function smartBarMobileHelperForLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  if (status === "pending") {
    const missing = line.missingQualifiers?.[0]?.label ||
      line.qualifierGroups?.find((group) => group.missing)?.label;
    return missing ? `Choose ${missing.toLowerCase()}` : "Choose a required option";
  }

  if (status === "options") return "Options available";
  return "Matched and ready";
}

function smartBarMobileLineFromCarryoutLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  index: number,
): SmartBarMobileOrderLine {
  const status = smartBarMobileStatusForLine(line);
  const details = smartBarMobileValuesFromLine(line);
  const options = smartBarMobileOptionsFromLine(line, status);
  const optionIds = smartBarMobileOptionIdsFromLine(line, status);
  const optionSelectionMode = smartBarMobileOptionSelectionModeFromLine(line, status);
  const selectedOptions = smartBarMobileSelectedOptionLabelsFromLine(line);
  const selectedOptionIds = smartBarMobileSelectedOptionIdsFromLine(line);
  const sourceLineItemId = String(line.lineItemId || line.id || `line-${index}`);
  const sourceItemId = String(line.id || "");
  const targetId = String((line as typeof line & { targetId?: string }).targetId || sourceItemId || "");
  const cartLineKey = `${sourceLineItemId}::source-${index}`;

  return {
    id: cartLineKey,
    ...(targetId ? { targetId } : {}),
    cartLineKey,
    sourceLineItemId,
    sourceItemId,
    sourceLineIndex: index,
    title: `${(line.quantity || 1) > 1 ? `${line.quantity} × ` : ""}${line.title || line.id || "Item"}`,
    status,
    helper: smartBarMobileHelperForLine(line, status),
    price: smartBarMobilePriceFromLine(line),
    details: details.length ? details : status === "pending" ? ["Choice needed"] : ["Ready"],
    ...(options.length ? { options, optionIds } : {}),
    selectedOptions,
    selectedOptionIds,
    ...(optionSelectionMode ? { optionSelectionMode } : {}),
  };
}

export function smartBarMobileEstimatedTotalFromLines(lines: SmartBarMobileOrderLine[]) {
  const total = lines.reduce((sum, line) => {
    const value = smartBarMobileParseMoney(line.price);
    return value === null ? sum : sum + value;
  }, 0);

  return total > 0 ? smartBarMobileMoneyFromNumber(total) : "—";
}

export function smartBarMobileResultFromOrder(
  order: CarryoutOrder | null,
  fallbackQuery: string,
): SmartBarMobileOrderResult {
  if (!order) {
    return {
      lines: [
        {
          id: "fallback-unknown",
          title: fallbackQuery || "Requested item",
          status: "unknown",
          helper: "Could not build cart from this response",
          price: "—",
          details: [],
          retryPrompt: "Try the order again in plain English.",
        },
      ],
      estimatedTotal: "—",
    };
  }

  const baseLines = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];
  const matchedLines = baseLines
    .map((line, index) => smartBarMobileLineFromCarryoutLine(line, index))
    .reverse();
  const cannotMatchLines = (order.cannotMatchItems || [])
    .map((item, index): SmartBarMobileOrderLine => {
      const title = item.text || item.label || item.title || item.item || "Unmatched item";
      return {
        id: `cannot-match-${index}-${title}`,
        title,
        status: "unknown",
        helper: item.reason === "not_on_menu" ? "Not on the BurgerRush menu" : "Could not match item",
        price: "—",
        details: item.suggestion ? [item.suggestion] : [],
        retryPrompt: "Re-enter the item so SmartBar can match it.",
      };
    });
  const allLines = [...matchedLines, ...cannotMatchLines];
  const estimatedSubtotal = smartBarMobileMoney(order.totals?.subtotal) || undefined;
  const estimatedTax = smartBarMobileMoney(order.totals?.estimatedTax) || undefined;
  const estimatedTotal = smartBarMobileMoney(order.totals?.estimatedTotal) ||
    estimatedSubtotal ||
    smartBarMobileEstimatedTotalFromLines(allLines);

  return {
    lines: allLines,
    estimatedSubtotal,
    estimatedTax,
    estimatedTotal,
  };
}

function smartBarMobileLineKeys(line: SmartBarMobileOrderLine) {
  return [
    line.cartLineKey,
    line.id,
    line.sourceLineItemId,
    line.sourceItemId,
    line.title,
    line.title.replace(/^\s*\d+\s*[×x]\s*/i, ""),
  ]
    .map((value) => smartBarMobileSelectionKey(String(value || "")))
    .filter(Boolean);
}

function smartBarMobileKeysMatch(leftKey: string, rightKey: string) {
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;

  const shorter = leftKey.length <= rightKey.length ? leftKey : rightKey;
  const longer = leftKey.length > rightKey.length ? leftKey : rightKey;

  return shorter.length >= 4 && longer.includes(shorter);
}

function smartBarMobileLinesMatch(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftKeys = smartBarMobileLineKeys(left);
  const rightKeys = smartBarMobileLineKeys(right);

  return leftKeys.some((leftKey) => rightKeys.some((rightKey) => smartBarMobileKeysMatch(leftKey, rightKey)));
}

function smartBarMobileFindMatchingLineIndex(
  lines: SmartBarMobileOrderLine[],
  line: SmartBarMobileOrderLine,
) {
  return lines.findIndex((candidate) => smartBarMobileLinesMatch(candidate, line));
}

function smartBarMobileHydrateLineFromPrevious(
  line: SmartBarMobileOrderLine,
  previousLines: SmartBarMobileOrderLine[],
) {
  const previous = previousLines.find((candidate) => smartBarMobileLinesMatch(candidate, line));
  if (!previous) return line;

  const previousWasReviewedOption = Boolean(
    previous.status === "ready" &&
      line.status === "options" &&
      (
        previous.optionSelectionMode === "multi" ||
        line.optionSelectionMode === "multi" ||
        (previous.options || []).length ||
        (line.options || []).length
      )
  );

  const lineHasIntentionalEmptyOptionDetails = Boolean(
    line.status === "ready" &&
      line.details.length === 0 &&
      (
        line.optionSelectionMode === "multi" ||
        previous.optionSelectionMode === "multi" ||
        (line.options || previous.options || []).length
      )
  );

  return {
    ...line,
    targetId: line.targetId || previous.targetId,
    status: previousWasReviewedOption ? "ready" : line.status,
    helper: previousWasReviewedOption ? previous.helper || "Reviewed and ready" : line.helper,
    optionSelectionMode: line.optionSelectionMode || previous.optionSelectionMode,
    options: line.options?.length ? line.options : previous.options,
    optionIds: line.optionIds?.length ? line.optionIds : previous.optionIds,
    selectedOptions: line.selectedOptions !== undefined ? line.selectedOptions : previous.selectedOptions,
    selectedOptionIds: line.selectedOptionIds !== undefined ? line.selectedOptionIds : previous.selectedOptionIds,
    price: line.price && line.price !== "—" ? line.price : previous.price,
    details: lineHasIntentionalEmptyOptionDetails
      ? []
      : line.details.length > 0 && !(line.details.length === 1 && line.details[0] === "Ready")
        ? line.details
        : previous.details,
  };
}

function smartBarMobileParseMoney(value?: string) {
  const cleaned = String(value || "").replace(/[^0-9.-]+/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function smartBarMobileMoneyFromNumber(value: number) {
  return `$${value.toFixed(2)}`;
}

export function smartBarMobileMergeOrderResults(
  nextResult: SmartBarMobileOrderResult,
  previousLines: SmartBarMobileOrderLine[],
  previousEstimatedTotal: string,
  shouldMergeWithPrevious: boolean,
): SmartBarMobileOrderResult {
  const hydratedNextLines = nextResult.lines.map((line) => smartBarMobileHydrateLineFromPrevious(line, previousLines));

  if (!shouldMergeWithPrevious) {
    return {
      ...nextResult,
      lines: hydratedNextLines,
      estimatedSubtotal: nextResult.estimatedSubtotal,
      estimatedTax: nextResult.estimatedTax,
      estimatedTotal: nextResult.estimatedTotal && nextResult.estimatedTotal !== "—"
        ? nextResult.estimatedTotal
        : smartBarMobileEstimatedTotalFromLines(hydratedNextLines),
    };
  }

  if (previousLines.length === 0) {
    return {
      ...nextResult,
      lines: hydratedNextLines,
      estimatedSubtotal: nextResult.estimatedSubtotal,
      estimatedTax: nextResult.estimatedTax,
      estimatedTotal: nextResult.estimatedTotal && nextResult.estimatedTotal !== "—"
        ? nextResult.estimatedTotal
        : previousEstimatedTotal && previousEstimatedTotal !== "—"
          ? previousEstimatedTotal
          : smartBarMobileEstimatedTotalFromLines(hydratedNextLines),
    };
  }

  const mergedLines = [...previousLines];
  let appendedLineCount = 0;
  let matchedPreviousLineCount = 0;

  for (const line of hydratedNextLines) {
    const existingIndex = smartBarMobileFindMatchingLineIndex(mergedLines, line);

    if (existingIndex >= 0) {
      matchedPreviousLineCount += 1;
      mergedLines[existingIndex] = smartBarMobileHydrateLineFromPrevious(line, [mergedLines[existingIndex]]);
      continue;
    }

    appendedLineCount += 1;
    mergedLines.push(line);
  }

  const previousTotal = smartBarMobileParseMoney(previousEstimatedTotal);
  const nextTotal = smartBarMobileParseMoney(nextResult.estimatedTotal);
  const responseLooksLikeFullCart = matchedPreviousLineCount > 0;
  const mergedLineTotal = smartBarMobileEstimatedTotalFromLines(mergedLines);
  const estimatedTotal = responseLooksLikeFullCart
    ? nextResult.estimatedTotal && nextResult.estimatedTotal !== "—"
      ? nextResult.estimatedTotal
      : mergedLineTotal
    : appendedLineCount > 0 && previousTotal !== null && nextTotal !== null
      ? smartBarMobileMoneyFromNumber(previousTotal + nextTotal)
      : nextResult.estimatedTotal && nextResult.estimatedTotal !== "—"
        ? nextResult.estimatedTotal
        : previousEstimatedTotal && previousEstimatedTotal !== "—"
          ? previousEstimatedTotal
          : mergedLineTotal;

  return {
    ...nextResult,
    lines: mergedLines,
    estimatedSubtotal: nextResult.estimatedSubtotal,
    estimatedTax: nextResult.estimatedTax,
    estimatedTotal,
  };
}

function smartBarMobileCarryoutLineKeys(line: NonNullable<CarryoutOrder["items"]>[number]) {
  return [
    line.lineItemId,
    line.id,
    line.title,
    line.title?.replace(/^\s*\d+\s*[×x]\s*/i, ""),
  ]
    .map((value) => smartBarMobileSelectionKey(String(value || "")))
    .filter(Boolean);
}

function smartBarMobileCarryoutLinesMatch(
  left: NonNullable<CarryoutOrder["items"]>[number],
  right: NonNullable<CarryoutOrder["items"]>[number],
) {
  const leftKeys = smartBarMobileCarryoutLineKeys(left);
  const rightKeys = smartBarMobileCarryoutLineKeys(right);

  return leftKeys.some((leftKey) => rightKeys.some((rightKey) => smartBarMobileKeysMatch(leftKey, rightKey)));
}

function smartBarMobileCarryoutLineIsPending(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const status = String(line.status || "").toLowerCase();
  return Boolean(
    status.includes("pending") ||
      status.includes("need") ||
      line.missingQualifiers?.length ||
      line.qualifierGroups?.some((group) => group.missing),
  );
}

export function smartBarMobileMergeCarryoutOrders(
  previousOrder: CarryoutOrder | null,
  nextOrder: CarryoutOrder | null,
  shouldMergeWithPrevious: boolean,
): CarryoutOrder | null {
  if (!shouldMergeWithPrevious || !previousOrder) return nextOrder;
  if (!nextOrder) return previousOrder;

  const previousItems = Array.isArray(previousOrder.items)
    ? previousOrder.items
    : [...(previousOrder.completeItems || []), ...(previousOrder.pendingItems || [])];
  const nextItems = Array.isArray(nextOrder.items)
    ? nextOrder.items
    : [...(nextOrder.completeItems || []), ...(nextOrder.pendingItems || [])];

  const mergedItems = [...previousItems];

  for (const line of nextItems) {
    const existingIndex = mergedItems.findIndex((candidate) => smartBarMobileCarryoutLinesMatch(candidate, line));
    if (existingIndex >= 0) {
      mergedItems[existingIndex] = {
        ...mergedItems[existingIndex],
        ...line,
        priceLabel: line.priceLabel || mergedItems[existingIndex].priceLabel,
        lineSubtotal: line.lineSubtotal ?? mergedItems[existingIndex].lineSubtotal,
      };
      continue;
    }

    mergedItems.push(line);
  }

  const pendingItems = mergedItems.filter(smartBarMobileCarryoutLineIsPending);
  const completeItems = mergedItems.filter((line) => !smartBarMobileCarryoutLineIsPending(line));

  return {
    ...previousOrder,
    ...nextOrder,
    items: mergedItems,
    completeItems,
    pendingItems,
  };
}

function smartBarMobileLineMatchesReplacement(line: SmartBarMobileOrderLine, meta?: SmartBarMobileSubmitMeta) {
  if (!meta?.replaceLineId && !meta?.replaceLineTitle) return false;

  const targetKeys = [meta.replaceLineId, meta.replaceLineTitle]
    .map((value) => smartBarMobileSelectionKey(String(value || "")))
    .filter(Boolean);
  const lineKeys = smartBarMobileLineKeys(line);

  return line.id === meta.replaceLineId ||
    lineKeys.some((lineKey) => targetKeys.some((targetKey) => smartBarMobileKeysMatch(lineKey, targetKey)));
}

export function smartBarMobileFilterReplacementLine(
  lines: SmartBarMobileOrderLine[],
  meta?: SmartBarMobileSubmitMeta,
) {
  if (meta?.intent !== "replace_unknown") return lines;
  return lines.filter((line) => !smartBarMobileLineMatchesReplacement(line, meta));
}

function smartBarMobileCarryoutLineMatchesReplacement(
  line: NonNullable<CarryoutOrder["items"]>[number],
  meta?: SmartBarMobileSubmitMeta,
) {
  if (!meta?.replaceLineId && !meta?.replaceLineTitle) return false;

  const targetKeys = [meta.replaceLineId, meta.replaceLineTitle]
    .map((value) => smartBarMobileSelectionKey(String(value || "")))
    .filter(Boolean);
  const lineKeys = smartBarMobileCarryoutLineKeys(line);

  return lineKeys.some((lineKey) => targetKeys.some((targetKey) => smartBarMobileKeysMatch(lineKey, targetKey)));
}

export function smartBarMobileRemoveReplacementFromCarryoutOrder(
  order: CarryoutOrder | null,
  meta?: SmartBarMobileSubmitMeta,
): CarryoutOrder | null {
  if (!order || meta?.intent !== "replace_unknown") return order;

  const items = Array.isArray(order.items)
    ? order.items.filter((line) => !smartBarMobileCarryoutLineMatchesReplacement(line, meta))
    : [];
  const completeItems = (order.completeItems || []).filter((line) => !smartBarMobileCarryoutLineMatchesReplacement(line, meta));
  const pendingItems = (order.pendingItems || []).filter((line) => !smartBarMobileCarryoutLineMatchesReplacement(line, meta));
  const targetKey = smartBarMobileSelectionKey(meta.replaceLineTitle || meta.replaceLineId || "");
  const cannotMatchItems = (order.cannotMatchItems || []).filter((item) => {
    const itemKey = smartBarMobileSelectionKey(String(item.text || item.label || item.title || item.item || ""));
    return !itemKey || !targetKey || !smartBarMobileKeysMatch(itemKey, targetKey);
  });

  return {
    ...order,
    ...(Array.isArray(order.items) ? { items } : {}),
    completeItems,
    pendingItems,
    cannotMatchItems,
  };
}



function smartBarMobileLineInstanceKey(line: SmartBarMobileOrderLine) {
  return String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || "");
}

function smartBarMobileVisibleLinesAreSameInstance(
  left: SmartBarMobileOrderLine,
  right: SmartBarMobileOrderLine,
) {
  const leftKey = smartBarMobileLineInstanceKey(left);
  const rightKey = smartBarMobileLineInstanceKey(right);

  if (leftKey && rightKey) return leftKey === rightKey;

  if (left.sourceLineIndex !== undefined && right.sourceLineIndex !== undefined) {
    return left.sourceLineIndex === right.sourceLineIndex;
  }

  return Boolean(left.id && right.id && left.id === right.id);
}

function smartBarMobileComparableVisibleLineTitle(value: string) {
  return smartBarMobileSelectionKey(value.replace(/^\s*\d+\s*[×x]\s*/i, ""));
}

export function smartBarMobileRemoveVisibleLine(
  lines: SmartBarMobileOrderLine[],
  lineToRemove: SmartBarMobileOrderLine,
) {
  const removeIndex = lines.findIndex((line) => smartBarMobileVisibleLinesAreSameInstance(line, lineToRemove));
  if (removeIndex < 0) return lines;

  const nextLines = [...lines];
  nextLines.splice(removeIndex, 1);
  return nextLines;
}

function smartBarMobileCarryoutLineMatchesVisibleLine(
  carryoutLine: NonNullable<CarryoutOrder["items"]>[number],
  visibleLine: SmartBarMobileOrderLine,
  carryoutIndex?: number,
) {
  const visibleSourceIndex = visibleLine.sourceLineIndex;
  const sourceIndexMatches = typeof visibleSourceIndex === "number" &&
    typeof carryoutIndex === "number" &&
    visibleSourceIndex === carryoutIndex;

  // Source indices and lineItemIds can both be stale for add-on rows. The backend
  // can return a one-item order for the new item at source index 0, then repricing
  // can move that same row from pending -> complete, changing sourceBucket and
  // lineItemId. Do not let lineItemId/sourceLineIndex alone target the wrong old
  // cart row. Require item/title agreement, and use index only as a tie-breaker.
  const visibleSourceLineItemId = smartBarMobileSelectionKey(String(visibleLine.sourceLineItemId || ""));
  const carryoutLineItemId = smartBarMobileSelectionKey(String(carryoutLine.lineItemId || ""));
  const visibleSourceItemId = smartBarMobileSelectionKey(String(visibleLine.sourceItemId || ""));
  const carryoutItemId = smartBarMobileSelectionKey(String(carryoutLine.id || ""));
  const itemMatches = Boolean(visibleSourceItemId && carryoutItemId && visibleSourceItemId === carryoutItemId);
  const carryoutTitle = smartBarMobileComparableVisibleLineTitle(String(carryoutLine.title || carryoutLine.id || ""));
  const visibleTitle = smartBarMobileComparableVisibleLineTitle(visibleLine.title || "");
  const titleMatches = Boolean(carryoutTitle && visibleTitle && carryoutTitle === visibleTitle);

  if (visibleSourceLineItemId && carryoutLineItemId && visibleSourceLineItemId === carryoutLineItemId) {
    return Boolean(itemMatches || titleMatches || sourceIndexMatches);
  }

  const visibleId = smartBarMobileSelectionKey(visibleLine.id || "");
  const carryoutIds = [carryoutLine.lineItemId, carryoutLine.id]
    .map((value) => smartBarMobileSelectionKey(String(value || "")))
    .filter(Boolean);

  if (visibleId && carryoutIds.includes(visibleId)) {
    return Boolean(itemMatches || titleMatches || sourceIndexMatches);
  }

  if (itemMatches) {
    return Boolean(titleMatches || sourceIndexMatches || !visibleTitle || !carryoutTitle);
  }

  if (!titleMatches) return false;

  const carryoutPrice = smartBarMobileSelectionKey(smartBarMobilePriceFromLine(carryoutLine));
  const visiblePrice = smartBarMobileSelectionKey(visibleLine.price || "");

  return Boolean(sourceIndexMatches || !carryoutPrice || !visiblePrice || carryoutPrice === visiblePrice);
}

export function smartBarMobileRemoveLineFromCarryoutOrder(
  order: CarryoutOrder | null,
  lineToRemove: SmartBarMobileOrderLine,
): CarryoutOrder | null {
  if (!order) return order;

  const sourceItems = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];
  const removeIndex = sourceItems.findIndex((line, index) => smartBarMobileCarryoutLineMatchesVisibleLine(line, lineToRemove, index));
  const items = [...sourceItems];
  if (removeIndex >= 0) {
    items.splice(removeIndex, 1);
  }
  const pendingItems = items.filter(smartBarMobileCarryoutLineIsPending);
  const completeItems = items.filter((line) => !smartBarMobileCarryoutLineIsPending(line));
  const targetKey = smartBarMobileComparableVisibleLineTitle(lineToRemove.title || lineToRemove.id || "");
  const cannotMatchItems = (order.cannotMatchItems || []).filter((item) => {
    const itemKey = smartBarMobileComparableVisibleLineTitle(String(item.text || item.label || item.title || item.item || ""));
    return !itemKey || !targetKey || itemKey !== targetKey;
  });

  return {
    ...order,
    items,
    completeItems,
    pendingItems,
    cannotMatchItems,
    status: pendingItems.length ? "needs_qualifier" : items.length ? "ready_cart" : "ready_cart",
    currentStep: smartBarMobileNextCurrentStep(order, pendingItems),
  };
}


function smartBarMobileChoiceDetails(
  details: string[],
  value: string,
  optionLabels: string[] = [],
  selectionMode: "single" | "multi" = "single",
  selected = true,
) {
  const valueKey = smartBarMobileSelectionKey(value);
  const optionKeys = optionLabels
    .map((option) => smartBarMobileSelectionKey(option))
    .filter(Boolean);

  const cleaned = (details || []).filter((detail) => {
    const detailText = String(detail || "").trim();
    const detailKey = smartBarMobileSelectionKey(detailText);
    if (/^(choice needed|size needed)$/i.test(detailText)) return false;

    const detailMatchesOption = optionKeys.some((optionKey) => smartBarMobileKeysMatch(optionKey, detailKey));
    const detailMatchesValue = smartBarMobileKeysMatch(detailKey, valueKey);

    // Required qualifiers are single-choice. Optional extras are multi-select,
    // so selecting bacon must not erase cheese, sauce, or other extras.
    if (selectionMode === "single" && detailKey && detailMatchesOption && !detailMatchesValue) return false;
    if (selectionMode === "multi" && !selected && detailMatchesValue) return false;

    return true;
  });

  if (selectionMode === "multi" && !selected) return cleaned;

  return Array.from(new Set([...cleaned, value]));
}

export function smartBarMobileApplyChoiceToVisibleLines(
  lines: SmartBarMobileOrderLine[],
  selectedLine: SmartBarMobileOrderLine,
  value: string,
  selected = true,
  carryoutOrder?: CarryoutOrder | null,
) {
  const nextLines = [...lines];
  const existingIndex = smartBarMobileFindMatchingLineIndex(nextLines, selectedLine);

  if (carryoutOrder) {
    const sourceItems = Array.isArray(carryoutOrder.items)
      ? carryoutOrder.items
      : [...(carryoutOrder.completeItems || []), ...(carryoutOrder.pendingItems || [])];
    const carryoutIndex = sourceItems.findIndex((line, index) => {
      return smartBarMobileCarryoutLineMatchesVisibleLine(line, selectedLine, index);
    });

    if (carryoutIndex >= 0) {
      const resolvedFromOrder = smartBarMobileLineFromCarryoutLine(sourceItems[carryoutIndex], carryoutIndex);
      if (existingIndex >= 0) {
        nextLines[existingIndex] = smartBarMobileHydrateLineFromPrevious(
          resolvedFromOrder,
          [nextLines[existingIndex]],
        );
        return nextLines;
      }
      return [...nextLines, resolvedFromOrder];
    }
  }

  const selectionMode = selectedLine.optionSelectionMode || (selectedLine.status === "options" ? "multi" : "single");
  const optionIndex = (selectedLine.options || []).findIndex((option) => smartBarMobileOptionLabelMatchesValue({ label: option }, value));
  const optionId = optionIndex >= 0 ? String(selectedLine.optionIds?.[optionIndex] || "") : "";
  const selectedOptionIds = optionId
    ? selectionMode === "multi"
      ? selected
        ? Array.from(new Set([...(selectedLine.selectedOptionIds || []), optionId]))
        : (selectedLine.selectedOptionIds || []).filter((selectedId) => String(selectedId) !== optionId)
      : [optionId]
    : selectedLine.selectedOptionIds;
  const resolvedLine: SmartBarMobileOrderLine = {
    ...selectedLine,
    status: "ready",
    helper: selectionMode === "multi" ? "Reviewed and ready" : `${value} selected`,
    price: selectedLine.price && selectedLine.price !== "—" ? selectedLine.price : "—",
    details: smartBarMobileChoiceDetails(selectedLine.details, value, selectedLine.options || [], selectionMode, selected),
    options: selectedLine.options || [],
    optionIds: selectedLine.optionIds || [],
    selectedOptions: selectionMode === "multi"
      ? selected
        ? Array.from(new Set([...(selectedLine.selectedOptions || []), value]))
        : (selectedLine.selectedOptions || []).filter((option) => !smartBarMobileOptionLabelMatchesValue({ label: option }, value))
      : [value],
    ...(selectedOptionIds ? { selectedOptionIds } : {}),
    optionSelectionMode: selectionMode,
  };

  if (existingIndex >= 0) {
    nextLines[existingIndex] = smartBarMobileHydrateLineFromPrevious(resolvedLine, [nextLines[existingIndex]]);
    return nextLines;
  }

  return [...nextLines, resolvedLine];
}

function smartBarMobileAddSelectedOptionalItem(
  current: Array<Record<string, unknown>> | undefined,
  option: Record<string, unknown> | undefined,
  idField: "modifierId" | "id",
  fallbackValue: string,
) {
  if (!option) return current || [];

  const optionId = String(option.value || option.id || fallbackValue || "").trim();
  if (!optionId) return current || [];

  const optionLabel = String(option.label || optionId).replace(/\s+/g, " ").trim();
  const existing = current || [];
  const alreadySelected = existing.some((item) => {
    const selectedId = String(item[idField] || item.id || item.value || "").trim();
    return Boolean(selectedId && smartBarMobileKeysMatch(smartBarMobileSelectionKey(selectedId), smartBarMobileSelectionKey(optionId)));
  });

  if (alreadySelected) return existing;

  return [
    ...existing,
    {
      [idField]: optionId,
      id: optionId,
      value: optionId,
      label: optionLabel,
      ...(typeof option.priceDelta === "number" ? { priceDelta: option.priceDelta } : {}),
    },
  ];
}

function smartBarMobileRemoveSelectedOptionalItem(
  current: Array<Record<string, unknown>> | undefined,
  option: Record<string, unknown> | undefined,
  idField: "modifierId" | "id",
  fallbackValue: string,
) {
  const existing = current || [];
  const optionId = String(option?.value || option?.id || fallbackValue || "").trim();
  const optionLabel = String(option?.label || fallbackValue || "").replace(/\s+/g, " ").trim();
  const optionKey = smartBarMobileSelectionKey(optionId || optionLabel || fallbackValue);

  if (!optionKey) return existing;

  return existing.filter((item) => {
    const selectedId = String(item[idField] || item.id || item.value || "").trim();
    const selectedLabel = String(item.label || item.name || "").replace(/\s+/g, " ").trim();
    const selectedKey = smartBarMobileSelectionKey(selectedId || selectedLabel);

    return !smartBarMobileKeysMatch(selectedKey, optionKey);
  });
}

function smartBarMobileActiveChoiceGroupIndex(
  carryoutLine: NonNullable<CarryoutOrder["items"]>[number],
  selectedLine: SmartBarMobileOrderLine,
  value: string,
) {
  const groups = carryoutLine.qualifierGroups || [];
  const missingQualifierIds = new Set(
    (carryoutLine.missingQualifiers || [])
      .map((missing) => String(missing.qualifierId || ""))
      .filter(Boolean),
  );

  const matchingIndexes = groups
    .map((group, index) => {
      const groupMatchesChoice = (group.options || []).some((option) => {
        return smartBarMobileOptionLabelMatchesValue(option, value);
      }) || smartBarMobileGroupOptionLabels(group).some((option) => {
        return smartBarMobileKeysMatch(
          smartBarMobileSelectionKey(option),
          smartBarMobileSelectionKey(value),
        );
      });
      return groupMatchesChoice ? index : -1;
    })
    .filter((index) => index >= 0);

  if (!matchingIndexes.length) return -1;

  if (selectedLine.status === "pending") {
    const missingRequiredIndex = matchingIndexes.find((index) => {
      const group = groups[index];
      const qualifierId = String(group.qualifierId || "");
      const hasSelectedOption = Boolean(
        group.selectedValue ||
        group.selectedLabel ||
        (group.options || []).some((option) => option.selected || option.state === "selected")
      );

      return Boolean(
        group.required &&
        !smartBarMobileGroupIsOptional(group) &&
        (
          group.missing ||
          (qualifierId && missingQualifierIds.has(qualifierId)) ||
          !hasSelectedOption
        )
      );
    });

    if (missingRequiredIndex !== undefined) return missingRequiredIndex;
  }

  if (selectedLine.status === "options") {
    const optionalIndex = matchingIndexes.find((index) => {
      return smartBarMobileGroupIsOptional(groups[index]);
    });

    if (optionalIndex !== undefined) return optionalIndex;
  }

  return matchingIndexes[0];
}


function smartBarMobileApplyChoiceToCarryoutLine(
  carryoutLine: NonNullable<CarryoutOrder["items"]>[number],
  selectedLine: SmartBarMobileOrderLine,
  value: string,
  carryoutIndex: number,
  selectedChoice = true,
) {
  if (!smartBarMobileCarryoutLineMatchesVisibleLine(carryoutLine, selectedLine, carryoutIndex)) return carryoutLine;

  const matchingQualifierIds = new Set<string>();
  const selectedOptionLabels = selectedLine.options || [];
  let matchedSelectionMode: "single" | "multi" = selectedLine.optionSelectionMode || (selectedLine.status === "options" ? "multi" : "single");
  let matchedGroupKind = "";
  let matchedOption: Record<string, unknown> | undefined;
  const activeGroupIndex = smartBarMobileActiveChoiceGroupIndex(carryoutLine, selectedLine, value);

  if (activeGroupIndex < 0) return carryoutLine;

  const qualifierGroups = (carryoutLine.qualifierGroups || []).map((group, groupIndex) => {
    if (groupIndex !== activeGroupIndex) return group;

    const qualifierId = String(group.qualifierId || "");
    if (qualifierId) matchingQualifierIds.add(qualifierId);

    const groupSelectionMode = smartBarMobileGroupSelectionMode(group);
    matchedSelectionMode = groupSelectionMode;
    matchedGroupKind = String(group.kind || "").toLowerCase();

    return {
      ...group,
      missing: false,
      ...(groupSelectionMode === "single" ? { selectedLabel: value, selectedValue: value } : {}),
      options: (group.options || []).map((option) => {
        const optionRecord = option as Record<string, unknown>;
        const selectedNow = smartBarMobileOptionLabelMatchesValue(optionRecord, value);
        const selected = groupSelectionMode === "multi"
          ? selectedNow
            ? selectedChoice
            : Boolean(optionRecord.selected || optionRecord.state === "selected")
          : selectedNow;

        if (selectedNow) matchedOption = optionRecord;

        return {
          ...optionRecord,
          selected,
          state: selected ? "selected" : "available",
        };
      }),
    };
  });

  const missingQualifiers = (carryoutLine.missingQualifiers || []).filter((missing) => {
    const qualifierId = String(missing.qualifierId || "");
    return !qualifierId || !matchingQualifierIds.has(qualifierId);
  });

  const requiredGroupOptionLabels = qualifierGroups
    .filter((group) => Boolean(group.required && !smartBarMobileGroupIsOptional(group)))
    .flatMap((group) => smartBarMobileGroupOptionLabels(group));
  const selectedRequiredLabels = qualifierGroups
    .filter((group) => Boolean(group.required && !smartBarMobileGroupIsOptional(group)))
    .map((group) => {
      const explicitlySelected = String(group.selectedLabel || "").replace(/\s+/g, " ").trim();
      if (explicitlySelected) return explicitlySelected;

      const selectedOption = (group.options || []).find((option) => {
        return Boolean(option.selected || option.state === "selected");
      });
      const selectedOptionRecord = selectedOption as Record<string, unknown> | undefined;
      return String(selectedOptionRecord?.label || selectedOptionRecord?.value || "").replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
  const preservedKnownSelections = (carryoutLine.knownSelections || []).filter((detail) => {
    const detailKey = smartBarMobileSelectionKey(String(detail || ""));
    return !requiredGroupOptionLabels.some((option) => {
      return smartBarMobileKeysMatch(smartBarMobileSelectionKey(option), detailKey);
    });
  });
  const requiredAwareKnownSelections = Array.from(new Set([
    ...preservedKnownSelections,
    ...selectedRequiredLabels,
  ]));
  const knownSelections = matchedSelectionMode === "multi"
    ? smartBarMobileChoiceDetails(
        requiredAwareKnownSelections,
        value,
        selectedOptionLabels.length ? selectedOptionLabels : smartBarMobileGroupOptionLabels(
          qualifierGroups[activeGroupIndex] ||
          ({} as NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]),
        ),
        matchedSelectionMode,
        selectedChoice,
      )
    : requiredAwareKnownSelections;

  const stillMissingGroup = qualifierGroups.some((group) => Boolean(group.required && group.missing));
  const stillPending = missingQualifiers.length > 0 || stillMissingGroup;
  const hasOptionalGroups = qualifierGroups.some((group) => smartBarMobileGroupIsOptional(group) && (group.options || []).length);
  const nextModifiers = matchedSelectionMode === "multi" && matchedGroupKind === "modifier"
    ? selectedChoice
      ? smartBarMobileAddSelectedOptionalItem(carryoutLine.modifiers as Array<Record<string, unknown>> | undefined, matchedOption, "modifierId", value)
      : smartBarMobileRemoveSelectedOptionalItem(carryoutLine.modifiers as Array<Record<string, unknown>> | undefined, matchedOption, "modifierId", value)
    : carryoutLine.modifiers;
  const nextUpgrades = matchedSelectionMode === "multi" && matchedGroupKind === "upgrade"
    ? selectedChoice
      ? smartBarMobileAddSelectedOptionalItem(carryoutLine.upgrades as Array<Record<string, unknown>> | undefined, matchedOption, "id", value)
      : smartBarMobileRemoveSelectedOptionalItem(carryoutLine.upgrades as Array<Record<string, unknown>> | undefined, matchedOption, "id", value)
    : carryoutLine.upgrades;

  return {
    ...carryoutLine,
    status: stillPending ? "needs_qualifier" : hasOptionalGroups ? "options" : "ready",
    knownSelections,
    missingQualifiers,
    qualifierGroups,
    ...(nextModifiers ? { modifiers: nextModifiers } : {}),
    ...(nextUpgrades ? { upgrades: nextUpgrades } : {}),
    priceLabel: smartBarMobileMoneyLabel(selectedLine.price) || carryoutLine.priceLabel,
  };
}

function smartBarMobileNextCurrentStep(order: CarryoutOrder, pendingItems: NonNullable<CarryoutOrder["items"]>) {
  const nextPending = pendingItems[0];
  if (!nextPending) return undefined;

  const activeGroup = (nextPending.qualifierGroups || []).find((group) => group.missing) ||
    (nextPending.qualifierGroups || [])[0];
  const activeMissing = (nextPending.missingQualifiers || [])[0];

  return {
    ...order.currentStep,
    type: "qualifier",
    itemId: nextPending.lineItemId || nextPending.id,
    targetId: nextPending.targetId || activeMissing?.targetId || activeGroup?.targetId,
    qualifierId: activeMissing?.qualifierId || activeGroup?.qualifierId,
    question: activeGroup?.label || activeMissing?.label || "Choose required option",
  };
}

export function smartBarMobileApplyChoiceToCarryoutOrder(
  order: CarryoutOrder | null,
  selectedLine: SmartBarMobileOrderLine,
  value: string,
  selected = true,
): CarryoutOrder | null {
  if (!order) return order;

  const sourceItems = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];
  const items = sourceItems.map((line, index) => smartBarMobileApplyChoiceToCarryoutLine(line, selectedLine, value, index, selected));
  const pendingItems = items.filter(smartBarMobileCarryoutLineIsPending);
  const completeItems = items.filter((line) => !smartBarMobileCarryoutLineIsPending(line));
  const nextCurrentStep = smartBarMobileNextCurrentStep(order, pendingItems);

  return {
    ...order,
    status: pendingItems.length ? order.status : "ready_cart",
    nextAction: pendingItems.length ? order.nextAction : "show_cart",
    items,
    completeItems,
    pendingItems,
    currentStep: nextCurrentStep,
  };
}

