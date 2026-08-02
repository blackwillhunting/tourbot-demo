import { smartBarMobileDirectCartChoiceEventFromLine } from "../src/components/tourbar/smartbar-mobile/burgerrush/smartBarMobileDirectCartEvents";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function line(id: string) {
  return {
    id,
    cartLineKey: id,
    sourceLineItemId: id,
    sourceItemId: "shared-menu-item",
    title: "Same visible title",
    activeOptionGroupId: "sauce-group",
    options: ["Pizza Sauce", "White Sauce"],
    optionIds: ["pizza-sauce", "white-sauce"],
  };
}

function testExactLineGroupAndOptionIds() {
  const event = smartBarMobileDirectCartChoiceEventFromLine(
    line("line-create-your-own-2"),
    "Pizza Sauce",
    { selected: true, optionGroupId: "sauce-group", quantity: 1 },
  );

  assert(event, "A fully identified option click must produce a direct-cart event.");
  assert(event.lineId === "line-create-your-own-2", "The event must target the exact cart-line occurrence.");
  assert(event.groupId === "sauce-group", "The event must preserve the exact group ID.");
  assert(event.optionId === "pizza-sauce", "The event must preserve the exact option ID.");
  assert(event.type === "select_option", "A selected click must become select_option.");
}

function testDuplicateTitlesRemainDistinct() {
  const first = smartBarMobileDirectCartChoiceEventFromLine(
    line("line-dan-quinn-1"),
    "White Sauce",
    { selected: true, optionGroupId: "sauce-group" },
  );
  const second = smartBarMobileDirectCartChoiceEventFromLine(
    line("line-dan-quinn-2"),
    "White Sauce",
    { selected: true, optionGroupId: "sauce-group" },
  );

  assert(first && second, "Both duplicate-title lines must produce events.");
  assert(first.lineId !== second.lineId, "Duplicate titles must remain isolated by durable line ID.");
}

function testDeselectAndQuantity() {
  const deselect = smartBarMobileDirectCartChoiceEventFromLine(
    line("line-pizza"),
    "pizza-sauce",
    { selected: false, optionGroupId: "sauce-group", quantity: 0 },
  );
  assert(deselect, "An exact option ID must be accepted as the clicked value.");
  assert(deselect.type === "deselect_option" && deselect.quantity === 0, "Deselection must be explicit and zero-quantity.");

  const doubled = smartBarMobileDirectCartChoiceEventFromLine(
    line("line-pizza"),
    "Pizza Sauce",
    { selected: true, optionGroupId: "sauce-group", quantity: 2 },
  );
  assert(doubled?.quantity === 2, "The final requested option quantity must be preserved.");
}

function testNoUnsafeFallbackWithoutExactIds() {
  const missingOptionId = smartBarMobileDirectCartChoiceEventFromLine(
    {
      id: "line-1",
      activeOptionGroupId: "sauce-group",
      options: ["Pizza Sauce"],
      optionIds: [],
    },
    "Pizza Sauce",
    { selected: true, optionGroupId: "sauce-group" },
  );
  assert(missingOptionId === null, "A label-only option must not be converted into a mutation event.");

  const missingLineId = smartBarMobileDirectCartChoiceEventFromLine(
    {
      activeOptionGroupId: "sauce-group",
      options: ["Pizza Sauce"],
      optionIds: ["pizza-sauce"],
    },
    "Pizza Sauce",
    { selected: true, optionGroupId: "sauce-group" },
  );
  assert(missingLineId === null, "A click without durable line identity must not mutate by title or position.");
}


function testRawBackendGroupsRecoverExactGroupId() {
  const event = smartBarMobileDirectCartChoiceEventFromLine(
    {
      id: "line-cyo",
      sourceLineItemId: "line-cyo",
      activeOptionGroupId: "legacy-options",
      options: ["Hand Tossed", "Pizza Sauce"],
      optionIds: ["hand-tossed", "pizza-sauce"],
      groups: [
        {
          groupId: "crust-group",
          options: [{ optionId: "hand-tossed", label: "Hand Tossed" }],
        },
        {
          groupId: "sauce-group",
          options: [{ optionId: "pizza-sauce", label: "Pizza Sauce" }],
        },
      ],
    },
    "Pizza Sauce",
    { selected: true, optionGroupId: "legacy-options" },
  );

  assert(event, "Raw backend groups must be usable to recover exact IDs.");
  assert(event.groupId === "sauce-group", "A legacy visible group must resolve to the exact backend group.");
  assert(event.optionId === "pizza-sauce", "The exact backend option ID must be retained.");
}

function testAmbiguousRawBackendOptionIsRejected() {
  const event = smartBarMobileDirectCartChoiceEventFromLine(
    {
      id: "line-ambiguous",
      sourceLineItemId: "line-ambiguous",
      activeOptionGroupId: "legacy-options",
      groups: [
        { groupId: "sauce-1", options: [{ optionId: "pizza-sauce", label: "Pizza Sauce" }] },
        { groupId: "sauce-2", options: [{ optionId: "pizza-sauce", label: "Pizza Sauce" }] },
      ],
    },
    "Pizza Sauce",
    { selected: true, optionGroupId: "legacy-options" },
  );

  assert(event === null, "The helper must reject a value that maps to more than one backend group.");
}

function main() {
  testExactLineGroupAndOptionIds();
  testDuplicateTitlesRemainDistinct();
  testDeselectAndQuantity();
  testNoUnsafeFallbackWithoutExactIds();
  testRawBackendGroupsRecoverExactGroupId();
  testAmbiguousRawBackendOptionIsRejected();
  console.log("Patch 3A-R1 frontend direct-event tests passed (6 tests).");
}

main();
