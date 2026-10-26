import { NextRequest } from "next/server";
import fs from "fs";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { resolveStorage } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get("origin");
  const kind = req.nextUrl.searchParams.get("kind");
  const where = and(
    origin ? eq(assets.origin, origin) : undefined,
    kind ? eq(assets.kind, kind) : undefined
  );
  const rows = await db.select().from(assets).where(where).orderBy(desc(assets.createdAt)).limit(200);
  return Response.json({ assets: rows });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const [row] = await db.select().from(assets).where(eq(assets.id, id));
  if (!row) return Response.json({ ok: true });
  await db.delete(assets).where(eq(assets.id, id));
  for (const p of [row.path, row.thumbPath]) {
    if (!p) continue;
    try {
      fs.unlinkSync(resolveStorage(p));
    } catch {}
  }
  return Response.json({ ok: true });
}
