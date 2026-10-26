"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Image as ImageIcon, Clapperboard, Wand2, Download, Play,
  Loader2, RefreshCw, AlertTriangle, RectangleHorizontal, RectangleVertical, Square,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { QualityPicker, PlayerModal, Thumb, useJob } from "@/components/shared";
import { cn, mediaUrl, downloadUrl, fmtTime, type ApiAsset, type ApiJob } from "@/lib/client";

type AiJobWithAsset = ApiJob & { asset: ApiAsset | null };

const STYLES = [
  {
    id: "cosmic",
    label: "Cosmic Fractals",
    bn: "কসমিক",
    desc: "Infinite mandelbrot zooms, nebula colors",
    cls: "bg-[radial-gradient(circle_at_30%_30%,#7c5cff,transparent_60%),radial-gradient(circle_at_70%_70%,#ff3d81,transparent_55%),#0b0033]",
  },
  {
    id: "flow",
    label: "Neon Flow",
    bn: "নিয়ন",
    desc: "Slow liquid gradients, glassy blur",
    cls: "bg-[linear-gradient(120deg,#2ee6d6,#7c5cff_45%,#ff3d81_80%)]",
  },
  {
    id: "cells",
    label: "Living Cells",
    bn: "সেলুলার",
    desc: "Organic game-of-life structures, ink bloom",
    cls: "bg-[repeating-conic-gradient(#52b788_0_12deg,#081c15_12deg_24deg)]",
  },
] as const;

const ASPECTS = [
  { id: "16:9", label: "16:9", icon: RectangleHorizontal },
  { id: "9:16", label: "9:16", icon: RectangleVertical },
  { id: "1:1", label: "1:1", icon: Square },
] as const;

const IDEAS = [
  "Aurora over a frozen ocean of mirrors",
  "Neon rain in a cyberpunk alley, nostalgic",
  "Golden hour dream nebula, slow and vast",
  "Cellular life blooming under a microscope",
  "Deep space cathedral made of light",
  "Monsoon night in Dhaka, cinematic teal",
];

