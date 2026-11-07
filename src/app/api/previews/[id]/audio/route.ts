import { getRepo } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function GET(req: Request, ctx: RouteContext<"/api/previews/[id]/audio">) {
  const { id } = await ctx.params;
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const p = await getRepo().getPreview(id);
  if (!p || p.token !== t || p.status !== "ready" || !p.audioUrl) return new Response("Not found", { status: 404 });
  const storage = getStorage();
  const signed = await storage.signedUrl("previews", p.audioUrl, 1800);
  if (signed.startsWith("http")) return Response.redirect(signed, 302);
  const data = await storage.download("previews", p.audioUrl);
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": p.audioUrl.endsWith(".wav") ? "audio/wav" : "audio/mpeg", "Content-Length": String(data.length), "Cache-Control": "private, max-age=1800" },
  });
}
