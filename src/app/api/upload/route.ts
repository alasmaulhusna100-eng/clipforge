import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { DIRS, ensureDirs, toRel } from "@/lib/paths";
import { probe, makeThumb } from "@/lib/ffmpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Raw-body streaming upload — supports very large video files with progress. */
export async function POST(req: NextRequest) {
  ensureDirs();
  const name = (req.nextUrl.searchParams.get("name") || "video.mp4")
    .replace(/[^\w.\- ]/g, "_")
    .slice(-120);
  const ext = path.extname(name) || ".mp4";
  const id = crypto.randomUUID();
  const file = path.join(DIRS.uploads, `${id}${ext}`);

  if (!req.body) return Response.json({ error: "Empty body" }, { status: 400 });

  const ws = fs.createWriteStream(file);
  const reader = req.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length) {
        if (!ws.write(Buffer.from(value))) {
          await new Promise<void>((r) => ws.once("drain", () => r()));
        }
      }
    }
  } finally {
    await new Promise<void>((res) => ws.end(res));
  }

  const st = fs.statSync(file);
  if (st.size < 100) {
    fs.unlinkSync(file);
    return Response.json({ error: "File too small" }, { status: 400 });
  }

  let meta = { duration: 0, width: 0, height: 0, hasAudio: true };
  try {
    meta = await probe(file);
  } catch {
    // keep unknown
  }

  const thumb = path.join(DIRS.thumbs, "uploads", `${id}.jpg`);
  fs.mkdirSync(path.dirname(thumb), { recursive: true });
  if (meta.duration > 0) await makeThumb(file, thumb, Math.min(meta.duration / 3, 5), 480).catch(() => {});

  const [row] = await db
    .insert(assets)
    .values({
      kind: "video",
      origin: "upload",
      name: name.replace(ext, ""),
      path: toRel(file),
      thumbPath: fs.existsSync(thumb) ? toRel(thumb) : null,
      durationSeconds: meta.duration || null,
      width: meta.width || null,
      height: meta.height || null,
      sizeBytes: st.size,
      meta: { hasAudio: meta.hasAudio },
    })
    .returning();

  return Response.json({ asset: row });
}
