import "server-only";
import { cacheLife } from "next/cache";

const API_BASE = "https://api.deadlock-api.com";
const REQUEST_TIMEOUT_MS = 12_000;
const ASSET_CACHE_MS = 5 * 60 * 1000;
const assetCache = new Map<string, { expiresAt: number; value: unknown }>();

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
};

export type HeroAsset = { id?: number; name?: string; description?: { lore?: string | null; playstyle?: string | null; role?: string | null } | null; images?: { icon_image_small?: string | null; icon_image_small_webp?: string | null; background_image?: string | null; background_image_webp?: string | null; hero_card_critical?: string | null } | null; in_development?: boolean; limited_testing?: boolean; [key: string]: unknown };
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

export class DeadlockApiError extends Error {
  constructor(message: string, public status: number, public retryAfter?: string) {
    super(message);
    this.name = "DeadlockApiError";
  }
}

async function request<T>(path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
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

async function requestAssetList<T>(path: string, errorMessage: string): Promise<T[]> {
  const cached = assetCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T[];
  const result = await request<unknown>(path);
  if (!Array.isArray(result)) throw new DeadlockApiError(errorMessage, 502);
  assetCache.set(path, { expiresAt: Date.now() + ASSET_CACHE_MS, value: result });
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
  "use cache";
  cacheLife("days");
  return requestAssetList<HeroAsset>("/v1/assets/heroes?language=english&only_active=true", "Deadlock API returned an invalid hero list.");
}

export async function getPlayerRank(accountId: number): Promise<PlayerRank> {
  return request<PlayerRank>(`/v1/players/${accountId}/rank`);
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
export type HeroAbility = { id?: number; name?: string; description?: { desc?: string | null; active?: string | null; passive?: string | null } | null; image?: string | null; image_webp?: string | null };
export type HeroRecord = { hero: HeroAsset; stat: HeroMeta | null; win: number | null; pick: number | null };

export async function getHeroStats(): Promise<HeroMeta[]> {
  return requestAssetList<HeroMeta>("/v1/analytics/hero-stats?bucket=no_bucket&game_mode=normal&match_mode=ranked%2Cunranked", "Deadlock API returned invalid hero statistics.");
}
export async function getHeroAbilities(heroId: number): Promise<HeroAbility[]> {
  "use cache";
  cacheLife("minutes");
  return requestAssetList<HeroAbility>("/v1/assets/items/by-hero-id/" + heroId + "?language=english", "Deadlock API returned invalid hero abilities.");
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
};
export type MatchDetails = {
  match_id?: number; start_time?: number; duration_s?: number; winning_team?: number;
  not_scored?: boolean; players: MatchPlayerDetails[];
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
    return [{
      account_id: accountId, player_slot: optionalNumber(player.player_slot), team: optionalNumber(player.team),
      hero_id: optionalNumber(player.hero_id), kills: optionalNumber(player.kills), deaths: optionalNumber(player.deaths),
      assists: optionalNumber(player.assists), net_worth: optionalNumber(player.net_worth), last_hits: optionalNumber(player.last_hits),
      denies: optionalNumber(player.denies), level: optionalNumber(player.level),
      player_match_outcome: optionalNumber(player.player_match_outcome), items,
      player_damage: optionalNumber(latest?.player_damage), player_damage_taken: optionalNumber(latest?.player_damage_taken),
      player_healing: optionalNumber(latest?.player_healing), stats_time_stamp_s: optionalNumber(latest?.time_stamp_s),
    }];
  }) : [];
  return {
    match_id: optionalNumber(info.match_id), start_time: optionalNumber(info.start_time),
    duration_s: optionalNumber(info.duration_s), winning_team: optionalNumber(info.winning_team),
    not_scored: typeof info.not_scored === "boolean" ? info.not_scored : undefined, players,
  };
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