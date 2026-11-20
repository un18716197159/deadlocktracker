import { NextRequest, NextResponse } from "next/server";
import { cachedJson } from "@/lib/http";
import { getCommunityBuilds, ItemApiError } from "../../../lib/items-api";
import { apiLanguage } from "../../../lib/i18n/server";
import { isLocale } from "../../../lib/i18n/messages";

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
    return cachedJson({ builds: await getCommunityBuilds({ heroId, start, limit, sort, query: query.get("q") ?? undefined, language: apiLanguage(isLocale(query.get("lang")) ? (query.get("lang") as Parameters<typeof apiLanguage>[0]) : "en") }) });
  } catch (error) {
    const message = error instanceof ItemApiError ? error.message : "Could not load community builds.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
