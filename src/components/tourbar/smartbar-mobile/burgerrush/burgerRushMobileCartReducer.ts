import type {
  CarryoutBundleComponent,
  CarryoutLine,
  CarryoutOrder,
} from "../../TourBarOrdering";
import type {
  SmartBarMobileOrderLine,
  SmartBarMobileOrderResult,
  SmartBarMobileOrderStatus,
  SmartBarMobileSubmitMeta,
} from "../SmartBarMobileShell";

function smartBarMobileCompactText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function smartBarMobileGrayReasonCode(reason: unknown, title?: string) {
  const raw = String(reason || "").replace(/[\s-]+/g, "_").toLowerCase();
  if (["unavailable_now", "outside_availability_window", "outside_hours"].includes(raw)) return "unavailable_now";
  if (["not_on_menu", "unavailable_food", "unsupported_food"].includes(raw)) return "not_on_menu";
  if (["not_recognized", "unknown", "unknown_item", "unrecognized", "gibberish"].includes(raw)) return "not_recognized";
  if (["not_sold_separately", "not_separate", "modifier_only", "dangling_modifier", "unsupported_variant", "extra_not_available"].includes(raw)) return "not_sold_separately";
  if (["ambiguous_item_match", "ambiguous", "multiple_matches", "multiple_match", "could_mean_more_than_one_item"].includes(raw)) return "ambiguous_item_match";
  if (["selection_limit_exceeded", "selection_limit", "too_many_choices", "too_many_options", "maximum_exceeded"].includes(raw)) return "selection_limit_exceeded";

  // A shared UI cannot infer menu policy from food words. The active menu
  // profile must supply a reason when it knows why a line did not match.
  void title;
  return "not_recognized";
}

function smartBarMobileGrayReasonLabel(reason: unknown, title?: string) {
  const code = smartBarMobileGrayReasonCode(reason, title);
  if (code === "unavailable_now") return "Not available right now";
  if (code === "not_sold_separately") return "Not sold separately";
  if (code === "ambiguous_item_match") return "Could mean more than one item";
  if (code === "selection_limit_exceeded") return "Too many choices";
  if (code === "not_on_menu") return "Not on this menu";
  return "Not recognized";
}

function smartBarMobileGrayRetryPrompt(reason: unknown, title?: string) {
  const code = smartBarMobileGrayReasonCode(reason, title);
  if (code === "unavailable_now") return "Choose another item or try again during its available hours.";
  if (code === "not_sold_separately") return "Add this as part of a menu item instead.";
  if (code === "ambiguous_item_match") return "Add the missing detail, like size, so SmartBar can choose the right item.";
  if (code === "selection_limit_exceeded") return "Remove the extra choice or choose fewer options.";
  if (code === "not_on_menu") return "Try a different item from this menu.";
  return "Try describing this item another way.";
}

