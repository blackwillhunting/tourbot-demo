import SmartBarChatAdapter from "./adapters/SmartBarChatAdapter";
import SmartBarInformationalAdapter from "./adapters/SmartBarInformationalAdapter";

type SmartBarLiveMobileRuntimeLane = "informational" | "chat";

type SmartBarLiveMobileRuntimeProps = {
  lane?: SmartBarLiveMobileRuntimeLane;
};

function smartBarLiveMobileRuntimeLaneFromUrl(fallback: SmartBarLiveMobileRuntimeLane) {
  if (typeof window === "undefined") return fallback;

  const lane = new URLSearchParams(window.location.search).get("lane");
  return lane === "chat" ? "chat" : fallback;
}

function NexaPathLiveTestSurface({ lane }: { lane: SmartBarLiveMobileRuntimeLane }) {
  const isChat = lane === "chat";

  return (
    <main className="min-h-[100svh] bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_48%,#f8fafc_100%)] px-5 pb-36 pt-8 text-slate-950">
      <section className="mx-auto max-w-[760px] space-y-5">
        <div className="rounded-[32px] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
            {isChat ? "NexaPath mobile chat lane" : "NexaPath live mobile test"}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {isChat ? "Open SmartBar consultant chat." : "Ask SmartBar about this service site."}
          </h1>
          <p className="mt-3 text-base font-semibold leading-7 text-slate-600">
            {isChat
              ? "This route opens the new SmartBar mobile shell directly into a consultant-style chat surface without touching the current live routes."
              : "This route is only a proof harness. It uses the new SmartBar mobile shell and the live NexaPath informational backend without touching the current live routes."}
          </p>
        </div>

        <section id="services" data-tour-id="services" className="rounded-[28px] bg-white/86 p-5 shadow-sm ring-1 ring-slate-200/80">
          <h2 className="text-xl font-black">Services</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            NexaPath helps teams modernize support operations, implementation planning, system integration, workflow automation, and AI readiness.
          </p>
        </section>

        <section id="pricing" data-tour-id="pricing" className="rounded-[28px] bg-white/86 p-5 shadow-sm ring-1 ring-slate-200/80">
          <h2 className="text-xl font-black">Pricing and engagement</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Engagements can start with an advisory review, a scoped implementation plan, or a guided consultation depending on what the buyer needs.
          </p>
        </section>

        <section id="consultation" data-tour-id="consultation" className="rounded-[28px] bg-white/86 p-5 shadow-sm ring-1 ring-slate-200/80">
          <h2 className="text-xl font-black">Consultation handoff</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Visitors who need help choosing a service can be guided toward a consultation handoff instead of being forced through a static contact form.
          </p>
        </section>
      </section>
    </main>
  );
}

export default function SmartBarLiveMobileRuntime({ lane = "informational" }: SmartBarLiveMobileRuntimeProps) {
  const effectiveLane = smartBarLiveMobileRuntimeLaneFromUrl(lane);

  return (
    <>
      <NexaPathLiveTestSurface lane={effectiveLane} />
      {effectiveLane === "chat" ? (
        <SmartBarChatAdapter />
      ) : (
        <SmartBarInformationalAdapter siteId="nexapath" />
      )}
    </>
  );
}
