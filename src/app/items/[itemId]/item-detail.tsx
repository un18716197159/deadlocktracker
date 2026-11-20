"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ItemAnalytics, ItemAnalyticsFilters, ItemAsset, ItemHeroStat } from "../../../lib/items-api";
import "../../heroes/[heroId]/hero-detail.css";
import "./item-page.css";
import ItemTile from "../../components/item-tile";
import { RichText, stripRichText } from "../../../lib/rich-text";
import { L, useI18n } from "../../../lib/i18n/provider";

const initialFilters: ItemAnalyticsFilters = { period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" };
type Props = { item: ItemAsset };
type AnalyticsPayload = { stats: Record<string, ItemAnalytics>; playerMatches: number };
type HeroPayload = { heroes: ItemHeroStat[] };

export default function ItemDetail({ item }: Props) {
  const { p } = useI18n();
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
  const properties = Object.entries(item.properties ?? {}).flatMap(([key, property]) => {
    if (!property) return [];
    const value = property.value;
    if (value === undefined || value === null || String(value).trim() === "" || String(value) === "0" || String(value) === "-1") return [];
    const label = property.label || key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    return [{ key, label, value: `${property.prefix && !property.prefix.includes("{") ? property.prefix : ""}${value}${property.postfix ?? ""}` }];
  }).slice(0, 16);
  const extra = item.description;
  const hasText = Boolean(stripRichText(extra?.desc) || stripRichText(extra?.active) || stripRichText(extra?.passive));
  const num = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
  const pct = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
  const clock = (seconds?: number | null) => typeof seconds === "number" && Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "—";

  return <main className="content-inner item-detail-page">
    <Link className="back-link" href="/items"><L>← Item catalog</L></Link>
    <section className="id-header" data-slot={item.item_slot_type}>
      <ItemTile item={item} size="xl" />
      <div className="id-title">
        <div className="id-chips">{item.item_slot_type && <span className="id-chip slot">{p(item.item_slot_type)}</span>}{typeof item.item_tier === "number" && <span className="id-chip">{p("Tier {n}", { n: item.item_tier })}</span>}{item.is_active_item && <span className="id-chip"><L>Active</L></span>}</div>
        <h1>{item.name}</h1>
        {typeof item.cost === "number" && <p className="id-cost">{p("{n} souls", { n: item.cost.toLocaleString() })}</p>}
      </div>
    </section>
    <section className="id-panel">
      <h2><L>Description</L></h2>
      {hasText ? <div className="id-text"><RichText text={extra?.desc} />{stripRichText(extra?.active) && <div className="hp-effect"><b><L>Active</L></b><RichText text={extra?.active} /></div>}{stripRichText(extra?.passive) && <div className="hp-effect"><b><L>Passive</L></b><RichText text={extra?.passive} /></div>}</div> : <p className="muted"><L>No description.</L></p>}
    </section>
    <div className="items-filters item-detail-filters"><label><span><L>PERIOD</L></span><select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}><option value="7d">{p("7 days")}</option><option value="30d">{p("30 days")}</option><option value="90d">{p("90 days")}</option><option value="all">{p("All available")}</option></select></label><label><span><L>GAME MODE</L></span><select value={filters.gameMode} onChange={(event) => updateFilter("gameMode", event.target.value)}><option value="normal">{p("Normal")}</option><option value="street_brawl">{p("Street Brawl")}</option></select></label><label><span><L>MATCH TYPE</L></span><select value={filters.matchMode} onChange={(event) => updateFilter("matchMode", event.target.value)}><option value="ranked,unranked">{p("Ranked + unranked")}</option><option value="ranked">{p("Ranked")}</option><option value="unranked">{p("Unranked")}</option></select></label><label><span><L>RATING</L></span><select value={filters.rating} onChange={(event) => updateFilter("rating", event.target.value)} disabled={filters.gameMode === "street_brawl"}><option value="all">{filters.gameMode === "street_brawl" ? p("Unavailable in this mode") : p("All ratings")}</option><option value="0-29">{p("Badge 0–29")}</option><option value="30-59">{p("Badge 30–59")}</option><option value="60-89">{p("Badge 60–89")}</option><option value="90-116">{p("Badge 90–116")}</option></select></label></div>
    {loading && <div className="item-detail-metrics" role="status" aria-busy="true">{[0, 1, 2, 3].map((index) => <div className="profile-metric" key={index}><small><L>LOADING</L></small><strong>—</strong></div>)}</div>}
    {error && <p className="api-message error-message" role="alert">Item analytics unavailable. {error}</p>}
    {!loading && !error && stat && <><div className="item-detail-metrics"><Metric label={p("PLAYER PICKS")} value={num(stat.matches)} note={p("Player-matches with this item")} /><Metric label={p("PICK RATE")} value={pct(stat.pickRate)} note={p("Of {n} filtered player-matches", { n: num(analytics?.playerMatches) })} /><Metric label={p("WIN RATE")} value={pct(stat.winRate)} note={p("{wins} wins / {total} scored purchases", { wins: num(stat.wins), total: num(stat.wins + stat.losses) })} /><Metric label={p("UNIQUE BUYERS")} value={num(stat.players)} note={p("Players who bought it")} /><Metric label={p("AVERAGE BUY TIME")} value={clock(stat.avgBuyTimeS)} note={p("Match time when purchased")} /><Metric label={p("SELL RATE")} value={stat.sold === null ? "—" : pct(stat.sold / Math.max(stat.matches, 1) * 100)} note={stat.sold === null ? "—" : p("{sold} sold / {total} purchases", { sold: num(stat.sold), total: num(stat.matches) })} /></div></>}
    {!loading && !error && !stat && <p className="api-message"><L>No stats for this item yet.</L></p>}
    <div className="item-detail-columns">
      <section className="panel item-properties"><div className="panel-heading"><div><h2><L>Properties and effects</L></h2></div></div>{properties.length ? <dl>{properties.map((property) => <div key={property.key}><dt>{property.label}</dt><dd>{property.value}</dd></div>)}</dl> : <p className="profile-note"><L>No properties.</L></p>}</section>
      <section className="panel item-hero-analytics"><div className="panel-heading"><div><h2><L>Hero purchase stats</L></h2></div></div>{heroLoading && <p className="profile-note" role="status"><L>Loading hero breakdown…</L></p>}{heroError && <p className="profile-note error-message" role="alert">Hero statistics unavailable. {heroError}</p>}{!heroLoading && !heroError && heroes.length > 0 && <div className="item-hero-list">{heroes.slice(0, 12).map((entry) => <Link href={`/heroes/${entry.hero.id}`} className="item-hero-row" key={entry.hero.id}><span>{entry.hero.name || `Hero ${entry.hero.id}`}</span><b>{num(entry.matches)} picks</b><small>{pct(entry.winRate)} win / {pct(entry.pickRate)} pick</small></Link>)}</div>}{!heroLoading && !heroError && heroes.length === 0 && <p className="profile-note"><L>No hero data for these filters yet.</L></p>}</section>
    </div>
    <section className="panel item-related-links"><div><h2><L>Continue exploring</L></h2></div><Link href="/builds"><L>Browse community builds ↗</L></Link><Link href="/matches"><L>Open Match Explorer ↗</L></Link><Link href="/heroes"><L>Explore heroes ↗</L></Link></section>
  </main>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="profile-metric"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>; }
