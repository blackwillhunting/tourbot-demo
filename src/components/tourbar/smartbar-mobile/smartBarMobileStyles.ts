export type SmartBarMobileStyleStatus = "ready" | "pending" | "options" | "unknown";

const SMARTBAR_MOBILE_PILL_INTENSITY: "soft" | "strong" = "strong";
const SMARTBAR_MOBILE_STRONG_PILLS = SMARTBAR_MOBILE_PILL_INTENSITY === "strong";

export function statusClass(status: SmartBarMobileStyleStatus) {
  if (status === "ready") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (status === "pending") return "bg-rose-100 text-rose-900 ring-rose-200";
  if (status === "options") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-slate-200 text-slate-700 ring-slate-300";
}

export function smartBarMobileRibbonPillClass(kind: "complete" | "pending" | "extras", isOverlay: boolean) {
  const strong = SMARTBAR_MOBILE_STRONG_PILLS;

  if (kind === "complete") {
    return isOverlay
      ? strong
        ? "bg-emerald-300/98 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.50),0_8px_18px_rgba(16,185,129,0.24)] ring-1 ring-emerald-50/54"
        : "bg-emerald-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_8px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/44"
      : strong
        ? "bg-emerald-300/96 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(16,185,129,0.22)] ring-1 ring-emerald-50/48"
        : "bg-emerald-300/86 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_8px_18px_rgba(16,185,129,0.16)] ring-1 ring-emerald-100/36";
  }

  if (kind === "pending") {
    return isOverlay
      ? strong
        ? "bg-rose-500/98 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_8px_18px_rgba(244,63,94,0.28)] ring-1 ring-rose-50/42"
        : "bg-rose-500/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_rgba(244,63,94,0.20)] ring-1 ring-rose-100/32"
      : strong
        ? "bg-rose-500/96 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_8px_18px_rgba(244,63,94,0.25)] ring-1 ring-rose-50/36"
        : "bg-rose-500/86 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_rgba(244,63,94,0.18)] ring-1 ring-rose-100/28";
  }

  return isOverlay
    ? strong
      ? "bg-amber-300/98 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.50),0_8px_18px_rgba(245,158,11,0.25)] ring-1 ring-amber-50/52"
      : "bg-amber-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(245,158,11,0.18)] ring-1 ring-amber-100/42"
    : strong
      ? "bg-amber-300/96 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(245,158,11,0.22)] ring-1 ring-amber-50/46"
      : "bg-amber-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_8px_18px_rgba(245,158,11,0.16)] ring-1 ring-amber-100/34";
}

export function smartBarMobileRowSurfaceClass(status: SmartBarMobileStyleStatus, isOverlay: boolean) {
  const strong = SMARTBAR_MOBILE_STRONG_PILLS;

  if (isOverlay) {
    if (status === "ready") {
      return strong
        ? "border-emerald-50/70 bg-emerald-300/94 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_12px_30px_rgba(16,185,129,0.22)] ring-1 ring-emerald-50/42"
        : "border-emerald-100/62 bg-emerald-300/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_30px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/32";
    }
    if (status === "pending") {
      return strong
        ? "border-rose-50/60 bg-rose-500/94 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_12px_32px_rgba(244,63,94,0.28)] ring-1 ring-rose-50/34"
        : "border-rose-100/52 bg-rose-500/82 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_32px_rgba(244,63,94,0.22)] ring-1 ring-rose-100/26";
    }
    if (status === "options") {
      return strong
        ? "border-amber-50/74 bg-amber-300/96 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.50),0_12px_32px_rgba(245,158,11,0.25)] ring-1 ring-amber-50/44"
        : "border-amber-100/68 bg-amber-300/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_32px_rgba(245,158,11,0.20)] ring-1 ring-amber-100/34";
    }
    return strong
      ? "border-white/46 bg-slate-200/90 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_30px_rgba(2,6,23,0.24)] ring-1 ring-white/30"
      : "border-white/36 bg-slate-200/78 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_30px_rgba(2,6,23,0.22)] ring-1 ring-white/22";
  }

  if (status === "ready") {
    return strong
      ? "border-emerald-50/66 bg-emerald-300/92 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_28px_rgba(16,185,129,0.20)] ring-1 ring-emerald-50/38"
      : "border-emerald-100/58 bg-emerald-300/80 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_28px_rgba(16,185,129,0.16)] ring-1 ring-emerald-100/30";
  }
  if (status === "pending") {
    return strong
      ? "border-rose-50/58 bg-rose-500/92 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_30px_rgba(244,63,94,0.25)] ring-1 ring-rose-50/32"
      : "border-rose-100/50 bg-rose-500/78 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_30px_rgba(244,63,94,0.20)] ring-1 ring-rose-100/24";
  }
  if (status === "options") {
    return strong
      ? "border-amber-50/70 bg-amber-300/94 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_12px_30px_rgba(245,158,11,0.22)] ring-1 ring-amber-50/40"
      : "border-amber-100/64 bg-amber-300/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_30px_rgba(245,158,11,0.18)] ring-1 ring-amber-100/32";
  }
  return strong
    ? "border-white/40 bg-slate-200/86 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_28px_rgba(15,23,42,0.24)] ring-1 ring-white/26"
    : "border-white/32 bg-slate-200/72 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_28px_rgba(15,23,42,0.22)] ring-1 ring-white/18";
}

