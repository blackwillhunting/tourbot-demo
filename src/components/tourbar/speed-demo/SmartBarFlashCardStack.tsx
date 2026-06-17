import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import {
  SMARTBAR_FLASH_CARD_ENTER_TRANSITION,
  SMARTBAR_FLASH_CARD_EXIT_TRANSITION,
  SMARTBAR_FLASH_CARD_OFFSCREEN_X,
  type SmartBarFlashCardCascadeMode,
  type SmartBarFlashCardDensity,
  type SmartBarFlashCardNotice,
} from "./SmartBarFlashCardRail";

export type SmartBarFlashCardStackItem = SmartBarFlashCardNotice & {
  id: string;
  density?: SmartBarFlashCardDensity;
};

const STACK_CONFIG: Record<
  SmartBarFlashCardCascadeMode,
  {
    originY: number;
    stepY: number;
    stepX: number;
    scaleStep: number;
  }
> = {
  standard: {
    originY: -26,
    stepY: 42,
    stepX: 18,
    scaleStep: 0.012,
  },
  flurry: {
    originY: -48,
    stepY: 30,
    stepX: 14,
    scaleStep: 0.008,
  },
};

function cardShellClass(density: SmartBarFlashCardDensity) {
  if (density === "micro") {
    return "min-h-[36px] gap-2 rounded-full px-3.5 py-1.5";
  }

  if (density === "compact") {
    return "min-h-[46px] gap-2.5 rounded-full px-4 py-2";
  }

  return "min-h-[56px] gap-3 rounded-full px-5 py-3";
}

function markClass(density: SmartBarFlashCardDensity) {
  if (density === "micro") {
    return "h-6 w-6";
  }

  if (density === "compact") {
    return "h-7 w-7";
  }

  return "h-8 w-8";
}

function iconClass(density: SmartBarFlashCardDensity) {
  if (density === "micro") return "h-3.5 w-3.5";
  if (density === "compact") return "h-3.5 w-3.5";
  return "h-4 w-4";
}

function titleClass(density: SmartBarFlashCardDensity) {
  if (density === "micro") return "text-[13px] font-semibold leading-tight";
  if (density === "compact") return "text-sm font-semibold leading-tight sm:text-[15px]";
  return "text-base font-semibold leading-tight sm:text-lg";
}

function detailClass(density: SmartBarFlashCardDensity) {
  if (density === "micro") return "mt-0.5 text-[11px] font-medium leading-tight";
  if (density === "compact") return "mt-0.5 text-xs font-medium leading-tight";
  return "mt-0.5 text-sm font-medium leading-tight";
}

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

function SmartBarStackCard({ card }: { card: SmartBarFlashCardStackItem }) {
  const density = card.density || "compact";

  return (
    <div
      className={`inline-flex w-fit max-w-[calc(100vw-2rem)] items-center border border-emerald-200/85 bg-gradient-to-b from-emerald-100/96 via-teal-100/90 to-emerald-50/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(16,185,129,0.15),0_18px_44px_rgba(15,23,42,0.16)] ring-1 ring-emerald-200/75 backdrop-blur-xl ${cardShellClass(density)}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full border border-emerald-200/85 bg-white/76 text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(15,23,42,0.09)] ${markClass(density)}`}
      >
        <ArrowLeft className={iconClass(density)} />
      </span>
      <div className="min-w-0">
        <div className={`whitespace-pre-wrap tracking-tight text-slate-800 ${titleClass(density)}`}>{renderInlineEmphasis(card.title)}</div>
        {card.detail ? (
          <div className={`whitespace-pre-wrap text-slate-600 ${detailClass(density)}`}>{renderInlineEmphasis(card.detail)}</div>
        ) : null}
      </div>
    </div>
  );
}

export function SmartBarFlashCardStack({
  cards,
  mode = "standard",
  align = "end",
}: {
  cards: SmartBarFlashCardStackItem[];
  mode?: SmartBarFlashCardCascadeMode;
  align?: "end" | "center";
}) {
  const config = STACK_CONFIG[mode];

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-full">
      <AnimatePresence initial={false}>
        {cards.map((card, index) => {
          const y = config.originY + index * config.stepY;
          const x = -index * config.stepX;
          const scale = Math.max(0.94, 1 - index * config.scaleStep);

          return (
            <motion.div
              key={card.id}
              initial={{ x: SMARTBAR_FLASH_CARD_OFFSCREEN_X, y, scale }}
              animate={{ x, y, scale }}
              exit={{
                x: SMARTBAR_FLASH_CARD_OFFSCREEN_X,
                y,
                scale,
                transition: SMARTBAR_FLASH_CARD_EXIT_TRANSITION,
              }}
              transition={SMARTBAR_FLASH_CARD_ENTER_TRANSITION}
              className={`absolute right-0 top-1/2 flex w-full items-center ${align === "center" ? "justify-center" : "justify-end"}`}
              style={{ zIndex: 40 + index }}
            >
              <SmartBarStackCard card={card} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
