import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import SmartBarSpeedDemo from "./components/tourbar/speed-demo/SmartBarSpeedDemo";

const INTRO_DELAY_MS = 2000;
const CHECKING_MS = 1200;
const RESULT_HOLD_MS = 1100;
const PRELUDE_HOLD_MS = 1450;
const MIN_PASSCODE_LENGTH = 4;
const TOURBAR_SHEET_TRANSITION_SECONDS = 0.66;
const SLIP_OFFSCREEN_X = 620;

type LaunchState = "waiting" | "login" | "checking" | "success" | "failure" | "prelude" | "demo";

type PreludeSlip = {
  title: string;
  detail: string;
};

const PRELUDE_SLIPS: PreludeSlip[] = [
  {
    title: "SmartBar turns search into action.",
    detail: "Answers, filters, and opens the next step.",
  },
  {
    title: "Fits anywhere.",
    detail: "A compact launcher for different site surfaces.",
  },
  {
    title: "Now watch it work.",
    detail: "One bar. Multiple outcomes.",
  },
];

const SLIP_MOTION = {
  initial: { x: SLIP_OFFSCREEN_X },
  animate: { x: 0 },
  exit: { x: SLIP_OFFSCREEN_X },
  transition: { duration: TOURBAR_SHEET_TRANSITION_SECONDS, ease: "easeInOut" },
} as const;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function codeIsAccepted(value: string) {
  return value.trim().length >= MIN_PASSCODE_LENGTH;
}

