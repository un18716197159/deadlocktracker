"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SteamProfile } from "../../lib/deadlock-api";

type HeroSummary = { heroId: number; name: string; image: string | null; matches: number; wins: number; losses: number; winRate: number; avgKills: number | null; avgDeaths: number | null; avgAssists: number | null };
type ComparedPlayer = { accountId: number; name: string; avatar: string | null; rankName: string | null; rankTier: number | null; subrank: number | null; matches: number; wins: number; losses: number; winRate: number | null; avgKills: number | null; avgDeaths: number | null; avgAssists: number | null; heroes: HeroSummary[] };
type ComparePayload = { players: ComparedPlayer[]; period: string; sample: string };
type SearchPayload = { players: SteamProfile[]; error?: string };

export default function Compare({ initialLeft, initialRight }: { initialLeft: SteamProfile | null; initialRight: SteamProfile | null }) {
  const [left, setLeft] = useState<SteamProfile | null>(initialLeft);
  const [right, setRight] = useState<SteamProfile | null>(initialRight);
  const [period, setPeriod] = useState("90d");
  const [data, setData] = useState<ComparePayload | null>(null);
  const [loading, setLoading] = useState(Boolean(initialLeft?.account_id !== undefined && initialRight?.account_id !== undefined && initialLeft.account_id !== initialRight.account_id));
  const [error, setError] = useState("");
  const canCompare = Boolean(left?.account_id !== undefined && right?.account_id !== undefined && left.account_id !== right.account_id);

  useEffect(() => {
    if (!canCompare || left?.account_id === undefined || right?.account_id === undefined) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ left: String(left.account_id), right: String(right.account_id), period });
    fetch(`/api/compare?${params}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Player comparison is unavailable."); return payload as ComparePayload; })
      .then(setData)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not compare these players."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [canCompare, left?.account_id, right?.account_id, period]);

  const changePeriod = (value: string) => { setLoading(canCompare); setError(""); setPeriod(value); };
  const clearPlayer = (side: "left" | "right") => { setData(null); setError(""); setLoading(false); if (side === "left") setLeft(null); else setRight(null); };
  const swap = () => { setData(null); setError(""); setLoading(Boolean(canCompare)); setLeft(right); setRight(left); };

  return <main className="content-inner compare-page">
    <div className="page-heading"><div><p className="eyebrow">PLAYER ANALYTICS / HEAD TO HEAD</p><h1>Player comparison<span>.</span></h1><p className="muted">Compare scored match history and hero performance under the same time window.</p></div><Link className="refresh-button" href="/leaderboards">Leaderboards ↗</Link></div>
    <div className="compare-pickers">
      <PlayerPicker label="PLAYER A" selected={left} onSelect={(profile) => { setData(null); setError(""); setLeft(profile); setLoading(Boolean(right && profile.account_id !== right.account_id)); }} onRemove={() => clearPlayer("left")} />
      <button type="button" className="compare-swap" onClick={swap} disabled={!left && !right} aria-label="Swap selected players"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h15l-3-3M20 16H5l3 3" /></svg></button>
      <PlayerPicker label="PLAYER B" selected={right} onSelect={(profile) => { setData(null); setError(""); setRight(profile); setLoading(Boolean(left && profile.account_id !== left.account_id)); }} onRemove={() => clearPlayer("right")} />
    </div>
    <div className="compare-controls"><label><span>TIME WINDOW</span><select value={period} onChange={(event) => changePeriod(event.target.value)}><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All available history</option></select></label><p>Both players use the same window. Only API match rows scored as wins or losses are included; all game and match modes are included.</p></div>
    {!canCompare && <section className="panel compare-placeholder"><p className="eyebrow">SELECT TWO DIFFERENT PLAYERS</p><h2>Choose players to compare</h2><p>Search for both players above. Their profile links and statistics will appear here after the API returns their match history.</p></section>}
    {loading && <div className="compare-skeleton" role="status" aria-label="Loading comparison" aria-busy="true"><div /><div /><div /><div /></div>}
    {error && <p className="api-message error-message" role="alert">Comparison unavailable. {error}</p>}
    {!loading && !error && data && <>
      <section className="panel compare-summary"><div className="compare-player-heading">{data.players.map((player) => <div className="compare-player-card" key={player.accountId}><span className="compare-avatar" aria-hidden="true" style={player.avatar ? { backgroundImage: `url("${player.avatar}")` } : undefined}>{!player.avatar && player.name.slice(0, 1)}</span><div><p className="eyebrow">ACCOUNT {player.accountId}</p><h2>{player.name}</h2><p>{player.rankName || "Rank unavailable"}{player.subrank !== null ? ` · Subrank ${player.subrank}` : ""}</p><Link href={`/players/${player.accountId}`}>Open player profile ↗</Link></div></div>)}</div>
        <div className="compare-metrics">{[
          { label: "CURRENT RANK", values: data.players.map((player) => player.rankName ? `${player.rankName}${player.subrank !== null ? ` · ${player.subrank}` : ""}` : "Unavailable") },
          { label: "SCORED MATCHES", values: data.players.map((player) => num(player.matches)) },
          { label: "WINS", values: data.players.map((player) => num(player.matches ? player.wins : null)) },
          { label: "LOSSES", values: data.players.map((player) => num(player.matches ? player.losses : null)) },
          { label: "WIN RATE", values: data.players.map((player) => pct(player.winRate)) },
          { label: "AVG K / D / A", values: data.players.map((player) => kda(player.avgKills, player.avgDeaths, player.avgAssists)) },
        ].map(({ label, values }) => <div className="compare-metric-row" key={label}><small>{label}</small><strong>{values[0]}</strong><span className="compare-vs">vs</span><strong>{values[1]}</strong></div>)}</div>
      </section>
      {data.players.every((player) => player.matches === 0) && <p className="api-message">No scored match history was returned for either player in this time window.</p>}
      <section className="panel compare-heroes"><div className="panel-heading"><div><p className="eyebrow">HERO PERFORMANCE</p><h2>Favorite heroes</h2></div><span className="live-tag">SAME MATCH WINDOW</span></div>
        <div className="compare-hero-columns">{data.players.map((player) => <div className="compare-hero-column" key={player.accountId}><h3>{player.name}</h3>{player.heroes.length ? player.heroes.slice(0, 8).map((hero) => <Link className="compare-hero-row" href={`/heroes/${hero.heroId}`} key={hero.heroId}><span className="compare-hero-art" aria-hidden="true" style={hero.image ? { backgroundImage: `url("${hero.image}")` } : undefined}>{!hero.image && hero.name.slice(0, 1)}</span><span className="compare-hero-info"><b>{hero.name}</b><small>{num(hero.matches)} matches · {num(hero.wins)} W / {num(hero.losses)} L · {pct(hero.winRate)}</small><small>Avg K / D / A: {kda(hero.avgKills, hero.avgDeaths, hero.avgAssists)}</small></span><span aria-hidden="true">↗</span></Link>) : <p className="profile-note">No scored hero rows in this time window.</p>}</div>)}</div>
      </section>
      <p className="compare-source-note">Match counts and outcomes are counted from returned history entries. Win rate = wins ÷ scored matches. K/D/A averages use available values per metric. Current rank is the latest ranked badge returned by the API and is not affected by the selected time window.</p>
    </>}
    <footer><span>DEADLOCK INTELLIGENCE · PLAYER COMPARISON</span><span>Source: Deadlock API <i /></span></footer>
  </main>;
}

function PlayerPicker({ label, selected, onSelect, onRemove }: { label: string; selected: SteamProfile | null; onSelect: (profile: SteamProfile) => void; onRemove: () => void }) {
  const inputId = `compare-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SteamProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/players/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(async (response) => { const payload = await response.json() as SearchPayload; if (!response.ok) throw new Error(payload.error || "Player search is unavailable."); return payload; })
        .then((payload) => setResults(payload.players))
        .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not search players."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const updateQuery = (value: string) => { setQuery(value); setError(""); setResults([]); setLoading(value.trim().length >= 2); };
  const choose = (profile: SteamProfile) => { onSelect(profile); setQuery(""); setResults([]); setError(""); };
  const avatar = selected?.avatarfull || selected?.avatar;
  return <section className="panel compare-picker"><label className="eyebrow" htmlFor={inputId}>{label}</label>
    {selected && <div className="compare-selected"><span className="compare-avatar" aria-hidden="true" style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}>{!avatar && (selected.personaname?.slice(0, 1) || "?")}</span><span><strong>{selected.personaname || `Account ${selected.account_id}`}</strong><small>Account ID {selected.account_id}</small></span><Link href={`/players/${selected.account_id}`}>Profile ↗</Link><button type="button" onClick={onRemove} aria-label={`Remove ${label}`}>×</button></div>}
    <input id={inputId} value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={selected ? "Search to replace player…" : "Search player name…"} autoComplete="off" />
    {query.trim().length === 1 && <p className="compare-picker-note">Enter at least two characters.</p>}
    {loading && <p className="compare-picker-note" role="status">Searching players…</p>}
    {error && <p className="compare-picker-note error-message" role="alert">{error}</p>}
    {query.trim().length >= 2 && !loading && !error && results.length === 0 && <p className="compare-picker-note">No matching players were returned.</p>}
    {results.length > 0 && <div className="compare-search-results" role="listbox" aria-label={`${label} search results`}>{results.map((profile, index) => { const image = profile.avatarfull || profile.avatar; return <button className="compare-search-result" type="button" key={`${profile.account_id ?? "unknown"}-${index}`} onClick={() => choose(profile)}><span className="compare-avatar" aria-hidden="true" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{!image && (profile.personaname?.slice(0, 1) || "?")}</span><span><strong>{profile.personaname || "Name unavailable"}</strong><small>Account ID {profile.account_id ?? "Unavailable"}</small></span></button>; })}</div>}
  </section>;
}

function num(value: number | null) { return value !== null && Number.isFinite(value) ? Math.round(value).toLocaleString() : "—"; }
function pct(value: number | null) { return value !== null && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—"; }
function kda(kills: number | null, deaths: number | null, assists: number | null) { return [kills, deaths, assists].map((value) => value !== null && Number.isFinite(value) ? value.toFixed(1) : "—").join(" / "); }
