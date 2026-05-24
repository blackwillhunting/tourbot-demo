import { SMARTBAR_SPEED_BEATS } from "./smartBarSpeedScript";

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
  return (
    <div className="fixed bottom-4 left-1/2 z-[10090] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 rounded-[24px] border border-white/70 bg-white/86 px-3 py-3 shadow-[0_20px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="h-10 shrink-0 rounded-2xl bg-slate-950 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-slate-800"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <span>SmartBar speed demo</span>
            <span>{index + 1}/{SMARTBAR_SPEED_BEATS.length}</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {SMARTBAR_SPEED_BEATS.map((beat, beatIndex) => (
              <button
                key={beat.id}
                type="button"
                onClick={() => onSelect(beatIndex)}
                className={`h-2 rounded-full transition ${beatIndex <= index ? "bg-slate-950" : "bg-slate-200 hover:bg-slate-300"}`}
                aria-label={`Jump to ${beat.label}`}
              />
            ))}
          </div>
          <div className="mt-2 hidden justify-between gap-2 text-[10px] font-semibold text-slate-500 md:flex">
            {SMARTBAR_SPEED_BEATS.map((beat) => (
              <span key={`${beat.id}-label`} className="max-w-[7.5rem] truncate">
                {beat.chapter}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
