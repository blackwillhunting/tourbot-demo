const SMARTBAR_FOCUS_DEFAULT_DELAY_MS = 700;
const SMARTBAR_FOCUS_OVERLAY_Z_INDEX = 10040;
const SMARTBAR_FOCUS_ROOT_SELECTOR = "[data-tourbar-shell-root='true']";
const SMARTBAR_OPEN_PANEL_SELECTORS = [
  "[data-tourbar-open-panel='true']",
  "[data-tourbar-sheet-panel='true']",
];

export type SmartBarFocusTarget = {
  pageId?: string;
  targetId?: string;
  targetSelector?: string;
  label?: string;
};

export type SmartBarFocusOptions = {
  initialDelayMs?: number;
  attempts?: number;
  scrollBehavior?: ScrollBehavior;
  overlayDurationMs?: number;
  debug?: boolean;
  dispatchLegacyEvent?: boolean;
};

type SmartBarFocusDebugDetail = {
  target: SmartBarFocusTarget;
  found: boolean;
  placed: boolean;
  rect?: DOMRect;
  reason?: string;
};

const SMARTBAR_FOCUS_DUPLICATE_SUPPRESS_MS = 850;

let smartBarFocusRunId = 0;
let lastSmartBarFocusKey = "";
let lastSmartBarFocusStartedAt = 0;
let activeSmartBarFocusOverlayCleanup: (() => void) | null = null;
let activeSmartBarFocusBottomRoom: HTMLElement | null = null;

declare global {
  interface Window {
    __smartbarFocusTest?: (
      target: string | SmartBarFocusTarget,
      options?: SmartBarFocusOptions,
    ) => Promise<boolean>;
    __smartbarClearFocusTest?: () => void;
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function waitForFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function viewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight || 720;
}

function viewportWidth() {
  return window.innerWidth || document.documentElement.clientWidth || 360;
}

function documentScrollHeight() {
  return Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0,
  );
}

function maxScrollTop() {
  return Math.max(0, documentScrollHeight() - viewportHeight());
}

function safeCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function targetSelectorFromFocus(target: SmartBarFocusTarget) {
  const selector = String(target.targetSelector || "").trim();
  if (selector) return selector;

  const cleanId = String(target.targetId || "").trim();
  if (!cleanId) return "";

  const escaped = safeCssEscape(cleanId);
  return `#${escaped}, [data-tour-id="${escaped}"]`;
}

export function smartbarFindFocusElement(target: SmartBarFocusTarget) {
  if (typeof document === "undefined") return null;

  const selector = targetSelectorFromFocus(target);
  if (selector) {
    try {
      const bySelector = document.querySelector<HTMLElement>(selector);
      if (bySelector) return bySelector;
    } catch {
      // Invalid customer selectors should not break SmartBar focus attempts.
    }
  }

  const cleanId = String(target.targetId || "").trim();
  return cleanId ? document.getElementById(cleanId) : null;
}

async function waitForFocusElement(target: SmartBarFocusTarget, attempts = 18) {
  for (let index = 0; index < attempts; index += 1) {
    const element = smartbarFindFocusElement(target);
    if (element) return element;
    await wait(90);
  }

  return smartbarFindFocusElement(target);
}

type SmartBarPanelRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function visiblePanelRects() {
  if (typeof document === "undefined") return [] as SmartBarPanelRect[];

  return SMARTBAR_OPEN_PANEL_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .filter((rect) => rect.bottom > 0 && rect.top < viewportHeight())
      .map((rect) => ({
        left: Math.max(0, rect.left),
        right: Math.min(viewportWidth(), rect.right),
        top: Math.max(0, rect.top),
        bottom: Math.min(rect.bottom, viewportHeight()),
      })),
  );
}

