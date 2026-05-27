import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import SmartBarSpeedDemo from "./components/tourbar/speed-demo/SmartBarSpeedDemo";
import SmartBarFitsAnywhereAnimation, { FITS_ANYWHERE_ANIMATION_MS } from "./components/tourbar/speed-demo/SmartBarFitsAnywhereAnimation";
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
const TOURBOT_LEGACY_UNLOCK_COOKIE = "tourbot_demo_unlocked";

type TourBotAuthResponse = {
  ok?: boolean;
  token?: string;
  expiresAt?: number;
};

function isLocalDemoAuthBypassEnabled() {
  return (
    import.meta.env.DEV &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
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
  clearLegacyPrototypeCookie();
}

function saveStoredTourBotDemoToken(token: string, expiresAt?: number) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOURBOT_AUTH_TOKEN_KEY, token);
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
    window.localStorage.setItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
  } else {
    window.localStorage.removeItem(TOURBOT_AUTH_TOKEN_EXPIRES_AT_KEY);
  }

  clearLegacyPrototypeCookie();
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

function cleanupResetAccessUrl() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const changed = params.has("logout") || params.has("resetAccess") || params.has("returnTo") || params.has("smartbarLogin");
  params.delete("logout");
  params.delete("resetAccess");
  params.delete("returnTo");
  params.delete("smartbarLogin");
  if (!changed) return;

  const nextSearch = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
  );
}

async function checkTourBotDemoSession() {
  const token = getStoredTourBotDemoToken();
  if (!token) return false;

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
      return false;
    }

    const body = (await response.json().catch(() => ({}))) as TourBotAuthResponse;
    if (body.ok !== true) {
      clearStoredTourBotDemoToken();
      return false;
    }

    if (typeof body.expiresAt === "number") {
      saveStoredTourBotDemoToken(token, body.expiresAt);
    }

    return true;
  } catch {
    return false;
  }
}

async function loginToTourBotDemo(passcode: string) {
  if (isLocalDemoAuthBypassEnabled()) return codeIsAccepted(passcode);

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
      return false;
    }

    const body = (await response.json().catch(() => ({}))) as TourBotAuthResponse;
    if (body.ok !== true || !body.token) {
      clearStoredTourBotDemoToken();
      return false;
    }

    saveStoredTourBotDemoToken(body.token, body.expiresAt);
    return true;
  } catch {
    clearStoredTourBotDemoToken();
    return false;
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
    title: "SmartBar returns the **next step**",
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
    title: "SmartBar responds with **whatever's needed next**",
    cascadeGroup: "stage-2",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
    clearCascade: true,
  },
        {
    title: "Add it where visitors already look",
    cascadeGroup: "pre-animate",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
  },
      {
    title: "Usually, that means the toolbar",
    cascadeGroup: "pre-animate",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 3000,
  },
];

const MOBILE_PRELUDE_SLIPS: PreludeSlip[] = [
  {
    title: "What is **SmartBar**?",
    cascadeGroup: "stage-0",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 2500,
  },
  {
    title: "It looks like search",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "feels like chat",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 900,
  },
  {
    title: "returns action",
    cascadeGroup: "stage-1",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1500,
    clearCascade: true,
  },
  {
    title: "Search gives **results**",
    cascadeGroup: "mobile-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1100,
  },
  {
    title: "Chat gives **words**",
    cascadeGroup: "mobile-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1100,
  },
  {
    title: "SmartBar gives the **next step**",
    cascadeGroup: "mobile-thesis",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1700,
    clearCascade: true,
  },
  {
    title: "Mobile-ready",
    cascadeGroup: "mobile-ready",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 850,
  },
  {
    title: "Bottom-mounted",
    cascadeGroup: "mobile-ready",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 850,
  },
  {
    title: "Works with **any site**",
    cascadeGroup: "mobile-ready",
    cascadeMode: "standard",
    density: "normal",
    holdMs: 1800,
    clearCascade: true,
  },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function useSmartBarMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function codeIsAccepted(value: string) {
  return value.trim().length === REQUIRED_PASSCODE_LENGTH;
}

function ThinkingCode({ value }: { value: string }) {
  const characters = value.trim().padEnd(REQUIRED_PASSCODE_LENGTH, "•").slice(0, REQUIRED_PASSCODE_LENGTH).split("");

  return (
    <div
      aria-label="Checking passcode"
      className="flex h-11 w-24 items-center justify-center gap-1 rounded-full border border-emerald-200 bg-white/88 px-3 text-center text-sm font-black tracking-[0.22em] text-slate-950 ring-1 ring-emerald-100 sm:w-28"
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
      className="flex min-h-[72px] w-[min(100%,calc(100vw-1.5rem))] items-center gap-2 rounded-[28px] border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl sm:w-full sm:gap-3 sm:rounded-full sm:px-5 sm:py-3.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200/86 text-emerald-900 ring-1 ring-emerald-300/85 sm:h-12 sm:w-12">
        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">
          <span className="sm:hidden">Demo code</span>
          <span className="hidden sm:inline">Enter SmartBar passcode</span>
        </div>
        <div className="truncate text-[11px] font-semibold text-slate-600 sm:text-xs">
          <span className="sm:hidden">Unlock SmartBar.</span>
          <span className="hidden sm:inline">Unlock the speed demo.</span>
        </div>
      </div>

      {isChecking ? (
        <ThinkingCode value={passcode} />
      ) : (
        <input
          value={passcode}
          onChange={(event) => onPasscodeChange(event.target.value.slice(0, REQUIRED_PASSCODE_LENGTH))}
          aria-label="SmartBar demo passcode"
          placeholder="6 chars"
          className="h-11 w-[5.75rem] rounded-full border border-emerald-300/80 bg-white/92 px-2 text-center text-sm font-semibold tracking-[0.14em] text-slate-950 outline-none ring-1 ring-emerald-200/70 transition placeholder:tracking-normal placeholder:text-slate-300 focus:border-emerald-500 focus:ring-emerald-300/80 sm:h-12 sm:w-28 sm:px-3 sm:tracking-[0.18em]"
        />
      )}

      <button
        type="submit"
        disabled={isChecking}
        className="h-11 rounded-full bg-slate-950 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-slate-950/12 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-70 sm:h-12 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
      >
        Go
      </button>
    </form>
  );
}

function LaunchBackground() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
    </main>
  );
}

