import "server-only";
import crypto from "node:crypto";
import { getRepo } from "../db";
import { moderateText } from "../moderation";
import { calculatePrice } from "../pricing";
import { SITE, aiDisclosure } from "../site";
import { getStorage } from "../storage";
import type { Order, OrderEvent, Settings, WizardData } from "../types";
import { validateAll } from "../wizard-schema";
import { LyricsRefusedError } from "./adapters/anthropic";
import { cancelledEmail, deliveryEmail, orderReceivedEmail, revisionReadyEmail } from "./emails";
import { enqueue, pollDelay, stepDelay } from "./queue";
import { getAdapters } from "./registry";
import { autoQcChecks, fold, replaceNamePart } from "./rules";
import { transition } from "./state-machine";

export { autoQcChecks, fold, replaceNamePart };

const MAX_FAILURES = 3;
const AUDIO_TIMEOUT_MS = 45 * 60_000;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function shortCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const token = (bytes = 18) => crypto.randomBytes(bytes).toString("base64url");

export class OrderValidationError extends Error {
  constructor(public step: number, public errors: Record<string, string>) {
    super("Hibás rendelési adatok");
  }
}
export class OrderActionError extends Error {}

export function storyFields(d: WizardData): Record<string, string> {
  return {
    recipientName: d.recipientName,
    nickname: d.nickname,
    occasionOther: d.occasionOther,
    memories: d.memories,
    jokes: d.jokes,
    familyNames: d.familyNames,
    favoriteSaying: d.favoriteSaying,
    town: d.town,
  };
}

async function sendMail(to: string, mail: { subject: string; html: string }) {
  const repo = getRepo();
  await getAdapters().email.send({ to, ...mail });
  await repo.saveEmail({ id: token(6), to, ...mail, createdAt: new Date().toISOString() });
}

const save = (o: Order) => getRepo().updateOrder(o.id, () => o);
const advanceLater = (orderId: string, delay = stepDelay()) => enqueue("order.advance", { orderId }, delay);

function note(order: Order, text: string, actor: OrderEvent["actor"] = "system"): Order {
  return { ...order, events: [...order.events, { at: new Date().toISOString(), status: order.status, note: text, actor }] };
}

// ================================================================ rendelés felvétele

