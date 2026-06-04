import { useRef, useState, type ReactNode } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileSubmitResult,
} from "../SmartBarMobileShell";
import { commerceGuideConfig } from "../../../../commerce/commerceGuideConfig";
import { smartbarFocusTarget } from "../../smartbarFocusController";
import {
  buildTourBarBookingShellResult,
  isBookingNextStepLabel,
  isExplicitTourBarBookingRequest,
  priceLabelFromTourBarCombination,
  tourBarCombinationFromRaw,
  type TourBarBookingPageId,
  type TourBarBookingPageTarget,
  type TourBarBookingRawResponse,
  type TourBarBookingRequestContext,
  type TourBarBookingSiteAdapter,
  type TourBarBookingTurnContext,
} from "../../TourBarBooking";
import type { TourBarShellResult } from "../../TourBarShell";
import {
  extractTourBarDatesFromPrompt,
  extractTourBarGuestsFromPrompt,
  normalizeTourBarBookingContext,
  type TourBarBookingContext,
} from "../../tourbarBookingContext";

const TOURBAR_HOTEL_BOOKING_ENDPOINT = "/api/guide_ai";
const TOURBAR_HOTEL_BOOKING_MODE = "tourbar_hotel_booking";
const TOURBAR_HOTEL_BOOKING_CATALOG_ID = "tourbar_hotel_booking_matrix";
const TOURBAR_BOOKING_MAX_GUIDED_STOPS = 9;

type TourBarWorkingStayContext = {
  roomId: string | null;
  packageIds: string[];
  activeTargetId: string | null;
  activeRoomId: string | null;
  activePackageId: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  datesLabel?: string | null;
  adults?: number | null;
  children?: number | null;
  guests?: number | null;
  guestLabel?: string | null;
  budgetBand?: string | null;
  lastPlannerIntent?: string | null;
  lastResultTitle?: string | null;
  lastResultAction?: string | null;
};

type SmartBarBookingAdapterProps = {
  site: TourBarBookingSiteAdapter;
};

