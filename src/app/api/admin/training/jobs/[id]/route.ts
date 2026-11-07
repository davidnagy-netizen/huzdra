import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { TrainingError, activateModel } from "@/lib/pipeline/training";

export async function POST(req: Request, ctx: RouteContext<"/api/admin/training/jobs/[id]">) {
  if (!(await adminFromRequest())) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  try {
    await activateModel(id, b.active === true);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof TrainingError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
