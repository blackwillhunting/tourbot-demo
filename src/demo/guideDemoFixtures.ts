export type GuideDemoAction = {
  type: "navigate";
  pageId?: string;
  targetId: string;
  pageUrl?: string | null;
  revealMode?: "spotlight";
  targetText?: string;
  reason?: string;
};

export type GuideDemoStepNarrative = {
  targetId: string;
  targetText?: string;
  body: string;
};

export type GuideDemoFixtureReply = {
  title: string;
  body: string;
  answerParts?: any;
  suggestedAction?: any;
  rankedDestinations?: any[];
  stepNarratives?: any[];
  refinementChips?: string[];
  commerceAction?: string;
  displayMode?: string;
  stayPlan?: any;
  navigationOrder?: string[];
  extractedBookingContext?: any;
  visibleContext?: any;
  missingFields?: string[];
  resumePrompt?: string;
};

const naturalBookingContext = {
  checkInDate: "2026-06-12",
  checkOutDate: "2026-06-19",
  nights: 7,
  adults: 1,
  children: 0,
  guests: 1,
};

const naturalBreakfastBookingContext = {
  ...naturalBookingContext,
  breakfastRequested: true,
};

const assistedBookingContext = {
  budgetBand: "Value",
  checkInDate: "2026-07-10",
  checkOutDate: "2026-07-14",
  nights: 4,
  adults: 2,
  children: 1,
  guests: 3,
};

const oceanRoom = {
  targetId: "room-ocean-view-suite",
  title: "Ocean View",
  nightlyRateUsd: 379,
};

const relaxationPackage = {
  targetId: "package-relaxation-weekend",
  title: "Relaxation Weekend Package",
  priceUsd: 95,
  priceUnit: "per_stay",
  priceLabel: "+$95/stay",
  fulfills: ["breakfast", "late_checkout", "spa_credit", "welcome_drinks"],
  summary:
    "Includes spa credit, welcome drinks, breakfast for two, and guaranteed late checkout.",
};

const familyDoubleRoom = {
  targetId: "room-family-double",
  title: "Family Double",
  nightlyRateUsd: 249,
};

const familyComfortPackage = {
  targetId: "package-comfort",
  title: "Family Comfort Bundle",
  priceUsd: 55,
  priceUnit: "per_stay",
  priceLabel: "+$55/stay",
  fulfills: [
    "parking",
    "snack_credit",
    "pool_wristbands",
    "extra_towels",
    "flexible_check_in",
  ],
  summary:
    "Adds parking, snack credit, pool wristbands, extra towels, and flexible check-in support.",
};

function action(
  pageId: string,
  targetId: string,
  targetText: string,
  reason: string,
): GuideDemoAction {
  return {
    type: "navigate",
    pageId,
    targetId,
    pageUrl: null,
    revealMode: "spotlight",
    targetText,
    reason,
  };
}

function visibleStayContext({
  bookingContext,
  room,
  packages = [],
  selectedRoomId,
  suggestedPackageId = null,
  lastPlannerIntent = null,
}: {
  bookingContext: Record<string, unknown>;
  room: Record<string, unknown>;
  packages?: Record<string, unknown>[];
  selectedRoomId: string;
  suggestedPackageId?: string | null;
  lastPlannerIntent?: unknown;
}) {
  return {
    bookingContext,
    selectedRoomId,
    suggestedPackageId,
    savedItems: [],
    pendingSave: null,
    lastPlannerIntent,
    activeStayPlan: {
      type: "visible_cart_stay_plan",
      room,
      packages,
      extras: [],
      navigationOrder: [
        selectedRoomId,
        ...packages
          .map((pkg) => (typeof pkg.targetId === "string" ? pkg.targetId : ""))
          .filter(Boolean),
      ],
      bookingContext,
    },
    carryoutOrder: null,
  };
}

