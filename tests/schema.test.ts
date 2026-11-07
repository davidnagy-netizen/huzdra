// A Supabase-séma ellenőrzése beágyazott Postgresben (PGlite): minden TypeScript-mező kap-e oszlopot,
// helyes-e a típus, és működik-e a feladat-lefoglaló és a GDPR-takarítás.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { TABLES, fromRow, orderToRow, toRow } from "../src/lib/db/mapping";

const fixture = JSON.parse(fs.readFileSync("tests/fixtures/sample-db.json", "utf8"));
let pg: PGlite;
const types: Record<string, Record<string, string>> = {};

before(async () => {
  pg = new PGlite();
  await pg.exec(fs.readFileSync("supabase/migrations/0001_init.sql", "utf8"));
  const cols = await pg.query<{ table_name: string; column_name: string; data_type: string }>(
    "select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'",
  );
  for (const c of cols.rows) (types[c.table_name] ??= {})[c.column_name] = c.data_type;
});

async function insert(table: string, row: Record<string, unknown>) {
  const t = types[table];
  assert.ok(t, `nincs ilyen tábla: ${table}`);
  const keys = Object.keys(row);
  for (const k of keys) assert.ok(k in t, `${table}: hiányzó oszlop "${k}"`);
  const vals = keys.map((k) => {
    const v = row[k];
    if (t[k] === "jsonb") return JSON.stringify(v);
    if (v === "" && ["date", "timestamp with time zone"].includes(t[k])) return null;
    return v;
  });
  const cols = keys.map((k) => `"${k}"`).join(",");
  const params = keys.map((_, i) => `$${i + 1}`).join(",");
  await pg.query(`insert into ${table} (${cols}) values (${params})`, vals);
}

test("katalógus beírható (előadók, alkalmak, stílusok, mintadalok, csomagok, extrák, kuponok, GYIK, vélemények)", async () => {
  for (const a of fixture.artists) await insert(TABLES.artists, toRow(a));
  for (const o of fixture.occasions) await insert(TABLES.occasions, toRow(o));
  for (const s of fixture.styles) await insert(TABLES.styles, toRow(s));
  for (const s of fixture.samples) await insert(TABLES.samples, toRow(s));
  for (const p of fixture.packages) await insert(TABLES.packages, toRow(p));
  for (const e of fixture.extras) await insert(TABLES.extras, toRow(e));
  for (const c of fixture.coupons) await insert(TABLES.coupons, toRow(c));
  for (const f of fixture.faqs) await insert(TABLES.faqs, toRow(f));
  for (const r of fixture.reviews) await insert(TABLES.reviews, toRow(r));
  const n = await pg.query<{ c: number }>("select count(*)::int c from artists");
  assert.equal(n.rows[0].c, fixture.artists.length);
});

test("rendelések, jegyek, előnézetek, tanítás, piszkozatok, e-mailek beírhatók és visszaolvashatók", async () => {
  assert.ok(fixture.orders.length > 0 && fixture.tickets.length > 0 && fixture.previews.length > 0, "a fixture-nek tartalmaznia kell adatot");
  for (const o of fixture.orders) await insert(TABLES.orders, orderToRow({ version: 1, ...o }));
  for (const t of fixture.tickets) await insert(TABLES.tickets, toRow(t));
  for (const p of fixture.previews) await insert(TABLES.previews, toRow(p));
  for (const s of fixture.trainingSamples) await insert(TABLES.trainingSamples, toRow(s));
  for (const j of fixture.trainingJobs) await insert(TABLES.trainingJobs, toRow(j));
  for (const d of fixture.drafts) await insert(TABLES.drafts, toRow(d));
  for (const m of fixture.outbox) await insert(TABLES.emails, toRow(m));
  for (const l of fixture.leads) await insert(TABLES.leads, toRow(l));
  for (const w of fixture.waitlist) await insert(TABLES.waitlist, toRow(w));
  await insert("settings", { id: 1, data: fixture.settings });

  const r = await pg.query<Record<string, unknown>>("select * from orders where id = $1", [fixture.orders[0].id]);
  const back = fromRow<Record<string, unknown>>(r.rows[0], ["email", "artist_id"]);
  const orig = fixture.orders[0];
  assert.equal(back.code, orig.code);
  assert.deepEqual(back.data, orig.data);
  assert.deepEqual(back.events, orig.events);
  assert.deepEqual(back.revisionNotes, orig.revisionNotes);
  assert.equal(new Date(back.dueAt as string).toISOString(), orig.dueAt);
});

test("ismert előadó licenc nélkül nem lehet elérhető (adatbázis-kényszer)", async () => {
  const bad = { ...fixture.artists[0], id: "art_x", slug: "x", kind: "celebrity", availability: "available", licenseSignedAt: null, voiceModelId: "" };
  await assert.rejects(() => insert(TABLES.artists, toRow(bad)));
});

test("tanító minta jogtisztaság-megerősítés nélkül nem kerülhet be", async () => {
  await assert.rejects(() => insert(TABLES.trainingSamples, { id: "ts_x", title: "x", storage_path: "a", rights_confirmed: false, uploaded_by: "a" }));
});

test("claim_jobs: egy feladatot nem ad ki kétszer, a jövőbelit még nem", async () => {
  for (let i = 0; i < 3; i++) await pg.query("insert into jobs (name, payload) values ('order.advance', $1)", [JSON.stringify({ orderId: `o${i}` })]);
  await pg.query("insert into jobs (name, payload, run_at) values ('order.advance', '{}', now() + interval '1 hour')");
  const a = await pg.query<{ id: number }>("select * from claim_jobs(2)");
  const b = await pg.query<{ id: number }>("select * from claim_jobs(2)");
  const c = await pg.query<{ id: number }>("select * from claim_jobs(2)");
  assert.equal(a.rows.length, 2);
  assert.equal(b.rows.length, 1);
  assert.equal(c.rows.length, 0);
  assert.equal(new Set([...a.rows, ...b.rows].map((r) => r.id)).size, 3);
});

test("purge_expired_stories törli a lejárt személyes történetet, a nevet megtartja", async () => {
  const id = fixture.orders[0].id;
  await pg.query("update orders set story_retention_until = now() - interval '1 day' where id = $1", [id]);
  const res = await pg.query<{ n: number }>("select purge_expired_stories() n");
  assert.ok(res.rows[0].n >= 1);
  const r = await pg.query<{ data: Record<string, unknown> }>("select data from orders where id = $1", [id]);
  assert.equal(r.rows[0].data.memories, undefined);
  assert.ok(r.rows[0].data.recipientName);
});
