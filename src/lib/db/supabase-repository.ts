import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as seed from "../data/seed";
import { getSupabaseAdmin } from "../supabase";
import type {
  Artist,
  CatalogEntity,
  Coupon,
  Draft,
  EmailMessage,
  Extra,
  Faq,
  Lead,
  Occasion,
  Order,
  Package,
  Preview,
  Review,
  SampleSong,
  Settings,
  Style,
  SupportTicket,
  TrainingJob,
  TrainingSample,
  WaitlistEntry,
} from "../types";
import { ORDER_DERIVED, TABLES, fromRow, orderToRow, toRow } from "./mapping";
import type { Repository } from "./repository";

type Row = Record<string, unknown>;

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Adatbázis-hiba (${what}): ${res.error.message}`);
  return res.data;
}

/** Supabase (Postgres) adattár – ugyanazt az interfészt valósítja meg, mint a mock. */
export class SupabaseRepository implements Repository {
  private get db(): SupabaseClient {
    return getSupabaseAdmin();
  }

  private async all<T>(table: string, order?: { col: string; asc?: boolean }): Promise<T[]> {
    let q = this.db.from(table).select("*");
    if (order) q = q.order(order.col, { ascending: order.asc ?? true });
    const rows = check(await q, table) as Row[];
    return rows.map((r) => fromRow<T>(r));
  }
  private async one<T>(table: string, col: string, val: string, drop: string[] = []): Promise<T | null> {
    const r = check(await this.db.from(table).select("*").eq(col, val).maybeSingle(), table) as Row | null;
    return r ? fromRow<T>(r, drop) : null;
  }
  private async insert(table: string, row: Row) {
    check(await this.db.from(table).insert(row), table);
  }

  // ---------------------------------------------------------------- katalógus
  async listArtists(opts?: { includeInactive?: boolean }) {
    const list = await this.all<Artist>(TABLES.artists, { col: "sort_order" });
    return list.filter((a) => opts?.includeInactive || (a.active && a.availability === "available" && a.licenseSignedAt && a.voiceModelId));
  }
  async listComingSoonArtists() {
    return (await this.all<Artist>(TABLES.artists, { col: "sort_order" })).filter((a) => a.active && a.availability === "coming_soon");
  }
  async getArtistById(id: string) {
    return this.one<Artist>(TABLES.artists, "id", id);
  }
  async getArtistBySlug(slug: string) {
    const a = await this.one<Artist>(TABLES.artists, "slug", slug);
    return a && a.active && a.availability === "available" ? a : null;
  }
  async listOccasions() {
    return this.all<Occasion>(TABLES.occasions, { col: "sort_order" });
  }
  async listStyles() {
    return this.all<Style>(TABLES.styles, { col: "sort_order" });
  }
  async listSamples(opts?: { artistId?: string }) {
    const active = new Set((await this.listArtists()).map((a) => a.id));
    return (await this.all<SampleSong>(TABLES.samples)).filter((s) => active.has(s.artistId) && (!opts?.artistId || s.artistId === opts.artistId));
  }
  async getSample(id: string) {
    return this.one<SampleSong>(TABLES.samples, "id", id);
  }
  async listReviews(opts?: { artistId?: string; limit?: number }) {
    let q = this.db.from(TABLES.reviews).select("*").eq("published", true).order("created_at", { ascending: false });
    if (opts?.artistId) q = q.eq("artist_id", opts.artistId);
    if (opts?.limit) q = q.limit(opts.limit);
    return (check(await q, "reviews") as Row[]).map((r) => fromRow<Review>(r));
  }
  async listPackages() {
    return (await this.all<Package>(TABLES.packages, { col: "sort_order" })).filter((p) => p.active);
  }
  async listExtras() {
    return (await this.all<Extra>(TABLES.extras, { col: "sort_order" })).filter((e) => e.active);
  }
  async listFaqs() {
    return this.all<Faq>(TABLES.faqs, { col: "sort_order" });
  }
  async getCoupon(code: string) {
    const c = await this.one<Coupon>(TABLES.coupons, "code", code.trim().toUpperCase());
    if (!c || !c.active) return null;
    if (c.validUntil && new Date(c.validUntil) < new Date()) return null;
    return { ...c, percentOff: c.percentOff ?? undefined, amountOffHuf: c.amountOffHuf ?? undefined };
  }
  async getStats() {
    const [reviews, delivered, settings] = await Promise.all([
      this.db.from(TABLES.reviews).select("rating").eq("published", true),
      this.db.from(TABLES.orders).select("id", { count: "exact", head: true }).in("status", ["delivered", "done"]),
      this.getSettings(),
    ]);
    const ratings = (check(reviews, "reviews") as { rating: number }[]).map((r) => r.rating);
    const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    return { happyFamilies: settings.happyFamiliesBaseline + (delivered.count ?? 0), averageRating: Math.round(avg * 10) / 10, reviewCount: ratings.length };
  }

  // ---------------------------------------------------------------- piszkozatok
  async createDraft(d: Draft) {
    await this.insert(TABLES.drafts, toRow(d));
    return d;
  }
  async getDraft(id: string) {
    return this.one<Draft>(TABLES.drafts, "id", id);
  }
  async updateDraft(id: string, patch: Pick<Draft, "data" | "step">) {
    const r = check(await this.db.from(TABLES.drafts).update({ data: patch.data, step: patch.step, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle(), "drafts") as Row | null;
    return r ? fromRow<Draft>(r) : null;
  }

  // ---------------------------------------------------------------- rendelések
  async createOrder(o: Order) {
    await this.insert(TABLES.orders, orderToRow({ ...o, version: o.version ?? 1 }));
    return o;
  }
  async getOrder(id: string) {
    return this.one<Order>(TABLES.orders, "id", id, ORDER_DERIVED);
  }
  async getOrderByCode(code: string) {
    return this.one<Order>(TABLES.orders, "code", code.trim().toUpperCase(), ORDER_DERIVED);
  }
  async getOrderBySongToken(token: string) {
    return this.one<Order>(TABLES.orders, "song_token", token, ORDER_DERIVED);
  }
  /** Optimista zárolás: csak akkor ír, ha közben senki más nem módosította (version). */
  async updateOrder(id: string, mutate: (o: Order) => Order) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const cur = await this.getOrder(id);
      if (!cur) return null;
      const v = cur.version ?? 1;
      const next = { ...mutate(structuredClone(cur)), version: v + 1, updatedAt: new Date().toISOString() };
      const res = await this.db.from(TABLES.orders).update(orderToRow(next)).eq("id", id).eq("version", v).select("id");
      if ((check(res, "orders") ?? []).length === 1) return next;
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
    throw new Error(`Rendelés frissítése ütközés miatt sikertelen: ${id}`);
  }
  async listOrders() {
    const rows = check(await this.db.from(TABLES.orders).select("*").order("created_at", { ascending: false }).limit(5000), "orders") as Row[];
    return rows.map((r) => fromRow<Order>(r, ORDER_DERIVED));
  }
  async findOrdersByEmail(email: string) {
    const rows = check(await this.db.from(TABLES.orders).select("*").eq("email", email.trim().toLowerCase()).order("created_at", { ascending: false }), "orders") as Row[];
    return rows.map((r) => fromRow<Order>(r, ORDER_DERIVED));
  }

  async createLead(l: Lead) {
    await this.insert(TABLES.leads, toRow(l));
    return l;
  }
  async addToWaitlist(e: WaitlistEntry) {
    const res = await this.db.from(TABLES.waitlist).upsert(toRow({ ...e, email: e.email.trim().toLowerCase() }), { onConflict: "artist_id,email", ignoreDuplicates: true }).select("id");
    return { created: (check(res, "waitlist") ?? []).length > 0 };
  }
  async saveEmail(m: EmailMessage) {
    await this.insert(TABLES.emails, toRow(m));
  }
  async listEmails(limit = 50) {
    const rows = check(await this.db.from(TABLES.emails).select("id,to,subject,created_at").order("created_at", { ascending: false }).limit(limit), "emails") as Row[];
    return rows.map((r) => ({ ...fromRow<EmailMessage>(r), html: "" }));
  }

  // ---------------------------------------------------------------- beállítások
  async getSettings(): Promise<Settings> {
    const r = check(await this.db.from("settings").select("data").eq("id", 1).maybeSingle(), "settings") as { data: Partial<Settings> } | null;
    return { ...seed.defaultSettings, ...(r?.data ?? {}) };
  }
  async updateSettings(patch: Partial<Settings>) {
    const next = { ...(await this.getSettings()), ...patch };
    check(await this.db.from("settings").upsert({ id: 1, data: next }), "settings");
    return next;
  }

  // ---------------------------------------------------------------- szupport
  async createTicket(t: SupportTicket) {
    await this.insert(TABLES.tickets, toRow(t));
    return t;
  }
  async getTicket(id: string) {
    return this.one<SupportTicket>(TABLES.tickets, "id", id);
  }
  async updateTicket(id: string, mutate: (t: SupportTicket) => SupportTicket) {
    const cur = await this.getTicket(id);
    if (!cur) return null;
    const next = { ...mutate(structuredClone(cur)), updatedAt: new Date().toISOString() };
    check(await this.db.from(TABLES.tickets).update(toRow(next)).eq("id", id), "tickets");
    return next;
  }
  async listTickets(opts?: { status?: SupportTicket["status"]; orderId?: string }) {
    let q = this.db.from(TABLES.tickets).select("*").order("created_at", { ascending: false }).limit(2000);
    if (opts?.status) q = q.eq("status", opts.status);
    if (opts?.orderId) q = q.eq("order_id", opts.orderId);
    return (check(await q, "tickets") as Row[]).map((r) => fromRow<SupportTicket>(r));
  }

  // ---------------------------------------------------------------- tanítás
  async createTrainingSample(s: TrainingSample) {
    await this.insert(TABLES.trainingSamples, toRow(s));
    return s;
  }
  async updateTrainingSample(id: string, patch: Partial<TrainingSample>) {
    const r = check(await this.db.from(TABLES.trainingSamples).update(toRow(patch)).eq("id", id).select().maybeSingle(), "training_samples") as Row | null;
    return r ? fromRow<TrainingSample>(r) : null;
  }
  async deleteTrainingSample(id: string) {
    check(await this.db.from(TABLES.trainingSamples).delete().eq("id", id), "training_samples");
  }
  async listTrainingSamples() {
    return this.all<TrainingSample>(TABLES.trainingSamples, { col: "uploaded_at", asc: false });
  }
  async createTrainingJob(j: TrainingJob) {
    await this.insert(TABLES.trainingJobs, toRow(j));
    return j;
  }
  async updateTrainingJob(id: string, patch: Partial<TrainingJob>) {
    const r = check(await this.db.from(TABLES.trainingJobs).update(toRow({ ...patch, updatedAt: new Date().toISOString() })).eq("id", id).select().maybeSingle(), "training_jobs") as Row | null;
    return r ? fromRow<TrainingJob>(r) : null;
  }
  async listTrainingJobs() {
    return this.all<TrainingJob>(TABLES.trainingJobs, { col: "created_at", asc: false });
  }

  // ---------------------------------------------------------------- előnézetek
  async createPreview(p: Preview) {
    await this.insert(TABLES.previews, toRow(p));
    return p;
  }
  async getPreview(id: string) {
    return this.one<Preview>(TABLES.previews, "id", id);
  }
  async updatePreview(id: string, patch: Partial<Preview>) {
    const r = check(await this.db.from(TABLES.previews).update(toRow(patch)).eq("id", id).select().maybeSingle(), "previews") as Row | null;
    return r ? fromRow<Preview>(r) : null;
  }
  async countPreviewsSince(ipHash: string, sinceIso: string) {
    const r = await this.db.from(TABLES.previews).select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", sinceIso);
    return r.count ?? 0;
  }
  async listPreviews(sinceIso?: string) {
    let q = this.db.from(TABLES.previews).select("id,status,order_id,created_at,data,ip_hash,token,moderation");
    if (sinceIso) q = q.gte("created_at", sinceIso);
    return (check(await q, "previews") as Row[]).map((r) => fromRow<Preview>(r));
  }

  // ---------------------------------------------------------------- admin CRUD
  private keyOf(entity: CatalogEntity) {
    return entity === "coupons" ? "code" : "id";
  }
  async adminList(entity: CatalogEntity) {
    return this.all<Row>(TABLES[entity]);
  }
  async adminUpsert(entity: CatalogEntity, row: Row) {
    const r = check(await this.db.from(TABLES[entity]).upsert(toRow(row), { onConflict: this.keyOf(entity) }).select().single(), entity) as Row;
    return fromRow<Row>(r);
  }
  async adminDelete(entity: CatalogEntity, id: string) {
    check(await this.db.from(TABLES[entity]).delete().eq(this.keyOf(entity), id), entity);
  }
  async listDrafts(sinceIso?: string) {
    let q = this.db.from(TABLES.drafts).select("id,step,created_at,updated_at");
    if (sinceIso) q = q.gte("created_at", sinceIso);
    return (check(await q, "drafts") as Row[]).map((r) => ({ ...fromRow<Draft>(r), data: {} }));
  }
  async listLeads() {
    return this.all<Lead>(TABLES.leads, { col: "created_at", asc: false });
  }
  async listWaitlist() {
    return this.all<WaitlistEntry>(TABLES.waitlist, { col: "created_at", asc: false });
  }
}