export const hotelNaturalLanguageBookingFixtures: Record<string, GuideDemoFixtureReply> = {
  "travelling june 12th thru june 19th want a room with a good view not too pricey just me staying": {
    title: "Guide response",
    body:
      "For your June 12–19 solo stay, the best value pick with a **good view** is the **Garden Terrace** at **$239/night**.\n\nIt gives you a garden-facing view and a quieter feel, while staying cheaper than the other good-view rooms.\n\nIf you want, I can also show:\n- lower-priced rooms with more limited views\n- better / more premium view options",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: action(
      "rooms",
      "room-garden-terrace",
      "Garden Terrace",
      "Selected the cheapest good-view room that fits the solo June 12–19 stay while keeping price sensitivity in mind.",
    ),
    rankedDestinations: [
      action(
        "rooms",
        "room-garden-terrace",
        "Garden Terrace",
        "Selected the cheapest good-view room that fits the solo June 12–19 stay while keeping price sensitivity in mind.",
      ),
    ],
    stepNarratives: [
      {
        targetId: "room-garden-terrace",
        targetText: "Garden Terrace",
        body:
          "This is the best value fit for the request: a **good garden-facing view** without jumping into the higher ocean-view or villa price tiers.",
      },
    ],
    refinementChips: [
      "Show lower-priced options",
      "Show rooms with better views",
      "This looks good — save it for me",
    ],
    displayMode: "visible_cart",
    visibleContext: visibleStayContext({
      bookingContext: naturalBookingContext,
      selectedRoomId: "room-garden-terrace",
      room: {
        targetId: "room-garden-terrace",
        title: "Garden Terrace",
        nightlyRateUsd: 239,
      },
    }),
    extractedBookingContext: naturalBookingContext,
  },

  "show rooms with better views": {
    title: "Guide response",
    body:
      "Here are the better-view options than your current **Garden Terrace**.\n- **Ocean View** — from **$379/night**\nPremium ocean-facing view with a balcony. This is the closest upgrade if you want a noticeably better view without going straight to the top price tier.\n- **Coastal Villa** — from **$549/night**\nPremium coastal views and more space with a separate living area.\n\nI couldn’t find a better-view option that stays close to your current **$239/night** rate, so **Ocean View** is the closest match.",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: action(
      "rooms",
      "room-ocean-view-suite",
      "Ocean View",
      "Compared the visible better-view room options and highlighted the cheapest qualifying upgrade first.",
    ),
    rankedDestinations: [
      action(
        "rooms",
        "room-ocean-view-suite",
        "Ocean View",
        "Compared the visible better-view room options and highlighted the cheapest qualifying upgrade first.",
      ),
      action(
        "rooms",
        "room-coastal-villa",
        "Coastal Villa",
        "Compared the visible better-view room options and highlighted the premium upgrade second.",
      ),
    ],
    stepNarratives: [
      {
        targetId: "room-ocean-view-suite",
        targetText: "Ocean View",
        body:
          "This is the closest step up from your current Garden Terrace if you want a **better view** without jumping all the way to the highest price tier. It adds a premium ocean-facing view and balcony, while still keeping the upgrade more moderate than the villa.",
      },
      {
        targetId: "room-coastal-villa",
        targetText: "Coastal Villa",
        body:
          "If your priority is the **best view experience** here, this is the more premium option. It gives you upgraded coastal views plus extra space with a separate living area, but it comes at a much bigger price jump.",
      },
    ],
    refinementChips: [
      "Show lower-priced options",
      "Tell me more about this room",
      "This looks good — save it for me",
    ],
    displayMode: "visible_cart",
    visibleContext: visibleStayContext({
      bookingContext: naturalBookingContext,
      selectedRoomId: "room-ocean-view-suite",
      room: oceanRoom,
    }),
    extractedBookingContext: naturalBookingContext,
  },

  "add breakfast": {
    title: "Guide response",
    body:
      "Yes — I can add breakfast to your **Ocean View** stay.\n\nThe compatible option is the **Relaxation Weekend Package** for **+$95/stay**. It includes:\n- breakfast\n- late checkout\n- spa credit\n- welcome drinks\n\nIf you want, I can save this package to your stay.",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: action(
      "rooms",
      "room-ocean-view-suite",
      "Ocean View",
      "Kept the selected Ocean View room and added the compatible breakfast package.",
    ),
    rankedDestinations: [
      action(
        "rooms",
        "room-ocean-view-suite",
        "Ocean View",
        "Kept the selected Ocean View room as the base stay.",
      ),
      action(
        "packages",
        "package-relaxation-weekend",
        "Relaxation Weekend Package",
        "Selected the breakfast-including package compatible with the Ocean View room.",
      ),
    ],
    stepNarratives: [
      {
        targetId: "room-ocean-view-suite",
        targetText: "Ocean View",
        body:
          "Your room stays the **Ocean View** selection — the better-view upgrade from the earlier step.",
      },
      {
        targetId: "package-relaxation-weekend",
        targetText: "Relaxation Weekend Package",
        body:
          "This adds breakfast through the **Relaxation Weekend Package** for **+$95/stay**. It also includes late checkout, spa credit, and welcome drinks, so breakfast is covered without changing the room.",
      },
    ],
    refinementChips: [
      "This looks good — save it for me",
      "Remove package from stay",
      "Prepare booking summary",
    ],
    displayMode: "visible_cart",
    visibleContext: visibleStayContext({
      bookingContext: naturalBreakfastBookingContext,
      selectedRoomId: "room-ocean-view-suite",
      suggestedPackageId: "package-relaxation-weekend",
      room: oceanRoom,
      packages: [relaxationPackage],
    }),
    extractedBookingContext: naturalBreakfastBookingContext,
  },

  "book this stay": {
    title: "Guide response",
    body:
      "Your stay is set up with the Ocean View room and the Relaxation Weekend Package, which already includes breakfast. I can prepare the booking summary next.",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: null,
    rankedDestinations: [],
    stepNarratives: [],
    refinementChips: [
      "Prepare booking summary",
      "Remove package from stay",
      "This looks good — save it for me",
    ],
    commerceAction: "prepare_booking",
    displayMode: "prepare_booking",
    visibleContext: visibleStayContext({
      bookingContext: naturalBreakfastBookingContext,
      selectedRoomId: "room-ocean-view-suite",
      suggestedPackageId: "package-relaxation-weekend",
      room: oceanRoom,
      packages: [relaxationPackage],
    }),
    extractedBookingContext: naturalBreakfastBookingContext,
  },
};

