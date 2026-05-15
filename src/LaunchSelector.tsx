import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Compass, Hotel, Map, ShoppingCart, Sparkles } from "lucide-react";

type WizardStep = {
  eyebrow: string;
  title: string;
  intro?: string;
  bullets: string[];
  closing?: string;
};

type CloseMode = "transactional" | "informational";

const launchSteps: WizardStep[] = [
  {
    eyebrow: "Guided buying",
    title: "TourBot turns answers into tours.",
    intro:
      "TourBot doesn't just tell you, it navigates sites, spotlights, and _shows_ you.",
    bullets: [
      "**Static site** → you decipher layout, try to find, fumble.",
      "**Standard chatbot** → you get a road map but have to read it yourself.",
      "**TourBot** → you get a guided tour thru next steps.",
    ],
  },
  {
    eyebrow: "Two site patterns",
    title: "Every business site has a cart.",
    intro:
      "Transactional sites show the cart. Informational sites hide it inside the next step: a lead, quote, consultation, assessment, or service-fit decision.",
    bullets: [
      "**Visible cart sites** — hotels, ecommerce, travel, tickets, reservations, quote flows.\n_Focus:_ compare options, add extras, reserve, buy, or check out.",
      "**Implied cart sites** — consulting, law, agencies, healthcare, MSPs, B2B services.\n_Focus:_ identify fit and move toward an inquiry, quote, consultation, or service path.",
    ],
    closing:
      "TourBot handles both: visible-cart _sales_ paths and implied-cart _lead_ paths.",
  },
  {
    eyebrow: "Self-drive demos",
    title: "Live look-ins.",
    intro: "Choose a self-drive experience below and see TourBot applied live to a site.",
    bullets: [],
  },
];

const closePages: Record<CloseMode, WizardStep> = {
  transactional: {
    eyebrow: "Transactional takeaway",
    title: "TourBot turns browsing into buying.",
    intro:
      "TourBot turns buying intent into guided completion: it listens, fills in missing details through progressive chips, and keeps the shopper moving toward the sale.",
    bullets: [
      "**Progressive chips** steer next steps and expose overlooked features.",
      "**Relevant add-ons and upsells** appear before checkout.",
      "**Known choices carry forward** into a booking, checkout, or sales handoff.",
    ],
  },
  informational: {
    eyebrow: "Informational takeaway",
    title: "TourBot turns discovery into qualified handoff.",
    intro:
      "On informational sites, the merchandise is often hidden. TourBot reveals the right service path, qualifies the visitor, and pulls the lead toward a real next step.",
    bullets: [
      "**Intake briefs** summarize the visitor’s need, fit, urgency, and context.",
      "**Calendar integrations** can schedule appointments or route service requests.",
      "**Conversation IDs and ticketing handoff** can connect live consultants.",
    ],
  },
};

