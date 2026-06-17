import { useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
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
  demoFixtureMode?: boolean;
  demoSubmission?: SmartBarMobileDemoSubmission | null;
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

function renderInlineEmphasis(text: string, keyPrefix = "inline") {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

function renderSmartBarBookingFormattedText(text: string) {
  const blocks = String(text || "")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return null;

  return (
    <div className="space-y-2.5">
      {blocks.map((block, blockIndex) => {
        const lines = block.split(/\n+/g).map((line) => line.trim()).filter(Boolean);
        const bulletLines = lines.filter((line) => /^[-•]\s+/.test(line));

        if (bulletLines.length && bulletLines.length === lines.length) {
          return (
            <ul key={`booking-block-${blockIndex}`} className="space-y-1.5">
              {bulletLines.map((line, lineIndex) => {
                const cleanLine = line.replace(/^[-•]\s+/, "");

                return (
                  <li key={`booking-block-${blockIndex}-line-${lineIndex}`} className="flex gap-2">
                    <span className="mt-[0.32rem] text-white/56">•</span>
                    <span className="min-w-0 flex-1">
                      {renderInlineEmphasis(cleanLine, `booking-block-${blockIndex}-line-${lineIndex}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={`booking-block-${blockIndex}`}> 
            {lines.map((line, lineIndex) => (
              <span key={`booking-block-${blockIndex}-line-${lineIndex}`}>
                {renderInlineEmphasis(line, `booking-block-${blockIndex}-line-${lineIndex}`)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}


type SmartBarBookingStayBlockTone = "ready" | "pending" | "optional" | "neutral" | "accounting" | "choice" | "empty";

type SmartBarBookingStayBlock = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  tone: SmartBarBookingStayBlockTone;
  actionId?: string;
  actionLabel?: string;
  actionVariant?: "primary" | "secondary";
  removeActionId?: string;
  removeActionLabel?: string;
  trailingIcon?: "trash";
};

type SmartBarBookingStayCartProps = {
  responseBody?: string;
  essentials: SmartBarBookingStayBlock[];
  room: SmartBarBookingStayBlock;
  packages: SmartBarBookingStayBlock[];
  estimate: SmartBarBookingStayBlock;
  packagePanelOpen?: boolean;
  packageOptions?: SmartBarBookingStayBlock[];
  summary?: boolean;
};

type SmartBarBookingDemoWizardState = {
  roomAdded: boolean;
  packagesReviewed: boolean;
  packageIds: string[];
  breakfastRequested: boolean;
};

const SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID = "package-breakfast-flex";
const SMARTBAR_BOOKING_DEMO_PACKAGE_IDS = [
  "package-breakfast-flex",
  "package-resort-parking",
  "package-spa-credit",
];

const SMARTBAR_BOOKING_DEMO_PACKAGE_FALLBACK_META: Record<string, { title: string; price: string; signal: string }> = {
  "package-breakfast-flex": {
    title: "Breakfast Flex Plan",
    price: "+$32/night",
    signal: "Breakfast package for the active stay",
  },
  "package-resort-parking": {
    title: "Valet Parking",
    price: "+$24/night",
    signal: "Convenient arrival and daily in/out parking",
  },
  "package-spa-credit": {
    title: "Spa Credit",
    price: "+$45/night",
    signal: "Resort add-on for pool, spa, and relaxation stays",
  },
};

function smartBarBookingDemoPackageMeta(site: TourBarBookingSiteAdapter, packageId: string) {
  return site.getPackageMeta(packageId) || SMARTBAR_BOOKING_DEMO_PACKAGE_FALLBACK_META[packageId] || null;
}


function smartBarBookingStayBlockClass(tone: SmartBarBookingStayBlockTone) {
  if (tone === "empty") {
    return "border-transparent bg-transparent text-transparent shadow-none ring-transparent";
  }

  if (tone === "pending") {
    return "border-red-200/70 bg-red-500/92 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_rgba(127,29,29,0.24)] ring-red-100/28";
  }

  if (tone === "ready") {
    return "border-emerald-100/55 bg-emerald-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40),0_10px_22px_rgba(16,185,129,0.18)] ring-emerald-100/30";
  }

  if (tone === "optional") {
    return "border-amber-100/58 bg-amber-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_10px_22px_rgba(180,83,9,0.18)] ring-amber-100/30";
  }

  if (tone === "accounting") {
    return "border-blue-300/52 bg-blue-800/96 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_22px_rgba(30,64,175,0.26)] ring-blue-100/24";
  }

  if (tone === "choice") {
    return "border-slate-200/70 bg-white/94 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.70),0_10px_22px_rgba(15,23,42,0.16)] ring-white/46";
  }

  return "border-white/18 bg-slate-950/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_22px_rgba(2,6,23,0.18)] ring-white/12";
}

function SmartBarBookingStayBlockTile({ block, compact = false }: { block: SmartBarBookingStayBlock; compact?: boolean }) {
  if (block.tone === "empty") {
    return (
      <div
        className="min-h-[76px] rounded-[18px] border border-transparent bg-transparent"
        aria-hidden="true"
      />
    );
  }

  const className = [
    "min-w-0 rounded-[18px] border text-left ring-1 transition active:scale-[0.985]",
    block.removeActionId ? "relative overflow-hidden p-0" : "px-2.5 py-2",
    block.actionId ? "cursor-pointer hover:brightness-[1.04]" : "cursor-default",
    smartBarBookingStayBlockClass(block.tone),
  ].join(" ");

  const content = (
    <>
      <span className="block truncate text-[9px] font-black uppercase tracking-[0.11em] opacity-70">
        {block.label}
      </span>
      <span className={`${compact ? "text-[14px]" : "text-[15px]"} mt-0.5 block truncate font-black leading-4 tracking-[-0.02em]`}>
        {block.value}
      </span>
      {block.helper ? (
        <span className="mt-0.5 block truncate text-[10px] font-bold leading-3 opacity-68">
          {block.helper}
        </span>
      ) : null}
    </>
  );

  if (block.removeActionId) {
    return (
      <div className={className}>
        <button
          type="button"
          data-smartbar-mobile-content-action={block.actionId || "booking-focus-room"}
          data-smartbar-mobile-content-action-label={block.actionLabel || block.label}
          data-smartbar-mobile-content-action-variant={block.actionVariant || "secondary"}
          className="block w-full px-2.5 py-2 pr-12 text-left"
        >
          {content}
        </button>
        <button
          type="button"
          data-smartbar-mobile-content-action={block.removeActionId}
          data-smartbar-mobile-content-action-label={block.removeActionLabel || "Remove"}
          data-smartbar-mobile-content-action-variant="secondary"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/96 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_16px_rgba(2,6,23,0.28)] ring-1 ring-white/14 transition active:scale-[0.96]"
          aria-label={block.removeActionLabel || "Remove"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!block.actionId) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      data-smartbar-mobile-content-action={block.actionId}
      data-smartbar-mobile-content-action-label={block.actionLabel || block.label}
      data-smartbar-mobile-content-action-variant={block.actionVariant || "primary"}
      className={className}
    >
      {content}
    </button>
  );
}

function SmartBarBookingStayCart({
  responseBody,
  essentials,
  room,
  packages,
  estimate,
  packagePanelOpen = false,
  packageOptions = [],
  summary = false,
}: SmartBarBookingStayCartProps) {
  if (summary) {
    const checkIn = essentials.find((block) => block.id === "stay-check-in")?.value || "Missing";
    const checkOut = essentials.find((block) => block.id === "stay-checkout")?.value || "Missing";
    const guests = (essentials.find((block) => block.id === "stay-guests")?.value || "Missing").replace(/\s*·\s*/g, ", ");
    const selectedPackages = packages.filter((block) => block.tone !== "empty" && block.tone === "ready");
    const addOns = selectedPackages.length && !/reviewed/i.test(selectedPackages[0]?.value || "")
      ? selectedPackages.map((block) => block.value).join(", ")
      : "No package selected";
    const dates = checkIn !== "Missing" && checkOut !== "Missing" ? `${checkIn} to ${checkOut}, 2026` : "Dates needed";
    const summaryRows = [
      ["Room", room.value || "Selected room"],
      ["Add-ons", addOns],
      ["Dates", dates],
      ["Guests", guests],
      ["Estimate", estimate.value || "Rate ready"],
    ];

    return (
      <div className="rounded-[28px] border border-white/18 bg-slate-950/74 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/12">
        <div className="mb-2 rounded-[22px] border border-white/16 bg-slate-950/88 px-4 py-3 text-[13px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10">
          Booking summary
        </div>
        <div className="overflow-hidden rounded-[24px] border border-white/14 bg-slate-950/84 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10">
          {summaryRows.map(([label, value]) => {
            const editActionId = label === "Dates" ? "booking-edit-dates" : label === "Guests" ? "booking-edit-guests" : "";
            const rowClass = "flex w-full items-center justify-between gap-3 border-b border-white/12 px-4 py-3 text-left last:border-b-0";
            const labelNode = (
              <span className="flex items-center gap-1.5 text-white/72">
                {label}
                {editActionId ? (
                  <span className="rounded-full bg-sky-200/18 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-sky-100/86 ring-1 ring-sky-100/14">Edit</span>
                ) : null}
              </span>
            );
            const valueNode = <strong className="max-w-[62%] text-right text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">{value}</strong>;

            if (editActionId) {
              return (
                <button
                  key={label}
                  type="button"
                  data-smartbar-mobile-content-action={editActionId}
                  data-smartbar-mobile-content-action-label={`Edit ${label.toLowerCase()}`}
                  className={`${rowClass} transition hover:bg-white/[0.04] active:bg-white/[0.07]`}
                >
                  {labelNode}
                  {valueNode}
                </button>
              );
            }

            return <div key={label} className={rowClass}>{labelNode}{valueNode}</div>;
          })}
        </div>
      </div>
    );
  }

  if (packagePanelOpen) {
    return (
      <div className="rounded-[26px] border border-white/18 bg-slate-950/82 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/12">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/78">Packages</div>
            <div className="mt-0.5 text-[14px] font-black leading-4 text-white">Review available add-ons</div>
          </div>
          <div className="rounded-full bg-amber-300/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-950">Multi-select</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {packageOptions.map((block) => (
            <SmartBarBookingStayBlockTile key={block.id} block={block} />
          ))}
        </div>
        <div className="mt-3 rounded-[18px] border border-white/14 bg-white/[0.08] px-3 py-2 text-[12px] font-semibold leading-4 text-white/72 ring-1 ring-white/8">
          Leave selected packages on. Use the footer when done.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {responseBody ? (
        <div className="rounded-[24px] border border-white/22 bg-slate-950/88 px-4 py-3 text-[14px] font-normal leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(2,6,23,0.26)] ring-1 ring-white/14 [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">
          {renderSmartBarBookingFormattedText(responseBody)}
        </div>
      ) : null}

      <div className="rounded-[26px] border border-white/18 bg-slate-950/72 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/12">
        <div className="mb-2">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/74">Stay cart</div>
        </div>

        <div className="grid grid-cols-[0.72fr_0.72fr_1.34fr] gap-1.5">
          {essentials.map((block) => (
            <SmartBarBookingStayBlockTile key={block.id} block={block} compact />
          ))}
        </div>

        <div className="mt-2 grid grid-cols-1 gap-1.5">
          <SmartBarBookingStayBlockTile block={room} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {packages.map((block) => (
            <SmartBarBookingStayBlockTile key={block.id} block={block} />
          ))}
          <SmartBarBookingStayBlockTile block={estimate} />
        </div>
      </div>
    </div>
  );
}

type SmartBarBookingDatePreset = {
  checkInDate: string;
  checkOutDate: string;
  prompt: string;
};

type SmartBarBookingGuestPreset = {
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

type SmartBarBookingSelectorStage = "dates" | "guests";

const SMARTBAR_BOOKING_SELECTOR_YEAR = 2026;
const SMARTBAR_BOOKING_SELECTOR_START_MONTH = 5; // June 2026

function isoDateFromParts(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateFromIso(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function dayNumberFromIso(value: string) {
  return Number(value.slice(-2));
}

function calendarCells(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(isoDateFromParts(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function promptDateRangeFromIso(checkInDate?: string | null, checkOutDate?: string | null) {
  const start = dateFromIso(checkInDate);
  const end = dateFromIso(checkOutDate);

  if (!start || !end) return "";

  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startLabel} to ${endLabel}, ${end.getFullYear()}`;
}

function compactCalendarDateLabel(value?: string | null) {
  const date = dateFromIso(value);

  if (!date) return "Select";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function normalizeSmartBarSummaryLabel(value?: string | null) {
  return compactText(value)
    .replace(/\u00e2(?:\u0080|\u20ac)(?:\u0093|\u0094|\u201c|\u009d)/g, " - ")
    .replace(/[–—]/g, " - ")
    .replace(/\s+-\s+/g, " - ");
}

function smartBarSummaryDateRange(checkInDate?: string | null, checkOutDate?: string | null, fallback?: string | null) {
  const start = dateFromIso(checkInDate);
  const end = dateFromIso(checkOutDate);

  if (!start || !end) return normalizeSmartBarSummaryLabel(fallback || "");

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

  return `${startLabel} to ${endLabel}`;
}

function dateButtonState(value: string, checkInDate: string, checkOutDate: string) {
  const isStart = value === checkInDate;
  const isEnd = value === checkOutDate;
  const inRange = Boolean(checkInDate && checkOutDate && value > checkInDate && value < checkOutDate);

  if (isStart || isEnd) return "selected";
  if (inRange) return "range";
  return "plain";
}

function SmartBarBookingCounterRow({
  label,
  helper,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));
  const buttonClass =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/12 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/14 bg-white/[0.08] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/8">
      <div className="min-w-0">
        <div className="text-[13px] font-black leading-4 text-white">{label}</div>
        <div className="mt-0.5 text-[11px] font-semibold leading-4 text-white/58">{helper}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          data-tourbar-guest-control={`${label.toLowerCase().startsWith("adult") ? "adults" : "children"}-decrement`}
          onClick={decrease}
          disabled={value <= min}
          className={buttonClass}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <div className="flex h-10 min-w-[46px] items-center justify-center rounded-full bg-emerald-300/92 px-3 text-[16px] font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-emerald-100/34">
          {value}
        </div>
        <button
          type="button"
          data-tourbar-guest-control={`${label.toLowerCase().startsWith("adult") ? "adults" : "children"}-increment`}
          onClick={increase}
          disabled={value >= max}
          className={buttonClass}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
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
  const initialStage: SmartBarBookingSelectorStage = missingDates ? "dates" : "guests";
  const initialCalendarDate =
    (!missingDates && dateFromIso(initialDraft.checkInDate)) ||
    new Date(SMARTBAR_BOOKING_SELECTOR_YEAR, SMARTBAR_BOOKING_SELECTOR_START_MONTH, 1);
  const [stage, setStage] = useState<SmartBarBookingSelectorStage>(initialStage);
  const [calendarMonth, setCalendarMonth] = useState({
    year: initialCalendarDate.getFullYear(),
    monthIndex: initialCalendarDate.getMonth(),
  });
  const [dateDraft, setDateDraft] = useState({
    checkInDate: initialDraft.checkInDate || "",
    checkOutDate: initialDraft.checkOutDate || "",
  });
  const [guestCounts, setGuestCounts] = useState({
    adults: Math.max(1, Math.floor(initialDraft.guestAdults || 1)),
    children: Math.max(0, Math.floor(initialDraft.guestChildren || 0)),
  });
  const initializedGuestSelectionRef = useRef(false);

  const datesComplete = Boolean(dateDraft.checkInDate && dateDraft.checkOutDate);
  const guestLabel = `${guestCounts.adults} adult${guestCounts.adults === 1 ? "" : "s"}${
    guestCounts.children > 0 ? `, ${guestCounts.children} child${guestCounts.children === 1 ? "" : "ren"}` : ""
  }`;

  useEffect(() => {
    if (stage !== "guests" || !missingGuests || initializedGuestSelectionRef.current) return;

    initializedGuestSelectionRef.current = true;
    onSelectGuests({
      adults: guestCounts.adults,
      children: guestCounts.children,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, missingGuests]);

  const shiftMonth = (delta: number) => {
    setCalendarMonth((current) => {
      const next = new Date(current.year, current.monthIndex + delta, 1);
      return {
        year: next.getFullYear(),
        monthIndex: next.getMonth(),
      };
    });
  };

  const selectDate = (value: string) => {
    if (!dateDraft.checkInDate || dateDraft.checkOutDate || value <= dateDraft.checkInDate) {
      setDateDraft({
        checkInDate: value,
        checkOutDate: "",
      });
      return;
    }

    const next = {
      checkInDate: dateDraft.checkInDate,
      checkOutDate: value,
    };

    setDateDraft(next);
    onSelectDates({
      checkInDate: next.checkInDate,
      checkOutDate: next.checkOutDate,
      prompt: promptDateRangeFromIso(next.checkInDate, next.checkOutDate),
    });

    if (missingGuests) {
      setStage("guests");
    }
  };

  const updateGuestCounts = (next: { adults: number; children: number }) => {
    const safeNext = {
      adults: Math.max(1, Math.min(6, Math.floor(next.adults || 1))),
      children: Math.max(0, Math.min(6, Math.floor(next.children || 0))),
    };

    setGuestCounts(safeNext);
    initializedGuestSelectionRef.current = true;
    onSelectGuests(safeNext);
  };

  const renderCalendar = () => {
    const cells = calendarCells(calendarMonth.year, calendarMonth.monthIndex);

    return (
      <div className="rounded-[22px] border border-white/18 bg-slate-950/80 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-black text-white ring-1 ring-white/12"
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/62">
              {dateDraft.checkInDate && !dateDraft.checkOutDate ? "Select check-out" : "Select check-in"}
            </div>
            <div className="mt-0.5 text-[14px] font-black leading-4 text-white">
              {monthLabel(calendarMonth.year, calendarMonth.monthIndex)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base font-black text-white ring-1 ring-white/12"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="mb-1.5 grid grid-cols-2 gap-2">
          <div className="rounded-[16px] bg-sky-200/92 px-3 py-1.5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-sky-100/34">
            <div className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">Check-in</div>
            <div className="mt-0.5 text-[13px] font-black leading-4">{compactCalendarDateLabel(dateDraft.checkInDate)}</div>
          </div>
          <div className="rounded-[16px] bg-sky-200/70 px-3 py-1.5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.30)] ring-1 ring-sky-100/24">
            <div className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">Check-out</div>
            <div className="mt-0.5 text-[13px] font-black leading-4">{compactCalendarDateLabel(dateDraft.checkOutDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-[0.06em] text-white/44">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={`${day}-${index}`} className="py-0.5">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((value, index) => {
            if (!value) return <div key={`empty-${index}`} className="h-8" />;

            const state = dateButtonState(value, dateDraft.checkInDate, dateDraft.checkOutDate);
            const className =
              state === "selected"
                ? "h-8 rounded-full bg-sky-200 text-[13px] font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_6px_14px_rgba(14,165,233,0.20)] ring-1 ring-sky-100/40"
                : state === "range"
                  ? "h-8 rounded-full bg-sky-200/34 text-[13px] font-black text-white ring-1 ring-sky-100/16"
                  : "h-8 rounded-full bg-white/[0.07] text-[13px] font-black text-white ring-1 ring-white/8";

            return (
              <button
                key={value}
                type="button"
                onClick={() => selectDate(value)}
                className={className}
                aria-label={`Select ${value}`}
                data-tourbar-calendar-date={value}
              >
                {dayNumberFromIso(value)}
              </button>
            );
          })}
        </div>

        {datesComplete && missingGuests && (
          <button
            type="button"
            data-tourbar-booking-apply="dates"
            onClick={() => setStage("guests")}
            className="mt-3 flex w-full items-center justify-center rounded-full bg-emerald-300/92 px-4 py-3 text-sm font-black text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/34"
          >
            Continue to guests
          </button>
        )}
      </div>
    );
  };

  const renderGuests = () => (
    <div className="rounded-[24px] border border-white/18 bg-slate-950/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/12">
      {missingDates && (
        <button
          type="button"
          onClick={() => setStage("dates")}
          className="mb-3 flex w-full items-center justify-between rounded-[20px] border border-sky-100/16 bg-sky-200/16 px-3 py-2 text-left text-xs font-black text-sky-100 ring-1 ring-white/8"
        >
          <span>{dateDraft.checkInDate && dateDraft.checkOutDate ? `${compactCalendarDateLabel(dateDraft.checkInDate)}–${compactCalendarDateLabel(dateDraft.checkOutDate)}` : "Choose dates"}</span>
          <span>Edit</span>
        </button>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/62">Guests</div>
          <div className="mt-0.5 text-[15px] font-black leading-5 text-white">{guestLabel}</div>
        </div>
        <div className="rounded-full bg-emerald-300/92 px-3 py-1.5 text-[11px] font-black text-slate-950">
          Selected
        </div>
      </div>

      <div className="space-y-2">
        <SmartBarBookingCounterRow
          label="Adults"
          helper="Age 18+"
          value={guestCounts.adults}
          min={1}
          max={6}
          onChange={(value) => updateGuestCounts({ ...guestCounts, adults: value })}
        />
        <SmartBarBookingCounterRow
          label="Kids"
          helper="Children"
          value={guestCounts.children}
          min={0}
          max={6}
          onChange={(value) => updateGuestCounts({ ...guestCounts, children: value })}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <div className="rounded-[18px] border border-white/20 bg-slate-950/86 px-3.5 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_22px_rgba(2,6,23,0.20)] ring-1 ring-white/14">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-100/82">
          Trip details needed
        </div>
      </div>

      {stage === "dates" ? renderCalendar() : renderGuests()}
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

export default function SmartBarBookingAdapter({ site, demoFixtureMode = false, demoSubmission = null }: SmartBarBookingAdapterProps) {
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
  const demoFocusPanelVisibleRef = useRef(false);
  const demoRoomPreviewViewedRef = useRef<Record<number, true>>({ 0: true });
  const demoPackagePanelOpenRef = useRef(false);
  const demoCommittedRoomIdRef = useRef<string | null>(null);
  const demoWizardStateRef = useRef<SmartBarBookingDemoWizardState>({
    roomAdded: false,
    packagesReviewed: false,
    packageIds: [],
    breakfastRequested: false,
  });
  const [, setDemoWizardState] = useState<SmartBarBookingDemoWizardState>(demoWizardStateRef.current);
  const setDemoWizardStateSync = (
    nextState: SmartBarBookingDemoWizardState | ((current: SmartBarBookingDemoWizardState) => SmartBarBookingDemoWizardState),
  ) => {
    const resolvedState = typeof nextState === "function"
      ? (nextState as (current: SmartBarBookingDemoWizardState) => SmartBarBookingDemoWizardState)(demoWizardStateRef.current)
      : nextState;

    demoWizardStateRef.current = resolvedState;
    setDemoWizardState(resolvedState);
  };

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

  const activeNavigationStep = () => {
    const state = navigationStateRef.current;
    if (!state || !state.steps.length) return null;

    const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
    return state.steps[activeIndex] || null;
  };

  const markDemoRoomPreviewViewed = (index: number) => {
    if (!demoFixtureMode) return;
    const safeIndex = Math.max(0, Math.floor(index));
    demoRoomPreviewViewedRef.current = {
      ...demoRoomPreviewViewedRef.current,
      [safeIndex]: true,
    };
  };

  const resetDemoRoomPreviewViewed = (index = 0) => {
    if (!demoFixtureMode) return;
    const safeIndex = Math.max(0, Math.floor(index));
    demoRoomPreviewViewedRef.current = { [safeIndex]: true };
  };

  const demoRoomPreviewProgress = () => {
    const state = navigationStateRef.current;
    if (!state || !state.steps.length) {
      return { activeIndex: 0, total: 0, viewedCount: 0, allViewed: true };
    }

    const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
    const total = state.steps.length;
    const viewedCount = Array.from({ length: total }).filter((_, index) => demoRoomPreviewViewedRef.current[index]).length;

    return {
      activeIndex,
      total,
      viewedCount,
      allViewed: viewedCount >= total,
    };
  };

  const navigationActionsForRaw = (_raw: TourBarBookingRawResponse): SmartBarMobileGenericAction[] => {
    const state = navigationStateRef.current;
    if (!state || state.steps.length < 2) return [];

    const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
    const previousIndex = (activeIndex - 1 + state.steps.length) % state.steps.length;
    const nextIndex = (activeIndex + 1) % state.steps.length;
    const previousLabel = state.steps[previousIndex]?.targetText || state.steps[previousIndex]?.targetId || "previous option";
    const nextLabel = state.steps[nextIndex]?.targetText || state.steps[nextIndex]?.targetId || "next option";

    return [
      {
        id: "booking-nav-back",
        label: "Back",
        helper: compactText(previousLabel).slice(0, 28) || `Stop ${previousIndex + 1} of ${state.steps.length}`,
        variant: "back",
        disabled: false,
      },
      {
        id: "booking-nav-next",
        label: "Next",
        helper: compactText(nextLabel).slice(0, 28) || `Stop ${nextIndex + 1} of ${state.steps.length}`,
        variant: "next",
        disabled: false,
      },
    ];
  };

  const demoBookingIsBreakfastFollowUp = (query: string) => {
    const normalized = compactText(query).toLowerCase();
    return /\b(add|include|with)\s+breakfast\b|\bbreakfast\s+(plan|package|add)/.test(normalized) &&
      !normalized.includes("nice room");
  };

  const syncDemoNavigationStateForRaw = (raw: TourBarBookingRawResponse) => {
    if (!demoFixtureMode) return;

    const targets = navigationTargetsFromRaw(raw)
      .filter((target) => Boolean(roomIdFromTarget(target.targetId)))
      .slice(0, 3);

    if (!targets.length) {
      navigationStateRef.current = null;
      resetDemoRoomPreviewViewed(0);
      return;
    }

    const previous = navigationStateRef.current;
    const previousKeys = previous?.steps.map((target) => target.targetId).join("|") || "";
    const nextKeys = targets.map((target) => target.targetId).join("|");
    const previousTargetId = previous?.steps[Math.min(Math.max(previous.activeIndex, 0), previous.steps.length - 1)]?.targetId || "";
    const preservedIndex = targets.findIndex((target) => target.targetId === previousTargetId);
    const rawPromptText = [
      raw.prompt,
      raw.message,
      asRecord(raw.bookingArtifacts).rawPrompt,
      asRecord(raw.bookingArtifacts).normalizedPrompt,
    ].map((value) => String(value || "")).join(" ");
    const breakfastRefinement = demoBookingIsBreakfastFollowUp(rawPromptText);

    // A breakfast follow-up refines the same candidate set; it should not freeze
    // on the room that happened to be previewed when the follow-up was typed.
    // Restart the preview counter at room 1 so Back/Next can cycle through the
    // updated room + breakfast combinations.
    const activeIndex = breakfastRefinement ? 0 : preservedIndex >= 0 ? preservedIndex : 0;

    navigationStateRef.current = {
      steps: targets,
      activeIndex,
    };

    if (breakfastRefinement) {
      resetDemoRoomPreviewViewed(activeIndex);
    } else if (previousKeys === nextKeys && preservedIndex >= 0) {
      markDemoRoomPreviewViewed(activeIndex);
    } else {
      resetDemoRoomPreviewViewed(activeIndex);
    }
  };

  const rawIsBookingSummaryMode = (raw: TourBarBookingRawResponse) => {
    const text = [
      raw.displayMode,
      raw.intent,
      raw.commerceAction,
      raw.mode,
      asRecord(raw.action || raw.suggestedAction).type,
      asRecord(raw.action || raw.suggestedAction).kind,
      asRecord(raw.action || raw.suggestedAction).intent,
      asRecord(raw.action || raw.suggestedAction).commerceAction,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return (
      text.includes("prepare_booking") ||
      text.includes("booking_handoff") ||
      text.includes("checkout_handoff") ||
      text.includes("booking_summary")
    );
  };

  const rawHasBookableStay = (raw: TourBarBookingRawResponse) => {
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
        selected.comboId ||
        visibleContext.selectedRoomId ||
        site.selectedRoom ||
        "",
    );

    return Boolean(roomId.trim());
  };


  const demoWizardFooterLabelForRaw = (raw: TourBarBookingRawResponse, summaryMode = false) => {
    if (!demoFixtureMode) return "";
    if (summaryMode) return "Ready";

    if (!rawHasBookableStay(raw) || !demoWizardStateRef.current.roomAdded) {
      const progress = demoRoomPreviewProgress();
      if (progress.total > 1 && !progress.allViewed) {
        return `Previewing ${progress.activeIndex + 1} of ${progress.total}`;
      }
      return "Choose room";
    }

    if (!demoWizardStateRef.current.packagesReviewed) {
      return demoPackagePanelOpenRef.current ? "Tap when done" : "Tap packages";
    }

    return "Tap for booking";
  };

  const demoWizardPrimaryActionForRaw = (raw: TourBarBookingRawResponse): SmartBarMobileGenericAction | null => {
    if (!demoFixtureMode || !rawHasBookableStay(raw)) return null;

    if (!demoWizardStateRef.current.roomAdded) {
      return {
        id: "booking-add-room",
        label: "Add room",
        helper: "Select preview",
        variant: "primary",
      };
    }

    if (!demoWizardStateRef.current.packagesReviewed) {
      if (demoPackagePanelOpenRef.current) {
        return {
          id: "booking-packages-done",
          label: "Tap when done",
          helper: "Keep selected",
          variant: "primary",
        };
      }

      return {
        id: "booking-review-packages",
        label: "Review packages",
        helper: "Add or skip",
        variant: "primary",
      };
    }

    return {
      id: "booking-summary",
      label: "Tap for booking",
      helper: "Review handoff",
      variant: "primary",
    };
  };

  const actionsForRaw = (raw: TourBarBookingRawResponse): SmartBarMobileGenericAction[] => {
    const isSummaryMode = rawIsBookingSummaryMode(raw);
    actionQueriesRef.current = {};

    if (demoFixtureMode) {
      const actions = isSummaryMode ? [] : navigationActionsForRaw(raw);
      const primaryWizardAction = isSummaryMode ? null : demoWizardPrimaryActionForRaw(raw);

      if (primaryWizardAction) {
        const insertAt = actions.findIndex((action) => action.id === "booking-nav-next");
        if (insertAt >= 0) actions.splice(insertAt, 0, primaryWizardAction);
        else actions.push(primaryWizardAction);

        if (!demoWizardStateRef.current.roomAdded) {
          const editAction: SmartBarMobileGenericAction = {
            id: "booking-edit-room-search",
            label: "Edit",
            helper: "Revise match",
            variant: "secondary",
          };
          const nextIndex = actions.findIndex((action) => action.id === "booking-nav-next");
          if (nextIndex >= 0) actions.splice(nextIndex, 0, editAction);
          else actions.push(editAction);
        }
      }

      return actions;
    }

    const actions: SmartBarMobileGenericAction[] = [];
    const shellResult = buildTourBarBookingShellResult(raw, primaryTargetFromRaw(raw), {
      mode: TOURBAR_HOTEL_BOOKING_MODE,
    });
    const nextLabel = shellResult.nextMove?.label || shellResult.invitation?.text || "";
    const nextQuery = shellResult.nextMove?.query || shellResult.nextMove?.label || shellResult.invitation?.text || "";

    actions.push(...(isSummaryMode ? [] : navigationActionsForRaw(raw)));

    if (nextLabel && nextQuery) {
      const nextStepIsBooking = isBookingNextStepLabel(`${nextLabel} ${nextQuery}`);
      const id = nextStepIsBooking
        ? "booking-handoff"
        : actionId("next", nextQuery);
      actionQueriesRef.current[id] = nextQuery;
      actions.push({
        id,
        label: nextStepIsBooking ? "Prepare booking summary" : nextLabel,
        helper: nextStepIsBooking
          ? "Room, add-ons, dates, guests, estimate"
          : "Continue with SmartBar",
        variant: "primary",
      });
    }

    if (!isSummaryMode && rawHasBookableStay(raw) && !actions.some((action) => action.id === "booking-handoff")) {
      actions.push({
        id: "booking-summary",
        label: "Prepare booking summary",
        helper: "Room, add-ons, dates, guests, estimate",
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

  const guidedStepRoomId = (step?: TourBarBookingPageTarget | null) => {
    if (!step) return "";

    const roomId = roomIdFromTarget(step.targetId);
    return roomId || "";
  };

  const guidedRoomBody = (step?: TourBarBookingPageTarget | null) => {
    const roomId = guidedStepRoomId(step);
    if (!roomId) return "";

    if (roomId === "room-garden-terrace") {
      return "**Garden Terrace King** is the value-fit option.\n- Keeps the stay in a better-value band.\n- Still matches the requested view.\n- Breakfast can be added without moving into premium pricing.";
    }

    if (roomId === "room-ocean-view-suite") {
      return "**Ocean View Suite** is the balanced upgrade.\n- Stronger view and comfort than the value room.\n- Breakfast compatibility stays intact.\n- Avoids the Coastal Villa price jump.";
    }

    if (roomId === "room-coastal-villa") {
      return "**Coastal Villa Suite** is the premium option.\n- Best view and most space.\n- Highest nightly rate in this set.\n- Useful for comparison, not the value recommendation.";
    }

    if (roomId === "room-family-double") {
      return "**Family Double Room** is the practical family fit.\n- Matches the added guest-capacity need.\n- Keeps the stay practical.\n- Good fallback once the request changes from solo to family.";
    }

    const meta = site.getRoomMeta(roomId);
    return meta?.signal || "";
  };

  const guidedRoomTitle = (step?: TourBarBookingPageTarget | null) => {
    const roomId = guidedStepRoomId(step);
    if (!roomId) return "";

    return site.getRoomMeta(roomId)?.title || step?.targetText || "";
  };

  const stayCartPackageIdsFromRaw = (raw: TourBarBookingRawResponse) => {
    const visibleContext = asRecord(raw.visibleContext);
    const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });

    return site.normalizePackageIds([
      ...packageIdsFromStayPlan(activeStayPlan),
      ...packageIdsFromCombination(selected),
      ...asStringArray(visibleContext.selectedPackageIds),
    ]);
  };

  const stayCartRoomIdFromRaw = (raw: TourBarBookingRawResponse) => {
    const visibleContext = asRecord(raw.visibleContext);
    const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
    const activeRoom = asRecord(activeStayPlan.room);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });

    return String(
      activeStayPlan.roomId ||
        activeStayPlan.roomTargetId ||
        activeRoom.targetId ||
        activeRoom.roomId ||
        selected.roomId ||
        visibleContext.selectedRoomId ||
        site.selectedRoom ||
        "",
    );
  };

  const demoStayCartMoneyAmount = (value?: string | null) => {
    const match = String(value || "").match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return null;

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const demoStayCartEstimateWithBreakfast = (roomPrice: string, includeBreakfast: boolean) => {
    if (!includeBreakfast) return roomPrice;

    const roomAmount = demoStayCartMoneyAmount(roomPrice);
    const breakfastAmount = demoStayCartMoneyAmount(site.getPackageMeta(SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID)?.price);

    if (roomAmount === null || breakfastAmount === null) {
      return `${roomPrice} + breakfast`;
    }

    const total = roomAmount + breakfastAmount;
    const suffix = /night/i.test(roomPrice) ? "/night" : "";
    return `$${total}${suffix}`;
  };

  const stayCartDataFromRaw = (raw: TourBarBookingRawResponse) => {
    const visibleContext = asRecord(raw.visibleContext);
    const bookingContext = asRecord(visibleContext.bookingContext);
    const activeStayPlan = asRecord(raw.nextStepStayPlan || raw.activeStayPlan || visibleContext.activeStayPlan);
    const planBookingContext = asRecord(activeStayPlan.bookingContext);
    const selected = tourBarCombinationFromRaw(raw, { preferNextStep: true });
    const roomAdded = !demoFixtureMode || demoWizardStateRef.current.roomAdded;
    const navigationState = navigationStateRef.current;
    const activePreviewIndex = navigationState && navigationState.steps.length
      ? Math.min(Math.max(navigationState.activeIndex, 0), navigationState.steps.length - 1)
      : 0;
    const previewStep = demoFixtureMode && !roomAdded
      ? navigationState?.steps[activePreviewIndex] || null
      : null;
    const previewRoomId = guidedStepRoomId(previewStep);
    const committedRoomId = demoFixtureMode && roomAdded ? demoCommittedRoomIdRef.current || site.selectedRoom || workingStay.roomId || "" : "";
    const rawRoomId = stayCartRoomIdFromRaw(raw);
    const roomId = previewRoomId || committedRoomId || rawRoomId;
    const roomMeta = site.getRoomMeta(roomId);
    const packageIds = stayCartPackageIdsFromRaw(raw);
    const packageTitles = asStringArray(selected.packageTitles);
    const checkInDate = String(bookingContext.checkInDate || planBookingContext.checkInDate || (site.datesSelected ? site.checkInDate : ""));
    const checkOutDate = String(bookingContext.checkOutDate || planBookingContext.checkOutDate || (site.datesSelected ? site.checkOutDate : ""));
    const hasDates = Boolean(checkInDate && checkOutDate);
    const adults = Math.max(1, Number(bookingContext.adults ?? bookingContext.guestAdults ?? planBookingContext.adults ?? site.guestAdults ?? 1));
    const children = Math.max(0, Number(bookingContext.children ?? bookingContext.guestChildren ?? planBookingContext.children ?? site.guestChildren ?? 0));
    const hasGuests = Boolean(bookingContext.guestLabel || bookingContext.guests || planBookingContext.guestLabel || planBookingContext.guests || site.guestsSelected);
    const breakfastRequested = demoFixtureMode && demoWizardStateRef.current.breakfastRequested;
    const packagesReviewed = !demoFixtureMode || demoWizardStateRef.current.packagesReviewed;
    const breakfastSelectedForEstimate =
      (demoFixtureMode && demoWizardStateRef.current.packageIds.includes(SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID)) ||
      (breakfastRequested && !packagesReviewed);
    const baseEstimate = normalizeSmartBarSummaryLabel(roomMeta?.price || priceLabelFromTourBarCombination(selected) || "Rate ready");
    const estimate = demoStayCartEstimateWithBreakfast(baseEstimate, breakfastSelectedForEstimate);
    const roomPreviewCount = navigationState?.steps.length || 0;
    const roomPreviewLabel = roomPreviewCount > 1
      ? `Matching room ${activePreviewIndex + 1} of ${roomPreviewCount}`
      : "Matching room";

    const essentials: SmartBarBookingStayBlock[] = [
      {
        id: "stay-check-in",
        label: "In",
        value: hasDates ? compactCalendarDateLabel(checkInDate) : "Missing",
        helper: "Required",
        tone: hasDates ? "ready" : "pending",
        actionId: "booking-edit-dates",
        actionLabel: "Edit dates",
      },
      {
        id: "stay-checkout",
        label: "Out",
        value: hasDates ? compactCalendarDateLabel(checkOutDate) : "Missing",
        helper: "Required",
        tone: hasDates ? "ready" : "pending",
        actionId: "booking-edit-dates",
        actionLabel: "Edit dates",
      },
      {
        id: "stay-guests",
        label: "Guests",
        value: hasGuests
          ? `${adults} adult${adults === 1 ? "" : "s"} · ${children} kid${children === 1 ? "" : "s"}`
          : "Missing",
        helper: "Required",
        tone: hasGuests ? "ready" : "pending",
        actionId: "booking-edit-guests",
        actionLabel: "Edit guests",
      },
    ];

    const wizardPackageIds = demoFixtureMode ? demoWizardStateRef.current.packageIds : packageIds;
    const packageReviewAvailable = Boolean(roomId && (roomAdded || breakfastRequested));

    const room: SmartBarBookingStayBlock = roomId
      ? {
          id: "stay-room",
          label: roomAdded ? "Room" : roomPreviewLabel,
          value: normalizeSmartBarSummaryLabel(String(roomMeta?.title || selected.roomShortTitle || selected.roomTitle || "Selected room")),
          helper: roomAdded ? roomMeta?.price || "Selected" : "Preview",
          tone: roomAdded ? "ready" : "optional",
          actionId: roomAdded ? "booking-focus-room" : "booking-focus-room-preview",
          actionLabel: roomAdded ? "Focus room" : "Preview room",
          actionVariant: roomAdded ? "secondary" : "primary",
          removeActionId: roomAdded ? "booking-remove-room" : undefined,
          removeActionLabel: "Remove room",
          trailingIcon: roomAdded ? "trash" : undefined,
        }
      : {
          id: "stay-room",
          label: "Room",
          value: "Not selected",
          helper: "Required",
          tone: "pending",
          actionId: "booking-nav-next",
          actionLabel: "Choose room",
        };

    const shouldShowPackageReviewBlock = breakfastRequested || packageReviewAvailable;
    const packages: SmartBarBookingStayBlock[] = packagesReviewed
      ? wizardPackageIds.length
        ? wizardPackageIds.map((packageId, index) => {
            const meta = site.getPackageMeta(packageId);
            return {
              id: `stay-package-${packageId}`,
              label: index === 0 ? "Packages" : "Packages +",
              value: normalizeSmartBarSummaryLabel(packageTitles[index] || meta?.title || packageId),
              helper: meta?.price || "Added",
              tone: "ready" as SmartBarBookingStayBlockTone,
              actionId: "booking-review-packages",
              actionLabel: "Review packages",
              actionVariant: "secondary" as const,
            };
          })
        : [
            {
              id: "stay-package-reviewed",
              label: "Packages",
              value: "Reviewed",
              helper: "None added",
              tone: "ready" as SmartBarBookingStayBlockTone,
              actionId: "booking-review-packages",
              actionLabel: "Review packages",
              actionVariant: "secondary" as const,
            },
          ]
      : shouldShowPackageReviewBlock
        ? [
            {
              id: "stay-package-review",
              label: "Packages",
              value: breakfastRequested ? "Breakfast matched" : "Review",
              helper: roomAdded
                ? breakfastRequested ? "Tap packages" : "Breakfast available"
                : breakfastRequested ? "Add room first" : "Breakfast available",
              tone: "optional",
              actionId: "booking-review-packages",
              actionLabel: "Review packages",
            },
          ]
        : [
            {
              id: "stay-package-placeholder",
              label: "",
              value: "",
              helper: "",
              tone: "empty" as SmartBarBookingStayBlockTone,
            },
          ];
    const packageOptions: SmartBarBookingStayBlock[] = SMARTBAR_BOOKING_DEMO_PACKAGE_IDS.map((packageId) => {
      const meta = smartBarBookingDemoPackageMeta(site, packageId);
      const selected = wizardPackageIds.includes(packageId) ||
        (packageId === SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID && breakfastRequested && !packagesReviewed);

      return {
        id: `package-option-${packageId}`,
        label: packageId === SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID ? "Breakfast" : "Package",
        value: meta?.title || packageId,
        helper: selected ? meta?.price || "Selected" : meta?.price || "Available",
        tone: (selected ? "ready" : "choice") as SmartBarBookingStayBlockTone,
        actionId: selected ? `booking-focus-package-${packageId}` : `booking-package-toggle-${packageId}`,
        actionLabel: selected ? `Focus ${meta?.title || packageId}` : `Toggle ${meta?.title || packageId} on`,
        actionVariant: "primary" as const,
      };
    });

    return {
      essentials,
      room,
      packages,
      packagePanelOpen: demoFixtureMode && demoPackagePanelOpenRef.current,
      packageOptions,
      estimate: {
        id: "stay-estimate",
        label: "Estimate",
        value: estimate,
        helper: hasDates && hasGuests && roomId
          ? breakfastRequested && !packagesReviewed ? "Room + breakfast intent" : "Live estimate"
          : "Needs required blocks",
        tone: "accounting",
        actionId: undefined,
        actionLabel: "View estimate",
      } as SmartBarBookingStayBlock,
    };
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
        ? smartBarSummaryDateRange(
            String(bookingContext.checkInDate),
            String(bookingContext.checkOutDate),
            site.formatDateRange(String(bookingContext.checkInDate), String(bookingContext.checkOutDate)),
          )
        : site.datesSelected
          ? smartBarSummaryDateRange(
              site.checkInDate,
              site.checkOutDate,
              site.formatDateRange(site.checkInDate, site.checkOutDate),
            )
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
      ["Room", normalizeSmartBarSummaryLabel(String(selected.roomShortTitle || selected.roomTitle || roomMeta?.title || "Selected room"))],
      ["Add-ons", normalizeSmartBarSummaryLabel(packageTitles[0] || derivedPackageTitles[0] || "No package selected")],
      ["Dates", normalizeSmartBarSummaryLabel(datesLabel)],
      ["Guests", normalizeSmartBarSummaryLabel(guestsLabel)],
      ["Estimate", normalizeSmartBarSummaryLabel(priceLabelFromTourBarCombination(selected) || roomMeta?.price || "Rate ready")],
    ];
  };

  const contentForRaw = (raw: TourBarBookingRawResponse, summary = false): ReactNode => {
    const step = activeNavigationStep();
    const guidedBody = !summary ? guidedRoomBody(step) : "";
    const body = summary ? "BOOKING SUMMARY" : guidedBody || bookingResponseBody(raw);
    const rows = summary ? bookingSummaryRows(raw) : [];

    if (demoFixtureMode) {
      const showFocusPanel = !summary && demoFocusPanelVisibleRef.current;

      return (
        <SmartBarBookingStayCart
          responseBody={showFocusPanel ? body : undefined}
          summary={summary}
          {...stayCartDataFromRaw(raw)}
        />
      );
    }

    return (
      <div className="space-y-2.5">
        {body && (
          <div className="rounded-[24px] border border-white/22 bg-slate-950/88 px-4 py-3 text-[15px] font-normal leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_28px_rgba(2,6,23,0.26)] ring-1 ring-white/14 [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">
            {renderSmartBarBookingFormattedText(body)}
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-[24px] border border-white/20 bg-slate-950/84 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(2,6,23,0.24)] ring-1 ring-white/14">
            {rows.map(([label, value]) => {
              const editActionId =
                summary && label === "Dates"
                  ? "booking-edit-dates"
                  : summary && label === "Guests"
                    ? "booking-edit-guests"
                    : "";
              const rowClass = "flex w-full items-start justify-between gap-3 border-b border-white/14 px-4 py-3 text-left last:border-b-0";

              if (editActionId) {
                return (
                  <button
                    key={label}
                    type="button"
                    data-smartbar-mobile-content-action={editActionId}
                    data-smartbar-mobile-content-action-label={`Edit ${label.toLowerCase()}`}
                    className={`${rowClass} transition hover:bg-white/[0.04] active:bg-white/[0.07]`}
                  >
                    <span className="flex items-center gap-1.5 text-white/76">
                      {label}
                      <span className="rounded-full bg-sky-200/18 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-sky-100/86 ring-1 ring-sky-100/14">Edit</span>
                    </span>
                    <strong className="max-w-[62%] text-right text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">{value}</strong>
                  </button>
                );
              }

              return (
                <div key={label} className={rowClass}>
                  <span className="text-white/70">{label}</span>
                  <strong className="max-w-[62%] text-right text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.38)]">{value}</strong>
                </div>
              );
            })}
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
    const summary = target.isBookingAction || rawIsBookingSummaryMode(raw);
    const actions = actionsForRaw(raw).filter((action) =>
      summary ? action.id !== "booking-handoff" && action.id !== "booking-summary" : true,
    );
    const step = activeNavigationStep();
    const guidedBody = !summary ? guidedRoomBody(step) : "";
    const guidedTitle = !summary ? guidedRoomTitle(step) : "";
    const body = summary ? "Review the stay details SmartBar has staged for handoff." : guidedBody || bookingResponseBody(raw);
    const estimatedLines = Math.max(1, Math.ceil(body.length / 38));
    const summaryRowCount = summary ? bookingSummaryRows(raw).length : 0;
    const demoShowsFocusPanel = demoFixtureMode && !summary && demoFocusPanelVisibleRef.current;
    const estimatedHeight = demoFixtureMode
      ? summary
        ? 560
        : demoShowsFocusPanel ? 500 : 500
      : summary
        ? Math.min(460, Math.max(330, 72 + estimatedLines * 26 + summaryRowCount * 50))
        : Math.min(
            640,
            Math.max(actions.length ? 330 : 260, 72 + estimatedLines * 27 + actions.length * 62),
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
      eyebrow: summary ? "Booking summary" : "Domi stay match",
      title: summary ? "Booking summary" : guidedTitle || shellResult.title || "Domi booking match",
      helper: summary
        ? "Review the staged room, add-ons, dates, guests, and estimate."
        : navigates
          ? "SmartBar opened the matching stay option on the site."
          : "Refine this stay or ask SmartBar for another option.",
      statusLabel: demoFixtureMode
        ? demoWizardFooterLabelForRaw(raw, summary)
        : guidedProgress ? `Stop ${guidedProgress.current}/${guidedProgress.total}` : summary ? "Ready" : navigates ? "Spotlight" : "Match ready",
      actions,
      progressLabel: guidedProgress ? "Guided stops" : undefined,
      progressCurrent: guidedProgress?.current,
      progressTotal: guidedProgress?.total,
      height: estimatedHeight,
      content: contentForRaw(raw, summary),
      navigationRevealDelayMs: navigates && (!demoFixtureMode || demoFocusPanelVisibleRef.current) ? 3000 : undefined,
      navigationRevealLabel: navigates && (!demoFixtureMode || demoFocusPanelVisibleRef.current) ? "Spotlighting..." : undefined,
    };
  };

  const buildDemoBookingRaw = (
    query: string,
    promptContext: TourBarBookingContext,
    requestContext: TourBarBookingRequestContext,
  ): TourBarBookingRawResponse => {
    const normalized = compactText(query).toLowerCase();
    const visibleContext = asRecord(requestContext.visibleContext);
    const requestBookingContext = asRecord(visibleContext.bookingContext);

    const checkInDate = String(promptContext.checkInDate || requestBookingContext.checkInDate || site.checkInDate || "2026-08-04");
    const checkOutDate = String(promptContext.checkOutDate || requestBookingContext.checkOutDate || site.checkOutDate || "2026-08-09");
    const adults = Math.max(1, Number(promptContext.guestAdults ?? promptContext.adults ?? requestBookingContext.adults ?? site.guestAdults ?? 1));
    const children = Math.max(0, Number(promptContext.guestChildren ?? promptContext.children ?? requestBookingContext.children ?? site.guestChildren ?? 0));
    const guestLabel = String(promptContext.guestLabel || requestBookingContext.guestLabel || site.guestLabelFromCounts(adults, children));

    const bookingContext = {
      checkInDate,
      checkOutDate,
      datesLabel: site.formatDateRange(checkInDate, checkOutDate),
      nights: site.bookingNights(checkInDate, checkOutDate),
      adults,
      children,
      guests: adults + children,
      guestLabel,
    };

    const roomPrices: Record<string, number> = {
      "room-garden-terrace": 239,
      "room-ocean-view-suite": 379,
      "room-coastal-villa": 549,
      "room-family-double": 249,
    };

    const makeCombo = (roomId: string, packageIds: string[] = []) => {
      const roomMeta = site.getRoomMeta(roomId);
      return {
        comboId: `${roomId}${packageIds.length ? "-with-addons" : ""}`,
        roomId,
        roomTitle: roomMeta?.title || roomId,
        roomShortTitle: roomMeta?.title || roomId,
        packageIds,
        packageTitles: packageIds
          .map((packageId) => site.getPackageMeta(packageId)?.title || packageId)
          .filter(Boolean),
        pricing: {
          effectiveNightlyUsd: roomPrices[roomId] || 299,
        },
        roomTarget: {
          pageId: pageIdFromTarget(roomId),
          targetId: roomId,
          targetSelector: `[data-tour-id="${roomId}"], #${roomId}`,
        },
      };
    };

    const isBreakfastFollowUp = demoBookingIsBreakfastFollowUp(query);
    const isFamilyRecommendation = /family recommendation|family room|family double/.test(normalized);
    const isSummary = /\b(book|reserve|reservation|summary|prepare)\b/.test(normalized);

    const breakfastBeforeRoomCommit = isBreakfastFollowUp && demoFixtureMode && !demoWizardStateRef.current.roomAdded;
    const previewRoomId = guidedStepRoomId(activeNavigationStep());
    const activeRoomId = isFamilyRecommendation
      ? "room-family-double"
      : breakfastBeforeRoomCommit
        ? previewRoomId || workingStay.roomId || site.selectedRoom || "room-ocean-view-suite"
        : isBreakfastFollowUp || isSummary
          ? workingStay.roomId || site.selectedRoom || previewRoomId || "room-ocean-view-suite"
          : previewRoomId || "room-garden-terrace";

    const packageIds = isSummary || (isBreakfastFollowUp && !breakfastBeforeRoomCommit) ? [SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID] : [];
    const selectedCombination = makeCombo(activeRoomId, packageIds);
    const activeStayPlan = {
      roomId: activeRoomId,
      roomTargetId: activeRoomId,
      room: {
        roomId: activeRoomId,
        targetId: activeRoomId,
        title: selectedCombination.roomShortTitle,
        price: site.getRoomMeta(activeRoomId)?.price || "",
        signal: site.getRoomMeta(activeRoomId)?.signal || "",
      },
      packageIds,
      packages: packageIds.map((packageId) => ({
        packageId,
        targetId: packageId,
        title: site.getPackageMeta(packageId)?.title || packageId,
        price: site.getPackageMeta(packageId)?.price || "",
        signal: site.getPackageMeta(packageId)?.signal || "",
      })),
      activeTargetId: packageIds[0] || activeRoomId,
      activeRoomId,
      activePackageId: packageIds[0] || null,
      bookingContext,
    };

    const matrixResults = [
      makeCombo("room-garden-terrace"),
      makeCombo("room-ocean-view-suite"),
      makeCombo("room-coastal-villa"),
    ];

    const roomCandidateOrder = isBreakfastFollowUp
      ? ["room-ocean-view-suite", "room-garden-terrace", "room-coastal-villa"]
      : ["room-garden-terrace", "room-ocean-view-suite", "room-coastal-villa"];
    const rankedDestinations = isFamilyRecommendation
      ? [
          {
            pageId: "rooms",
            targetId: "room-family-double",
            targetSelector: '[data-tour-id="room-family-double"], #room-family-double',
            targetText: site.getRoomMeta("room-family-double")?.title || "Family Double Room",
          },
        ]
      : roomCandidateOrder.map((roomId) => ({
          pageId: "rooms" as TourBarBookingPageId,
          targetId: roomId,
          targetSelector: `[data-tour-id="${roomId}"], #${roomId}`,
          targetText: site.getRoomMeta(roomId)?.title || roomId,
        }));

    const summaryMode = isSummary;
    const body = summaryMode
      ? "**Booking summary staged.**\n- Room, breakfast, dates, guests, and estimate are ready.\n- The next step can hand off cleanly to booking or checkout."
      : isBreakfastFollowUp
        ? breakfastBeforeRoomCommit
          ? "**Breakfast noted. Matching rooms updated.**\n- SmartBar keeps the same room set first.\n- The room is still a preview until you add it.\n- Breakfast will be reviewed after the room is selected."
          : "**Breakfast requested.**\n- The selected room stays locked.\n- Review the package block before booking.\n- Dates and guest context are preserved."
        : isFamilyRecommendation
          ? "**Family Double is the best family fit.**\n- Guest capacity is now the priority.\n- The stay stays practical instead of jumping to a villa.\n- SmartBar can stage the summary next."
          : "**Best fit: Garden Terrace King.**\n- Best value band for this request.\n- Still matches view and breakfast intent.\n- Ocean View Suite and Coastal Villa are available for comparison.";

    return {
      ok: true,
      mode: TOURBAR_HOTEL_BOOKING_MODE,
      catalogMode: TOURBAR_HOTEL_BOOKING_MODE,
      displayMode: summaryMode ? "prepare_booking" : "booking_recommendation",
      intent: summaryMode ? "prepare_booking" : "recommend_booking",
      commerceAction: summaryMode ? "prepare_booking" : "booking_recommendation",
      message: query,
      prompt: query,
      title: summaryMode ? "Booking summary" : selectedCombination.roomShortTitle,
      body,
      answer: body,
      selectedCombination,
      nextStepCombination: selectedCombination,
      matrixResults,
      rankedDestinations,
      visibleContext: {
        ...visibleContext,
        bookingContext,
        selectedRoomId: activeRoomId,
        selectedPackageIds: packageIds,
        activeStayPlan,
      },
      activeStayPlan,
      nextStepStayPlan: activeStayPlan,
      bookingArtifacts: {
        rawPrompt: query,
        normalizedPrompt: query,
      },
      chips: summaryMode ? [] : ["Prepare booking summary", "Add breakfast"],
      nextStep: summaryMode
        ? undefined
        : {
            type: "booking_handoff",
            label: "Prepare booking summary",
            query: "prepare booking summary",
            comboId: selectedCombination.comboId,
          },
    };
  };

  const submitBookingQuery = async (query: string): Promise<SmartBarMobileSubmitResult> => {
    const promptContext = mergePromptContext(query);
    syncPromptContextToDraft(promptContext);

    const draft = selectorDraftFromSite();
    const demoForcesMissingBookingContext = demoFixtureMode && /^\s*need a family room\s*$/i.test(query);
    const hasDates = !demoForcesMissingBookingContext && Boolean(promptContext.datesSelected || site.datesSelected || draft.datesSelected);
    const hasGuests = !demoForcesMissingBookingContext && Boolean(promptContext.guestsSelected || site.guestsSelected || draft.guestsSelected);

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
    const raw = demoFixtureMode
      ? buildDemoBookingRaw(query, promptContext, requestContext)
      : await postTourBarHotelBooking(query, turnContext, requestContext);
    if (demoFixtureMode) {
      if (demoBookingIsBreakfastFollowUp(query)) {
        demoPackagePanelOpenRef.current = false;
        setDemoWizardStateSync((current) => ({
          ...current,
          breakfastRequested: true,
          packagesReviewed: false,
          packageIds: current.roomAdded ? current.packageIds : [],
        }));
      }
      syncDemoNavigationStateForRaw(raw);
    }

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

    demoFocusPanelVisibleRef.current = false;
    if (!demoFixtureMode) focusResult(raw);
    return toGenericResult(raw);
  };

  const submitGenericAction = async (
    action: SmartBarMobileGenericAction,
  ): Promise<SmartBarMobileSubmitResult> => {
    const raw = currentRawRef.current;

    if ((action.id === "booking-edit-dates" || action.id === "booking-edit-guests") && !raw) {
      return buildBookingContextSelectorResult(
        pendingBookingQueryRef.current || "show updated booking options",
        action.id === "booking-edit-dates",
        action.id === "booking-edit-guests",
      );
    }

    if ((action.id === "booking-edit-dates" || action.id === "booking-edit-guests") && raw) {
      currentRawRef.current = raw;
      const artifacts = asRecord(raw.bookingArtifacts);
      const pendingQuery = compactText(
        artifacts.rawPrompt ||
          artifacts.normalizedPrompt ||
          raw.prompt ||
          raw.message ||
          "show updated booking options",
      );
      return buildBookingContextSelectorResult(
        pendingQuery || "show updated booking options",
        action.id === "booking-edit-dates",
        action.id === "booking-edit-guests",
      );
    }

    if (action.id === "booking-context-continue") {
      return resumeBookingContextQuery();
    }

    if (action.id === "booking-edit-room-search" && raw) {
      demoFocusPanelVisibleRef.current = false;
      demoPackagePanelOpenRef.current = false;
      return toGenericResult(raw);
    }

    if (action.id === "booking-add-room" && raw) {
      const previewRoomId = demoFixtureMode ? guidedStepRoomId(activeNavigationStep()) : "";
      const roomId = previewRoomId || stayCartRoomIdFromRaw(raw);
      const roomMeta = site.getRoomMeta(roomId);
      if (roomId) {
        demoCommittedRoomIdRef.current = roomId;
        site.setSelectedRoom(roomId);
        setWorkingStay((current) => ({
          ...current,
          roomId,
          activeTargetId: roomId,
          activeRoomId: roomId,
        }));
        demoPackagePanelOpenRef.current = false;
        setDemoWizardStateSync((current) => ({
          ...current,
          roomAdded: true,
          packagesReviewed: false,
        }));
        if (roomMeta && !demoFixtureMode) {
          navigationRunRef.current += 1;
          site.setCurrentPage(pageIdFromTarget(roomId));
          spotlightAnchor(roomId, `[data-tour-id="${roomId}"], #${roomId}`, 180);
        }
        demoFocusPanelVisibleRef.current = false;
      }
      return toGenericResult(raw);
    }

    if (action.id === "booking-review-packages" && raw) {
      if (demoFixtureMode) {
        const primaryPackageId = SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID;
        const shouldPreselectBreakfast = demoWizardStateRef.current.breakfastRequested;
        demoPackagePanelOpenRef.current = true;
        demoFocusPanelVisibleRef.current = false;

        if (shouldPreselectBreakfast) {
          const nextPackageIds = site.normalizePackageIds([
            ...demoWizardStateRef.current.packageIds,
            primaryPackageId,
          ]);
          site.setSelectedPackages(nextPackageIds);
          setWorkingStay((current) => ({
            ...current,
            packageIds: nextPackageIds,
            activePackageId: nextPackageIds[0] || current.activePackageId || null,
          }));
          setDemoWizardStateSync((current) => ({
            ...current,
            packageIds: nextPackageIds,
            packagesReviewed: false,
          }));
        }

        return toGenericResult(raw);
      }

      const primaryPackageId = SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID;
      const nextPackageIds = site.normalizePackageIds([primaryPackageId]);
      site.setSelectedPackages(nextPackageIds);
      setWorkingStay((current) => ({
        ...current,
        packageIds: nextPackageIds,
        activeTargetId: primaryPackageId,
        activePackageId: primaryPackageId,
      }));
      setDemoWizardStateSync((current) => ({
        ...current,
        breakfastRequested: true,
        packagesReviewed: true,
        packageIds: nextPackageIds,
      }));
      navigationRunRef.current += 1;
      site.setCurrentPage(pageIdFromTarget(primaryPackageId));
      spotlightAnchor(primaryPackageId, `[data-tour-id="${primaryPackageId}"], #${primaryPackageId}`, 180);
      return toGenericResult(raw);
    }

    if (action.id.startsWith("booking-package-toggle-") && raw) {
      const packageId = action.id.replace("booking-package-toggle-", "");
      const currentPackageIds = site.normalizePackageIds(demoWizardStateRef.current.packageIds);
      const alreadySelected = currentPackageIds.includes(packageId);
      const nextPackageIds = alreadySelected
        ? currentPackageIds.filter((candidate) => candidate !== packageId)
        : site.normalizePackageIds([...currentPackageIds, packageId]);

      site.setSelectedPackages(nextPackageIds);
      setWorkingStay((current) => ({
        ...current,
        packageIds: nextPackageIds,
        activeTargetId: nextPackageIds[0] || current.activeRoomId || current.roomId,
        activePackageId: nextPackageIds[0] || null,
      }));
      demoPackagePanelOpenRef.current = true;
      setDemoWizardStateSync((current) => ({
        ...current,
        breakfastRequested: current.breakfastRequested || packageId === SMARTBAR_BOOKING_DEMO_PRIMARY_PACKAGE_ID,
        packagesReviewed: false,
        packageIds: nextPackageIds,
      }));
      return toGenericResult(raw);
    }

    if (action.id === "booking-packages-done" && raw) {
      const nextPackageIds = site.normalizePackageIds(demoWizardStateRef.current.packageIds);
      demoFocusPanelVisibleRef.current = false;
      site.setSelectedPackages(nextPackageIds);
      setWorkingStay((current) => ({
        ...current,
        packageIds: nextPackageIds,
        activeTargetId: nextPackageIds[0] || current.activeRoomId || current.roomId,
        activePackageId: nextPackageIds[0] || null,
      }));
      demoPackagePanelOpenRef.current = false;
      setDemoWizardStateSync((current) => ({
        ...current,
        packagesReviewed: true,
        packageIds: nextPackageIds,
      }));
      return toGenericResult(raw);
    }

    if (action.id === "booking-remove-room" && raw) {
      demoCommittedRoomIdRef.current = null;
      site.setSelectedRoom(null);
      site.setSelectedPackages([]);
      setWorkingStay((current) => ({
        ...current,
        roomId: null,
        packageIds: [],
        activeTargetId: null,
        activeRoomId: null,
        activePackageId: null,
      }));
      setDemoWizardStateSync({
        roomAdded: false,
        packagesReviewed: false,
        packageIds: [],
        breakfastRequested: false,
      });
      resetDemoRoomPreviewViewed(0);
      demoPackagePanelOpenRef.current = false;
      demoFocusPanelVisibleRef.current = false;
      return toGenericResult(raw);
    }

    if (action.id === "booking-focus-room-preview" && raw) {
      const state = navigationStateRef.current;
      if (state && state.steps.length) {
        const activeIndex = Math.min(Math.max(state.activeIndex, 0), state.steps.length - 1);
        demoFocusPanelVisibleRef.current = true;
        focusNavigationStep(state, activeIndex, 180);
      }
      return toGenericResult(raw);
    }

    if (action.id === "booking-add-package") {
      return submitBookingQuery("add breakfast");
    }

    if (action.id === "booking-focus-room" && raw) {
      const bookingTarget = bookingFocusTarget(raw);
      if (bookingTarget) {
        demoFocusPanelVisibleRef.current = true;
        navigationRunRef.current += 1;
        if (bookingTarget.pageId) site.setCurrentPage(bookingTarget.pageId);
        spotlightAnchor(bookingTarget.targetId, bookingTarget.targetSelector, 180);
      }
      return toGenericResult(raw);
    }

    if ((action.id === "booking-focus-package" || action.id.startsWith("booking-focus-package-")) && raw) {
      const explicitPackageId = action.id.startsWith("booking-focus-package-")
        ? action.id.replace("booking-focus-package-", "")
        : "";
      const packageId = explicitPackageId || stayCartPackageIdsFromRaw(raw)[0];
      if (packageId) {
        navigationRunRef.current += 1;
        demoPackagePanelOpenRef.current = true;
        demoFocusPanelVisibleRef.current = true;
        site.setCurrentPage(pageIdFromTarget(packageId));
        setWorkingStay((current) => ({
          ...current,
          activeTargetId: packageId,
          activePackageId: packageId,
        }));
        spotlightAnchor(packageId, `[data-tour-id="${packageId}"], #${packageId}`, 180);
      }
      return toGenericResult(raw);
    }

    if ((action.id === "booking-nav-back" || action.id === "booking-nav-next") && raw) {
      const state = navigationStateRef.current;
      if (state && state.steps.length > 1) {
        const nextIndex = action.id === "booking-nav-next"
          ? state.activeIndex + 1
          : state.activeIndex - 1;

        if (demoFixtureMode) {
          const wrappedIndex = ((nextIndex % state.steps.length) + state.steps.length) % state.steps.length;
          navigationStateRef.current = {
            ...state,
            activeIndex: wrappedIndex,
          };
          markDemoRoomPreviewViewed(wrappedIndex);
          demoPackagePanelOpenRef.current = false;
          demoFocusPanelVisibleRef.current = false;
          return toGenericResult(raw);
        }

        focusNavigationStep(state, nextIndex, 420);
        await wait(4200);
        return toGenericResult(raw);
      }

      return toGenericResult(raw);
    }

    if ((action.id === "booking-handoff" || action.id === "booking-summary") && raw) {
      applyBookingContext(raw, { preferNextStep: true });
      const bookingTarget = bookingFocusTarget(raw);
      if (bookingTarget) {
        navigationRunRef.current += 1;
        if (bookingTarget.pageId) site.setCurrentPage(bookingTarget.pageId);
        spotlightAnchor(bookingTarget.targetId, bookingTarget.targetSelector, 180);
      }
      return toGenericResult({
        ...raw,
        commerceAction: "prepare_booking",
        displayMode: "prepare_booking",
        intent: "prepare_booking",
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

  useEffect(() => {
    const handleDomiDemoAction = (event: Event) => {
      const detail = (event as CustomEvent<{ actionId?: string }>).detail;
      const actionId = String(detail?.actionId || "").trim();

      if (!(
        ["booking-nav-back", "booking-nav-next", "booking-add-room", "booking-review-packages", "booking-summary", "booking-handoff", "booking-context-continue", "booking-focus-room-preview", "booking-remove-room", "booking-edit-room-search", "booking-packages-done", "booking-focus-package"].includes(actionId) ||
        actionId.startsWith("booking-package-toggle-") ||
        actionId.startsWith("booking-focus-package-")
      )) return;

      const raw = currentRawRef.current;
      if (actionId !== "booking-context-continue" && !raw) return;

      const action: SmartBarMobileGenericAction = {
        id: actionId,
        label: actionId === "booking-nav-next"
          ? "Next"
          : actionId === "booking-nav-back"
            ? "Back"
            : actionId === "booking-add-room"
              ? "Add room"
              : actionId === "booking-review-packages"
                ? "Review packages"
                : actionId === "booking-context-continue"
                  ? "Continue search"
                  : actionId === "booking-edit-room-search"
                    ? "Edit"
                    : actionId.startsWith("booking-package-toggle-")
                      ? "Toggle package"
                      : actionId === "booking-focus-package" || actionId.startsWith("booking-focus-package-")
                        ? "Focus package"
                        : "Tap for booking",
        variant: actionId === "booking-nav-next" ? "next" : actionId === "booking-nav-back" ? "back" : "primary",
      };

      Promise.resolve(submitGenericAction(action))
        .then((nextResult) => {
          window.dispatchEvent(
            new CustomEvent("smartbar-mobile-domi-demo-result", {
              detail: { result: nextResult, actionId },
            }),
          );
        })
        .catch(() => {
          // Demo-only bridge: keep the current result if the synthetic action cannot run.
        });
    };

    window.addEventListener("smartbar-mobile-domi-demo-action", handleDomiDemoAction as EventListener);

    return () => {
      window.removeEventListener("smartbar-mobile-domi-demo-action", handleDomiDemoAction as EventListener);
    };
  }, []);

  return (
    <SmartBarMobileShell
      mode="overlay"
      entryModeLabel="Plan stay"
      buildingLabel="Checking stay options..."
      demoSubmission={demoSubmission}
      onSubmitPrompt={submitBookingQuery}
      onGenericAction={submitGenericAction}
      onResetCart={() => {
        activeResultRef.current = null;
        currentRawRef.current = null;
        threadRef.current = [];
        actionQueriesRef.current = {};
        pendingBookingQueryRef.current = "";
        site.setCurrentPage("home");
        site.setActiveAnchor(null);
        site.setSelectedRoom(null);
        site.setSelectedPackages([]);
        site.setDatesSelected(false);
        site.setGuestsSelected(false);
        site.setGuestAdults(1);
        site.setGuestChildren(0);
        site.setGuestLabel("1 adult");
        site.setBudgetBand("");
        site.setCheckInDate("2026-08-04");
        site.setCheckOutDate("2026-08-09");
        demoCommittedRoomIdRef.current = null;
        demoPackagePanelOpenRef.current = false;
        demoFocusPanelVisibleRef.current = false;
        resetDemoRoomPreviewViewed(0);
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
        demoFocusPanelVisibleRef.current = false;
        setDemoWizardStateSync({
          roomAdded: false,
          packagesReviewed: false,
          packageIds: [],
          breakfastRequested: false,
        });
      }}
    />
  );
}
