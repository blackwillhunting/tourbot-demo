import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import SmartBarMobileShell, {
  type SmartBarMobileDemoSubmission,
  type SmartBarMobileGenericAction,
  type SmartBarMobileGenericResult,
  type SmartBarMobileSubmitResult,
} from "../SmartBarMobileShell";
import SmartBarSpeedTargetWall from "../../speed-demo/SmartBarSpeedTargetWall";

type MobileFocusSnapshot = {
  element: HTMLElement;
  outline: string;
  outlineOffset: string;
  boxShadow: string;
  position: string;
  zIndex: string;
  transition: string;
  scrollMarginTop: string;
};

type NexaPathMobileTone = "sky" | "slate" | "emerald" | "violet";

const NEXAPATH_MOBILE_TONE_CLASS: Record<NexaPathMobileTone, {
  card: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
}> = {
  sky: {
    card: "border-sky-100/44 bg-sky-400/78 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(14,165,233,0.20)] ring-sky-100/30",
    icon: "bg-slate-950/88 text-sky-200 ring-slate-950/18",
    eyebrow: "text-slate-950/58",
    title: "text-slate-950",
    body: "text-slate-950/76",
  },
  slate: {
    card: "border-white/24 bg-slate-950/88 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_30px_rgba(2,6,23,0.24)] ring-white/14",
    icon: "bg-white/12 text-white ring-white/18",
    eyebrow: "text-white/46",
    title: "text-white",
    body: "text-white/72",
  },
  emerald: {
    card: "border-emerald-100/42 bg-emerald-300/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_28px_rgba(16,185,129,0.20)] ring-emerald-100/30",
    icon: "bg-slate-950/88 text-emerald-200 ring-slate-950/18",
    eyebrow: "text-slate-950/58",
    title: "text-slate-950",
    body: "text-slate-950/76",
  },
  violet: {
    card: "border-violet-100/36 bg-violet-500/82 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_30px_rgba(124,58,237,0.24)] ring-violet-100/24",
    icon: "bg-white/14 text-white ring-white/18",
    eyebrow: "text-white/56",
    title: "text-white",
    body: "text-white/76",
  },
};

function smartBarNexaPathCssEscape(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, "\\$&");
}

function smartBarNexaPathCompact(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function NexaPathMiniCard({
  eyebrow,
  title,
  body,
  icon,
  tone = "slate",
}: {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: ReactNode;
  tone?: NexaPathMobileTone;
}) {
  const toneClass = NEXAPATH_MOBILE_TONE_CLASS[tone];

  return (
    <div className={`rounded-[24px] border px-3.5 py-3 ring-1 ${toneClass.card}`}>
      <div className="flex items-start gap-3">
        {icon ? <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${toneClass.icon}`}>{icon}</div> : null}
        <div className="min-w-0">
          {eyebrow && (
            <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${toneClass.eyebrow}`}>
              {eyebrow}
            </div>
          )}
          <div className={`text-sm font-black leading-5 ${toneClass.title}`}>{title}</div>
          <div className={`mt-1 text-xs font-semibold leading-5 ${toneClass.body}`}>{body}</div>
        </div>
      </div>
    </div>
  );
}

type NexaPathChatRole = "smartbar" | "consultant" | "visitor";

const NEXAPATH_CHAT_ROLE_CLASS: Record<NexaPathChatRole, {
  shell: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
}> = {
  smartbar: {
    shell: "border-sky-100/42 bg-sky-400/80 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_28px_rgba(14,165,233,0.20)] ring-sky-100/32",
    icon: "bg-slate-950/88 text-sky-200 ring-slate-950/18",
    eyebrow: "text-slate-950/52",
    title: "text-slate-950",
    body: "text-slate-950/78",
  },
  consultant: {
    shell: "border-violet-100/34 bg-violet-500/84 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_30px_rgba(124,58,237,0.24)] ring-violet-100/24",
    icon: "bg-white/14 text-white ring-white/18",
    eyebrow: "text-white/56",
    title: "text-white",
    body: "text-white/78",
  },
  visitor: {
    shell: "border-white/24 bg-[#012169] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_10px_26px_rgba(1,33,105,0.30)] ring-white/20",
    icon: "bg-white/12 text-white ring-white/18",
    eyebrow: "text-white/52",
    title: "text-white",
    body: "text-white/78",
  },
};