type SmartBarBookingThreadMessage = {
  role: "visitor" | "tourbar";
  content: string;
  focusAreaId?: string;
  answerMode?: string;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asRecordArray(value: unknown): Record<string, any>[] {
  return Array.isArray(value)
    ? value
        .map((item) => asRecord(item))
        .filter((item) => Object.keys(item).length > 0)
    : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function compactText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function fallbackPageIdFromTarget(targetId?: string | null): TourBarBookingPageId {
  const target = String(targetId || "");

  if (target.startsWith("package-")) return "packages";
  if (target.startsWith("amenity-")) return "amenities";
  if (target.startsWith("booking-") || target === "payment-module") return "booking";
  if (target.startsWith("room-")) return "rooms";

  return "home";
}

function actionId(prefix: string, value: string, index = 0) {
  return `${prefix}-${index}-${value}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 68) || `${prefix}-${index}`;
}

function bookingResponseBody(raw: TourBarBookingRawResponse) {
  return compactText(raw.body || raw.answer || raw.message || raw.reply || "TourBar found a booking option.");
}

function messageFromShellResult(result: TourBarShellResult) {
  const invitation = result.invitation?.text || result.nextMove?.label || "";
  return [result.title, result.body, invitation].filter(Boolean).join("\n");
}

function renderInlineEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function buildTourBarBookingRequestBody(
  query: string,
  shellContext: TourBarBookingTurnContext,
  requestContext: TourBarBookingRequestContext,
) {
  const activeStayPlan = asRecord(requestContext.activeStayPlan);
  const tourBarWorkingStay = asRecord(requestContext.tourBarWorkingStay);
  const bookingContext = asRecord(requestContext.bookingContext);
  const currentResult = shellContext.currentResult as any;
  const selectedPackageIds =
    requestContext.selectedPackageIds ||
    asStringArray(activeStayPlan.packageIds) ||
    [];

  const visibleContext = {
    currentPage: requestContext.currentPage,
    activeAnchor: requestContext.activeAnchor,
    activeTargetId:
      requestContext.activeTargetId ||
      tourBarWorkingStay.activeTargetId ||
      requestContext.activeAnchor,
    activeRoomId: requestContext.activeRoomId || activeStayPlan.activeRoomId,
    activePackageId: requestContext.activePackageId || activeStayPlan.activePackageId,
    selectedRoomId: requestContext.selectedRoomId || activeStayPlan.roomId,
    selectedPackageIds,
    activeStayPlan,
    tourBarWorkingStay,
    bookingContext,
    ...(requestContext.visibleContext || {}),
  };

  const conversationContext = {
    currentResult: currentResult?.raw || shellContext.currentResult || null,
    thread: shellContext.thread,
    activeStayPlan,
    commerceContext:
      requestContext.commerceContext || {
        activeStayPlan,
        tourBarWorkingStay,
        bookingContext,
      },
    ...(requestContext.conversationContext || {}),
  };

  return {
    mode: TOURBAR_HOTEL_BOOKING_MODE,
    catalogMode: TOURBAR_HOTEL_BOOKING_MODE,
    message: query,
    guideConfig: {
      ...commerceGuideConfig,
      mode: TOURBAR_HOTEL_BOOKING_MODE,
      catalogMode: TOURBAR_HOTEL_BOOKING_MODE,
      packIds: {
        ...commerceGuideConfig.packIds,
        catalog: TOURBAR_HOTEL_BOOKING_CATALOG_ID,
      },
    },
    visibleContext,
    conversationContext,
  };
}

async function postTourBarHotelBooking(
  query: string,
  shellContext: TourBarBookingTurnContext,
  requestContext: TourBarBookingRequestContext,
) {
  const response = await fetch(TOURBAR_HOTEL_BOOKING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(
      buildTourBarBookingRequestBody(query, shellContext, requestContext),
    ),
  });

  const raw = (await response.json().catch(() => ({}))) as TourBarBookingRawResponse;

  if (!response.ok) {
    throw new Error(
      String(raw.message || raw.error || "TourBar hotel booking request failed."),
    );
  }

  return raw;
}

export default function SmartBarBookingAdapter({ site }: SmartBarBookingAdapterProps) {
  const [workingStay, setWorkingStay] = useState<TourBarWorkingStayContext>({
    roomId: site.selectedRoom || site.roomStepOrder[0] || null,
    packageIds: site.selectedPackages,
    activeTargetId: site.selectedRoom || site.roomStepOrder[0] || null,
    activeRoomId: site.selectedRoom || site.roomStepOrder[0] || null,
    activePackageId: site.selectedPackages[0] || null,
    checkInDate: null,
    checkOutDate: null,
    datesLabel: null,
    adults: null,
    children: null,
    guests: null,
    guestLabel: null,
  });
  const activeResultRef = useRef<TourBarShellResult | null>(null);
  const currentRawRef = useRef<TourBarBookingRawResponse | null>(null);
  const threadRef = useRef<SmartBarBookingThreadMessage[]>([]);
  const actionQueriesRef = useRef<Record<string, string>>({});
  const navigationRunRef = useRef(0);

  const pageIdFromTarget = (targetId?: string | null): TourBarBookingPageId =>
    fallbackPageIdFromTarget(targetId);

  const sectionIdFromTarget = (targetId?: string | null) => {
    const target = String(targetId || "").trim();
    if (!target) return "";

    const exact = site.targetIds.find((id) => id === target);
    if (exact) return exact;

    const prefix = site.targetIds
      .slice()
      .sort((a, b) => b.length - a.length)
      .find((id) => target.startsWith(`${id}-`) || target.startsWith(`${id}_`));

    return prefix || target;
  };

  const packageIdsFromCombination = (combo: Record<string, any>) =>
    site.normalizePackageIds(asStringArray(combo.packageIds));

  const packageIdsFromStayPlan = (stayPlan: Record<string, any>) =>
    site.normalizePackageIds([
      ...asStringArray(stayPlan.packageIds),
      ...asRecordArray(stayPlan.packages).map((item) =>
        String(item.targetId || item.packageId || ""),
      ),
    ]);

  const roomIdFromTarget = (targetId?: string | null) => {
    const sectionId = sectionIdFromTarget(targetId);
    return site.getRoomMeta(sectionId) ? sectionId : "";
  };

  const packageIdFromTarget = (targetId?: string | null) => {
    const sectionId = sectionIdFromTarget(targetId);
    return site.getPackageMeta(sectionId) ? sectionId : "";
  };

  const currentBookingContext = (
    overrides: {
      datesSelected?: boolean;
      guestsSelected?: boolean;
      checkInDate?: string;
      checkOutDate?: string;
      guestAdults?: number;
      guestChildren?: number;
      guestLabel?: string;
      budgetBand?: string;
    } = {},
  ) => {
    const nextDatesSelected = overrides.datesSelected ?? site.datesSelected;
    const nextGuestsSelected = overrides.guestsSelected ?? site.guestsSelected;
    const nextCheckInDate = overrides.checkInDate ?? site.checkInDate;
    const nextCheckOutDate = overrides.checkOutDate ?? site.checkOutDate;
    const nextGuestAdults = overrides.guestAdults ?? site.guestAdults;
    const nextGuestChildren = overrides.guestChildren ?? site.guestChildren;
    const nextGuestLabel =
      overrides.guestLabel ?? site.guestLabelFromCounts(nextGuestAdults, nextGuestChildren);
    const nextBudgetBand = overrides.budgetBand ?? site.budgetBand;

    return {
      checkInDate: nextDatesSelected ? nextCheckInDate : null,
      checkOutDate: nextDatesSelected ? nextCheckOutDate : null,
      datesLabel: nextDatesSelected
        ? site.formatDateRange(nextCheckInDate, nextCheckOutDate)
        : null,
      nights: nextDatesSelected ? site.bookingNights(nextCheckInDate, nextCheckOutDate) : null,
      adults: nextGuestsSelected ? nextGuestAdults : null,
      children: nextGuestsSelected ? nextGuestChildren : null,
      guests: nextGuestsSelected ? nextGuestAdults + nextGuestChildren : null,
      guestLabel: nextGuestsSelected ? nextGuestLabel : null,
      budgetBand: nextBudgetBand,
    };
  };

  const buildActiveStayPlan = (
    currentWorkingStay: TourBarWorkingStayContext,
    fallbackRoomId: string | null,
    fallbackPackageIds: string[],
  ) => {
    const roomId = currentWorkingStay.roomId || fallbackRoomId || "";
    const roomMeta = site.getRoomMeta(roomId);
    const packageIds = site.normalizePackageIds([
      ...fallbackPackageIds,
      ...currentWorkingStay.packageIds,
    ]);

    return {
      roomId: roomId || null,
      roomTargetId: roomId || null,
      room: roomId
        ? {
            roomId,
            targetId: roomId,
            title: roomMeta?.title || roomId,
            price: roomMeta?.price || "",
            signal: roomMeta?.signal || "",
          }
        : null,
      packageIds,
      packages: packageIds.map((packageId) => {
        const meta = site.getPackageMeta(packageId);
        return {
          packageId,
          targetId: packageId,
          title: meta?.title || packageId,
          price: meta?.price || "",
          signal: meta?.signal || "",
        };
      }),
      activeTargetId: currentWorkingStay.activeTargetId || roomId || null,
      activeRoomId: currentWorkingStay.activeRoomId || roomId || null,
      activePackageId: currentWorkingStay.activePackageId || packageIds[0] || null,
      bookingContext: {
        checkInDate: currentWorkingStay.checkInDate || null,
        checkOutDate: currentWorkingStay.checkOutDate || null,
        datesLabel: currentWorkingStay.datesLabel || null,
        adults: currentWorkingStay.adults ?? null,
        children: currentWorkingStay.children ?? null,
        guests: currentWorkingStay.guests ?? null,
        guestLabel: currentWorkingStay.guestLabel || null,
        budgetBand: currentWorkingStay.budgetBand || null,
      },
      lastPlannerIntent: currentWorkingStay.lastPlannerIntent || null,
      lastResultTitle: currentWorkingStay.lastResultTitle || null,
      lastResultAction: currentWorkingStay.lastResultAction || null,
    };
  };

  const mergePromptContext = (query: string) => {
    const parsedDates = extractTourBarDatesFromPrompt(query);
    const parsedGuests = extractTourBarGuestsFromPrompt(query);
    const nextContext = normalizeTourBarBookingContext({
      datesSelected: site.datesSelected,
      guestsSelected: site.guestsSelected,
      checkInDate: site.checkInDate,
      checkOutDate: site.checkOutDate,
      guestAdults: site.guestAdults,
      guestChildren: site.guestChildren,
      guestLabel: site.guestLabel,
      budgetBand: site.budgetBand,
      ...(parsedDates
        ? {
            datesSelected: true,
            checkInDate: parsedDates.checkInDate,
            checkOutDate: parsedDates.checkOutDate,
            datesLabel: parsedDates.datesLabel,
          }
        : {}),
      ...(parsedGuests
        ? {
            guestsSelected: true,
            guestAdults: parsedGuests.adults,
            guestChildren: parsedGuests.children,
            guestLabel: parsedGuests.guestLabel,
          }
        : {}),
    });

    if (parsedDates) {
      site.setCheckInDate(parsedDates.checkInDate);
      site.setCheckOutDate(parsedDates.checkOutDate);
      site.setDatesSelected(true);
      site.setActiveFormSpotlight?.(null);
    }

    if (parsedGuests) {
      site.setGuestAdults(parsedGuests.adults);
      site.setGuestChildren(parsedGuests.children);
      site.setGuestLabel(parsedGuests.guestLabel);
      site.setGuestsSelected(true);
      site.setActiveFormSpotlight?.(null);
    }

    return nextContext;
  };

  const addNavigationTarget = (
    targets: TourBarBookingPageTarget[],
    value: Record<string, any>,
  ) => {
    const rawTargetId = String(value.targetId || value.focusAreaId || "").trim();
    const targetId = sectionIdFromTarget(rawTargetId);

    if (!targetId || targetId === "booking-panel" || targetId.startsWith("booking-")) {
      return;
    }

    const pageId = String(value.pageId || pageIdFromTarget(targetId)) as TourBarBookingPageId;
    const targetSelector =
      typeof value.targetSelector === "string" && value.targetSelector.trim()
        ? value.targetSelector.trim()
        : `[data-tour-id="${targetId}"], #${targetId}`;
    const key = `${pageId}:${targetId}`;

    if (targets.some((item) => `${item.pageId}:${item.targetId}` === key)) {
      return;
    }

    targets.push({
      pageId,
      targetId,
      targetSelector,
      targetText: typeof value.targetText === "string" ? value.targetText : undefined,
      reason: typeof value.reason === "string" ? value.reason : undefined,
    });
  };

  const packageNavigationTargetsFromCombo = (combo: Record<string, any>) => {
    const packageTargets = asRecordArray(combo.packageTargets);
    const packageIds = packageIdsFromCombination(combo);

    return packageIds.map((packageId, index) => {
      const target = asRecord(packageTargets[index]);
      const targetId = String(target.targetId || packageId);
      return {
        pageId: String(target.pageId || pageIdFromTarget(targetId)) as TourBarBookingPageId,
        targetId,
        targetSelector:
          typeof target.targetSelector === "string" && target.targetSelector.trim()
            ? target.targetSelector.trim()
            : `[data-tour-id="${targetId}"], #${targetId}`,
        targetText:
          asStringArray(combo.packageTitles)[index] ||
          site.getPackageMeta(packageId)?.title ||
          "Package",
        reason: "Recommended add-on for this stay.",
      };
    });
  };

  const comboNavigationTargets = (
    combo: Record<string, any>,
    { packageFirst = false }: { packageFirst?: boolean } = {},
  ) => {
    const targets: TourBarBookingPageTarget[] = [];
    const roomTarget = asRecord(combo.roomTarget);
    const roomId = String(combo.roomId || roomTarget.targetId || "").trim();
    const roomStep = roomId
      ? {
          pageId: String(roomTarget.pageId || pageIdFromTarget(roomId)) as TourBarBookingPageId,
          targetId: roomId,
          targetSelector:
            typeof roomTarget.targetSelector === "string" && roomTarget.targetSelector.trim()
              ? roomTarget.targetSelector.trim()
              : `[data-tour-id="${roomId}"], #${roomId}`,
          targetText: String(
            combo.roomShortTitle ||
              combo.roomTitle ||
              site.getRoomMeta(roomId)?.title ||
              "Room",
          ),
          reason: "Recommended room option.",
        }
      : null;
    const packageSteps = packageNavigationTargetsFromCombo(combo);

    [
      ...(packageFirst ? packageSteps : []),
      ...(roomStep ? [roomStep] : []),
      ...(packageFirst ? [] : packageSteps),
    ].forEach((target) => addNavigationTarget(targets, target));

    return targets;
  };

  const navigationTargetsFromRaw = (raw: TourBarBookingRawResponse) => {
    const targets: TourBarBookingPageTarget[] = [];
    const action = asRecord(raw.action || raw.suggestedAction);
    const ranked = asRecordArray(raw.rankedDestinations);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
    const packageIds = packageIdsFromCombination(selected);
    const plannerText = [
      asRecord(raw.bookingArtifacts).normalizedPrompt,
      asRecord(raw.bookingArtifacts).rawPrompt,
      raw.answer,
      raw.body,
      raw.message,
      raw.reply,
    ]
      .join(" ")
      .toLowerCase();
    const packageFocused =
      packageIds.length > 0 &&
      /\b(parking|breakfast|package|bundle|add-?on|transfer|shuttle|spa|conference|wifi|late checkout|lounge)\b/.test(plannerText);

    addNavigationTarget(targets, action);
    ranked.forEach((item) => addNavigationTarget(targets, item));

    const combos = [
      tourBarCombinationFromRaw(raw, { preferNextStep: true }),
      asRecord(raw.selectedCombination),
      ...asRecordArray(raw.matrixResults),
      ...asRecordArray(raw.alternatives),
    ];

    combos.forEach((combo) => {
      if (!combo.comboId && !combo.roomId) return;
      comboNavigationTargets(combo, { packageFirst: packageFocused }).forEach((target) =>
        addNavigationTarget(targets, target),
      );
    });

    return targets.slice(0, TOURBAR_BOOKING_MAX_GUIDED_STOPS);
  };

  const primaryTargetFromRaw = (raw: TourBarBookingRawResponse) => {
    const action = asRecord(raw.action || raw.suggestedAction);
    const ranked = Array.isArray(raw.rankedDestinations) ? raw.rankedDestinations : [];
    const firstRanked = asRecord(ranked[0]);
    const selected = tourBarCombinationFromRaw(raw);
    const packageIds = packageIdsFromCombination(selected);
    const bookingAction = String(raw.commerceAction || raw.intent || raw.displayMode || "");
    const plannerText = [
      asRecord(raw.bookingArtifacts).normalizedPrompt,
      asRecord(raw.bookingArtifacts).rawPrompt,
      raw.answer,
      raw.body,
    ]
      .join(" ")
      .toLowerCase();
    const packageFocused =
      packageIds.length > 0 &&
      /\b(parking|breakfast|package|bundle|add-?on|transfer|shuttle|spa|conference|wifi|late checkout|lounge)\b/.test(plannerText);

    const targetId =
      action.targetId ||
      firstRanked.targetId ||
      (packageFocused ? packageIds[0] : selected.roomId) ||
      raw.targetId ||
      raw.focusAreaId ||
      "";
    const pageId =
      action.pageId ||
      firstRanked.pageId ||
      raw.pageId ||
      pageIdFromTarget(targetId);
    const targetSelector =
      action.targetSelector ||
      firstRanked.targetSelector ||
      (targetId ? `[data-tour-id="${targetId}"], #${targetId}` : undefined);
    const explicitBookingActionText = [
      bookingAction,
      action.type,
      action.kind,
      action.intent,
      action.action,
      action.commerceAction,
      action.displayMode,
      raw.commerceAction,
      raw.intent,
      raw.displayMode,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return {
      pageId: pageId as TourBarBookingPageId,
      targetId: String(targetId || ""),
      targetSelector: typeof targetSelector === "string" ? targetSelector : undefined,
      isBookingAction:
        explicitBookingActionText.includes("prepare_booking") ||
        explicitBookingActionText.includes("booking_handoff") ||
        explicitBookingActionText.includes("checkout_handoff") ||
        targetId === "booking-panel" ||
        action.targetId === "booking-panel",
    };
  };

  const updateWorkingStayFromTarget = (target?: TourBarBookingPageTarget | null) => {
    if (!target) return;

    const targetId = sectionIdFromTarget(target.targetId);
    const roomId = roomIdFromTarget(targetId);
    const packageId = packageIdFromTarget(targetId);

    if (roomId) {
      site.setSelectedRoom(roomId);
    }

    if (packageId) {
      site.setSelectedPackages((current) => site.normalizePackageIds([...current, packageId]));
    }

    setWorkingStay((current) => {
      const currentPackages = site.normalizePackageIds(current.packageIds);
      const nextPackageIds = packageId
        ? site.normalizePackageIds([...currentPackages, packageId])
        : currentPackages;
      const nextRoomId = roomId || current.roomId || site.selectedRoom || null;

      return {
        ...current,
        roomId: nextRoomId,
        packageIds: nextPackageIds,
        activeTargetId: targetId || current.activeTargetId || nextRoomId,
        activeRoomId: roomId || current.activeRoomId || nextRoomId,
        activePackageId: packageId || current.activePackageId || nextPackageIds[0] || null,
      };
    });
  };

  const applyBookingContext = (
    raw: TourBarBookingRawResponse,
    { preferNextStep = false }: { preferNextStep?: boolean } = {},
  ) => {
    const visibleContext = asRecord(raw.visibleContext);
    const bookingContext = asRecord(visibleContext.bookingContext);
    const activeStayPlan = asRecord(
      preferNextStep
        ? raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan
        : raw.activeStayPlan || visibleContext.activeStayPlan,
    );
    const activeRoom = asRecord(activeStayPlan.room);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep });
    const roomId = String(
      activeStayPlan.roomId ||
        activeStayPlan.roomTargetId ||
        activeRoom.targetId ||
        activeRoom.roomId ||
        selected.roomId ||
        visibleContext.selectedRoomId ||
        "",
    );
    const packageIds = site.normalizePackageIds([
      ...packageIdsFromStayPlan(activeStayPlan),
      ...packageIdsFromCombination(selected),
      ...(visibleContext.suggestedPackageId ? [String(visibleContext.suggestedPackageId)] : []),
    ]);
    const validRoomId = roomId && site.roomStepOrder.includes(roomId) ? roomId : "";
    const activeTargetId =
      validRoomId ||
      packageIds[0] ||
      sectionIdFromTarget(visibleContext.activeTargetId || visibleContext.activeAnchor || "") ||
      null;

    if (validRoomId) {
      site.setSelectedRoom(validRoomId);
    }

    site.setSelectedPackages(packageIds);
    setWorkingStay((current) => ({
      ...current,
      roomId: validRoomId || current.roomId || site.selectedRoom || null,
      packageIds,
      activeTargetId: activeTargetId || current.activeTargetId || validRoomId || site.selectedRoom || null,
      activeRoomId: validRoomId || current.activeRoomId || site.selectedRoom || null,
      activePackageId: packageIds[0] || current.activePackageId || null,
      lastPlannerIntent: String(raw.intent || raw.displayMode || raw.commerceAction || current.lastPlannerIntent || ""),
      lastResultTitle: String(raw.title || selected.roomShortTitle || selected.roomTitle || current.lastResultTitle || ""),
      lastResultAction: String(raw.commerceAction || raw.intent || current.lastResultAction || ""),
    }));

    const nextCheckInDate = bookingContext.checkInDate ? String(bookingContext.checkInDate) : "";
    const nextCheckOutDate = bookingContext.checkOutDate ? String(bookingContext.checkOutDate) : "";
    const nextGuests = Number(bookingContext.guests || 0);
    const nextAdults = Number(bookingContext.adults || 0);
    const nextChildren = Number(bookingContext.children || 0);

    if (nextCheckInDate && nextCheckOutDate) {
      site.setCheckInDate(nextCheckInDate);
      site.setCheckOutDate(nextCheckOutDate);
      site.setDatesSelected(true);
      site.setActiveFormSpotlight?.(null);
    }

    if (bookingContext.guests || bookingContext.guestLabel || bookingContext.adults) {
      const fromLabel = site.guestCountsFromLabel(String(bookingContext.guestLabel || ""));
      const adults = Math.max(1, nextAdults || fromLabel?.adults || nextGuests || 1);
      const children = Math.max(0, nextChildren || fromLabel?.children || 0);
      const nextGuestLabel = String(
        bookingContext.guestLabel || site.guestLabelFromCounts(adults, children),
      );
      site.setGuestAdults(adults);
      site.setGuestChildren(children);
      site.setGuestLabel(nextGuestLabel);
      site.setGuestsSelected(true);
      site.setActiveFormSpotlight?.(null);
    }

    if (bookingContext.maxNightlyBudgetUsd || bookingContext.maxTotalBudgetUsd) {
      site.setBudgetBand(
        bookingContext.maxNightlyBudgetUsd
          ? `Under $${bookingContext.maxNightlyBudgetUsd}/night`
          : `Under $${bookingContext.maxTotalBudgetUsd} total`,
      );
    }
  };

  const spotlightAnchor = (targetId: string, targetSelector?: string, delay = 420) => {
    const sectionId = sectionIdFromTarget(targetId);
    if (!sectionId) return;

    const runToken = navigationRunRef.current;
    const selector = targetSelector || `[data-tour-id="${sectionId}"], #${sectionId}`;
    const pageId = pageIdFromTarget(sectionId);

    window.setTimeout(() => {
      const isCurrentRun = () => navigationRunRef.current === runToken;
      if (!isCurrentRun()) return;

      site.setActiveAnchor(sectionId);
      void smartbarFocusTarget(
        {
          pageId,
          targetId: sectionId,
          targetSelector: selector,
        },
        {
          initialDelayMs: 0,
          attempts: 28,
          scrollBehavior: "auto",
          overlayDurationMs: 3600,
          dispatchLegacyEvent: false,
        },
      );
    }, delay);
  };

  const focusResult = (raw: TourBarBookingRawResponse) => {
    const target = primaryTargetFromRaw(raw);

    applyBookingContext(raw);

    if (target.isBookingAction && isExplicitTourBarBookingRequest(raw)) {
      applyBookingContext(raw, { preferNextStep: true });
      const bookingTarget = bookingFocusTarget(raw);
      if (bookingTarget) {
        navigationRunRef.current += 1;
        if (bookingTarget.pageId) site.setCurrentPage(bookingTarget.pageId);
        spotlightAnchor(bookingTarget.targetId, bookingTarget.targetSelector, 560);
      }
      return;
    }

    const navigationTargets = navigationTargetsFromRaw(raw);
    if (navigationTargets.length) {
      navigationRunRef.current += 1;
      const first = navigationTargets[0];
      const pageId = first.pageId || pageIdFromTarget(first.targetId);
      updateWorkingStayFromTarget(first);
      site.setCurrentPage(pageId);
      spotlightAnchor(first.targetId, first.targetSelector, 520);
      return;
    }

    if (!target.targetId && !target.targetSelector) return;

    const pageId = target.pageId || pageIdFromTarget(target.targetId);
    navigationRunRef.current += 1;
    site.setCurrentPage(pageId);
    spotlightAnchor(target.targetId, target.targetSelector, 520);
  };

  const bookingFocusTarget = (raw: TourBarBookingRawResponse): TourBarBookingPageTarget | null => {
    const visibleContext = asRecord(raw.visibleContext);
    const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
    const activeRoom = asRecord(activeStayPlan.room);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
    const roomId = String(
      activeStayPlan.roomId ||
        activeStayPlan.roomTargetId ||
        activeRoom.targetId ||
        activeRoom.roomId ||
        selected.roomId ||
        visibleContext.selectedRoomId ||
        "",
    );
    const targetId = sectionIdFromTarget(roomId);
    if (!targetId || !site.roomStepOrder.includes(targetId)) return null;

    return {
      pageId: pageIdFromTarget(targetId),
      targetId,
      targetSelector: `[data-tour-id="${targetId}"], #${targetId}`,
      targetText: String(selected.roomShortTitle || selected.roomTitle || site.getRoomMeta(targetId)?.title || "Selected room"),
      reason: "Room staged for booking handoff.",
    };
  };

  const buildRequestContext = (
    query: string,
    promptContext: TourBarBookingContext,
  ): TourBarBookingRequestContext => {
    const effectiveDatesSelected = Boolean(promptContext.datesSelected || site.datesSelected);
    const effectiveGuestsSelected = Boolean(promptContext.guestsSelected || site.guestsSelected);
    const effectiveCheckInDate = String(promptContext.checkInDate || site.checkInDate || "");
    const effectiveCheckOutDate = String(promptContext.checkOutDate || site.checkOutDate || "");
    const effectiveGuestAdults = Math.max(
      1,
      Number(promptContext.guestAdults ?? promptContext.adults ?? site.guestAdults ?? 1),
    );
    const effectiveGuestChildren = Math.max(
      0,
      Number(promptContext.guestChildren ?? promptContext.children ?? site.guestChildren ?? 0),
    );
    const effectiveGuestLabel =
      promptContext.guestLabel ||
      site.guestLabel ||
      site.guestLabelFromCounts(effectiveGuestAdults, effectiveGuestChildren);
    const bookingContext = currentBookingContext({
      datesSelected: effectiveDatesSelected,
      guestsSelected: effectiveGuestsSelected,
      checkInDate: effectiveCheckInDate,
      checkOutDate: effectiveCheckOutDate,
      guestAdults: effectiveGuestAdults,
      guestChildren: effectiveGuestChildren,
      guestLabel: effectiveGuestLabel,
    });
    const workingStayContext = {
      ...workingStay,
      checkInDate: bookingContext.checkInDate,
      checkOutDate: bookingContext.checkOutDate,
      datesLabel: bookingContext.datesLabel,
      adults: bookingContext.adults,
      children: bookingContext.children,
      guests: bookingContext.guests,
      guestLabel: bookingContext.guestLabel,
      budgetBand: bookingContext.budgetBand,
    };
    const activeStayPlan = buildActiveStayPlan(
      workingStayContext,
      site.selectedRoom,
      site.selectedPackages,
    );

    return {
      currentPage: site.currentPage,
      activeAnchor: site.activeAnchor,
      activeTargetId: workingStay.activeTargetId || site.activeAnchor,
      activeRoomId: workingStay.activeRoomId || site.selectedRoom,
      activePackageId: workingStay.activePackageId || site.selectedPackages[0] || null,
      selectedRoomId: site.selectedRoom,
      selectedPackageIds: site.selectedPackages,
      activeStayPlan,
      tourBarWorkingStay: workingStayContext,
      bookingContext,
      commerceContext: {
        activeStayPlan,
        tourBarWorkingStay: workingStayContext,
        bookingContext,
      },
      visibleContext: {
        bookingContext,
        activeStayPlan,
        selectedRoomId: site.selectedRoom,
        selectedPackageIds: site.selectedPackages,
        dates: bookingContext.checkInDate && bookingContext.checkOutDate
          ? {
              checkIn: bookingContext.checkInDate,
              checkOut: bookingContext.checkOutDate,
              label: bookingContext.datesLabel,
            }
          : null,
        guests: bookingContext.guests
          ? {
              adults: bookingContext.adults,
              children: bookingContext.children,
              total: bookingContext.guests,
              label: bookingContext.guestLabel,
            }
          : null,
        budget: site.budgetBand ? { band: site.budgetBand } : null,
      },
      conversationContext: {
        promptContext,
        rawQuery: query,
      },
    };
  };

  const actionsForRaw = (raw: TourBarBookingRawResponse): SmartBarMobileGenericAction[] => {
    const actions: SmartBarMobileGenericAction[] = [];
    const shellResult = buildTourBarBookingShellResult(raw, primaryTargetFromRaw(raw), {
      mode: TOURBAR_HOTEL_BOOKING_MODE,
    });
    const nextLabel = shellResult.nextMove?.label || shellResult.invitation?.text || "";
    const nextQuery = shellResult.nextMove?.query || shellResult.nextMove?.label || shellResult.invitation?.text || "";

    actionQueriesRef.current = {};

    if (nextLabel && nextQuery) {
      const id = isBookingNextStepLabel(`${nextLabel} ${nextQuery}`)
        ? "booking-handoff"
        : actionId("next", nextQuery);
      actionQueriesRef.current[id] = nextQuery;
      actions.push({
        id,
        label: nextLabel,
        helper: isBookingNextStepLabel(`${nextLabel} ${nextQuery}`)
          ? "Prepare the stay handoff"
          : "Continue with SmartBar",
        variant: "primary",
      });
    }

    asStringArray(raw.chips || raw.refinementChips || raw.suggestions)
      .slice(0, 3)
      .forEach((suggestion, index) => {
        const id = actionId("suggestion", suggestion, index);
        actionQueriesRef.current[id] = suggestion;
        actions.push({
          id,
          label: suggestion,
          helper: "Ask this next",
          variant: actions.length ? "secondary" : "primary",
        });
      });

    return actions;
  };

  const bookingSummaryRows = (raw: TourBarBookingRawResponse) => {
    const visibleContext = asRecord(raw.visibleContext);
    const bookingContext = asRecord(visibleContext.bookingContext);
    const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
    const activeRoom = asRecord(activeStayPlan.room);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
    const roomId = String(
      activeStayPlan.roomId ||
        activeStayPlan.roomTargetId ||
        activeRoom.targetId ||
        activeRoom.roomId ||
        selected.roomId ||
        visibleContext.selectedRoomId ||
        site.selectedRoom ||
        "",
    );
    const roomMeta = site.getRoomMeta(roomId);
    const packageIds = site.normalizePackageIds([
      ...packageIdsFromStayPlan(activeStayPlan),
      ...packageIdsFromCombination(selected),
      ...asStringArray(visibleContext.selectedPackageIds),
    ]);
    const packageTitles = asStringArray(selected.packageTitles);
    const derivedPackageTitles = packageIds
      .map((packageId) => site.getPackageMeta(packageId)?.title)
      .filter((title): title is string => Boolean(title));
    const datesLabel =
      bookingContext.checkInDate && bookingContext.checkOutDate
        ? site.formatDateRange(String(bookingContext.checkInDate), String(bookingContext.checkOutDate))
        : site.datesSelected
          ? site.formatDateRange(site.checkInDate, site.checkOutDate)
          : "Dates can be added next";
    const guestsLabel =
      typeof bookingContext.guestLabel === "string" && bookingContext.guestLabel.trim()
        ? bookingContext.guestLabel.trim()
        : bookingContext.guests
          ? `${bookingContext.guests} guest${Number(bookingContext.guests) === 1 ? "" : "s"}`
          : site.guestsSelected
            ? site.guestLabel
            : "Guests can be added next";

    return [
      ["Room", String(selected.roomShortTitle || selected.roomTitle || roomMeta?.title || "Selected room")],
      ["Add-ons", (packageTitles[0] || derivedPackageTitles[0] || "No package selected").replace(/\s+/g, " ")],
      ["Dates", datesLabel],
      ["Guests", guestsLabel],
      ["Estimate", priceLabelFromTourBarCombination(selected) || roomMeta?.price || "Rate ready"],
    ];
  };

  const contentForRaw = (raw: TourBarBookingRawResponse, summary = false): ReactNode => {
    const body = bookingResponseBody(raw);
    const rows = summary ? bookingSummaryRows(raw) : [];

    return (
      <div className="space-y-2.5">
        {body && (
          <div className="rounded-[24px] border border-white/16 bg-slate-950/68 px-4 py-3 text-[15px] font-semibold leading-6 text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(2,6,23,0.14)] ring-1 ring-white/10">
            {renderInlineEmphasis(body)}
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-[24px] border border-white/16 bg-white/[0.10] text-sm font-semibold text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-white/10">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-2.5 last:border-b-0">
                <span className="text-white/52">{label}</span>
                <strong className="max-w-[62%] text-right text-white">{value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const resultHasNavigation = (raw: TourBarBookingRawResponse) => {
    const target = primaryTargetFromRaw(raw);
    return Boolean(target.targetId || target.targetSelector || navigationTargetsFromRaw(raw).length);
  };

  const toGenericResult = (raw: TourBarBookingRawResponse): SmartBarMobileGenericResult => {
    const target = primaryTargetFromRaw(raw);
    const shellResult = buildTourBarBookingShellResult(raw, target, {
      mode: TOURBAR_HOTEL_BOOKING_MODE,
    });
    const actions = actionsForRaw(raw);
    const summary = target.isBookingAction || String(raw.displayMode || raw.intent || raw.commerceAction || "").includes("prepare_booking");
    const body = bookingResponseBody(raw);
    const estimatedLines = Math.max(1, Math.ceil(body.length / 46));
    const estimatedHeight = Math.min(
      640,
      Math.max(summary ? 430 : actions.length ? 360 : 300, 120 + estimatedLines * 26 + actions.length * 66 + (summary ? 190 : 0)),
    );
    const navigates = resultHasNavigation(raw);

    return {
      surfaceKind: summary ? "booking_summary" : "booking_tour",
      eyebrow: summary ? "Booking preload" : "Domi stay match",
      title: shellResult.title || "Domi booking match",
      helper: summary
        ? "SmartBar carried the room, add-ons, dates, and guests into a booking-ready summary."
        : navigates
          ? "SmartBar opened the matching stay option on the site."
          : "Refine this stay or ask SmartBar for another option.",
      statusLabel: summary ? "Ready" : navigates ? "Spotlight" : "Match ready",
      actions,
      height: estimatedHeight,
      content: contentForRaw(raw, summary),
      navigationRevealDelayMs: navigates ? 3000 : undefined,
      navigationRevealLabel: navigates ? "Spotlighting..." : undefined,
    };
  };

  const submitBookingQuery = async (query: string): Promise<SmartBarMobileSubmitResult> => {
    const promptContext = mergePromptContext(query);
    const requestContext = buildRequestContext(query, promptContext);
    const turnContext: TourBarBookingTurnContext = {
      currentResult: activeResultRef.current,
      thread: threadRef.current.slice(-8),
      bookingContext: promptContext,
    };
    const raw = await postTourBarHotelBooking(query, turnContext, requestContext);
    const shellResult = buildTourBarBookingShellResult(
      raw,
      requestContext.resultTarget || primaryTargetFromRaw(raw) || {},
      { mode: TOURBAR_HOTEL_BOOKING_MODE },
    );

    activeResultRef.current = shellResult;
    currentRawRef.current = raw;
    threadRef.current = [
      ...threadRef.current.slice(-6),
      { role: "visitor", content: query },
      {
        role: "tourbar",
        content: messageFromShellResult(shellResult),
        focusAreaId: shellResult.focusAreaId,
        answerMode: shellResult.answerMode,
      },
    ];

    focusResult(raw);
    return toGenericResult(raw);
  };

  const submitGenericAction = async (
    action: SmartBarMobileGenericAction,
  ): Promise<SmartBarMobileSubmitResult> => {
    const raw = currentRawRef.current;

    if (action.id === "booking-handoff" && raw) {
      applyBookingContext(raw, { preferNextStep: true });
      const bookingTarget = bookingFocusTarget(raw);
      if (bookingTarget) {
        navigationRunRef.current += 1;
        if (bookingTarget.pageId) site.setCurrentPage(bookingTarget.pageId);
        spotlightAnchor(bookingTarget.targetId, bookingTarget.targetSelector, 180);
      }
      return toGenericResult({
        ...raw,
        commerceAction: raw.commerceAction || "prepare_booking",
        displayMode: raw.displayMode || "prepare_booking",
      });
    }

    const query = actionQueriesRef.current[action.id] || action.label;
    if (!query) {
      return {
        surfaceKind: "booking_tour",
        eyebrow: "Domi stay planner",
        title: "Ask SmartBar",
        helper: "Choose another action or ask a question.",
        statusLabel: "Ready",
        height: 260,
      };
    }

    return submitBookingQuery(query);
  };

  return (
    <SmartBarMobileShell
      mode="overlay"
      entryModeLabel="Plan stay"
      buildingLabel="Checking stay options..."
      onSubmitPrompt={submitBookingQuery}
      onGenericAction={submitGenericAction}
      onResetCart={() => {
        activeResultRef.current = null;
        currentRawRef.current = null;
        threadRef.current = [];
        actionQueriesRef.current = {};
      }}
    />
  );
}
