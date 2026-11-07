// Supabase kezdeti feltöltése: katalógus + beállítások (+ opcionálisan admin felhasználó).
// Futtatás:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/supabase-seed.ts --admin te@cimed.hu:ErősJelszó123
// Kapcsolók:
//   --admin email:jelszó   admin felhasználó létrehozása (Supabase Auth + admins tábla)
//   --demo-reviews         a KITALÁLT demóvélemények feltöltése (élesben NE használd!)
//   --demo-coupons         LAGZI10 / KOMA2000 tesztkuponok
import { createClient } from "@supabase/supabase-js";
import * as seed from "../src/lib/data/seed";
import { toRow } from "../src/lib/db/mapping";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Hiányzik: SUPABASE_URL és SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const args = process.argv.slice(2);

async function upsert(table: string, rows: object[], onConflict = "id") {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows.map((r) => toRow(r)), { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓ ${table}: ${rows.length}`);
}

async function main() {
  await upsert("occasions", seed.occasions);
  await upsert("styles", seed.styles);
  await upsert("artists", seed.artists);
  await upsert("sample_songs", seed.sampleSongs);
  await upsert("packages", seed.packages);
  await upsert("extras", seed.extras);
  await upsert("faqs", seed.faqs);
  const { error } = await sb.from("settings").upsert({ id: 1, data: { ...seed.defaultSettings, happyFamiliesBaseline: 0 } });
  if (error) throw new Error(`settings: ${error.message}`);
  console.log("✓ settings (boldog családok kezdőérték: 0 – adminból állítható)");
  if (args.includes("--demo-reviews")) await upsert("reviews", seed.reviews);
  if (args.includes("--demo-coupons")) await upsert("coupons", seed.coupons, "code");

  const adminArg = args[args.indexOf("--admin") + 1];
  if (args.includes("--admin") && adminArg?.includes(":")) {
    const [email, password] = [adminArg.slice(0, adminArg.indexOf(":")), adminArg.slice(adminArg.indexOf(":") + 1)];
    if (password.length < 12) throw new Error("Az admin jelszó legalább 12 karakter legyen.");
    const { error: e1 } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (e1 && !/already/i.test(e1.message)) throw new Error(`admin felhasználó: ${e1.message}`);
    const { error: e2 } = await sb.from("admins").upsert({ email: email.toLowerCase() });
    if (e2) throw new Error(`admins: ${e2.message}`);
    console.log(`✓ admin: ${email}`);
  }
  console.log("Kész.");
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
