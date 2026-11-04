"use client";

import { useState } from "react";
import type { PublicArtist } from "@/lib/catalog";
import { ArtistPortrait } from "../ArtistPortrait";

export function ComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow ${className}`}>
      ⏳ Hamarosan
    </span>
  );
}

export function WaitlistForm({ artist, compact = false }: { artist: PublicArtist; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (state?.ok) return <p className="rounded-xl bg-gold/10 p-3 text-sm font-semibold text-gold" role="status">{state.msg}</p>;
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artistId: artist.id, email, consent }) });
        const j = await res.json();
        setBusy(false);
        setState(res.ok ? { ok: true, msg: `Feliratkoztál! Szólunk, amint ${artist.name} hangja rendelhető. 🎻` } : { ok: false, msg: j.error });
      }}
    >
      <div className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}>
        <label className="sr-only" htmlFor={`wl-${artist.id}`}>E-mail-cím</label>
        <input id={`wl-${artist.id}`} type="email" required className="field !py-2.5" placeholder="e-mail-címed" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <button className="btn-ghost shrink-0 !py-2.5 text-sm" disabled={busy}>{busy ? "…" : "Szólj, ha elérhető"}</button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--gold)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        Értesíthettek e-mailben, amikor az előadó elérhető lesz.
      </label>
      {state && !state.ok && <p className="text-sm font-semibold text-red" role="alert">{state.msg}</p>}
    </form>
  );
}

/** Hamarosan érkező hírességek sora (nem rendelhetők, csak feliratkozás). */
export function ComingSoonRow({ artists }: { artists: PublicArtist[] }) {
  if (!artists.length) return null;
  return (
    <div className="mt-10">
      <h3 className="mb-1 font-display text-2xl font-bold">Hamarosan: hírességek hivatalos hangja</h3>
      <p className="mb-4 text-muted">Ismert előadókkal egyeztetünk – iratkozz fel, és elsőként szólunk.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {artists.map((a) => (
          <article key={a.id} className="card flex gap-4 overflow-hidden p-3">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl opacity-80 grayscale-[35%]">
              <ArtistPortrait artist={a} />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <ComingSoonBadge />
              <h4 className="mt-1.5 font-display text-xl font-bold">{a.name}</h4>
              <div className="mt-2"><WaitlistForm artist={a} compact /></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
