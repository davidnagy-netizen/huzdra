import "server-only";
import type { Job } from "./queue";

/** Központi feladat-elosztó: a sor (mock időzítő vagy Supabase worker) ezt hívja. */
export async function runJob(job: Job): Promise<void> {
  switch (job.name) {
    case "order.advance": {
      const { advanceOrder } = await import("./orchestrator");
      return advanceOrder(job.payload.orderId);
    }
    case "preview.advance": {
      const { advancePreview } = await import("./preview");
      return advancePreview(job.payload.previewId);
    }
    case "training.poll": {
      const { pollTraining } = await import("./training");
      return pollTraining(job.payload.jobId);
    }
    case "support.process": {
      const { processTicket } = await import("./support");
      return processTicket(job.payload.ticketId);
    }
  }
}
