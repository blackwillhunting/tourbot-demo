import { useEffect, useRef, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageSquare, SendHorizonal } from "lucide-react";

const THINKING_WIGGLE_DURATION = 1.15;
const THINKING_WIGGLE_STAGGER = 0.025;

export type TourBarConsultantChatMessage = {
  id: string;
  role: "visitor" | "consultant";
  body: string;
  status?: "thinking" | "done";
};

export type TourBarConsultantChatCopy = {
  eyebrow?: string;
  title?: string;
  placeholder?: string;
  waitingMessage?: string;
  confirmationMessage?: string;
};

export type TourBarConsultantChatProps = {
  copy?: TourBarConsultantChatCopy;
  draft: string;
  thread: TourBarConsultantChatMessage[];
  isWaiting?: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

function ThinkingText({ body }: { body: string }) {
  const tokens = body.match(/\S+|\s+/g) || [];
  let characterIndex = 0;

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {tokens.map((token, tokenIndex) => {
        if (/^\s+$/.test(token)) {
          characterIndex += token.length;
          return (
            <span key={`space-${tokenIndex}`}>
              {token.includes("\n") ? token : " "}
            </span>
          );
        }

        const startIndex = characterIndex;
        characterIndex += token.length;

        return (
          <span
            key={`${token}-${tokenIndex}`}
            className="inline-block whitespace-nowrap align-baseline"
          >
            {token.split("").map((char, index) => (
              <motion.span
                key={`${char}-${tokenIndex}-${index}`}
                className="inline-block"
                animate={{
                  y: [0, -1.5, 0, 1, 0],
                  opacity: [0.72, 1, 0.82, 1, 0.72],
                }}
                transition={{
                  duration: THINKING_WIGGLE_DURATION,
                  repeat: Infinity,
                  delay: (startIndex + index) * THINKING_WIGGLE_STAGGER,
                  ease: "easeInOut",
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

export default function TourBarConsultantChat({
  copy,
  draft,
  thread,
  isWaiting = false,
  onDraftChange,
  onSubmit,
}: TourBarConsultantChatProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const placeholder = copy?.placeholder || "Tell us what you need help with...";
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
              Send a short note and we’ll queue the next available person.
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
            Tell us what you want to discuss. SmartBar has already helped narrow the context.
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {thread.map((message) => {
            const consultant = message.role === "consultant";
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.34, ease: "easeOut" }}
                className={`rounded-2xl px-3 py-2.5 text-sm leading-6 shadow-sm ring-1 ${
                  consultant
                    ? "bg-sky-50/90 text-slate-800 ring-sky-100"
                    : "bg-white text-slate-900 ring-slate-200"
                }`}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {consultant ? "Consultant desk" : "Visitor"}
                </div>
                {message.status === "thinking" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                    <ThinkingText body={message.body} />
                  </span>
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
            {isWaiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
