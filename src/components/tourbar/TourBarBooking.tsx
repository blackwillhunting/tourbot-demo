import { Pencil } from "lucide-react";
import TourBarShell, {
  type TourBarShellActions,
  type TourBarShellProps,
  type TourBarShellResult,
} from "./TourBarShell";

export type TourBarBookingPageTarget = {
  pageId?: string;
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
  onSubmit: TourBarShellProps["onPrimarySubmit"];
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
  onSubmit,
  onResult,
  onNextMove,
  navigationState = null,
  onBack,
  onNext,
  onBook,
  bookingHandoffOpen = false,
  bookingHandoff = null,
}: TourBarBookingProps) {
  return (
    <TourBarShell
      primaryPlaceholder="Ask TourBar to find the right stay..."
      followUpPlaceholder="Refine this stay..."
      launcherTitle="Open TourBar hotel booking"
      launcherAriaLabel="Open TourBar hotel booking"
      resultEyebrow="TourBar booking"
      initialLoadingMessage="Resolving the lowest valid room setup…"
      followUpLoadingMessage="Rechecking the matrix…"
      onPrimarySubmit={onSubmit}
      onFollowUpSubmit={onSubmit}
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
