import "server-only";

// Háttérfeladat-sor absztrakció. A mock egy folyamaton belüli, setTimeout alapú sor;
// élesben pl. Supabase Queues (pgmq), Inngest vagy Trigger.dev mögé kerül ugyanezzel az interfésszel.

export type JobName = "order.advance";
export interface Job {
  name: JobName;
  payload: { orderId: string };
}
export type JobHandler = (job: Job) => Promise<void>;

export interface Queue {
  enqueue(job: Job, delayMs?: number): Promise<void>;
  register(name: JobName, handler: JobHandler): void;
}

class InProcessQueue implements Queue {
  private handlers = new Map<JobName, JobHandler>();
  async enqueue(job: Job, delayMs = 0) {
    setTimeout(async () => {
      const h = this.handlers.get(job.name);
      if (!h) return console.warn(`[queue] nincs kezelő: ${job.name}`);
      try {
        await h(job);
      } catch (err) {
        console.error(`[queue] hiba (${job.name}):`, err);
      }
    }, delayMs);
  }
  register(name: JobName, handler: JobHandler) {
    this.handlers.set(name, handler);
  }
}

const g = globalThis as unknown as { __huzdraQueue?: Queue };
export function getQueue(): Queue {
  if (!g.__huzdraQueue) g.__huzdraQueue = new InProcessQueue();
  return g.__huzdraQueue;
}
