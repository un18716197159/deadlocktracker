import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { T } from "../../../lib/i18n/provider";
import { FavoriteButton } from "../../components/favorites";
import { RecordVisit } from "../../components/recent-players";
import FormCharts from "./form-charts";
import "./player-page.css";
import AppShell from "../../components/app-shell";
import RankBadge from "../../components/rank-badge";
import { heroPortrait, rankImage } from "../../../lib/assets";
import { average, formatDate, formatDuration, formatNumber } from "../../../lib/format";
import { parseAccountId } from "../../../lib/validation";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { accountId } = await params;
  return {
    title: `Player ${accountId} | Deadlock Intelligence`,
    description: `Deadlock rank, match history and hero stats for player ${accountId}.`,
  };
}

function outcome(value: number | undefined) {
  if (value === 1) return { key: "result.victory" as const, className: "win" };
  if (value === 2) return { key: "result.defeat" as const, className: "loss" };
  return { key: "result.other" as const, className: "" };
}

async function PlayerContent({ accountId }: { accountId: number }) {
  await connection();
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
    const image = heroPortrait(hero);
    return typeof hero.id === "number" && typeof image === "string" ? [[String(hero.id), image]] : [];
  }));
  const rank = rankResult.status === "fulfilled" ? rankResult.value : undefined;
  const rankName = typeof rank?.rank === "number" ? ranks.find((entry) => entry.tier === rank.rank)?.name : undefined;
  const rankArtwork = typeof rank?.rank === "number" ? rankImage(ranks.find((entry) => entry.tier === rank.rank)) : null;
  const scoredMatches = matches.filter((match) => match.player_match_outcome === 1 || match.player_match_outcome === 2);
  const wins = scoredMatches.filter((match) => match.player_match_outcome === 1).length;
  const losses = scoredMatches.filter((match) => match.player_match_outcome === 2).length;
  const winRate = scoredMatches.length ? `${((wins / scoredMatches.length) * 100).toFixed(1)}%` : "—";
  const avgKda = [average(scoredMatches.map((match) => match.player_kills)), average(scoredMatches.map((match) => match.player_deaths)), average(scoredMatches.map((match) => match.player_assists))]
    .map((value) => value === null ? "—" : value.toFixed(1)).join(" / ");
  const historyError = historyResult.status === "rejected";

  const avatar = profile?.avatarfull || profile?.avatar;
  const heroRows = heroStats.filter((stats) => typeof stats.hero_id === "number" && typeof stats.matches_played === "number" && stats.matches_played > 0).sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0));
  const rankLabel = rankName || (typeof rank?.rank === "number" ? `Tier ${rank.rank}` : "Unranked");

  return <main className="content-inner player-page pp">
    <RecordVisit id={accountId} name={profile?.personaname || `Account ${accountId}`} avatar={avatar || undefined} />
    <section className="pp-header">
      <span className="pp-avatar" aria-hidden="true" style={avatar ? { backgroundImage: `url("${avatar}")` } : undefined}>{avatar ? null : (profile?.personaname?.slice(0, 1) || "?")}</span>
      <div className="pp-identity">
        <h1>{profile?.personaname || `Account ${accountId}`}</h1>
        <p><T k="profile.accountId" /> {accountId}{profile?.profileurl && <> · <a href={profile.profileurl} target="_blank" rel="noreferrer"><T k="profile.steam" /></a></>}</p>
        <div className="pp-actions"><FavoriteButton accountId={accountId} name={profile?.personaname || `Account ${accountId}`} avatar={avatar || undefined} /><Link href={`/compare?left=${accountId}`}><T k="profile.compare" /></Link></div>
      </div>
      <div className="pp-rank">
        <RankBadge tier={rank?.rank} subrank={rank?.subrank} name={rankName} image={rankArtwork} size="lg" />
        <div><small><T k="profile.currentRank" /></small><strong>{rankLabel}</strong>{typeof rank?.subrank === "number" && <span><T k="profile.division" vars={{ n: rank.subrank }} /></span>}</div>
      </div>
    </section>

    {historyError ? <p className="api-message error-message">Match history is temporarily unavailable. Try again in a minute.</p> : (
      <div className="pp-kpis">
        <div><small><T k="profile.matches" /></small><strong>{formatNumber(matches.length)}</strong><span><T k="profile.recentHistory" /></span></div>
        <div><small><T k="profile.winRate" /></small><strong>{winRate}</strong><span>{scoredMatches.length ? `${wins}W ${losses}L` : <T k="profile.noScored" />}</span></div>
        <div><small><T k="profile.kda" /></small><strong>{avgKda}</strong><span><T k="profile.perMatch" /></span></div>
        <div><small><T k="profile.heroesPlayed" /></small><strong>{heroRows.length || "—"}</strong><span><T k="profile.allTime" /></span></div>
      </div>
    )}

    {!historyError && <FormCharts matches={matches} heroNames={heroNames} />}

    <div className="pp-columns">
      <section className="pp-panel">
        <h2><T k="profile.heroes" /></h2>
        {heroStatsResult.status === "rejected" ? <p className="muted">Per-hero statistics are unavailable right now.</p> : heroRows.length === 0 ? <p className="muted"><T k="profile.noHeroes" /></p> : (
          <div className="pp-heroes">{heroRows.slice(0, 12).map((stats) => <PlayerHeroCard key={stats.hero_id} stats={stats} name={heroNames[String(stats.hero_id)] || `Hero ${stats.hero_id}`} image={heroImages[String(stats.hero_id)]} heroId={stats.hero_id as number} />)}</div>
        )}
      </section>

      <section className="pp-panel">
        <h2><T k="profile.recent" /></h2>
        {historyError ? <p className="muted">No matches can be shown until the API responds.</p> : !matches.length ? <p className="muted"><T k="profile.noMatches" /></p> : (
          <div className="pp-matches">{matches.map((match, index) => <MatchRow accountId={accountId} match={match} heroName={typeof match.hero_id === "number" ? heroNames[String(match.hero_id)] || `Hero ${match.hero_id}` : "Unknown hero"} heroImage={typeof match.hero_id === "number" ? heroImages[String(match.hero_id)] : undefined} key={match.match_id ?? `${match.start_time}-${index}`} />)}</div>
        )}
      </section>
    </div>
  </main>;
}

