export const SITE = {
  name: "Húzdrá!",
  domain: "huzdra.hu",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://huzdra.hu",
  slogan: "Mondd el a történeted, mi meg húzzuk rá!",
  promise: "Saját nótád, kedvenc előadód hangján, akár pár órán belül.",
  email: "hello@huzdra.hu",
  revisionRounds: 2,
  storyRetentionDays: 90,
} as const;

export const isMock = () => process.env.HUZDRA_MOCK !== "0";

/** Kötelező MI-közlés (dal-oldal, GYIK, e-mail). Hírességnél a licencelt hangmodellt is megnevezi. */
export function aiDisclosure(artist: { name: string; kind: "celebrity" | "house" }) {
  return artist.kind === "celebrity"
    ? `A dal mesterséges intelligenciával készül ${artist.name} hivatalos, engedélyezett hangmodelljével.`
    : `A dal mesterséges intelligencia segítségével készül, ${artist.name} hangján.`;
}

/** Jelvény szövege: csak licencelt híresség kaphat "Hivatalos hang" jelvényt. */
export function voiceBadgeLabel(kind: "celebrity" | "house") {
  return kind === "celebrity" ? "Hivatalos hang" : "Húzdrá! hang";
}
