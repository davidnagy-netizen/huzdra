// Első szintű, szabályalapú tartalomszűrő a történet mezőkre és a generált dalszövegre.
// Élesben ezt egy LLM-alapú moderációs adapter egészíti ki (lásd pipeline/adapters).
// A "block" súlyosságú találat azonnali admin-sorba (moderation_hold) tesz,
// a "review" súlyosságú találat szintén admin-sorba kerül, de a vásárló figyelmeztetést kap.

import type { ModerationFlag, ModerationResult } from "./types";

interface Rule {
  category: ModerationFlag["category"];
  severity: ModerationFlag["severity"];
  pattern: RegExp;
}

// Ékezet- és kisbetű-független összehasonlításhoz normalizálunk.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s");
}

const RULES: Rule[] = [
  // Gyűlöletkeltés, rasszizmus (a "cigány" szó önmagában NEM tiltott – a műfaj neve –, csak a gyalázkodó szerkezetek)
  { category: "gyulolet", severity: "block", pattern: /\b(budos|mocskos|retkes|tetves)\s+(cigany|zsido|roma|niger|neger|buzi|migrans)/ },
  { category: "gyulolet", severity: "block", pattern: /cigany\s*bunoz|ciganyozz|zsidozz|\bnigger|\bnegerek\b|buzizz/ },
  { category: "gyulolet", severity: "block", pattern: /\b(ki kell irtani|irtsuk ki|gazkamra|haljon meg minden)\b/ },
  // Szexuálisan explicit
  { category: "explicit", severity: "block", pattern: /\b(baszas|baszni|basz(ik|om|lak)|dugni|dugas|szopo|szopas|pina|punci|fasz(a|t|om)?\b|porno|meztelen|orgazmus)/ },
  // Lejárató / sértő (valós személyek kigúnyolása) – emberi felülvizsgálat
  { category: "lejarato", severity: "review", pattern: /\b(kurva|ribanc|geci|kocsog|idiota|nyomorek|retardalt|lusta diszno|csalo|tolvaj|alkoholista|reszeges)\b/ },
  { category: "lejarato", severity: "review", pattern: /\b(megcsalta|szeretoje|valas(a|t)? miatt|borton(ben|bol))\b/ },
  // Politika
  { category: "politikai", severity: "review", pattern: /\b(fidesz|tisza part|mszp|jobbik|mi hazank|momentum|\bdk\b|kormanypart|ellenzek|szavazz|valasztas|orban|magyar peter|gyurcsany|miniszterelnok)/ },
  // Reklám / kereskedelmi célú felhasználás
  { category: "reklam", severity: "review", pattern: /(https?:\/\/|www\.|\.hu\b|\.com\b|webshop|kedvezmeny|kuponkod|vasarolj|rendeld meg|cegunk|termekunk|szolgaltatasunk)/ },
];

export function moderateText(text: string, field?: string): ModerationFlag[] {
  if (!text) return [];
  const norm = normalize(text);
  const flags: ModerationFlag[] = [];
  for (const rule of RULES) {
    const m = norm.match(rule.pattern);
    if (m) flags.push({ category: rule.category, severity: rule.severity, match: m[0].trim(), field });
  }
  return flags;
}

export function moderateFields(fields: Record<string, string | undefined>): ModerationResult {
  const flags = Object.entries(fields).flatMap(([k, v]) => moderateText(v ?? "", k));
  return { ok: flags.length === 0, flags };
}

export const CATEGORY_LABELS: Record<ModerationFlag["category"], string> = {
  gyulolet: "gyűlöletkeltő vagy sértő kifejezés",
  explicit: "szexuálisan explicit tartalom",
  lejarato: "valakit lejárató vagy sértő megfogalmazás",
  politikai: "politikai tartalom",
  reklam: "reklám vagy kereskedelmi üzenet",
  egyeb: "nem megengedett tartalom",
};
