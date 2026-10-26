import fs from "fs";
import path from "path";

/** Root directory for all user media (uploads, split clips, AI output, renders, thumbs) */
export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const DIRS = {
  uploads: path.join(STORAGE_ROOT, "uploads"),
  splits: path.join(STORAGE_ROOT, "splits"),
  ai: path.join(STORAGE_ROOT, "ai"),
  renders: path.join(STORAGE_ROOT, "renders"),
  thumbs: path.join(STORAGE_ROOT, "thumbs"),
  tmp: path.join(STORAGE_ROOT, "tmp"),
} as const;

export function ensureDirs() {
  for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });
}

/** Resolve a storage-relative path safely (prevents traversal). */
export function resolveStorage(rel: string): string {
  const clean = rel.replace(/^\/+/, "");
  const abs = path.resolve(STORAGE_ROOT, clean);
  if (!abs.startsWith(STORAGE_ROOT)) throw new Error("Invalid path");
  return abs;
}

export function toRel(abs: string): string {
  return path.relative(STORAGE_ROOT, abs).split(path.sep).join("/");
}

export const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
export const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

export function hasFont(): boolean {
  try {
    return fs.existsSync(FONT_BOLD);
  } catch {
    return false;
  }
}
