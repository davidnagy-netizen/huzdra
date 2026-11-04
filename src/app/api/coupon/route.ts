import { getRepo } from "@/lib/db";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const coupon = code ? await getRepo().getCoupon(code) : null;
  if (!coupon) return Response.json({ error: "Ez a kuponkód nem érvényes." }, { status: 404 });
  return Response.json({ code: coupon.code, percentOff: coupon.percentOff ?? null, amountOffHuf: coupon.amountOffHuf ?? null });
}
