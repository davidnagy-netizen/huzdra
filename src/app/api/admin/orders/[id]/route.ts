import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import {
  OrderActionError,
  addNote,
  approveQc,
  artistDecision,
  cancelOrder,
  clearAttention,
  correctName,
  correctPronunciation,
  regenerateAudio,
  regenerateLyrics,
  releaseModeration,
  resendDelivery,
  saveLyrics,
} from "@/lib/pipeline/orchestrator";
import { InvalidTransitionError } from "@/lib/pipeline/state-machine";

/** Admin műveletek egy rendelésen. */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const by = await adminFromRequest();
  if (!by) return unauthorized();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const s = (k: string) => String(b[k] ?? "");
  try {
    switch (b.action) {
      case "approve_qc": await approveQc(id, by); break;
      case "regenerate_audio": await regenerateAudio(id, by); break;
      case "regenerate_lyrics": await regenerateLyrics(id, by, s("instruction")); break;
      case "save_lyrics": await saveLyrics(id, by, s("title"), s("text")); break;
      case "release_moderation": await releaseModeration(id, by); break;
      case "cancel": await cancelOrder(id, by, b.refund === true); break;
      case "resend": await resendDelivery(id); break;
      case "note": await addNote(id, by, s("text")); break;
      case "clear_attention": await clearAttention(id, by); break;
      case "correct_name": await correctName(id, s("name"), s("oldName") || undefined, "admin"); break;
      case "pronunciation": await correctPronunciation(id, s("text"), "admin"); break;
      case "artist_approve": await artistDecision(id, true, by); break;
      case "artist_reject": await artistDecision(id, false, by, s("instruction")); break;
      default: return Response.json({ error: "Ismeretlen művelet" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof OrderActionError || err instanceof InvalidTransitionError) return Response.json({ error: err.message }, { status: 409 });
    console.error(err);
    return Response.json({ error: "Váratlan hiba" }, { status: 500 });
  }
}
