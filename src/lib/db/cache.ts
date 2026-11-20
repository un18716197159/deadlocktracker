import "server-only";
import { createHash } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getDb, schema } from "./index";

/**
 * Database-backed cache for upstream (Deadlock API) responses.
 *
 * - Fresh entry in the DB  -> returned without touching the upstream API.
 * - Missing/expired entry  -> loaded, stored with the given TTL, returned.
 * - Upstream fails (429, timeout, 5xx...) but an old entry exists -> the stale
 *   entry is served instead of an error. This is what keeps the site usable
 *   when the API rate limit is hit.
 * - No DATABASE_URL or the DB is down -> falls back to calling the loader.
 * - The DB read gives up after READ_TIMEOUT_MS (a sleeping free-tier Neon database can take
 *   seconds to wake up), and the write runs in the background, so the page never waits on the DB.
 */
const READ_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`cache read timed out after ${ms}ms`)), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

export async function cachedUpstream<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) return load();

  const id = createHash("sha256").update(key).digest("hex");
  let stale: { value: unknown } | null = null;

  try {
    const db = getDb();
    const [row] = await withTimeout(db.select().from(schema.cacheEntries).where(eq(schema.cacheEntries.key, id)).limit(1), READ_TIMEOUT_MS);
    if (row) {
      if (row.expiresAt.getTime() > Date.now()) return row.value as T;
      stale = { value: row.value };
    }
  } catch (error) {
    console.error("cache read failed", error);
  }

  let fresh: T;
  try {
    fresh = await load();
  } catch (error) {
    if (stale) {
      console.warn(`serving stale cache for ${key}`);
      return stale.value as T;
    }
    throw error;
  }

  // Save in the background: the visitor gets the fresh data right away.
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  void (async () => {
    const db = getDb();
    await db
      .insert(schema.cacheEntries)
      .values({ key: id, value: fresh as unknown, expiresAt })
      .onConflictDoUpdate({ target: schema.cacheEntries.key, set: { value: fresh as unknown, expiresAt } });
    // Occasionally drop entries that have been expired for over a week.
    if (Math.random() < 0.01) {
      await db.delete(schema.cacheEntries).where(lt(schema.cacheEntries.expiresAt, new Date(Date.now() - 7 * 86_400_000)));
    }
  })().catch((error) => console.error("cache write failed", error));
  return fresh;
}
