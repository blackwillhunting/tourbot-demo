import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Compass, KeyRound, LayoutDashboard, LogIn, PlayCircle, ReceiptText, Search, ShieldCheck, ShoppingCart, Sparkles, XCircle } from "lucide-react";
import SmartBarSpeedDemo, { type SmartBarSpeedDemoVariant } from "./components/tourbar/speed-demo/SmartBarSpeedDemo";
import SmartBarFitsAnywhereAnimation, { FITS_ANYWHERE_ANIMATION_MS } from "./components/tourbar/speed-demo/SmartBarFitsAnywhereAnimation";
import FoodTrioDesktopIntroAnimation, { FOOD_TRIO_DESKTOP_INTRO_ANIMATION_MS } from "./components/tourbar/speed-demo/FoodTrioDesktopIntroAnimation";
import NexaPathMobileExperience from "./components/tourbar/smartbar-mobile/nexapath/NexaPathMobileExperience";
import DomiMobileExperience from "./components/tourbar/smartbar-mobile/domi/DomiMobileExperience";
import RestaurantWalkthrough from "./components/tourbar/walkthrough/RestaurantWalkthrough";
import SmartBarPlayground from "./components/tourbar/sandbox/SmartBarPlayground";
import SmartBarOrderBoardMock, { type SmartBarOrderBoardItem } from "./components/tourbar/order-board/SmartBarOrderBoardMock";
import {
  clearStoredSmartBarVendorContext,
  getStoredSmartBarVendorContext,
  saveStoredSmartBarVendorContext,
  normalizeSmartBarVendorContext,
  smartBarVendorContextFromAuthPayload,
  type SmartBarVendorContext,
} from "./components/tourbar/smartbar-mobile/SmartBarVendorContext";
import SmartBarSetupWalkthrough, { SMARTBAR_SETUP_WALKTHROUGH_STEPS } from "./components/tourbar/setup/SmartBarSetupWalkthrough";
import { SmartBarFlashCardStack, type SmartBarFlashCardStackItem } from "./components/tourbar/speed-demo/SmartBarFlashCardStack";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  SMARTBAR_FLASH_CARD_TRANSITION_MS,
  SMARTBAR_FLASH_CARD_CROSSOVER_MS,
  type SmartBarFlashCardCascadeMode,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
  type SmartBarTutorCard,
} from "./components/tourbar/speed-demo/SmartBarFlashCardRail";

const INTRO_DELAY_MS = 1200;
const CHECKING_MS = 1200;
const RESULT_HOLD_MS = 2000;
const DEFAULT_PRELUDE_HOLD_MS = 2500;
const DEMO_HANDOFF_SETTLE_MS = 260;
const REQUIRED_PASSCODE_LENGTH = 6;

const TOURBOT_AUTH_LOGIN_URL = "/api/tourbot-auth/login";
const TOURBOT_AUTH_SESSION_URL = "/api/tourbot-auth/session";
const SMARTBAR_VENDOR_ACTION_URLS = [
  "/api/smartbar/vendor-action",
  "https://tourbot.getn2ai.com/api/smartbar/vendor-action",
] as const;
const SMARTBAR_VENDOR_STATUS_URLS = [
  "/api/smartbar/vendor-status",
  "https://tourbot.getn2ai.com/api/smartbar/vendor-status",
] as const;
const SMARTBAR_SUBSCRIPTION_CHECKOUT_URLS = [
  "/api/smartbar/subscription/checkout",
  "https://tourbot.getn2ai.com/api/smartbar/subscription/checkout",
] as const;
const SMARTBAR_SUBSCRIPTION_PORTAL_URLS = [
  "/api/smartbar/subscription/portal",
  "https://tourbot.getn2ai.com/api/smartbar/subscription/portal",
] as const;
const SMARTBAR_SUBSCRIPTION_CANCEL_URLS = [
  "/api/smartbar/subscription/cancel",
  "https://tourbot.getn2ai.com/api/smartbar/subscription/cancel",
] as const;
const SMARTBAR_SUBSCRIPTION_REACTIVATE_URLS = [
  "/api/smartbar/subscription/reactivate",
  "https://tourbot.getn2ai.com/api/smartbar/subscription/reactivate",
] as const;
const SMARTBAR_TICKET_LIST_URL = "/api/smartbar-tickets/list";
const TOURBOT_AUTH_TOKEN_KEY = "tourbot_demo_token";
const TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY = "tourbot_demo_token_expires_at";
const TOURBOT_AUTH_DEMO_PATH_KEY = "tourbot_demo_path";
const TOURBOT_LOCAL_DEV_TOKEN = "local-dev";
const TOURBOT_LOCAL_DEV_TTL_SECONDS = 3600;
const TOURBOT_LEGACY_UNLOCK_COOKIE = "tourbot_demo_unlocked";

type TourBotAuthResponse = {
  ok?: boolean;
  token?: string;
  expiresAt?: number;
  demoPath?: string;
  vendorContext?: Partial<SmartBarVendorContext> | null;
  clientId?: string;
  vendorId?: string;
  displayName?: string;
  menuProfileId?: string;
  behaviorProfileId?: string;
  boardProfileId?: string;
  timezone?: string;
};

type TourBotAuthResult = {
  accepted: boolean;
  demoPath?: string;
  vendorContext?: SmartBarVendorContext;
};

type SmartBarVendorAction = "sandbox_request" | "website_setup_request" | "website_install_finished" | "ghost_test_ready";

function isLocalDemoAuthBypassEnabled() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.has("devBypass")) return true;

  const hostname = window.location.hostname;

  return (
    ["localhost", "127.0.0.1"].includes(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname)
  );
}

function clearLegacyPrototypeCookie() {
  if (typeof document === "undefined") return;

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOURBOT_LEGACY_UNLOCK_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag}`;
}

function clearStoredTourBotDemoToken() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_KEY);
  window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  window.localStorage.removeItem(TOURBOT_AUTH_DEMO_PATH_KEY);
  clearStoredSmartBarVendorContext();
  clearLegacyPrototypeCookie();
}

function normalizeTourBotDemoPath(value?: string | null) {
  const path = String(value || "").trim();
  if (!path) return "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) return "";

  const [pathAndSearch, hashPart = ""] = path.split("#", 2);
  const [pathnamePart, searchPart = ""] = pathAndSearch.split("?", 2);
  const cleanPathname = pathnamePart.replace(/\/+$/, "") || "/";
  const cleanSearch = searchPart ? `?${searchPart}` : "";
  const cleanHash = hashPart ? `#${hashPart}` : "";

  return `${cleanPathname}${cleanSearch}${cleanHash}`;
}

function getStoredTourBotDemoPath() {
  if (typeof window === "undefined") return "";
  return normalizeTourBotDemoPath(window.localStorage.getItem(TOURBOT_AUTH_DEMO_PATH_KEY));
}

function saveStoredTourBotDemoPath(demoPath?: string | null) {
  if (typeof window === "undefined") return;

  const cleanPath = normalizeTourBotDemoPath(demoPath);
  if (cleanPath) {
    window.localStorage.setItem(TOURBOT_AUTH_DEMO_PATH_KEY, cleanPath);
  } else {
    window.localStorage.removeItem(TOURBOT_AUTH_DEMO_PATH_KEY);
  }
}

function currentTourBotDemoPath() {
  if (typeof window === "undefined") return "/";
  return normalizeTourBotDemoPath(window.location.pathname) || "/";
}

function tourBotDemoPathIsDomiMobilePlayground(cleanPath: string) {
  return cleanPath === "/domi-play";
}

function tourBotDemoPathIsDomiDedicatedDemo(cleanPath: string) {
  return (
    cleanPath === "/domi-play-demo" ||
    cleanPath === "/domi-smartbar" ||
    cleanPath === "/domi-demo" ||
    cleanPath === "/hotel-smartbar"
  );
}

function tourBotDemoPathIsFoodRoute(cleanPath: string) {
  return (
    cleanPath === "/burger-rush" ||
    cleanPath === "/burger-rush-play" ||
    cleanPath === "/smartbar-burgerrush" ||
    cleanPath === "/smartbar-play" ||
    cleanPath === "/direct-ordering" ||
    cleanPath === "/foodtrio" ||
    cleanPath === "/food-trio" ||
    cleanPath === "/food-trio-mobile" ||
    cleanPath === "/food-trio-desktop"
  );
}

function redirectToTourBotDemoPath(
  demoPath?: string | null,
  options: { allowFoodRouteSteering?: boolean } = {},
) {
  if (typeof window === "undefined") return false;

  const cleanPath = normalizeTourBotDemoPath(demoPath);
  if (!cleanPath) return false;

  const currentPath = currentTourBotDemoPath();
  if (currentPath === cleanPath) return false;

  const cleanPathname = cleanPath.split("?")[0].split("#")[0] || "/";

  // Food passcodes may steer only as a one-time fresh login from the root
  // launch page. Existing sessions must only unlock the current URL, otherwise
  // stale demoPath state can keep dragging general-demo visitors into BurgerRush.
  if (
    tourBotDemoPathIsFoodRoute(cleanPathname) &&
    !(options.allowFoodRouteSteering === true && currentPath === "/")
  ) {
    return false;
  }

  window.location.assign(cleanPath);
  return true;
}

function saveStoredTourBotDemoToken(
  token: string,
  expiresAt?: number,
  demoPath?: string,
  vendorContext?: SmartBarVendorContext | null,
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOURBOT_AUTH_TOKEN_KEY, token);
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    window.localStorage.setItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
  } else {
    window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  }

  saveStoredTourBotDemoPath(demoPath);
  if (vendorContext) {
    saveStoredSmartBarVendorContext(vendorContext, demoPath);
  }
  clearLegacyPrototypeCookie();
}

function ensureLocalDemoAuthToken() {
  if (!isLocalDemoAuthBypassEnabled()) return;

  saveStoredTourBotDemoToken(
    TOURBOT_LOCAL_DEV_TOKEN,
    Math.floor(Date.now() / 1000) + TOURBOT_LOCAL_DEV_TTL_SECONDS,
  );
}

function getStoredTourBotDemoToken() {
  if (typeof window === "undefined") return "";

  const token = window.localStorage.getItem(TOURBOT_AUTH_TOKEN_KEY) || "";
  const expiresAtRaw = window.localStorage.getItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;

  if (!token) return "";

  if (expiresAt && Number.isFinite(expiresAt) && expiresAt * 1000 <= Date.now()) {
    clearStoredTourBotDemoToken();
    return "";
  }

  return token;
}

function shouldResetAccessFromUrl() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return params.get("logout") === "1" || params.get("resetAccess") === "1";
}

function shouldOpenSmartBarRootDemoLobbyFromReturn() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return params.get("smartbarReturn") === "demos";
}

function shouldOpenSmartBarRootOverviewFromReturn() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return params.get("smartbarReturn") === "overview";
}

function shouldOpenSmartBarSubscriptionReturn() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  return ["success", "cancel", "payment-method-return"].includes(params.get("subscription") || "");
}

function cleanupSmartBarSubscriptionReturnUrl() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  if (!params.has("subscription")) return;

  params.delete("subscription");
  const nextSearch = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
  );
}

function shouldSkipFitsAnywhereAnimationOnPhone() {
  if (typeof window === "undefined") return false;

  // The general SmartBar speed demo now uses the exact mobile-shell path on
  // desktop too, so skip the old fits-anywhere interstitial on this route.
  // FoodTrio keeps its own desktop intro behavior.
  if (currentTourBotDemoPath() === "/smartbar-speed") return true;

  if (typeof window.matchMedia !== "function") return false;

  return window.matchMedia("(max-width: 767px)").matches;
}

const SMARTBAR_MOBILE_GENERAL_START_KEY = "smartbar_mobile_general_start";
const SMARTBAR_MOBILE_GENERAL_FAST_KEY = "smartbar_mobile_general_fast";

function smartBarMobileGeneralShortcutParams() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const start =
    params.get("mobileDemoStart") ||
    params.get("mobileStart") ||
    params.get("mobileStep") ||
    "";

  const fast =
    params.get("mobileDemoFast") === "1" ||
    params.get("mobileFast") === "1" ||
    params.get("fast") === "1";

  if (!start && !fast) return null;
  return { start, fast };
}

function persistSmartBarMobileGeneralShortcut() {
  if (typeof window === "undefined") return false;

  const shortcut = smartBarMobileGeneralShortcutParams();
  if (!shortcut) return false;

  if (shortcut.start) {
    window.sessionStorage.setItem(SMARTBAR_MOBILE_GENERAL_START_KEY, shortcut.start);
  }

  window.sessionStorage.setItem(SMARTBAR_MOBILE_GENERAL_FAST_KEY, shortcut.fast ? "1" : "0");
  return true;
}

function hasSmartBarMobileGeneralShortcut() {
  if (typeof window === "undefined") return false;

  return Boolean(
    smartBarMobileGeneralShortcutParams() ||
      window.sessionStorage.getItem(SMARTBAR_MOBILE_GENERAL_START_KEY) ||
      window.sessionStorage.getItem(SMARTBAR_MOBILE_GENERAL_FAST_KEY) === "1",
  );
}

function cleanupResetAccessUrl() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const changed =
    params.has("logout") ||
    params.has("resetAccess") ||
    params.has("returnTo") ||
    params.has("smartbarLogin") ||
    params.has("smartbarReturn");
  params.delete("logout");
  params.delete("resetAccess");
  params.delete("returnTo");
  params.delete("smartbarLogin");
  params.delete("smartbarReturn");
  if (!changed) return;

  const nextSearch = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
  );
}

async function checkTourBotDemoSession(): Promise<TourBotAuthResult> {
  if (isLocalDemoAuthBypassEnabled()) {
    ensureLocalDemoAuthToken();
    return { accepted: true, vendorContext: getStoredSmartBarVendorContext() };
  }

  const token = getStoredTourBotDemoToken();
  if (!token) return { accepted: false };

  try {
    const response = await fetch(TOURBOT_AUTH_SESSION_URL, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearStoredTourBotDemoToken();
      return { accepted: false };
    }

    const body = (await response.json().catch(() => ({}))) as TourBotAuthResponse;
    if (body.ok !== true) {
      clearStoredTourBotDemoToken();
      return { accepted: false };
    }

    const demoPath = body.demoPath || getStoredTourBotDemoPath();
    const vendorContext = smartBarVendorContextFromAuthPayload(body, demoPath);

    if (typeof body.expiresAt === "number") {
      saveStoredTourBotDemoToken(token, body.expiresAt, demoPath, vendorContext);
    } else {
      if (body.demoPath) saveStoredTourBotDemoPath(body.demoPath);
      saveStoredSmartBarVendorContext(vendorContext, demoPath);
    }

    return { accepted: true, demoPath, vendorContext };
  } catch {
    return { accepted: false };
  }
}

async function loginToTourBotDemo(passcode: string): Promise<TourBotAuthResult> {
  if (isLocalDemoAuthBypassEnabled()) {
    ensureLocalDemoAuthToken();
    return { accepted: true, vendorContext: getStoredSmartBarVendorContext() };
  }

  try {
    const response = await fetch(TOURBOT_AUTH_LOGIN_URL, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ passcode }),
    });

    if (!response.ok) {
      clearStoredTourBotDemoToken();
      return { accepted: false };
    }

    const body = (await response.json().catch(() => ({}))) as TourBotAuthResponse;
    if (body.ok !== true || !body.token) {
      clearStoredTourBotDemoToken();
      return { accepted: false };
    }

    const vendorContext = smartBarVendorContextFromAuthPayload(body, body.demoPath);
    saveStoredTourBotDemoToken(body.token, body.expiresAt, body.demoPath, vendorContext);
    return { accepted: true, demoPath: body.demoPath, vendorContext };
  } catch {
    clearStoredTourBotDemoToken();
    return { accepted: false };
  }
}


