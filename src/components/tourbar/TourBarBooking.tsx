import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { commerceGuideConfig } from "../../commerce/commerceGuideConfig";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellResult,
  type TourBarShellTurnContext,
} from "./TourBarShell";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "./smartbarFocusController";

export type TourBarBookingRawResponse = Record<string, any>;

const TOURBAR_HOTEL_BOOKING_ENDPOINT = "/api/guide_ai";
const TOURBAR_HOTEL_BOOKING_MODE = "tourbar_hotel_booking";
const TOURBAR_HOTEL_BOOKING_CATALOG_ID = "tourbar_hotel_booking_matrix";

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

export function isBookingNextStepLabel(value?: string | null) {
  const text = String(value || "").toLowerCase();
  return /\b(prepare|book|booking|reserve|reservation|checkout|stage|line\s+up|move\s+this)\b/.test(text);
}

export function isExplicitTourBarBookingRequest(raw: TourBarBookingRawResponse) {
  const artifacts = asRecord(raw.bookingArtifacts);
  const promptText = [artifacts.normalizedPrompt, artifacts.rawPrompt, raw.message, raw.prompt]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return /\b(book|booking|reserve|reservation|checkout|prepare|stage|line\s+up|move\s+this)\b/.test(promptText);
}

export function priceLabelFromTourBarCombination(selected: Record<string, any>) {
  const pricing = asRecord(selected.pricing);
  const effectiveNightly =
    typeof pricing.effectiveNightlyUsd === "number"
      ? pricing.effectiveNightlyUsd
      : Number(pricing.effectiveNightlyUsd || selected.oneNightTotalUsd || selected.effectiveNightlyUsd || 0);

  if (Number.isFinite(effectiveNightly) && effectiveNightly > 0) {
    return `$${Math.round(effectiveNightly).toLocaleString("en-US")}/night`;
  }

  return "Rate ready";
}

export function tourBarCombinationFromRaw(
  raw: TourBarBookingRawResponse,
  { preferNextStep = false }: { preferNextStep?: boolean } = {},
) {
  const nextStep = asRecord(raw.nextStep);
  const nextStepComboId = String(nextStep.comboId || "").trim();
  const candidates = [
    asRecord(raw.nextStepCombination),
    asRecord(raw.selectedCombination),
    ...asRecordArray(raw.matrixResults),
    ...asRecordArray(raw.alternatives),
  ];

  if (preferNextStep && nextStepComboId) {
    const match = candidates.find((combo) => String(combo.comboId || "") === nextStepComboId);
    if (match) return match;
  }

  const nextStepCombination = asRecord(raw.nextStepCombination);
  if (preferNextStep && nextStepCombination.comboId) return nextStepCombination;

  const selected = asRecord(raw.selectedCombination);
  if (selected.comboId || selected.roomId) return selected;

  return nextStepCombination.comboId || nextStepCombination.roomId ? nextStepCombination : {};
}

export type TourBarBookingPageId = "home" | "rooms" | "packages" | "amenities" | "booking";

export type TourBarBookingResultTarget = {
  pageId?: TourBarBookingPageId;
  targetId?: string;
  targetSelector?: string;
};

export type TourBarBookingTurnContext = TourBarShellTurnContext;

export type TourBarBookingRequestContext = {
  currentPage?: string;
  activeAnchor?: string | null;
  activeTargetId?: string | null;
  activeRoomId?: string | null;
  activePackageId?: string | null;
  selectedRoomId?: string | null;
  selectedPackageIds?: string[];
  activeStayPlan?: Record<string, any> | null;
  tourBarWorkingStay?: Record<string, any> | null;
  bookingContext?: Record<string, any> | null;
  commerceContext?: Record<string, any> | null;
  visibleContext?: Record<string, any>;
  conversationContext?: Record<string, any>;
  resultTarget?: TourBarBookingResultTarget;
};

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

