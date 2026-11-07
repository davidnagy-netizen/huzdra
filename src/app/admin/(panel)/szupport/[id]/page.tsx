import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/Action";
import { TicketReply } from "@/components/admin/SupportTools";
import { Card, INTENT_LABELS, PageTitle, StatusBadge, TicketBadge, Tone, fmtDate } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";

export const metadata = { title: "Szupport-jegy" };

export default async function TicketPage(props: PageProps<"/admin/szupport/[id]">) {
  const { id } = await props.params;
  const repo = getRepo();
  const t = await repo.getTicket(id);
  if (!t) notFound();
  const order = t.orderId ? await repo.getOrder(t.orderId) : null;
  const ex = Object.entries(t.extracted).filter(([, v]) => v);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/szupport" className="text-muted hover:text-ink">← Szupport</Link></p>
      <PageTitle title={t.subject || "Üzenet"} sub={`${t.fromEmail} · ${fmtDate(t.createdAt)} · ${t.channel}`} actions={<TicketBadge status={t.status} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Beszélgetés">
            <ol className="space-y-3">
              {t.replies.map((r, i) => (
                <li key={i} className={`rounded-xl p-3 text-sm ${r.from === "customer" ? "bg-surface-2" : "border border-line"}`}>
                  <p className="mb-1 text-xs font-bold text-muted">{r.from === "customer" ? "Ügyfél" : r.from === "system" ? "Automatikus válasz" : "Admin"} · {fmtDate(r.at)}</p>
                  <p className="whitespace-pre-wrap">{r.text}</p>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Válasz"><TicketReply ticketId={t.id} /></Card>
        </div>
        <div className="space-y-4">
          <Card title="AI elemzés">
            <p className="text-sm">Szándék: <b>{t.intent ? INTENT_LABELS[t.intent] : "–"}</b></p>
            <p className="text-sm">Magabiztosság: <b>{Math.round(t.confidence * 100)}%</b></p>
            <p className="text-sm">Igazolt rendelő: {t.verified ? <Tone tone="good">igen</Tone> : <Tone tone="warn">nem</Tone>}</p>
            {ex.length > 0 && <ul className="mt-2 text-sm">{ex.map(([k, v]) => <li key={k} className="text-muted">{k}: <b className="text-ink">{String(v)}</b></li>)}</ul>}
            <p className="mt-2 text-xs text-muted">Ágens: {t.agent || "–"}</p>
            <div className="mt-3"><ActionButton url={`/api/admin/tickets/${t.id}`} body={{ action: "reprocess" }} label="Újrafeldolgozás" /></div>
          </Card>
          {order && (
            <Card title="Rendelés">
              <Link href={`/admin/rendelesek/${order.id}`} className="font-bold text-gold hover:underline">{order.code}</Link> · {order.data.recipientName}
              <div className="mt-1"><StatusBadge status={order.status} /></div>
            </Card>
          )}
          <Card title="Műveletnapló">
            <ol className="space-y-2 text-sm">{t.actions.map((a, i) => <li key={i} className="border-l-2 border-line pl-3"><b>{a.type}</b> <span className="text-xs text-muted">· {a.actor} · {fmtDate(a.at)}</span><p className="text-xs text-muted">{a.detail}</p></li>)}</ol>
          </Card>
        </div>
      </div>
    </>
  );
}
