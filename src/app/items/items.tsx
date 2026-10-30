"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HeroAsset } from "../../lib/deadlock-api";
import type { ItemAnalytics, ItemAnalyticsFilters, ItemAsset, ItemFlowView } from "../../lib/items-api";

const initialFilters: ItemAnalyticsFilters = { period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" };
type AnalyticsPayload = { stats: Record<string, ItemAnalytics>; playerMatches: number; heroScope: number | null };
type Props = { assets: ItemAsset[]; heroes: HeroAsset[]; initialHeroId: number | null };

export default function Items({ assets, heroes, initialHeroId }: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [heroId, setHeroId] = useState(initialHeroId === null ? "all" : String(initialHeroId));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [flow, setFlow] = useState<ItemFlowView[]>([]);
  const [loading, setLoading] = useState(true);
  const [flowLoading, setFlowLoading] = useState(true);
  const [error, setError] = useState("");
  const [flowError, setFlowError] = useState("");
  const heroFilter = heroId === "all" ? "" : heroId;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ ...filters, ...(heroFilter ? { heroId: heroFilter } : {}) });
    fetch("/api/items?" + query, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load item statistics."); return data as AnalyticsPayload; })
      .then(setAnalytics)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load item statistics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, heroFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ ...filters, ...(heroFilter ? { heroId: heroFilter } : {}) });
    fetch("/api/items/flow?" + query, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load item purchase flows."); return data as { flows: ItemFlowView[] }; })
      .then((data) => setFlow(data.flows))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setFlowError(reason instanceof Error ? reason.message : "Could not load item purchase flows."); })
      .finally(() => { if (!controller.signal.aborted) setFlowLoading(false); });
    return () => controller.abort();
  }, [filters, heroFilter]);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const result = assets.filter((item) => (category === "all" || item.item_slot_type === category) && (!term || item.name.toLocaleLowerCase().includes(term) || item.class_name.toLocaleLowerCase().includes(term)));
    return result.sort((left, right) => {
      const a = analytics?.stats[String(left.id)];
      const b = analytics?.stats[String(right.id)];
      if (sort === "winrate") return (b?.winRate ?? -1) - (a?.winRate ?? -1);
      if (sort === "cost") return (left.cost ?? Number.MAX_SAFE_INTEGER) - (right.cost ?? Number.MAX_SAFE_INTEGER);
      return (b?.matches ?? -1) - (a?.matches ?? -1);
    });
  }, [assets, analytics, category, search, sort]);
  const updateFilter = (key: keyof ItemAnalyticsFilters, value: string) => { setLoading(true); setFlowLoading(true); setError(""); setFlowError(""); setFilters((current) => ({ ...current, [key]: value, ...(key === "gameMode" && value === "street_brawl" ? { rating: "all" } : {}) })); };
  const updateHero = (value: string) => { setLoading(true); setFlowLoading(true); setError(""); setFlowError(""); setHeroId(value); };
  const num = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
  const pct = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
  const phase = (column: number) => filters.gameMode === "street_brawl" ? `Round ${column + 1} → ${column + 2}` : ["0–9 min → 9–20 min", "9–20 min → 20–30 min", "20–30 min → 30+ min"][column] ?? `Phase ${column + 1} → ${column + 2}`;

  return <main className="content-inner items-page">
    <div className="page-heading"><div><p className="eyebrow">ITEM DATABASE / LIVE API DATA</p><h1>Items<span>.</span></h1><p className="muted">Browse shop assets and compare purchases across real match data.</p></div><Link className="refresh-button" href="/builds">Community builds ↗</Link></div>
    <div className="items-filters">
      <label className="items-search"><span>SEARCH ITEMS</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Item name…" aria-label="Search items" /></label>
      <label><span>CATEGORY</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All item categories</option><option value="weapon">Weapon</option><option value="spirit">Spirit</option><option value="vitality">Vitality</option></select></label>
      <label><span>PERIOD</span><select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All available</option></select></label>
      <label><span>GAME MODE</span><select value={filters.gameMode} onChange={(event) => updateFilter("gameMode", event.target.value)}><option value="normal">Normal</option><option value="street_brawl">Street Brawl</option></select></label>
      <label><span>MATCH TYPE</span><select value={filters.matchMode} onChange={(event) => updateFilter("matchMode", event.target.value)}><option value="ranked,unranked">Ranked + unranked</option><option value="ranked">Ranked</option><option value="unranked">Unranked</option></select></label>
      <label><span>RATING</span><select value={filters.rating} onChange={(event) => updateFilter("rating", event.target.value)} disabled={filters.gameMode === "street_brawl"}><option value="all">{filters.gameMode === "street_brawl" ? "Unavailable in this mode" : "All ratings"}</option><option value="0-29">Badge 0–29</option><option value="30-59">Badge 30–59</option><option value="60-89">Badge 60–89</option><option value="90-116">Badge 90–116</option></select></label>
      <label><span>HERO</span><select value={heroId} onChange={(event) => updateHero(event.target.value)}><option value="all">All heroes</option>{heroes.map((hero) => typeof hero.id === "number" ? <option value={hero.id} key={hero.id}>{hero.name || `Hero ${hero.id}`}</option> : null)}</select></label>
      <label><span>SORT BY</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Player picks</option><option value="winrate">Win rate</option><option value="cost">Cost</option></select></label>
    </div>
    {heroId !== "all" && <p className="items-scope-note">Showing item data for {heroes.find((hero) => String(hero.id) === heroId)?.name || `hero ${heroId}`}.</p>}
    {loading && <div className="items-skeleton" role="status" aria-label="Loading item analytics" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} />)}</div>}
    {error && <p className="api-message error-message" role="alert">Item analytics unavailable. {error}</p>}
    {!loading && !error && filteredAssets.length > 0 && <div className="items-grid">{filteredAssets.map((item) => {
      const stat = analytics?.stats[String(item.id)];
      const art = item.image_webp || item.image;
      return <Link className="item-card" href={`/items/${item.id}`} key={item.id}>
        <span className="item-card-art" aria-hidden="true" style={art ? { backgroundImage: `url("${art}")` } : undefined}>{!art && <i />}</span>
        <span className="item-card-content"><span className="item-card-meta"><span>{item.item_slot_type || "ITEM"} / T{item.item_tier ?? "—"}</span><b>{typeof item.cost === "number" ? `${item.cost.toLocaleString()} souls` : "Cost unavailable"}</b></span><strong>{item.name}</strong>
          {item.description?.desc && <span className="item-card-description">{plainText(item.description.desc)}</span>}
          {loading ? <span className="item-card-stat-state">Loading selected sample…</span> : stat ? <span className="item-card-stats"><span><small>PLAYER PICKS</small><b>{num(stat.matches)}</b></span><span><small>PICK RATE</small><b>{pct(stat.pickRate)}</b></span><span><small>WIN RATE</small><b>{pct(stat.winRate)}</b></span></span> : <span className="item-card-stat-state">No purchase statistics in this selection.</span>}
        </span>
      </Link>;
    })}</div>}
    {!loading && !error && filteredAssets.length === 0 && <p className="api-message">No items match this search and category.</p>}
    {!loading && analytics && <p className="items-data-note">Pick rate = item player-matches / player-matches across the selected hero sample ({num(analytics.playerMatches)}). Win rate = wins / (wins + losses). Missing item rows mean the API returned no purchase sample.</p>}
    <section className="panel item-flow-panel"><div className="panel-heading"><div><p className="eyebrow">MATCH PURCHASE HISTORY</p><h2>Observed item transitions</h2></div><span className="live-tag">API ITEM FLOW</span></div>
      <p className="item-flow-intro">These transitions aggregate real players who bought items across adjacent match phases; they are not prescriptive builds.</p>
      {flowLoading && <p className="profile-note" role="status">Loading item flow…</p>}{flowError && <p className="profile-note error-message" role="alert">Item flow unavailable. {flowError}</p>}
      {!flowLoading && !flowError && flow.length > 0 && <div className="item-flow-list">{flow.map((entry, index) => <div className="item-flow-row" key={`${entry.fromItem?.id}-${entry.toItem?.id}-${entry.fromColumn}-${index}`}><span className="item-flow-phase">{phase(entry.fromColumn)}</span><span className="item-flow-transition"><Link href={entry.fromItem ? `/items/${entry.fromItem.id}` : "/items"}>{entry.fromItem?.name || "Item unavailable"}</Link><b aria-hidden="true">→</b><Link href={entry.toItem ? `/items/${entry.toItem.id}` : "/items"}>{entry.toItem?.name || "Item unavailable"}</Link></span><span className="item-flow-count">{num(entry.matches)} player matches <small>{pct(entry.winRate)} win rate</small></span></div>)}</div>}
      {!flowLoading && !flowError && flow.length === 0 && <p className="profile-note">No item transitions were returned for these filters.</p>}
    </section>
    <div className="items-footer-links"><Link href="/heroes">Explore hero analytics ↗</Link><Link href="/matches">Explore matches ↗</Link></div>
    <footer><span>DEADLOCK INTELLIGENCE · ITEM DATA</span><span>Source: Deadlock API <i /></span></footer>
  </main>;
}

function plainText(value: string) { return value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim(); }
