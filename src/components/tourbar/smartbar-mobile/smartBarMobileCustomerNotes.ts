import type { SmartBarMobileOrderLine } from "./SmartBarMobileShell";

let customerNoteSequence = 0;

function compact(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lineKey(line: SmartBarMobileOrderLine) {
  return String(line.cartLineKey || line.id || line.sourceLineItemId || line.title || "").trim();
}

export function smartBarMobileIsCustomerNoteLine(line?: SmartBarMobileOrderLine | null) {
  return Boolean(line?.isCustomerNote);
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
