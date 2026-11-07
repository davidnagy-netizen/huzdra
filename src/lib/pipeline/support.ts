import "server-only";
import { getRepo } from "../db";
import { SITE } from "../site";
import { STATUS_LABELS } from "./state-machine";
import type { Order, SupportTicket } from "../types";
import { supportReplyEmail } from "./emails";
import { OrderActionError, RevisionError, correctName, correctPronunciation, fold, requestRevisionForOrder, token } from "./orchestrator";
import { enqueue } from "./queue";
import { getAdapters } from "./registry";
import { extractBareName } from "./support-rules";

// Automatikus ügyfélszolgálat. Bejövő csatornák: e-mail webhook, dal-oldal üzenet, kapcsolati űrlap.
// Biztonság: pénzügyi kérés (visszatérítés, lemondás) SOHA nem automatikus; módosítást csak akkor
// hajtunk végre, ha a küldő igazoltan a megrendelő (egyező e-mail vagy tokenes dal-oldal).

export interface IncomingMessage {
  channel: SupportTicket["channel"];
  fromEmail: string;
  subject: string;
  message: string;
  /** Tokenes dal-oldalról érkezett: a rendelés biztosan ismert és igazolt */
  songToken?: string;
}

export async function createTicket(input: IncomingMessage): Promise<SupportTicket> {
  const repo = getRepo();
  let msg = input;
  let order: Order | null = null;
  let verified = false;
  if (msg.songToken) {
    order = await repo.getOrderBySongToken(msg.songToken);
    verified = !!order;
    if (order) msg = { ...msg, fromEmail: order.data.email }; // a tokenes oldal a rendelő nevében ír
  }
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `tkt_${token(8)}`,
    createdAt: now,
    updatedAt: now,
    channel: msg.channel,
    fromEmail: msg.fromEmail.trim().toLowerCase().slice(0, 200),
    subject: msg.subject.trim().slice(0, 200),
    message: msg.message.trim().slice(0, 5000),
    orderId: order?.id ?? null,
    orderCode: order?.code ?? null,
    verified,
    intent: null,
    confidence: 0,
    extracted: {},
    status: "open",
    actions: [],
    replies: [{ at: now, from: "customer", text: msg.message.trim().slice(0, 5000) }],
    agent: "",
  };
  await repo.createTicket(ticket);
  await enqueue("support.process", { ticketId: ticket.id });
  return ticket;
}

/** Rendelés megkeresése: tokenes kapcsolat > rendelésszám a levélben > a küldő legutóbbi aktív rendelése. */
async function matchOrder(t: SupportTicket, codeFromText?: string): Promise<{ order: Order | null; verified: boolean }> {
  const repo = getRepo();
  if (t.orderId) {
    const o = await repo.getOrder(t.orderId);
    return { order: o, verified: t.verified };
  }
  if (codeFromText) {
    const o = await repo.getOrderByCode(codeFromText);
    if (o) return { order: o, verified: fold(o.data.email) === fold(t.fromEmail) };
  }
  const mine = (await repo.findOrdersByEmail(t.fromEmail)).filter((o) => o.status !== "cancelled");
  return { order: mine[0] ?? null, verified: !!mine[0] };
}

