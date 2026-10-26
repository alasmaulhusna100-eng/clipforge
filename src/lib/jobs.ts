import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureDirs } from "./paths";

ensureDirs();

/** Create a job row and kick off the async worker without blocking the request. */
export async function startJob(
  type: string,
  label: string,
  payload: Record<string, unknown>,
  worker: (ctx: JobContext) => Promise<Record<string, unknown>>
): Promise<string> {
  const [row] = await db
    .insert(jobs)
    .values({ type, label, payload, status: "queued", progress: 0 })
    .returning({ id: jobs.id });

  const ctx: JobContext = {
    id: row.id,
    setProgress: async (p, extra) => {
      await db
        .update(jobs)
        .set({
          progress: Math.max(0, Math.min(99, Math.round(p))),
          ...(extra ? { result: extra } : {}),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, row.id));
    },
  };

  void (async () => {
    try {
      await db
        .update(jobs)
        .set({ status: "processing", progress: 1, updatedAt: new Date() })
        .where(eq(jobs.id, row.id));
      const result = await worker(ctx);
      await db
        .update(jobs)
        .set({ status: "done", progress: 100, result, updatedAt: new Date() })
        .where(eq(jobs.id, row.id));
    } catch (e) {
      await db
        .update(jobs)
        .set({
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, row.id));
    }
  })();

  return row.id;
}

export interface JobContext {
  id: string;
  setProgress: (pct: number, extra?: Record<string, unknown>) => Promise<void>;
}

/** Tiny promise pool for bounded concurrency. */
export async function pool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<void>
) {
  let i = 0;
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const cur = i++;
      await fn(items[cur], cur);
    }
  });
  await Promise.all(lanes);
}
