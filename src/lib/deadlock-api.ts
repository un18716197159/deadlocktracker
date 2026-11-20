import "server-only";
import { cachedUpstream } from "./db/cache";
import { cacheNowSeconds, deadlockHeaders } from "./upstream";
import { cacheLife } from "next/cache";

const API_BASE = "https://api.deadlock-api.com";
const REQUEST_TIMEOUT_MS = 12_000;

export type SteamProfile = {
  account_id?: number;
  personaname?: string;
  avatar?: string;
  avatarfull?: string;
  profileurl?: string;
  matches_played_last_30d?: number;
  [key: string]: unknown;
};

export type MatchHistoryEntry = {
  account_id?: number;
  match_id?: number;
  hero_id?: number;
  start_time?: number;
  match_duration_s?: number;
  player_kills?: number;
  player_deaths?: number;
  player_assists?: number;
  player_match_outcome?: number;
  game_mode?: number;
  match_mode?: number;
  /** Team the player was on in this match (0 or 1). */
  player_team?: number;
  /** Ranked matches only: rank after the match, encoded as tier * 10 + subrank (96 = tier 9, division 6). */
  ranked_display_badge?: number | null;
  /** Ranked matches only: rank progress gained (+) or lost (−) in this match. */
  ranked_delta?: number | null;
  ranked_calibration_match?: number | null;
};

export type HeroAsset = { id?: number; name?: string; description?: { lore?: string | null; playstyle?: string | null; role?: string | null } | null; images?: { icon_image_small?: string | null; icon_image_small_webp?: string | null; icon_hero_card?: string | null; icon_hero_card_webp?: string | null; background_image?: string | null; background_image_webp?: string | null; hero_card_critical?: string | null; hero_card_critical_webp?: string | null } | null; in_development?: boolean; limited_testing?: boolean; [key: string]: unknown };
export type PlayerRank = { badge?: number; rank?: number; subrank?: number; last_match?: unknown };
export type PlayerHeroStats = {
  account_id?: number;
  hero_id?: number;
  matches_played?: number;
  wins?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
};
export type RankAsset = { tier?: number; name?: string; images?: Record<string, string | null> };
export type PlayerRankEntry = { account_id: number; badge?: number; rank?: number; subrank?: number; last_match?: unknown };
export type LeaderboardRegion = "Europe" | "Asia" | "NAmerica" | "SAmerica" | "Oceania";
export type OfficialLeaderboardEntry = { account_name: string; possible_account_ids: number[]; rank: number; top_hero_ids: number[] };
export type RankedSeasonAsset = { class_name: string; name: string; intervals: Array<{ interval: number; start_timestamp: number; end_timestamp: number; leaderboard_id: number }> };
export type PlayerScoreboardMetric = { rank: number; account_id: number; value: number; matches: number };
export type LeaderboardPlayerStats = { matches: number | null; wins: number | null; losses: number | null; winRate: number | null; kills: number | null; deaths: number | null; assists: number | null };
export type LeaderboardPlayer = { place: number; name: string; accountId: number | null; avatar: string | null; rank: string | null; rankTier: number | null; rankSubrank: number | null; rankImage: string | null; topHeroIds: number[]; stats: LeaderboardPlayerStats | null };

export class DeadlockApiError extends Error {
  constructor(message: string, public status: number, public retryAfter?: string) {
    super(message);
    this.name = "DeadlockApiError";
  }
}

/** How long a response for this API path may be served from the database cache. */
function ttlFor(path: string): number {
  if (path.includes("/v1/assets/")) return 86_400;
  if (path.includes("/steam-search") || path.includes("/leaderboard/")) return 600;
  if (path.includes("/v1/players/")) return 120;
  return 300;
}

function request<T>(path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  return cachedUpstream(`dl:${path}`, ttlFor(path), () => requestUncached<T>(path, timeoutMs));
}

