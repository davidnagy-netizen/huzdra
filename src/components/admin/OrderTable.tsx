import Link from "next/link";
import { formatHuf } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import { StatusBadge, fmtDate } from "./ui";

export function OrderTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="text-sm text-muted">Még nincs rendelés.</p>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr><th className="px-5 py-2">Rendelés</th><th className="py-2">Ünnepelt</th><th className="py-2">Állapot</th><th className="py-2">Határidő</th><th className="py-2 pr-5 text-right">Összeg</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-line hover:bg-surface-2">
              <td className="px-5 py-2.5"><Link href={`/admin/rendelesek/${o.id}`} className="font-semibold text-gold hover:underline">{o.code}</Link><div className="text-xs text-muted">{fmtDate(o.createdAt)}{o.previewId ? " · előnézetből" : ""}</div></td>
              <td className="py-2.5">{o.data.recipientName}<div className="text-xs text-muted">{o.data.email}</div></td>
              <td className="py-2.5"><StatusBadge status={o.status} />{o.attention && <div className="mt-1 text-xs font-semibold text-crit">⚠ {o.attention.slice(0, 60)}</div>}</td>
              <td className={`py-2.5 text-xs ${Date.parse(o.dueAt) < Date.now() && !["delivered", "done", "cancelled"].includes(o.status) ? "font-bold text-crit" : "text-muted"}`}>{fmtDate(o.dueAt)}</td>
              <td className="py-2.5 pr-5 text-right tabular-nums">{formatHuf(o.price.totalHuf)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
