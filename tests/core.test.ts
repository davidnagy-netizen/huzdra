import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice } from "../src/lib/pricing";
import { canTransition, transition, InvalidTransitionError } from "../src/lib/pipeline/state-machine";
import { moderateFields, moderateText } from "../src/lib/moderation";
import { EMPTY_WIZARD, sanitizeWizard, validateAll, validateStep } from "../src/lib/wizard-schema";
import { MockLyricsAdapter } from "../src/lib/pipeline/adapters/mock";
import { synthesizeWav } from "../src/lib/audio/synth";
import * as seed from "../src/lib/data/seed";
import type { Order, WizardData } from "../src/lib/types";
import { MockRepository } from "../src/lib/db/mock-repository";
import { formatSurcharge } from "../src/lib/pricing";

const catalog = { packages: seed.packages, extras: seed.extras };
const robi = seed.artists.find((a) => a.id === "art_tuzrozsa_duo")!; // 2000 Ft felár

test("árazás: csomag + előadói felár + extrák + kupon", () => {
  const p = calculatePrice({ packageId: "holnapra", artist: robi, extras: ["pdf", "elo-eloadas"], coupon: { code: "LAGZI10", percentOff: 10, active: true } }, catalog);
  assert.equal(p.lines.length, 3); // a lead-típusú extra nem kerül pénzbe
  assert.equal(p.discountHuf, 2139);
  assert.equal(p.totalHuf, 16900 + 2000 + 2490 - 2139);
  assert.equal(p.couponApplied, "LAGZI10");
});

test("árazás: fix összegű kupon nem viheti negatívba", () => {
  const p = calculatePrice({ packageId: "", artist: null, extras: [], coupon: { code: "X", amountOffHuf: 99999, active: true } }, catalog);
  assert.equal(p.totalHuf, 0);
  assert.equal(p.discountHuf, 0);
});

test("állapotgép: érvényes és érvénytelen átmenetek", () => {
  assert.ok(canTransition("paid_authorized", "lyrics_ready"));
  assert.ok(canTransition("awaiting_artist_approval", "lyrics_ready"));
  assert.ok(!canTransition("draft", "delivered"));
  assert.ok(!canTransition("done", "revision_requested"));
  const o = { status: "delivered", events: [] } as unknown as Order;
  assert.equal(transition(o, "revision_requested").events.length, 1);
  assert.throws(() => transition(o, "qc"), InvalidTransitionError);
});

test("moderáció: a műfaj neve nem tiltott, a gyalázkodás igen", () => {
  assert.equal(moderateText("Szeretjük a cigány zenét és a roma balladákat").length, 0);
  assert.equal(moderateText("büdös cigány")[0]?.severity, "block");
  assert.equal(moderateText("Szavazz a Fideszre!")[0]?.category, "politikai");
  assert.equal(moderateText("Látogass el a www.pelda.hu oldalra")[0]?.category, "reklam");
  assert.ok(moderateFields({ a: "Balatoni nyaralás, fagyizás" }).ok);
});

const full: WizardData = {
  ...EMPTY_WIZARD,
  artistId: robi.id, occasionId: "lakodalom", tempo: "porgos", mood: "vicces",
  recipientName: "Kovács Zsófia", relation: "menyasszony",
  memories: "A Balatonon ismerkedtek meg egy elázott fagyizós estén, azóta elválaszthatatlanok.",
  packageId: "holnapra", email: "teszt@example.com", billingName: "Teszt Elek", billingZip: "1111",
  billingCity: "Budapest", billingAddress: "Fő utca 1.", consentTerms: true, consentPrivacy: true,
};

test("varázsló validáció: lépésenként és egészben", () => {
  assert.ok(validateStep(0, EMPTY_WIZARD).artistId);
  assert.ok(validateStep(4, { ...full, memories: "rövid" }).memories);
  assert.ok(validateStep(5, { ...full, extras: ["elo-eloadas"] }).liveEventDate);
  assert.equal(validateAll(full, { validArtistIds: [robi.id] }), null);
  assert.equal(validateAll({ ...full, artistId: "x" }, { validArtistIds: [robi.id] })?.step, 0);
});

test("sanitizeWizard eldobja az ismeretlen és rossz típusú mezőket", () => {
  const s = sanitizeWizard({ recipientName: "Anna", evil: "<script>", consentTerms: "yes", extras: ["pdf", 3] });
  assert.equal(s.recipientName, "Anna");
  assert.equal((s as unknown as Record<string, unknown>).evil, undefined);
  assert.equal(s.consentTerms, false);
  assert.deepEqual(s.extras, ["pdf"]);
});

test("mock dalszöveg: a név és a becenév szerepel benne", async () => {
  const r = await new MockLyricsAdapter().generate({ data: { ...full, nickname: "Zsófi" }, artist: robi, occasionLabel: "Lakodalom", styleLabel: null });
  assert.match(r.text, /Kovács Zsófia/);
  assert.match(r.text, /\[Refrén\]/);
  assert.match(r.title, /Zsófi/);
});

test("szintetizátor: érvényes WAV, metaadattal", () => {
  const wav = synthesizeWav({ seed: "x", tempo: "porgos", minor: false, lead: "violin", seconds: 2, metadata: { comment: "wm_123" } });
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.ok(wav.includes(Buffer.from("wm_123")));
});

test("előadók: a hamarosan-előadók nem rendelhetők, de listázhatók", async () => {
  const repo = new MockRepository(null);
  const available = await repo.listArtists();
  const soon = await repo.listComingSoonArtists();
  assert.equal(available.length, 5);
  assert.ok(available.every((a) => a.kind === "house"));
  assert.deepEqual(soon.map((a) => a.slug).sort(), ["bitto-duo", "dogos-robi"]);
  const samples = await repo.listSamples();
  assert.ok(samples.every((s) => available.some((a) => a.id === s.artistId)));
  const bad = validateAll({ ...full, artistId: "art_dogos_robi" }, { validArtistIds: available.map((a) => a.id) });
  assert.equal(bad?.step, 0);
});

test("várólista: duplikált feliratkozás nem jön létre kétszer", async () => {
  const repo = new MockRepository(null);
  const e = { id: "w1", artistId: "art_bitto_duo", email: "A@b.hu", createdAt: "" };
  assert.equal((await repo.addToWaitlist(e)).created, true);
  assert.equal((await repo.addToWaitlist({ ...e, id: "w2", email: "a@b.hu" })).created, false);
});

test("felár megjelenítése", () => {
  assert.equal(formatSurcharge(0), "felár nélkül");
  assert.match(formatSurcharge(1500), /^\+1\s?500 Ft$/);
});
