"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film, ImageIcon, Loader2, AlertTriangle, UploadCloud, Check } from "lucide-react";
import { cn, mediaUrl, QUALITY_OPTIONS, type ApiAsset, type ApiJob } from "@/lib/client";

/* ------------------------------ Thumbnail ------------------------------ */
export function Thumb({
  asset,
  className,
  children,
}: {
  asset: Pick<ApiAsset, "thumbPath" | "kind" | "name"> & { meta?: Record<string, unknown> | null };
  className?: string;
  children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-[#12101e]", className)}>
      {asset.thumbPath && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(asset.thumbPath)}
          alt={asset.name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(500px_200px_at_30%_20%,rgba(124,92,255,0.25),transparent_60%),radial-gradient(400px_200px_at_80%_80%,rgba(46,230,214,0.18),transparent_60%)]">
          {asset.kind === "image" ? (
            <ImageIcon className="h-8 w-8 text-violet-300/50" />
          ) : (
            <Film className="h-8 w-8 text-violet-300/50" />
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/* ------------------------------ Job polling ------------------------------ */
export function useJob(jobId: string | null) {
  const [job, setJob] = useState<ApiJob | null>(null);
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const d = await r.json();
        if (!stop && d.job) {
          setJob(d.job);
          if (d.job.status === "done" || d.job.status === "failed") return;
        }
      } catch {
        /* retry */
      }
      if (!stop) timer = setTimeout(tick, 900);
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [jobId]);
  return job;
}

/* ------------------------------ Upload ------------------------------ */
export interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  asset: ApiAsset | null;
}

export function useUpload(onDone?: (a: ApiAsset) => void) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    asset: null,
  });
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const start = useCallback(
    (file: File) => {
      setState({ uploading: true, progress: 0, error: null, asset: null });
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", `/api/upload?name=${encodeURIComponent(file.name)}`);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setState((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
        }
      };
      xhr.onload = () => {
        try {
          const d = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && d.asset) {
            setState({ uploading: false, progress: 100, error: null, asset: d.asset });
            onDone?.(d.asset);
          } else {
            setState({ uploading: false, progress: 0, error: d.error || "Upload failed", asset: null });
          }
        } catch {
          setState({ uploading: false, progress: 0, error: "Upload failed", asset: null });
        }
      };
      xhr.onerror = () =>
        setState({ uploading: false, progress: 0, error: "Network error", asset: null });
      xhr.send(file);
    },
    [onDone]
  );

  return { ...state, start };
}

/* ------------------------------ Dropzone ------------------------------ */
export function Dropzone({
  onFile,
  uploading,
  progress,
  compact,
}: {
  onFile: (f: File) => void;
  uploading?: boolean;
  progress?: number;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "group relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all",
        compact ? "p-5" : "p-10",
        over
          ? "border-cyan-300/70 bg-cyan-400/5"
          : "border-white/12 bg-white/[0.02] hover:border-violet-400/50 hover:bg-violet-400/5"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
          <div className="w-full max-w-sm">
            <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-violet-500/15 text-violet-300 transition-transform group-hover:scale-110">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-200">Drop your video here, or browse</p>
            <p className="mt-0.5 text-xs text-zinc-500">MP4 · MOV · MKV · WEBM — any length, 30 min / 50 min / more</p>
          </div>
        </>
      )}
    </button>
  );
}

/* ------------------------------ Quality picker ------------------------------ */
export function QualityPicker({
  value,
  onChange,
  includeSource = true,
}: {
  value: string;
  onChange: (id: string) => void;
  includeSource?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUALITY_OPTIONS.filter((q) => includeSource || q.id !== "source").map((q) => {
        const active = value === q.id;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onChange(q.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              active
                ? "border-violet-400/70 bg-violet-500/15 btn-glow"
                : "border-white/10 bg-white/[0.03] hover:border-white/25"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-bold", active ? "text-violet-200" : "text-zinc-200")}>
                {q.label}
              </span>
              {active && <Check className="h-3.5 w-3.5 text-cyan-300" />}
            </div>
            <div className="text-[11px] font-semibold text-zinc-400">{q.short}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">{q.note}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ Status badge ------------------------------ */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    processing: {
      label: "Processing",
      cls: "text-amber-300 border-amber-400/30 bg-amber-400/10",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    queued: {
      label: "Queued",
      cls: "text-sky-300 border-sky-400/30 bg-sky-400/10",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    done: { label: "Done", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
    failed: {
      label: "Failed",
      cls: "text-rose-300 border-rose-400/30 bg-rose-400/10",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    draft: { label: "Draft", cls: "text-zinc-300 border-white/15 bg-white/5" },
  };
  const c = map[status] ?? map.draft;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", c.cls)}>
      {c.icon}
      {c.label}
    </span>
  );
}

/* ------------------------------ Player modal ------------------------------ */
export function PlayerModal({
  open,
  src,
  poster,
  title,
  onClose,
}: {
  open: boolean;
  src: string;
  poster?: string;
  title?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="truncate text-sm font-semibold text-zinc-200">{title}</p>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <video
              key={src}
              src={src}
              poster={poster}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] w-full rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ------------------------------ Progress ring ------------------------------ */
export function ProgressRing({ pct, size = 84 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#2ee6d6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold text-zinc-100">
        {Math.round(pct)}%
      </span>
    </div>
  );
}
