// Domain-típusok. A Supabase séma (supabase/migrations/0001_init.sql) ugyanezt a modellt követi.

export type OccasionId =
  | "lakodalom"
  | "eljegyzes"
  | "keresztelo"
  | "szuletesnap"
  | "nevnap"
  | "ballagas"
  | "evfordulo"
  | "hazassagi-evfordulo"
  | "anyak-napja"
  | "hazateres"
  | "karacsony"
  | "szilveszter"
  | "haveroknak"
  | "egyeb";

export type StyleId =
  | "lakodalmas-mulatos"
  | "porgos-csardas"
  | "roma-ballada"
  | "discos-mulatos"
  | "duett"
  | "nota-mix";

export type Tempo = "lassu" | "kozepes" | "porgos";
export type Mood = "vicces" | "meghato" | "unnepelyes";

export interface Occasion {
  id: OccasionId;
  label: string;
  emoji: string;
  sortOrder: number;
}

export interface Style {
  id: StyleId;
  label: string;
  description: string;
  sortOrder: number;
}

/** "celebrity": ismert előadó licencelt hangmodellje; "house": a Húzdrá! saját hangja */
export type ArtistKind = "celebrity" | "house";
/** "coming_soon": megjelenik az oldalon, de még nem rendelhető (pl. a licenc még nincs aláírva) */
export type ArtistAvailability = "available" | "coming_soon";

export interface Artist {
  id: string;
  kind: ArtistKind;
  availability: ArtistAvailability;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  /** Licencelt fotók URL-jei. Üres tömb esetén stilizált helykitöltő jelenik meg. */
  photos: string[];
  styles: StyleId[];
  /** A szolgáltatónál regisztrált, licencelt hangmodell azonosítója. */
  voiceModelId: string;
  surchargeHuf: number;
  royaltyPercent: number;
  /** Kell-e előadói/menedzseri jóváhagyás a dalszövegre. */
  requiresApproval: boolean;
  /** Hírességnél: írásos licencszerződés dátuma – enélkül nem lehet "available".
   *  Saját hangnál: a hangot adó énekes(ek) hozzájárulási/hangfelhasználási szerződésének dátuma. */
  licenseSignedAt: string | null;
  accentHue: number;
  active: boolean;
  sortOrder: number;
}

export interface SampleSong {
  id: string;
  artistId: string;
  title: string;
  occasionId: OccasionId;
  styleId: StyleId;
  tempo: Tempo;
  durationSec: number;
  /** Valódi mintadal URL-je; mock módban generált helykitöltő hang. */
  audioUrl: string;
  blurb: string;
  featured: boolean;
}

export interface Review {
  id: string;
  authorName: string;
  location: string;
  occasionId: OccasionId;
  artistId: string;
  rating: number;
  text: string;
  createdAt: string;
  verified: boolean;
  published: boolean;
}

export type PackageId = "meg-ma" | "holnapra" | "raeros";

export interface Package {
  id: PackageId;
  name: string;
  deliveryLabel: string;
  deliveryHours: number;
  priceHuf: number;
  description: string;
  highlight: boolean;
  sortOrder: number;
  active: boolean;
}

export type ExtraId = "videoklip" | "pdf" | "plusz-versszak" | "karaoke" | "elo-eloadas";

export interface Extra {
  id: ExtraId;
  name: string;
  description: string;
  priceHuf: number;
  /** "lead": nem termék, hanem érdeklődés továbbítása (pl. élő fellépés) */
  kind: "addon" | "lead";
  sortOrder: number;
  active: boolean;
}

export interface Coupon {
  code: string;
  percentOff?: number;
  amountOffHuf?: number;
  active: boolean;
  validUntil?: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface SiteStats {
  happyFamilies: number;
  averageRating: number;
  reviewCount: number;
}

// ---------------- Varázsló / rendelés ----------------

export interface WizardData {
  artistId: string;
  occasionId: OccasionId | "";
  occasionOther: string;
  tempo: Tempo | "";
  mood: Mood | "";
  styleId: StyleId | "";
  violin: boolean;
  cimbalom: boolean;
  recipientName: string;
  nickname: string;
  pronunciation: string;
  relation: string;
  relationOther: string;
  ageOrYears: string;
  memories: string;
  jokes: string;
  familyNames: string;
  favoriteSaying: string;
  town: string;
  avoid: string;
  packageId: PackageId | "";
  extras: ExtraId[];
  email: string;
  phone: string;
  billingName: string;
  billingZip: string;
  billingCity: string;
  billingAddress: string;
  billingTaxNumber: string;
  coupon: string;
  liveEventDate: string;
  liveEventLocation: string;
  liveEventNote: string;
  consentTerms: boolean;
  consentPrivacy: boolean;
  consentMarketing: boolean;
}

export interface Draft {
  id: string;
  data: Partial<WizardData>;
  step: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "draft"
  | "paid_authorized"
  | "moderation_hold"
  | "lyrics_ready"
  | "awaiting_artist_approval"
  | "audio_generating"
  | "qc"
  | "delivered"
  | "revision_requested"
  | "done"
  | "cancelled";

export interface PriceLine {
  label: string;
  amountHuf: number;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  discountHuf: number;
  totalHuf: number;
  couponApplied: string | null;
}

export interface ModerationFlag {
  category: "gyulolet" | "explicit" | "lejarato" | "politikai" | "reklam" | "egyeb";
  match: string;
  field?: string;
  severity: "review" | "block";
}

export interface ModerationResult {
  ok: boolean;
  flags: ModerationFlag[];
}

export interface OrderEvent {
  at: string;
  status: OrderStatus;
  note?: string;
  actor: "system" | "customer" | "admin" | "artist";
}

export interface Lyrics {
  title: string;
  text: string;
  version: number;
  generatedBy: string;
}

export interface Order {
  id: string;
  /** Rövid, ügyfélnek mutatott rendelésazonosító (pl. HZ-4F7K2Q) */
  code: string;
  /** Rendeléskövetés titkos kulcsa */
  statusKey: string;
  /** Dal-oldal tokenje (kézbesítési link) */
  songToken: string;
  status: OrderStatus;
  data: WizardData;
  price: PriceBreakdown;
  payment: { provider: string; intentId: string; state: "authorized" | "captured" | "cancelled" };
  moderation: ModerationResult;
  lyrics: Lyrics | null;
  audio: { url: string; watermarkId: string; generatedAt: string } | null;
  revisionsUsed: number;
  revisionNotes: string[];
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  /** GDPR: a személyes történetet eddig az időpontig őrizzük */
  storyRetentionUntil: string;
  events: OrderEvent[];
}

export interface Lead {
  id: string;
  orderId: string | null;
  artistId: string;
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  location: string;
  note: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  artistId: string;
  email: string;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  html: string;
  createdAt: string;
}
