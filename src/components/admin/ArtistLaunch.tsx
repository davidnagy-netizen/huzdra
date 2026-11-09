"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Artist } from "@/lib/types";
import { formatHuf } from "@/lib/pricing";

type Step = { label: string; done: boolean; hint: string };

/** Előadó élesítése: licenc → hangfelvételek → hangmodell → ár → bemutatkozás → elérhetővé tétel. */
export function ArtistLaunch({ artist, voiceSamples, hasActiveVoice }: { artist: Artist; voiceSamples: number; hasActiveVoice: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: artist.name,
    slug: artist.slug,
    kind: artist.kind,
    surchargeHuf: String(artist.surchargeHuf),
    royaltyPercent: String(artist.royaltyPercent),
    licenseSignedAt: artist.licenseSignedAt ?? "",
    tagline: artist.tagline,
    bio: artist.bio,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (extra: Partial<Artist> = {}) => {
    setBusy(true);
    setMsg(null);
    const row = { ...artist, ...f, surchargeHuf: Number(f.surchargeHuf), royaltyPercent: Number(f.royaltyPercent), licenseSignedAt: f.licenseSignedAt || null, ...extra };
    const res = await fetch("/api/admin/crud/artists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: artist.id, row }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: j.errors ? Object.values(j.errors).join(" · ") : j.error ?? "Hiba" });
    setMsg({ ok: true, text: extra.availability === "available" ? `${f.name} mostantól rendelhető – aki őt választja, az ő hangján kapja a dalt.` : extra.availability === "coming_soon" ? "Visszaállítva „egyeztetés alatt” állapotba (név nélkül jelenik meg)." : "Mentve." });
    router.refresh();
  };

  const steps: Step[] = [
    { label: "Licencszerződés / hozzájárulás rögzítve", done: !!artist.licenseSignedAt, hint: "Add meg az aláírás dátumát lent, és mentsd." },
    { label: "Hangfelvételek feltöltve", done: voiceSamples > 0, hint: "Lent a „hangfelvételek feltöltése” résznél." },
    { label: "Hangmodell betanítva és aktiválva", done: hasActiveVoice && !!artist.voiceModelId, hint: "Indíts tanítást, majd a kész modellnél: „Legyen ez a hangja”." },
    { label: "Ár (előadói felár) beállítva", done: artist.surchargeHuf > 0 || artist.kind === "house", hint: "Mennyit kér az előadó a csomagáron felül." },
    { label: "Név, szlogen, bemutatkozás", done: !!artist.name && artist.name !== "Ismert előadó" && !!artist.tagline && !!artist.bio, hint: "Ez jelenik meg a weboldalon élesítés után." },
  ];
  const ready = steps[0].done && steps[2].done;
  const live = artist.availability === "available";
  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`al-${k}`} className="mb-1 block text-xs font-bold">{label}</label>
      <input id={`al-${k}`} className="field !py-2 text-sm" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Élesítés lépései</h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.label} className="flex gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${s.done ? "bg-good text-white" : "border border-line text-muted"}`} aria-hidden>{s.done ? "✓" : i + 1}</span>
              <span>
                <b className={s.done ? "" : "text-ink"}>{s.label}</b>
                <span className="sr-only">{s.done ? " – kész" : " – hiányzik"}</span>
                {!s.done && <span className="block text-xs text-muted">{s.hint}</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-xl border border-line p-4">
          <p className="text-sm">Állapot: <b className={live ? "text-good" : "text-warn"}>{live ? "Elérhető – rendelhető" : "Egyeztetés alatt / hamarosan"}</b></p>
          <p className="mt-1 text-xs text-muted">{live ? `Ár: csomagár + ${formatHuf(artist.surchargeHuf)}. Hangmodell: ${artist.voiceModelId}` : "Amíg nem elérhető, a weboldalon név és fotó nélkül, „Titkos vendég” kártyán jelenik meg."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!live ? (
              <button type="button" className="btn-primary !py-2 text-sm" disabled={!ready || busy} onClick={() => save({ availability: "available", active: true })} title={ready ? "" : "Előbb licenc és aktív hangmodell kell"}>
                Elérhetővé tétel
              </button>
            ) : (
              <button type="button" className="btn-ghost !py-2 text-sm" disabled={busy} onClick={() => confirm("Visszaállítod „egyeztetés alatt” állapotba? A weboldalon név nélkül jelenik meg, és nem rendelhető.") && save({ availability: "coming_soon" })}>
                Visszaállítás „hamarosan” állapotba
              </button>
            )}
          </div>
          {!ready && !live && <p className="mt-2 text-xs text-muted">Az „Elérhetővé tétel” a licenc és az aktív hangmodell után kapcsol be.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Adatok és ár</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {input("name", "Név (élesítés után nyilvános)")}
          {input("slug", "URL-azonosító", { placeholder: "pl. dogos-robi" })}
          <div>
            <label htmlFor="al-kind" className="mb-1 block text-xs font-bold">Típus</label>
            <select id="al-kind" className="field !py-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Artist["kind"] })}>
              <option value="celebrity">Ismert előadó (licenc, „Hivatalos hang”)</option>
              <option value="house">Saját hang</option>
            </select>
          </div>
          {input("licenseSignedAt", "Licenc / hozzájárulás aláírva", { type: "date" })}
          {input("surchargeHuf", "Előadói felár (Ft) – ennyit ad a dalért a csomagáron felül", { type: "number", min: 0, step: 500 })}
          {input("royaltyPercent", "Jogdíj az előadónak (%)", { type: "number", min: 0, max: 100 })}
          <div className="sm:col-span-2">{input("tagline", "Szlogen")}</div>
          <div className="sm:col-span-2">
            <label htmlFor="al-bio" className="mb-1 block text-xs font-bold">Bemutatkozás</label>
            <textarea id="al-bio" className="field text-sm" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted">
          Az ügyfél fizet: <b className="text-ink">csomagár + {formatHuf(Number(f.surchargeHuf) || 0)}</b> (pl. Holnapra csomaggal). Az előadói felár minden rendelésnél automatikusan hozzáadódik, ha őt választják.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className="btn-primary !py-2 text-sm" disabled={busy} onClick={() => save()}>{busy ? "Mentés…" : "Mentés"}</button>
          {msg && <span className={`text-sm font-semibold ${msg.ok ? "text-good" : "text-crit"}`} role="status">{msg.text}</span>}
        </div>
      </section>
    </div>
  );
}
