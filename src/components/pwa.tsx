"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, X, Share, SquarePlus, MoreVertical, MonitorSmartphone,
  BadgeCheck, WifiOff, Zap, Home,
} from "lucide-react";
import { cn } from "@/lib/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Register the service worker (app shell caching + offline fallback). */
export function ServiceWorkerReg() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // avoid dev-cache weirdness
    const t = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(
      /iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onDone = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onDone);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onDone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDeferred(null);
    return choice.outcome === "accepted";
  }, [deferred]);

  return { canNativePrompt: Boolean(deferred), installed, isIOS, promptInstall };
}

/** Install button with smart behavior: native prompt → or guided instructions modal. */
export function InstallAppButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { canNativePrompt, installed, isIOS, promptInstall } = useInstall();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onClick = async () => {
    if (installed) {
      setOpen(true);
      return;
    }
    if (canNativePrompt) {
      const ok = await promptInstall();
      if (!ok) setOpen(true);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          compact
            ? "grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-zinc-200 transition hover:border-cyan-300/50 hover:bg-cyan-400/10"
            : "flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-violet-600 px-6 py-3 text-sm font-bold text-white btn-glow transition hover:scale-[1.04]",
          className
        )}
        title="Install ClipForge app"
      >
        {installed ? (
          <>
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
            {!compact && "App installed"}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {!compact && (
              <span>
                Install App <span className="font-bn font-medium text-white/80">· ইনস্টল করুন</span>
              </span>
            )}
          </>
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[95] grid place-items-end bg-black/75 backdrop-blur-sm sm:place-items-center"
                onClick={() => setOpen(false)}
              >
                <motion.div
                  initial={{ y: 80, opacity: 0.6 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                  className="glass max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display flex items-center gap-2 text-lg font-bold">
                      <MonitorSmartphone className="h-5 w-5 text-cyan-300" />
                      {installed ? "Already installed" : "Install ClipForge"}
                    </h3>
                    <button
                      onClick={() => setOpen(false)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* app preview chip */}
                  <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="ClipForge" className="h-14 w-14 rounded-2xl shadow-lg" />
                    <div>
                      <p className="font-display text-sm font-bold">ClipForge — AI Video Studio</p>
                      <p className="text-[11px] text-zinc-500">clipforge.app · Video editing suite</p>
                      <div className="mt-1 flex gap-1">
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">FREE</span>
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-200">NO STORE NEEDED</span>
                      </div>
                    </div>
                  </div>

                  {installed ? (
                    <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                      <BadgeCheck className="h-5 w-5 shrink-0" />
                      ClipForge is installed on this device. Find it on your home screen.
                    </p>
                  ) : isIOS ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        iPhone / iPad — Safari steps
                      </p>
                      {[
                        { icon: Share, text: <>Tap the <b>Share</b> button in Safari&apos;s toolbar</> },
                        { icon: SquarePlus, text: <>Scroll down and tap <b>&quot;Add to Home Screen&quot;</b></> },
                        { icon: BadgeCheck, text: <>Tap <b>Add</b> — ClipForge appears on your home screen</> },
                      ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600/60 text-xs font-black text-white">
                              {i + 1}
                            </span>
                            <Icon className="h-4.5 w-4.5 h-5 w-5 shrink-0 text-cyan-300" />
                            <p className="text-sm text-zinc-300">{s.text}</p>
                          </div>
                        );
                      })}
                      <p className="font-bn text-center text-xs text-zinc-500">
                        Safari-এ ওপেন করে Share → Add to Home Screen চাপুন
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Android — Chrome steps
                      </p>
                      {[
                        { icon: MoreVertical, text: <>Tap the <b>⋮ menu</b> in Chrome&apos;s top-right corner</> },
                        { icon: SquarePlus, text: <>Choose <b>&quot;Add to Home screen&quot;</b> or <b>&quot;Install app&quot;</b></> },
                        { icon: BadgeCheck, text: <>Confirm — ClipForge installs like a native app</> },
                      ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-600/60 text-xs font-black text-white">
                              {i + 1}
                            </span>
                            <Icon className="h-4.5 w-4.5 h-5 w-5 shrink-0 text-cyan-300" />
                            <p className="text-sm text-zinc-300">{s.text}</p>
                          </div>
                        );
                      })}
                      <p className="font-bn text-center text-xs text-zinc-500">
                        Chrome মেনু থেকে &quot;Add to Home screen&quot; চাপুন
                      </p>
                    </div>
                  )}

                  {/* benefits */}
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                    {[
                      { icon: Home, label: "Home-screen icon" },
                      { icon: WifiOff, label: "Offline shell" },
                      { icon: Zap, label: "App shortcuts" },
                    ].map((b) => {
                      const Icon = b.icon;
                      return (
                        <div key={b.label} className="rounded-xl bg-white/[0.04] p-2.5 text-center">
                          <Icon className="mx-auto h-4 w-4 text-violet-300" />
                          <p className="mt-1 text-[9px] font-bold text-zinc-400">{b.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
