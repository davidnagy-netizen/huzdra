import "server-only";
import { getRepo } from "./db";
import type { Artist, Extra, Faq, Occasion, Package, Review, SampleSong, SiteStats, Style } from "./types";

/** A kliensnek átadható, publikus katalógus (belső mezők – jogdíj, hangmodell – nélkül). */
export type PublicArtist = Omit<Artist, "royaltyPercent" | "voiceModelId" | "licenseSignedAt">;

export interface Catalog {
  artists: PublicArtist[];
  occasions: Occasion[];
  styles: Style[];
  samples: SampleSong[];
  packages: Package[];
  extras: Extra[];
}

export function toPublicArtist(a: Artist): PublicArtist {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { royaltyPercent, voiceModelId, licenseSignedAt, ...rest } = a;
  return rest;
}

export async function getCatalog(): Promise<Catalog> {
  const repo = getRepo();
  const [artists, occasions, styles, samples, packages, extras] = await Promise.all([
    repo.listArtists(),
    repo.listOccasions(),
    repo.listStyles(),
    repo.listSamples(),
    repo.listPackages(),
    repo.listExtras(),
  ]);
  return { artists: artists.map(toPublicArtist), occasions, styles, samples, packages, extras };
}

export async function getHomeData(): Promise<Catalog & { reviews: Review[]; faqs: Faq[]; stats: SiteStats }> {
  const repo = getRepo();
  const [catalog, reviews, faqs, stats] = await Promise.all([
    getCatalog(),
    repo.listReviews({ limit: 6 }),
    repo.listFaqs(),
    repo.getStats(),
  ]);
  return { ...catalog, reviews, faqs, stats };
}