function stripInlineNextStepPrompt(body: string, nextStepLabel: string) {
  if (!nextStepLabel) return body;

  const cleaned = body
    .replace(
      /\s*(?:Would you like me to|Would you like to|Do you want me to|Want me to|Should I|Ready to)\s+[^.?!\n]*(?:\?|$)\s*$/i,
      "",
    )
    .trim();

  return cleaned || body;
}

export function buildTourBarBookingShellResult(
  raw: TourBarBookingRawResponse,
  target: TourBarBookingResultTarget = {},
  { mode = "tourbar_hotel_booking" }: { mode?: string } = {},
): TourBarShellResult {
  const legacyChips = asStringArray(raw.chips || raw.refinementChips);
  const nextStep = asRecord(raw.nextStep);
  const nextStepLabel =
    typeof nextStep.label === "string" && nextStep.label.trim()
      ? nextStep.label.trim()
      : legacyChips[0] || "";
  const nextStepQuery =
    typeof nextStep.query === "string" && nextStep.query.trim()
      ? nextStep.query.trim()
      : nextStepLabel;
  const nextStepType =
    typeof nextStep.type === "string" && nextStep.type.trim()
      ? nextStep.type.trim()
      : "tourbar_next_step";
  const selected = asRecord(raw.selectedCombination);
  const title =
    selected.roomShortTitle ||
    selected.roomTitle ||
    raw.title ||
    "TourBar booking match";
  const rawBody =
    raw.body ||
    raw.answer ||
    raw.message ||
    raw.reply ||
    "TourBar found a booking option.";
  const body = stripInlineNextStepPrompt(String(rawBody), nextStepLabel);

  return {
    title: String(title),
    body,
    invitation: nextStepLabel ? { kind: "next_step", text: nextStepLabel } : undefined,
    nextMove: nextStepLabel ? { type: nextStepType, label: nextStepLabel, query: nextStepQuery } : undefined,
    canFollowUp: true,
    focusAreaId: target.targetId || undefined,
    answerMode: String(raw.displayMode || raw.intent || mode),
    pageId: target.pageId,
    targetId: target.targetId || undefined,
    targetSelector: target.targetSelector,
    label: String(raw.label || title),
    mode: String(raw.mode || mode),
    action: String(raw.commerceAction || raw.intent || "tourbar_booking_recommendation"),
    raw,
  };
}


export type TourBarBookingPageTarget = {
  pageId?: TourBarBookingPageId;
  targetId: string;
  targetSelector?: string;
  targetText?: string;
  reason?: string;
};

export type TourBarBookingNavigationState = {
  steps: TourBarBookingPageTarget[];
  activeIndex: number;
};

export type TourBarBookingHandoff = {
  roomTitle: string;
  packageTitle: string;
  datesLabel: string;
  guestsLabel: string;
  budgetLabel: string;
  priceLabel: string;
};


const TOURBAR_BOOKING_MAX_GUIDED_STOPS = 9;

type TourBarBookingMeta = {
  title: string;
  price: string;
  signal?: string;
};

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

export type TourBarBookingSiteAdapter = {
  currentPage: TourBarBookingPageId;
  activeAnchor: string | null;
  targetIds: string[];
  roomStepOrder: string[];
  selectedRoom: string | null;
  selectedPackages: string[];
  datesSelected: boolean;
  guestsSelected: boolean;
  guestAdults: number;
  guestChildren: number;
  guestLabel: string;
  budgetBand: string;
  checkInDate: string;
  checkOutDate: string;
  setCurrentPage: (value: TourBarBookingPageId) => void;
  setActiveAnchor: (value: string | null) => void;
  setSelectedRoom: (value: string | null) => void;
  setSelectedPackages: (value: string[] | ((current: string[]) => string[])) => void;
  setDatesSelected: (value: boolean) => void;
  setGuestsSelected: (value: boolean) => void;
  setGuestAdults: (value: number) => void;
  setGuestChildren: (value: number) => void;
  setGuestLabel: (value: string) => void;
  setBudgetBand: (value: string) => void;
  setCheckInDate: (value: string) => void;
  setCheckOutDate: (value: string) => void;
  setActiveFormSpotlight?: (value: "guests" | null) => void;
  setBookingRailSpotlight?: (value: boolean) => void;
  getRoomMeta: (roomId?: string | null) => TourBarBookingMeta | null;
  getPackageMeta: (packageId?: string | null) => TourBarBookingMeta | null;
  normalizePackageIds: (values?: Array<string | null | undefined> | null) => string[];
  formatDateRange: (checkIn: string, checkOut: string) => string;
  bookingNights: (checkIn: string, checkOut: string) => number | null;
  guestLabelFromCounts: (adults: number, children: number) => string;
  guestCountsFromLabel: (label: string) => { adults: number; children: number } | null;
};