/** Rendelés létrehozása: validálás → hiteles ár → kártya rögzítése → sorba állítás. */
export async function placeOrder(data: WizardData, opts: { previewId?: string } = {}): Promise<Order> {
  const repo = getRepo();
  const adapters = getAdapters();
  const artists = await repo.listArtists();
  const invalid = validateAll(data, { validArtistIds: artists.map((a) => a.id) });
  if (invalid) throw new OrderValidationError(invalid.step, invalid.errors as Record<string, string>);

  const preview = opts.previewId ? await repo.getPreview(opts.previewId) : null;
  if (opts.previewId && (!preview || preview.status !== "ready" || preview.orderId)) {
    throw new OrderActionError("Ez az előnézet már nem vásárolható meg – generálj újat!");
  }

  const artist = artists.find((a) => a.id === data.artistId)!;
  const [packages, extras, coupon] = await Promise.all([
    repo.listPackages(),
    repo.listExtras(),
    data.coupon ? repo.getCoupon(data.coupon) : Promise.resolve(null),
  ]);
  const price = calculatePrice({ packageId: data.packageId, artist, extras: data.extras, coupon }, { packages, extras });
  const pkg = packages.find((p) => p.id === data.packageId)!;
  const code = `HZ-${shortCode()}`;
  const payment = await adapters.payment.authorize({ amountHuf: price.totalHuf, email: data.email, orderCode: code });
  const moderation = await adapters.moderation.check(storyFields(data));

  const now = new Date();
  let order: Order = {
    id: `ord_${token(9)}`,
    code,
    statusKey: token(12),
    songToken: token(18),
    status: "draft",
    data,
    price,
    payment: { provider: adapters.payment.name, intentId: payment.intentId, state: "authorized" },
    moderation,
    // Előnézetből: a már meghallgatott versszak + refrén a teljes dal alapja
    lyrics: preview?.lyrics ? { ...preview.lyrics, generatedBy: `preview:${preview.lyrics.generatedBy}` } : null,
    audio: null,
    revisionsUsed: 0,
    revisionNotes: [],
    dueAt: new Date(now.getTime() + pkg.deliveryHours * 3600_000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    storyRetentionUntil: new Date(now.getTime() + SITE.storyRetentionDays * 86400_000).toISOString(),
    events: [{ at: now.toISOString(), status: "draft", actor: "customer" }],
    previewId: preview?.id ?? null,
    nameCorrections: 0,
    notes: [],
    failures: 0,
    attention: null,
    regenMode: null,
    audioJob: null,
    version: 1,
  };
  order = transition(order, "paid_authorized", `Kártya rögzítve (${payment.intentId}), terhelés a kézbesítéskor${preview ? " · előnézetből" : ""}`);
  await repo.createOrder(order);
  if (preview) await repo.updatePreview(preview.id, { orderId: order.id });

  if (data.extras.includes("elo-eloadas")) {
    await repo.createLead({
      id: `lead_${token(6)}`,
      orderId: order.id,
      artistId: artist.id,
      name: data.billingName,
      email: data.email,
      phone: data.phone,
      eventDate: data.liveEventDate,
      location: data.liveEventLocation,
      note: data.liveEventNote,
      createdAt: now.toISOString(),
    });
  }

  const statusUrl = `${SITE.url}/rendelesem/${order.code}?k=${order.statusKey}`;
  await sendMail(data.email, orderReceivedEmail({ order, artistName: artist.name, statusUrl }));
  await advanceLater(order.id);
  return order;
}

// ================================================================ automatikus pipeline

async function fail(order: Order, step: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const failures = (order.failures ?? 0) + 1;
  console.error(`[pipeline] ${order.code} ${step} hiba (${failures}/${MAX_FAILURES}):`, msg);
  if (failures < MAX_FAILURES) {
    await save(note({ ...order, failures }, `${step} sikertelen, újrapróbálás (${failures}/${MAX_FAILURES}): ${msg}`));
    await advanceLater(order.id, Math.max(stepDelay(), 30_000 * failures));
  } else {
    await save(note({ ...order, failures, attention: `${step} többször sikertelen: ${msg}` }, `${step} – emberi beavatkozás szükséges`));
  }
}

/** Egy lépéssel előrébb viszi a rendelést. A sor hívja; állapotonként idempotens. */
export async function advanceOrder(orderId: string): Promise<void> {
  const repo = getRepo();
  const adapters = getAdapters();
  const order = await repo.getOrder(orderId);
  if (!order || order.status === "cancelled" || order.status === "done") return;
  const artist = await repo.getArtistById(order.data.artistId);
  if (!artist) return;
  const settings = await repo.getSettings();

  switch (order.status) {
    case "paid_authorized":
    case "revision_requested": {
      if (!order.moderation.ok && !order.moderationReleased) {
        await save({ ...transition(order, "moderation_hold", "A történet kézi átnézésre vár (tartalomszűrő)"), attention: "Moderáció: kétes tartalom" });
        return;
      }
      if (order.status === "revision_requested" && order.regenMode === "audio" && order.lyrics) {
        await save({ ...transition(order, "audio_generating", "Csak a hang készül újra"), audioJob: null });
        return advanceLater(orderId);
      }
      let result: { title: string; text: string };
      try {
        const [occasions, styles] = await Promise.all([repo.listOccasions(), repo.listStyles()]);
        const fromPreview = !!order.previewId && order.lyrics?.generatedBy?.startsWith("preview");
        result = await adapters.lyrics.generate({
          data: order.data,
          artist,
          occasionLabel: occasions.find((o) => o.id === order.data.occasionId)?.label ?? order.data.occasionOther ?? "Ünnep",
          styleLabel: styles.find((s) => s.id === order.data.styleId)?.label ?? null,
          revisionNotes: order.revisionNotes,
          previous: order.lyrics,
          expandFrom: fromPreview ? order.lyrics : null,
        });
      } catch (err) {
        if (err instanceof LyricsRefusedError) {
          await save({ ...transition(order, "moderation_hold", `Dalszöveg elutasítva: ${err.message}`), attention: `Dalszöveg-író elutasította: ${err.message}` });
          return;
        }
        return fail(order, "Dalszöveg-generálás", err);
      }
      const check = await adapters.moderation.check({ lyrics: result.text, title: result.title });
      const withLyrics: Order = {
        ...order,
        failures: 0,
        lyrics: { ...result, version: (order.lyrics?.version ?? 0) + 1, generatedBy: adapters.lyrics.name },
      };
      if (!check.ok && !order.moderationReleased) {
        await save({ ...transition({ ...withLyrics, moderation: check }, "moderation_hold", "A generált szöveg kézi átnézésre vár"), attention: "Moderáció: a generált szöveg kétes" });
        return;
      }
      await save(transition(withLyrics, "lyrics_ready", `Dalszöveg v${withLyrics.lyrics!.version}`));
      return advanceLater(orderId);
    }

    case "lyrics_ready": {
      if (artist.requiresApproval) {
        await save(transition(order, "awaiting_artist_approval", "Előadói jóváhagyási sorba került"));
        if (settings.autoArtistApproval) return advanceLater(orderId);
        return;
      }
      await save({ ...transition(order, "audio_generating"), audioJob: null });
      return advanceLater(orderId);
    }

    case "awaiting_artist_approval": {
      if (!settings.autoArtistApproval) return; // az előadói portál / admin dönt
      await save({ ...transition(order, "audio_generating", "Jóváhagyva (automatikus)", "artist"), audioJob: null });
      return advanceLater(orderId);
    }

    case "audio_generating":
      return stepAudio(order, artist.name, artist.voiceModelId);

    case "qc": {
      const qc = autoQcChecks(order);
      if (settings.autoQc && qc.ok) return deliver(order, "Automatikus QC rendben");
      if (!qc.ok) await save(note({ ...order, attention: `QC: ${qc.failed.join(", ")}` }, `Automatikus QC: ${qc.failed.join(", ")}`));
      return; // emberi QC (admin → QC-sor)
    }
    default:
      return;
  }
}

async function stepAudio(order: Order, artistName: string, voiceModelId: string) {
  const repo = getRepo();
  const adapters = getAdapters();
  const version = (order.lyrics?.version ?? 1) * 100 + (order.revisionsUsed ?? 0) * 10 + (order.nameCorrections ?? 0);
  const watermarkId = `wm_${order.id}_${version}`;

  if (!order.audioJob) {
    try {
      const jobs = await repo.listTrainingJobs();
      const styleModel = jobs.find((j) => j.active && j.status === "succeeded" && (!order.data.styleId || j.styleIds.includes(order.data.styleId as never)));
      const { jobId } = await adapters.audio.submit({
        kind: "song",
        refId: order.id,
        durationSec: order.data.extras.includes("plusz-versszak") ? 40 : 30,
        tempo: order.data.tempo || "kozepes",
        styleId: order.data.styleId || null,
        mood: order.data.mood,
        instruments: { violin: order.data.violin, cimbalom: order.data.cimbalom },
        lyrics: order.lyrics?.text ?? "",
        voiceModelId,
        styleModelId: styleModel?.modelId ?? null,
        pronunciationHints: [order.data.pronunciation].filter(Boolean),
        watermarkId,
        title: order.lyrics?.title ?? `${order.data.recipientName} dala`,
        artistName,
      });
      await save(note({ ...order, audioJob: { jobId, submittedAt: new Date().toISOString(), attempts: 0 } }, `Felvétel beküldve (${adapters.audio.name}${styleModel ? `, stílusmodell: ${styleModel.modelId}` : ""})`));
      return advanceLater(order.id, pollDelay());
    } catch (err) {
      return fail(order, "Felvétel beküldése", err);
    }
  }

  let res;
  try {
    res = await adapters.audio.poll(order.audioJob.jobId);
  } catch (err) {
    return fail(order, "Felvétel lekérdezése", err);
  }
  if (res.status === "pending") {
    if (Date.now() - Date.parse(order.audioJob.submittedAt) > AUDIO_TIMEOUT_MS) {
      return fail({ ...order, audioJob: null }, "Felvétel (időtúllépés)", new Error("A zene-API nem végzett időben"));
    }
    return advanceLater(order.id, pollDelay());
  }
  if (res.status === "failed") return fail({ ...order, audioJob: null }, "Felvétel", new Error(res.error));

  const ext = res.contentType.includes("wav") ? "wav" : res.contentType.includes("flac") ? "flac" : "mp3";
  const storagePath = `${order.id}/v${version}.${ext}`;
  try {
    await getStorage().upload("songs", storagePath, res.audio, res.contentType);
  } catch (err) {
    return fail(order, "Hangfájl mentése", err);
  }
  const fresh = (await repo.getOrder(order.id))!;
  if (fresh.status !== "audio_generating" || fresh.audioJob?.jobId !== order.audioJob.jobId) return; // közben újraindították
  await save(
    transition(
      {
        ...fresh,
        failures: 0,
        audioJob: null,
        regenMode: null,
        audio: { url: `/api/audio/song/${fresh.songToken}?v=${version}`, storagePath, watermarkId, generatedAt: new Date().toISOString() },
      },
      "qc",
      "Felvétel kész, minőségellenőrzés",
    ),
  );
  return advanceLater(order.id);
}

/** Kézbesítés: terhelés (első alkalommal), állapotváltás, e-mail. */
export async function deliver(order: Order, reason: string, actor: OrderEvent["actor"] = "system") {
  const repo = getRepo();
  const adapters = getAdapters();
  const artist = await repo.getArtistById(order.data.artistId);
  const firstDelivery = order.payment.state === "authorized";
  let o = order;
  if (firstDelivery) {
    await adapters.payment.capture(order.payment.intentId, order.price.totalHuf);
    o = { ...o, payment: { ...o.payment, state: "captured" } };
  }
  o = transition({ ...o, attention: null, deliveredAt: new Date().toISOString() }, "delivered", `${reason}${firstDelivery ? ", terhelés megtörtént" : ""}`, actor);
  await save(o);
  const songUrl = `${SITE.url}/dal/${order.songToken}`;
  const name = artist?.name ?? "Az előadó";
  await sendMail(
    order.data.email,
    firstDelivery
      ? deliveryEmail({ order: o, artistName: name, songUrl, disclosure: artist ? aiDisclosure(artist) : "" })
      : revisionReadyEmail({ order: o, artistName: name, songUrl, reason: "Elkészült a kért javítás" }),
  );
}

// ================================================================ admin / szupport műveletek

async function load(orderId: string) {
  const o = await getRepo().getOrder(orderId);
  if (!o) throw new OrderActionError("Nem található a rendelés.");
  return o;
}

export async function approveQc(orderId: string, by: string) {
  const o = await load(orderId);
  if (o.status !== "qc") throw new OrderActionError("Csak QC-állapotú rendelés hagyható jóvá.");
  await deliver(note(o, `QC jóváhagyva: ${by}`, "admin"), "QC jóváhagyva", "admin");
}

/** Csak a hang újragenerálása (pl. rossz kiejtés, admin QC-elutasítás). */
export async function regenerateAudio(orderId: string, by: string, reason = "Hang újragenerálása") {
  const o = await load(orderId);
  if (o.status === "qc" || o.status === "audio_generating") {
    await save({ ...transition(o, "audio_generating", `${reason} (${by})`, "admin"), audioJob: null });
  } else if (o.status === "delivered" || o.status === "done") {
    await save({ ...transition(o, "revision_requested", `${reason} (${by})`, "admin"), regenMode: "audio" });
  } else throw new OrderActionError("Ebben az állapotban nem generálható újra a hang.");
  await advanceLater(orderId);
}

/** Dalszöveg újragenerálása (opcionális utasítással). */
export async function regenerateLyrics(orderId: string, by: string, instruction?: string) {
  const o = await load(orderId);
  const notes = instruction?.trim() ? [...o.revisionNotes, instruction.trim()] : o.revisionNotes;
  const base = { ...o, revisionNotes: notes, regenMode: "lyrics" as const, audioJob: null, attention: null, failures: 0 };
  if (o.status === "delivered" || o.status === "done") await save(transition(base, "revision_requested", `Szöveg újragenerálása (${by})`, "admin"));
  else if (["lyrics_ready", "awaiting_artist_approval", "audio_generating", "qc", "moderation_hold"].includes(o.status))
    await save(transition(base, "paid_authorized", `Szöveg újragenerálása (${by})`, "admin"));
  else if (o.status === "paid_authorized" || o.status === "revision_requested") await save(note(base, `Szöveg újragenerálása (${by})`, "admin"));
  else throw new OrderActionError("Ebben az állapotban nem generálható újra a szöveg.");
  await advanceLater(orderId);
}

/** Admin kézzel javítja a dalszöveget → a hang újragenerálódik. */
export async function saveLyrics(orderId: string, by: string, title: string, text: string) {
  const o = await load(orderId);
  if (!text.trim()) throw new OrderActionError("Üres dalszöveg.");
  const lyrics = { title: title.trim() || o.lyrics?.title || "Dal", text: text.trim(), version: (o.lyrics?.version ?? 0) + 1, generatedBy: `admin:${by}` };
  const flags = moderateText(text, "lyrics");
  let next: Order = note({ ...o, lyrics }, `Dalszöveg kézzel szerkesztve (${by})`, "admin");
  if (flags.some((f) => f.severity === "block")) next = { ...next, attention: "A szerkesztett szöveg tiltott kifejezést tartalmazhat" };
  if (o.status === "qc") next = { ...transition(next, "audio_generating", "Hang újragenerálása a javított szöveggel", "admin"), audioJob: null };
  else if (o.status === "delivered" || o.status === "done") next = { ...transition(next, "revision_requested", "Javított szöveg", "admin"), regenMode: "audio" };
  else if (o.status === "moderation_hold") next = { ...transition({ ...next, moderationReleased: true, attention: null }, "lyrics_ready", "Szöveg javítva, moderáció feloldva", "admin") };
  await save(next);
  await advanceLater(orderId);
}

export async function releaseModeration(orderId: string, by: string) {
  const o = await load(orderId);
  if (o.status !== "moderation_hold") throw new OrderActionError("A rendelés nincs moderációs sorban.");
  const target = o.lyrics && o.events.at(-1)?.note?.includes("generált szöveg") ? "lyrics_ready" : "paid_authorized";
  await save({ ...transition(o, target, `Moderáció feloldva (${by})`, "admin"), moderationReleased: true, attention: null });
  await advanceLater(orderId);
}

export async function cancelOrder(orderId: string, by: string, refund: boolean) {
  const o = await load(orderId);
  if (o.status === "cancelled") return;
  const pay = getAdapters().payment;
  let state = o.payment.state;
  if (o.payment.state === "captured" && refund) {
    await pay.refund(o.payment.intentId, o.price.totalHuf);
    state = "refunded";
  } else if (o.payment.state === "authorized") {
    await pay.cancel(o.payment.intentId);
    state = "cancelled";
  }
  const next = transition({ ...o, payment: { ...o.payment, state }, attention: null, audioJob: null }, "cancelled", `Lemondva (${by})${state === "refunded" ? ", visszatérítve" : ""}`, "admin");
  await save(next);
  await sendMail(o.data.email, cancelledEmail({ order: next, refunded: state === "refunded" }));
}

export async function resendDelivery(orderId: string) {
  const o = await load(orderId);
  if (o.status !== "delivered" && o.status !== "done") throw new OrderActionError("A dal még nincs kézbesítve.");
  const artist = await getRepo().getArtistById(o.data.artistId);
  await sendMail(o.data.email, deliveryEmail({ order: o, artistName: artist?.name ?? "", songUrl: `${SITE.url}/dal/${o.songToken}`, disclosure: artist ? aiDisclosure(artist) : "" }));
  await save(note(o, "Kézbesítő e-mail újraküldve", "admin"));
}

export async function addNote(orderId: string, by: string, text: string) {
  const o = await load(orderId);
  await save({ ...o, notes: [...(o.notes ?? []), { at: new Date().toISOString(), text: text.trim().slice(0, 2000), by }] });
}

export async function clearAttention(orderId: string, by: string) {
  const o = await load(orderId);
  await save(note({ ...o, attention: null, failures: 0 }, `Figyelmeztetés lezárva (${by})`, "admin"));
  if (["paid_authorized", "revision_requested", "audio_generating", "lyrics_ready", "qc"].includes(o.status)) await advanceLater(orderId);
}

/** Névjavítás – a szupport-ágens és az admin is ezt hívja. */
export async function correctName(orderId: string, newName: string, oldName: string | undefined, actor: OrderEvent["actor"], settings?: Settings) {
  const o = await load(orderId);
  if (o.status === "cancelled") throw new OrderActionError("Lemondott rendelés.");
  const s = settings ?? (await getRepo().getSettings());
  const clean = newName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (clean.length < 2) throw new OrderActionError("Érvénytelen név.");
  const flags = moderateText(clean, "recipientName");
  if (flags.length) throw new OrderActionError("A megadott név kézi ellenőrzést igényel.");

  const useNick = !!oldName && !!o.data.nickname && fold(oldName) === fold(o.data.nickname);
  const prev = useNick ? o.data.nickname : o.data.recipientName;
  const replaced = useNick ? clean : replaceNamePart(prev, clean, oldName);
  if (fold(prev) === fold(replaced)) throw new OrderActionError("A dalban már ez a név szerepel.");
  const data = useNick ? { ...o.data, nickname: clean } : { ...o.data, recipientName: replaced };
  const why = `Névjavítás: „${prev}” → „${useNick ? clean : replaced}”`;
  const base: Order = { ...o, data, regenMode: "lyrics", audioJob: null, failures: 0, revisionNotes: [...o.revisionNotes, `${why}. Mindenhol a helyes nevet használd, helyes ragozással.`] };

  if (o.status === "paid_authorized" || o.status === "moderation_hold" || o.status === "revision_requested") {
    await save(note({ ...base, lyrics: o.status === "revision_requested" ? o.lyrics : null }, why, actor));
  } else if (["lyrics_ready", "awaiting_artist_approval", "audio_generating", "qc"].includes(o.status)) {
    await save(transition(base, "paid_authorized", why, actor));
  } else if (o.status === "delivered" || o.status === "done") {
    const free = s.freeNameFixes;
    if (!free && o.revisionsUsed >= SITE.revisionRounds) throw new OrderActionError("Elfogytak az ingyenes javítások.");
    await save(transition({ ...base, nameCorrections: (o.nameCorrections ?? 0) + 1, revisionsUsed: free ? o.revisionsUsed : o.revisionsUsed + 1 }, "revision_requested", why, actor));
  }
  await advanceLater(orderId);
  return { previous: prev, next: useNick ? clean : replaced };
}

/** Kiejtés javítása – csak a hang készül újra. */
export async function correctPronunciation(orderId: string, pronunciation: string, actor: OrderEvent["actor"]) {
  const o = await load(orderId);
  const data = { ...o.data, pronunciation: pronunciation.trim().slice(0, 300) };
  const why = `Kiejtés frissítve: ${data.pronunciation}`;
  if (o.status === "qc") await save({ ...transition({ ...o, data }, "audio_generating", why, actor), audioJob: null });
  else if (o.status === "delivered" || o.status === "done") await save({ ...transition({ ...o, data }, "revision_requested", why, actor), regenMode: "audio" });
  else await save(note({ ...o, data }, why, actor));
  await advanceLater(orderId);
}

// ================================================================ ügyféloldali műveletek

export class RevisionError extends Error {}

export async function requestRevisionForOrder(o: Order, note_: string, actor: OrderEvent["actor"] = "customer") {
  if (o.status !== "delivered" && o.status !== "done") throw new RevisionError("Most nem kérhető javítás ennél a dalnál.");
  if (o.revisionsUsed >= SITE.revisionRounds) throw new RevisionError("Elfogyott a 2 ingyenes javítási kör – írj nekünk, és megoldjuk!");
  const clean = note_.trim().slice(0, 600);
  if (clean.length < 5) throw new RevisionError("Írd le pár szóban, mit javítsunk.");
  const flags = moderateText(clean, "revision");
  let next = transition(o, "revision_requested", clean, actor);
  next = {
    ...next,
    regenMode: "lyrics",
    revisionsUsed: o.revisionsUsed + 1,
    revisionNotes: [...o.revisionNotes, clean],
    moderation: flags.length ? { ok: false, flags } : o.moderation,
    moderationReleased: flags.length ? false : o.moderationReleased,
  };
  const saved = await getRepo().updateOrder(o.id, () => next);
  await advanceLater(o.id);
  return saved!;
}

export async function requestRevision(songToken: string, note_: string): Promise<Order> {
  const o = await getRepo().getOrderBySongToken(songToken);
  if (!o) throw new RevisionError("Nem található a dal.");
  return requestRevisionForOrder(o, note_);
}

export async function acceptSong(songToken: string): Promise<Order> {
  const repo = getRepo();
  const order = await repo.getOrderBySongToken(songToken);
  if (!order) throw new RevisionError("Nem található a dal.");
  if (order.status === "done") return order;
  if (order.status !== "delivered") throw new RevisionError("A dal még nem kész.");
  return (await repo.updateOrder(order.id, (o) => transition(o, "done", "Az ügyfél elfogadta", "customer")))!;
}

/** Előadói (vagy admin általi) döntés a dalszövegről. */
export async function artistDecision(orderId: string, approve: boolean, by: string, instruction?: string) {
  const o = await load(orderId);
  if (o.status !== "awaiting_artist_approval") throw new OrderActionError("A rendelés nem vár előadói jóváhagyásra.");
  if (approve) {
    await save({ ...transition(o, "audio_generating", `Előadó jóváhagyta (${by})`, "artist"), audioJob: null });
  } else {
    const notes = instruction?.trim() ? [...o.revisionNotes, `Előadói kérés: ${instruction.trim()}`] : o.revisionNotes;
    await save(transition({ ...o, revisionNotes: notes, regenMode: "lyrics" }, "paid_authorized", `Előadó elutasította (${by})${instruction ? `: ${instruction}` : ""}`, "artist"));
  }
  await advanceLater(orderId);
}