async function submitSmartBarVendorAction(
  action: SmartBarVendorAction,
  vendorContext?: SmartBarVendorContext | null,
): Promise<SmartBarVendorContext> {
  const token = getStoredTourBotDemoToken();
  if (!token) {
    throw new Error("missing_session_token");
  }

  let lastFailureReason = "vendor_action_failed";

  for (const url of SMARTBAR_VENDOR_ACTION_URLS) {
    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const response = await fetch(url, {
        method: "POST",
        credentials: isAbsoluteUrl ? "omit" : "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const rawBody = await response.text().catch(() => "");
      const body = (rawBody ? JSON.parse(rawBody) : {}) as {
        ok?: boolean;
        vendorContext?: Partial<SmartBarVendorContext> | null;
        item?: unknown;
        demoPath?: string;
        reason?: string;
      };

      if (!response.ok || body.ok !== true) {
        lastFailureReason = body.reason || `vendor_action_failed_${response.status}`;
        continue;
      }

      const nextVendorContext = smartBarVendorContextFromAuthPayload(
        body.vendorContext || body.item || vendorContext || {},
        body.demoPath || vendorContext?.demoPath || "",
      );
      saveStoredSmartBarVendorContext(nextVendorContext, nextVendorContext.demoPath);
      return nextVendorContext;
    } catch (error) {
      lastFailureReason = error instanceof Error ? error.message : "vendor_action_network_failed";
    }
  }

  throw new Error(lastFailureReason);
}
async function refreshSmartBarVendorStatus(
  vendorContext?: SmartBarVendorContext | null,
): Promise<SmartBarVendorContext> {
  const token = getStoredTourBotDemoToken();
  if (!token) {
    throw new Error("missing_session_token");
  }

  const fallbackVendorContext = vendorContext || getStoredSmartBarVendorContext();
  let lastFailureReason = "vendor_status_failed";

  for (const url of SMARTBAR_VENDOR_STATUS_URLS) {
    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const response = await fetch(url, {
        method: "GET",
        credentials: isAbsoluteUrl ? "omit" : "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const rawBody = await response.text().catch(() => "");
      const body = (rawBody ? JSON.parse(rawBody) : {}) as {
        ok?: boolean;
        vendorContext?: Partial<SmartBarVendorContext> | null;
        item?: unknown;
        demoPath?: string;
        reason?: string;
      };

      if (!response.ok || body.ok !== true) {
        lastFailureReason = body.reason || `vendor_status_failed_${response.status}`;
        continue;
      }

      const nextVendorContext = smartBarVendorContextFromAuthPayload(
        {
          ...(fallbackVendorContext || {}),
          ...(body.item && typeof body.item === "object" && !Array.isArray(body.item) ? body.item : {}),
          ...body,
          ...(body.vendorContext || {}),
        },
        body.demoPath || fallbackVendorContext?.demoPath || "",
      );
      saveStoredSmartBarVendorContext(nextVendorContext, nextVendorContext.demoPath);
      return nextVendorContext;
    } catch (error) {
      lastFailureReason = error instanceof Error ? error.message : "vendor_status_network_failed";
    }
  }

  throw new Error(lastFailureReason);
}

type SmartBarSubscriptionSessionResponse = {
  ok?: boolean;
  url?: string;
  reason?: string;
  code?: string;
  message?: string;
};

async function createSmartBarSubscriptionSession(
  urls: readonly string[],
  fallbackError: string,
): Promise<string> {
  const token = getStoredTourBotDemoToken();
  if (!token) {
    throw new Error("missing_session_token");
  }

  let lastFailureReason = fallbackError;

  for (const url of urls) {
    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const response = await fetch(url, {
        method: "POST",
        credentials: isAbsoluteUrl ? "omit" : "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const rawBody = await response.text().catch(() => "");
      const body = (rawBody ? JSON.parse(rawBody) : {}) as SmartBarSubscriptionSessionResponse;

      if (!response.ok || body.ok !== true || !body.url) {
        lastFailureReason =
          body.reason ||
          body.message ||
          body.code ||
          `${fallbackError}_${response.status}`;
        continue;
      }

      return body.url;
    } catch (error) {
      lastFailureReason = error instanceof Error ? error.message : `${fallbackError}_network_failed`;
    }
  }

  throw new Error(lastFailureReason);
}

function createSmartBarSubscriptionCheckoutUrl() {
  return createSmartBarSubscriptionSession(
    SMARTBAR_SUBSCRIPTION_CHECKOUT_URLS,
    "subscription_checkout_failed",
  );
}

function createSmartBarSubscriptionPortalUrl() {
  return createSmartBarSubscriptionSession(
    SMARTBAR_SUBSCRIPTION_PORTAL_URLS,
    "subscription_portal_failed",
  );
}

async function cancelSmartBarSubscription(): Promise<Partial<SmartBarVendorContext>> {
  const token = getStoredTourBotDemoToken();
  if (!token) {
    throw new Error("missing_session_token");
  }

  let lastFailureReason = "subscription_cancel_failed";

  for (const url of SMARTBAR_SUBSCRIPTION_CANCEL_URLS) {
    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const response = await fetch(url, {
        method: "POST",
        credentials: isAbsoluteUrl ? "omit" : "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const rawBody = await response.text().catch(() => "");
      const body = (rawBody ? JSON.parse(rawBody) : {}) as Partial<SmartBarVendorContext> & {
        ok?: boolean;
        reason?: string;
        message?: string;
      };

      if (!response.ok || body.ok !== true) {
        lastFailureReason = body.reason || body.message || `subscription_cancel_failed_${response.status}`;
        continue;
      }

      return body;
    } catch (error) {
      lastFailureReason = error instanceof Error ? error.message : "subscription_cancel_network_failed";
    }
  }

  throw new Error(lastFailureReason);
}

async function reactivateSmartBarSubscription(): Promise<Partial<SmartBarVendorContext>> {
  const token = getStoredTourBotDemoToken();
  if (!token) {
    throw new Error("missing_session_token");
  }

  let lastFailureReason = "subscription_reactivate_failed";

  for (const url of SMARTBAR_SUBSCRIPTION_REACTIVATE_URLS) {
    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const response = await fetch(url, {
        method: "POST",
        credentials: isAbsoluteUrl ? "omit" : "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const rawBody = await response.text().catch(() => "");
      const body = (rawBody ? JSON.parse(rawBody) : {}) as Partial<SmartBarVendorContext> & {
        ok?: boolean;
        reason?: string;
        message?: string;
      };

      if (!response.ok || body.ok !== true) {
        lastFailureReason = body.reason || body.message || `subscription_reactivate_failed_${response.status}`;
        continue;
      }

      return body;
    } catch (error) {
      lastFailureReason = error instanceof Error ? error.message : "subscription_reactivate_network_failed";
    }
  }

  throw new Error(lastFailureReason);
}

type PreludeSlip = SmartBarTutorCard;

const PRELUDE_SLIPS: PreludeSlip[] = [
    {
    title: "What is **SmartBar**?",
    cascadeGroup: "stage-0",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 3000,
  },
  {
    title: "It looks like search",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1000,
  },
    {
    title: "feels like chat",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1000,
  },
  {
    title: "but returns action",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2000,
    clearCascade: true,
  },
  // {
  //   title: "Search bars return **results**",
  //   cascadeGroup: "smartbar-thesis",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 1500,
  // },
  // {
  //   title: "AI chat returns **words**",
  //   cascadeGroup: "smartbar-thesis",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 1500,
  // },
  // {
  //   title: "SmartBar returns **next steps**",
  //   cascadeGroup: "smartbar-thesis",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 2000,
  //   clearCascade: true,
  // },
    {
    title: "Like having Alexa",
    cascadeGroup: "smartbar-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
  },
  {
    title: "For any site",
    cascadeGroup: "smartbar-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2000,
    clearCascade: true,
  },
  {
    title: "an answer",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 800,
  },
  {
    title: "guided navigation",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 800,
  },
    {
    title: "a choice",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 700,
  },
    {
    title: "a completed form",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 700,
  },
    {
    title: "a cart",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 700,
  },
    {
    title: "a booking path",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 700,
  },
  //    {
   // title: "a proof sheet",
   // cascadeGroup: "next-step",
   // cascadeMode: "standard",
    //density: "normal",
    //holdMs: 700,
 // },
      {
    title: "or a handoff",
    cascadeGroup: "next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
  },
  {
    title: "It does what you need",
    cascadeGroup: "stage-2",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
    clearCascade: true,
  },
    {
    title: "It's screen-aware",
    cascadeGroup: "intro-mobile",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1250,
  },
  {
    title: "Mounts where it belongs",
    cascadeGroup: "intro-mobile",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1250,
  },
  {
    title: "Works on any site",
    cascadeGroup: "intro-mobile",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
    clearCascade: true,
  },
];

const BURGERRUSH_ONLY_PRELUDE_SLIPS: PreludeSlip[] = [
  {
    title: "What is **SmartBar**?",
    cascadeGroup: "stage-0",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 3000,
  },
  {
    title: "It looks like search",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1000,
  },
  {
    title: "feels like chat",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1000,
  },
  {
    title: "but returns action",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2000,
    clearCascade: true,
  },
  {
    title: "Search bars return **results**",
    cascadeGroup: "smartbar-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
  },
  {
    title: "AI chat returns **words**",
    cascadeGroup: "smartbar-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
  },
  {
    title: "SmartBar returns **next steps**",
    cascadeGroup: "smartbar-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2000,
    clearCascade: true,
  },
  {
    title: "a menu answer",
    cascadeGroup: "food-next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 750,
  },
  {
    title: "a cart",
    cascadeGroup: "food-next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 750,
  },
  {
    title: "a required choice",
    cascadeGroup: "food-next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 750,
  },
  {
    title: "an optional add-on",
    cascadeGroup: "food-next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 750,
  },
  {
    title: "a retry field",
    cascadeGroup: "food-next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 750,
  },
  {
    title: "or checkout",
    cascadeGroup: "food-next-step",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1600,
    clearCascade: true,
  },
  {
    title: "Whatever the order needs",
    cascadeGroup: "stage-2",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2200,
    clearCascade: true,
  },
  {
    title: "Screen-aware",
    cascadeGroup: "intro-mobile",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1100,
  },
  {
    title: "Mounts where it belongs",
    cascadeGroup: "intro-mobile",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1100,
  },
  {
    title: "Works on any restaurant site",
    cascadeGroup: "intro-mobile",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
    clearCascade: true,
  },
  // {
  //   title: "For this demo:",
  //   cascadeGroup: "burger-rush-lead-in",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 1100,
  // },
  // {
  //   title: "restaurant ordering",
  //   cascadeGroup: "burger-rush-lead-in",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 1100,
  // },
  // {
  //   title: "from plain English",
  //   cascadeGroup: "burger-rush-lead-in",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 1100,
  // },
  // {
  //   title: "to a checkout-ready cart",
  //   cascadeGroup: "burger-rush-lead-in",
  //   cascadeMode: "standard",
  //   density: "normal",
  //   holdMs: 1700,
  //   clearCascade: true,
  // },
];

const FOOD_TRIO_DESKTOP_PRELUDE_SLIPS: PreludeSlip[] = [
  {
    title: "SmartBar",
    cascadeGroup: "foodtrio-stage-0",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1300,
  },
  {
    title: "A search bar",
    cascadeGroup: "foodtrio-stage-0",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1100,
  },
  {
    title: "That builds carts.",
    cascadeGroup: "foodtrio-stage-0",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1700,
    clearCascade: true,
  },
  {
    title: "Like having Alexa.",
    cascadeGroup: "foodtrio-stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1400,
  },
  {
    title: "On any site.",
    cascadeGroup: "foodtrio-stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1800,
    clearCascade: true,
  },
  {
    title: "It fits anywhere.",
    cascadeGroup: "foodtrio-stage-11",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2800,
    clearCascade: true,
  },
];

const FOOD_TRIO_DESKTOP_POST_FITS_SLIPS: PreludeSlip[] = [
  {
    title: "Works the same everywhere.",
    cascadeGroup: "foodtrio-stage-12",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2800,
    clearCascade: true,
  },
];

const FOOD_TRIO_DESKTOP_POST_INTRO_SLIPS: PreludeSlip[] = [
  {
    title: "Type order.",
    cascadeGroup: "foodtrio-stage-13",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "Get cart.",
    cascadeGroup: "foodtrio-stage-13",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "Tap colors,",
    cascadeGroup: "foodtrio-stage-13",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "Checkout.",
    cascadeGroup: "foodtrio-stage-13",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1700,
    clearCascade: true,
  },
  {
    title: "Same idea.",
    cascadeGroup: "foodtrio-stage-14",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1100,
  },
  {
    title: "Now on real menus.",
    cascadeGroup: "foodtrio-stage-14",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2200,
    clearCascade: true,
  },
];



function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}



type SmartBarRootDemoMessage = {
  label: string;
  message: string;
  supportingLine?: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  storyIcon?: boolean;
  demoButtons?: boolean;
};

type SmartBarRootStageItem =
  | { kind: "passcode" }
  | { kind: "failure" }
  | { kind: "message"; message: SmartBarRootDemoMessage; sourceIndex: number }
  | { kind: "setup-step"; setupIndex: number }
  | { kind: "restaurant-preview" };

const SMARTBAR_ROOT_MESSAGES: SmartBarRootDemoMessage[] = [
{
  label: "SmartBar Portal",
  message: "**Manage SmartBar.**",
  description: "Choose an option below.",
  icon: LayoutDashboard,
  iconClass: "bg-[#012169] text-white ring-[#012169]/10",
},
  {
    label: "Workspace",
    message:
      "Test it, connect it, then run live orders.",
    icon: PlayCircle,
    iconClass: "bg-[#012169] text-white ring-[#012169]/10",
    demoButtons: true,
  },
];

const SMARTBAR_DEMOS_TRANSITION_MESSAGE: SmartBarRootDemoMessage = {
  label: "SmartBar demos",
  message: "**Opening demos.**",
  supportingLine: "Choose Quick Demo or Full Walkthrough.",
  icon: PlayCircle,
  iconClass: "bg-[#012169] text-white ring-[#012169]/10",
};

const SMARTBAR_LOGIN_TRANSITION_MESSAGE: SmartBarRootDemoMessage = {
  label: "SmartBar access",
  message: "**Opening SmartBar.**",
  supportingLine: "Your session decides whether you enter the portal or see the login challenge.",
  icon: LogIn,
  iconClass: "bg-[#012169] text-white ring-[#012169]/10",
};

const SMARTBAR_ROOT_OVERVIEW_STEP = SMARTBAR_ROOT_MESSAGES.length + 2;

const SMARTBAR_ROOT_THINKING_WIGGLE_DURATION = 1.35;
const SMARTBAR_ROOT_THINKING_WIGGLE_STAGGER = 0.018;
const SMARTBAR_ROOT_MESSAGE_WAVE_MS = 1360;
const SMARTBAR_ROOT_RIBBON_GLIDE_MS = 720;
const SMARTBAR_ROOT_PASSCODE_BOX_WIGGLE_STAGGER = 0.075;
const SMARTBAR_ROOT_PASSCODE_BOX_WIGGLE_DURATION = 1.18;

function normalizeSmartBarRootPasscode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, REQUIRED_PASSCODE_LENGTH);
}

function hasOptimisticSmartBarRootAccess() {
  if (shouldResetAccessFromUrl()) return false;
  return Boolean(getStoredTourBotDemoToken());
}

function getSafeSmartBarRootReturnTo() {
  if (typeof window === "undefined") return "";

  const rawReturnTo = new URLSearchParams(window.location.search).get("returnTo");
  if (!rawReturnTo) return "";

  try {
    const target = new URL(rawReturnTo, window.location.origin);
    if (target.origin !== window.location.origin) return "";

    const targetPath = normalizeTourBotDemoPath(target.pathname);
    const allowedPaths = new Set([
      "/foodtrio",
      "/food-trio",
      "/food-trio-mobile",
      "/food-trio-desktop",
      "/domi-play-demo",
      "/domi-play",
      "/smartbar-speed",
      "/smartbar-burgerrush",
      "/smartbar-play",
      "/burger-rush",
      "/burger-rush-play",
      "/direct-ordering",
      "/carryout",
      "/transactional",
      "/tourbar-transactional",
      "/informational",
      "/nexapath-play",
      "/local-smartbar-finale",
    ]);

    if (!allowedPaths.has(targetPath)) return "";

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "";
  }
}

function redirectToSafeSmartBarRootReturnTo() {
  const returnTo = getSafeSmartBarRootReturnTo();
  if (!returnTo) return false;

  window.location.href = returnTo;
  return true;
}

type SmartBarRootMarkdownSegment = {
  kind: "text" | "strong" | "em";
  text: string;
};

function parseSmartBarRootInlineMarkdown(body: string): SmartBarRootMarkdownSegment[] {
  return body
    .split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return { kind: "strong", text: part.slice(2, -2) };
      }

      if (part.startsWith("_") && part.endsWith("_")) {
        return { kind: "em", text: part.slice(1, -1) };
      }

      return { kind: "text", text: part };
    });
}

