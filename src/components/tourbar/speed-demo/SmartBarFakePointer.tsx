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
                    className="absolute -left-3 -top-3 h-7 w-7 rounded-full border-2 border-emerald-300/80 bg-emerald-300/20 shadow-[0_0_24px_rgba(16,185,129,0.45)]"
                    initial={{ opacity: 0.95, scale: 0.45 }}
                    animate={{ opacity: 0, scale: 4.4 }}
                    transition={{ duration: 0.72, ease: "easeOut" }}
                  />
                  <motion.span
                    className="absolute -left-2 -top-2 h-5 w-5 rounded-full border border-white/90 bg-emerald-400/35"
                    initial={{ opacity: 0.9, scale: 0.7 }}
                    animate={{ opacity: 0, scale: 1.7 }}
                    transition={{ duration: 0.38, ease: "easeOut" }}
                  />
                </>
              ) : null}

              <SmartBarFakePointerIcon />

              {null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
