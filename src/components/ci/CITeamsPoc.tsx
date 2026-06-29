import React, { useEffect } from "react";
import {
  Bell,
  CalendarDays,
  CircleUserRound,
  Compass,
  Files,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import GuideShellStatic from "../GuideShellStatic";
import { resolveCiGuideAiFixture } from "./ciGuideAiFixture";

const appRail = [
  { label: "Activity", icon: Bell, active: false },
  { label: "Chat", icon: MessageSquare, active: false },
  { label: "Copilot", icon: Sparkles, active: false },
  { label: "Teams", icon: Users, active: false },
  { label: "Apex", icon: Compass, active: true },
  { label: "Calendar", icon: CalendarDays, active: false },
  { label: "Files", icon: Files, active: false },
];

function RailButton({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-[11px] font-semibold transition ${
        active
          ? "bg-white text-[#464775] shadow-sm"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute left-[-7px] top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white" />
      ) : null}
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

function useCiGuideAiFixtureFetch() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const isGuideAiCall =
        url.endsWith("/api/guide_ai") || url.includes("/api/guide_ai?");

      if (!isGuideAiCall) {
        return originalFetch(input, init);
      }

      let requestBody: { message?: string; conversationContext?: unknown } = {};
      try {
        requestBody = init?.body ? JSON.parse(String(init.body)) : {};
      } catch {
        requestBody = {};
      }

      const body = resolveCiGuideAiFixture({
        message: requestBody.message || "",
        conversationContext: requestBody.conversationContext as never,
      });

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

export default function CITeamsPoc() {
  useCiGuideAiFixtureFetch();

  return (
    <main className="h-[100svh] overflow-hidden bg-[#f3f2f1] text-slate-950 sm:h-screen">
      <div className="flex h-full min-h-0">
        {/* This is the Teams host chrome: Apex appears as a personal app in the left app rail, adjacent to Copilot. */}
        <aside className="hidden w-[78px] shrink-0 flex-col gap-2 bg-[#202336] px-2 py-3 text-white md:flex">
          <div className="mb-2 flex h-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-black tracking-tight">
            T
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            {appRail.map((item) => (
              <RailButton
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={item.active}
              />
            ))}
          </div>
        </aside>

        {/* The remaining area is the Teams viewport where the selected personal app is embedded. */}
        <section className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-[#f7f7fb] px-3 md:px-5">
            <div className="hidden h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 md:flex">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search or type a command</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-slate-500">
              <Bell className="h-5 w-5" />
              <CircleUserRound className="h-6 w-6" />
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="min-h-0 flex-1">
              <GuideShellStatic
                shellPlacement="teamsViewport"
                guideConfig={{
                  mode: "hidden_cart",
                  catalogMode: "ci_command",
                  label: "Apex",
                  features: {
                    refinementChips: true,
                    bookingActions: false,
                    navigation: false,
                  },
                }}
                initialShellState="panel"
                suppressWelcomeCard
                demoStatus="idle"
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