function smartBarRootMarkdownSegmentClass(kind: SmartBarRootMarkdownSegment["kind"]) {
  if (kind === "strong") return "font-semibold text-slate-950";
  if (kind === "em") return "italic text-slate-600";
  return "";
}

function SmartBarRootMarkdownText({ body }: { body: string }) {
  const segments = parseSmartBarRootInlineMarkdown(body);

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {segments.map((segment, index) => {
        const className = smartBarRootMarkdownSegmentClass(segment.kind);
        if (!className) return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
        return (
          <span key={`${segment.text}-${index}`} className={className}>
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}

function SmartBarRootThinkingText({ body }: { body: string }) {
  const segments = parseSmartBarRootInlineMarkdown(body);
  let characterIndex = 0;

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {segments.map((segment, segmentIndex) => {
        const segmentClass = smartBarRootMarkdownSegmentClass(segment.kind);
        const tokens = segment.text.match(/\S+|\s+/g) || [];

        return tokens.map((token, tokenIndex) => {
          const key = `${segmentIndex}-${tokenIndex}-${token}`;

          if (/^\s+$/.test(token)) {
            characterIndex += token.length;
            return token.includes("\n") ? (
              <span key={`space-${key}`}>{token}</span>
            ) : (
              <span key={`space-${key}`}> </span>
            );
          }

          const startIndex = characterIndex;
          characterIndex += token.length;

          return (
            <span
              key={key}
              className={`inline-block whitespace-nowrap align-baseline ${segmentClass}`.trim()}
            >
              {token.split("").map((char, index) => (
                <motion.span
                  key={`${char}-${key}-${index}`}
                  className="inline-block"
                  animate={{
                    y: [0, -2.75, 0, 1.65, 0],
                    opacity: [0.58, 1, 0.76, 1, 0.58],
                  }}
                  transition={{
                    duration: SMARTBAR_ROOT_THINKING_WIGGLE_DURATION,
                    repeat: Infinity,
                    delay: (startIndex + index) * SMARTBAR_ROOT_THINKING_WIGGLE_STAGGER,
                    ease: "easeInOut",
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </span>
          );
        });
      })}
    </span>
  );
}

function SmartBarRootProgressDots({ step, count }: { step: number; count: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2"
      aria-label={`Step ${step + 1} of ${count}`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className={
            "h-1.5 rounded-full transition-all sm:h-2 " +
            (index === step
              ? "w-7 bg-[#012169] shadow-[0_4px_12px_rgba(1,33,105,0.20)] sm:w-8"
              : "w-1.5 bg-slate-300 sm:w-2")
          }
        />
      ))}
    </div>
  );
}

function SmartBarRootDemoLaunchButton({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  statusLabel,
  steps,
  note,
  onSelect,
  stepNumber,
  isComplete = false,
  isDisabled = false,
  disabledLabel = "Locked",
  compactOnMobile = false,
}: {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  statusLabel?: string;
  steps?: string[];
  note?: string;
  onSelect?: () => void;
  stepNumber?: number;
  isComplete?: boolean;
  isDisabled?: boolean;
  disabledLabel?: string;
  compactOnMobile?: boolean;
}) {
  const hasStatusChecklist = Boolean(statusLabel || steps?.length || note);
  const stepLabel = typeof stepNumber === "number" ? String(stepNumber).padStart(2, "0") : "";
  const launchBaseClassName =
    "group relative flex h-full w-full items-start gap-3 overflow-hidden rounded-[22px] px-4 py-3 text-left shadow-[0_14px_34px_rgba(1,33,105,0.18)] ring-1 transition sm:min-h-[132px] sm:px-5 sm:py-4 " +
    (compactOnMobile ? "min-h-[104px]" : "min-h-[132px]");
  const launchStateClassName = isDisabled
    ? "cursor-not-allowed bg-slate-50 text-slate-400 shadow-none ring-slate-200/80 hover:translate-y-0"
    : isComplete
      ? "bg-emerald-600 text-white ring-emerald-500/20 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_20px_46px_rgba(22,101,52,0.24)]"
      : "bg-[#012169] text-white ring-transparent hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_20px_46px_rgba(1,33,105,0.26)]";
  const iconClassName = isDisabled
    ? "bg-white text-slate-400 ring-slate-200"
    : isComplete
      ? "bg-white/18 text-white ring-white/18 group-hover:bg-white/24"
      : "bg-[#eaf3ff]/18 text-white ring-white/16 group-hover:bg-white/22";
  const eyebrowClassName = isDisabled ? "text-slate-400" : isComplete ? "text-emerald-50/86" : "text-sky-100/82";
  const descriptionClassName = isDisabled ? "text-slate-400" : isComplete ? "text-emerald-50/90" : "text-sky-100/86";
  const launchClassName = `${launchBaseClassName} ${launchStateClassName}`;
  const content = (
    <>
      <div className={`absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition ${iconClassName}`}>
        {stepLabel ? <span className="text-sm font-black tracking-tight">{stepLabel}</span> : <Icon className="h-5 w-5" />}
        {stepLabel ? <Icon className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 opacity-75" /> : null}
      </div>

      <span className="block min-w-0 flex-1 pl-14 pr-20">
        <span className={`block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] ${eyebrowClassName}`}>
          {eyebrow}
        </span>
        <span className="mt-0.5 block whitespace-nowrap text-base font-semibold tracking-tight sm:text-lg">
          {title}
        </span>
        <span className={`mt-0.5 block whitespace-nowrap text-[13px] leading-5 sm:text-sm ${descriptionClassName}`}>
          {description}
        </span>

        {hasStatusChecklist && (
          <span className="mt-3 block rounded-[18px] bg-white/10 p-3 ring-1 ring-white/15">
            {statusLabel && (
              <span className="mb-2 flex items-center justify-between gap-3 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-50/80">
                <span>Status</span>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] text-[#012169]">
                  {statusLabel}
                </span>
              </span>
            )}

            {steps?.length ? (
              <span className="grid gap-1.5">
                {steps.map((stepText) => (
                  <span key={stepText} className="flex items-start gap-2 text-[12px] leading-4 text-sky-50/90">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/15">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span>{stepText}</span>
                  </span>
                ))}
              </span>
            ) : null}

            {note && (
              <span className="mt-3 block rounded-2xl bg-sky-100/10 px-3 py-2 text-[11px] leading-4 text-sky-50/80">
                {note}
              </span>
            )}
          </span>
        )}
      </span>

      {isComplete ? (
        <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : isDisabled ? (
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 ring-1 ring-slate-200">
          {disabledLabel}
        </span>
      ) : (
        <ArrowRight className="absolute right-5 top-9 h-5 w-5 text-sky-100/82 transition group-hover:translate-x-0.5 group-hover:text-white" />
      )}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={isDisabled ? undefined : onSelect} disabled={isDisabled} className={launchClassName} aria-disabled={isDisabled}>
        {content}
      </button>
    );
  }

  if (isDisabled) {
    return (
      <span className={launchClassName} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <a href={href || "#"} className={launchClassName}>
      {content}
    </a>
  );
}

function SmartBarRootSandboxReadiness({
  onBack,
  onOpenPlayground,
  vendorContext,
  onVendorContextUpdate,
}: {
  onBack: () => void;
  onOpenPlayground: () => void;
  vendorContext?: SmartBarVendorContext | null;
  onVendorContextUpdate?: (vendorContext: SmartBarVendorContext) => void;
}) {
  const [sandboxRequested, setSandboxRequested] = useState(false);
  const [sandboxRequestSubmitting, setSandboxRequestSubmitting] = useState(false);
  const [sandboxRequestError, setSandboxRequestError] = useState("");
  const [showTestInstructions, setShowTestInstructions] = useState(false);
  const queryReadyOverride = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("sandboxReady") === "1";
  }, []);
  const vendorOnboardingStatus = String(vendorContext?.onboardingStatus || "").trim().toLowerCase();
  const vendorIsReadyForOrders = vendorContext?.isReadyForOrders === true || vendorOnboardingStatus === "ready";
  const vendorSandboxRequestStatus = String(vendorContext?.sandboxRequestStatus || "").trim().toLowerCase();
  const vendorSandboxStatus = String(vendorContext?.sandboxStatus || "").trim().toLowerCase();
  const vendorSandboxRequested =
    Boolean(vendorContext?.sandboxRequestedUtc) ||
    ["pending", "requested", "complete", "ready"].includes(vendorSandboxRequestStatus) ||
    ["requested", "ready"].includes(vendorSandboxStatus);
  const sandboxReadyOverride = queryReadyOverride || vendorIsReadyForOrders;
  const sandboxIsRequested = sandboxReadyOverride || vendorSandboxRequested || sandboxRequested;

  const submitSandboxRequest = async () => {
    if (sandboxRequestSubmitting) return;
    setSandboxRequestSubmitting(true);
    setSandboxRequestError("");

    try {
      const nextVendorContext = await submitSmartBarVendorAction("sandbox_request", vendorContext);
      setSandboxRequested(true);
      onVendorContextUpdate?.(nextVendorContext);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "unknown_error";
      setSandboxRequestError(`Request could not be sent: ${reason}`);
    } finally {
      setSandboxRequestSubmitting(false);
    }
  };

  const rowBase = "flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 ring-1";
  const activeRow = "bg-white text-slate-950 ring-slate-200/80";
  const mutedRow = "bg-slate-50/80 text-slate-500 ring-slate-200/70";

  const statusClass = (status: string) =>
    status === "Pending"
      ? "bg-amber-200 text-[#012169]"
      : status === "Begin"
        ? "bg-[#012169] text-white"
        : status === "Ready"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500";


  if (showTestInstructions) {
    const instructionRows = [
      "Tap to say or type your order",
      "Open the ticket",
      "Mark Ready or Needs Fix",
    ];

    return (
      <div className="mx-auto mt-6 max-w-xl rounded-[24px] bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.07)] ring-1 ring-white/80 sm:mt-7 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Sandbox
            </div>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Test Orders
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowTestInstructions(false)}
            className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </button>
        </div>

        <div className="mt-4 rounded-3xl bg-[#012169] px-4 py-4 text-white shadow-[0_16px_32px_rgba(1,33,105,0.16)]">
          <div className="flex items-center justify-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            <span>Order</span>
            <ArrowRight className="h-4 w-4 text-sky-100/80" />
            <span>Ticket</span>
            <ArrowRight className="h-4 w-4 text-sky-100/80" />
            <span>Score</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5">
          {instructionRows.map((instruction, index) => (
            <div key={instruction} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-slate-950 ring-1 ring-slate-200/80">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                {index + 1}
              </div>
              <div className="text-base font-semibold tracking-tight">{instruction}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowTestInstructions(false);
            onOpenPlayground();
          }}
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
        >
          Begin Testing
        </button>
      </div>
    );
  }

  const steps = [
    {
      number: 1,
      title: "Request access",
      detail: "Create private test space.",
      status: sandboxReadyOverride ? "Ready" : sandboxIsRequested ? "Pending" : "Request",
      active: true,
      action: !sandboxIsRequested,
      actionType: "request",
    },
    {
      number: 2,
      title: "Load menu",
      detail: "We set this up.",
      status: sandboxReadyOverride ? "Ready" : sandboxIsRequested ? "Pending" : "Waiting",
      active: sandboxIsRequested,
      action: false,
      actionType: "status",
    },
    {
      number: 3,
      title: "Test orders",
      detail: "Run customer-style orders.",
      status: sandboxReadyOverride ? "Begin" : sandboxIsRequested ? "Waiting" : "Locked",
      active: sandboxIsRequested,
      action: sandboxReadyOverride,
      actionType: "begin",
    },
  ];

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-[24px] bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.07)] ring-1 ring-white/80 sm:mt-7 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sandbox
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Readiness
          </h3>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <div key={step.title} className={`${rowBase} ${step.active ? activeRow : mutedRow}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                {step.number}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-tight">{step.title}</div>
                <div className="text-sm leading-5 text-slate-500">{step.detail}</div>
              </div>
            </div>

            {step.action && step.actionType === "request" ? (
              <button
                type="button"
                onClick={submitSandboxRequest}
                disabled={sandboxRequestSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sandboxRequestSubmitting ? "Sending..." : "Request"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : step.action && step.actionType === "begin" ? (
              <button
                type="button"
                onClick={() => setShowTestInstructions(true)}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f]"
              >
                Begin
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusClass(step.status)}`}>
                {step.status}
              </div>
            )}
          </div>
        ))}
      </div>

      {sandboxRequestError ? (
        <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {sandboxRequestError}
        </div>
      ) : null}
    </div>
  );
}

