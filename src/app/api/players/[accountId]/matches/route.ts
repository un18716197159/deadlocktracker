import { NextRequest, NextResponse } from "next/server";
import { DeadlockApiError, getHeroes, getMatchHistory, getPlayerHeroStats, getPlayerRank, getRanks } from "@/lib/deadlock-api";

export async function GET(_request: NextRequest, { params }: RouteContext<"/api/players/[accountId]/matches">) {
  const { accountId: rawId } = await params;
  if (!/^\d{1,10}$/.test(rawId)) return NextResponse.json({ error: "Invalid account ID." }, { status: 400 });
  const accountId = Number(rawId);
  if (!Number.isSafeInteger(accountId) || accountId < 0 || accountId > 2_147_483_647) {
    return NextResponse.json({ error: "Invalid account ID." }, { status: 400 });
  }

  try {
    const matches = await getMatchHistory(accountId);
    const heroNames: Record<string, string> = {};
    const heroImages: Record<string, string> = {};
    try {
      const heroes = await getHeroes();
      for (const hero of heroes) {
        if (typeof hero.id !== "number") continue;
        if (typeof hero.name === "string") heroNames[String(hero.id)] = hero.name;
        const images = hero.images as { icon_image_small?: unknown } | undefined;
        if (typeof images?.icon_image_small === "string") heroImages[String(hero.id)] = images.icon_image_small;
      }
    } catch {
      // Preserve match history when asset data is temporarily unavailable.
    }

    const [rankResult, heroStatsResult, ranksResult] = await Promise.allSettled([
      getPlayerRank(accountId),
      getPlayerHeroStats(accountId),
      getRanks(),
    ]);
    const rank = rankResult.status === "fulfilled" ? rankResult.value : null;
    const heroStats = heroStatsResult.status === "fulfilled" ? heroStatsResult.value : [];
    const rankNames = ranksResult.status === "fulfilled"
      ? Object.fromEntries(ranksResult.value.flatMap((entry) =>
        typeof entry.tier === "number" && typeof entry.name === "string" ? [[entry.tier, entry.name]] : [],
      ))
      : {};
    return NextResponse.json({
      matches,
      heroNames,
      heroImages,
      rank,
      rankAvailable: rankResult.status === "fulfilled",
      rankNames,
      heroStats,
      heroStatsAvailable: heroStatsResult.status === "fulfilled",
    });
  } catch (error) {
    const failure = error instanceof DeadlockApiError ? error : new DeadlockApiError("Match history request failed.", 502);
    return NextResponse.json({ error: failure.message, retryAfter: failure.retryAfter }, { status: failure.status });
  }
}
