"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors, Film, Play, Download, Clock3, MonitorPlay, ListOrdered, Layers,
  ChevronRight, RefreshCw, FolderOpen, AlertTriangle, CheckCircle2, Clapperboard,
} from "lucide-react";
import { Nav } from "@/components/nav";
import {
  Dropzone, Thumb, useUpload, useJob, QualityPicker, PlayerModal, StatusBadge,
} from "@/components/shared";
import {
  cn, mediaUrl, downloadUrl, fmtTime, fmtBytes, resLabel,
  SEGMENT_PRESETS, type ApiAsset, type ApiClip,
} from "@/lib/client";

interface SplitProject {
  id: string;
  name: string;
  status: string;
  durationSeconds: number | null;
  segmentSeconds: number | null;
  clipCount: number | null;
  quality: string | null;
  createdAt: string;
}

export default function SplitterPage() {
  const [library, setLibrary] = useState<ApiAsset[]>([]);
  const [libOpen, setLibOpen] = useState(false);
  const [asset, setAsset] = useState<ApiAsset | null>(null);
  const [seg, setSeg] = useState(25);
  const [custom, setCustom] = useState("");
  const [quality, setQuality] = useState("source");
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useJob(jobId);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [clips, setClips] = useState<ApiClip[]>([]);
  const [project, setProject] = useState<SplitProject | null>(null);
  const [history, setHistory] = useState<SplitProject[]>([]);
  const [playing, setPlaying] = useState<{ src: string; title: string; poster?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const upload = useUpload((a) => {
    setAsset(a);
    refreshLibrary();
  });

  const refreshLibrary = useCallback(() => {
    fetch("/api/assets?origin=upload&kind=video", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLibrary(d.assets ?? []))
      .catch(() => {});
  }, []);

  const refreshHistory = useCallback(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setHistory((d.projects ?? []).filter((p: SplitProject) => (p as unknown as { kind: string }).kind === "split"))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshLibrary();
    refreshHistory();
  }, [refreshLibrary, refreshHistory]);

  const effSeg = custom.trim() ? Math.max(1, Number(custom) || seg) : seg;
  const duration = asset?.durationSeconds ?? 0;
  const estCount = duration > 0 ? Math.max(1, Math.ceil(duration / effSeg - 1e-6)) : 0;

  const startSplit = async () => {
    if (!asset) return;
    setError(null);
    setClips([]);
    try {
      const cp = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${asset.name} · ${effSeg}s splits`,
          kind: "split",
          sourceAssetId: asset.id,
          durationSeconds: asset.durationSeconds,
        }),
      }).then((r) => r.json());
      const pid = cp.project.id as string;
      setProjectId(pid);
      const sj = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, assetId: asset.id, segmentSeconds: effSeg, quality }),
      }).then((r) => r.json());
      if (!sj.jobId) throw new Error(sj.error || "Could not start split");
      setJobId(sj.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed to start");
    }
  };

  const loadClips = useCallback(async (pid: string) => {
    const d = await fetch(`/api/projects/${pid}`, { cache: "no-store" }).then((r) => r.json());
    setClips(d.clips ?? []);
    setProject(d.project ?? null);
  }, []);

  useEffect(() => {
    if (job?.status === "done" && projectId) {
      void loadClips(projectId);
      refreshHistory();
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    }
    if (job?.status === "failed") setError(job.error || "Split failed");
  }, [job?.status, job?.error, projectId, loadClips, refreshHistory]);

  const openHistory = async (p: SplitProject) => {
    setProjectId(p.id);
    setJobId(null);
    setAsset(null);
    await loadClips(p.id);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  };

  const sendToEditor = async (a: ApiAsset) => {
    const d = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${a.name} — edit`,
        kind: "edit",
        timeline: {
          clips: [{
            uid: crypto.randomUUID(), assetId: a.id, src: a.path, name: a.name,
            sourceDuration: a.durationSeconds ?? 0, in: 0, out: a.durationSeconds ?? 5,
            filter: "none", volume: 1,
          }],
          overlays: [], fadeIn: false, fadeOut: false,
        },
      }),
    }).then((r) => r.json());
    if (d.project?.id) window.location.href = `/editor/${d.project.id}`;
  };

  const running = job && (job.status === "processing" || job.status === "queued");
  const doneCount = (job?.result as { clipCount?: number } | null)?.clipCount;

  const serialPreview = useMemo(() => {
    const n = estCount;
    const arr = Array.from({ length: Math.min(n, 48) }, (_, i) => i + 1);
    return { arr, more: n - arr.length };
  }, [estCount]);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
        {/* header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              <Scissors className="h-3.5 w-3.5" /> Smart Splitter
            </p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Long video → <span className="neon-text">serial shorts</span>
            </h1>
            <p className="font-bn mt-2 text-sm text-zinc-500">
              ৩০–৫০ মিনিটের ভিডিও আপলোড করুন — ১০ সেকেন্ড থেকে ১ মিনিটের সিরিয়াল ক্লিপ পান (১, ২, ৩, ৪…)
            </p>
          </div>
          <button
            onClick={() => setLibOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-cyan-300/40"
          >
            <FolderOpen className="h-4 w-4 text-cyan-300" />
            My uploads ({library.length})
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* left: source + settings */}
          <div className="space-y-6">
            {/* STEP 1 — source */}
            <section className="glass rounded-3xl p-6">
              <StepHeader n={1} title="Source video" bn="ভিডিও আপলোড" />
              {!asset ? (
                <Dropzone onFile={upload.start} uploading={upload.uploading} progress={upload.progress} />
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative w-full shrink-0 overflow-hidden rounded-2xl sm:w-64">
                    <Thumb asset={asset} className="aspect-video w-full">
                      <button
                        onClick={() =>
                          setPlaying({ src: mediaUrl(asset.path), title: asset.name, poster: mediaUrl(asset.thumbPath) })
                        }
                        className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur">
                          <Play className="h-5 w-5 text-white" />
                        </span>
                      </button>
                    </Thumb>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-bold">{asset.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Chip icon={<Clock3 className="h-3 w-3" />}>{fmtTime(asset.durationSeconds)}</Chip>
                      <Chip icon={<MonitorPlay className="h-3 w-3" />}>{resLabel(asset.width, asset.height)}</Chip>
                      <Chip icon={<Film className="h-3 w-3" />}>{fmtBytes(asset.sizeBytes)}</Chip>
                    </div>
                    <button
                      onClick={() => setAsset(null)}
                      className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-rose-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Choose a different video
                    </button>
                  </div>
                </div>
              )}
              {(upload.error || error) && (
                <p className="mt-3 flex items-center gap-2 text-sm text-rose-300">
                  <AlertTriangle className="h-4 w-4" /> {upload.error || error}
                </p>
              )}

              {libOpen && library.length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Or pick from your uploads</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {library.map((a) => (
                      <button key={a.id} onClick={() => { setAsset(a); setLibOpen(false); }} className="group text-left">
                        <Thumb asset={a} className="aspect-video w-full rounded-xl ring-1 ring-white/10 transition group-hover:ring-cyan-300/60" />
                        <p className="mt-1.5 truncate text-xs font-semibold text-zinc-300">{a.name}</p>
                        <p className="text-[10px] text-zinc-500">{fmtTime(a.durationSeconds)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* STEP 2 — clip length */}
            <section className={cn("glass rounded-3xl p-6 transition-opacity", !asset && "pointer-events-none opacity-40")}>
              <StepHeader n={2} title="Clip length" bn="ক্লিপের দৈর্ঘ্য" />
              <div className="flex flex-wrap gap-2">
                {SEGMENT_PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSeg(s); setCustom(""); }}
                    className={cn(
                      "rounded-xl border px-5 py-3 text-sm font-bold transition-all",
                      !custom && seg === s
                        ? "border-violet-400/70 bg-violet-500/15 text-violet-100 btn-glow"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25"
                    )}
                  >
                    {s === 60 ? "1 min" : `${s} sec`}
                  </button>
                ))}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3">
                  <span className="text-xs font-semibold text-zinc-500">Custom</span>
                  <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                    placeholder="sec"
                    className="w-16 bg-transparent py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {asset && duration > 0 && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-400">
                      <ListOrdered className="h-3.5 w-3.5 text-cyan-300" />
                      Output preview
                    </span>
                    <span className="font-display text-sm font-bold text-white">
                      ≈ {estCount} clips <span className="font-bn font-normal text-zinc-500">({estCount}টি ক্লিপ)</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {serialPreview.arr.map((n) => (
                      <motion.span
                        key={n}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: Math.min(n * 0.02, 1) }}
                        className="grid h-7 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-600/50 to-cyan-600/40 text-[10px] font-bold text-white ring-1 ring-white/15"
                      >
                        {n}
                      </motion.span>
                    ))}
                    {serialPreview.more > 0 && (
                      <span className="grid h-7 place-items-center rounded-md bg-white/5 px-2 text-[10px] font-bold text-zinc-400">
                        +{serialPreview.more} more
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                    The original video stays untouched. Every segment is cut in order and numbered
                    <span className="font-bn"> — পুরো ভিডিও সিরিয়াল ধরে খণ্ডিত হবে।</span>
                  </p>
                </div>
              )}
            </section>

            {/* STEP 3 — quality */}
            <section className={cn("glass rounded-3xl p-6 transition-opacity", !asset && "pointer-events-none opacity-40")}>
              <StepHeader n={3} title="Output quality" bn="কোয়ালিটি" />
              <QualityPicker value={quality} onChange={setQuality} />
            </section>
          </div>

          {/* right: action + history */}
          <div className="space-y-6">
            <section className="glass sticky top-24 rounded-3xl p-6">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold">
                <Layers className="h-4.5 w-4.5 h-5 w-5 text-violet-300" /> Ready to split
              </h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <Row label="Source">{asset ? asset.name : "—"}</Row>
                <Row label="Duration">{asset ? fmtTime(asset.durationSeconds) : "—"}</Row>
                <Row label="Clip length">{asset ? `${effSeg}s each` : "—"}</Row>
                <Row label="Estimated clips">
                  <span className="neon-text font-bold">{asset ? estCount : "—"}</span>
                </Row>
                <Row label="Quality">{asset ? quality : "—"}</Row>
              </dl>

              <button
                onClick={startSplit}
                disabled={!asset || Boolean(running)}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all",
                  !asset || running
                    ? "cursor-not-allowed bg-white/10 text-zinc-500"
                    : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 btn-glow hover:scale-[1.02]"
                )}
              >
                {running ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Splitting… {job?.progress ?? 1}%
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    Split into {estCount || "…"} clips
                  </>
                )}
              </button>

              {running && (
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300"
                      animate={{ width: `${job?.progress ?? 2}%` }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Encoding serial clips…</span>
                    {typeof doneCount === "number" && <span>{doneCount} done</span>}
                  </p>
                </div>
              )}

              {job?.status === "done" && clips.length > 0 && (
                <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> {clips.length} serial clips ready below
                </p>
              )}
            </section>

            {history.length > 0 && (
              <section className="glass rounded-3xl p-5">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Recent splits</h4>
                <div className="space-y-1.5">
                  {history.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openHistory(p)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-200">{p.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          {p.clipCount ?? 0} clips · {p.segmentSeconds ?? "?"}s · {p.quality ?? "source"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* results */}
        <AnimatePresence>
          {clips.length > 0 && (
            <motion.section
              ref={resultsRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-14 scroll-mt-24"
            >
              {/* original full video */}
              {project && (
                <div className="glass mb-8 flex flex-col items-start gap-4 rounded-3xl border-cyan-400/20 p-5 sm:flex-row sm:items-center">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                    <Film className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">Full original · পুরো ভিডিও</p>
                    <h2 className="truncate font-display text-lg font-bold">{project.name}</h2>
                    <p className="text-xs text-zinc-500">
                      {fmtTime(project.durationSeconds)} · {project.clipCount} serial parts · {String(project.quality ?? "").toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              )}

              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display flex items-center gap-2 text-xl font-bold">
                  <ListOrdered className="h-5 w-5 text-violet-300" />
                  Serial clips <span className="font-bn text-sm font-normal text-zinc-500">সিরিয়াল অনুযায়ী</span>
                </h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300">
                  {clips.length} files
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {clips.map(({ clip, asset: ca }, i) => (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 1.2) }}
                    className="group glass overflow-hidden rounded-2xl"
                  >
                    <button
                      className="relative block w-full"
                      onClick={() =>
                        ca &&
                        setPlaying({
                          src: mediaUrl(ca.path),
                          title: `Part ${clip.serial}`,
                          poster: mediaUrl(ca.thumbPath),
                        })
                      }
                    >
                      <Thumb asset={ca ?? { thumbPath: null, kind: "video", name: `Part ${clip.serial}` }} className="aspect-video w-full">
                        <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-black text-white shadow-lg ring-1 ring-white/30">
                          {clip.serial}
                        </span>
                        <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur">
                            <Play className="h-5 w-5 text-white" />
                          </span>
                        </span>
                        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {fmtTime(clip.durationSeconds)}
                        </span>
                      </Thumb>
                    </button>
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-zinc-200">Part {clip.serial}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {fmtTime(clip.startSeconds)} → {fmtTime(clip.endSeconds)}
                      </p>
                      <div className="mt-2.5 flex gap-1.5">
                        {ca && (
                          <a
                            href={downloadUrl(ca.path, `${String(project?.name ?? "split").slice(0, 40)}-part-${clip.serial}.mp4`)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/8 bg-white/10 py-1.5 text-[10px] font-bold text-zinc-200 transition hover:bg-violet-500/25"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        )}
                        {ca && (
                          <button
                            onClick={() => sendToEditor(ca)}
                            title="Open in editor"
                            className="grid w-9 place-items-center rounded-lg bg-white/10 text-zinc-300 transition hover:bg-cyan-500/25 hover:text-cyan-200"
                          >
                            <Clapperboard className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <PlayerModal
        open={Boolean(playing)}
        src={playing?.src ?? ""}
        poster={playing?.poster}
        title={playing?.title}
        onClose={() => setPlaying(null)}
      />
    </>
  );
}

function StepHeader({ n, title, bn }: { n: number; title: string; bn: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 text-sm font-black text-white">
        {n}
      </span>
      <h2 className="font-display text-lg font-bold">
        {title} <span className="font-bn ml-1 text-xs font-medium text-zinc-500">{bn}</span>
      </h2>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-zinc-300">
      {icon}
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5 last:border-0">
      <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-xs font-bold text-zinc-200">{children}</dd>
    </div>
  );
}
