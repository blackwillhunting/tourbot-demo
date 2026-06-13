import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, SendHorizonal, X } from "lucide-react";
import SmartBarDemoToolbarFrame, {
  type SmartBarDemoToolbarPlacement,
  type SmartBarDemoToolbarSurface,
} from "./SmartBarDemoToolbarFrame";
import {
  SmartBarFakePointerOverlay,
  makeSmartBarFakePointerState,
  type SmartBarFakePointerState,
} from "./SmartBarFakePointer";

// SmartBar Fits Anywhere preview uses the compass icon and dark blue SmartBar chrome.
type AnimationStage = {
  surface: SmartBarDemoToolbarSurface;
  placement: SmartBarDemoToolbarPlacement;
  open: boolean;
};

const STAGE_MS = 760;
const OPEN_STAGE_HOLD_MS = 1260;
const FITS_POINTER_DELAY_MS = 120;
const FITS_POINTER_AIM_MS = 220;
const FITS_POINTER_PULSE_MS = 390;

const STAGES: AnimationStage[] = [
  { surface: "info", placement: "right", open: false },
  { surface: "info", placement: "right", open: true },
  { surface: "info", placement: "right", open: false },
  { surface: "booking", placement: "middleRight", open: false },
  { surface: "booking", placement: "middleRight", open: true },
  { surface: "booking", placement: "middleRight", open: false },
  { surface: "ordering", placement: "left", open: false },
  { surface: "ordering", placement: "left", open: true },
  { surface: "ordering", placement: "left", open: false },
  { surface: "info", placement: "right", open: false },
];

function fitsAnywhereStageDuration(stage: AnimationStage) {
  return stage.open ? OPEN_STAGE_HOLD_MS : STAGE_MS;
}

export const FITS_ANYWHERE_ANIMATION_MS =
  STAGES.reduce((total, stage) => total + fitsAnywhereStageDuration(stage), 0) + STAGE_MS;

function SmartBarLauncherButton() {
  return (
    <motion.button
      key="tourbar-launcher"
      type="button"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="group absolute inset-0 inline-flex items-center justify-center overflow-hidden rounded-full bg-[#17227c] text-white shadow-[0_18px_40px_rgba(23,34,124,0.24),inset_0_1px_1px_rgba(255,255,255,0.18)] ring-1 ring-white/15"
      aria-label="SmartBar launcher preview"
      title="SmartBar launcher preview"
      data-smartbar-fits-launcher="true"
    >
      <span className="pointer-events-none inline-flex h-full w-full items-center justify-center rounded-full animate-pulse">
        <Compass className="h-4 w-4" />
      </span>
    </motion.button>
  );
}

function SmartBarOpenBar({ placement }: { placement: SmartBarDemoToolbarPlacement }) {
  const opensRight = placement === "left";

  return (
    <motion.div
      key="tourbar-open"
      data-tourbar-open-panel="true"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`absolute ${opensRight ? "left-0" : "right-0"} top-1/2 w-[calc(100vw-2rem)] -translate-y-1/2 sm:w-[430px] md:w-[470px]`}
    >
      <div className="relative">
        <div className="overflow-hidden rounded-[22px] border border-white/25 bg-[linear-gradient(180deg,rgba(29,43,145,0.98),rgba(23,34,124,0.96))] text-white shadow-[0_24px_62px_rgba(23,34,124,0.28),inset_0_1px_1px_rgba(255,255,255,0.18)] ring-1 ring-white/15 backdrop-blur-xl">
          <div className="flex items-end gap-2 px-2.5 py-2">
            <span className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]">
              <Compass className="h-4 w-4" />
            </span>
            <div className="max-h-32 min-h-8 flex-1 overflow-hidden bg-transparent py-1 text-sm font-extrabold leading-6 text-white/72">
              Ask SmartBar in plain English...
            </div>
            <button
              type="button"
              disabled
              className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 text-white opacity-55 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]"
              aria-label="Submit SmartBar preview query"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70"
              aria-label="Close SmartBar preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SmartBarPreviewNode({ placement, open }: { placement: SmartBarDemoToolbarPlacement; open: boolean }) {
  return (
    <div data-tourbar-shell-root="true" className="relative z-[10060] h-9 w-9 shrink-0">
      <AnimatePresence mode="wait">
        {!open ? <SmartBarLauncherButton /> : <SmartBarOpenBar placement={placement} />}
      </AnimatePresence>
    </div>
  );
}

export default function SmartBarFitsAnywhereAnimation() {
  const [stageIndex, setStageIndex] = useState(0);
  const [fakePointer, setFakePointer] = useState<SmartBarFakePointerState | null>(null);
  const pointerIdRef = useRef(0);
  const stage = STAGES[stageIndex] || STAGES[STAGES.length - 1];

  useEffect(() => {
    let elapsedMs = fitsAnywhereStageDuration(STAGES[0]);
    const timers = STAGES.slice(1).map((_, index) => {
      const timer = window.setTimeout(() => setStageIndex(index + 1), elapsedMs);
      elapsedMs += fitsAnywhereStageDuration(STAGES[index + 1]);
      return timer;
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const nextStage = STAGES[stageIndex + 1];
    const shouldPulseLauncher =
      !stage.open &&
      Boolean(nextStage?.open) &&
      nextStage?.surface === stage.surface &&
      nextStage?.placement === stage.placement;

    if (!shouldPulseLauncher) return;

    const timers: number[] = [];
    const setTimer = (callback: () => void, delayMs: number) => {
      const timer = window.setTimeout(callback, delayMs);
      timers.push(timer);
    };

    setTimer(() => {
      const target = document.querySelector<HTMLElement>('[data-smartbar-fits-launcher="true"]');
      if (!target) return;

      const pointerId = pointerIdRef.current + 1;
      pointerIdRef.current = pointerId;

      setFakePointer(
        makeSmartBarFakePointerState(target, {
          id: pointerId,
          label: "",
          anchorX: 0.52,
          anchorY: 0.5,
        }),
      );

      setTimer(() => {
        setFakePointer((current) =>
          current?.id === pointerId
            ? {
                ...current,
                phase: "pulse",
              }
            : current,
        );
      }, FITS_POINTER_AIM_MS);

      setTimer(() => {
        setFakePointer((current) => (current?.id === pointerId ? null : current));
      }, FITS_POINTER_AIM_MS + FITS_POINTER_PULSE_MS);
    }, FITS_POINTER_DELAY_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [stage.open, stage.placement, stage.surface, stageIndex]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6"
      >
        <SmartBarDemoToolbarFrame
          surface={stage.surface}
          placement={stage.placement}
          animateOptions={false}
          smartBarNode={<SmartBarPreviewNode placement={stage.placement} open={stage.open} />}
        />
      </motion.div>

      <SmartBarFakePointerOverlay pointer={fakePointer} />
    </>
  );
}
