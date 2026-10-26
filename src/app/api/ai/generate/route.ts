import { NextRequest } from "next/server";
import { startJob } from "@/lib/jobs";
import { generateAiMedia, AiGenParams } from "@/lib/ai-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STYLES = new Set(["cosmic", "flow", "cells"]);
const ASPECTS = new Set(["16:9", "9:16", "1:1"]);

/** POST { prompt, kind: video|image, style, duration, quality, aspect } → { jobId } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim().slice(0, 220);
  if (prompt.length < 3) {
    return Response.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }
  const params: AiGenParams = {
    prompt,
    kind: body.kind === "image" ? "image" : "video",
    style: STYLES.has(body.style) ? body.style : "cosmic",
    duration: Number(body.duration) || 10,
    qualityId: String(body.quality || "1080p"),
    aspect: ASPECTS.has(body.aspect) ? body.aspect : "16:9",
  };

  const jobId = await startJob(
    params.kind === "image" ? "ai-image" : "ai-video",
    prompt.slice(0, 80),
    params as unknown as Record<string, unknown>,
    async (ctx) => {
      let lastReported = 0;
      const res = await generateAiMedia(params, (r) => {
        const pct = Math.round(r * 100);
        if (pct - lastReported >= 4) {
          lastReported = pct;
          void ctx.setProgress(pct);
        }
      });
      return res as unknown as Record<string, unknown>;
    }
  );
  return Response.json({ jobId });
}
