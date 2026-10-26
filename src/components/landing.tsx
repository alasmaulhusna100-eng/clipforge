"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Scissors, Sparkles, Image as ImageIcon, Clapperboard, ArrowRight, Play,
  MonitorPlay, Layers3, Wand2, Clock3, ListOrdered, BadgeCheck,
  Smartphone, WifiOff, Zap, Home,
} from "lucide-react";
import { InstallAppButton } from "@/components/pwa";

const fade = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const FEATURES = [
  {
    href: "/studio",
    icon: Clapperboard,
    title: "Timeline Editor",
    bn: "টাইমলাইন এডিটর",
    desc: "Trim, split, reorder clips on a multi-track timeline. Filters, text overlays, volume, fades — then export.",
    grad: "from-violet-500/25 to-violet-500/5",
  },
  {
    href: "/splitter",
    icon: Scissors,
    title: "Smart Splitter",
    bn: "স্মার্ট স্প্লিটার",
    desc: "A 30 or 50-minute video becomes serial clips — 10s, 25s, 45s or 1 minute each. Numbered 1, 2, 3… automatically.",
    grad: "from-cyan-500/25 to-cyan-500/5",
  },
  {
    href: "/ai-studio",
    icon: Sparkles,
    title: "AI Video Gen",
    bn: "এআই ভিডিও",
    desc: "Describe a scene — get a moving, graded, soundscaped video. Cosmic fractals, neon flows, living cells.",
    grad: "from-fuchsia-500/25 to-fuchsia-500/5",
  },
  {
    href: "/ai-studio?kind=image",
    icon: ImageIcon,
    title: "AI Image Gen",
    bn: "এআই ইমেজ",
    desc: "One prompt, one frame of pure generative art. Posters, covers and thumbnails in any aspect.",
    grad: "from-amber-500/25 to-amber-500/5",
  },
];

const MARQUEE = [
  "Trim & Split", "Multi-clip timeline", "Text overlays", "Cinematic filters", "Serial clip export",
  "AI text-to-video", "AI text-to-image", "Ambient soundscapes", "SD 480p → UHD 4K", "One-click download",
];

