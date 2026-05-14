import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DemoPointer, { type DemoPointerPosition } from "./DemoPointer";
import type {
  DemoScript,
  DemoStep,
  DemoPointerTarget,
  DemoClickCommand,
} from "./demoScripts";
import type { GuideShellDemoCommand } from "../components/GuideShellStatic";

export type DemoStatus = "idle" | "running" | "paused";

const GUIDE_DEMO_RESPONSE_COMPLETE_EVENT = "guide-demo-response-complete";

type DemoResponseDetail = {
  ok?: boolean;
  hasNavigation?: boolean;
  stepCount?: number;
  isMultiStep?: boolean;
  message?: string;
  displayMode?: string;
  hasStayPlan?: boolean;
};

type DemoCalloutState = {
  eyebrow?: string;
  title: string;
  body: string;
  buttonLabel: string;
  placement?: "left" | "center" | "bottom";
  emphasis?: "green-flash";
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resolvePointerTarget(target: DemoPointerTarget): DemoPointerPosition {
  if (typeof target === "object") return target;

  const el = document.querySelector<HTMLElement>(target);
  if (!el)
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      label: "target",
    };

  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function setDomInputValue(target: string, value: string) {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    target,
  );
  if (!el) return;

  const prototype =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (valueSetter) valueSetter.call(el, value);
  else el.value = value;

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.focus({ preventScroll: true });
}

function isCoarsePointer() {
  return Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}

function isVisibleTarget(selector: string) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function isShellInternalTarget(selector: string) {
  return (
    selector.includes("guide-textarea") ||
    selector.includes("guide-submit") ||
    selector.includes("guide-got-it") ||
    selector.includes("guide-minimize") ||
    selector.includes("chip-") ||
    selector.includes("budget-") ||
    selector.includes("date-") ||
    selector.includes("calendar-") ||
    selector.includes("guest-") ||
    selector.includes("apply-")
  );
}

async function ensureMobileShellTargetAvailable(
  target: DemoPointerTarget,
  statusRef: MutableRefObject<DemoStatus>,
  stopRef: MutableRefObject<boolean>,
  openLauncherVisibly?: () => Promise<void>,
) {
  if (typeof target !== "string" || !isCoarsePointer()) return;
  if (!isShellInternalTarget(target) || isVisibleTarget(target)) return;

  const launcher = document.querySelector<HTMLElement>(
    "[data-demo-target='guide-launcher']",
  );
  if (!launcher) return;

  if (openLauncherVisibly) {
    await openLauncherVisibly();
  } else {
    launcher.click();
    await wait(520);
  }

  const startedAt = Date.now();
  while (!stopRef.current && Date.now() - startedAt < 2200) {
    await waitWhilePaused(statusRef, stopRef);
    if (isVisibleTarget(target)) return;
    await wait(80);
  }
}

async function resolvePointerTargetWhenReady(
  target: DemoPointerTarget,
  statusRef: MutableRefObject<DemoStatus>,
  stopRef: MutableRefObject<boolean>,
  timeoutMs = 2600,
): Promise<DemoPointerPosition> {
  if (typeof target === "object") return target;

  const startedAt = Date.now();

  while (!stopRef.current && Date.now() - startedAt < timeoutMs) {
    await waitWhilePaused(statusRef, stopRef);

    const el = document.querySelector<HTMLElement>(target);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }

    await wait(80);
  }

  return resolvePointerTarget(target);
}

