"use client";

import { useMemo, useState } from "react";
import type { Catalog } from "@/lib/catalog";
import type { OccasionId, StyleId } from "@/lib/types";
import { presetWizard } from "@/lib/wizard-bus";
import { useAudio } from "../audio/AudioProvider";
import { toTracks } from "../audio/FeaturedPlayer";
import { PauseIcon, PlayIcon } from "../icons";

export function SampleGrid({ catalog, initialOccasion }: { catalog: Catalog; initialOccasion?: OccasionId }) {
  const [occ, setOcc] = useState<OccasionId | "all">(initialOccasion ?? "all");
  const [style, setStyle] = useState<StyleId | "all">("all");
  const audio = useAudio();

  const filtered = useMemo(
    () => catalog.samples.filter((s) => (occ === "all" || s.occasionId === occ) && (style === "all" || s.styleId === style)),
    [catalog.samples, occ, style],
  );
  const tracks = useMemo(() => toTracks(catalog, filtered), [catalog, filtered]);

  return (
    <div>
      <div className="space-y-3">
        <div>
          <p id="occ-label" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Alkalom</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="group" aria-labelledby="occ-label">
            <button type="button" className="chip" aria-pressed={occ === "all"} onClick={() => setOcc("all")}>Mind</button>
            {catalog.occasions.map((o) => (
              <button key={o.id} type="button" className="chip" aria-pressed={occ === o.id} onClick={() => setOcc(o.id)}>
                <span aria-hidden>{o.emoji}</span> {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p id="style-label" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Stílus</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" role="group" aria-labelledby="style-label">
            <button type="button" className="chip" aria-pressed={style === "all"} onClick={() => setStyle("all")}>Mind</button>
            {catalog.styles.map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={style === s.id} onClick={() => setStyle(s.id)} title={s.description}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{filtered.length} mintadal</p>
      {filtered.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-semibold">Erre a párosításra még nincs mintadalunk.</p>
          <p className="mt-1 text-sm text-muted">De a tiédet szívesen megírjuk! 🎻</p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => presetWizard({ occasionId: occ === "all" ? undefined : occ, styleId: style === "all" ? undefined : style })}
          >
            Húzd rá!
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => {
            const t = tracks[i];
            const on = audio.current?.id === s.id;
            const playing = on && audio.playing;
            const artist = catalog.artists.find((a) => a.id === s.artistId);
            const hue = artist?.accentHue ?? 20;
            return (
              <li key={s.id} className="card flex flex-col overflow-hidden">
                <div className="relative h-24" style={{ background: `linear-gradient(120deg, hsl(${hue} 70% 32%), hsl(${(hue + 220) % 360} 60% 18%))` }}>
                  <div className="disco-dots" aria-hidden />
                  <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white">{t.occasionLabel}</span>
                  <button
                    type="button"
                    onClick={() => audio.toggle(t, tracks)}
                    className="absolute -bottom-6 right-4 grid h-12 w-12 place-items-center rounded-full bg-gold text-on-gold shadow-lg"
                    aria-label={playing ? `Szünet: ${s.title}` : `Lejátszás: ${s.title}`}
                  >
                    {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} className="translate-x-px" />}
                  </button>
                </div>
                <div className="flex flex-1 flex-col p-4 pt-5">
                  <h3 className="pr-12 font-display text-lg font-bold leading-snug">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{t.artistName} · {t.styleLabel}</p>
                  <p className="mt-2 flex-1 text-sm">{s.blurb}</p>
                  {on && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className="h-full bg-gold transition-[width]" style={{ width: `${audio.duration ? (audio.time / audio.duration) * 100 : 0}%` }} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