export function smartBarMobileHandoffRowSurfaceClass(isOverlay: boolean) {
  const strong = SMARTBAR_MOBILE_STRONG_PILLS;

  return isOverlay
    ? strong
      ? "border-sky-50/60 bg-sky-400/88 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_32px_rgba(14,165,233,0.24)] ring-1 ring-sky-50/38"
      : "border-sky-100/50 bg-sky-400/72 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_12px_32px_rgba(14,165,233,0.20)] ring-1 ring-sky-100/28"
    : strong
      ? "border-sky-50/54 bg-sky-400/84 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_12px_30px_rgba(14,165,233,0.22)] ring-1 ring-sky-50/34"
      : "border-sky-100/44 bg-sky-400/68 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_12px_30px_rgba(14,165,233,0.18)] ring-1 ring-sky-100/24";
}

export function getSmartBarMobileShellStyles(isOverlay: boolean, checkoutReady: boolean) {
  const rootTextClass = isOverlay ? "text-white" : "text-white";
  const upperGlassClass = isOverlay
    ? "overflow-hidden border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.155)_0%,rgba(255,255,255,0.082)_46%,rgba(255,255,255,0.028)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.76),inset_0_-1px_5px_rgba(255,255,255,0.052),0_18px_50px_rgba(2,6,23,0.22)] ring-1 ring-white/52 backdrop-blur-[24px] backdrop-saturate-[170%]"
    : "overflow-hidden border border-white/64 bg-[linear-gradient(180deg,rgba(255,255,255,0.138)_0%,rgba(255,255,255,0.072)_46%,rgba(255,255,255,0.024)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.68),inset_0_-1px_5px_rgba(255,255,255,0.046),0_16px_46px_rgba(2,6,23,0.20)] ring-1 ring-white/46 backdrop-blur-[24px] backdrop-saturate-[170%]";
  const chromePillClass = isOverlay
    ? "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/62 bg-[linear-gradient(180deg,rgba(255,255,255,0.030)_0%,rgba(255,255,255,0.007)_48%,rgba(255,255,255,0.000)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.62),inset_0_-1px_2px_rgba(255,255,255,0.018),0_7px_18px_rgba(2,6,23,0.12)] ring-1 ring-white/38 backdrop-blur-[4px] backdrop-saturate-[135%] transition active:scale-[0.985]"
    : "pointer-events-auto absolute top-0 flex items-center justify-center rounded-full border border-white/54 bg-[linear-gradient(180deg,rgba(255,255,255,0.026)_0%,rgba(255,255,255,0.006)_48%,rgba(255,255,255,0.000)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.54),inset_0_-1px_2px_rgba(255,255,255,0.016),0_7px_16px_rgba(2,6,23,0.10)] ring-1 ring-white/32 backdrop-blur-[4px] backdrop-saturate-[135%] transition active:scale-[0.985]";
  const chromeIconBubbleClass = isOverlay
    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.060)_0%,rgba(255,255,255,0.014)_100%)] text-white/96 shadow-[inset_0_1px_1px_rgba(255,255,255,0.46),inset_0_-1px_2px_rgba(255,255,255,0.016),0_2px_7px_rgba(2,6,23,0.08)] ring-1 ring-white/38 backdrop-blur-[3px] [text-shadow:0_1px_2px_rgba(0,0,0,0.50)]"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.052)_0%,rgba(255,255,255,0.012)_100%)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.38),inset_0_-1px_2px_rgba(255,255,255,0.014)] ring-1 ring-white/32 backdrop-blur-[3px] [text-shadow:0_1px_2px_rgba(0,0,0,0.50)]";
  const chromeLabelClass = isOverlay
    ? "font-semibold text-white/98 [text-shadow:0_1px_3px_rgba(0,0,0,0.72)]"
    : "font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.66)]";
  const chromeBlueBadgeClass =
    "inline-flex min-w-0 items-center justify-center rounded-full bg-[#012169] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_7px_18px_rgba(1,33,105,0.34)] ring-1 ring-white/24";
  const chromeBlueIconClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#012169] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_5px_14px_rgba(1,33,105,0.32)] ring-1 ring-white/24";
  const chromeBlueLabelClass =
    "min-w-0 truncate text-center font-normal tracking-normal text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.30)]";
  const inputDraftCapsuleClass =
    "mx-auto inline-flex max-h-[64px] max-w-full items-center justify-center overflow-hidden rounded-full bg-[#012169] px-4 py-2 text-center text-[16px] font-normal leading-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_8px_20px_rgba(1,33,105,0.32)] ring-1 ring-white/24 [text-shadow:0_1px_1px_rgba(0,0,0,0.28)] whitespace-pre-wrap break-words";
  const mainMutedTextClass = isOverlay ? "text-slate-950/78 [text-shadow:0_1px_0_rgba(255,255,255,0.10)]" : "text-slate-950/74";
  const softTextClass = isOverlay ? "text-white/72" : "text-white/62";
  const quietTextClass = isOverlay
    ? "inline-flex w-fit items-center rounded-full border border-white/16 bg-slate-950/56 px-2.5 py-1 text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(2,6,23,0.18)] ring-1 ring-white/10 [text-shadow:0_1px_2px_rgba(0,0,0,0.62)]"
    : "inline-flex w-fit items-center rounded-full border border-white/14 bg-slate-950/50 px-2.5 py-1 text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_12px_rgba(2,6,23,0.16)] ring-1 ring-white/10 [text-shadow:0_1px_2px_rgba(0,0,0,0.58)]";
  const skyEyebrowClass = isOverlay
    ? "inline-flex w-fit items-center rounded-full border border-sky-100/22 bg-[#012169]/82 px-2.5 py-1 text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_12px_rgba(1,33,105,0.22)] ring-1 ring-white/12 [text-shadow:0_1px_2px_rgba(0,0,0,0.58)]"
    : "inline-flex w-fit items-center rounded-full border border-sky-100/20 bg-[#012169]/78 px-2.5 py-1 text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(1,33,105,0.20)] ring-1 ring-white/10 [text-shadow:0_1px_2px_rgba(0,0,0,0.54)]";
  const inputTextClass = isOverlay ? "text-white caret-white" : "text-white caret-white";
  const retryInputClass = isOverlay
    ? "mt-3 h-[96px] w-full resize-none rounded-[26px] border border-white/12 bg-slate-950/20 px-4 py-3 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-white/38 caret-white"
    : "mt-3 h-[96px] w-full resize-none rounded-[26px] border border-white/10 bg-slate-950/28 px-4 py-3 text-center text-[16px] font-bold leading-5 text-white outline-none ring-0 placeholder:text-white/28 caret-white";
  const strongPills = SMARTBAR_MOBILE_STRONG_PILLS;
  const issuePillClass = checkoutReady
    ? strongPills
      ? "bg-emerald-300/98 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_rgba(16,185,129,0.24)] ring-1 ring-emerald-50/46"
      : "bg-emerald-300 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_8px_18px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100/36"
    : isOverlay
      ? strongPills
        ? "bg-white/[0.38] text-white/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ring-1 ring-white/38"
        : "bg-white/[0.24] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)] ring-1 ring-white/28"
      : strongPills
        ? "bg-white/[0.32] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.34)] ring-1 ring-white/30"
        : "bg-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] ring-1 ring-white/22";
  const lineButtonClass = "w-full rounded-2xl border p-3 text-left transition active:scale-[0.99]";
  const unknownTitleClass = isOverlay ? "italic text-slate-950/88" : "italic text-slate-950/88";
  const handoffTitleClass = isOverlay ? "italic text-sky-50" : "italic text-sky-50";
  const totalsBoxClass = isOverlay
    ? "mt-3 shrink-0 rounded-[24px] border border-sky-100/34 bg-[rgba(1,33,105,0.96)] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_-8px_24px_rgba(1,33,105,0.30),0_10px_28px_rgba(2,6,23,0.24)] ring-1 ring-white/20"
    : "mt-3 shrink-0 rounded-[24px] border border-sky-100/30 bg-[rgba(1,33,105,0.94)] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_-8px_24px_rgba(1,33,105,0.26),0_10px_26px_rgba(2,6,23,0.22)] ring-1 ring-white/18";

  return {
    rootTextClass,
    upperGlassClass,
    chromePillClass,
    chromeIconBubbleClass,
    chromeLabelClass,
    chromeBlueBadgeClass,
    chromeBlueIconClass,
    chromeBlueLabelClass,
    inputDraftCapsuleClass,
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
