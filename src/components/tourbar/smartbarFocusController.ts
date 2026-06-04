const SMARTBAR_FOCUS_DEFAULT_DELAY_MS = 700;
const SMARTBAR_FOCUS_OVERLAY_Z_INDEX = 10040;
const SMARTBAR_FOCUS_MOBILE_TOP_ANCHOR_Y = 52;
const SMARTBAR_FOCUS_ROOT_SELECTOR = "[data-tourbar-shell-root='true']";
const SMARTBAR_OPEN_PANEL_SELECTORS = [
  "[data-tourbar-open-panel='true']",
  "[data-tourbar-sheet-panel='true']",
];

const SMARTBAR_SCROLL_STAGE_SELECTORS = [
  "[data-smartbar-scroll-stage='true']",
  "[data-smartbar-speed-stage='true']",
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
  skipPlacementScroll?: boolean;
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
let activeSmartBarFocusScrollCancel: (() => void) | null = null;

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
  // Prefer the explicit SmartBar/customer target contract over a plain id.
  // Several demo apps keep the id on a layout wrapper and put data-tour-id on
  // the actual visual card/control. Matching the contract first keeps all
  // agents on the same spotlight geometry.
  return `[data-tour-id="${escaped}"], #${escaped}`;
}

function smartbarElementHasExplicitFocusContract(element: HTMLElement) {
  return Boolean(
    element.getAttribute("data-spotlight-mode") ||
      element.getAttribute("data-tour-id") ||
      element.getAttribute("data-smartbar-focus-surface"),
  );
}

function smartbarVisibleRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    rect.width < 80 ||
    rect.height < 48
  ) {
    return null;
  }

  return rect;
}

function smartbarFocusableArea(rect: DOMRect): number {
  const viewportClippedWidth = Math.max(
    0,
    Math.min(rect.right, viewportWidth()) - Math.max(rect.left, 0),
  );
  const viewportClippedHeight = Math.max(
    0,
    Math.min(rect.bottom, viewportHeight()) - Math.max(rect.top, 0),
  );
  return viewportClippedWidth * viewportClippedHeight;
}

function smartbarBestVisualChild(element: HTMLElement): HTMLElement {
  if (smartbarElementHasExplicitFocusContract(element)) return element;

  const parentRect = smartbarVisibleRect(element);
  const children = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  if (!children.length) return element;

  const candidates = children
    .map((child) => {
      const rect = smartbarVisibleRect(child);
      return rect ? { child, rect, area: smartbarFocusableArea(rect) } : null;
    })
    .filter((item): item is { child: HTMLElement; rect: DOMRect; area: number } =>
      Boolean(item && item.area > 0),
    )
    .sort((a, b) => b.area - a.area);

  if (!candidates.length) return element;

  const best = candidates[0];

  // If the selected node is only a layout wrapper, descend one level to the
  // visible card/control surface. This mirrors BurgerRush, where the id and
  // data-tour-id live directly on the visible card instead of an outer section.
  const nested: HTMLElement = smartbarBestVisualChild(best.child);
  const nestedRect = nested === best.child ? best.rect : smartbarVisibleRect(nested);

  if (!parentRect || !nestedRect) return nested;

  const parentArea = Math.max(1, smartbarFocusableArea(parentRect));
  const nestedArea = smartbarFocusableArea(nestedRect);

  // Avoid jumping to tiny badges/buttons inside a section. We only replace the
  // wrapper when the child is clearly the main visual surface.
  return nestedArea / parentArea >= 0.35 ? nested : element;
}

function smartbarResolveFocusElement(element: HTMLElement): HTMLElement {
  return smartbarBestVisualChild(element);
}

export function smartbarFindFocusElement(target: SmartBarFocusTarget) {
  if (typeof document === "undefined") return null;

  const selector = targetSelectorFromFocus(target);
  if (selector) {
    try {
      const bySelector = document.querySelector<HTMLElement>(selector);
      if (bySelector) return smartbarResolveFocusElement(bySelector);
    } catch {
      // Invalid customer selectors should not break SmartBar focus attempts.
    }
  }

  const cleanId = String(target.targetId || "").trim();
  const byId = cleanId ? document.getElementById(cleanId) : null;
  return byId ? smartbarResolveFocusElement(byId) : null;
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
  // Wide target cards can share a small right-side lane with the SmartBar
  // sheet. Reserving the full sheet height for that shallow overlap pushes the
  // target down and causes bottom clipping. Only reserve vertical space when
  // the sheet covers the target centerline or a large share of the target.
  return targetCenterCovered || overlapShareOfTarget >= 0.45;
}

