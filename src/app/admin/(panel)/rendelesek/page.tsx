import Link from "next/link";
import { OrderTable } from "@/components/admin/OrderTable";
import { Card, PageTitle } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/pipeline/state-machine";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Rendelések" };
const PER = 50;

export default async function OrdersPage(props: PageProps<"/admin/rendelesek">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const status = typeof sp.allapot === "string" ? sp.allapot : "";
  const artist = typeof sp.eloado === "string" ? sp.eloado : "";
  const page = Math.max(1, Number(sp.oldal) || 1);
  const repo = getRepo();
  const [all, artists] = await Promise.all([repo.listOrders(), repo.listArtists({ includeInactive: true })]);
  const filtered = all.filter((o) => {
    if (status === "folyamatban" && ["delivered", "done", "cancelled"].includes(o.status)) return false;
    if (status === "figyelem" && !o.attention) return false;
    if (status && !["folyamatban", "figyelem"].includes(status) && o.status !== status) return false;
    if (artist && o.data.artistId !== artist) return false;
    if (q && ![o.code, o.data.email, o.data.recipientName, o.data.billingName].some((x) => x.toLowerCase().includes(q))) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const rows = filtered.slice((page - 1) * PER, page * PER);
  const qs = (p: number) => `?${new URLSearchParams({ ...(q && { q }), ...(status && { allapot: status }), ...(artist && { eloado: artist }), oldal: String(p) })}`;
  return (
    <>
      <PageTitle title="Rendelések" sub={`${filtered.length} találat`} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Keresés: kód, e-mail, név…" className="field !w-auto flex-1 !py-2 text-sm" aria-label="Keresés" />
        <select name="allapot" defaultValue={status} className="field !w-auto !py-2 text-sm" aria-label="Állapot">
          <option value="">Minden állapot</option>
          <option value="folyamatban">Folyamatban</option>
          <option value="figyelem">Figyelmet igényel</option>
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select name="eloado" defaultValue={artist} className="field !w-auto !py-2 text-sm" aria-label="Előadó">
          <option value="">Minden előadó</option>
          {artists.map((a) => <option key={a.id} value={a.id}>{a.name}{a.availability === "coming_soon" ? " (hamarosan)" : ""}</option>)}
        </select>
        <button className="btn-primary !py-2 text-sm">Szűrés</button>
        {(q || status || artist) && <Link href="/admin/rendelesek" className="btn-ghost !py-2 text-sm">Törlés</Link>}
      </form>
      <Card><OrderTable orders={rows} /></Card>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm" aria-label="Lapozás">
          {page > 1 && <Link className="btn-ghost !py-1.5" href={qs(page - 1)}>← Előző</Link>}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages && <Link className="btn-ghost !py-1.5" href={qs(page + 1)}>Következő →</Link>}
        </nav>
      )}
    </>
  );
}
