import { motion, AnimatePresence } from "framer-motion";

export type DemoPointerPosition = {
  x: number;
  y: number;
  label?: string;
};

export type DemoPointerMode = "pointer" | "tap";

const POINTER_HOTSPOT_X = 18;
const POINTER_HOTSPOT_Y = 8;
const TAP_HOTSPOT_X = 18;
const TAP_HOTSPOT_Y = 18;
const POINTER_TEXT_SIZE_CLASS = "text-4xl";
const CLICK_PULSE_SIZE_CLASS = "h-8 w-8";
const CLICK_PULSE_LEFT_CLASS = "left-1";
const CLICK_PULSE_TOP_CLASS = "top-1";
const TAP_PULSE_SIZE_CLASS = "h-14 w-14";

export default function DemoPointer({
  position,
  visible,
  pulseKey = 0,
  mode = "pointer",
}: {
  position: DemoPointerPosition | null;
  visible: boolean;
  pulseKey?: number;
  mode?: DemoPointerMode;
}) {
  if (mode === "tap") {
    const tapKey = position
      ? `tap-${Math.round(position.x)}-${Math.round(position.y)}-${pulseKey}`
      : "tap";

    return (
      <AnimatePresence>
        {visible && position && (
          <motion.div
            key={tapKey}
            initial={{
              opacity: 0,
              scale: 0.82,
              x: position.x - TAP_HOTSPOT_X,
              y: position.y - TAP_HOTSPOT_Y,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.82, 1, 0.92, 1.08],
              x: position.x - TAP_HOTSPOT_X,
              y: position.y - TAP_HOTSPOT_Y,
            }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.78, ease: "easeOut" }}
            className="pointer-events-none fixed left-0 top-0 z-[10040]"
          >
            <div className="relative">
              <motion.div
                initial={{ opacity: 0.95, scale: 0.3 }}
                animate={{ opacity: 0, scale: 1.95 }}
                transition={{ duration: 0.72, ease: "easeOut" }}
                className={`absolute -left-2 -top-2 ${TAP_PULSE_SIZE_CLASS} rounded-full border-4 border-slate-950/70 bg-slate-950/15 shadow-2xl shadow-slate-950/35`}
              />
              <motion.div
                animate={{
                  scale: [1, 0.72, 1.18, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`${POINTER_TEXT_SIZE_CLASS} drop-shadow-2xl`}
              >
                👆
              </motion.div>
              {position.label && (
                <div className="absolute left-6 top-6 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl">
                  {position.label}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {visible && position && (
        <motion.div
          initial={{ opacity: 0, scale: 0.45 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: position.x - POINTER_HOTSPOT_X,
            y: position.y - POINTER_HOTSPOT_Y,
          }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="pointer-events-none fixed left-0 top-0 z-[10040]"
        >
          <div className="relative">
            <AnimatePresence>
              {pulseKey > 0 && (
                <motion.div
                  key={pulseKey}
                  initial={{ opacity: 0.9, scale: 0.35 }}
                  animate={{ opacity: 0, scale: 3.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.62, ease: "easeOut" }}
                  className={`absolute ${CLICK_PULSE_LEFT_CLASS} ${CLICK_PULSE_TOP_CLASS} ${CLICK_PULSE_SIZE_CLASS} rounded-full border-4 border-slate-950/70 bg-slate-950/20 shadow-2xl shadow-slate-950/40`}
                />
              )}
            </AnimatePresence>
            <motion.div
              key={`tap-${pulseKey}`}
              animate={
                pulseKey > 0
                  ? { scale: [1, 0.72, 1.18, 1], rotate: [0, -8, 8, 0] }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.46, ease: "easeOut" }}
              className={`${POINTER_TEXT_SIZE_CLASS} drop-shadow-2xl`}
            >
              👆
            </motion.div>
            {position.label && (
              <div className="absolute left-6 top-6 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xl">
                {position.label}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