function smartBarMobileQueryStartsFreshCart(value: string) {
  const text = smartBarMobileCompactText(value);
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

function smartBarMobileExactSelectionMatch(left: unknown, right: unknown) {
  const leftKey = smartBarMobileSelectionKey(String(left || ""));
  const rightKey = smartBarMobileSelectionKey(String(right || ""));
  return Boolean(leftKey && rightKey && leftKey === rightKey);
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

function smartBarMobileGroupOptionQuantities(
  group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  return (group.options || []).map((option) => {
    if (!(option.selected || option.state === "selected")) return 0;
    const parsed = Number(option.quantity);
    return Number.isFinite(parsed) ? Math.max(1, Math.min(2, Math.floor(parsed))) : 1;
  });
}

function smartBarMobileGroupOptionMaximums(
  group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  const groupMaximum = Number(group.maxQuantityPerOption);
  const fallback = group.allowRepeatedOptions && Number.isFinite(groupMaximum)
    ? Math.max(1, Math.min(2, Math.floor(groupMaximum)))
    : 1;
  return (group.options || []).map((option) => {
    const parsed = Number(option.maxQuantity);
    return Number.isFinite(parsed)
      ? Math.max(1, Math.min(2, Math.floor(parsed)))
      : fallback;
  });
}


function smartBarMobileSelectedOptionLabelsFromLine(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const labels: string[] = [];

  const add = (rawValue: unknown) => {
    const value = String(rawValue || "").replace(/\s+/g, " ").trim();
    if (!value) return;
    if (labels.some((existing) => smartBarMobileExactSelectionMatch(existing, value))) return;
    labels.push(value);
  };

  (line.qualifierGroups || []).forEach((group) => {
    add(group.selectedLabel);

    const selectedValue = String(group.selectedValue || "").trim();
    if (selectedValue && !group.selectedLabel) {
      const selectedOption = (group.options || []).find((option) => {
        const optionRecord = option as typeof option & { id?: string };
        return [optionRecord.value, optionRecord.id, optionRecord.label]
          .some((candidate) => smartBarMobileExactSelectionMatch(candidate, selectedValue));
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

function smartBarMobileSelectedOptionLabelsFromGroup(
  group?: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  if (!group) return [];
  const labels: string[] = [];
  (group.options || []).forEach((option) => {
    if (!(option.selected || option.state === "selected")) return;
    const label = String(option.label || option.value || "").replace(/\s+/g, " ").trim();
    if (label && !labels.some((value) => smartBarMobileSelectionKey(value) === smartBarMobileSelectionKey(label))) {
      labels.push(label);
    }
  });
  if (!labels.length && (group.selectedLabel || group.selectedValue)) {
    labels.push(String(group.selectedLabel || group.selectedValue));
  }
  return labels;
}

function smartBarMobileSelectedOptionIdsFromGroup(
  group?: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  if (!group) return [];
  const ids: string[] = [];
  (group.options || []).forEach((option) => {
    if (!(option.selected || option.state === "selected")) return;
    const optionRecord = option as typeof option & { id?: string };
    const id = String(optionRecord.value || optionRecord.id || optionRecord.label || "").trim();
    if (id && !ids.includes(id)) ids.push(id);
  });
  if (!ids.length && group.selectedValue) ids.push(String(group.selectedValue));
  return ids;
}


function smartBarMobileGroupIsOptional(group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]) {
  const kind = String(group.kind || "").toLowerCase();
  return Boolean(
    !group.required &&
      smartBarMobileGroupMinimumSelections(group) === 0 &&
      (kind === "modifier" || kind === "upgrade" || (group.options || []).length > 0)
  );
}

function smartBarMobileGroupSelectionMode(group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number]) {
  const mode = String(group.selectionMode || "").toLowerCase();
  const minimum = smartBarMobileGroupMinimumSelections(group);
  const maximum = smartBarMobileGroupMaximumSelections(group);
  return mode === "multi" || minimum > 1 || maximum === undefined || maximum > 1
    ? "multi" as const
    : "single" as const;
}

function smartBarMobileSelectionBound(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

function smartBarMobileGroupMinimumSelections(
  group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  return smartBarMobileSelectionBound(group.minSelections) ?? (group.required ? 1 : 0);
}

function smartBarMobileGroupMaximumSelections(
  group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  const explicit = smartBarMobileSelectionBound(group.maxSelections);
  if (explicit !== undefined) return Math.max(smartBarMobileGroupMinimumSelections(group), explicit);
  const mode = String(group.selectionMode || "").toLowerCase();
  const kind = String(group.kind || "").toLowerCase();
  return mode === "multi" || kind === "modifier" || kind === "upgrade" ? undefined : 1;
}

function smartBarMobileGroupSelectedCount(
  group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  if (smartBarMobileGroupSelectionMode(group) === "single") {
    return group.selectedValue ||
      group.selectedLabel ||
      (group.options || []).some((option) => option.selected || option.state === "selected")
      ? 1
      : 0;
  }
  return (group.options || []).reduce((count, option) => {
    if (!(option.selected || option.state === "selected")) return count;
    const parsed = Number(option.quantity);
    return count + (Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1);
  }, 0);
}

function smartBarMobileGroupNeedsReview(
  group: NonNullable<NonNullable<CarryoutOrder["items"]>[number]["qualifierGroups"]>[number],
) {
  const selectedCount = smartBarMobileGroupSelectedCount(group);
  const minimum = smartBarMobileGroupMinimumSelections(group);
  const maximum = smartBarMobileGroupMaximumSelections(group);
  return selectedCount < minimum || (maximum !== undefined && selectedCount > maximum);
}

function smartBarMobileOptionLabelMatchesValue(option: unknown, value: string) {
  const optionRecord = option as Record<string, unknown>;
  return [optionRecord.label, optionRecord.value, optionRecord.id]
    .some((candidate) => smartBarMobileExactSelectionMatch(candidate, value));
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
        smartBarMobileGroupNeedsReview(group) ||
        (qualifierId && missingQualifierIds.has(qualifierId)) ||
        (group.required && smartBarMobileGroupSelectedCount(group) === 0),
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

function smartBarMobileOptionLimitsFromLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  const activeGroup = smartBarMobileActiveOptionGroupFromLine(line, status);
  if (!activeGroup) return {};

  return {
    optionGroupLabel: activeGroup.label,
    optionMinSelections: smartBarMobileGroupMinimumSelections(activeGroup),
    optionMaxSelections: smartBarMobileGroupMaximumSelections(activeGroup),
    selectionRules: activeGroup.selectionRules || [],
  };
}

function smartBarMobileStatusForLine(line: NonNullable<CarryoutOrder["items"]>[number]): SmartBarMobileOrderStatus {
  const componentStatuses = (line.bundleComponents || []).map((component) => (
    smartBarMobileStatusForLine(component)
  ));
  if (componentStatuses.includes("unknown")) return "unknown";
  if (componentStatuses.includes("pending")) return "pending";
  if (componentStatuses.includes("options")) return "options";

  const rawStatus = String(line.status || "").toLowerCase();
  const priceStatus = String((line as NonNullable<CarryoutOrder["items"]>[number] & { priceStatus?: string }).priceStatus || "").toLowerCase();
  const hasMissingQualifiers = Boolean(
    line.missingQualifiers?.length ||
      line.qualifierGroups?.some((group) => group.missing || smartBarMobileGroupNeedsReview(group)),
  );

  if (rawStatus.includes("pending") || rawStatus.includes("need") || hasMissingQualifiers || priceStatus === "incomplete") return "pending";
  if (smartBarMobileOptionalGroupsForLine(line).length > 0) return "options";
  return "ready";
}

function smartBarMobileHelperForLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  status: SmartBarMobileOrderStatus,
) {
  if (line.bundleComponents?.length) {
    if (status === "unknown") return "Check included items";
    if (status === "pending") return "Finish included items";
    if (status === "options") return "Review included options";
    return "All included items ready";
  }

  if (status === "pending") {
    const missing = line.missingQualifiers?.[0]?.label ||
      line.qualifierGroups?.find((group) => group.missing || smartBarMobileGroupNeedsReview(group))?.label;
    return missing ? `Choose ${missing.toLowerCase()}` : "Choose a required option";
  }

  if (status === "options") return "Options available";
  return "Matched and ready";
}

function smartBarMobileLineFromCarryoutLine(
  line: NonNullable<CarryoutOrder["items"]>[number],
  index: number,
  bundleContext?: {
    parentCartLineKey: string;
    parentSourceLineItemId: string;
    slotId: string;
  },
): SmartBarMobileOrderLine {
  const status = smartBarMobileStatusForLine(line);
  const rawBundleOwnStatus = String(line.bundleOwnStatus || "").toLowerCase();
  const bundleOwnStatus: SmartBarMobileOrderStatus | undefined = line.bundleComponents?.length
    ? rawBundleOwnStatus.includes("unknown")
      ? "unknown"
      : rawBundleOwnStatus.includes("pending") || rawBundleOwnStatus.includes("need")
        ? "pending"
        : rawBundleOwnStatus.includes("option")
          ? "options"
          : "ready"
    : undefined;
  const details = smartBarMobileValuesFromLine(line);
  const options = smartBarMobileOptionsFromLine(line, status);
  const optionIds = smartBarMobileOptionIdsFromLine(line, status);
  const optionSelectionMode = smartBarMobileOptionSelectionModeFromLine(line, status);
  const optionLimits = smartBarMobileOptionLimitsFromLine(line, status);
  const activeGroup = smartBarMobileActiveOptionGroupFromLine(line, status);
  const optionQuantities = activeGroup
    ? smartBarMobileGroupOptionQuantities(activeGroup)
    : [];
  const optionMaxQuantities = activeGroup
    ? smartBarMobileGroupOptionMaximums(activeGroup)
    : [];
  const selectedOptions = activeGroup
    ? smartBarMobileSelectedOptionLabelsFromGroup(activeGroup)
    : smartBarMobileSelectedOptionLabelsFromLine(line);
  const selectedOptionIds = activeGroup
    ? smartBarMobileSelectedOptionIdsFromGroup(activeGroup)
    : smartBarMobileSelectedOptionIdsFromLine(line);
  const sourceLineItemId = String(line.lineItemId || line.id || `line-${index}`);
  const sourceItemId = String(line.id || "");
  const targetId = String((line as typeof line & { targetId?: string }).targetId || sourceItemId || "");
  const cartLineKey = `${sourceLineItemId}::source-${index}`;
  const priceSuppressed = Boolean(
    bundleContext ||
      (line as NonNullable<CarryoutOrder["items"]>[number] & { priceSuppressed?: boolean }).priceSuppressed
  );
  const bundleComponents = (line.bundleComponents || []).map((component, componentIndex) => (
    smartBarMobileLineFromCarryoutLine(component, componentIndex, {
      parentCartLineKey: cartLineKey,
      parentSourceLineItemId: sourceLineItemId,
      slotId: String(component.slotId || `component-${componentIndex + 1}`),
    })
  ));

  return {
    id: cartLineKey,
    ...(targetId ? { targetId } : {}),
    cartLineKey,
    sourceLineItemId,
    sourceItemId,
    sourceLineIndex: index,
    sourceBucket: "items",
    title: `${(line.quantity || 1) > 1 ? `${line.quantity} × ` : ""}${line.title || line.id || "Item"}`,
    status,
    helper: smartBarMobileHelperForLine(line, status),
    price: priceSuppressed ? "" : smartBarMobilePriceFromLine(line),
    details: details.length ? details : status === "pending" ? ["Choice needed"] : ["Ready"],
    ...(options.length ? { options, optionIds, optionQuantities, optionMaxQuantities } : {}),
    selectedOptions,
    selectedOptionIds,
    ...(optionSelectionMode ? { optionSelectionMode } : {}),
    ...optionLimits,
    ...(bundleComponents.length
      ? {
          isExpandableBundle: true,
          bundleOwnStatus,
          bundleComponents,
        }
      : {}),
    ...(bundleContext
      ? {
          bundleParentCartLineKey: bundleContext.parentCartLineKey,
          bundleParentSourceLineItemId: bundleContext.parentSourceLineItemId,
          bundleSlotId: bundleContext.slotId,
          priceSuppressed: true,
        }
      : priceSuppressed
        ? { priceSuppressed: true }
        : {}),
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
          helper: "Not recognized",
          price: "—",
          details: [],
          grayReason: "not_recognized",
          displayReason: "Not recognized",
          retryPrompt: "Try describing this item another way.",
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
      const looseItem = item as typeof item & Record<string, unknown>;
      const title = String(looseItem.text || looseItem.label || looseItem.title || looseItem.item || "Unmatched item");
      const grayReason = smartBarMobileGrayReasonCode(looseItem.grayReason || looseItem.reason, title);
      const displayReason = String(looseItem.displayReason || smartBarMobileGrayReasonLabel(grayReason, title));
      const suggestion = String(looseItem.suggestion || "").replace(/\s+/g, " ").trim();
      const retryPrompt = String(
        looseItem.retryPrompt || suggestion || smartBarMobileGrayRetryPrompt(grayReason, title),
      ).replace(/\s+/g, " ").trim();
      const cartLineKey = `cannot-match::source-${index}`;
      return {
        id: cartLineKey,
        cartLineKey,
        sourceLineItemId: `cannot-match-${index}`,
        sourceLineIndex: index,
        sourceBucket: "cannot_match",
        title,
        status: "unknown",
        helper: displayReason,
        grayReason,
        displayReason,
        price: "—",
        details: suggestion ? [suggestion] : [],
        retryPrompt,
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

function smartBarMobileLinesMatch(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  const leftCartLineKey = String(left.cartLineKey || "").trim();
  const rightCartLineKey = String(right.cartLineKey || "").trim();
  if (leftCartLineKey || rightCartLineKey) {
    return Boolean(leftCartLineKey && rightCartLineKey && leftCartLineKey === rightCartLineKey);
  }

  const leftLineItemId = String(left.sourceLineItemId || "").trim();
  const rightLineItemId = String(right.sourceLineItemId || "").trim();
  if (leftLineItemId || rightLineItemId) {
    return Boolean(leftLineItemId && rightLineItemId && leftLineItemId === rightLineItemId);
  }

  const leftId = String(left.id || "").trim();
  const rightId = String(right.id || "").trim();
  return Boolean(leftId && rightId && leftId === rightId);
}

function smartBarMobileResponseContainsPreviousLines(
  nextLines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
) {
  if (nextLines.length <= previousLines.length) return false;

  const remainingNextLines = [...nextLines];
  return previousLines.every((previousLine) => {
    const matchingIndex = remainingNextLines.findIndex((nextLine) => smartBarMobileLinesMatch(previousLine, nextLine));
    if (matchingIndex < 0) return false;
    remainingNextLines.splice(matchingIndex, 1);
    return true;
  });
}

function smartBarMobileEnsureUniqueLineInstances(
  lines: SmartBarMobileOrderLine[],
  existingLines: SmartBarMobileOrderLine[] = [],
) {
  const usedKeys = new Set(
    existingLines
      .map((line) => String(line.cartLineKey || line.id || "").trim())
      .filter(Boolean),
  );

  return lines.map((line, index) => {
    const baseKey = String(
      line.cartLineKey ||
      line.id ||
      line.sourceLineItemId ||
      `${line.sourceBucket || "items"}-line-${line.sourceLineIndex ?? index}`,
    ).trim();
    let uniqueKey = baseKey || `cart-line-${usedKeys.size + 1}`;
    let occurrence = 2;

    while (usedKeys.has(uniqueKey)) {
      uniqueKey = `${baseKey || "cart-line"}::instance-${occurrence}`;
      occurrence += 1;
    }

    usedKeys.add(uniqueKey);
    if (line.cartLineKey === uniqueKey && line.id === uniqueKey) return line;

    return {
      ...line,
      id: uniqueKey,
      cartLineKey: uniqueKey,
    };
  });
}

function smartBarMobilePrepareIncrementalLines(
  lines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
) {
  const nextSourceIndexByBucket = new Map<string, number>();
  for (const bucket of ["items", "cannot_match"] as const) {
    const priorIndexes = previousLines
      .filter((line) => (line.sourceBucket || "items") === bucket)
      .map((line) => line.sourceLineIndex)
      .filter((index): index is number => typeof index === "number");
    nextSourceIndexByBucket.set(bucket, priorIndexes.length ? Math.max(...priorIndexes) + 1 : 0);
  }

  const fallbackIndexByBucket = new Map<string, number>();
  const rebasedLines = lines.map((line) => {
    const sourceBucket = line.sourceBucket || "items";
    const fallbackIndex = fallbackIndexByBucket.get(sourceBucket) || 0;
    fallbackIndexByBucket.set(sourceBucket, fallbackIndex + 1);
    const localIndex = line.sourceLineIndex ?? fallbackIndex;
    const sourceLineIndex = (nextSourceIndexByBucket.get(sourceBucket) || 0) + localIndex;

    if (sourceBucket !== "cannot_match") {
      return { ...line, sourceLineIndex };
    }

    const cartLineKey = `cannot-match::source-${sourceLineIndex}`;
    return {
      ...line,
      id: cartLineKey,
      cartLineKey,
      sourceLineItemId: `cannot-match-${sourceLineIndex}`,
      sourceLineIndex,
      sourceBucket,
    };
  });

  return smartBarMobileEnsureUniqueLineInstances(rebasedLines, previousLines);
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
    optionGroupLabel: line.optionGroupLabel || previous.optionGroupLabel,
    optionMinSelections: line.optionMinSelections ?? previous.optionMinSelections,
    optionMaxSelections: line.optionMaxSelections ?? previous.optionMaxSelections,
    selectionRules: line.selectionRules?.length ? line.selectionRules : previous.selectionRules,
    options: line.options?.length ? line.options : previous.options,
    optionIds: line.optionIds?.length ? line.optionIds : previous.optionIds,
    optionQuantities: line.optionQuantities?.length ? line.optionQuantities : previous.optionQuantities,
    optionMaxQuantities: line.optionMaxQuantities?.length ? line.optionMaxQuantities : previous.optionMaxQuantities,
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
  const uniqueNextLines = smartBarMobileEnsureUniqueLineInstances(nextResult.lines);
  const hydratedNextLines = uniqueNextLines.map((line) => smartBarMobileHydrateLineFromPrevious(line, previousLines));

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

  const responseLooksLikeFullCart = smartBarMobileResponseContainsPreviousLines(hydratedNextLines, previousLines);
  const appendedLines = responseLooksLikeFullCart
    ? []
    : smartBarMobilePrepareIncrementalLines(hydratedNextLines, previousLines);
  const mergedLines = responseLooksLikeFullCart
    ? hydratedNextLines
    : [...previousLines, ...appendedLines];

  const previousTotal = smartBarMobileParseMoney(previousEstimatedTotal);
  const nextTotal = smartBarMobileParseMoney(nextResult.estimatedTotal);
  const mergedLineTotal = smartBarMobileEstimatedTotalFromLines(mergedLines);
  const estimatedTotal = responseLooksLikeFullCart
    ? nextResult.estimatedTotal && nextResult.estimatedTotal !== "—"
      ? nextResult.estimatedTotal
      : mergedLineTotal
    : appendedLines.length > 0 && previousTotal !== null && nextTotal !== null
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

function smartBarMobileCarryoutLinesMatch(
  left: NonNullable<CarryoutOrder["items"]>[number],
  right: NonNullable<CarryoutOrder["items"]>[number],
) {
  const leftLineItemId = String(left.lineItemId || "").trim();
  const rightLineItemId = String(right.lineItemId || "").trim();
  return Boolean(leftLineItemId && rightLineItemId && leftLineItemId === rightLineItemId);
}

function smartBarMobileResponseContainsPreviousCarryoutLines(
  nextLines: NonNullable<CarryoutOrder["items"]>,
  previousLines: NonNullable<CarryoutOrder["items"]>,
) {
  const remainingNextLines = [...nextLines];
  return previousLines.every((previousLine) => {
    const matchingIndex = remainingNextLines.findIndex((nextLine) => smartBarMobileCarryoutLinesMatch(previousLine, nextLine));
    if (matchingIndex < 0) return false;
    remainingNextLines.splice(matchingIndex, 1);
    return true;
  });
}

function smartBarMobileCarryoutLineIsPending(line: NonNullable<CarryoutOrder["items"]>[number]) {
  const status = String(line.status || "").toLowerCase();
  return Boolean(
    status.includes("pending") ||
      status.includes("need") ||
      line.bundleComponents?.some(smartBarMobileCarryoutLineIsPending) ||
      line.missingQualifiers?.length ||
      line.qualifierGroups?.some((group) => group.missing || smartBarMobileGroupNeedsReview(group)),
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
  const previousCannotMatchItems = previousOrder.cannotMatchItems || [];
  const nextCannotMatchItems = nextOrder.cannotMatchItems || [];

  const responseContainsPreviousItems = smartBarMobileResponseContainsPreviousCarryoutLines(nextItems, previousItems);
  const responseLooksLikeFullCart = responseContainsPreviousItems &&
    nextItems.length + nextCannotMatchItems.length > previousItems.length + previousCannotMatchItems.length;
  const mergedItems = responseLooksLikeFullCart
    ? [...nextItems]
    : [...previousItems, ...nextItems];
  const mergedCannotMatchItems = responseLooksLikeFullCart
    ? [...nextCannotMatchItems]
    : [...previousCannotMatchItems, ...nextCannotMatchItems];

  const pendingItems = mergedItems.filter(smartBarMobileCarryoutLineIsPending);
  const completeItems = mergedItems.filter((line) => !smartBarMobileCarryoutLineIsPending(line));

  return {
    ...previousOrder,
    ...nextOrder,
    items: mergedItems,
    completeItems,
    pendingItems,
    cannotMatchItems: mergedCannotMatchItems,
  };
}

function smartBarMobileLineMatchesReplacement(line: SmartBarMobileOrderLine, meta?: SmartBarMobileSubmitMeta) {
  if (!meta) return false;

  const targetCartLineKey = String(meta.replaceCartLineKey || meta.replaceLineId || "").trim();
  const lineCartLineKey = String(line.cartLineKey || line.id || "").trim();
  if (targetCartLineKey && lineCartLineKey) return targetCartLineKey === lineCartLineKey;

  const targetLineItemId = String(meta.replaceSourceLineItemId || "").trim();
  const lineItemId = String(line.sourceLineItemId || "").trim();
  if (targetLineItemId && lineItemId) return targetLineItemId === lineItemId;

  return Boolean(
    meta.replaceSourceLineIndex !== undefined &&
      line.sourceLineIndex !== undefined &&
      meta.replaceSourceLineIndex === line.sourceLineIndex &&
      (!meta.replaceSourceBucket || !line.sourceBucket || meta.replaceSourceBucket === line.sourceBucket),
  );
}

export function smartBarMobileFilterReplacementLine(
  lines: SmartBarMobileOrderLine[],
  meta?: SmartBarMobileSubmitMeta,
) {
  if (meta?.intent !== "replace_unknown") return lines;
  const removeIndex = lines.findIndex((line) => smartBarMobileLineMatchesReplacement(line, meta));
  if (removeIndex < 0) return lines;

  const nextLines = [...lines];
  nextLines.splice(removeIndex, 1);
  return nextLines;
}

function smartBarMobileCarryoutLineMatchesReplacement(
  line: NonNullable<CarryoutOrder["items"]>[number],
  index: number,
  meta?: SmartBarMobileSubmitMeta,
) {
  if (!meta || meta.replaceSourceBucket === "cannot_match") return false;

  const targetLineItemId = String(meta.replaceSourceLineItemId || "").trim();
  const lineItemId = String(line.lineItemId || "").trim();
  if (targetLineItemId && lineItemId) return targetLineItemId === lineItemId;

  return Boolean(meta.replaceSourceLineIndex !== undefined && meta.replaceSourceLineIndex === index);
}

export function smartBarMobileRemoveReplacementFromCarryoutOrder(
  order: CarryoutOrder | null,
  meta?: SmartBarMobileSubmitMeta,
): CarryoutOrder | null {
  if (!order || meta?.intent !== "replace_unknown") return order;

  const sourceItems = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];
  const items = [...sourceItems];
  const itemRemoveIndex = items.findIndex((line, index) => smartBarMobileCarryoutLineMatchesReplacement(line, index, meta));
  if (itemRemoveIndex >= 0) items.splice(itemRemoveIndex, 1);

  const completeItems = items.filter((line) => !smartBarMobileCarryoutLineIsPending(line));
  const pendingItems = items.filter(smartBarMobileCarryoutLineIsPending);
  const cannotMatchItems = [...(order.cannotMatchItems || [])];

  if (meta.replaceSourceBucket === "cannot_match" && meta.replaceSourceLineIndex !== undefined) {
    cannotMatchItems.splice(meta.replaceSourceLineIndex, 1);
  } else if (itemRemoveIndex < 0 && meta.replaceLineTitle) {
    const targetTitle = smartBarMobileSelectionKey(meta.replaceLineTitle);
    const cannotMatchIndex = cannotMatchItems.findIndex((item) => (
      smartBarMobileSelectionKey(String(item.text || item.label || item.title || item.item || "")) === targetTitle
    ));
    if (cannotMatchIndex >= 0) cannotMatchItems.splice(cannotMatchIndex, 1);
  }

  return {
    ...order,
    items,
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

  // Unmatched rows do not receive backend lineItemIds, so their source index
  // is their occurrence identity. Rebase the remaining unmatched rows after a
  // deletion so a later trash click still targets the correct occurrence.
  let cannotMatchIndex = 0;
  return nextLines.map((line) => {
    if (line.sourceBucket !== "cannot_match") return line;

    const sourceLineIndex = cannotMatchIndex;
    cannotMatchIndex += 1;
    const cartLineKey = `cannot-match::source-${sourceLineIndex}`;

    return {
      ...line,
      id: cartLineKey,
      cartLineKey,
      sourceLineItemId: `cannot-match-${sourceLineIndex}`,
      sourceLineIndex,
    };
  });
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

  const visibleSourceLineItemId = smartBarMobileSelectionKey(String(visibleLine.sourceLineItemId || ""));
  const carryoutLineItemId = smartBarMobileSelectionKey(String(carryoutLine.lineItemId || carryoutLine.id || ""));
  const visibleSourceItemId = smartBarMobileSelectionKey(String(visibleLine.sourceItemId || ""));
  const carryoutItemId = smartBarMobileSelectionKey(String(carryoutLine.id || ""));
  const itemMatches = Boolean(visibleSourceItemId && carryoutItemId && visibleSourceItemId === carryoutItemId);
  const carryoutTitle = smartBarMobileComparableVisibleLineTitle(String(carryoutLine.title || carryoutLine.id || ""));
  const visibleTitle = smartBarMobileComparableVisibleLineTitle(visibleLine.title || "");
  const titleMatches = Boolean(carryoutTitle && visibleTitle && carryoutTitle === visibleTitle);

  if (visibleSourceLineItemId || carryoutLineItemId) {
    return Boolean(
      visibleSourceLineItemId &&
      carryoutLineItemId &&
      visibleSourceLineItemId === carryoutLineItemId,
    );
  }

  return Boolean(sourceIndexMatches && (itemMatches || titleMatches));
}

export function smartBarMobileRemoveLineFromCarryoutOrder(
  order: CarryoutOrder | null,
  lineToRemove: SmartBarMobileOrderLine,
): CarryoutOrder | null {
  if (!order) return order;

  const sourceItems = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];
  const items = [...sourceItems];
  const cannotMatchItems = [...(order.cannotMatchItems || [])];

  if (lineToRemove.sourceBucket === "cannot_match") {
    const sourceIndex = lineToRemove.sourceLineIndex;
    if (typeof sourceIndex === "number" && sourceIndex >= 0 && sourceIndex < cannotMatchItems.length) {
      cannotMatchItems.splice(sourceIndex, 1);
    } else {
      const targetTitle = smartBarMobileSelectionKey(lineToRemove.title);
      const matchingIndexes = cannotMatchItems
        .map((item, index) => {
          const itemTitle = smartBarMobileSelectionKey(String(item.text || item.label || item.title || item.item || ""));
          return itemTitle === targetTitle ? index : -1;
        })
        .filter((index) => index >= 0);

      // A title is safe only when it identifies exactly one unmatched row.
      if (matchingIndexes.length === 1) cannotMatchItems.splice(matchingIndexes[0], 1);
    }
  } else {
    const removeIndex = sourceItems.findIndex((line, index) => (
      smartBarMobileCarryoutLineMatchesVisibleLine(line, lineToRemove, index)
    ));
    if (removeIndex >= 0) items.splice(removeIndex, 1);
  }

  const pendingItems = items.filter(smartBarMobileCarryoutLineIsPending);
  const completeItems = items.filter((line) => !smartBarMobileCarryoutLineIsPending(line));
  const status = pendingItems.length
    ? "needs_qualifier"
    : cannotMatchItems.length
      ? items.length ? "partial_match" : "cannot_match"
      : "ready_cart";

  return {
    ...order,
    items,
    completeItems,
    pendingItems,
    cannotMatchItems,
    status,
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

    const detailMatchesOption = optionKeys.some((optionKey) => optionKey === detailKey);
    const detailMatchesValue = Boolean(detailKey && detailKey === valueKey);

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
  optionQuantity?: number,
) {
  const nextLines = [...lines];
  const existingIndex = nextLines.findIndex((line) => smartBarMobileLinesMatch(line, selectedLine));

  if (carryoutOrder) {
    const sourceItems = Array.isArray(carryoutOrder.items)
      ? carryoutOrder.items
      : [...(carryoutOrder.completeItems || []), ...(carryoutOrder.pendingItems || [])];
    const bundleParentSourceLineItemId = String(selectedLine.bundleParentSourceLineItemId || "").trim();
    if (bundleParentSourceLineItemId) {
      const parentCarryoutIndex = sourceItems.findIndex((line) => (
        String(line.lineItemId || line.id || "").trim() === bundleParentSourceLineItemId
      ));
      const parentVisibleIndex = nextLines.findIndex((line) => (
        String(line.sourceLineItemId || "").trim() === bundleParentSourceLineItemId
      ));

      if (parentCarryoutIndex >= 0 && parentVisibleIndex >= 0) {
        const resolvedParent = smartBarMobileLineFromCarryoutLine(
          sourceItems[parentCarryoutIndex],
          parentCarryoutIndex,
        );
        nextLines[parentVisibleIndex] = smartBarMobileHydrateLineFromPrevious(
          resolvedParent,
          [nextLines[parentVisibleIndex]],
        );
        return nextLines;
      }
    }

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
  const minimum = smartBarMobileSelectionBound(selectedLine.optionMinSelections) ?? (selectedLine.status === "pending" ? 1 : 0);
  const maximum = smartBarMobileSelectionBound(selectedLine.optionMaxSelections);
  const optionIndex = (selectedLine.options || []).findIndex((option) => smartBarMobileOptionLabelMatchesValue({ label: option }, value));
  const optionId = optionIndex >= 0 ? String(selectedLine.optionIds?.[optionIndex] || "") : "";
  const currentQuantities = (selectedLine.options || []).map((_, index) => {
    const parsed = Number(selectedLine.optionQuantities?.[index]);
    const optionSelected = (selectedLine.selectedOptionIds || []).includes(String(selectedLine.optionIds?.[index] || "")) ||
      (selectedLine.selectedOptions || []).some((option) => smartBarMobileOptionLabelMatchesValue({ label: option }, selectedLine.options?.[index] || ""));
    return optionSelected
      ? Number.isFinite(parsed) ? Math.max(1, Math.min(2, Math.floor(parsed))) : 1
      : 0;
  });
  const maximumForOption = optionIndex >= 0
    ? Math.max(1, Math.min(2, Number(selectedLine.optionMaxQuantities?.[optionIndex]) || 1))
    : 1;
  const currentQuantity = optionIndex >= 0 ? currentQuantities[optionIndex] || 0 : 0;
  const desiredQuantity = selected
    ? Math.max(1, Math.min(maximumForOption, Math.floor(optionQuantity || currentQuantity || 1)))
    : 0;
  const selectedCountBefore = currentQuantities.reduce((sum, quantity) => sum + quantity, 0);
  const selectedCountAfter = selectedCountBefore - currentQuantity + desiredQuantity;
  if (selectionMode === "multi" && maximum !== undefined && selectedCountAfter > maximum) {
    return nextLines;
  }
  const nextOptionQuantities = currentQuantities.map((quantity, index) => (
    index === optionIndex ? desiredQuantity : quantity
  ));
  const selectedOptionIds = optionId
    ? selectionMode === "multi"
      ? desiredQuantity > 0
        ? Array.from(new Set([...(selectedLine.selectedOptionIds || []), optionId]))
        : (selectedLine.selectedOptionIds || []).filter((selectedId) => String(selectedId) !== optionId)
      : [optionId]
    : selectedLine.selectedOptionIds;
  const nextSelectedOptions = selectionMode === "multi"
    ? desiredQuantity > 0
      ? Array.from(new Set([...(selectedLine.selectedOptions || []), value]))
      : (selectedLine.selectedOptions || []).filter((option) => !smartBarMobileOptionLabelMatchesValue({ label: option }, value))
    : [value];
  const stillPending = selectedCountAfter < minimum || (maximum !== undefined && selectedCountAfter > maximum);
  const resolvedLine: SmartBarMobileOrderLine = {
    ...selectedLine,
    status: stillPending ? "pending" : "ready",
    helper: stillPending
      ? `${Math.max(0, minimum - selectedCountAfter)} more required`
      : selectionMode === "multi" ? "Reviewed and ready" : `${value} selected`,
    price: selectedLine.price && selectedLine.price !== "—" ? selectedLine.price : "—",
    details: smartBarMobileChoiceDetails(selectedLine.details, value, selectedLine.options || [], selectionMode, selected),
    options: selectedLine.options || [],
    optionIds: selectedLine.optionIds || [],
    optionQuantities: nextOptionQuantities,
    optionMaxQuantities: selectedLine.optionMaxQuantities || [],
    selectedOptions: nextSelectedOptions,
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
    return smartBarMobileExactSelectionMatch(selectedId, optionId);
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

    return selectedKey !== optionKey;
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
        return smartBarMobileExactSelectionMatch(option, value);
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
          smartBarMobileGroupNeedsReview(group) ||
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
  optionQuantity?: number,
) {
  if (!smartBarMobileCarryoutLineMatchesVisibleLine(carryoutLine, selectedLine, carryoutIndex)) return carryoutLine;

  const matchingQualifierIds = new Set<string>();
  const selectedOptionLabels = selectedLine.options || [];
  let matchedSelectionMode: "single" | "multi" = selectedLine.optionSelectionMode || (selectedLine.status === "options" ? "multi" : "single");
  let matchedGroupKind = "";
  let matchedOption: Record<string, unknown> | undefined;
  const groups = carryoutLine.qualifierGroups || [];
  const activeGroupIndex = smartBarMobileActiveChoiceGroupIndex(carryoutLine, selectedLine, value);

  if (activeGroupIndex < 0) return carryoutLine;
  const activeGroupBefore = groups[activeGroupIndex];
  const activeOptionBefore = (activeGroupBefore.options || []).find((option) => (
    smartBarMobileOptionLabelMatchesValue(option, value)
  ));
  const activeOptionWasSelected = Boolean(
    activeOptionBefore?.selected || activeOptionBefore?.state === "selected"
  );
  const activeQuantityBefore = activeOptionWasSelected
    ? Math.max(1, Math.min(2, Number(activeOptionBefore?.quantity) || 1))
    : 0;
  const activeMaximum = Math.max(
    1,
    Math.min(
      2,
      Number(activeOptionBefore?.maxQuantity || activeGroupBefore.maxQuantityPerOption) || 1,
    ),
  );
  const desiredQuantity = selectedChoice
    ? Math.max(1, Math.min(activeMaximum, Math.floor(optionQuantity || activeQuantityBefore || 1)))
    : 0;
  const groupMaximum = smartBarMobileGroupMaximumSelections(activeGroupBefore);
  const projectedCount = smartBarMobileGroupSelectedCount(activeGroupBefore) -
    activeQuantityBefore +
    desiredQuantity;
  if (groupMaximum !== undefined && projectedCount > groupMaximum) {
    return carryoutLine;
  }

  const qualifierGroups = groups.map((group, groupIndex) => {
    if (groupIndex !== activeGroupIndex) return group;

    const qualifierId = String(group.qualifierId || "");
    if (qualifierId) matchingQualifierIds.add(qualifierId);

    const groupSelectionMode = smartBarMobileGroupSelectionMode(group);
    matchedSelectionMode = groupSelectionMode;
    matchedGroupKind = String(group.kind || "").toLowerCase();

    const nextGroup = {
      ...group,
      ...(groupSelectionMode === "single" ? { selectedLabel: value, selectedValue: value } : {}),
      options: (group.options || []).map((option) => {
        const optionRecord = option as Record<string, unknown>;
        const selectedNow = smartBarMobileOptionLabelMatchesValue(optionRecord, value);
        const selected = groupSelectionMode === "multi"
          ? selectedNow
            ? desiredQuantity > 0
            : Boolean(optionRecord.selected || optionRecord.state === "selected")
          : selectedNow;

        if (selectedNow) matchedOption = optionRecord;

        return {
          ...optionRecord,
          selected,
          state: selected ? "selected" : "available",
          quantity: selected
            ? selectedNow
              ? desiredQuantity
              : Math.max(1, Math.min(2, Number(optionRecord.quantity) || 1))
            : 0,
        };
      }),
    };
    const selectedCount = smartBarMobileGroupSelectedCount(nextGroup);
    const minimum = smartBarMobileGroupMinimumSelections(nextGroup);
    const maximum = smartBarMobileGroupMaximumSelections(nextGroup);
    const missingCount = Math.max(0, minimum - selectedCount);
    const overLimitCount = maximum === undefined ? 0 : Math.max(0, selectedCount - maximum);
    return {
      ...nextGroup,
      selectedCount,
      selectedOptionQuantities: Object.fromEntries(
        (nextGroup.options || [])
          .filter((option) => option.selected || option.state === "selected")
          .map((option) => {
            const optionRecord = option as Record<string, unknown>;
            return [
              String(optionRecord.value || optionRecord.id || optionRecord.label || ""),
              Math.max(1, Math.min(2, Number(optionRecord.quantity) || 1)),
            ];
          })
          .filter(([optionId]) => Boolean(optionId)),
      ),
      missingCount,
      overLimitCount,
      missing: missingCount > 0 || overLimitCount > 0,
    };
  });

  const activeGroupAfter = qualifierGroups[activeGroupIndex];
  const missingQualifiers = (carryoutLine.missingQualifiers || []).filter((missing) => {
    const qualifierId = String(missing.qualifierId || "");
    if (!qualifierId || !matchingQualifierIds.has(qualifierId)) return true;
    return Boolean(activeGroupAfter && smartBarMobileGroupNeedsReview(activeGroupAfter));
  });

  const requiredGroupOptionLabels = qualifierGroups
    .filter((group) => Boolean(group.required && !smartBarMobileGroupIsOptional(group)))
    .flatMap((group) => smartBarMobileGroupOptionLabels(group));
  const selectedRequiredLabels = qualifierGroups
    .filter((group) => Boolean(group.required && !smartBarMobileGroupIsOptional(group)))
    .flatMap((group) => {
      if (smartBarMobileGroupSelectionMode(group) === "multi") {
        return smartBarMobileSelectedOptionLabelsFromGroup(group);
      }
      const explicitlySelected = String(group.selectedLabel || "").replace(/\s+/g, " ").trim();
      if (explicitlySelected) return [explicitlySelected];

      const selectedOption = (group.options || []).find((option) => {
        return Boolean(option.selected || option.state === "selected");
      });
      const selectedOptionRecord = selectedOption as Record<string, unknown> | undefined;
      const selectedLabel = String(selectedOptionRecord?.label || selectedOptionRecord?.value || "").replace(/\s+/g, " ").trim();
      return selectedLabel ? [selectedLabel] : [];
    })
    .filter(Boolean);
  const preservedKnownSelections = (carryoutLine.knownSelections || []).filter((detail) => {
    return !requiredGroupOptionLabels.some((option) => {
      return smartBarMobileExactSelectionMatch(option, detail);
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

  const stillMissingGroup = qualifierGroups.some((group) => Boolean(
    group.missing || smartBarMobileGroupNeedsReview(group)
  ));
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

function smartBarMobileBundleComponentItemSelection(
  component: CarryoutBundleComponent,
  value: string,
  selectedChoice: boolean,
): CarryoutBundleComponent | null {
  const selectionGroup = (component.qualifierGroups || []).find((group) => (
    String(group.kind || "").toLowerCase() === "bundle_component"
  ));
  if (!selectionGroup || !selectedChoice) return null;

  const option = (selectionGroup.options || []).find((candidate) => (
    smartBarMobileOptionLabelMatchesValue(candidate, value)
  ));
  const optionRecord = option as (Record<string, unknown> & { label?: string; value?: string; id?: string }) | undefined;
  const selectedItemId = String(optionRecord?.value || optionRecord?.id || "").trim();
  if (!selectedItemId) return null;

  const allowedItemIds = component.allowedItemIds || [];
  if (allowedItemIds.length && !allowedItemIds.includes(selectedItemId)) return null;

  return {
    ...component,
    id: selectedItemId,
    selectedItemId,
    title: String(optionRecord?.label || value || component.label || selectedItemId).trim(),
    status: "pending",
    knownSelections: [],
    qualifiers: [],
    modifiers: [],
    upgrades: [],
    missingQualifiers: [],
    qualifierGroups: [],
    priceLabel: undefined,
    lineSubtotal: undefined,
    priceSuppressed: true,
  };
}

function smartBarMobileBundleStatus(
  components: CarryoutBundleComponent[],
) {
  const statuses = components.map((component) => smartBarMobileStatusForLine(component));
  if (statuses.includes("unknown")) return "unknown";
  if (statuses.includes("pending")) return "pending";
  if (statuses.includes("options")) return "options";
  return "ready";
}

function smartBarMobileApplyChoiceToBundleParent(
  parent: CarryoutLine,
  selectedLine: SmartBarMobileOrderLine,
  value: string,
  parentIndex: number,
  selectedChoice: boolean,
  optionQuantity?: number,
): CarryoutLine {
  if (
    String(parent.lineItemId || parent.id || "").trim() !==
    String(selectedLine.bundleParentSourceLineItemId || "").trim()
  ) {
    return parent;
  }

  const bundleComponents: CarryoutBundleComponent[] = (parent.bundleComponents || []).map((component) => {
    if (String(component.slotId || "") !== String(selectedLine.bundleSlotId || "")) return component;

    const selectedItem = smartBarMobileBundleComponentItemSelection(component, value, selectedChoice);
    if (selectedItem) return selectedItem;

    return smartBarMobileApplyChoiceToCarryoutLine(
      component,
      selectedLine,
      value,
      parentIndex,
      selectedChoice,
      optionQuantity,
    ) as CarryoutBundleComponent;
  });
  const bundleStatus = smartBarMobileBundleStatus(bundleComponents);
  const unresolvedComponents = bundleComponents.filter((component) => (
    smartBarMobileStatusForLine(component) === "pending"
  ));

  return {
    ...parent,
    status: bundleStatus,
    bundleComponents,
    missingQualifiers: unresolvedComponents.map((component) => ({
      qualifierId: `bundle-component:${component.slotId}`,
      label:
        component.missingQualifiers?.[0]?.label ||
        `Finish ${String(component.label || component.title || "included item").toLowerCase()}`,
      targetId: component.targetId || parent.targetId,
    })),
  };
}

function smartBarMobileNextCurrentStep(order: CarryoutOrder, pendingItems: NonNullable<CarryoutOrder["items"]>) {
  const nextPending = pendingItems[0];
  if (!nextPending) return undefined;

  const activeGroup = (nextPending.qualifierGroups || []).find((group) => group.missing || smartBarMobileGroupNeedsReview(group)) ||
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
  optionQuantity?: number,
): CarryoutOrder | null {
  if (!order) return order;

  const sourceItems = Array.isArray(order.items)
    ? order.items
    : [...(order.completeItems || []), ...(order.pendingItems || [])];
  const items = sourceItems.map((line, index) => (
    selectedLine.bundleParentSourceLineItemId
      ? smartBarMobileApplyChoiceToBundleParent(line, selectedLine, value, index, selected, optionQuantity)
      : smartBarMobileApplyChoiceToCarryoutLine(line, selectedLine, value, index, selected, optionQuantity)
  ));
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
