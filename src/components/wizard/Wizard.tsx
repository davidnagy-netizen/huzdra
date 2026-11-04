"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import type { Catalog } from "@/lib/catalog";
import { CATEGORY_LABELS, moderateFields } from "@/lib/moderation";
import { calculatePrice, formatHuf, formatSurcharge } from "@/lib/pricing";
import type { Coupon, ExtraId, Mood, OccasionId, PackageId, Tempo, WizardData } from "@/lib/types";
import { PRESET_EVENT, type WizardPreset } from "@/lib/wizard-bus";
import { EMPTY_WIZARD, LIMITS, RELATIONS, WIZARD_STEPS, validateStep, type StepErrors } from "@/lib/wizard-schema";
import { ArtistPortrait } from "../ArtistPortrait";
import { useAudio } from "../audio/AudioProvider";
import { toTracks } from "../audio/FeaturedPlayer";
import { OfficialBadge } from "../home/ArtistCards";
import { ArrowLeftIcon, ArrowRightIcon, CardIcon, CheckIcon, PauseIcon, PlayIcon, ShieldIcon } from "../icons";
import { ChoiceGroup, FieldError, TextArea, TextField, Toggle } from "./fields";

const LS_KEY = "huzdra:wizard:v1";

interface Saved {
  data: WizardData;
  step: number;
  draftId: string | null;
  savedAt: string;
}

function loadLocal(): Saved | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    return { ...s, data: { ...EMPTY_WIZARD, ...s.data } };
  } catch {
    return null;
  }
}

