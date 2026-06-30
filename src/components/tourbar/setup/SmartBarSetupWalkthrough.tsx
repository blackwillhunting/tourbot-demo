import { type ReactNode } from "react";
import { motion, type Transition } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  Code2,
  EyeOff,
  FileSearch,
  Monitor,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  ToggleRight,
  Wifi,
} from "lucide-react";

export type SmartBarSetupWalkthroughStep = {
  title: string;
  eyebrow: string;
  message: string;
};

export const SMARTBAR_SETUP_WALKTHROUGH_STEPS: SmartBarSetupWalkthroughStep[] = [
  {
    title: "Menu Scan",
    eyebrow: "Step 1 of 5",
    message: "SmartBar reads your public menu, choices, modifiers, hours, and ordering rules.",
  },
  {
    title: "Sandbox Testing",
    eyebrow: "Step 2 of 5",
    message: "Test private orders in a sandbox before anything appears on your live site.",
  },
  {
    title: "Ghost Mode Setup",
    eyebrow: "Step 3 of 5",
    message: "Add the SmartBar snippet invisibly so the real site can be tested without customers seeing it.",
  },
  {
    title: "Retesting",
    eyebrow: "Step 4 of 5",
    message: "Run private test orders again on the real site and confirm clean tickets on the restaurant side.",
  },
  {
    title: "Go Live",
    eyebrow: "Step 5 of 5",
    message: "Turn SmartBar on and start receiving live order tickets on the order board.",
  },
];

const floatTransition: Transition = {
  duration: 1.15,
  ease: [0.22, 1, 0.36, 1],
};

function AnimatedTile({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={false}
      animate={isActive ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.88, y: 8, scale: 0.985 }}
      transition={floatTransition}
      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[26px] border border-white/82 bg-sky-50/88 shadow-[0_18px_48px_rgba(1,33,105,0.10)] ring-1 ring-[#012169]/8 sm:h-32 sm:w-32 sm:rounded-[34px]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,_rgba(56,189,248,0.18),_transparent_36%),linear-gradient(135deg,_rgba(255,255,255,0.72),_rgba(239,248,255,0.52))]" />
      {children}
    </motion.div>
  );
}

function SoftPulse({ isActive, className = "" }: { isActive: boolean; className?: string }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={
        isActive
          ? { opacity: [0.28, 0.78, 0.28], scale: [0.9, 1.18, 0.9] }
          : { opacity: 0.2, scale: 0.95 }
      }
      transition={isActive ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.35 }}
      className={`absolute rounded-full bg-sky-300/38 blur-[1px] ${className}`}
    />
  );
}