export default function LaunchSelectorTourBar() {
  const isMobileSmartBar = useSmartBarMobileViewport();
  const [launchVisible, setLaunchVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [activeNoticeLane, setActiveNoticeLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);
  const [activePreludeStackMode, setActivePreludeStackMode] = useState<SmartBarFlashCardCascadeMode>("standard");
  const [preludeStackCards, setPreludeStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [fitsAnimationVisible, setFitsAnimationVisible] = useState(false);
  const [demoVisible, setDemoVisible] = useState(false);
  const [demoAutoPlay, setDemoAutoPlay] = useState(false);
  const runIdRef = useRef(0);
  const activeNoticeLaneRef = useRef<SmartBarFlashCardLaneName | null>(null);

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

      const preludeSlips = isMobileSmartBar ? MOBILE_PRELUDE_SLIPS : PRELUDE_SLIPS;

      for (let index = 0; index < preludeSlips.length; index += 1) {
        const slip = preludeSlips[index];
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

      if (!isMobileSmartBar) {
        setFitsAnimationVisible(true);
        await wait(FITS_ANYWHERE_ANIMATION_MS);
        if (runIdRef.current !== runId) return;
      }

      setDemoVisible(true);
      await wait(DEMO_HANDOFF_SETTLE_MS);
      if (runIdRef.current !== runId) return;

      setFitsAnimationVisible(false);
      setDemoAutoPlay(true);
    },
    [clearNoticeLanes, getNextNoticeLane, isMobileSmartBar, setActiveNoticeLaneState],
  );

  useEffect(() => {
    let cancelled = false;

    const loadAccessState = async () => {
      if (shouldResetAccessFromUrl()) {
        clearStoredTourBotDemoToken();
        cleanupResetAccessUrl();
      }

      await wait(INTRO_DELAY_MS);
      if (cancelled) return;

      const hasValidSession = await checkTourBotDemoSession();
      if (cancelled) return;

      if (hasValidSession) {
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
  }, [startAcceptedFlow]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!launchVisible || isChecking) return;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      const cleanCode = passcode.trim();
      setDemoAutoPlay(false);
      setIsChecking(true);
      await wait(CHECKING_MS);
      if (runIdRef.current !== runId) return;

      const accepted = await loginToTourBotDemo(cleanCode);

      if (!accepted) {
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

      await startAcceptedFlow(runId, { showAccessGranted: true });
    },
    [clearNoticeLanes, getNextNoticeLane, isChecking, launchVisible, passcode, setActiveNoticeLaneState, startAcceptedFlow],
  );

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      {demoVisible ? <SmartBarSpeedDemo autoPlay={demoAutoPlay} /> : <LaunchBackground />}

      <div className={isMobileSmartBar ? "-translate-y-[8svh] sm:translate-y-0" : undefined}>
      <SmartBarFlashCardRail>
        <SmartBarFlashCardStack cards={preludeStackCards} mode={activePreludeStackMode} />

        <SmartBarFlashCardLane active={launchVisible}>
          <LaunchSlip
            passcode={passcode}
            isChecking={isChecking}
            onPasscodeChange={setPasscode}
            onSubmit={handleSubmit}
          />
        </SmartBarFlashCardLane>

        <SmartBarFlashCardLane active={activeNoticeLane === "a" && Boolean(noticeA)}>
          {noticeA ? <SmartBarFlashCard notice={noticeA} /> : null}
        </SmartBarFlashCardLane>

        <SmartBarFlashCardLane active={activeNoticeLane === "b" && Boolean(noticeB)}>
          {noticeB ? <SmartBarFlashCard notice={noticeB} /> : null}
        </SmartBarFlashCardLane>
      </SmartBarFlashCardRail>
      </div>

      <AnimatePresence>{fitsAnimationVisible ? <SmartBarFitsAnywhereAnimation /> : null}</AnimatePresence>
    </div>
  );
}
