import { useState } from "react";
import { ArrowLeft, ReceiptText, XCircle } from "lucide-react";
import SmartBarMobileShell from "../smartbar-mobile/SmartBarMobileShell";

type SmartBarSandboxWorkbenchProps = {
  onBack: () => void;
};

const placeholderTiles = [
  {
    id: "T-001",
    title: "Ticket shell",
    subtitle: "Tap to preview",
    active: true,
  },
  {
    id: "T-002",
    title: "Waiting",
    subtitle: "Next test order",
    active: false,
  },
  {
    id: "T-003",
    title: "Waiting",
    subtitle: "Next test order",
    active: false,
  },
  {
    id: "T-004",
    title: "Waiting",
    subtitle: "Next test order",
    active: false,
  },
];

export default function SmartBarSandboxWorkbench({ onBack }: SmartBarSandboxWorkbenchProps) {
  const [ticketOpen, setTicketOpen] = useState(false);

  return (
    <>
      <div className="mx-auto mt-5 max-w-xl rounded-[28px] bg-white/92 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.08)] ring-1 ring-white/80 sm:mt-7 sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1 py-1">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Sandbox
            </div>
            <h3 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">
              Test Workbench
            </h3>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </button>
        </div>

        <section className="mt-3 rounded-[24px] bg-[#012169] p-3 text-white shadow-[0_16px_32px_rgba(1,33,105,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ReceiptText className="h-4 w-4 text-sky-100" />
              Test orders
            </div>
            <div className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-50/85 ring-1 ring-white/15">
              Shell
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {placeholderTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                disabled={!tile.active}
                onClick={() => setTicketOpen(true)}
                className={[
                  "rounded-2xl p-2.5 text-left ring-1 transition",
                  tile.active
                    ? "bg-white text-slate-950 ring-white/70 hover:-translate-y-0.5"
                    : "bg-white/8 text-sky-50/60 ring-white/12",
                ].join(" ")}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">
                  {tile.id}
                </div>
                <div className="mt-1 truncate text-sm font-semibold">{tile.title}</div>
                <div className="mt-0.5 truncate text-[11px] opacity-70">{tile.subtitle}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_0%,rgba(219,234,254,0.92),transparent_42%),linear-gradient(180deg,#eef7ff_0%,#e7f3ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] ring-1 ring-sky-100/80">
          <div className="relative h-[330px] overflow-hidden [transform:translateZ(0)] sm:h-[360px]">
            <div className="pointer-events-none absolute inset-x-5 top-5 rounded-[22px] bg-white/62 p-4 text-slate-700 shadow-[0_16px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                SmartBar
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                Say or type a test order.
              </div>
            </div>

            <SmartBarMobileShell
              mode="overlay"
              introCallout={{
                title: "Say or type a test order",
              }}
              demoRestCompanion={{ label: "SmartBar", showLogo: true }}
              entryModeLabel="Say or type order"
              buildingLabel="Building test ticket..."
              compactCartRows
              onSubmitPrompt={(query) => ({
                surfaceKind: "info",
                eyebrow: "Sandbox",
                title: "Ticket builder comes next",
                body: query.trim()
                  ? "Next, this order will become a test ticket."
                  : "Next, SmartBar will turn test orders into tickets.",
                statusLabel: "Shell",
                height: 260,
              })}
            />
          </div>
        </section>
      </div>

      {ticketOpen && (
        <div className="fixed inset-0 z-[10090] grid place-items-center bg-slate-950/42 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-4 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-white/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Ticket
                </div>
                <h4 className="mt-1 text-xl font-semibold tracking-tight">Ticket Shell</h4>
              </div>
              <button
                type="button"
                onClick={() => setTicketOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-950"
                aria-label="Close ticket"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
              <div className="text-sm font-semibold text-slate-700">Generated ticket appears here.</div>
              <div className="mt-2 text-sm leading-5 text-slate-500">
                The next patch will turn SmartBar orders into ticket tiles.
              </div>
            </div>

            <div className="mt-3 rounded-3xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">
              Scorecard area
            </div>
          </div>
        </div>
      )}
    </>
  );
}