async function requestUncached<T>(path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: deadlockHeaders(),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new DeadlockApiError("Deadlock API timed out. Please try again.", 504);
    }
    throw new DeadlockApiError("Could not connect to Deadlock API.", 502);
  }

  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After") ?? undefined;
    if (response.status === 429) {
      throw new DeadlockApiError("Deadlock API rate limit reached. Please wait before retrying.", 429, retryAfter);
    }
    if (response.status === 503) {
      throw new DeadlockApiError("Deadlock API is busy. Please retry shortly.", 503, retryAfter);
    }
    if (response.status === 504) {
      throw new DeadlockApiError("Deadlock API query timed out. Please retry shortly.", 504, retryAfter);
    }
    if (response.status === 404) throw new DeadlockApiError("No matching Deadlock data was found.", 404);
    throw new DeadlockApiError(`Deadlock API request failed (${response.status}).`, response.status, retryAfter);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new DeadlockApiError("Deadlock API returned an invalid response.", 502);
  }
}

/**
 * Lists that every visitor shares (assets, analytics). Cached by Next.js
 * ("use cache") instead of a hand-made Map: a Map checked with Date.now()
 * breaks prerendering under Cache Components.
 */
async function requestAssetList<T>(path: string, errorMessage: string): Promise<T[]> {
  "use cache";
  // Assets change rarely; analytics should refresh about every 10 minutes.
  if (path.includes("/v1/assets/")) cacheLife("days");
  else cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  const result = await request<unknown>(path);
  if (!Array.isArray(result)) throw new DeadlockApiError(errorMessage, 502);
  return result as T[];
}

export async function searchPlayers(query: string): Promise<SteamProfile[]> {
  const params = new URLSearchParams({ search_query: query, limit: "20", min_matches_played_last_30d: "0" });
  const result = await request<unknown>(`/v1/players/steam-search?${params}`);
  if (!Array.isArray(result)) throw new DeadlockApiError("Deadlock API returned an invalid player list.", 502);
  return result as SteamProfile[];
}

export async function getMatchHistory(accountId: number): Promise<MatchHistoryEntry[]> {
  const result = await request<unknown>(`/v1/players/${accountId}/match-history`);
  if (!Array.isArray(result)) throw new DeadlockApiError("Deadlock API returned an invalid match history.", 502);
  return result as MatchHistoryEntry[];
}

export async function getHeroes(): Promise<HeroAsset[]> {
  return getHeroesIn("english");
}

export async function getHeroesIn(language: string): Promise<HeroAsset[]> {
  "use cache";
  cacheLife("days");
  return requestAssetList<HeroAsset>(`/v1/assets/heroes?language=${encodeURIComponent(language)}&only_active=true`, "Deadlock API returned an invalid hero list.");
}

export async function getPlayerRank(accountId: number): Promise<PlayerRank> {
  return request<PlayerRank>(`/v1/players/${accountId}/rank`);
}

export async function getPlayerRanks(accountIds: number[]): Promise<PlayerRankEntry[]> {
  const ids = [...new Set(accountIds.filter((id) => Number.isSafeInteger(id) && id >= 0))];
  if (!ids.length || ids.length > 1000) return [];
  const params = new URLSearchParams({ account_ids: ids.join(",") });
  const result = await request<unknown>(`/v1/players/rank?${params}`);
  if (!Array.isArray(result)) throw new DeadlockApiError("Deadlock API returned invalid player ranks.", 502);
  return result as PlayerRankEntry[];
}

export async function getRankedSeasons(): Promise<RankedSeasonAsset[]> {
  return requestAssetList<RankedSeasonAsset>("/v1/assets/ranked-seasons", "Deadlock API returned invalid ranked seasons.");
}

export async function getPlayerHeroStats(accountId: number): Promise<PlayerHeroStats[]> {
  const params = new URLSearchParams({ account_ids: String(accountId) });
  const result = await request<unknown>(`/v1/players/hero-stats?${params}`);
  if (!Array.isArray(result)) throw new DeadlockApiError("Deadlock API returned invalid hero statistics.", 502);
  return result as PlayerHeroStats[];
}

export async function getRanks(): Promise<RankAsset[]> {
  return requestAssetList<RankAsset>("/v1/assets/ranks", "Deadlock API returned an invalid rank list.");
}

export type HeroMeta = { hero_id: number; bucket: number; wins: number; losses: number; matches: number; matches_per_bucket?: number };
export type HeroAbility = { id?: number; name?: string; description?: { desc?: string | null; active?: string | null; passive?: string | null } | null; image?: string | null; image_webp?: string | null; properties?: Record<string, unknown> | null; upgrades?: unknown; [key: string]: unknown };
export type HeroRecord = { hero: HeroAsset; stat: HeroMeta | null; win: number | null; pick: number | null };