type TourBarBookingProps = {
  site: TourBarBookingSiteAdapter;
};

function fallbackPageIdFromTarget(targetId?: string | null): TourBarBookingPageId {
  const target = String(targetId || "");

  if (target.startsWith("package-")) return "packages";
  if (target.startsWith("amenity-")) return "amenities";
  if (target.startsWith("booking-") || target === "payment-module") return "booking";
  if (target.startsWith("room-")) return "rooms";

  return "home";
}

export function TourBarBookingHandoffSheet({
  bookingHandoff,
  actions,
}: {
  bookingHandoff: TourBarBookingHandoff | null;
  actions?: TourBarShellActions;
}) {
  // This is rendered as a standalone TourBar sheet so booking handoff details
  // do not stretch the answer sheet or force the page into a cutoff position.
  if (!bookingHandoff) return null;

  const liveBookingContext = actions?.bookingContext;
  const datesLabel =
    liveBookingContext?.datesSelected && liveBookingContext.datesLabel
      ? liveBookingContext.datesLabel
      : bookingHandoff.datesLabel;
  const guestsLabel =
    liveBookingContext?.guestsSelected && liveBookingContext.guestLabel
      ? liveBookingContext.guestLabel
      : bookingHandoff.guestsLabel;

  const editableRowClass =
    "group flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-300/45 md:rounded-xl md:hover:bg-emerald-100/70 md:focus:ring-emerald-300";
  const staticRowClass = "flex items-start justify-between gap-3 px-3 py-2";

  const renderStaticRow = (label: string, value: string, _bordered = false) => (
    <div className={staticRowClass}>
      <span className="text-white/52 md:text-emerald-800/75">{label}</span>
      <strong className="text-right font-semibold text-white md:text-emerald-950">{value}</strong>
    </div>
  );

  const renderEditableRow = (
    label: string,
    value: string,
    field: "dates" | "guests",
  ) => (
    <button
      type="button"
      onClick={() => actions?.openBookingContextSheet(field)}
      className={editableRowClass}
      aria-label={`Edit ${label.toLowerCase()}`}
    >
      <span className="text-white/52 md:text-emerald-800/75">{label}</span>
      <span className="flex min-w-0 items-start justify-end gap-2 text-right">
        <strong className="font-semibold text-white md:text-emerald-950">{value}</strong>
        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/70 transition group-hover:text-cyan-100 md:text-emerald-700/55 md:group-hover:text-emerald-900" />
      </span>
    </button>
  );

  return (
    <div
      data-tour-id="tourbar-booking-handoff"
      className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-sm text-white shadow-sm ring-1 ring-white/10 md:border-emerald-100 md:bg-emerald-50/80 md:px-3 md:py-3 md:text-emerald-950 md:ring-emerald-100/80"
    >
      <div className="divide-y divide-white/10 md:space-y-0.5 md:divide-y-0">
        {renderStaticRow("Room", bookingHandoff.roomTitle)}
        {renderStaticRow("Add-ons", bookingHandoff.packageTitle)}
        {actions
          ? renderEditableRow("Dates", datesLabel, "dates")
          : renderStaticRow("Dates", datesLabel)}
        {actions
          ? renderEditableRow("Guests", guestsLabel, "guests")
          : renderStaticRow("Guests", guestsLabel)}
        {renderStaticRow("Budget", bookingHandoff.budgetLabel)}
        {renderStaticRow("Estimate", bookingHandoff.priceLabel, true)}
      </div>
    </div>
  );
}

