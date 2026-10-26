import path from "path";
import fs from "fs";
import { runFFmpeg } from "./ffmpeg";
import { getQuality, QualityPreset } from "./quality";
import { DIRS } from "./paths";
import { buildAss, escFilterPath, wrapTitle, AssOverlay } from "./ass";
import { db } from "@/db";
import { assets } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Seeded PRNG — the prompt drives every visual choice deterministically */
/* ------------------------------------------------------------------ */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES: [string, string, string, string][] = [
  ["#0b0033", "#3700b3", "#00f5d4", "#f15bb5"],
  ["#03071e", "#370617", "#dc2f02", "#ffba08"],
  ["#001219", "#005f73", "#0a9396", "#e9d8a6"],
  ["#10002b", "#5a189a", "#9d4edd", "#ff9e00"],
  ["#012a4a", "#014f86", "#61a5c2", "#a9d6e5"],
  ["#081c15", "#1b4332", "#52b788", "#d8f3dc"],
  ["#2b2d42", "#8d0801", "#ef233c", "#edf2f4"],
  ["#231942", "#5e548e", "#9f86c0", "#e0b1cb"],
  ["#0d1b2a", "#1b263b", "#415a77", "#e0e1dd"],
  ["#3d348b", "#7678ed", "#f7b801", "#f35b04"],
];

const MOODS = [
  { hueSpeed: 24, sat: 1.5, contrast: 1.18, grain: 7 },
  { hueSpeed: 42, sat: 1.7, contrast: 1.12, grain: 9 },
  { hueSpeed: 12, sat: 1.25, contrast: 1.28, grain: 5 },
  { hueSpeed: 60, sat: 1.9, contrast: 1.06, grain: 12 },
];

export interface AiGenParams {
  prompt: string;
  style: "cosmic" | "flow" | "cells";
  kind: "video" | "image";
  duration: number; // seconds, video only
  qualityId: string;
  aspect: "16:9" | "9:16" | "1:1";
}

function canvasSize(q: QualityPreset, aspect: string): { w: number; h: number } {
  const base = q.id === "source" ? { width: 1920, height: 1080 } : q;
  let w = base.width;
  let h = base.height;
  if (aspect === "9:16") {
    w = base.height;
    h = base.width;
  } else if (aspect === "1:1") {
    w = h = base.height;
  }
  return { w: w - (w % 2), h: h - (h % 2) };
}

function buildVideoEngine(style: string, w: number, h: number, rnd: () => number, pal: string[]): string {
  const r = rnd();
  if (style === "cosmic") {
    const cx = (-0.1011 - r * 0.66).toFixed(5);
    const cy = (0.28 + rnd() * 0.66).toFixed(5);
    const sc = (2 + rnd() * 3).toFixed(3);
    const outer = rnd() > 0.5 ? "iteration_count" : "normalized_iteration_count";
    return `mandelbrot=size=${w}x${h}:rate=30:maxiter=${420 + Math.floor(r * 500)}:start_x=${cx}:start_y=${cy}:start_scale=${sc}:outer=${outer}:inner=convergence`;
  }
  if (style === "cells") {
    const life = pal[1].replace("#", "0x");
    const death = pal[0].replace("#", "0x");
    const mold = (0.08 + rnd() * 0.2).toFixed(3);
    return `life=size=${w}x${h}:rate=30:ratio=${mold}:life_color=${life}:death_color=${death}:mold_color=${pal[3].replace("#", "0x")}`;
  }
  // flow
  const speed = (0.015 + rnd() * 0.03).toFixed(4);
  return `gradients=size=${w}x${h}:c0=${pal[0]}:c1=${pal[1]}:c2=${pal[2]}:c3=${pal[3]}:x0=${Math.floor(rnd() * w)}:y0=${Math.floor(rnd() * h)}:x1=${Math.floor(rnd() * w)}:y1=${Math.floor(rnd() * h)}:speed=${speed}:rate=30`;
}

function commonVf(
  style: string,
  mood: (typeof MOODS)[number],
  assPath: string | null,
  isVideo: boolean
): string {
  const parts: string[] = [];
  if (style === "cells") parts.push("boxblur=6:2");
  if (style === "flow") parts.push("gblur=sigma=18");
  if (isVideo) parts.push(`hue=h=mod(t*${mood.hueSpeed}\\,360):s=${mood.sat}`);
  else parts.push(`hue=s=${mood.sat}`);
  parts.push(`eq=contrast=${mood.contrast}:brightness=0.02:saturation=${mood.sat}`);
  parts.push(`noise=alls=${mood.grain}:allf=t`);
  parts.push("vignette=PI/4.6");
  if (assPath) parts.push(`subtitles='${escFilterPath(assPath)}'`);
  parts.push("format=yuv420p");
  return parts.join(",");
}

