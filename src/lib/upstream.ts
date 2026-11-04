import "server-only";

export const DEADLOCK_API_ORIGIN = "https://api.deadlock-api.com";

/**
 * Headers for every request to the Deadlock API.
 * If DEADLOCK_API_KEY is set it is sent as X-API-KEY (preferred over ?api_key=,
 * which would leak the key into URLs and logs). Without a key requests fall
 * back to the much stricter per-IP limits.
 */
export function deadlockHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const key = process.env.DEADLOCK_API_KEY?.trim();
  if (key) headers["X-API-KEY"] = key;
  return headers;
}

/**
 * Current unix time rounded down to a bucket (default 1 hour).
 * Using raw Date.now() in query strings makes every URL unique, so no cache
 * (Next, CDN or upstream) can ever hit. Bucketing keeps URLs stable.
 */
export function cacheNowSeconds(bucketSeconds = 3600): number {
  return Math.floor(Date.now() / 1000 / bucketSeconds) * bucketSeconds;
}
