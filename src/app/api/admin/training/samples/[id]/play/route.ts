import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getRepo } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/training/samples/[id]/play">) {
  if (!(await adminFromRequest())) return unauthorized();
  const { id } = await ctx.params;
  const s = (await getRepo().listTrainingSamples()).find((x) => x.id === id);
  if (!s) return new Response("Not found", { status: 404 });
  const url = await getStorage().signedUrl("training", s.storagePath, 1800);
  return Response.redirect(url.startsWith("http") ? url : new URL(url, _req.url).toString(), 302);
}
