import { getRepo } from "@/lib/db";
import { publicPreview } from "@/lib/pipeline/preview";
import { enqueue } from "@/lib/pipeline/queue";
import { isMock } from "@/lib/site";

export async function GET(req: Request, ctx: RouteContext<"/api/previews/[id]">) {
  const { id } = await ctx.params;
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const p = await getRepo().getPreview(id);
  if (!p || p.token !== t) return Response.json({ error: "not_found" }, { status: 404 });
  // mock: újraindulás után elveszett időzítő pótlása
  if (isMock() && p.status === "generating" && Date.now() - Date.parse(p.createdAt) > 8000) await enqueue("preview.advance", { previewId: p.id });
  return Response.json(publicPreview(p));
}
