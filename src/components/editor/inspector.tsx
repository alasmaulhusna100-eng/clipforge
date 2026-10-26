"use client";

import { Type, Palette, Volume2, Copy, Trash2, Check } from "lucide-react";
import { FILTERS, filterDef, type EditClip, type TextOverlay } from "@/lib/timeline";
import { fmtTime, cn } from "@/lib/client";

const TEXT_COLORS = ["#ffffff", "#ffe066", "#7c5cff", "#2ee6d6", "#ff3d81", "#0f0f16"];

export function ClipInspector({
  clip,
  onChange,
  onDelete,
  onDuplicate,
}: {
  clip: EditClip;
  onChange: (c: EditClip) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Clip</p>
      <h3 className="truncate font-display text-sm font-bold text-zinc-100">{clip.name}</h3>
      <p className="mt-1 text-[11px] text-zinc-500">
        Selected {fmtTime(clip.out - clip.in)} of {fmtTime(clip.sourceDuration)}
      </p>

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          <Palette className="h-3 w-3" /> Filter
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {FILTERS.map((f) => {
            const active = clip.filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onChange({ ...clip, filter: f.id })}
                className={cn(
                  "relative overflow-hidden rounded-lg border p-2 text-left transition",
                  active ? "border-violet-400/70 bg-violet-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                )}
              >
                <span
                  className="mb-1.5 block h-7 rounded bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300"
                  style={{ filter: f.css === "none" ? undefined : f.css }}
                />
                <span className="flex items-center justify-between text-[10px] font-bold text-zinc-300">
                  {f.label}
                  {active && <Check className="h-3 w-3 text-cyan-300" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          <span className="flex items-center gap-1.5"><Volume2 className="h-3 w-3" /> Volume</span>
          <span className="text-cyan-300">{Math.round((clip.volume ?? 1) * 100)}%</span>
        </p>
        <input
          type="range" min={0} max={2} step={0.05} value={clip.volume ?? 1}
          onChange={(e) => onChange({ ...clip, volume: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Trim</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <label className="rounded-lg border border-white/10 bg-black/20 p-2">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">In</span>
            <span className="text-xs font-bold text-zinc-200">{fmtTime(clip.in)}</span>
          </label>
          <label className="rounded-lg border border-white/10 bg-black/20 p-2">
            <span className="block text-[9px] font-bold uppercase text-zinc-500">Out</span>
            <span className="text-xs font-bold text-zinc-200">{fmtTime(clip.out)}</span>
          </label>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-600">Drag the clip edges on the timeline to trim.</p>
      </div>

      <div className="mt-auto flex gap-2 pt-6">
        <button onClick={onDuplicate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/15">
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        <button onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}

const POS_PRESETS: { label: string; x: number; y: number }[] = [
  { label: "↖", x: 0.08, y: 0.06 }, { label: "↑", x: 0.5, y: 0.06 }, { label: "↗", x: 0.92, y: 0.06 },
  { label: "←", x: 0.08, y: 0.5 }, { label: "●", x: 0.5, y: 0.5 }, { label: "→", x: 0.92, y: 0.5 },
  { label: "↙", x: 0.08, y: 0.88 }, { label: "↓", x: 0.5, y: 0.88 }, { label: "↘", x: 0.92, y: 0.88 },
];

export function OverlayInspector({
  overlay,
  totalDuration,
  onChange,
  onDelete,
}: {
  overlay: TextOverlay;
  totalDuration: number;
  onChange: (o: TextOverlay) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
        <Type className="h-3 w-3" /> Text overlay
      </p>
      <textarea
        value={overlay.text}
        onChange={(e) => onChange({ ...overlay, text: e.target.value })}
        rows={3}
        maxLength={140}
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm font-semibold text-white outline-none focus:border-violet-400/60"
        placeholder="Your text…"
      />

      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Color</p>
      <div className="flex gap-2">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange({ ...overlay, color: c })}
            className={cn(
              "h-7 w-7 rounded-full ring-2 transition",
              overlay.color === c ? "ring-cyan-300 scale-110" : "ring-white/15 hover:scale-105"
            )}
            style={{ background: c }}
          />
        ))}
      </div>

      <p className="mb-2 mt-4 flex justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
        <span>Size</span><span className="text-cyan-300">{Math.round(overlay.size * 100)}%</span>
      </p>
      <input type="range" min={0.02} max={0.3} step={0.005} value={overlay.size}
        onChange={(e) => onChange({ ...overlay, size: Number(e.target.value) })} className="w-full" />

      <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Position</p>
      <div className="grid w-fit grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-2">
        {POS_PRESETS.map((p) => (
          <button key={p.label}
            onClick={() => onChange({ ...overlay, x: p.x, y: p.y })}
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-xs text-zinc-300 transition hover:bg-violet-500/30">
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-600">You can also drag the text directly on the preview.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="rounded-lg border border-white/10 bg-black/20 p-2">
          <span className="block text-[9px] font-bold uppercase text-zinc-500">Start (s)</span>
          <input type="number" min={0} max={totalDuration} step={0.1} value={Number(overlay.start.toFixed(1))}
            onChange={(e) => onChange({ ...overlay, start: Math.max(0, Math.min(Number(e.target.value), overlay.end - 0.2)) })}
            className="w-full bg-transparent text-xs font-bold text-zinc-200 outline-none" />
        </label>
        <label className="rounded-lg border border-white/10 bg-black/20 p-2">
          <span className="block text-[9px] font-bold uppercase text-zinc-500">End (s)</span>
          <input type="number" min={0.2} max={totalDuration} step={0.1} value={Number(overlay.end.toFixed(1))}
            onChange={(e) => onChange({ ...overlay, end: Math.min(totalDuration, Math.max(Number(e.target.value), overlay.start + 0.2)) })}
            className="w-full bg-transparent text-xs font-bold text-zinc-200 outline-none" />
        </label>
      </div>

      <button onClick={onDelete}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25">
        <Trash2 className="h-3.5 w-3.5" /> Delete text
      </button>
    </div>
  );
}

export function ProjectInspector({
  name, onName, fadeIn, fadeOut, onFades, totalDuration, filterNote,
}: {
  name: string;
  onName: (n: string) => void;
  fadeIn: boolean;
  fadeOut: boolean;
  onFades: (fi: boolean, fo: boolean) => void;
  totalDuration: number;
  filterNote?: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Project</p>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-display text-sm font-bold text-white outline-none focus:border-violet-400/60"
      />
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-zinc-400">
        Timeline length: <span className="font-bold text-zinc-200">{fmtTime(totalDuration)}</span>
        {filterNote && <p className="mt-1">{filterNote}</p>}
      </div>
      <div className="mt-4 space-y-2">
        {[
          { label: "Fade in from black", v: fadeIn },
          { label: "Fade out to black", v: fadeOut },
        ].map((f, i) => (
          <button key={f.label}
            onClick={() => (i === 0 ? onFades(!fadeIn, fadeOut) : onFades(fadeIn, !fadeOut))}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-white/25">
            {f.label}
            <span className={cn("h-4 w-7 rounded-full p-0.5 transition", f.v ? "bg-violet-500" : "bg-white/15")}>
              <span className={cn("block h-3 w-3 rounded-full bg-white transition-transform", f.v && "translate-x-3")} />
            </span>
          </button>
        ))}
      </div>
      <p className="mt-auto pt-6 text-[10px] leading-relaxed text-zinc-600">
        Shortcuts: <b className="text-zinc-400">Space</b> play/pause · <b className="text-zinc-400">S</b> split at playhead · <b className="text-zinc-400">Del</b> remove selection
      </p>
    </div>
  );
}
