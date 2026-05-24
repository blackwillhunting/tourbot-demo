import { Pencil } from "lucide-react";
import { commerceGuideConfig } from "../../commerce/commerceGuideConfig";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellProps,
  type TourBarShellResult,
  type TourBarShellTurnContext,
} from "./TourBarShell";

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

type TourBarBookingRawResultContext = {
  query: string;
  shellContext: TourBarBookingTurnContext;
  requestContext: TourBarBookingRequestContext;
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

type TourBarBookingProps = Pick<
  TourBarShellProps,
  "onResult" | "onNextMove"
> & {
  getRequestContext: (
    query: string,
    context: TourBarBookingTurnContext,
  ) => TourBarBookingRequestContext;
  resolveResultTarget?: (raw: TourBarBookingRawResponse) => TourBarBookingResultTarget;
  onRawBookingResult?: (
    raw: TourBarBookingRawResponse,
    context: TourBarBookingRawResultContext,
  ) => void;
  navigationState?: TourBarBookingNavigationState | null;
  onBack?: () => void;
  onNext?: () => void;
  onBook?: (actions: TourBarShellActions, result: TourBarShellResult) => void;
  bookingHandoffOpen?: boolean;
  bookingHandoff?: TourBarBookingHandoff | null;
};

function TourBarBookingHandoffSheet({
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
    "group flex w-full items-start justify-between gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-300";
  const staticRowClass = "flex items-start justify-between gap-3 px-2 py-1.5";

  const renderStaticRow = (label: string, value: string, bordered = false) => (
    <div className={`${staticRowClass} ${bordered ? "border-t border-emerald-100 pt-2" : ""}`}>
      <span className="text-emerald-800/75">{label}</span>
      <strong className="text-right font-semibold">{value}</strong>
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
      <span className="text-emerald-800/75">{label}</span>
      <span className="flex min-w-0 items-start justify-end gap-2 text-right">
        <strong className="font-semibold">{value}</strong>
        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700/55 transition group-hover:text-emerald-900" />
      </span>
    </button>
  );

  return (
    <div
      data-tour-id="tourbar-booking-handoff"
      className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-sm text-emerald-950 shadow-sm ring-1 ring-emerald-100/80"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/70">
        Booking handoff
      </div>
      <div className="mt-2 space-y-0.5">
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

function TourBarNavigationControls({
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
  const previous = state.steps[activeIndex - 1];
  const next = state.steps[activeIndex + 1];
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= state.steps.length - 1;

  return (
    <div
      data-tour-id="tourbar-navigation-controls"
      className="rounded-2xl border border-cyan-100 bg-cyan-50/85 px-3 py-2.5 text-sm text-cyan-950 shadow-sm ring-1 ring-cyan-100/80"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700/70">
            Guided stops · {activeIndex + 1} of {state.steps.length}
          </div>
          <div className="mt-1 truncate font-semibold">
            {active.targetText || active.targetId}
          </div>
          {previous && (
            <div className="mt-0.5 truncate text-xs font-medium text-cyan-800/55">
              Back: {previous.targetText || previous.targetId}
            </div>
          )}
          {next && (
            <div className="mt-0.5 truncate text-xs font-medium text-cyan-800/70">
              Next: {next.targetText || next.targetId}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBack?.();
            }}
            disabled={isFirst || !onBack}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onBook?.();
            }}
            disabled={!onBook}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Book
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onNext?.();
            }}
            disabled={isLast || !onNext}
            className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLast ? "Last stop" : "Next stop"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TourBarBooking({
  getRequestContext,
  resolveResultTarget,
  onRawBookingResult,
  onResult,
  onNextMove,
  navigationState = null,
  onBack,
  onNext,
  onBook,
  bookingHandoffOpen = false,
  bookingHandoff = null,
}: TourBarBookingProps) {
  const submitTourBarHotelBooking = async (
    query: string,
    context: TourBarBookingTurnContext,
  ): Promise<TourBarShellResult> => {
    const requestContext = getRequestContext(query, context);
    const raw = await postTourBarHotelBooking(query, context, requestContext);

    onRawBookingResult?.(raw, {
      query,
      shellContext: context,
      requestContext,
    });

    return buildTourBarBookingShellResult(
      raw,
      requestContext.resultTarget || resolveResultTarget?.(raw) || {},
      { mode: TOURBAR_HOTEL_BOOKING_MODE },
    );
  };

  return (
    <TourBarShell
      primaryPlaceholder="Ask TourBar to find the right stay..."
      followUpPlaceholder="Refine this stay..."
      launcherTitle="Open TourBar hotel booking"
      launcherAriaLabel="Open TourBar hotel booking"
      resultEyebrow="TourBar booking"
      initialLoadingMessage="Resolving the lowest valid room setup…"
      followUpLoadingMessage="Rechecking the matrix…"
      onPrimarySubmit={submitTourBarHotelBooking}
      onFollowUpSubmit={submitTourBarHotelBooking}
      onResult={onResult}
      onNextMove={onNextMove}
      requireBookingContext
      renderResultExtras={(result, actions) => (
        <TourBarNavigationControls
          state={navigationState}
          onBack={onBack}
          onNext={onNext}
          onBook={() => onBook?.(actions, result)}
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
