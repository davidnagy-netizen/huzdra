"use client";

import Link from "next/link";
import type { Catalog } from "@/lib/catalog";
import { formatSurcharge } from "@/lib/pricing";
import { track } from "@/lib/analytics";
import { presetWizard } from "@/lib/wizard-bus";
import { voiceBadgeLabel } from "@/lib/site";
import type { ArtistKind } from "@/lib/types";
import { ComingSoonRow } from "./ComingSoon";
import { ArtistPortrait } from "../ArtistPortrait";
import { useAudio } from "../audio/AudioProvider";
import { toTracks } from "../audio/FeaturedPlayer";
import { CheckIcon, PauseIcon, PlayIcon } from "../icons";

/** "Hivatalos hang" csak licencelt hírességnél; saját hangnál "Húzdrá! hang". */
export function OfficialBadge({ className = "", kind = "celebrity" }: { className?: string; kind?: ArtistKind }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-on-gold shadow ${className}`}>
      <CheckIcon size={12} strokeWidth={3} /> {voiceBadgeLabel(kind)}
    </span>
  );
}

export function ArtistCards({ catalog }: { catalog: Catalog }) {
  const audio = useAudio();
  return (
    <>
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {catalog.artists.map((a, i) => {
        const samples = catalog.samples.filter((s) => s.artistId === a.id);
        const tracks = toTracks(catalog, samples);
        const first = tracks[0];
        const playingThis = !!audio.current && tracks.some((t) => t.id === audio.current!.id) && audio.playing;
        const styleLabels = a.styles.map((id) => catalog.styles.find((s) => s.id === id)?.label).filter(Boolean);
        return (
          <article key={a.id} className="card group overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden">
              <ArtistPortrait artist={a} priority={i === 0} className="transition duration-500 group-hover:scale-[1.03]" />
              <OfficialBadge className="absolute left-3 top-3" kind={a.kind} />
              {first && (
                <button
                  type="button"
                  onClick={() => audio.toggle(playingThis ? audio.current! : first, tracks)}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-bold text-white backdrop-blur hover:bg-black/75"
                  aria-label={playingThis ? `${a.name} mintadal szüneteltetése` : `Hallgass bele: ${a.name}`}
                >
                  {playingThis ? <PauseIcon size={16} /> : <PlayIcon size={16} />} Hallgass bele
                </button>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-2xl font-bold">{a.name}</h3>
                <span className="shrink-0 text-sm text-muted">{formatSurcharge(a.surchargeHuf)}</span>
              </div>
              <p className="mt-1 text-muted">{a.tagline}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {styleLabels.map((l) => (
                  <li key={l} className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">{l}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => {
                    track("artist_select", { artist: a.slug, source: "home_card" });
                    presetWizard({ artistId: a.id });
                  }}
                >
                  Ezt az előadót választom
                </button>
                <Link href={`/eloadok/${a.slug}`} className="btn-ghost">Bemutatkozás</Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
    <ComingSoonRow artists={catalog.comingSoon} />
    </>
  );
}
