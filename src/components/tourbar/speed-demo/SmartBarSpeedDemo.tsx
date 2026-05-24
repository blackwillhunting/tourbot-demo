import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CheckCircle2, SendHorizonal, Sparkles, X } from "lucide-react";
import { smartbarFocusTarget } from "../smartbarFocusController";
import SmartBarDemoPointer from "./SmartBarDemoPointer";
import SmartBarDemoScrubber from "./SmartBarDemoScrubber";
import SmartBarSpeedTargetWall from "./SmartBarSpeedTargetWall";
import { SMARTBAR_SPEED_BEATS, SMARTBAR_SPEED_TOOL_FLASHES, type SmartBarSpeedTool } from "./smartBarSpeedScript";

const BEAT_MS = 5200;
const TYPE_MS = 24;

function useTypedPrompt(prompt = "", beatId: string) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    if (!prompt) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(prompt.slice(0, index));
      if (index >= prompt.length) window.clearInterval(timer);
    }, TYPE_MS);

    return () => window.clearInterval(timer);
  }, [prompt, beatId]);

  return typed;
}

function ToolBadge({ tool }: { tool?: SmartBarSpeedTool }) {
  const copy: Record<SmartBarSpeedTool, string> = {
    info: "Info sheet",
    tiles: "Action tiles",
    selector: "Selector",
    cart: "Cart",
    summary: "Summary",
    chat: "Chat thread",
  };

  return tool ? (
    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
      {copy[tool]}
    </span>
  ) : null;
}

function Callout({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="fixed left-4 top-4 z-[10080] max-w-[calc(100vw-2rem)] rounded-[24px] border border-white/70 bg-white/88 px-4 py-3 text-sm font-semibold leading-5 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:left-8 sm:top-8 sm:max-w-sm sm:px-5 sm:py-4 sm:text-base"
    >
      {text}
    </motion.div>
  );
}

