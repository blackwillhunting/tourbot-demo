export type SmartBarMobileDirectCartChoiceEvent = {
  type: "select_option" | "deselect_option";
  /** Exact durable cart-line occurrence identity. */
  lineId: string;
  cartLineKey?: string;
  sourceLineItemId?: string;
  sourceItemId?: string;
  lineTitle?: string;
  /** Exact backend-owned group and option identities. */
  groupId: string;
  optionId: string;
  optionLabel: string;
  /** Final requested portion count. Zero is used for deselection. */
  quantity: number;
};

type DirectCartOptionLike = {
  id?: unknown;
  optionId?: unknown;
  value?: unknown;
  label?: unknown;
  title?: unknown;
  name?: unknown;
};

type DirectCartOptionGroupLike = {
  id?: unknown;
  groupId?: unknown;
  options?: unknown;
  optionIds?: unknown;
};

type DirectCartLineLike = {
  id?: unknown;
  cartLineKey?: unknown;
  sourceLineItemId?: unknown;
  sourceItemId?: unknown;
  title?: unknown;
  activeOptionGroupId?: unknown;
  optionGroupId?: unknown;
  options?: unknown;
  optionIds?: unknown;
  optionGroups?: unknown;
  /** Raw backend-owned groups are retained on the direct cart object. */
  groups?: unknown;
};

type DirectCartChoiceMetaLike = {
  selected?: unknown;
  optionGroupId?: unknown;
  quantity?: unknown;
};

function compact(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function key(value: unknown) {
  return compact(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function optionGroups(line: DirectCartLineLike): DirectCartOptionGroupLike[] {
  return values(line.optionGroups).filter((value): value is DirectCartOptionGroupLike => (
    Boolean(value) && typeof value === "object"
  ));
}

function groupIdentity(group: DirectCartOptionGroupLike) {
  return compact(group.id || group.groupId);
}

function backendGroups(line: DirectCartLineLike): DirectCartOptionGroupLike[] {
  return values(line.groups).filter((value): value is DirectCartOptionGroupLike => (
    Boolean(value) && typeof value === "object"
  ));
}

function backendOption(value: unknown): DirectCartOptionLike | null {
  return Boolean(value) && typeof value === "object" ? value as DirectCartOptionLike : null;
}

function backendOptionIdentity(option: DirectCartOptionLike) {
  return compact(option.optionId || option.id || option.value);
}

function backendOptionLabel(option: DirectCartOptionLike) {
  return compact(option.label || option.title || option.name || backendOptionIdentity(option));
}

function exactBackendGroupOption(line: DirectCartLineLike, requestedGroupId: string, value: string) {
  const rawValue = compact(value);
  const valueKey = key(rawValue);
  const allGroups = backendGroups(line);
  const exactGroups = allGroups.filter((group) => groupIdentity(group) === requestedGroupId);
  const groupsToSearch = exactGroups.length ? exactGroups : allGroups;
  const matches: Array<{ groupId: string; optionId: string; optionLabel: string }> = [];

  groupsToSearch.forEach((group) => {
    const groupId = groupIdentity(group);
    if (!groupId) return;
    values(group.options).forEach((rawOption) => {
      const option = backendOption(rawOption);
      if (!option) return;
      const optionId = backendOptionIdentity(option);
      const optionLabel = backendOptionLabel(option);
      if (!optionId) return;
      if (optionId === rawValue || (valueKey && key(optionLabel) === valueKey)) {
        matches.push({ groupId, optionId, optionLabel: optionLabel || rawValue });
      }
    });
  });

  return matches.length === 1 ? matches[0] : null;
}

function alignedChoiceData(line: DirectCartLineLike, groupId: string) {
  const group = optionGroups(line).find((candidate) => groupIdentity(candidate) === groupId);
  if (group) {
    return {
      labels: values(group.options).map(compact),
      ids: values(group.optionIds).map(compact),
    };
  }

  const activeGroupId = compact(line.activeOptionGroupId || line.optionGroupId);
  if (activeGroupId && activeGroupId !== groupId) {
    return { labels: [] as string[], ids: [] as string[] };
  }

  return {
    labels: values(line.options).map(compact),
    ids: values(line.optionIds).map(compact),
  };
}

function exactOption(line: DirectCartLineLike, requestedGroupId: string, value: string) {
  const backendMatch = exactBackendGroupOption(line, requestedGroupId, value);
  if (backendMatch) return backendMatch;

  const { labels, ids } = alignedChoiceData(line, requestedGroupId);
  const rawValue = compact(value);
  const valueKey = key(rawValue);

  const idIndex = ids.findIndex((candidate) => Boolean(candidate) && candidate === rawValue);
  if (idIndex >= 0) {
    return {
      groupId: requestedGroupId,
      optionId: ids[idIndex],
      optionLabel: labels[idIndex] || rawValue,
    };
  }

  const labelIndex = labels.findIndex((candidate) => Boolean(candidate) && key(candidate) === valueKey);
  if (labelIndex < 0) return null;

  const optionId = compact(ids[labelIndex]);
  if (!optionId) return null;

  return {
    groupId: requestedGroupId,
    optionId,
    optionLabel: labels[labelIndex] || rawValue,
  };
}


/**
 * Converts one visible option click into an exact backend event. This function
 * deliberately returns null rather than falling back to title-, group-label-,
 * or option-label-only mutation when durable IDs are unavailable.
 */
export function smartBarMobileDirectCartChoiceEventFromLine(
  line: DirectCartLineLike,
  value: string,
  meta: DirectCartChoiceMetaLike,
): SmartBarMobileDirectCartChoiceEvent | null {
  const lineId = compact(line.sourceLineItemId || line.cartLineKey || line.id);
  const groupId = compact(meta.optionGroupId || line.activeOptionGroupId || line.optionGroupId);
  if (!lineId || !groupId) return null;

  const option = exactOption(line, groupId, value);
  if (!option) return null;

  const selected = meta.selected !== false;
  const parsedQuantity = Number(meta.quantity);
  const quantity = selected
    ? Math.max(1, Number.isFinite(parsedQuantity) ? Math.floor(parsedQuantity) : 1)
    : 0;

  return {
    type: selected ? "select_option" : "deselect_option",
    lineId,
    cartLineKey: compact(line.cartLineKey) || undefined,
    sourceLineItemId: compact(line.sourceLineItemId) || undefined,
    sourceItemId: compact(line.sourceItemId) || undefined,
    lineTitle: compact(line.title) || undefined,
    groupId: option.groupId,
    optionId: option.optionId,
    optionLabel: option.optionLabel,
    quantity,
  };
}
