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

type SmartBarBookingNavigationState = {
  steps: TourBarBookingPageTarget[];
  activeIndex: number;
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

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
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

type SmartBarBookingDatePreset = {
  id: string;
  label: string;
  helper: string;
  checkInDate: string;
  checkOutDate: string;
  prompt: string;
};

type SmartBarBookingGuestPreset = {
  id: string;
  label: string;
  helper: string;
  adults: number;
  children: number;
};

type SmartBarBookingContextDraft = {
  datesSelected: boolean;
  checkInDate: string;
  checkOutDate: string;
  datesLabel: string;
  datesPrompt: string;
  guestsSelected: boolean;
  guestAdults: number;
  guestChildren: number;
  guestLabel: string;
};

const SMARTBAR_BOOKING_DATE_PRESETS: SmartBarBookingDatePreset[] = [
  {
    id: "aug-4-9",
    label: "Aug 4–9",
    helper: "5 nights",
    checkInDate: "2026-08-04",
    checkOutDate: "2026-08-09",
    prompt: "Aug 4 to Aug 9, 2026",
  },
  {
    id: "jul-10-14",
    label: "Jul 10–14",
    helper: "4 nights",
    checkInDate: "2026-07-10",
    checkOutDate: "2026-07-14",
    prompt: "Jul 10 to Jul 14, 2026",
  },
  {
    id: "jun-12-19",
    label: "Jun 12–19",
    helper: "7 nights",
    checkInDate: "2026-06-12",
    checkOutDate: "2026-06-19",
    prompt: "Jun 12 to Jun 19, 2026",
  },
];

const SMARTBAR_BOOKING_GUEST_PRESETS: SmartBarBookingGuestPreset[] = [
  { id: "solo", label: "1 adult", helper: "Solo stay", adults: 1, children: 0 },
  { id: "couple", label: "2 adults", helper: "Two travelers", adults: 2, children: 0 },
  { id: "family-3", label: "2 adults + 1 child", helper: "Family fit", adults: 2, children: 1 },
  { id: "family-4", label: "2 adults + 2 children", helper: "Sleeps 4", adults: 2, children: 2 },
];

function promptDateRangeFromIso(checkInDate?: string | null, checkOutDate?: string | null) {
  if (!checkInDate || !checkOutDate) return "";

  const start = new Date(`${checkInDate}T00:00:00`);
  const end = new Date(`${checkOutDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startLabel} to ${endLabel}, ${end.getFullYear()}`;
}

function SmartBarBookingContextSelectors({
  missingDates,
  missingGuests,
  initialDraft,
  onSelectDates,
  onSelectGuests,
}: {
  missingDates: boolean;
  missingGuests: boolean;
  initialDraft: SmartBarBookingContextDraft;
  onSelectDates: (preset: SmartBarBookingDatePreset) => void;
  onSelectGuests: (preset: SmartBarBookingGuestPreset) => void;
}) {
  const [selectedDateId, setSelectedDateId] = useState(() => {
    const matching = SMARTBAR_BOOKING_DATE_PRESETS.find(
      (preset) =>
        preset.checkInDate === initialDraft.checkInDate &&
        preset.checkOutDate === initialDraft.checkOutDate,
    );
    return matching?.id || "";
  });
  const [selectedGuestId, setSelectedGuestId] = useState(() => {
    const matching = SMARTBAR_BOOKING_GUEST_PRESETS.find(
      (preset) =>
        preset.adults === initialDraft.guestAdults &&
        preset.children === initialDraft.guestChildren,
    );
    return matching?.id || "";
  });
  const [localSummary, setLocalSummary] = useState({
    datesLabel: initialDraft.datesLabel,
    guestLabel: initialDraft.guestLabel,
  });

  const chooseDates = (preset: SmartBarBookingDatePreset) => {
    setSelectedDateId(preset.id);
    setLocalSummary((current) => ({ ...current, datesLabel: preset.label }));
    onSelectDates(preset);
  };

  const chooseGuests = (preset: SmartBarBookingGuestPreset) => {
    setSelectedGuestId(preset.id);
    setLocalSummary((current) => ({ ...current, guestLabel: preset.label }));
    onSelectGuests(preset);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-white/20 bg-slate-950/86 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(2,6,23,0.24)] ring-1 ring-white/14">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-100/82">
          Trip details needed
        </div>
        <div className="mt-1 text-[15px] font-bold leading-5 text-white/92">
          Add the missing stay fields, then continue the same request.
        </div>
      </div>

      {missingDates && (
        <div className="rounded-[24px] border border-white/18 bg-slate-950/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/68">Dates</span>
            <span className="rounded-full bg-sky-200/92 px-2.5 py-1 text-[11px] font-black text-slate-950">
              {localSummary.datesLabel || "Select"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SMARTBAR_BOOKING_DATE_PRESETS.map((preset) => {
              const active = selectedDateId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => chooseDates(preset)}
                  className={active
                    ? "min-h-[62px] rounded-[20px] bg-sky-200/95 px-2 py-2 text-center text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_8px_18px_rgba(14,165,233,0.20)] ring-1 ring-sky-100/44"
                    : "min-h-[62px] rounded-[20px] border border-white/14 bg-white/[0.08] px-2 py-2 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/8"}
                >
                  <span className="block text-[13px] font-black leading-4">{preset.label}</span>
                  <span className="mt-1 block text-[11px] font-semibold opacity-72">{preset.helper}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {missingGuests && (
        <div className="rounded-[24px] border border-white/18 bg-slate-950/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/68">Guests</span>
            <span className="rounded-full bg-emerald-300/92 px-2.5 py-1 text-[11px] font-black text-slate-950">
              {localSummary.guestLabel || "Select"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SMARTBAR_BOOKING_GUEST_PRESETS.map((preset) => {
              const active = selectedGuestId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => chooseGuests(preset)}
                  className={active
                    ? "min-h-[58px] rounded-[20px] bg-emerald-300/92 px-3 py-2 text-left text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/38"
                    : "min-h-[58px] rounded-[20px] border border-white/14 bg-white/[0.08] px-3 py-2 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/8"}
                >
                  <span className="block text-[13px] font-black leading-4">{preset.label}</span>
                  <span className="mt-1 block text-[11px] font-semibold opacity-72">{preset.helper}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  const pendingBookingQueryRef = useRef("");
  const bookingContextDraftRef = useRef<SmartBarBookingContextDraft>({
    datesSelected: site.datesSelected,
    checkInDate: site.checkInDate || "",
    checkOutDate: site.checkOutDate || "",
    datesLabel: site.datesSelected ? site.formatDateRange(site.checkInDate, site.checkOutDate) : "",
    datesPrompt: promptDateRangeFromIso(site.checkInDate, site.checkOutDate),
    guestsSelected: site.guestsSelected,
    guestAdults: site.guestAdults || 1,
    guestChildren: site.guestChildren || 0,
    guestLabel: site.guestsSelected ? site.guestLabelFromCounts(site.guestAdults || 1, site.guestChildren || 0) : "",
  });
  const navigationStateRef = useRef<SmartBarBookingNavigationState | null>(null);
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

  const selectorDraftFromSite = (): SmartBarBookingContextDraft => {
    const current = bookingContextDraftRef.current;
    const hasSiteDates = Boolean(site.datesSelected && site.checkInDate && site.checkOutDate);
    const hasSiteGuests = Boolean(site.guestsSelected);

    return {
      ...current,
      datesSelected: hasSiteDates || current.datesSelected,
      checkInDate: hasSiteDates ? site.checkInDate : current.checkInDate,
      checkOutDate: hasSiteDates ? site.checkOutDate : current.checkOutDate,
      datesLabel: hasSiteDates ? site.formatDateRange(site.checkInDate, site.checkOutDate) : current.datesLabel,
      datesPrompt: hasSiteDates ? promptDateRangeFromIso(site.checkInDate, site.checkOutDate) : current.datesPrompt,
      guestsSelected: hasSiteGuests || current.guestsSelected,
      guestAdults: hasSiteGuests ? site.guestAdults : current.guestAdults,
      guestChildren: hasSiteGuests ? site.guestChildren : current.guestChildren,
      guestLabel: hasSiteGuests ? site.guestLabelFromCounts(site.guestAdults, site.guestChildren) : current.guestLabel,
    };
  };

  const selectBookingDates = (preset: SmartBarBookingDatePreset) => {
    const datesLabel = site.formatDateRange(preset.checkInDate, preset.checkOutDate);
    bookingContextDraftRef.current = {
      ...bookingContextDraftRef.current,
      datesSelected: true,
      checkInDate: preset.checkInDate,
      checkOutDate: preset.checkOutDate,
      datesLabel,
      datesPrompt: preset.prompt,
    };
    site.setCheckInDate(preset.checkInDate);
    site.setCheckOutDate(preset.checkOutDate);
    site.setDatesSelected(true);
    site.setActiveFormSpotlight?.(null);
  };

  const selectBookingGuests = (preset: SmartBarBookingGuestPreset) => {
    const guestLabel = site.guestLabelFromCounts(preset.adults, preset.children);
    bookingContextDraftRef.current = {
      ...bookingContextDraftRef.current,
      guestsSelected: true,
      guestAdults: preset.adults,
      guestChildren: preset.children,
      guestLabel,
    };
    site.setGuestAdults(preset.adults);
    site.setGuestChildren(preset.children);
    site.setGuestLabel(guestLabel);
    site.setGuestsSelected(true);
    site.setActiveFormSpotlight?.(null);
  };

  const syncPromptContextToDraft = (promptContext: TourBarBookingContext) => {
    if (promptContext.datesSelected && promptContext.checkInDate && promptContext.checkOutDate) {
      bookingContextDraftRef.current = {
        ...bookingContextDraftRef.current,
        datesSelected: true,
        checkInDate: String(promptContext.checkInDate),
        checkOutDate: String(promptContext.checkOutDate),
        datesLabel: promptContext.datesLabel || site.formatDateRange(String(promptContext.checkInDate), String(promptContext.checkOutDate)),
        datesPrompt: promptDateRangeFromIso(promptContext.checkInDate, promptContext.checkOutDate),
      };
    }

    if (promptContext.guestsSelected) {
      const adults = Math.max(1, Number(promptContext.guestAdults ?? promptContext.adults ?? 1));
      const children = Math.max(0, Number(promptContext.guestChildren ?? promptContext.children ?? 0));
      bookingContextDraftRef.current = {
        ...bookingContextDraftRef.current,
        guestsSelected: true,
        guestAdults: adults,
        guestChildren: children,
        guestLabel: promptContext.guestLabel || site.guestLabelFromCounts(adults, children),
      };
    }
  };

  const buildBookingContextSelectorResult = (
    pendingQuery: string,
    missingDates: boolean,
    missingGuests: boolean,
  ): SmartBarMobileGenericResult => {
    pendingBookingQueryRef.current = pendingQuery;
    const initialDraft = selectorDraftFromSite();

    return {
      surfaceKind: "booking_tour",
      eyebrow: "Domi stay planner",
      title: missingDates && missingGuests
        ? "Add trip details"
        : missingDates
          ? "Select stay dates"
          : "Add guests",
      helper: "Pick the missing booking fields, then continue the same request.",
      statusLabel: "Trip details",
      actions: [
        {
          id: "booking-context-continue",
          label: "Continue search",
          helper: "Resume the original request",
          variant: "primary",
        },
      ],
      height: missingDates && missingGuests ? 520 : 420,
      content: (
        <SmartBarBookingContextSelectors
          missingDates={missingDates}
          missingGuests={missingGuests}
          initialDraft={initialDraft}
          onSelectDates={selectBookingDates}
          onSelectGuests={selectBookingGuests}
        />
      ),
    };
  };

  const resumeBookingContextQuery = (): Promise<SmartBarMobileSubmitResult> | SmartBarMobileSubmitResult => {
    const pendingQuery = pendingBookingQueryRef.current || "show booking options";
    const draft = selectorDraftFromSite();
    const hasDates = Boolean(draft.datesSelected && draft.checkInDate && draft.checkOutDate);
    const hasGuests = Boolean(draft.guestsSelected && draft.guestAdults >= 1);

    if (!hasDates || !hasGuests) {
      return buildBookingContextSelectorResult(pendingQuery, !hasDates, !hasGuests);
    }

    const datePrompt = draft.datesPrompt || promptDateRangeFromIso(draft.checkInDate, draft.checkOutDate);
    const guestPrompt = draft.guestLabel ? `for ${draft.guestLabel}` : "";
    const resumedQuery = [pendingQuery, datePrompt, guestPrompt]
      .filter((part) => String(part || "").trim().length > 0)
      .join(" ");

    return submitBookingQuery(resumedQuery);
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
          scrollBehavior: "smooth",
          overlayDurationMs: 4600,
          dispatchLegacyEvent: false,
        },
      );
    }, delay);
  };

  const focusNavigationStep = (
    state: SmartBarBookingNavigationState,
    nextIndex: number,
    delay = 180,
  ) => {
    if (!state.steps.length) return state;

    const activeIndex = Math.min(Math.max(nextIndex, 0), state.steps.length - 1);
    const step = state.steps[activeIndex];
    const nextState = { ...state, activeIndex };
    navigationStateRef.current = nextState;

    navigationRunRef.current += 1;
    updateWorkingStayFromTarget(step);

    const pageId = step.pageId || pageIdFromTarget(step.targetId);
    site.setCurrentPage(pageId);
    spotlightAnchor(step.targetId, step.targetSelector, delay);

    return nextState;
  };

  const focusResult = (raw: TourBarBookingRawResponse) => {
    const target = primaryTargetFromRaw(raw);

    applyBookingContext(raw);

    if (target.isBookingAction && isExplicitTourBarBookingRequest(raw)) {
      navigationStateRef.current = null;
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
      focusNavigationStep({ steps: navigationTargets, activeIndex: 0 }, 0, 520);
      return;
    }

    if (!target.targetId && !target.targetSelector) {
      navigationStateRef.current = null;
      return;
    }

    navigationStateRef.current = null;
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

  const navigationActionsForRaw = (_raw: TourBarBookingRawResponse): SmartBarMobileGenericAction[] => {
    const state = navigationStateRef.current;
    if (!state || state.steps.length < 2) return [];

    const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
    const isFirst = activeIndex <= 0;
    const isLast = activeIndex >= state.steps.length - 1;
    const currentLabel = state.steps[activeIndex]?.targetText || state.steps[activeIndex]?.targetId || "stay option";
    const nextLabel = !isLast
      ? state.steps[activeIndex + 1]?.targetText || state.steps[activeIndex + 1]?.targetId || "next option"
      : currentLabel;

    return [
      {
        id: "booking-nav-back",
        label: "Back",
        helper: `Stop ${activeIndex + 1} of ${state.steps.length}`,
        variant: "back",
        disabled: isFirst,
      },
      {
        id: "booking-nav-next",
        label: "Next",
        helper: isLast ? `Stop ${activeIndex + 1} of ${state.steps.length}` : compactText(nextLabel).slice(0, 28),
        variant: "next",
        disabled: isLast,
      },
    ];
  };

  const actionsForRaw = (raw: TourBarBookingRawResponse): SmartBarMobileGenericAction[] => {
    const actions: SmartBarMobileGenericAction[] = [];
    const shellResult = buildTourBarBookingShellResult(raw, primaryTargetFromRaw(raw), {
      mode: TOURBAR_HOTEL_BOOKING_MODE,
    });
    const nextLabel = shellResult.nextMove?.label || shellResult.invitation?.text || "";
    const nextQuery = shellResult.nextMove?.query || shellResult.nextMove?.label || shellResult.invitation?.text || "";

    actionQueriesRef.current = {};
    actions.push(...navigationActionsForRaw(raw));

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
          <div className="rounded-[24px] border border-white/22 bg-slate-950/88 px-4 py-3 text-[15px] font-semibold leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(2,6,23,0.26)] ring-1 ring-white/14 [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">
            {renderInlineEmphasis(body)}
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-[24px] border border-white/20 bg-slate-950/84 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(2,6,23,0.24)] ring-1 ring-white/14">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-white/14 px-4 py-3 last:border-b-0">
                <span className="text-white/70">{label}</span>
                <strong className="max-w-[62%] text-right text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">{value}</strong>
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
      600,
      Math.max(summary ? 380 : actions.length ? 320 : 260, 72 + estimatedLines * 26 + actions.length * 66 + (summary ? 190 : 0)),
    );
    const navigates = resultHasNavigation(raw);
    const navigationState = navigationStateRef.current;
    const guidedProgress = navigationState && navigationState.steps.length > 1
      ? {
          current: Math.min(Math.max(navigationState.activeIndex, 0), navigationState.steps.length - 1) + 1,
          total: navigationState.steps.length,
        }
      : null;

    return {
      surfaceKind: summary ? "booking_summary" : "booking_tour",
      eyebrow: summary ? "Booking preload" : "Domi stay match",
      title: shellResult.title || "Domi booking match",
      helper: summary
        ? "SmartBar carried the room, add-ons, dates, and guests into a booking-ready summary."
        : navigates
          ? "SmartBar opened the matching stay option on the site."
          : "Refine this stay or ask SmartBar for another option.",
      statusLabel: guidedProgress ? `Stop ${guidedProgress.current}/${guidedProgress.total}` : summary ? "Ready" : navigates ? "Spotlight" : "Match ready",
      actions,
      progressLabel: guidedProgress ? "Guided stops" : undefined,
      progressCurrent: guidedProgress?.current,
      progressTotal: guidedProgress?.total,
      height: estimatedHeight,
      content: contentForRaw(raw, summary),
      navigationRevealDelayMs: navigates ? 3000 : undefined,
      navigationRevealLabel: navigates ? "Spotlighting..." : undefined,
    };
  };

  const submitBookingQuery = async (query: string): Promise<SmartBarMobileSubmitResult> => {
    const promptContext = mergePromptContext(query);
    syncPromptContextToDraft(promptContext);

    const draft = selectorDraftFromSite();
    const hasDates = Boolean(promptContext.datesSelected || site.datesSelected || draft.datesSelected);
    const hasGuests = Boolean(promptContext.guestsSelected || site.guestsSelected || draft.guestsSelected);

    if (!hasDates || !hasGuests) {
      navigationStateRef.current = null;
      return buildBookingContextSelectorResult(query, !hasDates, !hasGuests);
    }

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

    if (action.id === "booking-context-continue") {
      return resumeBookingContextQuery();
    }

    if ((action.id === "booking-nav-back" || action.id === "booking-nav-next") && raw) {
      const state = navigationStateRef.current;
      if (state && state.steps.length > 1) {
        const nextIndex = action.id === "booking-nav-next"
          ? state.activeIndex + 1
          : state.activeIndex - 1;
        focusNavigationStep(state, nextIndex, 420);
        await wait(4200);
        return toGenericResult(raw);
      }

      return toGenericResult(raw);
    }

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
        pendingBookingQueryRef.current = "";
        bookingContextDraftRef.current = {
          datesSelected: false,
          checkInDate: "",
          checkOutDate: "",
          datesLabel: "",
          datesPrompt: "",
          guestsSelected: false,
          guestAdults: 1,
          guestChildren: 0,
          guestLabel: "",
        };
        navigationStateRef.current = null;
      }}
    />
  );
}
