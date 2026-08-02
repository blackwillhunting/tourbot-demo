export type SmartBarMobileLineIdentity = {
  lineItemId?: unknown;
  sourceLineIndex?: unknown;
  sourceBucket?: unknown;
  itemId?: unknown;
  title?: unknown;
};

function compact(value: unknown) {
  return String(value || "").trim();
}

function comparable(value: unknown) {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Match one cart-line occurrence without allowing a stale array position to
 * override a durable backend lineItemId.
 */
export function smartBarMobileDurableLineIdentityMatches(
  left: SmartBarMobileLineIdentity,
  right: SmartBarMobileLineIdentity,
) {
  const leftLineItemId = compact(left.lineItemId);
  const rightLineItemId = compact(right.lineItemId);
  if (leftLineItemId || rightLineItemId) {
    return Boolean(
      leftLineItemId &&
      rightLineItemId &&
      leftLineItemId === rightLineItemId
    );
  }

  const leftHasSourceIndex = typeof left.sourceLineIndex === "number";
  const rightHasSourceIndex = typeof right.sourceLineIndex === "number";
  if (leftHasSourceIndex || rightHasSourceIndex) {
    return Boolean(
      leftHasSourceIndex &&
      rightHasSourceIndex &&
      left.sourceLineIndex === right.sourceLineIndex &&
      compact(left.sourceBucket || "items") === compact(right.sourceBucket || "items")
    );
  }

  const leftItemId = comparable(left.itemId);
  const rightItemId = comparable(right.itemId);
  if (leftItemId || rightItemId) {
    return Boolean(leftItemId && rightItemId && leftItemId === rightItemId);
  }

  const leftTitle = comparable(left.title);
  const rightTitle = comparable(right.title);
  return Boolean(leftTitle && rightTitle && leftTitle === rightTitle);
}

export type SmartBarMobileLinkedUnknownEntry<T> = {
  line: T;
  parentLineItemId?: string;
};

/**
 * Keep item-scoped gray correction rows immediately after their parent item.
 * Unlinked gray rows retain the existing global-bottom behavior.
 */
export function smartBarMobileInterleaveLinkedUnknownLines<T>(
  matchedLines: T[],
  unknownEntries: SmartBarMobileLinkedUnknownEntry<T>[],
  getMatchedLineItemId: (line: T) => string,
) {
  const linkedByParent = new Map<string, T[]>();
  const unlinked: T[] = [];

  unknownEntries.forEach((entry) => {
    const parentLineItemId = compact(entry.parentLineItemId);
    if (!parentLineItemId) {
      unlinked.push(entry.line);
      return;
    }

    const current = linkedByParent.get(parentLineItemId) || [];
    current.push(entry.line);
    linkedByParent.set(parentLineItemId, current);
  });

  const ordered: T[] = [];
  const consumedParents = new Set<string>();
  matchedLines.forEach((line) => {
    ordered.push(line);
    const lineItemId = compact(getMatchedLineItemId(line));
    if (!lineItemId) return;
    const linked = linkedByParent.get(lineItemId);
    if (!linked?.length) return;
    ordered.push(...linked);
    consumedParents.add(lineItemId);
  });

  linkedByParent.forEach((lines, parentLineItemId) => {
    if (!consumedParents.has(parentLineItemId)) unlinked.push(...lines);
  });

  return [...ordered, ...unlinked];
}
