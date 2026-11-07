import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getRepo } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/training/samples/[id]">) {
  if (!(await adminFromRequest())) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "musicalKey", "mood", "notes"]) if (typeof b[k] === "string") patch[k] = b[k].slice(0, 500);
  for (const k of ["bpm", "durationSec"]) if (b[k] === null || Number.isFinite(Number(b[k]))) patch[k] = b[k] === null || b[k] === "" ? null : Number(b[k]);
  for (const k of ["styleIds", "occasionIds", "instruments"]) if (Array.isArray(b[k])) patch[k] = b[k].map(String);
  if (b.status === "archived" || b.status === "uploaded") patch.status = b.status;
  const s = await getRepo().updateTrainingSample(id, patch);
  return s ? Response.json(s) : Response.json({ error: "Nem található" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/training/samples/[id]">) {
  if (!(await adminFromRequest())) return unauthorized();
  const { id } = await ctx.params;
  const repo = getRepo();
  const s = (await repo.listTrainingSamples()).find((x) => x.id === id);
  if (!s) return Response.json({ ok: true });
  if (s.status === "in_training") return Response.json({ error: "Tanítás alatt álló minta nem törölhető." }, { status: 409 });
  await getStorage().remove("training", s.storagePath);
  await repo.deleteTrainingSample(id);
  return Response.json({ ok: true });
}
