import crypto from "node:crypto";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { ENTITIES, coerceRow } from "@/lib/admin-entities";
import { getRepo } from "@/lib/db";

export async function POST(req: Request, ctx: RouteContext<"/api/admin/crud/[entity]">) {
  if (!(await adminFromRequest())) return unauthorized();
  const { entity } = await ctx.params;
  const def = ENTITIES[entity];
  if (!def) return Response.json({ error: "Ismeretlen entitás" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const input = (b.row ?? {}) as Record<string, unknown>;
  const existingKey = typeof b.key === "string" && b.key ? b.key : null;
  const { row, errors } = coerceRow(def, input, !existingKey);
  if (Object.keys(errors).length) return Response.json({ error: "Ellenőrizd a mezőket", errors }, { status: 422 });
  const repo = getRepo();
  if (existingKey) row[def.key] = existingKey;
  else if (!row[def.key]) {
    row[def.key] = def.entity === "artists" ? `art_${String(row.slug).replace(/-/g, "_")}` : `${def.idPrefix ?? ""}${crypto.randomBytes(5).toString("hex")}`;
  }
  if (!existingKey) {
    const all = await repo.adminList(def.entity);
    if (all.some((r) => r[def.key] === row[def.key])) return Response.json({ error: "Már létezik ilyen azonosító", errors: { [def.key]: "Foglalt" } }, { status: 409 });
    if (def.entity === "samples" && !row.audioUrl) row.audioUrl = `/api/audio/sample/${row.id}`;
    if (def.entity === "reviews" && !row.createdAt) row.createdAt = new Date().toISOString().slice(0, 10);
  }
  if (def.entity === "samples" && !row.audioUrl) row.audioUrl = `/api/audio/sample/${row[def.key]}`;
  return Response.json(await repo.adminUpsert(def.entity, row));
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/crud/[entity]">) {
  if (!(await adminFromRequest())) return unauthorized();
  const { entity } = await ctx.params;
  const def = ENTITIES[entity];
  const key = new URL(req.url).searchParams.get("key");
  if (!def || !key) return Response.json({ error: "Hiányzó adat" }, { status: 400 });
  if (def.entity === "artists") {
    const orders = await getRepo().listOrders();
    if (orders.some((o) => o.data.artistId === key)) return Response.json({ error: "Van rendelése – törlés helyett állítsd inaktívra." }, { status: 409 });
  }
  await getRepo().adminDelete(def.entity, key);
  return Response.json({ ok: true });
}
