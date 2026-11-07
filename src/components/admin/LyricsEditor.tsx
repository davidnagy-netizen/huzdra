"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LyricsEditor({ orderId, title, text }: { orderId: string; title: string; text: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState(title);
  const [x, setX] = useState(text);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!edit) {
    return (
      <div>
        <p className="font-display text-lg font-bold">{title}</p>
        <pre className="mt-2 max-h-[28rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</pre>
        <button type="button" className="btn-ghost mt-3 !py-2 text-sm" onClick={() => setEdit(true)}>Szöveg szerkesztése</button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <input className="field !py-2 font-bold" value={t} onChange={(e) => setT(e.target.value)} aria-label="Cím" />
      <textarea className="field font-mono text-sm" rows={18} value={x} onChange={(e) => setX(e.target.value)} aria-label="Dalszöveg" />
      <p className="text-xs text-muted">Mentés után a hang automatikusan újragenerálódik a javított szöveggel.</p>
      {err && <p className="text-sm font-semibold text-crit" role="alert">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary !py-2 text-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch(`/api/admin/orders/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_lyrics", title: t, text: x }) });
            const j = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) return setErr(j.error ?? "Hiba");
            setEdit(false);
            router.refresh();
          }}
        >
          {busy ? "Mentés…" : "Mentés és hang újragenerálása"}
        </button>
        <button type="button" className="btn-ghost !py-2 text-sm" onClick={() => setEdit(false)}>Mégse</button>
      </div>
    </div>
  );
}
