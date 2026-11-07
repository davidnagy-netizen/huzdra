"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Settings } from "@/lib/types";

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const toggle = (k: keyof Settings, label: string, help: string) => (
    <label className="flex items-start gap-3 border-t border-line py-3 first:border-0">
      <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--gold)]" checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
      <span><b>{label}</b><span className="block text-sm text-muted">{help}</span></span>
    </label>
  );
  const num = (k: keyof Settings, label: string, help: string, step = 1) => (
    <label className="block border-t border-line py-3">
      <b>{label}</b><span className="block text-sm text-muted">{help}</span>
      <input type="number" step={step} className="field mt-2 !w-40 !py-2" value={Number(s[k])} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
    </label>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
        setMsg(res.ok ? "Mentve." : "Hiba a mentésnél.");
        router.refresh();
      }}
    >
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Automatizálás</h2>
        {toggle("autoQc", "Automatikus minőségellenőrzés", "Ha a név szerepel a szövegben, nincs tiltott téma, a tartalomszűrő zöld és a hangfájl elkészült, a dal emberi QC nélkül kimegy és a kártya terhelődik.")}
        {toggle("autoSupport", "Automatikus ügyfélszolgálat", "A felismert kéréseket (névjavítás, kiejtés, javítási kör, állapot) a rendszer magától intézi. Pénzügyi kérés mindig emberhez kerül.")}
        {num("supportConfidence", "Szupport magabiztossági küszöb (0,5–1)", "E fölött cselekszik automatikusan; alatta visszakérdez vagy emberhez küldi.", 0.05)}
        {toggle("freeNameFixes", "Ingyenes névjavítás", "A névjavítás nem fogy a 2 ingyenes javítási körből.")}
        {toggle("autoArtistApproval", "Automatikus előadói jóváhagyás", "Amíg nincs előadói portál, a jóváhagyást igénylő előadók szövegei automatikusan mennek tovább. Kikapcsolva az admin QC-soron kell jóváhagyni.")}
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Hirdetési előnézet (/probald)</h2>
        {toggle("previewEnabled", "Előnézet engedélyezve", "A hirdetési oldalon a látogatók ingyenes előnézetet generálhatnak.")}
        {num("previewSeconds", "Előnézet hossza (mp)", "8–30 másodperc.")}
        {num("previewHourlyLimit", "Előnézetek / óra / eszköz", "Visszaélés és költség elleni korlát.")}
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Weboldal</h2>
        {num("happyFamiliesBaseline", "„Boldog családok” kezdőérték", "A főoldali számláló = ez + a kézbesített rendelések száma. Élesben valós számot adj meg.")}
      </section>
      <div className="flex items-center gap-3">
        <button className="btn-primary">Mentés</button>
        {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
      </div>
    </form>
  );
}
