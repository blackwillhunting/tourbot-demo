import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle,
  ClipboardCheck,
  Compass,
  Hotel,
  Map,
  PlayCircle,
  Route,
  Search,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type CloseMode = "transactional" | "informational";

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
      "**TourBot** guides the visitor through the next steps on the site instead of leaving them with instructions.",
    icon: Sparkles,
    iconClass: "bg-indigo-100 text-indigo-700 ring-indigo-200/80",
  },
  {
    label: "Intent becomes motion",
    message:
      "**TourBot** figures out needs, optimizes options, physically scrolls the site, and suggests next steps.",
    icon: Route,
    iconClass: "bg-sky-100 text-sky-700 ring-sky-200/80",
  },
  {
    label: "Cart sites",
    message:
      "**TourBot** walks shoppers through choices, stores selections, and autofills those choices into booking or checkout.",
    icon: ShoppingCart,
    iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
  },
  {
    label: "Service sites",
    message:
      "**TourBot** reveals deeper details, connects visitors and operators directly, schedules appointments, and hands off intake summaries.",
    icon: CalendarCheck,
    iconClass: "bg-violet-100 text-violet-700 ring-violet-200/80",
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
      label: "Booking path",
      message:
        "**TourBot** translated dates, room preference, budget sensitivity, and breakfast into a staged hotel stay.",
      icon: Hotel,
      iconClass: "bg-sky-100 text-sky-700 ring-sky-200/80",
    },
    {
      label: "Context carried forward",
      message:
        "Room choice, dates, guest count, and package moved with the visitor into the booking handoff.",
      icon: ShoppingCart,
      iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
    },
    {
      label: "Less friction",
      message:
        "For transactional sites, **TourBot** keeps shoppers moving toward checkout instead of leaving them to rebuild their choices.",
      icon: CheckCircle,
      iconClass: "bg-indigo-100 text-indigo-700 ring-indigo-200/80",
    },
  ],
  informational: [
    {
      label: "Hidden cart revealed",
      message:
        "**TourBot** showed how a service-site visitor can move from vague discovery into a clearer service path.",
      icon: Map,
      iconClass: "bg-violet-100 text-violet-700 ring-violet-200/80",
    },
    {
      label: "Qualified handoff",
      message:
        "**TourBot** can capture fit, urgency, need, and next-step context before a form, calendar, ticket, or consultant handoff.",
      icon: ClipboardCheck,
      iconClass: "bg-amber-100 text-amber-700 ring-amber-200/80",
    },
    {
      label: "Discovery becomes action",
      message:
        "For informational sites, **TourBot** helps visitors understand the offer and move toward an inquiry, appointment, or qualified next step.",
      icon: Sparkles,
      iconClass: "bg-indigo-100 text-indigo-700 ring-indigo-200/80",
    },
  ],
};

const THINKING_WIGGLE_DURATION = 1.35;
const THINKING_WIGGLE_STAGGER = 0.018;
const MESSAGE_WAVE_MS = 1360;
const RIBBON_GLIDE_MS = 720;

function initialCloseMode(): CloseMode | null {
  if (typeof window === "undefined") return null;
  const close = new URLSearchParams(window.location.search).get("close");
  if (close === "transactional" || close === "informational") return close;
  return null;
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
              href="/informational?mode=self_drive"
              icon={Map}
              eyebrow="Informational"
              title="NexaPath"
              description="Services demo"
            />
            <DemoLaunchButton
              href="/transactional?mode=self_drive"
              icon={Hotel}
              eyebrow="Transactional"
              title="Domi Coast"
              description="Hotel demo"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LaunchSelector() {
  const closeMode = useMemo(() => initialCloseMode(), []);
  const messages = closeMode ? closeMessages[closeMode] : launchMessages;
  const [step, setStep] = useState(0);
  const [wavingIndex, setWavingIndex] = useState<number | null>(null);
  const [ribbonY, setRibbonY] = useState(0);
  const [ribbonHeight, setRibbonHeight] = useState<number | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stageScrollRef = useRef<HTMLDivElement | null>(null);
  const current = messages[step];
  const isLastStep = step === messages.length - 1;
  const isWaving = wavingIndex !== null;

  const stepLabel = closeMode
    ? `Takeaway ${step + 1} of ${messages.length}`
    : `Step ${step + 1} of ${messages.length}`;

  useLayoutEffect(() => {
    const active = segmentRefs.current[step];
    if (!active) return;

    setRibbonY(-active.offsetTop);
    setRibbonHeight(active.offsetHeight);
  }, [step, messages.length]);

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
    stageScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const goHome = () => {
    window.location.href = "/";
  };

  const goBack = () => {
    if (isWaving) return;

    if (step === 0) {
      if (closeMode) goHome();
      return;
    }

    setStep((value) => Math.max(0, value - 1));
  };

  const goNext = async () => {
    if (isWaving) return;

    if (closeMode && isLastStep) {
      goHome();
      return;
    }

    if (isLastStep) return;

    setWavingIndex(step);
    await wait(MESSAGE_WAVE_MS);
    setStep((value) => Math.min(messages.length - 1, value + 1));
    await wait(RIBBON_GLIDE_MS);
    setWavingIndex(null);
  };

  const showNextButton = closeMode || !current.demoButtons;
  const backLabel = closeMode && step === 0 ? "Run another demo" : "Back";
  const nextLabel = closeMode && isLastStep ? "Run another demo" : "Next";

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
                Guided buying for visible and implied carts
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
            <Sparkles className="h-4 w-4 text-slate-500" />
            {stepLabel}
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-0 w-full flex-1 max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] justify-items-center overflow-hidden px-3 py-2 sm:flex sm:flex-col sm:items-center sm:justify-center sm:overflow-visible sm:px-6 sm:py-5">
        <div className="shrink-0">
          <ProgressDots step={step} count={messages.length} />
        </div>

        <div
          ref={stageScrollRef}
          className="relative mt-3 flex min-h-0 w-full max-w-3xl overflow-y-auto overscroll-contain py-4 sm:mt-6 sm:block sm:overflow-visible sm:py-0"
        >
          <div
            className="my-auto w-full overflow-hidden rounded-[30px] bg-white/35 backdrop-blur-sm transition-[height] duration-700 ease-out sm:my-0 sm:rounded-[36px]"
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
              {messages.map((message, index) => (
                <div
                  key={`${closeMode || "launch"}-${message.label}-${index}`}
                  ref={(node) => {
                    segmentRefs.current[index] = node;
                  }}
                >
                  <LaunchMessage
                    message={message}
                    step={index}
                    isWaving={wavingIndex === index}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="mt-2 flex w-full max-w-3xl shrink-0 items-center justify-between gap-3 pb-1 sm:mt-5 sm:pb-0">
          <button
            type="button"
            onClick={goBack}
            disabled={!closeMode && step === 0}
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
