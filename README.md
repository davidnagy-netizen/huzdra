# Húzdrá! – huzdra.hu

> Mondd el a történeted, mi meg húzzuk rá!

Személyre szóló mulatós és roma zenei dalok ajándékba, az előadók hivatalos, licencelt hangján.
Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.

## Indítás

```bash
npm install
cp .env.example .env.local   # opcionális
npm run dev                  # http://localhost:3000
```

```bash
npm test         # egységtesztek (árazás, állapotgép, moderáció, validáció, mock szöveg, WAV)
npm run lint     # típusellenőrzés
npm run build    # production build
```

A mock adatbázis a `.data/db.json` fájlban van. Ha törlöd, induláskor újra feltöltődik a seed adatokkal.

## Mi készült el (1. fázis)

- **Főoldal** mind a 12 szekcióval: hero, előadóválasztó, mintadal-lejátszó, mintadalrács
  szűrő chipekkel, „Hogyan működik?”, vélemények, összehasonlítás, rendelési varázsló, árak,
  GYIK, záró CTA, lábléc.
- **Rendelési varázsló** (6 lépés): folyamatjelző, élő végösszeg, lépésenkénti validálás,
  automatikus mentés (localStorage + `/api/drafts`), kuponkód, tartalomszűrő-figyelmeztetés,
  „fizetés csak ha kész” (mock kártyarögzítés), élő fellépés lead.
- **Mock backend**: rendelés → tartalomszűrés → dalszöveg → előadói jóváhagyás → felvétel →
  QC → terhelés → e-mail → dal-oldal → javításkérés (max. 2) → elfogadás.
- **Oldalak**: előadói profil (`/eloadok/[slug]`), SEO landingek (`/lakodalmas-dal`,
  `/dogos-robi-egyedi-dal` …), rendeléskövetés (`/rendelesem`), tokenes dal-oldal (`/dal/[token]`),
  jogi tervezetek (`/jogi/*`), `sitemap.xml`, `robots.txt`, OG-képek előadónként.
- Világos és sötét mód, cookie banner, GA4 és Meta Pixel események (csak hozzájárulás után).
- `huzdra.hu` (punycode: `xn--hzdr-8na0m.hu`) és `www` → 301 a `next.config.ts`-ben.

## Felépítés

```
src/lib/types.ts                 domain-modell
src/lib/data/seed.ts             seed adatok (előadók, csomagok, mintadalok, GYIK)
src/lib/db/                      Repository interfész + JSON mock implementáció
src/lib/pipeline/state-machine   állapotgép (átmenetek, ügyfélnek mutatott lépések)
src/lib/pipeline/orchestrator    rendelés felvétele és léptetése, javítás, elfogadás
src/lib/pipeline/adapters/       LLM / zene / hang / vízjel / moderáció / fizetés / e-mail adapterek
src/lib/pipeline/prompts.ts      a valódi LLM dalszöveg-prompt műfaji szabályai
src/lib/pipeline/queue.ts        háttérfeladat-sor absztrakció (mock: folyamaton belüli)
src/lib/moderation.ts            szabályalapú tartalomszűrő
src/lib/wizard-schema.ts         varázsló validálás (kliens + szerver)
src/lib/audio/synth.ts           helykitöltő dallam-szintetizátor (WAV + metaadat-„vízjel”)
supabase/migrations/             Postgres séma, RLS, GDPR-törlő függvény
```

## Mock mód – amit élesítés előtt cserélni kell

| Elem | Most | Élesben |
| --- | --- | --- |
| Adatbázis | `.data/db.json` | Supabase (`supabase/migrations/0001_init.sql`) |
| Dalszöveg | sablon (`MockLyricsAdapter`) | LLM-adapter a `prompts.ts` szabályaival |
| Zene + ének | generált helykitöltő dallam | zenegeneráló + licencelt hangmodell |
| Vízjel | WAV metaadat | hallhatatlan audio vízjel + metaadat |
| Fizetés | gombnyomásos „tesztkártya” | Stripe SetupIntent / Barion foglalás (HUF) |
| E-mail | konzol + `outbox` | Resend |
| QC és előadói jóváhagyás | automatikus (`MOCK_AUTO_*`) | admin QC-sor, előadói portál |
| Vélemények, „boldog családok” száma | **demó adat** | valódi, ellenőrzött vásárlói vélemények |
| Mintadalok, előadói fotók | helykitöltő | licencelt felvételek és fotók |
| Jogi szövegek | tervezet | jogász által véglegesítve |

A demó sáv az oldal tetején jelzi, hogy az adatok helykitöltők (`HUZDRA_MOCK=0` kapcsolja ki).

## Következő fázisok

2. **Admin felület**: rendelések, QC-sor (meghallgatás, újragenerálás, szövegjavítás), moderációs sor,
   előadók CRUD (licenc nélkül nem aktiválható), csomagok és árak, mintadalok, vélemények, kuponok,
   statisztikák. SupabaseRepository + Auth.
3. **Valódi adapterek**: LLM, zene, licencelt hang, vízjel, Stripe/Barion, Resend, tartós queue.
   Előadói portál: jóváhagyási sor, jogdíj-kimutatás, booking-leadek.
