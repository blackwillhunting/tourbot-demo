import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle,
  Compass,
  Hotel,
  KeyRound,
  MessageSquare,
  ShieldCheck,
  PlayCircle,
  Route,
  Search,
  ShoppingCart,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type CloseMode = "transactional" | "carryout";

type WalkthroughMessage = {
  label: string;
  message: string;
  icon: LucideIcon;
  iconClass: string;
  demoButtons?: boolean;
};

const launchMessages: WalkthroughMessage[] = [
  {
    label: "Visitors wander",
    message:
      "Usually, people land on a website, scan around, and eventually try to find what they need.",
    icon: Search,
    iconClass: "bg-amber-100 text-amber-700 ring-amber-200/80",
  },
  {
    label: "Road maps help",
    message:
      "A chatbot can give a road map. That helps, but the visitor still has to interpret the answer and navigate alone.",
    icon: Bot,
    iconClass: "bg-slate-100 text-slate-700 ring-slate-200/80",
  },
  {
    label: "TourBot guides",
    message:
      "**TourBot** is an AI guided-commerce agent that doesn't just tell the visitor what to do, it walks them thru it.",
    icon: Sparkles,
    iconClass: "bg-indigo-100 text-indigo-700 ring-indigo-200/80",
  },
  {
    label: "Intent becomes motion",
    message:
      "**TourBot** figures out needs, optimizes options, literally navigates the site to show you, and suggests next steps.",
    icon: Route,
    iconClass: "bg-sky-100 text-sky-700 ring-sky-200/80",
  },
  {
    label: "Carryout ordering sites",
    message:
      "**TourBot** turns “I want…” into instant checkout — fast, accurate, and easier than browsing the whole menu.",
    icon: ShoppingCart,
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200/80",
  },
  {
    label: "Choice-heavy booking sites",
    message:
      "**TourBot** walks shoppers through choices, stores selections, and autofills those choices into booking or checkout.",
    icon: CalendarCheck,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
  },
  {
    label: "Choose a demo",
    message:
      "See **TourBot** guide a visitor.",
    icon: PlayCircle,
    iconClass: "bg-slate-950 text-white ring-slate-950/10",
    demoButtons: true,
  },
];

const closeMessages: Record<CloseMode, WalkthroughMessage[]> = {
  transactional: [
    {
      label: "Inventory adapted",
      message:
        "**TourBot** adapts to any hotel catalog, updating rooms, rates, packages, availability, and action tiles as options change.",
      icon: Hotel,
      iconClass: "bg-violet-100 text-violet-700 ring-violet-200/80",
    },
    {
    label: "Navigation learned",
    message:
      "**TourBot** maps a public site in minutes and uses existing elements as its guide anchors — no code changes or plug-ins required.",
    icon: Route,
    iconClass: "bg-sky-100 text-sky-700 ring-sky-200/80",
    },
    {
    label: "Integration-ready",
    message:
      "From filtering live room availability to prefilling booking forms, **TourBot** connects visitors to reservations in real time.",
    icon: CheckCircle,
    iconClass: "bg-indigo-100 text-indigo-700 ring-indigo-200/80",
    },
  ],
carryout: [
  {
    label: "Menu adapted",
    message:
      "**TourBot** adapts to any carryout menu, updating choices, deal logic and action tiles on the fly as items change.",
    icon: MessageSquare,
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200/80",
  },
  {
    label: "Navigation learned",
    message:
      "**TourBot** maps a public site in minutes and uses existing elements as its guide anchors — no code changes or plug-ins required.",
    icon: Route,
    iconClass: "bg-sky-100 text-sky-700 ring-sky-200/80",
  },
 // {
  //  label: "Savings applied",
  //  message:
   //   "**TourBot** automatically spots and applies valid combo savings, rearranging cart lines where needed without changing the customer’s order.",
  //  icon: Sparkles,
   // iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
  //},
  {
    label: "Checkout handoff",
    message:
      "When the restaurant’s cart or POS supports it, **TourBot** prefills the order for checkout — creating a faster path from “I want…” to paid order.",
    icon: ShoppingCart,
    iconClass: "bg-indigo-100 text-indigo-700 ring-indigo-200/80",
  },
],
};

