import { getRepo } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/** A kész dal hangja (a tokenes dal-oldal linkjével). Supabase-ben aláírt URL-re irányít. */
export async function GET(req: Request, ctx: RouteContext<"/api/audio/song/[token]">) {
  const { token } = await ctx.params;
  const order = await getRepo().getOrderBySongToken(token);
  if (!order?.audio?.storagePath) return new Response("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const ext = order.audio.storagePath.split(".").pop() ?? "mp3";
  const filename = `huzdra-${(order.lyrics?.title ?? "dal").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${ext}`;
  const storage = getStorage();
  const signed = await storage.signedUrl("songs", order.audio.storagePath, 3600);
  if (signed.startsWith("http") && !download) return Response.redirect(signed, 302);
  const data = await storage.download("songs", order.audio.storagePath);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": ext === "wav" ? "audio/wav" : ext === "flac" ? "audio/flac" : "audio/mpeg",
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}
