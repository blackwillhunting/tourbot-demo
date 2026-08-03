import type { SmartBarMobileOrderLine } from "./SmartBarMobileShell";

let customerNoteSequence = 0;

function compact(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lineKey(line: SmartBarMobileOrderLine) {
  return String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || "").trim();
}

function durableLineKey(line: SmartBarMobileOrderLine) {
  const sourceLineItemId = compact(line.sourceLineItemId);
  if (sourceLineItemId) return `source:${sourceLineItemId}`;

  const cartLineKey = compact(line.cartLineKey);
  if (cartLineKey) return `cart:${cartLineKey}`;

  if (typeof line.sourceLineIndex === "number") {
    return `position:${compact(line.sourceBucket || "items")}:${line.sourceLineIndex}`;
  }

  const id = compact(line.id);
  return id ? `id:${id}` : "";
}

function sameLine(left: SmartBarMobileOrderLine, right: SmartBarMobileOrderLine) {
  if (left === right) return true;

  const leftSource = compact(left.sourceLineItemId);
  const rightSource = compact(right.sourceLineItemId);
  if (leftSource || rightSource) return Boolean(leftSource && rightSource && leftSource === rightSource);

  const leftCart = compact(left.cartLineKey);
  const rightCart = compact(right.cartLineKey);
  if (leftCart || rightCart) return Boolean(leftCart && rightCart && leftCart === rightCart);

  if (typeof left.sourceLineIndex === "number" || typeof right.sourceLineIndex === "number") {
    return Boolean(
      typeof left.sourceLineIndex === "number" &&
      typeof right.sourceLineIndex === "number" &&
      left.sourceLineIndex === right.sourceLineIndex &&
      compact(left.sourceBucket || "items") === compact(right.sourceBucket || "items")
    );
  }

  return Boolean(lineKey(left) && lineKey(left) === lineKey(right));
}

function appendNote(existing: unknown, incoming: unknown) {
  const current = compact(existing);
  const next = compact(incoming);
  if (!current) return next;
  if (!next) return current;
  if (current.toLowerCase() === next.toLowerCase()) return current;
  return `${current}; ${next}`;
}

export function smartBarMobileIsCustomerNoteLine(line?: SmartBarMobileOrderLine | null) {
  return Boolean(line?.isCustomerNote);
}

export function smartBarMobileUnknownNoteDraft(line?: SmartBarMobileOrderLine | null) {
  if (!line || line.status !== "unknown") return "";
  return compact(line.originalUnknownText || line.title);
}

export function smartBarMobileLineHasAttachedCustomerNote(line?: SmartBarMobileOrderLine | null) {
  return Boolean(line && !line.isCustomerNote && compact(line.customerNote));
}

export function smartBarMobileCreateCustomerNoteLine(
  line: SmartBarMobileOrderLine,
  rawNote: string,
): SmartBarMobileOrderLine {
  const originalUnknownText = compact(line.originalUnknownText || line.title) || "Unresolved request";
  const customerNote = compact(rawNote);

  customerNoteSequence += 1;
  const originalLineKey = lineKey(line) || "unresolved-request";
  const noteLineKey = `customer-note::${originalLineKey}::${Date.now().toString(36)}-${customerNoteSequence}`;

  return {
    ...line,
    id: noteLineKey,
    cartLineKey: noteLineKey,
    sourceLineItemId: noteLineKey,
    title: "Customer note",
    status: "ready",
    helper: "Saved for restaurant",
    price: "",
    details: [
      `Original request: ${originalUnknownText}`,
      `Customer note: ${customerNote}`,
    ],
    isCustomerNote: true,
    originalUnknownText,
    customerNote,
    sourceBucket: "customer_note",
    sourceLineIndex: undefined,
    sourceItemId: undefined,
    grayReason: undefined,
    displayReason: undefined,
    retryPrompt: undefined,
    candidateResolution: undefined,
    optionGroups: undefined,
    activeOptionGroupId: undefined,
    options: undefined,
    optionIds: undefined,
    optionChildGroupIds: undefined,
    selectedOptions: undefined,
    selectedOptionIds: undefined,
    optionQuantities: undefined,
    optionMaxQuantities: undefined,
    optionSelectionMode: undefined,
    optionGroupLabel: undefined,
    optionMinSelections: undefined,
    optionMaxSelections: undefined,
    selectionRules: undefined,
    priceSuppressed: true,
  };
}

function replaceUnknownWithNote(
  lines: SmartBarMobileOrderLine[],
  targetKey: string,
  replacement: SmartBarMobileOrderLine,
): { lines: SmartBarMobileOrderLine[]; replaced: boolean } {
  let replaced = false;

  const nextLines = lines.map((line) => {
    if (!replaced && lineKey(line) === targetKey) {
      replaced = true;
      return replacement;
    }

    if (!line.bundleComponents?.length) return line;

    const nested = replaceUnknownWithNote(line.bundleComponents, targetKey, replacement);
    if (!nested.replaced) return line;

    replaced = true;
    return { ...line, bundleComponents: nested.lines };
  });

  return { lines: nextLines, replaced };
}

