import { AnimatePresence, motion } from "framer-motion";
import {
  BedDouble,
  Building2,
  CalendarDays,
  Coffee,
  Compass,
  CreditCard,
  Search,
  ShoppingCart,
  Utensils,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type SmartBarDemoToolbarSurface = "info" | "ordering" | "booking" | "finale";
export type SmartBarDemoToolbarPlacement = "left" | "middleRight" | "right";
export type SmartBarDemoToolbarChromeVariant = "default" | "blueCoreGlass";

type SmartBarDemoToolbarFrameProps = {
  surface: SmartBarDemoToolbarSurface;
  smartBarNode: ReactNode;
  placement?: SmartBarDemoToolbarPlacement;
  animateOptions?: boolean;
  chromeVariant?: SmartBarDemoToolbarChromeVariant;
};

function toolbarTone(surface: SmartBarDemoToolbarSurface, chromeVariant: SmartBarDemoToolbarChromeVariant = "default") {
  if (chromeVariant === "blueCoreGlass") {
    return {
      shell: "border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.70),rgba(224,237,247,0.48))] text-slate-950 shadow-[0_24px_68px_rgba(23,34,124,0.14),inset_0_1px_1px_rgba(255,255,255,0.55)]",
      brandBadge: "bg-[#17227c] text-white shadow-[0_14px_34px_rgba(23,34,124,0.24)] ring-1 ring-white/25",
      muted: "text-[#17227c]/64",
      pill: "border-white/65 bg-white/50 text-[#17227c]/78 shadow-[inset_0_1px_1px_rgba(255,255,255,0.55)]",
      activePill: "bg-[#17227c] text-white ring-white/55 shadow-[0_10px_24px_rgba(23,34,124,0.22)]",
    };
  }

  if (surface === "finale") {
    return {
      shell: "border-white/10 bg-transparent text-white shadow-none",
      brandBadge: "bg-white/10 text-white",
      muted: "text-white/55",
      pill: "border-white/10 bg-white/10 text-white/70",
      activePill: "bg-white text-slate-950 ring-white/30",
    };
  }

  if (surface === "ordering") {
    return {
      shell: "border-orange-200/80 bg-white/94 text-slate-950 shadow-orange-950/10",
      brandBadge: "bg-orange-500 text-white",
      muted: "text-slate-500",
      pill: "border-orange-200 bg-orange-50 text-orange-800",
      activePill: "bg-orange-500 text-white ring-orange-200/80",
    };
  }

  if (surface === "booking") {
    return {
      shell: "border-sky-200/80 bg-white/94 text-slate-950 shadow-sky-950/10",
      brandBadge: "bg-sky-950 text-white",
      muted: "text-slate-500",
      pill: "border-slate-200 bg-slate-50 text-slate-700",
      activePill: "bg-sky-950 text-white ring-sky-200/70",
    };
  }

  return {
    shell: "border-slate-200/80 bg-white/94 text-slate-950 shadow-slate-950/10",
    brandBadge: "bg-slate-950 text-white",
    muted: "text-slate-500",
    pill: "border-slate-200 bg-slate-50 text-slate-700",
    activePill: "bg-slate-950 text-white ring-slate-300/70",
  };
}

function ToolbarPill({
  children,
  active = false,
  className = "",
  surface,
  chromeVariant = "default",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  surface: SmartBarDemoToolbarSurface;
  chromeVariant?: SmartBarDemoToolbarChromeVariant;
}) {
  const tone = toolbarTone(surface, chromeVariant);
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-bold ring-1 ring-transparent sm:h-8 sm:px-3 sm:text-xs ${
        active ? tone.activePill : tone.pill
      } ${className}`}
    >
      {children}
    </span>
  );
}

function ToolbarBrand({ surface, chromeVariant = "default" }: { surface: SmartBarDemoToolbarSurface; chromeVariant?: SmartBarDemoToolbarChromeVariant }) {
  const tone = toolbarTone(surface, chromeVariant);

  if (chromeVariant === "blueCoreGlass") {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tone.brandBadge}`}>
          <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black tracking-tight sm:text-base">SmartBar</div>
          <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Blue core · glass surfaces</div>
        </div>
      </div>
    );
  }

  if (surface === "finale") {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tone.brandBadge}`}>
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black tracking-tight sm:text-base">SmartBar</div>
          <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Tool sweep</div>
        </div>
      </div>
    );
  }

  if (surface === "ordering") {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tone.brandBadge}`}>
          <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black tracking-tight sm:text-base">Ordering</div>
          <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Menu · cart · checkout</div>
        </div>
      </div>
    );
  }

  if (surface === "booking") {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tone.brandBadge}`}>
          <BedDouble className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black tracking-tight sm:text-base">Booking</div>
          <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Rooms · packages · confirmation</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${tone.brandBadge}`}>
        <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-black tracking-tight sm:text-base">Informational</div>
        <div className={`truncate text-[11px] font-semibold ${tone.muted}`}>Services · proof · handoff</div>
      </div>
    </div>
  );
}

