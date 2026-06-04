import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
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

const SMARTBAR_MOBILE_CHAT_THREAD_STORAGE_KEY = "smartbar_mobile_chat_thread_v1";

function defaultChatThread(initialContext: string): SmartBarMobileChatMessage[] {
  return [
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
  ];
}

function smartBarMobileChatMessageIsValid(value: unknown): value is SmartBarMobileChatMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SmartBarMobileChatMessage>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "visitor" || candidate.role === "smartbar" || candidate.role === "consultant") &&
    typeof candidate.body === "string"
  );
}

function readPersistedChatThread(initialContext: string): SmartBarMobileChatMessage[] {
  if (typeof window === "undefined") return defaultChatThread(initialContext);

  try {
    const raw = window.localStorage.getItem(SMARTBAR_MOBILE_CHAT_THREAD_STORAGE_KEY);
    if (!raw) return defaultChatThread(initialContext);

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(smartBarMobileChatMessageIsValid)) {
      return defaultChatThread(initialContext);
    }

    return parsed.map((message) => ({
      ...message,
      status: message.status === "thinking" ? "done" : message.status,
    }));
  } catch {
    return defaultChatThread(initialContext);
  }
}

function persistChatThread(thread: SmartBarMobileChatMessage[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SMARTBAR_MOBILE_CHAT_THREAD_STORAGE_KEY,
      JSON.stringify(thread),
    );
  } catch {
    // Storage can fail in private mode or when full. Chat still works in-memory.
  }
}

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
  const [thread, setThread] = useState<SmartBarMobileChatMessage[]>(() => readPersistedChatThread(initialContext));
  const [isWaiting, setIsWaiting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeDraftInput = () => {
    const node = draftRef.current;
    if (!node) return;

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 112)}px`;
  };

  useEffect(() => {
    resizeDraftInput();
  }, [draft]);

  useEffect(() => {
    persistChatThread(thread);
  }, [thread]);

  useLayoutEffect(() => {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [thread, isWaiting]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = compactText(draft);
    if (!text || isWaiting) return;

    const thinkingId = chatMessageId("consultant-thinking");
    setDraft("");
    window.requestAnimationFrame(resizeDraftInput);
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
    <div className="overflow-hidden rounded-[26px] border border-white/14 bg-slate-950/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(2,6,23,0.16)] ring-1 ring-white/10">
      <div
        ref={scrollRef}
        className="max-h-[min(58svh,500px)] space-y-2 overflow-y-auto px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {thread.map((message) => {
          const visitor = message.role === "visitor";
          const smartbar = message.role === "smartbar";

          return (
            <div
              key={message.id}
              className={`rounded-[20px] px-3 py-2.5 text-sm font-semibold leading-5 ring-1 ${
                visitor
                  ? "ml-8 border border-sky-100/50 bg-sky-300/92 text-slate-950 shadow-[0_8px_18px_rgba(14,165,233,0.16)] ring-sky-100/40"
                  : smartbar
                    ? "mr-8 border border-white/16 bg-slate-200/82 text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.10)] ring-white/16"
                    : "mr-8 border border-emerald-100/42 bg-emerald-300/88 text-slate-950 shadow-[0_8px_18px_rgba(16,185,129,0.16)] ring-emerald-100/34"
              }`}
            >
              <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950/54`}>
                {visitor ? "You" : smartbar ? "SmartBar" : "Consultant"}
              </div>
              <span className="whitespace-pre-wrap">
                {message.status === "thinking" ? "Reading the context…" : message.body}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="border-t border-white/10 px-3 py-2">
        <div className="flex items-end gap-2 rounded-[22px] bg-white/[0.12] px-3 py-1.5 ring-1 ring-white/12">
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              window.requestAnimationFrame(resizeDraftInput);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Message consultant…"
            className="max-h-28 min-h-8 min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1 text-sm font-semibold leading-5 text-white outline-none placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isWaiting}
            className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-emerald-100/42 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
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
    height: 480,
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
