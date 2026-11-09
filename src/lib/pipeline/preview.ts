import "server-only";
import crypto from "node:crypto";
import { getRepo } from "../db";
import { getStorage } from "../storage";
import type { Mood, OccasionId, Preview, Tempo, WizardData } from "../types";
import { EMPTY_WIZARD, LIMITS, RELATIONS } from "../wizard-schema";
import { LyricsRefusedError } from "./adapters/anthropic";
import { storyFields, token } from "./orchestrator";
import { enqueue, pollDelay } from "./queue";
import { getAdapters } from "./registry";

// Hirdetési one-pager: néhány kérdés → 15 másodperces előnézet (versszak + refrén) → vásárlás.

export interface PreviewInput {
  artistId: string;
  occasionId: string;
  recipientName: string;
  nickname?: string;
  relation: string;
  mood: string;
  memories: string;
}

export class PreviewError extends Error {
  constructor(message: string, public status = 400, public field?: string) {
    super(message);
  }
}

export const hashIp = (ip: string) => crypto.createHash("sha256").update(`${ip}:${process.env.ADMIN_SESSION_SECRET ?? "huzdra"}`).digest("hex").slice(0, 32);

const MOODS: Mood[] = ["vicces", "meghato", "unnepelyes"];
const tempoFor = (m: Mood): Tempo => (m === "meghato" ? "lassu" : m === "vicces" ? "porgos" : "kozepes");

export async function createPreview(input: PreviewInput, ipHash: string): Promise<Preview> {
  const repo = getRepo();
  const settings = await repo.getSettings();
  if (!settings.previewEnabled) throw new PreviewError("Az előnézet most nem elérhető.", 503);
  const since = new Date(Date.now() - 3600_000).toISOString();
  if ((await repo.countPreviewsSince(ipHash, since)) >= settings.previewHourlyLimit) {
    throw new PreviewError("Most túl sok előnézet készült erről az eszközről – próbáld újra egy óra múlva, vagy rendeld meg egyből!", 429);
  }
  const artists = await repo.listArtists();
  const occasions = await repo.listOccasions();
  if (!artists.some((a) => a.id === input.artistId)) throw new PreviewError("Válassz előadót.", 400, "artistId");
  if (!occasions.some((o) => o.id === input.occasionId)) throw new PreviewError("Válassz alkalmat.", 400, "occasionId");
  const name = String(input.recipientName ?? "").trim();
  if (name.length < 2 || name.length > LIMITS.recipientName) throw new PreviewError("Add meg az ünnepelt nevét.", 400, "recipientName");
  if (!RELATIONS.includes(input.relation as (typeof RELATIONS)[number])) throw new PreviewError("Ki ő neked?", 400, "relation");
  const mood = (MOODS.includes(input.mood as Mood) ? input.mood : "unnepelyes") as Mood;
  const memories = String(input.memories ?? "").trim();
  if (memories.length < 40) throw new PreviewError("Írj 1–2 mondatot rólatok (legalább 40 karakter) – ebből lesz a dal.", 400, "memories");
  if (memories.length > LIMITS.memories) throw new PreviewError("Túl hosszú történet.", 400, "memories");

  const data: WizardData = {
    ...EMPTY_WIZARD,
    artistId: input.artistId,
    occasionId: input.occasionId as OccasionId,
    recipientName: name,
    nickname: String(input.nickname ?? "").trim().slice(0, LIMITS.nickname),
    relation: input.relation,
    mood,
    tempo: tempoFor(mood),
    memories,
  };
  const moderation = await getAdapters().moderation.check(storyFields(data));
  const preview: Preview = {
    id: `prv_${token(9)}`,
    token: token(12),
    createdAt: new Date().toISOString(),
    status: moderation.flags.some((f) => f.severity === "block") ? "blocked" : "generating",
    data,
    lyrics: null,
    audioUrl: null,
    moderation,
    ipHash,
    orderId: null,
    audioJob: null,
    error: null,
  };
  await repo.createPreview(preview);
  if (preview.status === "generating") await enqueue("preview.advance", { previewId: preview.id });
  return preview;
}

