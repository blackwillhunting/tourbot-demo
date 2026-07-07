
export default function SmartBarTeaserPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(135deg,_#f8fbff_0%,_#eef6ff_42%,_#f8fafc_100%)] px-5 py-8 text-slate-950 sm:px-6 sm:py-12">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col items-center justify-center text-center">
        <div className="mb-5 inline-flex items-center rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-950 shadow-sm backdrop-blur">
          SmartBar for takeout orders
        </div>

        <h1 className="max-w-3xl text-balance text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
          Customers say what they want. Your team gets a kitchen-ready ticket.
        </h1>

        <p className="mt-5 max-w-2xl text-pretty text-base font-medium leading-7 text-slate-600 sm:text-lg">
          SmartBar helps pizza shops take orders without tying up the phone or making customers fill out online forms.
        </p>

        <div className="mt-8 w-full max-w-[420px] rounded-[30px] border border-white/80 bg-white/85 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.18)] ring-1 ring-blue-100/70 backdrop-blur-xl">
          <video
            className="aspect-square w-full rounded-[22px] bg-slate-950 object-cover shadow-inner"
            src="/videos/smartbar-end-to-end-teaser.mp4"
            controls
            playsInline
            preload="metadata"
          />
        </div>

        <div className="mt-8 rounded-[26px] border border-blue-100 bg-white/82 px-6 py-5 text-center shadow-[0_18px_54px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-extrabold uppercase tracking-[0.22em] text-blue-900">Want the full walkthrough?</div>
          <p className="mt-2 text-base font-semibold text-slate-700">
            Use the demo link from the email we sent you.
          </p>
        </div>
      </section>
    </main>
  );
}

