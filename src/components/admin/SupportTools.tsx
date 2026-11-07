"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SupportSimulator({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultEmail);
  const [msg, setMsg] = useState("Sziasztok! Rossz névre rendeltem, nem Zsófi hanem Zsófia a helyes.");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<string | null>(null);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await fetch("/api/admin/support/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromEmail: from, message: msg, subject: "Teszt" }) });
        const j = await r.json();
        setBusy(false);
        setRes(r.ok ? "Beküldve – pár másodperc múlva frissítsd a listát." : j.error);
        setTimeout(() => router.refresh(), 1500);
      }}
    >
      <input className="field !py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="feladó e-mail" aria-label="Feladó" />
      <textarea className="field text-sm" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Üzenet" />
      <div className="flex items-center gap-3">
        <button className="btn-primary !py-2 text-sm" disabled={busy}>{busy ? "…" : "Teszt üzenet beküldése"}</button>
        {res && <span className="text-xs text-muted">{res}</span>}
      </div>
    </form>
  );
}

export function TicketReply({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (close: boolean) => {
    setBusy(true);
    await fetch(`/api/admin/tickets/${ticketId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reply: text, close }) });
    setBusy(false);
    setText("");
    router.refresh();
  };
  return (
    <div className="space-y-2">
      <textarea className="field text-sm" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Válasz az ügyfélnek (e-mailben megy ki)…" aria-label="Válasz" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2 text-sm" disabled={busy || !text.trim()} onClick={() => send(false)}>Válasz küldése</button>
        <button type="button" className="btn-ghost !py-2 text-sm" disabled={busy} onClick={() => send(true)}>{text.trim() ? "Küldés és lezárás" : "Lezárás válasz nélkül"}</button>
      </div>
    </div>
  );
}
