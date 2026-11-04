import type { MetadataRoute } from "next";
import { getRepo } from "@/lib/db";
import { ARTIST_LANDING_SUFFIX, OCCASION_LANDINGS } from "@/lib/landings";
import { LEGAL_DOCS } from "@/lib/legal";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getRepo();
  const [artists, comingSoon] = await Promise.all([repo.listArtists(), repo.listComingSoonArtists()]);
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, priority: 1 },
    ...OCCASION_LANDINGS.map((l) => ({ url: `${SITE.url}/${l.slug}`, lastModified: now, priority: 0.8 })),
    ...artists.flatMap((a) => [
      { url: `${SITE.url}/eloadok/${a.slug}`, lastModified: now, priority: 0.8 },
      { url: `${SITE.url}/${a.slug}${ARTIST_LANDING_SUFFIX}`, lastModified: now, priority: 0.8 },
    ]),
    ...comingSoon.map((a) => ({ url: `${SITE.url}/eloadok/${a.slug}`, lastModified: now, priority: 0.5 })),
    ...LEGAL_DOCS.map((d) => ({ url: `${SITE.url}/jogi/${d.slug}`, lastModified: now, priority: 0.2 })),
  ];
}
