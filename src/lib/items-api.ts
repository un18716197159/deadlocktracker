import "server-only";
import { cacheLife } from "next/cache";
import { getHeroes, type HeroAsset } from "./deadlock-api";

const API = "https://api.deadlock-api.com/v1";
const DAY = 86400;

export type ItemSlotType = "weapon" | "spirit" | "vitality";
export type ItemProperty = { value?: string | number | null; label?: string | null; prefix?: string | null; postfix?: string | null; display_units?: string | null };
export type ItemAsset = {
  id: number;
  class_name: string;
  name: string;
  type: "ability" | "weapon" | "upgrade";
  item_slot_type?: ItemSlotType;
  item_tier?: number;
  cost?: number | null;
  shopable?: boolean;
  image?: string | null;
  image_webp?: string | null;
  description?: { desc?: string | null } | null;
  properties?: Record<string, ItemProperty | null> | null;
  is_active_item?: boolean;
  heroes?: number[] | null;
};
export type ItemAnalyticsFilters = {
  period: "7d" | "30d" | "90d" | "all";
  gameMode: "normal" | "street_brawl";
  matchMode: "ranked,unranked" | "ranked" | "unranked";
  rating: "all" | "0-29" | "30-59" | "60-89" | "90-116";
};
export type ItemStat = { item_id: number; bucket: number; wins: number; losses: number; matches: number; players: number; avg_buy_time_s: number; avg_sell_time_s: number; avg_buy_time_relative: number; avg_sell_time_relative: number; sold?: number };
export type ItemAnalytics = { matches: number; players: number; wins: number; losses: number; winRate: number | null; pickRate: number | null; avgBuyTimeS: number | null; avgSellTimeS: number | null; sold: number | null };
export type ItemAnalyticsResponse = { stats: Record<string, ItemAnalytics>; playerMatches: number; heroScope: number | null };
export type ItemHeroStat = { hero: HeroAsset; matches: number; players: number; wins: number; losses: number; winRate: number | null; pickRate: number | null };
export type ItemFlowEdge = { from_column: number; from_item_id: number; to_item_id: number; wins: number; losses: number; matches: number };
export type ItemFlowView = { fromColumn: number; fromItem: Pick<ItemAsset, "id" | "name" | "image" | "image_webp"> | null; toItem: Pick<ItemAsset, "id" | "name" | "image" | "image_webp"> | null; wins: number; losses: number; matches: number; winRate: number | null };
export type BuildMod = { ability_id: number; annotation?: string | null; required_flex_slots?: number | null; sell_priority?: number | null; imbue_target_ability_id?: number | null };
export type BuildCategory = { name: string; description?: string | null; mods?: BuildMod[] | null };
export type HeroBuild = { hero_id: number; hero_build_id: number; author_account_id: number; name: string; description?: string | null; version: number; publish_timestamp?: number | null; last_updated_timestamp?: number | null; tags?: number[]; details: { mod_categories: BuildCategory[] } };
export type CommunityBuild = { hero_build: HeroBuild; num_favorites?: number | null; num_weekly_favorites?: number | null; num_ignores?: number | null; num_reports?: number | null; rollup_category?: number | null };
export type BuildView = { build: CommunityBuild; hero: HeroAsset | null; categories: Array<{ name: string; description?: string | null; items: Array<{ item: ItemAsset | null; annotation?: string | null; requiredFlexSlots?: number | null; sellPriority?: number | null }> }> };

async function requestJson<T>(path: string, timeout = 20_000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { cache: "no-store", signal: AbortSignal.timeout(timeout), headers: { Accept: "application/json" } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("Deadlock API timed out. Please try again.");
    throw new Error("Could not connect to Deadlock API.");
  }
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    throw new Error(`Deadlock API request failed (${response.status})${retry ? `. Retry after ${retry} seconds` : ""}.`);
  }
  try { return await response.json() as T; } catch { throw new Error("Deadlock API returned invalid JSON."); }
}

