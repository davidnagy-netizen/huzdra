import fs from "node:fs";
import path from "node:path";
import * as seed from "../data/seed";
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
  Style,
} from "../types";
import type { Repository } from "./repository";

interface DbShape {
  version: number;
  artists: Artist[];
  occasions: Occasion[];
  styles: Style[];
  samples: SampleSong[];
  reviews: Review[];
  packages: Package[];
  extras: Extra[];
  coupons: Coupon[];
  faqs: Faq[];
  drafts: Draft[];
  orders: Order[];
  leads: Lead[];
  outbox: EmailMessage[];
  settings: { happyFamiliesBaseline: number };
}

const DB_VERSION = 1;

function seedDb(): DbShape {
  return {
    version: DB_VERSION,
    artists: structuredClone(seed.artists),
    occasions: structuredClone(seed.occasions),
    styles: structuredClone(seed.styles),
    samples: structuredClone(seed.sampleSongs),
    reviews: structuredClone(seed.reviews),
    packages: structuredClone(seed.packages),
    extras: structuredClone(seed.extras),
    coupons: structuredClone(seed.coupons),
    faqs: structuredClone(seed.faqs),
    drafts: [],
    orders: [],
    leads: [],
    outbox: [],
    settings: { happyFamiliesBaseline: seed.demoHappyFamilies },
  };
}

/**
 * Egyszerű, fájl alapú mock adatbázis fejlesztéshez és demóhoz.
 * Nem production-ready (nincs zárolás, egy folyamatra tervezve).
 */
export class MockRepository implements Repository {
  private db: DbShape;
  private file: string | null;

  constructor(dataDir: string | null) {
    this.file = dataDir ? path.join(dataDir, "db.json") : null;
    this.db = this.load();
  }

  private load(): DbShape {
    if (!this.file) return seedDb();
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as DbShape;
      if (raw.version === DB_VERSION) return raw;
    } catch {
      /* első indulás vagy sérült fájl → újraseedelés */
    }
    const fresh = seedDb();
    this.persist(fresh);
    return fresh;
  }

  private persist(db: DbShape = this.db) {
    if (!this.file) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.warn("[mock-db] nem sikerült menteni:", err);
    }
  }

  async listArtists(opts?: { includeInactive?: boolean }) {
    return this.db.artists
      .filter((a) => opts?.includeInactive || (a.active && a.licenseSignedAt))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async getArtistById(id: string) {
    return this.db.artists.find((a) => a.id === id) ?? null;
  }
  async getArtistBySlug(slug: string) {
    return this.db.artists.find((a) => a.slug === slug && a.active) ?? null;
  }
  async listOccasions() {
    return [...this.db.occasions].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async listStyles() {
    return [...this.db.styles].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async listSamples(opts?: { artistId?: string }) {
    const activeIds = new Set((await this.listArtists()).map((a) => a.id));
    return this.db.samples.filter(
      (s) => activeIds.has(s.artistId) && (!opts?.artistId || s.artistId === opts.artistId),
    );
  }
  async getSample(id: string) {
    return this.db.samples.find((s) => s.id === id) ?? null;
  }
  async listReviews(opts?: { artistId?: string; limit?: number }) {
    const list = this.db.reviews
      .filter((r) => r.published && (!opts?.artistId || r.artistId === opts.artistId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return opts?.limit ? list.slice(0, opts.limit) : list;
  }
  async listPackages() {
    return this.db.packages.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async listExtras() {
    return this.db.extras.filter((e) => e.active).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async listFaqs() {
    return [...this.db.faqs].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async getCoupon(code: string) {
    const c = this.db.coupons.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
    if (!c || !c.active) return null;
    if (c.validUntil && new Date(c.validUntil) < new Date()) return null;
    return c;
  }
  async getStats() {
    const published = this.db.reviews.filter((r) => r.published);
    const delivered = this.db.orders.filter((o) => ["delivered", "done"].includes(o.status)).length;
    const avg = published.length
      ? published.reduce((s, r) => s + r.rating, 0) / published.length
      : 0;
    return {
      happyFamilies: this.db.settings.happyFamiliesBaseline + delivered,
      averageRating: Math.round(avg * 10) / 10,
      reviewCount: published.length,
    };
  }

  async createDraft(draft: Draft) {
    this.db.drafts.push(draft);
    this.persist();
    return draft;
  }
  async getDraft(id: string) {
    return this.db.drafts.find((d) => d.id === id) ?? null;
  }
  async updateDraft(id: string, patch: Pick<Draft, "data" | "step">) {
    const d = this.db.drafts.find((x) => x.id === id);
    if (!d) return null;
    d.data = patch.data;
    d.step = patch.step;
    d.updatedAt = new Date().toISOString();
    this.persist();
    return d;
  }

  async createOrder(order: Order) {
    this.db.orders.push(order);
    this.persist();
    return order;
  }
  async getOrder(id: string) {
    return this.db.orders.find((o) => o.id === id) ?? null;
  }
  async getOrderByCode(code: string) {
    return this.db.orders.find((o) => o.code === code.trim().toUpperCase()) ?? null;
  }
  async getOrderBySongToken(token: string) {
    return this.db.orders.find((o) => o.songToken === token) ?? null;
  }
  async updateOrder(id: string, mutate: (o: Order) => Order) {
    const idx = this.db.orders.findIndex((o) => o.id === id);
    if (idx < 0) return null;
    const next = mutate(structuredClone(this.db.orders[idx]));
    next.updatedAt = new Date().toISOString();
    this.db.orders[idx] = next;
    this.persist();
    return next;
  }
  async listOrders() {
    return [...this.db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createLead(lead: Lead) {
    this.db.leads.push(lead);
    this.persist();
    return lead;
  }
  async saveEmail(msg: EmailMessage) {
    this.db.outbox.push(msg);
    this.persist();
  }
}
