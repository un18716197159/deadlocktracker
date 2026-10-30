import { NextRequest, NextResponse } from "next/server";
import { getItemAnalytics, ItemApiError, type ItemAnalyticsFilters } from "../../../lib/items-api";

function parseFilters(request: NextRequest): { filters: ItemAnalyticsFilters; heroId?: number } {
  const query = request.nextUrl.searchParams;
  const rating = query.get("rating");
  const rawMatchMode = query.get("matchMode");
  const rawHero = query.get("heroId");
  const heroId = rawHero && /^\d+$/.test(rawHero) ? Number(rawHero) : undefined;
  return {
    filters: {
      period: query.get("period") === "7d" || query.get("period") === "90d" || query.get("period") === "all" ? query.get("period") as ItemAnalyticsFilters["period"] : "30d",
      gameMode: query.get("gameMode") === "street_brawl" ? "street_brawl" : "normal",
      matchMode: rawMatchMode === "ranked" || rawMatchMode === "unranked" ? rawMatchMode : "ranked,unranked",
      rating: rating === "0-29" || rating === "30-59" || rating === "60-89" || rating === "90-116" ? rating : "all",
    },
    ...(heroId !== undefined && Number.isSafeInteger(heroId) ? { heroId } : {}),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { filters, heroId } = parseFilters(request);
    return NextResponse.json(await getItemAnalytics(filters, heroId));
  } catch (error) {
    const message = error instanceof ItemApiError ? error.message : "Could not load item analytics.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