function rectsOverlapHorizontally(targetRect: DOMRect, panelRect: SmartBarPanelRect) {
  const targetLeft = Math.max(0, targetRect.left);
  const targetRight = Math.min(viewportWidth(), targetRect.right);
  const targetWidth = Math.max(0, targetRight - targetLeft);
  const panelWidth = Math.max(0, panelRect.right - panelRect.left);
  const overlapWidth = Math.max(
    0,
    Math.min(targetRight, panelRect.right) - Math.max(targetLeft, panelRect.left),
  );

  if (overlapWidth <= 0 || targetWidth <= 0 || panelWidth <= 0) return false;

  const targetCenterX = targetLeft + targetWidth / 2;
  const targetCenterCovered = targetCenterX >= panelRect.left && targetCenterX <= panelRect.right;
  const overlapShareOfTarget = overlapWidth / targetWidth;
  const meaningfulPanelOverlap = Math.min(220, Math.max(120, panelWidth * 0.35));

  // Wide BurgerRush-style sections can barely graze the TourBar sheet on the
  // right edge. Treating that shallow overlap as blocked reserves the full
  // sheet height and pushes otherwise-centerable targets too low. Only reserve
  // vertical space when the panel materially covers the target's lane.
  return targetCenterCovered || overlapShareOfTarget >= 0.45 || overlapWidth >= meaningfulPanelOverlap;
}

function smartBarSafeTop(targetRect?: DOMRect | null) {
  const baseTop = 92;
  const relevantPanels = targetRect
    ? visiblePanelRects().filter((panelRect) => rectsOverlapHorizontally(targetRect, panelRect))
    : visiblePanelRects();
  const shellBottom = Math.max(0, ...relevantPanels.map((rect) => rect.bottom));

  // Keep the highlighted target below an open SmartBar sheet only when that
  // sheet is in the same horizontal lane as the target. On desktop, the chat
  // panel can sit on the right while the target is in the left page column; in
  // that case, reserving the panel's vertical height pushes cards too low.
  const dynamicTop = shellBottom > 0 ? shellBottom + 26 : baseTop;
  return Math.min(Math.max(baseTop, dynamicTop), Math.max(120, viewportHeight() - 240));
}

function focusElementTop(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const safeTop = smartBarSafeTop(rect);
  const safeBottom = 108;
  const elementTop = window.scrollY + rect.top;
  const availableBottom = Math.max(safeTop + 180, viewportHeight() - safeBottom);
  const availableHeight = Math.max(180, availableBottom - safeTop);

  if (rect.height >= availableHeight) {
    return Math.max(0, elementTop - safeTop);
  }

  return Math.max(0, elementTop - (safeTop + (availableHeight - rect.height) / 2));
}

function focusElementIsPlaced(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const safeTop = smartBarSafeTop(rect);
  const safeBottom = 108;
  const availableBottom = Math.max(safeTop + 180, viewportHeight() - safeBottom);
  const availableHeight = Math.max(180, availableBottom - safeTop);
  const centerX = rect.left + rect.width / 2;
  const horizontallyOk = centerX >= 0 && centerX <= viewportWidth();

  if (!horizontallyOk) return false;

  if (rect.height <= availableHeight) {
    return rect.top >= safeTop - 18 && rect.bottom <= availableBottom + 24;
  }

  // Tall targets are allowed to extend below the fold, but their top edge
  // should be visible below SmartBar instead of hiding behind the sheet.
  return rect.top >= safeTop - 20 && rect.top <= safeTop + 28 && rect.bottom >= safeTop + 160;
}

function clearSmartBarFocusBottomRoom() {
  activeSmartBarFocusBottomRoom?.remove();
  activeSmartBarFocusBottomRoom = null;
}

function ensureSmartBarFocusBottomRoomFor(desiredTop: number) {
  if (typeof document === "undefined") return;

  const shortfall = desiredTop - maxScrollTop();
  if (shortfall <= 0) return;

  const neededHeight = Math.ceil(shortfall + 160);

  if (!activeSmartBarFocusBottomRoom) {
    activeSmartBarFocusBottomRoom = document.createElement("div");
    activeSmartBarFocusBottomRoom.setAttribute("data-smartbar-focus-bottom-room", "true");
    activeSmartBarFocusBottomRoom.setAttribute("aria-hidden", "true");
    activeSmartBarFocusBottomRoom.style.cssText = [
      "display:block",
      "width:1px",
      "height:0px",
      "pointer-events:none",
      "opacity:0",
      "visibility:hidden",
    ].join(";");
    document.body.appendChild(activeSmartBarFocusBottomRoom);
  }

  activeSmartBarFocusBottomRoom.style.height = `${Math.max(neededHeight, activeSmartBarFocusBottomRoom.offsetHeight || 0)}px`;
}

function scrollSmartBarFocusElementIntoPlace(
  element: HTMLElement,
  behavior: ScrollBehavior,
) {
  const desiredTop = focusElementTop(element);
  ensureSmartBarFocusBottomRoomFor(desiredTop);

  window.scrollTo({
    top: Math.min(Math.max(0, desiredTop), maxScrollTop()),
    behavior,
  });
}

