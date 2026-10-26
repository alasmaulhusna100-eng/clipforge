"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clapperboard, Scissors, Sparkles, LayoutGrid, Layers } from "lucide-react";
import { cn } from "@/lib/client";
import { InstallAppButton, ServiceWorkerReg } from "@/components/pwa";

const LINKS = [
  { href: "/studio", label: "Studio", bn: "স্টুডিও", icon: LayoutGrid },
  { href: "/splitter", label: "Smart Splitter", bn: "স্প্লিটার", icon: Scissors },
  { href: "/ai-studio", label: "AI Studio", bn: "এআই", icon: Sparkles },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07060d]/80 backdrop-blur-xl">
      <ServiceWorkerReg />
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 btn-glow">
            <Clapperboard className="h-4.5 w-4.5 h-5 w-5 text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Clip<span className="neon-text">Forge</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 sm:flex">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  active ? "text-white" : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="navPill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600/80 to-cyan-600/60"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <InstallAppButton compact />
          <Link
            href="/studio"
            className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-[1.03] sm:flex btn-glow"
          >
            <Layers className="h-4 w-4" />
            New Project
          </Link>
          <nav className="flex gap-1 sm:hidden">
            {LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg",
                    path.startsWith(l.href) ? "bg-violet-500/20 text-violet-200" : "text-zinc-400"
                  )}
                >
                  <Icon className="h-4.5 w-4.5 h-5 w-5" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
