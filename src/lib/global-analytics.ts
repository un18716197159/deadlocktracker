import "server-only";

const API = "https://api.deadlock-api.com/v1/analytics";

export type HeroAnalytics = {
  hero_id: number;
  bucket: number;
  wins: number;
  losses: number;
  matches: number;
  matches_per_bucket: number;
  bucket_matches_since_first_day: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  total_player_damage: number;
  total_net_worth: number;
  total_last_hits: number;
  total_denies: number;
};

export type GameAnalytics = {
  bucket: number;
  total_matches: number;
  total_players: number;
  avg_duration_s: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  avg_player_damage: number;
};

export type AnalyticsFilters = {
  period: "7d" | "30d" | "90d" | "all";
  gameMode: "normal" | "street_brawl";
  matchMode: "ranked,unranked" | "ranked" | "unranked";
  rating: "all" | "0-29" | "30-59" | "60-89" | "90-116";
  bucket: "no_bucket" | "start_time_day" | "avg_badge";
};

export const defaultAnalyticsFilters: AnalyticsFilters = {
  period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all", bucket: "no_bucket",
};

function queryFor(filters: AnalyticsFilters, bucket = filters.bucket, range?: { start: number; end: number }) {
  const params = new URLSearchParams({ bucket, game_mode: filters.gameMode, match_mode: filters.matchMode });
  const days = filters.period === "7d" ? 7 : filters.period === "30d" ? 30 : filters.period === "90d" ? 90 : 0;
  params.set("min_unix_timestamp", String(range?.start ?? (days ? Math.floor(Date.now() / 1000) - days * 86400 : 0)));
  if (range) params.set("max_unix_timestamp", String(range.end));
  if (filters.rating !== "all" && filters.gameMode !== "street_brawl") {
    const [min, max] = filters.rating.split("-");
    params.set("min_average_badge", min);
    params.set("max_average_badge", max);
  }
  return params;
}

async function get<T>(endpoint: string, filters: AnalyticsFilters, bucket = filters.bucket, range?: { start: number; end: number }): Promise<T[]> {
  const response = await fetch(`${API}/${endpoint}?${queryFor(filters, bucket, range)}`, {
    cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Deadlock API request failed (${response.status}).`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Deadlock API returned an invalid analytics response.");
  return data as T[];
}

export async function getHeroAnalytics(filters: AnalyticsFilters): Promise<HeroAnalytics[]> {
  return get<HeroAnalytics>("hero-stats", filters);
}

export async function getGlobalAnalytics(filters: AnalyticsFilters) {
  const days = filters.period === "7d" ? 7 : filters.period === "30d" ? 30 : filters.period === "90d" ? 90 : 0;
  const end = Math.floor(Date.now() / 1000);
  const range = days ? { start: end - days * 86400, end } : undefined;
  const [summary, heroes, trend, ratings] = await Promise.all([
    get<GameAnalytics>("game-stats", filters, "no_bucket", range),
    get<HeroAnalytics>("hero-stats", filters, "no_bucket", range),
    filters.period === "all" ? Promise.resolve([]) : get<HeroAnalytics>("hero-stats", filters, "start_time_day", range),
    get<{ bucket: number; total_matches: number; total_players: number }>("game-stats", filters, "avg_badge", range),
  ]);
  return { summary: summary[0] ?? null, heroes, trend, ratings, trendRange: range ?? null };
}




