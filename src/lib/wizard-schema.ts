// Lépésenkénti validáció a rendelési varázslóhoz – kliensen és szerveren is ez fut.
import type { WizardData } from "./types";

export const WIZARD_STEPS = [
  { key: "eloado", title: "Előadó", short: "Előadó" },
  { key: "alkalom", title: "Alkalom", short: "Alkalom" },
  { key: "stilus", title: "Stílus és tempó", short: "Stílus" },
  { key: "kinek", title: "Kinek szól?", short: "Kinek" },
  { key: "tortenet", title: "A történet", short: "Történet" },
  { key: "csomag", title: "Csomag és fizetés", short: "Fizetés" },
] as const;

export const LIMITS = {
  recipientName: 60,
  nickname: 40,
  pronunciation: 120,
  memories: 1200,
  jokes: 600,
  familyNames: 300,
  favoriteSaying: 200,
  town: 60,
  avoid: 400,
  occasionOther: 80,
  relationOther: 60,
  liveEventNote: 400,
} as const;

export const RELATIONS = [
  "feleség", "férj", "menyasszony", "vőlegény", "anya", "apa", "nagymama", "nagypapa",
  "keresztlány", "keresztfiú", "lány", "fiú", "testvér", "sógor", "sógornő", "barát", "barátnő",
  "komák / haverok", "kolléga", "egyéb",
] as const;

export const EMPTY_WIZARD: WizardData = {
  artistId: "",
  occasionId: "",
  occasionOther: "",
  tempo: "",
  mood: "",
  styleId: "",
  violin: false,
  cimbalom: false,
  recipientName: "",
  nickname: "",
  pronunciation: "",
  relation: "",
  relationOther: "",
  ageOrYears: "",
  memories: "",
  jokes: "",
  familyNames: "",
  favoriteSaying: "",
  town: "",
  avoid: "",
  packageId: "",
  extras: [],
  email: "",
  phone: "",
  billingName: "",
  billingZip: "",
  billingCity: "",
  billingAddress: "",
  billingTaxNumber: "",
  coupon: "",
  liveEventDate: "",
  liveEventLocation: "",
  liveEventNote: "",
  consentTerms: false,
  consentPrivacy: false,
  consentMarketing: false,
};

export type StepErrors = Partial<Record<keyof WizardData, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+36|06)?[\s-]?\(?\d{1,2}\)?[\s-]?\d{3}[\s-]?\d{3,4}$/;

function tooLong(errors: StepErrors, d: WizardData, key: keyof typeof LIMITS) {
  const v = d[key as keyof WizardData];
  if (typeof v === "string" && v.length > LIMITS[key]) {
    errors[key as keyof WizardData] = `Legfeljebb ${LIMITS[key]} karakter fér el.`;
  }
}

export function validateStep(step: number, d: WizardData, ctx?: { validArtistIds?: string[] }): StepErrors {
  const e: StepErrors = {};
  switch (step) {
    case 0:
      if (!d.artistId) e.artistId = "Válaszd ki, ki énekelje a dalt.";
      else if (ctx?.validArtistIds && !ctx.validArtistIds.includes(d.artistId)) e.artistId = "Ez az előadó most nem elérhető.";
      break;
    case 1:
      if (!d.occasionId) e.occasionId = "Milyen alkalomra készül a dal?";
      if (d.occasionId === "egyeb" && d.occasionOther.trim().length < 3) e.occasionOther = "Írd le pár szóban, milyen alkalom lesz.";
      tooLong(e, d, "occasionOther");
      break;
    case 2:
      if (!d.tempo) e.tempo = "Válassz tempót.";
      if (!d.mood) e.mood = "Milyen hangulatú legyen a dal?";
      break;
    case 3:
      if (d.recipientName.trim().length < 2) e.recipientName = "Kinek szól a dal? Add meg a nevét.";
      if (!d.relation) e.relation = "Milyen kapcsolatban vagytok?";
      if (d.relation === "egyéb" && d.relationOther.trim().length < 2) e.relationOther = "Írd le, ki ő neked.";
      if (d.ageOrYears && !/^\d{1,3}$/.test(d.ageOrYears.trim())) e.ageOrYears = "Csak számot írj (pl. 50).";
      tooLong(e, d, "recipientName");
      tooLong(e, d, "nickname");
      tooLong(e, d, "pronunciation");
      tooLong(e, d, "relationOther");
      break;
    case 4:
      if (d.memories.trim().length < 40) e.memories = "Mesélj egy kicsit többet (legalább 40 karakter) – ebből lesz a dal lelke.";
      (["memories", "jokes", "familyNames", "favoriteSaying", "town", "avoid"] as const).forEach((k) => tooLong(e, d, k));
      break;
    case 5:
      if (!d.packageId) e.packageId = "Válassz csomagot.";
      if (!EMAIL_RE.test(d.email.trim())) e.email = "Ide küldjük a dalt – adj meg egy érvényes e-mail-címet.";
      if (d.phone && !PHONE_RE.test(d.phone.trim())) e.phone = "Ellenőrizd a telefonszámot (pl. +36 30 123 4567).";
      if (d.billingName.trim().length < 2) e.billingName = "Számlázási név szükséges.";
      if (!/^\d{4}$/.test(d.billingZip.trim())) e.billingZip = "4 jegyű irányítószám.";
      if (d.billingCity.trim().length < 2) e.billingCity = "Település szükséges.";
      if (d.billingAddress.trim().length < 3) e.billingAddress = "Utca, házszám szükséges.";
      if (d.billingTaxNumber && !/^\d{8}-?\d-?\d{2}$/.test(d.billingTaxNumber.trim())) e.billingTaxNumber = "Adószám formátuma: 12345678-1-23.";
      if (d.extras.includes("elo-eloadas")) {
        if (!d.liveEventDate) e.liveEventDate = "Mikor lesz a rendezvény?";
        if (d.liveEventLocation.trim().length < 2) e.liveEventLocation = "Hol lesz a rendezvény?";
        if (!d.phone) e.phone = "Élő fellépés egyeztetéséhez telefonszám kell.";
      }
      if (!d.consentTerms) e.consentTerms = "Az ÁSZF elfogadása kötelező.";
      if (!d.consentPrivacy) e.consentPrivacy = "Az adatkezeléshez való hozzájárulás kötelező.";
      tooLong(e, d, "liveEventNote");
      break;
  }
  return e;
}

export function validateAll(d: WizardData, ctx?: { validArtistIds?: string[] }): { step: number; errors: StepErrors } | null {
  for (let i = 0; i < WIZARD_STEPS.length; i++) {
    const errors = validateStep(i, d, ctx);
    if (Object.keys(errors).length) return { step: i, errors };
  }
  return null;
}

/** Ismeretlen bemenetből biztonságos WizardData-t készít (csak ismert kulcsok, helyes típusok). */
export function sanitizeWizard(input: unknown): WizardData {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: WizardData = { ...EMPTY_WIZARD };
  for (const key of Object.keys(EMPTY_WIZARD) as (keyof WizardData)[]) {
    const def = EMPTY_WIZARD[key];
    const v = src[key];
    if (typeof def === "string" && typeof v === "string") (out as unknown as Record<string, unknown>)[key] = v.slice(0, 2000);
    else if (typeof def === "boolean" && typeof v === "boolean") (out as unknown as Record<string, unknown>)[key] = v;
    else if (Array.isArray(def) && Array.isArray(v)) (out as unknown as Record<string, unknown>)[key] = v.filter((x) => typeof x === "string").slice(0, 10);
  }
  return out;
}
