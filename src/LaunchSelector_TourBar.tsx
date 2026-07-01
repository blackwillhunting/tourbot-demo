import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Compass, KeyRound, PhoneCall, PlayCircle, ReceiptText, Search, ShieldCheck, ShoppingCart, Sparkles, XCircle } from "lucide-react";
import SmartBarSpeedDemo, { type SmartBarSpeedDemoVariant } from "./components/tourbar/speed-demo/SmartBarSpeedDemo";
import SmartBarFitsAnywhereAnimation, { FITS_ANYWHERE_ANIMATION_MS } from "./components/tourbar/speed-demo/SmartBarFitsAnywhereAnimation";
import FoodTrioDesktopIntroAnimation, { FOOD_TRIO_DESKTOP_INTRO_ANIMATION_MS } from "./components/tourbar/speed-demo/FoodTrioDesktopIntroAnimation";
import NexaPathMobileExperience from "./components/tourbar/smartbar-mobile/nexapath/NexaPathMobileExperience";
import DomiMobileExperience from "./components/tourbar/smartbar-mobile/domi/DomiMobileExperience";
import RestaurantWalkthrough from "./components/tourbar/walkthrough/RestaurantWalkthrough";
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
};

type TourBotAuthResult = {
  accepted: boolean;
  demoPath?: string;
};

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
  clearLegacyPrototypeCookie();
}

function normalizeTourBotDemoPath(value?: string | null) {
  const path = String(value || "").trim();
  if (!path) return "";
  if (path === "/") return "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) return "";

  const cleanPath = path.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return cleanPath || "/";
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

  // Food passcodes may steer only as a one-time fresh login from the root
  // launch page. Existing sessions must only unlock the current URL, otherwise
  // stale demoPath state can keep dragging general-demo visitors into BurgerRush.
  if (
    tourBotDemoPathIsFoodRoute(cleanPath) &&
    !(options.allowFoodRouteSteering === true && currentPath === "/")
  ) {
    return false;
  }

  window.location.assign(cleanPath);
  return true;
}

function saveStoredTourBotDemoToken(token: string, expiresAt?: number, demoPath?: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOURBOT_AUTH_TOKEN_KEY, token);
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    window.localStorage.setItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
  } else {
    window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  }

  saveStoredTourBotDemoPath(demoPath);
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
    return { accepted: true };
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

    if (typeof body.expiresAt === "number") {
      saveStoredTourBotDemoToken(token, body.expiresAt, body.demoPath || getStoredTourBotDemoPath());
    } else if (body.demoPath) {
      saveStoredTourBotDemoPath(body.demoPath);
    }

    return { accepted: true, demoPath: body.demoPath || getStoredTourBotDemoPath() };
  } catch {
    return { accepted: false };
  }
}