const THINKING_WIGGLE_DURATION = 1.35;
const THINKING_WIGGLE_STAGGER = 0.018;
const MESSAGE_WAVE_MS = 1360;
const RIBBON_GLIDE_MS = 720;
const PASSCODE_LENGTH = 6;
const TOURBOT_DEMO_COOKIE = "tourbot_demo_unlocked";
const TOURBOT_DEMO_COOKIE_MAX_AGE_SECONDS = 60 * 60;
const PASSCODE_BOX_WIGGLE_STAGGER = 0.075;
const PASSCODE_BOX_WIGGLE_DURATION = 1.18;

type StageItem =
  | { kind: "passcode" }
  | { kind: "failure" }
  | { kind: "message"; message: WalkthroughMessage; sourceIndex: number };

function normalizePasscode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, PASSCODE_LENGTH);
}

function hasTourBotDemoAccess() {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${TOURBOT_DEMO_COOKIE}=`));
}

function setTourBotDemoAccessCookie() {
  if (typeof document === "undefined") return;

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOURBOT_DEMO_COOKIE}=1; Max-Age=${TOURBOT_DEMO_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
}

function clearTourBotDemoAccessCookie() {
  if (typeof document === "undefined") return;

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOURBOT_DEMO_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag}`;
}

function initialCloseMode(): CloseMode | null {
  if (typeof window === "undefined") return null;
  const close = new URLSearchParams(window.location.search).get("close");
  if (close === "transactional") return "transactional";
  if (close === "carryout" || close === "informational") return "carryout";
  return null;
}

function initialLaunchStep(closeMode: CloseMode | null) {
  if (closeMode || typeof window === "undefined") return 0;

  const start = new URLSearchParams(window.location.search).get("start");
  return start === "demos" ? launchMessages.length - 1 : 0;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ProgressDots({ step, count }: { step: number; count: number }) {
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
              ? "w-7 bg-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.20)] sm:w-8"
              : "w-1.5 bg-slate-300 sm:w-2")
          }
        />
      ))}
    </div>
  );
}

type MarkdownSegment = {
  kind: "text" | "strong" | "em";
  text: string;
};