function PlayerHeroCard({ stats, name, image, heroId }: { stats: PlayerHeroStats; name: string; image?: string; heroId: number }) {
  const played = stats.matches_played as number;
  const perMatch = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? (value / played).toFixed(1) : "—";
  const rate = typeof stats.wins === "number" ? (stats.wins / played) * 100 : null;
  return (
    <Link href={`/heroes/${heroId}`} className="pp-hero">
      <span className="pp-hero-img" aria-hidden="true" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{image ? null : name.slice(0, 1)}</span>
      <span className="pp-hero-main">
        <strong>{name}</strong>
        <small>{played} <T k="profile.matchesWord" /> · {perMatch(stats.kills)} / {perMatch(stats.deaths)} / {perMatch(stats.assists)} KDA</small>
        <span className="pp-bar" aria-hidden="true"><i style={{ width: `${rate === null ? 0 : Math.min(100, rate)}%` }} data-good={rate !== null && rate >= 50} /></span>
      </span>
      <b className="pp-hero-rate" data-good={rate !== null && rate >= 50}>{rate === null ? "—" : `${rate.toFixed(0)}%`}</b>
    </Link>
  );
}

function MatchRow({ accountId, match, heroName, heroImage }: { accountId: number; match: MatchHistoryEntry; heroName: string; heroImage?: string }) {
  const result = outcome(match.player_match_outcome);
  const content = <><span className="pp-result" data-result={result.className || "other"}><T k={result.key} /></span><span className="pp-match-hero"><i style={heroImage ? { backgroundImage: `url("${heroImage}")` } : undefined}>{heroImage ? null : heroName.slice(0, 1)}</i>{heroName}</span><span className="pp-kda">{formatNumber(match.player_kills)} / {formatNumber(match.player_deaths)} / {formatNumber(match.player_assists)}</span><span className="pp-dur">{formatDuration(match.match_duration_s)}</span><span className="pp-when">{formatDate(match.start_time)}</span></>;
  return Number.isSafeInteger(match.match_id) ? <Link className="pp-match" data-result={result.className || "other"} href={`/matches/${match.match_id}?account_id=${accountId}`}>{content}</Link> : <div className="pp-match" data-result={result.className || "other"}>{content}</div>;
}

async function PlayerPageContent({ params }: Props) {
  const { accountId: rawAccountId } = await params;
  const accountId = parseAccountId(rawAccountId);
  if (accountId === null) notFound();
  return <PlayerContent accountId={accountId} />;
}

export default function PlayerPage({ params }: Props) {
  return <AppShell active="Players"><Suspense fallback={<main className="content-inner player-page"><p className="api-message" role="status">Loading player profile…</p></main>}><PlayerPageContent params={params} /></Suspense></AppShell>;
}
