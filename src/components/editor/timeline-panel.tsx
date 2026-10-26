"use client";

import { useRef, useState } from "react";
import { Scissors, Type, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { TimelineData, clipLen, timelineDuration, filterDef, type EditClip, type TextOverlay } from "@/lib/timeline";
import { cn, fmtTime } from "@/lib/client";

const HANDLE_W = 10;

export function TimelinePanel({
  timeline,
  time,
  selectedClip,
  selectedOverlay,
  onSelectClip,
  onSelectOverlay,
  onSeek,
  onChange,
  onSplit,
  onAddText,
}: {
  timeline: TimelineData;
  time: number;
  selectedClip: string | null;
  selectedOverlay: string | null;
  onSelectClip: (uid: string | null) => void;
  onSelectOverlay: (id: string | null) => void;
  onSeek: (t: number) => void;
  onChange: (t: TimelineData) => void;
  onSplit: () => void;
  onAddText: () => void;
}) {
  const [pxPerSec, setPxPerSec] = useState(18);
  const trackRef = useRef<HTMLDivElement>(null);
  const total = timelineDuration(timeline);
  const trackW = Math.max(total * pxPerSec + 40, 300);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft - 20;
    onSeek(Math.min(total, Math.max(0, x / pxPerSec)));
  };

  const rulerPointer = (e: React.PointerEvent) => {
    e.preventDefault();
    seekFromEvent(e.clientX);
    const move = (ev: PointerEvent) => seekFromEvent(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* -------- trim drag -------- */
  const beginTrim = (e: React.PointerEvent, clip: EditClip, side: "in" | "out") => {
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clip.uid);
    const origIn = clip.in;
    const origOut = clip.out;
    const startX = e.clientX;
    const move = (ev: PointerEvent) => {
      const dSec = (ev.clientX - startX) / pxPerSec;
      const clips = timeline.clips.map((c) => {
        if (c.uid !== clip.uid) return c;
        if (side === "in") {
          const ni = Math.min(c.out - 0.2, Math.max(0, Math.min(c.sourceDuration, origIn + dSec)));
          return { ...c, in: Math.round(ni * 100) / 100 };
        }
        const no = Math.max(c.in + 0.2, Math.min(c.sourceDuration, origOut + dSec));
        return { ...c, out: Math.round(no * 100) / 100 };
      });
      onChange({ ...timeline, clips });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* -------- overlay drag/resize -------- */
  const beginOverlayDrag = (e: React.PointerEvent, o: TextOverlay, mode: "move" | "start" | "end") => {
    e.preventDefault();
    e.stopPropagation();
    onSelectOverlay(o.id);
    const startX = e.clientX;
    const orig = { ...o };
    const move = (ev: PointerEvent) => {
      const dSec = (ev.clientX - startX) / pxPerSec;
      const overlays = timeline.overlays.map((x) => {
        if (x.id !== o.id) return x;
        const len = orig.end - orig.start;
        if (mode === "move") {
          const s = Math.min(Math.max(0, orig.start + dSec), Math.max(0, total - len));
          return { ...x, start: Math.round(s * 100) / 100, end: Math.round((s + len) * 100) / 100 };
        }
        if (mode === "start") {
          return { ...x, start: Math.round(Math.min(Math.max(0, orig.start + dSec), orig.end - 0.3) * 100) / 100 };
        }
        return { ...x, end: Math.round(Math.min(Math.max(orig.start + 0.3, orig.end + dSec), total || 9999) * 100) / 100 };
      });
      onChange({ ...timeline, overlays });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const moveClip = (uid: string, dir: -1 | 1) => {
    const i = timeline.clips.findIndex((c) => c.uid === uid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= timeline.clips.length) return;
    const clips = [...timeline.clips];
    [clips[i], clips[j]] = [clips[j], clips[i]];
    onChange({ ...timeline, clips });
    onSelectClip(uid);
  };

  /* ruler ticks */
  const step = pxPerSec >= 30 ? 1 : pxPerSec >= 12 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= Math.ceil(total) + step; t += step) ticks.push(t);

  let offset = 0;

  return (
    <div className="flex h-full flex-col border-t border-white/10 bg-[#0b0a14]">
      {/* toolbar */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button onClick={onSplit} disabled={total === 0}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-violet-500/30 disabled:opacity-40">
            <Scissors className="h-3.5 w-3.5" /> Split <span className="hidden text-[9px] font-medium text-zinc-500 sm:inline">(S)</span>
          </button>
          <button onClick={onAddText} disabled={total === 0}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-cyan-500/25 disabled:opacity-40">
            <Type className="h-3.5 w-3.5" /> Add text
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPxPerSec((v) => Math.max(4, v / 1.4))} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-[10px] font-bold text-zinc-500">{Math.round(pxPerSec)}px/s</span>
          <button onClick={() => setPxPerSec((v) => Math.min(60, v * 1.4))} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* tracks */}
      <div className="relative flex-1 overflow-x-auto overflow-y-hidden" ref={trackRef}>
        <div className="relative h-full" style={{ width: trackW }}>
          {/* ruler */}
          <div className="relative h-7 cursor-crosshair border-b border-white/[0.07]" onPointerDown={rulerPointer}>
            {ticks.map((t) => (
              <div key={t} className="absolute top-0 h-full" style={{ left: 20 + t * pxPerSec }}>
                <span className="absolute bottom-1 -translate-x-1/2 text-[9px] font-bold tabular-nums text-zinc-600">
                  {fmtTime(t)}
                </span>
                <span className="absolute bottom-0 h-1.5 w-px bg-white/15" />
              </div>
            ))}
          </div>

          {/* video track */}
          <div className="relative mt-1.5 h-16 px-5">
            {timeline.clips.map((c) => {
              const len = clipLen(c);
              const left = 20 + offset * pxPerSec;
              const w = Math.max(24, len * pxPerSec);
              offset += len;
              const sel = selectedClip === c.uid;
              return (
                <div
                  key={c.uid}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(sel ? null : c.uid);
                    onSelectOverlay(null);
                  }}
                  className={cn(
                    "absolute top-0 h-16 cursor-pointer overflow-hidden rounded-lg border transition-colors",
                    sel ? "border-cyan-300 shadow-[0_0_20px_-4px_rgba(46,230,214,0.5)]" : "border-white/15 hover:border-white/40"
                  )}
                  style={{ left, width: w, filter: filterDef(c.filter).css }}
                >
                  <div className="clip-thumb-grid absolute inset-0 bg-gradient-to-br from-violet-700/60 via-[#241d45] to-cyan-700/50" />
                  <span className="absolute left-1 top-1 max-w-[calc(100%-8px)] truncate text-[9px] font-bold text-white/90">
                    {c.name}
                  </span>
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-bold tabular-nums text-white/90">
                    {fmtTime(len)}
                  </span>
                  {(c.volume ?? 1) === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[8px] font-bold text-rose-300">MUTE</span>
                  )}
                  {/* trim handles */}
                  <span
                    onPointerDown={(e) => beginTrim(e, c, "in")}
                    className="absolute left-0 top-0 h-full cursor-ew-resize bg-cyan-300/70 transition hover:bg-cyan-200"
                    style={{ width: HANDLE_W }}
                  />
                  <span
                    onPointerDown={(e) => beginTrim(e, c, "out")}
                    className="absolute right-0 top-0 h-full cursor-ew-resize bg-cyan-300/70 transition hover:bg-cyan-200"
                    style={{ width: HANDLE_W }}
                  />
                  {/* nudge buttons on selected */}
                  {sel && w > 56 && (
                    <>
                      <span
                        onClick={(e) => { e.stopPropagation(); moveClip(c.uid, -1); }}
                        className="absolute left-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded bg-black/70 text-white/90 hover:bg-black"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </span>
                      <span
                        onClick={(e) => { e.stopPropagation(); moveClip(c.uid, 1); }}
                        className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded bg-black/70 text-white/90 hover:bg-black"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </>
                  )}
                </div>
              );
            })}
            {timeline.clips.length === 0 && (
              <div className="flex h-full items-center px-1 text-[11px] text-zinc-600">
                ← Add clips from the media bin to start cutting
              </div>
            )}
          </div>

          {/* text track */}
          <div className="relative mt-1.5 h-9 px-5">
            <span className="absolute -left-0 top-0 pl-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600">Text</span>
            {timeline.overlays.map((o) => {
              const left = 20 + o.start * pxPerSec;
              const w = Math.max(18, (o.end - o.start) * pxPerSec);
              const sel = selectedOverlay === o.id;
              return (
                <div
                  key={o.id}
                  onPointerDown={(e) => beginOverlayDrag(e, o, "move")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOverlay(o.id);
                    onSelectClip(null);
                  }}
                  className={cn(
                    "absolute top-0 flex h-9 cursor-grab items-center overflow-hidden rounded-md border px-1.5 text-[9px] font-bold",
                    sel ? "border-fuchsia-300 bg-fuchsia-500/30 text-white" : "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200"
                  )}
                  style={{ left, width: w }}
                >
                  <span
                    onPointerDown={(e) => beginOverlayDrag(e, o, "start")}
                    className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-fuchsia-300/60"
                  />
                  <span className="pointer-events-none truncate px-1.5">{o.text || "Text"}</span>
                  <span
                    onPointerDown={(e) => beginOverlayDrag(e, o, "end")}
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-fuchsia-300/60"
                  />
                </div>
              );
            })}
          </div>

          {/* playhead */}
          {total > 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10"
              style={{ left: 20 + Math.min(time, total) * pxPerSec }}
            >
              <div className="absolute -left-[5px] top-0 h-2.5 w-[11px] rounded-b-sm bg-cyan-300" />
              <div className="absolute bottom-0 top-2.5 w-px bg-cyan-300 shadow-[0_0_8px_rgba(46,230,214,0.9)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
