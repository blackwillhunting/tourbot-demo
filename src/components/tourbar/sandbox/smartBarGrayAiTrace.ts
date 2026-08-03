import type { CarryoutOrder } from "../TourBarOrdering";
import type {
  SmartBarMobileAiTrace,
  SmartBarMobileOrderLine,
} from "../smartbar-mobile/SmartBarMobileShell";

export function smartBarPlaygroundGrayAiTrace(value: unknown): SmartBarMobileAiTrace | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const stringList = (candidate: unknown) => (
    Array.isArray(candidate)
      ? candidate.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
      : []
  );
  const trace: SmartBarMobileAiTrace = {
    prescreenReturnedValues: stringList(record.prescreenReturnedValues),
    prescreenAcceptedItemIds: stringList(record.prescreenAcceptedItemIds),
    prescreenRejectedValues: stringList(record.prescreenRejectedValues),
    prescreenUnmatchedCount: Number.isFinite(Number(record.prescreenUnmatchedCount))
      ? Math.max(0, Number(record.prescreenUnmatchedCount))
      : 0,
    prescreenUnmatchedReasons: stringList(record.prescreenUnmatchedReasons),
    cartBuilderScope: String(record.cartBuilderScope || "").trim(),
    cartBuilderReceivedItemIds: stringList(record.cartBuilderReceivedItemIds),
    cartBuilderReturnedValues: stringList(record.cartBuilderReturnedValues),
    cartBuilderProposedValues: stringList(
      record.cartBuilderProposedValues || record.cartBuilderReturnedValues,
    ),
    cartBuilderRejectedValues: stringList(record.cartBuilderRejectedValues),
    cartBuilderCannotMatchReasons: stringList(record.cartBuilderCannotMatchReasons),
    cartBuilderParserResult: String(record.cartBuilderParserResult || "").trim(),
    fallbackReason: String(record.fallbackReason || "").trim(),
    finalResult: String(record.finalResult || "").trim(),
    traceId: String(record.traceId || "").trim(),
  };
  return trace.traceId || trace.prescreenReturnedValues?.length || trace.cartBuilderReturnedValues?.length
    ? trace
    : undefined;
}

export function smartBarPlaygroundApplyGrayAiTraces(
  lines: SmartBarMobileOrderLine[],
  order: CarryoutOrder | null,
) {
  const cannotMatchItems = order?.cannotMatchItems || [];
  return lines.map((line) => {
    if (line.sourceBucket !== "cannot_match" || line.sourceLineIndex === undefined) return line;
    const source = cannotMatchItems[line.sourceLineIndex] as (Record<string, unknown> | undefined);
    const aiTrace = smartBarPlaygroundGrayAiTrace(source?.aiTrace);
    return aiTrace ? { ...line, aiTrace } : line;
  });
}