export async function getHeroStats(): Promise<HeroMeta[]> {
  return requestAssetList<HeroMeta>("/v1/analytics/hero-stats?bucket=no_bucket&game_mode=normal&match_mode=ranked%2Cunranked", "Deadlock API returned invalid hero statistics.");
}
export type HeroMatchup = { heroId: number; matches: number; wins: number; winRate: number };
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Parses rows like { hero_id, enemy_hero_id | hero_id1/hero_id2, wins, matches_played | matches } defensively. */
function parseMatchups(rows: unknown[], heroId: number, otherKeys: string[]): HeroMatchup[] {
  const result: HeroMatchup[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const a = num(r.hero_id) ?? num(r.hero_id1);
    const otherKey = otherKeys.find((key) => num(r[key]) !== null);
    const b = otherKey ? num(r[otherKey]) : null;
    const matches = num(r.matches_played) ?? num(r.matches);
    const wins = num(r.wins);
    if (a === null || b === null || matches === null || wins === null || matches <= 0) continue;
    if (a === heroId) result.push({ heroId: b, matches, wins, winRate: (wins / matches) * 100 });
  }
  return result;
}

export async function getHeroCounters(heroId: number): Promise<HeroMatchup[]> {
  const rows = await requestAssetList<unknown>("/v1/analytics/hero-counter-stats?game_mode=normal&match_mode=ranked%2Cunranked", "Deadlock API returned invalid counter statistics.");
  return parseMatchups(rows, heroId, ["enemy_hero_id", "hero_id2"]).filter((row) => row.heroId !== heroId);
}

export async function getHeroSynergies(heroId: number): Promise<HeroMatchup[]> {
  const rows = await requestAssetList<unknown>("/v1/analytics/hero-synergy-stats?game_mode=normal&match_mode=ranked%2Cunranked", "Deadlock API returned invalid synergy statistics.");
  // Synergy rows may list each pair once, so also read the mirrored side.
  const direct = parseMatchups(rows, heroId, ["hero_id2"]);
  const mirrored = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    return num(r.hero_id2) === heroId && num(r.hero_id1) !== null ? [{ ...r, hero_id1: r.hero_id2, hero_id2: r.hero_id1 }] : [];
  });
  const seen = new Set(direct.map((row) => row.heroId));
  return [...direct, ...parseMatchups(mirrored, heroId, ["hero_id2"]).filter((row) => !seen.has(row.heroId))].filter((row) => row.heroId !== heroId);
}

