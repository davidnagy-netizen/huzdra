import { PreviewError, createPreview, hashIp, publicPreview } from "@/lib/pipeline/preview";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  try {
    const p = await createPreview(body, hashIp(ip));
    return Response.json({ ...publicPreview(p), token: p.token }, { status: 201 });
  } catch (err) {
    if (err instanceof PreviewError) return Response.json({ error: err.message, field: err.field }, { status: err.status });
    console.error(err);
    return Response.json({ error: "Váratlan hiba – próbáld újra!" }, { status: 500 });
  }
}
