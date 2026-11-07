"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Áttekintés", icon: "◧" },
  { href: "/admin/rendelesek", label: "Rendelések", icon: "▤" },
  { href: "/admin/qc", label: "QC és moderáció", icon: "✓", badge: "qc" },
  { href: "/admin/szupport", label: "Szupport", icon: "✉", badge: "support" },
  { href: "/admin/zenek", label: "Zenék és tanítás", icon: "♫" },
  { href: "/admin/katalogus/artists", label: "Előadók és felárak", icon: "★" },
  { href: "/admin/katalogus/packages", label: "Csomagok és árak", icon: "₣" },
  { href: "/admin/katalogus/extras", label: "Extrák", icon: "+" },
  { href: "/admin/katalogus/coupons", label: "Kuponok", icon: "%" },
  { href: "/admin/katalogus/samples", label: "Mintadalok", icon: "▶" },
  { href: "/admin/katalogus/reviews", label: "Vélemények", icon: "❝" },
  { href: "/admin/katalogus/faqs", label: "GYIK", icon: "?" },
  { href: "/admin/leadek", label: "Leadek, várólista", icon: "☎" },
  { href: "/admin/beallitasok", label: "Beállítások", icon: "⚙" },
];

export function AdminNav({ email, counts }: { email: string; counts: Record<string, number> }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <nav aria-label="Admin navigáció" className="flex h-full flex-col">
      <Link href="/admin" className="mb-6 block px-3 font-script text-2xl text-gold">Húzdrá! <span className="font-sans text-xs font-bold uppercase tracking-wider text-muted">admin</span></Link>
      <ul className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
          const c = n.badge ? counts[n.badge] ?? 0 : 0;
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-gold/15 text-gold" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                <span className="w-4 text-center" aria-hidden>{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {c > 0 && <span className="rounded-full bg-crit px-1.5 text-[11px] font-bold text-white">{c}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-line px-3 pt-3 text-xs text-muted">
        <p className="truncate">{email}</p>
        <div className="mt-2 flex gap-3">
          <Link href="/" className="hover:text-ink">Weboldal ↗</Link>
          <button type="button" className="hover:text-ink" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.push("/admin/login"); }}>Kilépés</button>
        </div>
      </div>
    </nav>
  );
}
