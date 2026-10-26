"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Rocket, CheckCircle2, Download, X, Loader2, Save, AlertTriangle,
} from "lucide-react";
import {
  TimelineData, EditClip, TextOverlay, clipLen, timelineDuration, locateAt,
} from "@/lib/timeline";
import { cn, mediaUrl, downloadUrl, fmtTime, type ApiAsset } from "@/lib/client";
import { MediaBin } from "@/components/editor/media-bin";
import { Stage } from "@/components/editor/stage";
import { TimelinePanel } from "@/components/editor/timeline-panel";
import { ClipInspector, OverlayInspector, ProjectInspector } from "@/components/editor/inspector";
import { QualityPicker, useJob } from "@/components/shared";

const EMPTY: TimelineData = { clips: [], overlays: [], fadeIn: false, fadeOut: false };

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [projectName, setProjectName] = useState("Untitled project");
  const [timeline, setTimeline] = useState<TimelineData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selClip, setSelClip] = useState<string | null>(null);
  const [selOverlay, setSelOverlay] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportQuality, setExportQuality] = useState("1080p");
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useJob(jobId);
  const [renderResult, setRenderResult] = useState<{ path: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;

  /* ------- load ------- */
  useEffect(() => {
    fetch(`/api/projects/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setProjectName(d.project.name);
        const tl = d.project.timeline as TimelineData | null;
        if (tl && Array.isArray(tl.clips)) {
          setTimeline({
            clips: tl.clips ?? [],
            overlays: tl.overlays ?? [],
            fadeIn: tl.fadeIn ?? false,
            fadeOut: tl.fadeOut ?? false,
          });
        }
        setLoaded(true);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  /* ------- autosave ------- */
  const persist = useCallback(
    (t: TimelineData, name?: string) => {
      if (!loaded) return;
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeline: t, ...(name !== undefined ? { name } : {}) }),
        })
          .then(() => setSaveState("saved"))
          .catch(() => setSaveState("idle"));
      }, 900);
    },
    [id, loaded]
  );

  const updateTimeline = useCallback(
    (t: TimelineData) => {
      setTimeline(t);
      persist(t);
    },
    [persist]
  );

  const total = timelineDuration(timeline);

  /* ------- operations ------- */
  const addClip = (a: ApiAsset) => {
    const dur = a.durationSeconds ?? 5;
    const clip: EditClip = {
      uid: crypto.randomUUID(),
      assetId: a.id,
      src: a.path,
      name: a.name,
      sourceDuration: dur,
      in: 0,
      out: dur,
      filter: "none",
      volume: 1,
    };
    updateTimeline({ ...timelineRef.current, clips: [...timelineRef.current.clips, clip] });
    setSelClip(clip.uid);
    setSelOverlay(null);
  };

  const updateClip = (c: EditClip) =>
    updateTimeline({ ...timeline, clips: timeline.clips.map((x) => (x.uid === c.uid ? c : x)) });

  const deleteClip = (uid: string) =>
    updateTimeline({ ...timeline, clips: timeline.clips.filter((x) => x.uid !== uid) });

  const duplicateClip = (uid: string) => {
    const c = timeline.clips.find((x) => x.uid === uid);
    if (!c) return;
    const copy = { ...c, uid: crypto.randomUUID() };
    const clips = [...timeline.clips];
    clips.splice(timeline.clips.indexOf(c) + 1, 0, copy);
    updateTimeline({ ...timeline, clips });
    setSelClip(copy.uid);
  };

  const splitAtPlayhead = () => {
    const t = timelineRef.current;
    const tt = Math.min(time, timelineDuration(t));
    const loc = locateAt(t, tt);
    if (!loc) return;
    const c = t.clips[loc.index];
    const local = tt - t.clips.slice(0, loc.index).reduce((s, x) => s + clipLen(x), 0);
    const cut = c.in + local;
    if (cut - c.in < 0.2 || c.out - cut < 0.2) return;
    const a: EditClip = { ...c, out: Math.round(cut * 100) / 100 };
    const b: EditClip = { ...c, uid: crypto.randomUUID(), in: Math.round(cut * 100) / 100 };
    const clips = [...t.clips];
    clips.splice(loc.index, 1, a, b);
    updateTimeline({ ...t, clips });
    setSelClip(b.uid);
  };

  const addText = () => {
    const tt = Math.min(time, Math.max(0, total - 0.5));
    const o: TextOverlay = {
      id: crypto.randomUUID(),
      text: "Your text here",
      start: Math.round(tt * 100) / 100,
      end: Math.round(Math.min(total, tt + 3) * 100) / 100,
      x: 0.5,
      y: 0.82,
      size: 0.08,
      color: "#ffffff",
    };
    updateTimeline({ ...timeline, overlays: [...timeline.overlays, o] });
    setSelOverlay(o.id);
    setSelClip(null);
  };

  const updateOverlay = (o: TextOverlay) =>
    updateTimeline({ ...timeline, overlays: timeline.overlays.map((x) => (x.id === o.id ? o : x)) });

  /* ------- keyboard ------- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => timelineRef.current.clips.length > 0 && !p);
      } else if (e.key.toLowerCase() === "s") {
        splitAtPlayhead();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selClip) {
          deleteClip(selClip);
          setSelClip(null);
        } else if (selOverlay) {
          updateTimeline({ ...timelineRef.current, overlays: timelineRef.current.overlays.filter((o) => o.id !== selOverlay) });
          setSelOverlay(null);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selClip, selOverlay, time, timeline]);

  /* ------- export ------- */
  const startExport = async () => {
    setRenderResult(null);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeline: timelineRef.current, status: "processing" }),
    }).catch(() => {});
    const r = await fetch("/api/editor/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, timeline: timelineRef.current, quality: exportQuality }),
    }).then((x) => x.json());
    if (r.jobId) setJobId(r.jobId);
  };

  useEffect(() => {
    if (job?.status === "done") {
      const path = (job.result as { assetId?: string } | null)?.assetId;
      if (path) {
        fetch(`/api/assets?origin=render`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => {
            const a = (d.assets ?? []).find((x: ApiAsset) => x.id === path);
            if (a) setRenderResult({ path: a.path });
          });
      }
    }
  }, [job?.status, job?.result]);

  const selClipObj = timeline.clips.find((c) => c.uid === selClip) ?? null;
  const selOverlayObj = timeline.overlays.find((o) => o.id === selOverlay) ?? null;

  if (notFound) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-zinc-700" />
          <p className="mt-4 font-display text-lg font-bold">Project not found</p>
          <Link href="/studio" className="mt-4 inline-block rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white">
            Back to studio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0b0a14] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/studio" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              persist(timelineRef.current, e.target.value);
            }}
            className="w-40 truncate rounded-lg bg-transparent px-2 py-1 font-display text-sm font-bold text-zinc-100 outline-none transition hover:bg-white/5 focus:bg-white/5 sm:w-64"
          />
          <span className={cn(
            "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold sm:flex",
            saveState === "saved" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-zinc-500"
          )}>
            {saveState === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Auto-save on"}
          </span>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          disabled={total === 0}
          className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white btn-glow transition hover:scale-[1.04] disabled:opacity-40 sm:px-5 sm:text-sm"
        >
          <Rocket className="h-4 w-4" /> Export
        </button>
      </header>

      {/* workspace */}
      <div className="flex min-h-0 flex-1">
        {/* media bin */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-[#0e0d17] md:block">
          <MediaBin onAdd={addClip} />
        </aside>

        {/* center */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            {loaded ? (
              <Stage
                timeline={timeline}
                time={time}
                playing={playing}
                onTick={setTime}
                onSetTime={(t) => setTime(t)}
                onPlayingChange={setPlaying}
                selectedOverlay={selOverlay}
                onSelectOverlay={(v) => {
                  setSelOverlay(v);
                  if (v) setSelClip(null);
                }}
                onMoveOverlay={(oid, x, y) =>
                  updateTimeline({
                    ...timelineRef.current,
                    overlays: timelineRef.current.overlays.map((o) => (o.id === oid ? { ...o, x, y } : o)),
                  })
                }
              />
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-white/10 bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              </div>
            )}
          </div>

          {/* timeline */}
          <div className="h-56 shrink-0">
            <TimelinePanel
              timeline={timeline}
              time={time}
              selectedClip={selClip}
              selectedOverlay={selOverlay}
              onSelectClip={(v) => {
                setSelClip(v);
                if (v) setSelOverlay(null);
              }}
              onSelectOverlay={setSelOverlay}
              onSeek={(t) => setTime(t)}
              onChange={updateTimeline}
              onSplit={splitAtPlayhead}
              onAddText={addText}
            />
          </div>
        </div>

        {/* inspector */}
        <aside className="hidden w-72 shrink-0 border-l border-white/[0.07] bg-[#0e0d17] lg:block">
          {selClipObj ? (
            <ClipInspector
              clip={selClipObj}
              onChange={updateClip}
              onDelete={() => {
                deleteClip(selClipObj.uid);
                setSelClip(null);
              }}
              onDuplicate={() => duplicateClip(selClipObj.uid)}
            />
          ) : selOverlayObj ? (
            <OverlayInspector
              overlay={selOverlayObj}
              totalDuration={total}
              onChange={updateOverlay}
              onDelete={() => {
                updateTimeline({ ...timeline, overlays: timeline.overlays.filter((o) => o.id !== selOverlayObj.id) });
                setSelOverlay(null);
              }}
            />
          ) : (
            <ProjectInspector
              name={projectName}
              onName={(n) => {
                setProjectName(n);
                persist(timelineRef.current, n);
              }}
              fadeIn={timeline.fadeIn}
              fadeOut={timeline.fadeOut}
              onFades={(fi, fo) => updateTimeline({ ...timeline, fadeIn: fi, fadeOut: fo })}
              totalDuration={total}
            />
          )}
        </aside>
      </div>

      {/* mobile media bin hint */}
      <div className="border-t border-white/[0.07] p-2 text-center text-[10px] text-zinc-600 md:hidden">
        Media bin & inspector are available on larger screens — timeline and preview work everywhere.
      </div>

      {/* export modal */}
      <AnimatePresence>
        {exportOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => !job && setExportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="glass w-full max-w-lg rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display flex items-center gap-2 text-lg font-bold">
                  <Rocket className="h-5 w-5 text-violet-300" /> Export video
                </h3>
                {!job && (
                  <button onClick={() => setExportOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!job && !renderResult && (
                <>
                  <p className="mb-3 text-xs text-zinc-400">
                    {fmtTime(total)} · {timeline.clips.length} clips · {timeline.overlays.length} text overlays
                  </p>
                  <QualityPicker value={exportQuality} onChange={setExportQuality} includeSource={false} />
                  <button
                    onClick={startExport}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 py-3.5 text-sm font-bold text-white btn-glow transition hover:scale-[1.02]"
                  >
                    <Rocket className="h-4 w-4" /> Render {exportQuality}
                  </button>
                </>
              )}

              {job && !renderResult && (
                <div className="py-6 text-center">
                  {job.status === "failed" ? (
                    <>
                      <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
                      <p className="mt-3 text-sm font-bold text-rose-300">Render failed</p>
                      <p className="mx-auto mt-1 max-w-sm break-words text-xs text-zinc-500">{job.error}</p>
                      <button onClick={() => { setJobId(null); setExportOpen(false); }}
                        className="mt-5 rounded-xl bg-white/10 px-5 py-2 text-xs font-bold text-zinc-200">
                        Close
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative mx-auto h-24 w-24">
                        <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl" />
                        <Loader2 className="relative mx-auto mt-5 h-12 w-12 animate-spin text-violet-300" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-zinc-200">Rendering {exportQuality}…</p>
                      <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300"
                          animate={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs tabular-nums text-zinc-500">{job.progress}%</p>
                    </>
                  )}
                </div>
              )}

              {renderResult && (
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Export complete
                  </p>
                  <video src={mediaUrl(renderResult.path)} controls playsInline className="w-full rounded-xl bg-black ring-1 ring-white/10" />
                  <div className="mt-4 flex gap-2">
                    <a
                      href={downloadUrl(renderResult.path, `${projectName.slice(0, 50) || "render"}-${exportQuality}.mp4`)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 py-3 text-sm font-bold text-white"
                    >
                      <Download className="h-4 w-4" /> Download MP4
                    </a>
                    <button
                      onClick={() => { setExportOpen(false); setJobId(null); setRenderResult(null); }}
                      className="rounded-xl bg-white/10 px-4 text-xs font-bold text-zinc-300"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