function initialCloseMode(): CloseMode | null {
  if (typeof window === "undefined") return null;
  const close = new URLSearchParams(window.location.search).get("close");
  if (close === "transactional" || close === "informational") return close;
  return null;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${launchSteps.length}`}>
      {launchSteps.map((item, index) => (
        <span
          key={item.eyebrow}
          className={
            "h-1.5 rounded-full transition-all sm:h-2 " +
            (index === step ? "w-7 bg-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.20)] sm:w-8" : "w-1.5 bg-slate-300 sm:w-2")
          }
        />
      ))}
    </div>
  );
}

function MarkdownText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={`${part}-${index}`} className="font-semibold text-slate-950">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("_") && part.endsWith("_")) {
          return (
            <em key={`${part}-${index}`} className="italic text-slate-600">
              {part.slice(1, -1)}
            </em>
          );
        }

        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      })}
    </span>
  );
}

function WizardBullet({ item }: { item: string }) {
  const [mainLine, ...subLines] = item.split("\n");
  const subText = subLines.join(" ").trim();

  return (
    <li className="flex gap-2.5 sm:gap-3">
      <span className="mt-2 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.16)] sm:mt-2.5 sm:h-4 sm:w-4">
        <span className="h-1 w-1 rounded-full bg-slate-900 sm:h-1.5 sm:w-1.5" />
      </span>
      <span className="min-w-0">
        <MarkdownText text={mainLine} className="block" />
        {subText && (
          <MarkdownText
            text={subText}
            className="mt-0.5 block border-l border-slate-200 pl-2.5 text-[11px] leading-4 text-slate-500 sm:mt-1 sm:pl-3 sm:text-sm sm:leading-5"
          />
        )}
      </span>
    </li>
  );
}

function DemoLaunchButton({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group flex w-full items-start gap-3 rounded-[20px] bg-slate-950 p-2.5 text-left text-white shadow-[0_14px_34px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_42px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] sm:gap-4 sm:rounded-[22px] sm:p-4"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 transition group-hover:bg-white/15 sm:h-10 sm:w-10">
        <Icon className="h-5 w-5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {eyebrow}
        </span>
        <span className="mt-0.5 block text-sm font-semibold tracking-tight sm:mt-1 sm:text-lg">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-slate-300 sm:mt-1 sm:text-sm sm:leading-5">
          {description}
        </span>
      </span>
      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </a>
  );
}

export default function LaunchSelector() {
  const closeMode = useMemo(() => initialCloseMode(), []);
  const [step, setStep] = useState(0);
  const current = closeMode ? closePages[closeMode] : launchSteps[step];
  const isLastStep = !closeMode && step === launchSteps.length - 1;
  const isDemoSelectStep = !closeMode && step === 2;

  const cardIcon = useMemo(() => {
    if (closeMode === "transactional") return ShoppingCart;
    if (closeMode === "informational") return Map;
    if (step === 0) return Sparkles;
    if (step === 1) return ShoppingCart;
    return Compass;
  }, [closeMode, step]);
  const CardIcon = cardIcon;

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)] text-slate-950">
      <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[16px] bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-tight sm:text-lg">
                TourBot Demo
              </div>
              <div className="text-[10px] leading-tight text-slate-500 sm:text-sm">
                Guided buying for visible and implied carts
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
            <Sparkles className="h-4 w-4 text-slate-500" />
            {closeMode ? "Demo takeaway" : `Step ${step + 1} of ${launchSteps.length}`}
          </div>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100vh-46px)] max-w-5xl flex-col items-center justify-center px-3 py-2 sm:h-[calc(100vh-69px)] sm:px-6 sm:py-5">
        {!closeMode && <ProgressDots step={step} />}

        <div className="relative mt-2 w-full max-w-2xl sm:mt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 28, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -28, scale: 0.985 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/94 shadow-[0_20px_58px_rgba(15,23,42,0.14),inset_0_2px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-950/[0.04] backdrop-blur-xl transition-transform duration-300 before:absolute before:-inset-6 before:-z-10 before:rounded-[40px] before:bg-indigo-900/[0.07] before:blur-3xl hover:-translate-y-0.5 hover:shadow-[0_34px_90px_rgba(15,23,42,0.18),inset_0_2px_0_rgba(255,255,255,0.85)] sm:rounded-[32px] sm:shadow-[0_28px_80px_rgba(15,23,42,0.16),inset_0_2px_0_rgba(255,255,255,0.85)]"
            >
              <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-7 sm:py-5">
                <div className="mb-2 flex items-center justify-between gap-3 sm:mb-3 sm:gap-4">
                  <div className="inline-flex rounded-2xl bg-white/80 p-2.5 text-slate-700 shadow-sm ring-1 ring-slate-200/80 backdrop-blur sm:p-3">
                    <CardIcon className="h-5 w-5" />
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white/75 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.18em]">
                    {current.eyebrow}
                  </div>
                </div>
                <h1 className="text-lg font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                  {current.title}
                </h1>
              </div>

              <div
                className={`px-4 py-3 sm:px-7 ${step === 1 ? "sm:min-h-[300px] sm:py-7" : closeMode ? "sm:min-h-[260px] sm:py-6" : "sm:py-5"}`}
              >
{current.intro && (
  <p className="text-[13px] leading-5 text-slate-600 sm:text-base sm:leading-7">
    <MarkdownText text={current.intro} />
  </p>
)}

{current.bullets.length > 0 && (
  <div className="mx-auto my-3 h-px w-[88%] bg-slate-400/90 sm:my-4" />
)}

{current.bullets.length > 0 && (
  <ul className="mt-0 space-y-2 text-[13px] leading-5 text-slate-700 sm:space-y-3 sm:text-base sm:leading-6">
    {current.bullets.map((item) => (
      <WizardBullet key={item} item={item} />
    ))}
  </ul>
)}

                {current.closing && (
                  <div className="mt-3 border-t border-slate-100 pt-2 text-[13px] font-medium leading-5 text-slate-700 sm:mt-5 sm:pt-3 sm:text-base sm:leading-6">
                    <MarkdownText text={current.closing} />
                  </div>
                )}

                {isDemoSelectStep && (
                  <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3">
                    <DemoLaunchButton
                      href="/informational?mode=self_drive"
                      icon={Map}
                      eyebrow="Informational self-drive experience"
                      title="NexaPath Advisory"
                      description="For service sites where the goal is discovery, qualification, and lead direction."
                    />
                    <DemoLaunchButton
                      href="/transactional?mode=self_drive"
                      icon={Hotel}
                      eyebrow="Transactional self-drive experience"
                      title="Domi Coast Resort"
                      description="For commerce sites where the goal is option filtering and sales completion."
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-2 flex w-full max-w-2xl items-center justify-between gap-3 sm:mt-4">
          <button
            type="button"
            onClick={() => {
              if (closeMode) {
                window.location.href = "/";
                return;
              }
              setStep((value) => Math.max(0, value - 1));
            }}
            disabled={!closeMode && step === 0}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] disabled:pointer-events-none disabled:opacity-0 sm:px-4 sm:py-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {closeMode ? "Run another demo" : "Back"}
          </button>

          {!closeMode && !isLastStep && (
            <button
              type="button"
              onClick={() => setStep((value) => Math.min(launchSteps.length - 1, value + 1))}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_34px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] sm:px-5 sm:py-2.5"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