function MenuScanIcon({ isActive }: { isActive: boolean }) {
  const tags = ["menu", "sizes", "mods", "pickup"];

  return (
    <AnimatedTile isActive={isActive}>
      <div className="absolute left-5 top-4 rounded-2xl bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <FileSearch className="h-7 w-7 text-[#012169]" />
      </div>
      <motion.div
        initial={false}
        animate={isActive ? { x: 36, y: 38, opacity: 1, scale: 1 } : { x: 18, y: 24, opacity: 0.68, scale: 0.92 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#012169] text-white shadow-[0_10px_24px_rgba(1,33,105,0.22)]"
      >
        <Search className="h-5 w-5" />
      </motion.div>
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-1.5">
        {tags.map((tag, index) => (
          <motion.div
            key={tag}
            initial={false}
            animate={
              isActive
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0.54, y: 8 + index * 2, scale: 0.95 }
            }
            transition={{ delay: isActive ? index * 0.06 : 0, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-full bg-white px-2 py-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm ring-1 ring-slate-200/70"
          >
            {tag}
          </motion.div>
        ))}
      </div>
    </AnimatedTile>
  );
}

function SandboxIcon({ isActive }: { isActive: boolean }) {
  return (
    <AnimatedTile isActive={isActive}>
      <SoftPulse isActive={isActive} className="left-8 top-7 h-16 w-16" />
      <div className="absolute inset-x-5 top-5 rounded-[20px] bg-white px-3 pb-5 pt-3 shadow-[0_12px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <div className="mb-2 flex items-center justify-between">
          <Monitor className="h-5 w-5 text-[#012169]" />
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-sky-700">Test</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-slate-200" />
          <div className="h-1.5 w-3/4 rounded-full bg-slate-200" />
        </div>
      </div>
      <motion.div
        initial={false}
        animate={isActive ? { y: 0, opacity: 1, rotate: 0 } : { y: 28, opacity: 0.48, rotate: -2 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-4 right-4 rounded-2xl bg-white p-2.5 text-emerald-600 shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-1 ring-emerald-100"
      >
        <ReceiptText className="h-6 w-6" />
      </motion.div>
    </AnimatedTile>
  );
}

function GhostModeIcon({ isActive }: { isActive: boolean }) {
  return (
    <AnimatedTile isActive={isActive}>
      <motion.div
        initial={false}
        animate={isActive ? { x: 0, opacity: 1 } : { x: -22, opacity: 0.58 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-4 top-5 rounded-2xl bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80"
      >
        <Code2 className="h-6 w-6 text-[#012169]" />
      </motion.div>
      <motion.div
        initial={false}
        animate={isActive ? { opacity: 0.42, y: 0, scale: 1 } : { opacity: 0.18, y: 12, scale: 0.94 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-4 right-4 top-[58px] flex h-8 items-center justify-center rounded-full bg-[#012169] text-[11px] font-black tracking-[-0.03em] text-white shadow-[0_12px_28px_rgba(1,33,105,0.16)]"
      >
        SmartBar
      </motion.div>
      <motion.div
        initial={false}
        animate={isActive ? { x: 0, opacity: 1, scale: 1 } : { x: 16, opacity: 0.6, scale: 0.94 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-1 ring-sky-100"
      >
        <EyeOff className="h-5 w-5" />
      </motion.div>
      <div className="absolute bottom-5 left-5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_10px_22px_rgba(15,23,42,0.10)] ring-1 ring-emerald-100">
        <ShieldCheck className="h-5 w-5" />
      </div>
    </AnimatedTile>
  );
}

function RetestingIcon({ isActive }: { isActive: boolean }) {
  return (
    <AnimatedTile isActive={isActive}>
      <motion.div
        initial={false}
        animate={isActive ? { rotate: 360, opacity: 1 } : { rotate: 0, opacity: 0.58 }}
        transition={isActive ? { duration: 1.25, ease: "easeInOut" } : { duration: 0.35 }}
        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#012169] shadow-[0_12px_24px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80"
      >
        <RefreshCw className="h-5 w-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={isActive ? { y: 0, opacity: 1, scale: 1 } : { y: 18, opacity: 0.52, scale: 0.94 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-5 left-5 right-5 rounded-[20px] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80"
      >
        <div className="mb-2 flex items-center justify-between">
          <ReceiptText className="h-5 w-5 text-[#012169]" />
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-slate-200" />
          <div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
        </div>
      </motion.div>
      <Wifi className="absolute right-5 top-6 h-7 w-7 text-sky-400/72" />
    </AnimatedTile>
  );
}

function GoLiveIcon({ isActive }: { isActive: boolean }) {
  return (
    <AnimatedTile isActive={isActive}>
      <SoftPulse isActive={isActive} className="left-8 top-6 h-16 w-16" />
      <motion.div
        initial={false}
        animate={isActive ? { x: 0, opacity: 1, scale: 1 } : { x: -18, opacity: 0.58, scale: 0.94 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-[#012169] px-3 py-2 text-white shadow-[0_14px_30px_rgba(1,33,105,0.22)]"
      >
        <ToggleRight className="h-6 w-6" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">Live</span>
      </motion.div>
      <motion.div
        initial={false}
        animate={isActive ? { y: 0, opacity: 1, scale: 1 } : { y: 26, opacity: 0.5, scale: 0.94 }}
        transition={{ delay: isActive ? 0.08 : 0, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-4 right-4 rounded-2xl bg-white p-2.5 text-emerald-600 shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-1 ring-emerald-100"
      >
        <BadgeCheck className="h-6 w-6" />
      </motion.div>
      <div className="absolute bottom-5 left-5 rounded-2xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        Board
      </div>
    </AnimatedTile>
  );
}

function SetupIcon({ index, isActive }: { index: number; isActive: boolean }) {
  switch (index) {
    case 0:
      return <MenuScanIcon isActive={isActive} />;
    case 1:
      return <SandboxIcon isActive={isActive} />;
    case 2:
      return <GhostModeIcon isActive={isActive} />;
    case 3:
      return <RetestingIcon isActive={isActive} />;
    case 4:
      return <GoLiveIcon isActive={isActive} />;
    default:
      return <MenuScanIcon isActive={isActive} />;
  }
}

export default function SmartBarSetupWalkthrough({
  stepIndex,
  isActive,
  isWaving,
}: {
  stepIndex: number;
  isActive: boolean;
  isWaving: boolean;
}) {
  const step = SMARTBAR_SETUP_WALKTHROUGH_STEPS[stepIndex] ?? SMARTBAR_SETUP_WALKTHROUGH_STEPS[0];

  return (
    <div
      className={[
        "w-full bg-white/82 px-4 py-5 text-center text-slate-950 sm:px-10 sm:py-10 sm:text-left",
        "min-h-[252px] sm:min-h-[278px]",
        isWaving ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-7">
        <SetupIcon index={stepIndex} isActive={isActive} />

        <motion.div
          initial={false}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.74, y: 8 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0"
        >
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
            {step.eyebrow}
          </div>

          <h2 className="text-[25px] font-black leading-none tracking-[-0.07em] text-slate-950 sm:text-[34px]">
            {step.title}
          </h2>

          <p className="mt-3 max-w-xl text-[15px] font-medium leading-6 text-slate-700 sm:mt-4 sm:text-xl sm:leading-8">
            {step.message}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
