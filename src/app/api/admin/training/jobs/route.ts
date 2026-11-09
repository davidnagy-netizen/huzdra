import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { TrainingError, startTraining } from "@/lib/pipeline/training";
import type { StyleId } from "@/lib/types";

export async function POST(req: Request) {
  const by = await adminFromRequest();
  if (!by) return unauthorized();
  const b = await req.json().catch(() => ({}));
  try {
    const job = await startTraining({ name: String(b.name ?? ""), sampleIds: Array.isArray(b.sampleIds) ? b.sampleIds.map(String) : [], styleIds: (Array.isArray(b.styleIds) ? b.styleIds : []) as StyleId[], type: b.type === "voice" ? "voice" : "style", artistId: typeof b.artistId === "string" ? b.artistId : null }, by);
    return Response.json(job, { status: 201 });
  } catch (err) {
    if (err instanceof TrainingError) return Response.json({ error: err.message }, { status: 400 });
    console.error(err);
    return Response.json({ error: "Váratlan hiba" }, { status: 500 });
  }
}
