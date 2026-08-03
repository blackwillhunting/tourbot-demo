export type SmartBarMobileSelectionGroupLike = {
  id?: string;
  label?: string;
  active?: boolean;
  options?: string[];
  optionIds?: string[];
  selectedOptions?: string[];
  selectedOptionIds?: string[];
  optionQuantities?: number[];
};

export type SmartBarMobileSelectionLineLike = {
  title?: string;
  demoDisplayTitle?: string;
  details?: string[];
  options?: string[];
  optionIds?: string[];
  selectedOptions?: string[];
  selectedOptionIds?: string[];
  optionQuantities?: number[];
  optionGroups?: SmartBarMobileSelectionGroupLike[];
  isCustomerNote?: boolean;
  originalUnknownText?: string;
  customerNote?: string;
};

export type SmartBarMobileSelectionSummaryGroup = {
  id: string;
  label: string;
  selections: string[];
};

function compact(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function key(value: unknown) {
  return compact(value)
    .toLowerCase()
    .replace(/[×x]/g, "x")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = key(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function quantityLabel(label: string, rawQuantity: unknown) {
  const parsed = Number(rawQuantity);
  const quantity = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
  return quantity > 1 ? `${quantity}× ${label}` : label;
}

function selectedEntries(group: SmartBarMobileSelectionGroupLike) {
  const optionLabels = group.options || [];
  const optionIds = group.optionIds || [];
  const selectedLabelKeys = new Set((group.selectedOptions || []).map(key).filter(Boolean));
  const selectedIdKeys = new Set((group.selectedOptionIds || []).map(key).filter(Boolean));
  const entries: string[] = [];

  optionLabels.forEach((rawLabel, index) => {
    const label = compact(rawLabel);
    if (!label) return;

    const optionId = compact(optionIds[index] || label);
    const isSelected = selectedLabelKeys.has(key(label)) || selectedIdKeys.has(key(optionId));
    if (!isSelected) return;

    entries.push(quantityLabel(label, group.optionQuantities?.[index]));
  });

  (group.selectedOptions || []).forEach((rawLabel) => {
    const label = compact(rawLabel);
    if (!label) return;
    const optionIndex = optionLabels.findIndex((candidate) => key(candidate) === key(label));
    entries.push(quantityLabel(label, optionIndex >= 0 ? group.optionQuantities?.[optionIndex] : 1));
  });

  return unique(entries);
}

function fallbackDetails(line: SmartBarMobileSelectionLineLike) {
  const titleKeys = new Set([
    key(line.title),
    key(line.demoDisplayTitle),
  ].filter(Boolean));

  const values = [
    ...(line.selectedOptions || []).map((label, index) => quantityLabel(compact(label), line.optionQuantities?.[index])),
    ...(line.details || []),
  ];

  return unique(values.map(compact).filter((value) => {
    const normalized = key(value);
    if (!normalized || titleKeys.has(normalized)) return false;
    if (/^(ready|reviewed and ready|choice needed|size needed)$/i.test(value)) return false;
    if (/(?:choice|size|detail|selection|option).*(?:needed|required|missing)|(?:needed|required|missing)/i.test(value)) return false;
    return true;
  }));
}

export function smartBarMobileSelectionSummaryGroups(
  line?: SmartBarMobileSelectionLineLike | null,
): SmartBarMobileSelectionSummaryGroup[] {
  if (!line) return [];

  if (line.isCustomerNote) {
    const originalUnknownText = compact(line.originalUnknownText);
    const customerNote = compact(line.customerNote);
    const selections = [
      originalUnknownText ? `Original request: ${originalUnknownText}` : "",
      customerNote ? `Customer note: ${customerNote}` : "",
    ].filter(Boolean);

    return selections.length
      ? [{ id: "customer-note", label: "", selections }]
      : [];
  }

  const attachedCustomerNote = compact(line.customerNote);
  const attachedCustomerNoteGroup: SmartBarMobileSelectionSummaryGroup[] = attachedCustomerNote
    ? [{ id: "attached-customer-note", label: "Customer note", selections: [attachedCustomerNote] }]
    : [];

  const groups = (line.optionGroups || [])
    .filter((group) => group.active !== false)
    .map((group, index) => ({
      id: compact(group.id) || `selection-group-${index + 1}`,
      label: compact(group.label),
      selections: selectedEntries(group),
    }))
    .filter((group) => group.selections.length > 0);

  if (groups.length) return [...groups, ...attachedCustomerNoteGroup];

  const flatGroup = selectedEntries({
    options: line.options,
    optionIds: line.optionIds,
    selectedOptions: line.selectedOptions,
    selectedOptionIds: line.selectedOptionIds,
    optionQuantities: line.optionQuantities,
  });
  if (flatGroup.length) {
    return [
      { id: "selections", label: "", selections: flatGroup },
      ...attachedCustomerNoteGroup,
    ];
  }

  const details = fallbackDetails(line);
  const detailGroups: SmartBarMobileSelectionSummaryGroup[] = details.length
    ? [{ id: "details", label: "", selections: details }]
    : [];

  return [...detailGroups, ...attachedCustomerNoteGroup];
}

export function smartBarMobileTicketSelectionDetails(
  line?: SmartBarMobileSelectionLineLike | null,
) {
  return smartBarMobileSelectionSummaryGroups(line).flatMap((group) => (
    group.selections.map((selection) => group.label ? `${group.label}: ${selection}` : selection)
  ));
}
