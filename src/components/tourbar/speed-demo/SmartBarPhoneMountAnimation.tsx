import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, Sparkles, X } from "lucide-react";

export const SMARTBAR_PHONE_MOUNT_ANIMATION_MS = 3000;

type PhoneMountStage = "launcher" | "tap" | "entry";

const PHONE_MOUNT_STAGE_TIMERS: Array<{ delayMs: number; stage: PhoneMountStage }> = [
  { delayMs: 650, stage: "tap" },
  { delayMs: 1100, stage: "entry" },
];

function PhonePointer({ stage }: { stage: PhoneMountStage }) {
  const showPointer = stage === "tap";

  return (
    <AnimatePresence>
      {showPointer ? (
        <motion.div
          key="phone-mount-pointer"
          aria-hidden="true"
          initial={{ opacity: 0, x: 94, y: -92, scale: 0.96 }}
          animate={{ opacity: 1, x: 28, y: -8, scale: 1 }}
          exit={{ opacity: 0, x: 18, y: -4, scale: 0.92 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-[88px] left-1/2 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/96 shadow-[0_12px_28px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/10"
        >
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0.7, scale: 0.62 }}
            animate={{ opacity: 0, scale: 2.2 }}
            transition={{ duration: 0.48, ease: "easeOut", delay: 0.24 }}
            className="absolute inset-0 rounded-full border-2 border-sky-500/75"
          />
          <span className="h-3.5 w-3.5 rounded-full bg-slate-950" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function SmartBarPhoneMountAnimation() {
  const [stage, setStage] = useState<PhoneMountStage>("launcher");
  const open = stage === "entry";

  useEffect(() => {
    const timers = PHONE_MOUNT_STAGE_TIMERS.map(({ delayMs, stage: nextStage }) =>
      window.setTimeout(() => setStage(nextStage), delayMs),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div className="absolute inset-x-0 bottom-0 h-[42svh] bg-gradient-to-t from-sky-100/78 via-sky-50/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute inset-x-0 bottom-[74px] z-30 flex justify-center px-4"
      >
        <div className="relative h-[132px] w-full max-w-[430px]">
          <AnimatePresence>
            {open ? (
              <motion.div
                key="phone-mount-entry"
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 330, damping: 30, mass: 0.72 }}
                className="absolute inset-x-6 bottom-[58px] h-[82px] overflow-hidden rounded-[30px] border border-white/70 bg-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_46px_rgba(15,23,42,0.16)] ring-1 ring-sky-200/65 backdrop-blur-2xl"
              >
                <div className="flex h-full items-center justify-center px-5 text-center text-base font-black tracking-tight text-slate-950">
                  Type order
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.74 }}
            className="absolute bottom-0 left-1/2 flex h-[54px] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/82 px-5 text-sm font-black tracking-tight text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_46px_rgba(15,23,42,0.16)] ring-1 ring-sky-200/65 backdrop-blur-2xl"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "type-order" : "smartbar"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {open ? "Type order" : "SmartBar"}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {open ? (
              <>
                <motion.div
                  key="phone-mount-close"
                  initial={{ opacity: 0, x: -18, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -12, scale: 0.86 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute bottom-[5px] left-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/72 bg-white/88 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/5 backdrop-blur-xl"
                >
                  <X className="h-4 w-4" />
                </motion.div>
                <motion.div
                  key="phone-mount-submit"
                  initial={{ opacity: 0, x: 18, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.86 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute bottom-[5px] right-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.24)] ring-1 ring-slate-950/10"
                >
                  <SendHorizonal className="h-4 w-4" />
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          <PhonePointer stage={stage} />
        </div>
      </motion.div>
    </motion.div>
  );
}
