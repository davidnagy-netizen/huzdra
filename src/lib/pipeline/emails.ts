import { formatHuf } from "../pricing";
import type { Order } from "../types";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#1a0812;font-family:Arial,sans-serif;color:#fbf3e6">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#2a0d1d;border-radius:16px;border:1px solid #5a2a3a">
<tr><td style="padding:28px 28px 8px;font-size:28px;font-weight:bold;color:#e8b64c">Húzdrá!</td></tr>
<tr><td style="padding:0 28px 28px;font-size:16px;line-height:1.55">
<h1 style="font-size:22px;margin:12px 0 16px;color:#fbf3e6">${esc(title)}</h1>${body}
</td></tr></table>
<p style="color:#a8919a;font-size:12px;margin-top:16px">Húzdrá! – huzdra.hu · Ezt az e-mailt a rendelésed miatt kaptad.</p>
</td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#e8b64c;color:#2a0d1d;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;

export function orderReceivedEmail(p: { order: Order; artistName: string; statusUrl: string }) {
  const { order } = p;
  return {
    subject: `Megkaptuk! ${order.data.recipientName} dala hamarosan készül (${order.code})`,
    html: layout(
      "Megkaptuk a történeted!",
      `<p>Köszönjük a rendelést! ${esc(p.artistName)} hamarosan elénekli <b>${esc(order.data.recipientName)}</b> dalát.</p>
<p>Rendelésszám: <b>${esc(order.code)}</b><br>Végösszeg: <b>${formatHuf(order.price.totalHuf)}</b> – a kártyádat csak rögzítettük, a terhelés akkor történik, amikor a dal elkészült.</p>
${button(p.statusUrl, "Rendelés követése")}`,
    ),
  };
}

export function deliveryEmail(p: { order: Order; artistName: string; songUrl: string; disclosure: string }) {
  return {
    subject: `Kész a dal! ${p.order.data.recipientName} nótája megérkezett 🎻`,
    html: layout(
      "Elkészült a saját nótátok!",
      `<p>${esc(p.artistName)} elénekelte <b>${esc(p.order.data.recipientName)}</b> dalát. Hallgasd meg, töltsd le, és küldd tovább a DJ-nek vagy a családi csoportba!</p>
${button(p.songUrl, "Meghallgatom a dalt")}
<p style="font-size:13px;color:#c9b8a8">Nem tökéletes? A dal-oldalon 2 ingyenes javítást kérhetsz.<br>${esc(p.disclosure)}<br>A dal személyes, nem kereskedelmi felhasználásra szól.</p>`,
    ),
  };
}
