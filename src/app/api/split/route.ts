import { NextRequest } from "next/server";
import { startJob } from "@/lib/jobs";
import { runSplit } from "@/lib/split";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST { projectId, assetId, segmentSeconds, quality } → { jobId } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { projectId, assetId } = body;
  const segmentSeconds = Number(body.segmentSeconds);
  const quality = String(body.quality || "source");
  if (!projectId || !assetId || !segmentSeconds || segmentSeconds < 1) {
    return Response.json({ error: "projectId, assetId, segmentSeconds required" }, { status: 400 });
  }

  const jobId = await startJob(
    "split",
    `Splitting into ${segmentSeconds}s clips`,
    { projectId, assetId, segmentSeconds, quality },
    async (ctx) => {
      const res = await runSplit(
        { projectId, assetId, segmentSeconds, qualityId: quality },
        (pct, clipCount) => ctx.setProgress(pct, { projectId, clipCount })
      );
      return { projectId, clipCount: res.clipCount };
    }
  );
  return Response.json({ jobId });
}
