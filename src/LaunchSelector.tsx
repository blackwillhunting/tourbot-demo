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

const steps: WizardStep[] = [
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
    title: "Choose a demo path.",
    intro: "Choose a self-drive demo path below.",
    bullets: [
      "**Informational** — service discovery, qualification, and lead direction.",
      "**Transactional** — option filtering, add-ons, and booking or sales completion.",
    ],
  },
];

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
      {steps.map((item, index) => (
        <span
          key={item.eyebrow}
          className={
            "h-2 rounded-full transition-all " +
            (index === step ? "w-8 bg-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.20)]" : "w-2 bg-slate-300")
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
    <li className="flex gap-3">
      <span className="mt-2.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.16)]">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
      </span>
      <span className="min-w-0">
        <MarkdownText text={mainLine} className="block" />
        {subText && (
          <MarkdownText
            text={subText}
            className="mt-1 block border-l border-slate-200 pl-3 text-xs leading-5 text-slate-500 sm:text-sm"
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
      className="group flex w-full items-start gap-4 rounded-[22px] bg-slate-950 p-3 text-left text-white shadow-[0_14px_34px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_42px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 transition group-hover:bg-white/15">
        <Icon className="h-5 w-5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {eyebrow}
        </span>
        <span className="mt-1 block text-base font-semibold tracking-tight sm:text-lg">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-300 sm:text-sm">
          {description}
        </span>
      </span>
      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </a>
  );
}

export default function LaunchSelector() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  const cardIcon = useMemo(() => {
    if (step === 0) return Sparkles;
    if (step === 1) return ShoppingCart;
    return Compass;
  }, [step]);
  const CardIcon = cardIcon;

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)] text-slate-950">
      <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[13px] font-semibold tracking-tight sm:text-lg">
                TourBot Demo
              </div>
              <div className="text-[10px] text-slate-500 sm:text-sm">
                Guided buying for visible and implied carts
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
            <Sparkles className="h-4 w-4 text-slate-500" />
            Step {step + 1} of {steps.length}
          </div>
        </div>
      </header>

      <section className="mx-auto flex h-[calc(100vh-57px)] max-w-5xl flex-col items-center justify-center px-4 py-3 sm:h-[calc(100vh-69px)] sm:px-6 sm:py-5">
        <ProgressDots step={step} />

        <div className="relative mt-3 w-full max-w-2xl sm:mt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 28, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -28, scale: 0.985 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/94 shadow-[0_28px_80px_rgba(15,23,42,0.16),inset_0_2px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-950/[0.04] backdrop-blur-xl transition-transform duration-300 before:absolute before:-inset-6 before:-z-10 before:rounded-[40px] before:bg-indigo-900/[0.07] before:blur-3xl hover:-translate-y-0.5 hover:shadow-[0_34px_90px_rgba(15,23,42,0.18),inset_0_2px_0_rgba(255,255,255,0.85)] sm:rounded-[32px]"
            >
              <div className="border-b border-slate-950/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:px-7 sm:py-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="inline-flex rounded-2xl bg-white/10 p-3 text-white backdrop-blur">
                    <CardIcon className="h-5 w-5" />
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    {current.eyebrow}
                  </div>
                </div>
                <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  {current.title}
                </h1>
              </div>

              <div
                className={`px-5 py-4 sm:px-7 ${step === 1 ? "sm:min-h-[300px] sm:py-7" : "sm:py-5"}`}
              >
{current.intro && (
  <p className="text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
    <MarkdownText text={current.intro} />
  </p>
)}

{step < 2 && (
  <div className="mx-auto my-4 h-px w-[88%] bg-slate-400/90" />
)}

<ul className={`${step < 2 ? "mt-0" : "mt-4"} space-y-3 text-sm leading-6 text-slate-700 sm:text-base`}>
  {current.bullets.map((item) => (
    <WizardBullet key={item} item={item} />
  ))}
</ul>

                {current.closing && (
                  <div className="mt-5 border-t border-slate-100 pt-3 text-sm font-medium leading-6 text-slate-700 sm:text-base">
                    <MarkdownText text={current.closing} />
                  </div>
                )}

                {isLastStep && (
                  <div className="mt-4 grid gap-3">
                    <DemoLaunchButton
                      href="/informational"
                      icon={Map}
                      eyebrow="Informational self-drive path"
                      title="NexaPath Advisory"
                      description="For service sites where the goal is discovery, qualification, and lead direction."
                    />
                    <DemoLaunchButton
                      href="/transactional"
                      icon={Hotel}
                      eyebrow="Transactional self-drive path"
                      title="Domi Coast Resort"
                      description="For commerce sites where the goal is option filtering and sales completion."
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex w-full max-w-2xl items-center justify-between gap-3 sm:mt-4">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(15,23,42,0.12)] disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>

          {!isLastStep && (
            <button
              type="button"
              onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_34px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.12)]"
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
