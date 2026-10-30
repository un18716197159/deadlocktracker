import { NextRequest, NextResponse } from "next/server";
import { getItemHeroAnalytics, type ItemAnalyticsFilters } from "../../../../lib/items-api";

function parseFilters(request: NextRequest): ItemAnalyticsFilters {
  const query = request.nextUrl.searchParams;
  const rating = query.get("rating");
  const rawMatchMode = query.get("matchMode");
  return {
    period: query.get("period") === "7d" || query.get("period") === "90d" || query.get("period") === "all" ? query.get("period") as ItemAnalyticsFilters["period"] : "30d",
    gameMode: query.get("gameMode") === "street_brawl" ? "street_brawl" : "normal",
    matchMode: rawMatchMode === "ranked" || rawMatchMode === "unranked" ? rawMatchMode : "ranked,unranked",
    rating: rating === "0-29" || rating === "30-59" || rating === "60-89" || rating === "90-116" ? rating : "all",
  };
}

export async function GET(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  if (!/^\d+$/.test(itemId) || !Number.isSafeInteger(Number(itemId))) return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
  try {
    const rows = await getItemHeroAnalytics(Number(itemId), parseFilters(request));
    return NextResponse.json({ heroes: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load item hero analytics.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
