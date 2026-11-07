import Link from "next/link";
import { BarList, DailyBars, Funnel } from "@/components/admin/charts";
import { OrderTable } from "@/components/admin/OrderTable";
import { Card, PageTitle, StatTile } from "@/components/admin/ui";
import { getDashboard } from "@/lib/admin-stats";
import { formatHuf } from "@/lib/pricing";

export default async function Dashboard(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const range = [7, 30, 90].includes(Number(sp.nap)) ? Number(sp.nap) : 30;
  const d = await getDashboard(range);
  const q = d.queues;
  return (
    <>
      <PageTitle
        title="Áttekintés"
        sub={`Az elmúlt ${range} nap`}
        actions={[7, 30, 90].map((n) => (
          <Link key={n} href={`/admin?nap=${n}`} className="chip" aria-pressed={n === range}>{n} nap</Link>
        ))}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Bevétel" value={formatHuf(d.kpi.revenue)} sub={`${d.kpi.paidOrders} fizetett rendelés${d.kpi.refunds ? ` · visszatérítve ${formatHuf(d.kpi.refunds)}` : ""}`} />
        <StatTile label="Rendelések" value={String(d.kpi.orders)} sub={`ma: ${d.kpi.todayOrders}`} href="/admin/rendelesek" />
        <StatTile label="Átlagos kosárérték" value={formatHuf(d.kpi.aov)} />
        <StatTile label="Készülőben" value={String(q.inProgress)} sub={q.overdue ? `${q.overdue} késésben` : "nincs késés"} tone={q.overdue ? "crit" : undefined} href="/admin/rendelesek?allapot=folyamatban" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-muted">Teendők</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Figyelmet igényel" value={String(q.attention)} href="/admin/qc" tone={q.attention ? "crit" : undefined} />
        <StatTile label="Emberi QC" value={String(q.qc)} href="/admin/qc" tone={q.qc ? "warn" : undefined} />
        <StatTile label="Moderáció" value={String(q.moderation)} href="/admin/qc" tone={q.moderation ? "warn" : undefined} />
        <StatTile label="Előadói jóváhagyás" value={String(q.artistApproval)} href="/admin/qc" />
        <StatTile label="Szupport (ember)" value={String(q.support)} sub={`${q.supportAuto} automatikusan megoldva`} href="/admin/szupport" tone={q.support ? "warn" : undefined} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><DailyBars title="Napi bevétel (utolsó 14 nap, kézbesítéskor terhelve)" data={d.daily} /></Card>
        <Card className="space-y-6">
          <Funnel title="Varázsló tölcsér" steps={d.funnel.wizard} />
          <Funnel title="Hirdetési előnézet tölcsér" steps={d.funnel.preview} />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card><BarList title="Bevétel előadónként" data={d.byArtist} /></Card>
        <Card><BarList title="Bevétel alkalmanként" data={d.byOccasion} /></Card>
        <Card><BarList title="Bevétel csomagonként" data={d.byPackage} /></Card>
      </div>

      <Card title="Legutóbbi rendelések" className="mt-4" actions={<Link href="/admin/rendelesek" className="text-sm font-semibold text-gold">Mind →</Link>}>
        <OrderTable orders={d.recent} />
      </Card>
    </>
  );
}