function SheetContent({ tool, body, chips = [] }: { tool?: SmartBarSpeedTool; body: string; chips?: string[] }) {
  if (tool === "selector") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-slate-600">{body}</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            [CalendarDays, "Dates", "May 31–Jun 2"],
            [CheckCircle2, "Guests", "2 adults"],
          ].map(([Icon, label, value]) => {
            const ToolIcon = Icon as typeof CalendarDays;
            return (
              <button key={String(label)} type="button" className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <ToolIcon className="h-4 w-4 text-slate-500" />
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{String(label)}</div>
                <div className="text-sm font-semibold text-slate-950">{String(value)}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (tool === "cart") {
    return (
      <div className="space-y-2.5">
        {["Double cheeseburger combo", "Large fries", "Large Diet Coke", "Apple pie"].map((item, index) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-semibold text-slate-800">{item}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] text-emerald-700">{index === 0 ? "Combo" : "Ready"}</span>
          </div>
        ))}
      </div>
    );
  }

  if (tool === "chat") {
    return (
      <div className="space-y-2.5">
        <div className="rounded-2xl bg-sky-50 px-3 py-2 text-sm font-medium text-slate-800">I need help scoping this.</div>
        <div className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-100">Hold for next consultant...</div>
      </div>
    );
  }

  if (tool === "tiles") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-slate-600">{body}</p>
        <div className="grid gap-2">
          {(chips.length ? chips : ["Option A", "Option B", "Option C"]).map((chip, index) => (
            <button key={chip} type="button" className={`rounded-2xl px-3 py-2 text-left text-sm font-semibold shadow-sm ring-1 transition ${index === 0 ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"}`}>
              {chip}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (tool === "summary") {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-slate-600">{body}</p>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <div className="font-bold">Recommended path</div>
          <div className="mt-1 leading-5">Ocean View Suite + breakfast package. Ready for booking handoff.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">{body}</p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{chip}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SmartBarStage({
  typedPrompt,
  title,
  body,
  chips,
  tool,
  finaleTool,
}: {
  typedPrompt: string;
  title: string;
  body: string;
  chips?: string[];
  tool?: SmartBarSpeedTool;
  finaleTool?: SmartBarSpeedTool;
}) {
  const visibleTool = finaleTool || tool;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[10070] sm:bottom-auto sm:left-auto sm:right-6 sm:top-6 sm:w-[470px]">
      <div data-tourbar-open-panel="true" className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/96 shadow-[0_22px_72px_rgba(15,23,42,0.18)] ring-1 ring-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950">
            <span className={typedPrompt ? "" : "text-slate-400"}>{typedPrompt || "Ask SmartBar in plain English..."}</span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-slate-950" />
          </div>
          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {visibleTool && (
          <motion.div
            key={`${title}-${visibleTool}`}
            data-tourbar-sheet-panel="true"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="mt-2 rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)] ring-1 ring-white/80 backdrop-blur-xl sm:mt-3"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ToolBadge tool={visibleTool} />
                </div>
                <h3 className="mt-2 text-lg font-semibold leading-6 tracking-tight text-slate-950">{title}</h3>
              </div>
              <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SheetContent tool={visibleTool} body={body} chips={chips} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SmartBarSpeedDemo() {
  const [beatIndex, setBeatIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [finaleFlashIndex, setFinaleFlashIndex] = useState(0);
  const beat = SMARTBAR_SPEED_BEATS[beatIndex] || SMARTBAR_SPEED_BEATS[0];
  const typedPrompt = useTypedPrompt(beat.prompt || "", beat.id);
  const isFinale = beat.id === "finale";
  const finaleTool = isFinale ? SMARTBAR_SPEED_TOOL_FLASHES[finaleFlashIndex % SMARTBAR_SPEED_TOOL_FLASHES.length]?.tool : undefined;

  const pointerTarget = useMemo(() => {
    if (isFinale) return "sheet" as const;
    if (!beat.prompt) return "bar" as const;
    if (typedPrompt.length < (beat.prompt || "").length) return "input" as const;
    return beat.targetId ? "target" as const : "sheet" as const;
  }, [beat.prompt, beat.targetId, isFinale, typedPrompt.length]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      setBeatIndex((current) => (current + 1) % SMARTBAR_SPEED_BEATS.length);
    }, BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [beatIndex, isPlaying]);

  useEffect(() => {
    if (!isFinale) {
      setFinaleFlashIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setFinaleFlashIndex((index) => index + 1);
    }, 720);
    return () => window.clearInterval(timer);
  }, [isFinale]);

  useEffect(() => {
    if (!beat.targetId) return;
    const delay = beat.prompt ? Math.min(1400, 420 + beat.prompt.length * TYPE_MS) : 520;
    const timer = window.setTimeout(() => {
      void smartbarFocusTarget(
        { targetId: beat.targetId, label: beat.label },
        { initialDelayMs: 0, overlayDurationMs: 1500, dispatchLegacyEvent: false, scrollBehavior: "smooth" },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [beat.id, beat.targetId, beat.prompt, beat.label]);

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-950">
      <SmartBarSpeedTargetWall />
      <AnimatePresence mode="wait">
        <Callout key={beat.callout} text={beat.callout} />
      </AnimatePresence>
      <SmartBarStage
        typedPrompt={typedPrompt}
        title={isFinale ? SMARTBAR_SPEED_TOOL_FLASHES[finaleFlashIndex % SMARTBAR_SPEED_TOOL_FLASHES.length]?.label || beat.title : beat.title}
        body={beat.body}
        chips={beat.chips}
        tool={beat.tool}
        finaleTool={finaleTool}
      />
      <SmartBarDemoPointer target={pointerTarget} />
      <SmartBarDemoScrubber
        index={beatIndex}
        isPlaying={isPlaying}
        onSelect={(index) => {
          setBeatIndex(index);
          setIsPlaying(false);
        }}
        onTogglePlay={() => setIsPlaying((value) => !value)}
      />
      <div className="fixed bottom-[5.75rem] right-4 z-[10089] hidden rounded-full border border-white/70 bg-white/84 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 shadow-sm backdrop-blur md:block">
        {beat.chapter} · {beat.label}
      </div>
    </div>
  );
}
