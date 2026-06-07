import { useCallback, useRef, useState } from "react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileOrderLine,
  type SmartBarMobileOrderResult,
  type SmartBarMobileSubmitMeta,
} from "../SmartBarMobileShell";
import FoodTrioTargetWall from "./FoodTrioTargetWall";
import { clearSmartBarFocusOverlay, smartbarFocusTarget } from "../../smartbarFocusController";
import {
  FOOD_TRIO_SCENARIOS,
  foodTrioApplyChoice,
  foodTrioPromptForScenario,
  foodTrioRemoveLine,
  foodTrioResultForQuery,
  foodTrioResultForScenario,
  foodTrioScenarioFromQuery,
  type FoodTrioScenarioId,
} from "./foodTrioScript";


function scrollToFoodTrioScenario(scenarioId: FoodTrioScenarioId) {
  if (!scenarioId || typeof document === "undefined") return;

  const target = document.querySelector<HTMLElement>(
    `[data-foodtrio-scenario="${scenarioId}"], #foodtrio-section-${scenarioId}`,
  );

  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToFoodTrioTarget(targetId?: string) {
  if (!targetId || typeof document === "undefined" || typeof window === "undefined") return;

  const target = document.querySelector<HTMLElement>(
    `[data-foodtrio-target="${targetId}"], [data-tour-id="${targetId}"], #${targetId}`,
  );

  if (!target) return;

  // Keep the focused product close to the top of the phone viewport, but not
  // hidden under the fixed FoodTrio status pill or clipped against the edge.
  const topInset = 88;
  const currentTop = window.scrollY || document.documentElement.scrollTop || 0;
  const targetRect = target.getBoundingClientRect();
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const nextTop = Math.min(Math.max(currentTop + targetRect.top - topInset, 0), maxTop);

  clearSmartBarFocusOverlay();
  window.scrollTo({ top: nextTop, left: 0, behavior: "smooth" });

  // Use the same frost/blur spotlight as the other demos. The manual scroll
  // above owns placement; skipPlacementScroll prevents a second correction jump.
  window.setTimeout(() => {
    void smartbarFocusTarget(
      {
        pageId: "foodtrio-mobile",
        targetId,
      },
      {
        initialDelayMs: 0,
        skipPlacementScroll: true,
        overlayDurationMs: 3200,
        dispatchLegacyEvent: false,
      },
    );
  }, 540);
}

export default function FoodTrioMobileExperience() {
  const [activeScenario, setActiveScenario] = useState<FoodTrioScenarioId>("coffee");
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);
  const [lastResult, setLastResult] = useState<SmartBarMobileOrderResult>(() => foodTrioResultForScenario("coffee"));
  const submissionIdRef = useRef(1);

  const startScenario = useCallback((scenarioId: FoodTrioScenarioId) => {
    const query = foodTrioPromptForScenario(scenarioId);
    setActiveScenario(scenarioId);
    setActiveTargetId(null);
    setDemoSubmission({
      id: submissionIdRef.current,
      query,
      typing: true,
      typeDelayMs: 28,
      submitDelayMs: 680,
    });
    submissionIdRef.current += 1;
  }, []);

  const handleSubmitPrompt = useCallback((query: string, _meta?: SmartBarMobileSubmitMeta) => {
    const nextScenario = foodTrioScenarioFromQuery(query, activeScenario);
    const result = foodTrioResultForQuery(query, activeScenario);
    setActiveScenario(nextScenario);
    setLastResult(result);

    // Opening a cart should not move the menu. Menu navigation is reserved
    // for the explicit cart-line focus moment.
    setActiveTargetId(null);

    return result;
  }, [activeScenario]);

  const handleNavigateToLine = useCallback((line: SmartBarMobileOrderLine) => {
    setActiveTargetId(line.targetId || null);
    scrollToFoodTrioTarget(line.targetId);
  }, []);

  const handleApplyChoice = useCallback((line: SmartBarMobileOrderLine, value: string) => {
    const result = foodTrioApplyChoice(lastResult.lines, line, value);
    setLastResult(result);
    // Applying a choice updates the cart, but it should not create a fresh
    // page/menu navigation moment. Cart-line selection owns spotlight movement.
    return result;
  }, [lastResult]);

  const handleRemoveLine = useCallback((line: SmartBarMobileOrderLine) => {
    const result = foodTrioRemoveLine(lastResult.lines, line);
    setLastResult(result);
    return result;
  }, [lastResult]);

  const scenario = FOOD_TRIO_SCENARIOS.find((item) => item.id === activeScenario) || FOOD_TRIO_SCENARIOS[0];

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.24),transparent_32%),linear-gradient(180deg,#07111f_0%,#08111c_42%,#05070c_100%)] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.18),transparent_58%)]" />
      <FoodTrioTargetWall
        activeScenario={activeScenario}
        activeTargetId={activeTargetId}
        onScenarioSelect={(scenarioId) => {
              clearSmartBarFocusOverlay();
              setActiveScenario(scenarioId);
              setActiveTargetId(null);
              window.setTimeout(() => scrollToFoodTrioScenario(scenarioId), 60);
            }}
        onSamplePrompt={startScenario}
      />

      <div className="pointer-events-none fixed left-3 right-3 top-3 z-30 rounded-full border border-white/12 bg-slate-950/72 px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/72 shadow-xl shadow-black/20 backdrop-blur-xl">
        {scenario.brand} · fixture wall
      </div>

      <SmartBarMobileShell
        mode="overlay"
        entryModeLabel="Type order"
        buildingLabel="Building cart..."
        demoSubmission={demoSubmission}
        onSubmitPrompt={handleSubmitPrompt}
        onNavigateToLine={handleNavigateToLine}
        onApplyLineChoice={handleApplyChoice}
        onRemoveLine={handleRemoveLine}
        onResetCart={() => {
          clearSmartBarFocusOverlay();
          const result = foodTrioResultForScenario(activeScenario);
          setLastResult(result);
          setActiveTargetId(null);
        }}
      />
    </div>
  );
}