export function Wizard({ catalog, preset }: { catalog: Catalog; preset?: WizardPreset }) {
  const router = useRouter();
  const [data, setData] = useState<WizardData>(() => ({
    ...EMPTY_WIZARD,
    artistId: preset?.artistId ?? "",
    occasionId: preset?.occasionId ?? "",
    styleId: preset?.styleId ?? "",
  }));
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const [restored, setRestored] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cardLinked, setCardLinked] = useState(false);
  const hydrated = useRef(false);
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // --- piszkozat visszatöltése ---
  useEffect(() => {
    const s = loadLocal();
    if (s && JSON.stringify(s.data) !== JSON.stringify(EMPTY_WIZARD)) {
      setData((d) => ({
        ...s.data,
        artistId: preset?.artistId || s.data.artistId || d.artistId,
        occasionId: preset?.occasionId || s.data.occasionId || d.occasionId,
      }));
      setStep(Math.min(s.step, 5));
      setMaxStep(Math.min(s.step, 5));
      setDraftId(s.draftId);
      setRestored(true);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    if (!started.current) {
      started.current = true;
      track("wizard_start");
    }
  }, []);

  // --- külső előtöltés (előadókártya, csomag-gomb, mintadal) ---
  useEffect(() => {
    const onPreset = (e: Event) => {
      const p = (e as CustomEvent<WizardPreset>).detail;
      setData((d) => ({ ...d, ...(p.artistId && { artistId: p.artistId }), ...(p.occasionId && { occasionId: p.occasionId }), ...(p.styleId && { styleId: p.styleId }) }));
      if (p.artistId) {
        setStep((s) => (s === 0 ? 1 : s));
        setMaxStep((m) => Math.max(m, 1));
      }
    };
    const onPkg = (e: Event) => update("packageId", (e as CustomEvent<PackageId>).detail);
    window.addEventListener(PRESET_EVENT, onPreset);
    window.addEventListener("huzdra:wizard-package", onPkg);
    return () => {
      window.removeEventListener(PRESET_EVENT, onPreset);
      window.removeEventListener("huzdra:wizard-package", onPkg);
    };
  }, [update]);

  // --- automatikus mentés: localStorage azonnal, backend piszkozat késleltetve ---
  useEffect(() => {
    if (!hydrated.current) return;
    const saved: Saved = { data, step, draftId, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(saved));
    } catch {}
    if (!started.current && !restored) return;
    const t = setTimeout(async () => {
      setSaveState("saving");
      try {
        // A kártyaadatokat és hozzájárulásokat nem küldjük piszkozatként.
        const body = JSON.stringify({ data: { ...data, consentTerms: false, consentPrivacy: false }, step });
        const res = draftId
          ? await fetch(`/api/drafts/${draftId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
          : await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body });
        if (res.status === 404) setDraftId(null);
        else if (res.ok) {
          const j = await res.json();
          if (!draftId) setDraftId(j.id);
          setSaveState("saved");
        } else setSaveState("offline");
      } catch {
        setSaveState("offline");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [data, step, draftId, restored]);

  useEffect(() => {
    track("wizard_step_view", { step: step + 1, step_name: WIZARD_STEPS[step].key });
  }, [step]);

  const artist = catalog.artists.find((a) => a.id === data.artistId) ?? null;
  const price = useMemo(
    () => calculatePrice({ packageId: data.packageId, artist, extras: data.extras, coupon }, catalog),
    [data.packageId, data.extras, artist, coupon, catalog],
  );
  const fromPrice = Math.min(...catalog.packages.map((p) => p.priceHuf)) + (artist?.surchargeHuf ?? 0);
  const moderation = useMemo(
    () => moderateFields({ memories: data.memories, jokes: data.jokes, familyNames: data.familyNames, favoriteSaying: data.favoriteSaying, town: data.town, recipientName: data.recipientName, nickname: data.nickname }),
    [data.memories, data.jokes, data.familyNames, data.favoriteSaying, data.town, data.recipientName, data.nickname],
  );

  const goTo = (s: number) => {
    setStep(s);
    setErrors({});
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const next = () => {
    const e = validateStep(step, data, { validArtistIds: catalog.artists.map((a) => a.id) });
    if (Object.keys(e).length) {
      setErrors(e);
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    track("wizard_step_complete", { step: step + 1, step_name: WIZARD_STEPS[step].key });
    if (step < 5) {
      setMaxStep((m) => Math.max(m, step + 1));
      if (step + 1 === 5) track("begin_checkout", { value: price.totalHuf, currency: "HUF" });
      goTo(step + 1);
    } else submit();
  };

  const submit = async () => {
    if (!cardLinked) {
      setSubmitError("Előbb rögzítsd a kártyát (teszt módban egy kattintás).");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
      const j = await res.json();
      if (res.status === 422) {
        setErrors(j.errors ?? {});
        goTo(j.step ?? 0);
        setSubmitError("Néhány adatot még ellenőrizni kell.");
        return;
      }
      if (!res.ok) throw new Error(j.error);
      track("purchase_authorized", { value: j.totalHuf, currency: "HUF", artist: artist?.slug });
      try {
        localStorage.removeItem(LS_KEY);
      } catch {}
      router.push(`/rendelesem/${j.code}?k=${j.statusKey}&uj=1`);
    } catch {
      setSubmitError("Hoppá, valami félrecsúszott. Próbáld újra egy perc múlva!");
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = async () => {
    setCouponMsg(null);
    if (!data.coupon.trim()) return setCoupon(null);
    const res = await fetch(`/api/coupon?code=${encodeURIComponent(data.coupon.trim())}`);
    const j = await res.json();
    if (!res.ok) {
      setCoupon(null);
      setCouponMsg(j.error);
      return;
    }
    setCoupon({ code: j.code, percentOff: j.percentOff ?? undefined, amountOffHuf: j.amountOffHuf ?? undefined, active: true });
    setCouponMsg(`„${j.code}” kupon aktiválva!`);
    track("coupon_apply", { code: j.code });
  };

  const resetAll = () => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setData({ ...EMPTY_WIZARD });
    setDraftId(null);
    setRestored(false);
    setMaxStep(0);
    goTo(0);
  };

  return (
    <div ref={rootRef} id="wizard" className="scroll-mt-20">
      {/* Folyamatjelző */}
      <nav aria-label="Rendelés lépései" className="mb-6">
        <p className="mb-2 flex justify-between text-sm font-semibold text-muted">
          <span>{step + 1}. lépés / 6</span>
          <span aria-live="polite">
            {saveState === "saving" ? "Mentés…" : saveState === "saved" ? "✓ Piszkozat elmentve" : saveState === "offline" ? "Helyben mentve" : ""}
          </span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-red transition-all duration-500" style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-6 gap-1 text-center text-[11px] font-semibold sm:text-xs">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                disabled={i > maxStep}
                onClick={() => goTo(i)}
                aria-current={i === step ? "step" : undefined}
                className={`w-full truncate rounded-lg px-0.5 py-1 ${i === step ? "text-gold" : i <= maxStep ? "text-ink hover:text-gold" : "text-muted/60"}`}
              >
                <span className={`mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full text-[11px] ${i < step || (i <= maxStep && i !== step) ? "bg-gold text-on-gold" : i === step ? "border-2 border-gold" : "border border-line"}`}>
                  {i < step ? <CheckIcon size={12} strokeWidth={3} /> : i + 1}
                </span>
                {s.short}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {restored && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm" role="status">
          <span>👋 Visszatöltöttük a félbehagyott rendelésedet.</span>
          <button type="button" className="font-semibold underline" onClick={resetAll}>Inkább újrakezdem</button>
        </div>
      )}

      <div className="card p-5 sm:p-7">
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold outline-none sm:text-3xl">
          {WIZARD_STEPS[step].title}
        </h3>
        <div className="mt-5 space-y-6">
          {step === 0 && <StepArtist catalog={catalog} data={data} update={update} errors={errors} />}
          {step === 1 && <StepOccasion catalog={catalog} data={data} update={update} errors={errors} />}
          {step === 2 && <StepStyle catalog={catalog} data={data} update={update} errors={errors} />}
          {step === 3 && <StepRecipient data={data} update={update} errors={errors} />}
          {step === 4 && <StepStory data={data} update={update} errors={errors} moderation={moderation} />}
          {step === 5 && (
            <StepCheckout
              catalog={catalog}
              data={data}
              update={update}
              errors={errors}
              applyCoupon={applyCoupon}
              couponMsg={couponMsg}
              couponOk={!!coupon}
              cardLinked={cardLinked}
              setCardLinked={setCardLinked}
              price={price}
            />
          )}
        </div>
        {submitError && <p className="mt-5 rounded-xl bg-red/10 p-3 text-sm font-semibold text-red" role="alert">{submitError}</p>}
      </div>

      {/* Ragadós alsó sáv: élő végösszeg + navigáció */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-4 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line hover:border-gold" aria-label="Vissza az előző lépésre">
              <ArrowLeftIcon />
            </button>
          )}
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-xs text-muted">{data.packageId ? "Végösszeg" : "Kiinduló ár"}</p>
            <p className="font-display text-xl font-black tabular-nums">
              {data.packageId ? formatHuf(price.totalHuf) : `${formatHuf(fromPrice)}-tól`}
              {price.discountHuf > 0 && <span className="ml-2 text-sm font-semibold text-gold">−{formatHuf(price.discountHuf)}</span>}
            </p>
            {step === 5 && <p className="text-[11px] text-muted">Most csak rögzítjük, terhelés ha kész</p>}
          </div>
          <button type="button" onClick={next} disabled={submitting} className="btn-primary shrink-0 !px-6">
            {step < 5 ? (<>Tovább <ArrowRightIcon size={18} /></>) : submitting ? "Küldés…" : "Húzd rá!"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ lépések

type StepProps = {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  errors: StepErrors;
};

function StepArtist({ catalog, data, update, errors }: StepProps & { catalog: Catalog }) {
  const audio = useAudio();
  return (
    <fieldset>
      <legend className="mb-3 text-muted">Ki énekelje a dalodat? Hallgass bele, mielőtt döntesz!</legend>
      <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
        {catalog.artists.map((a) => {
          const on = data.artistId === a.id;
          const tracks = toTracks(catalog, catalog.samples.filter((s) => s.artistId === a.id));
          const playing = !!audio.current && tracks.some((t) => t.id === audio.current!.id) && audio.playing;
          return (
            <div key={a.id} className={`overflow-hidden rounded-2xl border transition ${on ? "border-gold ring-2 ring-gold/40" : "border-line"}`}>
              <button type="button" role="radio" aria-checked={on} onClick={() => { update("artistId", a.id); track("artist_select", { artist: a.slug, source: "wizard" }); }} className="block w-full text-left">
                <div className="relative aspect-[16/9]">
                  <ArtistPortrait artist={a} />
                  <OfficialBadge className="absolute left-2 top-2" kind={a.kind} />
                  {on && <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-gold text-on-gold"><CheckIcon size={18} strokeWidth={3} /></span>}
                </div>
                <div className="p-4">
                  <p className="flex items-baseline justify-between font-display text-xl font-bold">{a.name}<span className="font-sans text-sm font-semibold text-muted">{formatSurcharge(a.surchargeHuf)}</span></p>
                  <p className="text-sm text-muted">{a.tagline}</p>
                </div>
              </button>
              {tracks[0] && (
                <button type="button" onClick={() => audio.toggle(playing ? audio.current! : tracks[0], tracks)} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-sm font-semibold hover:bg-surface-2" aria-label={`${playing ? "Szünet" : "Mintadal"}: ${a.name}`}>
                  <span className="text-gold">{playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}</span>
                  {playing ? "Szól a minta…" : "Mintadal előhallgatása"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {catalog.comingSoon.length > 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-line p-3 text-sm text-muted">
          ⏳ Hamarosan: {catalog.comingSoon.map((a) => a.name).join(", ")} hivatalos hangja is választható lesz.
        </p>
      )}
      <FieldError id="artist-e" msg={errors.artistId} />
    </fieldset>
  );
}

function StepOccasion({ catalog, data, update, errors }: StepProps & { catalog: Catalog }) {
  return (
    <>
      <ChoiceGroup<OccasionId>
        label="Milyen alkalomra készül a dal?"
        columns="grid-cols-2 sm:grid-cols-3"
        value={data.occasionId}
        onChange={(v) => update("occasionId", v)}
        error={errors.occasionId}
        options={[...catalog.occasions.map((o) => ({ value: o.id, title: o.label, icon: o.emoji })), { value: "egyeb" as OccasionId, title: "Egyéb", icon: "✨" }]}
      />
      {data.occasionId === "egyeb" && (
        <TextField label="Milyen alkalom lesz?" value={data.occasionOther} onChange={(v) => update("occasionOther", v)} maxLength={LIMITS.occasionOther} placeholder="pl. nyugdíjba vonulás, házavató, legénybúcsú" error={errors.occasionOther} />
      )}
    </>
  );
}

function StepStyle({ catalog, data, update, errors }: StepProps & { catalog: Catalog }) {
  const artist = catalog.artists.find((a) => a.id === data.artistId);
  const styles = catalog.styles.filter((s) => !artist || artist.styles.includes(s.id));
  return (
    <>
      <ChoiceGroup<Tempo>
        label="Tempó"
        value={data.tempo}
        onChange={(v) => update("tempo", v)}
        error={errors.tempo}
        options={[
          { value: "lassu", title: "Lassú, érzelmes", desc: "Összebújós, könnyfakasztó", icon: "🕯️" },
          { value: "kozepes", title: "Közepes", desc: "Ringatós, dúdolós", icon: "🎶" },
          { value: "porgos", title: "Pörgős, táncolós", desc: "Mindenki a parkettre!", icon: "💃" },
        ]}
      />
      <ChoiceGroup<Mood>
        label="Hangulat"
        value={data.mood}
        onChange={(v) => update("mood", v)}
        error={errors.mood}
        options={[
          { value: "vicces", title: "Vicces", desc: "Poénok, ugratás, nevetés", icon: "😄" },
          { value: "meghato", title: "Megható", desc: "Elő a zsebkendőt", icon: "🥹" },
          { value: "unnepelyes", title: "Ünnepélyes", desc: "Pohárköszöntős, emelkedett", icon: "🥂" },
        ]}
      />
      <div>
        <p className="mb-2 text-sm font-bold">Stílus <span className="font-normal text-muted">(nem kötelező – ha nem választasz, az előadóhoz illőt kapod)</span></p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stílus">
          {styles.map((s) => (
            <button key={s.id} type="button" role="radio" className="chip" aria-checked={data.styleId === s.id} onClick={() => update("styleId", data.styleId === s.id ? "" : s.id)} title={s.description}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">Hangszeres betét</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={data.violin} onChange={(v) => update("violin", v)} label="🎻 Hegedűs betét" desc="Szívbe markoló hegedűszóló a refrén előtt" />
          <Toggle checked={data.cimbalom} onChange={(v) => update("cimbalom", v)} label="🪕 Cimbalmos betét" desc="Csilingelő, pergő cimbalomfutam" />
        </div>
      </div>
    </>
  );
}

function StepRecipient({ data, update, errors }: StepProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Az ünnepelt neve" value={data.recipientName} onChange={(v) => update("recipientName", v)} maxLength={LIMITS.recipientName} placeholder="pl. Kovács Zsófia" error={errors.recipientName} autoComplete="off" />
        <TextField label="Becenév" optional value={data.nickname} onChange={(v) => update("nickname", v)} maxLength={LIMITS.nickname} placeholder="pl. Zsófi, Zsozsó" error={errors.nickname} />
      </div>
      <TextField
        label="Hogyan kell kimondani?"
        optional
        value={data.pronunciation}
        onChange={(v) => update("pronunciation", v)}
        maxLength={LIMITS.pronunciation}
        placeholder="pl. ZSÓ-fi, hosszú ó-val; a Jázmin „J”-vel, nem „Dzs”-vel"
        hint="Különleges vagy idegen nevnél segít, hogy az előadó pontosan ejtse."
        error={errors.pronunciation}
      />
      <div>
        <label htmlFor="relation" className="mb-1.5 block text-sm font-bold">Ki ő neked?</label>
        <select id="relation" className="field" value={data.relation} onChange={(e) => update("relation", e.target.value)} aria-invalid={!!errors.relation}>
          <option value="">Válassz…</option>
          {RELATIONS.map((r) => (
            <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        <FieldError id="relation-e" msg={errors.relation} />
      </div>
      {data.relation === "egyéb" && (
        <TextField label="Kapcsolat" value={data.relationOther} onChange={(v) => update("relationOther", v)} maxLength={LIMITS.relationOther} placeholder="pl. szomszéd néni, edző, tanár" error={errors.relationOther} />
      )}
      <TextField
        label="Hányadik szülinap / évforduló?"
        optional
        inputMode="numeric"
        value={data.ageOrYears}
        onChange={(v) => update("ageOrYears", v.replace(/[^\d]/g, "").slice(0, 3))}
        placeholder="pl. 50"
        error={errors.ageOrYears}
      />
    </>
  );
}

function StepStory({ data, update, errors, moderation }: StepProps & { moderation: ReturnType<typeof moderateFields> }) {
  return (
    <>
      <p className="text-muted">Minél többet mesélsz, annál inkább „rólatok” szól majd a dal. Nem kell szépen fogalmazni – azt mi intézzük!</p>
      <TextArea
        label="Közös emlékek, történetek"
        value={data.memories}
        onChange={(v) => update("memories", v)}
        maxLength={LIMITS.memories}
        rows={5}
        placeholder="pl. A lagziban a menyasszony cipője leesett tánc közben, Pisti mezítláb húzta a csárdást hajnalig. 2019-ben a Balatonon ismerkedtek meg, egy elázott fagyizós estén…"
        hint="Legalább 40 karakter. Helyszínek, sztorik, különleges pillanatok."
        error={errors.memories}
      />
      <TextArea label="Poénok, belsős viccek" optional value={data.jokes} onChange={(v) => update("jokes", v)} maxLength={LIMITS.jokes} rows={3} placeholder="pl. Mindig ő nyeri a pálinkás kvízt; a „majd holnap” a jelmondata; a kutyája a főnök otthon" error={errors.jokes} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextArea label="Családtagok, barátok nevei" optional value={data.familyNames} onChange={(v) => update("familyNames", v)} maxLength={LIMITS.familyNames} rows={2} placeholder="pl. Mama, Józsi bácsi, a keresztszülők: Kati és Feri" error={errors.familyNames} />
        <TextArea label="Kedvenc mondása" optional value={data.favoriteSaying} onChange={(v) => update("favoriteSaying", v)} maxLength={LIMITS.favoriteSaying} rows={2} placeholder="pl. „Ami késik, nem múlik!”" error={errors.favoriteSaying} />
      </div>
      <TextField label="Település" optional value={data.town} onChange={(v) => update("town", v)} maxLength={LIMITS.town} placeholder="pl. Hajdúböszörmény" error={errors.town} />
      <TextArea
        label="Ezt NE említsük a dalban"
        optional
        value={data.avoid}
        onChange={(v) => update("avoid", v)}
        maxLength={LIMITS.avoid}
        rows={2}
        placeholder="pl. a volt barátnőt, a válást, a súlyát, a munkahelyét"
        hint="Ezt a dalszerző szigorúan betartja."
        error={errors.avoid}
      />
      {!moderation.ok && (
        <div className="rounded-xl border border-red/40 bg-red/10 p-4 text-sm" role="status">
          <p className="font-bold">Egy pillanat! 🙏</p>
          <p className="mt-1">
            A történetben szerepelhet {Array.from(new Set(moderation.flags.map((f) => CATEGORY_LABELS[f.category]))).join(", ")}. A dalaink
            szeretetteljesek: nem tartalmazhatnak sértő, lejárató, explicit, politikai vagy reklám jellegű részt. Ha így küldöd el,
            munkatársunk átnézi, mielőtt elkészül a dal – ez késleltetheti a kézbesítést.
          </p>
        </div>
      )}
    </>
  );
}

function StepCheckout({
  catalog,
  data,
  update,
  errors,
  applyCoupon,
  couponMsg,
  couponOk,
  cardLinked,
  setCardLinked,
  price,
}: StepProps & {
  catalog: Catalog;
  applyCoupon: () => void;
  couponMsg: string | null;
  couponOk: boolean;
  cardLinked: boolean;
  setCardLinked: (v: boolean) => void;
  price: ReturnType<typeof calculatePrice>;
}) {
  const toggleExtra = (id: ExtraId, on: boolean) => update("extras", on ? [...data.extras, id] : data.extras.filter((x) => x !== id));
  const artist = catalog.artists.find((a) => a.id === data.artistId);
  return (
    <>
      <ChoiceGroup<PackageId>
        label="Mikorra kell a dal?"
        value={data.packageId}
        onChange={(v) => update("packageId", v)}
        error={errors.packageId}
        options={catalog.packages.map((p) => ({ value: p.id, title: `${p.name} · ${formatHuf(p.priceHuf)}`, desc: `${p.deliveryLabel}${p.highlight ? " · legnépszerűbb" : ""}` }))}
      />
      <div>
        <p className="mb-2 text-sm font-bold">Extrák</p>
        <div className="grid gap-2">
          {catalog.extras.map((e) => (
            <Toggle key={e.id} checked={data.extras.includes(e.id)} onChange={(v) => toggleExtra(e.id, v)} label={e.name} desc={e.description} price={e.priceHuf ? `+${formatHuf(e.priceHuf)}` : "ingyenes"} />
          ))}
        </div>
      </div>
      {data.extras.includes("elo-eloadas") && (
        <div className="space-y-4 rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <p className="text-sm"><b>Élő fellépés – érdeklődés {artist ? `(${artist.name})` : ""}</b><br /><span className="text-muted">Továbbítjuk az előadó menedzsmentjének, ők keresnek meg az ajánlattal.</span></p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Rendezvény dátuma" type="date" value={data.liveEventDate} onChange={(v) => update("liveEventDate", v)} error={errors.liveEventDate} />
            <TextField label="Helyszín (település)" value={data.liveEventLocation} onChange={(v) => update("liveEventLocation", v)} maxLength={80} placeholder="pl. Kecskemét" error={errors.liveEventLocation} />
          </div>
          <TextArea label="Megjegyzés" optional value={data.liveEventNote} onChange={(v) => update("liveEventNote", v)} maxLength={LIMITS.liveEventNote} rows={2} placeholder="pl. kb. 150 vendég, este 10 körül lenne jó a fellépés" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="E-mail-cím" type="email" autoComplete="email" value={data.email} onChange={(v) => update("email", v)} placeholder="ide küldjük a dalt" error={errors.email} />
        <TextField label="Telefonszám" optional={!data.extras.includes("elo-eloadas")} type="tel" autoComplete="tel" value={data.phone} onChange={(v) => update("phone", v)} placeholder="+36 30 123 4567" hint="Csak ha gyorsan egyeztetni kell." error={errors.phone} />
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-bold">Számlázási adatok</legend>
        <TextField label="Név / cégnév" autoComplete="name" value={data.billingName} onChange={(v) => update("billingName", v)} error={errors.billingName} />
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <TextField label="Irsz." inputMode="numeric" autoComplete="postal-code" value={data.billingZip} onChange={(v) => update("billingZip", v.replace(/\D/g, "").slice(0, 4))} error={errors.billingZip} />
          <TextField label="Település" autoComplete="address-level2" value={data.billingCity} onChange={(v) => update("billingCity", v)} error={errors.billingCity} />
        </div>
        <TextField label="Utca, házszám" autoComplete="street-address" value={data.billingAddress} onChange={(v) => update("billingAddress", v)} error={errors.billingAddress} />
        <TextField label="Adószám" optional value={data.billingTaxNumber} onChange={(v) => update("billingTaxNumber", v)} placeholder="céges számlához" error={errors.billingTaxNumber} />
      </fieldset>

      <div>
        <label htmlFor="coupon" className="mb-1.5 block text-sm font-bold">Kuponkód <span className="font-normal text-muted">(nem kötelező)</span></label>
        <div className="flex gap-2">
          <input id="coupon" className="field uppercase" value={data.coupon} onChange={(e) => update("coupon", e.target.value.toUpperCase())} placeholder="pl. LAGZI10" />
          <button type="button" className="btn-ghost shrink-0" onClick={applyCoupon}>Beváltom</button>
        </div>
        {couponMsg && <p className={`mt-1.5 text-sm font-semibold ${couponOk ? "text-gold" : "text-red"}`} role="status">{couponMsg}</p>}
      </div>

      {price.lines.length > 0 && (
        <div className="rounded-2xl border border-line p-4 text-sm">
          <p className="mb-2 font-bold">Összesítő</p>
          <ul className="space-y-1">
            {price.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span className="tabular-nums">{formatHuf(l.amountHuf)}</span></li>
            ))}
            {price.discountHuf > 0 && <li className="flex justify-between gap-3 text-gold"><span>Kedvezmény ({price.couponApplied})</span><span className="tabular-nums">−{formatHuf(price.discountHuf)}</span></li>}
          </ul>
          <p className="mt-2 flex justify-between border-t border-line pt-2 text-base font-black"><span>Fizetendő, ha kész</span><span className="tabular-nums">{formatHuf(price.totalHuf)}</span></p>
        </div>
      )}

      {/* Fizetés: kártya rögzítése (setup intent) – mock módban valódi kártyaadat nélkül */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <p className="flex items-center gap-2 font-bold"><CardIcon /> Fizetés csak ha kész</p>
        <p className="mt-1 text-sm text-muted">
          A kártyádat most csak rögzítjük, a(z) {formatHuf(price.totalHuf)} terhelése akkor történik, amikor a dalod elkészült. Ha nem tudjuk elkészíteni, a zárolást feloldjuk.
        </p>
        {cardLinked ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-gold/15 px-3 py-2 text-sm font-semibold text-gold" role="status"><CheckIcon size={16} /> Tesztkártya rögzítve (•••• 4242)</p>
        ) : (
          <button type="button" className="btn-ghost mt-3 w-full" onClick={() => setCardLinked(true)}>
            <ShieldIcon size={18} /> Kártya rögzítése (teszt mód)
          </button>
        )}
        <p className="mt-2 text-[11px] text-muted">Demó: nem kérünk és nem tárolunk valódi kártyaadatot. Élesben a Stripe / Barion biztonságos fizetőoldala jelenik meg itt.</p>
      </div>

      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gold)]" checked={data.consentTerms} onChange={(e) => update("consentTerms", e.target.checked)} aria-invalid={!!errors.consentTerms} />
          <span>Elfogadom az <Link href="/jogi/aszf" target="_blank" className="font-semibold text-gold underline">ÁSZF</Link>-et, és tudomásul veszem, hogy a dal mesterséges intelligenciával, az előadó hivatalos hangmodelljével készül, személyes, nem kereskedelmi felhasználásra.</span>
        </label>
        <FieldError id="terms-e" msg={errors.consentTerms} />
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gold)]" checked={data.consentPrivacy} onChange={(e) => update("consentPrivacy", e.target.checked)} aria-invalid={!!errors.consentPrivacy} />
          <span>Hozzájárulok, hogy a megadott történetet és neveket a dal elkészítéséhez kezeljétek az <Link href="/jogi/adatvedelem" target="_blank" className="font-semibold text-gold underline">Adatkezelési tájékoztató</Link> szerint (a történetet 90 nap után töröljük).</span>
        </label>
        <FieldError id="privacy-e" msg={errors.consentPrivacy} />
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--gold)]" checked={data.consentMarketing} onChange={(e) => update("consentMarketing", e.target.checked)} />
          <span className="text-muted">Kérek értesítést új előadókról és akciókról (nem kötelező).</span>
        </label>
      </div>
    </>
  );
}
