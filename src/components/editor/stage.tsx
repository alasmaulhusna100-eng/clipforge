"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, MonitorPlay } from "lucide-react";
import { TimelineData, locateAt, clipLen, timelineDuration, filterDef, TextOverlay } from "@/lib/timeline";
import { mediaUrl, fmtTime } from "@/lib/client";

export function Stage({
  timeline,
  time,
  playing,
  onTick,
  onSetTime,
  onPlayingChange,
  selectedOverlay,
  onSelectOverlay,
  onMoveOverlay,
}: {
  timeline: TimelineData;
  time: number;
  playing: boolean;
  onTick: (t: number) => void;
  onSetTime: (t: number) => void;
  onPlayingChange: (p: boolean) => void;
  selectedOverlay: string | null;
  onSelectOverlay: (id: string | null) => void;
  onMoveOverlay: (id: string, x: number, y: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageH, setStageH] = useState(360);
  const currentSrcRef = useRef<string>("");
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const total = timelineDuration(timeline);
  const loc = total > 0 ? locateAt(timeline, Math.min(time, Math.max(0, total - 0.001))) : null;
  const activeClip = loc ? timeline.clips[loc.index] : null;
  const clipStart = loc
    ? timeline.clips.slice(0, loc.index).reduce((s, c) => s + clipLen(c), 0)
    : 0;

  // measure stage height for overlay font sizing
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageH(el.clientHeight));
    ro.observe(el);
    setStageH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // ---- media sync ----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!loc || !activeClip) {
      v.removeAttribute("src");
      currentSrcRef.current = "";
      return;
    }
    const url = mediaUrl(activeClip.src);
    if (currentSrcRef.current !== url) {
      currentSrcRef.current = url;
      v.src = url;
      v.currentTime = loc.sourceTime;
    } else if (Math.abs(v.currentTime - loc.sourceTime) > 0.4 && !playing) {
      v.currentTime = loc.sourceTime;
    }
    v.volume = Math.min(1, Math.max(0, activeClip.volume ?? 1));
    if (playing && v.paused) void v.play().catch(() => {});
    if (!playing && !v.paused) v.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, playing, loc?.index, activeClip?.uid]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !playing || !loc || !activeClip) return;
    const sourceTime = v.currentTime;
    const global = clipStart + (sourceTime - activeClip.in);
    if (sourceTime >= activeClip.out - 0.04) {
      // advance to next clip
      const nextStart = clipStart + clipLen(activeClip);
      if (nextStart >= total - 0.01) {
        onPlayingChange(false);
        onSetTime(total);
      } else {
        onSetTime(nextStart + 0.001);
      }
    } else {
      onTick(global);
    }
  };

  const activeOverlays = timeline.overlays.filter((o) => time >= o.start && time <= o.end);

  const beginDrag = (e: React.PointerEvent, o: TextOverlay) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectOverlay(o.id);
    const rect = stageRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: o.id,
      dx: (e.clientX - rect.left) / rect.width - o.x,
      dy: (e.clientY - rect.top) / rect.height - o.y,
    };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const r = stageRef.current!.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width - d.dx));
      const y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height - d.dy));
      onMoveOverlay(d.id, x, y);
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={stageRef}
        className="relative flex-1 select-none overflow-hidden rounded-2xl border border-white/10 bg-black"
        onClick={() => onSelectOverlay(null)}
      >
        {total === 0 ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <MonitorPlay className="mx-auto h-12 w-12 text-zinc-700" />
              <p className="mt-3 text-sm font-semibold text-zinc-400">Timeline is empty</p>
              <p className="font-bn mt-1 text-xs text-zinc-600">মিডিয়া বিন থেকে ক্লিপ যোগ করুন</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ filter: activeClip ? filterDef(activeClip.filter).css : undefined }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                if (loc && activeClip) {
                  const nextStart = clipStart + clipLen(activeClip);
                  if (nextStart >= total - 0.01) {
                    onPlayingChange(false);
                    onSetTime(total);
                  } else onSetTime(nextStart + 0.001);
                }
              }}
              playsInline
            />
            {/* text overlays */}
            {activeOverlays.map((o) => (
              <div
                key={o.id}
                onPointerDown={(e) => beginDrag(e, o)}
                className={`absolute cursor-move whitespace-pre-wrap rounded px-2 py-1 font-bold leading-tight ${
                  selectedOverlay === o.id ? "ring-2 ring-cyan-300" : "ring-1 ring-transparent hover:ring-white/30"
                }`}
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  transform: "translate(-50%,-50%)",
                  fontSize: Math.max(10, o.size * stageH),
                  color: o.color,
                  textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
                }}
              >
                {o.text || "Text"}
              </div>
            ))}
            {/* fade indicator */}
            {timeline.fadeIn && time < 0.6 && (
              <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 1 - time / 0.6 }} />
            )}
            {timeline.fadeOut && total - time < 0.6 && total > 1 && (
              <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: Math.max(0, 1 - (total - time) / 0.6) }} />
            )}
          </>
        )}
      </div>

      {/* transport */}
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSetTime(0)}
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPlayingChange(!playing)}
            disabled={total === 0}
            className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 text-white btn-glow transition hover:scale-105 disabled:opacity-40"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
        </div>
        <div className="font-display text-sm font-bold tabular-nums text-zinc-200">
          {fmtTime(time)} <span className="text-zinc-600">/</span> {fmtTime(total)}
        </div>
      </div>
    </div>
  );
}
