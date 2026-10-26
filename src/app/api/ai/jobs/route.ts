import { db } from "@/db";
import { jobs, assets } from "@/db/schema";
import { desc, inArray, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recent AI generations joined to their produced asset. */
export async function GET() {
  const rows = await db
    .select()
    .from(jobs)
    .where(inArray(jobs.type, ["ai-video", "ai-image"]))
    .orderBy(desc(jobs.createdAt))
    .limit(60);

  const assetIds = rows
    .map((j) => (j.result as { assetId?: string } | null)?.assetId)
    .filter(Boolean) as string[];
  const assetRows = assetIds.length
    ? await db.select().from(assets).where(inArray(assets.id, assetIds))
    : [];
  const map = new Map(assetRows.map((a) => [a.id, a]));

  return Response.json({
    jobs: rows.map((j) => {
      const aid = (j.result as { assetId?: string } | null)?.assetId;
      return { ...j, asset: aid ? map.get(aid) ?? null : null };
    }),
  });
}
