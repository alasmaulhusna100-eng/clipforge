"use client";

import { useEffect, useState } from "react";
import { Plus, Film, Sparkles, RefreshCw, UploadCloud } from "lucide-react";
import { Thumb, Dropzone, useUpload } from "@/components/shared";
import { cn, mediaUrl, fmtTime, type ApiAsset } from "@/lib/client";

export function MediaBin({
  onAdd,
  refreshKey,
}: {
  onAdd: (a: ApiAsset) => void;
  refreshKey?: number;
}) {
  const [items, setItems] = useState<ApiAsset[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const upload = useUpload(() => {
    load();
    setShowDrop(false);
  });

  const load = () => {
    fetch("/api/assets?kind=video", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.assets ?? []))
      .catch(() => {});
  };

  useEffect(load, [refreshKey]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          <Film className="h-3.5 w-3.5" /> Media bin
        </p>
        <div className="flex gap-1">
          <button onClick={load} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowDrop((v) => !v)}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
            title="Upload"
          >
            <UploadCloud className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showDrop && (
        <div className="border-b border-white/10 p-3">
          <Dropzone compact onFile={upload.start} uploading={upload.uploading} progress={upload.progress} />
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[11px] leading-relaxed text-zinc-500">
            No media yet. Upload here, generate in AI Studio, or split a video — everything lands in this bin.
          </p>
        )}
        {items.map((a) => (
          <div key={a.id} className="group flex gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2 transition hover:border-violet-400/40 hover:bg-white/[0.05]">
            <Thumb asset={a} className="h-12 w-20 shrink-0 rounded-lg">
              {a.origin === "ai" && (
                <span className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded bg-fuchsia-600/90">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </Thumb>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-200">{a.name}</p>
              <p className="text-[10px] text-zinc-500">
                {fmtTime(a.durationSeconds)} · {a.width}×{a.height}
              </p>
            </div>
            <button
              onClick={() => onAdd(a)}
              className={cn(
                "grid h-7 w-7 shrink-0 self-center place-items-center rounded-lg",
                "bg-violet-500/20 text-violet-200 opacity-0 transition group-hover:opacity-100 hover:bg-violet-500/40"
              )}
              title="Add to timeline"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-2 text-center text-[10px] text-zinc-600">
        Hover an item &amp; press + to append it to the timeline
      </div>
    </div>
  );
}

export { mediaUrl };
