import { runJob } from "@/lib/pipeline/jobs";
import type { Job } from "@/lib/pipeline/queue";
import { getSupabaseAdmin, isSupabase } from "@/lib/supabase";

export const maxDuration = 300;

/**
 * Háttérfeladat-feldolgozó (Supabase mód). Vercel Cron percenként hívja (vercel.json), és a sor
 * beküldéskor azonnal is "megrúgja". A claim_jobs() függvény FOR UPDATE SKIP LOCKED-del foglal,
 * így párhuzamos futások nem dolgozzák fel kétszer ugyanazt a feladatot.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!isSupabase()) return Response.json({ ok: true, note: "Mock módban a sor folyamaton belül fut." });
  const sb = getSupabaseAdmin();
  const started = Date.now();
  let processed = 0;
  while (Date.now() - started < 240_000) {
    const { data, error } = await sb.rpc("claim_jobs", { batch_size: 5 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const jobs = (data ?? []) as { id: number; name: Job["name"]; payload: Job["payload"]; attempts: number }[];
    if (!jobs.length) break;
    await Promise.all(
      jobs.map(async (j) => {
        try {
          await runJob({ name: j.name, payload: j.payload });
          await sb.from("jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", j.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const retry = j.attempts < 5;
          await sb
            .from("jobs")
            .update({ status: retry ? "queued" : "failed", last_error: msg, run_at: new Date(Date.now() + 60_000 * j.attempts).toISOString() })
            .eq("id", j.id);
        }
        processed++;
      }),
    );
  }
  // óránként egyszer: GDPR-karbantartás (lejárt történetek, régi piszkozatok, lezárt feladatok)
  if (new Date().getMinutes() === 0) await sb.rpc("purge_expired_stories");
  return Response.json({ ok: true, processed });
}

export const GET = handle;
export const POST = handle;
