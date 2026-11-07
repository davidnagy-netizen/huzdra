// Általános zene-API adapter. Bármely külső zenegeneráló / saját tanító szolgáltatás bekötható,
// ha ezt a REST szerződést megvalósítja (dokumentáció: docs/zene-api.md).
//
//   POST {MUSIC_API_URL}/v1/train              → { id }
//   GET  {MUSIC_API_URL}/v1/train/{id}         → { status, progress, model_id?, error? }
//   POST {MUSIC_API_URL}/v1/generate           → { id }
//   GET  {MUSIC_API_URL}/v1/generate/{id}      → { status, progress?, audio_url?, error? }
//
// Hitelesítés: Authorization: Bearer {MUSIC_API_KEY}

import type { AudioAdapter, AudioJobRequest, AudioJobStatus, TrainingAdapter, TrainingRequest, TrainingStatus } from "./types";

function cfg() {
  const base = process.env.MUSIC_API_URL?.replace(/\/$/, "");
  if (!base) throw new Error("MUSIC_API_URL nincs beállítva");
  return { base, headers: { Authorization: `Bearer ${process.env.MUSIC_API_KEY ?? ""}`, "Content-Type": "application/json" } };
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { base, headers } = cfg();
  const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Zene-API hiba ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export class HttpAudioAdapter implements AudioAdapter {
  readonly name = "http-music-api";
  async submit(req: AudioJobRequest) {
    const r = await call<{ id: string }>("POST", "/v1/generate", {
      kind: req.kind,
      ref_id: req.refId,
      duration_sec: req.durationSec,
      tempo: req.tempo,
      style_id: req.styleId,
      style_model_id: req.styleModelId,
      mood: req.mood,
      instruments: req.instruments,
      lyrics: req.lyrics,
      voice_model_id: req.voiceModelId,
      pronunciation_hints: req.pronunciationHints,
      watermark_id: req.watermarkId,
      title: req.title,
    });
    return { jobId: r.id };
  }
  async poll(jobId: string): Promise<AudioJobStatus> {
    const r = await call<{ status: string; progress?: number; audio_url?: string; error?: string }>("GET", `/v1/generate/${encodeURIComponent(jobId)}`);
    if (r.status === "failed") return { status: "failed", error: r.error ?? "ismeretlen hiba" };
    if (r.status !== "succeeded" || !r.audio_url) return { status: "pending", progress: r.progress };
    const audio = await fetch(r.audio_url, { signal: AbortSignal.timeout(120_000) });
    if (!audio.ok) return { status: "failed", error: `Hangfájl letöltési hiba: ${audio.status}` };
    return { status: "done", audio: new Uint8Array(await audio.arrayBuffer()), contentType: audio.headers.get("content-type") ?? "audio/mpeg" };
  }
}

export class HttpTrainingAdapter implements TrainingAdapter {
  readonly name = "http-music-api";
  async start(req: TrainingRequest) {
    const r = await call<{ id: string }>("POST", "/v1/train", {
      ref_id: req.jobId,
      name: req.name,
      style_ids: req.styleIds,
      samples: req.samples.map((s) => ({
        id: s.id,
        url: s.url,
        title: s.title,
        bpm: s.bpm,
        key: s.musicalKey,
        style_ids: s.styleIds,
        instruments: s.instruments,
        mood: s.mood,
      })),
    });
    return { providerJobId: r.id };
  }
  async status(providerJobId: string): Promise<TrainingStatus> {
    const r = await call<{ status: string; progress?: number; model_id?: string; error?: string }>("GET", `/v1/train/${encodeURIComponent(providerJobId)}`);
    const progress = Math.max(0, Math.min(100, Math.round(r.progress ?? 0)));
    if (r.status === "succeeded" && r.model_id) return { status: "succeeded", progress: 100, modelId: r.model_id };
    if (r.status === "failed") return { status: "failed", progress, error: r.error ?? "ismeretlen hiba" };
    return { status: r.status === "running" ? "running" : "queued", progress };
  }
}
