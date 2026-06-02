export type SmartBarMobileStyleStatus = "ready" | "pending" | "options" | "unknown";

export function statusClass(status: SmartBarMobileStyleStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (status === "pending") return "bg-rose-100 text-rose-900 ring-rose-200";
  if (status === "options") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-slate-200 text-slate-700 ring-slate-300";
}

export function smartBarMobileRibbonPillClass(kind: "complete" | "pending" | "extras", isOverlay: boolean) {
  if (kind === "complete") {
    return isOverlay
      ? "bg-emerald-300/12 text-emerald-50 ring-1 ring-emerald-200/18"
      : "bg-emerald-300/18 text-emerald-100 ring-1 ring-emerald-200/20";
  }

  if (kind === "pending") {
    return isOverlay
      ? "bg-rose-300/12 text-rose-50 ring-1 ring-rose-200/18"
      : "bg-rose-300/18 text-rose-100 ring-1 ring-rose-200/20";
  }

  return isOverlay
    ? "bg-amber-300/12 text-amber-50 ring-1 ring-amber-200/18"
    : "bg-amber-300/18 text-amber-100 ring-1 ring-amber-200/20";
}

export function smartBarMobileRowSurfaceClass(status: SmartBarMobileStyleStatus, isOverlay: boolean) {
  if (isOverlay) {
    if (status === "ready") {
      return "border-emerald-300/28 bg-emerald-300/10 text-white shadow-[0_12px_30px_rgba(16,185,129,0.16)] ring-1 ring-emerald-200/18";
    }
    if (status === "pending") {
      return "border-rose-300/30 bg-rose-400/12 text-white shadow-[0_12px_32px_rgba(244,63,94,0.18)] ring-1 ring-rose-200/20";
    }
    if (status === "options") {
      return "border-amber-300/30 bg-amber-300/12 text-white shadow-[0_12px_32px_rgba(245,158,11,0.17)] ring-1 ring-amber-200/20";
    }
    return "border-white/14 bg-slate-500/14 text-white shadow-[0_12px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/10";
  }

  if (status === "ready") {
    return "border-emerald-300/30 bg-emerald-300/18 text-white shadow-[0_12px_28px_rgba(16,185,129,0.16)] ring-1 ring-emerald-200/20";
  }
  if (status === "pending") {
    return "border-rose-300/35 bg-rose-400/22 text-white shadow-[0_12px_30px_rgba(244,63,94,0.22)] ring-1 ring-rose-200/22";
  }
  if (status === "options") {
    return "border-amber-300/35 bg-amber-300/22 text-white shadow-[0_12px_30px_rgba(245,158,11,0.20)] ring-1 ring-amber-200/22";
  }
  return "border-white/12 bg-slate-500/20 text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)] ring-1 ring-white/10";
}

export function smartBarMobileHandoffRowSurfaceClass(isOverlay: boolean) {
  return isOverlay
    ? "border-sky-300/30 bg-sky-400/14 text-sky-50 shadow-[0_12px_32px_rgba(14,165,233,0.18)] ring-1 ring-sky-200/20"
    : "border-sky-300/35 bg-sky-400/24 text-sky-50 shadow-[0_12px_30px_rgba(14,165,233,0.20)] ring-1 ring-sky-200/22";
}

export function getSmartBarMobileShellStyles(isOverlay: boolean, checkoutReady: boolean) {
  const rootTextClass = isOverlay ? "text-white" : "text-white";
  const upperGlassClass = isOverlay
    ? "overflow-hidden border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(51,65,85,0.30)_38%,rgba(15,23,42,0.44)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.26),inset_0_-2px_6px_rgba(2,6,23,0.32),0_18px_46px_rgba(2,6,23,0.32)] ring-1 ring-white/12 backdrop-blur-2xl backdrop-saturate-200"
    : "overflow-hidden border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(148,163,184,0.12)_54%,rgba(15,23,42,0.18)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),inset_0_-1px_3px_rgba(2,6,23,0.28),0_16px_38px_rgba(2,6,23,0.34)] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150";
  const chromePillClass = isOverlay
    ? "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.13)_0%,rgba(71,85,105,0.30)_42%,rgba(15,23,42,0.46)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.26),inset_0_-2px_6px_rgba(2,6,23,0.34),0_12px_30px_rgba(2,6,23,0.34)] ring-1 ring-white/12 backdrop-blur-2xl backdrop-saturate-200 transition active:scale-[0.985]"
    : "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(148,163,184,0.12)_48%,rgba(15,23,42,0.22)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),inset_0_-2px_5px_rgba(2,6,23,0.30),0_12px_28px_rgba(2,6,23,0.34)] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150 transition active:scale-[0.985]";
  const chromeIconBubbleClass = isOverlay
    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(15,23,42,0.20)_100%)] text-white/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),inset_0_-1px_3px_rgba(2,6,23,0.30),0_3px_10px_rgba(2,6,23,0.20)] ring-1 ring-white/14"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(148,163,184,0.10)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-1px_2px_rgba(2,6,23,0.24)] ring-1 ring-white/12";
  const chromeLabelClass = isOverlay
    ? "font-semibold text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]"
    : "font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.46)]";
  const mainMutedTextClass = isOverlay ? "text-white/72" : "text-slate-300";
  const softTextClass = isOverlay ? "text-white/72" : "text-white/62";
  const quietTextClass = isOverlay ? "text-white/58" : "text-white/44";
  const skyEyebrowClass = isOverlay ? "text-sky-100/90" : "text-sky-200";
  const inputTextClass = isOverlay ? "text-white caret-white" : "text-white caret-white";
  const retryInputClass = isOverlay
    ? "mt-3 h-[96px] w-full resize-none rounded-[26px] border border-white/12 bg-slate-950/20 px-4 py-3 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-white/38 caret-white"
    : "mt-3 h-[96px] w-full resize-none rounded-[26px] border border-white/10 bg-slate-950/28 px-4 py-3 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-white/28 caret-white";
  const issuePillClass = checkoutReady
    ? "bg-emerald-300 text-slate-950"
    : isOverlay
      ? "bg-white/[0.09] text-white/78 ring-1 ring-white/12"
      : "bg-white/10 text-white ring-1 ring-white/12";
  const lineButtonClass = "w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]";
  const unknownTitleClass = isOverlay ? "italic text-white/78" : "italic text-white/82";
  const handoffTitleClass = isOverlay ? "italic text-sky-50" : "italic text-sky-50";
  const totalsBoxClass = isOverlay
    ? "mt-3 shrink-0 rounded-[24px] border border-white/12 bg-slate-950/22 px-4 py-3 text-white shadow-[0_-8px_24px_rgba(2,6,23,0.20)] ring-1 ring-white/10"
    : "mt-3 shrink-0 rounded-[24px] border border-white/10 bg-slate-950/44 px-4 py-3 text-white shadow-[0_-8px_24px_rgba(2,6,23,0.22)] ring-1 ring-white/10";

  return {
    rootTextClass,
    upperGlassClass,
    chromePillClass,
    chromeIconBubbleClass,
    chromeLabelClass,
    mainMutedTextClass,
    softTextClass,
    quietTextClass,
    skyEyebrowClass,
    inputTextClass,
    retryInputClass,
    issuePillClass,
    lineButtonClass,
    unknownTitleClass,
    handoffTitleClass,
    totalsBoxClass,
  };
}
