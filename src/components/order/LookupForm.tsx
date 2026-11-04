"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextField } from "../wizard/fields";

export function LookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card mt-6 space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, email }) });
        const j = await res.json();
        setBusy(false);
        if (!res.ok) return setErr(j.error);
        router.push(`/rendelesem/${j.code}?k=${j.statusKey}`);
      }}
    >
      <TextField label="Rendelésszám" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="HZ-XXXXXX" required autoComplete="off" />
      <TextField label="E-mail-cím" type="email" value={email} onChange={setEmail} required autoComplete="email" />
      {err && <p className="text-sm font-semibold text-red" role="alert">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Keresés…" : "Mutasd a dalomat"}</button>
    </form>
  );
}
