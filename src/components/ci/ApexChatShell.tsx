import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  MessageSquare,
  Minus,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CI_QUICK_STARTS, resolveCiFixtureReply } from "./ciFixtureBrain";
import type {
  ApexChatShellProps,
  ApexFixtureReply,
  ApexQuickStart,
  ApexShellState,
  ApexThreadItem,
} from "./ciChatTypes";

const MIN_TEXTAREA_HEIGHT = 58;
const MAX_TEXTAREA_HEIGHT = 142;
const THINKING_DELAY_MS = 780;
const THREAD_REVEAL_SCROLL_MS = 520;

const panelMotion = {
  initial: { opacity: 0, y: 26, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 28, scale: 0.98 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function isCoarsePointer() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}

function MarkdownBody({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        a: ({ children }) => <span>{children}</span>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function ThinkingText({ body = "Reviewing CI fixture data..." }: { body?: string }) {
  const tokens = body.match(/\S+|\s+/g) || [];
  let characterIndex = 0;

  return (
    <span className="whitespace-pre-wrap break-normal [overflow-wrap:normal] [word-break:normal]">
      {tokens.map((token, tokenIndex) => {
        if (/^\s+$/.test(token)) {
          characterIndex += token.length;
          return <React.Fragment key={`space-${tokenIndex}`}> </React.Fragment>;
        }

        const startIndex = characterIndex;
        characterIndex += token.length;

        return (
          <span key={`${token}-${tokenIndex}`} className="inline-block whitespace-nowrap align-baseline">
            {token.split("").map((char, index) => (
              <motion.span
                key={`${char}-${tokenIndex}-${index}`}
                className="inline-block"
                animate={{ y: [0, -1.5, 0, 1, 0], opacity: [0.72, 1, 0.82, 1, 0.72] }}
                transition={{
                  duration: 1.05,
                  repeat: Infinity,
                  delay: (startIndex + index) * 0.02,
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

function ThreadCard({ item }: { item: ApexThreadItem }) {
  if (item.role === "user") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="ml-auto max-w-[88%] rounded-[22px] rounded-br-[7px] bg-slate-950 px-4 py-3 text-sm font-medium leading-6 text-white shadow-lg shadow-slate-950/10"
      >
        {item.body}
      </motion.div>
    );
  }

  const isThinking = item.status === "thinking";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mr-auto w-full max-w-[94%] overflow-hidden rounded-[28px] border border-white/80 bg-white/92 shadow-[0_18px_46px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 backdrop-blur-xl"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/70 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-sky-600" />
          Apex
        </div>
        {item.title && <div className="mt-1 text-sm font-semibold text-slate-950">{item.title}</div>}
      </div>

      <div className="px-4 py-3 text-sm leading-6 text-slate-800">
        {isThinking ? <ThinkingText body={item.body} /> : <MarkdownBody>{item.body}</MarkdownBody>}
      </div>

      {!isThinking && item.cards?.length ? (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3">
          {item.cards.map((card) => (
            <div key={`${item.id}-${card.title}`} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
              {card.eyebrow && (
                <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">
                  {card.eyebrow}
                </div>
              )}
              <div className="text-sm font-semibold text-slate-950">{card.title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">{card.body}</div>
              {card.meta && <div className="mt-2 text-[11px] font-semibold text-slate-500">{card.meta}</div>}
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

function DraftRow({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const hasContent = value.trim().length > 0;

  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;

    const minHeight = isCoarsePointer() && hasFocus ? 48 : MIN_TEXTAREA_HEIGHT;
    node.style.height = `${minHeight}px`;
    const nextHeight = Math.min(MAX_TEXTAREA_HEIGHT, Math.max(minHeight, node.scrollHeight));
    node.style.height = `${nextHeight}px`;
    node.style.overflowY = node.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [hasFocus, value]);

  return (
    <div className="border-t border-slate-200 bg-white/96 p-3 backdrop-blur-xl">
      <div className="flex items-end gap-2 rounded-[24px] border border-slate-300 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(15,23,42,0.03)] focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setHasFocus(true)}
          onBlur={() => setHasFocus(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full resize-none bg-transparent text-sm font-medium leading-6 text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !hasContent}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function QuickStartRail({
  items,
  onPick,
  disabled,
}: {
  items: ApexQuickStart[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50/80 px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onPick(item.prompt)}
          disabled={disabled}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {item.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function replyToThreadItem(reply: ApexFixtureReply): ApexThreadItem {
  return {
    id: makeId(),
    role: "bot",
    title: reply.title,
    body: reply.body,
    cards: reply.cards,
    actions: reply.actions,
    status: "done",
  };
}

export default function ApexChatShell({
  title = "Apex",
  subtitle = "CI command surface",
  greeting = "Ask Apex about tickets, risks, projects, owners, or status updates.",
  placeholder = "Ask about tickets, incidents, owners, project risks, or status updates...",
  quickStarts = CI_QUICK_STARTS,
  initialShellState = "welcome",
  className = "",
  inline = false,
  rightRail,
}: ApexChatShellProps) {
  const [shellState, setShellState] = useState<ApexShellState>(initialShellState);
  const [thread, setThread] = useState<ApexThreadItem[]>([]);
  const [draftValue, setDraftValue] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const replyTimerRef = useRef<number | null>(null);

  const hasThread = thread.length > 0;
  const effectiveQuickStarts = useMemo(() => quickStarts.slice(0, 4), [quickStarts]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const node = laneRef.current;
    if (!node) return;
    window.setTimeout(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }, THREAD_REVEAL_SCROLL_MS);
  }, [thread.length, isBotTyping]);

  const submitPrompt = (rawPrompt?: string) => {
    const prompt = (rawPrompt ?? draftValue).trim();
    if (!prompt || isBotTyping) return;

    setShellState("panel");
    setDraftValue("");
    setIsBotTyping(true);

    const thinkingId = makeId();
    setThread((items) => [
      ...items,
      { id: makeId(), role: "user", body: prompt, status: "done" },
      {
        id: thinkingId,
        role: "bot",
        title: "Working from staged CI data",
        body: "Reviewing CI fixture data...",
        status: "thinking",
      },
    ]);

    replyTimerRef.current = window.setTimeout(() => {
      const reply = replyToThreadItem(resolveCiFixtureReply(prompt));
      setThread((items) => items.map((item) => (item.id === thinkingId ? reply : item)));
      setIsBotTyping(false);
    }, THINKING_DELAY_MS);
  };

  const panel = (
    <motion.section
      key="apex-panel"
      {...panelMotion}
      className={
        inline
          ? `flex h-full min-h-[620px] w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/86 shadow-[0_28px_90px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 backdrop-blur-2xl ${className}`
          : `fixed bottom-5 right-5 z-[9000] flex h-[min(720px,calc(100svh-40px))] w-[min(440px,calc(100vw-32px))] overflow-hidden rounded-[32px] border border-white/70 bg-white/86 shadow-[0_28px_90px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 backdrop-blur-2xl ${className}`
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-4 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/18">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-tight">{title}</div>
              <div className="mt-0.5 truncate text-xs font-medium text-slate-300">{subtitle}</div>
            </div>
          </div>
          {!inline && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShellState("launcher")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Minimize Apex"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShellState("welcome")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close Apex"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>

        <div ref={laneRef} className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.09),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef5ff_100%)] px-3 py-4">
          <div className="space-y-3">
            {!hasThread && (
              <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fixture-backed PoC
                </div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{greeting}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This shell is separated from the TourBot commerce and spotlight logic. It is ready to sit inside a staged Teams tab, then graduate into a real custom tab app.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {thread.map((item) => (
                <ThreadCard key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        <QuickStartRail items={effectiveQuickStarts} onPick={submitPrompt} disabled={isBotTyping} />
        <DraftRow value={draftValue} onChange={setDraftValue} onSubmit={() => submitPrompt()} disabled={isBotTyping} placeholder={placeholder} />
      </div>

      {rightRail ? <aside className="hidden w-72 border-l border-slate-200 bg-slate-50/80 p-3 xl:block">{rightRail}</aside> : null}
    </motion.section>
  );

  if (inline) return panel;

  return (
    <AnimatePresence>
      {shellState === "welcome" && (
        <motion.div
          key="apex-welcome"
          {...panelMotion}
          className="fixed bottom-5 right-5 z-[9000] w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-[32px] border border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 backdrop-blur-2xl"
        >
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Meet {title}</div>
                <div className="text-lg font-semibold">{subtitle}</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm leading-6 text-slate-700">{greeting}</p>
            <div className="mt-4 grid gap-2">
              {effectiveQuickStarts.slice(0, 3).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => submitPrompt(item.prompt)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShellState("panel")}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Open Apex
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {shellState === "panel" && panel}

      {shellState === "launcher" && (
        <motion.button
          key="apex-launcher"
          type="button"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={() => setShellState("panel")}
          className="fixed bottom-5 right-5 z-[9000] inline-flex items-center gap-3 rounded-full border border-white/70 bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(15,23,42,0.26)] ring-1 ring-slate-800/30 backdrop-blur-xl transition hover:bg-slate-800"
        >
          <Compass className="h-5 w-5" />
          Ask Apex
        </motion.button>
      )}
    </AnimatePresence>
  );
}