function pointerPositionForElement(el: HTMLElement): DemoPointerPosition {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

async function resolveDomTargetWhenReady(
  target: string,
  statusRef: MutableRefObject<DemoStatus>,
  stopRef: MutableRefObject<boolean>,
  timeoutMs = 3200,
): Promise<{ el: HTMLElement; position: DemoPointerPosition } | null> {
  const startedAt = Date.now();
  let scrolledTarget = false;

  while (!stopRef.current && Date.now() - startedAt < timeoutMs) {
    await waitWhilePaused(statusRef, stopRef);

    const el = document.querySelector<HTMLElement>(target);
    if (el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const hasBox = rect.width > 0 && rect.height > 0;
      const isRendered =
        hasBox && style.display !== "none" && style.visibility !== "hidden";

      if (isRendered) {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const isCenterInViewport =
          centerX >= 0 &&
          centerX <= viewportWidth &&
          centerY >= 0 &&
          centerY <= viewportHeight;

        if (!isCenterInViewport && !scrolledTarget) {
          scrolledTarget = true;
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          await wait(650);
          continue;
        }

        return { el, position: pointerPositionForElement(el) };
      }
    }

    await wait(80);
  }

  console.warn("Demo target was not available before timeout:", target);
  return null;
}

async function waitWhilePaused(
  statusRef: MutableRefObject<DemoStatus>,
  stopRef: MutableRefObject<boolean>,
) {
  while (statusRef.current === "paused" && !stopRef.current) {
    await wait(120);
  }
}

async function waitForDemoResponse(
  statusRef: MutableRefObject<DemoStatus>,
  stopRef: MutableRefObject<boolean>,
  timeoutMs = 30000,
): Promise<DemoResponseDetail> {
  const startedAt = Date.now();

  return new Promise<DemoResponseDetail>((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener(
        GUIDE_DEMO_RESPONSE_COMPLETE_EVENT,
        onComplete as EventListener,
      );
    };

    const finish = (detail: DemoResponseDetail = {}) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(detail);
    };

    const onComplete = (event: Event) => {
      const customEvent = event as CustomEvent<DemoResponseDetail>;
      finish(customEvent.detail || {});
    };

    const poll = async () => {
      while (!settled) {
        await waitWhilePaused(statusRef, stopRef);
        if (stopRef.current || Date.now() - startedAt > timeoutMs) {
          finish({ ok: false, stepCount: 0 });
          return;
        }
        await wait(120);
      }
    };

    window.addEventListener(
      GUIDE_DEMO_RESPONSE_COMPLETE_EVENT,
      onComplete as EventListener,
      { once: true },
    );
    poll();
  });
}

