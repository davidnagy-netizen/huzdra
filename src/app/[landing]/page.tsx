import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { HomeView } from "@/components/home/HomeView";
import { getHomeData } from "@/lib/catalog";
import { getRepo } from "@/lib/db";
import { ARTIST_LANDING_SUFFIX, OCCASION_LANDINGS } from "@/lib/landings";

export const dynamic = "force-dynamic";

async function resolve(slug: string) {
  const occ = OCCASION_LANDINGS.find((l) => l.slug === slug);
  if (occ) return { kind: "occasion" as const, occ };
  if (slug.endsWith(ARTIST_LANDING_SUFFIX)) {
    const artist = await getRepo().getArtistBySlug(slug.slice(0, -ARTIST_LANDING_SUFFIX.length));
    if (artist) return { kind: "artist" as const, artist };
  }
  return null;
}

export async function generateMetadata(props: PageProps<"/[landing]">): Promise<Metadata> {
  const { landing } = await props.params;
  const r = await resolve(landing);
  if (!r) return {};
  if (r.kind === "occasion") {
    return { title: r.occ.title, description: r.occ.description, alternates: { canonical: `/${r.occ.slug}` } };
  }
  return {
    title: `${r.artist.name} egyedi dal – saját nóta az ő hangján`,
    description: `Rendelj személyre szóló dalt ${r.artist.name} hangján lagzira, szülinapra, keresztelőre. Fizetés csak ha kész.`,
    alternates: { canonical: `/${landing}` },
    openGraph: { images: [`/eloadok/${r.artist.slug}/opengraph-image`] },
  };
}

export default async function LandingPage(props: PageProps<"/[landing]">) {
  const { landing } = await props.params;
  const r = await resolve(landing);
  if (!r) notFound();
  if (r.kind === "artist" && r.artist.availability === "coming_soon") redirect(`/eloadok/${r.artist.slug}`);
  const data = await getHomeData();
  if (r.kind === "occasion") {
    return <HomeView data={data} hero={{ title: r.occ.h1, sub: r.occ.sub }} preset={{ occasionId: r.occ.occasionId }} initialOccasion={r.occ.occasionId} />;
  }
  return (
    <HomeView
      data={data}
      hero={{
        title: (
          <>
            Egyedi dal <span className="text-gradient-gold">{r.artist.name}</span> hangján
          </>
        ),
        sub: `${r.artist.tagline} Mondd el a történeted, ${r.artist.name} pedig elénekli – akár pár órán belül.`,
      }}
      preset={{ artistId: r.artist.id }}
    />
  );
}
