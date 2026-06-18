import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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

const DOMI_FINALE_RIBBON_GLIDE_MS = 720;
const DOMI_FINALE_AUTH_TOKEN_KEY = "tourbot_demo_token";
const DOMI_FINALE_AUTH_TOKEN_EXPIRES_AT_KEY = "tourbot_demo_token_expires_at";
const DOMI_FINALE_AUTH_DEMO_PATH_KEY = "tourbot_demo_path";
const DOMI_FINALE_LOCAL_DEV_TOKEN = "local-dev";
const DOMI_FINALE_LOCAL_DEV_TTL_SECONDS = 3600;

function domiFinaleIsLocalDemoHost() {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  return (
    ["localhost", "127.0.0.1"].includes(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname)
  );
}

function domiFinaleEnsureLocalLobbyAccess() {
  if (typeof window === "undefined" || !domiFinaleIsLocalDemoHost()) return;

  window.localStorage.setItem(DOMI_FINALE_AUTH_TOKEN_KEY, DOMI_FINALE_LOCAL_DEV_TOKEN);
  window.localStorage.setItem(
    DOMI_FINALE_AUTH_TOKEN_EXPIRES_AT_KEY,
    String(Math.floor(Date.now() / 1000) + DOMI_FINALE_LOCAL_DEV_TTL_SECONDS),
  );
  window.localStorage.setItem(DOMI_FINALE_AUTH_DEMO_PATH_KEY, "/");
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
  const [isReturningToLobby, setIsReturningToLobby] = useState(false);

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

  const returnToDemoLobby = async () => {
    if (isReturningToLobby) return;

    domiFinaleEnsureLocalLobbyAccess();
    setIsReturningToLobby(true);
    await finaleWait(DOMI_FINALE_RIBBON_GLIDE_MS + 120);
    window.location.assign("/");
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#d9ecff] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.80),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(125,211,252,0.34),transparent_38%),linear-gradient(180deg,#e8f5ff_0%,#d9ecff_44%,#c8e4ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(1,33,105,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(1,33,105,0.10)_1px,transparent_1px)] [background-size:42px_42px]" />

      <FinaleNarratorCards cards={cards} />

      {finished ? (
        <div className="fixed inset-x-0 top-[16%] z-[10100] px-4 text-center sm:top-[18%]">
          <div
            className="mx-auto max-w-[60rem] overflow-hidden rounded-[34px] bg-white/35 backdrop-blur-sm sm:rounded-[44px]"
            style={{ height: "min(70svh, 26rem)" }}
          >
            <motion.div
              animate={{ y: isReturningToLobby ? "-50%" : "0%" }}
              initial={false}
              transition={{
                duration: DOMI_FINALE_RIBBON_GLIDE_MS / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="h-[200%]"
            >
              <section className="flex h-1/2 items-center">
                <div className="w-full rounded-[34px] border border-white/76 bg-white/72 px-5 py-6 shadow-[0_28px_90px_rgba(15,23,42,0.10)] ring-1 ring-white/58 backdrop-blur-2xl sm:rounded-[44px] sm:px-10 sm:py-9">
                  <div className="mx-auto flex max-w-[52rem] flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-center">
                    <div
                      className="flex-1 rounded-[28px] border border-sky-100/90 bg-white px-6 py-6 text-left text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.10)] ring-1 ring-white/80 sm:min-h-[12.5rem] sm:px-7 sm:py-7"
                    >
                      <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#eaf3ff] px-3 py-2 ring-1 ring-[#bfdbfe]/80">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/78 text-[#012169] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_4px_12px_rgba(1,33,105,0.10)] ring-1 ring-[#bfdbfe]/86">
                          <span className="text-[13px] font-black leading-none tracking-[-0.04em]">S</span>
                        </span>
                        <span className="pr-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#012169]">
                          SmartBar
                        </span>
                      </div>

                      <div className="text-2xl font-black leading-none tracking-[-0.045em] text-[#012169] sm:text-3xl">
                        Booking assistance
                      </div>
                      <div className="mt-2 text-2xl font-black leading-none tracking-[-0.045em] text-slate-700 sm:text-3xl">
                        without the maze.
                      </div>

                      <div className="mt-5 text-sm font-bold leading-6 text-slate-600/82 sm:text-[15px]">
                        Rough request in. Clean stay summary out.
                      </div>

                      <button
                        type="button"
                        onClick={returnToDemoLobby}
                        disabled={isReturningToLobby}
                        className="mt-7 flex w-full items-center justify-between rounded-full bg-[#012169] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(1,33,105,0.18)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(1,33,105,0.26)] active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-85"
                      >
                        <span>{isReturningToLobby ? "Returning to demos" : "Back to SmartBar demos"}</span>
                        <span aria-hidden="true" className="text-xl leading-none">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex h-1/2 items-center">
                <div className="w-full rounded-[34px] border border-white/76 bg-white/80 px-5 py-6 shadow-[0_28px_90px_rgba(15,23,42,0.10)] ring-1 ring-white/58 backdrop-blur-2xl sm:rounded-[44px] sm:px-10 sm:py-9">
                  <div className="mx-auto max-w-2xl text-left">
                    <div className="mb-4 flex items-center gap-3 sm:mb-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#012169] text-white ring-1 ring-[#012169]/10 sm:h-11 sm:w-11">
                        <span className="text-sm font-black tracking-[-0.04em]">S</span>
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
                        Choose a demo
                      </div>
                    </div>

                    <div className="max-w-2xl text-base font-medium leading-7 text-slate-700 sm:text-xl sm:leading-9">
                      See <span className="font-semibold text-slate-950">SmartBar</span> guide a visitor.
                    </div>

                    <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                      <div className="flex items-center gap-3 rounded-[22px] bg-[#012169] px-4 py-3 text-left text-white shadow-[0_14px_34px_rgba(1,33,105,0.18)] sm:px-5 sm:py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eaf3ff]/18 text-white ring-1 ring-white/16">
                          <span className="text-lg leading-none">☕</span>
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100/82">
                            Ordering
                          </span>
                          <span className="mt-0.5 block text-base font-semibold tracking-tight sm:text-lg">
                            FoodTrio
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-5 text-sky-100/86 sm:text-sm">
                            Food ordering demo
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-xl leading-none text-sky-100/82">→</span>
                      </div>

                      <div className="flex items-center gap-3 rounded-[22px] bg-[#012169] px-4 py-3 text-left text-white shadow-[0_14px_34px_rgba(1,33,105,0.18)] sm:px-5 sm:py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eaf3ff]/18 text-white ring-1 ring-white/16">
                          <span className="text-lg leading-none">⌂</span>
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100/82">
                            Booking
                          </span>
                          <span className="mt-0.5 block text-base font-semibold tracking-tight sm:text-lg">
                            Domi Coast
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-5 text-sky-100/86 sm:text-sm">
                            Hotel booking demo
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-xl leading-none text-sky-100/82">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
