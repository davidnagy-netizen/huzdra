"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EntityDef, FieldDef } from "@/lib/admin-entities";
import { formatHuf } from "@/lib/pricing";

type Row = Record<string, unknown>;
type Options = Record<string, { value: string; label: string }[]>;

function display(f: FieldDef | undefined, v: unknown, options: Options) {
  if (v == null || v === "") return <span className="text-muted">–</span>;
  if (!f) return String(v);
  if (f.type === "bool") return v ? "✓" : <span className="text-muted">–</span>;
  if (f.type === "number" && /Huf$/.test(f.name)) return formatHuf(Number(v));
  if (f.type === "select" && f.options) return options[f.options]?.find((o) => o.value === v)?.label ?? String(v);
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function CrudManager({ def, rows, options, rowLink }: { def: EntityDef; rows: Row[]; options: Options; rowLink?: { base: string; label: string } }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ key: string | null; row: Row } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fieldOf = (n: string) => def.fields.find((f) => f.name === n);

  const blank = (): Row => Object.fromEntries(def.fields.map((f) => [f.name, f.type === "bool" ? f.name === "active" || f.name === "published" : f.type === "multiselect" || f.type === "lines" ? [] : ""]));

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setErrors({});
    const res = await fetch(`/api/admin/crud/${def.entity}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: editing.key, row: editing.row }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrors(j.errors ?? {});
      setMsg(j.error ?? "Hiba");
      return;
    }
    setMsg("Mentve.");
    setEditing(null);
    router.refresh();
  };

  const uploadAudio = async (file: File, name: string) => {
    setMsg("Feltöltés…");
    const t = await fetch("/api/admin/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bucket: "samples", fileName: file.name, mimeType: file.type || "audio/mpeg", size: file.size }) });
    const tj = await t.json();
    if (!t.ok) return setMsg(tj.error);
    const put = await fetch(tj.target.url, { method: "PUT", headers: tj.target.headers, body: file });
    if (!put.ok) return setMsg(`Feltöltési hiba (${put.status})`);
    setEditing((e) => (e ? { ...e, row: { ...e.row, [name]: `storage:${tj.storagePath}` } } : e));
    setMsg("Hangfájl feltöltve – ne felejtsd el menteni.");
  };

  const input = (f: FieldDef) => {
    const v = editing!.row[f.name];
    const set = (val: unknown) => setEditing((e) => (e ? { ...e, row: { ...e.row, [f.name]: val } } : e));
    const disabled = f.createOnly && editing!.key !== null;
    const id = `f-${f.name}`;
    let control: React.ReactNode;
    switch (f.type) {
      case "textarea":
        control = <textarea id={id} className="field text-sm" rows={4} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />;
        break;
      case "bool":
        control = <input id={id} type="checkbox" className="h-5 w-5 accent-[var(--gold)]" checked={!!v} onChange={(e) => set(e.target.checked)} />;
        break;
      case "number":
        control = <input id={id} type="number" className="field !py-2 text-sm" value={v == null ? "" : String(v)} min={f.min} max={f.max} onChange={(e) => set(e.target.value)} />;
        break;
      case "date":
        control = <input id={id} type="date" className="field !py-2 text-sm" value={String(v ?? "").slice(0, 10)} onChange={(e) => set(e.target.value)} />;
        break;
      case "select":
        control = (
          <select id={id} className="field !py-2 text-sm" value={String(v ?? "")} disabled={disabled} onChange={(e) => set(e.target.value)}>
            <option value="">–</option>
            {(options[f.options ?? ""] ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
        break;
      case "multiselect": {
        const arr = Array.isArray(v) ? (v as string[]) : [];
        control = (
          <div className="flex flex-wrap gap-1.5">
            {(options[f.options ?? ""] ?? []).map((o) => (
              <button key={o.value} type="button" className="chip !py-1 !text-xs" aria-pressed={arr.includes(o.value)} onClick={() => set(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value])}>{o.label}</button>
            ))}
          </div>
        );
        break;
      }
      case "lines":
        control = <textarea id={id} className="field text-sm" rows={2} value={Array.isArray(v) ? (v as string[]).join("\n") : String(v ?? "")} onChange={(e) => set(e.target.value)} />;
        break;
      case "audio":
        control = (
          <div className="space-y-2">
            <p className="text-xs text-muted">{String(v ?? "") ? (String(v).startsWith("storage:") ? "Feltöltött hangfájl" : "Generált helykitöltő") : "–"}</p>
            <input type="file" accept="audio/*" className="text-sm" onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0], f.name)} aria-label="Hangfájl feltöltése" />
          </div>
        );
        break;
      default:
        control = <input id={id} className="field !py-2 text-sm" value={String(v ?? "")} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    }
    return (
      <div key={f.name} className={f.type === "textarea" || f.type === "multiselect" ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className="mb-1 block text-xs font-bold">{f.label}{f.required ? " *" : ""}</label>
        {control}
        {f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}
        {errors[f.name] && <p className="mt-1 text-xs font-semibold text-crit" role="alert">{errors[f.name]}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {def.help && <p className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm">{def.help}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{rows.length} tétel</span>
        <button type="button" className="btn-primary !py-2 text-sm" onClick={() => { setEditing({ key: null, row: blank() }); setErrors({}); setMsg(null); }}>+ Új {def.singular}</button>
      </div>
      {msg && <p className="text-sm font-semibold text-muted" role="status">{msg}</p>}

      {editing && (
        <section className="rounded-2xl border border-gold/50 bg-surface p-5">
          <h2 className="mb-4 font-display text-xl font-bold">{editing.key ? `Szerkesztés: ${String(editing.row.name ?? editing.row.title ?? editing.row.question ?? editing.key)}` : `Új ${def.singular}`}</h2>
          <div className="grid gap-4 sm:grid-cols-2">{def.fields.map(input)}</div>
          <div className="mt-5 flex gap-2">
            <button type="button" className="btn-primary !py-2 text-sm" disabled={busy} onClick={save}>{busy ? "Mentés…" : "Mentés"}</button>
            <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => setEditing(null)}>Mégse</button>
          </div>
        </section>
      )}

      <div className="-mx-1 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>{def.columns.map((c) => <th key={c} className="px-4 py-2">{fieldOf(c)?.label ?? c}</th>)}<th className="px-4 py-2" /></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const key = String(r[def.key]);
              return (
                <tr key={key} className="border-t border-line hover:bg-surface-2">
                  {def.columns.map((c) => <td key={c} className="px-4 py-2.5">{display(fieldOf(c), r[c], options)}</td>)}
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    {rowLink && <><a href={`${rowLink.base}${encodeURIComponent(key)}`} className="text-sm font-bold text-gold">{rowLink.label}</a>{" · "}</>}
                    <button type="button" className="text-sm font-semibold text-gold" onClick={() => { setEditing({ key, row: { ...blank(), ...r } }); setErrors({}); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Szerkesztés</button>
                    {" · "}
                    <button type="button" className="text-sm text-crit" onClick={async () => { if (!confirm("Biztosan törlöd?")) return; const res = await fetch(`/api/admin/crud/${def.entity}?key=${encodeURIComponent(key)}`, { method: "DELETE" }); const j = await res.json().catch(() => ({})); if (!res.ok) setMsg(j.error ?? "Hiba"); router.refresh(); }}>Törlés</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
