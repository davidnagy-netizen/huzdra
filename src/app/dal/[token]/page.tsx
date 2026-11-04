import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistPortrait } from "@/components/ArtistPortrait";
import { SongActions } from "@/components/order/SongActions";
import { toPublicArtist } from "@/lib/catalog";
import { getRepo } from "@/lib/db";
import { SITE, aiDisclosure, voiceBadgeLabel } from "@/lib/site";

export const metadata: Metadata = { title: "A te dalod", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SongPage(props: PageProps<"/dal/[token]">) {
  const { token } = await props.params;
  const repo = getRepo();
  const order = await repo.getOrderBySongToken(token);
  if (!order || !order.audio || !["delivered", "done", "revision_requested"].includes(order.status)) notFound();
  const artist = await repo.getArtistById(order.data.artistId);
  if (!artist) notFound();

  return (
    <div className="relative overflow-hidden">
      <div className="disco-bg" aria-hidden><div className="disco-dots" /></div>
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <div className="card overflow-hidden">
          <div className="relative aspect-[16/9]">
            <ArtistPortrait artist={toPublicArtist(artist)} priority monogram={false} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
              <p className="text-sm font-semibold text-white/80">{artist.name} · {voiceBadgeLabel(artist.kind)}</p>
              <h1 className="font-display text-3xl font-black sm:text-4xl">{order.lyrics?.title ?? `${order.data.recipientName} dala`}</h1>
            </div>
          </div>
          <div className="p-5 sm:p-7">
            <SongActions
              token={token}
              title={order.lyrics?.title ?? "Húzdrá! dal"}
              artistName={artist.name}
              audioUrl={order.audio.url}
              status={order.status}
              revisionsLeft={Math.max(0, SITE.revisionRounds - order.revisionsUsed)}
            />
            {order.lyrics && (
              <details className="mt-6 rounded-2xl border border-line p-4" open>
                <summary className="cursor-pointer font-bold">Dalszöveg</summary>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{order.lyrics.text}</pre>
              </details>
            )}
            <p className="mt-6 rounded-xl bg-surface-2 p-3 text-xs text-muted">
              {aiDisclosure(artist)} A felvétel azonosító vízjelet tartalmaz. A dal személyes, nem kereskedelmi
              felhasználásra szól – lejátszhatod a lagziban, a családi csoportban vagy az autóban, de nem árusítható és nem
              használható reklámban.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
