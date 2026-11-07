import { cookies } from "next/headers";
import { checkCredentials, createSessionToken, sessionCookie } from "@/lib/admin-auth";

const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
  if (list.length >= 10) return Response.json({ error: "Túl sok próbálkozás – várj 15 percet." }, { status: 429 });
  attempts.set(ip, [...list, now]);
  const body = await req.json().catch(() => ({}));
  const r = await checkCredentials(String(body.email ?? ""), String(body.password ?? ""));
  if (!r.ok) return Response.json({ error: r.error }, { status: 401 });
  attempts.delete(ip);
  (await cookies()).set(sessionCookie(createSessionToken(r.email)));
  return Response.json({ ok: true });
}
