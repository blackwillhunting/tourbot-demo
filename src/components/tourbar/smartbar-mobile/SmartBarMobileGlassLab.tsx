import type { CSSProperties } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";

const pageCardStyle: CSSProperties = {
  background: "rgba(7, 12, 28, 0.68)",
  border: "1px solid rgba(255, 255, 255, 0.10)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const glassFrameStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.075) 46%, rgba(255,255,255,0.032) 100%)",
  border: "1px solid rgba(255,255,255,0.44)",
  boxShadow:
    "inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -1px 4px rgba(255,255,255,0.08), 0 22px 70px rgba(2,6,23,0.38)",
  backdropFilter: "blur(14px) saturate(180%)",
  WebkitBackdropFilter: "blur(14px) saturate(180%)",
};

const glassPillStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.085) 48%, rgba(255,255,255,0.035) 100%)",
  border: "1px solid rgba(255,255,255,0.44)",
  boxShadow:
    "inset 0 1px 1px rgba(255,255,255,0.48), inset 0 -1px 3px rgba(255,255,255,0.08), 0 12px 34px rgba(2,6,23,0.38)",
  backdropFilter: "blur(12px) saturate(180%)",
  WebkitBackdropFilter: "blur(12px) saturate(180%)",
};

const totalsStyle: CSSProperties = {
  background: "rgba(3, 8, 24, 0.54)",
  border: "1px solid rgba(255,255,255,0.20)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 -8px 24px rgba(2,6,23,0.18)",
};

const completePillStyle: CSSProperties = {
  background: "rgba(110, 231, 183, 0.88)",
  color: "#06291f",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42), 0 8px 18px rgba(16,185,129,0.18)",
};

const pendingPillStyle: CSSProperties = {
  background: "rgba(244, 63, 94, 0.90)",
  color: "#fff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.26), 0 8px 18px rgba(244,63,94,0.20)",
};

const extrasPillStyle: CSSProperties = {
  background: "rgba(253, 224, 71, 0.90)",
  color: "#111827",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.38), 0 8px 18px rgba(245,158,11,0.18)",
};

const pendingRowStyle: CSSProperties = {
  background: "rgba(225, 29, 72, 0.86)",
  border: "1px solid rgba(255, 205, 214, 0.55)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.24), 0 12px 32px rgba(244,63,94,0.22)",
};

const optionsRowStyle: CSSProperties = {
  background: "rgba(250, 204, 21, 0.88)",
  border: "1px solid rgba(254, 240, 138, 0.70)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.42), 0 12px 32px rgba(245,158,11,0.20)",
};

function PageCard({
  title,
  price,
  body,
  offset = false,
}: {
  title: string;
  price: string;
  body: string;
  offset?: boolean;
}) {
  return (
    <article
      className={`rounded-[28px] px-5 py-5 ${offset ? "translate-y-3" : ""}`}
      style={pageCardStyle}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-black tracking-[-0.02em] text-white">{title}</h2>
          <p className="mt-3 max-w-[280px] text-[15px] font-semibold leading-6 text-white/62">{body}</p>
        </div>
        <div className="rounded-full bg-white/92 px-3 py-1 text-sm font-black text-slate-950">{price}</div>
      </div>
    </article>
  );
}

function CountPill({
  label,
  count,
  style,
}: {
  label: string;
  count: string;
  style: CSSProperties;
}) {
  return (
    <div
      className="flex min-h-[58px] flex-col items-center justify-center rounded-full px-2 py-2 text-center font-black uppercase"
      style={style}
    >
      <span className="text-[11px] leading-none tracking-[0.18em]">{label}</span>
      <span className="mt-2 text-[19px] leading-none tracking-normal">{count}</span>
    </div>
  );
}

