import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startJob } from "@/lib/jobs";
import { runRender } from "@/lib/render";
import { TimelineData } from "@/lib/timeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST { projectId, timeline, quality } → { jobId } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { projectId } = body;
  const timeline = body.timeline as TimelineData | undefined;
  const quality = String(body.quality || "1080p");
  if (!projectId || !timeline || !Array.isArray(timeline.clips) || !timeline.clips.length) {
    return Response.json({ error: "projectId and a non-empty timeline are required" }, { status: 400 });
  }
  // basic shape validation
  for (const c of timeline.clips) {
    if (typeof c.src !== "string" || !(c.out > c.in)) {
      return Response.json({ error: "Invalid clip in timeline" }, { status: 400 });
    }
  }
  await db
    .update(projects)
    .set({ timeline: timeline as unknown as Record<string, unknown>, status: "processing", updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  const jobId = await startJob(
    "render",
    `Exporting ${quality}`,
    { projectId, quality },
    async (ctx) => {
      const res = await runRender({ projectId, timeline, qualityId: quality }, (pct) =>
        ctx.setProgress(pct)
      );
      return { ...res, projectId };
    }
  );
  return Response.json({ jobId });
}
