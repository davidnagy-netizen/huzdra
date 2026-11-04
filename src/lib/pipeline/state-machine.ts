import type { Order, OrderEvent, OrderStatus } from "../types";

// draft → paid_authorized → lyrics_ready → [awaiting_artist_approval] → audio_generating → qc
//   → delivered → revision_requested → … → done
// Kiegészítő állapotok: moderation_hold (admin-sor gyanús tartalomnál), cancelled.
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["paid_authorized", "cancelled"],
  paid_authorized: ["lyrics_ready", "moderation_hold", "cancelled"],
  moderation_hold: ["paid_authorized", "lyrics_ready", "cancelled"],
  lyrics_ready: ["awaiting_artist_approval", "audio_generating", "moderation_hold", "cancelled"],
  // elutasításnál a szöveg újragenerálódik → ismét lyrics_ready
  awaiting_artist_approval: ["audio_generating", "lyrics_ready", "cancelled"],
  audio_generating: ["qc", "cancelled"],
  // QC: jóváhagyás → delivered; újragenerálás → audio_generating; szövegjavítás → lyrics_ready
  qc: ["delivered", "audio_generating", "lyrics_ready", "cancelled"],
  delivered: ["revision_requested", "done"],
  revision_requested: ["lyrics_ready", "audio_generating", "moderation_hold"],
  done: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Érvénytelen állapotváltás: ${from} → ${to}`);
  }
}

export function transition(
  order: Order,
  to: OrderStatus,
  note?: string,
  actor: OrderEvent["actor"] = "system",
): Order {
  if (!canTransition(order.status, to)) throw new InvalidTransitionError(order.status, to);
  return {
    ...order,
    status: to,
    events: [...order.events, { at: new Date().toISOString(), status: to, note, actor }],
  };
}

/** Ügyfélnek mutatott, emberi nyelvű állapotok és a folyamatjelző lépései. */
export const CUSTOMER_STEPS = [
  { key: "received", label: "Megkaptuk a történeted" },
  { key: "lyrics", label: "Megíródik a dalszöveg" },
  { key: "audio", label: "Stúdióban: felveszi az előadó hangja" },
  { key: "qc", label: "Utolsó simítások, minőségellenőrzés" },
  { key: "delivered", label: "Kész! Elküldtük e-mailben" },
] as const;

export function customerStepIndex(status: OrderStatus): number {
  switch (status) {
    case "draft":
    case "paid_authorized":
    case "moderation_hold":
      return 0;
    case "lyrics_ready":
    case "awaiting_artist_approval":
    case "revision_requested":
      return 1;
    case "audio_generating":
      return 2;
    case "qc":
      return 3;
    case "delivered":
    case "done":
      return 4;
    case "cancelled":
      return -1;
  }
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Piszkozat",
  paid_authorized: "Kártya rögzítve, sorban áll",
  moderation_hold: "Munkatársunk átnézi a történetet",
  lyrics_ready: "Elkészült a dalszöveg",
  awaiting_artist_approval: "Az előadó jóváhagyására vár",
  audio_generating: "Készül a felvétel",
  qc: "Minőségellenőrzés",
  delivered: "Kézbesítve",
  revision_requested: "Javítás folyamatban",
  done: "Lezárva",
  cancelled: "Törölve",
};