function smartBarSafeTop(targetRect?: DOMRect | null) {
  const baseTop = 92;

  if (smartBarFocusIsPhoneViewport()) {
    // On phones, SmartBar sheets occupy the lower viewport. Reserving their
    // height as top-safe space pushes targets down and causes the focused card
    // to disappear under the sheet. Keep the target anchored near the physical
    // top of the phone instead.
    return Math.min(SMARTBAR_FOCUS_MOBILE_TOP_ANCHOR_Y, Math.max(40, viewportHeight() - 240));
  }

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

  if (smartBarFocusIsPhoneViewport()) {
    return Math.max(0, elementTop - safeTop);
  }

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

  if (smartBarFocusIsPhoneViewport()) {
    const requiredVisibleHeight = Math.min(160, Math.max(48, rect.height * 0.38));
    return (
      rect.top >= safeTop - 16 &&
      rect.top <= safeTop + 24 &&
      rect.bottom >= safeTop + requiredVisibleHeight
    );
  }

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

function cancelSmartBarFocusScroll() {
  activeSmartBarFocusScrollCancel?.();
  activeSmartBarFocusScrollCancel = null;
}

function clampSmartBarScrollTop(value: number) {
  return Math.min(Math.max(0, value), maxScrollTop());
}

function smartBarScrollEase(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smartBarFocusIsPhoneViewport() {
  return (
    viewportWidth() <= 767 ||
    /Android|iPhone|iPod|Mobile/i.test(window.navigator.userAgent)
  );
}

function smartBarScrollDuration(distance: number) {
  // Fast enough for a guided UI, slow enough to read as intentional movement.
  if (smartBarFocusIsPhoneViewport()) {
    return Math.min(1500, Math.max(620, Math.abs(distance) * 0.88));
  }

  return Math.min(920, Math.max(340, Math.abs(distance) * 0.58));
}

function scrollWindowDeterministicallyTo(
  desiredTop: number,
  behavior: ScrollBehavior,
) {
  cancelSmartBarFocusScroll();

  const startTop = window.scrollY || document.documentElement.scrollTop || 0;
  const endTop = clampSmartBarScrollTop(desiredTop);
  const distance = endTop - startTop;

  if (behavior === "auto" || Math.abs(distance) < 2) {
    window.scrollTo(0, endTop);
    return waitForFrame();
  }

  const duration = smartBarScrollDuration(distance);

  return new Promise<void>((resolve) => {
    let raf = 0;
    let resolved = false;
    let cancel: () => void = () => undefined;
    const startedAt = performance.now();

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      if (activeSmartBarFocusScrollCancel === cancel) activeSmartBarFocusScrollCancel = null;
      resolve();
    };

    cancel = () => {
      finish();
    };

    const step = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      const eased = smartBarScrollEase(progress);
      const nextTop = startTop + distance * eased;

      // Numeric scrollTo avoids browser-native smooth-scroll and CSS
      // scroll-behavior. SmartBar owns every animation frame.
      window.scrollTo(0, clampSmartBarScrollTop(nextTop));

      if (progress >= 1) {
        window.scrollTo(0, endTop);
        finish();
        return;
      }

      raf = window.requestAnimationFrame(step);
    };

    activeSmartBarFocusScrollCancel = cancel;
    raf = window.requestAnimationFrame(step);
  });
}


function smartbarScrollableStageFor(element: HTMLElement) {
  const candidates = SMARTBAR_SCROLL_STAGE_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector)),
  );

  return candidates.find((stage) => {
    if (!stage.contains(element)) return false;

    const style = window.getComputedStyle(stage);
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
    return canScrollY && stage.scrollHeight > stage.clientHeight + 4;
  }) || null;
}