export default function DemoController({
  script,
  status,
  onStatusChange,
  onGuideCommand,
  onFinished,
  finishDelayMs = 5000,
}: {
  script: DemoScript;
  status: DemoStatus;
  onStatusChange: (status: DemoStatus) => void;
  onGuideCommand: (command: GuideShellDemoCommand) => void;
  onFinished?: (script: DemoScript) => void;
  finishDelayMs?: number;
}) {
  const [pointerPosition, setPointerPosition] =
    useState<DemoPointerPosition | null>(null);
  const [pointerVisible, setPointerVisible] = useState(false);
  const [pointerPulseKey, setPointerPulseKey] = useState(0);
  const statusRef = useRef<DemoStatus>(status);
  const stopRef = useRef(false);
  const runningRef = useRef(false);
  const commandIdRef = useRef(1);
  const lastResponseRef = useRef<DemoResponseDetail>({});
  const [callout, setCallout] = useState<DemoCalloutState | null>(null);
  const calloutResumeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    statusRef.current = status;

    if (status === "idle") {
      stopRef.current = true;
      runningRef.current = false;
      setPointerVisible(false);
      setCallout(null);
      calloutResumeRef.current = null;
      return;
    }

    if (status === "running" && !runningRef.current) {
      stopRef.current = false;
      runningRef.current = true;

      const send = (type: GuideShellDemoCommand["type"], value?: string) => {
        commandIdRef.current += 1;
        onGuideCommand({ id: commandIdRef.current, type, value });
      };

      const typePrompt = async (prompt: string, charDelayMs: number) => {
        // Keep the existing GuideShellStatic contract: it receives repeated
        // { type: "type", value } commands. The value grows one character at a
        // time so the textarea visibly types instead of snapping to full text.
        send("type", "");
        await wait(80);

        let current = "";
        for (const char of prompt) {
          await waitWhilePaused(statusRef, stopRef);
          if (stopRef.current) return;

          current += char;
          send("type", current);
          await wait(charDelayMs);
        }
      };

      const pulsePointer = async (pulseMs = 320) => {
        setPointerPulseKey((value) => value + 1);
        await wait(pulseMs);
      };

      const openMobileShellFromLauncher = async () => {
        if (!isCoarsePointer() || stopRef.current) return;

        const launcherTarget = "[data-demo-target='guide-launcher']";
        const launcher = document.querySelector<HTMLElement>(launcherTarget);
        if (!launcher || isVisibleTarget("[data-demo-target='guide-textarea']")) {
          return;
        }

        setPointerVisible(true);
        const position = await resolvePointerTargetWhenReady(
          launcherTarget,
          statusRef,
          stopRef,
          2600,
        );
        if (stopRef.current) return;

        setPointerPosition(position);
        await wait(900);
        if (stopRef.current) return;

        await pulsePointer(650);
        if (stopRef.current) return;

        launcher.click();
        await wait(1150);
      };

      const clickTarget = async ({
        target,
        command,
        hoverMs = 450,
        pulseMs = 320,
        targetWaitMs = 3200,
      }: {
        target: DemoPointerTarget;
        command: DemoClickCommand;
        hoverMs?: number;
        pulseMs?: number;
        targetWaitMs?: number;
      }) => {
        setPointerVisible(true);
        await ensureMobileShellTargetAvailable(
          target,
          statusRef,
          stopRef,
          openMobileShellFromLauncher,
        );
        const position = await resolvePointerTargetWhenReady(
          target,
          statusRef,
          stopRef,
          targetWaitMs,
        );
        if (stopRef.current) return;
        setPointerPosition(position);
        await wait(hoverMs);
        if (stopRef.current) return;
        await pulsePointer(pulseMs);
        if (stopRef.current) return;
        send(command);
      };

      const clickDomTarget = async ({
        target,
        hoverMs = 450,
        pulseMs = 320,
        targetWaitMs = 3200,
      }: {
        target: DemoPointerTarget;
        hoverMs?: number;
        pulseMs?: number;
        targetWaitMs?: number;
      }) => {
        if (typeof target !== "string") {
          setPointerVisible(true);
          setPointerPosition(target);
          await wait(hoverMs);
          if (stopRef.current) return;
          await pulsePointer(pulseMs);
          return;
        }

        await ensureMobileShellTargetAvailable(
          target,
          statusRef,
          stopRef,
          openMobileShellFromLauncher,
        );

        const resolved = await resolveDomTargetWhenReady(
          target,
          statusRef,
          stopRef,
          targetWaitMs,
        );
        if (stopRef.current || !resolved) return;

        setPointerVisible(true);
        setPointerPosition(resolved.position);
        await wait(hoverMs);
        if (stopRef.current) return;
        await pulsePointer(pulseMs);
        if (stopRef.current) return;

        resolved.el.click();
      };

      const setInputValueTarget = async ({
        target,
        value,
        hoverMs = 450,
        pulseMs = 320,
        targetWaitMs = 3200,
      }: {
        target: DemoPointerTarget;
        value: string;
        hoverMs?: number;
        pulseMs?: number;
        targetWaitMs?: number;
      }) => {
        setPointerVisible(true);
        await ensureMobileShellTargetAvailable(
          target,
          statusRef,
          stopRef,
          openMobileShellFromLauncher,
        );
        const position = await resolvePointerTargetWhenReady(
          target,
          statusRef,
          stopRef,
          targetWaitMs,
        );
        if (stopRef.current) return;
        setPointerPosition(position);
        await wait(hoverMs);
        if (stopRef.current) return;
        await pulsePointer(pulseMs);
        if (stopRef.current) return;

        if (typeof target !== "string") return;
        setDomInputValue(target, value);
      };

      const showCallout = async (step: Extract<DemoStep, { action: "callout" }>) => {
        return new Promise<void>((resolve) => {
          calloutResumeRef.current = resolve;
          setCallout({
            eyebrow: step.eyebrow,
            title: step.title,
            body: step.body,
            buttonLabel: step.buttonLabel || "Resume demo",
            placement: step.placement || "left",
            emphasis: step.emphasis,
          });
          onStatusChange("paused");
        });
      };

      const runStep = async (step: DemoStep) => {
        await waitWhilePaused(statusRef, stopRef);
        if (stopRef.current) return;

        switch (step.action) {
          case "wait":
            await wait(step.delayMs);
            return;
          case "wait-for-response": {
            const detail = await waitForDemoResponse(
              statusRef,
              stopRef,
              step.timeoutMs,
            );
            lastResponseRef.current = detail;
            if (step.delayMs) await wait(step.delayMs);
            return;
          }
          case "move-pointer": {
            setPointerVisible(true);
            await ensureMobileShellTargetAvailable(
              step.target,
              statusRef,
              stopRef,
              openMobileShellFromLauncher,
            );
            const position = await resolvePointerTargetWhenReady(
              step.target,
              statusRef,
              stopRef,
              step.targetWaitMs ?? 2600,
            );
            if (stopRef.current) return;
            setPointerPosition(position);
            await wait(step.delayMs ?? 700);
            return;
          }
          case "click-target":
            await clickTarget({
              target: step.target,
              command: step.command,
              hoverMs: step.hoverMs,
              pulseMs: step.pulseMs,
              targetWaitMs: step.targetWaitMs,
            });
            await wait(step.delayMs ?? 900);
            return;
          case "click-dom-target":
            await clickDomTarget({
              target: step.target,
              hoverMs: step.hoverMs,
              pulseMs: step.pulseMs,
              targetWaitMs: step.targetWaitMs,
            });
            await wait(step.delayMs ?? 900);
            return;
          case "set-input-value":
            await setInputValueTarget({
              target: step.target,
              value: step.value,
              hoverMs: step.hoverMs,
              pulseMs: step.pulseMs,
              targetWaitMs: step.targetWaitMs,
            });
            await wait(step.delayMs ?? 900);
            return;
          case "click-through-guide-steps": {
            const stepCount = Math.max(
              0,
              Number(lastResponseRef.current.stepCount || 0),
            );
            const nextClicks = Math.max(
              0,
              Math.min(step.maxClicks ?? 6, stepCount - 1),
            );

            for (let i = 0; i < nextClicks; i += 1) {
              await waitWhilePaused(statusRef, stopRef);
              if (stopRef.current) return;

              await clickTarget({
                target: step.target ?? "[data-demo-target='guide-next']",
                command: "next",
                hoverMs: step.hoverMs ?? 650,
                pulseMs: step.pulseMs ?? 520,
                targetWaitMs: step.targetWaitMs ?? 3600,
              });

              await wait(step.betweenClicksMs ?? 2600);
            }

            if (step.delayMs) await wait(step.delayMs);
            return;
          }
          case "click-next-back-if-multistep": {
            const stepCount = Math.max(
              0,
              Number(lastResponseRef.current.stepCount || 0),
            );
            const minStepCount = Math.max(2, step.minStepCount ?? 2);
            const nextTarget = step.nextTarget ?? "[data-demo-target='guide-next']";
            const backTarget = step.backTarget ?? "[data-demo-target='guide-back']";
            const hasMultipleSteps =
              stepCount >= minStepCount ||
              lastResponseRef.current.isMultiStep === true ||
              (stepCount === 0 &&
                typeof nextTarget === "string" &&
                isVisibleTarget(nextTarget));

            if (!hasMultipleSteps) {
              if (step.delayMs) await wait(step.delayMs);
              return;
            }

            await clickTarget({
              target: nextTarget,
              command: "next",
              hoverMs: step.hoverMs ?? 650,
              pulseMs: step.pulseMs ?? 520,
              targetWaitMs: step.targetWaitMs ?? 3600,
            });
            await wait(step.betweenClicksMs ?? 2600);
            if (stopRef.current) return;

            await clickDomTarget({
              target: backTarget,
              hoverMs: step.hoverMs ?? 650,
              pulseMs: step.pulseMs ?? 520,
              targetWaitMs: step.targetWaitMs ?? 3600,
            });

            if (step.delayMs) await wait(step.delayMs);
            return;
          }
          case "callout":
            await showCallout(step);
            if (step.delayMs) await wait(step.delayMs);
            return;
          case "open-shell":
            send("open");
            await wait(step.delayMs ?? 700);
            return;
          case "type-prompt": {
            const charDelayMs =
              step.charDelayMs ?? script.defaultCharDelayMs ?? 34;
            await typePrompt(step.prompt, charDelayMs);
            await wait(step.delayMs ?? 350);
            return;
          }
          case "submit":
            send("submit");
            await wait(step.delayMs ?? 4500);
            return;
          case "next":
            send("next");
            await wait(step.delayMs ?? 2500);
            return;
          case "got-it":
            send("got-it");
            await wait(step.delayMs ?? 700);
            return;
          case "minimize":
            send("minimize");
            await wait(step.delayMs ?? 700);
            return;
        }
      };

      const run = async () => {
        for (const step of script.steps) {
          if (stopRef.current) break;
          await runStep(step);
        }

        runningRef.current = false;
        setPointerVisible(false);
        if (!stopRef.current) {
          await wait(finishDelayMs);
        }
        if (!stopRef.current) {
          onStatusChange("idle");
          onFinished?.(script);
        }
      };

      run();
    }
  }, [
    status,
    script,
    onGuideCommand,
    onStatusChange,
    onFinished,
    finishDelayMs,
  ]);

  useEffect(() => {
    return () => {
      stopRef.current = true;
      runningRef.current = false;
      calloutResumeRef.current = null;
    };
  }, []);

  const resumeCallout = () => {
    const resume = calloutResumeRef.current;
    calloutResumeRef.current = null;
    setCallout(null);
    onStatusChange("running");
    resume?.();
  };

  const calloutPlacementClass =
    callout?.placement === "center"
      ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      : callout?.placement === "bottom"
        ? "bottom-6 left-1/2 -translate-x-1/2"
        : "bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm";

  const calloutAccentClass =
    callout?.emphasis === "green-flash"
      ? "shadow-emerald-500/30 ring-emerald-400/30"
      : "shadow-slate-950/20 ring-slate-950/[0.04]";

  return (
    <>
      <DemoPointer
        position={pointerPosition}
        visible={pointerVisible && status !== "idle"}
        pulseKey={pointerPulseKey}
      />

      <AnimatePresence>
        {callout && status !== "idle" && (
          <motion.div
            key={`${callout.title}-${callout.body}`}
            initial={{ opacity: 0, x: callout.placement === "left" ? -28 : 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: callout.placement === "left" ? -20 : 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={`fixed z-[9998] w-[min(calc(100vw-2rem),26rem)] overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-2xl ring-1 backdrop-blur-xl ${calloutAccentClass} ${calloutPlacementClass}`}
          >
            {callout.emphasis === "green-flash" && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[24px] bg-emerald-400/70"
                initial={{ opacity: 0.82 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.05, ease: "easeOut" }}
              />
            )}
            {callout.emphasis === "green-flash" && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-[26px] border-2 border-emerald-400/70"
                initial={{ opacity: 0.9, scale: 0.98 }}
                animate={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 1.15, ease: "easeOut" }}
              />
            )}
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                  Demo paused
                </div>
                {callout.eyebrow && (
                  <div className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {callout.eyebrow}
                  </div>
                )}
              </div>
              <h3 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                {callout.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {callout.body}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={resumeCallout}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  {callout.buttonLabel}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
