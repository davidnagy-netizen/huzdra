# Húzdrá! – huzdra.hu

> Mondd el a történeted, mi meg húzzuk rá!

Személyre szóló mulatós és roma zenei dalok ajándékba. Next.js 16 (App Router) + TypeScript +
Tailwind CSS 4, Supabase (Postgres + Storage + Auth), Claude AI, külső zene-API.

## Gyors indítás (helyi demó, semmilyen kulcs nélkül)

```bash
npm install
npm run dev          # http://localhost:3000
```

- Weboldal: `/` · Hirdetési one-pager: `/probald` · Admin: `/admin` (demó belépés `npm run dev` alatt: `admin@huzdra.hu` / `huzdra-admin`;
  `npm start` / éles módban nincs alapértelmezett jelszó: `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` kell, Supabase-zel pedig Supabase Auth)
- Az adatok a `.data/` mappában vannak (törölve újraindul a demó-adatokkal).
- Kulcsok nélkül: szabályalapú AI (szupport + sablon dalszöveg), helykitöltő hang, tesztfizetés.

```bash
npm test             # 29 egység- és sématest (PGlite-tal valódi Postgresben)
npm run lint         # típusellenőrzés
npm run build        # production build
```

## Mit tud

**1. Teljesen automatikus rendelés és dalgenerálás**
rendelés → tartalomszűrő → dalszöveg (Claude) → [előadói jóváhagyás] → zene + ének (zene-API, tanított
stílusmodellel) → **automatikus QC** (név a szövegben, tiltott téma, moderáció, hangfájl) → terhelés →
e-mail → dal-oldal. Hiba esetén automatikus újrapróbálás, 3 sikertelen kör után „Figyelmet igényel” az
adminban. Emberi beavatkozás csak a kétes esetekben kell.

**Automatikus ügyfélszolgálat** – e-mail (`/api/support/inbound`), dal-oldali „Írj nekünk” és szimulátor:
- *„Nem Zsófi, hanem Zsófia a helyes”* → névjavítás (csak a hibás névrész cserélődik), újragenerálás,
  új dal e-mailben, ingyen. Ha a név nem egyértelmű, visszakérdez, és a válaszból folytatja.
- kiejtés → csak a hang készül újra · tartalmi kérés → javítási kör · „mikor lesz kész?” → állapot + link
- visszatérítés / lemondás → **mindig emberhez** kerül (pénzügy).
- Módosítás csak igazolt rendelőnek (egyező e-mail vagy tokenes dal-oldal); idegen feladó → emberi ellenőrzés.

**2. Zenék és tanítás (admin)** – mintazenék feltöltése közvetlenül a Supabase Storage-ba (max. 200 MB,
nem megy át a szerveren), a böngésző feltöltéskor megméri a tempót és a hangnemet, kötelező jogtisztasági
megerősítés, tanítás indítása a kiválasztott mintákból a zene-API-n, a kész modell aktiválása stílusonként.

**3. Admin** – áttekintés (bevétel, kosárérték, tölcsérek, bontás előadó/alkalom/csomag szerint, teendők),
rendelések (szűrés, részletek, minden művelet: QC, újragenerálás, szövegszerkesztés, névjavítás, lemondás +
visszatérítés, jegyzetek, idővonal), QC/moderációs sor, szupport (jegyek, válasz, szimulátor), előadók és
**felárak**, csomagok és árak, extrák, kuponok, mintadalok, vélemények, GYIK, leadek/várólista, beállítások
(automatizálás ki/be, magabiztossági küszöb, előnézet hossza és korlátja).

**4. Hirdetési one-pager (`/probald`)** – 6 kérdés → 15 mp-es előnézet (versszak + refrén) → ugyanott
megvásárolható; a teljes dal az előnézet szövegére épül. IP-alapú óránkénti korlát, GA4/Meta események
(`preview_start`, `preview_ready`, `preview_purchase`).

## Élesítés: Supabase + Vercel