function ToolbarOptions({ surface, chromeVariant = "default" }: { surface: SmartBarDemoToolbarSurface; chromeVariant?: SmartBarDemoToolbarChromeVariant }) {
  if (surface === "finale") return null;

  if (surface === "ordering") {
    return (
      <>
        {["Combos", "Burgers", "Sides", "Drinks"].map((label, index) => (
          <ToolbarPill key={label} surface={surface} chromeVariant={chromeVariant} active={index === 0}>
            {label}
          </ToolbarPill>
        ))}
      </>
    );
  }

  if (surface === "booking") {
    return (
      <>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant} active>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Jun 12–15
        </ToolbarPill>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant}>
          <Users className="mr-1.5 h-3.5 w-3.5" />
          4 guests
        </ToolbarPill>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant}>
          <Coffee className="mr-1.5 h-3.5 w-3.5" />
          Packages
        </ToolbarPill>
      </>
    );
  }

  return (
    <>
      <ToolbarPill surface={surface} chromeVariant={chromeVariant} active>
        Services
      </ToolbarPill>
      <ToolbarPill surface={surface} chromeVariant={chromeVariant}>Compliance</ToolbarPill>
      <ToolbarPill surface={surface} chromeVariant={chromeVariant}>Industries</ToolbarPill>
    </>
  );
}

function ToolbarActions({ surface, chromeVariant = "default" }: { surface: SmartBarDemoToolbarSurface; chromeVariant?: SmartBarDemoToolbarChromeVariant }) {
  if (surface === "finale") return null;

  if (surface === "ordering") {
    return (
      <>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant} className="hidden sm:inline-flex">
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Search menu
        </ToolbarPill>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant} active>
          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
          Cart
        </ToolbarPill>
      </>
    );
  }

  if (surface === "booking") {
    return (
      <>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant} className="hidden sm:inline-flex">
          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
          Book
        </ToolbarPill>
        <ToolbarPill surface={surface} chromeVariant={chromeVariant}>Help</ToolbarPill>
      </>
    );
  }

  return (
    <>
      <ToolbarPill surface={surface} chromeVariant={chromeVariant} className="hidden sm:inline-flex">
        <Search className="mr-1.5 h-3.5 w-3.5" />
        Search
      </ToolbarPill>
      <ToolbarPill surface={surface} chromeVariant={chromeVariant}>Contact</ToolbarPill>
    </>
  );
}

function SmartBarMount({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[10080] flex h-12 w-12 shrink-0 items-center justify-center sm:h-9 sm:w-9">
      {children}
    </div>
  );
}

export default function SmartBarDemoToolbarFrame({
  surface,
  smartBarNode,
  placement = "right",
  animateOptions = true,
  chromeVariant = "default",
}: SmartBarDemoToolbarFrameProps) {
  const tone = toolbarTone(surface, chromeVariant);
  const options = <ToolbarOptions surface={surface} chromeVariant={chromeVariant} />;

  return (
    <div className={`mx-auto mt-2 max-w-7xl rounded-[20px] border px-2 py-2 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl sm:mt-4 sm:rounded-[28px] sm:px-4 sm:py-3 ${tone.shell}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        {placement === "left" ? <SmartBarMount>{smartBarNode}</SmartBarMount> : null}

        <ToolbarBrand surface={surface} chromeVariant={chromeVariant} />

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
          {animateOptions ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={surface}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex min-w-0 items-center justify-center gap-2"
              >
                {options}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex min-w-0 items-center justify-center gap-2">{options}</div>
          )}
        </div>

        {placement === "middleRight" ? <SmartBarMount>{smartBarNode}</SmartBarMount> : null}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <ToolbarActions surface={surface} chromeVariant={chromeVariant} />
          </div>
          {placement === "right" ? <SmartBarMount>{smartBarNode}</SmartBarMount> : null}
        </div>
      </div>
    </div>
  );
}
