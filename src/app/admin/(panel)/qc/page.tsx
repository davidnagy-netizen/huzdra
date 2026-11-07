import Link from "next/link";
import { ActionButton } from "@/components/admin/Action";
import { Card, Empty, PageTitle, StatusBadge, fmtDate } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";
import { autoQcChecks } from "@/lib/pipeline/orchestrator";
import type { Order } from "@/lib/types";

export const metadata = { title: "QC és moderáció" };

function Row({ o }: { o: Order }) {
  const qc = autoQcChecks(o);
  const api = `/api/admin/orders/${o.id}`;
  return (
    <li className="flex flex-col gap-3 border-t border-line py-4 first:border-0 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p><Link href={`/admin/rendelesek/${o.id}`} className="font-bold text-gold hover:underline">{o.code}</Link> · {o.data.recipientName} <StatusBadge status={o.status} /></p>
        <p className="text-xs text-muted">határidő: {fmtDate(o.dueAt)} · {o.lyrics?.title ?? "nincs szöveg"}</p>
        {o.attention && <p className="mt-1 text-sm font-semibold text-crit">⚠ {o.attention}</p>}
        {!qc.ok && <p className="mt-1 text-xs text-muted">Auto-QC: {qc.failed.join(", ")}</p>}
        {o.moderation.flags.length > 0 && <p className="mt-1 text-xs text-muted">Tartalomszűrő: {o.moderation.flags.map((f) => `${f.category} („${f.match}”)`).join(", ")}</p>}
      </div>
      {o.audio?.url && o.status === "qc" && <audio controls preload="none" src={o.audio.url} className="w-full lg:w-72" />}
      <div className="flex flex-wrap gap-2">
        {o.status === "qc" && <ActionButton url={api} body={{ action: "approve_qc" }} label="Jóváhagyás" variant="primary" />}
        {o.status === "qc" && <ActionButton url={api} body={{ action: "regenerate_audio" }} label="Új hang" />}
        {o.status === "moderation_hold" && <ActionButton url={api} body={{ action: "release_moderation" }} label="Feloldás" variant="primary" confirm="A tartalom rendben van, mehet tovább?" />}
        {o.status === "awaiting_artist_approval" && <ActionButton url={api} body={{ action: "artist_approve" }} label="Szöveg jóváhagyása" variant="primary" />}
        <Link href={`/admin/rendelesek/${o.id}`} className="btn-ghost !py-2 text-sm">Részletek</Link>
      </div>
    </li>
  );
}

export default async function QcPage() {
  const orders = await getRepo().listOrders();
  const attention = orders.filter((o) => o.attention && o.status !== "cancelled");
  const qc = orders.filter((o) => o.status === "qc" && !o.attention);
  const mod = orders.filter((o) => o.status === "moderation_hold" && !o.attention);
  const artist = orders.filter((o) => o.status === "awaiting_artist_approval");
  const section = (title: string, list: Order[], empty: string) => (
    <Card title={`${title} (${list.length})`} className="mb-4">{list.length ? <ul>{list.map((o) => <Row key={o.id} o={o} />)}</ul> : <Empty>{empty}</Empty>}</Card>
  );
  return (
    <>
      <PageTitle title="QC és moderáció" sub="Ami ide kerül, azt az automatika nem tudta magától eldönteni. Minden más magától megy." />
      {section("Figyelmet igényel", attention, "Nincs elakadt rendelés. 🎉")}
      {section("Emberi minőségellenőrzés", qc, "Nincs QC-re váró dal (az automatikus QC mindent átengedett).")}
      {section("Moderációs sor", mod, "Nincs kétes tartalom.")}
      {section("Előadói jóváhagyás", artist, "Nincs jóváhagyásra váró szöveg.")}
    </>
  );
}
