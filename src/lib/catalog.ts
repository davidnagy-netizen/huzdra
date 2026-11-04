import "server-only";
import { getRepo } from "./db";
import type { Artist, Extra, Faq, Occasion, Package, Review, SampleSong, SiteStats, Style } from "./types";

import { toAnonymousArtist, toPublicArtist, type PublicArtist } from "./artist-public";

export { toAnonymousArtist, toPublicArtist, type PublicArtist };

export interface Catalog {
  /** Rendelhető előadók */
  artists: PublicArtist[];
  /** "Hamarosan" előadók – megjelennek, de nem rendelhetők */
  comingSoon: PublicArtist[];
  occasions: Occasion[];
  styles: Style[];
  samples: SampleSong[];
  packages: Package[];
  extras: Extra[];
}

export async function getCatalog(): Promise<Catalog> {
  const repo = getRepo();
  const [artists, comingSoon, occasions, styles, samples, packages, extras] = await Promise.all([
    repo.listArtists(),
    repo.listComingSoonArtists(),
    repo.listOccasions(),
    repo.listStyles(),
    repo.listSamples(),
    repo.listPackages(),
    repo.listExtras(),
  ]);
  return { artists: artists.map(toPublicArtist), comingSoon: comingSoon.map(toAnonymousArtist), occasions, styles, samples, packages, extras };
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
