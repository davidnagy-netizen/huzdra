import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin, isSupabase } from "../supabase";

/** Tárolók: tanító zeneminták, kész dalok, nyilvános mintadalok, előnézetek. Mind privát. */
export type Bucket = "training" | "songs" | "samples" | "previews";
export const BUCKETS: Bucket[] = ["training", "songs", "samples", "previews"];

export interface UploadTarget {
  /** Ide PUT-olja a böngésző a nyers fájlt (Content-Type fejléccel) */
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  path: string;
}

export interface StorageAdapter {
  readonly name: string;
  upload(bucket: Bucket, objectPath: string, data: Uint8Array, contentType: string): Promise<void>;
  /** Közvetlen böngészős feltöltés (nagy fájlokhoz – nem megy át a szerveren) */
  createUploadTarget(bucket: Bucket, objectPath: string, contentType: string): Promise<UploadTarget>;
  signedUrl(bucket: Bucket, objectPath: string, expiresSec?: number): Promise<string>;
  download(bucket: Bucket, objectPath: string): Promise<Uint8Array>;
  exists(bucket: Bucket, objectPath: string): Promise<boolean>;
  remove(bucket: Bucket, objectPath: string): Promise<void>;
}

export function safeObjectPath(...parts: string[]) {
  return parts
    .map((p) => p.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("/");
}

// ------------------------------------------------------------------ mock: helyi fájlrendszer
const secret = () => process.env.STORAGE_SIGNING_SECRET || process.env.ADMIN_SESSION_SECRET || "huzdra-dev-secret";
export function signStorage(op: "get" | "put", bucket: string, objectPath: string, exp: number) {
  return crypto.createHmac("sha256", secret()).update(`${op}:${bucket}:${objectPath}:${exp}`).digest("base64url");
}
export function verifyStorage(op: "get" | "put", bucket: string, objectPath: string, exp: number, sig: string) {
  if (!exp || exp < Date.now() / 1000) return false;
  const want = signStorage(op, bucket, objectPath, exp);
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

class LocalStorage implements StorageAdapter {
  readonly name = "local";
  private root = path.join(process.env.DATA_DIR ?? ".data", "storage");
  private file(bucket: Bucket, p: string) {
    const full = path.resolve(this.root, bucket, p);
    if (!full.startsWith(path.resolve(this.root, bucket) + path.sep)) throw new Error("Érvénytelen útvonal");
    return full;
  }
  async upload(bucket: Bucket, p: string, data: Uint8Array) {
    const f = this.file(bucket, p);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, data);
  }
  async createUploadTarget(bucket: Bucket, p: string, contentType: string): Promise<UploadTarget> {
    const exp = Math.floor(Date.now() / 1000) + 15 * 60;
    const q = new URLSearchParams({ exp: String(exp), sig: signStorage("put", bucket, p, exp) });
    return { url: `/api/storage/${bucket}/${p}?${q}`, method: "PUT", headers: { "Content-Type": contentType }, path: p };
  }
  async signedUrl(bucket: Bucket, p: string, expiresSec = 3600) {
    const exp = Math.floor(Date.now() / 1000) + expiresSec;
    const q = new URLSearchParams({ exp: String(exp), sig: signStorage("get", bucket, p, exp) });
    return `/api/storage/${bucket}/${p}?${q}`;
  }
  async download(bucket: Bucket, p: string) {
    return new Uint8Array(await fs.readFile(this.file(bucket, p)));
  }
  async exists(bucket: Bucket, p: string) {
    try {
      await fs.access(this.file(bucket, p));
      return true;
    } catch {
      return false;
    }
  }
  async remove(bucket: Bucket, p: string) {
    await fs.rm(this.file(bucket, p), { force: true });
  }
}

// ------------------------------------------------------------------ Supabase Storage
class SupabaseStorage implements StorageAdapter {
  readonly name = "supabase";
  private get sb() {
    return getSupabaseAdmin().storage;
  }
  async upload(bucket: Bucket, p: string, data: Uint8Array, contentType: string) {
    const { error } = await this.sb.from(bucket).upload(p, data, { contentType, upsert: true });
    if (error) throw new Error(`Supabase feltöltési hiba: ${error.message}`);
  }
  async createUploadTarget(bucket: Bucket, p: string, contentType: string): Promise<UploadTarget> {
    const { data, error } = await this.sb.from(bucket).createSignedUploadUrl(p);
    if (error || !data) throw new Error(`Supabase feltöltési URL hiba: ${error?.message}`);
    // A Supabase aláírt feltöltési URL-je nyers törzset fogad PUT-tal, külön hitelesítés nélkül.
    return { url: data.signedUrl, method: "PUT", headers: { "Content-Type": contentType, "x-upsert": "false" }, path: p };
  }
  async signedUrl(bucket: Bucket, p: string, expiresSec = 3600) {
    const { data, error } = await this.sb.from(bucket).createSignedUrl(p, expiresSec);
    if (error || !data) throw new Error(`Supabase aláírt URL hiba: ${error?.message}`);
    return data.signedUrl;
  }
  async download(bucket: Bucket, p: string) {
    const { data, error } = await this.sb.from(bucket).download(p);
    if (error || !data) throw new Error(`Supabase letöltési hiba: ${error?.message}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  async exists(bucket: Bucket, p: string) {
    const { data } = await this.sb.from(bucket).exists(p);
    return !!data;
  }
  async remove(bucket: Bucket, p: string) {
    await this.sb.from(bucket).remove([p]);
  }
}

const g = globalThis as unknown as { __huzdraStorage?: StorageAdapter };
export function getStorage(): StorageAdapter {
  if (!g.__huzdraStorage) g.__huzdraStorage = isSupabase() ? new SupabaseStorage() : new LocalStorage();
  return g.__huzdraStorage;
}
