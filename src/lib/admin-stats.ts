import "server-only";
import { getRepo } from "./db";
import type { Order } from "./types";

const DAY = 86400_000;
const paid = (o: Order) => o.payment.state === "captured";
const isOpen = (o: Order) => !["delivered", "done", "cancelled"].includes(o.status);

export interface Bar {
  label: string;
  value: number;
  sub?: string;
}

export async function getDashboard(rangeDays = 30) {
  const repo = getRepo();
  const now = Date.now();
  const since = new Date(now - rangeDays * DAY).toISOString();
  const [orders, previews, drafts, tickets, artists, occasions, packages, settings] = await Promise.all([
    repo.listOrders(),
    repo.listPreviews(since),
    repo.listDrafts(since),
    repo.listTickets(),
    repo.listArtists({ includeInactive: true }),
    repo.listOccasions(),
    repo.listPackages(),
    repo.getSettings(),
  ]);
  const inRange = orders.filter((o) => o.createdAt >= since);
  const revenueOrders = inRange.filter(paid);
  const revenue = revenueOrders.reduce((s, o) => s + o.price.totalHuf, 0);
  const refunds = inRange.filter((o) => o.payment.state === "refunded").reduce((s, o) => s + o.price.totalHuf, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => Date.parse(o.createdAt) >= today.getTime());

  // napi bevétel (utolsó 14 nap) – a kézbesítés (terhelés) napja szerint
  const daily: Bar[] = [];
  for (let i = 13; i >= 0; i--) {
    const d0 = new Date(today.getTime() - i * DAY);
    const d1 = d0.getTime() + DAY;
    const v = orders
      .filter((o) => paid(o) && o.deliveredAt && Date.parse(o.deliveredAt) >= d0.getTime() && Date.parse(o.deliveredAt) < d1)
      .reduce((s, o) => s + o.price.totalHuf, 0);
    daily.push({ label: d0.toLocaleDateString("hu-HU", { month: "short", day: "numeric" }), value: v });
  }

  const group = (key: (o: Order) => string, name: (k: string) => string): Bar[] => {
    const m = new Map<string, { v: number; n: number }>();
    for (const o of revenueOrders) {
      const k = key(o);
      const cur = m.get(k) ?? { v: 0, n: 0 };
      m.set(k, { v: cur.v + o.price.totalHuf, n: cur.n + 1 });
    }
    return [...m.entries()].map(([k, x]) => ({ label: name(k), value: x.v, sub: `${x.n} rendelés` })).sort((a, b) => b.value - a.value);
  };

  const previewBuys = previews.filter((p) => p.orderId).length;
  const readyPreviews = previews.filter((p) => p.status === "ready").length; // a megvásároltak is "ready"
  const wizardOrders = inRange.filter((o) => !o.previewId).length;

  return {
    rangeDays,
    kpi: {
      revenue,
      refunds,
      orders: inRange.length,
      paidOrders: revenueOrders.length,
      aov: revenueOrders.length ? Math.round(revenue / revenueOrders.length) : 0,
      todayOrders: todayOrders.length,
      happyFamilies: settings.happyFamiliesBaseline + orders.filter((o) => o.status === "delivered" || o.status === "done").length,
    },
    daily,
    byArtist: group((o) => o.data.artistId, (k) => artists.find((a) => a.id === k)?.name ?? k),
    byOccasion: group((o) => o.data.occasionId || "egyeb", (k) => occasions.find((o) => o.id === k)?.label ?? "Egyéb"),
    byPackage: group((o) => o.data.packageId || "?", (k) => packages.find((p) => p.id === k)?.name ?? k),
    funnel: {
      wizard: [
        { label: "Varázsló elkezdve", value: drafts.length },
        { label: "Rendelés leadva", value: wizardOrders },
        { label: "Kézbesítve", value: inRange.filter((o) => !o.previewId && paid(o)).length },
      ],
      preview: [
        { label: "Előnézet kérve", value: previews.length },
        { label: "Előnézet elkészült", value: readyPreviews },
        { label: "Megvásárolva", value: previewBuys },
      ],
    },
    queues: {
      qc: orders.filter((o) => o.status === "qc").length,
      moderation: orders.filter((o) => o.status === "moderation_hold").length,
      artistApproval: orders.filter((o) => o.status === "awaiting_artist_approval").length,
      attention: orders.filter((o) => o.attention && o.status !== "cancelled").length,
      support: tickets.filter((t) => t.status === "needs_human").length,
      supportAuto: tickets.filter((t) => t.status === "auto_resolved" && t.createdAt >= since).length,
      overdue: orders.filter((o) => isOpen(o) && Date.parse(o.dueAt) < now).length,
      inProgress: orders.filter(isOpen).length,
    },
    recent: orders.slice(0, 8),
  };
}
