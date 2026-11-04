import { getRepo } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const email = String(body.email ?? "").trim().toLowerCase();
  const order = code ? await getRepo().getOrderByCode(code.startsWith("HZ-") ? code : `HZ-${code}`) : null;
  // Szándékosan ugyanaz a válasz, ha a kód vagy az e-mail hibás (ne lehessen rendeléseket kipuhatolni).
  if (!order || order.data.email.trim().toLowerCase() !== email) {
    return Response.json({ error: "Nem találtunk ilyen rendelést. Ellenőrizd a rendelésszámot és az e-mail-címet." }, { status: 404 });
  }
  return Response.json({ code: order.code, statusKey: order.statusKey });
}
