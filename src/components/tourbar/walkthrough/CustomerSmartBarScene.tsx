import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, Mic, SendHorizontal } from "lucide-react";

const customerEntryPrompt = "Med pep pizza spagh wings gar-stix";
const slideOneCaption = "Tap to say or type your order";

type CustomerFlowStep = 1 | 2 | 3;

type PointerTarget =
  | "capsuleStart"
  | "capsule"
  | "submitStart"
  | "submit"
  | "readyRow"
  | "missingRow"
  | "extrasRow"
  | "unknownRow";

type PointerState = {
  visible: boolean;
  target: PointerTarget;
  pulse?: boolean;
  tooltip?: string;
};

type SceneState = {
  capsuleDropped: boolean;
  captionVisible: boolean;
  typedCaption: string;
  composerOpen: boolean;
  typedPrompt: string;
  footerLabel: string;
  cartOpen: boolean;
  pointer: PointerState | null;
};

const baseSceneState: SceneState = {
  capsuleDropped: true,
  captionVisible: false,
  typedCaption: "",
  composerOpen: false,
  typedPrompt: "",
  footerLabel: "Say or type order",
  cartOpen: false,
  pointer: null,
};

const pointerTargets: Record<PointerTarget, string> = {
  capsuleStart: "left-1/2 bottom-[66px] -translate-x-1/2",
  capsule: "left-1/2 bottom-[24px] -translate-x-1/2",
  submitStart: "right-[66px] bottom-[90px]",
  submit: "right-[28px] bottom-[34px]",
  readyRow: "left-1/2 top-[34%] -translate-x-1/2",
  missingRow: "left-1/2 top-[48%] -translate-x-1/2",
  extrasRow: "left-1/2 top-[62%] -translate-x-1/2",
  unknownRow: "left-1/2 top-[76%] -translate-x-1/2",
};

function typeText(
  text: string,
  onChange: (value: string) => void,
  timers: number[],
  delayMs = 32,
  startDelayMs = 0,
) {
  timers.push(
    window.setTimeout(() => {
      let index = 0;
      onChange("");

      const tick = () => {
        index += 1;
        onChange(text.slice(0, index));
        if (index >= text.length) return;
        timers.push(window.setTimeout(tick, delayMs));
      };

      tick();
    }, startDelayMs),
  );
}

