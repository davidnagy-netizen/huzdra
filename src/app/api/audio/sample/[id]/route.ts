import { synthesizeWav } from "@/lib/audio/synth";
import { getRepo } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/audio/sample/[id]">) {
  const { id } = await ctx.params;
  const repo = getRepo();
  const sample = await repo.getSample(id);
  if (!sample) return new Response("Not found", { status: 404 });
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