export async function advancePreview(previewId: string): Promise<void> {
  const repo = getRepo();
  const adapters = getAdapters();
  const p = await repo.getPreview(previewId);
  if (!p || p.status !== "generating") return;
  const artist = await repo.getArtistById(p.data.artistId);
  if (!artist) return;
  const settings = await repo.getSettings();
  const failP = (error: string) => repo.updatePreview(p.id, { status: "failed", error, audioJob: null });

  try {
    if (!p.lyrics) {
      const occasions = await repo.listOccasions();
      const res = await adapters.lyrics.generate({
        data: p.data,
        artist,
        occasionLabel: occasions.find((o) => o.id === p.data.occasionId)?.label ?? "Ünnep",
        styleLabel: null,
        short: true,
      });
      const check = await adapters.moderation.check({ lyrics: res.text, title: res.title });
      if (check.flags.some((f) => f.severity === "block")) {
        await repo.updatePreview(p.id, { status: "blocked", moderation: check });
        return;
      }
      await repo.updatePreview(p.id, { lyrics: { ...res, version: 1, generatedBy: adapters.lyrics.name } });
      return enqueue("preview.advance", { previewId });
    }
    if (!p.audioJob) {
      const jobs = await repo.listTrainingJobs();
      const styleModel = jobs.find((j) => (j.type ?? "style") === "style" && j.active && j.status === "succeeded");
      const { jobId } = await adapters.audio.submit({
        kind: "preview",
        refId: p.id,
        durationSec: settings.previewSeconds,
        tempo: p.data.tempo || "kozepes",
        styleId: null,
        mood: p.data.mood,
        instruments: { violin: true, cimbalom: false },
        lyrics: p.lyrics.text,
        voiceModelId: artist.voiceModelId,
        styleModelId: styleModel?.modelId ?? null,
        pronunciationHints: [],
        watermarkId: `wm_${p.id}`,
        title: p.lyrics.title,
        artistName: artist.name,
      });
      await repo.updatePreview(p.id, { audioJob: { jobId, submittedAt: new Date().toISOString() } });
      return enqueue("preview.advance", { previewId }, pollDelay());
    }
    const res = await adapters.audio.poll(p.audioJob.jobId);
    if (res.status === "pending") {
      if (Date.now() - Date.parse(p.audioJob.submittedAt) > 10 * 60_000) return void (await failP("Időtúllépés"));
      return enqueue("preview.advance", { previewId }, pollDelay());
    }
    if (res.status === "failed") return void (await failP(res.error));
    const ext = res.contentType.includes("wav") ? "wav" : "mp3";
    await getStorage().upload("previews", `${p.id}.${ext}`, res.audio, res.contentType);
    await repo.updatePreview(p.id, { status: "ready", audioJob: null, audioUrl: `${p.id}.${ext}` });
  } catch (err) {
    if (err instanceof LyricsRefusedError) return void (await repo.updatePreview(p.id, { status: "blocked" }));
    console.error("[preview] hiba:", err);
    await failP(err instanceof Error ? err.message : String(err));
  }
}

/** Az ügyfélnek mutatott előnézet: a szövegből csak az első versszak + a refrén eleje látszik. */
export function publicPreview(p: Preview) {
  const lines = p.lyrics?.text.split("\n") ?? [];
  const visible = lines.slice(0, 9).join("\n");
  return {
    id: p.id,
    status: p.status,
    title: p.lyrics?.title ?? null,
    lyricsVisible: p.lyrics ? visible : null,
    lyricsHiddenLines: Math.max(0, lines.length - 9),
    audioUrl: p.status === "ready" ? `/api/previews/${p.id}/audio?t=${p.token}` : null,
    recipientName: p.data.recipientName,
    artistId: p.data.artistId,
    purchased: !!p.orderId,
  };
}
