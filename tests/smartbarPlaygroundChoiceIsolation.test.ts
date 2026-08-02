import {
  smartBarPlaygroundApplyPricingOnly,
  smartBarPlaygroundShouldRequestChoiceRefresh,
} from "../src/components/tourbar/sandbox/smartBarPlaygroundChoiceIsolation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function line(
  id: string,
  title: string,
  status: string,
  selectedOptions: string[],
  price = "",
) {
  return {
    id,
    cartLineKey: id,
    sourceLineItemId: id,
    sourceItemId: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    status,
    selectedOptions,
    selectedOptionIds: selectedOptions.map((value) => value.toLowerCase().replace(/\s+/g, "-")),
    details: [title, ...selectedOptions],
    price,
  };
}

function testRestaurantCalculatedSkipsRefresh() {
  assert(
    smartBarPlaygroundShouldRequestChoiceRefresh("restaurant-calculated") === false,
    "Restaurant-calculated choice clicks must not request a downstream cart refresh.",
  );
  assert(
    smartBarPlaygroundShouldRequestChoiceRefresh("exact") === true,
    "Legacy exact-pricing mode may still request a pricing refresh.",
  );
}

function testCorruptRefreshCannotCompleteAnotherLine() {
  const current = [
    line("line-dan", "The Dan Quinn", "pending", []),
    line("line-salad", "Greek Salad", "ready", ["Garlic Bread"]),
  ];
  const corruptRefresh = [
    line("line-dan", "The Dan Quinn", "ready", ["Pizza Sauce"]),
    line("line-salad", "Greek Salad", "ready", ["Garlic Bread"]),
  ];

  const result = smartBarPlaygroundApplyPricingOnly(current, corruptRefresh);

  assert(result[0].status === "pending", "The untouched Dan Quinn line must remain pending.");
  assert(result[0].selectedOptions.length === 0, "The untouched line must not inherit Pizza Sauce.");
  assert(result[1].selectedOptions[0] === "Garlic Bread", "The clicked salad line must keep its local choice.");
}

function testOnlyPriceMayChange() {
  const current = [
    line("line-1", "Pizza", "ready", ["White Sauce"], "$12.00"),
  ];
  const refresh = [
    {
      ...line("line-1", "Pizza", "pending", ["Pizza Sauce"], "$13.25"),
      helper: "Choose sauce",
    },
  ];

  const result = smartBarPlaygroundApplyPricingOnly(current, refresh);

  assert(result[0].price === "$13.25", "The matching line price should be accepted.");
  assert(result[0].status === "ready", "Refresh status must not replace local status.");
  assert(result[0].selectedOptions[0] === "White Sauce", "Refresh selection must not replace local selection.");
  assert(result[0].details.includes("White Sauce"), "Refresh details must not replace local details.");
}

function testDuplicateItemsRemainOccurrenceScoped() {
  const current = [
    line("line-dan-1", "The Dan Quinn", "pending", [], "$10.00"),
    line("line-dan-2", "The Dan Quinn", "ready", ["White Sauce"], "$10.00"),
  ];
  const refresh = [
    line("line-dan-1", "The Dan Quinn", "ready", ["Pizza Sauce"], "$10.50"),
    line("line-dan-2", "The Dan Quinn", "ready", ["BBQ Sauce"], "$11.00"),
  ];

  const result = smartBarPlaygroundApplyPricingOnly(current, refresh);

  assert(result[0].status === "pending", "First duplicate line must remain pending.");
  assert(result[0].selectedOptions.length === 0, "First duplicate line must remain unselected.");
  assert(result[0].price === "$10.50", "First occurrence may receive only its own price.");
  assert(result[1].selectedOptions[0] === "White Sauce", "Second occurrence must retain its local choice.");
  assert(result[1].price === "$11.00", "Second occurrence may receive only its own price.");
}

function testAmbiguousOrMissingIdentityPreservesLine() {
  const current = [
    line("line-1", "Pizza", "ready", ["White Sauce"], "$12.00"),
    {
      title: "Customer note",
      status: "note",
      selectedOptions: [],
      selectedOptionIds: [],
      details: ["Ring the bell"],
      price: "",
    },
  ];
  const refresh = [
    line("line-1", "Pizza", "ready", ["Pizza Sauce"], "$13.00"),
    line("line-1", "Pizza", "ready", ["BBQ Sauce"], "$14.00"),
  ];

  const result = smartBarPlaygroundApplyPricingOnly(current, refresh);

  assert(result[0].price === "$12.00", "Ambiguous duplicate refresh identities must be rejected.");
  assert(result[0].selectedOptions[0] === "White Sauce", "Ambiguous refresh must preserve local selection.");
  assert(result[1] === current[1], "A line without durable identity must be preserved unchanged.");
}

function main() {
  testRestaurantCalculatedSkipsRefresh();
  testCorruptRefreshCannotCompleteAnotherLine();
  testOnlyPriceMayChange();
  testDuplicateItemsRemainOccurrenceScoped();
  testAmbiguousOrMissingIdentityPreservesLine();
  console.log("Patch 3A-R2 live Playground choice-isolation tests passed (5 tests).");
}

main();
