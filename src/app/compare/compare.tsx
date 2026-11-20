"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SteamProfile } from "../../lib/deadlock-api";
import RankBadge from "../components/rank-badge";
import { useI18n, L } from "../../lib/i18n/provider";
import "./compare-page.css";

type HeroSummary = { heroId: number; name: string; image: string | null; matches: number; wins: number; losses: number; winRate: number; avgKills: number | null; avgDeaths: number | null; avgAssists: number | null };
type ComparedPlayer = { accountId: number; name: string; avatar: string | null; rankName: string | null; rankTier: number | null; subrank: number | null; rankImage: string | null; matches: number; wins: number; losses: number; winRate: number | null; avgKills: number | null; avgDeaths: number | null; avgAssists: number | null; heroes: HeroSummary[] };
type SharedHero = { id: number; name: string; image: string | null } | null;
type SharedMatch = { matchId: number; startTime: number | null; together: boolean; leftWon: boolean | null; leftHero: SharedHero; rightHero: SharedHero; leftKda: string; rightKda: string };
type SharedSummary = { together: { matches: number; wins: number; losses: number }; against: { matches: number; leftWins: number; rightWins: number }; recent: SharedMatch[] };
type ComparePayload = { players: ComparedPlayer[]; shared?: SharedSummary; period: string; sample: string };
type SearchPayload = { players: SteamProfile[]; error?: string };

