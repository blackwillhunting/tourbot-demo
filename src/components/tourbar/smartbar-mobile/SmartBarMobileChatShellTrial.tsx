import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";

type TrialMessage = {
  id: string;
  role: "smartbar" | "visitor" | "consultant";
  label: string;
  body: string;
};

type SmartBarMobileGrowingChatShellProps = {
  initialContext?: string;
  clearScreen?: boolean;
};

const DEFAULT_CONTEXT = "hedge fund, IT support, Copilot setup, pricing, and handoff request";

function compactContext(value?: string) {
  return (value || DEFAULT_CONTEXT)
    .replace(/^context received\s*[—:-]\s*/i, "")
    .replace(/^visitor asked:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scriptedMessages(initialContext?: string): TrialMessage[] {
  const context = compactContext(initialContext);

  return [
    {
      id: "context",
      role: "smartbar",
      label: "SmartBar",
      body: `Context received — ${context}.`,
    },
    {
      id: "consultant-open",
      role: "consultant",
      label: "Consultant",
      body: "Hi there — so you're interested in Copilots?",
    },
    {
      id: "visitor-pricing",
      role: "visitor",
      label: "You",
      body: "Hi, I'm curious about your pricing",
    },
    {
      id: "consultant-call",
      role: "consultant",
      label: "Consultant",
      body: "Sure, lets set up a call.",
    },
  ];
}

function messageClass(role: TrialMessage["role"]) {
  if (role === "visitor") {
    return "ml-9 border border-sky-100/55 bg-sky-300/94 text-slate-950 shadow-[0_8px_18px_rgba(14,165,233,0.16)] ring-sky-100/40";
  }

  if (role === "smartbar") {
    return "mr-9 border border-white/18 bg-slate-200/88 text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.10)] ring-white/16";
  }

  return "mr-9 border border-emerald-100/46 bg-emerald-300/92 text-slate-950 shadow-[0_8px_18px_rgba(16,185,129,0.16)] ring-emerald-100/36";
}

export function SmartBarMobileGrowingChatShell({
  initialContext,
  clearScreen = false,
}: SmartBarMobileGrowingChatShellProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [draft, setDraft] = useState("");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const messages = scriptedMessages(initialContext);

  useEffect(() => {
    const timeouts: number[] = [];
    const intervals: number[] = [];

    timeouts.push(window.setTimeout(() => setVisibleCount(1), 520));
    timeouts.push(window.setTimeout(() => setVisibleCount(2), 1320));

    timeouts.push(window.setTimeout(() => {
      const text = messages[2].body;
      let index = 0;

      const typingTimer = window.setInterval(() => {
        index += 1;
        setDraft(text.slice(0, index));

        if (index >= text.length) {
          window.clearInterval(typingTimer);

          timeouts.push(window.setTimeout(() => {
            setDraft("");
            setVisibleCount(3);

            timeouts.push(window.setTimeout(() => {
              setVisibleCount(4);
            }, 900));
          }, 620));
        }
      }, 32);

      intervals.push(typingTimer);
    }, 2150));

    return () => {
      timeouts.forEach((timer) => window.clearTimeout(timer));
      intervals.forEach((timer) => window.clearInterval(timer));
    };
    // Run once for this mounted handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleMessages = messages.slice(0, visibleCount);
  const isOpen = visibleMessages.length > 0;

  useLayoutEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;

    const pinToNewest = () => {
      node.scrollTop = node.scrollHeight;
    };

    pinToNewest();
    window.requestAnimationFrame(pinToNewest);
    const timer = window.setTimeout(pinToNewest, 280);

    return () => window.clearTimeout(timer);
  }, [visibleCount, draft]);

  return (
    <main className={`fixed inset-0 overflow-hidden ${clearScreen ? "bg-white" : "bg-transparent"} text-slate-950`}>
      <section className="pointer-events-none fixed inset-x-0 bottom-[14px] z-[10080] flex justify-center px-6">
        <div
          data-smartbar-chat-trial-shell="true"
          className="pointer-events-auto relative flex max-h-[67dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-[34px] border border-white/34 bg-[radial-gradient(circle_at_78%_18%,rgba(103,232,249,0.22)_0%,rgba(103,232,249,0.11)_20%,transparent_46%),linear-gradient(180deg,rgba(226,232,240,0.42)_0%,rgba(148,163,184,0.50)_36%,rgba(71,85,105,0.58)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_0_34px_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(15,23,42,0.50),0_22px_52px_rgba(2,6,23,0.44),0_6px_18px_rgba(2,6,23,0.28)] backdrop-blur-[38px] transition-[max-height] duration-500 ease-out"
        >
          {isOpen && (
            <div
              ref={transcriptRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[28px] border border-white/14 bg-slate-950/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.16)] ring-1 ring-white/10 [scrollbar-width:thin]"
            >
              <div className="flex min-h-full flex-col justify-end space-y-2 px-3 py-2">
                {visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`animate-[smartbarNexaBubbleIn_260ms_ease-out] rounded-[20px] px-3 py-2 text-sm font-semibold leading-5 ring-1 ${messageClass(message.role)}`}
                  >
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950/54">
                      {message.label}
                    </div>
                    <span className="whitespace-pre-wrap">{message.body}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form className={`${isOpen ? "mt-2" : ""} shrink-0 rounded-[28px] border border-white/14 bg-slate-950/58 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.16)] ring-1 ring-white/10`}>
            <div className="flex h-[46px] items-center gap-2 rounded-[22px] bg-white/[0.12] px-3 ring-1 ring-white/12">
              <div className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-white/90">
                {draft || "Message consultant…"}
                {draft && <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-white/80" />}
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-emerald-100/42"
                aria-label="Send consultant message"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-3 flex h-[52px] shrink-0 items-center justify-between rounded-[999px] border border-transparent bg-transparent px-1">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-950/78">
              ×
            </div>
            <div className="inline-flex h-11 flex-1 items-center justify-center rounded-full px-4 text-[13px] font-black tracking-[-0.01em] text-slate-950/84">
              {isOpen ? "SmartBar" : "Ask SmartBar"}
            </div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-950/78">
              ↓
            </div>
          </div>

          <style>
            {`
              @keyframes smartbarNexaBubbleIn {
                from {
                  opacity: 0;
                  transform: translateY(8px) scale(0.985);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}
          </style>
        </div>
      </section>
    </main>
  );
}

export default function SmartBarMobileChatShellTrial() {
  return <SmartBarMobileGrowingChatShell clearScreen />;
}
