import { createTicket } from "@/lib/pipeline/support";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const recent = new Map<string, number[]>();

/** Ügyfélüzenet a weboldalról (dal-oldal tokennel vagy kapcsolati űrlap). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  const songToken = typeof body.songToken === "string" ? body.songToken : undefined;
  if (!songToken && !EMAIL_RE.test(email)) return Response.json({ error: "Adj meg egy érvényes e-mail-címet." }, { status: 400 });
  if (message.length < 5) return Response.json({ error: "Írd le pár szóban, miben segíthetünk." }, { status: 400 });
  // egyszerű visszaélés-védelem: e-mail-címenként max. 5 üzenet / óra
  const now = Date.now();
  const key = songToken ?? email;
  const list = (recent.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (list.length >= 5) return Response.json({ error: "Túl sok üzenet – próbáld később." }, { status: 429 });
  recent.set(key, [...list, now]);
  const t = await createTicket({ channel: songToken ? "song_page" : "contact_form", fromEmail: email, subject: String(body.subject ?? "Üzenet a weboldalról"), message, songToken });
  return Response.json({ ok: true, ticketId: t.id }, { status: 201 });
}
