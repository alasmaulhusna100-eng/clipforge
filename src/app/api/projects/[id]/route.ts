import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects, clips, assets } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const clipRows = await db
    .select({
      clip: clips,
      asset: assets,
    })
    .from(clips)
    .leftJoin(assets, eq(clips.assetId, assets.id))
    .where(eq(clips.projectId, id))
    .orderBy(asc(clips.serial));

  let source = null;
  if (project.sourceAssetId) {
    const [s] = await db.select().from(assets).where(eq(assets.id, project.sourceAssetId));
    source = s ?? null;
  }
  let render = null;
  if (project.renderAssetId) {
    const [r] = await db.select().from(assets).where(eq(assets.id, project.renderAssetId));
    render = r ?? null;
  }
  return Response.json({ project, clips: clipRows, source, render });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.slice(0, 140);
  if (body.timeline) patch.timeline = body.timeline;
  if (typeof body.quality === "string") patch.quality = body.quality;
  if (typeof body.status === "string") patch.status = body.status;
  const [row] = await db.update(projects).set(patch).where(eq(projects.id, id)).returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(projects).where(eq(projects.id, id));
  return Response.json({ ok: true });
}
