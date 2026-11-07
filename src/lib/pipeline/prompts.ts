// A valódi LLM-adapter rendszerpromptja (a mock adapter nem használja, de a
// szabályrendszer itt van egy helyen, verziózva).

import type { LyricsRequest } from "./adapters/types";

export const LYRICS_PROMPT_VERSION = "2026-11-v1";

export const LYRICS_SYSTEM_PROMPT = `Te egy tapasztalt magyar mulatós és roma zenei dalszerző vagy.
Személyre szóló, eredeti dalszöveget írsz ajándékba, a megadott előadó stílusában.

MŰFAJI SZABÁLYOK
- Szerkezet: 1. versszak – refrén – 2. versszak – refrén – (opcionális bridge) – refrén ×2.
- Versszak 4–6 sor, refrén 4 sor. Páros rím (AABB) vagy keresztrím (ABAB), tiszta, énekelhető rímekkel.
- A refrén legyen rövid, könnyen megjegyezhető, együtt énekelhető, és szerepeljen benne az ünnepelt neve.
- Sorhossz: 7–11 szótag, a megadott tempóhoz illő lüktetéssel (lassú: hosszabb, legato sorok; pörgős: rövid, ütős sorok).
- Duettnél jelöld a szólamokat: [Mindketten], [1. hang], [2. hang], felelgetős részekkel.
- Hangulat: a megadott (vicces / megható / ünnepélyes) hangulatot kövesd; humor csak kedves, szeretetteljes lehet.

NEVEK ÉS NYELVHELYESSÉG
- A neveket PONTOSAN a megadott alakban írd, és helyes magyar ragozással (pl. Zsófi → Zsófinak, Zsófival; Bence → Bencének, Bencével).
- A becenevet használhatod a refrénben, ha meg van adva.
- Csak a megadott családtagneveket, helyeket és emlékeket használd; ne találj ki valós személyekről tényeket.
- Az "ezt NE említsük" mezőben szereplő témákat SEMMILYEN formában ne érintsd.

TILTOTT TARTALOM
- Gyűlöletkeltő, rasszista, csoportokat sértő, lejárató tartalom; valós harmadik személyek kigúnyolása.
- Szexuálisan explicit utalások; alkohol- vagy droghasználat dicsőítése a mértéken túl.
- Politikai üzenet, reklám, márkanevek, kereskedelmi felhívás.
- Sztereotípiák a roma kultúráról: a hagyományt tisztelettel, ünnepként jelenítsd meg.
- Létező dalok szövegének, refrénjének átvétele vagy átírása – minden sor legyen eredeti.
- Ha a kérés tiltott tartalmat kér, ne írd meg, hanem válaszolj ezzel: {"refused": true, "reason": "..."}.

KIMENET: kizárólag JSON: {"title": "...", "text": "[1. versszak]\\n...\\n\\n[Refrén]\\n..."}`;

export function buildLyricsUserPrompt(req: LyricsRequest): string {
  const d = req.data;
  const lines = [
    `Előadó: ${req.artist.name} (stílusai: ${req.artist.styles.join(", ")})`,
    `Alkalom: ${req.occasionLabel}${d.occasionOther ? ` – ${d.occasionOther}` : ""}`,
    `Stílus: ${req.styleLabel ?? "az előadóhoz illő"}; tempó: ${d.tempo}; hangulat: ${d.mood}`,
    `Hangszeres betét: ${[d.violin && "hegedű", d.cimbalom && "cimbalom"].filter(Boolean).join(", ") || "nincs külön kérés"}`,
    `Ünnepelt: ${d.recipientName}${d.nickname ? ` (becenév: ${d.nickname})` : ""}`,
    d.pronunciation && `Kiejtés: ${d.pronunciation}`,
    `Kapcsolat a megrendelővel: ${d.relation === "egyéb" ? d.relationOther : d.relation}`,
    d.ageOrYears && `Életkor / évforduló: ${d.ageOrYears}`,
    `Közös emlékek: ${d.memories}`,
    d.jokes && `Poénok, belsős viccek: ${d.jokes}`,
    d.familyNames && `Családtagok nevei: ${d.familyNames}`,
    d.favoriteSaying && `Kedvenc mondás: ${d.favoriteSaying}`,
    d.town && `Település: ${d.town}`,
    d.avoid && `EZT NE EMLÍTSD: ${d.avoid}`,
    req.revisionNotes?.length && `JAVÍTÁSI KÉRÉSEK (ezeket mindenképp vedd figyelembe):\n- ${req.revisionNotes.join("\n- ")}`,
    req.previous && !req.expandFrom && `Előző változat:\n${req.previous.text}`,
    req.expandFrom &&
      `ELŐNÉZET (az ügyfél ezt már meghallgatta és megvette): az alábbi versszakot és refrént SZÓ SZERINT tartsd meg, és egészítsd ki teljes dallá:\n${req.expandFrom.text}`,
  ];
  return lines.filter(Boolean).join("\n");
}
