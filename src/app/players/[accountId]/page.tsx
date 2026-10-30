import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AppShell from "../../components/app-shell";
import {
  getHeroes,
  getMatchHistory,
  getPlayerHeroStats,
  getPlayerRank,
  getRanks,
  getSteamProfiles,
  type MatchHistoryEntry,
  type PlayerHeroStats,
} from "../../../lib/deadlock-api";

type Props = { params: Promise<{ accountId: string }> };

function validAccountId(value: string) {
  if (!/^\d{1,10}$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 2_147_483_647;
}

function average(values: Array<number | undefined>) {
  const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatDate(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toLocaleString() : "—";
}

function formatDuration(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
    : "—";
}

function outcome(value: number | undefined) {
  if (value === 1) return { label: "Victory", className: "win" };
  if (value === 2) return { label: "Defeat", className: "loss" };
  if (value === 3) return { label: "Penalized", className: "" };
  if (value === 4) return { label: "Party penalized", className: "" };
  if (value === 5) return { label: "Not scored", className: "" };
  return { label: "Unknown", className: "" };
}

async function PlayerContent({ accountId }: { accountId: number }) {
  const [profileResult, historyResult, rankResult, heroStatsResult, heroesResult, ranksResult] = await Promise.allSettled([
    getSteamProfiles([accountId]),
    getMatchHistory(accountId),
    getPlayerRank(accountId),
    getPlayerHeroStats(accountId),
    getHeroes(),
    getRanks(),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value[0] : undefined;
  const matches = historyResult.status === "fulfilled" ? historyResult.value : [];
  const heroStats = heroStatsResult.status === "fulfilled" ? heroStatsResult.value : [];
  const heroes = heroesResult.status === "fulfilled" ? heroesResult.value : [];
  const ranks = ranksResult.status === "fulfilled" ? ranksResult.value : [];
  const heroNames = Object.fromEntries(heroes.flatMap((hero) => typeof hero.id === "number" && typeof hero.name === "string" ? [[String(hero.id), hero.name]] : []));
  const heroImages = Object.fromEntries(heroes.flatMap((hero) => {
    const image = hero.images?.icon_image_small_webp || hero.images?.icon_image_small;
    return typeof hero.id === "number" && typeof image === "string" ? [[String(hero.id), image]] : [];
  }));
  const rank = rankResult.status === "fulfilled" ? rankResult.value : undefined;
  const rankName = typeof rank?.rank === "number" ? ranks.find((entry) => entry.tier === rank.rank)?.name : undefined;
  const scoredMatches = matches.filter((match) => match.player_match_outcome === 1 || match.player_match_outcome === 2);
  const wins = scoredMatches.filter((match) => match.player_match_outcome === 1).length;
  const losses = scoredMatches.filter((match) => match.player_match_outcome === 2).length;
  const winRate = scoredMatches.length ? `${((wins / scoredMatches.length) * 100).toFixed(1)}%` : "—";
  const avgKda = [average(scoredMatches.map((match) => match.player_kills)), average(scoredMatches.map((match) => match.player_deaths)), average(scoredMatches.map((match) => match.player_assists))]
    .map((value) => value === null ? "—" : value.toFixed(1)).join(" / ");
  const historyError = historyResult.status === "rejected";

  return <main className="content-inner player-page">
    <Link className="back-link" href="/#player-search">← Search another player</Link>
    <div className="page-heading">
      <div><p className="eyebrow">PLAYER PROFILE / LIVE API DATA</p><h1>{profile?.personaname || `Account ${accountId}`}<span>.</span></h1><p className="muted">A current view of the player data returned by Deadlock API.</p></div>
      {profile?.profileurl && <a className="refresh-button" href={profile.profileurl} target="_blank" rel="noreferrer">Steam profile ↗</a>}
    </div>

    <section className="panel player-profile">
      <div className="profile-cover" />
      <div className="profile-identity">
        <span className="profile-avatar" aria-hidden="true" style={profile?.avatarfull || profile?.avatar ? { backgroundImage: `url("${profile.avatarfull || profile.avatar}")` } : undefined}>{profile?.avatarfull || profile?.avatar ? null : (profile?.personaname?.slice(0, 1) || "?")}</span>
        <div className="profile-name"><p className="eyebrow">STEAM PROFILE</p><h2>{profile?.personaname || "Name unavailable"}</h2><span>Account ID {accountId}{profile?.profileurl && <> · <a href={profile.profileurl} target="_blank" rel="noreferrer">Open Steam profile</a></>}</span></div>
        <div className="profile-rank"><small>CURRENT RANK</small><strong>{rankName || (typeof rank?.rank === "number" ? `Tier ${rank.rank}` : "Unavailable")}</strong><span>{typeof rank?.subrank === "number" ? `Subrank ${rank.subrank}` : "Rank data was not returned"}</span></div>
      </div>
      {historyError ? <p className="profile-note error-message">Match history is temporarily unavailable. The API did not return a usable response.</p> : <div className="profile-metrics">
        <div className="profile-metric"><small>MATCHES</small><strong>{formatNumber(matches.length)}</strong><span>Returned by match history</span></div>
        <div className="profile-metric"><small>WINS / LOSSES</small><strong>{scoredMatches.length ? `${wins} / ${losses}` : "—"}</strong><span>{scoredMatches.length ? "Scored matches" : "No scored results returned"}</span></div>
        <div className="profile-metric"><small>WIN RATE</small><strong>{winRate}</strong><span>{scoredMatches.length ? "Wins ÷ wins and losses" : "Unavailable without scored results"}</span></div>
        <div className="profile-metric"><small>AVG K / D / A</small><strong>{avgKda}</strong><span>Computed from available match fields</span></div>
      </div>}
    </section>

    <section className="panel hero-stats-block">
      <div className="panel-heading"><div><p className="eyebrow">PLAYER PERFORMANCE</p><h2>Hero statistics</h2></div><span className="live-tag">LIVE API DATA</span></div>
      {heroStatsResult.status === "rejected" ? <p className="profile-note">Per-hero statistics are unavailable from the API right now.</p> : heroStats.length === 0 ? <p className="profile-note">The API returned no per-hero statistics for this account.</p> : <div className="player-hero-grid">{heroStats.filter((stats) => typeof stats.hero_id === "number" && typeof stats.matches_played === "number" && stats.matches_played > 0).sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0)).map((stats) => <PlayerHeroCard key={stats.hero_id} stats={stats} name={heroNames[String(stats.hero_id)] || `Unknown hero (${stats.hero_id})`} image={heroImages[String(stats.hero_id)]} />)}</div>}
    </section>

    <section className="panel matches-panel">
      <div className="panel-heading"><div><p className="eyebrow">PLAYER ACTIVITY</p><h2>Recent matches</h2></div><span className="live-tag">LIVE API DATA</span></div>
      {historyError ? <p className="profile-note">No match rows can be displayed until the API responds successfully.</p> : !matches.length ? <p className="empty-history">No match history is available for this player.</p> : <div className="match-table"><div className="table-head"><span>RESULT</span><span>HERO</span><span>DURATION</span><span>K / D / A</span><span>PLAYED</span><span /></div>{matches.map((match, index) => <MatchRow accountId={accountId} match={match} heroName={typeof match.hero_id === "number" ? heroNames[String(match.hero_id)] || `Unknown hero (${match.hero_id})` : "Unknown hero"} key={match.match_id ?? `${match.start_time}-${index}`} />)}</div>}
    </section>
    <footer><span>DEADLOCK INTELLIGENCE · PLAYER DATA</span><span>Source: Deadlock API <i /></span></footer>
  </main>;
}

function PlayerHeroCard({ stats, name, image }: { stats: PlayerHeroStats; name: string; image?: string }) {
  const played = stats.matches_played as number;
  const perMatch = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? (value / played).toFixed(1) : "—";
  const rate = typeof stats.wins === "number" ? `${((stats.wins / played) * 100).toFixed(1)}% win rate` : "Win data unavailable";
  return <article className="player-hero-card"><span className="player-hero-image" aria-hidden="true" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{image ? null : name.slice(0, 1)}</span><div className="player-hero-info"><strong>{name}</strong><small>{played} matches · {typeof stats.wins === "number" ? `${stats.wins} wins · ${rate}` : rate}</small><small>Avg K / D / A: {perMatch(stats.kills)} / {perMatch(stats.deaths)} / {perMatch(stats.assists)}</small></div></article>;
}

function MatchRow({ accountId, match, heroName }: { accountId: number; match: MatchHistoryEntry; heroName: string }) {
  const result = outcome(match.player_match_outcome);
  const content = <><span className={`result ${result.className}`}><i />{result.label}</span><span className="match-hero"><b>{heroName.slice(0, 1)}</b>{heroName}</span><span>{formatDuration(match.match_duration_s)}</span><span className="match-score">{formatNumber(match.player_kills)} / {formatNumber(match.player_deaths)} / {formatNumber(match.player_assists)}</span><span className="match-time">{formatDate(match.start_time)}</span><span className="row-arrow">↗</span></>;
  return Number.isSafeInteger(match.match_id) ? <Link className="match-row match-row-link" href={`/matches/${match.match_id}?account_id=${accountId}`}>{content}</Link> : <div className="match-row">{content}</div>;
}

async function PlayerPageContent({ params }: Props) {
  const { accountId: rawAccountId } = await params;
  if (!validAccountId(rawAccountId)) notFound();
  return <PlayerContent accountId={Number(rawAccountId)} />;
}

export default function PlayerPage({ params }: Props) {
  return <AppShell active="Players"><Suspense fallback={<main className="content-inner player-page"><p className="api-message" role="status">Loading player profile…</p></main>}><PlayerPageContent params={params} /></Suspense></AppShell>;
}