async function loginToTourBotDemo(passcode: string): Promise<TourBotAuthResult> {
  if (isLocalDemoAuthBypassEnabled()) {
    ensureLocalDemoAuthToken();
    return { accepted: true };
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

    saveStoredTourBotDemoToken(body.token, body.expiresAt, body.demoPath);
    return { accepted: true, demoPath: body.demoPath };
  } catch {
    clearStoredTourBotDemoToken();
    return { accepted: false };
  }
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



function SmartBarPhoneToTicketIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block ${className}`} aria-hidden="true">
      <motion.span
        className="absolute left-0 top-[6px] grid h-[18px] w-[18px] place-items-center rounded-[8px] bg-white text-[#012169] shadow-[0_6px_14px_rgba(1,33,105,0.12)] ring-1 ring-sky-100"
        animate={{ y: [0, -1.5, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <PhoneCall className="h-3.5 w-3.5" strokeWidth={2.35} />
      </motion.span>

      <motion.span
        className="absolute left-[17px] top-[14px] h-2.5 w-2.5 rounded-full bg-[#012169] shadow-[0_0_0_5px_rgba(1,33,105,0.08)]"
        animate={{ scale: [1, 1.22, 1], opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.span
        className="absolute right-0 top-[2px] grid h-[24px] w-[19px] place-items-center rounded-[7px] bg-white text-[#012169] shadow-[0_8px_18px_rgba(15,23,42,0.13)] ring-1 ring-sky-100"
        animate={{ x: [0, 1.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.18 }}
      >
        <ReceiptText className="h-3.5 w-3.5" strokeWidth={2.35} />
      </motion.span>

      <motion.span
        className="absolute right-[-3px] top-[-3px] grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-400 text-white shadow-[0_4px_10px_rgba(16,185,129,0.24)]"
        initial={{ scale: 0.86, opacity: 0.9 }}
        animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: 0.32 }}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </motion.span>
    </span>
  );
}


type SmartBarRootDemoMessage = {
  label: string;
  message: string;
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
    label: "SmartBar",
    message:
      "**Phone orders → clean tickets.**\n\nCustomers say what they want. SmartBar checks the order and sends your staff a ready ticket.",
    icon: SmartBarPhoneToTicketIcon,
    iconClass: "bg-sky-50 text-[#012169] ring-sky-100",
    storyIcon: true,
  },
  {
    label: "Use it",
    message: "Open **SmartBar** demos and try the live flow.",
    icon: PlayCircle,
    iconClass: "bg-[#012169] text-white ring-[#012169]/10",
    demoButtons: true,
  },
];

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
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-[22px] bg-[#012169] px-4 py-3 text-left text-white shadow-[0_14px_34px_rgba(1,33,105,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_20px_46px_rgba(1,33,105,0.26)] sm:px-5 sm:py-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eaf3ff]/18 text-white ring-1 ring-white/16 transition group-hover:bg-white/22">
        <Icon className="h-5 w-5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100/82">
          {eyebrow}
        </span>
        <span className="mt-0.5 block text-base font-semibold tracking-tight sm:text-lg">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-sky-100/86 sm:text-sm">
          {description}
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-sky-100/82 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </a>
  );
}

function SmartBarRootLaunchMessage({
  message,
  step,
  isWaving,
}: {
  message: SmartBarRootDemoMessage;
  step: number;
  isWaving: boolean;
}) {
  const Icon = message.icon;
  const isStoryIcon = message.storyIcon === true;

  return (
    <div className={`w-full ${step % 2 === 0 ? "bg-white/80 text-slate-950" : "bg-sky-50/85 text-slate-950"} px-5 py-7 sm:px-10 sm:py-10`}>
      <div className="mx-auto max-w-2xl">
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
          {isWaving ? <SmartBarRootThinkingText body={message.message} /> : <SmartBarRootMarkdownText body={message.message} />}
        </div>

        {message.demoButtons && (
          <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
            <SmartBarRootDemoLaunchButton
              href="/foodtrio"
              icon={ShoppingCart}
              eyebrow="Ordering"
              title="FoodTrio"
              description="Food ordering demo"
            />
            <SmartBarRootDemoLaunchButton
              href="/domi-play-demo"
              icon={CalendarCheck}
              eyebrow="Booking"
              title="Domi Coast"
              description="Hotel booking demo"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SmartBarRootPasscodeChallenge({
  code,
  isChecking,
  onChange,
  onSubmit,
}: {
  code: string;
  isChecking: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const boxes = Array.from({ length: REQUIRED_PASSCODE_LENGTH });

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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
            Private demo access
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
                placeholder="—"
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
          <RestaurantWalkthrough chrome="content" onFinish={onFinish} />
        </motion.div>
      )}
    </div>
  );
}

function SmartBarRootDemoSelector() {
  const hasInitialStoredAccess = useMemo(() => hasOptimisticSmartBarRootAccess(), []);
  const [hasAccess, setHasAccess] = useState(() => hasInitialStoredAccess);
  const [isSessionChecking, setIsSessionChecking] = useState(() => hasInitialStoredAccess);
  const [passcode, setPasscode] = useState("");
  const [failureMessage, setFailureMessage] = useState("That code is incomplete. Enter the full demo passcode and try again.");
  const [gateView, setGateView] = useState<"challenge" | "failure">("challenge");
  const [step, setStep] = useState(() => (hasInitialStoredAccess ? 1 : 0));
  const [wavingIndex, setWavingIndex] = useState<number | null>(null);
  const [isRestaurantPreviewSettled, setRestaurantPreviewSettled] = useState(false);
  const [ribbonY, setRibbonY] = useState(0);
  const [ribbonHeight, setRibbonHeight] = useState<number | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stageScrollRef = useRef<HTMLDivElement | null>(null);

  const stageItems = useMemo<SmartBarRootStageItem[]>(() => {
    const messageItems = SMARTBAR_ROOT_MESSAGES.map((message, sourceIndex) => ({
      kind: "message" as const,
      message,
      sourceIndex,
    }));
    const setupItems = SMARTBAR_SETUP_WALKTHROUGH_STEPS.map((_setupStep, setupIndex) => ({
      kind: "setup-step" as const,
      setupIndex,
    }));

    if (hasAccess) return [{ kind: "passcode" }, ...messageItems, ...setupItems, { kind: "restaurant-preview" }];
    if (gateView === "failure") return [{ kind: "passcode" }, { kind: "failure" }];
    return [{ kind: "passcode" }];
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
  const restaurantPreviewStep = stageItems.findIndex((item) => item.kind === "restaurant-preview");
  const isWaving = wavingIndex !== null;
  const stageHeightTransitionClass =
    !hasAccess && gateView === "challenge" && step === 0
      ? "transition-none"
      : "transition-[height] duration-700 ease-out";

  const stepLabel = !hasAccess
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
  }, [stageItems.length, step, isRestaurantPreviewSettled]);

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
  }, [step, stageItems.length, isRestaurantPreviewSettled]);

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

  const resetAccess = useCallback(() => {
    clearStoredTourBotDemoToken();
    cleanupResetAccessUrl();
    setIsSessionChecking(false);
    setHasAccess(false);
    setPasscode("");
    setFailureMessage("That code is incomplete. Enter the full demo passcode and try again.");
    setGateView("challenge");
    setStep(0);
    setWavingIndex(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isCancelled = false;

    const loadSession = async () => {
      if (shouldResetAccessFromUrl()) {
        clearStoredTourBotDemoToken();
        if (isCancelled) return;
        cleanupResetAccessUrl();
        setHasAccess(false);
        setPasscode("");
        setFailureMessage("That code is incomplete. Enter the full demo passcode and try again.");
        setGateView("challenge");
        setStep(0);
        setWavingIndex(null);
        setIsSessionChecking(false);
        return;
      }

      const hasStoredToken = Boolean(getStoredTourBotDemoToken());
      if (!hasStoredToken) {
        setHasAccess(false);
        setStep(0);
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
      if (isCancelled) return;

      if (result.accepted) {
        if (redirectToSafeSmartBarRootReturnTo()) return;

        cleanupResetAccessUrl();
        setHasAccess(true);
        setGateView("challenge");
        setStep(1);
      } else {
        setHasAccess(false);
        setStep(0);
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

    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    setStep(0);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    setPasscode("");
    setGateView("challenge");
    setWavingIndex(null);
  };

  const submitPasscode = async () => {
    if (isWaving) return;

    if (gateView === "failure") {
      await retryPasscode();
      return;
    }

    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);

    if (passcode.length < REQUIRED_PASSCODE_LENGTH) {
      setFailureMessage("That code is incomplete. Enter the full demo passcode and try again.");
      setGateView("failure");
      setStep(1);
      await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
      setWavingIndex(null);
      return;
    }

    const loginResult = await loginToTourBotDemo(passcode);
    if (!loginResult.accepted) {
      setFailureMessage("That code could not be verified. Check the passcode and try again.");
      setGateView("failure");
      setStep(1);
      await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
      setWavingIndex(null);
      return;
    }

    if (redirectToSafeSmartBarRootReturnTo()) return;

    cleanupResetAccessUrl();
    setHasAccess(true);
    setGateView("challenge");
    setStep(1);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    setWavingIndex(null);
  };

  const goSetupWalkthrough = async () => {
    if (isWaving || !hasAccess || setupStartStep < 0) return;

    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    setStep(setupStartStep);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    setWavingIndex(null);
  };

  const finishSetupWalkthrough = () => {
    setStep(1);
  };

  const goRestaurantPreview = async () => {
    if (isWaving || !hasAccess || restaurantPreviewStep < 0) return;

    setRestaurantPreviewSettled(false);
    setWavingIndex(step);
    await wait(SMARTBAR_ROOT_MESSAGE_WAVE_MS);
    setStep(restaurantPreviewStep);
    await wait(SMARTBAR_ROOT_RIBBON_GLIDE_MS);
    setRestaurantPreviewSettled(true);
    setWavingIndex(null);
  };

  const finishRestaurantPreview = () => {
    setRestaurantPreviewSettled(false);
    setStep(1);
  };

  const goBack = () => {
    if (isWaving || !hasAccess) return;
    if (step <= 1) return;
    if (isRestaurantPreview) {
      finishRestaurantPreview();
      return;
    }

    if (isSetupStep && currentSetupIndex === 0) {
      finishSetupWalkthrough();
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

    setStep((value) => Math.min(stageItems.length - 1, value + 1));
  };

  const showNextButton = !hasAccess || (!currentMessage?.demoButtons && !isRestaurantPreview);
  const nextLabel = !hasAccess
    ? isSessionChecking
      ? "Checking"
      : gateView === "failure"
        ? "Try again"
        : "Submit"
    : isSetupStep
      ? isLastSetupStep
        ? "Finish"
        : "Next"
      : isLaunchOverview
        ? "Use it"
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
                onClick={isRestaurantPreview ? finishRestaurantPreview : finishSetupWalkthrough}
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
                      onFinish={finishRestaurantPreview}
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
                onClick={goRestaurantPreview}
                disabled={isWaving}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#012169] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.20),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_16px_34px_rgba(1,33,105,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Walkthru
                <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2" />
              </button>

              <button
                type="button"
                onClick={goSetupWalkthrough}
                disabled={isWaving}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#012169] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.20),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_16px_34px_rgba(1,33,105,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Setup
                <ArrowRight className="ml-1.5 h-4 w-4 sm:ml-2" />
              </button>
            </>
          )}

          {showNextButton && (
            <button
              type="button"
              onClick={goNext}
              disabled={isWaving || (!hasAccess && isSessionChecking)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#012169] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(1,33,105,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] hover:shadow-[0_16px_34px_rgba(1,33,105,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:flex-none sm:px-5 sm:py-2.5 sm:text-sm"
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
