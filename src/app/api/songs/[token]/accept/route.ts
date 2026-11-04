import { RevisionError, acceptSong } from "@/lib/pipeline/orchestrator";

export async function POST(_req: Request, ctx: RouteContext<"/api/songs/[token]/accept">) {
  const { token } = await ctx.params;
  try {
    await acceptSong(token);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof RevisionError) return Response.json({ error: err.message }, { status: 400 });
    return Response.json({ error: "Váratlan hiba történt." }, { status: 500 });
  }
}
