"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "./components/app-shell";

type Player = { account_id?: number; personaname?: string; avatar?: string; avatarfull?: string; profileurl?: string; matches_played_last_30d?: number };
type Match = { match_id?: number; hero_id?: number; start_time?: number; match_duration_s?: number; player_kills?: number; player_deaths?: number; player_assists?: number; player_match_outcome?: number };
type PlayerRank = { badge?: number; rank?: number; subrank?: number; last_match?: unknown };
type PlayerHeroStats = { hero_id?: number; matches_played?: number; wins?: number; kills?: number; deaths?: number; assists?: number };

function average(values: Array<number | undefined>) {
  const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}

function availableCount(values: Array<number | undefined>) {
  return values.filter((value) => typeof value === "number" && Number.isFinite(value) && value >= 0).length;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [heroNames, setHeroNames] = useState<Record<string, string>>({});
  const [heroImages, setHeroImages] = useState<Record<string, string>>({});
  const [rank, setRank] = useState<PlayerRank | null>(null);
  const [rankAvailable, setRankAvailable] = useState(false);
  const [rankNames, setRankNames] = useState<Record<string, string>>({});
  const [playerHeroStats, setPlayerHeroStats] = useState<PlayerHeroStats[]>([]);
  const [heroStatsAvailable, setHeroStatsAvailable] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setSearchError("Enter at least 2 characters to search.");
      setPlayers([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setSearchError("");
    setPlayers([]);
    setSelectedPlayer(null);
    setMatches([]);
    setRank(null);
    setRankAvailable(false);
    setPlayerHeroStats([]);
    setHeroStatsAvailable(false);
    setMatchError("");
    setHasSearched(true);
    void fetch(`/api/players/search?q=${encodeURIComponent(term)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Player search failed.");
        setPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch((error: unknown) => setSearchError(error instanceof Error ? error.message : "Player search failed."))
      .finally(() => setSearching(false));
  }

  const handleSelectPlayer = useCallback((player: Player) => {
    if (typeof player.account_id !== "number") {
      setMatchError("This result does not include a usable account ID.");
      return;
    }
    setSelectedPlayer(player);
    setLoadingMatches(true);
    setMatches([]);
    setRank(null);
    setRankAvailable(false);
    setRankNames({});
    setPlayerHeroStats([]);
    setHeroStatsAvailable(false);
    setHeroImages({});
    setMatchError("");
    void fetch(`/api/players/${player.account_id}/matches`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load match history.");
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setHeroNames(data.heroNames && typeof data.heroNames === "object" ? data.heroNames : {});
        setHeroImages(data.heroImages && typeof data.heroImages === "object" ? data.heroImages : {});
        setRank(data.rank && typeof data.rank === "object" ? data.rank : null);
        setRankAvailable(data.rankAvailable === true);
        setRankNames(data.rankNames && typeof data.rankNames === "object" ? data.rankNames : {});
        setPlayerHeroStats(Array.isArray(data.heroStats) ? data.heroStats : []);
        setHeroStatsAvailable(data.heroStatsAvailable === true);
      })
      .catch((error: unknown) => setMatchError(error instanceof Error ? error.message : "Could not load match history."))
      .finally(() => setLoadingMatches(false));
  }, []);

  useEffect(() => {
    const accountId = new URLSearchParams(window.location.search).get("account_id");
    if (!accountId || !/^\d+$/.test(accountId)) return;
    const controller = new AbortController();
    void fetch(`/api/players/search?q=${encodeURIComponent(accountId)}`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Player lookup failed."); return data; })
      .then((data) => { const found = Array.isArray(data.players) ? data.players.find((player: Player) => String(player.account_id) === accountId) : undefined; if (!found) throw new Error("The player profile could not be restored."); setQuery(found.personaname || accountId); setPlayers(data.players); setHasSearched(true); handleSelectPlayer(found); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "Player lookup failed."); });
    return () => controller.abort();
  }, [handleSelectPlayer]);

  const resultMatches = matches.filter((match) => match.player_match_outcome === 1 || match.player_match_outcome === 2);
  const wins = resultMatches.filter((match) => match.player_match_outcome === 1).length;
  const losses = resultMatches.filter((match) => match.player_match_outcome === 2).length;
  const winRate = resultMatches.length ? (wins / resultMatches.length) * 100 : null;
  const averageKills = average(resultMatches.map((match) => match.player_kills));
  const averageDeaths = average(resultMatches.map((match) => match.player_deaths));
  const averageAssists = average(resultMatches.map((match) => match.player_assists));

  return (
    <AppShell active="Overview">
      <div className="content-inner">
          <div className="page-heading">
            <div><p className="eyebrow">WELCOME BACK, EXPLORER</p><h1>Command center<span>.</span></h1><p className="muted">Track the meta. Read the match. Play with intent.</p></div>
            <button className="refresh-button">↻ <span>Refresh data</span></button>
          </div>

          <form id="player-search" className="search-bar" onSubmit={handleSearch}>
            <span className="search-icon">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a Steam name or account ID..." aria-label="Search a Steam name or account ID" />
            <kbd>⌘ K</kbd>
            <button type="submit" disabled={searching}>{searching ? "Searching..." : "Search"}</button>
          </form>
          {searchError && <p className="api-message error-message" role="alert">{searchError}</p>}
          {searching && <section className="player-results player-results-skeleton" aria-label="Searching player profiles" aria-busy="true"><p className="eyebrow">SEARCHING STEAM PROFILES</p>{[1, 2, 3].map((item) => <div className="player-result-skeleton" key={item}><span /><div><i /><i /></div></div>)}</section>}
          {hasSearched && !searching && !searchError && players.length === 0 && <p className="api-message">No players found. Try another name or account ID.</p>}
          {players.length > 0 && <section className="player-results" aria-label="Player search results"><p className="eyebrow">SELECT A PLAYER · {players.length} RESULTS</p>{players.map((player, index) => {
            const href = typeof player.account_id === "number" ? `/players/${player.account_id}` : "#player-search";
            return <Link className="player-result" href={href} key={player.account_id ?? index}><span className="player-avatar" aria-hidden="true" style={player.avatar ? { backgroundImage: `url("${player.avatar}")` } : undefined}>{player.avatar ? null : (player.personaname?.slice(0, 1) ?? "?")}</span><span className="player-result-info"><strong>{player.personaname || "Unknown Steam player"}</strong><small>Account ID: {player.account_id ?? "Unavailable"}{typeof player.matches_played_last_30d === "number" ? ` · ${player.matches_played_last_30d} matches in last 30 days` : ""}</small></span><span className="row-arrow">↗</span></Link>;
          })}</section>}

          <div className="section-title"><h2>At a glance</h2><span className="preview-tag">PREVIEW DATA</span><span className="line" /></div>
          <div className="metric-grid">
            <Metric label="MATCHES ANALYZED" value="—" change="—" note="Connect a player to begin" />
            <Metric label="ACTIVE PLAYERS" value="—" change="—" note="Global analytics unavailable" />
            <Metric label="CURRENT WIN RATE" value="—" change="—" note="No live sample selected" />
            <Metric label="META SHIFT" value="—" change="—" note="No live sample selected" accent />
          </div>

          <div className="dashboard-grid">
            <section className="panel hero-panel">
              <div className="panel-heading"><div><p className="eyebrow">THE META / PATCH 0.4.2</p><h2>Heroes in focus</h2></div><span className="preview-tag">PREVIEW DATA</span></div>
              <p className="profile-note panel-empty">Global hero analytics will appear here after the analytics endpoint is connected. No placeholder values are shown.</p>
            </section>

            <section className="panel trend-panel">
              <div className="panel-heading"><div><p className="eyebrow">PERFORMANCE / 30 DAYS</p><h2>Win rate trend</h2></div><span className="preview-tag">PREVIEW DATA</span></div>
              <p className="profile-note panel-empty">Win rate trend requires a selected player and a live match sample.</p>
            </section>
          </div>

          {selectedPlayer && <section className="panel player-profile" aria-label="Player profile">
            <div className="profile-cover" />
            <div className="profile-identity">
              <span className="profile-avatar" aria-hidden="true" style={(selectedPlayer.avatarfull || selectedPlayer.avatar) ? { backgroundImage: `url("${selectedPlayer.avatarfull || selectedPlayer.avatar}")` } : undefined}>{(selectedPlayer.avatarfull || selectedPlayer.avatar) ? null : selectedPlayer.personaname?.slice(0, 1) || "?"}</span>
              <div className="profile-name"><p className="eyebrow">PLAYER PROFILE</p><h2>{selectedPlayer.personaname || "Unknown Steam player"}</h2><span>Account ID {selectedPlayer.account_id ?? "Unavailable"}{selectedPlayer.profileurl && <> · <a href={selectedPlayer.profileurl} target="_blank" rel="noreferrer">Steam profile ↗</a></>}</span></div>
            <div className="profile-rank"><small>CURRENT RANK</small><strong>{loadingMatches ? "Loading rank…" : rankAvailable && rank?.rank === 0 ? "Obscurus · Unranked" : rankAvailable && typeof rank?.rank === "number" ? `${rankNames[String(rank.rank)] || `Tier ${rank.rank}`}${typeof rank.subrank === "number" && rank.subrank > 0 ? ` ${rank.subrank}` : ""}` : "Rank unavailable"}</strong></div>
            </div>
            {loadingMatches && <p className="profile-note" role="status">Loading match history and player statistics…</p>}
            {matchError && <p className="profile-note error-message" role="alert">Player statistics could not be loaded. {matchError}</p>}
            {!loadingMatches && !matchError && <div className="profile-metrics">
              <ProfileMetric label="MATCHES LOADED" value={String(matches.length)} note="Returned by match history; not account total" />
              <ProfileMetric label="WINS / LOSSES" value={`${wins} / ${losses}`} note={`${resultMatches.length} matches with a scored result`} />
              <ProfileMetric label="WIN RATE" value={winRate === null ? "—" : `${winRate.toFixed(1)}%`} note={resultMatches.length ? "Wins ÷ wins and losses" : "Insufficient scored matches"} />
              <ProfileMetric label="AVG K / D / A" value={[averageKills, averageDeaths, averageAssists].map((value) => value === null ? "—" : value.toFixed(1)).join(" / ")} note={`Valid values in K / D / A: ${availableCount(resultMatches.map((match) => match.player_kills))} / ${availableCount(resultMatches.map((match) => match.player_deaths))} / ${availableCount(resultMatches.map((match) => match.player_assists))} matches`} />
            </div>}
            {!loadingMatches && !matchError && matches.length > 0 && resultMatches.length === 0 && <p className="profile-note">History loaded, but it contains no matches with a scored win or loss. Win rate and K/D/A are unavailable.</p>}
            <div className="hero-stats-block">
              <div className="panel-heading"><div><p className="eyebrow">PLAYER PERFORMANCE</p><h2>Hero statistics</h2></div><span className="live-tag">AGGREGATED · NORMAL MODE</span></div>
              {!loadingMatches && !matchError && playerHeroStats.length > 0 && <p className="profile-note">Per-hero totals come from the API aggregate and may cover a different sample than the loaded match history above.</p>}
              {loadingMatches ? null : matchError ? null : !heroStatsAvailable ? <p className="profile-note">Per-hero statistics could not be loaded from the API.</p> : playerHeroStats.length === 0 ? <p className="profile-note">The API returned no per-hero statistics for this account.</p> : <div className="player-hero-grid">{playerHeroStats.filter((stats) => typeof stats.hero_id === "number" && typeof stats.matches_played === "number" && stats.matches_played > 0).sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0)).map((stats) => {
                const id = String(stats.hero_id);
                const played = stats.matches_played as number;
                const heroWinRate = typeof stats.wins === "number" ? `${((stats.wins / played) * 100).toFixed(1)}%` : "—";
                const perMatch = (total: number | undefined) => typeof total === "number" && Number.isFinite(total) && total >= 0 ? (total / played).toFixed(1) : "—";
                return <article className="player-hero-card" key={id}><span className="player-hero-image" aria-hidden="true" style={heroImages[id] ? { backgroundImage: `url("${heroImages[id]}")` } : undefined}>{heroImages[id] ? null : (heroNames[id]?.slice(0, 1) || "?")}</span><div className="player-hero-info"><strong>{heroNames[id] || `Unknown hero (${id})`}</strong><small>{played} matches · {typeof stats.wins === "number" ? `${stats.wins} wins · ${heroWinRate} win rate` : "win data unavailable"}</small><small>Avg K / D / A: {perMatch(stats.kills)} / {perMatch(stats.deaths)} / {perMatch(stats.assists)}</small></div></article>;
              })}</div>}
            </div>
          </section>}

          <section id="matches" className="panel matches-panel">
            <div className="panel-heading"><div><p className="eyebrow">PLAYER ACTIVITY</p><h2>{selectedPlayer ? `${selectedPlayer.personaname || "Selected player"} · Recent matches` : "Recent matches"}</h2></div>{selectedPlayer && <span className="live-tag">LIVE PLAYER DATA</span>}</div>
            {!selectedPlayer && <p className="empty-history">Search for a player and select a profile to load match history.</p>}
            {selectedPlayer && <div className="selected-player"><span className="eyebrow">SELECTED STEAM PROFILE</span><strong>{selectedPlayer.personaname || "Unknown Steam player"}</strong><small>Account ID: {selectedPlayer.account_id ?? "Unavailable"}</small>{typeof selectedPlayer.matches_played_last_30d === "number" && <small>{selectedPlayer.matches_played_last_30d} matches in the last 30 days</small>}{selectedPlayer.profileurl && <a href={selectedPlayer.profileurl} target="_blank" rel="noreferrer">View Steam profile ↗</a>}</div>}
            {selectedPlayer && loadingMatches && <p className="api-message" role="status">Loading match history...</p>}
            {selectedPlayer && matchError && <p className="api-message error-message" role="alert">{matchError}</p>}
            {selectedPlayer && !loadingMatches && !matchError && matches.length === 0 && <p className="empty-history">No match history is available for this player.</p>}
            {selectedPlayer && !loadingMatches && !matchError && matches.length > 0 && <div className="match-table"><div className="table-head"><span>RESULT</span><span>HERO</span><span>DURATION</span><span>K / D / A</span><span>PLAYED</span><span /></div>{matches.map((match, index) => {
              const outcome = match.player_match_outcome;
              const result = outcome === 1 ? "Victory" : outcome === 2 ? "Defeat" : outcome === 3 ? "Penalized" : outcome === 4 ? "Party penalized" : outcome === 5 ? "Not scored" : "Unknown";
              const tone = outcome === 1 ? "win" : outcome === 2 ? "loss" : "";
              const date = typeof match.start_time === "number" ? new Date(match.start_time * 1000).toLocaleString() : "—";
              const duration = typeof match.match_duration_s === "number" ? `${Math.floor(match.match_duration_s / 60)}:${String(match.match_duration_s % 60).padStart(2, "0")}` : "—";
              const heroName = typeof match.hero_id === "number" ? heroNames[String(match.hero_id)] || `Unknown hero (${match.hero_id})` : "Unknown hero";
              const stat = (value: number | undefined) => typeof value === "number" ? value : "—";
              const rowContents = <><span className={`result ${tone}`}><i />{result}</span><span className="match-hero"><b>{heroName.slice(0, 1)}</b>{heroName}</span><span>{duration}</span><span className="match-score">{stat(match.player_kills)} / {stat(match.player_deaths)} / {stat(match.player_assists)}</span><span className="match-time">{date}</span><span className="row-arrow">{Number.isSafeInteger(match.match_id) ? "↗" : "—"}</span></>;
              return Number.isSafeInteger(match.match_id) ? <Link className="match-row match-row-link" href={"/matches/" + match.match_id + "?account_id=" + selectedPlayer.account_id} key={match.match_id}>{rowContents}</Link> : <div className="match-row" key={String(match.start_time ?? "match") + "-" + index}>{rowContents}</div>;
            })}</div>}
          </section>
          <footer><span>DEADLOCK INTELLIGENCE <b>·</b> DATA WITH INTENT</span><span>Last synced just now <i /></span></footer>
        </div>
    </AppShell>
  );
}

function Metric({ label, value, change, note, accent = false }: { label: string; value: string; change: string; note: string; accent?: boolean }) {
  return <div className={`metric ${accent ? "accent" : ""}`}><p>{label}</p><strong>{value}</strong><div><span>{change}</span> {note}</div></div>;
}

function ProfileMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="profile-metric"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>;
}
