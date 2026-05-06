import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Shield,
  Cloud,
  Sparkles,
  Briefcase,
  ChevronRight,
  Landmark,
  Database,
  Network,
  BarChart3,
} from "lucide-react";
import GuideShellStatic, { type GuideShellDemoCommand } from "./components/GuideShellStatic";
import DemoController, { type DemoStatus } from "./demo/DemoController";
import { guidedDiscoveryDemo } from "./demo/demoScripts";

export type PageId = "home" | "solutions" | "cyber" | "hedge-fund" | "compliance";

export type Section = {
  id: string;
  title: string;
  body: string;
};

export type Page = {
  id: PageId;
  title: string;
  subtitle: string;
  hero: string;
  sections: Section[];
};

export type TourStep = {
  pageId: PageId;
  anchorId: string;
  title: string;
  summary: string;
  bridge?: string;
};

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[18px] border border-white/70 bg-white/92 shadow-sm shadow-slate-200/70 ring-1 ring-slate-950/[0.03] backdrop-blur sm:rounded-[28px] ${className}`}
    >
      {children}
    </div>
  );
}

function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

function Button({
  className = "",
  variant = "default",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
}) {
  const variantClass =
    variant === "outline"
      ? "border border-slate-300 bg-white/80 text-slate-900 hover:bg-white hover:shadow-sm"
      : "bg-slate-950 text-white shadow-sm hover:bg-slate-800";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export const PAGES: Record<PageId, Page> = {
  home: {
    id: "home",
    title: "Modern intelligent services for regulated firms",
    subtitle: "Guided Discovery demo for TourBot prototyping",
    hero:
      "This NexaPath Advisory demo is designed to demonstrate guided discovery across a dense B2B website. It emphasizes capability families, industry fit, and compliance-aware messaging.",
    sections: [
      {
        id: "hero-modern-provider",
        title: "Who we are",
        body:
          "We position ourselves as a modern intelligent services partner helping regulated and financial firms modernize infrastructure, strengthen resilience, and improve decision support.",
      },
      {
        id: "solutions-grid",
        title: "Core solution families",
        body:
          "Explore four major capability lanes: AI & Data Solutions, Cloud & Infrastructure, Cybersecurity & Compliance, and Managed Solutions.",
      },
      {
        id: "proof-points",
        title: "Why firms choose us",
        body:
          "This prototype uses proof-point blocks to make the site more tour-friendly: operating rigor, regulated-industry familiarity, secure cloud foundations, and practical AI adoption.",
      },
      {
        id: "industries-preview",
        title: "Industries served",
        body:
          "We organize value around industry reality, not just technology. Sample focus areas include hedge funds, private equity, insurance, and biotech.",
      },
      {
        id: "compliance-preview",
        title: "Compliance lens",
        body:
          "Regulatory and policy pressure shapes nearly every technology decision in this mock site. The compliance center gives visitors a way to explore that lens directly.",
      },
      {
        id: "contact-cta",
        title: "Talk to a specialist",
        body:
          "When a visitor is ready, the site should make it easy to continue into a sales or solution-design conversation.",
      },
    ],
  },
  solutions: {
    id: "solutions",
    title: "Solutions Overview",
    subtitle: "Choose the lane that best matches your problem",
    hero:
      "This page is meant to act as a routing layer. It lets a guide system compare offerings, explain differences, and take a user into the right capability path.",
    sections: [
      {
        id: "solution-comparison",
        title: "How to choose",
        body:
          "Use AI & Data for intelligence and workflow uplift, Cloud & Infrastructure for platforms and scalability, Cybersecurity & Compliance for resilience and governance, and Managed Solutions for sustained operational delivery.",
      },
      {
        id: "solution-ai-data",
        title: "AI & Data Solutions",
        body:
          "Governed AI, copilots, workflow automation, application development, and data foundations that support decision-making and controlled modernization.",
      },
      {
        id: "solution-cloud",
        title: "Cloud & Infrastructure",
        body:
          "Secure cloud platforms, migrations, enterprise systems, networking, and operational foundations built for reliability and scale.",
      },
      {
        id: "solution-cyber",
        title: "Cybersecurity & Compliance",
        body:
          "Managed protection, governance, policy management, vendor assessments, incident readiness, and vulnerability reduction.",
      },
      {
        id: "solution-managed",
        title: "Managed Solutions",
        body:
          "Managed service delivery designed to keep environments stable, responsive, secure, and well supported over time.",
      },
    ],
  },
  cyber: {
    id: "cyber",
    title: "Cybersecurity & Compliance",
    subtitle: "Protection, governance, readiness, and resilience",
    hero:
      "This page is intentionally modular so a tour system can move step by step across cyber operations, governance, and technical assessment layers.",
    sections: [
      {
        id: "cyber-hero",
        title: "Cyber overview",
        body:
          "A practical cyber program blends active protection, policy structure, third-party awareness, and technical hardening.",
      },
      {
        id: "managed-xdr",
        title: "Managed XDR",
        body:
          "Operational monitoring, response visibility, and sustained detection support for active defense and rapid escalation.",
      },
      {
        id: "dark-web-monitoring",
        title: "Dark Web Monitoring",
        body:
          "Visibility into exposed credentials, leaked mentions, and threat indicators that may signal elevated risk.",
      },
      {
        id: "phishing-training",
        title: "Phishing & Training",
        body:
          "Behavioral resilience matters. Security awareness and phishing readiness strengthen the human layer of defense.",
      },
      {
        id: "incident-response-tabletop",
        title: "Incident Response Tabletop",
        body:
          "Scenario planning, response coordination, and rehearsed decision making help firms react with discipline when real events occur.",
      },
      {
        id: "governance-risk",
        title: "Governance & Risk",
        body:
          "Translate cyber pressure into policy, controls, accountability, and confidence for leadership, auditors, and stakeholders.",
      },
      {
        id: "policy-management",
        title: "Policy Management",
        body:
          "Document, align, and maintain policy structures so operational teams and regulators are not working from guesswork.",
      },
      {
        id: "vendor-assessments",
        title: "Vendor Assessments",
        body:
          "Third-party risk can become your risk quickly. Assessment workflows help organizations understand and manage that exposure.",
      },
      {
        id: "vulnerability-assessments",
        title: "Vulnerability Assessments",
        body:
          "Technical reviews identify exposed pathways, misconfigurations, and remediation priorities before threats become incidents.",
      },
      {
        id: "cyber-contact-cta",
        title: "Discuss your security posture",
        body:
          "A strong final section for tour demos: once the user understands the cyber story, the guide can move toward engagement.",
      },
    ],
  },
  "hedge-fund": {
    id: "hedge-fund",
    title: "Hedge Fund",
    subtitle: "Industry-specific path for regulated investment operations",
    hero:
      "This prototype page demonstrates how a tour can shift from generic solution language to an industry-specific operating narrative.",
    sections: [
      {
        id: "hedgefund-overview",
        title: "Industry overview",
        body:
          "Hedge funds need secure, scalable platforms, disciplined operations, strong resilience, and a technology partner that understands regulated pressure.",
      },
      {
        id: "hedgefund-cloud",
        title: "Cloud and operations backbone",
        body:
          "Stable infrastructure and secure collaboration support both trading operations and broader firm operations.",
      },
      {
        id: "hedgefund-cyber",
        title: "Cyber resilience and compliance",
        body:
          "Cyber and compliance needs are not side concerns. They shape how the operating model must be designed and maintained.",
      },
      {
        id: "hedgefund-ai-data",
        title: "AI and data",
        body:
          "Data modernization and selective AI can improve visibility, insight, and operating efficiency when built on governed foundations.",
      },
      {
        id: "hedgefund-modern-work",
        title: "Modern work",
        body:
          "The collaboration layer matters too. Strong knowledge flow and practical workflow tooling can improve execution across teams.",
      },
      {
        id: "hedgefund-copilot",
        title: "Copilot journeys",
        body:
          "Copilot-style productivity can enhance workflows, but only when paired with security, policy, and realistic operating priorities.",
      },
      {
        id: "hedgefund-contact-cta",
        title: "Talk through your firm model",
        body:
          "A guided industry tour should end by narrowing toward a concrete next step for the buyer.",
      },
    ],
  },
  compliance: {
    id: "compliance",
    title: "Global Compliance Center",
    subtitle: "Region-based view of regulatory pressure points",
    hero:
      "This page is designed as a stronger destination for the guide system. It contains multiple stop-worthy sections and clear narrative movement from one region to another.",
    sections: [
      {
        id: "compliance-hero",
        title: "Compliance hub",
        body:
          "Use this page as a central map for regulatory themes, risk expectations, and how regulation shapes technology decision making.",
      },
      {
        id: "region-na",
        title: "North America",
        body:
          "North American sections focus on market regulation, operational discipline, cybersecurity expectations, and confidence-building controls.",
      },
      {
        id: "topic-sec",
        title: "SEC",
        body:
          "This section stands in for capital-markets oversight, investor protection concerns, and cyber-related control pressure.",
      },
      {
        id: "topic-finra",
        title: "FINRA",
        body:
          "This section represents brokerage and exchange-market discipline, operational controls, and market integrity expectations.",
      },
      {
        id: "region-emea",
        title: "EMEA",
        body:
          "European and related frameworks add a different emphasis: resilience, privacy, and cross-organizational control maturity.",
      },
      {
        id: "topic-dora",
        title: "DORA",
        body:
          "This section is a useful deeper-drill destination for resilience, ICT risk management, incident handling, testing, and third-party oversight.",
      },
      {
        id: "topic-gdpr",
        title: "GDPR",
        body:
          "This section focuses on privacy, transparency, and rights around personal data—valuable for a tour that wants to widen from resilience into governance.",
      },
      {
        id: "compliance-contact-cta",
        title: "Talk through your compliance priorities",
        body:
          "The guide can use this CTA stop after a multi-step tour to move from education toward conversation.",
      },
    ],
  },
};

export const TOUR_LIBRARY: Record<string, { title: string; intro: string; final: string; steps: TourStep[] }> = {
  overview: {
    title: "Company Overview Tour",
    intro: "I’ll walk you through the NexaPath Advisory story in four stops: who the firm is, its core solution families, the industries it serves, and the compliance lens running through the site.",
    final:
      "That’s the overview. The site presents NexaPath Advisory as a modern intelligent services partner combining infrastructure, security, AI/data, and compliance-aware support for regulated firms.",
    steps: [
      {
        pageId: "home",
        anchorId: "hero-modern-provider",
        title: "Who NexaPath Advisory is",
        summary:
          "This opening stop frames the company as a modern intelligent services partner for regulated firms, not just a basic managed services provider.",
        bridge: "Next I’ll show you the four capability lanes that structure the site.",
      },
      {
        pageId: "home",
        anchorId: "solutions-grid",
        title: "Core solution families",
        summary:
          "These four blocks are the main capability map: AI & Data, Cloud & Infrastructure, Cybersecurity & Compliance, and Managed Solutions.",
        bridge: "Now let’s shift from offerings to who those offerings are designed for.",
      },
      {
        pageId: "home",
        anchorId: "industries-preview",
        title: "Industries served",
        summary:
          "The site does not present technology in a vacuum. It ties its value to industry realities like hedge funds, private equity, insurance, and biotech.",
        bridge: "The final stop shows how regulation and compliance shape the rest of the narrative.",
      },
      {
        pageId: "home",
        anchorId: "compliance-preview",
        title: "Compliance lens",
        summary:
          "Compliance is a visible front-door concern here. The site gives regulation its own narrative space instead of burying it as a technical detail.",
      },
    ],
  },
  cyber: {
    title: "Cybersecurity & Compliance Tour",
    intro: "I’ll walk you through the cyber story step by step, from active defense to governance, policy, third-party risk, and technical resilience.",
    final:
      "That completes the cyber tour. The site frames cybersecurity as an operating model that spans monitoring, governance, policy, vendor risk, and technical hardening.",
    steps: [
      {
        pageId: "cyber",
        anchorId: "cyber-hero",
        title: "Cyber overview",
        summary:
          "This page is designed as a modular journey. It establishes that cyber here means both active protection and compliance-aware governance.",
        bridge: "Let’s start with the operational defense layer.",
      },
      {
        pageId: "cyber",
        anchorId: "managed-xdr",
        title: "Managed XDR",
        summary:
          "Managed XDR is the active defense stop. It represents sustained monitoring, response visibility, and rapid escalation support.",
        bridge: "Defense alone is not enough, so next I’ll move into governance and risk.",
      },
      {
        pageId: "cyber",
        anchorId: "governance-risk",
        title: "Governance & Risk",
        summary:
          "This stop shifts the story from technical operations into accountability, controls, and leadership confidence.",
        bridge: "That leads naturally into policy structure.",
      },
      {
        pageId: "cyber",
        anchorId: "policy-management",
        title: "Policy Management",
        summary:
          "This section shows how cyber posture gets translated into documented policy and operating discipline.",
        bridge: "From there, the tour expands to third-party exposure.",
      },
      {
        pageId: "cyber",
        anchorId: "vendor-assessments",
        title: "Vendor Assessments",
        summary:
          "Vendor risk becomes enterprise risk quickly. This stop broadens the story from internal posture to ecosystem exposure.",
        bridge: "The last stop closes on technical exposure and remediation.",
      },
      {
        pageId: "cyber",
        anchorId: "vulnerability-assessments",
        title: "Vulnerability Assessments",
        summary:
          "This final stop grounds the cyber story in technical assessment and remediation priorities, closing the loop back to concrete action.",
      },
    ],
  },
  hedgefund: {
    title: "Hedge Fund Tour",
    intro: "I’ll walk you through how the site presents NexaPath Advisory’s value for hedge funds: infrastructure, cyber/compliance, AI/data, and workflow enhancement.",
    final:
      "That’s the hedge fund story. The site presents one operating model that combines stable infrastructure, resilience, AI/data insight, and workflow uplift.",
    steps: [
      {
        pageId: "hedge-fund",
        anchorId: "hedgefund-overview",
        title: "Industry overview",
        summary:
          "This opening section frames the hedge fund path as a regulated operating model, not just a generic technology pitch.",
        bridge: "The first capability layer underneath that is infrastructure and cloud operations.",
      },
      {
        pageId: "hedge-fund",
        anchorId: "hedgefund-cloud",
        title: "Cloud and operations backbone",
        summary:
          "This stop makes clear that secure, stable cloud and collaboration infrastructure are the backbone of the story.",
        bridge: "Next, the site adds cyber resilience and compliance as the control layer.",
      },
      {
        pageId: "hedge-fund",
        anchorId: "hedgefund-cyber",
        title: "Cyber resilience and compliance",
        summary:
          "This section shows that hedge fund support here is built around resilience and compliance, not just speed or convenience.",
        bridge: "Once that backbone is in place, the site turns toward insight and intelligence.",
      },
      {
        pageId: "hedge-fund",
        anchorId: "hedgefund-ai-data",
        title: "AI and data",
        summary:
          "This stop extends the story into insight, visibility, and data-supported decision making.",
        bridge: "The final stop shows how that reaches end-user workflows.",
      },
      {
        pageId: "hedge-fund",
        anchorId: "hedgefund-copilot",
        title: "Copilot journeys",
        summary:
          "This final section makes the value more tangible by showing how productivity and workflow enhancement fit into the operating model.",
      },
    ],
  },
};

const pageOrder: PageId[] = ["home", "solutions", "cyber", "hedge-fund", "compliance"];

const navItems: { id: PageId; label: string; icon: React.ComponentType<any> }[] = [
  { id: "home", label: "Home", icon: Building2 },
  { id: "solutions", label: "Solutions", icon: Briefcase },
  { id: "cyber", label: "Cyber", icon: Shield },
  { id: "hedge-fund", label: "Hedge Fund", icon: BarChart3 },
  { id: "compliance", label: "Compliance", icon: Landmark },
];

const solutionHighlights = [
  {
    title: "AI & Data",
    icon: Sparkles,
    text: "Governed AI, copilots, automation, application delivery, and data foundations.",
  },
  {
    title: "Cloud & Infrastructure",
    icon: Cloud,
    text: "Secure cloud platforms, migrations, enterprise systems, and scalable operations.",
  },
  {
    title: "Cybersecurity & Compliance",
    icon: Shield,
    text: "Managed protection, governance, vendor risk, and resilience planning.",
  },
  {
    title: "Managed Solutions",
    icon: Network,
    text: "Sustained operational support and managed-service delivery patterns.",
  },
];

function Header({
  currentPage,
  onNavigate,
  demoStatus,
  onStartDemo,
  onPauseDemo,
  onResumeDemo,
  onStopDemo,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  demoStatus: DemoStatus;
  onStartDemo: () => void;
  onPauseDemo: () => void;
  onResumeDemo: () => void;
  onStopDemo: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11">
            <Network className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight sm:text-lg">NexaPath Advisory</div>
            <div className="truncate text-xs text-slate-500 sm:text-sm">
              TourBot Demo · Guide-ready B2B site experience
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-3 md:w-auto">
          <nav className="hidden gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === currentPage;
              return (
                <Button
                  key={item.id}
                  variant={active ? "default" : "outline"}
                  onClick={() => onNavigate(item.id)}
                  className="rounded-full px-4"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
            {demoStatus === "idle" && (
              <button
                data-demo-target="start-demo"
                onClick={onStartDemo}
                className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Self-Drive Tour
              </button>
            )}
            {demoStatus === "running" && (
              <button
                onClick={onPauseDemo}
                className="rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
              >
                Pause
              </button>
            )}
            {demoStatus === "paused" && (
              <button
                onClick={onResumeDemo}
                className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-200"
              >
                Resume
              </button>
            )}
            {demoStatus !== "idle" && (
              <button
                onClick={onStopDemo}
                className="rounded-full px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        <nav className="flex w-full gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === currentPage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={
                  "inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition " +
                  (active
                    ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                    : "border-slate-200 bg-white/80 text-slate-700 hover:bg-white")
                }
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}


const pageVisuals: Record<PageId, {
  eyebrow: string;
  accent: string;
  soft: string;
  gradient: string;
  metricA: string;
  metricB: string;
  proof: string;
}> = {
  home: {
    eyebrow: "Executive service platform",
    accent: "from-slate-950 to-slate-700",
    soft: "bg-slate-100 text-slate-700",
    gradient: "from-slate-950 via-slate-900 to-slate-700",
    metricA: "4 capability lanes",
    metricB: "5 guided pages",
    proof: "Designed for AI-led discovery",
  },
  solutions: {
    eyebrow: "Capability routing layer",
    accent: "from-indigo-950 to-slate-700",
    soft: "bg-indigo-50 text-indigo-700",
    gradient: "from-indigo-950 via-slate-900 to-slate-700",
    metricA: "AI · Cloud · Cyber",
    metricB: "Managed delivery",
    proof: "Built to compare options quickly",
  },
  cyber: {
    eyebrow: "Security operations view",
    accent: "from-rose-950 to-slate-800",
    soft: "bg-rose-50 text-rose-700",
    gradient: "from-rose-950 via-slate-900 to-slate-800",
    metricA: "XDR + readiness",
    metricB: "Risk + policy",
    proof: "Concrete stops for cyber tours",
  },
  "hedge-fund": {
    eyebrow: "Industry operating model",
    accent: "from-emerald-950 to-slate-800",
    soft: "bg-emerald-50 text-emerald-700",
    gradient: "from-emerald-950 via-slate-900 to-slate-800",
    metricA: "Fund operations",
    metricB: "Copilot journeys",
    proof: "Scenario-first buyer path",
  },
  compliance: {
    eyebrow: "Regulatory pressure map",
    accent: "from-amber-900 to-slate-800",
    soft: "bg-amber-50 text-amber-800",
    gradient: "from-amber-900 via-slate-900 to-slate-800",
    metricA: "NA + EMEA",
    metricB: "SEC · FINRA · DORA",
    proof: "Designed for topic drill-downs",
  },
};

const sectionVisuals: Record<string, { icon: React.ComponentType<any>; tone: string; chips: string[]; shape: string }> = {
  "hero-modern-provider": { icon: Building2, tone: "from-slate-950 to-slate-700", chips: ["Advisory", "Operations", "Modernization"], shape: "hero" },
  "solutions-grid": { icon: Briefcase, tone: "from-indigo-900 to-slate-700", chips: ["AI", "Cloud", "Cyber", "Managed"], shape: "grid" },
  "proof-points": { icon: BarChart3, tone: "from-slate-800 to-slate-600", chips: ["Rigor", "Scale", "Resilience"], shape: "proof" },
  "industries-preview": { icon: Landmark, tone: "from-emerald-900 to-slate-700", chips: ["Hedge funds", "PE", "Insurance"], shape: "split" },
  "compliance-preview": { icon: Shield, tone: "from-amber-800 to-slate-700", chips: ["Policy", "Controls", "Risk"], shape: "split" },
  "contact-cta": { icon: ArrowRight, tone: "from-slate-950 to-indigo-800", chips: ["Sales", "Workshop", "Discovery"], shape: "cta" },
  "solution-ai-data": { icon: Sparkles, tone: "from-indigo-900 to-violet-700", chips: ["Copilots", "Automation", "Data"], shape: "feature" },
  "solution-cloud": { icon: Cloud, tone: "from-sky-900 to-slate-700", chips: ["Platforms", "Migration", "Scale"], shape: "feature" },
  "solution-cyber": { icon: Shield, tone: "from-rose-900 to-slate-700", chips: ["Protection", "Governance", "Readiness"], shape: "feature" },
  "solution-managed": { icon: Network, tone: "from-slate-800 to-cyan-800", chips: ["Support", "Stability", "Operations"], shape: "feature" },
  "solution-comparison": { icon: Database, tone: "from-slate-950 to-slate-700", chips: ["Compare", "Prioritize", "Route"], shape: "comparison" },
  "managed-xdr": { icon: Shield, tone: "from-rose-950 to-red-700", chips: ["Monitor", "Detect", "Respond"], shape: "dark" },
  "dark-web-monitoring": { icon: Shield, tone: "from-zinc-950 to-rose-900", chips: ["Credentials", "Exposure", "Threat intel"], shape: "dark" },
  "phishing-training": { icon: Sparkles, tone: "from-orange-800 to-slate-700", chips: ["Awareness", "Simulation", "Behavior"], shape: "feature" },
  "incident-response-tabletop": { icon: BarChart3, tone: "from-red-900 to-slate-700", chips: ["Exercise", "Escalate", "Decide"], shape: "timeline" },
  "governance-risk": { icon: Landmark, tone: "from-slate-950 to-amber-800", chips: ["Controls", "Accountability", "Risk"], shape: "proof" },
  "policy-management": { icon: Database, tone: "from-amber-800 to-slate-700", chips: ["Policies", "Evidence", "Alignment"], shape: "split" },
  "vendor-assessments": { icon: Network, tone: "from-purple-900 to-slate-700", chips: ["Third-party", "Review", "Exposure"], shape: "feature" },
  "vulnerability-assessments": { icon: Shield, tone: "from-red-900 to-slate-800", chips: ["Scan", "Prioritize", "Remediate"], shape: "feature" },
  "topic-dora": { icon: Landmark, tone: "from-amber-900 to-slate-800", chips: ["ICT risk", "Resilience", "Third-party"], shape: "dark" },
  "topic-sec": { icon: Landmark, tone: "from-slate-950 to-blue-800", chips: ["Oversight", "Disclosure", "Controls"], shape: "feature" },
  "topic-finra": { icon: BarChart3, tone: "from-blue-900 to-slate-700", chips: ["Market integrity", "Supervision", "Operations"], shape: "feature" },
  "topic-gdpr": { icon: Database, tone: "from-emerald-900 to-slate-700", chips: ["Privacy", "Data rights", "Transparency"], shape: "feature" },
  "hedgefund-copilot": { icon: Sparkles, tone: "from-violet-900 to-slate-800", chips: ["M365 Copilot", "Workflow", "Adoption"], shape: "dark" },
  "hedgefund-overview": { icon: BarChart3, tone: "from-emerald-950 to-slate-800", chips: ["Trading", "Operations", "Controls"], shape: "hero" },
  "hedgefund-cloud": { icon: Cloud, tone: "from-cyan-900 to-slate-700", chips: ["Backbone", "Collaboration", "Reliability"], shape: "feature" },
  "hedgefund-cyber": { icon: Shield, tone: "from-rose-900 to-slate-800", chips: ["Resilience", "Compliance", "Defense"], shape: "feature" },
  "hedgefund-ai-data": { icon: Sparkles, tone: "from-indigo-900 to-slate-700", chips: ["Insight", "Data", "AI"], shape: "feature" },
  "hedgefund-modern-work": { icon: Network, tone: "from-slate-800 to-emerald-800", chips: ["Teams", "Knowledge", "Execution"], shape: "split" },
};

function getSectionVisual(section: Section, index: number) {
  return (
    sectionVisuals[section.id] || {
      icon: index % 2 === 0 ? Sparkles : Database,
      tone: index % 2 === 0 ? "from-slate-900 to-slate-700" : "from-indigo-900 to-slate-700",
      chips: ["Guide stop", "Section anchor", "Decision support"],
      shape: index % 3 === 0 ? "split" : "feature",
    }
  );
}

function Hero({ page }: { page: Page }) {
  const visual = pageVisuals[page.id];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-5 pt-4 sm:px-6 sm:pb-10 sm:pt-10">
      <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${visual.gradient} px-4 py-5 text-white shadow-2xl shadow-slate-300/40 sm:rounded-[36px] sm:px-6 sm:py-8 md:px-10 md:py-12`}>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 hidden h-40 w-40 rotate-12 rounded-[42px] border border-white/10 bg-white/5 lg:block" />

        <div className="relative grid gap-5 sm:gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 sm:mb-4 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
              {visual.eyebrow}
            </div>
            <h1 className="max-w-4xl text-2xl font-semibold tracking-tight sm:text-4xl md:text-6xl">
              {page.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">{page.hero}</p>
            <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
              {[visual.metricA, visual.metricB, visual.proof].map((item) => (
                <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 sm:px-4 sm:py-2 sm:text-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur sm:rounded-[28px] sm:p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Guide readiness</div>
              <div className="mt-2 text-lg font-semibold sm:mt-3 sm:text-2xl">{page.sections.length} anchored stops</div>
              <p className="mt-2 text-xs leading-5 text-slate-200 sm:text-sm sm:leading-6">
                Each section remains addressable for spotlighting, multi-step navigation, and AI-guided explanations.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur sm:rounded-[28px] sm:p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Current path</div>
              <div className="mt-2 text-lg font-semibold sm:mt-3 sm:text-2xl">{page.subtitle}</div>
              <p className="mt-2 text-xs leading-5 text-slate-200 sm:text-sm sm:leading-6">
                A more realistic page canvas gives the guide better visual moments to land on during demos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeExtras() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-5 sm:px-6 sm:pb-10">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-sm sm:tracking-[0.18em]">Service lanes</div>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-2xl">A site-like overview with real visual destinations</h2>
        </div>
        <div className="hidden rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm md:block">
          Built for guided discovery
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {solutionHighlights.map((item, index) => {
          const Icon = item.icon;
          const tones = [
            "from-indigo-900 to-slate-700",
            "from-sky-900 to-slate-700",
            "from-rose-900 to-slate-800",
            "from-emerald-900 to-slate-700",
          ];
          return (
            <Card key={item.title} className={index === 0 ? "xl:row-span-2" : ""}>
              <CardContent className="p-4 sm:p-6">
                <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${tones[index]} p-2.5 text-white shadow-sm sm:mb-5 sm:rounded-2xl sm:p-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold sm:text-lg">{item.title}</div>
                <p className="mt-2 text-sm leading-5 text-slate-600 sm:leading-6">{item.text}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:mt-5 sm:h-2">
                  <div className={`h-full rounded-full bg-gradient-to-r ${tones[index]}`} style={{ width: `${72 + index * 6}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function SectionCard({
  section,
  emphasized,
  pageId,
  index,
}: {
  section: Section;
  emphasized: boolean;
  pageId: PageId;
  index: number;
}) {
  const visual = getSectionVisual(section, index);
  const Icon = visual.icon;
  const wide = visual.shape === "hero" || visual.shape === "dark" || visual.shape === "cta";
  const dark = visual.shape === "dark" || visual.shape === "cta";

  return (
    <motion.section
      id={section.id}
      layout
      initial={false}
      animate={{ scale: emphasized ? 1.012 : 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="scroll-mt-24 sm:scroll-mt-28"
    >
      <Card
        className={`transition-all ${
          emphasized ? "border-slate-900 ring-2 ring-slate-300 shadow-2xl shadow-slate-300/60" : ""
        } ${dark ? `bg-gradient-to-br ${visual.tone} text-white` : ""}`}
      >
        <CardContent className={`p-0 ${wide ? "md:p-0" : ""}`}>
          <div className={`grid ${wide ? "md:grid-cols-[0.9fr_1.35fr]" : "md:grid-cols-[180px_1fr]"}`}>
            <div className={`${dark ? "border-white/10 bg-white/10" : "border-slate-100 bg-slate-50"} border-b p-4 md:border-b-0 md:border-r md:p-6`}>
              <div className={`inline-flex rounded-2xl ${dark ? "bg-white/15 text-white" : `bg-gradient-to-br ${visual.tone} text-white`} p-2.5 shadow-sm sm:p-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className={`mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] sm:mt-5 sm:text-[11px] sm:tracking-[0.18em] ${dark ? "text-white/60" : "text-slate-500"}`}>
                {pageId} / {String(index + 1).padStart(2, "0")}
              </div>
              <div className={`mt-2 break-all text-xs ${dark ? "text-white/70" : "text-slate-400"}`}>
                #{section.id}
              </div>
            </div>

            <div className="p-5 md:p-8">
              <div className="flex flex-wrap gap-2">
                {visual.chips.map((chip) => (
                  <span
                    key={chip}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      dark ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <h2 className={`mt-3 text-xl font-semibold tracking-tight sm:mt-4 sm:text-2xl ${dark ? "text-white" : "text-slate-950"}`}>
                {section.title}
              </h2>
              <p className={`mt-3 max-w-4xl text-sm leading-6 sm:mt-4 sm:text-base sm:leading-8 ${dark ? "text-slate-200" : "text-slate-600"}`}>
                {section.body}
              </p>

              <div className={`mt-4 grid gap-2 sm:mt-6 sm:gap-3 ${wide ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div className={`rounded-xl p-3 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>Guide signal</div>
                  <div className="mt-2 text-sm font-semibold">Anchor-ready stop</div>
                </div>
                <div className={`rounded-xl p-3 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>Buyer lens</div>
                  <div className="mt-2 text-sm font-semibold">Explain, compare, route</div>
                </div>
                {wide && (
                  <div className={`rounded-xl p-3 sm:rounded-2xl sm:p-4 ${dark ? "bg-white/10" : "bg-slate-50"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-white/55" : "text-slate-400"}`}>Next action</div>
                    <div className="mt-2 text-sm font-semibold">Continue guided path</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}


type DemoPreviewOption = {
  label: string;
  description: string;
  onClick: () => void;
};

function DemoPreviewCard({
  title,
  siteType,
  contentType,
  guideShows,
  options,
  onClose,
}: {
  title: string;
  siteType: string;
  contentType: string;
  guideShows: string;
  options: DemoPreviewOption[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed left-4 right-4 top-4 z-[10050] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-6 sm:top-20 sm:w-[420px] sm:rounded-[28px]"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 pb-5 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-5">
        <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2.5 backdrop-blur sm:p-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-lg font-semibold tracking-tight sm:text-xl">{title}</div>
        <p className="mt-2 text-sm leading-6 text-slate-200 sm:mt-3">{guideShows}</p>
      </div>
      <div className="space-y-3 px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5">
        <div className="grid gap-2 text-sm leading-6 text-slate-600 sm:gap-3">
          <div>
            <span className="font-semibold text-slate-950">Website:</span> {siteType}
          </div>
          <div>
            <span className="font-semibold text-slate-950">Content:</span> {contentType}
          </div>
        </div>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.label}
              onClick={option.onClick}
              className="flex w-full items-start justify-between rounded-2xl bg-slate-950 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-slate-800 sm:py-3"
            >
              <span>
                <span className="block">{option.label}</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-300">
                  {option.description}
                </span>
              </span>
              <ArrowRight className="ml-3 mt-0.5 h-4 w-4 shrink-0" />
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:py-3"
        >
          Not now
        </button>
      </div>
    </motion.div>
  );
}

function DemoClosingCard({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed left-4 right-4 top-4 z-[10050] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[24px] border border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-6 sm:top-20 sm:w-[420px] sm:rounded-[28px]"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 pb-5 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-5">
        <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2.5 backdrop-blur sm:p-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-lg font-semibold tracking-tight sm:text-xl">Demo complete</div>
        <p className="mt-2 text-sm leading-6 text-slate-200 sm:mt-3">
          You can now use TourBot as a playground. Ask your own questions, request a tour, or test how the guide navigates the site.
        </p>
      </div>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:py-3"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("home");
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("idle");
  const [guideDemoCommand, setGuideDemoCommand] = useState<GuideShellDemoCommand | null>(null);
  const [demoPreviewOpen, setDemoPreviewOpen] = useState(false);
  const [demoClosingOpen, setDemoClosingOpen] = useState(false);

  const page = PAGES[currentPage];
  const pageIndex = pageOrder.indexOf(currentPage);

  const onNavigate = (nextPage: PageId) => {
    setCurrentPage(nextPage);
    setActiveAnchor(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jumpToAnchor = (anchorId: string) => {
    setActiveAnchor(anchorId);
    requestAnimationFrame(() => {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const goToStep = (step: TourStep) => {
    setCurrentPage(step.pageId);
    setActiveAnchor(step.anchorId);
    setTimeout(() => {
      const el = document.getElementById(step.anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 220);
  };
  void goToStep;

  const openDemoPreview = () => {
    setDemoClosingOpen(false);
    setDemoPreviewOpen(true);
  };

  const startDiscoveryDemo = () => {
    setDemoPreviewOpen(false);
    setDemoClosingOpen(false);
    setDemoStatus("running");
  };

  const stopDemo = () => {
    setDemoStatus("idle");
    setDemoPreviewOpen(false);
    setDemoClosingOpen(false);
  };

  const disengageDemo = () => {
    setDemoStatus("idle");
    setDemoPreviewOpen(false);
    setDemoClosingOpen(false);
    window.dispatchEvent(new CustomEvent("guide-clear-spotlight"));
    setGuideDemoCommand((prev) => ({
      id: (prev?.id || 0) + 1,
      type: "got-it",
    }));
  };

  const nextPage = pageOrder[pageIndex + 1] ?? null;
  const prevPage = pageOrder[pageIndex - 1] ?? null;

  const anchorButtons = useMemo(() => page.sections.slice(0, 6), [page]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.22),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_48%,#f8fafc_100%)] text-slate-950">
      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        demoStatus={demoStatus}
        onStartDemo={openDemoPreview}
        onPauseDemo={() => setDemoStatus("paused")}
        onResumeDemo={() => setDemoStatus("running")}
        onStopDemo={stopDemo}
      />
      <AnimatePresence>
        {demoPreviewOpen && demoStatus === "idle" && (
          <DemoPreviewCard
            title="Guided Discovery Demo"
            siteType="A synthetic B2B advisory website with solution, industry, and compliance pages."
            contentType="Service pages, capability blocks, compliance topics, and tour-ready anchors."
            guideShows="TourBot will answer, navigate to relevant sections, and walk through multi-step educational paths across the site."
            options={[
              {
                label: "Assisted Learning",
                description: "A guided learning path that answers, spotlights, and steps through related site sections.",
                onClick: startDiscoveryDemo,
              },
            ]}
            onClose={() => setDemoPreviewOpen(false)}
          />
        )}
        {demoClosingOpen && demoStatus === "idle" && (
          <DemoClosingCard onClose={disengageDemo} />
        )}
      </AnimatePresence>

      <Hero page={page} />

      {currentPage === "home" && <HomeExtras />}

      <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="space-y-4 sm:space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 sm:space-y-5"
            >
              {page.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  emphasized={activeAnchor === section.id}
                  pageId={currentPage}
                  index={page.sections.indexOf(section)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Page map
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                These remain the same tour anchors used by the guide shell.
              </p>
              <div className="mt-3 space-y-2 sm:mt-4">
                {anchorButtons.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => jumpToAnchor(section.id)}
                    className={`flex w-full items-start justify-between rounded-xl border px-3 py-2.5 text-left transition sm:rounded-2xl sm:px-4 sm:py-3 ${
                      activeAnchor === section.id
                        ? "border-slate-900 bg-slate-100 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {section.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{section.id}</div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${pageVisuals[currentPage].accent} text-white`}>
            <CardContent className="p-4 sm:p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
                Recommended path
              </div>
              <p className="mt-3 text-sm leading-5 text-slate-200 sm:mt-4 sm:leading-6">
                This page now behaves more like a real B2B destination: visual hierarchy, varied cards, and clearer stops for guided tours.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {prevPage && (
                  <Button variant="outline" onClick={() => onNavigate(prevPage)} className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                    Previous page
                  </Button>
                )}
                {nextPage && (
                  <Button onClick={() => onNavigate(nextPage)} className="bg-white text-slate-950 hover:bg-slate-100">
                    Next page
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Database className="h-4 w-4" />
                Demo integrity
              </div>
              <div className="mt-3 space-y-2 text-sm leading-5 text-slate-600 sm:mt-4 sm:space-y-3 sm:leading-6">
                <div>• Page IDs remain unchanged</div>
                <div>• Section anchors remain unchanged</div>
                <div>• Nav labels remain unchanged</div>
                <div>• Visual variety is presentation-only</div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>

      <DemoController
        script={guidedDiscoveryDemo}
        status={demoStatus}
        onStatusChange={setDemoStatus}
        onGuideCommand={setGuideDemoCommand}
        onFinished={() => setDemoClosingOpen(true)}
        finishDelayMs={5000}
      />
      <GuideShellStatic demoCommand={guideDemoCommand} suppressWelcomeCard={demoPreviewOpen || demoClosingOpen} />
    </div>
  );
}
