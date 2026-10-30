"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ItemAnalytics, ItemAnalyticsFilters, ItemAsset, ItemHeroStat } from "../../../lib/items-api";

const initialFilters: ItemAnalyticsFilters = { period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" };
type Props = { item: ItemAsset };
type AnalyticsPayload = { stats: Record<string, ItemAnalytics>; playerMatches: number };
type HeroPayload = { heroes: ItemHeroStat[] };

export default function ItemDetail({ item }: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [heroes, setHeroes] = useState<ItemHeroStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroError, setHeroError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(filters);
    fetch("/api/items?" + query, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load item statistics."); return data as AnalyticsPayload; })
      .then(setAnalytics)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load item statistics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    fetch(`/api/items/${item.id}?${query}`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load hero statistics."); return data as HeroPayload; })
      .then((data) => setHeroes(data.heroes))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setHeroError(reason instanceof Error ? reason.message : "Could not load hero statistics."); })
      .finally(() => { if (!controller.signal.aborted) setHeroLoading(false); });
    return () => controller.abort();
  }, [filters, item.id]);

  const updateFilter = (key: keyof ItemAnalyticsFilters, value: string) => { setLoading(true); setHeroLoading(true); setError(""); setHeroError(""); setFilters((current) => ({ ...current, [key]: value, ...(key === "gameMode" && value === "street_brawl" ? { rating: "all" } : {}) })); };
  const stat = analytics?.stats[String(item.id)];
  const image = item.image_webp || item.image;
  const properties = Object.entries(item.properties ?? {}).flatMap(([key, property]) => {
    if (!property) return [];
    const value = property.value;
    if (value === undefined || value === null || String(value).trim() === "" || String(value) === "0" || String(value) === "-1") return [];
    const label = property.label || key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    return [{ key, label, value: `${property.prefix && !property.prefix.includes("{") ? property.prefix : ""}${value}${property.postfix ?? ""}` }];
  }).slice(0, 16);
  const description = plainText(item.description?.desc || "");
  const num = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
  const pct = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
  const clock = (seconds?: number | null) => typeof seconds === "number" && Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "—";

  return <main className="content-inner item-detail-page">
    <Link className="back-link" href="/items">← Item catalog</Link>
    <section className="panel item-detail-hero"><span className="item-detail-art" aria-hidden="true" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{!image && <i />}</span><div className="item-detail-heading"><p className="eyebrow">{item.item_slot_type || item.type} {typeof item.item_tier === "number" ? `/ TIER ${item.item_tier}` : ""} / ID {item.id}</p><h1>{item.name}<span>.</span></h1><p>{description || "The API did not provide a description for this asset."}</p><div className="item-detail-badges"><span>{typeof item.cost === "number" ? `${item.cost.toLocaleString()} souls` : "Cost unavailable"}</span>{item.is_active_item && <span>Active item</span>}</div></div></section>
    <div className="items-filters item-detail-filters"><label><span>PERIOD</span><select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All available</option></select></label><label><span>GAME MODE</span><select value={filters.gameMode} onChange={(event) => updateFilter("gameMode", event.target.value)}><option value="normal">Normal</option><option value="street_brawl">Street Brawl</option></select></label><label><span>MATCH TYPE</span><select value={filters.matchMode} onChange={(event) => updateFilter("matchMode", event.target.value)}><option value="ranked,unranked">Ranked + unranked</option><option value="ranked">Ranked</option><option value="unranked">Unranked</option></select></label><label><span>RATING</span><select value={filters.rating} onChange={(event) => updateFilter("rating", event.target.value)} disabled={filters.gameMode === "street_brawl"}><option value="all">{filters.gameMode === "street_brawl" ? "Unavailable in this mode" : "All ratings"}</option><option value="0-29">Badge 0–29</option><option value="30-59">Badge 30–59</option><option value="60-89">Badge 60–89</option><option value="90-116">Badge 90–116</option></select></label></div>
    {loading && <div className="item-detail-metrics" role="status" aria-busy="true">{[0, 1, 2, 3].map((index) => <div className="profile-metric" key={index}><small>LOADING</small><strong>—</strong></div>)}</div>}
    {error && <p className="api-message error-message" role="alert">Item analytics unavailable. {error}</p>}
    {!loading && !error && stat && <><div className="item-detail-metrics"><Metric label="PLAYER PICKS" value={num(stat.matches)} note="Player-matches with this item" /><Metric label="PICK RATE" value={pct(stat.pickRate)} note={`Of ${num(analytics?.playerMatches)} filtered player-matches`} /><Metric label="WIN RATE" value={pct(stat.winRate)} note={`${num(stat.wins)} wins / ${num(stat.wins + stat.losses)} scored purchases`} /><Metric label="UNIQUE BUYERS" value={num(stat.players)} note="Players represented in API stats" /><Metric label="AVERAGE BUY TIME" value={clock(stat.avgBuyTimeS)} note="Match time when purchased" /><Metric label="SELL RATE" value={stat.sold === null ? "—" : pct(stat.sold / Math.max(stat.matches, 1) * 100)} note={stat.sold === null ? "Not available from API" : `${num(stat.sold)} sold / ${num(stat.matches)} purchases`} /></div><p className="items-data-note">Purchase win rate is an observed association and does not imply the item caused the result.</p></>}
    {!loading && !error && !stat && <p className="api-message">No purchase statistics for this item and filter selection.</p>}
    <div className="item-detail-columns">
      <section className="panel item-properties"><div className="panel-heading"><div><p className="eyebrow">ASSET DATA</p><h2>Properties and effects</h2></div></div>{properties.length ? <dl>{properties.map((property) => <div key={property.key}><dt>{property.label}</dt><dd>{property.value}</dd></div>)}</dl> : <p className="profile-note">No displayable numeric properties were returned for this asset.</p>}</section>
      <section className="panel item-hero-analytics"><div className="panel-heading"><div><p className="eyebrow">PER HERO</p><h2>Hero purchase stats</h2></div></div>{heroLoading && <p className="profile-note" role="status">Loading hero breakdown…</p>}{heroError && <p className="profile-note error-message" role="alert">Hero statistics unavailable. {heroError}</p>}{!heroLoading && !heroError && heroes.length > 0 && <div className="item-hero-list">{heroes.slice(0, 12).map((entry) => <Link href={`/heroes/${entry.hero.id}`} className="item-hero-row" key={entry.hero.id}><span>{entry.hero.name || `Hero ${entry.hero.id}`}</span><b>{num(entry.matches)} picks</b><small>{pct(entry.winRate)} win / {pct(entry.pickRate)} pick</small></Link>)}</div>}{!heroLoading && !heroError && heroes.length === 0 && <p className="profile-note">No per-hero purchase rows were returned for these filters.</p>}</section>
    </div>
    <section className="panel item-related-links"><div><p className="eyebrow">RELATED EXPLORATION</p><h2>Continue exploring</h2></div><Link href="/builds">Browse community builds ↗</Link><Link href="/matches">Open Match Explorer ↗</Link><Link href="/heroes">Explore heroes ↗</Link></section>
    <footer><span>DEADLOCK INTELLIGENCE · ITEM DATA</span><span>Source: Deadlock API <i /></span></footer>
  </main>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="profile-metric"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>; }
function plainText(value: string) { return value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim(); }