/** Build the title-card ASS file for a generation (prompt title + watermark). */
function buildTitleAss(
  params: AiGenParams,
  w: number,
  h: number,
  dur: number,
  destDir: string,
  id: string
): string {
  const isVideo = params.kind === "video";
  const overlays: AssOverlay[] = [
    {
      text: wrapTitle(params.prompt.toUpperCase(), 24),
      start: isVideo ? 0.4 : 0,
      end: isVideo ? Math.max(2.8, dur - 0.8) : 1,
      x: 0.5,
      y: 0.56,
      size: 0.085,
      color: "#ffffff",
    },
    {
      text: "CLIPFORGE AI",
      start: isVideo ? 1.0 : 0,
      end: dur,
      x: 0.965,
      y: 0.055,
      size: 0.024,
      color: "#d6d0ff",
      align: 9,
    },
  ];
  const assFile = path.join(destDir, `${id}.ass`);
  fs.writeFileSync(assFile, buildAss(overlays, w, h, { fade: isVideo }), "utf8");
  return assFile;
}

export interface AiResult {
  assetId: string;
  path: string;
  duration?: number;
  width: number;
  height: number;
}

export async function generateAiMedia(
  params: AiGenParams,
  onProgress: (ratio: number) => void
): Promise<AiResult> {
  const rndSrc = mulberry32(hashSeed(params.prompt + "|" + params.style));
  const pal = PALETTES[Math.floor(rndSrc() * PALETTES.length)];
  const mood = MOODS[Math.floor(rndSrc() * MOODS.length)];
  const q = getQuality(params.qualityId);
  const { w, h } = canvasSize(q, params.aspect);
  const dur = params.kind === "video" ? Math.max(3, Math.min(60, params.duration)) : 1;

  const id = crypto.randomUUID();
  const dir = path.join(DIRS.ai, id.slice(0, 2));
  fs.mkdirSync(dir, { recursive: true });

  const engine = buildVideoEngine(params.style, w, h, rndSrc, pal);
  const assFile = buildTitleAss(params, w, h, dur, dir, id);
  const vf = commonVf(params.style, mood, assFile, params.kind === "video");

  if (params.kind === "image") {
    const file = path.join(dir, `${id}.png`);
    await runFFmpeg(
      ["-f", "lavfi", "-i", engine, "-frames:v", "1", "-vf", vf, file],
      { label: "ai-image" }
    );
    const [row] = await db
      .insert(assets)
      .values({
        kind: "image",
        origin: "ai",
        name: params.prompt.slice(0, 80) || "AI Image",
        path: path.relative(process.cwd() + "/storage", file).split(path.sep).join("/"),
        durationSeconds: 0,
        width: w,
        height: h,
        sizeBytes: fs.statSync(file).size,
        meta: { prompt: params.prompt, style: params.style, aspect: params.aspect, quality: q.id },
      })
      .returning({ id: assets.id });
    onProgress(1);
    return { assetId: row.id, path: file, width: w, height: h };
  }

  const file = path.join(dir, `${id}.mp4`);
  const f1 = 110 + Math.floor(rndSrc() * 160);
  const f2 = Math.round(f1 * (rndSrc() > 0.5 ? 1.5 : 1.25));
  const args = [
    "-f", "lavfi", "-t", String(dur), "-i", engine,
    "-f", "lavfi", "-t", String(dur), "-i", `sine=frequency=${f1}:sample_rate=44100`,
    "-f", "lavfi", "-t", String(dur), "-i", `sine=frequency=${f2}:sample_rate=44100`,
    "-filter_complex",
    `[1:a]volume=0.6,afade=t=in:st=0:d=1.5[t1];[2:a]tremolo=f=0.25:d=0.8,volume=0.5[t2];[t1][t2]amix=inputs=2:duration=first,aecho=0.7:0.6:60:0.35,volume=0.5,afade=t=out:st=${Math.max(0, dur - 1.2)}:d=1.2[a]`,
    "-map", "0:v",
    "-map", "[a]",
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-b:v", `${q.videoBitrateK}k`,
    "-maxrate", `${Math.round(q.videoBitrateK * 1.5)}k`,
    "-bufsize", `${q.videoBitrateK * 2}k`,
    "-r", "30",
    "-c:a", "aac",
    "-b:a", `${q.audioBitrateK}k`,
    "-movflags", "+faststart",
    file,
  ];
  await runFFmpeg(args, { totalSeconds: dur, onProgress, label: "ai-video" });

  const thumb = path.join(DIRS.thumbs, "ai", `${id}.jpg`);
  fs.mkdirSync(path.dirname(thumb), { recursive: true });
  const { makeThumb } = await import("./ffmpeg");
  await makeThumb(file, thumb, Math.min(2, dur / 4), 640).catch(() => {});

  const [row] = await db
    .insert(assets)
    .values({
      kind: "video",
      origin: "ai",
      name: params.prompt.slice(0, 80) || "AI Video",
      path: path.relative(process.cwd() + "/storage", file).split(path.sep).join("/"),
      thumbPath: fs.existsSync(thumb)
        ? path.relative(process.cwd() + "/storage", thumb).split(path.sep).join("/")
        : null,
      durationSeconds: dur,
      width: w,
      height: h,
      sizeBytes: fs.statSync(file).size,
      meta: {
        prompt: params.prompt,
        style: params.style,
        aspect: params.aspect,
        quality: q.id,
        palette: pal,
        tones: [f1, f2],
      },
    })
    .returning({ id: assets.id });
  onProgress(1);
  return { assetId: row.id, path: file, duration: dur, width: w, height: h };
}
