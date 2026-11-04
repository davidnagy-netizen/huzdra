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
} from "../types";

export interface Repository {
  listArtists(opts?: { includeInactive?: boolean }): Promise<Artist[]>;
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
  saveEmail(msg: EmailMessage): Promise<void>;
}
