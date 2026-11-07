"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const j = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setErr(j.error ?? "Sikertelen belépés");
        router.push("/admin");
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="em" className="mb-1 block text-sm font-bold">E-mail</label>
        <input id="em" type="email" required autoComplete="username" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="pw" className="mb-1 block text-sm font-bold">Jelszó</label>
        <input id="pw" type="password" required autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p className="text-sm font-semibold text-crit" role="alert">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Belépés…" : "Belépés"}</button>
    </form>
  );
}