export type HeroRatingFilter = "all" | "0-29" | "30-59" | "60-89" | "90-116";
export async function getHeroStatsForRating(rating: HeroRatingFilter): Promise<HeroMeta[]> {
  const params = new URLSearchParams({ bucket: "no_bucket", game_mode: "normal", match_mode: "ranked,unranked" });
  if (rating !== "all") {
    const [min, max] = rating.split("-");
    params.set("min_average_badge", min);
    params.set("max_average_badge", max);
  }
  return requestAssetList<HeroMeta>(`/v1/analytics/hero-stats?${params}`, "Deadlock API returned invalid hero statistics.");
}
export async function getHeroAbilities(heroId: number, language = "english"): Promise<HeroAbility[]> {
  "use cache";
  cacheLife("minutes");
  return requestAssetList<HeroAbility>("/v1/assets/items/by-hero-id/" + heroId + "?language=" + encodeURIComponent(language), "Deadlock API returned invalid hero abilities.");
}
export async function getHeroCatalog(): Promise<HeroRecord[]> {
  "use cache";
  cacheLife("minutes");
  const [heroes, stats] = await Promise.all([getHeroes(), getHeroStats()]);
  const byId = new Map(stats.filter((row) => Number.isInteger(row.hero_id) && Number.isFinite(row.wins) && Number.isFinite(row.losses) && Number.isFinite(row.matches)).map((row) => [row.hero_id, row]));
  const totalPicks = stats.reduce((sum, row) => sum + (Number.isFinite(row.matches) && row.matches > 0 ? row.matches : 0), 0);
  return heroes.filter((hero) => Number.isInteger(hero.id)).map((hero) => {
    const stat = byId.get(hero.id as number) ?? null;
    const outcomes = stat ? stat.wins + stat.losses : 0;
    return { hero, stat, win: outcomes > 0 ? (stat!.wins / outcomes) * 100 : null, pick: totalPicks > 0 && stat ? (stat.matches / totalPicks) * 100 : null };
  });
}
export type MatchItemEvent = { game_time_s?: number; item_id?: number; sold_time_s?: number; upgrade_id?: number };
export type MatchPlayerDetails = {
  account_id: number; player_slot?: number; team?: number; hero_id?: number;
  kills?: number; deaths?: number; assists?: number; net_worth?: number;
  last_hits?: number; denies?: number; level?: number; player_match_outcome?: number; player_damage?: number; player_damage_taken?: number; player_healing?: number; stats_time_stamp_s?: number;
  items: MatchItemEvent[];
  /** Net worth snapshots during the match (every few minutes), oldest first. */
  net_worth_timeline: Array<{ time_s: number; net_worth: number }>;
};
export type MatchDetails = {
  match_id?: number; start_time?: number; duration_s?: number; winning_team?: number;
  not_scored?: boolean; players: MatchPlayerDetails[];
};
export type MatchListEntry = {
  match_id: number;
  start_time?: number;
  duration_s?: number;
  winning_team?: 0 | 1;
  not_scored?: boolean;
  match_mode?: string;
  game_mode?: string;
  average_badge?: number;
};
export type MatchListFilters = {
  heroId?: number;
  periodDays?: number;
  minDurationS?: number;
  maxDurationS?: number;
  gameMode?: "normal" | "street_brawl";
  matchMode?: "ranked" | "unranked" | "ranked,unranked" | "unranked,private_lobby,coop_bot,ranked,server_test,tutorial,hero_labs";
  direction: "asc" | "desc";
  cursor?: number;
  limit: number;
};
export type MatchItemAsset = { id?: number; name?: string; image?: string | null; image_webp?: string | null; type?: string };
type RawMatchMetadata = { match_info?: Record<string, unknown> & { players?: Array<Record<string, unknown>> } };
function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
export async function getMatchDetails(matchId: string): Promise<MatchDetails> {
  "use cache";
  cacheLife("days");
  const payload = await request<RawMatchMetadata>("/v1/matches/" + matchId + "/metadata", 60_000);
  const info = payload.match_info;
  if (!info || typeof info !== "object") throw new DeadlockApiError("Deadlock API returned invalid match metadata.", 502);
  const players = Array.isArray(info.players) ? info.players.flatMap((player): MatchPlayerDetails[] => {
    const accountId = optionalNumber(player.account_id);
    if (accountId === undefined) return [];
    const items = Array.isArray(player.items) ? player.items.flatMap((entry): MatchItemEvent[] => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const itemId = optionalNumber(item.item_id);
      if (itemId === undefined) return [];
    return [{ item_id: itemId, game_time_s: optionalNumber(item.game_time_s), sold_time_s: optionalNumber(item.sold_time_s), upgrade_id: optionalNumber(item.upgrade_id) }];
    }) : [];
    const snapshots = Array.isArray(player.stats) ? player.stats.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") : [];
    const latest = snapshots.sort((a, b) => (optionalNumber(a.time_stamp_s) ?? -1) - (optionalNumber(b.time_stamp_s) ?? -1)).at(-1);
    const finalStats = player.final_stats && typeof player.final_stats === "object" ? player.final_stats as Record<string, unknown> : undefined;
    return [{
      account_id: accountId, player_slot: optionalNumber(player.player_slot), team: parseTeam(player.team),
      hero_id: optionalNumber(player.hero_id), kills: optionalNumber(player.kills) ?? optionalNumber(finalStats?.kills), deaths: optionalNumber(player.deaths) ?? optionalNumber(finalStats?.deaths),
      assists: optionalNumber(player.assists) ?? optionalNumber(finalStats?.assists), net_worth: optionalNumber(player.net_worth) ?? optionalNumber(finalStats?.net_worth), last_hits: optionalNumber(player.last_hits) ?? optionalNumber(finalStats?.last_hits),
      denies: optionalNumber(player.denies) ?? optionalNumber(finalStats?.denies), level: optionalNumber(player.level) ?? optionalNumber(player.player_level) ?? optionalNumber(finalStats?.level),
      player_match_outcome: optionalNumber(player.player_match_outcome), items,
      net_worth_timeline: snapshots.flatMap((entry) => {
        const time = optionalNumber(entry.time_stamp_s);
        const netWorth = optionalNumber(entry.net_worth);
        return time === undefined || netWorth === undefined ? [] : [{ time_s: time, net_worth: netWorth }];
      }),
      player_damage: optionalNumber(latest?.player_damage) ?? optionalNumber(finalStats?.player_damage) ?? optionalNumber(player.player_damage),
      player_damage_taken: optionalNumber(latest?.player_damage_taken) ?? optionalNumber(finalStats?.player_damage_taken) ?? optionalNumber(player.player_damage_taken),
      player_healing: optionalNumber(latest?.player_healing) ?? optionalNumber(finalStats?.player_healing) ?? optionalNumber(player.player_healing),
      stats_time_stamp_s: optionalNumber(latest?.time_stamp_s) ?? optionalNumber(finalStats?.time_stamp_s),
    }];
  }) : [];
  return {
    match_id: optionalNumber(info.match_id), start_time: parseUnixTime(info.start_time),
    duration_s: optionalNumber(info.duration_s), winning_team: parseTeam(info.winning_team),
    not_scored: typeof info.not_scored === "boolean" ? info.not_scored : undefined, players,
  };
}