function filtersQuery(filters: ItemAnalyticsFilters, bucket: string, heroId?: number) {
  const params = new URLSearchParams({ bucket, game_mode: filters.gameMode, match_mode: filters.matchMode });
  const days = filters.period === "7d" ? 7 : filters.period === "30d" ? 30 : filters.period === "90d" ? 90 : 0;
  params.set("min_unix_timestamp", String(days ? Math.floor(Date.now() / 1000) - days * DAY : 0));
  if (filters.rating !== "all" && filters.gameMode !== "street_brawl") {
    const [min, max] = filters.rating.split("-");
    params.set("min_average_badge", min);
    params.set("max_average_badge", max);
  }
  if (heroId !== undefined) params.set("hero_ids", String(heroId));
  return params;
}

export async function getAllItemAssets(): Promise<ItemAsset[]> {
  "use cache";
  cacheLife("days");
  const result = await requestJson<unknown>("/assets/items?language=english");
  if (!Array.isArray(result)) throw new Error("Deadlock API returned an invalid item catalog.");
  return (result as ItemAsset[]).filter((item) => Number.isSafeInteger(item.id) && typeof item.name === "string");
}

export async function getItemAssets(): Promise<ItemAsset[]> {
  return (await getAllItemAssets()).filter((item) => item.type === "upgrade" && item.shopable === true);
}

export async function getItemAsset(itemId: number): Promise<ItemAsset | undefined> {
  return (await getAllItemAssets()).find((item) => item.id === itemId);
}

export async function getItemAnalytics(filters: ItemAnalyticsFilters, heroId?: number): Promise<ItemAnalyticsResponse> {
  const params = filtersQuery(filters, "no_bucket", heroId);
  params.set("min_matches", "1");
  const heroParams = filtersQuery(filters, "no_bucket", heroId);
  const [items, heroes] = await Promise.all([
    requestJson<ItemStat[]>(`/analytics/item-stats?${params}`),
    requestJson<Array<{ hero_id: number; matches: number }>>(`/analytics/hero-stats?${heroParams}`),
  ]);
  const playerMatches = heroes.reduce((sum, hero) => sum + (Number.isFinite(hero.matches) ? hero.matches : 0), 0);
  const stats: Record<string, ItemAnalytics> = {};
  for (const row of items) {
    const scored = row.wins + row.losses;
    stats[String(row.item_id)] = {
      matches: row.matches,
      players: row.players,
      wins: row.wins,
      losses: row.losses,
      winRate: scored > 0 ? row.wins / scored * 100 : null,
      pickRate: playerMatches > 0 ? row.matches / playerMatches * 100 : null,
      avgBuyTimeS: Number.isFinite(row.avg_buy_time_s) ? row.avg_buy_time_s : null,
      avgSellTimeS: Number.isFinite(row.avg_sell_time_s) ? row.avg_sell_time_s : null,
      sold: Number.isFinite(row.sold) ? row.sold ?? null : null,
    };
  }
  return { stats, playerMatches, heroScope: heroId ?? null };
}

export async function getItemHeroAnalytics(itemId: number, filters: ItemAnalyticsFilters): Promise<ItemHeroStat[]> {
  const itemParams = filtersQuery(filters, "hero");
  itemParams.set("include_item_ids", String(itemId));
  itemParams.set("min_matches", "1");
  const heroParams = filtersQuery(filters, "no_bucket");
  const [itemRows, heroRows, heroAssets] = await Promise.all([
    requestJson<ItemStat[]>(`/analytics/item-stats?${itemParams}`),
    requestJson<Array<{ hero_id: number; matches: number }>>(`/analytics/hero-stats?${heroParams}`),
    getHeroes(),
  ]);
  const heroById = new Map(heroAssets.flatMap((hero) => typeof hero.id === "number" ? [[hero.id, hero] as const] : []));
  const matchesByHero = new Map(heroRows.map((hero) => [hero.hero_id, hero.matches]));
  return itemRows.filter((row) => row.item_id === itemId).flatMap((row) => {
    const hero = heroById.get(row.bucket);
    if (!hero) return [];
    const scored = row.wins + row.losses;
    const denominator = matchesByHero.get(row.bucket) ?? 0;
    return [{ hero, matches: row.matches, players: row.players, wins: row.wins, losses: row.losses, winRate: scored > 0 ? row.wins / scored * 100 : null, pickRate: denominator > 0 ? row.matches / denominator * 100 : null }];
  }).sort((a, b) => b.matches - a.matches);
}

