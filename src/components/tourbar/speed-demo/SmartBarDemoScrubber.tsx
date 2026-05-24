import { SMARTBAR_SPEED_STEPS } from "./smartBarSpeedScript";

export default function SmartBarDemoScrubber({
  index,
  isPlaying,
  onSelect,
  onTogglePlay,
}: {
  index: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  onTogglePlay: () => void;
}) {
  const active = SMARTBAR_SPEED_STEPS[index] || SMARTBAR_SPEED_STEPS[0];

  return (
    <div className="fixed bottom-4 left-1/2 z-[10090] w-[calc(100vw-2rem)] max-w-5xl -translate-x-1/2 rounded-[24px] border border-white/70 bg-white/88 px-3 py-3 shadow-[0_20px_70px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="h-10 shrink-0 rounded-2xl bg-slate-950 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-slate-800"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                SmartBar sheet choreography · {active.chapter}
              </div>
              <div className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                {active.label} — <span className="font-medium text-slate-500">{active.helper}</span>
              </div>
            </div>
            <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {index + 1}/{SMARTBAR_SPEED_STEPS.length}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {SMARTBAR_SPEED_STEPS.map((step, stepIndex) => (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelect(stepIndex)}
                className={`h-2 rounded-full transition ${stepIndex <= index ? "bg-slate-950" : "bg-slate-200 hover:bg-slate-300"}`}
                aria-label={`Jump to ${step.label}`}
                title={step.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
