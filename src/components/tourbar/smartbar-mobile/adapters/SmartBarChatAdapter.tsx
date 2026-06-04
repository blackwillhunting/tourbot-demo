import { useRef, useState, type FormEvent } from "react";
import { SendHorizonal } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericResult,
  type SmartBarMobileSubmitResult,
} from "../SmartBarMobileShell";

type SmartBarMobileChatMessage = {
  id: string;
  role: "visitor" | "smartbar" | "consultant";
  body: string;
  status?: "thinking" | "done";
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function chatMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function consultantReplyFor(message: string) {
  const lower = message.toLowerCase();

  if (/price|pricing|cost|budget/.test(lower)) {
    return "Absolutely — pricing usually depends on scope, implementation depth, and how much workflow/context mapping is needed. I’d start by separating advisory, pilot, and full rollout so the buyer sees a clear path.";
  }

  if (/demo|show|example|case|proof/.test(lower)) {
    return "Yes — the strongest demo path is to show one messy buyer question, SmartBar finding the right lane, then the chat handoff inheriting that context instead of starting over.";
  }

  if (/timeline|time|launch|implement/.test(lower)) {
    return "A practical rollout would start with a narrow site scan, a lane map, and a small set of guided actions. Then you expand once the first buyer path is working cleanly.";
  }

  return "Got it. I’d treat that as a buyer-readiness question and keep the answer practical: what problem are they trying to solve, what site path should SmartBar guide, and when should the handoff happen?";
}

function SmartBarMobileChatSurface({ initialContext }: { initialContext: string }) {
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<SmartBarMobileChatMessage[]>(() => [
    {
      id: "smartbar-context",
      role: "smartbar",
      body: initialContext
        ? `Context received: ${initialContext}`
        : "Context received — handing this to a consultant.",
    },
    {
      id: "consultant-open",
      role: "consultant",
      body: "Hi — I have the SmartBar context. What would you like to cover first?",
    },
  ]);
  const [isWaiting, setIsWaiting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = compactText(draft);
    if (!text || isWaiting) return;

    const thinkingId = chatMessageId("consultant-thinking");
    setDraft("");
    setIsWaiting(true);
    setThread((current) => [
      ...current,
      { id: chatMessageId("visitor"), role: "visitor", body: text },
      { id: thinkingId, role: "consultant", body: "Reading the context…", status: "thinking" },
    ]);

    window.setTimeout(() => {
      setThread((current) => current.map((message) => {
        if (message.id !== thinkingId) return message;
        return {
          ...message,
          body: consultantReplyFor(text),
          status: "done",
        };
      }));
      setIsWaiting(false);
      window.requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }, 900);
  };

  return (
    <div className="overflow-hidden rounded-[26px] border border-white/14 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/10">
      <div
        ref={scrollRef}
        className="max-h-[min(46svh,420px)] space-y-2 overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {thread.map((message) => {
          const visitor = message.role === "visitor";
          const smartbar = message.role === "smartbar";

          return (
            <div
              key={message.id}
              className={`rounded-[20px] px-3 py-2.5 text-sm font-semibold leading-5 ring-1 ${
                visitor
                  ? "ml-8 bg-sky-200/92 text-slate-950 ring-sky-100/40"
                  : smartbar
                    ? "mr-8 bg-white/[0.10] text-white/76 ring-white/12"
                    : "mr-8 bg-slate-900/92 text-white/86 ring-white/14"
              }`}
            >
              <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${visitor ? "text-slate-950/54" : "text-white/42"}`}>
                {visitor ? "You" : smartbar ? "SmartBar" : "Consultant"}
              </div>
              <span className="whitespace-pre-wrap">
                {message.status === "thinking" ? "Reading the context…" : message.body}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="border-t border-white/10 px-3 py-2.5">
        <div className="flex items-end gap-2 rounded-[22px] bg-white/[0.08] px-3 py-2 ring-1 ring-white/10">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Message consultant…"
            className="max-h-24 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1 text-sm font-semibold leading-5 text-white outline-none placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isWaiting}
            className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-200/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-sky-100/42 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Send consultant message"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function buildChatResult(initialContext: string): SmartBarMobileGenericResult {
  return {
    surfaceKind: "chat",
    eyebrow: "Live handoff",
    title: "Consultant chat",
    statusLabel: "Chat open",
    height: 560,
    content: <SmartBarMobileChatSurface initialContext={initialContext} />,
  };
}

export default function SmartBarChatAdapter() {
  const autoSubmission = useRef<SmartBarMobileDemoSubmission>({
    id: 1,
    query: "Open consultant chat",
  });

  const submitPrompt = async (query: string): Promise<SmartBarMobileSubmitResult> => {
    return buildChatResult(query === "Open consultant chat" ? "" : query);
  };

  return (
    <SmartBarMobileShell
      mode="overlay"
      entryModeLabel="Open chat"
      buildingLabel="Opening chat..."
      demoSubmission={autoSubmission.current}
      onSubmitPrompt={submitPrompt}
    />
  );
}
