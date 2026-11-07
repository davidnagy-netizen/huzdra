import "server-only";
import { getRepo } from "../db";
import { SITE } from "../site";
import { getStorage } from "../storage";
import type { StyleId, TrainingJob } from "../types";
import { token } from "./orchestrator";
import { enqueue, pollDelay } from "./queue";
import { getAdapters } from "./registry";

export class TrainingError extends Error {}

/** Tanítás indítása a kiválasztott zenemintákból (csak jogtiszta, megerősített minták). */
export async function startTraining(input: { name: string; sampleIds: string[]; styleIds: StyleId[] }, by: string): Promise<TrainingJob> {
  const repo = getRepo();
  const all = await repo.listTrainingSamples();
  const samples = all.filter((s) => input.sampleIds.includes(s.id) && s.status !== "archived");
  if (!samples.length) throw new TrainingError("Válassz legalább egy zenemintát.");
  const noRights = samples.filter((s) => !s.rightsConfirmed);
  if (noRights.length) throw new TrainingError(`Jogtisztaság nincs megerősítve: ${noRights.map((s) => s.title).join(", ")}`);
  const storage = getStorage();
  const withUrls = await Promise.all(
    samples.map(async (s) => {
      const url = await storage.signedUrl("training", s.storagePath, 7 * 86400);
      return {
        id: s.id,
        url: url.startsWith("http") ? url : `${SITE.url}${url}`,
        title: s.title,
        bpm: s.bpm,
        musicalKey: s.musicalKey,
        styleIds: s.styleIds,
        instruments: s.instruments,
        mood: s.mood,
      };
    }),
  );
  const now = new Date().toISOString();
  const job: TrainingJob = {
    id: `trn_${token(8)}`,
    name: input.name.trim().slice(0, 80) || `Tanítás ${new Date().toLocaleDateString("hu-HU")}`,
    sampleIds: samples.map((s) => s.id),
    styleIds: input.styleIds,
    provider: getAdapters().training.name,
    providerJobId: null,
    status: "queued",
    progress: 0,
    modelId: null,
    error: null,
    active: false,
    createdAt: now,
    updatedAt: now,
  };
  await repo.createTrainingJob(job);
  try {
    const { providerJobId } = await getAdapters().training.start({ jobId: job.id, name: job.name, styleIds: job.styleIds, samples: withUrls });
    await repo.updateTrainingJob(job.id, { providerJobId });
    for (const s of samples) await repo.updateTrainingSample(s.id, { status: "in_training" });
    await enqueue("training.poll", { jobId: job.id }, pollDelay());
  } catch (err) {
    await repo.updateTrainingJob(job.id, { status: "failed", error: err instanceof Error ? err.message : String(err) });
    throw new TrainingError(`A tanítás indítása sikertelen: ${err instanceof Error ? err.message : err}`);
  }
  console.info(`[training] ${job.id} elindítva (${samples.length} minta) – ${by}`);
  return (await repo.listTrainingJobs()).find((j) => j.id === job.id)!;
}

export async function pollTraining(jobId: string) {
  const repo = getRepo();
  const job = (await repo.listTrainingJobs()).find((j) => j.id === jobId);
  if (!job || !job.providerJobId || ["succeeded", "failed", "cancelled"].includes(job.status)) return;
  try {
    const st = await getAdapters().training.status(job.providerJobId);
    if (st.status === "succeeded") {
      await repo.updateTrainingJob(jobId, { status: "succeeded", progress: 100, modelId: st.modelId });
      for (const id of job.sampleIds) await repo.updateTrainingSample(id, { status: "uploaded" });
      return;
    }
    if (st.status === "failed") {
      await repo.updateTrainingJob(jobId, { status: "failed", progress: st.progress, error: st.error });
      for (const id of job.sampleIds) await repo.updateTrainingSample(id, { status: "uploaded" });
      return;
    }
    await repo.updateTrainingJob(jobId, { status: st.status, progress: st.progress });
  } catch (err) {
    console.warn("[training] lekérdezési hiba:", err);
  }
  await enqueue("training.poll", { jobId }, Math.max(pollDelay() * 2, 1000));
}

/** Modell aktiválása: ettől kezdve ez generál a megadott stílus(ok)ban. */
export async function activateModel(jobId: string, active: boolean) {
  const repo = getRepo();
  const jobs = await repo.listTrainingJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job || job.status !== "succeeded") throw new TrainingError("Csak sikeresen betanított modell aktiválható.");
  if (active) {
    for (const j of jobs) {
      if (j.id !== jobId && j.active && (j.styleIds.length === 0 || job.styleIds.length === 0 || j.styleIds.some((s) => job.styleIds.includes(s)))) {
        await repo.updateTrainingJob(j.id, { active: false });
      }
    }
  }
  await repo.updateTrainingJob(jobId, { active });
}