export default function Compare({ initialLeft, initialRight }: { initialLeft: SteamProfile | null; initialRight: SteamProfile | null }) {
  const { t, p } = useI18n();
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
    <div className="page-heading"><div><h1>{t("compare.title")}</h1><p className="muted">{t("compare.subtitle")}</p></div><Link className="refresh-button" href="/leaderboards">{t("nav.leaderboards")} ↗</Link></div>
    <div className="compare-pickers">
      <PlayerPicker label={t("compare.playerA")} selected={left} onSelect={(profile) => { setData(null); setError(""); setLeft(profile); setLoading(Boolean(right && profile.account_id !== right.account_id)); }} onRemove={() => clearPlayer("left")} />
      <button type="button" className="compare-swap" onClick={swap} disabled={!left && !right} aria-label="Swap selected players"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h15l-3-3M20 16H5l3 3" /></svg></button>
      <PlayerPicker label={t("compare.playerB")} selected={right} onSelect={(profile) => { setData(null); setError(""); setRight(profile); setLoading(Boolean(left && profile.account_id !== left.account_id)); }} onRemove={() => clearPlayer("right")} />
    </div>
    <div className="compare-controls"><label><span>{t("compare.window")}</span><select value={period} onChange={(event) => changePeriod(event.target.value)}><option value="30d">{p("Last 30 days")}</option><option value="90d">{p("Last 90 days")}</option><option value="all">{p("All available history")}</option></select></label></div>
    {!canCompare && <section className="panel compare-placeholder"><h2>{t("compare.choose")}</h2><p><L>Search for two players above to see them side by side.</L></p></section>}
    {loading && <div className="compare-skeleton" role="status" aria-label="Loading comparison" aria-busy="true"><div /><div /><div /><div /></div>}
    {error && <p className="api-message error-message" role="alert">Comparison unavailable. {error}</p>}
    {!loading && !error && data && <>
      <section className="panel compare-summary"><div className="compare-player-heading">{data.players.map((player) => <div className="compare-player-card" key={player.accountId}><span className="compare-avatar" aria-hidden="true" style={player.avatar ? { backgroundImage: `url("${player.avatar}")` } : undefined}>{!player.avatar && player.name.slice(0, 1)}</span><div><h2>{player.name}</h2><p className="compare-rank"><RankBadge tier={player.rankTier} subrank={player.subrank} name={player.rankName} image={player.rankImage} size="sm" />{player.rankName || p("Rank unavailable")}{player.subrank !== null ? ` · ${p("Division {n}", { n: player.subrank })}` : ""}</p><Link href={`/players/${player.accountId}`}><L>Open player profile ↗</L></Link></div></div>)}</div>
        <div className="cmp-metrics">{[
          { label: t("compare.rank"), values: data.players.map((player) => player.rankName ? `${player.rankName}${player.subrank !== null ? ` · ${player.subrank}` : ""}` : "—"), raw: data.players.map((player) => player.rankTier !== null ? player.rankTier * 10 + (player.subrank ?? 0) : null), better: "high" as const },
          { label: t("compare.scored"), values: data.players.map((player) => num(player.matches)), raw: data.players.map((player) => player.matches), better: null },
          { label: t("compare.wins"), values: data.players.map((player) => num(player.matches ? player.wins : null)), raw: data.players.map((player) => player.matches ? player.wins : null), better: "high" as const },
          { label: t("compare.losses"), values: data.players.map((player) => num(player.matches ? player.losses : null)), raw: data.players.map((player) => player.matches ? player.losses : null), better: "low" as const },
          { label: t("compare.winRate"), values: data.players.map((player) => pct(player.winRate)), raw: data.players.map((player) => player.winRate), better: "high" as const },
          { label: t("compare.kda"), values: data.players.map((player) => kda(player.avgKills, player.avgDeaths, player.avgAssists)), raw: data.players.map((player) => player.avgDeaths && player.avgKills !== null && player.avgAssists !== null ? (player.avgKills + player.avgAssists) / Math.max(player.avgDeaths, 0.5) : null), better: "high" as const },
        ].map(({ label, values, raw, better }) => {
          const [a, b] = raw;
          const total = (a ?? 0) + (b ?? 0);
          const leftShare = a !== null && b !== null && total > 0 ? (a / total) * 100 : 50;
          const lead = better && a !== null && b !== null && a !== b ? ((better === "high" ? a > b : a < b) ? 0 : 1) : -1;
          return <div className="cmp-row" key={label}><strong data-lead={lead === 0}>{values[0]}</strong><div className="cmp-mid"><small>{label}</small><span className="cmp-bar" aria-hidden="true"><i style={{ width: `${leftShare}%` }} /></span></div><strong data-lead={lead === 1}>{values[1]}</strong></div>;
        })}</div>
      </section>
      {data.players.every((player) => player.matches === 0) && <p className="api-message"><L>No matches for these players in this period.</L></p>}
      {data.shared && <SharedMatches shared={data.shared} players={data.players} />}
      <section className="panel compare-heroes"><div className="panel-heading"><div><h2>{t("compare.heroes")}</h2></div></div>
        <div className="compare-hero-columns">{data.players.map((player) => <div className="compare-hero-column" key={player.accountId}><h3>{player.name}</h3>{player.heroes.length ? player.heroes.slice(0, 8).map((hero) => <Link className="compare-hero-row" href={`/heroes/${hero.heroId}`} key={hero.heroId}><span className="compare-hero-art" aria-hidden="true" style={hero.image ? { backgroundImage: `url("${hero.image}")` } : undefined}>{!hero.image && hero.name.slice(0, 1)}</span><span className="compare-hero-info"><b>{hero.name}</b><small>{p("{n} matches", { n: num(hero.matches) })} · {num(hero.wins)} W / {num(hero.losses)} L · {pct(hero.winRate)}</small><small>{p("Avg K / D / A")}: {kda(hero.avgKills, hero.avgDeaths, hero.avgAssists)}</small></span><span aria-hidden="true">↗</span></Link>) : <p className="profile-note"><L>No matches in this period.</L></p>}</div>)}</div>
      </section>
    </>}
    
  </main>;
}

