import React from "react";
import { ArrowRight, Compass, Hotel, Map, Sparkles } from "lucide-react";

function DemoCard({
  eyebrow,
  title,
  description,
  href,
  icon: Icon,
  bullets,
  modeLabel = "Self-drive playground",
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: string[];
  modeLabel?: string;
}) {
  return (
    <a
      href={href}
      className="group block overflow-hidden rounded-[16px] border border-white/70 bg-white/92 p-2.5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/[0.03] backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40 sm:rounded-[28px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl">
          <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.10em] text-slate-500 sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.18em]">
            {modeLabel}
          </span>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white sm:h-10 sm:w-10">
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>

      <div className="mt-2 sm:mt-5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-[1.35rem]">
          {title}
        </h2>
        <p className="mt-1 text-[12px] leading-4 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden sm:mt-2 sm:text-sm sm:leading-6 sm:[-webkit-line-clamp:unset]">{description}</p>
      </div>

      <div className="mt-2 hidden flex-wrap gap-1.5 sm:mt-5 sm:flex sm:gap-2">
        {bullets.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 sm:px-3 sm:py-1 sm:text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </a>
  );
}

export default function LaunchSelector() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.10),_transparent_34%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_45%,_#f8fafc_100%)] text-slate-950">
      <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[13px] font-semibold tracking-tight sm:text-lg">TourBot Demo</div>
              <div className="text-[10px] text-slate-500 sm:text-sm">Discovery foundation + Commerce layer</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
            <Sparkles className="h-4 w-4 text-slate-500" />
            Choose a playground
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:px-6 sm:py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8 lg:py-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm sm:px-4 sm:py-2 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            Public launch selector
          </div>

          <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:mt-4 sm:text-4xl md:text-5xl">
            TourBot turns complex websites into guided discovery and guided decisions.
          </h1>

          <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-600 sm:mt-4 sm:text-base sm:leading-7">
            TourBot answers general questions, guides users through the right site sections,
            then layers commerce intelligence on top: ranking options, capturing missing details, and preloading next steps.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
            <a
              href="/informational"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto sm:text-sm"
            >
              Open Discovery Playground
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="/transactional"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white sm:w-auto sm:text-sm"
            >
              Open Commerce Playground
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-4">
          <DemoCard
            eyebrow="Guided Discovery Playground"
            title="NexaPath Advisory"
            description="A self-drive B2B advisory playground where visitors can explore the site directly or activate TourBot to answer questions, select the right section, and walk them through a multi-step discovery path."
            href="/informational"
            icon={Map}
            bullets={["B2B services", "Site navigation", "Multi-step tours"]}
          />

          <DemoCard
            eyebrow="Guided Commerce Playground"
            title="Domi Coast Resort & Conference Hotel"
            description="A self-drive resort and conference-hotel playground where visitors can ask general property questions, explore rooms and experiences, compare options, refine missing details, and preload booking context."
            href="/transactional"
            icon={Hotel}
            bullets={["Resort discovery", "Option ranking", "Booking preload"]}
          />
        </div>
      </section>
    </main>
  );
}
