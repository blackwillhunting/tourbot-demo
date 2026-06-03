import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, Sparkles, X } from "lucide-react";

export const SMARTBAR_PHONE_MOUNT_ANIMATION_MS = 5200;

type PhoneMountStage = "launcher" | "tap" | "entry" | "ready";

const PHONE_MOUNT_STAGE_TIMERS: Array<{ delayMs: number; stage: PhoneMountStage }> = [
  { delayMs: 850, stage: "tap" },
  { delayMs: 1420, stage: "entry" },
  { delayMs: 3100, stage: "ready" },
];

function SmartBarPhonePointer({ stage }: { stage: PhoneMountStage }) {
  const visible = stage === "tap" || stage === "entry";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="smartbar-phone-pointer"
          aria-hidden="true"
          initial={{ opacity: 0, x: 92, y: -82, scale: 0.96 }}
          animate={{ opacity: 1, x: -10, y: 0, scale: stage === "tap" ? 1 : 0.9 }}
          exit={{ opacity: 0, x: -26, y: 10, scale: 0.88 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-1/2 bottom-[108px] z-40 -ml-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/10"
        >
          {stage === "tap" && (
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0.55, scale: 0.68 }}
              animate={{ opacity: 0, scale: 2.15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-sky-500/80"
            />
          )}
          <span className="h-3.5 w-3.5 rounded-full bg-slate-950" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function SmartBarPhoneMountAnimation() {
  const [stage, setStage] = useState<PhoneMountStage>("launcher");
  const open = stage === "entry" || stage === "ready";

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
      transition={{ duration: 0.26, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div className="absolute inset-x-0 bottom-0 h-[46svh] bg-gradient-to-t from-sky-100/72 via-sky-50/26 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut", delay: 0.12 }}
        className="absolute inset-x-0 bottom-[74px] z-30 flex justify-center px-4"
      >
        <div className="relative flex w-full max-w-[430px] items-center justify-center gap-2">
          <AnimatePresence>
            {open ? (
              <motion.div
                key="phone-mount-close"
                initial={{ opacity: 0, x: 28, scale: 0.78 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 18, scale: 0.86 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/72 bg-white/88 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/5 backdrop-blur-xl"
              >
                <X className="h-4 w-4" />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.86 }}
            className={`flex shrink-0 items-center justify-center overflow-hidden border border-white/70 bg-white/82 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_46px_rgba(15,23,42,0.16)] ring-1 ring-sky-200/65 backdrop-blur-2xl ${
              open
                ? "h-[88px] w-[min(calc(100vw-7.5rem),350px)] rounded-[30px]"
                : "h-[58px] w-[218px] rounded-full"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {!open ? (
                <motion.div
                  key="phone-mount-launcher"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-2 px-5 text-sm font-black tracking-tight"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span>SmartBar</span>
                </motion.div>
              ) : (
                <motion.div
                  key="phone-mount-entry"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex h-full w-full flex-col items-center justify-center px-5 text-center"
                >
                  <div className="text-base font-black leading-none tracking-tight">Type order</div>
                  <div className="mt-2 h-2 w-32 rounded-full bg-slate-950/12" />
                  <div className="mt-2 h-2 w-24 rounded-full bg-slate-950/8" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {open ? (
              <motion.div
                key="phone-mount-submit"
                initial={{ opacity: 0, x: -28, scale: 0.78 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -18, scale: 0.86 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.24)] ring-1 ring-slate-950/10"
              >
                <SendHorizonal className="h-4 w-4" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      <SmartBarPhonePointer stage={stage} />
    </motion.div>
  );
}
