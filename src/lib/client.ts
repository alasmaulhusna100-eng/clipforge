/** Client-safe helpers (no node imports). */

export function mediaUrl(p?: string | null): string {
  return p ? `/api/media?p=${encodeURIComponent(p)}` : "";
}

export function downloadUrl(p: string, name?: string): string {
  return `/api/media?p=${encodeURIComponent(p)}&download=1${name ? `&name=${encodeURIComponent(name)}` : ""}`;
}

export function fmtTime(s?: number | null): string {
  if (s == null || !isFinite(s) || s < 0) return "0:00";
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtBytes(n?: number | null): string {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function resLabel(w?: number | null, h?: number | null): string {
  if (!h) return "—";
  if (h >= 2000) return "4K UHD";
  if (h >= 1400) return "QHD 2K";
  if (h >= 1000) return "FHD 1080p";
  if (h >= 700) return "HD 720p";
  return `SD ${h}p`;
}

export interface QualityOption {
  id: string;
  label: string;
  short: string;
  note: string;
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { id: "source", label: "Source", short: "Original", note: "Keep original resolution" },
  { id: "480p", label: "SD", short: "480p", note: "854 × 480 · smallest files" },
  { id: "720p", label: "HD", short: "720p", note: "1280 × 720 · web ready" },
  { id: "1080p", label: "Full HD", short: "1080p", note: "1920 × 1080 · recommended" },
  { id: "1440p", label: "QHD 2K", short: "1440p", note: "2560 × 1440 · creator grade" },
  { id: "2160p", label: "UHD 4K", short: "2160p", note: "3840 × 2160 · maximum detail" },
];

export const SEGMENT_PRESETS = [10, 25, 45, 60];

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export interface ApiAsset {
  id: string;
  kind: string;
  origin: string;
  name: string;
  path: string;
  thumbPath: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiClip {
  clip: {
    id: string;
    projectId: string;
    serial: number;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
  };
  asset: ApiAsset | null;
}

export interface ApiJob {
  id: string;
  type: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  label: string;
  error: string | null;
  payload?: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  createdAt: string;
}
