import React, { useMemo, useState } from "react";

export type TourBarRequiredBookingField = "dates" | "guests";
export type TourBarDatePickerKind = "check-in" | "check-out" | null;
export type TourBarCalendarMonth = { year: number; monthIndex: number };

export type TourBarBookingContext = {
  datesSelected?: boolean;
  guestsSelected?: boolean;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  datesLabel?: string | null;
  nights?: number | null;
  guestAdults?: number | null;
  guestChildren?: number | null;
  adults?: number | null;
  children?: number | null;
  guests?: number | null;
  guestLabel?: string | null;
  budgetBand?: string | null;
};

type TourBarParsedDates = {
  checkInDate: string;
  checkOutDate: string;
  datesLabel: string;
};

type TourBarParsedGuests = {
  adults: number;
  children: number;
  guests: number;
  guestLabel: string;
};

export type TourBarCollectionResultLike = {
  title: string;
  body?: string;
  canFollowUp?: boolean;
  answerMode?: string;
  mode?: string;
  action?: string;
  label?: string;
  raw?: unknown;
};

const DEFAULT_BOOKING_YEAR = 2026;
const DEFAULT_CALENDAR_MONTH: TourBarCalendarMonth = { year: 2026, monthIndex: 5 };
const MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function numberFromText(value?: string | null) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;

  const direct = Number(text);
  if (Number.isFinite(direct) && direct >= 0) return Math.floor(direct);

  return NUMBER_WORDS[text] ?? null;
}

function yearFromText(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_BOOKING_YEAR;

  const year = Number(raw);
  if (!Number.isFinite(year)) return DEFAULT_BOOKING_YEAR;
  if (year < 100) return 2000 + year;
  return year;
}

function isoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthIndex(value?: string | null) {
  const key = String(value || "").trim().toLowerCase();
  return MONTH_NAMES[key] ?? null;
}

export function tourBarBookingNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return null;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return nights > 0 ? nights : null;
}

