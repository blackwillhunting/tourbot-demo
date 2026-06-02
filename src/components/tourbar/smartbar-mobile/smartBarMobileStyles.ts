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
      ? "bg-emerald-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_8px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/44"
      : "bg-emerald-300/86 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_8px_18px_rgba(16,185,129,0.16)] ring-1 ring-emerald-100/36";
  }

  if (kind === "pending") {
    return isOverlay
      ? "bg-rose-500/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_rgba(244,63,94,0.20)] ring-1 ring-rose-100/32"
      : "bg-rose-500/86 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_rgba(244,63,94,0.18)] ring-1 ring-rose-100/28";
  }

  return isOverlay
    ? "bg-amber-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(245,158,11,0.18)] ring-1 ring-amber-100/42"
    : "bg-amber-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_8px_18px_rgba(245,158,11,0.16)] ring-1 ring-amber-100/34";
}

export function smartBarMobileRowSurfaceClass(status: SmartBarMobileStyleStatus, isOverlay: boolean) {
  if (isOverlay) {
    if (status === "ready") {
      return "border-emerald-100/62 bg-emerald-300/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_30px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/32";
    }
    if (status === "pending") {
      return "border-rose-100/52 bg-rose-500/82 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_32px_rgba(244,63,94,0.22)] ring-1 ring-rose-100/26";
    }
    if (status === "options") {
      return "border-amber-100/68 bg-amber-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_32px_rgba(245,158,11,0.20)] ring-1 ring-amber-100/34";
    }
    return "border-white/24 bg-slate-700/72 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_30px_rgba(2,6,23,0.28)] ring-1 ring-white/14";
  }

  if (status === "ready") {
    return "border-emerald-100/58 bg-emerald-300/80 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(16,185,129,0.16)] ring-1 ring-emerald-100/30";
  }
  if (status === "pending") {
    return "border-rose-100/50 bg-rose-500/78 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_30px_rgba(244,63,94,0.20)] ring-1 ring-rose-100/24";
  }
  if (status === "options") {
    return "border-amber-100/64 bg-amber-300/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_30px_rgba(245,158,11,0.18)] ring-1 ring-amber-100/32";
  }
  return "border-white/22 bg-slate-700/68 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(15,23,42,0.26)] ring-1 ring-white/12";
}

export function smartBarMobileHandoffRowSurfaceClass(isOverlay: boolean) {
  return isOverlay
    ? "border-sky-100/50 bg-sky-400/72 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_12px_32px_rgba(14,165,233,0.20)] ring-1 ring-sky-100/28"
    : "border-sky-100/44 bg-sky-400/68 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_12px_30px_rgba(14,165,233,0.18)] ring-1 ring-sky-100/24";
}

export function getSmartBarMobileShellStyles(isOverlay: boolean, checkoutReady: boolean) {
  const rootTextClass = isOverlay ? "text-white" : "text-white";
  const upperGlassClass = isOverlay
    ? "overflow-hidden border border-white/46 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.055)_34%,rgba(255,255,255,0.025)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.54),inset_0_-1px_3px_rgba(255,255,255,0.07),0_18px_46px_rgba(2,6,23,0.14)] ring-1 ring-white/28 backdrop-blur-xl backdrop-saturate-200"
    : "overflow-hidden border border-white/38 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.05)_42%,rgba(255,255,255,0.02)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.40),inset_0_-1px_3px_rgba(255,255,255,0.06),0_16px_38px_rgba(2,6,23,0.16)] ring-1 ring-white/24 backdrop-blur-xl backdrop-saturate-200";
  const chromePillClass = isOverlay
    ? "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/44 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.055)_44%,rgba(255,255,255,0.025)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.50),inset_0_-1px_3px_rgba(255,255,255,0.07),0_12px_30px_rgba(2,6,23,0.16)] ring-1 ring-white/26 backdrop-blur-xl backdrop-saturate-200 transition active:scale-[0.985]"
    : "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/34 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.05)_46%,rgba(255,255,255,0.02)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.36),inset_0_-1px_3px_rgba(255,255,255,0.05),0_12px_28px_rgba(2,6,23,0.16)] ring-1 ring-white/22 backdrop-blur-xl backdrop-saturate-200 transition active:scale-[0.985]";
  const chromeIconBubbleClass = isOverlay
    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.045)_100%)] text-white/95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.44),inset_0_-1px_2px_rgba(255,255,255,0.06),0_3px_10px_rgba(2,6,23,0.10)] ring-1 ring-white/26"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.04)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),inset_0_-1px_2px_rgba(255,255,255,0.05)] ring-1 ring-white/22";
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
    ? "bg-emerald-300 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_8px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/36"
    : isOverlay
      ? "bg-white/[0.13] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.30)] ring-1 ring-white/24 backdrop-blur-xl backdrop-saturate-200"
      : "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-white/20 backdrop-blur-xl backdrop-saturate-200";
  const lineButtonClass = "w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]";
  const unknownTitleClass = isOverlay ? "italic text-white/78" : "italic text-white/82";
  const handoffTitleClass = isOverlay ? "italic text-sky-50" : "italic text-sky-50";
  const totalsBoxClass = isOverlay
    ? "mt-3 shrink-0 rounded-[24px] border border-white/28 bg-slate-950/24 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_-8px_24px_rgba(2,6,23,0.16)] ring-1 ring-white/18 backdrop-blur-xl backdrop-saturate-200"
    : "mt-3 shrink-0 rounded-[24px] border border-white/22 bg-slate-950/30 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_-8px_24px_rgba(2,6,23,0.18)] ring-1 ring-white/14 backdrop-blur-xl backdrop-saturate-200";

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
