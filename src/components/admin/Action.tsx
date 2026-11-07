"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Általános admin-művelet gomb: JSON POST, opcionális megerősítés, majd frissítés. */
export function ActionButton({
  url,
  body,
  label,
  confirm,
  variant = "ghost",
  method = "POST",
  className = "",
  onDone,
}: {
  url: string;
  body?: unknown;
  label: string;
  confirm?: string;
  variant?: "primary" | "ghost" | "danger";
  method?: "POST" | "PUT" | "DELETE";
  className?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cls =
    variant === "primary" ? "btn-primary !py-2 text-sm" : variant === "danger" ? "btn-ghost !py-2 text-sm !border-crit/50 !text-crit" : "btn-ghost !py-2 text-sm";
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={busy}
        className={`${cls} ${className}`}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setErr(null);
          const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
          const j = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) return setErr(j.error ?? "Hiba");
          onDone?.();
          router.refresh();
        }}
      >
        {busy ? "…" : label}
      </button>
      {err && <span className="mt-1 text-xs font-semibold text-crit" role="alert">{err}</span>}
    </span>
  );
}

/** Szövegmezős művelet (pl. megjegyzés, újragenerálási utasítás, névjavítás). */
export function PromptAction({ url, action, field, label, placeholder, extra, multiline }: { url: string; action: string; field: string; label: string; placeholder?: string; extra?: Record<string, unknown>; multiline?: boolean }) {
  const router = useRouter();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, [field]: v, ...extra }) });
        const j = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setErr(j.error ?? "Hiba");
        setV("");
        router.refresh();
      }}
    >
      {multiline ? (
        <textarea className="field !py-2 text-sm" rows={2} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={label} />
      ) : (
        <input className="field !py-2 text-sm" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={label} />
      )}
      <button className="btn-ghost shrink-0 !py-2 text-sm" disabled={busy || !v.trim()}>{busy ? "…" : label}</button>
      {err && <span className="text-xs font-semibold text-crit" role="alert">{err}</span>}
    </form>
  );
}