export function formatTourBarBookingDate(value?: string | null) {
  if (!value) return "Select date";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Select date";

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTourBarDateRange(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return "Required";
  const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
  const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);
  const start = new Date(inYear, inMonth - 1, inDay);
  const end = new Date(outYear, outMonth - 1, outDay);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel}–${endLabel}`;
}

export function tourBarGuestLabel(adults: number, children: number) {
  const safeAdults = Math.max(1, Math.floor(adults || 1));
  const safeChildren = Math.max(0, Math.floor(children || 0));
  const adultsLabel = `${safeAdults} adult${safeAdults === 1 ? "" : "s"}`;
  const childrenLabel =
    safeChildren > 0 ? `, ${safeChildren} child${safeChildren === 1 ? "" : "ren"}` : "";
  return `${adultsLabel}${childrenLabel}`;
}

export function normalizeTourBarBookingContext(
  context: TourBarBookingContext = {},
): TourBarBookingContext {
  const guestAdults = Math.max(
    1,
    Math.floor(Number(context.guestAdults ?? context.adults ?? 1) || 1),
  );
  const guestChildren = Math.max(
    0,
    Math.floor(Number(context.guestChildren ?? context.children ?? 0) || 0),
  );
  const datesSelected = Boolean(
    context.datesSelected &&
      context.checkInDate &&
      context.checkOutDate &&
      context.checkOutDate > context.checkInDate,
  );
  const guestsSelected = Boolean(context.guestsSelected && guestAdults >= 1);
  const checkInDate = String(context.checkInDate || "");
  const checkOutDate = String(context.checkOutDate || "");
  const guestLabel = context.guestLabel || tourBarGuestLabel(guestAdults, guestChildren);

  return {
    ...context,
    datesSelected,
    guestsSelected,
    checkInDate,
    checkOutDate,
    datesLabel: datesSelected ? formatTourBarDateRange(checkInDate, checkOutDate) : null,
    nights: datesSelected ? tourBarBookingNights(checkInDate, checkOutDate) : null,
    guestAdults,
    guestChildren,
    adults: guestsSelected ? guestAdults : null,
    children: guestsSelected ? guestChildren : null,
    guests: guestsSelected ? guestAdults + guestChildren : null,
    guestLabel: guestsSelected ? guestLabel : null,
  };
}

export function extractTourBarDatesFromPrompt(prompt: string): TourBarParsedDates | null {
  const text = String(prompt || "").replace(/[–—]/g, "-");
  const monthRange = new RegExp(
    `\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|through|thru|until)\\s*(?:(${MONTH_PATTERN})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}|\\d{2}))?`,
    "i",
  );
  const monthMatch = text.match(monthRange);

  if (monthMatch) {
    const startMonth = monthIndex(monthMatch[1]);
    const startDay = Number(monthMatch[2]);
    const endMonth = monthIndex(monthMatch[3]) ?? startMonth;
    const endDay = Number(monthMatch[4]);
    const year = yearFromText(monthMatch[5]);

    if (
      startMonth != null &&
      endMonth != null &&
      Number.isFinite(startDay) &&
      Number.isFinite(endDay)
    ) {
      const checkInDate = isoDate(year, startMonth, startDay);
      const checkOutYear = endMonth < startMonth ? year + 1 : year;
      const checkOutDate = isoDate(checkOutYear, endMonth, endDay);
      if (checkOutDate > checkInDate) {
        return {
          checkInDate,
          checkOutDate,
          datesLabel: formatTourBarDateRange(checkInDate, checkOutDate),
        };
      }
    }
  }

  const numericRange = text.match(
    /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\s*(?:-|to|through|thru|until)\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/i,
  );

  if (numericRange) {
    const startMonth = Number(numericRange[1]) - 1;
    const startDay = Number(numericRange[2]);
    const startYear = yearFromText(numericRange[3] || numericRange[6]);
    const endMonth = Number(numericRange[4]) - 1;
    const endDay = Number(numericRange[5]);
    const endYear = yearFromText(numericRange[6] || numericRange[3]);

    if (
      startMonth >= 0 &&
      startMonth <= 11 &&
      endMonth >= 0 &&
      endMonth <= 11 &&
      Number.isFinite(startDay) &&
      Number.isFinite(endDay)
    ) {
      const checkInDate = isoDate(startYear, startMonth, startDay);
      const checkOutDate = isoDate(endYear, endMonth, endDay);
      if (checkOutDate > checkInDate) {
        return {
          checkInDate,
          checkOutDate,
          datesLabel: formatTourBarDateRange(checkInDate, checkOutDate),
        };
      }
    }
  }

  return null;
}

export function extractTourBarGuestsFromPrompt(prompt: string): TourBarParsedGuests | null {
  const text = String(prompt || "").toLowerCase();
  const numberPattern = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)";

  if (/\b(just me|solo|only me|by myself|myself)\b/i.test(text)) {
    const guestLabel = tourBarGuestLabel(1, 0);
    return { adults: 1, children: 0, guests: 1, guestLabel };
  }

  const adultMatch = text.match(new RegExp(`\\b${numberPattern}\\s+adults?\\b`, "i"));
  const childMatch = text.match(new RegExp(`\\b${numberPattern}\\s+(?:children|child|kids?|kid)\\b`, "i"));
  const totalMatch = text.match(
    new RegExp(`\\b(?:for\\s+)?${numberPattern}\\s+(?:guests?|people|travelers?|travellers?)\\b`, "i"),
  );
  const familyMatch = text.match(new RegExp(`\\bfamily\\s+of\\s+${numberPattern}\\b`, "i"));

  const explicitAdults = numberFromText(adultMatch?.[1]);
  const explicitChildren = numberFromText(childMatch?.[1]);
  const explicitTotal = numberFromText(totalMatch?.[1] || familyMatch?.[1]);

  if (explicitAdults != null || explicitChildren != null) {
    const adults = Math.max(1, explicitAdults ?? Math.max(1, (explicitTotal || 1) - (explicitChildren || 0)));
    const children = Math.max(0, explicitChildren ?? 0);
    const guestLabel = tourBarGuestLabel(adults, children);
    return { adults, children, guests: adults + children, guestLabel };
  }

  if (explicitTotal != null && explicitTotal > 0) {
    const adults = Math.max(1, explicitTotal);
    const children = 0;
    const guestLabel = tourBarGuestLabel(adults, children);
    return { adults, children, guests: adults + children, guestLabel };
  }

  return null;
}

export function buildTourBarCollectionResult(
  field: TourBarRequiredBookingField,
  pendingQuery: string,
): TourBarCollectionResultLike {
  const isDates = field === "dates";

  return {
    title: isDates ? "Select your stay dates" : "Add guests for this stay",
    body: isDates
      ? "I need the travel dates before I can price and rank rooms. Choose check-in and check-out dates to continue."
      : "I need the guest count before I can filter rooms correctly. Add adults and children to continue.",
    canFollowUp: false,
    answerMode: `tourbar_collect_${field}`,
    mode: `tourbar_collect_${field}`,
    action: `tourbar_collect_${field}`,
    label: isDates ? "Dates required" : "Guests required",
    raw: {
      mode: `tourbar_collect_${field}`,
      action: `tourbar_collect_${field}`,
      requiredField: field,
      pendingQuery,
    },
  };
}

export function tourBarCollectionFieldFromResult(
  result?: TourBarCollectionResultLike | null,
): TourBarRequiredBookingField | null {
  const raw = asRecord(result?.raw);
  const field = String(raw.requiredField || result?.action || result?.mode || "");

  if (field.includes("dates")) return "dates";
  if (field.includes("guests")) return "guests";
  return null;
}

export function tourBarPendingQueryFromResult(result?: TourBarCollectionResultLike | null) {
  const raw = asRecord(result?.raw);
  return typeof raw.pendingQuery === "string" ? raw.pendingQuery : "";
}

export function useTourBarBookingContext() {
  const [context, setContext] = useState<TourBarBookingContext>(() =>
    normalizeTourBarBookingContext({
      datesSelected: false,
      guestsSelected: false,
      checkInDate: "",
      checkOutDate: "",
      guestAdults: 1,
      guestChildren: 0,
    }),
  );
  const [activeDatePicker, setActiveDatePicker] = useState<TourBarDatePickerKind>("check-in");
  const [calendarMonth, setCalendarMonth] = useState<TourBarCalendarMonth>(DEFAULT_CALENDAR_MONTH);

  const syncCalendarMonthToDate = (value?: string | null) => {
    if (!value) {
      setCalendarMonth(DEFAULT_CALENDAR_MONTH);
      return;
    }
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    setCalendarMonth({ year, monthIndex: month - 1 });
  };

  const openCollection = (field: TourBarRequiredBookingField) => {
    if (field === "dates") {
      setActiveDatePicker(context.checkInDate ? "check-out" : "check-in");
      syncCalendarMonthToDate(context.checkInDate || null);
      return;
    }

    setActiveDatePicker(null);
  };

  const setDraftContext = (next: TourBarBookingContext) => {
    const normalized = normalizeTourBarBookingContext(next);
    setContext(normalized);
    return normalized;
  };

  const prepareSubmission = (
    prompt: string,
    override?: TourBarBookingContext | null,
  ): { context: TourBarBookingContext; missingField: TourBarRequiredBookingField | null } => {
    let next = normalizeTourBarBookingContext({ ...context, ...(override || {}) });

    if (!next.datesSelected) {
      const parsedDates = extractTourBarDatesFromPrompt(prompt);
      if (parsedDates) {
        next = normalizeTourBarBookingContext({
          ...next,
          datesSelected: true,
          checkInDate: parsedDates.checkInDate,
          checkOutDate: parsedDates.checkOutDate,
          datesLabel: parsedDates.datesLabel,
        });
      }
    }

    if (!next.guestsSelected) {
      const parsedGuests = extractTourBarGuestsFromPrompt(prompt);
      if (parsedGuests) {
        next = normalizeTourBarBookingContext({
          ...next,
          guestsSelected: true,
          guestAdults: parsedGuests.adults,
          guestChildren: parsedGuests.children,
          guestLabel: parsedGuests.guestLabel,
        });
      }
    }

    setContext(next);

    if (!next.datesSelected) return { context: next, missingField: "dates" };
    if (!next.guestsSelected) return { context: next, missingField: "guests" };
    return { context: next, missingField: null };
  };

  const selectCalendarDate = (kind: Exclude<TourBarDatePickerKind, null>, value: string) => {
    if (kind === "check-in") {
      const next = normalizeTourBarBookingContext({
        ...context,
        datesSelected: false,
        checkInDate: value,
        checkOutDate: context.checkOutDate && context.checkOutDate > value ? context.checkOutDate : "",
        datesLabel: null,
      });
      setContext(next);
      setActiveDatePicker("check-out");
      syncCalendarMonthToDate(next.checkOutDate || value);
      return;
    }

    setContext(
      normalizeTourBarBookingContext({
        ...context,
        datesSelected: false,
        checkOutDate: value,
        datesLabel: null,
      }),
    );
    setActiveDatePicker(null);
  };

  const shiftCalendarMonth = (delta: number) => {
    setCalendarMonth((current) => {
      const next = new Date(current.year, current.monthIndex + delta, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
  };

  const openDatePicker = (kind: Exclude<TourBarDatePickerKind, null>) => {
    setActiveDatePicker(kind);
    syncCalendarMonthToDate(kind === "check-in" ? context.checkInDate : context.checkOutDate || context.checkInDate);
  };

  const commitDates = () => {
    if (!context.checkInDate || !context.checkOutDate || context.checkOutDate <= context.checkInDate) {
      return null;
    }
    const next = normalizeTourBarBookingContext({
      ...context,
      datesSelected: true,
      checkInDate: context.checkInDate,
      checkOutDate: context.checkOutDate,
      datesLabel: formatTourBarDateRange(context.checkInDate, context.checkOutDate),
    });
    setContext(next);
    setActiveDatePicker(null);
    return next;
  };

  const clearDates = () => {
    setContext(
      normalizeTourBarBookingContext({
        ...context,
        datesSelected: false,
        checkInDate: "",
        checkOutDate: "",
        datesLabel: null,
      }),
    );
    setActiveDatePicker("check-in");
    setCalendarMonth(DEFAULT_CALENDAR_MONTH);
  };

  const setGuestAdults = (value: number) => {
    setContext(
      normalizeTourBarBookingContext({
        ...context,
        guestsSelected: false,
        guestAdults: Math.max(1, Math.floor(value || 1)),
        guestLabel: null,
      }),
    );
  };

  const setGuestChildren = (value: number) => {
    setContext(
      normalizeTourBarBookingContext({
        ...context,
        guestsSelected: false,
        guestChildren: Math.max(0, Math.floor(value || 0)),
        guestLabel: null,
      }),
    );
  };

  const commitGuests = () => {
    const guestAdults = Math.max(1, Math.floor(Number(context.guestAdults ?? context.adults ?? 1) || 1));
    const guestChildren = Math.max(0, Math.floor(Number(context.guestChildren ?? context.children ?? 0) || 0));
    const next = normalizeTourBarBookingContext({
      ...context,
      guestsSelected: true,
      guestAdults,
      guestChildren,
      guestLabel: tourBarGuestLabel(guestAdults, guestChildren),
    });
    setContext(next);
    return next;
  };

  const clearGuests = () => {
    setContext(
      normalizeTourBarBookingContext({
        ...context,
        guestsSelected: false,
        guestAdults: 1,
        guestChildren: 0,
        guestLabel: null,
      }),
    );
  };

  return {
    context,
    setDraftContext,
    prepareSubmission,
    openCollection,
    activeDatePicker,
    calendarMonth,
    openDatePicker,
    selectCalendarDate,
    shiftCalendarMonth,
    commitDates,
    clearDates,
    setGuestAdults,
    setGuestChildren,
    commitGuests,
    clearGuests,
  };
}

export type TourBarBookingContextController = ReturnType<typeof useTourBarBookingContext>;

const h = React.createElement;

function DateCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const completed = Boolean(value);
  const className =
    "rounded-xl border px-3 py-2 text-left transition " +
    (completed
      ? `border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm ${active ? "ring-2 ring-emerald-200" : ""}`
      : active
        ? "border-slate-900 bg-white shadow-sm"
        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100");

  return h(
    "button",
    { type: "button", onClick, className },
    h("span", { className: completed ? "block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700" : "block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400" }, label),
    h("strong", { className: completed ? "mt-1 block text-xs text-emerald-950" : "mt-1 block text-xs text-slate-950" }, formatTourBarBookingDate(value)),
  );
}

export function TourBarBookingContextPanel({
  controller,
  field,
  pendingQuery,
  onResume,
}: {
  controller: TourBarBookingContextController;
  field: TourBarRequiredBookingField;
  pendingQuery: string;
  onResume: (pendingQuery: string, bookingContext: TourBarBookingContext) => void;
}) {
  const { context } = controller;
  const datesReady = Boolean(
    context.checkInDate && context.checkOutDate && context.checkOutDate > context.checkInDate,
  );
  const guestAdults = Math.max(1, Number(context.guestAdults ?? context.adults ?? 1));
  const guestChildren = Math.max(0, Number(context.guestChildren ?? context.children ?? 0));
  const guestLabel = tourBarGuestLabel(guestAdults, guestChildren);
  const monthName = useMemo(
    () =>
      new Date(controller.calendarMonth.year, controller.calendarMonth.monthIndex, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [controller.calendarMonth.monthIndex, controller.calendarMonth.year],
  );
  const firstDay = new Date(controller.calendarMonth.year, controller.calendarMonth.monthIndex, 1).getDay();
  const daysInMonth = new Date(controller.calendarMonth.year, controller.calendarMonth.monthIndex + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const selectedDate = controller.activeDatePicker === "check-in" ? context.checkInDate : context.checkOutDate;
  const isDates = field === "dates";

  return h(
    "div",
    {
      "data-tour-id": "tourbar-booking-context-controls",
      className: "rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-white/80",
    },
    h("div", { className: "flex items-start justify-between gap-3" },
      h("div", null,
        h("div", { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400" }, isDates ? "Dates required" : "Guests required"),
        h("div", { className: "mt-1 text-xs leading-4 text-slate-500" }, isDates ? "Choose check-in and check-out dates to continue." : "Confirm the adults and children for this stay."),
      ),
    ),
    isDates
      ? h(
          "div",
          { className: "mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" },
          h("div", { className: "grid grid-cols-2 gap-2" },
            h(DateCard, {
              label: "Check-in",
              value: context.checkInDate,
              active: controller.activeDatePicker === "check-in",
              onClick: () => controller.openDatePicker("check-in"),
            }),
            h(DateCard, {
              label: "Check-out",
              value: context.checkOutDate,
              active: controller.activeDatePicker === "check-out",
              onClick: () => controller.openDatePicker("check-out"),
            }),
          ),
          controller.activeDatePicker &&
            h(
              "div",
              { className: "rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" },
              h("div", { className: "mb-2 flex items-center justify-between gap-2" },
                h("div", null,
                  h("div", { className: "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400" }, controller.activeDatePicker === "check-in" ? "Check-in calendar" : "Check-out calendar"),
                  h("div", { className: "mt-0.5 text-xs font-semibold text-slate-950" }, monthName),
                ),
                h("div", { className: "flex items-center gap-1" },
                  h("button", { type: "button", onClick: () => controller.shiftCalendarMonth(-1), className: "rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100" }, "←"),
                  h("button", { type: "button", onClick: () => controller.shiftCalendarMonth(1), className: "rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100" }, "→"),
                ),
              ),
              h("div", { className: "grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-400" },
                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) =>
                  h("div", { key: day, className: "py-0.5" }, day),
                ),
              ),
              h("div", { className: "mt-1 grid grid-cols-7 gap-1" },
                ...blanks.map((_, index) => h("div", { key: `blank-${index}` })),
                ...days.map((day) => {
                  const value = `${controller.calendarMonth.year}-${String(controller.calendarMonth.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const disabled = Boolean(
                    controller.activeDatePicker === "check-out" && context.checkInDate && value <= context.checkInDate,
                  );
                  const isSelected = selectedDate === value;
                  const className =
                    "min-h-8 rounded-lg px-0 py-1 text-xs font-semibold transition " +
                    (isSelected
                      ? "bg-slate-950 text-white shadow-sm"
                      : disabled
                        ? "cursor-not-allowed bg-slate-50 text-slate-300"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100");
                  return h(
                    "button",
                    {
                      key: value,
                      type: "button",
                      disabled,
                      onClick: () => controller.activeDatePicker && controller.selectCalendarDate(controller.activeDatePicker, value),
                      className,
                    },
                    day,
                  );
                }),
              ),
            ),
          h("div", { className: "flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between" },
            h("div", { className: "text-xs leading-4 text-slate-500" },
              context.datesSelected
                ? `Saved: ${formatTourBarDateRange(context.checkInDate, context.checkOutDate)}`
                : datesReady
                  ? "Ready to save dates."
                  : "Choose a check-out date after check-in.",
            ),
            h("div", { className: "flex shrink-0 items-center gap-2" },
              context.datesSelected && h("button", { type: "button", onClick: controller.clearDates, className: "rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-rose-700" }, "Clear"),
              h("button", {
                type: "button",
                disabled: !datesReady,
                onClick: () => {
                  const next = controller.commitDates();
                  if (next) onResume(pendingQuery, next);
                },
                className: "rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45",
              }, "Apply dates"),
            ),
          ),
        )
      : h(
          "div",
          { className: "mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" },
          [
            { label: "Adults", value: guestAdults, min: 1, onChange: controller.setGuestAdults },
            { label: "Children", value: guestChildren, min: 0, onChange: controller.setGuestChildren },
          ].map((item) =>
            h("div", { key: item.label, className: "flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2" },
              h("div", null,
                h("div", { className: "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400" }, item.label),
                h("div", { className: "mt-0.5 text-sm font-semibold text-slate-950" }, item.value),
              ),
              h("div", { className: "flex items-center gap-2" },
                h("button", { type: "button", onClick: () => item.onChange(Math.max(item.min, item.value - 1)), className: "h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50" }, "−"),
                h("button", { type: "button", onClick: () => item.onChange(item.value + 1), className: "h-8 w-8 rounded-full bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800" }, "+"),
              ),
            ),
          ),
          h("div", { className: "flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between" },
            h("div", { className: "text-xs leading-4 text-slate-500" }, context.guestsSelected ? `Saved: ${guestLabel}` : `Ready to save ${guestLabel}.`),
            h("div", { className: "flex shrink-0 items-center gap-2" },
              context.guestsSelected && h("button", { type: "button", onClick: controller.clearGuests, className: "rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-rose-700" }, "Clear"),
              h("button", {
                type: "button",
                onClick: () => {
                  const next = controller.commitGuests();
                  onResume(pendingQuery, next);
                },
                className: "rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800",
              }, "Apply guests"),
            ),
          ),
        ),
  );
}