export async function processTicket(ticketId: string): Promise<void> {
  const repo = getRepo();
  const adapters = getAdapters();
  const settings = await repo.getSettings();
  const t = await repo.getTicket(ticketId);
  if (!t || t.status !== "open" || t.intent) return;

  // 0) válasz egy korábbi visszakérdezésre ("írd meg a helyes nevet") → az a jegy folytatódik
  const recent = (await repo.listTickets({ status: "open" })).find(
    (x) => x.id !== t.id && x.fromEmail === t.fromEmail && x.actions.at(-1)?.type === "ask_name" && Date.now() - Date.parse(x.updatedAt) < 7 * 86400_000,
  );
  const bare = recent ? extractBareName(t.message) : null;

  // 1) első kör: rendelésszám kinyerése a levélből, rendelés megkeresése
  const first = bare
    ? { intent: "name_fix" as const, confidence: 0.9, extracted: { newName: bare }, reply: "" }
    : await adapters.support.analyze({ subject: t.subject, message: t.message, order: null });
  const { order, verified } = recent?.orderId && bare
    ? { order: await repo.getOrder(recent.orderId), verified: recent.verified || fold(t.fromEmail) === fold((await repo.getOrder(recent.orderId))?.data.email ?? "") }
    : await matchOrder(t, first.extracted.orderCode);
  if (recent && bare) {
    await repo.updateTicket(recent.id, (x) => ({ ...x, status: "closed", actions: [...x.actions, { at: new Date().toISOString(), type: "continued", detail: `Folytatás: ${t.id}`, actor: "system" }] }));
  }
  // 2) második kör a rendelés ismeretében (Claude pontosabb, ha látja a dalban szereplő nevet)
  const analysis = bare
    ? first
    : order
    ? await adapters.support.analyze({
        subject: t.subject,
        message: t.message,
        order: {
          code: order.code,
          status: STATUS_LABELS[order.status],
          recipientName: order.data.recipientName,
          nickname: order.data.nickname,
          pronunciation: order.data.pronunciation,
          artistName: (await repo.getArtistById(order.data.artistId))?.name ?? "",
          revisionsLeft: Math.max(0, SITE.revisionRounds - order.revisionsUsed),
        },
      })
    : first;

  const actions: SupportTicket["actions"] = [];
  const act = (type: string, detail: string) => actions.push({ at: new Date().toISOString(), type, detail, actor: "system" });
  let status: SupportTicket["status"] = "needs_human";
  let paragraphs: string[] = [];
  let button: { href: string; label: string } | undefined;
  const statusUrl = order ? `${SITE.url}/rendelesem/${order.code}?k=${order.statusKey}` : `${SITE.url}/rendelesem`;
  const confident = analysis.confidence >= settings.supportConfidence;
  const auto = settings.autoSupport;

  if (!order) {
    act("no_order", "Nem található rendelés ehhez az e-mail-címhez / rendelésszámhoz");
    paragraphs = [
      "Köszönjük az üzenetedet! Nem találtunk rendelést ehhez az e-mail-címhez.",
      "Kérlek, válaszolj a rendelésszámmal (pl. HZ-AB12CD), vagy arról az e-mail-címről írj, amellyel rendeltél – és máris intézzük.",
    ];
    status = "open";
  } else {
    const songUrl = `${SITE.url}/dal/${order.songToken}`;
    switch (analysis.intent) {
      case "name_fix": {
        const newName = analysis.extracted.newName;
        if (!newName || !confident) {
          act("ask_name", "A helyes név nem egyértelmű – visszakérdeztünk");
          paragraphs = [
            `Persze, kijavítjuk a nevet! Jelenleg ez szerepel a dalban: „${order.data.recipientName}”.`,
            "Kérlek, írd meg pontosan, milyen névre javítsuk (ékezetekkel együtt), és ha különleges, azt is, hogyan kell kiejteni.",
          ];
          status = "open";
        } else if (!verified) {
          act("unverified", "A küldő nem a rendelő e-mail-címéről írt – kézi ellenőrzés");
          paragraphs = ["Köszönjük! Biztonsági okból a módosítást a rendeléskor megadott e-mail-címről kérjük, vagy kollégánk hamarosan felveszi veled a kapcsolatot."];
        } else if (!auto) {
          act("suggest_name_fix", `Javaslat: „${newName}” (automatikus mód kikapcsolva)`);
          paragraphs = [`Köszönjük, megkaptuk: a helyes név „${newName}”. Kollégánk hamarosan intézi a javítást.`];
        } else {
          try {
            const r = await correctName(order.id, newName, analysis.extracted.oldName, "system", settings);
            act("name_fixed", `„${r.previous}” → „${r.next}”, újragenerálás elindítva`);
            paragraphs = [
              `Kijavítottuk: a dalban mostantól „${r.next}” szerepel (korábban: „${r.previous}”).`,
              settings.freeNameFixes ? "A névjavítás ingyenes, nem számít bele a javítási körökbe." : "",
              "Az új változatot e-mailben küldjük, amint elkészül – általában pár percen belül.",
            ].filter(Boolean);
            button = { href: statusUrl, label: "Rendelés követése" };
            status = "auto_resolved";
          } catch (err) {
            act("name_fix_failed", err instanceof Error ? err.message : String(err));
            paragraphs = ["Köszönjük, megkaptuk a névjavítási kérést – kollégánk hamarosan intézi."];
          }
        }
        break;
      }
      case "pronunciation_fix": {
        const p = analysis.extracted.pronunciation;
        if (verified && auto && confident && p) {
          await correctPronunciation(order.id, p, "system");
          act("pronunciation_fixed", p);
          paragraphs = ["Köszönjük, rögzítettük a helyes kiejtést, és újra felvetetjük a dalt.", "Az új változatot e-mailben küldjük, amint elkészül."];
          button = { href: statusUrl, label: "Rendelés követése" };
          status = "auto_resolved";
        } else {
          act("pronunciation_manual", "Kézi intézés");
          paragraphs = ["Köszönjük a jelzést a kiejtésről – kollégánk hamarosan intézi, és szólunk, ha kész az új változat."];
        }
        break;
      }
      case "content_change": {
        const change = analysis.extracted.change || t.message;
        if (verified && auto && confident && (order.status === "delivered" || order.status === "done")) {
          try {
            const o = await requestRevisionForOrder(order, change, "customer");
            act("revision_requested", `Javítási kör (${o.revisionsUsed}/${SITE.revisionRounds}): ${change.slice(0, 200)}`);
            paragraphs = [
              "Megkaptuk a módosítási kérést, és már dolgozunk rajta.",
              `Ez a(z) ${o.revisionsUsed}. ingyenes javítási kör a kettőből. Az új változatot e-mailben küldjük.`,
            ];
            button = { href: statusUrl, label: "Rendelés követése" };
            status = "auto_resolved";
          } catch (err) {
            act("revision_failed", err instanceof Error ? err.message : String(err));
            paragraphs = [err instanceof RevisionError || err instanceof OrderActionError ? err.message : "Köszönjük, kollégánk hamarosan intézi a kérést."];
          }
        } else {
          act("content_manual", "Kézi intézés (a dal még készül, vagy nem igazolt / bizonytalan)");
          paragraphs = ["Köszönjük, megkaptuk a kérésedet. Kollégánk hamarosan átnézi, és visszajelez."];
        }
        break;
      }
      case "status": {
        act("status_reply", STATUS_LABELS[order.status]);
        const done = order.status === "delivered" || order.status === "done";
        paragraphs = done
          ? [`Jó hír: ${order.data.recipientName} dala már elkészült! Itt meghallgathatod és letöltheted:`]
          : [`${order.data.recipientName} dala jelenleg itt tart: „${STATUS_LABELS[order.status]}”.`, `A vállalt határidő: ${new Date(order.dueAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}. Amint kész, e-mailben küldjük.`];
        button = done ? { href: songUrl, label: "Meghallgatom a dalt" } : { href: statusUrl, label: "Rendelés követése" };
        status = "auto_resolved";
        break;
      }
      case "refund":
      case "cancel":
        act("money_escalated", "Pénzügyi kérés – mindig emberi döntés");
        paragraphs = [
          "Köszönjük, hogy jelezted. Sajnáljuk, ha valami nem úgy sikerült, ahogy szeretted volna.",
          "Kollégánk személyesen nézi át a kérésedet, és 24 órán belül válaszol. Az elégedettségi garanciánk érvényes.",
        ];
        break;
      case "thanks":
        act("thanks_reply", "Köszönő válasz");
        paragraphs = ["Nagyon köszönjük a kedves szavakat, ez a legjobb jutalom nekünk! 🎻", "Ha van kedved, írj pár sort a dalról – sokat segít másoknak a döntésben."];
        status = "auto_resolved";
        break;
      default:
        act("other_escalated", "Nem egyértelmű kérés – emberi válasz");
        paragraphs = [analysis.reply || "Köszönjük az üzenetedet! Kollégánk hamarosan válaszol."];
    }
  }

  const mail = supportReplyEmail({ subject: t.subject, paragraphs, button });
  await adapters.email.send({ to: t.fromEmail, ...mail });
  await repo.saveEmail({ id: token(6), to: t.fromEmail, ...mail, createdAt: new Date().toISOString() });
  await repo.updateTicket(t.id, (x) => ({
    ...x,
    orderId: order?.id ?? null,
    orderCode: order?.code ?? null,
    verified,
    intent: analysis.intent,
    confidence: analysis.confidence,
    extracted: analysis.extracted,
    status,
    agent: adapters.support.name,
    actions: [...x.actions, ...actions],
    replies: [...x.replies, { at: new Date().toISOString(), from: "system", text: paragraphs.join("\n\n") }],
  }));
}

/** Admin válasza egy jegyre (e-mailben megy ki). */
export async function adminReply(ticketId: string, by: string, text: string, close: boolean) {
  const repo = getRepo();
  const t = await repo.getTicket(ticketId);
  if (!t) throw new Error("Nem található a jegy.");
  const clean = text.trim();
  if (clean) {
    const mail = supportReplyEmail({ subject: t.subject, paragraphs: clean.split(/\n{2,}/) });
    await getAdapters().email.send({ to: t.fromEmail, ...mail });
    await repo.saveEmail({ id: token(6), to: t.fromEmail, ...mail, createdAt: new Date().toISOString() });
  }
  await repo.updateTicket(ticketId, (x) => ({
    ...x,
    status: close ? "closed" : x.status,
    replies: clean ? [...x.replies, { at: new Date().toISOString(), from: "admin", text: clean }] : x.replies,
    actions: [...x.actions, { at: new Date().toISOString(), type: close ? "closed" : "replied", detail: by, actor: "admin" }],
  }));
}
