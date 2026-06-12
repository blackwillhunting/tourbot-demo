import { AnimatePresence, motion } from "framer-motion";

export const SMARTBAR_FAKE_POINTER_AIM_MS = 260;
export const SMARTBAR_FAKE_POINTER_PULSE_MS = 760;
export const SMARTBAR_FAKE_POINTER_EXIT_MS = 180;
export const SMARTBAR_FAKE_POINTER_TIP_OFFSET_X = 5;
export const SMARTBAR_FAKE_POINTER_TIP_OFFSET_Y = 4;

export type SmartBarFakePointerPhase = "aim" | "pulse";

export type SmartBarFakePointerState = {
  id: number;
  x: number;
  y: number;
  label?: string;
  phase: SmartBarFakePointerPhase;
};

export type SmartBarFakePointerPositionOptions = {
  id: number;
  label?: string;
  phase?: SmartBarFakePointerPhase;
  anchorX?: number;
  anchorY?: number;
  offsetX?: number;
  offsetY?: number;
};

function clampToViewport(value: number, max: number) {
  return Math.min(Math.max(value, 18), Math.max(18, max - 54));
}

export function makeSmartBarFakePointerState(
  target: HTMLElement,
  {
    id,
    label,
    phase = "aim",
    anchorX = 0.56,
    anchorY = 0.48,
    offsetX = 0,
    offsetY = 0,
  }: SmartBarFakePointerPositionOptions,
): SmartBarFakePointerState {
  const rect = target.getBoundingClientRect();
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;

  return {
    id,
    x: clampToViewport(
      rect.left + rect.width * anchorX + offsetX - SMARTBAR_FAKE_POINTER_TIP_OFFSET_X,
      viewportWidth,
    ),
    y: clampToViewport(
      rect.top + rect.height * anchorY + offsetY - SMARTBAR_FAKE_POINTER_TIP_OFFSET_Y,
      viewportHeight,
    ),
    label,
    phase,
  };
}

function SmartBarFakePointerIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="h-9 w-9 drop-shadow-[0_10px_18px_rgba(15,23,42,0.28)]"
    >
      <path
        d="M5.5 3.5L25.5 17.4L16.2 19.1L12.4 28.2L5.5 3.5Z"
        fill="white"
        stroke="#0f172a"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M16.2 19.1L21.2 26.6"
        stroke="#0f172a"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SmartBarFakePointerOverlay({ pointer }: { pointer: SmartBarFakePointerState | null }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[10140]">
      <AnimatePresence>
        {pointer ? (
          <motion.div
            key={pointer.id}
            initial={{
              opacity: 0,
              x: pointer.x + 42,
              y: pointer.y + 54,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              x: pointer.x,
              y: pointer.y,
              scale: pointer.phase === "pulse" ? 0.94 : 1,
            }}
            exit={{
              opacity: 0,
              x: pointer.x + 10,
              y: pointer.y + 12,
              scale: 0.92,
            }}
            transition={{
              duration: pointer.phase === "pulse" ? 0.14 : 0.24,
              ease: "easeOut",
            }}
            className="absolute left-0 top-0"
          >
            <div className="relative">
              {pointer.phase === "pulse" ? (
                <>
                  <motion.span
                    className="absolute -left-2.5 -top-2.5 h-6 w-6 rounded-full border border-white/80 bg-white/24 shadow-[0_0_18px_rgba(255,255,255,0.38)]"
                    initial={{ opacity: 0.82, scale: 0.55 }}
                    animate={{ opacity: 0, scale: 2.25 }}
                    transition={{ duration: 0.46, ease: "easeOut" }}
                  />
                  <motion.span
                    className="absolute -left-1.5 -top-1.5 h-4 w-4 rounded-full border border-slate-900/12 bg-emerald-300/22"
                    initial={{ opacity: 0.66, scale: 0.72 }}
                    animate={{ opacity: 0, scale: 1.35 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  />
                </>
              ) : null}

              <SmartBarFakePointerIcon />

              {pointer.label ? (
                <div className="pointer-events-none absolute left-7 top-7 whitespace-nowrap rounded-full border border-slate-200 bg-white/96 px-3 py-1.5 text-[12px] font-black text-slate-900 shadow-xl shadow-slate-950/18 ring-1 ring-white/80">
                  {pointer.label}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
