import { NextRequest, NextResponse } from "next/server";
import { defaultAnalyticsFilters, getGlobalAnalytics, getHeroAnalytics, type AnalyticsFilters } from "../../../lib/global-analytics";
import { DeadlockApiError, getHeroes } from "../../../lib/deadlock-api";

function filtersFrom(request: NextRequest): AnalyticsFilters {
  const q = request.nextUrl.searchParams;
  const period = q.get("period");
  const gameMode = q.get("gameMode");
  const matchMode = q.get("matchMode");
  const rating = q.get("rating");
  const bucket = q.get("bucket");
  return {
    period: period === "7d" || period === "90d" || period === "all" ? period : "30d",
    gameMode: gameMode === "street_brawl" ? "street_brawl" : "normal",
    matchMode: matchMode === "ranked" || matchMode === "unranked" ? matchMode : defaultAnalyticsFilters.matchMode,
    rating: rating === "0-29" || rating === "30-59" || rating === "60-89" || rating === "90-116" ? rating : "all",
    bucket: bucket === "start_time_day" || bucket === "avg_badge" ? bucket : "no_bucket",
  };
}

export async function GET(request: NextRequest) {
  try {
    const filters = filtersFrom(request);
    const kind = request.nextUrl.searchParams.get("kind");
    if (kind === "heroes") return NextResponse.json({ heroes: await getHeroAnalytics(filters) });
    const [analytics, assets] = await Promise.all([getGlobalAnalytics(filters), getHeroes()]);
    return NextResponse.json({ ...analytics, assets: assets.map(({ id, name, images }) => ({ id, name, images })) });
  } catch (error) {
    const message = error instanceof DeadlockApiError ? error.message : "Could not load Deadlock analytics.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
