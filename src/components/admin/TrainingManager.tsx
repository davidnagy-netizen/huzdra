"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { analyzeAudio } from "@/lib/audio-analysis";
import type { Style, TrainingJob, TrainingSample } from "@/lib/types";

const INSTRUMENTS = ["hegedű", "cimbalom", "harmonika", "szintetizátor", "dob", "basszus", "gitár", "ének", "taps"];
const MOODS = ["vidám", "pörgős", "megható", "ünnepélyes", "érzelmes", "táncos"];

interface Pending {
  file: File;
  title: string;
  bpm: string;
  musicalKey: string;
  durationSec: number | null;
  state: "elemzés" | "kész" | "feltöltés" | "hiba" | "feltöltve";
  error?: string;
  progress?: number;
}

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Feltöltési hiba (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Hálózati hiba a feltöltésnél"));
    xhr.send(file);
  });
}

export function TrainingManager({ samples, jobs, styles }: { samples: TrainingSample[]; jobs: TrainingJob[]; styles: Style[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending[]>([]);
  const [meta, setMeta] = useState({ styleIds: [] as string[], instruments: [] as string[], mood: "", notes: "", rights: false, rightsNote: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [jobName, setJobName] = useState("");
  const [jobStyles, setJobStyles] = useState<string[]>([]);
  const styleName = useMemo(() => Object.fromEntries(styles.map((s) => [s.id, s.label])), [styles]);

  // futó tanításnál automatikus frissítés
  useEffect(() => {
    if (!jobs.some((j) => j.status === "queued" || j.status === "running")) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [jobs, router]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const list = [...files].filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a)$/i.test(f.name));
    const items: Pending[] = list.map((f) => ({ file: f, title: f.name.replace(/\.[^.]+$/, ""), bpm: "", musicalKey: "", durationSec: null, state: "elemzés" }));
    setPending((p) => [...p, ...items]);
    items.forEach(async (it) => {
      try {
        const a = await analyzeAudio(it.file);
        setPending((p) => p.map((x) => (x.file === it.file ? { ...x, bpm: a.bpm ? String(a.bpm) : "", musicalKey: a.musicalKey ?? "", durationSec: a.durationSec, state: "kész" } : x)));
      } catch {
        setPending((p) => p.map((x) => (x.file === it.file ? { ...x, state: "kész" } : x)));
      }
    });
  };

  const upload = async () => {
    if (!meta.rights) return setMsg({ ok: false, text: "Erősítsd meg a jogtisztaságot a feltöltés előtt." });
    setBusy(true);
    setMsg(null);
    let ok = 0;
    for (const it of pending.filter((x) => x.state === "kész" || x.state === "hiba")) {
      const set = (patch: Partial<Pending>) => setPending((p) => p.map((x) => (x.file === it.file ? { ...x, ...patch } : x)));
      try {
        set({ state: "feltöltés", progress: 0, error: undefined });
        const mime = it.file.type || (it.file.name.endsWith(".wav") ? "audio/wav" : "audio/mpeg");
        const t = await fetch("/api/admin/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bucket: "training", fileName: it.file.name, mimeType: mime, size: it.file.size }) });
        const tj = await t.json();
        if (!t.ok) throw new Error(tj.error);
        await putWithProgress(tj.target.url, it.file, tj.target.headers, (progress) => set({ progress }));
        const r = await fetch("/api/admin/training/samples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: tj.storagePath, fileName: it.file.name, mimeType: mime, sizeBytes: it.file.size, title: it.title,
            durationSec: it.durationSec, bpm: it.bpm, musicalKey: it.musicalKey, styleIds: meta.styleIds, instruments: meta.instruments,
            mood: meta.mood, notes: meta.notes, rightsConfirmed: true, rightsNote: meta.rightsNote,
          }),
        });
        const rj = await r.json();
        if (!r.ok) throw new Error(rj.error);
        set({ state: "feltöltve", progress: 100 });
        ok++;
      } catch (err) {
        set({ state: "hiba", error: err instanceof Error ? err.message : String(err) });
      }
    }
    setBusy(false);
    setMsg({ ok: true, text: `${ok} fájl feltöltve.` });
    setPending((p) => p.filter((x) => x.state !== "feltöltve"));
    router.refresh();
  };

  const chip = (on: boolean, label: string, onClick: () => void) => (
    <button key={label} type="button" className="chip !py-1 !text-xs" aria-pressed={on} onClick={onClick}>{label}</button>
  );
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Zeneminták feltöltése</h2>
        <p className="mb-4 text-sm text-muted">Ezekből tanul a zenegeneráló modell (ritmus, hangnem, hangszerelés, hangulat). A fájl közvetlenül a tárhelyre megy; a tempót és a hangnemet a böngésző méri meg – javíthatod.</p>
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line p-8 text-center hover:border-gold"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <span className="text-3xl" aria-hidden>♫</span>
          <span className="mt-2 font-semibold">Húzd ide a hangfájlokat, vagy kattints a tallózáshoz</span>
          <span className="text-xs text-muted">MP3, WAV, FLAC, OGG, M4A · max. 200 MB / fájl</span>
          <input type="file" accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        </label>

        {pending.length > 0 && (
          <div className="mt-4 space-y-4">
            <ul className="space-y-2">
              {pending.map((p, i) => (
                <li key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_90px_120px_auto] sm:items-center">
                  <input className="field !py-1.5 text-sm" value={p.title} onChange={(e) => setPending((x) => x.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} aria-label="Cím" />
                  <input className="field !py-1.5 text-sm" value={p.bpm} placeholder="BPM" onChange={(e) => setPending((x) => x.map((y, j) => (j === i ? { ...y, bpm: e.target.value } : y)))} aria-label="Tempó (BPM)" />
                  <input className="field !py-1.5 text-sm" value={p.musicalKey} placeholder="hangnem" onChange={(e) => setPending((x) => x.map((y, j) => (j === i ? { ...y, musicalKey: e.target.value } : y)))} aria-label="Hangnem" />
                  <span className={`text-xs font-semibold ${p.state === "hiba" ? "text-crit" : "text-muted"}`}>
                    {p.state === "feltöltés" ? `feltöltés ${p.progress ?? 0}%` : p.state}{p.durationSec ? ` · ${p.durationSec} mp` : ""}{p.error ? ` – ${p.error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 lg:grid-cols-2">
              <div><p className="mb-1 text-xs font-bold text-muted">Stílus (mind a feltöltött fájlra)</p><div className="flex flex-wrap gap-1.5">{styles.map((s) => chip(meta.styleIds.includes(s.id), s.label, () => setMeta({ ...meta, styleIds: toggle(meta.styleIds, s.id) })))}</div></div>
              <div><p className="mb-1 text-xs font-bold text-muted">Hangszerek</p><div className="flex flex-wrap gap-1.5">{INSTRUMENTS.map((x) => chip(meta.instruments.includes(x), x, () => setMeta({ ...meta, instruments: toggle(meta.instruments, x) })))}</div></div>
              <div><p className="mb-1 text-xs font-bold text-muted">Hangulat</p><div className="flex flex-wrap gap-1.5">{MOODS.map((x) => chip(meta.mood === x, x, () => setMeta({ ...meta, mood: meta.mood === x ? "" : x })))}</div></div>
              <input className="field !py-2 text-sm" placeholder="Megjegyzés (pl. lakodalmi nyitótánc, élő felvétel)" value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} aria-label="Megjegyzés" />
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--gold)]" checked={meta.rights} onChange={(e) => setMeta({ ...meta, rights: e.target.checked })} />
              <span>Megerősítem, hogy ezek a felvételek <b>saját felvételeink vagy licenceltek</b>, és felhasználhatók a zenegeneráló modell tanítására.</span>
            </label>
            {meta.rights && <input className="field !py-2 text-sm" placeholder="Forrás / licenc (pl. saját stúdiófelvétel, 2026.10.)" value={meta.rightsNote} onChange={(e) => setMeta({ ...meta, rightsNote: e.target.value })} aria-label="Licenc megjegyzés" />}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary !py-2 text-sm" disabled={busy || pending.some((p) => p.state === "elemzés")} onClick={upload}>{busy ? "Feltöltés…" : `${pending.length} fájl feltöltése`}</button>
              <button type="button" className="btn-ghost !py-2 text-sm" disabled={busy} onClick={() => setPending([])}>Mégse</button>
            </div>
          </div>
        )}
        {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-good" : "text-crit"}`} role="status">{msg.text}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Zenetár ({samples.length})</h2>
          <span className="text-xs text-muted">{selected.length} kiválasztva</span>
        </div>
        {samples.length === 0 ? (
          <p className="text-sm text-muted">Még nincs feltöltött zeneminta.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2"><input type="checkbox" aria-label="Mind" checked={selected.length === samples.filter((s) => s.status !== "archived").length && selected.length > 0} onChange={(e) => setSelected(e.target.checked ? samples.filter((s) => s.status !== "archived").map((s) => s.id) : [])} /></th>
                  <th className="py-2">Cím</th><th className="py-2">Meghallgatás</th><th className="py-2">Tempó</th><th className="py-2">Hangnem</th><th className="py-2">Stílus / hangszer</th><th className="py-2">Állapot</th><th className="py-2 pr-5" />
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-5 py-2"><input type="checkbox" aria-label={`Kiválaszt: ${s.title}`} disabled={s.status === "archived"} checked={selected.includes(s.id)} onChange={() => setSelected(toggle(selected, s.id))} /></td>
                    <td className="py-2"><b>{s.title}</b><div className="text-xs text-muted">{s.fileName} · {(s.sizeBytes / 1048576).toFixed(1)} MB{s.durationSec ? ` · ${s.durationSec} mp` : ""}</div></td>
                    <td className="py-2"><audio controls preload="none" src={`/api/admin/training/samples/${s.id}/play`} className="h-8 w-56" /></td>
                    <td className="py-2 tabular-nums">{s.bpm ?? "–"}</td>
                    <td className="py-2">{s.musicalKey ?? "–"}</td>
                    <td className="py-2 text-xs text-muted">{[...s.styleIds.map((x) => styleName[x] ?? x), ...s.instruments].join(", ") || "–"}{s.mood ? ` · ${s.mood}` : ""}</td>
                    <td className="py-2 text-xs">{s.status === "in_training" ? "tanítás alatt" : s.status === "archived" ? "archivált" : "kész"}</td>
                    <td className="py-2 pr-5 text-right">
                      <button type="button" className="text-xs text-muted hover:text-ink" onClick={async () => { await fetch(`/api/admin/training/samples/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s.status === "archived" ? "uploaded" : "archived" }) }); router.refresh(); }}>{s.status === "archived" ? "Visszaállítás" : "Archiválás"}</button>
                      {" · "}
                      <button type="button" className="text-xs text-crit" onClick={async () => { if (!confirm(`Törlöd: ${s.title}? A fájl is törlődik.`)) return; const r = await fetch(`/api/admin/training/samples/${s.id}`, { method: "DELETE" }); if (!r.ok) alert((await r.json()).error); router.refresh(); }}>Törlés</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-line p-4">
          <h3 className="font-bold">Tanítás indítása a kiválasztott mintákból</h3>
          <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_auto]">
            <input className="field !py-2 text-sm" placeholder="Modell neve (pl. Lakodalmas v1)" value={jobName} onChange={(e) => setJobName(e.target.value)} aria-label="Modell neve" />
            <button
              type="button"
              className="btn-primary !py-2 text-sm"
              disabled={!selected.length}
              onClick={async () => {
                const r = await fetch("/api/admin/training/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: jobName, sampleIds: selected, styleIds: jobStyles }) });
                const j = await r.json();
                if (!r.ok) return setMsg({ ok: false, text: j.error });
                setSelected([]); setJobName(""); setMsg({ ok: true, text: "A tanítás elindult." }); router.refresh();
              }}
            >
              Tanítás indítása ({selected.length} minta)
            </button>
          </div>
          <p className="mb-1 mt-3 text-xs font-bold text-muted">Mely stílusokban generáljon ez a modell? (üres = mind)</p>
          <div className="flex flex-wrap gap-1.5">{styles.map((s) => chip(jobStyles.includes(s.id), s.label, () => setJobStyles(toggle(jobStyles, s.id))))}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Modellek / tanítások</h2>
        {jobs.length === 0 ? <p className="text-sm text-muted">Még nem volt tanítás.</p> : (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><b>{j.name}</b> <span className="text-xs text-muted">· {j.sampleIds.length} minta · {j.styleIds.length ? j.styleIds.map((x) => styleName[x] ?? x).join(", ") : "minden stílus"} · {j.provider}</span></span>
                  <span className="flex items-center gap-2 text-sm">
                    {j.status === "succeeded" ? (
                      <>
                        <span className="text-xs text-muted">{j.modelId}</span>
                        <button type="button" className={j.active ? "btn-primary !py-1.5 text-xs" : "btn-ghost !py-1.5 text-xs"} onClick={async () => { await fetch(`/api/admin/training/jobs/${j.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !j.active }) }); router.refresh(); }}>
                          {j.active ? "✓ Aktív – ez generál" : "Aktiválás"}
                        </button>
                      </>
                    ) : j.status === "failed" ? <span className="text-xs font-semibold text-crit">Sikertelen: {j.error}</span> : <span className="text-xs text-muted">{j.status === "queued" ? "Sorban áll…" : `Tanítás… ${j.progress}%`}</span>}
                  </span>
                </div>
                {(j.status === "queued" || j.status === "running") && (
                  <div className="mt-2 h-2 rounded-full bg-line/50" role="progressbar" aria-valuenow={j.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-chart-1 transition-all" style={{ width: `${j.progress}%` }} /></div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
