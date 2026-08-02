import {
  smartBarMobileDurableLineIdentityMatches,
  smartBarMobileInterleaveLinkedUnknownLines,
} from "../src/components/tourbar/smartbar-mobile/burgerrush/smartBarMobileLineIsolation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testDurableIdentitySurvivesReordering() {
  assert(
    smartBarMobileDurableLineIdentityMatches(
      { lineItemId: "line-pizza", sourceLineIndex: 0, sourceBucket: "items" },
      { lineItemId: "line-pizza", sourceLineIndex: 1, sourceBucket: "items" },
    ),
    "The same durable lineItemId must match even when the backend reorders lines.",
  );
}

function testDifferentDurableIdentitiesNeverCollapseAtSamePosition() {
  assert(
    !smartBarMobileDurableLineIdentityMatches(
      { lineItemId: "line-dan-quinn", sourceLineIndex: 0, sourceBucket: "items" },
      { lineItemId: "line-create-your-own", sourceLineIndex: 0, sourceBucket: "items" },
    ),
    "Different lineItemIds must never match merely because an array index matches.",
  );
}

function testPositionIsOnlyLegacyFallback() {
  assert(
    smartBarMobileDurableLineIdentityMatches(
      { sourceLineIndex: 2, sourceBucket: "items" },
      { sourceLineIndex: 2, sourceBucket: "items" },
    ),
    "Source position should remain available only when neither side has a durable ID.",
  );
  assert(
    !smartBarMobileDurableLineIdentityMatches(
      { sourceLineIndex: 2, sourceBucket: "items" },
      { sourceLineIndex: 2, sourceBucket: "cannot_match" },
    ),
    "Legacy position matching must remain bucket-scoped.",
  );
}

function testLinkedGrayRowsStayBesideTheirParent() {
  const matched = [
    { id: "fries-line", title: "French Fries" },
    { id: "calzone-line", title: "Calzone" },
  ];
  const unknown = [
    { line: { id: "large-gray", title: "large" }, parentLineItemId: "fries-line" },
    { line: { id: "mystery-gray", title: "mystery" } },
  ];

  const ordered = smartBarMobileInterleaveLinkedUnknownLines(
    matched,
    unknown,
    (line) => line.id,
  );

  assert(
    ordered.map((line) => line.title).join("|") === "French Fries|large|Calzone|mystery",
    "A linked raw gray fragment must appear immediately after its parent; unlinked gray rows stay at the bottom.",
  );
}

function main() {
  testDurableIdentitySurvivesReordering();
  testDifferentDurableIdentitiesNeverCollapseAtSamePosition();
  testPositionIsOnlyLegacyFallback();
  testLinkedGrayRowsStayBesideTheirParent();
  console.log("Patch 3A frontend line-isolation tests passed (4 tests).");
}

main();
