import crypto from "node:crypto";
import { getRepo } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Szólj, ha elérhető" feliratkozás egy hamarosan érkező előadóra. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const artistId = String(body.artistId ?? "");
  if (!EMAIL_RE.test(email)) return Response.json({ error: "Adj meg egy érvényes e-mail-címet." }, { status: 400 });
  if (body.consent !== true) return Response.json({ error: "Jelöld be, hogy értesíthetünk." }, { status: 400 });
  const repo = getRepo();
  const artist = await repo.getArtistById(artistId);
  if (!artist || artist.availability !== "coming_soon") return Response.json({ error: "Ismeretlen előadó." }, { status: 404 });
  const r = await repo.addToWaitlist({ id: `wl_${crypto.randomBytes(6).toString("hex")}`, artistId, email, createdAt: new Date().toISOString() });
  return Response.json({ ok: true, created: r.created });
}
