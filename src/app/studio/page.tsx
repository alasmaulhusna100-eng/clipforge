"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clapperboard, Scissors, Plus, Trash2, Clock3, Layers, Film, Sparkles,
  FolderOpen, ArrowRight, Download,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Thumb, StatusBadge, PlayerModal } from "@/components/shared";
import { cn, mediaUrl, downloadUrl, fmtTime, type ApiAsset } from "@/lib/client";

interface Project {
  id: string;
  name: string;
  kind: string;
  status: string;
  durationSeconds: number | null;
  clipCount: number | null;
  segmentSeconds: number | null;
  quality: string | null;
  updatedAt: string;
}

export default function StudioPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [media, setMedia] = useState<ApiAsset[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState<{ src: string; title: string; poster?: string } | null>(null);
  const [tab, setTab] = useState<"projects" | "media">("projects");

  const load = useCallback(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
    fetch("/api/assets?kind=video", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setMedia((d.assets ?? []).filter((a: ApiAsset) => a.origin === "upload" || a.origin === "render" || a.origin === "ai"))
      )
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const createProject = async () => {
    const d = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Untitled project", kind: "edit" }),
    }).then((r) => r.json());
    if (d.project?.id) router.push(`/editor/${d.project.id}`);
  };

  const removeProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-violet-300">
              <Layers className="h-3.5 w-3.5" /> Studio
            </p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Your projects <span className="font-bn text-xl font-medium text-zinc-500">আপনার প্রজেক্ট</span>
            </h1>
          </div>
          <button
            onClick={() => setNaming(true)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white btn-glow transition hover:scale-[1.03]"
          >
            <Plus className="h-4 w-4" /> New edit project
          </button>
        </div>

        {naming && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass mb-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="Project name — e.g. Travel vlog episode 3"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400/60"
            />
            <div className="flex gap-2">
              <button onClick={createProject}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500">
                Open editor <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setNaming(false)}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/15">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:w-fit">
          {(
            [
              { id: "projects", label: "Projects", icon: FolderOpen, count: projects.length },
              { id: "media", label: "Media library", icon: Film, count: media.length },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none",
                  tab === t.id ? "bg-violet-600/80 text-white" : "text-zinc-400 hover:text-zinc-200"
                )}>
                <Icon className="h-4 w-4" />
                {t.label}
                <span className="rounded-full bg-black/30 px-1.5 text-[10px]">{t.count}</span>
              </button>
            );
          })}
        </div>

        {tab === "projects" ? (
          projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              bn="কোনো প্রজেক্ট নেই এখনো"
              hint="Create an edit project, split a long video, or generate something with AI."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.6) }}
                  className="group relative">
                  <Link
                    href={p.kind === "split" ? "/splitter" : `/editor/${p.id}`}
                    className="glass block h-full rounded-3xl p-5 transition-all hover:-translate-y-1 hover:border-violet-400/40"
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl",
                        p.kind === "split" ? "bg-cyan-500/15 text-cyan-300" : "bg-violet-500/15 text-violet-300"
                      )}>
                        {p.kind === "split" ? <Scissors className="h-5 w-5" /> : <Clapperboard className="h-5 w-5" />}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <h3 className="mt-4 truncate font-display text-base font-bold text-white">{p.name}</h3>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{fmtTime(p.durationSeconds)}</span>
                      {p.kind === "split" ? (
                        <span className="flex items-center gap-1"><Scissors className="h-3 w-3" />{p.clipCount ?? 0} clips × {p.segmentSeconds ?? "?"}s</span>
                      ) : (
                        <span className="uppercase">{p.quality ?? "1080p"}</span>
                      )}
                    </div>
                    <p className="mt-3 text-[10px] text-zinc-600">
                      Updated {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </Link>
                  <button
                    onClick={() => removeProject(p.id)}
                    className="absolute right-3 top-3 hidden rounded-lg bg-black/50 p-1.5 text-zinc-500 transition hover:text-rose-300 group-hover:block"
                    title="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )
        ) : media.length === 0 ? (
          <EmptyState
            title="Media library is empty"
            bn="মিডিয়া লাইব্রেরি খালি"
            hint="Upload a video in the Smart Splitter, or generate media in the AI Studio."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {media.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.6) }}
                className="glass group overflow-hidden rounded-2xl">
                <button className="relative block w-full"
                  onClick={() => setPlaying({ src: mediaUrl(a.path), title: a.name, poster: mediaUrl(a.thumbPath) })}>
                  <Thumb asset={a} className="aspect-video w-full">
                    <span className={cn(
                      "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      a.origin === "ai" ? "bg-fuchsia-600/80" : a.origin === "render" ? "bg-cyan-600/80" : "bg-black/70"
                    )}>
                      {a.origin === "ai" ? <span className="flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />AI</span> : a.origin}
                    </span>
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {fmtTime(a.durationSeconds)}
                    </span>
                  </Thumb>
                </button>
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="truncate text-xs font-semibold text-zinc-300">{a.name}</p>
                  <a href={downloadUrl(a.path, `${a.name}.mp4`)}
                    className="shrink-0 rounded-lg bg-white/10 p-1.5 text-zinc-300 transition hover:bg-violet-500/30">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <PlayerModal open={Boolean(playing)} src={playing?.src ?? ""} poster={playing?.poster} title={playing?.title} onClose={() => setPlaying(null)} />
    </>
  );
}

function EmptyState({ title, bn, hint }: { title: string; bn: string; hint: string }) {
  return (
    <div className="grid h-[380px] place-items-center rounded-3xl border-2 border-dashed border-white/10 text-center">
      <div className="max-w-sm px-6">
        <Clapperboard className="mx-auto h-10 w-10 text-zinc-700" />
        <p className="mt-4 font-display text-lg font-bold text-zinc-300">{title}</p>
        <p className="font-bn mt-1 text-xs text-zinc-600">{bn}</p>
        <p className="mt-3 text-sm text-zinc-500">{hint}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/splitter" className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-white/15">
            Open splitter
          </Link>
          <Link href="/ai-studio" className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-white/15">
            Open AI studio
          </Link>
        </div>
      </div>
    </div>
  );
}
