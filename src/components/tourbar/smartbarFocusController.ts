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
};

type SmartBarFocusDebugDetail = {
  target: SmartBarFocusTarget;
  found: boolean;
  placed: boolean;
  rect?: DOMRect;
  reason?: string;
};

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

  return targetRight > panelRect.left && targetLeft < panelRect.right;
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

export function clearSmartBarFocusOverlay() {
  if (typeof document === "undefined") return;

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
  if (mode === "navigation") return { frost: -2, border: -6 };
  if (mode === "region") return { frost: -4, border: -8 };
  return { frost: -4, border: -8 };
}

function expandedCssRect(rect: DOMRect, inset: number) {
  return {
    left: Math.max(0, rect.left + inset),
    top: Math.max(0, rect.top + inset),
    width: Math.max(0, rect.width - inset * 2),
    height: Math.max(0, rect.height - inset * 2),
  };
}

function runSmartBarFocusOverlay(element: HTMLElement, options: SmartBarFocusOptions = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  clearSmartBarFocusOverlay();

  const radius = targetBorderRadius(element);
  const inset = overlayInsetFor(element);
  const frostRect = expandedCssRect(rect, inset.frost);
  const borderRect = expandedCssRect(rect, inset.border);
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

  const border = document.createElement("div");
  border.style.cssText = [
    "position:fixed",
    `left:${borderRect.left}px`,
    `top:${borderRect.top}px`,
    `width:${borderRect.width}px`,
    `height:${borderRect.height}px`,
    "z-index:1",
    `border-radius:${radius}`,
    "box-shadow:0 0 0 2px rgba(103,232,249,0.65), 0 0 0 10px rgba(34,211,238,0.12), 0 24px 80px rgba(34,211,238,0.34)",
  ].join(";");

  const frost = document.createElement("div");
  frost.style.cssText = [
    "position:fixed",
    `left:${frostRect.left}px`,
    `top:${frostRect.top}px`,
    `width:${frostRect.width}px`,
    `height:${frostRect.height}px`,
    "z-index:2",
    `border-radius:${radius}`,
    "background:rgba(241,245,249,0.76)",
    "box-shadow:inset 0 0 46px rgba(255,255,255,0.96)",
    "outline:1px solid rgba(255,255,255,0.82)",
    "backdrop-filter:blur(18px)",
    "-webkit-backdrop-filter:blur(18px)",
  ].join(";");

  frame.appendChild(border);
  frame.appendChild(frost);
  document.body.appendChild(frame);

  frost.animate(
    [
      { opacity: 0.98, transform: "scale(1.018)", backdropFilter: "blur(18px)" },
      { opacity: 0.84, transform: "scale(1.006)", backdropFilter: "blur(10px)", offset: 0.34 },
      { opacity: 0, transform: "scale(1)", backdropFilter: "blur(0px)" },
    ],
    { duration: 1120, easing: "ease-out", fill: "forwards" },
  );

  border.animate(
    [
      { opacity: 0.86, transform: "scale(0.992)" },
      { opacity: 0.62, transform: "scale(1)", offset: 0.35 },
      { opacity: 0.18, transform: "scale(1.006)", offset: 0.82 },
      { opacity: 0, transform: "scale(1)" },
    ],
    { duration: Math.min(Math.max(duration - 200, 1600), 4800), easing: "ease-out", fill: "forwards" },
  );

  window.setTimeout(() => {
    frame.remove();
  }, duration);

  return true;
}

function normalizeTarget(target: string | SmartBarFocusTarget): SmartBarFocusTarget {
  if (typeof target === "string") return { targetId: target };
  return target;
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
  const initialDelayMs = options.initialDelayMs ?? SMARTBAR_FOCUS_DEFAULT_DELAY_MS;
  if (initialDelayMs > 0) await wait(initialDelayMs);

  await waitForFrame();

  const element = await waitForFocusElement(target, options.attempts ?? 18);
  if (!element) {
    if (options.debug) dispatchFocusDebug({ target, found: false, placed: false, reason: "target_not_found" });
    return false;
  }

  let placed = false;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    window.scrollTo({
      top: focusElementTop(element),
      behavior: attempt === 0 ? options.scrollBehavior ?? "smooth" : "auto",
    });

    await wait(attempt === 0 ? 520 : 180);
    await waitForFrame();

    placed = focusElementIsPlaced(element);
    if (placed) break;
  }

  // Let layout settle after the final scroll. The overlay is fixed-position and
  // measured from the target's final viewport rect, so the customer site DOM is
  // not modified and the target does not need to be raised above SmartBar.
  await wait(90);

  const overlayShown = runSmartBarFocusOverlay(element, options);
  const rect = element.getBoundingClientRect();

  window.dispatchEvent(new CustomEvent("guide-spotlight-target", { detail: target }));
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
