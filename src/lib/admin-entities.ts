// Az admin katalógus-szerkesztő mezőleírásai. Ugyanezt használja az űrlap (kliens) és a végpont (szerver).
import type { CatalogEntity } from "./types";

export type FieldType = "text" | "textarea" | "number" | "bool" | "select" | "multiselect" | "date" | "lines" | "audio";
export type OptionSource = "styles" | "occasions" | "artists" | "tempos" | "kinds" | "availability" | "extraKinds";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: OptionSource;
  help?: string;
  /** Csak új rekordnál szerkeszthető (pl. azonosító) */
  createOnly?: boolean;
  min?: number;
  max?: number;
}

export interface EntityDef {
  entity: CatalogEntity;
  title: string;
  singular: string;
  key: string;
  idPrefix?: string;
  columns: string[];
  fields: FieldDef[];
  help?: string;
}

export const ENTITIES: Record<string, EntityDef> = {
  artists: {
    entity: "artists",
    title: "Előadók és hangok",
    singular: "előadó",
    key: "id",
    idPrefix: "art_",
    columns: ["name", "kind", "availability", "surchargeHuf", "active"],
    help: "Az előadói felár a csomag árán felül számolódik. Ismert előadó csak aláírt licenccel és hangmodell-azonosítóval lehet „elérhető”; addig „hamarosan” – a neve ilyenkor sehol nem jelenik meg.",
    fields: [
      { name: "name", label: "Név", type: "text", required: true },
      { name: "slug", label: "URL-azonosító (slug)", type: "text", required: true, help: "pl. barsony-dani → /eloadok/barsony-dani" },
      { name: "kind", label: "Típus", type: "select", options: "kinds", required: true },
      { name: "availability", label: "Elérhetőség", type: "select", options: "availability", required: true },
      { name: "surchargeHuf", label: "Előadói felár (Ft)", type: "number", min: 0, required: true },
      { name: "tagline", label: "Szlogen", type: "text" },
      { name: "bio", label: "Bemutatkozás", type: "textarea" },
      { name: "styles", label: "Stílusok", type: "multiselect", options: "styles" },
      { name: "voiceModelId", label: "Hangmodell-azonosító", type: "text", help: "A zene-API-nál regisztrált, licencelt hangmodell" },
      { name: "licenseSignedAt", label: "Licenc / hozzájárulás aláírva", type: "date" },
      { name: "royaltyPercent", label: "Jogdíj (%)", type: "number", min: 0, max: 100 },
      { name: "requiresApproval", label: "Előadói jóváhagyás kell a szövegre", type: "bool" },
      { name: "photos", label: "Fotó URL-ek (soronként)", type: "lines" },
      { name: "accentHue", label: "Kiemelő szín (0–360)", type: "number", min: 0, max: 360 },
      { name: "sortOrder", label: "Sorrend", type: "number" },
      { name: "active", label: "Aktív", type: "bool" },
    ],
  },
  packages: {
    entity: "packages",
    title: "Csomagok és árak",
    singular: "csomag",
    key: "id",
    columns: ["name", "deliveryLabel", "priceHuf", "active"],
    fields: [
      { name: "id", label: "Azonosító", type: "text", required: true, createOnly: true, help: "pl. holnapra" },
      { name: "name", label: "Név", type: "text", required: true },
      { name: "priceHuf", label: "Ár (Ft)", type: "number", min: 0, required: true },
      { name: "deliveryLabel", label: "Átfutás (szöveg)", type: "text", required: true },
      { name: "deliveryHours", label: "Átfutás (óra, határidőhöz)", type: "number", min: 1, required: true },
      { name: "description", label: "Leírás", type: "textarea" },
      { name: "highlight", label: "Kiemelt („Legnépszerűbb”)", type: "bool" },
      { name: "sortOrder", label: "Sorrend", type: "number" },
      { name: "active", label: "Aktív", type: "bool" },
    ],
  },
  extras: {
    entity: "extras",
    title: "Extrák",
    singular: "extra",
    key: "id",
    columns: ["name", "priceHuf", "kind", "active"],
    fields: [
      { name: "id", label: "Azonosító", type: "text", required: true, createOnly: true },
      { name: "name", label: "Név", type: "text", required: true },
      { name: "priceHuf", label: "Ár (Ft)", type: "number", min: 0, required: true },
      { name: "kind", label: "Típus", type: "select", options: "extraKinds", required: true },
      { name: "description", label: "Leírás", type: "textarea" },
      { name: "sortOrder", label: "Sorrend", type: "number" },
      { name: "active", label: "Aktív", type: "bool" },
    ],
  },
  coupons: {
    entity: "coupons",
    title: "Kuponok",
    singular: "kupon",
    key: "code",
    columns: ["code", "percentOff", "amountOffHuf", "validUntil", "active"],
    fields: [
      { name: "code", label: "Kód", type: "text", required: true, createOnly: true },
      { name: "percentOff", label: "Kedvezmény (%)", type: "number", min: 0, max: 100 },
      { name: "amountOffHuf", label: "Kedvezmény (Ft)", type: "number", min: 0 },
      { name: "validUntil", label: "Érvényes eddig", type: "date" },
      { name: "active", label: "Aktív", type: "bool" },
    ],
  },
  reviews: {
    entity: "reviews",
    title: "Vélemények",
    singular: "vélemény",
    key: "id",
    idPrefix: "rev_",
    columns: ["authorName", "rating", "occasionId", "verified", "published"],
    help: "Csak valódi, ellenőrzött vásárlói vélemény jelenhet meg nyilvánosan.",
    fields: [
      { name: "authorName", label: "Név", type: "text", required: true },
      { name: "location", label: "Település", type: "text" },
      { name: "rating", label: "Értékelés (1–5)", type: "number", min: 1, max: 5, required: true },
      { name: "text", label: "Szöveg", type: "textarea", required: true },
      { name: "occasionId", label: "Alkalom", type: "select", options: "occasions" },
      { name: "artistId", label: "Előadó", type: "select", options: "artists" },
      { name: "createdAt", label: "Dátum", type: "date" },
      { name: "verified", label: "Ellenőrzött vásárlás", type: "bool" },
      { name: "published", label: "Közzétéve", type: "bool" },
    ],
  },
  samples: {
    entity: "samples",
    title: "Mintadalok (weboldal)",
    singular: "mintadal",
    key: "id",
    idPrefix: "smp_",
    columns: ["title", "artistId", "occasionId", "featured"],
    help: "A weboldalon meghallgatható mintadalok. Hangfájl feltöltése nélkül generált helykitöltő szól.",
    fields: [
      { name: "title", label: "Cím", type: "text", required: true },
      { name: "artistId", label: "Előadó", type: "select", options: "artists", required: true },
      { name: "occasionId", label: "Alkalom", type: "select", options: "occasions", required: true },
      { name: "styleId", label: "Stílus", type: "select", options: "styles", required: true },
      { name: "tempo", label: "Tempó", type: "select", options: "tempos", required: true },
      { name: "audioUrl", label: "Hangfájl", type: "audio" },
      { name: "durationSec", label: "Hossz (mp)", type: "number", min: 1 },
      { name: "blurb", label: "Rövid leírás", type: "text" },
      { name: "featured", label: "Kiemelt (főoldali lejátszó)", type: "bool" },
    ],
  },
  faqs: {
    entity: "faqs",
    title: "GYIK",
    singular: "kérdés",
    key: "id",
    idPrefix: "faq_",
    columns: ["question", "sortOrder"],
    fields: [
      { name: "question", label: "Kérdés", type: "text", required: true },
      { name: "answer", label: "Válasz", type: "textarea", required: true },
      { name: "sortOrder", label: "Sorrend", type: "number" },
    ],
  },
};

