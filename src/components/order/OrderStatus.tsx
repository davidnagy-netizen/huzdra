"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CUSTOMER_STEPS } from "@/lib/pipeline/state-machine";
import { formatHuf } from "@/lib/pricing";
import { CheckIcon } from "../icons";

interface StatusDto {
  code: string;
  status: string;
  statusLabel: string;
  stepIndex: number;
  recipientName: string;
  artistName: string;
  totalHuf: number;
  dueAt: string;
  songUrl: string | null;
  events: { at: string; status: string; label: string }[];
}

const fmt = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function OrderStatus({ code, statusKey, fresh }: { code: string; statusKey: string; fresh: boolean }) {
  const [s, setS] = useState<StatusDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/status?code=${encodeURIComponent(code)}&k=${encodeURIComponent(statusKey)}`, { cache: "no-store" });
        if (!res.ok) {
          setErr("Nem találjuk ezt a rendelést. Ellenőrizd a linket, vagy keresd meg a rendelésszám alapján.");
          return;
        }
        const j = (await res.json()) as StatusDto;
        if (stop) return;
        setS(j);
        if (!["delivered", "done", "cancelled", "moderation_hold"].includes(j.status)) timer = setTimeout(load, 2000);
      } catch {
        timer = setTimeout(load, 4000);
      }
    };
    load();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [code, statusKey]);

  if (err) {
    return (
      <div className="card p-6 text-center">
        <p>{err}</p>
        <Link href="/rendelesem" className="btn-primary mt-4">Rendelés keresése</Link>
      </div>
    );
  }
  if (!s) return <div className="card h-64 animate-pulse" aria-busy="true" aria-label="Betöltés" />;

  const done = s.stepIndex >= 4;
  return (
    <div className="space-y-6">
      {fresh && (
        <div className="card border-gold/50 bg-gold/10 p-5 text-center" role="status">
          <p className="text-3xl" aria-hidden>🎉</p>
          <h2 className="mt-1 font-display text-2xl font-bold">Megkaptuk! Indul a zenekar.</h2>
          <p className="mt-1 text-muted">Visszaigazolást küldtünk e-mailben. A kártyádat csak rögzítettük – terhelés akkor lesz, ha kész a dal.</p>
        </div>
      )}
      <div className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{s.recipientName} dala</h2>
          <span className="text-sm text-muted">Rendelésszám: <b className="text-ink">{s.code}</b></span>
        </div>
        <p className="text-muted">{s.artistName} · {formatHuf(s.totalHuf)} · határidő: {fmt.format(new Date(s.dueAt))}</p>

        <ol className="mt-6 space-y-4" aria-label="A dal készülése">
          {CUSTOMER_STEPS.map((st, i) => {
            const state = i < s.stepIndex || done ? "done" : i === s.stepIndex ? "active" : "todo";
            return (
              <li key={st.key} className="flex items-center gap-3" aria-current={state === "active" ? "step" : undefined}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${state === "done" ? "bg-gold text-on-gold" : state === "active" ? "border-2 border-gold text-gold" : "border border-line text-muted"}`}>
                  {state === "done" ? <CheckIcon size={18} strokeWidth={3} /> : state === "active" ? <span className="eq" aria-hidden><span /><span /><span /></span> : i + 1}
                </span>
                <span className={state === "todo" ? "text-muted" : "font-semibold"}>{st.label}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 rounded-xl bg-surface-2 p-3 text-sm" aria-live="polite">Állapot: <b>{s.statusLabel}</b></p>
        {s.status === "moderation_hold" && (
          <p className="mt-3 text-sm text-muted">A történetedben volt valami, amit a munkatársunk szeretne átnézni, mielőtt elkészül a dal. Hamarosan jelentkezünk e-mailben.</p>
        )}
        {s.songUrl && (
          <div className="mt-6 text-center">
            <Link href={s.songUrl} className="btn-primary px-8 py-4 text-lg">Meghallgatom a dalt 🎻</Link>
            <p className="mt-2 text-xs text-muted">Demó mód: élesben ezt a linket e-mailben kapod meg.</p>
          </div>
        )}
      </div>
      <details className="card p-5 text-sm">
        <summary className="cursor-pointer font-semibold">Részletes napló</summary>
        <ul className="mt-3 space-y-1 text-muted">
          {s.events.map((e, i) => (
            <li key={i}>{fmt.format(new Date(e.at))} – {e.label}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