function SmartBarRootWebsiteModeReadiness({
  onBack,
  vendorContext,
  onVendorContextUpdate,
}: {
  onBack: () => void;
  vendorContext?: SmartBarVendorContext | null;
  onVendorContextUpdate?: (vendorContext: SmartBarVendorContext) => void;
}) {
  const [websiteRequested, setWebsiteRequested] = useState(false);
  const [installFinished, setInstallFinished] = useState(false);
  const [ghostTestReady, setGhostTestReady] = useState(false);
  const [websiteActionSubmitting, setWebsiteActionSubmitting] = useState<SmartBarVendorAction | null>(null);
  const [websiteActionError, setWebsiteActionError] = useState("");

  const rowBase = "flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 ring-1";
  const activeRow = "bg-white text-slate-950 ring-slate-200/80";
  const mutedRow = "bg-slate-50/80 text-slate-500 ring-slate-200/70";

  const statusClass = (status: string) =>
    status === "Pending" || status === "Pending review"
      ? "bg-amber-200 text-[#012169]"
      : status === "Finished" || status === "Ready" || status === "Ready for review" || status === "Approved" || status === "Live"
        ? "bg-emerald-100 text-emerald-700"
        : status === "I'm finished"
          ? "bg-[#012169] text-white"
          : "bg-slate-100 text-slate-500";

  const vendorWebsiteSetupRequestStatus = String(vendorContext?.websiteSetupRequestStatus || "").trim().toLowerCase();
  const vendorWebsiteModeStatus = String(vendorContext?.websiteModeStatus || "").trim().toLowerCase();
  const vendorInstallStatus = String(vendorContext?.installStatus || "").trim().toLowerCase();
  const vendorGhostTestStatus = String(vendorContext?.ghostTestStatus || "").trim().toLowerCase();
  const ghostTestWasApproved = vendorGhostTestStatus === "approved" || vendorWebsiteModeStatus === "live";
  const websiteWasRequested =
    websiteRequested ||
    Boolean(vendorContext?.websiteSetupRequestedUtc) ||
    ["pending", "requested", "complete", "ready"].includes(vendorWebsiteSetupRequestStatus) ||
    ["requested", "installed_pending_verification", "ghost_test_ready_for_review", "ready", "live"].includes(vendorWebsiteModeStatus);
  const installWasFinished =
    installFinished ||
    Boolean(vendorContext?.installFinishedUtc) ||
    vendorInstallStatus === "vendor_finished" ||
    vendorWebsiteModeStatus === "installed_pending_verification" ||
    vendorWebsiteModeStatus === "ghost_test_ready_for_review" ||
    vendorWebsiteModeStatus === "live";
  const ghostTestWasReady =
    ghostTestWasApproved ||
    ghostTestReady ||
    Boolean(vendorContext?.ghostTestReadyUtc) ||
    vendorGhostTestStatus === "ready_for_review" ||
    vendorWebsiteModeStatus === "ghost_test_ready_for_review";
  const setupRequestWasCompleted =
    installWasFinished ||
    ghostTestWasReady ||
    ghostTestWasApproved ||
    vendorWebsiteModeStatus === "live";

  const submitWebsiteAction = async (action: SmartBarVendorAction) => {
    if (websiteActionSubmitting) return;
    setWebsiteActionSubmitting(action);
    setWebsiteActionError("");

    try {
      const nextVendorContext = await submitSmartBarVendorAction(action, vendorContext);
      if (action === "website_setup_request") setWebsiteRequested(true);
      if (action === "website_install_finished") setInstallFinished(true);
      if (action === "ghost_test_ready") setGhostTestReady(true);
      onVendorContextUpdate?.(nextVendorContext);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "unknown_error";
      setWebsiteActionError(`Request could not be sent: ${reason}`);
    } finally {
      setWebsiteActionSubmitting(null);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Request setup",
      detail: "Prepare install code.",
      status: setupRequestWasCompleted ? "Finished" : websiteWasRequested ? "Pending" : "Request",
      active: true,
      action: !websiteWasRequested && !setupRequestWasCompleted,
      actionType: "request",
    },
    {
      number: 2,
      title: "Install code",
      detail: "Add one script tag.",
      status: installWasFinished ? "Finished" : websiteWasRequested ? "I'm finished" : "Waiting",
      active: websiteWasRequested,
      action: websiteWasRequested && !installWasFinished,
      actionType: "finished",
    },
    {
      number: 3,
      title: "Ghost test",
      detail: "Test before going live.",
      status: ghostTestWasApproved ? "Approved" : ghostTestWasReady ? "Pending review" : installWasFinished ? "Ready for review" : websiteWasRequested ? "Waiting" : "Locked",
      active: websiteWasRequested,
      action: installWasFinished && !ghostTestWasReady,
      actionType: "ghostReady",
    },
  ];

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-[24px] bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.07)] ring-1 ring-white/80 sm:mt-7 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Website Mode
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Readiness
          </h3>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <div key={step.title} className={`${rowBase} ${step.active ? activeRow : mutedRow}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                {step.number}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-tight">{step.title}</div>
                <div className="text-sm leading-5 text-slate-500">{step.detail}</div>
              </div>
            </div>

            {step.action && step.actionType === "request" ? (
              <button
                type="button"
                onClick={() => submitWebsiteAction("website_setup_request")}
                disabled={websiteActionSubmitting !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {websiteActionSubmitting === "website_setup_request" ? "Sending..." : "Request"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : step.action && step.actionType === "finished" ? (
              <button
                type="button"
                onClick={() => submitWebsiteAction("website_install_finished")}
                disabled={websiteActionSubmitting !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {websiteActionSubmitting === "website_install_finished" ? "Sending..." : "I'm finished"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : step.action && step.actionType === "ghostReady" ? (
              <button
                type="button"
                onClick={() => submitWebsiteAction("ghost_test_ready")}
                disabled={websiteActionSubmitting !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {websiteActionSubmitting === "ghost_test_ready" ? "Sending..." : "Ready for review"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusClass(step.status)}`}>
                {step.status}
              </div>
            )}
          </div>
        ))}
      </div>

      {websiteActionError ? (
        <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {websiteActionError}
        </div>
      ) : null}
    </div>
  );
}

type SmartBarLiveBoardTicketLine = {
  title?: string;
  name?: string;
  quantity?: number | string;
  details?: unknown;
};

type SmartBarLiveBoardTicket = {
  ticketId?: string;
  ticketNumber?: string;
  ticketDisplayId?: string;
  clientId?: string;
  vendorId?: string;
  displayName?: string;
  menuProfileId?: string;
  behaviorProfileId?: string;
  boardProfileId?: string;
  timezone?: string;
  mode?: string;
  businessDate?: string;
  status?: string;
  customerText?: string;
  itemCount?: number | string;
  estimatedTotal?: number | string;
  createdAt?: string;
  readinessStatus?: string;
  readinessNote?: string;
  managerScoreStatus?: "ready" | "needs_fix" | string;
  managerScoreNote?: string;
  ticket?: {
    items?: SmartBarLiveBoardTicketLine[];
    totals?: {
      estimatedTotalLabel?: string;
      estimatedTotal?: number | string;
    };
  };
};

type SmartBarLiveBoardTicketListResponse = {
  ok?: boolean;
  tickets?: SmartBarLiveBoardTicket[];
  code?: string;
  message?: string;
};

function smartBarLiveOrderBoardIsEnabled(vendorContext?: SmartBarVendorContext | null) {
  const activeVendorContext = normalizeSmartBarVendorContext(vendorContext);
  const websiteModeStatus = String(activeVendorContext.websiteModeStatus || "").trim().toLowerCase();
  const ghostTestStatus = String(activeVendorContext.ghostTestStatus || "").trim().toLowerCase();

  return Boolean(activeVendorContext.orderBoardEnabled) || websiteModeStatus === "live" || ghostTestStatus === "approved";
}

function smartBarLiveBoardTicketListUrl(vendorContext: SmartBarVendorContext) {
  const params = new URLSearchParams({
    vendorId: vendorContext.vendorId,
    mode: "sandbox",
    timezone: vendorContext.timezone,
    limit: "80",
  });

  return `${SMARTBAR_TICKET_LIST_URL}?${params.toString()}`;
}

