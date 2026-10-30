"use client";

import { useEffect, useMemo, useState } from "react";

type HeroStat = { bucket: number; hero_id: number; wins: number; losses: number; matches: number; bucket_matches_since_first_day: number };
type GameStat = { bucket: number; total_matches: number; total_players: number; avg_kills: number; avg_deaths: number; avg_assists: number; avg_duration_s: number; team0_wins?: number; team1_wins?: number };
type Payload = { summary: GameStat | null; heroes: HeroStat[]; trend: HeroStat[]; ratings: GameStat[]; assets: Asset[]; trendRange?: { start: number; end: number } | null };
type Asset = { id?: number; name?: string; images?: { icon_image_small?: string | null; icon_image_small_webp?: string | null } | null };
type Filters = { period: string; gameMode: string; matchMode: string; rating: string };
type TrendPoint = { bucket: number; winRate: number; matches: number; partial: boolean };
const defaults: Filters = { period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" };

export default function GlobalAnalyticsPanel() {
  const [filters, setFilters] = useState(defaults);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(filters);
    fetch("/api/analytics?" + params, { signal: controller.signal })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load global analytics."); return result as Payload; })
      .then((result) => setData(result))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load global analytics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters]);
  const update = (key: keyof Filters, value: string) => { setLoading(true); setError(""); setFilters((current) => ({ ...current, [key]: value, ...(key === "gameMode" && value === "street_brawl" ? { rating: "all" } : {}) })); };
  const named = useMemo(() => data?.heroes.map((hero) => ({ ...hero, name: data.assets.find((asset) => asset.id === hero.hero_id)?.name ?? "Hero " + hero.hero_id })).sort((a, b) => b.matches - a.matches) ?? [], [data]);
  const popular = named.slice(0, 5);
  const successful = [...named].filter((hero) => hero.wins + hero.losses > 0).sort((a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses)).slice(0, 5);
  const points = useMemo(() => {
    const byDay = new Map<number, { wins: number; losses: number; matches: number }>();
    for (const row of data?.trend ?? []) {
      if (!Number.isFinite(row.bucket)) continue;
      const totals = byDay.get(row.bucket) ?? { wins: 0, losses: 0, matches: 0 };
      totals.wins += row.wins;
      totals.losses += row.losses;
      totals.matches += row.matches;
      byDay.set(row.bucket, totals);
    }
    const sorted = [...byDay.entries()].sort(([left], [right]) => left - right);
    return sorted.flatMap(([bucket, totals]): TrendPoint[] => {
      const scored = totals.wins + totals.losses;
      if (!scored) return [];
      const range = data?.trendRange;
      const partial = range ? bucket < range.start || bucket + 86400 > range.end : false;
      return [{ bucket, matches: totals.matches, winRate: totals.wins / scored * 100, partial }];
    });
  }, [data]);
  const fullPoints = points.filter((point) => !point.partial);
  const values = points.map((point) => point.winRate);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const yFor = (value: number) => max === min ? 50 : 94 - (value - min) / (max - min) * 84;
  const earliestBucket = points[0]?.bucket ?? 0;
  const latestBucket = points.at(-1)?.bucket ?? earliestBucket;
  const xFor = (point: TrendPoint) => latestBucket === earliestBucket ? 50 : (point.bucket - earliestBucket) / (latestBucket - earliestBucket) * 100;
  const fullPath = fullPoints.reduce((path, point, index) => {
    const previous = fullPoints[index - 1];
    const contiguous = previous && point.bucket - previous.bucket === 86400;
    return path + `${contiguous ? " L" : " M"}${xFor(point)} ${yFor(point.winRate)}`;
  }, "");
  const formatDate = (bucket: number) => new Date(bucket * 1000).toLocaleDateString();
  const number = (value: number | undefined) => typeof value === "number" ? value.toLocaleString() : "—";
  return <section className="global-analytics" aria-label="Global Deadlock analytics">
    <div className="heroes-toolbar" aria-label="Analytics filters">
      <select aria-label="Analytics period" value={filters.period} onChange={(event) => update("period", event.target.value)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All available</option></select>
      <select aria-label="Analytics game mode" value={filters.gameMode} onChange={(event) => update("gameMode", event.target.value)}><option value="normal">Normal</option><option value="street_brawl">Street Brawl</option></select>
      <select aria-label="Analytics match mode" value={filters.matchMode} onChange={(event) => update("matchMode", event.target.value)}><option value="ranked,unranked">Ranked + unranked</option><option value="ranked">Ranked</option><option value="unranked">Unranked</option></select>
      <select aria-label="Analytics rating range" value={filters.rating} onChange={(event) => update("rating", event.target.value)} disabled={filters.gameMode === "street_brawl"}><option value="all">{filters.gameMode === "street_brawl" ? "Badge rating unavailable" : "All ratings"}</option><option value="0-29">Badge 0–29</option><option value="30-59">Badge 30–59</option><option value="60-89">Badge 60–89</option><option value="90-116">Badge 90–116</option></select>
    </div>
    {loading && <div className="analytics-skeleton" role="status" aria-label="Loading global analytics" aria-busy="true"><div className="metric-grid">{[0, 1, 2, 3].map((item) => <div className="metric" key={item}><span /></div>)}</div><div className="dashboard-grid"><div className="panel" /><div className="panel" /></div></div>}
    {error && <p className="api-message error-message" role="alert">Deadlock API unavailable. {error}</p>}
    {!loading && !error && data?.summary && <>
      <div className="section-title"><h2>At a glance</h2><span className="live-tag">LIVE API DATA</span><span className="line" /></div>
      <div className="metric-grid"><Metric label="MATCHES ANALYZED" value={number(data.summary.total_matches)} note="Matches in selected filters" /><Metric label="PLAYERS ANALYZED" value={number(data.summary.total_players)} note="Players represented by API" /><Metric label="AVG K / D / A" value={[data.summary.avg_kills, data.summary.avg_deaths, data.summary.avg_assists].map((value) => value.toFixed(1)).join(" / ")} note="Per player match" /><Metric label="AVG MATCH LENGTH" value={Math.round(data.summary.avg_duration_s / 60) + " min"} note="Across the filtered sample" /></div>
      <div className="dashboard-grid">
        <section className="panel hero-panel"><div className="panel-heading"><div><p className="eyebrow">POPULAR PICKS</p><h2>Heroes in focus</h2></div><span className="live-tag">API MATCH COUNTS</span></div>
          {popular.length ? <div className="hero-list">{popular.map((hero) => <div className="hero-row" key={hero.hero_id}><span className="hero-stat">{hero.hero_id}</span><strong>{hero.name}</strong><span className="hero-stat">{number(hero.matches)} picks</span></div>)}</div> : <p className="profile-note panel-empty">No hero statistics are available for these filters.</p>}
          <div className="section-title"><h2>Highest win rates</h2></div>{successful.length ? <div className="hero-list">{successful.map((hero) => <div className="hero-row" key={hero.hero_id}><span className="hero-stat">{hero.hero_id}</span><strong>{hero.name}</strong><span className="hero-stat">{(hero.wins / (hero.wins + hero.losses) * 100).toFixed(1)}%</span></div>)}</div> : <p className="profile-note">No scored hero outcomes for this selection.</p>}
        </section>
        <section className="panel trend-panel"><div className="panel-heading"><div><p className="eyebrow">GLOBAL / DAILY</p><h2>Win rate trend</h2></div><span className="live-tag">REAL API BUCKETS</span></div>
          {points.length ? <div className="analytics-trend-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Player win rate per API UTC daily bucket" className="analytics-trend-svg">{fullPoints.length > 1 && <path d={fullPath} fill="none" stroke="#cf775a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}{fullPoints.map((point) => <circle key={point.bucket} cx={xFor(point)} cy={yFor(point.winRate)} r="1.4" fill="#e5a184"><title>{formatDate(point.bucket)}: {point.winRate.toFixed(1)}%, {number(point.matches)} player matches</title></circle>)}{points.filter((point) => point.partial).map((point) => <circle key={point.bucket} cx={xFor(point)} cy={yFor(point.winRate)} r="2" fill="#161819" stroke="#e5a184" strokeWidth="1.3" vectorEffect="non-scaling-stroke"><title>{formatDate(point.bucket)} partial boundary day: {point.winRate.toFixed(1)}%, {number(point.matches)} player matches</title></circle>)}</svg><div className="analytics-trend-summary"><span>{points[0] ? formatDate(points[0].bucket) : ""}</span><span>{points[0]?.winRate.toFixed(1)}% — {points.at(-1)?.winRate.toFixed(1)}% player win rate</span><span>{points.at(-1) ? formatDate(points.at(-1)!.bucket) : ""}</span></div><p className="analytics-trend-note">Daily win rate uses wins / (wins + losses). Hollow points mark incomplete range boundary days; line shows complete days only.</p></div> : <p className="profile-note panel-empty">No historical buckets are available for this selection.</p>}
        </section>
      </div>
      {data.ratings.length > 1 && <section className="panel" style={{ marginTop: 16, padding: 20 }}><p className="eyebrow">MATCH DISTRIBUTION / AVERAGE BADGE</p><h2>Matches by rating band</h2><div className="hero-list">{[["0–29",0,29],["30–59",30,59],["60–89",60,89],["90–116",90,116]].map(([label, low, high]) => { const band = data.ratings.filter((row) => row.bucket >= Number(low) && row.bucket <= Number(high)); const count = band.reduce((sum, row) => sum + row.total_matches, 0); return <div className="hero-row" key={String(label)}><strong>{label}</strong><span className="hero-stat">{band.length ? number(count) : "—"} matches</span></div>; })}</div></section>}
    </>}
    {!loading && !error && !data?.summary && <p className="api-message">The API returned no global analytics for these filters.</p>}
  </section>;
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metric"><p>{label}</p><strong>{value}</strong><div>{note}</div></div>; }