function NexaPathChatBubble({
  role,
  eyebrow,
  title,
  body,
  icon,
}: {
  role: NexaPathChatRole;
  eyebrow: string;
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  const roleClass = NEXAPATH_CHAT_ROLE_CLASS[role];

  return (
    <div className={`rounded-[26px] border px-3.5 py-3 ring-1 ${roleClass.shell}`}>
      <div className="flex items-start gap-3">
        {icon ? <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${roleClass.icon}`}>{icon}</div> : null}
        <div className="min-w-0">
          <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${roleClass.eyebrow}`}>
            {eyebrow}
          </div>
          <div className={`text-sm font-semibold leading-5 ${roleClass.title}`}>{title}</div>
          <div className={`mt-1 text-xs font-normal leading-5 ${roleClass.body}`}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function NexaPathChatPreviewContent() {
  return (
    <div className="space-y-2.5">
      <NexaPathChatBubble
        role="smartbar"
        eyebrow="SmartBar"
        title="Context brief"
        body="Context received — handing this to a consultant."
        icon={<Sparkles className="h-4 w-4" />}
      />
      <NexaPathChatBubble
        role="consultant"
        eyebrow="Consultant desk"
        title="Handoff accepted"
        body="Hi there — You’re interested in Copilots? I have the hedge-fund context SmartBar captured."
        icon={<MessageSquare className="h-4 w-4" />}
      />
      <NexaPathChatBubble
        role="visitor"
        eyebrow="Visitor"
        title="Follow-up"
        body="Yes, curious about pricing and what setup would look like."
      />
    </div>
  );
}

function NexaPathProofContent() {
  return (
    <div className="space-y-2.5">
      <NexaPathMiniCard
        eyebrow="Buyer need"
        title="Copilot adoption"
        body="SmartBar points the visitor toward secure M365 Copilot readiness instead of dropping them into a generic services menu."
        tone="sky"
        icon={<Sparkles className="h-4 w-4" />}
      />
      <NexaPathMiniCard
        eyebrow="Operating context"
        title="Hedge-fund fit"
        body="The answer keeps regulated-firm pressure, data readiness, compliance, and workflow adoption in the same path."
        tone="emerald"
      />
      <NexaPathMiniCard
        eyebrow="Next step"
        title="Sales-ready handoff"
        body="The response can move directly into a consultant handoff with the context already packaged."
        tone="slate"
      />
    </div>
  );
}

export default function NexaPathMobileExperience() {
  const focusSnapshotRef = useRef<MobileFocusSnapshot | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const submissionIdRef = useRef(0);
  const [demoSubmission, setDemoSubmission] = useState<SmartBarMobileDemoSubmission | null>(null);

  const clearFocus = useCallback(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    const snapshot = focusSnapshotRef.current;
    if (!snapshot) return;

    snapshot.element.style.outline = snapshot.outline;
    snapshot.element.style.outlineOffset = snapshot.outlineOffset;
    snapshot.element.style.boxShadow = snapshot.boxShadow;
    snapshot.element.style.position = snapshot.position;
    snapshot.element.style.zIndex = snapshot.zIndex;
    snapshot.element.style.transition = snapshot.transition;
    snapshot.element.style.scrollMarginTop = snapshot.scrollMarginTop;
    focusSnapshotRef.current = null;
  }, []);

  const focusTarget = useCallback((targetId: string) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    clearFocus();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const escaped = smartBarNexaPathCssEscape(targetId);
        const stage = document.querySelector<HTMLElement>('[data-smartbar-speed-stage="true"]');
        const target =
          stage?.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`) ||
          document.querySelector<HTMLElement>(`[data-tour-id="${escaped}"], #${escaped}`);

        if (!target) return;

        target.scrollIntoView({ block: "start", behavior: "smooth" });

        focusTimerRef.current = window.setTimeout(() => {
          focusTimerRef.current = null;
          focusSnapshotRef.current = {
            element: target,
            outline: target.style.outline,
            outlineOffset: target.style.outlineOffset,
            boxShadow: target.style.boxShadow,
            position: target.style.position,
            zIndex: target.style.zIndex,
            transition: target.style.transition,
            scrollMarginTop: target.style.scrollMarginTop,
          };

          if (!target.style.position) target.style.position = "relative";
          target.style.zIndex = "60";
          target.style.scrollMarginTop = "18px";
          target.style.transition = target.style.transition
            ? `${target.style.transition}, outline 180ms ease, box-shadow 180ms ease`
            : "outline 180ms ease, box-shadow 180ms ease";
          target.style.outline = "3px solid rgba(14,165,233,0.92)";
          target.style.outlineOffset = "4px";
          target.style.boxShadow = "0 0 0 7px rgba(14,165,233,0.18), 0 22px 50px rgba(2,6,23,0.28)";
        }, 760);
      });
    });
  }, [clearFocus]);

  const submitDemoQuery = useCallback((query: string) => {
    submissionIdRef.current += 1;
    setDemoSubmission({ id: submissionIdRef.current, query });
  }, []);

  useEffect(() => () => clearFocus(), [clearFocus]);

  const buildInfoResult = useCallback((kind: "primary" | "proof" = "primary"): SmartBarMobileGenericResult => {
    focusTarget(kind === "proof" ? "hedgefund-contact-cta" : "hedgefund-copilot");

    if (kind === "proof") {
      return {
        surfaceKind: "info",
        eyebrow: "NexaPath Advisory",
        title: "Proof points surfaced",
        statusLabel: "Proof ready",
        content: <NexaPathProofContent />,
        helper: "Same clear stretch surface, now filled with advisory-site buyer guidance instead of cart rows.",
        actions: [
          { id: "consultant", label: "Talk to consultant", helper: "Open the handoff surface" },
          { id: "restart-info", label: "Back to overview", variant: "secondary" },
        ],
        height: 500,
      };
    }

    return {
      surfaceKind: "info",
      eyebrow: "NexaPath Advisory",
      title: "Copilot journey found",
      statusLabel: "Answer ready",
      body: "For a hedge fund, SmartBar routes the visitor toward secure Copilot adoption, data readiness, compliance pressure, and operating-model fit.",
      helper: "A normal search bar returns links. SmartBar returns the next useful buyer step.",
      actions: [
        { id: "show-proof", label: "Show proof points", helper: "Drill into concrete examples" },
        { id: "consultant", label: "Talk to consultant", variant: "secondary" },
      ],
      height: 450,
    };
  }, [focusTarget]);

  const buildChatResult = useCallback((): SmartBarMobileGenericResult => {
    focusTarget("hedgefund-contact-cta");

    return {
      surfaceKind: "chat",
      eyebrow: "Live handoff",
      title: "Consultant desk opened",
      statusLabel: "Chat open",
      content: <NexaPathChatPreviewContent />,
      actions: [
        { id: "restart-info", label: "Back to overview", variant: "secondary" },
      ],
      height: 510,
    };
  }, [focusTarget]);

  const handleSubmitPrompt = useCallback((query: string): SmartBarMobileSubmitResult => {
    const text = smartBarNexaPathCompact(query);

    if (text.includes("proof") || text.includes("example") || text.includes("show me")) return buildInfoResult("proof");
    if (text.includes("consultant") || text.includes("pricing") || text.includes("talk to someone") || text.includes("contact")) return buildChatResult();

    return buildInfoResult("primary");
  }, [buildChatResult, buildInfoResult]);

  const handleGenericAction = useCallback((action: SmartBarMobileGenericAction) => {
    if (action.id === "show-proof") submitDemoQuery("show proof points");
    if (action.id === "consultant") submitDemoQuery("Perfect, can I talk to someone?");
    if (action.id === "restart-info") submitDemoQuery("we're a hedge fund, need help with IT and setting up copilots");
  }, [submitDemoQuery]);

  return (
    <main
      data-smartbar-mobile-nexapath-playground="true"
      className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_16%_10%,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef6ff_54%,#f8fafc_100%)] text-slate-950"
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <section
        data-smartbar-speed-stage="true"
        data-smartbar-speed-surface="info"
        className="relative z-10 min-h-[4200px] overflow-x-hidden px-3 pb-[640px] pt-3"
      >
        <SmartBarSpeedTargetWall surface="info" />
      </section>
      <SmartBarMobileShell
        mode="overlay"
        entryModeLabel="Ask SmartBar"
        buildingLabel="Thinking..."
        demoSubmission={demoSubmission}
        onSubmitPrompt={handleSubmitPrompt}
        onGenericAction={handleGenericAction}
      />
    </main>
  );
}
