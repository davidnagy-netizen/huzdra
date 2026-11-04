import type { Artist } from "./types";

/** A kliensnek átadható, publikus katalógus (belső mezők – jogdíj, hangmodell – nélkül). */
export type PublicArtist = Omit<Artist, "royaltyPercent" | "voiceModelId" | "licenseSignedAt">;

export function toPublicArtist(a: Artist): PublicArtist {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { royaltyPercent, voiceModelId, licenseSignedAt, ...rest } = a;
  return rest;
}

/** Egyeztetés alatt álló előadó: név, slug, leírás és fotó nélkül kerül a kliensre. */
export function toAnonymousArtist(a: Artist, index: number): PublicArtist {
  return {
    ...toPublicArtist(a),
    id: `soon-${index + 1}`,
    slug: "",
    name: "Ismert előadó",
    tagline: "Egyeztetés alatt",
    bio: "",
    photos: [],
  };
}
