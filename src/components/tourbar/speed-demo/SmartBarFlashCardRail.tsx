import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, ShieldCheck, XCircle } from "lucide-react";

export const SMARTBAR_FLASH_CARD_ENTER_TRANSITION_SECONDS = 0.3;
export const SMARTBAR_FLASH_CARD_EXIT_TRANSITION_SECONDS = 1.0;
export const SMARTBAR_FLASH_CARD_TRANSITION_SECONDS = SMARTBAR_FLASH_CARD_EXIT_TRANSITION_SECONDS;
export const SMARTBAR_FLASH_CARD_TRANSITION_MS = SMARTBAR_FLASH_CARD_TRANSITION_SECONDS * 1000;
export const SMARTBAR_FLASH_CARD_CROSSOVER_MS = Math.min(140, SMARTBAR_FLASH_CARD_TRANSITION_MS);
export const SMARTBAR_FLASH_CARD_ENTER_TRANSITION_MS = SMARTBAR_FLASH_CARD_ENTER_TRANSITION_SECONDS * 1000;
export const SMARTBAR_FLASH_CARD_OFFSCREEN_X = 620;

export const SMARTBAR_FLASH_CARD_ENTER_TRANSITION = {
  duration: SMARTBAR_FLASH_CARD_ENTER_TRANSITION_SECONDS,
  ease: "easeOut",
} as const;

export const SMARTBAR_FLASH_CARD_EXIT_TRANSITION = {
  duration: SMARTBAR_FLASH_CARD_EXIT_TRANSITION_SECONDS,
  ease: "easeInOut",
} as const;

export const SMARTBAR_FLASH_CARD_TRANSITION = SMARTBAR_FLASH_CARD_EXIT_TRANSITION;

export type SmartBarFlashCardLaneName = "a" | "b";
export type SmartBarFlashCardVariant = "success" | "failure" | "prelude";
export type SmartBarFlashCardCascadeMode = "standard" | "flurry";
export type SmartBarFlashCardDensity = "normal" | "compact" | "micro";

export type SmartBarFlashCardNotice = {
  variant: SmartBarFlashCardVariant;
  title: string;
  detail?: string;
};

export type SmartBarTutorCard = {
  title: string;
  detail?: string;
  holdMs?: number;
  cascadeGroup?: string;
  cascadeMode?: SmartBarFlashCardCascadeMode;
  density?: SmartBarFlashCardDensity;
  clearCascade?: boolean;
};

function renderInlineEmphasis(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={`bold-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(<em key={`italic-${match.index}`}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : [text];
}

export function SmartBarFlashCardRail({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`absolute right-4 top-1/2 z-[10100] h-28 w-[min(92vw,540px)] -translate-y-1/2 sm:right-8 ${className}`}>
      <div className="relative h-full w-full overflow-visible">{children}</div>
    </div>
  );
}

export function SmartBarFlashCardLane({
  active,
  children,
  align = "end",
}: {
  active: boolean;
  children: ReactNode;
  align?: "end" | "center";
}) {
  return (
    <motion.div
      initial={{ x: SMARTBAR_FLASH_CARD_OFFSCREEN_X }}
      animate={{ x: active ? 0 : SMARTBAR_FLASH_CARD_OFFSCREEN_X }}
      transition={active ? SMARTBAR_FLASH_CARD_ENTER_TRANSITION : SMARTBAR_FLASH_CARD_EXIT_TRANSITION}
      className={`absolute inset-y-0 right-0 flex w-full items-center ${align === "center" ? "justify-center" : "justify-end"} ${active ? "pointer-events-auto z-30" : "pointer-events-none z-20"}`}
    >
      {children}
    </motion.div>
  );
}

export function SmartBarFlashCardArrowMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200/85 bg-white/76 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(15,23,42,0.09)]">
      <ArrowLeft className="h-4 w-4" />
    </span>
  );
}

export function SmartBarFlashCard({ notice }: { notice: SmartBarFlashCardNotice | null }) {
  if (!notice) return null;

  const isSuccess = notice.variant === "success";
  const isFailure = notice.variant === "failure";
  const isPrelude = notice.variant === "prelude";

  if (isPrelude) {
    return (
      <div className="inline-flex min-h-[56px] w-fit max-w-[calc(100vw-2rem)] items-center justify-center gap-3 rounded-full border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_44px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl">
        <SmartBarFlashCardArrowMark />
        <span className="truncate text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
          {renderInlineEmphasis(notice.title)}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex min-h-[64px] w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_44px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${
          isSuccess
            ? "bg-emerald-200/86 text-emerald-900 ring-emerald-300/85"
            : isFailure
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : "bg-emerald-200/86 text-emerald-900 ring-emerald-300/85"
        }`}
      >
        {isSuccess ? <ShieldCheck className="h-5 w-5" /> : isFailure ? <XCircle className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <div className="truncate text-base font-semibold tracking-tight text-slate-800 sm:text-lg">{renderInlineEmphasis(notice.title)}</div>
        {notice.detail ? <div className="mt-0.5 truncate text-sm font-medium text-slate-600">{renderInlineEmphasis(notice.detail)}</div> : null}
      </div>
    </div>
  );
}
