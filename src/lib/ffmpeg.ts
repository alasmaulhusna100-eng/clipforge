import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import ffmpegPathPkg from "ffmpeg-static";
import ffprobePkg from "ffprobe-static";

function resolveBin(mod: unknown, fallback: string): string {
  const candidates: unknown[] = [
    mod,
    (mod as { default?: unknown })?.default,
    (mod as { path?: unknown })?.path,
    (mod as { default?: { path?: unknown } })?.default?.path,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && (fs.existsSync(c) || !c.includes("/"))) return c;
  }
  return fallback;
}

const ffmpegPath: string = resolveBin(ffmpegPathPkg, "ffmpeg");
const ffprobePath: string = resolveBin(ffprobePkg, "ffprobe");

if (!fs.existsSync(ffmpegPath) || !fs.existsSync(ffprobePath)) {
  console.warn("[ffmpeg] binary resolution fell back:", ffmpegPath, ffprobePath);
}

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  codec: string;
}

export async function probe(file: string): Promise<ProbeResult> {
  const args = [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    file,
  ];
  const out = await collect(ffprobePath, args);
  const data = JSON.parse(out);
  const v = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === "video");
  const a = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === "audio");
  const dur = Number(data.format?.duration ?? v?.duration ?? 0);
  let fps = 30;
  if (v?.avg_frame_rate) {
    const [n, d] = String(v.avg_frame_rate).split("/").map(Number);
    if (n && d) fps = n / d;
  }
  return {
    duration: dur || 0,
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    fps,
    hasAudio: Boolean(a),
    codec: v?.codec_name ?? "unknown",
  };
}

function collect(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(err.slice(-2000) || `exit ${code}`))
    );
  });
}

export interface RunOptions {
  /** total expected duration in seconds (for progress); omit → no progress */
  totalSeconds?: number;
  /** progress ratio weight for this command within a multi-step job */
  onProgress?: (ratio: number) => void;
  label?: string;
}

/**
 * Run ffmpeg with machine progress output. Resolves on success.
 * Never runs through a shell — args array only.
 */
export function runFFmpeg(args: string[], opts: RunOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const full = ["-hide_banner", "-y", "-nostats", "-progress", "pipe:1", ...args];
    const p = spawn(ffmpegPath, full);
    let errTail = "";
    let line = "";
    p.stdout.on("data", (d) => {
      line += d.toString();
      let idx: number;
      while ((idx = line.indexOf("\n")) >= 0) {
        const l = line.slice(0, idx).trim();
        line = line.slice(idx + 1);
        const m = l.match(/^out_time_ms=(\d+)$/);
        if (m && opts.totalSeconds && opts.onProgress) {
          const t = Number(m[1]) / 1e6;
          opts.onProgress(Math.min(0.999, t / opts.totalSeconds));
        }
      }
    });
    p.stderr.on("data", (d) => {
      errTail = (errTail + d.toString()).slice(-3000);
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) {
        opts.onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`ffmpeg failed (${opts.label ?? "cmd"}): ${errTail.slice(-600)}`));
      }
    });
  });
}

/** Extract a JPEG thumbnail at time t. */
export async function makeThumb(src: string, dest: string, atSeconds: number, width = 480) {
  await runFFmpeg([
    "-ss", String(Math.max(0, atSeconds)),
    "-i", src,
    "-frames:v", "1",
    "-vf", `scale=${width}:-2`,
    "-q:v", "4",
    dest,
  ]);
}

/** Escape a string for ffmpeg drawtext filter. */
export function escapeDrawtext(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "\\%")
    .replace(/\n/g, " ");
}

/** #rrggbb → 0xrrggbb for ffmpeg color args */
export function ffColor(hex: string, fallback = "0xffffff"): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex ?? "");
  return m ? `0x${m[1]}` : fallback;
}

export function binDir(): string {
  return path.dirname(ffmpegPath);
}
