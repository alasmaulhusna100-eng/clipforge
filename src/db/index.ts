import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Never throw at import time: `next build` evaluates modules while collecting
// page data, and in CI/Docker the real DATABASE_URL only exists at runtime.
// Pool is lazy — it does not connect until the first query.
if (!databaseUrl && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn(
    "[db] DATABASE_URL is not set — database queries will fail until it is configured."
  );
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString:
      databaseUrl ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
