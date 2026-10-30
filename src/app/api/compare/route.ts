import { NextRequest, NextResponse } from "next/server";
import {
  DeadlockApiError,
  getHeroes,
  getMatchHistory,
  getPlayerRanks,
  getRanks,
  getSteamProfiles,
  type MatchHistoryEntry,
} from "@/lib/deadlock-api";

type Period = "30d" | "90d" | "all";
type HeroSummary = { heroId: number; name: string; image: string | null; matches: number; wins: number; losses: number; winRate: number; avgKills: number | null; avgDeaths: number | null; avgAssists: number | null };
type ComparedPlayer = { accountId: number; name: string; avatar: string | null; rankName: string | null; rankTier: number | null; subrank: number | null; matches: number; wins: number; losses: number; winRate: number | null; avgKills: number | null; avgDeaths: number | null; avgAssists: number | null; heroes: HeroSummary[] };

function validAccountId(value: string | null): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 0 && id <= 2_147_483_647 ? id : null;
}

function average(matches: MatchHistoryEntry[], field: "player_kills" | "player_deaths" | "player_assists") {
  const values = matches.flatMap((match) => typeof match[field] === "number" && Number.isFinite(match[field]) && match[field]! >= 0 ? [match[field]!] : []);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function summarizePlayer(accountId: number, history: MatchHistoryEntry[], profile: Awaited<ReturnType<typeof getSteamProfiles>>[number] | undefined, rank: Awaited<ReturnType<typeof getPlayerRanks>>[number] | undefined, rankAssets: Awaited<ReturnType<typeof getRanks>>, heroes: Awaited<ReturnType<typeof getHeroes>>, minTimestamp: number) {
  const scored = history.filter((match) => (match.player_match_outcome === 1 || match.player_match_outcome === 2) && (minTimestamp === 0 || (typeof match.start_time === "number" && match.start_time >= minTimestamp)));
  const wins = scored.filter((match) => match.player_match_outcome === 1).length;
  const losses = scored.filter((match) => match.player_match_outcome === 2).length;
  const heroAssets = new Map(heroes.flatMap((hero) => typeof hero.id === "number" ? [[hero.id, hero] as const] : []));
  const grouped = new Map<number, MatchHistoryEntry[]>();
  for (const match of scored) {
    if (typeof match.hero_id !== "number") continue;
    const rows = grouped.get(match.hero_id) ?? [];
    rows.push(match);
    grouped.set(match.hero_id, rows);
  }
  const heroRows = [...grouped].map(([heroId, matches]): HeroSummary => {
    const hero = heroAssets.get(heroId);
    const heroWins = matches.filter((match) => match.player_match_outcome === 1).length;
    const heroLosses = matches.filter((match) => match.player_match_outcome === 2).length;
    const counted = heroWins + heroLosses;
    return {
      heroId,
      name: hero?.name || `Hero ${heroId}`,
      image: hero?.images?.icon_image_small_webp || hero?.images?.icon_image_small || null,
      matches: counted,
      wins: heroWins,
      losses: heroLosses,
      winRate: counted ? heroWins / counted * 100 : 0,
      avgKills: average(matches, "player_kills"),
      avgDeaths: average(matches, "player_deaths"),
      avgAssists: average(matches, "player_assists"),
    };
  }).sort((a, b) => b.matches - a.matches);
  const rankTier = typeof rank?.rank === "number" && rank.rank > 0 ? rank.rank : null;
  return {
    accountId,
    name: profile?.personaname || `Account ${accountId}`,
    avatar: profile?.avatarfull || profile?.avatar || null,
    rankName: rankTier === null ? null : rankAssets.find((asset) => asset.tier === rankTier)?.name || `Tier ${rankTier}`,
    rankTier,
    subrank: rankTier === null || typeof rank?.subrank !== "number" ? null : rank.subrank,
    matches: scored.length,
    wins,
    losses,
    winRate: scored.length ? wins / scored.length * 100 : null,
    avgKills: average(scored, "player_kills"),
    avgDeaths: average(scored, "player_deaths"),
    avgAssists: average(scored, "player_assists"),
    heroes: heroRows,
  } satisfies ComparedPlayer;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const leftId = validAccountId(query.get("left"));
  const rightId = validAccountId(query.get("right"));
  if (leftId === null || rightId === null) return NextResponse.json({ error: "Choose two valid player accounts." }, { status: 400 });
  if (leftId === rightId) return NextResponse.json({ error: "Choose two different players." }, { status: 400 });
  const rawPeriod = query.get("period");
  const period: Period = rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "all";
  const minTimestamp = period === "all" ? 0 : Math.floor(Date.now() / 1000) - (period === "30d" ? 30 : 90) * 86400;
  const ids = [leftId, rightId];
  const [leftHistory, rightHistory, profileResult, rankResult, rankAssetsResult, heroAssetsResult] = await Promise.allSettled([
    getMatchHistory(leftId), getMatchHistory(rightId), getSteamProfiles(ids), getPlayerRanks(ids), getRanks(), getHeroes(),
  ]);
  if (leftHistory.status === "rejected" || rightHistory.status === "rejected") {
    const reason = leftHistory.status === "rejected" ? leftHistory.reason : rightHistory.status === "rejected" ? rightHistory.reason : undefined;
    const failure = reason instanceof DeadlockApiError ? reason : new DeadlockApiError("Player match history is unavailable.", 502);
    return NextResponse.json({ error: failure.message, retryAfter: failure.retryAfter }, { status: failure.status });
  }
  const profiles = profileResult.status === "fulfilled" ? profileResult.value : [];
  const ranks = rankResult.status === "fulfilled" ? rankResult.value : [];
  const rankAssets = rankAssetsResult.status === "fulfilled" ? rankAssetsResult.value : [];
  const heroes = heroAssetsResult.status === "fulfilled" ? heroAssetsResult.value : [];
  const profileById = new Map(profiles.flatMap((profile) => typeof profile.account_id === "number" ? [[profile.account_id, profile] as const] : []));
  const rankById = new Map(ranks.map((rank) => [rank.account_id, rank]));
  const players = [leftId, rightId].map((id, index) => summarizePlayer(id, index === 0 ? leftHistory.value : rightHistory.value, profileById.get(id), rankById.get(id), rankAssets, heroes, minTimestamp));
  return NextResponse.json({ players, period, sample: "Scored match-history rows (wins and losses), all game and match modes" });
}
