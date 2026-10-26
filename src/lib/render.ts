import path from "path";
import fs from "fs";
import { db } from "@/db";
import { assets, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { probe, runFFmpeg, makeThumb } from "./ffmpeg";
import { getQuality, scaleFilter } from "./quality";
import { DIRS, resolveStorage, toRel } from "./paths";
import { buildAss, escFilterPath } from "./ass";
import { TimelineData, clipLen, filterDef, timelineDuration } from "./timeline";

export interface RenderParams {
  projectId: string;
  timeline: TimelineData;
  qualityId: string;
}

/**
 * Render an editor timeline to a single MP4:
 *  1. re-encode every clip segment (trim, filter, volume, normalize)
 *  2. concat segments
 *  3. burn text overlays + fades at target quality
 */
export async function runRender(
  p: RenderParams,
  onProgress: (pct: number) => Promise<void>
): Promise<{ assetId: string; duration: number }> {
  const t = p.timeline;
  if (!t.clips.length) throw new Error("Timeline is empty");
  const q = getQuality(p.qualityId);
  const total = timelineDuration(t);

  const tmp = path.join(DIRS.tmp, p.projectId);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  // probe each unique source once
  const probeCache = new Map<string, Awaited<ReturnType<typeof probe>>>();
  for (const c of t.clips) {
    const abs = resolveStorage(c.src);
    if (!probeCache.has(abs)) {
      if (!fs.existsSync(abs)) throw new Error(`Missing media: ${c.name}`);
      probeCache.set(abs, await probe(abs));
    }
  }

  // step 1 — normalize each segment
  const segFiles: string[] = [];
  for (let i = 0; i < t.clips.length; i++) {
    const c = t.clips[i];
    const abs = resolveStorage(c.src);
    const meta = probeCache.get(abs)!;
    const dur = clipLen(c);
    const seg = path.join(tmp, `seg_${String(i).padStart(3, "0")}.mp4`);
    const fd = filterDef(c.filter);
    const vf = [scaleFilter(q), fd.ffmpeg, "fps=30"].filter(Boolean).join(",");

    const args: string[] = [
      "-ss", c.in.toFixed(3),
      "-to", c.out.toFixed(3),
      "-i", abs,
    ];
    if (!meta.hasAudio) {
      args.push("-f", "lavfi", "-t", dur.toFixed(3), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
    }
    const vol = Math.max(0, Math.min(2, c.volume ?? 1));
    args.push(
      "-map", "0:v:0",
      ...(meta.hasAudio ? ["-map", "0:a:0"] : ["-map", "1:a:0"]),
      "-vf", vf,
      "-af", `aformat=sample_rates=48000:channel_layouts=stereo,volume=${vol.toFixed(2)}`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-b:v", `${q.videoBitrateK}k`,
      "-maxrate", `${Math.round(q.videoBitrateK * 1.5)}k`,
      "-bufsize", `${q.videoBitrateK * 2}k`,
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", `${q.audioBitrateK}k`,
      "-movflags", "+faststart",
      seg
    );
    await runFFmpeg(args, {
      totalSeconds: dur,
      label: `segment ${i + 1}`,
      onProgress: (r) => {
        void onProgress((((i + r) / t.clips.length) * 70));
      },
    });
    segFiles.push(seg);
  }

  // step 2 — concat
  const listFile = path.join(tmp, "concat.txt");
  fs.writeFileSync(listFile, segFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
  const concat = path.join(tmp, "concat.mp4");
  await runFFmpeg(
    ["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", concat],
    { label: "concat" }
  );
  await onProgress(78);

  // step 3 — overlays + fades
  const outDir = path.join(DIRS.renders, p.projectId);
  fs.mkdirSync(outDir, { recursive: true });
  const final = path.join(outDir, `final_${q.id}.mp4`);

  const vfParts: string[] = [];
  const afParts: string[] = [];
  const meaningful = t.overlays.filter((o) => o.end - o.start > 0.05 && o.text.trim());
  if (meaningful.length) {
    const firstProbe = probeCache.get(resolveStorage(t.clips[0].src));
    const frameW = q.id === "source" ? firstProbe?.width ?? 1920 : q.width;
    const frameH = q.id === "source" ? firstProbe?.height ?? 1080 : q.height;
    const assFile = path.join(tmp, "overlays.ass");
    fs.writeFileSync(
      assFile,
      buildAss(
        meaningful.map((o) => ({
          text: o.text,
          start: o.start,
          end: o.end,
          x: o.x,
          y: o.y,
          size: o.size,
          color: o.color,
        })),
        frameW,
        frameH
      ),
      "utf8"
    );
    vfParts.push(`subtitles='${escFilterPath(assFile)}'`);
  }
  if (t.fadeIn) vfParts.push("fade=t=in:st=0:d=0.6");
  if (t.fadeOut && total > 1) vfParts.push(`fade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6`);
  if (t.fadeIn) afParts.push("afade=t=in:st=0:d=0.6");
  if (t.fadeOut && total > 1) afParts.push(`afade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6`);

  if (vfParts.length || afParts.length) {
    const args = ["-i", concat];
    if (vfParts.length) args.push("-vf", vfParts.join(","));
    if (afParts.length) args.push("-af", afParts.join(","));
    args.push(
      "-c:v", "libx264", "-preset", "veryfast",
      "-b:v", `${q.videoBitrateK}k`,
      "-pix_fmt", "yuv420p",
      "-c:a", afParts.length ? "aac" : "copy",
      "-b:a", `${q.audioBitrateK}k`,
      "-movflags", "+faststart",
      final
    );
    await runFFmpeg(args, {
      totalSeconds: total,
      label: "overlays",
      onProgress: (r) => void onProgress(78 + r * 20),
    });
  } else {
    fs.copyFileSync(concat, final);
  }

  const thumb = path.join(DIRS.thumbs, p.projectId, `render_${q.id}.jpg`);
  fs.mkdirSync(path.dirname(thumb), { recursive: true });
  await makeThumb(final, thumb, Math.min(total / 3, 4), 640).catch(() => {});

  const st = fs.statSync(final);
  const size = probeCache.values().next().value;
  const [row] = await db
    .insert(assets)
    .values({
      kind: "video",
      origin: "render",
      name: `Render · ${q.short}`,
      path: toRel(final),
      thumbPath: fs.existsSync(thumb) ? toRel(thumb) : null,
      durationSeconds: total,
      width: q.id === "source" ? size?.width ?? 0 : q.width,
      height: q.id === "source" ? size?.height ?? 0 : q.height,
      sizeBytes: st.size,
      meta: { projectId: p.projectId, quality: q.id },
    })
    .returning({ id: assets.id });

  await db
    .update(projects)
    .set({
      renderAssetId: row.id,
      status: "done",
      quality: q.id,
      durationSeconds: total,
      timeline: t as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, p.projectId));

  fs.rmSync(tmp, { recursive: true, force: true });
  await onProgress(100);
  return { assetId: row.id, duration: total };
}
