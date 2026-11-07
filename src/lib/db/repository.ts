// Adattár-absztrakció. A mock implementáció egy JSON fájlba ment (DATA_DIR/db.json),
// a Supabase implementáció ugyanezt az interfészt fogja megvalósítani (lásd supabase/migrations).

import type {
  Artist,
  Coupon,
  Draft,
  EmailMessage,
  Extra,
  Faq,
  Lead,
  Occasion,
  Order,
  Package,
  Review,
  SampleSong,
  SiteStats,
  Style,
  WaitlistEntry,
  Settings,
  SupportTicket,
  TrainingSample,
  TrainingJob,
  Preview,
  CatalogEntity,
} from "../types";

export interface Repository {
  /** Rendelhető előadók (elérhető + aláírt licenc/hozzájárulás). */
  listArtists(opts?: { includeInactive?: boolean }): Promise<Artist[]>;
  /** Megjelenített, de még nem rendelhető ("hamarosan") előadók. */
  listComingSoonArtists(): Promise<Artist[]>;
  getArtistById(id: string): Promise<Artist | null>;
  getArtistBySlug(slug: string): Promise<Artist | null>;

  listOccasions(): Promise<Occasion[]>;
  listStyles(): Promise<Style[]>;
  listSamples(opts?: { artistId?: string }): Promise<SampleSong[]>;
  getSample(id: string): Promise<SampleSong | null>;
  listReviews(opts?: { artistId?: string; limit?: number }): Promise<Review[]>;
  listPackages(): Promise<Package[]>;
  listExtras(): Promise<Extra[]>;
  listFaqs(): Promise<Faq[]>;
  getCoupon(code: string): Promise<Coupon | null>;
  getStats(): Promise<SiteStats>;

  createDraft(draft: Draft): Promise<Draft>;
  getDraft(id: string): Promise<Draft | null>;
  updateDraft(id: string, patch: Pick<Draft, "data" | "step">): Promise<Draft | null>;

  createOrder(order: Order): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  getOrderByCode(code: string): Promise<Order | null>;
  getOrderBySongToken(token: string): Promise<Order | null>;
  updateOrder(id: string, mutate: (o: Order) => Order): Promise<Order | null>;
  listOrders(): Promise<Order[]>;

  createLead(lead: Lead): Promise<Lead>;
  addToWaitlist(entry: WaitlistEntry): Promise<{ created: boolean }>;
  saveEmail(msg: EmailMessage): Promise<void>;
  listEmails(limit?: number): Promise<EmailMessage[]>;

  // --- beállítások
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  // --- szupport
  createTicket(t: SupportTicket): Promise<SupportTicket>;
  getTicket(id: string): Promise<SupportTicket | null>;
  updateTicket(id: string, mutate: (t: SupportTicket) => SupportTicket): Promise<SupportTicket | null>;
  listTickets(opts?: { status?: SupportTicket["status"]; orderId?: string }): Promise<SupportTicket[]>;
  findOrdersByEmail(email: string): Promise<Order[]>;

  // --- tanító zeneminták és tanítási feladatok
  createTrainingSample(s: TrainingSample): Promise<TrainingSample>;
  updateTrainingSample(id: string, patch: Partial<TrainingSample>): Promise<TrainingSample | null>;
  deleteTrainingSample(id: string): Promise<void>;
  listTrainingSamples(): Promise<TrainingSample[]>;
  createTrainingJob(j: TrainingJob): Promise<TrainingJob>;
  updateTrainingJob(id: string, patch: Partial<TrainingJob>): Promise<TrainingJob | null>;
  listTrainingJobs(): Promise<TrainingJob[]>;

  // --- előnézetek (hirdetési one-pager)
  createPreview(p: Preview): Promise<Preview>;
  getPreview(id: string): Promise<Preview | null>;
  updatePreview(id: string, patch: Partial<Preview>): Promise<Preview | null>;
  countPreviewsSince(ipHash: string, sinceIso: string): Promise<number>;
  listPreviews(sinceIso?: string): Promise<Preview[]>;

  // --- admin: katalógus generikus CRUD + listák
  adminList(entity: CatalogEntity): Promise<Record<string, unknown>[]>;
  adminUpsert(entity: CatalogEntity, row: Record<string, unknown>): Promise<Record<string, unknown>>;
  adminDelete(entity: CatalogEntity, id: string): Promise<void>;
  listDrafts(sinceIso?: string): Promise<Draft[]>;
  listLeads(): Promise<Lead[]>;
  listWaitlist(): Promise<WaitlistEntry[]>;
}