export function TourBarNavigationControls({
  state,
  onBack,
  onNext,
  onBook,
}: {
  state?: TourBarBookingNavigationState | null;
  onBack?: () => void;
  onNext?: () => void;
  onBook?: () => void;
}) {
  if (!state || state.steps.length < 2) return null;

  const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
  const active = state.steps[activeIndex];
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= state.steps.length - 1;

  return (
    <div
      data-tour-id="tourbar-navigation-controls"
      className="rounded-2xl border border-white/12 bg-slate-950 px-3 py-2.5 text-sm text-white shadow-sm ring-1 ring-white/10 md:border-cyan-100 md:bg-cyan-50/85 md:text-cyan-950 md:ring-cyan-100/80"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/65 md:text-cyan-700/70">
            Guided stops Â· {activeIndex + 1} of {state.steps.length}
          </div>
          <div className="mt-1 truncate font-semibold text-white md:text-cyan-950">
            {active.targetText || active.targetId}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            data-tourbar-booking-nav="back"
            data-tourbar-booking-nav-state={isFirst || !onBack ? "disabled" : "enabled"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBack?.();
            }}
            disabled={isFirst || !onBack}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 md:text-cyan-800 md:hover:bg-white/70"
          >
            Back
          </button>
          <button
            type="button"
            data-tourbar-booking-nav="book"
            data-tourbar-booking-nav-state={!onBook ? "disabled" : "enabled"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBook?.();
            }}
            disabled={!onBook}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 md:hover:bg-emerald-700"
          >
            Book
          </button>
          <button
            type="button"
            data-tourbar-booking-nav="next"
            data-tourbar-booking-nav-state={isLast || !onNext ? "disabled" : "enabled"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onNext?.();
            }}
            disabled={isLast || !onNext}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-45 md:bg-slate-950 md:text-white md:hover:bg-slate-800"
          >
            {isLast ? "Last" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}



