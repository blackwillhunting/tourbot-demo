import { motion } from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  Compass,
  LogIn,
  PhoneCall,
  PlayCircle,
  ReceiptText,
} from "lucide-react";
import RestaurantWalkthrough, {
  type RestaurantWalkthroughVariant,
} from "./components/tourbar/walkthrough/RestaurantWalkthrough";

const SMARTBAR_ROOT_MESSAGE_WAVE_MS = 1360;
const SMARTBAR_ROOT_RIBBON_GLIDE_MS = 720;
const SMARTBAR_ROOT_THINKING_WIGGLE_DURATION = 1.35;
const SMARTBAR_ROOT_THINKING_WIGGLE_STAGGER = 0.018;

const SMARTBAR_TEASER_TRACK_URLS = [
  "/api/smartbar-teaser-track",
  "https://tourbot.getn2ai.com/api/smartbar-teaser-track",
] as const;
const SMARTBAR_TEASER_SESSION_KEY = "smartbar_teaser_session_id";

type TeaserChoice = RestaurantWalkthroughVariant;
type TeaserTrackingEvent =
  | "page_open"
  | "quick_demo_click"
  | "full_walkthrough_click";

function getSmartBarTeaserSessionId() {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.sessionStorage.getItem(SMARTBAR_TEASER_SESSION_KEY);
    if (existing) return existing;

    const generated =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `teaser-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    window.sessionStorage.setItem(SMARTBAR_TEASER_SESSION_KEY, generated);
    return generated;
  } catch {
    return `teaser-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function smartBarTeaserTrackingPayload(event: TeaserTrackingEvent) {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  return {
    event,
    lead: params.get("lead") || "unknown",
    campaign: params.get("campaign") || params.get("utm_campaign") || "",
    source: params.get("source") || params.get("utm_source") || "",
    medium: params.get("medium") || params.get("utm_medium") || "",
    sessionId: getSmartBarTeaserSessionId(),
    page: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || "",
    href: window.location.href,
    userAgent: window.navigator.userAgent || "",
  };
}

async function trackSmartBarTeaserEvent(event: TeaserTrackingEvent) {
  const payload = smartBarTeaserTrackingPayload(event);
  if (!payload) return;

  for (const url of SMARTBAR_TEASER_TRACK_URLS) {
    try {
      const isAbsoluteUrl = /^https?:\/\//i.test(url);
      const response = await fetch(url, {
        method: "POST",
        credentials: isAbsoluteUrl ? "omit" : "same-origin",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) return;
    } catch {
      // Try the next endpoint.
    }
  }
}

function TeaserThinkingText({ body }: { body: string }) {
  let characterIndex = 0;
  const tokens = body.match(/\S+|\s+/g) || [];

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {tokens.map((token, tokenIndex) => {
        if (/^\s+$/.test(token)) {
          characterIndex += token.length;
          return token.includes("\n") ? (
            <span key={`space-${tokenIndex}`}>{token}</span>
          ) : (
            <span key={`space-${tokenIndex}`}> </span>
          );
        }

        const startIndex = characterIndex;
        characterIndex += token.length;

        return (
          <span
            key={`${tokenIndex}-${token}`}
            className="inline-block whitespace-nowrap align-baseline"
          >
            {token.split("").map((character, index) => (
              <motion.span
                key={`${character}-${tokenIndex}-${index}`}
                className="inline-block"
                animate={{
                  y: [0, -2.75, 0, 1.65, 0],
                  opacity: [0.58, 1, 0.76, 1, 0.58],
                }}
                transition={{
                  duration: SMARTBAR_ROOT_THINKING_WIGGLE_DURATION,
                  repeat: Infinity,
                  delay:
                    (startIndex + index) * SMARTBAR_ROOT_THINKING_WIGGLE_STAGGER,
                  ease: "easeInOut",
                }}
              >
                {character}
              </motion.span>
            ))}
          </span>
        );
      })}
    </span>
  );
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
        animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: 0.32 }}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </motion.span>
    </span>
  );
}

function DemoChoiceButton({
  title,
  description,
  primary = false,
  onClick,
}: {
  title: string;
  description: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className={[
        "w-full rounded-[22px] px-5 py-4 text-left shadow-[0_12px_28px_rgba(1,33,105,0.10)] ring-1 transition hover:-translate-y-0.5",
        primary
          ? "bg-[#012169] text-white ring-[#012169]/10 hover:bg-[#0b2f7f] hover:shadow-[0_18px_38px_rgba(1,33,105,0.22)]"
          : "bg-white/94 text-slate-950 ring-slate-200/80 hover:bg-white hover:shadow-[0_18px_38px_rgba(15,23,42,0.11)]",
      ].join(" ")}
    >
      <span className="block text-base font-semibold tracking-tight sm:text-lg">
        {title}
      </span>
      <span
        className={[
          "mt-0.5 block text-sm font-medium leading-5",
          primary ? "text-sky-100/88" : "text-slate-500",
        ].join(" ")}
      >
        {description}
      </span>
    </motion.button>
  );
}

