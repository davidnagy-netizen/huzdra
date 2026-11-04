import "server-only";
import crypto from "node:crypto";
import { getRepo } from "../db";
import { calculatePrice } from "../pricing";
import { SITE, aiDisclosure } from "../site";
import type { Order, WizardData } from "../types";
import { validateAll } from "../wizard-schema";
import { getAdapters } from "./registry";
import { getQueue } from "./queue";
import { transition } from "./state-machine";
import { deliveryEmail, orderReceivedEmail } from "./emails";

const STEP_DELAY = () => Number(process.env.MOCK_STEP_DELAY_MS ?? 2500);
const AUTO_QC = () => process.env.MOCK_AUTO_QC !== "0";
const AUTO_ARTIST = () => process.env.MOCK_AUTO_ARTIST_APPROVAL !== "0";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function shortCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
const token = (bytes = 18) => crypto.randomBytes(bytes).toString("base64url");

export class OrderValidationError extends Error {
  constructor(public step: number, public errors: Record<string, string>) {
    super("Hibás rendelési adatok");
  }
}

function storyFields(d: WizardData): Record<string, string> {
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

/** Rendelés létrehozása: validálás → hiteles ár → kártya rögzítése → sorba állítás. */
export async function placeOrder(data: WizardData): Promise<Order> {
  const repo = getRepo();
  const adapters = getAdapters();
  const artists = await repo.listArtists();
  const invalid = validateAll(data, { validArtistIds: artists.map((a) => a.id) });
  if (invalid) throw new OrderValidationError(invalid.step, invalid.errors as Record<string, string>);

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
    lyrics: null,
    audio: null,
    revisionsUsed: 0,
    revisionNotes: [],
    dueAt: new Date(now.getTime() + pkg.deliveryHours * 3600_000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    storyRetentionUntil: new Date(now.getTime() + SITE.storyRetentionDays * 86400_000).toISOString(),
    events: [{ at: now.toISOString(), status: "draft", actor: "customer" }],
  };
  order = transition(order, "paid_authorized", `Kártya rögzítve (${payment.intentId}), terhelés a kézbesítéskor`);
  await repo.createOrder(order);

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
  const mail = orderReceivedEmail({ order, artistName: artist.name, statusUrl });
  await adapters.email.send({ to: data.email, ...mail });
  await repo.saveEmail({ id: token(6), to: data.email, ...mail, createdAt: now.toISOString() });

  await getQueue().enqueue({ name: "order.advance", payload: { orderId: order.id } }, STEP_DELAY());
  return order;
}

/** Egy lépéssel előrébb viszi a rendelést. A sor hívja, újrafuttatható (idempotens állapotonként). */
export async function advanceOrder(orderId: string): Promise<void> {
  const repo = getRepo();
  const adapters = getAdapters();
  const order = await repo.getOrder(orderId);
  if (!order) return;
  const artist = await repo.getArtistById(order.data.artistId);
  if (!artist) return;
  const again = () => getQueue().enqueue({ name: "order.advance", payload: { orderId } }, STEP_DELAY());
  const save = (o: Order) => repo.updateOrder(orderId, () => o);

  switch (order.status) {
    case "paid_authorized":
    case "revision_requested": {
      if (!order.moderation.ok) {
        await save(transition(order, "moderation_hold", "A történet kézi átnézésre vár (tartalomszűrő)"));
        return; // admin-sor: emberi döntés nélkül nem megy tovább
      }
      const [occasions, styles] = await Promise.all([repo.listOccasions(), repo.listStyles()]);
      const occasionLabel = occasions.find((o) => o.id === order.data.occasionId)?.label ?? order.data.occasionOther ?? "Ünnep";
      const styleLabel = styles.find((s) => s.id === order.data.styleId)?.label ?? null;
      const result = await adapters.lyrics.generate({
        data: order.data,
        artist,
        occasionLabel,
        styleLabel,
        revisionNotes: order.revisionNotes,
        previous: order.lyrics,
      });
      const check = await adapters.moderation.check({ lyrics: result.text, title: result.title });
      const withLyrics: Order = {
        ...order,
        lyrics: { ...result, version: (order.lyrics?.version ?? 0) + 1, generatedBy: adapters.lyrics.name },
      };
      if (!check.ok) {
        await save(transition({ ...withLyrics, moderation: check }, "moderation_hold", "A generált szöveg kézi átnézésre vár"));
        return;
      }
      await save(transition(withLyrics, "lyrics_ready", `Dalszöveg v${withLyrics.lyrics!.version}`));
      return again();
    }
    case "lyrics_ready": {
      if (artist.requiresApproval) {
        await save(transition(order, "awaiting_artist_approval", "Előadói jóváhagyási sorba került"));
        if (AUTO_ARTIST()) return again();
        return;
      }
      await save(transition(order, "audio_generating"));
      return again();
    }
    case "awaiting_artist_approval": {
      // Mock: automatikus jóváhagyás. Élesben az előadói portál dönt (approve / reject).
      if (!AUTO_ARTIST()) return;
      await save(transition(order, "audio_generating", "Előadó jóváhagyta (mock)", "artist"));
      return again();
    }
    case "audio_generating": {
      const backing = await adapters.music.generateBacking({
        orderId,
        tempo: order.data.tempo || "kozepes",
        styleId: order.data.styleId || null,
        mood: order.data.mood,
        instruments: { violin: order.data.violin, cimbalom: order.data.cimbalom },
        durationSec: 24,
      });
      const mix = await adapters.voice.sing({
        orderId,
        voiceModelId: artist.voiceModelId,
        lyrics: order.lyrics?.text ?? "",
        backingRef: backing.backingRef,
        pronunciationHints: [order.data.pronunciation].filter(Boolean),
      });
      const wm = await adapters.watermark.apply({ mixRef: mix.mixRef, orderId, artistId: artist.id });
      const v = (order.lyrics?.version ?? 1) + order.revisionsUsed * 10;
      const url = wm.url || `/api/audio/song/${order.songToken}?v=${v}`;
      await save(
        transition(
          { ...order, audio: { url, watermarkId: wm.watermarkId, generatedAt: new Date().toISOString() } },
          "qc",
          "Felvétel kész, QC-sorba került",
        ),
      );
      if (AUTO_QC()) return again();
      return;
    }
    case "qc": {
      if (!AUTO_QC()) return; // élesben az admin QC-sor hagyja jóvá
      await adapters.payment.capture(order.payment.intentId, order.price.totalHuf);
      const delivered = transition(
        { ...order, payment: { ...order.payment, state: "captured" } },
        "delivered",
        "QC rendben (mock), terhelés megtörtént, e-mail elküldve",
      );
      await save(delivered);
      const songUrl = `${SITE.url}/dal/${order.songToken}`;
      const mail = deliveryEmail({ order: delivered, artistName: artist.name, songUrl, disclosure: aiDisclosure(artist) });
      await adapters.email.send({ to: order.data.email, ...mail });
      await repo.saveEmail({ id: token(6), to: order.data.email, ...mail, createdAt: new Date().toISOString() });
      return;
    }
    default:
      return;
  }
}

export class RevisionError extends Error {}

export async function requestRevision(songToken: string, note: string): Promise<Order> {
  const repo = getRepo();
  const order = await repo.getOrderBySongToken(songToken);
  if (!order) throw new RevisionError("Nem található a dal.");
  if (order.status !== "delivered") throw new RevisionError("Most nem kérhető javítás ennél a dalnál.");
  if (order.revisionsUsed >= SITE.revisionRounds) throw new RevisionError("Elfogyott a 2 ingyenes javítási kör – írj nekünk, és megoldjuk!");
  const clean = note.trim().slice(0, 600);
  if (clean.length < 5) throw new RevisionError("Írd le pár szóban, mit javítsunk.");
  const { moderateText } = await import("../moderation");
  const flags = moderateText(clean, "revision");
  let next = transition(order, "revision_requested", clean, "customer");
  next = {
    ...next,
    revisionsUsed: order.revisionsUsed + 1,
    revisionNotes: [...order.revisionNotes, clean],
    moderation: flags.length ? { ok: false, flags } : order.moderation,
  };
  const saved = await repo.updateOrder(order.id, () => next);
  await getQueue().enqueue({ name: "order.advance", payload: { orderId: order.id } }, STEP_DELAY());
  return saved!;
}

export async function acceptSong(songToken: string): Promise<Order> {
  const repo = getRepo();
  const order = await repo.getOrderBySongToken(songToken);
  if (!order) throw new RevisionError("Nem található a dal.");
  if (order.status === "done") return order;
  if (order.status !== "delivered") throw new RevisionError("A dal még nem kész.");
  return (await repo.updateOrder(order.id, (o) => transition(o, "done", "Az ügyfél elfogadta", "customer")))!;
}

// A sor kezelőjének regisztrálása (modul betöltésekor egyszer).
getQueue().register("order.advance", (job) => advanceOrder(job.payload.orderId));