export function clearSmartBarFocusOverlay() {
  if (typeof document === "undefined") return;

  activeSmartBarFocusOverlayCleanup?.();
  activeSmartBarFocusOverlayCleanup = null;
  clearSmartBarFocusBottomRoom();

  document
    .querySelectorAll<HTMLElement>("[data-smartbar-focus-overlay='true']")
    .forEach((node) => node.remove());
}

function targetBorderRadius(element: HTMLElement) {
  const radius = window.getComputedStyle(element).borderRadius;
  return radius && radius !== "0px" ? radius : "32px";
}

function overlayInsetFor(element: HTMLElement) {
  const mode = element.getAttribute("data-spotlight-mode");
  if (mode === "navigation") return { frost: -2 };
  if (mode === "region") return { frost: -4 };
  return { frost: -4 };
}

function expandedCssRect(rect: DOMRect, inset: number) {
  return {
    left: Math.max(0, rect.left + inset),
    top: Math.max(0, rect.top + inset),
    width: Math.max(0, rect.width - inset * 2),
    height: Math.max(0, rect.height - inset * 2),
  };
}

function applyFixedRect(node: HTMLElement, rect: ReturnType<typeof expandedCssRect>) {
  node.style.left = `${rect.left}px`;
  node.style.top = `${rect.top}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
}

function runSmartBarFocusOverlay(element: HTMLElement, options: SmartBarFocusOptions = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  clearSmartBarFocusOverlay();

  const duration = options.overlayDurationMs ?? 3600;

  const frame = document.createElement("div");
  frame.setAttribute("data-smartbar-focus-overlay", "true");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = [
    "pointer-events:none",
    "position:fixed",
    "inset:0",
    `z-index:${SMARTBAR_FOCUS_OVERLAY_Z_INDEX}`,
    "isolation:isolate",
  ].join(";");

  const frost = document.createElement("div");
  frost.style.cssText = [
    "position:fixed",
    "z-index:1",
    "background:rgba(241,245,249,0.76)",
    "box-shadow:inset 0 0 46px rgba(255,255,255,0.96)",
    "outline:1px solid rgba(255,255,255,0.82)",
    "backdrop-filter:blur(18px)",
    "-webkit-backdrop-filter:blur(18px)",
  ].join(";");

  const updateOverlayGeometry = () => {
    const nextRect = element.getBoundingClientRect();
    if (nextRect.width <= 0 || nextRect.height <= 0) {
      frame.remove();
      return false;
    }

    const radius = targetBorderRadius(element);
    const inset = overlayInsetFor(element);
    const frostRect = expandedCssRect(nextRect, inset.frost);

    frost.style.borderRadius = radius;
    applyFixedRect(frost, frostRect);
    return true;
  };

  if (!updateOverlayGeometry()) return false;

  frame.appendChild(frost);
  document.body.appendChild(frame);
  updateOverlayGeometry();

  let animationFrame = 0;
  const scheduleGeometryUpdate = () => {
    if (animationFrame || !frame.isConnected) return;
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0;
      updateOverlayGeometry();
    });
  };

  window.addEventListener("scroll", scheduleGeometryUpdate, true);
  window.addEventListener("resize", scheduleGeometryUpdate);
  window.visualViewport?.addEventListener("scroll", scheduleGeometryUpdate);
  window.visualViewport?.addEventListener("resize", scheduleGeometryUpdate);

  const cleanup = () => {
    window.removeEventListener("scroll", scheduleGeometryUpdate, true);
    window.removeEventListener("resize", scheduleGeometryUpdate);
    window.visualViewport?.removeEventListener("scroll", scheduleGeometryUpdate);
    window.visualViewport?.removeEventListener("resize", scheduleGeometryUpdate);
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    frame.remove();
    clearSmartBarFocusBottomRoom();
    if (activeSmartBarFocusOverlayCleanup === cleanup) activeSmartBarFocusOverlayCleanup = null;
  };

  activeSmartBarFocusOverlayCleanup = cleanup;

  frost.animate(
    [
      { opacity: 0.98, transform: "scale(1.018)", backdropFilter: "blur(18px)" },
      { opacity: 0.84, transform: "scale(1.006)", backdropFilter: "blur(10px)", offset: 0.34 },
      { opacity: 0, transform: "scale(1)", backdropFilter: "blur(0px)" },
    ],
    { duration: 1120, easing: "ease-out", fill: "forwards" },
  );

  window.setTimeout(cleanup, duration);

  return true;
}

function normalizeTarget(target: string | SmartBarFocusTarget): SmartBarFocusTarget {
  if (typeof target === "string") return { targetId: target };
  return target;
}

function focusTargetKey(target: SmartBarFocusTarget) {
  return [target.targetSelector, target.targetId, target.pageId]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("|");
}

function dispatchFocusDebug(detail: SmartBarFocusDebugDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("smartbar-focus-debug", { detail }));
}

export async function smartbarFocusTarget(
  rawTarget: string | SmartBarFocusTarget,
  options: SmartBarFocusOptions = {},
) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const target = normalizeTarget(rawTarget);
  const targetKey = focusTargetKey(target);
  const now = Date.now();

  if (targetKey && targetKey === lastSmartBarFocusKey && now - lastSmartBarFocusStartedAt < SMARTBAR_FOCUS_DUPLICATE_SUPPRESS_MS) {
    if (options.debug) dispatchFocusDebug({ target, found: true, placed: true, reason: "duplicate_suppressed" });
    return true;
  }

  lastSmartBarFocusKey = targetKey;
  lastSmartBarFocusStartedAt = now;
  const focusRunId = ++smartBarFocusRunId;

  const isCurrentFocusRun = () => focusRunId === smartBarFocusRunId;

  const initialDelayMs = options.initialDelayMs ?? SMARTBAR_FOCUS_DEFAULT_DELAY_MS;
  if (initialDelayMs > 0) await wait(initialDelayMs);
  if (!isCurrentFocusRun()) return false;

  await waitForFrame();
  if (!isCurrentFocusRun()) return false;

  const element = await waitForFocusElement(target, options.attempts ?? 18);
  if (!element) {
    if (options.debug) dispatchFocusDebug({ target, found: false, placed: false, reason: "target_not_found" });
    return false;
  }

  let placed = false;
  const placementAttempts = Math.max(5, Math.min(9, Math.ceil((options.attempts ?? 18) / 4)));

  for (let attempt = 0; attempt < placementAttempts; attempt += 1) {
    const behavior = attempt === 0 ? options.scrollBehavior ?? "smooth" : "auto";

    if (attempt === 2) {
      // Fallback for pages with layout animations: ask the browser to center the
      // element once, then let our safe-area math make the final correction.
      element.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    } else {
      scrollSmartBarFocusElementIntoPlace(element, behavior);
    }

    await wait(attempt === 0 && behavior === "smooth" ? 560 : 170);
    if (!isCurrentFocusRun()) return false;
    await waitForFrame();
    if (!isCurrentFocusRun()) return false;

    placed = focusElementIsPlaced(element);
    if (placed) break;
  }

  if (!placed) {
    // One final deterministic correction after all page/shell animations have
    // settled. Do not frost a visibly cut-off target.
    scrollSmartBarFocusElementIntoPlace(element, "auto");
    await wait(120);
    if (!isCurrentFocusRun()) return false;
    await waitForFrame();
    if (!isCurrentFocusRun()) return false;
    placed = focusElementIsPlaced(element);
  }

  // Let layout settle after the final scroll. The overlay is fixed-position and
  // measured from the target's final viewport rect, so the customer site DOM is
  // not modified and the target does not need to be raised above SmartBar.
  await wait(90);
  if (!isCurrentFocusRun()) return false;

  const rect = element.getBoundingClientRect();

  if (!placed) {
    if (options.debug) dispatchFocusDebug({ target, found: true, placed: false, rect, reason: "placement_failed" });
    return false;
  }

  const overlayShown = runSmartBarFocusOverlay(element, options);

  if (options.dispatchLegacyEvent !== false) {
    window.dispatchEvent(new CustomEvent("guide-spotlight-target", { detail: target }));
  }
  if (options.debug) dispatchFocusDebug({ target, found: true, placed, rect });

  return overlayShown;
}

export function installSmartBarFocusTestHook() {
  if (typeof window === "undefined") return;

  window.__smartbarFocusTest = (target, options) =>
    smartbarFocusTarget(target, { initialDelayMs: 0, debug: true, ...options });
  window.__smartbarClearFocusTest = clearSmartBarFocusOverlay;
}

export { SMARTBAR_FOCUS_ROOT_SELECTOR };