function clampSmartBarStageScrollTop(stage: HTMLElement, value: number) {
  return Math.min(Math.max(0, value), Math.max(0, stage.scrollHeight - stage.clientHeight));
}

function focusElementTopInStage(element: HTMLElement, stage: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const safeTop = smartBarSafeTop(rect);
  const targetTopInStage = stage.scrollTop + rect.top - stageRect.top;
  const desiredViewportTop = Math.max(stageRect.top + 12, safeTop);
  return targetTopInStage - (desiredViewportTop - stageRect.top);
}

function scrollStageDeterministicallyTo(
  stage: HTMLElement,
  desiredTop: number,
  behavior: ScrollBehavior,
) {
  cancelSmartBarFocusScroll();

  const startTop = stage.scrollTop;
  const endTop = clampSmartBarStageScrollTop(stage, desiredTop);
  const distance = endTop - startTop;

  if (behavior === "auto" || Math.abs(distance) < 2) {
    stage.scrollTo({ top: endTop, left: 0, behavior: "auto" });
    return waitForFrame();
  }

  const duration = smartBarScrollDuration(distance);

  return new Promise<void>((resolve) => {
    let raf = 0;
    let resolved = false;
    let cancel: () => void = () => undefined;
    const startedAt = performance.now();

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      if (activeSmartBarFocusScrollCancel === cancel) activeSmartBarFocusScrollCancel = null;
      resolve();
    };

    cancel = () => {
      finish();
    };

    const step = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      const eased = smartBarScrollEase(progress);
      const nextTop = startTop + distance * eased;

      stage.scrollTo({ top: clampSmartBarStageScrollTop(stage, nextTop), left: 0, behavior: "auto" });

      if (progress >= 1) {
        stage.scrollTo({ top: endTop, left: 0, behavior: "auto" });
        finish();
        return;
      }

      raf = window.requestAnimationFrame(step);
    };

    activeSmartBarFocusScrollCancel = cancel;
    raf = window.requestAnimationFrame(step);
  });
}

async function scrollSmartBarFocusElementIntoPlace(
  element: HTMLElement,
  behavior: ScrollBehavior,
) {
  const stage = smartbarScrollableStageFor(element);

  if (stage) {
    const desiredStageTop = focusElementTopInStage(element, stage);
    await scrollStageDeterministicallyTo(stage, desiredStageTop, behavior);
    return;
  }

  const desiredTop = focusElementTop(element);
  ensureSmartBarFocusBottomRoomFor(desiredTop);
  await scrollWindowDeterministicallyTo(desiredTop, behavior);
}

export function clearSmartBarFocusOverlay() {
  if (typeof document === "undefined") return;

  activeSmartBarFocusOverlayCleanup?.();
  activeSmartBarFocusOverlayCleanup = null;
  cancelSmartBarFocusScroll();
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
  cancelSmartBarFocusScroll();
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

  if (options.skipPlacementScroll) {
    // The caller has already moved a local scroll stage into position. In that
    // mode SmartBar should only measure and frost the target; it should not run
    // the global window-placement correction that can make the whole page jump.
    await waitForFrame();
    if (!isCurrentFocusRun()) return false;
    placed = true;
  } else {
    const placementAttempts = Math.max(5, Math.min(9, Math.ceil((options.attempts ?? 18) / 4)));

    for (let attempt = 0; attempt < placementAttempts; attempt += 1) {
      const behavior = options.scrollBehavior === "auto" ? "auto" : "smooth";

      await scrollSmartBarFocusElementIntoPlace(element, behavior);
      if (!isCurrentFocusRun()) return false;
      await wait(attempt === 0 ? 110 : 70);
      if (!isCurrentFocusRun()) return false;
      await waitForFrame();
      if (!isCurrentFocusRun()) return false;

      placed = focusElementIsPlaced(element);
      if (placed) break;
    }

    if (!placed) {
      // One final deterministic correction after all page/shell animations have
      // settled. Do not frost a visibly cut-off target.
      await scrollSmartBarFocusElementIntoPlace(element, "auto");
      await wait(80);
      if (!isCurrentFocusRun()) return false;
      await waitForFrame();
      if (!isCurrentFocusRun()) return false;
      placed = focusElementIsPlaced(element);
    }
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
