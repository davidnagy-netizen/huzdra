import Link from "next/link";
import { SupportSimulator } from "@/components/admin/SupportTools";
import { Card, Empty, INTENT_LABELS, PageTitle, TICKET_LABELS, TicketBadge, fmtDate } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";
import type { SupportTicket } from "@/lib/types";

export const metadata = { title: "Szupport" };

export default async function SupportPage(props: PageProps<"/admin/szupport">) {
  const sp = await props.searchParams;
  const status = (typeof sp.allapot === "string" ? sp.allapot : "") as SupportTicket["status"] | "";
  const repo = getRepo();
  const [all, settings, orders] = await Promise.all([repo.listTickets(), repo.getSettings(), repo.listOrders()]);
  const list = status ? all.filter((t) => t.status === status) : all;
  const counts = Object.fromEntries((Object.keys(TICKET_LABELS) as SupportTicket["status"][]).map((s) => [s, all.filter((t) => t.status === s).length]));
  const autoRate = all.length ? Math.round(((counts.auto_resolved ?? 0) / all.length) * 100) : 0;
  return (
    <>
      <PageTitle
        title="Szupport"
        sub={`Automatikus mód: ${settings.autoSupport ? "BE" : "KI"} · magabiztossági küszöb: ${Math.round(settings.supportConfidence * 100)}% · automatikusan megoldva: ${autoRate}%`}
        actions={<Link href="/admin/beallitasok" className="btn-ghost !py-2 text-sm">Beállítások</Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/szupport" className="chip" aria-pressed={!status}>Mind ({all.length})</Link>
        {(Object.keys(TICKET_LABELS) as SupportTicket["status"][]).map((s) => (
          <Link key={s} href={`/admin/szupport?allapot=${s}`} className="chip" aria-pressed={status === s}>{TICKET_LABELS[s]} ({counts[s]})</Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Jegyek">
          {list.length === 0 ? <Empty>Nincs jegy ebben a nézetben.</Empty> : (
            <ul>
              {list.map((t) => (
                <li key={t.id} className="border-t border-line py-3 first:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/szupport/${t.id}`} className="font-semibold hover:text-gold">{t.intent ? INTENT_LABELS[t.intent] : "Feldolgozás alatt…"} · {t.fromEmail}</Link>
                    <TicketBadge status={t.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{t.message}</p>
                  <p className="mt-1 text-xs text-muted">{fmtDate(t.createdAt)} · {t.channel}{t.orderCode ? ` · ${t.orderCode}` : ""} · magabiztosság {Math.round(t.confidence * 100)}%{t.actions.at(-1) ? ` · ${t.actions.at(-1)!.type}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Szupport-szimulátor">
          <p className="mb-3 text-sm text-muted">Próbáld ki az automatikus ügyfélszolgálatot: úgy dolgozza fel az üzenetet, mintha e-mailben jött volna. Ha a feladó egy meglévő rendelés e-mail-címe, a művelet (pl. névjavítás) ténylegesen végrehajtódik.</p>
          <SupportSimulator defaultEmail={orders[0]?.data.email ?? "ugyfel@example.com"} />
        </Card>
      </div>
    </>
  );
}
