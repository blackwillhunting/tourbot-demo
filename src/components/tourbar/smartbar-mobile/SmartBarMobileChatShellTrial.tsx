import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, MessageCircle, SendHorizonal, X } from "lucide-react";

type TrialMessage = {
  id: string;
  role: "smartbar" | "visitor" | "consultant";
  label: string;
  body: string;
};

type SmartBarMobileGrowingChatShellProps = {
  initialContext?: string;
  clearScreen?: boolean;
  onClose?: () => void;
  showFooterControls?: boolean;
  messageDelayMs?: number;
  finalActionDelayMs?: number;
  autoCloseGapMs?: number;
};



function scriptedMessages(_initialContext?: string): TrialMessage[] {
  return [
    {
      id: "context",
      role: "smartbar",
      label: "System",
      body: "Transferring context for chat.",
    },
    {
      id: "consultant-open",
      role: "consultant",
      label: "Consultant",
      body: "Hi there — I see you're interested in Copilots?",
    },
    {
      id: "visitor-pricing",
      role: "visitor",
      label: "Visitor",
      body: "Hi, yes I'm curious about pricing",
    },
    {
      id: "consultant-call",
      role: "consultant",
      label: "Consultant",
      body: "Great! Let's chat or set up a call.",
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

function chatMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function consultantReplyFor(message: string) {
  const lower = message.toLowerCase();

  if (/price|pricing|cost|budget/.test(lower)) {
    return "Sure — I can help get pricing started. The useful next step is a short discovery call so we can scope the right pilot.";
  }

  if (/demo|case|example|proof|study/.test(lower)) {
    return "Yes — the best proof path is one realistic buyer question, one SmartBar guided answer, then a handoff where the context follows the visitor.";
  }

  return "Got it. I’d keep this practical: what the visitor needs, which site path SmartBar found, and what context should follow into the human conversation.";
}

export function SmartBarMobileGrowingChatShell({
  initialContext,
  clearScreen = false,
  onClose,
  showFooterControls = false,
  messageDelayMs = 2000,
  finalActionDelayMs = 2000,
  autoCloseGapMs = 700,
}: SmartBarMobileGrowingChatShellProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [sentMessages, setSentMessages] = useState<TrialMessage[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const messages = scriptedMessages(initialContext);

  useEffect(() => {
    const timeouts: number[] = [];
    const intervals: number[] = [];
    const shouldAutoExit = showFooterControls && Boolean(onClose);
    const visitorMessage = messages[2]?.body || "";
    const visitorTypeEveryMs = Math.max(24, Math.min(70, Math.round(messageDelayMs / 48)));

    timeouts.push(window.setTimeout(() => {
      setVisibleCount(1);
    }, 0));

    timeouts.push(window.setTimeout(() => {
      setVisibleCount(2);
    }, messageDelayMs));

    timeouts.push(window.setTimeout(() => {
      let index = 0;
      setDraft("");

      const typingTimer = window.setInterval(() => {
        index += 1;
        setDraft(visitorMessage.slice(0, index));

        if (index >= visitorMessage.length) {
          window.clearInterval(typingTimer);
          setDraft("");
          setVisibleCount(3);

          timeouts.push(window.setTimeout(() => {
            setVisibleCount(4);

            if (shouldAutoExit) {
              timeouts.push(window.setTimeout(() => {
                setCollapsed(true);

                timeouts.push(window.setTimeout(() => {
                  onClose?.();
                }, autoCloseGapMs));
              }, finalActionDelayMs));
            }
          }, messageDelayMs));
        }
      }, visitorTypeEveryMs);

      intervals.push(typingTimer);
    }, messageDelayMs * 2));

    return () => {
      timeouts.forEach((timer) => window.clearTimeout(timer));
      intervals.forEach((timer) => window.clearInterval(timer));
    };
    // Run once for this mounted handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleMessages = [...messages.slice(0, visibleCount), ...sentMessages];
  const isOpen = visibleMessages.length > 0;
  const manualChatReady = visibleCount >= messages.length;
  const canSend = manualChatReady && draft.trim().length > 0;

  const submitChatMessage = (event?: FormEvent) => {
    event?.preventDefault();

    const text = draft.trim();
    if (!text || !manualChatReady) return;

    setDraft("");
    setSentMessages((current) => [
      ...current,
      {
        id: chatMessageId("visitor"),
        role: "visitor",
        label: "You",
        body: text,
      },
    ]);

    window.setTimeout(() => {
      setSentMessages((current) => [
        ...current,
        {
          id: chatMessageId("consultant"),
          role: "consultant",
          label: "Consultant",
          body: consultantReplyFor(text),
        },
      ]);
    }, 650);
  };

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
  }, [visibleCount, draft, sentMessages]);

  const shellBottomClass = clearScreen ? "bottom-[14px]" : "bottom-[104px]";
  const shellMaxHeightClass = clearScreen ? "max-h-[67dvh]" : "max-h-[calc(67dvh-112px)]";

  return (
    <main className={`fixed inset-0 z-[10070] overflow-hidden ${clearScreen ? "pointer-events-auto bg-white" : "pointer-events-none bg-transparent"} text-slate-950`}>
      {(!collapsed || clearScreen) && (
        <section className={`pointer-events-none fixed inset-x-0 ${shellBottomClass} z-[10080] flex justify-center px-6`}>
        <div
          data-smartbar-chat-trial-shell="true"
          className={`pointer-events-auto relative flex ${shellMaxHeightClass} w-full max-w-[390px] flex-col overflow-hidden rounded-[34px] border border-white/34 bg-[radial-gradient(circle_at_78%_18%,rgba(103,232,249,0.22)_0%,rgba(103,232,249,0.11)_20%,transparent_46%),linear-gradient(180deg,rgba(226,232,240,0.42)_0%,rgba(148,163,184,0.50)_36%,rgba(71,85,105,0.58)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_0_34px_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(15,23,42,0.50),0_22px_52px_rgba(2,6,23,0.44),0_6px_18px_rgba(2,6,23,0.28)] backdrop-blur-[38px] transition-[max-height] duration-500 ease-out`}
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

          <form
            onSubmit={submitChatMessage}
            className={`${isOpen ? "mt-2" : ""} shrink-0 rounded-[28px] border border-white/14 bg-slate-950/58 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.16)] ring-1 ring-white/10`}
          >
            <div className="flex min-h-[46px] items-end gap-2 rounded-[22px] bg-white/[0.12] px-3 py-1.5 ring-1 ring-white/12">
              <textarea
                value={draft}
                disabled={!manualChatReady}
                rows={1}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitChatMessage();
                  }
                }}
                placeholder={manualChatReady ? "Message consultant…" : "Message consultant…"}
                className="max-h-24 min-h-8 min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1 text-sm font-semibold leading-5 text-white outline-none placeholder:text-white/54 disabled:cursor-default disabled:opacity-100"
              />
              {!manualChatReady && draft ? (
                <span className="mb-2 inline-block h-4 w-1 animate-pulse rounded-full bg-white/80" />
              ) : null}
              <button
                type="submit"
                disabled={!canSend}
                className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-emerald-100/42 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send consultant message"
              >
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          </form>

          {clearScreen && (
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
          )}

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
      )}
      {!clearScreen && showFooterControls && (
        <section className="pointer-events-none fixed right-3 top-[42dvh] z-[2147483647] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/34 bg-[linear-gradient(180deg,rgba(226,232,240,0.58)_0%,rgba(148,163,184,0.64)_48%,rgba(71,85,105,0.70)_100%)] text-slate-950/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),inset_0_0_24px_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(15,23,42,0.42),0_16px_34px_rgba(2,6,23,0.30)] backdrop-blur-[38px] transition active:scale-95"
            aria-label="End consultant chat"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="pointer-events-auto inline-flex min-h-[54px] min-w-[54px] flex-col items-center justify-center gap-1 rounded-full border border-white/34 bg-[linear-gradient(180deg,rgba(226,232,240,0.58)_0%,rgba(148,163,184,0.64)_48%,rgba(71,85,105,0.70)_100%)] px-3 py-2 text-slate-950/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),inset_0_0_24px_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(15,23,42,0.42),0_16px_34px_rgba(2,6,23,0.30)] backdrop-blur-[38px] transition active:scale-95"
            aria-label={collapsed ? "Reopen consultant chat" : "Minimize consultant chat"}
          >
            <MessageCircle className="h-5 w-5" />
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </section>
      )}
    </main>
  );
}

export default function SmartBarMobileChatShellTrial() {
  return <SmartBarMobileGrowingChatShell clearScreen />;
}
