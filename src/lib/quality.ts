/** Export quality ladder: SD → UHD 4K, plus passthrough "source". */
export interface QualityPreset {
  id: string;
  label: string;
  short: string;
  width: number;
  height: number;
  videoBitrateK: number;
  audioBitrateK: number;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  { id: "480p", label: "SD · Standard Definition", short: "SD 480p", width: 854, height: 480, videoBitrateK: 1200, audioBitrateK: 96 },
  { id: "720p", label: "HD · High Definition", short: "HD 720p", width: 1280, height: 720, videoBitrateK: 2500, audioBitrateK: 128 },
  { id: "1080p", label: "Full HD · FHD", short: "FHD 1080p", width: 1920, height: 1080, videoBitrateK: 6000, audioBitrateK: 160 },
  { id: "1440p", label: "QHD · 2K Quad HD", short: "QHD 1440p", width: 2560, height: 1440, videoBitrateK: 12000, audioBitrateK: 192 },
  { id: "2160p", label: "UHD · 4K Ultra HD", short: "UHD 4K", width: 3840, height: 2160, videoBitrateK: 25000, audioBitrateK: 256 },
];

export const SOURCE_PRESET: QualityPreset = {
  id: "source",
  label: "Source · Original quality",
  short: "Original",
  width: 0,
  height: 0,
  videoBitrateK: 10000,
  audioBitrateK: 192,
};

export function getQuality(id: string | null | undefined): QualityPreset {
  if (!id || id === "source") return SOURCE_PRESET;
  return QUALITY_PRESETS.find((q) => q.id === id) ?? QUALITY_PRESETS[2];
}

/** Scale+pad filter that fits any source into preset canvas without distortion. */
export function scaleFilter(q: QualityPreset): string {
  if (q.id === "source") return "setsar=1";
  return `scale=${q.width}:${q.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${q.width}:${q.height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
}
