import crypto from "node:crypto";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getRepo } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import type { TrainingSample } from "@/lib/types";

/** Feltöltött tanító zeneminta regisztrálása (a fájl már a tárhelyen van). */
export async function POST(req: Request) {
  const by = await adminFromRequest();
  if (!by) return unauthorized();
  const b = await req.json().catch(() => ({}));
  if (b.rightsConfirmed !== true) return Response.json({ error: "Erősítsd meg, hogy a felvétel saját vagy licencelt, és tanításra felhasználható." }, { status: 400 });
  const storagePath = String(b.storagePath ?? "");
  if (!storagePath || !(await getStorage().exists("training", storagePath))) return Response.json({ error: "A fájl nem található a tárhelyen – töltsd fel újra." }, { status: 400 });
  const num = (v: unknown) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const sample: TrainingSample = {
    id: `ts_${crypto.randomBytes(6).toString("hex")}`,
    title: String(b.title ?? "").trim().slice(0, 120) || String(b.fileName ?? "Zeneminta"),
    storagePath,
    fileName: String(b.fileName ?? "").slice(0, 200),
    mimeType: String(b.mimeType ?? ""),
    sizeBytes: Number(b.sizeBytes ?? 0),
    durationSec: num(b.durationSec),
    bpm: num(b.bpm),
    musicalKey: b.musicalKey ? String(b.musicalKey).slice(0, 20) : null,
    styleIds: Array.isArray(b.styleIds) ? b.styleIds.map(String) : [],
    occasionIds: Array.isArray(b.occasionIds) ? b.occasionIds.map(String) : [],
    instruments: Array.isArray(b.instruments) ? b.instruments.map(String).slice(0, 12) : [],
    mood: String(b.mood ?? "").slice(0, 40),
    notes: String(b.notes ?? "").slice(0, 1000),
    rightsConfirmed: true,
    rightsNote: String(b.rightsNote ?? "").slice(0, 300),
    status: "uploaded",
    uploadedAt: new Date().toISOString(),
    uploadedBy: by,
  };
  await getRepo().createTrainingSample(sample);
  return Response.json(sample, { status: 201 });
}