export const assistedCompletionCollectBookingFixture: GuideDemoFixtureReply = {
  title: "Guide response",
  body: "To show rooms that actually fit, I need your stay basics first. Let’s start with your dates.",
  answerParts: { intro: "", closing: "", bullets: [] },
  suggestedAction: null,
  rankedDestinations: [],
  stepNarratives: [],
  refinementChips: [
    "Tell me more about this room",
    "Show lower-priced options",
    "Show better / more premium options",
  ],
  commerceAction: "collect_booking_context",
  displayMode: "collect_booking_context",
  visibleContext: {
    bookingContext: { budgetBand: "Value" },
    selectedRoomId: null,
    suggestedPackageId: null,
    savedItems: [],
    pendingSave: null,
    lastPlannerIntent: null,
    activeStayPlan: null,
    carryoutOrder: null,
    pendingBookingContext: {
      missing: ["dates", "guests"],
      resumePrompt:
        "I'm planning a stay. Show me your cheapest room and your most expensive room.",
    },
  },
  missingFields: ["dates", "guests"],
  resumePrompt:
    "I'm planning a stay. Show me your cheapest room and your most expensive room.",
};

export const hotelAssistedCompletionFixtures: Record<string, GuideDemoFixtureReply> = {
  "i m planning a stay show me your cheapest room and your most expensive room": {
    title: "Guide response",
    body:
      "Your **cheapest room** is the **Extended Studio** from **$219/night**.\n\nYour **most expensive room** is the **Coastal Villa** from **$549/night**.\n\nIf you want, I can also compare what you get for the price difference.",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: action(
      "rooms",
      "room-extended-stay-studio",
      "Extended Studio",
      "Compared room prices and surfaced the lowest and highest priced rooms requested by the user.",
    ),
    rankedDestinations: [
      action(
        "rooms",
        "room-extended-stay-studio",
        "Extended Studio",
        "Compared room prices and surfaced the lowest and highest priced rooms requested by the user.",
      ),
      action(
        "rooms",
        "room-coastal-villa",
        "Coastal Villa",
        "Compared room prices and surfaced the lowest and highest priced rooms requested by the user.",
      ),
    ],
    stepNarratives: [
      {
        targetId: "room-extended-stay-studio",
        targetText: "Extended Studio",
        body:
          "Here’s the **lowest-priced room** in the catalog: the Extended Studio from **$219/night**. It’s a practical studio setup with a kitchenette, laundry access, and storage, so it leans more functional than luxurious.",
      },
      {
        targetId: "room-coastal-villa",
        targetText: "Coastal Villa",
        body:
          "And here’s the **highest-priced room**: the Coastal Villa from **$549/night**. This is the premium end of the range, with separate living space, concierge support, and elevated coastal views.",
      },
    ],
    refinementChips: [
      "Tell me more about this room",
      "Show lower-priced options",
      "Show better / more premium options",
    ],
    displayMode: "visible_cart",
    visibleContext: visibleStayContext({
      bookingContext: assistedBookingContext,
      selectedRoomId: "room-extended-stay-studio",
      room: {
        targetId: "room-extended-stay-studio",
        title: "Extended Studio",
        nightlyRateUsd: 219,
      },
    }),
    extractedBookingContext: assistedBookingContext,
  },

  "i don t want the room to cost more than $350 night what s the cheapest way to include parking": {
    title: "Guide response",
    body:
      "The cheapest way to include parking within your budget is **Family Double** at **$249/night** with the **Family Comfort Bundle** for **+$55/stay**.\n\nFor your **4-night** stay:\n- Room: **$996**\n- Package: **$55**\n- Total: **$1,051** before taxes and fees\n\nI didn’t use the cheaper **Extended Studio** because it only allows **2 guests**, and your stay is for **3**.",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: action(
      "rooms",
      "room-family-double",
      "Family Double",
      "Selected the lowest-priced room under the nightly cap that fits 3 guests, then the cheapest compatible package that includes parking.",
    ),
    rankedDestinations: [
      action(
        "rooms",
        "room-family-double",
        "Family Double",
        "Selected the lowest-priced room under the nightly cap that fits 3 guests, then the cheapest compatible package that includes parking.",
      ),
      action(
        "packages",
        "package-comfort",
        "Family Comfort Bundle",
        "Selected the lowest-priced room under the nightly cap that fits 3 guests, then the cheapest compatible package that includes parking.",
      ),
    ],
    stepNarratives: [
      {
        targetId: "room-family-double",
        targetText: "Family Double",
        body:
          "This is the best fit under your **$350/night** cap for **3 guests**. It starts at **$249/night** and sleeps up to 4, so it keeps the room cost low without missing your guest count.",
      },
      {
        targetId: "package-comfort",
        targetText: "Family Comfort Bundle",
        body:
          "To include **parking** at the lowest total cost with this room, this is the cheapest matching add-on. It adds **parking** for **+$55/stay**, and it works specifically with the Family Double.",
      },
    ],
    refinementChips: [
      "Show lower-priced options",
      "This looks good — save it for me",
      "Prepare booking summary",
    ],
    displayMode: "visible_cart",
    visibleContext: visibleStayContext({
      bookingContext: assistedBookingContext,
      selectedRoomId: "room-family-double",
      suggestedPackageId: "package-comfort",
      room: familyDoubleRoom,
      packages: [familyComfortPackage],
    }),
    extractedBookingContext: assistedBookingContext,
  },

  "reserve this": {
    title: "Guide response",
    body:
      "I can get this ready to book: Family Double with the Family Comfort Bundle. I have your July 10–14 stay details for 2 adults and 1 child, so I can prepare the booking summary next.",
    answerParts: { intro: "", closing: "", bullets: [] },
    suggestedAction: null,
    rankedDestinations: [],
    stepNarratives: [],
    refinementChips: [
      "Prepare booking summary",
      "Remove package from stay",
      "This looks good — save it for me",
    ],
    commerceAction: "prepare_booking",
    displayMode: "prepare_booking",
    visibleContext: visibleStayContext({
      bookingContext: assistedBookingContext,
      selectedRoomId: "room-family-double",
      suggestedPackageId: "package-comfort",
      room: familyDoubleRoom,
      packages: [familyComfortPackage],
    }),
    extractedBookingContext: assistedBookingContext,
  },
};

export function cloneFixture<T>(fixture: T): T {
  return JSON.parse(JSON.stringify(fixture)) as T;
}
