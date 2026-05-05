export type GuideMode = "discovery" | "commerce";

export type GuidePackIds = {
  knowledge: string;
  deals?: string;
  liveLookup?: string;
};

export type GuideFeatureFlags = {
  navigation: boolean;
  refinementChips: boolean;
  bookingActions: boolean;
  commerceRanking: boolean;
  liveAvailabilityLookup: boolean;
};

export type CommerceGuideConfig = {
  mode: GuideMode;
  id: string;
  label: string;
  description: string;
  packIds: GuidePackIds;
  features: GuideFeatureFlags;
  maxGuideSteps: number;
  defaultPageId: string;
  navLabels: string[];
  primaryBookingAnchorId: string;
  requiredBookingFields: string[];
  responseRules: {
    alwaysOrient: boolean;
    navigateWhenMeaningful: boolean;
    keepRefinementAvailable: boolean;
    allowPartialBookingPreload: boolean;
  };
};

export const commerceGuideConfig: CommerceGuideConfig = {
  mode: "commerce",
  id: "staypilot-guided-commerce",
  label: "Guided Commerce",
  description:
    "Guided hotel-booking demo using a stable knowledge pack, dynamic deals pack, and static live lookup layer.",
  packIds: {
    knowledge: "staypilot-commerce-knowledge",
    deals: "staypilot-commerce-deals",
    liveLookup: "staypilot-commerce-live-lookup",
  },
  features: {
    navigation: true,
    refinementChips: true,
    bookingActions: true,
    commerceRanking: true,
    liveAvailabilityLookup: true,
  },
  maxGuideSteps: 5,
  defaultPageId: "home",
  navLabels: ["Home", "Rooms", "Packages", "Amenities", "Booking"],
  primaryBookingAnchorId: "booking-panel",
  requiredBookingFields: ["room", "dates", "guests", "guestName", "email", "paymentMethod"],
  responseRules: {
    alwaysOrient: true,
    navigateWhenMeaningful: true,
    keepRefinementAvailable: true,
    allowPartialBookingPreload: true,
  },
};

export default commerceGuideConfig;