function PlayerPicker({ label, selected, onSelect, onRemove }: { label: string; selected: SteamProfile | null; onSelect: (profile: SteamProfile) => void; onRemove: () => void }) {
  const { p } = useI18n();
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
    {selected && <div className="compare-selected"><span className="compare-avatar" aria-hidden="true" style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}>{!avatar && (selected.personaname?.slice(0, 1) || "?")}</span><span><strong>{selected.personaname || `Account ${selected.account_id}`}</strong><small>{p("Account ID")} {selected.account_id}</small></span><Link href={`/players/${selected.account_id}`}><L>Profile ↗</L></Link><button type="button" onClick={onRemove} aria-label={`Remove ${label}`}>×</button></div>}
    <input id={inputId} value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={selected ? p("Search to replace player…") : p("Search player name…")} autoComplete="off" />
    {query.trim().length === 1 && <p className="compare-picker-note"><L>Enter at least two characters.</L></p>}
    {loading && <p className="compare-picker-note" role="status"><L>Searching players…</L></p>}
    {error && <p className="compare-picker-note error-message" role="alert">{error}</p>}
    {query.trim().length >= 2 && !loading && !error && results.length === 0 && <p className="compare-picker-note"><L>No players found.</L></p>}
    {results.length > 0 && <div className="compare-search-results" role="listbox" aria-label={`${label} search results`}>{results.map((profile, index) => { const image = profile.avatarfull || profile.avatar; return <button className="compare-search-result" type="button" key={`${profile.account_id ?? "unknown"}-${index}`} onClick={() => choose(profile)}><span className="compare-avatar" aria-hidden="true" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{!image && (profile.personaname?.slice(0, 1) || "?")}</span><span><strong>{profile.personaname || p("Name unavailable")}</strong><small>{p("Account ID")} {profile.account_id ?? "—"}</small></span></button>; })}</div>}
  </section>;
}

/** Matches both players were in: record as teammates, head to head, and the latest shared games. */
function SharedMatches({ shared, players }: { shared: SharedSummary; players: ComparedPlayer[] }) {
  const { t } = useI18n();
  const [a, b] = players;
  const { together, against, recent } = shared;
  const rate = (wins: number, losses: number) => (wins + losses ? pct((wins / (wins + losses)) * 100) : "—");
  return <section className="panel cmp-shared">
    <div className="panel-heading"><div><h2>{t("compare.shared")}</h2></div><span className="live-tag">{num(together.matches + against.matches)} {t("compare.sharedCount")}</span></div>
    {together.matches + against.matches === 0 ? <p className="profile-note">{t("compare.noShared")}</p> : <>
      <div className="cmp-shared-cards">
        <div className="cmp-shared-card">
          <small>{t("compare.together")}</small>
          <strong>{num(together.matches)}</strong>
          <span>{together.wins} W / {together.losses} L · {rate(together.wins, together.losses)}</span>
        </div>
        <div className="cmp-shared-card">
          <small>{t("compare.against")}</small>
          <strong>{against.leftWins} : {against.rightWins}</strong>
          <span>{a.name} — {b.name}</span>
          {against.matches > 0 && <span className="cmp-h2h" aria-hidden="true"><i style={{ width: `${(against.leftWins / Math.max(1, against.leftWins + against.rightWins)) * 100}%` }} /></span>}
        </div>
      </div>
      <div className="cmp-shared-list">
        {recent.map((match) => {
          const result = match.leftWon === null ? "other" : match.together ? (match.leftWon ? "win" : "loss") : match.leftWon ? "left" : "right";
          const label = match.leftWon === null ? "—" : match.together ? (match.leftWon ? t("result.victory") : t("result.defeat")) : `${match.leftWon ? a.name : b.name} ${t("compare.won")}`;
          return <Link className="cmp-shared-row" href={`/matches/${match.matchId}`} key={match.matchId} data-result={result}>
            <span className="cmp-shared-kind">{match.together ? t("compare.togetherShort") : t("compare.againstShort")}</span>
            <SharedSide hero={match.leftHero} kda={match.leftKda} />
            <span className="cmp-shared-result">{label}</span>
            <SharedSide hero={match.rightHero} kda={match.rightKda} />
            <span className="cmp-shared-when">{match.startTime ? new Date(match.startTime * 1000).toLocaleDateString() : ""}</span>
          </Link>;
        })}
      </div>
    </>}
  </section>;
}

function SharedSide({ hero, kda }: { hero: SharedHero; kda: string }) {
  return <span className="cmp-shared-side">
    <i aria-hidden="true" style={hero?.image ? { backgroundImage: `url("${hero.image}")` } : undefined}>{hero?.image ? null : "?"}</i>
    <span><b>{hero?.name ?? "—"}</b><small>{kda}</small></span>
  </span>;
}

function num(value: number | null) { return value !== null && Number.isFinite(value) ? Math.round(value).toLocaleString() : "—"; }
function pct(value: number | null) { return value !== null && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—"; }
function kda(kills: number | null, deaths: number | null, assists: number | null) { return [kills, deaths, assists].map((value) => value !== null && Number.isFinite(value) ? value.toFixed(1) : "—").join(" / "); }