export default function TourBarBooking({ site }: TourBarBookingProps) {
  const [navigationState, setNavigationState] =
    useState<TourBarBookingNavigationState | null>(null);
  const [bookingHandoff, setBookingHandoff] =
    useState<TourBarBookingHandoff | null>(null);
  const [bookingHandoffOpen, setBookingHandoffOpen] = useState(false);
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

  const commitBookingContextToWorkingStay = (next: Partial<TourBarWorkingStayContext>) => {
    setWorkingStay((current) => ({
      ...current,
      ...next,
    }));
  };

  const buildBookingHandoff = (
    raw: TourBarBookingRawResponse,
    bookingContextOverride: Record<string, any> = {},
  ): TourBarBookingHandoff => {
    const visibleContext = asRecord(raw.visibleContext);
    const bookingContext = {
      ...asRecord(visibleContext.bookingContext),
      ...bookingContextOverride,
    };
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
        : "Dates can be added in the next step";
    const guestsLabel =
      typeof bookingContext.guestLabel === "string" && bookingContext.guestLabel.trim()
        ? bookingContext.guestLabel.trim()
        : bookingContext.guests
          ? `${bookingContext.guests} guest${Number(bookingContext.guests) === 1 ? "" : "s"}`
          : "Guests can be added in the next step";
    const budgetLabel =
      bookingContext.maxNightlyBudgetUsd
        ? `Under $${bookingContext.maxNightlyBudgetUsd}/night`
        : bookingContext.maxTotalBudgetUsd
          ? `Under $${bookingContext.maxTotalBudgetUsd} total`
          : bookingContext.budgetBand
            ? String(bookingContext.budgetBand)
            : "No budget limit set";

    return {
      roomTitle: String(selected.roomShortTitle || selected.roomTitle || roomMeta?.title || "Selected room"),
      packageTitle: (packageTitles[0] || derivedPackageTitles[0] || "No package selected").replace(/\s+/g, " "),
      datesLabel,
      guestsLabel,
      budgetLabel,
      priceLabel: priceLabelFromTourBarCombination(selected),
    };
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
      commitBookingContextToWorkingStay({
        checkInDate: nextCheckInDate,
        checkOutDate: nextCheckOutDate,
        datesLabel: site.formatDateRange(nextCheckInDate, nextCheckOutDate),
      });
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
      commitBookingContextToWorkingStay({
        adults,
        children,
        guests: adults + children,
        guestLabel: nextGuestLabel,
      });
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

    clearSmartBarFocusOverlay();

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
        { initialDelayMs: 0 },
      ).then(() => {
        if (!isCurrentRun()) clearSmartBarFocusOverlay();
      });
    }, delay);
  };

  const stageBooking = (raw: TourBarBookingRawResponse) => {
    applyBookingContext(raw, { preferNextStep: true });
    setBookingHandoff(buildBookingHandoff(raw, currentBookingContext()));
    setBookingHandoffOpen(true);
    site.setBookingRailSpotlight?.(false);
    site.setActiveFormSpotlight?.(null);
    setNavigationState(null);

    const bookingTarget = bookingFocusTarget(raw);
    if (bookingTarget) {
      navigationRunRef.current += 1;
      if (bookingTarget.pageId) {
        site.setCurrentPage(bookingTarget.pageId);
      }
      spotlightAnchor(bookingTarget.targetId, bookingTarget.targetSelector, 560);
    }
  };

  const runNavigationSequence = (
    targets: TourBarBookingPageTarget[],
    { initialDelay = 520 }: { initialDelay?: number } = {},
  ) => {
    const steps: TourBarBookingPageTarget[] = [];
    targets.forEach((target) => addNavigationTarget(steps, target));
    const cappedSteps = steps.slice(0, TOURBAR_BOOKING_MAX_GUIDED_STOPS);
    if (!cappedSteps.length) return;

    navigationRunRef.current += 1;
    const first = cappedSteps[0];
    const pageId = first.pageId || pageIdFromTarget(first.targetId);

    setNavigationState(
      cappedSteps.length > 1
        ? { steps: cappedSteps, activeIndex: 0 }
        : null,
    );
    updateWorkingStayFromTarget(first);
    site.setCurrentPage(pageId);
    spotlightAnchor(first.targetId, first.targetSelector, initialDelay);
  };

  const backNavigationStep = () => {
    const current = navigationState;
    if (!current || current.steps.length < 2) return;

    const previousIndex = Math.max(current.activeIndex - 1, 0);
    if (previousIndex === current.activeIndex) return;

    const target = current.steps[previousIndex];
    const pageId = target.pageId || pageIdFromTarget(target.targetId);

    navigationRunRef.current += 1;
    setNavigationState({ ...current, activeIndex: previousIndex });
    updateWorkingStayFromTarget(target);
    site.setCurrentPage(pageId);
    spotlightAnchor(target.targetId, target.targetSelector, 180);
  };

  const advanceNavigationStep = () => {
    const current = navigationState;
    if (!current || current.steps.length < 2) return;

    const nextIndex = Math.min(current.activeIndex + 1, current.steps.length - 1);
    if (nextIndex === current.activeIndex) return;

    const target = current.steps[nextIndex];
    const pageId = target.pageId || pageIdFromTarget(target.targetId);

    navigationRunRef.current += 1;
    setNavigationState({ ...current, activeIndex: nextIndex });
    updateWorkingStayFromTarget(target);
    site.setCurrentPage(pageId);
    spotlightAnchor(target.targetId, target.targetSelector, 180);
  };

  const bookCurrentNavigationStep = (
    actions: TourBarShellActions,
    result: TourBarShellResult,
  ) => {
    const current = navigationState;
    if (!current || current.steps.length < 2) return;

    const activeIndex = Math.min(Math.max(current.activeIndex, 0), current.steps.length - 1);
    const active = current.steps[activeIndex];
    const activeTargetId = sectionIdFromTarget(active.targetId);
    const activePackageId = site.getPackageMeta(activeTargetId) ? activeTargetId : "";
    const roomId = site.roomStepOrder.includes(activeTargetId)
      ? activeTargetId
      : workingStay.roomId || site.selectedRoom || site.roomStepOrder[0] || "room-business-king";
    const roomMeta = site.getRoomMeta(roomId);
    const nextPackageIds = site.normalizePackageIds(
      activePackageId
        ? [...site.selectedPackages, ...workingStay.packageIds, activePackageId]
        : [...site.selectedPackages, ...workingStay.packageIds],
    );
    const packageTitles = nextPackageIds
      .map((packageId) => site.getPackageMeta(packageId)?.title)
      .filter((title): title is string => Boolean(title));

    navigationRunRef.current += 1;
    setNavigationState(null);
    site.setSelectedRoom(roomId);
    site.setSelectedPackages(nextPackageIds);
    setWorkingStay({
      roomId,
      packageIds: nextPackageIds,
      activeTargetId: activeTargetId || roomId,
      activeRoomId: roomId,
      activePackageId: activePackageId || nextPackageIds[0] || null,
      ...currentBookingContext(),
      lastPlannerIntent: workingStay.lastPlannerIntent || null,
      lastResultTitle: roomMeta?.title || active.targetText || null,
      lastResultAction: "tourbar_guided_stop_booking",
    });
    setBookingHandoff({
      roomTitle: roomMeta?.title || active.targetText || "Selected room",
      packageTitle: packageTitles[0] || "No package selected",
      datesLabel: site.datesSelected
        ? site.formatDateRange(site.checkInDate, site.checkOutDate)
        : "Dates can be added in the next step",
      guestsLabel: site.guestsSelected ? site.guestLabel : "Guests can be added in the next step",
      budgetLabel: site.budgetBand || "No budget limit set",
      priceLabel: roomMeta?.price || "Rate ready",
    });
    setBookingHandoffOpen(true);
    site.setBookingRailSpotlight?.(false);
    site.setActiveFormSpotlight?.(null);

    site.setCurrentPage(pageIdFromTarget(roomId));
    spotlightAnchor(roomId, `[data-tour-id="${roomId}"], #${roomId}`, 180);

    actions.openStandaloneSheet({
      ...result,
      title: roomMeta?.title || active.targetText || result.title || "Booking handoff",
      focusAreaId: roomId,
      targetId: roomId,
      targetSelector: `[data-tour-id="${roomId}"], #${roomId}`,
      pageId: pageIdFromTarget(roomId),
      mode: "tourbar_booking_handoff",
      action: "tourbar_guided_stop_booking",
    });
  };

  const focusTourBarTarget = (result: TourBarShellResult) => {
    const raw = asRecord(result.raw);
    const target = primaryTargetFromRaw(raw);

    applyBookingContext(raw);

    if (target.isBookingAction && isExplicitTourBarBookingRequest(raw)) {
      stageBooking(raw);
      return;
    }

    const navigationTargets = navigationTargetsFromRaw(raw);
    if (navigationTargets.length) {
      runNavigationSequence(navigationTargets, { initialDelay: 520 });
      return;
    }

    const pageId = target.pageId || pageIdFromTarget(target.targetId);
    site.setCurrentPage(pageId);
    spotlightAnchor(target.targetId, target.targetSelector, 520);
  };

  const handleTourBarNextMove = (result: TourBarShellResult) => {
    const raw = asRecord(result.raw);
    const nextStep = asRecord(raw.nextStep);
    const label = String(
      result.nextMove?.label ||
        result.invitation?.text ||
        nextStep.label ||
        "",
    );
    const query = String(result.nextMove?.query || nextStep.query || "");

    if (!isBookingNextStepLabel(`${label} ${query}`)) {
      return false;
    }

    stageBooking(raw);
    return true;
  };

  const getRequestContext = (
    _query: string,
    context: TourBarBookingTurnContext,
  ): TourBarBookingRequestContext => {
    navigationRunRef.current += 1;
    setNavigationState(null);
    setBookingHandoff(null);
    setBookingHandoffOpen(false);

    const shellBookingContext = context.bookingContext || null;
    const effectiveDatesSelected = Boolean(shellBookingContext?.datesSelected || site.datesSelected);
    const effectiveGuestsSelected = Boolean(shellBookingContext?.guestsSelected || site.guestsSelected);
    const effectiveCheckInDate = String(shellBookingContext?.checkInDate || site.checkInDate || "");
    const effectiveCheckOutDate = String(shellBookingContext?.checkOutDate || site.checkOutDate || "");
    const effectiveGuestAdults = Math.max(
      1,
      Number(shellBookingContext?.guestAdults ?? shellBookingContext?.adults ?? site.guestAdults ?? 1),
    );
    const effectiveGuestChildren = Math.max(
      0,
      Number(shellBookingContext?.guestChildren ?? shellBookingContext?.children ?? site.guestChildren ?? 0),
    );
    const effectiveGuestLabel =
      shellBookingContext?.guestLabel ||
      site.guestLabel ||
      site.guestLabelFromCounts(effectiveGuestAdults, effectiveGuestChildren);

    if (shellBookingContext?.datesSelected && effectiveCheckInDate && effectiveCheckOutDate) {
      site.setCheckInDate(effectiveCheckInDate);
      site.setCheckOutDate(effectiveCheckOutDate);
      site.setDatesSelected(true);
      commitBookingContextToWorkingStay({
        checkInDate: effectiveCheckInDate,
        checkOutDate: effectiveCheckOutDate,
        datesLabel: site.formatDateRange(effectiveCheckInDate, effectiveCheckOutDate),
      });
    }

    if (shellBookingContext?.guestsSelected) {
      site.setGuestAdults(effectiveGuestAdults);
      site.setGuestChildren(effectiveGuestChildren);
      site.setGuestLabel(effectiveGuestLabel);
      site.setGuestsSelected(true);
      commitBookingContextToWorkingStay({
        adults: effectiveGuestAdults,
        children: effectiveGuestChildren,
        guests: effectiveGuestAdults + effectiveGuestChildren,
        guestLabel: effectiveGuestLabel,
      });
    }

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
    };
  };

  const submitTourBarHotelBooking = async (
    query: string,
    context: TourBarBookingTurnContext,
  ): Promise<TourBarShellResult> => {
    const requestContext = getRequestContext(query, context);
    const raw = await postTourBarHotelBooking(query, context, requestContext);

    return buildTourBarBookingShellResult(
      raw,
      requestContext.resultTarget || primaryTargetFromRaw(raw) || {},
      { mode: TOURBAR_HOTEL_BOOKING_MODE },
    );
  };

  return (
    <TourBarShell
      smartBarMobileChrome
      primaryPlaceholder="Ask TourBar to find the right stay..."
      followUpPlaceholder="Refine this stay..."
      launcherTitle="Open TourBar hotel booking"
      launcherAriaLabel="Open TourBar hotel booking"
      resultEyebrow="TourBar booking"
      initialLoadingMessage="Resolving the lowest valid room setupâ€¦"
      followUpLoadingMessage="Rechecking the matrixâ€¦"
      onPrimarySubmit={submitTourBarHotelBooking}
      onFollowUpSubmit={submitTourBarHotelBooking}
      onResult={focusTourBarTarget}
      onNextMove={handleTourBarNextMove}
      requireBookingContext
      renderResultExtras={(result, actions) => (
        <TourBarNavigationControls
          state={navigationState}
          onBack={backNavigationStep}
          onNext={advanceNavigationStep}
          onBook={() => bookCurrentNavigationStep(actions, result)}
        />
      )}
      renderStandaloneSheet={(_result, actions) =>
        bookingHandoffOpen ? (
          <TourBarBookingHandoffSheet
            bookingHandoff={bookingHandoff}
            actions={actions}
          />
        ) : null
      }
    />
  );
}
