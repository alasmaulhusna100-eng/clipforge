/** Shared editor timeline model (client + render server). */

export type FilterId = "none" | "vivid" | "cinema" | "mono" | "warm" | "cool" | "dream";

export interface FilterDef {
  id: FilterId;
  label: string;
  ffmpeg: string;
  css: string;
}

export const FILTERS: FilterDef[] = [
  { id: "none", label: "Original", ffmpeg: "", css: "none" },
  { id: "vivid", label: "Vivid", ffmpeg: "eq=saturation=1.55:contrast=1.14:brightness=0.02", css: "saturate(1.55) contrast(1.14) brightness(1.02)" },
  { id: "cinema", label: "Cinematic", ffmpeg: "curves=vintage,vignette=PI/4.8", css: "contrast(1.12) saturate(0.85) sepia(0.18)" },
  { id: "mono", label: "Noir B&W", ffmpeg: "hue=s=0,eq=contrast=1.18:brightness=0.01", css: "grayscale(1) contrast(1.18)" },
  { id: "warm", label: "Golden Hour", ffmpeg: "colorbalance=rs=0.16:gs=0.05:bs=-0.12,eq=saturation=1.15", css: "sepia(0.32) saturate(1.3) hue-rotate(-8deg)" },
  { id: "cool", label: "Arctic", ffmpeg: "colorbalance=bs=0.16:rs=-0.08:gs=0.02,eq=saturation=1.05", css: "saturate(1.05) hue-rotate(14deg) brightness(1.03)" },
  { id: "dream", label: "Dreamcore", ffmpeg: "gblur=sigma=1.2,eq=saturation=1.35:brightness=0.05,hue=h=8", css: "blur(0.6px) saturate(1.35) brightness(1.08) hue-rotate(8deg)" },
];

export function filterDef(id: string | undefined): FilterDef {
  return FILTERS.find((f) => f.id === id) ?? FILTERS[0];
}

export interface EditClip {
  uid: string;
  assetId: string;
  src: string; // storage-relative path
  name: string;
  sourceDuration: number; // full source length
  in: number; // trim start (seconds, source-relative)
  out: number; // trim end
  filter: FilterId;
  volume: number; // 0..2
}

export interface TextOverlay {
  id: string;
  text: string;
  start: number; // timeline seconds
  end: number;
  x: number; // 0..1 of stage width
  y: number; // 0..1 of stage height
  size: number; // fraction of stage height
  color: string; // #rrggbb
}

export interface TimelineData {
  clips: EditClip[];
  overlays: TextOverlay[];
  fadeIn: boolean;
  fadeOut: boolean;
}

export function clipLen(c: EditClip): number {
  return Math.max(0.05, c.out - c.in);
}

export function timelineDuration(t: TimelineData): number {
  return t.clips.reduce((s, c) => s + clipLen(c), 0);
}

/** Map a global timeline time → clip index + source time. */
export function locateAt(t: TimelineData, time: number): { index: number; sourceTime: number } | null {
  let acc = 0;
  for (let i = 0; i < t.clips.length; i++) {
    const len = clipLen(t.clips[i]);
    if (time < acc + len - 1e-6) {
      return { index: i, sourceTime: t.clips[i].in + (time - acc) };
    }
    acc += len;
  }
  if (t.clips.length === 0) return null;
  const last = t.clips[t.clips.length - 1];
  return { index: t.clips.length - 1, sourceTime: last.out };
}
