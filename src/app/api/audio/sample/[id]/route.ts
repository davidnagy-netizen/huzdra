import { synthesizeWav } from "@/lib/audio/synth";
import { getRepo } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/api/audio/sample/[id]">) {
  const { id } = await ctx.params;
  const repo = getRepo();
  const sample = await repo.getSample(id);
  if (!sample) return new Response("Not found", { status: 404 });
  // Adminból feltöltött mintadal: "storage:<útvonal>" a samples tárolóban
  if (sample.audioUrl.startsWith("storage:")) {
    const p = sample.audioUrl.slice("storage:".length);
    const st = getStorage();
    const signed = await st.signedUrl("samples", p, 3600);
    if (signed.startsWith("http")) return Response.redirect(signed, 302);
    const data = await st.download("samples", p);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": p.endsWith(".wav") ? "audio/wav" : "audio/mpeg", "Cache-Control": "public, max-age=3600" } });
  }
  const artist = await repo.getArtistById(sample.artistId);
  const wav = synthesizeWav({
    seed: sample.id + sample.title,
    tempo: sample.tempo,
    minor: sample.styleId === "roma-ballada" || sample.styleId === "duett",
    lead: sample.styleId === "discos-mulatos" ? "synth" : sample.styleId === "roma-ballada" ? "violin" : sample.tempo === "porgos" ? "violin" : "cimbalom",
    seconds: sample.durationSec,
    metadata: { title: sample.title, artist: artist?.name ?? "Húzdrá!", comment: "Húzdrá! helykitöltő mintadal (mock)" },
  });
  return new Response(new Uint8Array(wav), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(wav.length),
      "Cache-Control": "public, max-age=86400, immutable",
      "Accept-Ranges": "none",
    },
  });
}
