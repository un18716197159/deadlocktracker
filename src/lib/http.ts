import { NextResponse } from "next/server";

/** JSON response that Vercel's CDN may cache. Only use for successful (2xx) payloads. */
export function cachedJson<T>(body: T, sMaxAge = 120, staleWhileRevalidate = 600) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}` },
  });
}
