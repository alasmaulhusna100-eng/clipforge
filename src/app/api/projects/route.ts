import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { DIRS } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(100);
  return Response.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Untitled Project").slice(0, 140);
  const kind = body.kind === "split" ? "split" : "edit";
  const [row] = await db
    .insert(projects)
    .values({
      name,
      kind,
      ...(body.sourceAssetId ? { sourceAssetId: String(body.sourceAssetId) } : {}),
      ...(typeof body.durationSeconds === "number" ? { durationSeconds: body.durationSeconds } : {}),
      timeline: body.timeline ?? { clips: [], overlays: [], fadeIn: false, fadeOut: false },
    })
    .returning();
  if (kind === "split") fs.mkdirSync(path.join(DIRS.splits, row.id), { recursive: true });
  return Response.json({ project: row });
}
