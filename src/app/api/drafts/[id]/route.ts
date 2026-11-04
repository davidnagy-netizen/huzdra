import { getRepo } from "@/lib/db";
import { sanitizeWizard } from "@/lib/wizard-schema";

export async function GET(_req: Request, ctx: RouteContext<"/api/drafts/[id]">) {
  const { id } = await ctx.params;
  const draft = await getRepo().getDraft(id);
  if (!draft) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(draft);
}

export async function PUT(req: Request, ctx: RouteContext<"/api/drafts/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const draft = await getRepo().updateDraft(id, {
    data: sanitizeWizard(body.data),
    step: Math.max(0, Math.min(5, Number(body.step) || 0)),
  });
  if (!draft) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ id: draft.id, updatedAt: draft.updatedAt });
}
