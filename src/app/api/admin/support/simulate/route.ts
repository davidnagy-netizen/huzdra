import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { createTicket } from "@/lib/pipeline/support";

/** Szupport-szimulátor: úgy dolgozza fel az üzenetet, mintha e-mailben érkezett volna. */
export async function POST(req: Request) {
  if (!(await adminFromRequest())) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const from = String(b.fromEmail ?? "").trim();
  const message = String(b.message ?? "").trim();
  if (!from || message.length < 3) return Response.json({ error: "Feladó és üzenet kötelező" }, { status: 400 });
  const t = await createTicket({ channel: "email", fromEmail: from, subject: String(b.subject ?? "Teszt üzenet"), message });
  return Response.json({ ok: true, ticketId: t.id });
}
