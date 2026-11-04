import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtistPortrait } from "@/components/ArtistPortrait";
import { FeaturedPlayer } from "@/components/audio/FeaturedPlayer";
import { OfficialBadge } from "@/components/home/ArtistCards";
import { CtaButton } from "@/components/home/CtaButton";
import { Reviews, SectionTitle } from "@/components/home/Sections";
import { Wizard } from "@/components/wizard/Wizard";
import { getCatalog, toPublicArtist, type PublicArtist } from "@/lib/catalog";
import { ComingSoonBadge, WaitlistForm } from "@/components/home/ComingSoon";
import { getRepo } from "@/lib/db";
import { formatSurcharge } from "@/lib/pricing";
import { aiDisclosure } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/eloadok/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const artist = await getRepo().getArtistBySlug(slug);
  if (!artist) return {};
  return {
    title: artist.availability === "coming_soon" ? `${artist.name} – hamarosan a Húzdrá!-n` : `${artist.name} – egyedi dal az ő hangján`,
    description:
      artist.availability === "coming_soon"
        ? `${artist.name} hivatalos hangja hamarosan választható a Húzdrá!-n. Iratkozz fel, és szólunk!`
        : `${artist.tagline} Rendelj személyre szóló dalt ${artist.name} hangján.`,
    alternates: { canonical: `/eloadok/${artist.slug}` },
  };
}

export default async function ArtistPage(props: PageProps<"/eloadok/[slug]">) {
  const { slug } = await props.params;
  const repo = getRepo();
  const artist = await repo.getArtistBySlug(slug);
  if (!artist) notFound();
  const [catalog, reviews, stats] = await Promise.all([getCatalog(), repo.listReviews({ artistId: artist.id, limit: 3 }), repo.getStats()]);
  const pub = toPublicArtist(artist);
  if (artist.availability === "coming_soon") return <ComingSoonProfile artist={pub} />;
  const samples = catalog.samples.filter((s) => s.artistId === artist.id).slice(0, 3);
  const styleLabels = artist.styles.map((id) => catalog.styles.find((s) => s.id === id)?.label).filter(Boolean);
  const scoped = { ...catalog, samples: samples.map((s) => ({ ...s, featured: true })), artists: [pub] };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="disco-bg" aria-hidden><div className="disco-dots" /></div>
        <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
          <div className="card relative aspect-[4/3] overflow-hidden">
            <ArtistPortrait artist={pub} priority />
            <OfficialBadge className="absolute left-3 top-3" kind={artist.kind} />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted"><Link href="/#eloadok" className="hover:text-gold">Előadók</Link> / {artist.name}</p>
            <h1 className="mt-2 font-display text-5xl font-black">{artist.name}</h1>
            <p className="mt-2 text-xl text-gold">{artist.tagline}</p>
            <p className="mt-4 text-muted">{artist.bio}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {styleLabels.map((l) => <li key={l} className="chip">{l}</li>)}
            </ul>
            <p className="mt-4 text-sm">Előadói felár: <b>{formatSurcharge(artist.surchargeHuf)}</b>{artist.surchargeHuf > 0 ? " a csomag árán felül" : ""}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CtaButton preset={{ artistId: artist.id }}>Ezt az előadót választom</CtaButton>
              <a href="#mintak" className="btn-ghost">Hallgass bele</a>
            </div>
            <p className="mt-4 text-xs text-muted">{aiDisclosure(artist)}</p>
          </div>
        </div>
      </section>

      <section id="mintak" className="mx-auto max-w-3xl px-4 py-12">
        <SectionTitle title={`${artist.name} mintadalai`} />
        <FeaturedPlayer catalog={scoped} />
      </section>

      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <SectionTitle title="Akik már rendeltek tőle" />
          <Reviews reviews={reviews} catalog={catalog} stats={stats} />
        </section>
      )}

      <section id="rendeles" className="scroll-mt-16 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <SectionTitle title={<>Saját dal <span className="text-gradient-gold">{artist.name}</span> hangján</>} sub="6 rövid lépés, fizetés csak ha kész." />
          <Wizard catalog={catalog} preset={{ artistId: artist.id }} />
        </div>
      </section>
    </>
  );
}

function ComingSoonProfile({ artist }: { artist: PublicArtist }) {
  return (
    <section className="relative overflow-hidden">
      <div className="disco-bg" aria-hidden><div className="disco-dots" /></div>
      <div className="relative z-10 mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-2 md:items-center">
        <div className="card relative aspect-[4/3] overflow-hidden">
          <ArtistPortrait artist={artist} priority />
          <ComingSoonBadge className="absolute left-3 top-3" />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted"><Link href="/#eloadok" className="hover:text-gold">Előadók</Link> / {artist.name}</p>
          <h1 className="mt-2 font-display text-5xl font-black">{artist.name}</h1>
          <p className="mt-3 text-lg text-muted">
            {artist.name} hivatalos hangja <b className="text-ink">hamarosan</b> választható lesz. Iratkozz fel, és elsőként szólunk, amint rendelhető.
          </p>
          <div className="mt-6"><WaitlistForm artist={artist} /></div>
          <p className="mt-6 text-sm text-muted">Addig is: válassz a saját hangjaink közül – a dalod akár pár órán belül kész.</p>
          <Link href="/#eloadok" className="btn-primary mt-3">Hangjaink megtekintése</Link>
        </div>
      </div>
    </section>
  );
}
