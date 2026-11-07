import { createTicket } from "@/lib/pipeline/support";

/**
 * Bejövő e-mail webhook (pl. Resend Inbound / Postmark / Mailgun). Hitelesítés: SUPPORT_INBOUND_SECRET
 * (Authorization: Bearer … vagy ?secret=…). Elfogadott törzs: { from, subject, text } vagy { from: { email }, … }.
 * FONTOS: olyan szolgáltatót használj, amely ellenőrzi a feladót (SPF/DKIM), mert a rendszer a feladó
 * e-mail-címe alapján azonosítja a megrendelőt.
 */
export async function POST(req: Request) {
  const secret = process.env.SUPPORT_INBOUND_SECRET;
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (!secret || given !== secret) return new Response("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });
  const rawFrom = typeof body.from === "string" ? body.from : body.from?.email ?? body.sender ?? "";
  const from = /<([^>]+)>/.exec(rawFrom)?.[1] ?? rawFrom;
  const text = String(body.text ?? body.plain ?? body["stripped-text"] ?? body.TextBody ?? "").split(/\n\s*(?:On .+wrote:|-----Original Message-----|.+ írta:)/)[0];
  if (!from || !text.trim()) return Response.json({ error: "Hiányzó feladó vagy szöveg" }, { status: 400 });
  const t = await createTicket({ channel: "email", fromEmail: from, subject: String(body.subject ?? body.Subject ?? ""), message: text });
  return Response.json({ ok: true, ticketId: t.id });
}
