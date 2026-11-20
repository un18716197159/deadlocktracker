"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Row } from "../../lib/heroes-api";
import { heroCardImage } from "../../lib/assets";
import { L, useI18n } from "../../lib/i18n/provider";

/** 2182451 -> "2.2M": fits the three-column stat row on a phone (full number on hover). */
const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

type Stats = { hero_id: number; bucket: number; wins: number; losses: number; matches: number; matches_per_bucket: number; bucket_matches_since_first_day: number; total_kills: number; total_deaths: number; total_assists: number; total_player_damage: number; total_net_worth: number; total_last_hits: number; total_denies: number };
type Filters = { period: string; gameMode: string; matchMode: string; rating: string };
const initial: Filters = { period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" };

export default function Heroes({ rows }: { rows: Row[] }) {
  const { p } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [filters, setFilters] = useState(initial);
  const [stats, setStats] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ kind: "heroes", ...filters });
    fetch("/api/analytics?" + params, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load hero analytics."); return data; })
      .then((data) => setStats(Array.isArray(data.heroes) ? data.heroes : []))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load hero analytics."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters]);
  const statById = useMemo(() => new Map(stats.map((stat) => [stat.hero_id, stat])), [stats]);
  const decorated = useMemo(() => rows.map(({ hero }) => {
    const stat = statById.get(hero.id ?? -1) ?? null;
    const outcomes = stat ? stat.wins + stat.losses : 0;
    const win = stat && outcomes ? stat.wins / outcomes * 100 : null;
    const pick = stat && stat.bucket_matches_since_first_day > 0 ? stat.matches / stat.bucket_matches_since_first_day * 100 : null;
    return { hero, stat, win, pick };
  }).filter(({ hero }) => (hero.name + " " + (hero.description?.role ?? "")).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === "win" ? (b.win ?? -1) - (a.win ?? -1) : sort === "pick" ? (b.pick ?? -1) - (a.pick ?? -1) : (a.hero.name ?? "").localeCompare(b.hero.name ?? "")), [rows, statById, query, sort]);
  const update = (key: keyof Filters, value: string) => { setLoading(true); setError(""); setFilters((current) => ({ ...current, [key]: value, ...(key === "gameMode" && value === "street_brawl" ? { rating: "all" } : {}) })); };
  const periodLabel = filters.period === "all" ? p("all available history") : p("last {n} days", { n: filters.period.replace("d", "") });
  return <main className="content-inner heroes-page">
    <div className="page-heading"><div><h1><L>Heroes</L><span>.</span></h1><p className="muted">{p("Deadlock hero performance")} · {periodLabel}</p></div></div>
    <div className="heroes-toolbar">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={p("Search heroes or roles...")} aria-label="Search heroes" />
      <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort heroes"><option value="name">{p("Name")}</option><option value="win">{p("Win rate")}</option><option value="pick">{p("Pick rate")}</option></select>
      <select value={filters.period} onChange={(event) => update("period", event.target.value)} aria-label="Time period"><option value="7d">{p("7 days")}</option><option value="30d">{p("30 days")}</option><option value="90d">{p("90 days")}</option><option value="all">{p("All available")}</option></select>
      <select value={filters.gameMode} onChange={(event) => update("gameMode", event.target.value)} aria-label={p("Game mode")}><option value="normal">{p("Normal")}</option><option value="street_brawl">{p("Street Brawl")}</option></select>
      <select value={filters.matchMode} onChange={(event) => update("matchMode", event.target.value)} aria-label="Match mode"><option value="ranked,unranked">{p("Ranked + unranked")}</option><option value="ranked">{p("Ranked")}</option><option value="unranked">{p("Unranked")}</option></select>
      <select value={filters.rating} onChange={(event) => update("rating", event.target.value)} aria-label="Average rating" disabled={filters.gameMode === "street_brawl"}><option value="all">{filters.gameMode === "street_brawl" ? p("Badge rating unavailable") : p("All ratings")}</option><option value="0-29">{p("Badge 0–29")}</option><option value="30-59">{p("Badge 30–59")}</option><option value="60-89">{p("Badge 60–89")}</option><option value="90-116">{p("Badge 90–116")}</option></select>
    </div>
    {loading && <div className="heroes-grid hero-skeleton-grid" role="status" aria-label="Loading hero statistics" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <article className="hero-card hero-skeleton" key={index}><div className="hero-card-art" /><div className="hero-card-body"><span /><span /><span /></div></article>)}</div>}
    {error && <p className="api-message error-message" role="alert">Deadlock API unavailable. {error}</p>}
    {!loading && !error && decorated.length > 0 && <div className="heroes-grid">{decorated.map(({ hero, stat, win, pick }, index) => {
      const img = heroCardImage(hero);
      return <Link className="hero-card" href={"/heroes/" + hero.id} key={hero.id}><div className="hero-card-art" role="img" aria-label={hero.name} style={img ? { backgroundImage: 'linear-gradient(0deg,#111d,transparent),url("' + img + '")' } : {}}><span>{index + 1}</span></div><div className="hero-card-body">{hero.description?.role && <p className="eyebrow">{hero.description.role}</p>}<h2>{hero.name}</h2>{hero.description?.playstyle && <p className="hero-playstyle">{hero.description.playstyle}</p>}<div className="hero-card-stats"><div><small><L>WIN RATE</L></small><strong data-tone={win === null ? undefined : win >= 52 ? "good" : win < 48 ? "bad" : undefined}>{win === null ? "—" : win.toFixed(1) + "%"}</strong></div><div><small><L>PICK RATE</L></small><strong>{pick === null ? "—" : pick.toFixed(1) + "%"}</strong></div><div><small><L>MATCHES</L></small><strong title={stat?.matches.toLocaleString()}>{stat ? compactNumber.format(stat.matches) : "—"}</strong></div></div>{stat && <p className="hero-playstyle">W / L {stat.wins.toLocaleString()} / {stat.losses.toLocaleString()} · Avg K/D/A {stat.matches ? (stat.total_kills / stat.matches).toFixed(1) : "—"} / {stat.matches ? (stat.total_deaths / stat.matches).toFixed(1) : "—"} / {stat.matches ? (stat.total_assists / stat.matches).toFixed(1) : "—"}</p>}<span className="hero-card-link"><L>VIEW HERO ↗</L></span></div></Link>;
    })}</div>}
    {!loading && !error && stats.length === 0 && decorated.length > 0 && <p className="heroes-context" role="status"><L>No stats for these filters yet.</L></p>}
    {!loading && !error && decorated.length === 0 && <section className="panel heroes-state"><h2><L>No matching heroes</L></h2><p className="api-message"><L>No heroes match this search in the available catalog.</L></p></section>}
  </main>;
}



