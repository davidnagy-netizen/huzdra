import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeSupportMessage, extractBareName, extractNameFix } from "../src/lib/pipeline/support-rules";
import { autoQcChecks, replaceNamePart } from "../src/lib/pipeline/rules";
import { canTransition } from "../src/lib/pipeline/state-machine";
import { MockLyricsAdapter, MockTrainingAdapter } from "../src/lib/pipeline/adapters/mock";
import * as seed from "../src/lib/data/seed";
import { EMPTY_WIZARD } from "../src/lib/wizard-schema";
import type { Order } from "../src/lib/types";

const intent = (m: string) => analyzeSupportMessage({ subject: "", message: m, order: null });

test("szupport: névjavítás felismerése és az új név kinyerése", () => {
  const cases: [string, string, string?][] = [
    ["Sziasztok! Rossz névre rendeltem, nem Zsófi hanem Zsófia a helyes.", "Zsófia", "Zsófi"],
    ["Kati helyett Katalin legyen a dalban légyszi", "Katalin", "Kati"],
    ["Elírtam a nevet. A név helyesen: Bence", "Bence"],
    ["A helyes neve Szabó Réka, bocsi az elírásért!", "Szabó Réka"],
    ["Javítsátok a nevet erre: Dominik", "Dominik"],
    ["Józsefre javítsátok légyszi, nem Józsi", "József"],
  ];
  for (const [msg, neu, old] of cases) {
    const r = intent(msg);
    assert.equal(r.intent, "name_fix", msg);
    assert.equal(r.extracted.newName, neu, msg);
    if (old) assert.equal(r.extracted.oldName, old, msg);
    assert.ok(r.confidence >= 0.9, msg);
  }
});

test("szupport: bizonytalan névpanasz alacsony magabiztossággal (visszakérdezés)", () => {
  const r = intent("Szia, a név nem jó a dalban, mit tudok tenni?");
  assert.equal(r.intent, "name_fix");
  assert.equal(r.extracted.newName, undefined);
  assert.ok(r.confidence < 0.8);
});

test("szupport: a többi szándék", () => {
  assert.equal(intent("Mikor lesz kész a dal? HZ-AB12CD a rendelés").intent, "status");
  assert.equal(intent("Mikor lesz kész a dal? hz-ab12cd").extracted.orderCode, "HZ-AB12CD");
  assert.equal(intent("Rosszul ejti ki a nevet, Zsó-fi hosszú ó-val kellene").intent, "pronunciation_fix");
  assert.equal(intent("A 2. versszakba kerüljön bele a kutyánk, Bodri").intent, "content_change");
  assert.equal(intent("Kérem vissza a pénzemet, nem ezt kértem").intent, "refund");
  assert.equal(intent("Szeretném lemondani a rendelést").intent, "cancel");
  assert.equal(intent("Köszönjük, tökéletes lett, imádjuk!").intent, "thanks");
  assert.equal(intent("Nem hanem hanem helyett").intent, "other");
});

test("szupport: kisbetűs, nem név szavak nem lesznek névnek felismerve", () => {
  assert.equal(extractNameFix("nem a refrén hanem a versszak a gond"), null);
  assert.equal(extractNameFix("a tempó helyett lassabb kellene"), null);
});

test("szupport: rövid válasz visszakérdezésre", () => {
  assert.equal(extractBareName("Zsófia"), "Zsófia");
  assert.equal(extractBareName("A helyes név: Kovács Zsófia."), "Kovács Zsófia");
  assert.equal(extractBareName("szerintem még gondolkodom rajta egy kicsit"), null);
});

test("névjavítás: csak a hibás névrész cserélődik", () => {
  assert.equal(replaceNamePart("Kovács Zsófi", "Zsófia", "Zsófi"), "Kovács Zsófia");
  assert.equal(replaceNamePart("Kovács Zsófi", "Zsófia"), "Kovács Zsófia");
  assert.equal(replaceNamePart("Nagy Laci", "László", "Laci"), "Nagy László");
  assert.equal(replaceNamePart("Kati", "Katalin", "Kati"), "Katalin");
  assert.equal(replaceNamePart("Kovács Zsófi", "Szabó Réka"), "Szabó Réka");
  assert.equal(replaceNamePart("Kovács Zsófi", "Bence"), "Bence"); // nem azonosítható rész → teljes csere
});

