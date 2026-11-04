"use client";

import { useMemo, useState } from "react";
import type { Catalog } from "@/lib/catalog";
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from "../icons";
import { fmtTime, useAudio, type Track } from "./AudioProvider";

export function toTracks(catalog: Pick<Catalog, "samples" | "artists" | "occasions" | "styles">, samples = catalog.samples): Track[] {
  return samples.map((s) => ({
    id: s.id,
    title: s.title,
    src: s.audioUrl,
    artistName: catalog.artists.find((a) => a.id === s.artistId)?.name ?? "",
    occasionLabel: catalog.occasions.find((o) => o.id === s.occasionId)?.label,
    styleLabel: catalog.styles.find((x) => x.id === s.styleId)?.label,
  }));
}

/** Egyedi, akadálymentes mintadal-lejátszó, előadónkénti szűréssel. */
export function FeaturedPlayer({ catalog }: { catalog: Pick<Catalog, "samples" | "artists" | "occasions" | "styles"> }) {
  const [artistId, setArtistId] = useState<string>("all");
  const audio = useAudio();
  const list = useMemo(() => {
    const filtered = catalog.samples.filter((s) => artistId === "all" || s.artistId === artistId);
    const featured = filtered.filter((s) => s.featured);
    return toTracks(catalog, featured.length >= 2 ? featured : filtered.slice(0, 4));
  }, [catalog, artistId]);

  const active = audio.current && list.find((t) => t.id === audio.current!.id) ? audio.current : null;
  const shown = active ?? list[0];
  const isPlaying = !!active && audio.playing;
  const dur = active ? audio.duration || 24 : 24;
  const t = active ? audio.time : 0;
  const pct = dur ? (t / dur) * 100 : 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex gap-2 overflow-x-auto border-b border-line p-3 no-scrollbar" role="group" aria-label="Szűrés előadóra">
        {[{ id: "all", name: "Mindenki" }, ...catalog.artists].map((a) => (
          <button key={a.id} type="button" className="chip" aria-pressed={artistId === a.id} onClick={() => setArtistId(a.id)}>
            {a.name}
          </button>
        ))}
      </div>
      {shown && (
        <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <button
            type="button"
            onClick={() => audio.toggle(shown, list)}
            className="relative mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-red text-on-gold shadow-xl shadow-red/30 transition hover:scale-[1.03]"
            aria-label={isPlaying ? `Szünet: ${shown.title}` : `Lejátszás: ${shown.title}`}
          >
            <span className={`absolute inset-0 rounded-full border-4 border-dashed border-on-gold/20 ${isPlaying ? "animate-[spin_6s_linear_infinite]" : ""}`} aria-hidden />
            {isPlaying ? <PauseIcon size={40} /> : <PlayIcon size={40} className="translate-x-0.5" />}
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {shown.occasionLabel && <span className="rounded-full bg-red/15 px-2.5 py-1 text-red">{shown.occasionLabel}</span>}
              {shown.styleLabel && <span className="rounded-full bg-gold/15 px-2.5 py-1 text-gold">{shown.styleLabel}</span>}
            </div>
            <h3 className="mt-2 truncate font-display text-2xl font-bold">{shown.title}</h3>
            <p className="text-sm text-muted">{shown.artistName} · mintadal</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="w-10 text-right text-xs tabular-nums text-muted">{fmtTime(t)}</span>
              <input
                type="range"
                className="seek"
                min={0}
                max={dur}
                step={0.1}
                value={t}
                disabled={!active}
                onChange={(e) => audio.seek(Number(e.target.value))}
                style={{ ["--pct" as string]: `${pct}%` }}
                aria-label="Tekerés"
                aria-valuetext={`${fmtTime(t)} / ${fmtTime(dur)}`}
              />
              <span className="w-10 text-xs tabular-nums text-muted">{fmtTime(dur)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-gold" onClick={() => (active ? audio.prev() : audio.play(list.at(-1)!, list))} aria-label="Előző dal">
                <PrevIcon size={18} />
              </button>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-gold" onClick={() => (active ? audio.next() : audio.play(list[1] ?? list[0], list))} aria-label="Következő dal">
                <NextIcon size={18} />
              </button>
              {active && audio.loading && <span className="text-xs text-muted" role="status">Betöltés…</span>}
            </div>
          </div>
        </div>
      )}
      <ol className="border-t border-line">
        {list.map((tr, i) => {
          const on = audio.current?.id === tr.id;
          return (
            <li key={tr.id}>
              <button type="button" onClick={() => audio.toggle(tr, list)} className={`flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2 ${on ? "bg-surface-2" : ""}`} aria-current={on ? "true" : undefined}>
                <span className="w-5 text-sm tabular-nums text-muted">
                  {on && audio.playing ? <span className="eq text-gold" aria-hidden><span /><span /><span /></span> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{tr.title}</span>
                  <span className="block truncate text-xs text-muted">{tr.artistName} · {tr.occasionLabel}</span>
                </span>
                <span className="text-gold">{on && audio.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line px-5 py-3 text-xs text-muted">
        🎧 Demó: a mintadalok jelenleg generált helykitöltő dallamok – a végleges, licencelt minták hamarosan érkeznek.
      </p>
    </div>
  );
}
