"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HeroAsset } from "../../lib/deadlock-api";
import type { ItemAnalytics, ItemAnalyticsFilters, ItemAsset, ItemFlowView } from "../../lib/items-api";
import ItemArt from "../components/item-art";
import { L, useI18n } from "../../lib/i18n/provider";

const initialFilters: ItemAnalyticsFilters = { period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" };
type AnalyticsPayload = { stats: Record<string, ItemAnalytics>; playerMatches: number; heroScope: number | null; periodUsed?: string };
type Props = { assets: ItemAsset[]; heroes: HeroAsset[]; initialHeroId: number | null };

export default function Items({ assets, heroes, initialHeroId }: Props) {
  const { p } = useI18n();
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
  const phase = (column: number) => filters.gameMode === "street_brawl" ? p("Round {a} → {b}", { a: column + 1, b: column + 2 }) : [p("0–9 min → 9–20 min"), p("9–20 min → 20–30 min"), p("20–30 min → 30+ min")][column] ?? p("Phase {a} → {b}", { a: column + 1, b: column + 2 });

  return <main className="content-inner items-page">
    <div className="page-heading"><div><h1><L>Items</L><span>.</span></h1><p className="muted"><L>Every shop item with its win rate and pick rate.</L></p></div><Link className="refresh-button" href="/builds"><L>Community builds ↗</L></Link></div>
    <div className="items-filters">
      <label className="items-search"><span><L>SEARCH ITEMS</L></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={p("Item name…")} aria-label={p("Search items")} /></label>
      <label><span><L>CATEGORY</L></span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{p("All item categories")}</option><option value="weapon">{p("Weapon")}</option><option value="spirit">{p("Spirit")}</option><option value="vitality">{p("Vitality")}</option></select></label>
      <label><span><L>PERIOD</L></span><select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}><option value="7d">{p("7 days")}</option><option value="30d">{p("30 days")}</option><option value="90d">{p("90 days")}</option><option value="all">{p("All available")}</option></select></label>
      <label><span><L>GAME MODE</L></span><select value={filters.gameMode} onChange={(event) => updateFilter("gameMode", event.target.value)}><option value="normal">{p("Normal")}</option><option value="street_brawl">{p("Street Brawl")}</option></select></label>
      <label><span><L>MATCH TYPE</L></span><select value={filters.matchMode} onChange={(event) => updateFilter("matchMode", event.target.value)}><option value="ranked,unranked">{p("Ranked + unranked")}</option><option value="ranked">{p("Ranked")}</option><option value="unranked">{p("Unranked")}</option></select></label>
      <label><span><L>RATING</L></span><select value={filters.rating} onChange={(event) => updateFilter("rating", event.target.value)} disabled={filters.gameMode === "street_brawl"}><option value="all">{filters.gameMode === "street_brawl" ? p("Unavailable in this mode") : p("All ratings")}</option><option value="0-29">{p("Badge 0–29")}</option><option value="30-59">{p("Badge 30–59")}</option><option value="60-89">{p("Badge 60–89")}</option><option value="90-116">{p("Badge 90–116")}</option></select></label>
      <label><span><L>HERO</L></span><select value={heroId} onChange={(event) => updateHero(event.target.value)}><option value="all">{p("All heroes")}</option>{heroes.map((hero) => typeof hero.id === "number" ? <option value={hero.id} key={hero.id}>{hero.name || `Hero ${hero.id}`}</option> : null)}</select></label>
      <label><span><L>SORT BY</L></span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">{p("Player picks")}</option><option value="winrate">{p("Win rate")}</option><option value="cost">{p("Cost")}</option></select></label>
    </div>
    {heroId !== "all" && <p className="items-scope-note">Showing item data for {heroes.find((hero) => String(hero.id) === heroId)?.name || `hero ${heroId}`}.</p>}
    {loading && <div className="items-skeleton" role="status" aria-label="Loading item analytics" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} />)}</div>}
    {error && <p className="api-message error-message" role="alert">{p("Item analytics unavailable.")} {error}</p>}
    {!error && analytics?.periodUsed && analytics.periodUsed !== filters.period && <p className="api-message" role="status">{p("The Deadlock API is busy with this period right now, so the last 7 days are shown.")}</p>}
    {!loading && !error && filteredAssets.length > 0 && <div className="items-grid">{filteredAssets.map((item) => {
      const stat = analytics?.stats[String(item.id)];
      return <Link className="item-card" data-slot={item.item_slot_type} href={`/items/${item.id}`} key={item.id}>
        <span className="item-card-art" aria-hidden="true" data-tier={item.item_tier ?? undefined}><ItemArt item={item} /></span>
        <span className="item-card-content"><span className="item-card-meta"><span>{item.item_slot_type || "ITEM"} / T{item.item_tier ?? "—"}</span><b>{typeof item.cost === "number" ? `${item.cost.toLocaleString()} souls` : "Cost unavailable"}</b></span><strong>{item.name}</strong>
          <span className="item-card-description">{item.description?.desc ? plainText(item.description.desc) : ""}</span>
          {loading ? <span className="item-card-stat-state"><L>Loading…</L></span> : stat ? <span className="item-card-stats"><span><small><L>PLAYER PICKS</L></small><b>{num(stat.matches)}</b></span><span><small><L>PICK RATE</L></small><b>{pct(stat.pickRate)}</b></span><span><small><L>WIN RATE</L></small><b>{pct(stat.winRate)}</b></span></span> : <span className="item-card-stat-state"><L>No purchase statistics in this selection.</L></span>}
        </span>
      </Link>;
    })}</div>}
    {!loading && !error && filteredAssets.length === 0 && <p className="api-message"><L>No items match this search and category.</L></p>}
    
    <section className="panel item-flow-panel"><div className="panel-heading"><div><h2><L>What players buy next</L></h2></div></div>
      {flowLoading && <p className="profile-note" role="status"><L>Loading item flow…</L></p>}{flowError && <p className="profile-note error-message" role="alert">Item flow unavailable. {flowError}</p>}
      {!flowLoading && !flowError && flow.length > 0 && <div className="item-flow-list">{flow.map((entry, index) => <div className="item-flow-row" key={`${entry.fromItem?.id}-${entry.toItem?.id}-${entry.fromColumn}-${index}`}><span className="item-flow-phase">{phase(entry.fromColumn)}</span><span className="item-flow-transition"><Link href={entry.fromItem ? `/items/${entry.fromItem.id}` : "/items"}>{entry.fromItem?.name || "Item unavailable"}</Link><b aria-hidden="true">→</b><Link href={entry.toItem ? `/items/${entry.toItem.id}` : "/items"}>{entry.toItem?.name || "Item unavailable"}</Link></span><span className="item-flow-count">{p("{n} player matches", { n: num(entry.matches) })} <small>{p("{n} win rate", { n: pct(entry.winRate) })}</small></span></div>)}</div>}
      {!flowLoading && !flowError && flow.length === 0 && <p className="profile-note"><L>No data for these filters yet.</L></p>}
    </section>
    <div className="items-footer-links"><Link href="/heroes"><L>Explore hero analytics ↗</L></Link><Link href="/matches"><L>Explore matches ↗</L></Link></div>
  </main>;
}

function plainText(value: string) { return value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim(); }
