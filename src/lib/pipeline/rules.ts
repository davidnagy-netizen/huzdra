// Tiszta (mellékhatás nélküli) pipeline-szabályok – egységtesztelhetők.
import type { Order } from "../types";

/** Ékezet- és kisbetű-független összehasonlításhoz. */
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Automatikus minőségellenőrzés: ha minden pont zöld, a dal emberi QC nélkül kimehet. */
export function autoQcChecks(order: Order): { ok: boolean; failed: string[] } {
  const failed: string[] = [];
  if (!order.moderation.ok && !order.moderationReleased) failed.push("tartalomszűrő jelzés");
  if (!order.lyrics?.text) failed.push("hiányzó dalszöveg");
  else {
    const text = fold(order.lyrics.text);
    const names = [order.data.recipientName, order.data.nickname].filter(Boolean).map((n) => fold(n.split(" ")[0]));
    if (!names.some((n) => text.includes(n))) failed.push("a név nem szerepel a dalszövegben");
    if (order.data.avoid) {
      const banned = order.data.avoid.split(/[,;\n]/).map((x) => fold(x)).filter((x) => x.length >= 4);
      const hit = banned.find((b) => text.includes(b));
      if (hit) failed.push(`a tiltott téma szerepelhet a szövegben („${hit}”)`);
    }
  }
  if (!order.audio?.storagePath && !order.audio?.url) failed.push("hiányzó hangfájl");
  return { ok: failed.length === 0, failed };
}

/**
 * Csak a hibás névrészt cseréli: "Kovács Zsófi" + (Zsófi → Zsófia) = "Kovács Zsófia".
 * Ha az új név maga is teljes név (több szó), vagy nem azonosítható a cserélendő rész, teljes csere.
 */
export function replaceNamePart(current: string, newName: string, oldName?: string): string {
  const words = current.trim().split(/\s+/);
  if (newName.trim().split(/\s+/).length > 1 || words.length === 1) return newName.trim();
  const target = oldName
    ? words.findIndex((w) => fold(w) === fold(oldName))
    : words.findIndex((w) => {
        const a = fold(w), b = fold(newName);
        return a.slice(0, 3) === b.slice(0, 3); // Zsófi ~ Zsófia, Kati ~ Katalin
      });
  if (target < 0) return newName.trim();
  return words.map((w, i) => (i === target ? newName.trim() : w)).join(" ");
}

