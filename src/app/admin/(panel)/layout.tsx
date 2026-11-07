import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin-auth";
import { getRepo } from "@/lib/db";
import { isSupabase } from "@/lib/supabase";
import { isMock } from "@/lib/site";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin | Húzdrá!" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdmin();
  const repo = getRepo();
  const [orders, tickets] = await Promise.all([repo.listOrders(), repo.listTickets({ status: "needs_human" })]);
  const counts = {
    qc: orders.filter((o) => ["qc", "moderation_hold", "awaiting_artist_approval"].includes(o.status) || (o.attention && o.status !== "cancelled")).length,
    support: tickets.length,
  };
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-line bg-bg-2 p-4 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <AdminNav email={email} counts={counts} />
      </aside>
      <div className="min-w-0">
        {(isMock() || !isSupabase()) && (
          <p className="border-b border-line bg-navy px-4 py-1.5 text-xs font-semibold text-white/90">
            {isSupabase() ? "Supabase adatbázis" : "Helyi demó-adatbázis (.data)"} · {process.env.ANTHROPIC_API_KEY ? "Claude AI aktív" : "szabályalapú AI (Claude kulcs nélkül)"} · {process.env.MUSIC_API_URL ? "zene-API csatlakoztatva" : "zene-API: helykitöltő hang"}
          </p>
        )}
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
