import crypto from "node:crypto";
import { getRepo } from "@/lib/db";
import { sanitizeWizard } from "@/lib/wizard-schema";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const draft = await getRepo().createDraft({
    id: `drf_${crypto.randomBytes(12).toString("base64url")}`,
    data: sanitizeWizard(body.data),
    step: Math.max(0, Math.min(5, Number(body.step) || 0)),
    createdAt: now,
    updatedAt: now,
  });
  return Response.json({ id: draft.id, updatedAt: draft.updatedAt }, { status: 201 });
}
