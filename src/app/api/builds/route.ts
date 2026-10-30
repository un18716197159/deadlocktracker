import { NextRequest, NextResponse } from "next/server";
import { getCommunityBuilds } from "../../../lib/items-api";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const rawHeroId = query.get("heroId");
  const rawStart = query.get("start");
  const rawLimit = query.get("limit");
  const rawSort = query.get("sort");
  const heroId = rawHeroId && /^\d+$/.test(rawHeroId) ? Number(rawHeroId) : undefined;
  const start = rawStart && /^\d+$/.test(rawStart) ? Number(rawStart) : 0;
  const limit = rawLimit && /^\d+$/.test(rawLimit) ? Number(rawLimit) : 18;
  const sort = rawSort === "favorites" || rawSort === "updated_at" ? rawSort : "weekly_favorites";
  if (heroId !== undefined && !Number.isSafeInteger(heroId)) return NextResponse.json({ error: "Invalid hero ID." }, { status: 400 });
  try {
    return NextResponse.json({ builds: await getCommunityBuilds({ heroId, start, limit, sort, query: query.get("q") ?? undefined }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load community builds.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
