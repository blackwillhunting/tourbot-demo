import { AnimatePresence, motion } from "framer-motion";
import {
  BedDouble,
  Building2,
  CalendarDays,
  Coffee,
  CreditCard,
  Search,
  ShoppingCart,
  Utensils,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type SmartBarDemoToolbarSurface = "info" | "ordering" | "booking" | "finale";
export type SmartBarDemoToolbarPlacement = "left" | "middleRight" | "right";

type SmartBarDemoToolbarFrameProps = {
  surface: SmartBarDemoToolbarSurface;
  smartBarNode: ReactNode;
  placement?: SmartBarDemoToolbarPlacement;
  animateOptions?: boolean;
};

function toolbarTone(surface: SmartBarDemoToolbarSurface) {

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
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  surface: SmartBarDemoToolbarSurface;
}) {
  const tone = toolbarTone(surface);
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

function ToolbarBrand({ surface }: { surface: SmartBarDemoToolbarSurface }) {
  const tone = toolbarTone(surface);

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

function ToolbarOptions({ surface }: { surface: SmartBarDemoToolbarSurface }) {
  if (surface === "finale") return null;

  if (surface === "ordering") {
    return (
      <>
        {["Combos", "Burgers", "Sides", "Drinks"].map((label, index) => (
          <ToolbarPill key={label} surface={surface} active={index === 0}>
            {label}
          </ToolbarPill>
        ))}
      </>
    );
  }

  if (surface === "booking") {
    return (
      <>
        <ToolbarPill surface={surface} active>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Jun 12–15
        </ToolbarPill>
        <ToolbarPill surface={surface}>
          <Users className="mr-1.5 h-3.5 w-3.5" />
          4 guests
        </ToolbarPill>
        <ToolbarPill surface={surface}>
          <Coffee className="mr-1.5 h-3.5 w-3.5" />
          Packages
        </ToolbarPill>
      </>
    );
  }

  return (
    <>
      <ToolbarPill surface={surface} active>
        Services
      </ToolbarPill>
      <ToolbarPill surface={surface}>Compliance</ToolbarPill>
      <ToolbarPill surface={surface}>Industries</ToolbarPill>
    </>
  );
}

function ToolbarActions({ surface }: { surface: SmartBarDemoToolbarSurface }) {
  if (surface === "finale") return null;

  if (surface === "ordering") {
    return (
      <>
        <ToolbarPill surface={surface} className="hidden sm:inline-flex">
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Search menu
        </ToolbarPill>
        <ToolbarPill surface={surface} active>
          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
          Cart
        </ToolbarPill>
      </>
    );
  }

  if (surface === "booking") {
    return (
      <>
        <ToolbarPill surface={surface} className="hidden sm:inline-flex">
          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
          Book
        </ToolbarPill>
        <ToolbarPill surface={surface}>Help</ToolbarPill>
      </>
    );
  }

  return (
    <>
      <ToolbarPill surface={surface} className="hidden sm:inline-flex">
        <Search className="mr-1.5 h-3.5 w-3.5" />
        Search
      </ToolbarPill>
      <ToolbarPill surface={surface}>Contact</ToolbarPill>
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
}: SmartBarDemoToolbarFrameProps) {
  const tone = toolbarTone(surface);
  const options = <ToolbarOptions surface={surface} />;

  return (
    <div className={`mx-auto mt-2 max-w-7xl rounded-[20px] border px-2 py-2 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl sm:mt-4 sm:rounded-[28px] sm:px-4 sm:py-3 ${tone.shell}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        {placement === "left" ? <SmartBarMount>{smartBarNode}</SmartBarMount> : null}

        <ToolbarBrand surface={surface} />

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
            <ToolbarActions surface={surface} />
          </div>
          {placement === "right" ? <SmartBarMount>{smartBarNode}</SmartBarMount> : null}
        </div>
      </div>
    </div>
  );
}
