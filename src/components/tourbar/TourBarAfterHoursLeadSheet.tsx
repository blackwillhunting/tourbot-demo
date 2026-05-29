import { useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  SendHorizonal,
} from "lucide-react";

export type TourBarAfterHoursLead = {
  email: string;
  phone?: string;
  company?: string;
  note: string;
};

export type TourBarAfterHoursLeadSheetCopy = {
  eyebrow?: string;
  title?: string;
  description?: string;
  emailPlaceholder?: string;
  phonePlaceholder?: string;
  companyPlaceholder?: string;
  notePlaceholder?: string;
  submitLabel?: string;
  confirmationTitle?: string;
  confirmationBody?: string;
};

export type TourBarAfterHoursLeadSheetProps = {
  copy?: TourBarAfterHoursLeadSheetCopy;
  initialEmail?: string;
  initialPhone?: string;
  initialCompany?: string;
  initialNote?: string;
  contextSummary?: string;
  onSubmit?: (lead: TourBarAfterHoursLead) => void;
};

function domainFromEmail(value: string) {
  const match = value.trim().toLowerCase().match(/@([^@\s]+\.[^@\s]+)$/);
  if (!match) return "";
  return match[1]
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|ai|co|us|ca|uk)$/i, "");
}

function companyHintFromEmail(value: string) {
  const domain = domainFromEmail(value);
  if (!domain || ["gmail", "yahoo", "outlook", "hotmail", "icloud", "aol", "proton"].includes(domain)) {
    return "";
  }

  return domain
    .split(/[.-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function TourBarAfterHoursLeadSheet({
  copy,
  initialEmail = "",
  initialPhone = "",
  initialCompany = "",
  initialNote = "",
  contextSummary,
  onSubmit,
}: TourBarAfterHoursLeadSheetProps) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [company, setCompany] = useState(initialCompany);
  const [note, setNote] = useState(initialNote);
  const [submitted, setSubmitted] = useState(false);

  const inferredCompany = useMemo(() => companyHintFromEmail(email), [email]);
  const cleanEmail = email.trim();
  const cleanPhone = phone.trim();
  const cleanCompany = company.trim() || inferredCompany;
  const cleanNote = note.trim();
  const canSubmit = Boolean((cleanEmail || cleanPhone) && cleanNote);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const lead = {
      email: cleanEmail,
      phone: cleanPhone || undefined,
      company: cleanCompany || undefined,
      note: cleanNote,
    };

    onSubmit?.(lead);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-3xl border border-emerald-300/25 bg-slate-950 text-emerald-100 shadow-sm ring-1 ring-emerald-300/15 md:border-emerald-100 md:bg-emerald-50/85 md:text-emerald-950 md:ring-emerald-100/80">
        <div className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200 shadow-sm ring-1 ring-emerald-300/20 md:bg-emerald-600 md:text-white md:ring-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70 md:text-emerald-700/70">
                Request captured
              </div>
              <div className="mt-1 text-sm font-semibold text-emerald-100 md:text-emerald-950">
                {copy?.confirmationTitle || "We’ll follow up when the team is back online"}
              </div>
              <p className="mt-1 text-xs leading-5 text-emerald-200/75 md:text-emerald-800/80">
                {copy?.confirmationBody || "SmartBar saved the visitor’s contact details, note, and current page context for the consultant desk."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950 text-white shadow-sm ring-1 ring-white/10 md:border-amber-100 md:bg-amber-50/80 md:text-slate-950 md:ring-amber-100/80"
    >
      <div className="hidden border-b border-amber-100 bg-amber-50/95 px-4 py-3 md:block">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700/75">
              {copy?.eyebrow || "After-hours handoff"}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-950">
              {copy?.title || "Consultants are offline"}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {copy?.description || "SmartBar can still capture the visitor’s contact details and note, then hand the context to the team when they return."}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 px-4 py-3">
        {contextSummary && (
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5 text-xs leading-5 text-white/64 ring-1 ring-white/10 md:bg-white/75 md:text-slate-600 md:ring-amber-100">
            <span className="font-semibold text-white/86 md:text-slate-800">Context: </span>
            {contextSummary}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42 md:text-slate-400">
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy?.emailPlaceholder || "work@email.com"}
            className="h-10 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/32 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20 md:border-slate-200 md:bg-white md:text-slate-950 md:placeholder:text-slate-400 md:focus:border-amber-300 md:focus:ring-amber-200/70"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42 md:text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={copy?.phonePlaceholder || "Optional"}
              className="h-10 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/32 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20 md:border-slate-200 md:bg-white md:text-slate-950 md:placeholder:text-slate-400 md:focus:border-amber-300 md:focus:ring-amber-200/70"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42 md:text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Company
            </span>
            <input
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder={inferredCompany || copy?.companyPlaceholder || "Optional"}
              className="h-10 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/32 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20 md:border-slate-200 md:bg-white md:text-slate-950 md:placeholder:text-slate-400 md:focus:border-amber-300 md:focus:ring-amber-200/70"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42 md:text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" />
            Note
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder={copy?.notePlaceholder || "What should the consultant know?"}
            className="max-h-32 min-h-20 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2 text-sm font-medium leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20 md:border-slate-200 md:bg-white md:text-slate-950 md:placeholder:text-slate-400 md:focus:border-amber-300 md:focus:ring-amber-200/70"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="group flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45 md:bg-slate-950 md:text-white md:hover:bg-slate-800"
        >
          {copy?.submitLabel || "Send request"}
          <SendHorizonal className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>

        <p className="text-center text-[11px] leading-4 text-white/42 md:text-slate-500">
          Email or phone is required. Company can usually be inferred from a work email.
        </p>
      </div>
    </form>
  );
}
