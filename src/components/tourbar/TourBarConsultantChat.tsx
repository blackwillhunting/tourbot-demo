import { useEffect, useRef, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, SendHorizonal } from "lucide-react";
import ThinkingText from "./ThinkingText";

export type TourBarConsultantChatMessage = {
  id: string;
  role: "visitor" | "consultant" | "smartbar";
  body: string;
  status?: "thinking" | "done";
};

export type TourBarConsultantChatCopy = {
  eyebrow?: string;
  title?: string;
  placeholder?: string;
  waitingMessage?: string;
  confirmationMessage?: string;
  consultantResponseMessage?: string;
  autoStartMessage?: string;
  autoStartConsultantMessage?: string;
  replyThinkingMessage?: string;
  replyConfirmationMessage?: string;
  replyConsultantResponseMessage?: string;
};

export type TourBarConsultantChatProps = {
  copy?: TourBarConsultantChatCopy;
  draft: string;
  thread: TourBarConsultantChatMessage[];
  isWaiting?: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export default function TourBarConsultantChat({
  copy,
  draft,
  thread,
  isWaiting = false,
  onDraftChange,
  onSubmit,
}: TourBarConsultantChatProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const placeholder = copy?.placeholder || "Add anything else the consultant should know...";
  const hasThread = thread.length > 0;

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    window.requestAnimationFrame(() => {
      node.scrollTo({
        top: node.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [thread.length, isWaiting]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    onSubmit();
  };

  return (
    <div className="overflow-hidden bg-white/96">
      <div className="border-b border-sky-100 bg-sky-50/90 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700/70">
              {copy?.eyebrow || "Live handoff"}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-950">
              {copy?.title || "Talk to someone"}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              SmartBar has already passed the context brief. Add details only if needed.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[min(52dvh,420px)] space-y-2 overflow-y-auto px-4 py-3 [overscroll-behavior:contain]"
      >
        {!hasThread && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="rounded-2xl bg-sky-50/85 px-3 py-2.5 text-sm leading-6 text-slate-700 ring-1 ring-sky-100"
          >
            SmartBar is preparing the context brief for the consultant desk.
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {thread.map((message) => {
            const consultant = message.role === "consultant";
            const smartbar = message.role === "smartbar";
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.34, ease: "easeOut" }}
                className={`rounded-2xl px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ${
                  consultant || smartbar
                    ? "bg-sky-50/90 text-slate-800 ring-sky-100"
                    : "bg-white text-slate-900 ring-slate-200"
                }`}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {consultant ? "Consultant desk" : smartbar ? "SmartBar" : "Visitor"}
                </div>
                {message.status === "thinking" ? (
                  <ThinkingText key={`${message.id}-thinking`} body={message.body} />
                ) : (
                  <span className="whitespace-pre-wrap">{message.body}</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <form onSubmit={submit} className="border-t border-slate-200 bg-white/96 px-3 py-2.5">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="max-h-28 min-h-8 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm font-medium leading-6 text-slate-950 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isWaiting}
            className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Send consultant message"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
