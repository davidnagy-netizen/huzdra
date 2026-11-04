import { RevisionError, requestRevision } from "@/lib/pipeline/orchestrator";

export async function POST(req: Request, ctx: RouteContext<"/api/songs/[token]/revision">) {
  const { token } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const order = await requestRevision(token, String(body.note ?? ""));
    return Response.json({ ok: true, revisionsUsed: order.revisionsUsed, statusUrl: `/rendelesem/${order.code}?k=${order.statusKey}` });
  } catch (err) {
    if (err instanceof RevisionError) return Response.json({ error: err.message }, { status: 400 });
    console.error(err);
    return Response.json({ error: "Váratlan hiba történt." }, { status: 500 });
  }
}