function TeaserIntroCard({
  isWaving,
  onChoose,
}: {
  isWaving: boolean;
  onChoose: (choice: TeaserChoice) => void;
}) {
  return (
    <div className="w-full bg-white/80 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#012169] ring-1 ring-sky-100 sm:h-14 sm:w-14">
            <SmartBarPhoneToTicketIcon className="h-8 w-8 sm:h-9 sm:w-9" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
            SmartBar
          </div>
        </div>

        <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
          <div className="font-semibold text-slate-950">
            {isWaving ? (
              <TeaserThinkingText body="Voice orders → e-tickets." />
            ) : (
              "Voice orders → e-tickets."
            )}
          </div>

          <div className="mt-0.5 text-sm font-medium leading-5 text-slate-500 sm:text-base sm:leading-6">
            {isWaving ? (
              <TeaserThinkingText body="No forms, no phone calls." />
            ) : (
              "No forms, no phone calls."
            )}
          </div>

          <div className="mt-6 sm:mt-7">
            {isWaving ? (
              <TeaserThinkingText body="Customers say what they want. SmartBar sends your staff a ready ticket." />
            ) : (
              "Customers say what they want. SmartBar sends your staff a ready ticket."
            )}
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2">
          <DemoChoiceButton
            title="Teaser"
            description="Clean order"
            primary
            onClick={() => onChoose("quick")}
          />
          <DemoChoiceButton
            title="Full Walkthrough"
            description="Messy order"
            onClick={() => onChoose("full")}
          />
        </div>
      </div>
    </div>
  );
}

