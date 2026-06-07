import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import {
  SmartBarFlashCard,
  SmartBarFlashCardLane,
  SmartBarFlashCardRail,
  type SmartBarFlashCardLaneName,
  type SmartBarFlashCardNotice,
} from "../../speed-demo/SmartBarFlashCardRail";
import {
  SmartBarFlashCardStack,
  type SmartBarFlashCardStackItem,
} from "../../speed-demo/SmartBarFlashCardStack";

type FinaleCard = {
  id: string;
  text: string;
};

type SmartBarToolFace = {
  id: string;
  pillLabel: string;
  title: string;
  detail: string;
};

const SMARTBAR_TOOL_FACES: SmartBarToolFace[] = [
  {
    id: "plain-english",
    pillLabel: "Plain English",
    title: "Plain English",
    detail: "Visitors say what they want naturally.",
  },
  {
    id: "website-aware",
    pillLabel: "Website-aware",
    title: "Website-aware",
    detail: "It knows this site, its content, and its next steps.",
  },
  {
    id: "answer",
    pillLabel: "Answer",
    title: "Answer",
    detail: "Finds the right proof.",
  },
  {
    id: "navigate",
    pillLabel: "Navigate",
    title: "Navigate",
    detail: "Moves visitors to the right place.",
  },
  {
    id: "spotlight",
    pillLabel: "Spotlight",
    title: "Spotlight",
    detail: "Highlights what matters on the page.",
  },
  {
    id: "collect",
    pillLabel: "Collect",
    title: "Collect",
    detail: "Asks for missing pieces.",
  },
  {
    id: "choose",
    pillLabel: "Choose",
    title: "Choose",
    detail: "Turns options into decisions.",
  },
  {
    id: "cart",
    pillLabel: "Cart",
    title: "Cart",
    detail: "Builds checkout-ready orders.",
  },
  {
    id: "book",
    pillLabel: "Book",
    title: "Book",
    detail: "Ranks options and prepares the stay.",
  },
  {
    id: "handoff",
    pillLabel: "Handoff",
    title: "Handoff",
    detail: "Carries the conversation forward.",
  },
  {
    id: "speed",
    pillLabel: "Speed",
    title: "Speed",
    detail: "Right next step, faster.",
  },
];

