import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SmartBarMobileShell from "../smartbar-mobile/SmartBarMobileShell";

type MobileGuidedSocialIntroPhase =
  | "blank"
  | "empty"
  | "searchbar"
  | "site"
  | "smartbar"
  | "mounted"
  | "title"
  | "entry";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function MobileGuidedIntroBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_#eff8ff_0%,_#dff0ff_48%,_#f8fbff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -right-20 top-12 h-56 w-56 rounded-full bg-sky-300/22 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-60 w-60 rounded-full bg-blue-300/20 blur-3xl" />
    </>
  );
}

function MobileGuidedIntroHeader({ phase }: { phase: MobileGuidedSocialIntroPhase }) {
  return (
    <motion.div
      initial={false}
      animate={phase === "blank" ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.36 }}
      className="absolute left-5 right-5 top-4 z-[60] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/58"
    >
      <span>SmartBar Reel</span>
      <span>50s</span>
    </motion.div>
  );
}

export default function MobileGuidedSocialIntro({
  runKey,
  onComplete,
  dockLiftPx = 74,
}: {
  runKey: number;
  onComplete: () => void;
  dockLiftPx?: number;
}) {
  const [phase, setPhase] = useState<MobileGuidedSocialIntroPhase>("blank");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase("blank");
      await wait(260);
      if (cancelled) return;

      setPhase("empty");
      await wait(980);
      if (cancelled) return;

      setPhase("searchbar");
      await wait(1720);
      if (cancelled) return;

      setPhase("site");
      await wait(1560);
      if (cancelled) return;

      setPhase("smartbar");
      await wait(1280);
      if (cancelled) return;

      setPhase("mounted");
      await wait(1080);
      if (cancelled) return;

      setPhase("title");
      await wait(2600);
      if (cancelled) return;

      onComplete();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [onComplete, runKey]);

  const shellVisible = phase !== "blank";
  const shellMounted = phase === "mounted" || phase === "title" || phase === "entry";

  const restCompanion =
    phase === "empty"
      ? { blank: true }
      : phase === "searchbar"
        ? { label: "A search bar" }
        : phase === "site"
          ? { label: "on any site" }
          : phase === "smartbar" || shellMounted
            ? { label: "SmartBar", showLogo: true }
            : null;


  return (
    <motion.div
      key={`mobile-guided-social-intro-${runKey}`}
      className="absolute inset-0 z-[14000] flex items-center justify-center overflow-hidden bg-slate-950 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
    >
      <section className="relative isolate h-full w-full overflow-hidden bg-[#eff8ff]">
        <MobileGuidedIntroBackground />
        <MobileGuidedIntroHeader phase={phase} />

        <motion.div
          initial={false}
          animate={
            shellVisible
              ? {
                  opacity: 1,
                  y: shellMounted ? 0 : "-36%",
                  scale: shellMounted ? 1 : 1.035,
                }
              : {
                  opacity: 0,
                  y: "-36%",
                  scale: 0.96,
                }
          }
          transition={{
            opacity: { duration: 0.34 },
            y: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.74, ease: [0.22, 1, 0.36, 1] },
          }}
          className="absolute inset-0 z-[30] overflow-visible [transform-style:preserve-3d]"
          style={{
            transformOrigin: "center bottom",
            transform: "translateZ(0)",
          }}
        >
          <SmartBarMobileShell
            mode="overlay"
            entryModeLabel="Ask SmartBar"
            buildingLabel="Building..."
            introCallout={phase === "title" ? { title: "A search bar that does", startDelayMs: 180, typeDelayMs: 24 } : null}
            demoRestCompanion={restCompanion}
            demoBottomLiftPx={dockLiftPx}
          />
        </motion.div>
      </section>
    </motion.div>
  );
}