function parseInlineMarkdown(body: string): MarkdownSegment[] {
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

function markdownSegmentClass(kind: MarkdownSegment["kind"]) {
  if (kind === "strong") return "font-semibold text-slate-950";
  if (kind === "em") return "italic text-slate-600";
  return "";
}

function MarkdownText({ body }: { body: string }) {
  const segments = parseInlineMarkdown(body);

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {segments.map((segment, index) => {
        const className = markdownSegmentClass(segment.kind);
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

function ThinkingText({ body }: { body: string }) {
  const segments = parseInlineMarkdown(body);
  let characterIndex = 0;

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {segments.map((segment, segmentIndex) => {
        const segmentClass = markdownSegmentClass(segment.kind);
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
                    duration: THINKING_WIGGLE_DURATION,
                    repeat: Infinity,
                    delay: (startIndex + index) * THINKING_WIGGLE_STAGGER,
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

function toneClass(step: number) {
  return step % 2 === 0
    ? "bg-white/80 text-slate-950"
    : "bg-sky-50/85 text-slate-950";
}

function DemoLaunchButton({
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
      className="group flex items-center gap-3 rounded-[22px] bg-slate-950 px-4 py-3 text-left text-white shadow-[0_14px_34px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-5 sm:py-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 transition group-hover:bg-white/15">
        <Icon className="h-5 w-5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          {eyebrow}
        </span>
        <span className="mt-0.5 block text-base font-semibold tracking-tight sm:text-lg">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-slate-200 sm:text-sm sm:text-slate-300">
          {description}
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </a>
  );
}

function LaunchMessage({
  message,
  step,
  isWaving,
}: {
  message: WalkthroughMessage;
  step: number;
  isWaving: boolean;
}) {
  const Icon = message.icon;

  return (
    <div className={`w-full ${toneClass(step)} px-5 py-7 sm:px-10 sm:py-10`}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${message.iconClass} sm:h-11 sm:w-11`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
            {message.label}
          </div>
        </div>

        <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
          {isWaving ? <ThinkingText body={message.message} /> : <MarkdownText body={message.message} />}
        </div>

        {message.demoButtons && (
          <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
            <DemoLaunchButton
              href="/carryout?mode=self_drive"
              icon={ShoppingCart}
              eyebrow="Ordering"
              title="BurgerRush"
              description="Food ordering demo"
            />
            <DemoLaunchButton
              href="/transactional?mode=self_drive"
              icon={CalendarCheck}
              eyebrow="Booking"
              title="Domi Coast"
              description="Hotel booking demos"
            />
          </div>
        )}
      </div>
    </div>
  );
}


function PasscodeChallenge({
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
  const boxes = Array.from({ length: PASSCODE_LENGTH });

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const focusBox = (index: number) => {
    window.setTimeout(() => {
      inputRefs.current[Math.max(0, Math.min(PASSCODE_LENGTH - 1, index))]?.focus();
    }, 0);
  };

  const updateFromIndex = (index: number, rawValue: string) => {
    const cleaned = normalizePasscode(rawValue);
    const nextCharacters = boxes.map((_, characterIndex) => code[characterIndex] || "");

    if (!cleaned) {
      nextCharacters[index] = "";
      onChange(nextCharacters.join(""));
      return;
    }

    cleaned.split("").forEach((character, offset) => {
      const targetIndex = index + offset;
      if (targetIndex < PASSCODE_LENGTH) nextCharacters[targetIndex] = character;
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white ring-1 ring-slate-950/10 sm:h-11 sm:w-11">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
            Private demo access
          </div>
        </div>

        <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
          Enter your demo passcode.
        </div>

        <div className="mt-7 flex items-center justify-center gap-2 sm:mt-8 sm:justify-start sm:gap-3">
          {boxes.map((_, index) => {
            const character = code[index] || "";
            const isFilled = Boolean(character);
            const boxClassName =
              "flex h-12 w-10 items-center justify-center rounded-2xl border text-center text-lg font-bold uppercase tracking-tight shadow-sm outline-none transition sm:h-14 sm:w-12 sm:text-xl " +
              (isFilled
                ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                : "border-slate-200 bg-white text-slate-400 placeholder:text-slate-300 focus:border-slate-400 focus:text-slate-950 focus:ring-4 focus:ring-slate-200/70");

            if (isChecking) {
              return (
                <motion.div
                  key={`passcode-box-${index}`}
                  animate={{
                    y: [0, -6.5, 0, 3.75, 0],
                    rotate: [0, -3.4, 2.65, -1.85, 0],
                    scale: [1, 1.055, 1, 1.032, 1],
                  }}
                  className={boxClassName}
                  transition={{
                    duration: PASSCODE_BOX_WIGGLE_DURATION,
                    repeat: Infinity,
                    delay: index * PASSCODE_BOX_WIGGLE_STAGGER,
                    ease: "easeInOut",
                  }}
                >
                  {character || "•"}
                </motion.div>
              );
            }

            return (
              <input
                key={`passcode-box-${index}`}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                aria-label={`Demo passcode character ${index + 1}`}
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
          Passcode required for private viewing.
        </div>
      </div>
    </div>
  );
}

function AccessFailure({ isWaving }: { isWaving: boolean }) {
  const body = "That code is incomplete. Enter the full demo passcode and try again.";

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
          {isWaving ? <ThinkingText body={body} /> : <MarkdownText body={body} />}
        </div>
      </div>
    </div>
  );
}

export default function LaunchSelector() {
  const closeMode = useMemo(() => initialCloseMode(), []);
  const baseMessages = useMemo(() => (closeMode ? closeMessages[closeMode] : launchMessages), [closeMode]);
  const [hasAccess, setHasAccess] = useState(() => hasTourBotDemoAccess());
  const [passcode, setPasscode] = useState("");
  const [gateView, setGateView] = useState<"challenge" | "failure">("challenge");
  const [step, setStep] = useState(() => (hasTourBotDemoAccess() ? initialLaunchStep(closeMode) + 1 : 0));
  const [wavingIndex, setWavingIndex] = useState<number | null>(null);
  const [ribbonY, setRibbonY] = useState(0);
  const [ribbonHeight, setRibbonHeight] = useState<number | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stageScrollRef = useRef<HTMLDivElement | null>(null);

  const stageItems = useMemo<StageItem[]>(() => {
    const messageItems = baseMessages.map((message, sourceIndex) => ({
      kind: "message" as const,
      message,
      sourceIndex,
    }));

    if (hasAccess) return [{ kind: "passcode" }, ...messageItems];
    if (gateView === "failure") return [{ kind: "passcode" }, { kind: "failure" }];
    return [{ kind: "passcode" }];
  }, [baseMessages, gateView, hasAccess]);

  const current = stageItems[step];
  const currentMessage = current?.kind === "message" ? current.message : null;
  const currentMessageStep = current?.kind === "message" ? current.sourceIndex : 0;
  const isLastStep = hasAccess && step === stageItems.length - 1;
  const isWaving = wavingIndex !== null;
  const stageHeightTransitionClass =
    !hasAccess && gateView === "challenge" && step === 0
      ? "transition-none"
      : "transition-[height] duration-700 ease-out";

  const stepLabel = !hasAccess
    ? "Private access"
    : closeMode
      ? `Takeaway ${currentMessageStep + 1} of ${baseMessages.length}`
      : `Step ${currentMessageStep + 1} of ${baseMessages.length}`;

  useLayoutEffect(() => {
    const active = segmentRefs.current[step];
    if (!active) return;

    setRibbonY(-active.offsetTop);
    setRibbonHeight(active.offsetHeight);
  }, [stageItems.length, step]);

  useEffect(() => {
    const measureActiveSegment = () => {
      const active = segmentRefs.current[step];
      if (!active) return;
      setRibbonY(-active.offsetTop);
      setRibbonHeight(active.offsetHeight);
    };

    window.addEventListener("resize", measureActiveSegment);
    return () => window.removeEventListener("resize", measureActiveSegment);
  }, [step]);

  useEffect(() => {
    if (hasAccess) {
      setStep((value) => Math.min(Math.max(1, value), baseMessages.length));
      return;
    }

    setStep((value) => Math.min(value, Math.max(0, stageItems.length - 1)));
  }, [baseMessages.length, hasAccess, stageItems.length]);

  useEffect(() => {
    stageScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const resetAccess = () => {
    clearTourBotDemoAccessCookie();
    setHasAccess(false);
    setPasscode("");
    setGateView("challenge");
    setStep(0);
    setWavingIndex(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shouldLogout = params.get("logout") === "1" || params.get("resetAccess") === "1";
    if (!shouldLogout) return;

    resetAccess();

    params.delete("logout");
    params.delete("resetAccess");
    const nextSearch = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      resetAccess();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const goHome = () => {
    window.location.href = "/?start=demos";
  };

  const retryPasscode = async () => {
    if (isWaving) return;

    setWavingIndex(step);
    await wait(MESSAGE_WAVE_MS);
    setStep(0);
    await wait(RIBBON_GLIDE_MS);
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
    await wait(MESSAGE_WAVE_MS);

    if (passcode.length < PASSCODE_LENGTH) {
      setGateView("failure");
      setStep(1);
      await wait(RIBBON_GLIDE_MS);
      setWavingIndex(null);
      return;
    }

    setTourBotDemoAccessCookie();
    setHasAccess(true);
    setGateView("challenge");
    setStep(1);
    await wait(RIBBON_GLIDE_MS);
    setWavingIndex(null);
  };

  const goBack = () => {
    if (isWaving || !hasAccess) return;

    if (step <= 1) {
      if (closeMode) goHome();
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

    if (closeMode && isLastStep) {
      goHome();
      return;
    }

    if (isLastStep) return;

    setWavingIndex(step);
    await wait(MESSAGE_WAVE_MS);
    setStep((value) => Math.min(stageItems.length - 1, value + 1));
    await wait(RIBBON_GLIDE_MS);
    setWavingIndex(null);
  };

  const showNextButton = !hasAccess || closeMode || !currentMessage?.demoButtons;
  const backLabel = closeMode && hasAccess && step === 0 ? "Run another demo" : "Back";
  const nextLabel = !hasAccess
    ? gateView === "failure"
      ? "Try again"
      : "Submit"
    : closeMode && isLastStep
      ? "Run another demo"
      : "Next";

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_45%,_#f8fafc_100%)] text-slate-950 sm:h-screen">
      <header className="shrink-0 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[16px] bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950 sm:text-lg">
                TourBot Demo
              </div>
              <div className="text-[11px] font-medium leading-tight text-slate-700 sm:text-sm sm:font-normal sm:text-slate-500">
                Natural language navigation and buying
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAccess && (
              <button
                type="button"
                onClick={resetAccess}
                className="rounded-full bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 sm:px-3 sm:py-2 sm:text-sm"
              >
                Reset access
              </button>
            )}

            <div className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
              <Sparkles className="h-4 w-4 text-slate-500" />
              {stepLabel}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-0 w-full flex-1 max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] justify-items-center overflow-hidden px-3 py-2 sm:flex sm:flex-col sm:items-center sm:justify-center sm:overflow-visible sm:px-6 sm:py-5">
        <div className="shrink-0">
          {hasAccess ? (
            <ProgressDots step={currentMessageStep} count={baseMessages.length} />
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm ring-1 ring-white/70 sm:px-4 sm:py-1.5 sm:text-xs">
              <KeyRound className="h-3.5 w-3.5" />
              Access required
            </div>
          )}
        </div>

        <div
          ref={stageScrollRef}
          className="relative mt-3 flex min-h-0 w-full max-w-3xl overflow-y-auto overscroll-contain py-4 sm:mt-6 sm:block sm:overflow-visible sm:py-0"
        >
          <div
            className={`my-auto w-full overflow-hidden rounded-[30px] bg-white/35 backdrop-blur-sm sm:my-0 sm:rounded-[36px] ${stageHeightTransitionClass}`}
            style={ribbonHeight ? { height: ribbonHeight } : undefined}
          >
            <motion.div
              animate={{ y: ribbonY }}
              initial={false}
              transition={{
                duration: RIBBON_GLIDE_MS / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {stageItems.map((item, index) => (
                <div
                  key={
                    item.kind === "message"
                      ? `${closeMode || "launch"}-${item.message.label}-${item.sourceIndex}`
                      : item.kind
                  }
                  ref={(node) => {
                    segmentRefs.current[index] = node;
                  }}
                >
                  {item.kind === "passcode" && (
                    <PasscodeChallenge
                      code={passcode}
                      isChecking={wavingIndex === index}
                      onChange={setPasscode}
                      onSubmit={submitPasscode}
                    />
                  )}

                  {item.kind === "failure" && <AccessFailure isWaving={wavingIndex === index} />}

                  {item.kind === "message" && (
                    <LaunchMessage
                      message={item.message}
                      step={item.sourceIndex}
                      isWaving={wavingIndex === index}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="mt-2 flex w-full max-w-3xl shrink-0 items-center justify-between gap-3 pb-1 sm:mt-5 sm:pb-0">
          <button
            type="button"
            onClick={goBack}
            disabled={!hasAccess || (!closeMode && currentMessageStep === 0)}
            className="inline-flex items-center justify-center rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] disabled:pointer-events-none disabled:opacity-0 sm:px-4 sm:py-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </button>

          {showNextButton && (
            <button
              type="button"
              onClick={goNext}
              disabled={isWaving}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_34px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:py-2.5"
            >
              {nextLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
