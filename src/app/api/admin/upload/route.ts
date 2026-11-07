import crypto from "node:crypto";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getStorage, safeObjectPath } from "@/lib/storage";

const AUDIO = /^audio\/(mpeg|mp3|wav|x-wav|wave|flac|x-flac|ogg|mp4|x-m4a|aac)$/;
const MAX = 200 * 1024 * 1024;

/** Közvetlen feltöltési cél (aláírt URL) a böngészőnek: a fájl nem megy át a szerveren. */
export async function POST(req: Request) {
  if (!(await adminFromRequest())) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const bucket = b.bucket === "samples" ? "samples" : "training";
  const mime = String(b.mimeType ?? "");
  const size = Number(b.size ?? 0);
  if (!AUDIO.test(mime)) return Response.json({ error: "Csak hangfájl tölthető fel (MP3, WAV, FLAC, OGG, M4A)." }, { status: 400 });
  if (!size || size > MAX) return Response.json({ error: "A fájl legfeljebb 200 MB lehet." }, { status: 400 });
  const name = safeObjectPath(String(b.fileName ?? "hang")) || "hang";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomBytes(6).toString("hex")}-${name}`;
  const target = await getStorage().createUploadTarget(bucket, path, mime);
  return Response.json({ bucket, storagePath: path, target });
}