function TeaserPortalTransitionCard({
  isWaving,
  mode = "portal",
}: {
  isWaving: boolean;
  mode?: "portal" | "demos";
}) {
  const isDemos = mode === "demos";
  const message = isDemos ? "Opening demos." : "Opening SmartBar.";
  const supportingLine = isDemos
    ? "Choose Quick Demo or Full Walkthrough."
    : "Your session decides whether you enter the portal or see the login challenge.";
  const Icon = isDemos ? PlayCircle : LogIn;
  const label = isDemos ? "SmartBar demos" : "SmartBar access";

  return (
    <div className="w-full bg-white/80 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#012169] text-white ring-1 ring-[#012169]/10 sm:h-11 sm:w-11">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
            {label}
          </div>
        </div>

        <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
          <div className="font-semibold text-slate-950">
            {isWaving ? (
              <TeaserThinkingText body={message} />
            ) : (
              message
            )}
          </div>
          <div className="mt-0.5 text-sm font-medium leading-5 text-slate-500 sm:text-base sm:leading-6">
            {isWaving ? (
              <TeaserThinkingText body={supportingLine} />
            ) : (
              supportingLine
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SmartBarTeaserV2() {
  const [selectedDemo, setSelectedDemo] = useState<TeaserChoice | null>(null);
  const [isInitialTeaserSpinPending, setInitialTeaserSpinPending] = useState(true);
  const [ribbonStep, setRibbonStep] = useState(0);
  const [wavingIndex, setWavingIndex] = useState<number | null>(0);
  const [isPortalTransitioning, setIsPortalTransitioning] = useState(false);
  const [ribbonY, setRibbonY] = useState(0);
  const [ribbonHeight, setRibbonHeight] = useState<number | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const transitionTimersRef = useRef<number[]>([]);
  const pageOpenTrackedRef = useRef(false);

  const clearTransitionTimers = () => {
    transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimersRef.current = [];
  };

  const chooseDemo = (choice: TeaserChoice) => {
    if (isPortalTransitioning || isInitialTeaserSpinPending) return;

    void trackSmartBarTeaserEvent(
      choice === "quick" ? "quick_demo_click" : "full_walkthrough_click",
    );
    clearTransitionTimers();
    setSelectedDemo(choice);
    setWavingIndex(0);

    transitionTimersRef.current.push(
      window.setTimeout(() => {
        setRibbonStep(2);
      }, SMARTBAR_ROOT_MESSAGE_WAVE_MS),
    );

    transitionTimersRef.current.push(
      window.setTimeout(() => {
        setWavingIndex(null);
      }, SMARTBAR_ROOT_MESSAGE_WAVE_MS + SMARTBAR_ROOT_RIBBON_GLIDE_MS),
    );
  };

  const returnToChoices = () => {
    if (isPortalTransitioning || isInitialTeaserSpinPending) return;

    clearTransitionTimers();
    setRibbonStep(1);
    setWavingIndex(null);
    window.setTimeout(() => setSelectedDemo(null), SMARTBAR_ROOT_RIBBON_GLIDE_MS);
  };

  const openSmartBarDestination = (destination: string) => {
    if (isPortalTransitioning || isInitialTeaserSpinPending) return;

    clearTransitionTimers();
    setIsPortalTransitioning(true);
    setWavingIndex(ribbonStep);

    transitionTimersRef.current.push(
      window.setTimeout(() => {
        setRibbonStep(0);
        setWavingIndex(0);
      }, SMARTBAR_ROOT_MESSAGE_WAVE_MS),
    );

    transitionTimersRef.current.push(
      window.setTimeout(() => {
        window.location.assign(destination);
      }, SMARTBAR_ROOT_MESSAGE_WAVE_MS + SMARTBAR_ROOT_RIBBON_GLIDE_MS + 220),
    );
  };

  const openSmartBarPortal = () => {
    openSmartBarDestination("/");
  };

  const openSmartBarOverview = () => {
    openSmartBarDestination("/?smartbarReturn=overview");
  };

  useEffect(() => {
    if (pageOpenTrackedRef.current) return;
    pageOpenTrackedRef.current = true;
    void trackSmartBarTeaserEvent("page_open");
  }, []);

  useEffect(() => clearTransitionTimers, []);

  useEffect(() => {
    if (!isInitialTeaserSpinPending) return;

    setRibbonStep(0);
    setWavingIndex(0);

    transitionTimersRef.current.push(
      window.setTimeout(() => {
        setRibbonStep(1);
      }, SMARTBAR_ROOT_MESSAGE_WAVE_MS),
    );

    transitionTimersRef.current.push(
      window.setTimeout(() => {
        setWavingIndex(null);
        setInitialTeaserSpinPending(false);
      }, SMARTBAR_ROOT_MESSAGE_WAVE_MS + SMARTBAR_ROOT_RIBBON_GLIDE_MS),
    );
  }, [isInitialTeaserSpinPending]);

  useLayoutEffect(() => {
    const active = segmentRefs.current[ribbonStep];
    if (!active) return;
    setRibbonY(-active.offsetTop);
    setRibbonHeight(active.offsetHeight);
  }, [ribbonStep, selectedDemo]);

  useEffect(() => {
    const active = segmentRefs.current[ribbonStep];
    if (!active) return;

    let resizeFrame = 0;
    const measureActiveSegment = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        const currentActive = segmentRefs.current[ribbonStep];
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
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureActiveSegment);
    };
  }, [ribbonStep, selectedDemo]);

  const isIntro = ribbonStep === 1;
  const isInitialTeaserOpening = isInitialTeaserSpinPending;
  const isPortalTransition = ribbonStep === 0 && !isInitialTeaserOpening;

  return (
    <main
      data-smartbar-teaser-v2="true"
      className="flex h-[100svh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_45%,_#f8fafc_100%)] text-slate-950 sm:h-screen"
    >
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
            {!isIntro && selectedDemo && !isPortalTransitioning ? (
              <button
                type="button"
                onClick={returnToChoices}
                className="inline-flex items-center justify-center rounded-full bg-white/86 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:px-3.5 sm:py-2 sm:text-sm"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">Back</span>
                <span className="hidden sm:inline">Back to demos</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={openSmartBarPortal}
              disabled={isPortalTransitioning || isInitialTeaserOpening}
              className="inline-flex items-center justify-center rounded-full bg-[#012169] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(1,33,105,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0b2f7f] disabled:cursor-wait disabled:opacity-70 sm:px-3.5 sm:py-2 sm:text-sm"
            >
              <LogIn className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {isPortalTransitioning || isInitialTeaserOpening ? "Opening" : "Use SmartBar"}
            </button>

            <div className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
              {isInitialTeaserOpening
                ? "Opening demos"
                : isPortalTransition
                  ? "Opening SmartBar"
                  : isIntro
                  ? "SmartBar teaser"
                  : selectedDemo === "quick"
                    ? "Teaser"
                    : "Full walkthrough"}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden px-2.5 py-2 sm:overflow-visible sm:px-6 sm:py-5">
        <div
          className={[
            "relative flex min-h-0 w-full max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain py-2 sm:block sm:max-w-[52rem] sm:overflow-visible sm:py-0 sm:transition-transform sm:duration-[720ms] sm:ease-out",
            isInitialTeaserOpening && ribbonStep === 0 ? "sm:-translate-y-[19px]" : "",
          ].join(" ")}
        >
          <div
            className={
              "my-auto w-full overflow-hidden rounded-[30px] transition-[height] duration-700 ease-out sm:my-0 sm:rounded-[36px] " +
              (isIntro
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
              <div
                ref={(node) => {
                  segmentRefs.current[0] = node;
                }}
              >
                <TeaserPortalTransitionCard
                  isWaving={wavingIndex === 0}
                  mode={isInitialTeaserOpening ? "demos" : "portal"}
                />
              </div>

              <div
                ref={(node) => {
                  segmentRefs.current[1] = node;
                }}
              >
                <TeaserIntroCard
                  isWaving={wavingIndex === 1}
                  onChoose={chooseDemo}
                />
              </div>

              <div
                ref={(node) => {
                  segmentRefs.current[2] = node;
                }}
                className="h-[590px] sm:h-[675px]"
              >
                {selectedDemo ? (
                  <RestaurantWalkthrough
                    key={selectedDemo}
                    chrome="content"
                    variant={selectedDemo}
                    finishLabel="How to get started"
                    onFinish={openSmartBarOverview}
                  />
                ) : null}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
