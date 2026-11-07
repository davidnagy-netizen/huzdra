import type { Metadata } from "next";
import Link from "next/link";
import { CookieBanner } from "@/components/CookieBanner";
import { Logo } from "@/components/Logo";
import { PreviewFunnel } from "@/components/probald/PreviewFunnel";
import { getCatalog } from "@/lib/catalog";
import { getRepo } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hallgasd meg ingyen a saját nótátok elejét",
  description: "Válaszolj pár kérdésre, és 1 perc alatt meghallgathatod, hogyan szólna a saját, személyre szóló mulatós dalotok. Ingyenes előnézet, fizetés csak ha kéred a teljes dalt.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/probald" },
};

/** Hirdetési landing (one-pager): csak a kérdések → 15 mp előnézet → vásárlás. */
export default async function ProbaldPage() {
  const [catalog, stats] = await Promise.all([getCatalog(), getRepo().getStats()]);
  return (
    <main id="main" className="relative min-h-dvh overflow-hidden">
      <div className="disco-bg" aria-hidden><div className="disco-dots" /></div>
      <div className="relative z-10 mx-auto max-w-xl px-4 pb-16 pt-5">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Húzdrá! főoldal"><Logo size="sm" /></Link>
          <span className="text-xs text-muted">⭐ {stats.averageRating.toLocaleString("hu-HU")} · {stats.happyFamilies.toLocaleString("hu-HU")} család</span>
        </header>
        <section className="py-8 text-center">
          <h1 className="font-display text-4xl font-black leading-tight">Hallgasd meg <span className="text-gradient-gold">ingyen</span>, hogyan szólna a ti nótátok!</h1>
          <p className="mt-3 text-muted">6 gyors kérdés → 1 perc múlva meghallgatod a dalod elejét. Ha tetszik, kérd a teljes dalt – fizetés csak ha kész.</p>
        </section>
        <PreviewFunnel catalog={catalog} />
        <p className="mt-8 text-center text-xs text-muted">A dal mesterséges intelligencia segítségével készül, személyes, nem kereskedelmi felhasználásra. <Link href="/jogi/aszf" className="underline">ÁSZF</Link> · <Link href="/jogi/adatvedelem" className="underline">Adatvédelem</Link></p>
      </div>
      <CookieBanner />
    </main>
  );
}