export function smartBarMobileSaveUnknownAsNoteInLines(
  lines: SmartBarMobileOrderLine[],
  unknownLine: SmartBarMobileOrderLine,
  note: string,
) {
  const customerNote = compact(note);
  if (!customerNote) return lines;

  const targetKey = lineKey(unknownLine);
  const replacement = smartBarMobileCreateCustomerNoteLine(unknownLine, customerNote);
  const result = replaceUnknownWithNote(lines, targetKey, replacement);
  return result.replaced ? result.lines : [...result.lines, replacement];
}

function attachNoteAndRemoveUnknown(
  lines: SmartBarMobileOrderLine[],
  unknownLine: SmartBarMobileOrderLine,
  targetLine: SmartBarMobileOrderLine,
  customerNote: string,
): { lines: SmartBarMobileOrderLine[]; removed: boolean; attached: boolean } {
  let removed = false;
  let attached = false;
  const nextLines: SmartBarMobileOrderLine[] = [];

  lines.forEach((line) => {
    if (!removed && sameLine(line, unknownLine)) {
      removed = true;
      return;
    }

    const nested = line.bundleComponents?.length
      ? attachNoteAndRemoveUnknown(line.bundleComponents, unknownLine, targetLine, customerNote)
      : null;

    let nextLine = nested?.lines !== line.bundleComponents
      ? { ...line, bundleComponents: nested?.lines }
      : line;

    if (nested?.removed) removed = true;
    if (nested?.attached) attached = true;

    if (!attached && sameLine(nextLine, targetLine)) {
      attached = true;
      nextLine = {
        ...nextLine,
        customerNote: appendNote(nextLine.customerNote, customerNote),
      };
    }

    nextLines.push(nextLine);
  });

  return { lines: nextLines, removed, attached };
}

export function smartBarMobileAttachUnknownNoteToLineInLines(
  lines: SmartBarMobileOrderLine[],
  unknownLine: SmartBarMobileOrderLine,
  targetLine: SmartBarMobileOrderLine,
  note: string,
) {
  const customerNote = compact(note);
  if (!customerNote || sameLine(unknownLine, targetLine)) return lines;

  const result = attachNoteAndRemoveUnknown(lines, unknownLine, targetLine, customerNote);
  return result.removed && result.attached ? result.lines : lines;
}

function collectAttachedNotes(
  lines: SmartBarMobileOrderLine[],
  notesByKey: Map<string, string>,
  duplicateKeys: Set<string>,
) {
  lines.forEach((line) => {
    if (!line.isCustomerNote && compact(line.customerNote)) {
      const key = durableLineKey(line);
      if (key) {
        if (notesByKey.has(key)) duplicateKeys.add(key);
        else notesByKey.set(key, compact(line.customerNote));
      }
    }

    if (line.bundleComponents?.length) {
      collectAttachedNotes(line.bundleComponents, notesByKey, duplicateKeys);
    }
  });
}

function preserveAttachedNotesInTree(
  lines: SmartBarMobileOrderLine[],
  notesByKey: Map<string, string>,
  duplicateKeys: Set<string>,
): SmartBarMobileOrderLine[] {
  return lines.map((line) => {
    const nested = line.bundleComponents?.length
      ? preserveAttachedNotesInTree(line.bundleComponents, notesByKey, duplicateKeys)
      : line.bundleComponents;

    const key = durableLineKey(line);
    const preservedNote = key && !duplicateKeys.has(key) ? notesByKey.get(key) : "";
    const customerNote = appendNote(line.customerNote, preservedNote);

    if (nested === line.bundleComponents && customerNote === compact(line.customerNote)) return line;

    return {
      ...line,
      ...(nested !== line.bundleComponents ? { bundleComponents: nested } : {}),
      ...(customerNote ? { customerNote } : {}),
    };
  });
}

export function smartBarMobilePreserveAttachedCustomerNotes(
  nextLines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
) {
  const notesByKey = new Map<string, string>();
  const duplicateKeys = new Set<string>();
  collectAttachedNotes(previousLines, notesByKey, duplicateKeys);
  if (!notesByKey.size) return nextLines;
  return preserveAttachedNotesInTree(nextLines, notesByKey, duplicateKeys);
}

export function smartBarMobilePreserveCustomerNoteLines(
  nextLines: SmartBarMobileOrderLine[],
  previousLines: SmartBarMobileOrderLine[],
) {
  const existingKeys = new Set(nextLines.map(lineKey).filter(Boolean));
  const preserved = previousLines.filter((line) => (
    smartBarMobileIsCustomerNoteLine(line) && !existingKeys.has(lineKey(line))
  ));

  return preserved.length ? [...nextLines, ...preserved] : nextLines;
}

export function smartBarMobileWithoutCustomerNoteLines(lines: SmartBarMobileOrderLine[]) {
  return lines.filter((line) => !smartBarMobileIsCustomerNoteLine(line));
}
