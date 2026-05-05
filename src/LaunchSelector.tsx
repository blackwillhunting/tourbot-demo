import React from "react";
import { ArrowRight, Compass, Hotel, Map, Sparkles } from "lucide-react";

function DemoCard({
  eyebrow,
  title,
  description,
  href,
  icon: Icon,
  bullets,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: string[];
}) {
  return (
    <a
      href={href}
      className="group block overflow-hidden rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/[0.03] backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-13 w-13 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-sm">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-7">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {bullets.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">TourBot Demo</div>
              <div className="text-sm text-slate-500">Guided Discovery + Guided Commerce</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
            <Sparkles className="h-4 w-4 text-slate-500" />
            Choose an experience
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Public launch selector
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
            TourBot turns dense websites into guided conversations.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            TourBot answers questions, guides users through the right site sections,
            and preloads forms or booking steps from natural-language intent.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/discovery"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Open Guided Discovery
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="/commerce"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white"
            >
              Open Guided Commerce
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="grid gap-5">
          <DemoCard
            eyebrow="Guided Discovery"
            title="NexaPath Advisory"
            description="A B2B advisory-style demo that shows TourBot answering questions, selecting the right site section, and walking visitors through a multi-step discovery path."
            href="/discovery"
            icon={Map}
            bullets={["B2B services", "Site navigation", "Multi-step tours"]}
          />

          <DemoCard
            eyebrow="Guided Commerce"
            title="StayPilot Suites"
            description="A hotel-booking demo that shows TourBot interpreting natural-language intent, refining missing details, ranking options, and preloading booking context."
            href="/commerce"
            icon={Hotel}
            bullets={["Hotel booking", "Intent capture", "Form preload"]}
          />
        </div>
      </section>
    </main>
  );
}