export async function getItemFlow(filters: ItemAnalyticsFilters, heroId?: number): Promise<ItemFlowView[]> {
  const params = filtersQuery(filters, "no_bucket", heroId);
  params.set("min_matches", "20");
  const [flow, items] = await Promise.all([
    requestJson<{ edges: ItemFlowEdge[] }>(`/analytics/item-flow-stats?${params}`, 30_000),
    getItemAssets(),
  ]);
  const byId = new Map(items.map((item) => [item.id, item]));
  return (Array.isArray(flow.edges) ? flow.edges : []).filter((edge) => Number.isFinite(edge.matches) && edge.matches > 0)
    .sort((a, b) => b.matches - a.matches).slice(0, 16).map((edge) => {
      const from = byId.get(edge.from_item_id);
      const to = byId.get(edge.to_item_id);
      const scored = edge.wins + edge.losses;
      return {
        fromColumn: edge.from_column,
        fromItem: from ? { id: from.id, name: from.name, image: from.image, image_webp: from.image_webp } : null,
        toItem: to ? { id: to.id, name: to.name, image: to.image, image_webp: to.image_webp } : null,
        wins: edge.wins, losses: edge.losses, matches: edge.matches,
        winRate: scored > 0 ? edge.wins / scored * 100 : null,
      };
    });
}

export async function getCommunityBuilds(options: { start?: number; limit?: number; sort?: "weekly_favorites" | "favorites" | "updated_at"; heroId?: number; query?: string } = {}): Promise<BuildView[]> {
  const params = new URLSearchParams({ start: String(options.start ?? 0), limit: String(Math.min(Math.max(options.limit ?? 18, 1), 50)), sort_by: options.sort ?? "weekly_favorites", sort_direction: "desc", only_latest: "true", build_language: "English" });
  if (options.heroId !== undefined) params.set("hero_id", String(options.heroId));
  if (options.query?.trim()) params.set("search_name", options.query.trim().slice(0, 80));
  const [builds, heroes, items] = await Promise.all([
    requestJson<CommunityBuild[]>(`/builds?${params}`), getHeroes(), getItemAssets(),
  ]);
  const heroById = new Map(heroes.flatMap((hero) => typeof hero.id === "number" ? [[hero.id, hero] as const] : []));
  const itemById = new Map(items.map((item) => [item.id, item]));
  return builds.map((build) => ({
    build,
    hero: heroById.get(build.hero_build.hero_id) ?? null,
    categories: (build.hero_build.details?.mod_categories ?? []).map((category) => ({
      name: category.name,
      description: category.description,
      items: (category.mods ?? []).map((mod) => ({ item: itemById.get(mod.ability_id) ?? null, annotation: mod.annotation, requiredFlexSlots: mod.required_flex_slots, sellPriority: mod.sell_priority })),
    })),
  }));
}

export async function getCommunityBuild(heroId: number, buildId: number): Promise<BuildView> {
  const [build, heroes, items] = await Promise.all([
    requestJson<CommunityBuild>(`/builds/${heroId}/${buildId}`), getHeroes(), getItemAssets(),
  ]);
  const hero = heroes.find((entry) => entry.id === heroId) ?? null;
  const itemById = new Map(items.map((item) => [item.id, item]));
  return {
    build,
    hero,
    categories: (build.hero_build.details?.mod_categories ?? []).map((category) => ({
      name: category.name,
      description: category.description,
      items: (category.mods ?? []).map((mod) => ({ item: itemById.get(mod.ability_id) ?? null, annotation: mod.annotation, requiredFlexSlots: mod.required_flex_slots, sellPriority: mod.sell_priority })),
    })),
  };
}