function parseUnixTime(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : undefined;
}

function parseTeam(value: unknown): 0 | 1 | undefined {
  if (value === 0 || value === "Team0") return 0;
  if (value === 1 || value === "Team1") return 1;
  return undefined;
}

export async function getMatchList(filters: MatchListFilters): Promise<MatchListEntry[]> {
  const params = new URLSearchParams({
    include_info: "true",
    order_by: "match_id",
    order_direction: filters.direction,
    limit: String(Math.min(Math.max(filters.limit, 1), 100)),
  });
  if (filters.heroId !== undefined) params.set("hero_ids", String(filters.heroId));
  if (filters.periodDays !== undefined) params.set("min_unix_timestamp", String(cacheNowSeconds() - filters.periodDays * 86400));
  if (filters.minDurationS !== undefined) params.set("min_duration_s", String(filters.minDurationS));
  if (filters.maxDurationS !== undefined) params.set("max_duration_s", String(filters.maxDurationS));
  if (filters.gameMode) params.set("game_mode", filters.gameMode);
  params.set("match_mode", filters.matchMode ?? "unranked,private_lobby,coop_bot,ranked,server_test,tutorial,hero_labs");
  if (filters.cursor !== undefined) {
    params.set(filters.direction === "desc" ? "max_match_id" : "min_match_id", String(filters.cursor));
  }

  const payload = await request<unknown>(`/v1/matches/metadata?${params}`, 30_000);
  if (!Array.isArray(payload)) throw new DeadlockApiError("Deadlock API returned an invalid match list.", 502);
  return payload.flatMap((entry): MatchListEntry[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const matchId = optionalNumber(row.match_id);
    if (matchId === undefined || !Number.isSafeInteger(matchId)) return [];
    const winningTeam = parseTeam(row.winning_team);
    const averageBadge = optionalNumber(row.average_badge);
    return [{
      match_id: matchId,
      start_time: parseUnixTime(row.start_time),
      duration_s: optionalNumber(row.duration_s),
      winning_team: winningTeam,
      not_scored: typeof row.not_scored === "boolean" ? row.not_scored : undefined,
      match_mode: typeof row.match_mode === "string" ? row.match_mode : undefined,
      game_mode: typeof row.game_mode === "string" ? row.game_mode : undefined,
      average_badge: averageBadge,
    }];
  });
}
export async function getSteamProfiles(accountIds: number[]): Promise<SteamProfile[]> {
  const ids = [...new Set(accountIds.filter((id) => Number.isSafeInteger(id) && id >= 0))];
  if (!ids.length || ids.length > 1000) return [];
  const params = new URLSearchParams({ account_ids: ids.join(",") });
  const result = await request<unknown>("/v1/players/steam?" + params);
  if (!Array.isArray(result)) throw new DeadlockApiError("Deadlock API returned invalid Steam profiles.", 502);
  return result as SteamProfile[];
}
export async function getMatchItems(): Promise<MatchItemAsset[]> {
  "use cache";
  cacheLife("days");
  return requestAssetList<MatchItemAsset>("/v1/assets/items?language=english", "Deadlock API returned invalid item assets.");
}