function AiStudioInner() {
  const sp = useSearchParams();
  const [kind, setKind] = useState<"video" | "image">(sp.get("kind") === "image" ? "image" : "video");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("cosmic");
  const [aspect, setAspect] = useState<string>("16:9");
  const [duration, setDuration] = useState(10);
  const [quality, setQuality] = useState("1080p");
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useJob(jobId);
  const [gallery, setGallery] = useState<AiJobWithAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ src: string; title: string; poster?: string } | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const loadGallery = useCallback(() => {
    fetch("/api/ai/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGallery(d.jobs ?? []))
      .catch(() => {});
  }, []);

  useEffect(loadGallery, [loadGallery]);

  // keep polling gallery while anything is in-flight
  useEffect(() => {
    const anyRunning = gallery.some((j) => j.status === "processing" || j.status === "queued");
    if (!anyRunning) return;
    const t = setTimeout(loadGallery, 1500);
    return () => clearTimeout(t);
  }, [gallery, loadGallery]);

  useEffect(() => {
    if (job?.status === "done") {
      loadGallery();
      setJobId(null);
      setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }
    if (job?.status === "failed") {
      setError(job.error || "Generation failed");
      setJobId(null);
    }
  }, [job?.status, job?.error, loadGallery]);

  const generate = async () => {
    if (prompt.trim().length < 3) {
      setError("Write a prompt of at least 3 characters / কিছু লিখুন");
      return;
    }
    setError(null);
    const r = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, kind, style, duration, quality, aspect }),
    }).then((x) => x.json());
    if (!r.jobId) {
      setError(r.error || "Could not start generation");
      return;
    }
    setJobId(r.jobId);
    // show pending placeholder immediately
    loadGallery();
  };

  const running = Boolean(job && (job.status === "processing" || job.status === "queued"));

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
        <div className="mb-10">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-300">
            <Sparkles className="h-3.5 w-3.5" /> AI Studio
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
            Prompt in. <span className="neon-text">Motion out.</span>
          </h1>
          <p className="font-bn mt-2 text-sm text-zinc-500">
            লিখুন — এআই ভিডিও বা ইমেজ তৈরি করে দেবে, সাথে অ্যাম্বিয়েন্ট সাউন্ডস্কেপ
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* controls */}
          <section className="glass h-fit rounded-3xl p-6 lg:sticky lg:top-24">
            {/* kind tabs */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
              {(
                [
                  { id: "video", label: "AI Video", bn: "ভিডিও", icon: Clapperboard },
                  { id: "image", label: "AI Image", bn: "ইমেজ", icon: ImageIcon },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const active = kind === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setKind(t.id)}
                    className={cn(
                      "relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition",
                      active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="kindPill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-fuchsia-600/80 to-violet-600/80"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4" />
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* prompt */}
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">
              Prompt <span className="font-bn normal-case tracking-normal">প্রম্পট</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={220}
              placeholder="Describe the scene you want to dream up…"
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400/60"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEAS.slice(0, 3).map((idea) => (
                <button
                  key={idea}
                  onClick={() => setPrompt(idea)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-400 transition hover:border-violet-400/40 hover:text-zinc-200"
                >
                  {idea}
                </button>
              ))}
              <button
                onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
                className="flex items-center gap-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-bold text-fuchsia-300"
              >
                <Wand2 className="h-3 w-3" /> Surprise me
              </button>
            </div>

            {/* styles */}
            <label className="mb-2 mt-5 block text-xs font-bold uppercase tracking-widest text-zinc-500">Engine</label>
            <div className="space-y-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition",
                    style === s.id ? "border-violet-400/70 bg-violet-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  )}
                >
                  <span className={cn("h-10 w-14 shrink-0 rounded-lg ring-1 ring-white/20", s.cls)} />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-zinc-100">
                      {s.label} <span className="font-bn text-[10px] font-medium text-zinc-500">{s.bn}</span>
                    </span>
                    <span className="block truncate text-[10px] text-zinc-500">{s.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* aspect + duration */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Aspect</label>
                <div className="flex gap-1.5">
                  {ASPECTS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setAspect(a.id)}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-bold transition",
                          aspect === a.id
                            ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-200"
                            : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {kind === "video" && (
                <div>
                  <label className="mb-2 flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span>Length</span>
                    <span className="text-cyan-300">{duration}s</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="mt-2.5 w-full"
                  />
                </div>
              )}
            </div>

            {/* quality */}
            <label className="mb-2 mt-5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
              Quality <span className="font-bn normal-case tracking-normal">কোয়ালিটি</span>
            </label>
            <QualityPicker value={quality} onChange={setQuality} includeSource={false} />

            <button
              onClick={generate}
              disabled={running}
              className={cn(
                "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all",
                running
                  ? "cursor-wait bg-white/10 text-zinc-400"
                  : "bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 btn-glow hover:scale-[1.02]"
              )}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating… {job?.progress ?? 1}%
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate {kind}
                </>
              )}
            </button>

            {running && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-300"
                  animate={{ width: `${job?.progress ?? 2}%` }}
                />
              </div>
            )}
            {error && (
              <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4" /> {error}
              </p>
            )}
          </section>

          {/* gallery */}
          <section ref={galleryRef} className="scroll-mt-24">
            {running && job && (
              <div className="glass mb-4 flex items-center gap-4 rounded-2xl p-4">
                <span className="shimmer grid h-16 w-24 shrink-0 place-items-center rounded-xl">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-100">{job.label}</p>
                  <p className="text-xs text-zinc-500">
                    {job.type === "ai-video" ? "Dreaming frames & soundscaping…" : "Painting pixels…"} {job.progress}%
                  </p>
                </div>
              </div>
            )}

            {gallery.length === 0 && !running ? (
              <div className="grid h-[420px] place-items-center rounded-3xl border-2 border-dashed border-white/10 text-center">
                <div>
                  <Sparkles className="mx-auto h-10 w-10 text-zinc-700" />
                  <p className="mt-4 text-sm font-semibold text-zinc-400">Your AI gallery is empty</p>
                  <p className="font-bn mt-1 text-xs text-zinc-600">প্রথম জেনারেশনটি তৈরি করুন</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                <AnimatePresence>
                  {gallery.map((j) => {
                    const a = j.asset;
                    const isRunningCard = j.status === "processing" || j.status === "queued";
                    return (
                      <motion.div
                        key={j.id}
                        layout
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass group overflow-hidden rounded-2xl"
                      >
                        {isRunningCard ? (
                          <div className="shimmer flex aspect-video items-center justify-center">
                            <div className="text-center">
                              <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" />
                              <p className="mt-2 text-[10px] font-bold text-zinc-400">{j.progress ?? 1}%</p>
                            </div>
                          </div>
                        ) : a ? (
                          <button
                            className="relative block w-full"
                            onClick={() =>
                              setPlaying(
                                a.kind === "video"
                                  ? { src: mediaUrl(a.path), title: j.label, poster: mediaUrl(a.thumbPath) }
                                  : { src: mediaUrl(a.path), title: j.label }
                              )
                            }
                          >
                            {a.kind === "video" ? (
                              <Thumb asset={a} className="aspect-video w-full">
                                <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur">
                                    <Play className="h-5 w-5 text-white" />
                                  </span>
                                </span>
                                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold">
                                  {fmtTime(a.durationSeconds)}
                                </span>
                              </Thumb>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaUrl(a.path)} alt={j.label} className="aspect-video w-full object-cover" />
                            )}
                          </button>
                        ) : (
                          <div className="flex aspect-video items-center justify-center text-rose-300">
                            <AlertTriangle className="h-6 w-6" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="line-clamp-2 min-h-[2rem] text-xs font-semibold text-zinc-200">“{j.label}”</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              <span className="rounded-md bg-white/5 px-1.5 py-0.5">{j.type === "ai-video" ? "video" : "image"}</span>
                              <span className="rounded-md bg-white/5 px-1.5 py-0.5">{String((j.payload as Record<string, unknown>)?.style ?? "")}</span>
                              <span className="rounded-md bg-white/5 px-1.5 py-0.5">{String((j.payload as Record<string, unknown>)?.qualityId ?? "")}</span>
                            </div>
                            {a && (
                              <a
                                href={downloadUrl(a.path, `clipforge-ai-${j.type === "ai-video" ? "video.mp4" : "image.png"}`)}
                                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-zinc-200 transition hover:bg-violet-500/30"
                              >
                                <Download className="h-3 w-3" /> Save
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {gallery.length > 0 && (
              <button
                onClick={loadGallery}
                className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-200"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh gallery
              </button>
            )}
          </section>
        </div>
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

export default function AiStudioPage() {
  return (
    <Suspense fallback={null}>
      <AiStudioInner />
    </Suspense>
  );
}
