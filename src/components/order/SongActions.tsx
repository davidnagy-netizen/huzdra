"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { useAudio } from "../audio/AudioProvider";
import { fmtTime } from "../audio/AudioProvider";
import { CheckIcon, DownloadIcon, PauseIcon, PenIcon, PlayIcon, ShareIcon } from "../icons";

export function SongActions({
  token,
  title,
  artistName,
  audioUrl,
  status,
  revisionsLeft,
}: {
  token: string;
  title: string;
  artistName: string;
  audioUrl: string;
  status: string;
  revisionsLeft: number;
}) {
  const audio = useAudio();
  const trackObj = { id: `song-${token}`, title, src: audioUrl, artistName };
  const on = audio.current?.id === trackObj.id;
  const playing = on && audio.playing;
  const dur = on ? audio.duration || 24 : 24;
  const t = on ? audio.time : 0;

  const [revOpen, setRevOpen] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; href?: string } | null>(null);
  const [accepted, setAccepted] = useState(status === "done");
  const [busy, setBusy] = useState(false);

  const share = async () => {
    const url = window.location.href;
    track("song_share");
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Hallgasd meg: ${title} – ${artistName} hangján 🎻`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setMsg({ ok: true, text: "Link kimásolva – küldd el a családi csoportba vagy a DJ-nek!" });
    }
  };

  const sendRevision = async () => {
    setBusy(true);
    const res = await fetch(`/api/songs/${token}/revision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: j.error });
    track("revision_request");
    setRevOpen(false);
    setMsg({ ok: true, text: "Megkaptuk a javítási kérést! Értesítünk, amint kész az új változat.", href: j.statusUrl });
  };

  const accept = async () => {
    const res = await fetch(`/api/songs/${token}/accept`, { method: "POST" });
    if (res.ok) setAccepted(true);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => audio.toggle(trackObj, [trackObj])}
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-red text-on-gold shadow-lg"
          aria-label={playing ? "Szünet" : "Lejátszás"}
        >
          {playing ? <PauseIcon size={28} /> : <PlayIcon size={28} className="translate-x-0.5" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            className="seek"
            min={0}
            max={dur}
            step={0.1}
            value={t}
            disabled={!on}
            onChange={(e) => audio.seek(Number(e.target.value))}
            style={{ ["--pct" as string]: `${dur ? (t / dur) * 100 : 0}%` }}
            aria-label="Tekerés"
            aria-valuetext={`${fmtTime(t)} / ${fmtTime(dur)}`}
          />
          <p className="mt-1 flex justify-between text-xs tabular-nums text-muted"><span>{fmtTime(t)}</span><span>{fmtTime(dur)}</span></p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <a href={`${audioUrl}${audioUrl.includes("?") ? "&" : "?"}download=1`} className="btn-ghost" download>
          <DownloadIcon size={18} /> Letöltés
        </a>
        <button type="button" className="btn-ghost" onClick={share}><ShareIcon size={18} /> Megosztás</button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">Demó: a letöltés WAV; élesben MP3 (320 kbps).</p>

      {status === "revision_requested" ? (
        <p className="mt-4 rounded-xl bg-gold/10 p-3 text-sm" role="status">A javítás folyamatban van – hamarosan érkezik az új változat.</p>
      ) : accepted ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm font-semibold" role="status"><CheckIcon size={16} /> Örülünk, hogy tetszik! Jó mulatást! 🎉</p>
      ) : (
        <div className="mt-5 rounded-2xl border border-line p-4">
          <p className="font-bold">Minden stimmel?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !py-2.5 text-sm" onClick={accept}>Tökéletes, köszönjük!</button>
            <button type="button" className="btn-ghost !py-2.5 text-sm" onClick={() => setRevOpen((v) => !v)} disabled={revisionsLeft === 0} aria-expanded={revOpen}>
              <PenIcon size={16} /> Javítást kérek ({revisionsLeft} ingyenes maradt)
            </button>
          </div>
          {revOpen && (
            <div className="mt-4">
              <label htmlFor="rev" className="mb-1.5 block text-sm font-bold">Mit javítsunk?</label>
              <textarea id="rev" className="field" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder="pl. A Zsófi nevet hosszú ó-val ejtsük; a 2. versszakba kerüljön bele a kutyánk, Bodri; lehetne kicsit pörgősebb." />
              <button type="button" className="btn-primary mt-3 !py-2.5 text-sm" onClick={sendRevision} disabled={busy || note.trim().length < 5}>
                {busy ? "Küldés…" : "Javítás kérése"}
              </button>
            </div>
          )}
        </div>
      )}
      {msg && (
        <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-gold" : "text-red"}`} role="status">
          {msg.text} {msg.href && <Link className="underline" href={msg.href}>Állapot követése</Link>}
        </p>
      )}
    </div>
  );
}
