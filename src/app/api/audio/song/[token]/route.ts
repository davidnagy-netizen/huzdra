import { synthesizeWav } from "@/lib/audio/synth";
import { getRepo } from "@/lib/db";

export async function GET(req: Request, ctx: RouteContext<"/api/audio/song/[token]">) {
  const { token } = await ctx.params;
  const repo = getRepo();
  const order = await repo.getOrderBySongToken(token);
  if (!order || !order.audio) return new Response("Not found", { status: 404 });
  const artist = await repo.getArtistById(order.data.artistId);
  const d = order.data;
  const wav = synthesizeWav({
    seed: `${order.id}:${order.lyrics?.version ?? 1}:${order.revisionsUsed}`,
    tempo: d.tempo || "kozepes",
    minor: d.mood === "meghato" || d.styleId === "roma-ballada",
    lead: d.cimbalom ? "cimbalom" : d.violin ? "violin" : d.styleId === "discos-mulatos" ? "synth" : "violin",
    seconds: 24,
    metadata: {
      title: order.lyrics?.title ?? "Húzdrá! dal",
      artist: artist?.name ?? "Húzdrá!",
      // Mock vízjel: azonosító metaadat. Élesben hallhatatlan audio vízjel is kerül bele.
      comment: `Húzdrá! AI-dal, ${artist?.name} hivatalos hangmodellje. Watermark: ${order.audio.watermarkId}. Személyes, nem kereskedelmi felhasználásra.`,
    },
  });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = `huzdra-${(order.lyrics?.title ?? "dal").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.wav`;
  return new Response(new Uint8Array(wav), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(wav.length),
      "Cache-Control": "private, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}
