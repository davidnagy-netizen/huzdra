import { Card, Empty, PageTitle, fmtDate } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";

export const metadata = { title: "Leadek és várólista" };

export default async function LeadsPage() {
  const repo = getRepo();
  const [leads, waitlist, artists] = await Promise.all([repo.listLeads(), repo.listWaitlist(), repo.listArtists({ includeInactive: true })]);
  const name = (id: string) => artists.find((a) => a.id === id)?.name ?? id;
  return (
    <>
      <PageTitle title="Leadek és várólista" />
      <Card title={`Élő fellépés iránti érdeklődés (${leads.length})`} className="mb-4">
        {leads.length === 0 ? <Empty>Még nincs érdeklődő.</Empty> : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-2">Dátum</th><th className="py-2">Előadó</th><th className="py-2">Kapcsolat</th><th className="py-2">Rendezvény</th><th className="py-2 pr-5">Megjegyzés</th></tr></thead>
              <tbody>{leads.map((l) => <tr key={l.id} className="border-t border-line"><td className="px-5 py-2">{fmtDate(l.createdAt)}</td><td className="py-2">{name(l.artistId)}</td><td className="py-2">{l.name}<div className="text-xs text-muted">{l.email} · {l.phone}</div></td><td className="py-2">{l.eventDate} · {l.location}</td><td className="py-2 pr-5 text-xs text-muted">{l.note}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title={`Várólista – egyeztetés alatt álló előadók (${waitlist.length})`}>
        {waitlist.length === 0 ? <Empty>Még nincs feliratkozó.</Empty> : (
          <ul className="text-sm">{waitlist.map((w) => <li key={w.id} className="flex justify-between border-t border-line py-2 first:border-0"><span>{w.email}</span><span className="text-muted">{name(w.artistId)} · {fmtDate(w.createdAt)}</span></li>)}</ul>
        )}
      </Card>
    </>
  );
}
