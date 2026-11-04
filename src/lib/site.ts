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

export function aiDisclosure(artistName: string) {
  return `A dal mesterséges intelligenciával készül ${artistName} hivatalos, engedélyezett hangmodelljével.`;
}
