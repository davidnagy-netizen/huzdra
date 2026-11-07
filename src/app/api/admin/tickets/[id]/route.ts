import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getRepo } from "@/lib/db";
import { adminReply } from "@/lib/pipeline/support";
import { enqueue } from "@/lib/pipeline/queue";

export async function POST(req: Request, ctx: RouteContext<"/api/admin/tickets/[id]">) {
  const by = await adminFromRequest();
  if (!by) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  if (b.action === "reprocess") {
    await getRepo().updateTicket(id, (t) => ({ ...t, status: "open", intent: null }));
    await enqueue("support.process", { ticketId: id });
    return Response.json({ ok: true });
  }
  await adminReply(id, by, String(b.reply ?? ""), b.close === true);
  return Response.json({ ok: true });
}
