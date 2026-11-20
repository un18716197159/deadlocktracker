import { NextResponse, type NextRequest } from "next/server";
import { DEADLOCK_API_ORIGIN, deadlockHeaders } from "@/lib/upstream";

/**
 * Local-only: shows what the Deadlock API really returns, so the site can be built against real fields.
 * Disabled in production. Open in the browser while `npm run dev` is running:
 *   /api/debug/shape                       -> samples of several endpoints
 *   /api/debug/shape?account_id=123456     -> also rank history for that player
 * Copy the JSON it prints and send it to whoever is building the site.
 */
const PATHS = (accountId: string | null) => [
  "/v1/analytics/hero-counter-stats",
  "/v1/analytics/hero-synergy-stats",
  "/v1/assets/heroes?language=english&only_active=true",
  ...(accountId && /^\d{1,10}$/.test(accountId)
    ? [`/v1/players/${accountId}/mmr-history`, `/v1/players/${accountId}/rank`, `/v1/players/${accountId}/hero-stats`]
    : []),
];

function sample(value: unknown): unknown {
  if (Array.isArray(value)) return { type: "array", length: value.length, first: value.slice(0, 2).map(trim) };
  return { type: typeof value, value: trim(value) };
}

/** Keeps the output short: long strings are cut, nested objects are limited. */
function trim(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  if (Array.isArray(value)) return depth > 2 ? `[array(${value.length})]` : value.slice(0, 3).map((entry) => trim(entry, depth + 1));
  if (value && typeof value === "object") {
    if (depth > 2) return "{…}";
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, entry]) => [key, trim(entry, depth + 1)]));
  }
  return value;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const results: Record<string, unknown> = {};
  for (const path of PATHS(request.nextUrl.searchParams.get("account_id"))) {
    try {
      const response = await fetch(`${DEADLOCK_API_ORIGIN}${path}`, { cache: "no-store", headers: deadlockHeaders(), signal: AbortSignal.timeout(20_000) });
      results[path] = response.ok ? sample(await response.json()) : { status: response.status };
    } catch (error) {
      results[path] = { error: error instanceof Error ? error.message : "request failed" };
    }
  }
  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
}
