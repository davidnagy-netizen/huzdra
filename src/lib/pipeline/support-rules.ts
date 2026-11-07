// Szabályalapú, magyar nyelvű szupport-szándékfelismerés. Tiszta függvény (tesztelhető).
// Felismeri: névjavítás (új név kinyerésével), kiejtés, tartalmi módosítás, státusz,
// visszatérítés, lemondás, köszönet. A műveleteket a support.ts hajtja végre.

import type { SupportExtracted, SupportIntent } from "../types";
import type { SupportAnalysis, SupportAnalysisInput } from "./adapters/types";

/** Karakterenkénti ékezetmentesítés – az indexek megegyeznek az eredeti szöveggel. */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const base = ch.normalize("NFD")[0] ?? ch;
    out += base.length === ch.length ? base.toLowerCase() : ch.toLowerCase();
  }
  return out;
}

const STOP = new Set(
  "a az es de hogy nem igen ez az azt ott itt mert vagy is meg mar most kerem kerlek koszonom szia hello jo rossz nev neve nevet nevvel dal dalban dalt helyett hanem pedig ugye volt lett mi ti ok ő o".split(" "),
);
const NAME = "[a-z]+(?:[ -][a-z]+)?";

const UPPER = /^[A-ZÁÉÍÓÖŐÚÜŰ]/;

/** A tulajdonnév az elejétől számított, nagybetűvel kezdődő szavakból áll ("Zsófia a" → "Zsófia"). */
function cleanName(original: string | undefined): string | null {
  if (!original) return null;
  const words = original.trim().split(" ");
  const kept: string[] = [];
  for (const w of words) {
    if (!UPPER.test(w) || STOP.has(fold(w))) break;
    kept.push(w);
  }
  const name = kept.join(" ");
  return name.length >= 2 && name.length <= 40 ? name : null;
}

function grab(original: string, folded: string, re: RegExp): RegExpExecArray | null {
  const m = re.exec(folded);
  if (!m) return null;
  // eredeti (ékezetes, nagybetűs) szöveg visszaállítása az indexek alapján
  const res = [...m] as unknown as RegExpExecArray;
  let cursor = m.index;
  for (let g = 1; g < m.length; g++) {
    if (m[g] == null) continue;
    const at = folded.indexOf(m[g], cursor);
    res[g] = original.slice(at, at + m[g].length);
    cursor = at + m[g].length;
  }
  res.index = m.index;
  return res;
}

export function extractNameFix(text: string): { oldName?: string; newName?: string } | null {
  const f = fold(text);
  const tries: { re: RegExp; old?: number; neu: number }[] = [
    { re: new RegExp(`\\bnem\\s+["„]?(${NAME})["”]?\\s*,?\\s+hanem\\s+["„]?(${NAME})`, "g"), old: 1, neu: 2 },
    { re: new RegExp(`["„]?(${NAME})["”]?\\s+helyett\\s+["„]?(${NAME})`, "g"), old: 1, neu: 2 },
    { re: new RegExp(`(?:helyes|pontos|igazi|valodi)\\s+nev(?:e)?\\s*(?:az|:|-|=)?\\s*["„]?(${NAME})`, "g"), neu: 1 },
    { re: new RegExp(`\\bnev(?:e|et)?\\s+(?:helyesen|pontosan|valojaban|igazabol)\\s*:?\\s*["„]?(${NAME})`, "g"), neu: 1 },
    { re: new RegExp(`(?:javitsatok|irjatok at|modositsatok|csereljetek)\\s+(?:a\\s+nevet\\s+)?(?:erre\\s*:?\\s*)?["„]?(${NAME})`, "g"), neu: 1 },
    { re: new RegExp(`["„]?(${NAME})["”]?\\s*-?(?:ra|re)\\s+(?:javits|modosits|irjatok|valtoztass|csereljetek)`, "g"), neu: 1 },
  ];
  for (const t of tries) {
    t.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = grab(text, f, t.re))) {
      const neu = cleanName(m[t.neu]);
      const old = t.old ? cleanName(m[t.old]) : undefined;
      if (neu && old !== null && neu !== old) return { newName: neu, oldName: old ?? undefined };
      t.re.lastIndex = (m.index ?? 0) + 1;
      if (t.re.lastIndex >= f.length) break;
    }
  }
  return null;
}

const has = (f: string, ...words: string[]) => words.some((w) => f.includes(w));

export function analyzeSupportMessage(input: SupportAnalysisInput): SupportAnalysis {
  const text = `${input.subject}\n${input.message}`.trim();
  const f = fold(text);
  const extracted: SupportExtracted = {};
  const code = /\bhz-?([a-z0-9]{6})\b/i.exec(text);
  if (code) extracted.orderCode = `HZ-${code[1].toUpperCase()}`;

  let intent: SupportIntent = "other";
  let confidence = 0.3;

  const nameTalk = has(f, "nev", "elir", "rosszul irt", "rosszul irtam", "helyett", "hanem");
  const nf = extractNameFix(text);

  if (has(f, "visszater", "visszafizet", "refund", "visszakerem") || /(vissza.{0,25}penz|penz.{0,25}vissza)/.test(f)) {
    intent = "refund"; confidence = 0.95;
  } else if (has(f, "lemond", "toroljetek a rendel", "toroljek a rendel", "nem kerem a dalt", "storno")) {
    intent = "cancel"; confidence = 0.9;
  } else if (nf) {
    intent = "name_fix"; confidence = nf.newName ? 0.92 : 0.55;
    Object.assign(extracted, nf);
  } else if (has(f, "kiejt", "ejti", "mondja ki", "hangsuly", "rosszul mondja", "rosszul ejt")) {
    intent = "pronunciation_fix"; confidence = 0.8;
    extracted.pronunciation = input.message.trim().slice(0, 300);
  } else if (nameTalk && (/nev\w{0,4}.{0,20}(nem jo|rossz|hibas|elirt|tevedes)/.test(f) || /(nem jo|rossz|hibas|elirt|tevedes)\w{0,4}.{0,20}nev/.test(f) || has(f, "elirtam", "elirtatok"))) {
    intent = "name_fix"; confidence = 0.55; // a helyes nevet még meg kell kérdezni
  } else if (has(f, "valtoztat", "modosit", "javit", "irjatok bele", "keruljon bele", "hagyjatok ki", "vegyetek ki", "gyorsabb", "lassabb", "porgosebb", "versszak", "refren", "szoveg")) {
    intent = "content_change"; confidence = 0.75;
    extracted.change = input.message.trim().slice(0, 600);
  } else if (has(f, "mikor lesz", "mikor kesz", "mikor erkezik", "mikor kapom", "hol tart", "meg nem kaptam", "nem jott meg", "nem kaptam meg", "statusz", "allapot")) {
    intent = "status"; confidence = 0.85;
  } else if (has(f, "koszon", "imadjuk", "tokeletes", "szuper lett", "nagyon tetszik", "fantasztikus", "csodas")) {
    intent = "thanks"; confidence = 0.8;
  }

  return { intent, confidence, extracted, reply: "" };
}

/** Visszakérdezésre adott rövid válasz ("Zsófia", "A helyes: Kovács Zsófia") → név, ha egyértelmű. */
export function extractBareName(text: string): string | null {
  const line = text.trim().split(/\n/)[0].replace(/^(a\s+)?(helyes(\s+név)?|név)\s*[:\-–]?\s*/i, "").replace(/[.!]+$/, "").trim();
  if (line.split(/\s+/).length > 3) return null;
  return cleanName(line);
}
