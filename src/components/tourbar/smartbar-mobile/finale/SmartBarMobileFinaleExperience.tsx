import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
            density: "normal",
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
      <SmartBarFlashCardStack cards={stackCards} mode="standard" />
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
  const [returnStage, setReturnStage] = useState(0);
  const [isReturningToLobby, setIsReturningToLobby] = useState(false);
  const [returnRibbonY, setReturnRibbonY] = useState(0);
  const [returnRibbonHeight, setReturnRibbonHeight] = useState<number | null>(null);
  const returnSectionRefs = useRef<Array<HTMLDivElement | null>>([]);

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


await showCards(["Booking gets messy", "SmartBar keeps it moving"], 3400);
if (cancelled) return;

await showCards(["Dates set", "Guests counted", "Budget respected"], 3400);
if (cancelled) return;

await showCards(["Missing details?", "Selectors do the work"], 3200);
if (cancelled) return;

await showCards(["Rooms compared", "Best fits surfaced"], 3200);
if (cancelled) return;

await showCards(["No form digging", "No starting over"], 3000);
if (cancelled) return;

await showCards(["Rough travel ask", "Clean stay summary"], 3400);
if (cancelled) return;

await showCards(["SmartBar", "Booking assistance"], 2600);
if (cancelled) return;

await showCards(["Travel intent in", "Stay path out"], 3800);
if (cancelled) return;



      setFinished(true);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [autoPlay]);

  useEffect(() => {
    if (!finished) {
      setReturnStage(0);
      setIsReturningToLobby(false);
      return;
    }

    setReturnStage(0);
    const timeoutId = window.setTimeout(() => {
      setReturnStage(1);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [finished]);

  useLayoutEffect(() => {
    if (!finished) return;

    const active = returnSectionRefs.current[returnStage];
    if (!active) return;

    setReturnRibbonY(-active.offsetTop);
    setReturnRibbonHeight(active.offsetHeight);
  }, [finished, returnStage]);

  useEffect(() => {
    if (!finished) return;

    const measureActiveReturnSection = () => {
      const active = returnSectionRefs.current[returnStage];
      if (!active) return;

      setReturnRibbonY(-active.offsetTop);
      setReturnRibbonHeight(active.offsetHeight);
    };

    window.addEventListener("resize", measureActiveReturnSection);
    return () => window.removeEventListener("resize", measureActiveReturnSection);
  }, [finished, returnStage]);

  const returnToDemoLobby = async () => {
    if (isReturningToLobby) return;

    domiFinaleEnsureLocalLobbyAccess();
    setIsReturningToLobby(true);
    setReturnStage(2);
    await finaleWait(DOMI_FINALE_RIBBON_GLIDE_MS + 120);
    window.location.assign("/?smartbarReturn=demos");
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#d9ecff] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.80),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(125,211,252,0.34),transparent_38%),linear-gradient(180deg,#e8f5ff_0%,#d9ecff_44%,#c8e4ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(1,33,105,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(1,33,105,0.10)_1px,transparent_1px)] [background-size:42px_42px]" />

      <FinaleNarratorCards cards={cards} />

      {finished ? (
        <div className="fixed inset-x-0 bottom-0 top-[42px] z-[10100] text-center sm:top-[68px]">
          <section className="mx-auto grid h-full min-h-0 w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] justify-items-center overflow-hidden px-3 py-2 sm:flex sm:flex-col sm:items-center sm:justify-center sm:overflow-visible sm:px-6 sm:py-5">
            <div className="h-[22px] shrink-0 sm:h-[24px]" aria-hidden="true" />

            <div className="relative mt-3 flex min-h-0 w-full max-w-3xl overflow-y-auto overscroll-contain py-4 sm:mt-6 sm:block sm:overflow-visible sm:py-0">
              <div
                className="my-auto w-full overflow-hidden rounded-[30px] bg-white/35 backdrop-blur-sm transition-[height] duration-700 ease-out sm:my-0 sm:rounded-[36px]"
                style={returnRibbonHeight ? { height: returnRibbonHeight } : undefined}
              >
                <motion.div
                  animate={{ y: returnRibbonY }}
                  initial={false}
                  transition={{
                    duration: DOMI_FINALE_RIBBON_GLIDE_MS / 1000,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div
                    ref={(node) => {
                      returnSectionRefs.current[0] = node;
                    }}
                    aria-hidden="true"
                  >
                    <div className="w-full bg-white/80 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
                      <div className="mx-auto min-h-[13.75rem] max-w-2xl sm:min-h-[14.5rem]" />
                    </div>
                  </div>

                  <div
                    ref={(node) => {
                      returnSectionRefs.current[1] = node;
                    }}
                  >
                    <div className="w-full bg-white/80 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
                      <div className="mx-auto max-w-2xl text-left">
                        <div className="mb-4 flex items-center gap-3 sm:mb-5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#012169] text-white ring-1 ring-[#012169]/10 sm:h-11 sm:w-11">
                            <span className="text-sm font-black tracking-[-0.04em]">S</span>
                          </div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
                            SmartBar
                          </div>
                        </div>

                        <div className="max-w-2xl text-2xl font-black leading-tight tracking-[-0.045em] text-slate-950 sm:text-3xl">
                          <span className="text-[#012169]">Booking assistance</span>
                          <br />
                          without the maze.
                        </div>

                        <div className="mt-5 max-w-xl text-sm font-bold leading-6 text-slate-600/82 sm:text-[15px]">
                          Rough request in. Clean stay summary out.
                        </div>

                        <button
                          type="button"
                          onClick={returnToDemoLobby}
                          disabled={isReturningToLobby || returnStage !== 1}
                          className="mt-7 inline-flex w-full items-center justify-between rounded-full bg-[#012169] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(1,33,105,0.18)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(1,33,105,0.26)] active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-85 sm:w-auto sm:min-w-[18rem]"
                        >
                          <span>{isReturningToLobby ? "Returning to demos" : "Back to SmartBar demos"}</span>
                          <span aria-hidden="true" className="ml-8 text-xl leading-none">→</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    ref={(node) => {
                      returnSectionRefs.current[2] = node;
                    }}
                  >
                    <div className="w-full bg-white/80 px-5 py-7 text-slate-950 sm:px-10 sm:py-10">
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

                        <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4" aria-hidden="true">
                          <div className="flex cursor-default items-center gap-3 rounded-[22px] bg-slate-100/88 px-4 py-3 text-left text-slate-500 shadow-none ring-1 ring-slate-200/78 sm:px-5 sm:py-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-400 ring-1 ring-slate-300/50">
                              <span className="text-lg leading-none">☕</span>
                            </div>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Ordering
                              </span>
                              <span className="mt-0.5 block text-base font-semibold tracking-tight text-slate-500 sm:text-lg">
                                FoodTrio
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-5 text-slate-400 sm:text-sm">
                                Food ordering demo
                              </span>
                            </span>
                            <span aria-hidden="true" className="text-xl leading-none text-slate-300">→</span>
                          </div>

                          <div className="flex cursor-default items-center gap-3 rounded-[22px] bg-slate-100/88 px-4 py-3 text-left text-slate-500 shadow-none ring-1 ring-slate-200/78 sm:px-5 sm:py-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-400 ring-1 ring-slate-300/50">
                              <span className="text-lg leading-none">⌂</span>
                            </div>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Booking
                              </span>
                              <span className="mt-0.5 block text-base font-semibold tracking-tight text-slate-500 sm:text-lg">
                                Domi Coast
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-5 text-slate-400 sm:text-sm">
                                Hotel booking demo
                              </span>
                            </span>
                            <span aria-hidden="true" className="text-xl leading-none text-slate-300">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="mt-2 flex w-full max-w-3xl shrink-0 items-center justify-between gap-3 pb-1 sm:mt-5 sm:pb-0" aria-hidden="true">
              <div className="h-[34px] sm:h-[42px]" />
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
