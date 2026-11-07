// Helyi (mock) tárhely kiszolgálása aláírt URL-ekkel. Supabase módban nem használt.
import { BUCKETS, getStorage, verifyStorage, type Bucket } from "@/lib/storage";

const MAX_UPLOAD = 200 * 1024 * 1024;
const TYPES: Record<string, string> = { wav: "audio/wav", mp3: "audio/mpeg", flac: "audio/flac", ogg: "audio/ogg", m4a: "audio/mp4", json: "application/json" };

async function parse(ctx: RouteContext<"/api/storage/[bucket]/[...path]">, req: Request) {
  const { bucket, path } = await ctx.params;
  const p = path.join("/");
  const url = new URL(req.url);
  return { bucket: bucket as Bucket, p, exp: Number(url.searchParams.get("exp")), sig: url.searchParams.get("sig") ?? "" };
}

export async function GET(req: Request, ctx: RouteContext<"/api/storage/[bucket]/[...path]">) {
  const { bucket, p, exp, sig } = await parse(ctx, req);
  if (!BUCKETS.includes(bucket) || !verifyStorage("get", bucket, p, exp, sig)) return new Response("Forbidden", { status: 403 });
  const st = getStorage();
  if (!(await st.exists(bucket, p))) return new Response("Not found", { status: 404 });
  const data = await st.download(bucket, p);
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Length": String(data.length), "Cache-Control": "private, max-age=600" },
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/storage/[bucket]/[...path]">) {
  const { bucket, p, exp, sig } = await parse(ctx, req);
  if (!BUCKETS.includes(bucket) || !verifyStorage("put", bucket, p, exp, sig)) return new Response("Forbidden", { status: 403 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD) return new Response("Túl nagy fájl", { status: 413 });
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.length > MAX_UPLOAD) return new Response("Túl nagy fájl", { status: 413 });
  await getStorage().upload(bucket, p, buf, req.headers.get("content-type") ?? "application/octet-stream");
  return Response.json({ ok: true, path: p, size: buf.length });
}
