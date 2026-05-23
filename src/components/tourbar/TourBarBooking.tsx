import TourBarShell, {
  type TourBarShellProps,
} from "./TourBarShell";

type TourBarBookingProps = Pick<
  TourBarShellProps,
  "onResult" | "onNextMove" | "renderResultExtras" | "renderStandaloneSheet"
> & {
  onSubmit: TourBarShellProps["onPrimarySubmit"];
};

export default function TourBarBooking({
  onSubmit,
  onResult,
  onNextMove,
  renderResultExtras,
  renderStandaloneSheet,
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
      renderResultExtras={renderResultExtras}
      renderStandaloneSheet={renderStandaloneSheet}
    />
  );
}
