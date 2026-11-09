"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import type { Catalog } from "@/lib/catalog";
import { calculatePrice, formatHuf, formatSurcharge } from "@/lib/pricing";
import type { PackageId, WizardData } from "@/lib/types";
import { EMPTY_WIZARD } from "@/lib/wizard-schema";
import { ArtistPortrait } from "../ArtistPortrait";
import { useAudio } from "../audio/AudioProvider";
import { toTracks } from "../audio/FeaturedPlayer";
import { CheckIcon, PauseIcon, PlayIcon, ShieldIcon } from "../icons";

const RELATIONS = ["feleség", "férj", "anya", "apa", "nagymama", "nagypapa", "barát", "barátnő", "testvér", "keresztlány", "keresztfiú", "kolléga"];
const MOODS = [
  { id: "vicces", label: "😄 Vicces" },
  { id: "meghato", label: "🥹 Megható" },
  { id: "unnepelyes", label: "🥂 Ünnepélyes" },
];
const LOADING = ["Hangolja a hegedűt…", "Írja a versszakot…", "Rímet keres a nevére…", "Felveszi a refrént…", "Utolsó simítások…"];
const SS_KEY = "huzdra:preview:v1";

interface PreviewDto {
  id: string;
  token?: string;
  status: "generating" | "ready" | "blocked" | "failed";
  title: string | null;
  lyricsVisible: string | null;
  lyricsHiddenLines: number;
  audioUrl: string | null;
  recipientName: string;
  artistId: string;
  purchased: boolean;
}

