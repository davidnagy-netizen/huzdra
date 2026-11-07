import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, isSupabase } from "./supabase";

export const ADMIN_COOKIE = "huzdra_admin";
const TTL_SEC = 12 * 3600;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !process.env.HUZDRA_ALLOW_DEV_ADMIN) {
    throw new Error("ADMIN_SESSION_SECRET (legalább 32 karakter) kötelező élesben");
  }
  return "huzdra-dev-admin-secret-change-me-please-0001";
}

export function createSessionToken(email: string): string {
  const body = Buffer.from(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + TTL_SEC })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(body, "base64url").toString()) as { e: string; x: number };
    return x > Date.now() / 1000 ? { email: e } : null;
  } catch {
    return null;
  }
}

export const sessionCookie = (token: string) => ({
  name: ADMIN_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SEC,
});

/** Szerver-komponensekben: bejelentkezett admin, különben átirányítás a belépésre. */
export async function requireAdmin(): Promise<{ email: string }> {
  const s = verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) redirect("/admin/login");
  return s;
}

/** API-útvonalakban: admin e-mail-címe, vagy null (→ 401). */
export async function adminFromRequest(): Promise<string | null> {
  return verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value)?.email ?? null;
}

export const unauthorized = () => Response.json({ error: "Nincs jogosultság – jelentkezz be újra." }, { status: 401 });

/** Bejelentkezés ellenőrzése. Supabase módban Supabase Auth + "admins" tábla; különben env jelszó. */
export async function checkCredentials(email: string, password: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const e = email.trim().toLowerCase();
  if (isSupabase()) {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password });
    if (error || !data.user) return { ok: false, error: "Hibás e-mail-cím vagy jelszó." };
    const { data: admin } = await sb.from("admins").select("email").eq("email", e).maybeSingle();
    if (!admin) return { ok: false, error: "Ehhez a fiókhoz nincs admin jogosultság." };
    return { ok: true, email: e };
  }
  const wantPass = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "huzdra-admin");
  const allowed = (process.env.ADMIN_EMAILS ?? "admin@huzdra.hu").split(",").map((x) => x.trim().toLowerCase());
  if (!wantPass) return { ok: false, error: "Az admin belépés nincs beállítva (ADMIN_PASSWORD)." };
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(wantPass).digest();
  if (!allowed.includes(e) || !crypto.timingSafeEqual(a, b)) return { ok: false, error: "Hibás e-mail-cím vagy jelszó." };
  return { ok: true, email: e };
}
