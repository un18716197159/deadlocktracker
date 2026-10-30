import { NextRequest, NextResponse } from "next/server";
import { DeadlockApiError, getLeaderboardPlayers, type LeaderboardRegion } from "@/lib/deadlock-api";

const regions = ["Europe", "Asia", "NAmerica", "SAmerica", "Oceania"] as const;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const rawRegion = query.get("region") ?? "Europe";
  if (!regions.includes(rawRegion as LeaderboardRegion)) return NextResponse.json({ error: "Choose a supported leaderboard region." }, { status: 400 });
  const rawHeroId = query.get("heroId");
  const rawLeaderboardId = query.get("leaderboardId");
  const heroId = rawHeroId && /^\d+$/.test(rawHeroId) ? Number(rawHeroId) : undefined;
  const leaderboardId = rawLeaderboardId && /^\d+$/.test(rawLeaderboardId) ? Number(rawLeaderboardId) : undefined;
  if (rawHeroId && (heroId === undefined || !Number.isSafeInteger(heroId))) return NextResponse.json({ error: "Invalid hero ID." }, { status: 400 });
  if (rawLeaderboardId && (leaderboardId === undefined || !Number.isSafeInteger(leaderboardId))) return NextResponse.json({ error: "Invalid leaderboard ID." }, { status: 400 });
  const rawPeriod = query.get("period");
  const period = rawPeriod === "90d" || rawPeriod === "all" ? rawPeriod : "30d";
  try {
    const players = await getLeaderboardPlayers({ region: rawRegion as LeaderboardRegion, heroId, leaderboardId, period });
    return NextResponse.json({ players, region: rawRegion, heroId: heroId ?? null, leaderboardId: leaderboardId ?? null, period, apiLimit: players.length });
  } catch (error) {
    const failure = error instanceof DeadlockApiError ? error : new DeadlockApiError("Could not load the Deadlock leaderboard.", 502);
    return NextResponse.json({ error: failure.message, retryAfter: failure.retryAfter }, { status: failure.status });
  }
}
