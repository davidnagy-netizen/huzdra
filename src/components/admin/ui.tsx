import Link from "next/link";
import { STATUS_LABELS } from "@/lib/pipeline/state-machine";
import type { OrderStatus, SupportTicket } from "@/lib/types";

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-black">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, sub, href, tone }: { label: string; value: string; sub?: string; href?: string; tone?: "good" | "warn" | "crit" }) {
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-black tabular-nums ${tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : ""}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-surface p-4";
  return href ? <Link href={href} className={`${cls} hover:border-gold`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

const STATUS_TONE: Partial<Record<OrderStatus, "good" | "warn" | "crit" | "info">> = {
  delivered: "good",
  done: "good",
  qc: "warn",
  awaiting_artist_approval: "warn",
  moderation_hold: "crit",
  cancelled: "crit",
};

export function Tone({ tone, children }: { tone: "good" | "warn" | "crit" | "info" | "muted"; children: React.ReactNode }) {
  const map = {
    good: "border-good/40 text-good",
    warn: "border-warn/40 text-warn",
    crit: "border-crit/40 text-crit",
    info: "border-gold/40 text-gold",
    muted: "border-line text-muted",
  };
  const icon = { good: "✓", warn: "!", crit: "✕", info: "•", muted: "•" }[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Tone tone={STATUS_TONE[status] ?? "info"}>{STATUS_LABELS[status]}</Tone>;
}

export const TICKET_LABELS: Record<SupportTicket["status"], string> = {
  open: "Nyitott",
  auto_resolved: "Automatikusan megoldva",
  needs_human: "Emberi válasz kell",
  closed: "Lezárva",
};
export function TicketBadge({ status }: { status: SupportTicket["status"] }) {
  const tone = status === "needs_human" ? "crit" : status === "auto_resolved" ? "good" : status === "open" ? "warn" : "muted";
  return <Tone tone={tone}>{TICKET_LABELS[status]}</Tone>;
}

export const INTENT_LABELS: Record<string, string> = {
  name_fix: "Névjavítás",
  pronunciation_fix: "Kiejtés",
  content_change: "Tartalmi módosítás",
  status: "Állapot",
  refund: "Visszatérítés",
  cancel: "Lemondás",
  thanks: "Köszönet",
  other: "Egyéb",
};

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

const dtf = new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso: string | null | undefined) => (iso ? dtf.format(new Date(iso)) : "–");