function WalkthroughTapPointer({ pointer }: { pointer: PointerState }) {
  return (
    <motion.div
      className={`pointer-events-none absolute z-[40] ${pointerTargets[pointer.target]}`}
      initial={false}
      animate={{ opacity: pointer.visible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.18, ease: "easeOut" } }}
      layout
    >
      <motion.div
        className="relative h-11 w-11 rounded-full border-2 border-[#012169] bg-white/62 shadow-[0_12px_28px_rgba(1,33,105,0.18)] ring-4 ring-white/72 backdrop-blur-sm"
        animate={{ scale: pointer.pulse ? [1, 0.92, 1.04, 1] : 1 }}
        transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#012169] shadow-sm" />
        {pointer.pulse && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-[#012169]"
            initial={{ opacity: 0.58, scale: 0.74 }}
            animate={{ opacity: 0, scale: 1.78 }}
            transition={{ duration: 0.58, ease: "easeOut" }}
          />
        )}
      </motion.div>

      {pointer.tooltip && (
        <motion.div
          key={pointer.tooltip}
          className="absolute left-8 top-[-18px] whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(15,23,42,0.20)] ring-1 ring-white/10 sm:text-xs"
          initial={{ opacity: 0, x: -5, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 4, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {pointer.tooltip}
        </motion.div>
      )}
    </motion.div>
  );
}

function SmartBarCapsule({ label = "SmartBar" }: { label?: string }) {
  return (
    <div className="flex min-h-[52px] w-[min(420px,calc(100vw-4rem))] items-center gap-3 rounded-full bg-[#012169] px-3 py-2.5 text-white shadow-[0_22px_54px_rgba(1,33,105,0.24),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/15">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/18">
        <Compass className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sky-100/82">
          {label}
        </div>
        <div className="truncate text-sm font-semibold tracking-tight text-white">
          Tap to say or type
        </div>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/14">
        <Mic className="h-4 w-4" />
      </div>
    </div>
  );
}

function ComposerCard({
  typedPrompt,
  footerLabel,
  cartOpen,
}: {
  typedPrompt: string;
  footerLabel: string;
  cartOpen: boolean;
}) {
  return (
    <motion.div
      className="mx-auto w-[min(430px,calc(100vw-3.5rem))] overflow-hidden rounded-[30px] bg-[#012169] p-2.5 text-white shadow-[0_26px_70px_rgba(1,33,105,0.24)] ring-1 ring-[#012169]/10"
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.985 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="rounded-[24px] bg-white p-3.5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          <Compass className="h-3.5 w-3.5 text-[#012169]" />
          SmartBar Composer
        </div>
        <div className="mt-2 min-h-[54px] rounded-[18px] border border-slate-200 bg-slate-50 px-3.5 py-3 text-[1.04rem] font-semibold leading-snug tracking-[-0.02em] text-slate-900 shadow-inner sm:text-lg">
          {typedPrompt || <span className="text-slate-400">Order is entered here</span>}
          {typedPrompt && <span className="ml-0.5 animate-pulse text-[#012169]">|</span>}
        </div>

        <AnimatePresence>
          {cartOpen && <WalkthroughCart />}
        </AnimatePresence>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 ring-1 ring-white/12">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/14">
          <Compass className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm font-bold tracking-tight text-white">
          {footerLabel}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#012169] shadow-sm">
          <SendHorizontal className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}

const cartRows = [
  {
    id: "ready",
    name: "Medium pepperoni pizza",
    className: "border-emerald-300/80 bg-emerald-50 text-emerald-950",
    dotClassName: "bg-emerald-500",
  },
  {
    id: "missing",
    name: "Wings",
    className: "border-rose-300/80 bg-rose-50 text-rose-950",
    dotClassName: "bg-rose-500",
  },
  {
    id: "extras",
    name: "Spaghetti",
    className: "border-amber-300/80 bg-amber-50 text-amber-950",
    dotClassName: "bg-amber-400",
  },
  {
    id: "unknown",
    name: "gar-stix",
    className: "border-slate-300/80 bg-slate-100 text-slate-900",
    dotClassName: "bg-slate-400",
  },
];

function WalkthroughCart() {
  return (
    <motion.div
      className="mt-3 rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
      initial={{ opacity: 0, y: 18, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 14, height: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          SmartBar cart
        </div>
        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          4 items
        </div>
      </div>
      <div className="space-y-1.5">
        {cartRows.map((row, index) => (
          <motion.div
            key={row.id}
            className={`flex items-center gap-3 rounded-[18px] border px-3 py-2.5 text-sm font-black tracking-[-0.01em] shadow-sm ${row.className}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, delay: index * 0.08, ease: "easeOut" }}
          >
            <span className={`h-3 w-3 shrink-0 rounded-full shadow-sm ${row.dotClassName}`} />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function useCustomerSceneState(activeStep: CustomerFlowStep, runId: number) {
  const [sceneState, setSceneState] = useState<SceneState>(baseSceneState);

  useEffect(() => {
    const timers: number[] = [];
    const setPartial = (value: Partial<SceneState>) => {
      setSceneState((current) => ({ ...current, ...value }));
    };

    if (activeStep === 1) {
      setSceneState({
        ...baseSceneState,
        capsuleDropped: false,
        captionVisible: true,
        footerLabel: "Say or type order",
      });

      timers.push(
        window.setTimeout(() => setPartial({ capsuleDropped: true }), 260),
      );
      typeText(
        slideOneCaption,
        (typedCaption) => setPartial({ typedCaption }),
        timers,
        34,
        1160,
      );
    }

    if (activeStep === 2) {
      setSceneState({
        ...baseSceneState,
        capsuleDropped: true,
        captionVisible: false,
        footerLabel: "Say or type order",
      });

      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: { visible: true, target: "capsuleStart" },
            }),
          280,
        ),
      );
      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: { visible: true, target: "capsule" },
            }),
          560,
        ),
      );
      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: { visible: true, target: "capsule", pulse: true },
            }),
          1080,
        ),
      );
      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: null,
              composerOpen: true,
              footerLabel: "Say or type order",
            }),
          1660,
        ),
      );
      typeText(
        customerEntryPrompt,
        (typedPrompt) => setPartial({ typedPrompt }),
        timers,
        34,
        2020,
      );
      timers.push(
        window.setTimeout(
          () => setPartial({ footerLabel: "Tap to submit" }),
          2020 + customerEntryPrompt.length * 34 + 180,
        ),
      );
      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: { visible: true, target: "submitStart" },
            }),
          2020 + customerEntryPrompt.length * 34 + 520,
        ),
      );
      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: { visible: true, target: "submit" },
            }),
          2020 + customerEntryPrompt.length * 34 + 780,
        ),
      );
      timers.push(
        window.setTimeout(
          () =>
            setPartial({
              pointer: { visible: true, target: "submit", pulse: true },
            }),
          2020 + customerEntryPrompt.length * 34 + 1280,
        ),
      );
      timers.push(
        window.setTimeout(
          () => setPartial({ pointer: null, cartOpen: true }),
          2020 + customerEntryPrompt.length * 34 + 1840,
        ),
      );
    }

    if (activeStep === 3) {
      setSceneState({
        ...baseSceneState,
        capsuleDropped: true,
        captionVisible: false,
        composerOpen: true,
        typedPrompt: customerEntryPrompt,
        footerLabel: "Tap to submit",
        cartOpen: true,
      });

      const tooltipSteps: Array<{ target: PointerTarget; tooltip: string }> = [
        { target: "readyRow", tooltip: "Green = Ready" },
        { target: "missingRow", tooltip: "Red = Missing requirement" },
        { target: "extrasRow", tooltip: "Yellow = Extras available" },
        { target: "unknownRow", tooltip: "Gray = No matching item" },
      ];

      tooltipSteps.forEach((step, index) => {
        timers.push(
          window.setTimeout(
            () =>
              setPartial({
                pointer: {
                  visible: true,
                  target: step.target,
                  tooltip: step.tooltip,
                },
              }),
            560 + index * 1425,
          ),
        );
      });
      timers.push(
        window.setTimeout(
          () => setPartial({ pointer: null }),
          560 + tooltipSteps.length * 1425,
        ),
      );
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [activeStep, runId]);

  return sceneState;
}

export default function CustomerSmartBarScene({
  activeStep,
  runId,
}: {
  activeStep: CustomerFlowStep;
  runId: number;
}) {
  const sceneState = useCustomerSceneState(activeStep, runId);

  const capsuleMotion = useMemo(
    () =>
      sceneState.capsuleDropped
        ? { opacity: 1, y: 0, scale: 1 }
        : { opacity: 0, y: -410, scale: 0.985 },
    [sceneState.capsuleDropped],
  );

  return (
    <div className="absolute inset-0 overflow-visible">
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-4">
        <AnimatePresence initial={false}>
          {!sceneState.composerOpen && (
            <motion.div
              key="restaurant-walkthrough-closed-capsule"
              initial={false}
              animate={capsuleMotion}
              exit={{ opacity: 0, y: 24, scale: 0.985 }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
            >
              <SmartBarCapsule />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {sceneState.composerOpen && (
          <motion.div
            key="restaurant-walkthrough-composer-stack"
            className="absolute inset-x-0 bottom-0 px-4"
          >
            <ComposerCard
              typedPrompt={sceneState.typedPrompt}
              footerLabel={sceneState.footerLabel}
              cartOpen={sceneState.cartOpen}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sceneState.captionVisible && (
          <motion.div
            key="restaurant-walkthrough-live-caption"
            className="absolute bottom-[72px] left-1/2 w-[min(360px,calc(100vw-4.5rem))] -translate-x-1/2 rounded-full bg-sky-50 px-4 py-2 text-center text-sm font-black tracking-[-0.01em] text-[#012169] shadow-[0_12px_30px_rgba(1,33,105,0.10)] ring-1 ring-sky-100 sm:text-base"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {sceneState.typedCaption}
            {sceneState.typedCaption && <span className="ml-0.5 animate-pulse">|</span>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sceneState.pointer && (
          <WalkthroughTapPointer
            key={`restaurant-walkthrough-pointer-${sceneState.pointer.target}-${runId}`}
            pointer={sceneState.pointer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
