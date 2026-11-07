import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, PromptAction } from "@/components/admin/Action";
import { LyricsEditor } from "@/components/admin/LyricsEditor";
import { Card, INTENT_LABELS, PageTitle, StatusBadge, TicketBadge, Tone, fmtDate } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";
import { autoQcChecks } from "@/lib/pipeline/orchestrator";
import { STATUS_LABELS } from "@/lib/pipeline/state-machine";
import { formatHuf } from "@/lib/pricing";
import { SITE } from "@/lib/site";

export const metadata = { title: "Rendelés" };

export default async function OrderDetail(props: PageProps<"/admin/rendelesek/[id]">) {
  const { id } = await props.params;
  const repo = getRepo();
  const o = await repo.getOrder(id);
  if (!o) notFound();
  const [artist, tickets, occasions, styles] = await Promise.all([repo.getArtistById(o.data.artistId), repo.listTickets({ orderId: o.id }), repo.listOccasions(), repo.listStyles()]);
  const api = `/api/admin/orders/${o.id}`;
  const qc = autoQcChecks(o);
  const d = o.data;
  const row = (k: string, v: React.ReactNode) => (v ? <div className="flex justify-between gap-4 border-t border-line py-1.5 text-sm first:border-0"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div> : null);
  const active = !["cancelled", "done"].includes(o.status);

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/rendelesek" className="text-muted hover:text-ink">← Rendelések</Link></p>
      <PageTitle
        title={`${o.code} · ${d.recipientName}`}
        sub={`${artist?.name ?? "?"} · ${formatHuf(o.price.totalHuf)} · leadva ${fmtDate(o.createdAt)} · határidő ${fmtDate(o.dueAt)}`}
        actions={<StatusBadge status={o.status} />}
      />

      {o.attention && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-crit/40 bg-crit/10 p-4 text-sm" role="alert">
          <span><b className="text-crit">⚠ Figyelmet igényel:</b> {o.attention}</span>
          <ActionButton url={api} body={{ action: "clear_attention" }} label="Megoldva, folytatás" />
        </div>
      )}

      <Card title="Műveletek" className="mb-4">
        <div className="flex flex-wrap gap-2">
          {o.status === "qc" && <ActionButton url={api} body={{ action: "approve_qc" }} label="QC jóváhagyás és kézbesítés" variant="primary" />}
          {o.status === "awaiting_artist_approval" && <ActionButton url={api} body={{ action: "artist_approve" }} label="Szöveg jóváhagyása (előadó nevében)" variant="primary" />}
          {o.status === "moderation_hold" && <ActionButton url={api} body={{ action: "release_moderation" }} label="Moderáció feloldása, folytatás" variant="primary" confirm="Biztosan rendben van a tartalom?" />}
          {["qc", "delivered", "done"].includes(o.status) && <ActionButton url={api} body={{ action: "regenerate_audio" }} label="Hang újragenerálása" />}
          {active && <ActionButton url={api} body={{ action: "regenerate_lyrics" }} label="Szöveg újragenerálása" confirm="Új dalszöveg készül (és utána új hang). Folytatod?" />}
          {["delivered", "done"].includes(o.status) && <ActionButton url={api} body={{ action: "resend" }} label="Kézbesítő e-mail újraküldése" />}
          {["delivered", "done"].includes(o.status) && <a className="btn-ghost !py-2 text-sm" href={`/dal/${o.songToken}`} target="_blank">Dal-oldal ↗</a>}
          <a className="btn-ghost !py-2 text-sm" href={`/rendelesem/${o.code}?k=${o.statusKey}`} target="_blank">Ügyfél követő oldala ↗</a>
          {o.status !== "cancelled" && (
            o.payment.state === "captured"
              ? <ActionButton url={api} body={{ action: "cancel", refund: true }} label="Lemondás + visszatérítés" variant="danger" confirm={`Visszatérítünk ${formatHuf(o.price.totalHuf)}-ot és lemondjuk a rendelést. Biztos?`} />
              : <ActionButton url={api} body={{ action: "cancel", refund: false }} label="Lemondás (zárolás feloldása)" variant="danger" confirm="Lemondod a rendelést? A kártyazárolás feloldódik." />
          )}
        </div>
        {active && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Névjavítás (ingyenes, újragenerál)</p>
              <PromptAction url={api} action="correct_name" field="name" label="Név javítása" placeholder={`Jelenleg: ${d.recipientName}`} />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Szöveg újragenerálása utasítással</p>
              <PromptAction url={api} action="regenerate_lyrics" field="instruction" label="Újragenerálás" placeholder="pl. vegyük ki a sógort, legyen benne a kutya, Bodri" />
            </div>
            {o.status === "awaiting_artist_approval" && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Előadói elutasítás indoklással</p>
                <PromptAction url={api} action="artist_reject" field="instruction" label="Elutasítás" placeholder="pl. ne legyen benne alkohol" />
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Kiejtés (csak a hang készül újra)</p>
              <PromptAction url={api} action="pronunciation" field="text" label="Mentés" placeholder={d.pronunciation || "pl. ZSÓ-fi, hosszú ó"} />
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Dal">
            {o.audio?.url ? <audio controls preload="none" src={o.audio.url} className="mb-4 w-full" /> : <p className="mb-4 text-sm text-muted">Még nincs hangfájl.</p>}
            {o.lyrics ? <LyricsEditor orderId={o.id} title={o.lyrics.title} text={o.lyrics.text} /> : <p className="text-sm text-muted">A dalszöveg még nem készült el.</p>}
            {o.lyrics && <p className="mt-3 text-xs text-muted">v{o.lyrics.version} · {o.lyrics.generatedBy}{o.audio ? ` · vízjel: ${o.audio.watermarkId}` : ""}</p>}
          </Card>
          <Card title="Automatikus QC">
            {qc.ok ? <Tone tone="good">Minden ellenőrzés rendben</Tone> : <ul className="space-y-1">{qc.failed.map((f) => <li key={f}><Tone tone="warn">{f}</Tone></li>)}</ul>}
            {!o.moderation.ok && (
              <ul className="mt-3 text-sm">{o.moderation.flags.map((f, i) => <li key={i} className="text-muted">Tartalomszűrő: <b className="text-ink">{f.category}</b> – „{f.match}” ({f.field ?? "?"}, {f.severity})</li>)}</ul>
            )}
          </Card>
          <Card title="Történet">
            <dl>
              {row("Alkalom", occasions.find((x) => x.id === d.occasionId)?.label ?? d.occasionOther)}
              {row("Stílus / tempó / hangulat", [styles.find((x) => x.id === d.styleId)?.label, d.tempo, d.mood].filter(Boolean).join(" · "))}
              {row("Hangszer", [d.violin && "hegedű", d.cimbalom && "cimbalom"].filter(Boolean).join(", "))}
              {row("Név / becenév", [d.recipientName, d.nickname].filter(Boolean).join(" / "))}
              {row("Kiejtés", d.pronunciation)}
              {row("Kapcsolat", d.relation === "egyéb" ? d.relationOther : d.relation)}
              {row("Életkor / évforduló", d.ageOrYears)}
              {row("Település", d.town)}
              {row("Családtagok", d.familyNames)}
              {row("Kedvenc mondás", d.favoriteSaying)}
            </dl>
            {d.memories && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm"><b>Emlékek:</b> {d.memories}</p>}
            {d.jokes && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm"><b>Poénok:</b> {d.jokes}</p>}
            {d.avoid && <p className="mt-2 rounded-xl border border-crit/40 p-3 text-sm"><b className="text-crit">NE említsük:</b> {d.avoid}</p>}
            {o.revisionNotes.length > 0 && (
              <div className="mt-3"><p className="text-xs font-bold uppercase tracking-wider text-muted">Javítási kérések</p><ul className="mt-1 list-disc pl-5 text-sm">{o.revisionNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Ügyfél és fizetés">
            <dl>
              {row("E-mail", <a className="text-gold" href={`mailto:${d.email}`}>{d.email}</a>)}
              {row("Telefon", d.phone)}
              {row("Számlázás", `${d.billingName}, ${d.billingZip} ${d.billingCity}, ${d.billingAddress}`)}
              {row("Adószám", d.billingTaxNumber)}
              {row("Csomag", d.packageId)}
              {row("Extrák", d.extras.join(", "))}
              {row("Kupon", o.price.couponApplied)}
              {row("Fizetés", `${o.payment.state} · ${o.payment.provider}`)}
              {row("Javítások", `${o.revisionsUsed}/${SITE.revisionRounds} kör · ${o.nameCorrections ?? 0} névjavítás`)}
              {row("Forrás", o.previewId ? "Hirdetési előnézet" : "Varázsló")}
            </dl>
            <ul className="mt-3 space-y-1 text-sm">
              {o.price.lines.map((l) => <li key={l.label} className="flex justify-between"><span className="text-muted">{l.label}</span><span className="tabular-nums">{formatHuf(l.amountHuf)}</span></li>)}
              {o.price.discountHuf > 0 && <li className="flex justify-between text-gold"><span>Kedvezmény</span><span>−{formatHuf(o.price.discountHuf)}</span></li>}
              <li className="flex justify-between border-t border-line pt-1 font-bold"><span>Összesen</span><span>{formatHuf(o.price.totalHuf)}</span></li>
            </ul>
          </Card>

          {tickets.length > 0 && (
            <Card title="Szupport">
              <ul className="space-y-2 text-sm">
                {tickets.map((t) => (
                  <li key={t.id}><Link href={`/admin/szupport/${t.id}`} className="font-semibold hover:text-gold">{INTENT_LABELS[t.intent ?? "other"]}</Link> <TicketBadge status={t.status} /><p className="truncate text-xs text-muted">{t.message}</p></li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Belső jegyzetek">
            <ul className="mb-3 space-y-2 text-sm">
              {(o.notes ?? []).map((n, i) => <li key={i} className="rounded-lg bg-surface-2 p-2">{n.text}<p className="text-xs text-muted">{n.by} · {fmtDate(n.at)}</p></li>)}
            </ul>
            <PromptAction url={api} action="note" field="text" label="Hozzáadás" placeholder="Jegyzet…" multiline />
          </Card>

          <Card title="Idővonal">
            <ol className="space-y-2 text-sm">
              {[...o.events].reverse().map((e, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <b>{STATUS_LABELS[e.status]}</b> <span className="text-xs text-muted">· {fmtDate(e.at)} · {e.actor}</span>
                  {e.note && <p className="text-xs text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