function CartRow({
  title,
  helper,
  price,
  variant,
}: {
  title: string;
  helper: string;
  price: string;
  variant: "pending" | "options";
}) {
  const isOptions = variant === "options";

  return (
    <div
      className={`rounded-[22px] p-4 ${isOptions ? "text-slate-950" : "text-white"}`}
      style={isOptions ? optionsRowStyle : pendingRowStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[20px] font-black tracking-[-0.01em]">{title}</div>
          <div className={`mt-2 text-[15px] font-bold ${isOptions ? "text-slate-950/64" : "text-white/70"}`}>
            {helper}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3 text-right">
          <div className="text-[18px] font-black">{price}</div>
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
              isOptions ? "bg-white/18 text-slate-950/72" : "bg-white/12 text-white/74"
            }`}
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmartBarMobileGlassLab() {
  return (
    <main className="min-h-[100svh] overflow-hidden bg-[#030712] text-white">
      <div className="relative mx-auto min-h-[100svh] w-full max-w-[390px] overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(251,146,60,0.22),transparent_28%),radial-gradient(circle_at_82%_72%,rgba(244,63,94,0.20),transparent_34%),linear-gradient(180deg,#050917_0%,#070b18_48%,#030712_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:36px_36px]" />

        <header className="relative z-[1] px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-2xl ring-1 ring-white/10">
              ☰
            </div>
            <div>
              <div className="text-[24px] font-black tracking-[-0.03em]">BurgerRush Carryout</div>
              <div className="mt-1 text-[15px] font-semibold text-white/58">Fast food ordering without the menu maze</div>
            </div>
          </div>

          <nav className="mt-5 flex h-12 items-center gap-2 overflow-hidden rounded-full border border-white/12 bg-white/[0.055] p-1 text-[14px] font-black text-white/74">
            <span className="rounded-full bg-orange-400 px-6 py-3 text-slate-950">Combos</span>
            <span className="px-5">Burgers</span>
            <span className="px-5">Chicken</span>
            <span className="px-5">Nuggets</span>
          </nav>
        </header>

        <section className="relative z-[1] mt-7 space-y-5 px-5 pb-40">
          <PageCard
            title="Classic Burger"
            price="$4.99"
            body="Beef patty, pickles, onions, ketchup, and mustard on a toasted bun."
          />
          <PageCard
            title="Fries"
            price="$2.49"
            body="Crisp golden fries with small, medium, or large side size options."
            offset
          />
          <PageCard
            title="Milkshake"
            price="$4.29"
            body="Choose chocolate, vanilla, or strawberry. SmartBar flags the required choice."
          />
          <PageCard
            title="How TourBot works"
            price="+ Add"
            body="The page stays visible under the assistant while solid cart objects remain readable."
            offset
          />
        </section>

        <section className="pointer-events-none absolute inset-x-0 bottom-[92px] z-[3] flex justify-center px-0">
          <div className="w-[342px] rounded-[30px] p-4" style={glassFrameStyle}>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[25px] font-black tracking-[-0.03em]">Review order</h1>
              <div className="rounded-full bg-white/22 px-4 py-2 text-[15px] font-black text-white/92 ring-1 ring-white/24">
                2 open
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <CountPill label="Complete" count="0" style={completePillStyle} />
              <CountPill label="Pending" count="2" style={pendingPillStyle} />
              <CountPill label="Extras" count="1" style={extrasPillStyle} />
            </div>

            <div className="mt-4 space-y-3">
              <CartRow title="Fries" helper="Choose side size" price="—" variant="pending" />
              <CartRow title="Classic Burger" helper="Options available" price="$4.99" variant="options" />
            </div>

            <div className="mt-5 rounded-[24px] px-5 py-4" style={totalsStyle}>
              <div className="flex items-center justify-between text-[12px] font-black uppercase tracking-[0.16em] text-white/62">
                <span>Subtotal</span>
                <span className="tabular-nums text-white">$4.99</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12px] font-black uppercase tracking-[0.16em] text-white/62">
                <span>Est. tax</span>
                <span className="tabular-nums text-white">$0.41</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/14 pt-3 text-[21px] font-black tracking-[-0.03em]">
                <span>Total</span>
                <span className="tabular-nums">$5.40</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="pointer-events-none absolute inset-x-0 bottom-[30px] z-[4] flex justify-center">
          <div className="relative h-[46px] w-[342px]">
            <button
              type="button"
              className="absolute left-0 flex h-[46px] w-[46px] items-center justify-center rounded-full text-white"
              style={glassPillStyle}
              aria-label="Close mock SmartBar"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute left-[58px] flex h-[46px] w-[226px] items-center justify-center rounded-full px-4 text-[17px] font-bold text-white"
              style={glassPillStyle}
            >
              2 need attention
            </button>
            <button
              type="button"
              className="absolute right-0 flex h-[46px] w-[46px] items-center justify-center rounded-full text-white"
              style={glassPillStyle}
              aria-label="Collapse mock SmartBar"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
