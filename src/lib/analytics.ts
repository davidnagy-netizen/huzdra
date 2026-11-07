// GA4 + Meta Pixel eseménykövetés. A szkriptek csak analitikai/marketing hozzájárulás után
// töltődnek be (lásd components/Analytics.tsx); addig a track() csak sorba gyűjt.

export type TrackEvent =
  | "sample_play"
  | "artist_select"
  | "wizard_start"
  | "wizard_step_view"
  | "wizard_step_complete"
  | "begin_checkout"
  | "coupon_apply"
  | "purchase_authorized"
  | "revision_request"
  | "song_share"
  | "preview_start"
  | "preview_ready"
  | "preview_purchase";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const META_MAP: Partial<Record<TrackEvent, string>> = {
  wizard_start: "Lead",
  begin_checkout: "InitiateCheckout",
  purchase_authorized: "Purchase",
  artist_select: "ViewContent",
};

export function track(event: TrackEvent, params: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    window.gtag?.("event", event, params);
    const meta = META_MAP[event];
    if (meta) window.fbq?.("track", meta, params);
    else window.fbq?.("trackCustom", event, params);
    if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params);
  } catch {
    /* analitika soha ne törje el az oldalt */
  }
}