async function listSmartBarLiveBoardTickets(vendorContext: SmartBarVendorContext): Promise<SmartBarLiveBoardTicket[]> {
  const response = await fetch(smartBarLiveBoardTicketListUrl(vendorContext), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const json = (await response.json().catch(() => null)) as SmartBarLiveBoardTicketListResponse | null;

  if (!response.ok || !json?.ok) {
    throw new Error(json?.message || json?.code || `SmartBar live order board list failed with HTTP ${response.status}`);
  }

  return Array.isArray(json.tickets) ? json.tickets : [];
}

function smartBarLiveBoardTicketDisplayId(ticket: SmartBarLiveBoardTicket) {
  if (ticket.ticketDisplayId) return ticket.ticketDisplayId;
  if (ticket.ticketNumber) return ticket.ticketNumber.startsWith("#") ? ticket.ticketNumber : `#${ticket.ticketNumber}`;
  return ticket.ticketId || "SmartBar ticket";
}

function smartBarLiveBoardTicketDetails(value: unknown) {
  if (Array.isArray(value)) return value.map((detail) => String(detail || "").trim()).filter(Boolean);
  const detail = String(value || "").trim();
  return detail ? [detail] : undefined;
}

function smartBarLiveBoardTicketQuantity(value: unknown) {
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function smartBarLiveBoardTicketTotalLabel(value: unknown) {
  const total = String(value || "").trim();
  if (!total) return "";
  return total.startsWith("$") ? total : `$${total}`;
}

function smartBarLiveBoardTicketMinutesAgo(createdAt?: string) {
  const timestamp = Date.parse(String(createdAt || ""));
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function smartBarLiveBoardTicketToOrder(ticket: SmartBarLiveBoardTicket, vendorContext: SmartBarVendorContext): SmartBarOrderBoardItem {
  const items = ticket.ticket?.items || [];
  const ticketId = smartBarLiveBoardTicketDisplayId(ticket);
  const estimatedTotalLabel = ticket.ticket?.totals?.estimatedTotalLabel || smartBarLiveBoardTicketTotalLabel(ticket.estimatedTotal);

  return {
    id: ticketId,
    minutesAgo: smartBarLiveBoardTicketMinutesAgo(ticket.createdAt),
    status: ticket.status === "processed" || ticket.status === "entered" ? "entered" : "new",
    customer: "SmartBar",
    phone: "202-555-0184",
    pickup: "ASAP",
    itemCount: Math.max(1, Number(ticket.itemCount || items.length || 1) || 1),
    groups: [
      {
        title: "Order",
        items: items.length
          ? items.map((item) => ({
              quantity: smartBarLiveBoardTicketQuantity(item.quantity),
              name: item.title || item.name || "SmartBar ticket",
              details: smartBarLiveBoardTicketDetails(item.details),
            }))
          : [{ quantity: 1, name: "SmartBar ticket" }],
      },
    ],
    notes: [
      ticket.customerText ? `Heard: ${ticket.customerText}` : "SmartBar ticket",
      estimatedTotalLabel ? `Total: ${estimatedTotalLabel}` : "",
    ].filter(Boolean).join(" - "),
    score: ticket.managerScoreStatus === "ready" || ticket.managerScoreStatus === "needs_fix" ? ticket.managerScoreStatus : undefined,
    scoreNote: ticket.managerScoreNote || "",
    backendTicketId: ticket.ticketId,
    businessDate: ticket.businessDate,
    mode: ticket.mode || "sandbox",
    readinessStatus: ticket.readinessStatus,
    readinessNote: ticket.readinessNote || "",
    clientId: ticket.clientId || vendorContext.clientId,
    vendorId: ticket.vendorId || vendorContext.vendorId,
    displayName: ticket.displayName || vendorContext.displayName,
    menuProfileId: ticket.menuProfileId || vendorContext.menuProfileId,
    behaviorProfileId: ticket.behaviorProfileId || vendorContext.behaviorProfileId,
    boardProfileId: ticket.boardProfileId || vendorContext.boardProfileId,
    timezone: ticket.timezone || vendorContext.timezone,
  };
}

function formatSmartBarSubscriptionDate(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function SmartBarRootLiveOrderBoardStatus({
  onBack,
  vendorContext,
  onVendorContextUpdate,
}: {
  onBack: () => void;
  vendorContext?: SmartBarVendorContext | null;
  onVendorContextUpdate?: (nextVendorContext: SmartBarVendorContext) => void;
}) {
  const activeVendorContext = useMemo(() => normalizeSmartBarVendorContext(vendorContext), [vendorContext]);
  const [boardOpen, setBoardOpen] = useState(false);
  const [orders, setOrders] = useState<SmartBarOrderBoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | "cancel" | "reactivate" | null>(null);
  const [billingError, setBillingError] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const operationalBoardEnabled = smartBarLiveOrderBoardIsEnabled(activeVendorContext);
  const subscriptionStatus = String(activeVendorContext.subscriptionStatus || "").trim().toLowerCase();
  const subscriptionActive =
    ["active", "trialing"].includes(subscriptionStatus) ||
    (subscriptionStatus === "" && activeVendorContext.subscriptionActive === true);
  const subscriptionPaymentIssue = ["past_due", "unpaid", "incomplete"].includes(subscriptionStatus);
  const subscriptionCanSubscribe = ["canceled", "cancelled", "not_subscribed", "inactive", "none"].includes(subscriptionStatus);
  const subscriptionCancelScheduled = subscriptionActive && activeVendorContext.subscriptionCancelAtPeriodEnd === true;
  const subscriptionPeriodEndLabel = formatSmartBarSubscriptionDate(activeVendorContext.subscriptionCurrentPeriodEnd);
  const boardEnabled = operationalBoardEnabled && subscriptionActive;

  const loadOrders = useCallback(async () => {
    if (!boardEnabled) return;
    setIsLoading(true);
    setLoadError("");

    try {
      const tickets = await listSmartBarLiveBoardTickets(activeVendorContext);
      setOrders(tickets.map((ticket) => smartBarLiveBoardTicketToOrder(ticket, activeVendorContext)));
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "unknown_error";
      setLoadError(reason);
    } finally {
      setIsLoading(false);
    }
  }, [activeVendorContext, boardEnabled]);

  const openSubscriptionDestination = useCallback(async (action: "checkout" | "portal") => {
    setBillingAction(action);
    setBillingError("");

    try {
      const url = action === "checkout"
        ? await createSmartBarSubscriptionCheckoutUrl()
        : await createSmartBarSubscriptionPortalUrl();
      window.location.assign(url);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "subscription_action_failed";
      setBillingError(reason);
      setBillingAction(null);
    }
  }, []);

  const confirmCancelSubscription = useCallback(async () => {
    setBillingAction("cancel");
    setBillingError("");

    try {
      const cancellationState = await cancelSmartBarSubscription();
      const nextVendorContext = normalizeSmartBarVendorContext({
        ...activeVendorContext,
        ...cancellationState,
      });
      saveStoredSmartBarVendorContext(nextVendorContext, nextVendorContext.demoPath);
      onVendorContextUpdate?.(nextVendorContext);
      setCancelConfirmOpen(false);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "subscription_cancel_failed";
      setBillingError(reason);
    } finally {
      setBillingAction(null);
    }
  }, [activeVendorContext, onVendorContextUpdate]);

  const reactivateSubscription = useCallback(async () => {
    setBillingAction("reactivate");
    setBillingError("");

    try {
      const reactivationState = await reactivateSmartBarSubscription();
      const nextVendorContext = normalizeSmartBarVendorContext({
        ...activeVendorContext,
        ...reactivationState,
      });
      saveStoredSmartBarVendorContext(nextVendorContext, nextVendorContext.demoPath);
      onVendorContextUpdate?.(nextVendorContext);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : "subscription_reactivate_failed";
      setBillingError(reason);
    } finally {
      setBillingAction(null);
    }
  }, [activeVendorContext, onVendorContextUpdate]);

  useEffect(() => {
    if (!boardEnabled) return;
    void loadOrders();

    const intervalId = window.setInterval(() => {
      void loadOrders();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [boardEnabled, loadOrders]);

  const newOrderCount = orders.filter((order) => order.status === "new").length;
  const handledCount = orders.filter((order) => order.status === "entered").length;

  if (boardOpen && boardEnabled) {
    return (
      <div className="mx-auto mt-0 flex min-h-0 max-w-6xl flex-col overflow-hidden rounded-[20px] bg-white/94 p-2 shadow-[0_18px_44px_rgba(15,23,42,0.07)] ring-1 ring-white/80" style={{ height: "min(820px, calc(100svh - 130px))" }}>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100/80 px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="shrink-0 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">
              Order Board
            </div>
            <div className="hidden max-w-[18rem] truncate text-xs font-semibold text-slate-400 sm:block">
              {activeVendorContext.displayName}
            </div>
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-slate-50 px-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200/80">
              {newOrderCount} new
            </span>
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-slate-50 px-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200/80">
              {handledCount} handled
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={isLoading}
              className="inline-flex h-8 shrink-0 items-center rounded-full bg-slate-50 px-2.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Refreshing" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setBoardOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition hover:text-slate-950"
              aria-label="Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="mx-2 mt-2 shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-100">
            Board could not load: {loadError}
          </div>
        ) : null}

        <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[18px] border border-sky-100 bg-sky-50/70 shadow-inner">
          <SmartBarOrderBoardMock
            demoOrders={orders}
            demoAnimateIncomingOrders
            demoOperationalBoard
            onDemoEntered={(orderId) => {
              setOrders((current) => current.map((order) => (
                order.id === orderId ? { ...order, status: "entered" } : order
              )));
            }}
            className="!h-full !min-h-0 !px-2 !py-2 sm:!px-3 sm:!py-3"
          />
        </div>
      </div>
    );
  }

  const rowBase = "flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 ring-1";
  const activeRow = "bg-white text-slate-950 ring-slate-200/80";
  const mutedRow = "bg-slate-50/80 text-slate-500 ring-slate-200/70";

  const steps = [
    {
      number: 1,
      title: "Order Board",
      detail: !subscriptionActive
        ? "Available after subscription."
        : operationalBoardEnabled
          ? "Live order board is enabled."
          : "Waiting for operational approval.",
      status: boardEnabled ? "Open board" : "Locked",
      action: boardEnabled,
    },
    {
      number: 2,
      title: "New orders",
      detail: "Incoming tickets.",
      status: boardEnabled ? `${newOrderCount} new` : "-",
      action: false,
    },
    {
      number: 3,
      title: "Handled today",
      detail: "Completed tickets.",
      status: boardEnabled ? String(handledCount) : "-",
      action: false,
    },
  ];

  const subscriptionLabel = subscriptionCancelScheduled
    ? "Cancellation scheduled"
    : subscriptionActive
      ? "Active — $50/month"
      : subscriptionPaymentIssue
        ? "Payment issue"
        : subscriptionCanSubscribe
          ? "$50/month"
          : "Status unavailable";
  const subscriptionDetail = subscriptionCancelScheduled
    ? subscriptionPeriodEndLabel
      ? `Active until ${subscriptionPeriodEndLabel}. Auto-renewal is off.`
      : "Auto-renewal is off. Live Orders remain available through the current billing period."
    : subscriptionActive
      ? "Renews monthly automatically."
      : subscriptionPaymentIssue
        ? "Update the payment method to restore live ordering."
        : subscriptionCanSubscribe
          ? "Activate live ordering."
          : "Subscription status could not be confirmed.";
  const subscriptionButtonLabel = subscriptionCancelScheduled
    ? "Reactivate subscription"
    : subscriptionActive
      ? "Cancel subscription"
      : subscriptionPaymentIssue
        ? "Update payment method"
        : subscriptionCanSubscribe
          ? "Subscribe"
          : "";
  const subscriptionButtonAction: "checkout" | "portal" | "cancel" | "reactivate" | null = subscriptionCancelScheduled
    ? "reactivate"
    : subscriptionActive
      ? "cancel"
      : subscriptionPaymentIssue
        ? "portal"
        : subscriptionCanSubscribe
          ? "checkout"
          : null;

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-[24px] bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.07)] ring-1 ring-white/80 sm:mt-7 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Order Board
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Status
          </h3>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-slate-200/80">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-tight text-slate-950">Subscription</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-700">{subscriptionLabel}</div>
            <div className="mt-0.5 text-sm leading-5 text-slate-500">{subscriptionDetail}</div>
          </div>

          {subscriptionButtonAction && subscriptionButtonLabel ? (
            <button
              type="button"
              onClick={() => {
                if (subscriptionButtonAction === "cancel") {
                  setBillingError("");
                  setCancelConfirmOpen(true);
                  return;
                }
                if (subscriptionButtonAction === "reactivate") {
                  void reactivateSubscription();
                  return;
                }
                void openSubscriptionDestination(subscriptionButtonAction);
              }}
              disabled={billingAction !== null}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {billingAction === subscriptionButtonAction
                ? subscriptionButtonAction === "cancel"
                  ? "Canceling..."
                  : subscriptionButtonAction === "reactivate"
                    ? "Reactivating..."
                    : "Opening..."
                : subscriptionButtonLabel}
            </button>
          ) : null}
        </div>

        {cancelConfirmOpen ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/80">
            <div className="text-sm font-semibold text-slate-950">Cancel SmartBar subscription?</div>
            <div className="mt-1 text-sm leading-5 text-slate-600">
              Your subscription will not renew. Live Orders will stay active until {subscriptionPeriodEndLabel || "the end of your current billing period"}.
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={billingAction !== null}
                className="inline-flex items-center justify-center rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelSubscription()}
                disabled={billingAction !== null}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(1,33,105,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {billingAction === "cancel" ? "Canceling..." : "Cancel subscription"}
              </button>
            </div>
          </div>
        ) : null}

        {billingError ? (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-100">
            Subscription action failed: {billingError}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3">
        {steps.map((step) => (
          <div key={step.title} className={`${rowBase} ${step.action || boardEnabled ? activeRow : mutedRow}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                {step.number}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-tight">{step.title}</div>
                <div className="text-sm leading-5 text-slate-500">{step.detail}</div>
              </div>
            </div>

            {step.action ? (
              <button
                type="button"
                onClick={() => setBoardOpen(true)}
                className="inline-flex items-center justify-center rounded-full bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f]"
              >
                Board View
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <div className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                {step.status}
              </div>
            )}
          </div>
        ))}
      </div>

      {!boardEnabled ? (
        <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
          {!subscriptionActive
            ? subscriptionPaymentIssue
              ? "Live order board is paused until the payment method is updated."
              : subscriptionCanSubscribe
                ? "Subscribe to unlock the live order board."
                : "Live order board stays locked until subscription status is confirmed."
            : "Waiting for admin approval after ghost test review."}
        </div>
      ) : null}
    </div>
  );
}

function SmartBarRootLaunchMessage({
  message,
  step,
  isWaving,
  initialUseItLane = null,
}: {
  message: SmartBarRootDemoMessage;
  step: number;
  isWaving: boolean;
  initialUseItLane?: "board" | null;
}) {
  const Icon = message.icon;
  const isStoryIcon = message.storyIcon === true;
  const [activeUseItLane, setActiveUseItLane] = useState<"sandbox" | "website" | "board" | "playground" | null>(() => initialUseItLane);
  const [activeVendorContext, setActiveVendorContext] = useState(() => getStoredSmartBarVendorContext());

  const handleVendorContextUpdate = useCallback((nextVendorContext: SmartBarVendorContext) => {
    setActiveVendorContext(nextVendorContext);
    saveStoredSmartBarVendorContext(nextVendorContext, nextVendorContext.demoPath);
  }, []);

  const refreshActiveVendorContext = useCallback(async () => {
    try {
      const nextVendorContext = await refreshSmartBarVendorStatus();
      handleVendorContextUpdate(nextVendorContext);
      return;
    } catch {
      // Fall back to the legacy session endpoint so a temporary status-refresh
      // failure does not break the logged-in view.
    }

    const sessionResult = await checkTourBotDemoSession();
    if (sessionResult.accepted && sessionResult.vendorContext) {
      handleVendorContextUpdate(sessionResult.vendorContext);
    }
  }, [handleVendorContextUpdate]);

  useEffect(() => {
    if (activeUseItLane !== "website" && activeUseItLane !== "board") return;

    void refreshActiveVendorContext();

    const intervalId = window.setInterval(() => {
      void refreshActiveVendorContext();
    }, 15000);

    const handleFocus = () => {
      void refreshActiveVendorContext();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeUseItLane, refreshActiveVendorContext]);

  if (activeUseItLane === "playground") {
    return (
      <div className={`w-full ${step % 2 === 0 ? "bg-white/80 text-slate-950" : "bg-sky-50/85 text-slate-950"} px-3 py-4 sm:px-5 sm:py-5`}>
        <SmartBarPlayground onBack={() => setActiveUseItLane("sandbox")} vendorContext={activeVendorContext} />
      </div>
    );
  }

  const isLiveBoardLane = activeUseItLane === "board";
  const useItVendorContext = normalizeSmartBarVendorContext(activeVendorContext);
  const useItOnboardingStatus = String(useItVendorContext.onboardingStatus || "").trim().toLowerCase();
  const useItSandboxRequestStatus = String(useItVendorContext.sandboxRequestStatus || "").trim().toLowerCase();
  const useItSandboxStatus = String(useItVendorContext.sandboxStatus || "").trim().toLowerCase();
  const useItGhostTestStatus = String(useItVendorContext.ghostTestStatus || "").trim().toLowerCase();
  const useItWebsiteModeStatus = String(useItVendorContext.websiteModeStatus || "").trim().toLowerCase();
  const useItVendorReady = useItVendorContext.isReadyForOrders === true || useItOnboardingStatus === "ready";
  const useItSandboxComplete =
    useItVendorReady ||
    Boolean(useItVendorContext.sandboxRequestedUtc) ||
    ["pending", "requested", "complete", "ready"].includes(useItSandboxRequestStatus) ||
    ["requested", "ready"].includes(useItSandboxStatus);
  const useItLiveBoardReady = smartBarLiveOrderBoardIsEnabled(useItVendorContext);
  const useItWebsiteComplete =
    useItLiveBoardReady ||
    useItGhostTestStatus === "approved" ||
    useItWebsiteModeStatus === "live";
  const useItWebsiteEnabled = useItSandboxComplete;
  const useItBoardEnabled = useItWebsiteComplete;

  return (
    <div className={`w-full ${step % 2 === 0 ? "bg-white/80 text-slate-950" : "bg-sky-50/85 text-slate-950"} ${isLiveBoardLane ? "px-2 py-1 sm:px-4 sm:py-2" : "px-5 py-7 sm:px-10 sm:py-10"}`}>
      <div className={`mx-auto ${isLiveBoardLane ? "max-w-6xl" : message.demoButtons ? "max-w-4xl" : "max-w-2xl"}`}>
        {!isLiveBoardLane ? (
          <>
            <div className="mb-4 flex items-center gap-3 sm:mb-5">
              <div
                className={[
                  "flex shrink-0 items-center justify-center rounded-2xl ring-1",
                  isStoryIcon ? "h-12 w-12 sm:h-14 sm:w-14" : "h-10 w-10 sm:h-11 sm:w-11",
                  message.iconClass,
                ].join(" ")}
              >
                <Icon className={isStoryIcon ? "h-8 w-8 sm:h-9 sm:w-9" : "h-5 w-5"} />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
                {message.label}
              </div>
            </div>

            <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
              <div>
                {isWaving ? (
                  <SmartBarRootThinkingText body={message.message} />
                ) : (
                  <SmartBarRootMarkdownText body={message.message} />
                )}
              </div>

              {message.supportingLine ? (
                <div className="mt-0.5 text-sm font-medium leading-5 text-slate-500 sm:text-base sm:leading-6">
                  {isWaving ? (
                    <SmartBarRootThinkingText body={message.supportingLine} />
                  ) : (
                    <SmartBarRootMarkdownText body={message.supportingLine} />
                  )}
                </div>
              ) : null}

              {message.description ? (
                <div className="mt-6 sm:mt-7">
                  {isWaving ? (
                    <SmartBarRootThinkingText body={message.description} />
                  ) : (
                    <SmartBarRootMarkdownText body={message.description} />
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {message.demoButtons && (
          activeUseItLane === "sandbox" ? (
            <SmartBarRootSandboxReadiness
              onBack={() => setActiveUseItLane(null)}
              onOpenPlayground={() => setActiveUseItLane("playground")}
              vendorContext={activeVendorContext}
              onVendorContextUpdate={handleVendorContextUpdate}
            />
          ) : activeUseItLane === "website" ? (
            <SmartBarRootWebsiteModeReadiness
              onBack={() => setActiveUseItLane(null)}
              vendorContext={activeVendorContext}
              onVendorContextUpdate={handleVendorContextUpdate}
            />
          ) : activeUseItLane === "board" ? (
            <SmartBarRootLiveOrderBoardStatus onBack={() => setActiveUseItLane(null)} vendorContext={activeVendorContext} onVendorContextUpdate={handleVendorContextUpdate} />
          ) : (
            <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
              <SmartBarRootDemoLaunchButton
                icon={ShoppingCart}
                eyebrow="Private Testing"
                title="Sandbox"
                description="Test orders."
                stepNumber={1}
                isComplete={useItSandboxComplete}
                compactOnMobile
                onSelect={() => setActiveUseItLane("sandbox")}
              />
              <SmartBarRootDemoLaunchButton
                icon={ShieldCheck}
                eyebrow="Website Setup"
                title="Website Setup"
                description="Prepare site."
                stepNumber={2}
                isComplete={useItWebsiteComplete}
                isDisabled={!useItWebsiteEnabled}
                disabledLabel="Step 1 first"
                compactOnMobile
                onSelect={() => setActiveUseItLane("website")}
              />
              <SmartBarRootDemoLaunchButton
                icon={ReceiptText}
                eyebrow="Live Orders"
                title="Live Orders"
                description="Manage tickets."
                stepNumber={3}
                isComplete={useItLiveBoardReady}
                isDisabled={!useItBoardEnabled}
                disabledLabel={useItWebsiteEnabled ? "Step 2 first" : "Locked"}
                compactOnMobile
                onSelect={() => setActiveUseItLane("board")}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SmartBarRootPasscodeChallenge({
  code,
  isActive,
  isChecking,
  onChange,
  onSubmit,
}: {
  code: string;
  isActive: boolean;
  isChecking: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const boxes = Array.from({ length: REQUIRED_PASSCODE_LENGTH });

  useEffect(() => {
    if (!isActive) return;
    inputRefs.current[0]?.focus({ preventScroll: true });
  }, [isActive]);

  const focusBox = (index: number) => {
    window.setTimeout(() => {
      inputRefs.current[Math.max(0, Math.min(REQUIRED_PASSCODE_LENGTH - 1, index))]?.focus();
    }, 0);
  };

  const updateFromIndex = (index: number, rawValue: string) => {
    const cleaned = normalizeSmartBarRootPasscode(rawValue);
    const nextCharacters = boxes.map((_, characterIndex) => code[characterIndex] || "");

    if (!cleaned) {
      nextCharacters[index] = "";
      onChange(nextCharacters.join(""));
      return;
    }

    cleaned.split("").forEach((character, offset) => {
      const targetIndex = index + offset;
      if (targetIndex < REQUIRED_PASSCODE_LENGTH) nextCharacters[targetIndex] = character;
    });

    onChange(nextCharacters.join(""));
    focusBox(index + cleaned.length);
  };

  const clearFromIndex = (index: number) => {
    const nextCharacters = boxes.map((_, characterIndex) => code[characterIndex] || "");

    if (nextCharacters[index]) {
      nextCharacters[index] = "";
      onChange(nextCharacters.join(""));
      focusBox(index);
      return;
    }

    if (index > 0) {
      nextCharacters[index - 1] = "";
      onChange(nextCharacters.join(""));
      focusBox(index - 1);
    }
  };

  return (
    <div className="w-full bg-white/85 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#012169] text-white ring-1 ring-[#012169]/10 sm:h-11 sm:w-11">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
            Live Product access
          </div>
        </div>

        <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
          Enter passcode.
        </div>

        <div className="mt-7 flex items-center justify-center gap-2 sm:mt-8 sm:justify-start sm:gap-3">
          {boxes.map((_, index) => {
            const character = code[index] || "";
            const isFilled = Boolean(character);
            const boxClassName =
              "flex h-12 w-10 items-center justify-center rounded-2xl border text-center text-lg font-bold uppercase tracking-tight shadow-sm outline-none transition sm:h-14 sm:w-12 sm:text-xl " +
              (isFilled
                ? "border-[#012169] bg-[#012169] text-white shadow-[0_10px_24px_rgba(1,33,105,0.18)]"
                : "border-slate-200 bg-white text-slate-400 placeholder:text-slate-300 focus:border-slate-400 focus:text-slate-950 focus:ring-4 focus:ring-slate-200/70");

            if (isChecking) {
              return (
                <motion.div
                  key={`smartbar-root-passcode-box-${index}`}
                  animate={{
                    y: [0, -6.5, 0, 3.75, 0],
                    rotate: [0, -3.4, 2.65, -1.85, 0],
                    scale: [1, 1.055, 1, 1.032, 1],
                  }}
                  className={boxClassName}
                  transition={{
                    duration: SMARTBAR_ROOT_PASSCODE_BOX_WIGGLE_DURATION,
                    repeat: Infinity,
                    delay: index * SMARTBAR_ROOT_PASSCODE_BOX_WIGGLE_STAGGER,
                    ease: "easeInOut",
                  }}
                >
                  {character || "•"}
                </motion.div>
              );
            }

            return (
              <input
                key={`smartbar-root-passcode-box-${index}`}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                aria-label={`SmartBar demo passcode character ${index + 1}`}
                autoCapitalize="characters"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                className={boxClassName}
                disabled={isChecking}
                inputMode="text"
                maxLength={1}
                onChange={(event) => updateFromIndex(index, event.target.value)}
                onFocus={(event) => event.target.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmit();
                    return;
                  }

                  if (event.key === "Backspace") {
                    event.preventDefault();
                    clearFromIndex(index);
                    return;
                  }

                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    focusBox(index - 1);
                    return;
                  }

                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    focusBox(index + 1);
                  }
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  updateFromIndex(index, event.clipboardData.getData("text"));
                }}
                placeholder="-"
                type="text"
                value={character}
              />
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <ShieldCheck className="h-4 w-4" />
          Access gated to control live AI usage.
        </div>
      </div>
    </div>
  );
}

function SmartBarRootAccessFailure({ body, isWaving }: { body: string; isWaving: boolean }) {
  return (
    <div className="w-full bg-rose-50/90 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 ring-1 ring-rose-200/80 sm:h-11 sm:w-11">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600 sm:text-xs sm:tracking-[0.16em]">
            Access not opened
          </div>
        </div>

        <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
          {isWaving ? <SmartBarRootThinkingText body={body} /> : <SmartBarRootMarkdownText body={body} />}
        </div>
      </div>
    </div>
  );
}

function SmartBarRootRestaurantPreview({
  isWaving,
  isSettled,
  onFinish,
}: {
  isWaving: boolean;
  isSettled: boolean;
  onFinish: () => void;
}) {
  const shouldMountWalkthrough = isSettled && !isWaving;

  return (
    <div
      className={
        "relative w-full overflow-hidden bg-transparent text-slate-950 transition-[height] duration-700 ease-out " +
        (isSettled ? "h-[630px] sm:h-[720px]" : "h-[252px] sm:h-[278px]") +
        (isWaving ? " opacity-80" : "")
      }
    >
      <div
        className={
          "absolute left-1/2 top-0 z-[1] h-[252px] w-[min(52rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[30px] sm:h-[278px] sm:rounded-[36px] " +
          (isSettled
            ? "bg-transparent shadow-none ring-0 backdrop-blur-0"
            : "bg-white/88 shadow-[0_22px_60px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur-sm")
        }
        aria-hidden="true"
      />

      {shouldMountWalkthrough && (
        <motion.div
          className="absolute inset-0 z-[2]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <RestaurantWalkthrough chrome="content" onFinish={onFinish} finishLabel="Start setup" />
        </motion.div>
      )}
    </div>
  );
}

function SmartBarRootDemoSelector() {
  const hasInitialStoredAccess = useMemo(() => hasOptimisticSmartBarRootAccess(), []);
  const [subscriptionReturn] = useState(() => shouldOpenSmartBarSubscriptionReturn());
  const [overviewReturn, setOverviewReturn] = useState(() => shouldOpenSmartBarRootOverviewFromReturn());
  const [hasAccess, setHasAccess] = useState(() => hasInitialStoredAccess);
  const [isSessionChecking, setIsSessionChecking] = useState(() => hasInitialStoredAccess);
  const [passcode, setPasscode] = useState("");
  const [failureMessage, setFailureMessage] = useState("That code is incomplete. Enter the full demo passcode and try again.");
  const [gateView, setGateView] = useState<"challenge" | "failure">("challenge");
  const [isLoginEntryTransitionPending, setLoginEntryTransitionPending] = useState(() => !hasInitialStoredAccess);
  const [step, setStep] = useState(() =>
    hasInitialStoredAccess && overviewReturn ? SMARTBAR_ROOT_OVERVIEW_STEP : hasInitialStoredAccess ? 1 : 0,
  );
  const [wavingIndex, setWavingIndex] = useState<number | null>(() => (hasInitialStoredAccess ? null : 0));
  const [isRestaurantPreviewSettled, setRestaurantPreviewSettled] = useState(false);
  const [ribbonY, setRibbonY] = useState(0);
  const [ribbonHeight, setRibbonHeight] = useState<number | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stageScrollRef = useRef<HTMLDivElement | null>(null);
  const rootRunIdRef = useRef(0);

  const stageItems = useMemo<SmartBarRootStageItem[]>(() => {
    const messageItems = SMARTBAR_ROOT_MESSAGES.map((message, sourceIndex) => ({
      kind: "message" as const,
      message,
      sourceIndex,
    }));
    const demosTransitionItem = {
      kind: "message" as const,
      message: SMARTBAR_DEMOS_TRANSITION_MESSAGE,
      sourceIndex: SMARTBAR_ROOT_MESSAGES.length,
    };
    const setupItems = SMARTBAR_SETUP_WALKTHROUGH_STEPS.map((_setupStep, setupIndex) => ({
      kind: "setup-step" as const,
      setupIndex,
    }));

    if (hasAccess) {
      return [{ kind: "passcode" }, ...messageItems, demosTransitionItem, ...setupItems, { kind: "restaurant-preview" }];
    }
    if (gateView === "failure") return [{ kind: "passcode" }, { kind: "failure" }];
    return [
      {
        kind: "message",
        message: SMARTBAR_LOGIN_TRANSITION_MESSAGE,
        sourceIndex: -1,
      },
      { kind: "passcode" },
    ];
  }, [gateView, hasAccess]);

  const current = stageItems[step];
  const currentMessage = current?.kind === "message" ? current.message : null;
  const currentMessageStep = current?.kind === "message" ? current.sourceIndex : 0;
  const isLaunchOverview = current?.kind === "message" && current.sourceIndex === 0;
  const isRestaurantPreview = current?.kind === "restaurant-preview";
  const isSetupStep = current?.kind === "setup-step";
  const currentSetupIndex = isSetupStep ? current.setupIndex : 0;
  const isLastSetupStep = isSetupStep && currentSetupIndex >= SMARTBAR_SETUP_WALKTHROUGH_STEPS.length - 1;
  const setupStartStep = stageItems.findIndex((item) => item.kind === "setup-step" && item.setupIndex === 0);
  const homeStep = stageItems.findIndex((item) => item.kind === "message" && item.sourceIndex === 0);
  const useItStep = stageItems.findIndex((item) => item.kind === "message" && item.sourceIndex === 1);
  const demosTransitionStep = stageItems.findIndex(
    (item) => item.kind === "message" && item.sourceIndex === SMARTBAR_ROOT_MESSAGES.length,
  );
  const isWaving = wavingIndex !== null;
  const isLoginEntryTransition = !hasAccess && current?.kind === "message" && current.sourceIndex === -1;
  const stageHeightTransitionClass =
    !hasAccess && gateView === "challenge" && step === 0
      ? "transition-none"
      : "transition-[height] duration-700 ease-out";

  const stepLabel = isLoginEntryTransition
    ? "Opening SmartBar"
    : !hasAccess
      ? isSessionChecking
        ? "Checking access"
        : "Private access"
    : isRestaurantPreview
      ? "Understand it"
      : isSetupStep
        ? "Set it up"
        : currentMessage?.label || "SmartBar";

  useLayoutEffect(() => {
    const active = segmentRefs.current[step];
    if (!active) return;

    setRibbonY(-active.offsetTop);
    setRibbonHeight(active.offsetHeight);
  }, [stageItems, step, isRestaurantPreviewSettled]);

  useEffect(() => {
    const active = segmentRefs.current[step];
    if (!active) return;

    let smartbarRootResizeFrame = 0;

    const measureActiveSegment = () => {
      window.cancelAnimationFrame(smartbarRootResizeFrame);
      smartbarRootResizeFrame = window.requestAnimationFrame(() => {
        const currentActive = segmentRefs.current[step];
        if (!currentActive) return;
        setRibbonY(-currentActive.offsetTop);
        setRibbonHeight(currentActive.offsetHeight);
      });
    };

    measureActiveSegment();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measureActiveSegment);

    resizeObserver?.observe(active);
    window.addEventListener("resize", measureActiveSegment);

    return () => {
      window.cancelAnimationFrame(smartbarRootResizeFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureActiveSegment);
    };
  }, [step, stageItems, isRestaurantPreviewSettled]);

  useEffect(() => {
    if (hasAccess) {
      setStep((value) => Math.min(Math.max(1, value), stageItems.length - 1));
      return;
    }

    setStep((value) => Math.min(value, Math.max(0, stageItems.length - 1)));
  }, [hasAccess, stageItems.length]);

  useEffect(() => {
    stageScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (!isLoginEntryTransitionPending || hasAccess || gateView !== "challenge") return;

    let isCancelled = false;
    setStep(0);
    setWavingIndex(0);

    const spinTimer = window.setTimeout(() => {
      if (isCancelled) return;
      setStep(1);
    }, SMARTBAR_ROOT_MESSAGE_WAVE_MS);

    const finishTimer = window.setTimeout(() => {
      if (isCancelled) return;
      setWavingIndex(null);
      setLoginEntryTransitionPending(false);
    }, SMARTBAR_ROOT_MESSAGE_WAVE_MS + SMARTBAR_ROOT_RIBBON_GLIDE_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(spinTimer);
      window.clearTimeout(finishTimer);
    };
  }, [gateView, hasAccess, isLoginEntryTransitionPending]);

  const resetAccess = useCallback(() => {
    rootRunIdRef.current += 1;
    clearStoredTourBotDemoToken();
    cleanupResetAccessUrl();
    setOverviewReturn(false);
    setIsSessionChecking(false);
    setHasAccess(false);
    setPasscode("");
    setFailureMessage("That code is incomplete. Enter the full demo passcode and try again.");
    setGateView("challenge");
    setLoginEntryTransitionPending(true);
    setStep(0);
    setWavingIndex(0);
    setRestaurantPreviewSettled(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isCancelled = false;
    const runId = rootRunIdRef.current + 1;
    rootRunIdRef.current = runId;

    const loadSession = async () => {
      if (shouldResetAccessFromUrl()) {
        clearStoredTourBotDemoToken();
        if (isCancelled) return;
        cleanupResetAccessUrl();
        setHasAccess(false);
        setPasscode("");
        setFailureMessage("That code is incomplete. Enter the full demo passcode and try again.");
        setGateView("challenge");
        setLoginEntryTransitionPending(true);
        setStep(0);
        setWavingIndex(0);
        setIsSessionChecking(false);
        return;
      }

      const hasStoredToken = Boolean(getStoredTourBotDemoToken());
      if (!hasStoredToken) {
        setHasAccess(false);
        setLoginEntryTransitionPending(true);
        setStep(0);
        setWavingIndex(0);
        setIsSessionChecking(false);
        return;
      }

      if (shouldOpenSmartBarRootDemoLobbyFromReturn()) {
        cleanupResetAccessUrl();
        setHasAccess(true);
        setGateView("challenge");
        setStep(SMARTBAR_ROOT_MESSAGES.length);
        setWavingIndex(null);
        setIsSessionChecking(false);
        return;
      }

      setIsSessionChecking(true);
      const result = await checkTourBotDemoSession();
      if (isCancelled || rootRunIdRef.current !== runId) return;

      if (result.accepted) {
        if (redirectToSafeSmartBarRootReturnTo()) return;

        if (overviewReturn) {
          cleanupResetAccessUrl();
          setOverviewReturn(false);
          setHasAccess(true);
          setGateView("challenge");
          setStep(SMARTBAR_ROOT_OVERVIEW_STEP);
          setWavingIndex(null);
          setIsSessionChecking(false);
          return;
        }

        if (subscriptionReturn) {
          cleanupSmartBarSubscriptionReturnUrl();
          setHasAccess(true);
          setGateView("challenge");
          setStep(useItStep >= 0 ? useItStep : 1);
          setWavingIndex(null);
          setIsSessionChecking(false);
          return;
        }

        cleanupResetAccessUrl();
        setHasAccess(true);
        setGateView("challenge");
        setStep(1);
      } else {
        setHasAccess(false);
        setGateView("challenge");
        setLoginEntryTransitionPending(true);
        setStep(0);
        setWavingIndex(0);
      }

      setIsSessionChecking(false);
    };

    void loadSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      resetAccess();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetAccess]);

  const retryPasscode = async () => {
    if (isWaving) return;

    const runId = rootRunIdRef.current + 1;
    rootRunIdRef.current = runId;
    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    if (rootRunIdRef.current !== runId) return;
    setStep(0);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    if (rootRunIdRef.current !== runId) return;
    setPasscode("");
    setGateView("challenge");
    setLoginEntryTransitionPending(false);
    setStep(1);
    setWavingIndex(null);
  };

  const submitPasscode = async () => {
    if (isWaving) return;

    if (gateView === "failure") {
      await retryPasscode();
      return;
    }

    const runId = rootRunIdRef.current + 1;
    rootRunIdRef.current = runId;
    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    if (rootRunIdRef.current !== runId) return;

    if (passcode.length < REQUIRED_PASSCODE_LENGTH) {
      setFailureMessage("That code is incomplete. Enter the full demo passcode and try again.");
      setGateView("failure");
      setStep(1);
      await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
      if (rootRunIdRef.current !== runId) return;
      setWavingIndex(null);
      return;
    }

    const loginResult = await loginToTourBotDemo(passcode);
    if (rootRunIdRef.current !== runId) return;
    if (!loginResult.accepted) {
      setFailureMessage("That code could not be verified. Check the passcode and try again.");
      setGateView("failure");
      setStep(1);
      await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
      if (rootRunIdRef.current !== runId) return;
      setWavingIndex(null);
      return;
    }

    if (redirectToSafeSmartBarRootReturnTo()) return;

    if (overviewReturn) {
      cleanupResetAccessUrl();
      setOverviewReturn(false);
      setHasAccess(true);
      setGateView("challenge");
      setStep(SMARTBAR_ROOT_OVERVIEW_STEP);
      await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
      if (rootRunIdRef.current !== runId) return;
      setWavingIndex(null);
      return;
    }

    if (redirectToTourBotDemoPath(loginResult.demoPath, { allowFoodRouteSteering: true })) return;

    cleanupResetAccessUrl();
    setHasAccess(true);
    setGateView("challenge");
    setStep(1);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    if (rootRunIdRef.current !== runId) return;
    setWavingIndex(null);
  };

  const goSetupWalkthrough = async () => {
    if (isWaving || !hasAccess || setupStartStep < 0) return;

    const runId = rootRunIdRef.current + 1;
    rootRunIdRef.current = runId;
    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    if (rootRunIdRef.current !== runId) return;
    setStep(setupStartStep);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    if (rootRunIdRef.current !== runId) return;
    setWavingIndex(null);
  };

  const finishSetupWalkthrough = () => {
    rootRunIdRef.current += 1;
    setWavingIndex(null);
    setStep(useItStep >= 0 ? useItStep : 1);
  };

  const exitSetupWalkthroughToHome = () => {
    rootRunIdRef.current += 1;
    setWavingIndex(null);
    setStep(homeStep >= 0 ? homeStep : 1);
  };

  const goBackToDemos = async () => {
    if (isWaving || !hasAccess || demosTransitionStep < 0) return;

    const runId = rootRunIdRef.current + 1;
    rootRunIdRef.current = runId;
    setWavingIndex(step);

    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    if (rootRunIdRef.current !== runId) return;

    setStep(demosTransitionStep);
    setWavingIndex(null);

    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    if (rootRunIdRef.current !== runId) return;

    setWavingIndex(demosTransitionStep);
    await wait(720);
    if (rootRunIdRef.current !== runId) return;

    window.location.assign("/smartbar-teaser");
  };

  const finishRestaurantPreview = () => {
    rootRunIdRef.current += 1;
    setWavingIndex(null);
    setRestaurantPreviewSettled(false);
    setStep(1);
  };

  const completeRestaurantPreview = () => {
    rootRunIdRef.current += 1;
    setWavingIndex(null);
    setRestaurantPreviewSettled(false);
    setStep(setupStartStep >= 0 ? setupStartStep : 1);
  };

  const goBack = () => {
    if (isWaving || !hasAccess) return;
    if (step <= 1) return;
    rootRunIdRef.current += 1;
    setWavingIndex(null);
    if (isRestaurantPreview) {
      finishRestaurantPreview();
      return;
    }

    if (isSetupStep && currentSetupIndex === 0) {
      exitSetupWalkthroughToHome();
      return;
    }

    setStep((value) => Math.max(1, value - 1));
  };

  const goNext = async () => {
    if (isWaving) return;

    if (!hasAccess) {
      await submitPasscode();
      return;
    }

    if (currentMessage?.demoButtons || isRestaurantPreview) return;

    if (isSetupStep && isLastSetupStep) {
      finishSetupWalkthrough();
      return;
    }

    rootRunIdRef.current += 1;
    setWavingIndex(null);
    setStep((value) => Math.min(stageItems.length - 1, value + 1));
  };

  const showNextButton = (!hasAccess && !isLoginEntryTransition) || (hasAccess && !currentMessage?.demoButtons && !isRestaurantPreview);
  const nextLabel = !hasAccess
    ? isSessionChecking
      ? "Checking"
      : gateView === "failure"
        ? "Try again"
        : "Submit"
    : isSetupStep
      ? isLastSetupStep
        ? "Use SmartBar"
        : "Next"
      : isLaunchOverview
        ? "Workspace"
        : "Next";

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_45%,_#f8fafc_100%)] text-slate-950 sm:h-screen">
      <header className="shrink-0 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[16px] bg-[#012169] text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950 sm:text-lg">
                SmartBar
              </div>
              <div className="text-[11px] font-medium leading-tight text-slate-700 sm:text-sm sm:font-normal sm:text-slate-500">
                A search bar that does
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAccess && (isRestaurantPreview || isSetupStep) && (
              <button
                type="button"
                onClick={isRestaurantPreview ? finishRestaurantPreview : exitSetupWalkthroughToHome}
                className="inline-flex items-center justify-center rounded-full bg-white/86 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">Back</span>
                <span className="hidden sm:inline">Back to SmartBar</span>
              </button>
            )}

            {hasAccess && (
              <button
                type="button"
                onClick={resetAccess}
                className="rounded-full bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:px-3 sm:py-2 sm:text-sm"
              >
                <span className="sm:hidden">Reset</span>
              <span className="hidden sm:inline">Reset access</span>
              </button>
            )}

            <div className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
              <Sparkles className="h-4 w-4 text-slate-500" />
              {stepLabel}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-0 w-full flex-1 max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] justify-items-center overflow-hidden px-2.5 py-2 sm:flex sm:flex-col sm:items-center sm:justify-center sm:overflow-visible sm:px-6 sm:py-5">
        <div className="shrink-0">
          {hasAccess ? (
            <SmartBarRootProgressDots
              step={isSetupStep ? currentSetupIndex : isRestaurantPreview ? SMARTBAR_ROOT_MESSAGES.length : currentMessageStep}
              count={isSetupStep ? SMARTBAR_SETUP_WALKTHROUGH_STEPS.length : SMARTBAR_ROOT_MESSAGES.length + 1}
            />
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm ring-1 ring-white/70 sm:px-4 sm:py-1.5 sm:text-xs">
              <KeyRound className="h-3.5 w-3.5" />
              Access required
            </div>
          )}
        </div>

        <div
          ref={stageScrollRef}
          className="relative mt-2 flex min-h-0 w-full max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain py-2 sm:mt-6 sm:block sm:max-w-[52rem] sm:overflow-visible sm:py-0"
        >
          <div
            className={
              `my-auto w-full overflow-hidden rounded-[30px] sm:my-0 sm:rounded-[36px] ${stageHeightTransitionClass} ` +
              (isRestaurantPreview
                ? "bg-transparent backdrop-blur-0"
                : "bg-white/35 backdrop-blur-sm")
            }
            style={ribbonHeight ? { height: ribbonHeight } : undefined}
          >
            <motion.div
              animate={{ y: ribbonY }}
              initial={false}
              transition={{
                duration: SMARTBAR_ROOT_RIBBON_GLIDE_MS / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {stageItems.map((item, index) => (
                <div
                  key={
                    item.kind === "message"
                      ? `smartbar-root-${item.message.label}-${item.sourceIndex}`
                      : item.kind === "setup-step"
                        ? `smartbar-root-setup-${item.setupIndex}`
                        : `smartbar-root-${item.kind}`
                  }
                  ref={(node) => {
                    segmentRefs.current[index] = node;
                  }}
                >
                  {item.kind === "passcode" && (
                    <SmartBarRootPasscodeChallenge
                      code={passcode}
                      isActive={step === index}
                      isChecking={wavingIndex === index}
                      onChange={setPasscode}
                      onSubmit={submitPasscode}
                    />
                  )}

                  {item.kind === "failure" && <SmartBarRootAccessFailure body={failureMessage} isWaving={wavingIndex === index} />}

                  {item.kind === "message" && (
                    <SmartBarRootLaunchMessage
                      message={item.message}
                      step={item.sourceIndex}
                      isWaving={wavingIndex === index}
                      initialUseItLane={subscriptionReturn && item.sourceIndex === 1 ? "board" : null}
                    />
                  )}

                  {item.kind === "setup-step" && (
                    <SmartBarSetupWalkthrough
                      stepIndex={item.setupIndex}
                      isActive={step === index && wavingIndex !== index}
                      isWaving={wavingIndex === index}
                    />
                  )}

                  {item.kind === "restaurant-preview" && (
                    <SmartBarRootRestaurantPreview
                      isWaving={wavingIndex === index}
                      isSettled={isRestaurantPreviewSettled}
                      onFinish={completeRestaurantPreview}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {!isRestaurantPreview && (
          <div className="mt-2 flex w-full max-w-[calc(100vw-1rem)] shrink-0 flex-row items-center justify-center gap-2 pb-3 sm:mt-5 sm:max-w-[52rem] sm:items-center sm:justify-between sm:gap-3 sm:pb-4">
          <button
            type="button"
            onClick={goBack}
            disabled={!hasAccess || isLaunchOverview}
            className="inline-flex w-full items-center justify-center rounded-full bg-white/85 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] disabled:pointer-events-none disabled:hidden disabled:opacity-0 sm:mr-auto sm:w-auto sm:px-4 sm:py-2 sm:disabled:inline-flex"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isSetupStep && currentSetupIndex === 0 ? "Back to SmartBar" : isRestaurantPreview ? "Back to SmartBar" : "Back"}
          </button>

          {hasAccess && isLaunchOverview && !isRestaurantPreview && (
            <>
              <button
                type="button"
                onClick={goBackToDemos}
                disabled={isWaving}
                className="inline-flex min-h-[44px] flex-[0.82] items-center justify-center whitespace-nowrap rounded-full bg-[#012169] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.20),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_16px_34px_rgba(1,33,105,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Demos
                <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2" />
              </button>

              <button
                type="button"
                onClick={goSetupWalkthrough}
                disabled={isWaving}
                className="inline-flex min-h-[44px] flex-[1] items-center justify-center whitespace-nowrap rounded-full bg-[#012169] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.20),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_16px_34px_rgba(1,33,105,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Overview
                <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2" />
              </button>
            </>
          )}

          {showNextButton && (
            <button
              type="button"
              onClick={goNext}
              disabled={isWaving || (!hasAccess && isSessionChecking)}
              className={`inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-[#012169] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_16px_34px_rgba(1,33,105,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm ${!hasAccess ? "ml-auto flex-none px-6" : isLaunchOverview ? "flex-[1.28]" : "flex-1"}`}
            >
              {nextLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          )}
          </div>
        )}
      </section>
    </main>
  );
}

function ThinkingCode({ value }: { value: string }) {
  const characters = value.trim().padEnd(REQUIRED_PASSCODE_LENGTH, "•").slice(0, REQUIRED_PASSCODE_LENGTH).split("");

  return (
    <div
      aria-label="Checking passcode"
      className="flex h-11 w-24 items-center justify-center gap-1 rounded-full border border-emerald-200 bg-white/88 px-2 text-center text-base font-black tracking-[0.14em] text-slate-950 ring-1 ring-emerald-100 sm:w-28 sm:px-3 sm:text-sm sm:tracking-[0.22em]"
    >
      {characters.map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          animate={{ y: [0, -4, 0], opacity: [0.62, 1, 0.62] }}
          transition={{ duration: 0.72, repeat: Infinity, delay: index * 0.08, ease: [0.42, 0, 0.58, 1] }}
          className="inline-block min-w-[0.72em]"
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

function LaunchSlip({
  passcode,
  isChecking,
  onPasscodeChange,
  onSubmit,
}: {
  passcode: string;
  isChecking: boolean;
  onPasscodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-[64px] w-fit max-w-[calc(100vw-1rem)] items-center gap-2 rounded-full border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl sm:min-h-[72px] sm:w-full sm:gap-3 sm:px-5 sm:py-3.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200/86 text-emerald-900 ring-1 ring-emerald-300/85 sm:h-12 sm:w-12">
        <Search className="h-5 w-5" />
      </span>

      <div className="hidden min-w-0 flex-1 sm:block">
        <div className="truncate text-base font-black tracking-tight text-slate-950">Enter SmartBar passcode</div>
        <div className="truncate text-xs font-semibold text-slate-600">Unlock the speed demo.</div>
      </div>

      {isChecking ? (
        <ThinkingCode value={passcode} />
      ) : (
        <input
          value={passcode}
          onChange={(event) => onPasscodeChange(event.target.value.slice(0, REQUIRED_PASSCODE_LENGTH))}
          aria-label="SmartBar demo passcode"
          placeholder="6 chars"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 w-24 rounded-full border border-emerald-300/80 bg-white/92 px-2 text-center text-base font-semibold tracking-[0.12em] text-slate-950 outline-none ring-1 ring-emerald-200/70 transition placeholder:tracking-normal placeholder:text-slate-300 focus:border-emerald-500 focus:ring-emerald-300/80 sm:h-12 sm:w-28 sm:px-3 sm:text-sm sm:tracking-[0.18em]"
        />
      )}

      <button
        type="submit"
        disabled={isChecking}
        aria-label="Submit SmartBar passcode"
        title="Submit SmartBar passcode"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#012169] text-white shadow-lg shadow-[rgba(1,33,105,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:pointer-events-none disabled:opacity-70 sm:h-12 sm:w-auto sm:px-5 sm:text-xs sm:font-black sm:uppercase sm:tracking-[0.14em]"
      >
        <ArrowRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
        <span className="hidden sm:inline">Go</span>
      </button>
    </form>
  );
}

function LaunchBackground() {
  return (
    <main className="fixed inset-0 h-[100dvh] min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
    </main>
  );
}

function LaunchSelectorTourBarInner({
  variant = "full",
}: {
  variant?: SmartBarSpeedDemoVariant;
}) {
  const [launchVisible, setLaunchVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [activeNoticeLane, setActiveNoticeLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);
  const [activePreludeStackMode, setActivePreludeStackMode] = useState<SmartBarFlashCardCascadeMode>("standard");
  const [preludeStackCards, setPreludeStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [fitsAnimationVisible, setFitsAnimationVisible] = useState(false);
  const [foodTrioIntroAnimationVisible, setFoodTrioIntroAnimationVisible] = useState(false);
  const [demoVisible, setDemoVisible] = useState(false);
  const [demoAutoPlay, setDemoAutoPlay] = useState(false);
  const runIdRef = useRef(0);
  const activeNoticeLaneRef = useRef<SmartBarFlashCardLaneName | null>(null);
  const foodTrioIntroCompleteResolverRef = useRef<(() => void) | null>(null);
  const currentDemoPath = currentTourBotDemoPath();
  const isNexaPathMobilePlayground = currentDemoPath === "/nexapath-play";
  const isDomiMobilePlayground = tourBotDemoPathIsDomiMobilePlayground(currentDemoPath);
  const isDomiDedicatedDemo = tourBotDemoPathIsDomiDedicatedDemo(currentDemoPath);

  const setActiveNoticeLaneState = useCallback((lane: SmartBarFlashCardLaneName | null) => {
    activeNoticeLaneRef.current = lane;
    setActiveNoticeLane(lane);
  }, []);

  const getNextNoticeLane = useCallback((): SmartBarFlashCardLaneName => {
    return activeNoticeLaneRef.current === "a" ? "b" : "a";
  }, []);

  const clearNoticeLanes = useCallback(async (runId: number) => {
    setActiveNoticeLaneState(null);
    await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
    if (runIdRef.current !== runId) return false;

    setNoticeA(null);
    setNoticeB(null);
    return true;
  }, [setActiveNoticeLaneState]);

  const startAcceptedFlow = useCallback(
    async (runId: number, options: { showAccessGranted?: boolean } = {}) => {
      setDemoAutoPlay(false);
      setLaunchVisible(false);
      setIsChecking(false);
      setFoodTrioIntroAnimationVisible(false);

      const hasMobileGeneralTestShortcut =
        variant === "full" && (persistSmartBarMobileGeneralShortcut() || hasSmartBarMobileGeneralShortcut());

      if (hasMobileGeneralTestShortcut) {
        cleanupResetAccessUrl();
        setActiveNoticeLaneState(null);
        setNoticeA(null);
        setNoticeB(null);
        setPreludeStackCards([]);
        setFitsAnimationVisible(false);
        setDemoVisible(true);
        await wait(DEMO_HANDOFF_SETTLE_MS);
        if (runIdRef.current !== runId) return;

        setDemoAutoPlay(true);
        return;
      }

      let nextLane: SmartBarFlashCardLaneName = getNextNoticeLane();

      if (options.showAccessGranted !== false) {
        const resultNotice: SmartBarFlashCardNotice = {
          variant: "success",
          title: "Access granted",
        };

        if (nextLane === "a") setNoticeA(resultNotice);
        else setNoticeB(resultNotice);

        setActiveNoticeLaneState(nextLane);
        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS + RESULT_HOLD_MS);
        if (runIdRef.current !== runId) return;

        const noticeCleared = await clearNoticeLanes(runId);
        if (!noticeCleared) return;
      }

      cleanupResetAccessUrl();
      let activeCascadeGroup: string | null = null;
      const activePreludeSlips =
        variant === "burgerRushOnly"
          ? BURGERRUSH_ONLY_PRELUDE_SLIPS
          : variant === "foodTrioDesktop"
            ? FOOD_TRIO_DESKTOP_PRELUDE_SLIPS
            : PRELUDE_SLIPS;

      for (let index = 0; index < activePreludeSlips.length; index += 1) {
        const slip = activePreludeSlips[index];
        const preludeNotice: SmartBarFlashCardNotice = {
          variant: "prelude",
          title: slip.title,
          detail: slip.detail,
        };

        if (slip.cascadeGroup) {
          const mode = slip.cascadeMode || "standard";

          if (activeCascadeGroup && activeCascadeGroup !== slip.cascadeGroup) {
            setPreludeStackCards([]);
            await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
            if (runIdRef.current !== runId) return;
          }

          if (activeCascadeGroup !== slip.cascadeGroup) {
            setActiveNoticeLaneState(null);
            setPreludeStackCards([]);
            setActivePreludeStackMode(mode);
            activeCascadeGroup = slip.cascadeGroup;
          }

          const stackItem: SmartBarFlashCardStackItem = {
            ...preludeNotice,
            id: `${slip.cascadeGroup}-${index}`,
            density: slip.density || (mode === "flurry" ? "micro" : "compact"),
          };

          setPreludeStackCards((items) => [...items, stackItem]);
          await wait(slip.holdMs ?? (mode === "flurry" ? 220 : 480));
          if (runIdRef.current !== runId) return;

          if (slip.clearCascade) {
            setPreludeStackCards([]);
            activeCascadeGroup = null;
            await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
            if (runIdRef.current !== runId) return;
          }

          continue;
        }

        if (activeCascadeGroup) {
          setPreludeStackCards([]);
          activeCascadeGroup = null;
          await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
          if (runIdRef.current !== runId) return;
        }

        nextLane = nextLane === "a" ? "b" : "a";

        if (nextLane === "a") setNoticeA(preludeNotice);
        else setNoticeB(preludeNotice);

        setActiveNoticeLaneState(nextLane);
        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS + (slip.holdMs ?? DEFAULT_PRELUDE_HOLD_MS));
        if (runIdRef.current !== runId) return;
      }

      setActiveNoticeLaneState(null);
      setPreludeStackCards([]);
      await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
      if (runIdRef.current !== runId) return;

      if (shouldSkipFitsAnywhereAnimationOnPhone()) {
        setFitsAnimationVisible(false);
        setDemoVisible(true);
        await wait(DEMO_HANDOFF_SETTLE_MS);
        if (runIdRef.current !== runId) return;

        setDemoAutoPlay(true);
        return;
      }

      setFitsAnimationVisible(true);
      await wait(FITS_ANYWHERE_ANIMATION_MS);
      if (runIdRef.current !== runId) return;

      setFitsAnimationVisible(false);

      // FOODTRIO_PUBLIC_ROUTE_DESKTOP_INTRO_V1:
      // /food-trio can now route desktop users into the desktop variant, so it
      // should receive the same FoodTrio intro animation as /food-trio-desktop.
      if (currentTourBotDemoPath() === "/food-trio-desktop" || currentTourBotDemoPath() === "/food-trio") {
        const postFitsNotice = FOOD_TRIO_DESKTOP_POST_FITS_SLIPS[0];

        setPreludeStackCards([
          {
            id: "foodtrio-post-fits-0",
            variant: "prelude",
            title: postFitsNotice.title,
            detail: postFitsNotice.detail,
            density: postFitsNotice.density || "normal",
          },
        ]);

        await wait(postFitsNotice.holdMs ?? DEFAULT_PRELUDE_HOLD_MS);
        if (runIdRef.current !== runId) return;

        setPreludeStackCards([]);
        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
        if (runIdRef.current !== runId) return;

        setFoodTrioIntroAnimationVisible(true);
        await new Promise<void>((resolve) => {
          let resolved = false;
          const finishIntro = () => {
            if (resolved) return;
            resolved = true;
            window.clearTimeout(timeoutId);
            foodTrioIntroCompleteResolverRef.current = null;
            resolve();
          };
          const timeoutId = window.setTimeout(finishIntro, FOOD_TRIO_DESKTOP_INTRO_ANIMATION_MS);
          foodTrioIntroCompleteResolverRef.current = finishIntro;
        });
        if (runIdRef.current !== runId) return;

        setFoodTrioIntroAnimationVisible(false);
        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS);
        if (runIdRef.current !== runId) return;

        let foodTrioPostIntroCascadeGroup: string | null = null;
        for (let index = 0; index < FOOD_TRIO_DESKTOP_POST_INTRO_SLIPS.length; index += 1) {
          const slip = FOOD_TRIO_DESKTOP_POST_INTRO_SLIPS[index];
          const mode = slip.cascadeMode || "standard";

          if (foodTrioPostIntroCascadeGroup && foodTrioPostIntroCascadeGroup !== slip.cascadeGroup) {
            setPreludeStackCards([]);
            await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
            if (runIdRef.current !== runId) return;
          }

          if (foodTrioPostIntroCascadeGroup !== slip.cascadeGroup) {
            setActiveNoticeLaneState(null);
            setPreludeStackCards([]);
            setActivePreludeStackMode(mode);
            foodTrioPostIntroCascadeGroup = slip.cascadeGroup || null;
          }

          setPreludeStackCards((items) => [
            ...items,
            {
              id: `${slip.cascadeGroup || "foodtrio-post-intro"}-${index}`,
              variant: "prelude",
              title: slip.title,
              detail: slip.detail,
              density: slip.density || "normal",
            },
          ]);

          await wait(slip.holdMs ?? DEFAULT_PRELUDE_HOLD_MS);
          if (runIdRef.current !== runId) return;

          if (slip.clearCascade) {
            setPreludeStackCards([]);
            foodTrioPostIntroCascadeGroup = null;
            await wait(SMARTBAR_FLASH_CARD_CROSSOVER_MS);
            if (runIdRef.current !== runId) return;
          }
        }
      }

      setDemoVisible(true);
      await wait(DEMO_HANDOFF_SETTLE_MS);
      if (runIdRef.current !== runId) return;

      setDemoAutoPlay(true);
    },
    [clearNoticeLanes, getNextNoticeLane, setActiveNoticeLaneState, variant],
  );

  useEffect(() => {
    let cancelled = false;

    const loadAccessState = async () => {
      persistSmartBarMobileGeneralShortcut();

      if (isNexaPathMobilePlayground || isDomiMobilePlayground || isDomiDedicatedDemo) {
        setLaunchVisible(false);
        setDemoVisible(true);
        return;
      }

      if (shouldResetAccessFromUrl()) {
        clearStoredTourBotDemoToken();
        cleanupResetAccessUrl();
      }

      await wait(INTRO_DELAY_MS);
      if (cancelled) return;

      const sessionResult = await checkTourBotDemoSession();
      if (cancelled) return;

      if (sessionResult.accepted) {
        const restoredDemoPath = sessionResult.demoPath || getStoredTourBotDemoPath();
        const restoredCleanPath = normalizeTourBotDemoPath(restoredDemoPath);

        // Dedicated Domi passcodes should land on the Domi demo even when an
        // existing valid session skips the passcode form on the root page.
        if (currentTourBotDemoPath() === "/" && tourBotDemoPathIsDomiDedicatedDemo(restoredCleanPath)) {
          if (redirectToTourBotDemoPath(restoredCleanPath, { allowFoodRouteSteering: true })) return;
        }

        // Other restored sessions only unlock the current URL. Fresh passcode
        // login remains the main place demoPath can steer visitors between demos.
        const runId = runIdRef.current + 1;
        runIdRef.current = runId;
        await startAcceptedFlow(runId, { showAccessGranted: false });
        return;
      }

      setLaunchVisible(true);
    };

    void loadAccessState();

    return () => {
      cancelled = true;
      runIdRef.current += 1;
    };
  }, [isDomiDedicatedDemo, isDomiMobilePlayground, isNexaPathMobilePlayground, startAcceptedFlow]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      if (!launchVisible || isChecking) return;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      const cleanCode = passcode.trim();
      setDemoAutoPlay(false);
      setIsChecking(true);
      await wait(CHECKING_MS);
      if (runIdRef.current !== runId) return;

      const loginResult = await loginToTourBotDemo(cleanCode);

      if (!loginResult.accepted) {
        const nextLane: SmartBarFlashCardLaneName = getNextNoticeLane();
        const resultNotice: SmartBarFlashCardNotice = {
          variant: "failure",
          title: "Access denied",
        };

        if (nextLane === "a") setNoticeA(resultNotice);
        else setNoticeB(resultNotice);

        setActiveNoticeLaneState(nextLane);
        setLaunchVisible(false);

        await wait(SMARTBAR_FLASH_CARD_TRANSITION_MS + RESULT_HOLD_MS);
        if (runIdRef.current !== runId) return;

        const noticeCleared = await clearNoticeLanes(runId);
        if (!noticeCleared) return;

        setPasscode("");
        setIsChecking(false);
        setPreludeStackCards([]);
        setLaunchVisible(true);
        return;
      }

      let nextDemoPath = loginResult.demoPath || getStoredTourBotDemoPath();

      // Some auth deployments may attach demoPath to the session response but
      // not the login response. Re-check once after a successful login before
      // falling back to the root intro flow.
      if (!normalizeTourBotDemoPath(nextDemoPath)) {
        const sessionAfterLogin = await checkTourBotDemoSession();
        if (sessionAfterLogin.accepted) {
          nextDemoPath = sessionAfterLogin.demoPath || getStoredTourBotDemoPath();
        }
      }

      if (redirectToTourBotDemoPath(nextDemoPath, { allowFoodRouteSteering: true })) return;

      await startAcceptedFlow(runId, { showAccessGranted: true });
    },
    [clearNoticeLanes, getNextNoticeLane, isChecking, launchVisible, passcode, setActiveNoticeLaneState, startAcceptedFlow],
  );

  const allowMobileDemoPageScroll =
    demoVisible && (shouldSkipFitsAnywhereAnimationOnPhone() || variant === "full");

  const useCenteredFoodTrioDesktopCards =
    currentDemoPath === "/food-trio" || currentDemoPath === "/food-trio-desktop";

  if (isNexaPathMobilePlayground) {
    return <NexaPathMobileExperience />;
  }

  if (isDomiMobilePlayground) {
    const shouldRunDomiDemo =
      new URLSearchParams(window.location.search).get("demo") === "1" ||
      new URLSearchParams(window.location.search).get("autoplay") === "1";

    return <DomiMobileExperience autoPlay={shouldRunDomiDemo} />;
  }

  if (isDomiDedicatedDemo) {
    return <DomiMobileExperience demoFixtureMode autoPlay />;
  }

  return (
    <div
      className={
        allowMobileDemoPageScroll
          ? "relative min-h-[100dvh] overflow-x-hidden"
          : "relative h-[100dvh] min-h-[100dvh] overflow-hidden"
      }
    >
      {demoVisible ? <SmartBarSpeedDemo autoPlay={demoAutoPlay} variant={variant} /> : <LaunchBackground />}
<SmartBarFlashCardRail
        className={
          useCenteredFoodTrioDesktopCards
            ? "pointer-events-none !fixed !left-0 !right-0 !top-[32%] z-[10120] !w-full lg:!top-[31%]"
            : "!top-[45%] sm:!top-1/2"
        }
      >
        <SmartBarFlashCardStack
          cards={preludeStackCards}
          mode={activePreludeStackMode}
          align={useCenteredFoodTrioDesktopCards ? "center" : "end"}
        />

        <SmartBarFlashCardLane active={launchVisible} align={useCenteredFoodTrioDesktopCards ? "center" : "end"}>
          <LaunchSlip
              passcode={passcode}
              isChecking={isChecking}
              onPasscodeChange={setPasscode}
              onSubmit={handleSubmit}
            />
          
        </SmartBarFlashCardLane>

        <SmartBarFlashCardLane active={activeNoticeLane === "a" && Boolean(noticeA)} align={useCenteredFoodTrioDesktopCards ? "center" : "end"}>
          {noticeA ? <SmartBarFlashCard notice={noticeA} /> : null}
        </SmartBarFlashCardLane>

        <SmartBarFlashCardLane active={activeNoticeLane === "b" && Boolean(noticeB)} align={useCenteredFoodTrioDesktopCards ? "center" : "end"}>
          {noticeB ? <SmartBarFlashCard notice={noticeB} /> : null}
        </SmartBarFlashCardLane>
      </SmartBarFlashCardRail>
      <AnimatePresence>{fitsAnimationVisible ? <SmartBarFitsAnywhereAnimation /> : null}</AnimatePresence>
      <AnimatePresence>
        {foodTrioIntroAnimationVisible ? (
          <FoodTrioDesktopIntroAnimation
            onComplete={() => {
              foodTrioIntroCompleteResolverRef.current?.();
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function LaunchSelectorTourBar(props: { variant?: SmartBarSpeedDemoVariant }) {
  const currentDemoPath = currentTourBotDemoPath();

  if (currentDemoPath === "/") {
    return <SmartBarRootDemoSelector />;
  }

  if (tourBotDemoPathIsDomiDedicatedDemo(currentDemoPath)) {
    return <DomiMobileExperience demoFixtureMode autoPlay />;
  }

  return <LaunchSelectorTourBarInner {...props} />;
}