function order(over: Partial<Order> = {}): Order {
  return {
    id: "o1", code: "HZ-TEST01", statusKey: "k", songToken: "t", status: "qc",
    data: { ...EMPTY_WIZARD, recipientName: "Kovács Zsófia", nickname: "Zsófi", avoid: "" },
    price: { lines: [], discountHuf: 0, totalHuf: 0, couponApplied: null },
    payment: { provider: "mock", intentId: "pi", state: "authorized" },
    moderation: { ok: true, flags: [] },
    lyrics: { title: "Éljen Zsófi!", text: "Hej, Zsófi, Zsófi, te vagy a buli lelke", version: 1, generatedBy: "x" },
    audio: { url: "/a", storagePath: "o1/v1.wav", watermarkId: "wm", generatedAt: "" },
    revisionsUsed: 0, revisionNotes: [], dueAt: "", createdAt: "", updatedAt: "", storyRetentionUntil: "", events: [],
    ...over,
  };
}

test("automatikus QC: zöld, ha minden rendben", () => {
  assert.deepEqual(autoQcChecks(order()), { ok: true, failed: [] });
});

test("automatikus QC: hiányzó név, tiltott téma, moderáció, hangfájl", () => {
  assert.ok(autoQcChecks(order({ lyrics: { title: "x", text: "Szóljon a zene", version: 1, generatedBy: "x" } })).failed.includes("a név nem szerepel a dalszövegben"));
  const avoid = order({ data: { ...order().data, avoid: "volt barátnő, válás" }, lyrics: { title: "x", text: "Zsófi, a volt barátnő is itt van", version: 1, generatedBy: "x" } });
  assert.ok(autoQcChecks(avoid).failed.some((f) => f.startsWith("a tiltott téma")));
  assert.ok(autoQcChecks(order({ moderation: { ok: false, flags: [{ category: "explicit", match: "x", severity: "block" }] } })).failed.includes("tartalomszűrő jelzés"));
  assert.ok(autoQcChecks(order({ moderation: { ok: false, flags: [] }, moderationReleased: true })).ok, "kézzel feloldott moderáció nem blokkol");
  assert.ok(autoQcChecks(order({ audio: null })).failed.includes("hiányzó hangfájl"));
});

test("állapotgép: újragenerálás és javítás átmenetei", () => {
  assert.ok(canTransition("qc", "paid_authorized"));
  assert.ok(canTransition("audio_generating", "paid_authorized"));
  assert.ok(canTransition("done", "revision_requested"));
  assert.ok(canTransition("delivered", "cancelled"));
  assert.ok(!canTransition("cancelled", "paid_authorized"));
});

test("előnézet: rövid dalszöveg (versszak + refrén, 2. versszak nélkül)", async () => {
  const artist = seed.artists[0];
  const r = await new MockLyricsAdapter().generate({ data: { ...EMPTY_WIZARD, recipientName: "Laci", mood: "vicces", memories: "x".repeat(50) }, artist, occasionLabel: "Születésnap", styleLabel: null, short: true });
  assert.match(r.text, /\[Refrén\]/);
  assert.doesNotMatch(r.text, /2\. versszak/);
});

test("mock tanítás: halad, majd modell-azonosítót ad", async () => {
  process.env.MOCK_TRAINING_SECONDS = "0";
  const t = new MockTrainingAdapter();
  const { providerJobId } = await t.start({ jobId: "j", type: "style", artistId: null, voiceName: null, name: "n", styleIds: [], samples: [{ id: "s", url: "u", title: "t", bpm: 120, musicalKey: "A-dúr", styleIds: [], instruments: [], mood: "" }] });
  const st = await t.status(providerJobId);
  assert.equal(st.status, "succeeded");
});

test("mock hangtanítás: hangmodell-azonosítót ad", async () => {
  process.env.MOCK_TRAINING_SECONDS = "0";
  const t = new MockTrainingAdapter();
  const { providerJobId } = await t.start({ jobId: "j", type: "voice", artistId: "art_celeb_1", voiceName: "Teszt Előadó", name: "hang v1", styleIds: [], samples: [{ id: "s", url: "u", title: "ének", bpm: null, musicalKey: null, styleIds: [], instruments: ["ének"], mood: "" }] });
  const st = await t.status(providerJobId);
  assert.equal(st.status, "succeeded");
  assert.match(st.status === "succeeded" ? st.modelId : "", /^voicemodel_/);
});
