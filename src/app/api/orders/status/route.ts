import { getRepo } from "@/lib/db";
import { getQueue } from "@/lib/pipeline/queue";
import "@/lib/pipeline/orchestrator";
import { STATUS_LABELS, customerStepIndex } from "@/lib/pipeline/state-machine";
import { isMock } from "@/lib/site";
import type { OrderStatus } from "@/lib/types";

const AUTO_STATES: OrderStatus[] = ["paid_authorized", "lyrics_ready", "awaiting_artist_approval", "audio_generating", "qc", "revision_requested"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const key = url.searchParams.get("k") ?? "";
  const repo = getRepo();
  const order = await repo.getOrderByCode(code);
  if (!order || order.statusKey !== key) return Response.json({ error: "not_found" }, { status: 404 });

  // Mock: ha a szerver újraindult, a sorban lévő feladat elveszhetett – újraindítjuk.
  const delay = Number(process.env.MOCK_STEP_DELAY_MS ?? 2500);
  if (isMock() && AUTO_STATES.includes(order.status) && Date.now() - Date.parse(order.updatedAt) > delay * 3) {
    await getQueue().enqueue({ name: "order.advance", payload: { orderId: order.id } });
  }

  const artist = await repo.getArtistById(order.data.artistId);
  const delivered = order.status === "delivered" || order.status === "done";
  return Response.json({
    code: order.code,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    stepIndex: customerStepIndex(order.status),
    recipientName: order.data.recipientName,
    artistName: artist?.name ?? "",
    totalHuf: order.price.totalHuf,
    dueAt: order.dueAt,
    createdAt: order.createdAt,
    // Élesben a dal linkje csak e-mailben megy ki; demó módban itt is megmutatjuk.
    songUrl: delivered && isMock() ? `/dal/${order.songToken}` : null,
    events: order.events.map((e) => ({ at: e.at, status: e.status, label: STATUS_LABELS[e.status] })),
  });
}