export const STATIC_OPTIONS: Record<string, { value: string; label: string }[]> = {
  tempos: [
    { value: "lassu", label: "Lassú" },
    { value: "kozepes", label: "Közepes" },
    { value: "porgos", label: "Pörgős" },
  ],
  kinds: [
    { value: "house", label: "Saját hang" },
    { value: "celebrity", label: "Ismert előadó (licenc)" },
  ],
  availability: [
    { value: "available", label: "Elérhető" },
    { value: "coming_soon", label: "Hamarosan / egyeztetés alatt" },
  ],
  extraKinds: [
    { value: "addon", label: "Fizetős extra" },
    { value: "lead", label: "Érdeklődés (ingyenes)" },
  ],
};

/** Bejövő sor típushelyes átalakítása és ellenőrzése. */
export function coerceRow(def: EntityDef, input: Record<string, unknown>, isNew: boolean): { row: Record<string, unknown>; errors: Record<string, string> } {
  const row: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    if (f.createOnly && !isNew) continue;
    const v = input[f.name];
    switch (f.type) {
      case "number": {
        if (v === "" || v == null) { row[f.name] = f.required ? undefined : null; break; }
        const n = Number(v);
        if (!Number.isFinite(n)) errors[f.name] = "Számot adj meg";
        else if (f.min != null && n < f.min) errors[f.name] = `Legalább ${f.min}`;
        else if (f.max != null && n > f.max) errors[f.name] = `Legfeljebb ${f.max}`;
        else row[f.name] = n;
        break;
      }
      case "bool": row[f.name] = v === true || v === "true" || v === "on"; break;
      case "multiselect": row[f.name] = Array.isArray(v) ? v.map(String) : []; break;
      case "lines": row[f.name] = String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean); break;
      case "date": row[f.name] = v ? String(v).slice(0, 10) : null; break;
      default: row[f.name] = String(v ?? "").trim();
    }
    if (f.required && (row[f.name] === "" || row[f.name] == null)) errors[f.name] = "Kötelező mező";
  }
  if (def.entity === "artists") {
    if (row.availability === "available" && (!row.licenseSignedAt || !row.voiceModelId)) {
      errors.availability = "Elérhető csak aláírt licenccel/hozzájárulással és hangmodell-azonosítóval lehet";
    }
    if (row.slug && !/^[a-z0-9-]+$/.test(String(row.slug))) errors.slug = "Csak kisbetű, szám és kötőjel";
  }
  if (def.entity === "coupons" && row.code) row.code = String(row.code).toUpperCase();
  return { row, errors };
}
