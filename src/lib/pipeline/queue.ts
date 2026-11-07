import "server-only";
import { isMock, SITE } from "../site";
import { getSupabaseAdmin, isSupabase } from "../supabase";

// Háttérfeladat-sor. Mock: folyamaton belüli időzítő. Supabase: tartós "jobs" tábla, amit a
// /api/cron/worker végpont dolgoz fel (Vercel Cron percenként + azonnali "rúgás" beküldéskor).

export type JobName = "order.advance" | "preview.advance" | "training.poll" | "support.process";
export interface Job {
  name: JobName;
  payload: Record<string, string>;
}

export interface Queue {
  enqueue(job: Job, delayMs?: number): Promise<void>;
}

class InProcessQueue implements Queue {
  async enqueue(job: Job, delayMs = 0) {
    setTimeout(async () => {
      try {
        const { runJob } = await import("./jobs");
        await runJob(job);
      } catch (err) {
        console.error(`[queue] hiba (${job.name}):`, err);
      }
    }, delayMs);
  }
}

class DbQueue implements Queue {
  async enqueue(job: Job, delayMs = 0) {
    const { error } = await getSupabaseAdmin()
      .from("jobs")
      .insert({ name: job.name, payload: job.payload, run_at: new Date(Date.now() + delayMs).toISOString() });
    if (error) throw new Error(`Feladat beküldése sikertelen: ${error.message}`);
    if (delayMs <= 1000) kickWorker();
  }
}

/** Azonnal elindítja a feldolgozót (nem várja meg a választ), hogy ne kelljen a következő cron-percre várni. */
export function kickWorker() {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
  fetch(`${SITE.url}/api/cron/worker`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } }).catch(() => {});
}

const g = globalThis as unknown as { __huzdraQueue?: Queue };
export function getQueue(): Queue {
  if (!g.__huzdraQueue) g.__huzdraQueue = isSupabase() ? new DbQueue() : new InProcessQueue();
  return g.__huzdraQueue;
}

export const enqueue = (name: JobName, payload: Record<string, string>, delayMs = 0) => getQueue().enqueue({ name, payload }, delayMs);

/** Lépések közti késleltetés: demóban látványosan lassú, élesben azonnali. */
export const stepDelay = () => (isMock() && !isSupabase() ? Number(process.env.MOCK_STEP_DELAY_MS ?? 2500) : 0);
/** Külső szolgáltató (zene-API, tanítás) lekérdezési gyakorisága. */
export const pollDelay = () => (process.env.MUSIC_API_URL ? 15_000 : isMock() ? 600 : 5_000);