export function PreviewFunnel({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const audio = useAudio();
  const [form, setForm] = useState({ artistId: catalog.artists[0]?.id ?? "", occasionId: "", recipientName: "", nickname: "", relation: "", mood: "vicces", memories: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewDto | null>(null);
  const [token, setToken] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [sending, setSending] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // visszatöltés (pl. frissítés után)
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SS_KEY) ?? "null");
      if (s?.id && s?.token) {
        setToken(s.token);
        setForm((f) => ({ ...f, ...s.form }));
        setPreview({ id: s.id, status: "generating", title: null, lyricsVisible: null, lyricsHiddenLines: 0, audioUrl: null, recipientName: s.form?.recipientName ?? "", artistId: s.form?.artistId ?? "", purchased: false });
      }
    } catch {}
  }, []);

  // állapot-lekérdezés generálás közben
  useEffect(() => {
    if (!preview || preview.status !== "generating" || !token) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/previews/${preview.id}?t=${token}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as PreviewDto;
      if (j.status !== "generating") {
        setPreview(j);
        if (j.status === "ready") {
          track("preview_ready", { artist: j.artistId });
          requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
      }
    }, 1200);
    const l = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING.length), 1800);
    return () => { clearInterval(t); clearInterval(l); };
  }, [preview, token]);

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const generate = async () => {
    const e: Record<string, string> = {};
    if (!form.occasionId) e.occasionId = "Válassz alkalmat.";
    if (form.recipientName.trim().length < 2) e.recipientName = "Kinek szól a dal?";
    if (!form.relation) e.relation = "Ki ő neked?";
    if (form.memories.trim().length < 40) e.memories = "Írj 1–2 mondatot (legalább 40 karakter).";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setTopError(null);
    track("preview_start", { artist: form.artistId, occasion: form.occasionId });
    const r = await fetch("/api/previews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    setSending(false);
    if (!r.ok) {
      if (j.field) setErrors({ [j.field]: j.error });
      else setTopError(j.error);
      return;
    }
    setToken(j.token);
    setPreview(j);
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ id: j.id, token: j.token, form })); } catch {}
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const reset = () => {
    audio.pause();
    setPreview(null);
    try { sessionStorage.removeItem(SS_KEY); } catch {}
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const artist = catalog.artists.find((a) => a.id === form.artistId);

  return (
    <div className="space-y-6">
      {!preview && (
        <div ref={formRef} className="card space-y-6 p-5 sm:p-7">
          <fieldset className="min-w-0">
            <legend className="mb-2 font-bold">1. Ki énekelje?</legend>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="radiogroup">
              {catalog.artists.map((a) => {
                const on = form.artistId === a.id;
                const tr = toTracks(catalog, catalog.samples.filter((s) => s.artistId === a.id))[0];
                const playing = !!tr && audio.current?.id === tr.id && audio.playing;
                return (
                  <div key={a.id} className={`w-36 shrink-0 overflow-hidden rounded-2xl border ${on ? "border-gold ring-2 ring-gold/40" : "border-line"}`}>
                    <button type="button" role="radio" aria-checked={on} onClick={() => set("artistId", a.id)} className="block w-full text-left">
                      <div className="relative aspect-square"><ArtistPortrait artist={a} monogram={false} />{on && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-gold text-on-gold"><CheckIcon size={14} strokeWidth={3} /></span>}</div>
                      <p className="px-2 pt-1.5 text-sm font-bold leading-tight">{a.name}</p>
                      <p className="px-2 text-[11px] text-muted">{formatSurcharge(a.surchargeHuf)}</p>
                    </button>
                    {tr && (
                      <button type="button" className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gold" onClick={() => audio.toggle(tr, [tr])} aria-label={`Minta: ${a.name}`}>
                        {playing ? <PauseIcon size={12} /> : <PlayIcon size={12} />} minta
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-bold">2. Milyen alkalomra?</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {catalog.occasions.map((o) => (
                <button key={o.id} type="button" role="radio" className="chip" aria-checked={form.occasionId === o.id} onClick={() => set("occasionId", o.id)}>{o.emoji} {o.label}</button>
              ))}
            </div>
            {errors.occasionId && <p className="mt-1 text-sm font-semibold text-red" role="alert">{errors.occasionId}</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="p-name" className="mb-1 block font-bold">3. Kinek szól?</label>
              <input id="p-name" className="field" value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} placeholder="pl. Kovács Zsófia" maxLength={60} aria-invalid={!!errors.recipientName} />
              {errors.recipientName && <p className="mt-1 text-sm font-semibold text-red" role="alert">{errors.recipientName}</p>}
            </div>
            <div>
              <label htmlFor="p-nick" className="mb-1 block font-bold">Becenév <span className="font-normal text-muted">(nem kötelező)</span></label>
              <input id="p-nick" className="field" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="pl. Zsófi" maxLength={40} />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 font-bold">4. Ki ő neked?</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {RELATIONS.map((r) => <button key={r} type="button" role="radio" className="chip" aria-checked={form.relation === r} onClick={() => set("relation", r)}>{r}</button>)}
            </div>
            {errors.relation && <p className="mt-1 text-sm font-semibold text-red" role="alert">{errors.relation}</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-bold">5. Milyen legyen?</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {MOODS.map((m) => <button key={m.id} type="button" role="radio" className="chip" aria-checked={form.mood === m.id} onClick={() => set("mood", m.id)}>{m.label}</button>)}
            </div>
          </fieldset>

          <div>
            <label htmlFor="p-story" className="mb-1 block font-bold">6. Mesélj róla 1–2 mondatban</label>
            <textarea id="p-story" className="field" rows={3} maxLength={600} value={form.memories} onChange={(e) => set("memories", e.target.value)} placeholder="pl. 50 éves lett, de még mindig ő táncol a leghosszabban minden lagziban. Imádja a halászlét és a kutyáját, Bodrit." aria-invalid={!!errors.memories} />
            <p className="mt-1 flex justify-between text-xs text-muted"><span>{errors.memories ? <b className="text-red">{errors.memories}</b> : "Minél konkrétabb, annál jobb a dal."}</span><span className="tabular-nums">{form.memories.length} / 600</span></p>
          </div>

          {topError && <p className="rounded-xl bg-red/10 p-3 text-sm font-semibold text-red" role="alert">{topError}</p>}
          <button type="button" className="btn-primary w-full py-4 text-lg" disabled={sending} onClick={generate}>{sending ? "Indul…" : "Hallgasd meg ingyen! 🎻"}</button>
          <p className="text-center text-xs text-muted">Ingyenes, regisztráció nélkül · {artist ? `${artist.name} hangján` : ""} · kb. 1 perc</p>
        </div>
      )}

      {preview && (
        <div ref={resultRef} className="scroll-mt-4 space-y-6">
          {preview.status === "generating" && (
            <div className="card p-8 text-center" role="status" aria-live="polite">
              <div className="eq mx-auto mb-4 text-gold" aria-hidden><span /><span /><span /></div>
              <p className="font-display text-2xl font-bold">{preview.recipientName || "A"} dala készül…</p>
              <p className="mt-2 text-muted">{LOADING[loadingIdx]}</p>
            </div>
          )}
          {preview.status === "blocked" && (
            <div className="card p-6 text-center">
              <p className="font-display text-xl font-bold">Ebből most nem tudunk dalt írni 🙏</p>
              <p className="mt-2 text-muted">A dalaink szeretetteljesek – nem tartalmazhatnak sértő, explicit, politikai vagy reklám jellegű részt. Fogalmazd át kicsit, és próbáld újra!</p>
              <button type="button" className="btn-primary mt-4" onClick={reset}>Újrapróbálom</button>
            </div>
          )}
          {preview.status === "failed" && (
            <div className="card p-6 text-center">
              <p className="font-display text-xl font-bold">Hoppá, most nem sikerült.</p>
              <p className="mt-2 text-muted">Próbáld újra egy perc múlva – vagy rendeld meg egyből, a dal így is elkészül.</p>
              <div className="mt-4 flex justify-center gap-2"><button type="button" className="btn-primary" onClick={reset}>Újra</button><Link href="/#rendeles" className="btn-ghost">Rendelés</Link></div>
            </div>
          )}
          {preview.status === "ready" && <ReadyPreview preview={preview} catalog={catalog} form={form} onReset={reset} onBought={(url) => { try { sessionStorage.removeItem(SS_KEY); } catch {} router.push(url); }} />}
        </div>
      )}
    </div>
  );
}

function ReadyPreview({ preview, catalog, form, onReset, onBought }: {
  preview: PreviewDto;
  catalog: Catalog;
  form: { artistId: string; occasionId: string; recipientName: string; nickname: string; relation: string; mood: string; memories: string };
  onReset: () => void;
  onBought: (url: string) => void;
}) {
  const audio = useAudio();
  const artist = catalog.artists.find((a) => a.id === preview.artistId);
  const tr = { id: `preview-${preview.id}`, title: preview.title ?? "Előnézet", src: preview.audioUrl!, artistName: artist?.name ?? "" };
  const playing = audio.current?.id === tr.id && audio.playing;
  const pct = audio.current?.id === tr.id && audio.duration ? (audio.time / audio.duration) * 100 : 0;
  const [buying, setBuying] = useState(false);
  const [pkg, setPkg] = useState<PackageId>(catalog.packages.find((p) => p.highlight)?.id ?? catalog.packages[0]?.id ?? "holnapra");
  const [c, setC] = useState({ email: "", billingName: "", billingZip: "", billingCity: "", billingAddress: "", consentTerms: false, consentPrivacy: false, card: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const price = useMemo(() => calculatePrice({ packageId: pkg, artist: artist ?? null, extras: [], coupon: null }, catalog), [pkg, artist, catalog]);

  const buy = async () => {
    if (!c.card) return setErr({ card: "Rögzítsd a kártyát (teszt módban egy kattintás)." });
    setBusy(true);
    setErr({});
    const data: WizardData = {
      ...EMPTY_WIZARD,
      ...form,
      occasionId: form.occasionId as WizardData["occasionId"],
      mood: form.mood as WizardData["mood"],
      tempo: form.mood === "meghato" ? "lassu" : form.mood === "vicces" ? "porgos" : "kozepes",
      packageId: pkg,
      email: c.email,
      billingName: c.billingName,
      billingZip: c.billingZip,
      billingCity: c.billingCity,
      billingAddress: c.billingAddress,
      consentTerms: c.consentTerms,
      consentPrivacy: c.consentPrivacy,
    };
    const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ previewId: preview.id, data }) });
    const j = await r.json();
    setBusy(false);
    if (r.status === 422) return setErr(j.errors ?? { email: "Ellenőrizd az adatokat." });
    if (!r.ok) return setErr({ card: j.error ?? "Hiba – próbáld újra." });
    track("preview_purchase", { value: j.totalHuf, currency: "HUF", artist: preview.artistId });
    track("purchase_authorized", { value: j.totalHuf, currency: "HUF" });
    onBought(`/rendelesem/${j.code}?k=${j.statusKey}&uj=1`);
  };

  const field = (k: keyof typeof c, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`b-${k}`} className="mb-1 block text-sm font-bold">{label}</label>
      <input id={`b-${k}`} className="field !py-2.5" value={String(c[k])} onChange={(e) => { setC({ ...c, [k]: e.target.value }); setErr({ ...err, [k]: "" }); }} aria-invalid={!!err[k]} {...props} />
      {err[k] && <p className="mt-1 text-xs font-semibold text-red" role="alert">{err[k]}</p>}
    </div>
  );

  return (
    <>
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-wine to-navy p-6 text-center text-white">
          <p className="text-sm font-semibold text-white/80">{artist?.name} · 15 másodperces előnézet</p>
          <h2 className="mt-1 font-display text-3xl font-black">{preview.title}</h2>
          <button type="button" onClick={() => audio.toggle(tr, [tr])} className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-red text-on-gold shadow-xl" aria-label={playing ? "Szünet" : "Lejátszás"}>
            {playing ? <PauseIcon size={40} /> : <PlayIcon size={40} className="translate-x-0.5" />}
          </button>
          <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/20" aria-hidden><div className="h-full bg-gold transition-[width]" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="p-6">
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{preview.lyricsVisible}</pre>
          {preview.lyricsHiddenLines > 0 && <p className="mt-1 select-none text-[15px] leading-relaxed text-muted blur-[3px]" aria-hidden>{"Folytatódik a refrén és a dal többi része…\n".repeat(2)}</p>}
          <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">A teljes dalban <b>2 versszak + refrén</b> szól, minden emlékeddel – és ha valami nem stimmel, <b>2 javítás ingyen</b>.</p>
        </div>
      </div>

      {!buying ? (
        <div className="card p-6 text-center">
          <p className="font-display text-2xl font-bold">Tetszik? Kérd a teljes dalt!</p>
          <p className="mt-1 text-muted">Már {formatHuf(Math.min(...catalog.packages.map((p) => p.priceHuf)) + (artist?.surchargeHuf ?? 0))}-tól · fizetés csak ha kész</p>
          <button type="button" className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setBuying(true)}>Megveszem a teljes dalt</button>
          <button type="button" className="mt-3 text-sm font-semibold text-muted underline" onClick={onReset}>Módosítanék rajta – új előnézet</button>
        </div>
      ) : (
        <div className="card space-y-5 p-6">
          <h2 className="font-display text-2xl font-bold">Teljes dal – mikorra kell?</h2>
          <div className="grid gap-2" role="radiogroup">
            {catalog.packages.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={pkg === p.id} onClick={() => setPkg(p.id)} className={`flex items-center justify-between rounded-2xl border p-3.5 text-left ${pkg === p.id ? "border-gold bg-gold/10 ring-2 ring-gold/40" : "border-line"}`}>
                <span><b>{p.name}</b> <span className="text-sm text-muted">· {p.deliveryLabel}</span>{p.highlight && <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-on-gold">népszerű</span>}</span>
                <span className="font-bold tabular-nums">{formatHuf(p.priceHuf + (artist?.surchargeHuf ?? 0))}</span>
              </button>
            ))}
          </div>
          {field("email", "E-mail-cím (ide küldjük a dalt)", { type: "email", autoComplete: "email" })}
          {field("billingName", "Számlázási név", { autoComplete: "name" })}
          <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            {field("billingZip", "Irsz.", { inputMode: "numeric", maxLength: 4, autoComplete: "postal-code" })}
            {field("billingCity", "Település", { autoComplete: "address-level2" })}
          </div>
          {field("billingAddress", "Utca, házszám", { autoComplete: "street-address" })}
          <div className="rounded-2xl border border-line bg-surface-2 p-4 text-sm">
            <p className="font-bold">Fizetés csak ha kész – {formatHuf(price.totalHuf)}</p>
            <p className="mt-1 text-muted">A kártyát most csak rögzítjük, a terhelés a kész dalnál történik.</p>
            {c.card ? <p className="mt-2 flex items-center gap-2 font-semibold text-gold"><CheckIcon size={16} /> Tesztkártya rögzítve</p> : <button type="button" className="btn-ghost mt-2 w-full" onClick={() => setC({ ...c, card: true })}><ShieldIcon size={18} /> Kártya rögzítése (teszt mód)</button>}
            {err.card && <p className="mt-1 text-xs font-semibold text-red" role="alert">{err.card}</p>}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--gold)]" checked={c.consentTerms} onChange={(e) => setC({ ...c, consentTerms: e.target.checked })} /><span>Elfogadom az <Link href="/jogi/aszf" target="_blank" className="text-gold underline">ÁSZF</Link>-et; a dal MI segítségével, személyes felhasználásra készül.</span></label>
          {err.consentTerms && <p className="text-xs font-semibold text-red">{err.consentTerms}</p>}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--gold)]" checked={c.consentPrivacy} onChange={(e) => setC({ ...c, consentPrivacy: e.target.checked })} /><span>Hozzájárulok a történet kezeléséhez az <Link href="/jogi/adatvedelem" target="_blank" className="text-gold underline">Adatkezelési tájékoztató</Link> szerint.</span></label>
          {err.consentPrivacy && <p className="text-xs font-semibold text-red">{err.consentPrivacy}</p>}
          <button type="button" className="btn-primary w-full py-4 text-lg" disabled={busy} onClick={buy}>{busy ? "Küldés…" : `Megrendelem – ${formatHuf(price.totalHuf)}`}</button>
        </div>
      )}
    </>
  );
}
