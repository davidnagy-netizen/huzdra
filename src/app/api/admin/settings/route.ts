import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getRepo } from "@/lib/db";
import type { Settings } from "@/lib/types";

const BOOL: (keyof Settings)[] = ["autoQc", "autoSupport", "autoArtistApproval", "freeNameFixes", "previewEnabled"];

export async function PUT(req: Request) {
  if (!(await adminFromRequest())) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const patch: Partial<Settings> = {};
  for (const k of BOOL) if (typeof b[k] === "boolean") (patch as Record<string, unknown>)[k] = b[k];
  if (typeof b.supportConfidence === "number") patch.supportConfidence = Math.min(1, Math.max(0.5, b.supportConfidence));
  if (typeof b.previewSeconds === "number") patch.previewSeconds = Math.min(30, Math.max(8, Math.round(b.previewSeconds)));
  if (typeof b.previewHourlyLimit === "number") patch.previewHourlyLimit = Math.min(100, Math.max(1, Math.round(b.previewHourlyLimit)));
  if (typeof b.happyFamiliesBaseline === "number") patch.happyFamiliesBaseline = Math.max(0, Math.round(b.happyFamiliesBaseline));
  return Response.json(await getRepo().updateSettings(patch));
}