export function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* aurora */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-violet-700/25 aurora" />
      <div className="pointer-events-none absolute top-64 -left-40 h-[420px] w-[520px] rounded-full bg-cyan-500/15 aurora" style={{ animationDelay: "-8s" }} />

      {/* hero */}
      <section className="relative mx-auto max-w-[1500px] px-4 pb-24 pt-16 sm:px-6 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div variants={fade} initial="hidden" animate="show" custom={0}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-zinc-300">
              <span className="pulse-ring h-2 w-2 rounded-full bg-cyan-300" />
              All-in-one AI video suite
              <span className="font-bn text-cyan-300">সব একসাথে</span>
            </motion.div>

            <motion.h1 variants={fade} initial="hidden" animate="show" custom={1}
              className="font-display text-[clamp(2.6rem,6vw,5.2rem)] font-bold leading-[0.98] tracking-tight">
              Cut. Generate.
              <br />
              <span className="neon-text">Split. Ship.</span>
            </motion.h1>

            <motion.p variants={fade} initial="hidden" animate="show" custom={2}
              className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              A CapCut-class editor in your browser — plus AI that creates video &amp; images from
              text, and a smart splitter that turns a 50-minute recording into
              <span className="text-zinc-200 font-semibold"> serial shorts, numbered 1·2·3·4</span>,
              exported from SD all the way to <span className="text-zinc-200 font-semibold">4K UHD</span>.
            </motion.p>
            <motion.p variants={fade} initial="hidden" animate="show" custom={3}
              className="font-bn mt-3 text-sm text-zinc-500">
              ক্যাপকাটের মতো এডিট • এআই ভিডিও ও ছবি • লম্বা ভিডিও থেকে সিরিয়াল ক্লিপ
            </motion.p>

            <motion.div variants={fade} initial="hidden" animate="show" custom={4} className="mt-8 flex flex-wrap gap-3">
              <Link href="/splitter"
                className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white btn-glow transition-transform hover:scale-[1.04]">
                <Scissors className="h-4 w-4" />
                Split a long video
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/ai-studio"
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-zinc-100 backdrop-blur transition hover:border-violet-400/50 hover:bg-violet-500/10">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Generate with AI
              </Link>
            </motion.div>

            <motion.div variants={fade} initial="hidden" animate="show" custom={5}
              className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { k: "5", v: "Export tiers", sub: "SD → UHD 4K" },
                { k: "∞", v: "Clip serials", sub: "Auto numbered" },
                { k: "3", v: "AI engines", sub: "Video & image" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="font-display text-2xl font-bold text-white">{s.k}</div>
                  <div className="text-xs font-semibold text-zinc-300">{s.v}</div>
                  <div className="text-[10px] text-zinc-500">{s.sub}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="grain relative overflow-hidden rounded-3xl border border-white/10 shadow-[0_40px_120px_-30px_rgba(124,92,255,0.45)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero.jpg" alt="ClipForge editor" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07060d]/85 via-transparent to-transparent" />
              {/* fake timeline strip */}
              <div className="absolute inset-x-5 bottom-5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <Clock3 className="h-3 w-3" /> 00:47:32 · splitting…
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0.4, opacity: 0.3 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ delay: 0.8 + i * 0.09 }}
                      className="flex h-10 flex-1 items-end justify-center rounded-md bg-gradient-to-t from-violet-600/70 to-cyan-500/50 pb-1 text-[9px] font-bold text-white/90 ring-1 ring-white/20"
                    >
                      {i + 1}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <motion.div className="glass floaty absolute -left-6 -top-5 flex items-center gap-2 rounded-2xl px-4 py-3" transition={{ delay: 0.2 }}>
              <BadgeCheck className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-bold text-white">UHD 4K ready</span>
            </motion.div>
            <motion.div className="glass floaty absolute -right-4 top-1/3 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ animationDelay: "-3s" }}>
              <Wand2 className="h-4 w-4 text-fuchsia-300" />
              <span className="text-xs font-bold text-white">AI generative engines</span>
            </motion.div>
            <motion.div className="glass floaty absolute -bottom-5 left-10 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ animationDelay: "-1.5s" }}>
              <ListOrdered className="h-4 w-4 text-violet-300" />
              <span className="text-xs font-bold text-white">Serial 1 → N, always in order</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* marquee */}
      <div className="relative border-y border-white/[0.06] bg-white/[0.02] py-4">
        <div className="marquee-track flex w-max gap-8 whitespace-nowrap pl-8">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
              <Play className="h-3 w-3 text-violet-400" /> {m}
            </span>
          ))}
        </div>
      </div>

      {/* features */}
      <section className="relative mx-auto max-w-[1500px] px-4 py-24 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} custom={0}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">The toolkit</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Every editor trick, <span className="neon-text">one studio</span>
          </h2>
          <p className="font-bn mt-2 text-sm text-zinc-500">একটি অ্যাপেই সব ফিচার</p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={fade} custom={i}>
                <Link href={f.href}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${f.grad} p-6 transition-all hover:-translate-y-1.5 hover:border-white/25`}>
                  <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-black/30 ring-1 ring-white/15">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-display flex items-baseline gap-2 text-lg font-bold text-white">
                    {f.title}
                    <span className="font-bn text-xs font-medium text-zinc-400">{f.bn}</span>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
                  <span className="mt-auto pt-6 flex items-center gap-1.5 text-xs font-bold text-cyan-300 opacity-0 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* install app — PWA */}
      <section className="relative mx-auto max-w-[1500px] px-4 pb-24 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade} custom={0}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              <Smartphone className="h-3.5 w-3.5" /> Installable app · PWA
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              Carry the studio <span className="neon-text">in your pocket</span>
            </h2>
            <p className="font-bn mt-2 text-sm text-zinc-500">
              মোবাইলের হোম স্ক্রিনে ইনস্টল করুন — অ্যাপ স্টোর ছাড়াই, সরাসরি ব্রাউজার থেকে
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              ClipForge is a Progressive Web App. Install it on Android or iOS and it opens fullscreen
              like a native editor — with its own icon, app shortcuts and offline-ready shell.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <InstallAppButton />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-400">
                Android · iOS · Desktop
              </span>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[
                { icon: Home, label: "Home-screen icon", bn: "আইকন" },
                { icon: WifiOff, label: "Offline shell", bn: "অফলাইন" },
                { icon: Zap, label: "App shortcuts", bn: "শর্টকাট" },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                    <Icon className="mx-auto h-5 w-5 text-cyan-300" />
                    <p className="mt-2 text-[11px] font-bold text-zinc-200">{b.label}</p>
                    <p className="font-bn text-[10px] text-zinc-500">{b.bn}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 4 }}
            whileInView={{ opacity: 1, y: 0, rotate: 2 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-[270px] sm:w-[300px]"
          >
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-600/30 via-transparent to-cyan-500/25 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.6rem] border border-white/15 bg-black p-2 shadow-[0_50px_120px_-40px_rgba(124,92,255,0.6)]">
              <div className="relative overflow-hidden rounded-[2.1rem] bg-[#0b0a14]">
                {/* notch */}
                <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/hero.jpg" alt="ClipForge on mobile" className="aspect-[9/18] w-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07060d] via-transparent to-[#07060d]/40" />
                {/* mini app UI */}
                <div className="absolute inset-x-3 top-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="" className="h-6 w-6 rounded-lg" />
                    <span className="font-display text-xs font-bold text-white">ClipForge</span>
                  </div>
                  <span className="rounded-full bg-cyan-500/25 px-2 py-0.5 text-[9px] font-bold text-cyan-200">4K</span>
                </div>
                <div className="absolute inset-x-3 bottom-12 space-y-1.5">
                  {["AI video generated", "Split 12 serial clips", "Export FHD 1080p"].map((t, i) => (
                    <motion.div
                      key={t}
                      initial={{ opacity: 0, x: 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.15 }}
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                      <span className="text-[10px] font-semibold text-white">{t}</span>
                    </motion.div>
                  ))}
                </div>
                {/* home indicator */}
                <div className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-white/40" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* quality ladder */}
      <section className="relative mx-auto max-w-[1500px] px-4 pb-28 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade}
          className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-[90px]" />
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-300">Render ladder</p>
              <h3 className="font-display mt-3 text-3xl font-bold">From pocket SD to cinematic 4K</h3>
              <p className="font-bn mt-1 text-sm text-zinc-500">SD থেকে ৪কে — যেকোনো স্ক্রিনের জন্য</p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Choose your target when splitting or exporting: SD 480p, HD 720p, Full HD 1080p, QHD 1440p,
                or UHD 4K. Smart scaling keeps your aspect ratio perfect.
              </p>
              <Link href="/splitter" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15">
                <MonitorPlay className="h-4 w-4" /> Try the splitter
              </Link>
            </div>
            <div className="flex h-48 flex-1 items-end gap-2 self-stretch sm:gap-3">
              {[
                { h: "24%", label: "SD", v: "480p" },
                { h: "38%", label: "HD", v: "720p" },
                { h: "56%", label: "FHD", v: "1080p" },
                { h: "76%", label: "QHD", v: "1440p" },
                { h: "100%", label: "UHD", v: "4K" },
              ].map((b, i) => (
                <motion.div key={b.v}
                  initial={{ height: 0 }} whileInView={{ height: b.h }} viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex-1 rounded-t-xl bg-gradient-to-t from-violet-700/60 via-fuchsia-600/50 to-cyan-400/70 ring-1 ring-white/15">
                  <div className="absolute -top-7 w-full text-center text-[11px] font-bold text-zinc-300">{b.label}</div>
                  <div className="absolute bottom-2 w-full text-center text-[10px] font-semibold text-white/80">{b.v}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Layers3 className="h-5 w-5 text-zinc-600" />
          <p className="text-xs text-zinc-600">
            ClipForge — ভিডিও এডিটিংয়ের নতুন অধ্যায় · Edit, generate, split &amp; ship.
          </p>
        </div>
      </section>
    </div>
  );
}
