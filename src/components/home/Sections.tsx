import Link from "next/link";
import type { Catalog } from "@/lib/catalog";
import { formatHuf } from "@/lib/pricing";
import { SITE } from "@/lib/site";
import type { Faq, Review, SiteStats } from "@/lib/types";
import {
  CardIcon,
  CheckIcon,
  CimbalomIcon,
  DanceIcon,
  GiftIcon,
  MailIcon,
  MicIcon,
  PenIcon,
  RefreshIcon,
  ShieldIcon,
  StarIcon,
  SynthIcon,
  ViolinIcon,
} from "../icons";
import { CtaButton } from "./CtaButton";

export function SectionTitle({ eyebrow, title, sub, id }: { eyebrow?: string; title: React.ReactNode; sub?: string; id?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      {eyebrow && <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-red">{eyebrow}</p>}
      <h2 id={id} className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-muted">{sub}</p>}
    </div>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex text-gold" aria-label={`${value} / 5 csillag`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} size={size} className={i < Math.round(value) ? "" : "opacity-25"} />
      ))}
    </span>
  );
}

export function Hero({ stats, title, sub }: { stats: SiteStats; title?: React.ReactNode; sub?: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="disco-bg" aria-hidden><div className="disco-dots" /></div>
      <ViolinIcon size={140} className="pointer-events-none absolute -left-6 top-24 hidden rotate-[-18deg] text-gold/20 md:block" />
      <CimbalomIcon size={120} className="pointer-events-none absolute right-4 top-16 hidden text-red/25 md:block" />
      <SynthIcon size={110} className="pointer-events-none absolute bottom-10 right-10 hidden text-gold/15 lg:block" />
      <DanceIcon size={100} className="pointer-events-none absolute bottom-16 left-16 hidden text-red/20 lg:block" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-12 text-center sm:pt-20">
        <a href="#velemenyek" className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-sm backdrop-blur">
          <Stars value={stats.averageRating} size={14} />
          <span><b>{stats.averageRating.toLocaleString("hu-HU")}</b> · már <b>{stats.happyFamilies.toLocaleString("hu-HU")}</b> boldog család</span>
        </a>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {title ?? (
            <>
              Saját nótád,<br />
              <span className="text-gradient-gold">kedvenc előadód hangján.</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
          {sub ?? "Mondd el a történeted, mi meg húzzuk rá! Személyre szóló mulatós és roma zenei dal ajándékba – lagzira, keresztelőre, szülinapra, akár pár órán belül."}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaButton className="w-full px-10 py-4 text-lg sm:w-auto">Húzd rá!</CtaButton>
          <a href="#mintadalok" className="btn-ghost w-full sm:w-auto">Hallgass bele</a>
        </div>
        <p className="mt-4 text-sm">
          <Link href="/rendelesem" className="font-semibold text-muted underline decoration-gold/60 underline-offset-4 hover:text-ink">Már rendeltél? Kövesd a dalodat</Link>
        </p>
        <ul className="mx-auto mt-8 grid max-w-2xl gap-2 text-sm sm:grid-cols-3">
          {[
            { icon: <CardIcon size={18} />, t: "Fizetés csak ha kész" },
            { icon: <RefreshIcon size={18} />, t: "2 ingyenes javítás" },
            { icon: <ShieldIcon size={18} />, t: "Biztonságos fizetés" },
          ].map((g) => (
            <li key={g.t} className="flex items-center justify-center gap-2 rounded-full bg-surface/60 px-3 py-2 font-semibold backdrop-blur">
              <span className="text-gold">{g.icon}</span>{g.t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: <PenIcon size={28} />, t: "Mesélj", d: "Kinek szól, mi a közös sztorink, milyen poénok jöhetnek – 5 perc az egész." },
    { icon: <MicIcon size={28} />, t: "Elkészül az előadó hangján", d: "Megírjuk a dalszöveget, és a választott előadó hivatalos hangján rögzítjük." },
    { icon: <MailIcon size={28} />, t: "Linket kapsz e-mailben", d: "Meghallgatod, letöltöd, továbbküldöd a DJ-nek. Csak ekkor terheljük a kártyád." },
  ];
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.t} className="card relative p-6">
          <span className="absolute right-5 top-4 font-display text-5xl font-black text-gold/15" aria-hidden>{i + 1}</span>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-red text-on-gold">{s.icon}</span>
          <h3 className="mt-4 font-display text-xl font-bold">{i + 1}. {s.t}</h3>
          <p className="mt-2 text-muted">{s.d}</p>
        </li>
      ))}
    </ol>
  );
}

