import { useEffect, useRef, useState } from "react";
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

function finaleWait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function FinaleNarratorCards({ cards }: { cards: FinaleCard[] }) {
  const sequenceRef = useRef(0);
  const activeLaneRef = useRef<SmartBarFlashCardLaneName | null>(null);
  const [stackCards, setStackCards] = useState<SmartBarFlashCardStackItem[]>([]);
  const [activeLane, setActiveLane] = useState<SmartBarFlashCardLaneName | null>(null);
  const [noticeA, setNoticeA] = useState<SmartBarFlashCardNotice | null>(null);
  const [noticeB, setNoticeB] = useState<SmartBarFlashCardNotice | null>(null);

  const setActiveLaneState = (lane: SmartBarFlashCardLaneName | null) => {
    activeLaneRef.current = lane;
    setActiveLane(lane);
  };

  useEffect(() => {
    let cancelled = false;
    const visibleCards = cards.map((card) => card.text.trim()).filter(Boolean);
    const sequenceId = sequenceRef.current + 1;
    sequenceRef.current = sequenceId;

    const run = async () => {
      if (!visibleCards.length) {
        setStackCards([]);
        setActiveLaneState(null);
        await finaleWait(280);
        if (cancelled || sequenceRef.current !== sequenceId) return;
        setNoticeA(null);
        setNoticeB(null);
        return;
      }

      if (visibleCards.length > 1) {
        setStackCards([]);
        setActiveLaneState(null);
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

      const nextLane: SmartBarFlashCardLaneName = activeLaneRef.current === "a" ? "b" : "a";
      if (nextLane === "a") setNoticeA(notice);
      else setNoticeB(notice);

      setActiveLaneState(nextLane);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [cards]);

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

export default function SmartBarMobileFinaleExperience({ autoPlay = true }: { autoPlay?: boolean }) {
  const [cards, setCards] = useState<FinaleCard[]>([]);
  const [finished, setFinished] = useState(!autoPlay);

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
      setFinished(false);
      await finaleWait(580);
      if (cancelled) return;

      await showCards(["Booking is messy", "SmartBar keeps it moving"], 3400);
      if (cancelled) return;

      await showCards(["Dates", "Guests", "Budget"], 3400);
      if (cancelled) return;

      await showCards(["Missing details?", "Use selectors"], 3200);
      if (cancelled) return;

      await showCards(["Rooms compared", "Best fits surfaced"], 3200);
      if (cancelled) return;

      await showCards(["Packages reviewed", "Estimate updated"], 3200);
      if (cancelled) return;

      await showCards(["Green means ready", "Yellow means review", "Red means required"], 3800);
      if (cancelled) return;

      await showCards(["From rough request", "To booking-ready summary"], 3400);
      if (cancelled) return;

      await showCards(["No digging through forms"], 2400);
      if (cancelled) return;

      await showCards(["No starting over"], 2400);
      if (cancelled) return;

      await showCards(["The stay is assembled", "The handoff is clean"], 3400);
      if (cancelled) return;

      await showCards(["SmartBar for booking assistance"], 2600);
      if (cancelled) return;

      await showCards(["A search bar that turns travel intent into a stay."], 3800);
      if (cancelled) return;

      setFinished(true);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [autoPlay]);

  const restartDemo = () => {
    window.location.assign("/domi-play?demo=1");
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#d9ecff] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.80),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(125,211,252,0.34),transparent_38%),linear-gradient(180deg,#e8f5ff_0%,#d9ecff_44%,#c8e4ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(1,33,105,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(1,33,105,0.10)_1px,transparent_1px)] [background-size:42px_42px]" />

      <FinaleNarratorCards cards={cards} />

      {finished ? (
        <div className="fixed inset-x-0 top-[23%] z-[10100] px-6 text-center">
          <div className="mx-auto max-w-xs rounded-[30px] border border-white/56 bg-white/52 px-5 py-5 shadow-2xl shadow-sky-950/14 ring-1 ring-white/42 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#012169]/52">SmartBar</div>
            <div className="mt-3 text-2xl font-black tracking-tight text-[#012169]">Booking assistance</div>
            <div className="mt-1 text-2xl font-black tracking-tight text-[#012169]">without the maze.</div>
            <div className="mt-3 text-sm font-bold leading-6 text-slate-700/70">
              Rough request in. Clean stay summary out.
            </div>
            <button
              type="button"
              onClick={restartDemo}
              className="mt-5 w-full rounded-full bg-[#012169] px-5 py-3 text-sm font-black text-white shadow-xl shadow-sky-950/20 active:scale-[0.99]"
            >
              View again
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
