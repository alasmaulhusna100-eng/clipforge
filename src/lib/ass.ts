/** ASS (libass) subtitle generation for burning styled text into video. */

export interface AssOverlay {
  text: string;
  start: number; // seconds
  end: number;
  x: number; // 0..1
  y: number; // 0..1
  size: number; // fraction of frame height
  color: string; // #rrggbb
  align?: number; // ASS \an alignment (numpad), default 5
}

function assTime(s: number): string {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = Math.floor(t % 60);
  const cs = Math.round((t % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** #rrggbb → ASS &H00BBGGRR */
export function assColor(hex: string): string {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex ?? "");
  if (!m) return "&H00FFFFFF";
  return `&H00${m[3]}${m[2]}${m[1]}`.toUpperCase();
}

function escAssText(s: string): string {
  return s
    .replace(/[{}]/g, "")
    .replace(/\r?\n/g, "\\N")
    .slice(0, 400);
}

/**
 * Wrap a long title into max 2 lines of `maxChars` wide, joined with ASS \N.
 */
export function wrapTitle(s: string, maxChars = 26): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return escAssText(clean);
  const words = clean.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === 2) break;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line && lines.length < 3) lines.push(line);
  return escAssText(lines.slice(0, 3).join("\n"));
}

export function buildAss(
  overlays: AssOverlay[],
  W: number,
  H: number,
  opts: { fade?: boolean } = {}
): string {
  const fade = opts.fade ?? true;
  const events = overlays
    .filter((o) => o.end - o.start > 0.05 && o.text.trim())
    .map((o) => {
      const fsPx = Math.max(12, Math.round(o.size * H));
      const px = Math.round(o.x * W);
      const py = Math.round(o.y * H);
      const ov = `{\\an${o.align ?? 5}\\pos(${px},${py})\\fs${fsPx}\\c${assColor(o.color)}${fade ? "\\fad(220,220)" : ""}}`;
      return `Dialogue: 0,${assTime(o.start)},${assTime(o.end)},OVL,,0,0,0,,${ov}${escAssText(o.text)}`;
    })
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: OVL,DejaVu Sans,64,&H00FFFFFF,&H000000FF,&H96000000,&H50000000,-1,0,0,0,100,100,0.8,0,1,2.6,1.6,5,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;
}

/** Escape a filesystem path for use inside an ffmpeg filter argument. */
export function escFilterPath(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