export function Reviews({ reviews, catalog, stats }: { reviews: Review[]; catalog: Pick<Catalog, "occasions" | "artists">; stats: SiteStats }) {
  return (
    <>
      <p className="mb-6 text-center text-sm text-muted">
        <Stars value={stats.averageRating} /> <b className="text-ink">{stats.averageRating.toLocaleString("hu-HU")}</b> átlag {stats.reviewCount} ellenőrzött vélemény alapján
      </p>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {reviews.map((r) => {
          const occ = catalog.occasions.find((o) => o.id === r.occasionId);
          const artist = catalog.artists.find((a) => a.id === r.artistId);
          return (
            <li key={r.id} className="card w-[85%] shrink-0 snap-center p-5 md:w-auto">
              <div className="flex items-center justify-between">
                <Stars value={r.rating} />
                {occ && <span className="rounded-full bg-red/15 px-2.5 py-0.5 text-xs font-bold text-red">{occ.emoji} {occ.label}</span>}
              </div>
              <blockquote className="mt-3 text-[15px] leading-relaxed">„{r.text}”</blockquote>
              <p className="mt-4 text-sm font-bold">{r.authorName} <span className="font-normal text-muted">· {r.location}</span></p>
              <p className="text-xs text-muted">{artist?.name} dalát rendelte{r.verified ? " · ✔ ellenőrzött vásárlás" : ""}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Comparison() {
  const rows: [string, string, string][] = [
    ["Személyes", "Benne a neve, a közös sztorink, a belsős poénok", "Bárkinek adhatnád"],
    ["Hatás", "Könnyes szem, kiabálós refrén, hajnalig szól", "„Ó, köszi…” – és a fiók mélyére kerül"],
    ["Közösségi élmény", "Az egész násznép együtt énekli", "Egy ember bontja ki"],
    ["Tartósság", "Évek múlva is elő lehet venni – örök emlék", "Elkopik, eltörik, elveszik"],
    ["Szállítás", "Akár pár órán belül, e-mailben", "Bolt, sorban állás, csomagolás"],
  ];
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-2 border-b border-line text-sm font-bold sm:grid-cols-[1fr_1.2fr_1fr] sm:text-base">
        <div className="hidden p-4 sm:block" />
        <div className="flex items-center gap-2 bg-gold/10 p-4 text-gold"><GiftIcon size={18} /> Saját nóta</div>
        <div className="p-4 text-muted">Átlagos ajándék</div>
      </div>
      {rows.map(([k, a, b]) => (
        <div key={k} className="grid grid-cols-2 border-b border-line text-sm last:border-0 sm:grid-cols-[1fr_1.2fr_1fr]">
          <div className="col-span-2 px-4 pt-4 font-semibold sm:col-span-1 sm:p-4">{k}</div>
          <div className="flex gap-2 bg-gold/5 p-4"><CheckIcon size={16} className="mt-0.5 shrink-0 text-gold" />{a}</div>
          <div className="p-4 text-muted">{b}</div>
        </div>
      ))}
      <p className="p-5 text-center font-display text-xl font-bold">Nem bögre, nem zokni. <span className="text-gradient-gold">Saját nóta.</span></p>
    </div>
  );
}

export function Pricing({ catalog }: { catalog: Catalog }) {
  const minSurcharge = Math.min(...catalog.artists.map((a) => a.surchargeHuf), 0);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {catalog.packages.map((p) => (
          <div key={p.id} className={`card relative flex flex-col p-6 ${p.highlight ? "border-gold shadow-xl shadow-gold/10 md:-translate-y-2" : ""}`}>
            {p.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-extrabold uppercase text-on-gold">Legnépszerűbb</span>}
            <h3 className="font-display text-2xl font-bold">{p.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-red"><span aria-hidden>⏱</span> {p.deliveryLabel}</p>
            <p className="mt-4 font-display text-4xl font-black">{formatHuf(p.priceHuf + minSurcharge)}<span className="text-base font-semibold text-muted">-tól</span></p>
            <p className="mt-3 flex-1 text-muted">{p.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {["Teljes, egyedi dal a választott előadó hangján", "Személyre szabott dalszöveg", "Letölthető hangfájl + saját dal-oldal", "2 ingyenes javítási kör"].map((f) => (
                <li key={f} className="flex gap-2"><CheckIcon size={16} className="mt-0.5 shrink-0 text-gold" />{f}</li>
              ))}
            </ul>
            <CtaButton preset={{}} packageId={p.id} className={`mt-6 w-full ${p.highlight ? "" : "!bg-none !bg-surface-2 !text-ink border border-line !shadow-none"}`}>
              Húzd rá!
            </CtaButton>
          </div>
        ))}
      </div>
      <div className="card mt-6 p-6">
        <h3 className="font-display text-xl font-bold">Extrák, hogy még nagyobb legyen a buli</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {catalog.extras.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
              <span><b>{e.name}</b><br /><span className="text-sm text-muted">{e.description}</span></span>
              <span className="shrink-0 font-bold text-gold">{e.priceHuf ? `+${formatHuf(e.priceHuf)}` : "ingyenes"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">Az előadói felár előadónként eltérő ({catalog.artists.map((a) => `${a.name}: +${formatHuf(a.surchargeHuf)}`).join(", ")}). Elégedettségi garancia: ha a 2 javítás után sem tetszik, visszaadjuk az árát.</p>
      </div>
    </>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {faqs.map((f) => (
        <details key={f.id} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold">
            {f.question}
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-gold transition group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="px-5 pb-5 text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-wine via-bg-2 to-navy py-20 text-center text-white">
      <div className="disco-bg" aria-hidden><div className="disco-dots" /></div>
      <div className="relative z-10 mx-auto max-w-2xl px-4">
        <h2 className="font-display text-4xl font-black sm:text-5xl">Lagzi lesz? <span className="text-gradient-gold">Húzzuk rá!</span></h2>
        <p className="mt-4 text-lg text-white/80">{SITE.promise}</p>
        <CtaButton className="mt-8 px-10 py-4 text-lg">Húzd rá!</CtaButton>
      </div>
    </section>
  );
}
