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
      className="group block overflow-hidden rounded-[20px] border border-white/70 bg-white/92 p-3.5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/[0.03] backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40 sm:rounded-[28px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.10em] text-slate-500 sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.18em]">
            {modeLabel}
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white sm:h-10 sm:w-10">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-3 sm:mt-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
          {eyebrow}
        </div>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-[1.35rem]">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">{description}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
        {bullets.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 sm:px-3 sm:py-1 sm:text-xs"
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight sm:text-lg">TourBot Demo</div>
              <div className="text-[11px] text-slate-500 sm:text-sm">Guided Discovery + Guided Commerce</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
            <Sparkles className="h-4 w-4 text-slate-500" />
            Choose a playground
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8 lg:py-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm sm:px-4 sm:py-2 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            Public launch selector
          </div>

          <h1 className="mt-3 max-w-3xl text-[1.85rem] font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:mt-4 sm:text-4xl md:text-5xl">
            TourBot turns dense websites into guided conversations.
          </h1>

          <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-4 sm:text-base sm:leading-7">
            TourBot answers questions, guides users through the right site sections,
            and preloads forms or booking steps from natural-language intent.
          </p>

          <div className="mt-4 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
            <a
              href="/discovery"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto sm:text-sm"
            >
              Open Discovery Playground
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="/commerce"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/80 px-4 py-2.5 text-[13px] font-semibold text-slate-900 shadow-sm transition hover:bg-white sm:w-auto sm:text-sm"
            >
              Open Commerce Playground
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid gap-2.5 sm:gap-4">
          <DemoCard
            eyebrow="Guided Discovery Playground"
            title="NexaPath Advisory"
            description="A self-drive B2B advisory playground where visitors can explore the site directly or activate TourBot to answer questions, select the right section, and walk them through a multi-step discovery path."
            href="/discovery"
            icon={Map}
            bullets={["B2B services", "Site navigation", "Multi-step tours"]}
          />

          <DemoCard
            eyebrow="Guided Commerce Playground"
            title="StayPilot Suites"
            description="A self-drive hotel-booking playground where visitors can browse normally or activate TourBot to interpret natural-language intent, refine missing details, rank options, and preload booking context."
            href="/commerce"
            icon={Hotel}
            bullets={["Hotel booking", "Intent capture", "Form preload"]}
          />
        </div>
      </section>
    </main>
  );
}