function finaleWait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function FinaleNarratorCards({ cards }: { cards: FinaleCard[] }) {
  const sequenceRef = useRef(0);
  const [stackCards, setStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    const visibleCards = cards.map((card) => card.text.trim()).filter(Boolean);
    const sequenceId = sequenceRef.current + 1;
    sequenceRef.current = sequenceId;

    const run = async () => {
      if (!visibleCards.length) {
        setStackCards([]);
        setActiveLane(null);
        await finaleWait(280);
        if (cancelled || sequenceRef.current !== sequenceId) return;
        setNoticeA(null);
        setNoticeB(null);
        return;
      }

      if (visibleCards.length > 1) {
        setStackCards([]);
        setActiveLane(null);
        setNoticeA(null);
        setNoticeB(null);

        const nextStack: SmartBarFlashCardStackItem[] = [];
        for (let index = 0; index < visibleCards.length; index += 1) {
          if (cancelled || sequenceRef.current !== sequenceId) return;

          nextStack.push({
            id: `${sequenceId}-${index}-${visibleCards[index]}`,
            variant: "prelude",
            title: visibleCards[index],
            density: visibleCards.length >= 4 ? "micro" : "compact",
          });

          setStackCards([...nextStack]);
          await finaleWait(720);
        }

        return;
      }

      setStackCards([]);
      const notice: SmartBarFlashCardNotice = {
        variant: "prelude",
        title: visibleCards[0],
      };

      const nextLane: SmartBarFlashCardLaneName = activeLane === "a" ? "b" : "a";
      if (nextLane === "a") setNoticeA(notice);
      else setNoticeB(notice);

      setActiveLane(nextLane);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [cards, activeLane]);

  if (!cards.length && !noticeA && !noticeB && !stackCards.length) return null;

  return (
    <SmartBarFlashCardRail className="pointer-events-none !fixed inset-x-0 !top-[34%] z-[10130]">
      <SmartBarFlashCardStack cards={stackCards} mode={stackCards.length >= 4 ? "flurry" : "standard"} />
      <SmartBarFlashCardLane active={activeLane === "a"}>
        <SmartBarFlashCard notice={noticeA} />
      </SmartBarFlashCardLane>
      <SmartBarFlashCardLane active={activeLane === "b"}>
        <SmartBarFlashCard notice={noticeB} />
      </SmartBarFlashCardLane>
    </SmartBarFlashCardRail>
  );
}

function SmartBarToolBubble({ face }: { face: SmartBarToolFace }) {
  return (
    <motion.div
      key={face.id}
      initial={{ opacity: 0, y: 72, scale: 0.96, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 72, scale: 0.96, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-[min(292px,calc(100vw-72px))] rounded-[24px] border border-white/60 bg-white/58 px-4 py-3 text-center text-slate-950 shadow-2xl shadow-sky-950/16 ring-1 ring-white/46 backdrop-blur-xl"
    >
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500/82">SmartBar mode</div>
        <div className="mt-1 text-[20px] font-black leading-6 tracking-tight">{face.title}</div>
        <div className="mt-1 text-[11px] font-semibold leading-4 text-slate-700/78">{face.detail}</div>
      </div>
    </motion.div>
  );
}

function BottomMountedSmartBar({
  face,
  phase,
}: {
  face: SmartBarToolFace;
  phase: "hidden" | "launcher" | "tools" | "close";
}) {
  const label = phase === "close" ? "View again" : face.pillLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 76, scale: 0.96 }}
      animate={{
        opacity: phase === "hidden" ? 0 : 1,
        y: phase === "hidden" ? 76 : 0,
        scale: phase === "hidden" ? 0.96 : 1,
      }}
      transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[10120] px-4"
    >
      <div className="mx-auto flex h-[56px] w-[min(350px,calc(100vw-28px))] items-center justify-center rounded-full border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.50)_0%,rgba(255,255,255,0.24)_45%,rgba(1,33,105,0.90)_100%)] px-5 text-white shadow-[0_24px_58px_rgba(1,33,105,0.34),inset_0_1px_0_rgba(255,255,255,0.60),inset_0_-1px_0_rgba(1,33,105,0.28)] ring-1 ring-white/28 backdrop-blur-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${face.id}-${label}`}
            initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full truncate text-center text-[17px] font-black leading-6 tracking-tight"
          >
            {phase === "launcher" ? "SmartBar" : label}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function SmartBarMobileFinaleExperience({ autoPlay = true }: { autoPlay?: boolean }) {
  const [cards, setCards] = useState<FinaleCard[]>([]);
  const [phase, setPhase] = useState<"cards" | "launcher" | "tools" | "close">("cards");
  const [activeFaceIndex, setActiveFaceIndex] = useState(0);

  const activeFace = SMARTBAR_TOOL_FACES[Math.min(Math.max(activeFaceIndex, 0), SMARTBAR_TOOL_FACES.length - 1)];

  const showCards = async (items: string[], holdMs: number) => {
    setCards(items.map((text, index) => ({ id: `${Date.now()}-${index}-${text}`, text })));
    await finaleWait(holdMs);
    setCards([]);
    await finaleWait(420);
  };

  useEffect(() => {
    if (!autoPlay) return;

    let cancelled = false;

    const run = async () => {
      setPhase("cards");
      await finaleWait(580);
      if (cancelled) return;

      await showCards(["One search bar.", "Website-aware.", "Action-ready."], 3600);
      if (cancelled) return;

      await showCards(["SmartBar is the caddy.", "It chooses the right club."], 3200);
      if (cancelled) return;

      setPhase("launcher");
      await finaleWait(850);
      if (cancelled) return;

      setPhase("tools");
      for (let index = 0; index < SMARTBAR_TOOL_FACES.length; index += 1) {
        if (cancelled) return;
        setActiveFaceIndex(index);
        await finaleWait(760);
      }

      await finaleWait(650);
      if (cancelled) return;

      await showCards(["One launch pill.", "Many faces.", "Right tool, right moment."], 3600);
      if (cancelled) return;

      setPhase("close");
      await showCards(["Ready to see it again?"], 2500);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [autoPlay]);

  const restartDemo = () => {
    window.location.assign("/local-speed-demo?mobileStart=nexa&t=finale-replay");
  };

  const launcherPhase = phase === "cards" ? "hidden" : phase;

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#d9ecff] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.80),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(125,211,252,0.34),transparent_38%),linear-gradient(180deg,#e8f5ff_0%,#d9ecff_44%,#c8e4ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(1,33,105,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(1,33,105,0.10)_1px,transparent_1px)] [background-size:42px_42px]" />

      <FinaleNarratorCards cards={cards} />

      <AnimatePresence mode="wait">
        {phase === "launcher" ? (
          <motion.div
            key="launcher-intro"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-[26%] z-[10100] px-6 text-center"
          >
            <div className="mx-auto max-w-xs rounded-[30px] border border-white/54 bg-white/44 px-5 py-4 shadow-2xl shadow-sky-950/12 ring-1 ring-white/38 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#012169]/52">Same bar</div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#012169]">Different jobs.</div>
              <div className="mt-2 text-sm font-bold leading-6 text-slate-700/70">
                The launcher stays small until the page needs a tool.
              </div>
            </div>
          </motion.div>
        ) : null}

        {phase === "tools" ? (
          <motion.div
            key="tool-bubble-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-0 bottom-[126px] z-[10105] px-4"
          >
            <AnimatePresence mode="popLayout">
              <SmartBarToolBubble face={activeFace} />
            </AnimatePresence>
          </motion.div>
        ) : null}

        {phase === "close" ? (
          <motion.div
            key="close"
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.54, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-[24%] z-[10100] px-6 text-center"
          >
            <div className="mx-auto max-w-xs rounded-[30px] border border-white/56 bg-white/50 px-5 py-5 shadow-2xl shadow-sky-950/14 ring-1 ring-white/42 backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#012169] text-sky-100">
                <Users className="h-6 w-6" />
              </div>
              <div className="mt-4 text-2xl font-black tracking-tight text-[#012169]">One launcher.</div>
              <div className="mt-1 text-2xl font-black tracking-tight text-[#012169]">Multiple jobs.</div>
              <div className="mt-3 text-sm font-bold leading-6 text-slate-700/70">
                Website-aware AI for services, orders, bookings, and handoffs.
              </div>
              <button
                type="button"
                onClick={restartDemo}
                className="mt-5 w-full rounded-full bg-[#012169] px-5 py-3 text-sm font-black text-white shadow-xl shadow-sky-950/20 active:scale-[0.99]"
              >
                View again
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <BottomMountedSmartBar face={activeFace} phase={launcherPhase} />
    </main>
  );
}
