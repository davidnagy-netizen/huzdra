// camelCase (TypeScript) ↔ snake_case (Postgres) leképezés. Sekély: a felső szintű kulcsok lesznek
// oszlopok; a beágyazott objektumok/tömbök jsonb (vagy text[]) oszlopba kerülnek változatlanul.

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function toRow<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnake(k)] = v;
  return out;
}

export function fromRow<T>(row: Record<string, unknown>, drop: string[] = []): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (drop.includes(k)) continue;
    out[toCamel(k)] = v;
  }
  return out as T;
}

/** Entitás → tábla. */
export const TABLES = {
  artists: "artists",
  occasions: "occasions",
  styles: "styles",
  samples: "sample_songs",
  reviews: "reviews",
  packages: "packages",
  extras: "extras",
  coupons: "coupons",
  faqs: "faqs",
  drafts: "drafts",
  orders: "orders",
  leads: "leads",
  waitlist: "waitlist",
  emails: "email_outbox",
  tickets: "support_tickets",
  trainingSamples: "training_samples",
  trainingJobs: "training_jobs",
  previews: "previews",
} as const;

/** A rendelés kereséshez szükséges származtatott oszlopai (az objektumban nem szerepelnek). */
export const ORDER_DERIVED = ["email", "artist_id"];
export function orderToRow<T extends { data: { email: string; artistId: string } }>(o: T) {
  return { ...toRow(o), email: o.data.email.trim().toLowerCase(), artist_id: o.data.artistId };
}
