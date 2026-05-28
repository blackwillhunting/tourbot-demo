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
    <div className="overflow-hidden bg-slate-950 text-white shadow-none md:bg-white/96 md:text-slate-950 md:shadow-none md:ring-0">
      <div className="border-b border-white/10 bg-slate-950 px-4 py-3 md:border-sky-100 md:bg-sky-50/90">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-white md:rounded-2xl md:bg-slate-950 md:ring-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 md:text-sky-700/70">
              {copy?.eyebrow || "Live handoff"}
            </div>
            <div className="mt-1 text-sm font-semibold text-white md:text-slate-950">
              {copy?.title || "Talk to someone"}
            </div>
            <p className="mt-1 text-xs leading-5 text-white/60 md:text-slate-600">
              SmartBar has already passed the context brief. Add details only if needed.
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[min(52dvh,420px)] space-y-2 overflow-y-auto bg-slate-950 px-4 py-3 [overscroll-behavior:contain] md:bg-transparent"
      >
        {!hasThread && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="px-1 py-2.5 text-sm leading-6 text-white/75 md:rounded-2xl md:bg-sky-50/85 md:px-3 md:text-slate-700 md:ring-1 md:ring-sky-100"
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
                    ? "bg-white/[0.08] text-white/90 ring-white/10 md:bg-sky-50/90 md:text-slate-800 md:ring-sky-100"
                    : "bg-white/[0.04] text-white/90 ring-white/10 md:bg-white md:text-slate-900 md:ring-slate-200"
                }`}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 md:text-slate-400">
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

      <form onSubmit={submit} className="border-t border-white/10 bg-slate-950 px-3 py-2.5 md:border-slate-200 md:bg-white/96">
        <div className="flex items-end gap-2 bg-slate-950 px-1 py-2 shadow-none md:rounded-2xl md:border md:border-slate-200 md:bg-white md:px-3 md:shadow-sm">
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
            className="max-h-28 min-h-8 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm font-medium leading-6 text-white outline-none placeholder:text-white/40 md:text-slate-950 md:placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isWaiting}
            className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center text-white transition hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-45 md:rounded-full md:bg-slate-950 md:hover:bg-slate-800 md:ring-0"
            aria-label="Send consultant message"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