export async function getRegionalLeaderboard(region: LeaderboardRegion, heroId?: number, leaderboardId?: number): Promise<OfficialLeaderboardEntry[]> {
  const params = new URLSearchParams();
  if (leaderboardId !== undefined) params.set("leaderboard_id", String(leaderboardId));
  const suffix = heroId === undefined ? "" : `/${heroId}`;
  const result = await request<{ entries?: unknown }>(`/v1/leaderboard/${region}${suffix}${params.size ? `?${params}` : ""}`, 20_000);
  if (!result || !Array.isArray(result.entries)) throw new DeadlockApiError("Deadlock API returned an invalid leaderboard.", 502);
  return result.entries.flatMap((entry): OfficialLeaderboardEntry[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.account_name !== "string" || typeof row.rank !== "number") return [];
    return [{
      account_name: row.account_name,
      rank: row.rank,
      possible_account_ids: Array.isArray(row.possible_account_ids) ? row.possible_account_ids.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id >= 0) : [],
      top_hero_ids: Array.isArray(row.top_hero_ids) ? row.top_hero_ids.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id)) : [],
    }];
  });
}

const PLAYER_SCOREBOARD_FIELDS = ["wins", "losses", "winrate", "avg_kills_per_match", "avg_deaths_per_match", "avg_assists_per_match"] as const;
type PlayerScoreboardField = typeof PLAYER_SCOREBOARD_FIELDS[number];

async function getPlayerScoreboardField(accountIds: number[], field: PlayerScoreboardField, period: "30d" | "90d" | "all", heroId?: number): Promise<PlayerScoreboardMetric[]> {
  const params = new URLSearchParams({ sort_by: field, sort_direction: "desc", account_ids: accountIds.join(","), game_mode: "normal", match_mode: "ranked,unranked", min_matches: "1", limit: "1000" });
  if (period !== "all") params.set("min_unix_timestamp", String(cacheNowSeconds() - (period === "30d" ? 30 : 90) * 86400));
  if (heroId !== undefined) params.set("hero_id", String(heroId));
  const result = await request<unknown>(`/v1/analytics/scoreboards/players?${params}`, 20_000);
  if (!Array.isArray(result)) throw new DeadlockApiError("Deadlock API returned invalid player scoreboard statistics.", 502);
  return result as PlayerScoreboardMetric[];
}

async function getPlayerScoreboardStats(accountIds: number[], period: "30d" | "90d" | "all", heroId?: number): Promise<Map<number, LeaderboardPlayerStats>> {
  if (!accountIds.length) return new Map();
  const fieldResults = await Promise.allSettled(PLAYER_SCOREBOARD_FIELDS.map((field) => getPlayerScoreboardField(accountIds, field, period, heroId)));
  const result = new Map<number, LeaderboardPlayerStats>();
  fieldResults.forEach((fieldResult, index) => {
    if (fieldResult.status !== "fulfilled") return;
    const field = PLAYER_SCOREBOARD_FIELDS[index];
    for (const row of fieldResult.value) {
      if (!Number.isSafeInteger(row.account_id) || !Number.isFinite(row.value)) continue;
      const current = result.get(row.account_id) ?? { matches: null, wins: null, losses: null, winRate: null, kills: null, deaths: null, assists: null };
      if (field === "wins") current.wins = row.value;
      if (field === "losses") current.losses = row.value;
      if (field === "winrate") { current.matches = row.matches; current.winRate = row.value <= 1 ? row.value * 100 : row.value; }
      if (field === "avg_kills_per_match") current.kills = row.value;
      if (field === "avg_deaths_per_match") current.deaths = row.value;
      if (field === "avg_assists_per_match") current.assists = row.value;
      result.set(row.account_id, current);
    }
  });
  return result;
}