function ThinkingCode({ value }: { value: string }) {
  const characters = value.trim().padEnd(6, "•").slice(0, 6).split("");

  return (
    <div
      aria-label="Checking passcode"
      className="flex h-11 w-24 items-center justify-center gap-1 rounded-full border border-sky-100 bg-white/88 px-3 text-center text-sm font-black tracking-[0.22em] text-slate-950 ring-1 ring-sky-100 sm:w-28"
    >
      {characters.map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          animate={{ y: [0, -4, 0], opacity: [0.62, 1, 0.62] }}
          transition={{ duration: 0.72, repeat: Infinity, delay: index * 0.08, ease: [0.42, 0, 0.58, 1] }}
          className="inline-block min-w-[0.72em]"
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

function LaunchSlip({
  passcode,
  isChecking,
  onPasscodeChange,
  onSubmit,
}: {
  passcode: string;
  isChecking: boolean;
  onPasscodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex w-[min(92vw,520px)] items-center gap-3 rounded-full border border-white/75 bg-white/72 px-4 py-3 shadow-2xl shadow-sky-950/12 ring-1 ring-sky-100/80 backdrop-blur-2xl"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
        <Search className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black tracking-tight text-slate-950">Enter SmartBar passcode</div>
        <div className="truncate text-xs font-semibold text-slate-500">Unlock the speed demo.</div>
      </div>

      {isChecking ? (
        <ThinkingCode value={passcode} />
      ) : (
        <input
          value={passcode}
          onChange={(event) => onPasscodeChange(event.target.value.slice(0, 12))}
          autoFocus
          aria-label="SmartBar demo passcode"
          placeholder="Code"
          className="h-11 w-24 rounded-full border border-sky-100 bg-white/88 px-3 text-center text-sm font-black tracking-[0.18em] text-slate-950 outline-none ring-1 ring-transparent transition placeholder:tracking-normal placeholder:text-slate-300 focus:border-sky-200 focus:ring-sky-200 sm:w-28"
        />
      )}

      <button
        type="submit"
        disabled={isChecking}
        className="h-11 rounded-full bg-slate-950 px-4 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-slate-950/12 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-70"
      >
        Go
      </button>
    </form>
  );
}

function ResultSlip({ kind }: { kind: "success" | "failure" }) {
  const isSuccess = kind === "success";

  return (
    <div className="flex min-h-[68px] w-[min(92vw,430px)] items-center gap-3 rounded-full border border-white/75 bg-white/72 px-4 py-3 shadow-2xl shadow-sky-950/12 ring-1 ring-sky-100/80 backdrop-blur-2xl">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ${
          isSuccess ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {isSuccess ? <ShieldCheck className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-black tracking-tight text-slate-950">
          {isSuccess ? "Access granted" : "Access not recognized"}
        </div>
        <div className="truncate text-xs font-semibold text-slate-500">
          {isSuccess ? "Starting SmartBar." : "Check the code and try again."}
        </div>
      </div>
    </div>
  );
}

function PreludeSlipCard({ slip }: { slip: PreludeSlip }) {
  return (
    <div className="flex min-h-[68px] w-[min(92vw,460px)] items-center gap-3 rounded-full border border-white/75 bg-white/72 px-4 py-3 shadow-2xl shadow-sky-950/12 ring-1 ring-sky-100/80 backdrop-blur-2xl">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-black tracking-tight text-slate-950">{slip.title}</div>
        <div className="truncate text-xs font-semibold text-slate-500">{slip.detail}</div>
      </div>
    </div>
  );
}

function LaunchBackground() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-28 top-16 h-72 w-72 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
    </main>
  );
}

export default function LaunchSelectorTourBar() {
  const [launchState, setLaunchState] = useState<LaunchState>("waiting");
  const [passcode, setPasscode] = useState("");
  const [preludeIndex, setPreludeIndex] = useState(0);
  const runIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLaunchState("login");
    }, INTRO_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (launchState !== "login") return;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      const cleanCode = passcode.trim();
      setLaunchState("checking");
      await wait(CHECKING_MS);
      if (runIdRef.current !== runId) return;

      const nextState: LaunchState = codeIsAccepted(cleanCode) ? "success" : "failure";
      setLaunchState(nextState);
      await wait(RESULT_HOLD_MS);
      if (runIdRef.current !== runId) return;

      if (nextState === "success") {
        for (let index = 0; index < PRELUDE_SLIPS.length; index += 1) {
          setPreludeIndex(index);
          setLaunchState("prelude");
          await wait(PRELUDE_HOLD_MS);
          if (runIdRef.current !== runId) return;
        }

        setLaunchState("demo");
        return;
      }

      setPasscode("");
      setLaunchState("login");
    },
    [launchState, passcode],
  );

  if (launchState === "demo") {
    return <SmartBarSpeedDemo />;
  }

  const slipKey =
    launchState === "login" || launchState === "checking"
      ? "launch-slip"
      : launchState === "prelude"
        ? `prelude-${preludeIndex}`
        : launchState;

  const activePreludeSlip = PRELUDE_SLIPS[preludeIndex] || PRELUDE_SLIPS[0];

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <LaunchBackground />

      <div className="absolute right-4 top-1/2 z-10 h-28 w-[min(92vw,540px)] -translate-y-1/2 sm:right-8">
        <div className="relative flex h-full w-full items-center justify-end overflow-visible">
          <AnimatePresence initial={false}>
            {launchState === "login" || launchState === "checking" ? (
              <motion.div key={slipKey} {...SLIP_MOTION} className="absolute inset-y-0 right-0 flex items-center will-change-transform">
                <LaunchSlip
                  passcode={passcode}
                  isChecking={launchState === "checking"}
                  onPasscodeChange={setPasscode}
                  onSubmit={handleSubmit}
                />
              </motion.div>
            ) : launchState === "success" || launchState === "failure" ? (
              <motion.div key={slipKey} {...SLIP_MOTION} className="absolute inset-y-0 right-0 flex items-center will-change-transform">
                <ResultSlip kind={launchState} />
              </motion.div>
            ) : launchState === "prelude" ? (
              <motion.div key={slipKey} {...SLIP_MOTION} className="absolute inset-y-0 right-0 flex items-center will-change-transform">
                <PreludeSlipCard slip={activePreludeSlip} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