### 1. Supabase projekt
1. Hozz létre projektet a [supabase.com](https://supabase.com)-on (régió: Frankfurt).
2. **SQL Editor** → futtasd sorban: `supabase/migrations/0001_init.sql`, majd `0002_storage.sql`.
3. **Project Settings → API**: másold ki a `Project URL`-t és a `service_role` kulcsot.
4. Feltöltés + admin felhasználó:
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed -- --admin te@cimed.hu:LegalabbTizenketKarakter
   ```
   (`--demo-reviews` csak teszthez – a kitalált véleményeket élesben ne töltsd fel.)

### 2. Vercel
Importáld a GitHub repót, és add meg a környezeti változókat (lásd `.env.example`):

| Változó | Mire kell |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | adatbázis, tárhely, admin belépés |
| `ADMIN_SESSION_SECRET` | admin munkamenet aláírása (min. 32 véletlen karakter) |
| `CRON_SECRET` | háttérfeldolgozó védelme (Vercel Cron automatikusan küldi) |
| `ANTHROPIC_API_KEY` | Claude: dalszöveg + szupport-elemzés (modell: `claude-opus-5-5`) |
| `MUSIC_API_URL`, `MUSIC_API_KEY` | zene-API (tanítás + generálás) – szerződés: [docs/zene-api.md](docs/zene-api.md) |
| `SUPPORT_INBOUND_SECRET` | bejövő e-mailek webhookja |
| `NEXT_PUBLIC_SITE_URL` | `https://huzdra.hu` |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | analitika (csak hozzájárulás után tölt be) |

A `vercel.json` percenkénti cronnal hívja a `/api/cron/worker` feldolgozót (Vercel Pro szükséges a
percenkénti cronhoz; alternatíva: Supabase `pg_cron` – lásd `0002_storage.sql` alján).

### 3. Bejövő e-mail (szupport)
Állíts be egy inbound e-mail szolgáltatást (pl. Resend Inbound, Postmark), amely a
`hello@huzdra.hu`-ra érkező leveleket JSON-ként POST-olja ide:
`https://huzdra.hu/api/support/inbound?secret=<SUPPORT_INBOUND_SECRET>` (`{ from, subject, text }`).
Olyan szolgáltatót válassz, amely ellenőrzi a feladót (SPF/DKIM).

## Még hátravan élesítés előtt

| Elem | Állapot |
| --- | --- |
| Fizetés | **mock** – Stripe / Barion (kártyazárolás + terhelés kézbesítéskor) bekötése szükséges. Amíg nincs bekötve, hagyd `HUZDRA_MOCK=1`-en (demó sáv). |
| Kimenő e-mail | konzol + napló – Resend bekötése szükséges |
| Zene-API | a szerződés kész; a szolgáltatót / saját modellt be kell kötni (`MUSIC_API_URL`) |
| Ismert előadók | „egyeztetés alatt”, név nélkül; aláírás után adminban: típus, licenc dátuma, hangmodell, elérhető |
| Vélemények, „boldog családok” | demó → valós adatra cserélendő |
| Jogi szövegek | tervezet → jogász véglegesítse |
| A GitHub repó | legyen **privát** (a korai commitokban előadónevek szerepelnek) |

## Felépítés

```
src/app/(site)/          nyilvános oldalak (főoldal, előadók, landingek, rendeléskövetés, dal-oldal, jogi)
src/app/probald/         hirdetési one-pager
src/app/admin/           admin (login + (panel)/…)
src/app/api/             API: rendelés, előnézet, szupport, admin, tárhely, cron worker
src/lib/pipeline/        orchestrator (állapotgép-vezérlés), support, preview, training, queue, jobs,
                         rules (tiszta szabályok), support-rules (magyar szándékfelismerés), adapters/
src/lib/db/              Repository interfész · mock (JSON) · Supabase · mapping (camel ↔ snake)
src/lib/storage/         tárhely-adapter (helyi / Supabase Storage, aláírt fel- és letöltés)
supabase/migrations/     séma, RLS, claim_jobs, GDPR-takarítás, tárolók
scripts/supabase-seed.ts kezdeti feltöltés + admin felhasználó
docs/zene-api.md         a zene-API REST szerződése
```