async function getSteamProfilesChunked(accountIds: number[]): Promise<SteamProfile[]> {
  const ids = [...new Set(accountIds.filter((id) => Number.isSafeInteger(id) && id >= 0))];
  const chunks: number[][] = [];
  for (let index = 0; index < ids.length; index += 400) chunks.push(ids.slice(index, index + 400));
  const results = await Promise.allSettled(chunks.map((chunk) => getSteamProfiles(chunk)));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function getLeaderboardPlayers(options: { region: LeaderboardRegion; heroId?: number; leaderboardId?: number; period: "30d" | "90d" | "all" }): Promise<LeaderboardPlayer[]> {
  const entries = await getRegionalLeaderboard(options.region, options.heroId, options.leaderboardId);

  // Entries can list several possible accounts for one name. Load all candidates' Steam profiles and
  // keep the one whose Steam name matches the leaderboard name exactly (only if that is unambiguous).
  const candidateIds = [...new Set(entries.flatMap((entry) => entry.possible_account_ids))].slice(0, 1600);
  const profileList = await getSteamProfilesChunked(candidateIds).catch(() => [] as SteamProfile[]);
  const profilesById = new Map(profileList.flatMap((profile) => typeof profile.account_id === "number" ? [[profile.account_id, profile] as const] : []));
  const norm = (value: string | undefined | null) => (value ?? "").normalize("NFKC").trim().toLocaleLowerCase();
  const resolveAccount = (entry: OfficialLeaderboardEntry): number | null => {
    if (entry.possible_account_ids.length === 1) return entry.possible_account_ids[0];
    // Several candidates: take the one whose Steam name matches the leaderboard name (first one if several do).
    return entry.possible_account_ids.find((id) => norm(profilesById.get(id)?.personaname) === norm(entry.account_name)) ?? null;
  };
  const resolved = entries.map((entry): { entry: OfficialLeaderboardEntry; accountId: number | null } => ({ entry, accountId: resolveAccount(entry) }));

  // Still unresolved (no candidates, or none matched): look the name up with player search, best 40 places first.
  const unresolved = resolved.filter((row) => row.accountId === null).slice(0, 40);
  for (let index = 0; index < unresolved.length; index += 8) {
    const batch = unresolved.slice(index, index + 8);
    const found = await Promise.allSettled(batch.map((row) => searchPlayers(row.entry.account_name)));
    batch.forEach((row, position) => {
      const result = found[position];
      if (result.status !== "fulfilled") return;
      const exact = result.value.filter((profile) => typeof profile.account_id === "number" && norm(profile.personaname) === norm(row.entry.account_name));
      const preferred = exact.filter((profile) => row.entry.possible_account_ids.includes(profile.account_id as number));
      const pool = preferred.length ? preferred : exact;
      const best = [...pool].sort((left, right) => ((right as { matches_played_last_30d?: number }).matches_played_last_30d ?? 0) - ((left as { matches_played_last_30d?: number }).matches_played_last_30d ?? 0))[0];
      if (best && typeof best.account_id === "number") {
        row.accountId = best.account_id;
        profilesById.set(best.account_id, best);
      }
    });
  }
  const accountIds = [...new Set(resolved.flatMap(({ accountId }) => accountId === null ? [] : [accountId]))];

  const [rankResult, rankAssetsResult, statsResult] = await Promise.allSettled([
    getPlayerRanks(accountIds), getRanks(), getPlayerScoreboardStats(accountIds, options.period, options.heroId),
  ]);
  const ranksById = new Map(rankResult.status === "fulfilled" ? rankResult.value.map((rank) => [rank.account_id, rank]) : []);
  const rankAssets = rankAssetsResult.status === "fulfilled" ? rankAssetsResult.value : [];
  const statsById = statsResult.status === "fulfilled" ? statsResult.value : new Map<number, LeaderboardPlayerStats>();
  return resolved.map(({ entry, accountId }) => {
    const profile = accountId === null ? undefined : profilesById.get(accountId);
    const currentRank = accountId === null ? undefined : ranksById.get(accountId);
    const rankAsset = typeof currentRank?.rank === "number" ? rankAssets.find((asset) => asset.tier === currentRank.rank) : undefined;
    return {
      place: entry.rank, name: entry.account_name, accountId,
      avatar: profile?.avatarfull || profile?.avatar || null,
      rank: typeof currentRank?.rank === "number" ? rankAsset?.name || `Tier ${currentRank.rank}` : null,
      rankTier: typeof currentRank?.rank === "number" ? currentRank.rank : null,
      rankSubrank: typeof currentRank?.subrank === "number" ? currentRank.subrank : null,
      rankImage: rankAsset?.images?.small_webp || rankAsset?.images?.small || null,
      topHeroIds: entry.top_hero_ids,
      stats: accountId === null ? null : statsById.get(accountId) ?? null,
    };
  });
}
