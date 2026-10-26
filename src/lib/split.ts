import path from "path";
import fs from "fs";
import { db } from "@/db";
import { assets, clips, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { probe, runFFmpeg, makeThumb } from "./ffmpeg";
import { getQuality, scaleFilter } from "./quality";
import { DIRS, toRel } from "./paths";
import { pool } from "./jobs";

export interface SplitParams {
  projectId: string;
  assetId: string;
  segmentSeconds: number;
  qualityId: string;
}

/**
 * Split a long video into serially numbered clips (1..N).
 * The original file is never modified — clips are re-encoded segments.
 */
export async function runSplit(
  p: SplitParams,
  onProgress: (pct: number, clipCount: number) => Promise<void>
): Promise<{ clipCount: number }> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, p.assetId));
  if (!asset) throw new Error("Source asset not found");
  const src = path.join(DIRS.uploads, path.basename(asset.path));
  if (!fs.existsSync(src)) throw new Error("Source file missing");

  const meta = await probe(src);
  const total = meta.duration;
  if (!total || total < 1) throw new Error("Could not read video duration");

  const segLen = Math.max(1, Math.min(p.segmentSeconds, total));
  const starts: number[] = [];
  for (let s = 0; s < total - 0.05; s += segLen) starts.push(s);
  const count = starts.length;

  const q = getQuality(p.qualityId);
  const outDir = path.join(DIRS.splits, p.projectId);
  const thumbDir = path.join(DIRS.thumbs, p.projectId);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(thumbDir, { recursive: true });

  await db
    .update(projects)
    .set({
      status: "processing",
      durationSeconds: total,
      width: meta.width,
      height: meta.height,
      segmentSeconds: segLen,
      quality: q.id,
      clipCount: count,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, p.projectId));

  let done = 0;
  const reportEvery = () => Math.max(1, Math.floor(count / 60));
  const pad = (n: number) => String(n).padStart(3, "0");

  await pool(starts, 3, async (start, i) => {
    const serial = i + 1;
    const end = Math.min(total, start + segLen);
    const dur = end - start;
    const file = path.join(outDir, `part_${pad(serial)}.mp4`);
    const thumb = path.join(thumbDir, `part_${pad(serial)}.jpg`);

    await runFFmpeg(
      [
        "-ss", start.toFixed(3),
        "-i", src,
        "-t", dur.toFixed(3),
        "-vf", scaleFilter(q),
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", `${q.videoBitrateK}k`,
        "-maxrate", `${Math.round(q.videoBitrateK * 1.5)}k`,
        "-bufsize", `${q.videoBitrateK * 2}k`,
        "-pix_fmt", "yuv420p",
        ...(meta.hasAudio
          ? ["-c:a", "aac", "-b:a", `${q.audioBitrateK}k`, "-ar", "48000", "-ac", "2"]
          : ["-an"]),
        "-movflags", "+faststart",
        file,
      ],
      {
        totalSeconds: dur,
        label: `clip ${serial}`,
        onProgress: () => {},
      }
    );

    await makeThumb(file, thumb, Math.min(0.8, dur / 2), 480).catch(() => {});

    const st = fs.statSync(file);
    const [clipAsset] = await db
      .insert(assets)
      .values({
        kind: "video",
        origin: "split",
        name: `Part ${serial}`,
        path: toRel(file),
        thumbPath: toRel(thumb),
        durationSeconds: dur,
        width: q.id === "source" ? meta.width : Math.min(q.width, meta.width || q.width),
        height: q.id === "source" ? meta.height : Math.min(q.height, meta.height || q.height),
        sizeBytes: st.size,
        meta: { projectId: p.projectId, serial, start, end },
      })
      .returning({ id: assets.id });

    await db.insert(clips).values({
      projectId: p.projectId,
      assetId: clipAsset.id,
      serial,
      startSeconds: start,
      endSeconds: end,
      durationSeconds: dur,
    });

    done++;
    if (done % reportEvery() === 0 || done === count) {
      await onProgress((done / count) * 100, done);
    }
  });

  await db
    .update(projects)
    .set({ status: "done", clipCount: count, updatedAt: new Date() })
    .where(eq(projects.id, p.projectId));

  return { clipCount: count };
}
