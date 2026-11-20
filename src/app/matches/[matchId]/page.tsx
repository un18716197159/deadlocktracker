import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import AppShell from "../../components/app-shell";
import LocalTime from "../../components/local-time";
import { TEAMS } from "../../../lib/teams";
import { getHeroes, getMatchDetails, getMatchItems, getSteamProfiles } from "../../../lib/deadlock-api";
import { heroPortrait } from "../../../lib/assets";
import { ItemTimeline, NetWorthChart } from "./match-charts";
import { L } from "../../../lib/i18n/provider";

type Props = { params: Promise<{ matchId: string }>; searchParams: Promise<{ account_id?: string }> };
export async function generateMetadata({ params }: Props) {
  const { matchId } = await params;
  return { title: `Match ${matchId} | Deadlock Tracker` };
}
const fmtDuration = (value?: number) => value === undefined ? "Unavailable" : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
const fmtStat = (value?: number) => value === undefined ? "—" : value.toLocaleString();

function TeamSummary({ players }: { players: Array<{ team?: number; kills?: number; deaths?: number; assists?: number; net_worth?: number; player_damage?: number; player_healing?: number; player_damage_taken?: number }> }) {
  const sum = (team: number, pick: (player: (typeof players)[number]) => number | undefined) => players.filter((player) => player.team === team).reduce((total, player) => total + (pick(player) ?? 0), 0);
  const rows = [
    { label: "Souls (net worth)", values: [0, 1].map((team) => sum(team, (p) => p.net_worth)) },
    { label: "Kills", values: [0, 1].map((team) => sum(team, (p) => p.kills)) },
    { label: "Player damage", values: [0, 1].map((team) => sum(team, (p) => p.player_damage)) },
    { label: "Healing", values: [0, 1].map((team) => sum(team, (p) => p.player_healing)) },
    { label: "Damage taken", values: [0, 1].map((team) => sum(team, (p) => p.player_damage_taken)) },
  ].filter((row) => row.values[0] + row.values[1] > 0);
  if (!rows.length) return null;
  return (
    <section className="panel ms-summary">
      <div className="ms-names"><b style={{ color: TEAMS[0].color }}>{TEAMS[0].name}</b><b style={{ color: TEAMS[1].color }}>{TEAMS[1].name}</b></div>
      {rows.map((row) => {
        const total = row.values[0] + row.values[1];
        const left = total ? (row.values[0] / total) * 100 : 50;
        return (
          <div className="ms-row" key={row.label}>
            <strong>{row.values[0].toLocaleString()}</strong>
            <div className="ms-mid"><small><L>{row.label}</L></small><span className="ms-bar" aria-hidden="true"><i style={{ width: `${left}%`, background: TEAMS[0].color }} /><i style={{ width: `${100 - left}%`, background: TEAMS[1].color }} /></span></div>
            <strong>{row.values[1].toLocaleString()}</strong>
          </div>
        );
      })}
    </section>
  );
}

async function Content({ params, searchParams }: Props) {
  const [{ matchId }, search] = await Promise.all([params, searchParams]);
  if (!/^\d{1,19}$/.test(matchId) || (matchId.length === 19 && matchId > "9223372036854775807")) notFound();
  const match = await getMatchDetails(matchId);
  // Steam names come from the DB-backed cache, which reads the clock: load them per request.
  await connection();
  const ids = match.players.map((player) => player.account_id);
  const [heroResult, itemResult, profileResult] = await Promise.allSettled([getHeroes(), getMatchItems(), getSteamProfiles(ids)]);
  const heroes = heroResult.status === "fulfilled" ? heroResult.value : [];
  const items = itemResult.status === "fulfilled" ? itemResult.value : [];
  const profiles = profileResult.status === "fulfilled" ? profileResult.value : [];
  const heroById = new Map(heroes.map((hero) => [hero.id, hero]));  const profileById = new Map(profiles.map((profile) => [profile.account_id, profile]));
  const accountId = search.account_id && /^\d+$/.test(search.account_id) ? search.account_id : undefined;
  const winner = match.not_scored ? undefined : match.winning_team === 0 || match.winning_team === 1 ? match.winning_team : undefined;
  return <main className="content-inner match-detail">
    <Link className="match-back-link" href={accountId ? "/players/" + accountId : "/matches"}><L>{accountId ? "← Back to player profile" : "← Match Explorer"}</L></Link>
    <div className="page-heading match-heading"><div><h1><L>Match</L> <span>#{match.match_id ?? matchId}</span></h1><p className="muted"><L>Played</L> <LocalTime seconds={match.start_time} mode="full" /> · {fmtDuration(match.duration_s)}</p></div><span className="match-result-tag" style={winner === undefined ? undefined : { color: TEAMS[winner].color }}>{winner === undefined ? <L>{match.not_scored ? "NOT SCORED" : "RESULT UNAVAILABLE"}</L> : <L vars={{ team: TEAMS[winner].name.toUpperCase() }}>{"{team} WON"}</L>}</span></div>
    {match.players.length > 0 && <TeamSummary players={match.players} />}
    {match.players.length > 0 && <NetWorthChart players={match.players} duration={match.duration_s} />}
    {match.players.length > 0 && <ItemTimeline players={match.players} duration={match.duration_s} heroes={heroes} items={items} />}
    {!match.players.length ? <section className="panel match-empty"><h2><L>Player data unavailable</L></h2><p><L>This match has no player data.</L></p></section> : <div className="match-teams">{[0, 1].map((team) => {
      const roster = match.players.filter((player) => player.team === team).sort((a, b) => (a.player_slot ?? 99) - (b.player_slot ?? 99));
      return <section className={`panel match-team ${winner === team ? "winning-team" : ""}`} key={team}>
        <header className="match-team-heading"><div><p className="eyebrow" style={{ color: TEAMS[team].color }}>{TEAMS[team].name.toUpperCase()}</p><h2><L>{winner === undefined ? "Roster" : winner === team ? "Victory" : "Defeat"}</L></h2></div><span>{roster.length} players</span></header>
        {!roster.length ? <p className="profile-note"><L>No players.</L></p> : <div className="match-roster">{roster.map((player) => {
          const hero = player.hero_id === undefined ? undefined : heroById.get(player.hero_id);
          const profile = profileById.get(player.account_id);
          const name = profile?.personaname || `Account ID ${player.account_id}`;
          const heroName = hero?.name || (player.hero_id === undefined ? "Hero unavailable" : "Unknown hero (" + player.hero_id + ")");
          const heroHref = hero?.id === undefined ? undefined : "/heroes/" + hero.id;
          const portrait = hero ? heroPortrait(hero) : null;
          return <article className="match-player" key={player.account_id}>
            <div className="match-player-main"><span className="match-player-avatar" aria-hidden="true" style={profile?.avatar ? { backgroundImage: `url("${profile.avatar}")` } : {}}>{profile?.avatar ? "" : name.slice(0, 1)}</span><span className="match-player-hero" aria-hidden="true" style={portrait ? { backgroundImage: `url("${portrait}")` } : {}}>{portrait ? "" : "?"}</span><div className="match-player-name"><strong><Link href={"/players/" + player.account_id}>{name}</Link></strong><small>{heroHref ? <Link href={heroHref}>{heroName}</Link> : heroName}</small></div>{profile?.profileurl && <a className="match-steam-link" href={profile.profileurl} target="_blank" rel="noreferrer">Steam ↗</a>}</div>
            <div className="match-player-stats"><div><small>K / D / A</small><strong>{fmtStat(player.kills)} / {fmtStat(player.deaths)} / {fmtStat(player.assists)}</strong></div><div><small><L>NET WORTH</L></small><strong>{fmtStat(player.net_worth)}</strong></div><div><small><L>LAST HITS</L></small><strong>{fmtStat(player.last_hits)}</strong></div><div><small><L>DENIES</L></small><strong>{fmtStat(player.denies)}</strong></div><div><small><L>LEVEL</L></small><strong>{fmtStat(player.level)}</strong></div><div><small><L>PLAYER DAMAGE</L></small><strong>{fmtStat(player.player_damage)}</strong></div><div><small><L>DAMAGE TAKEN</L></small><strong>{fmtStat(player.player_damage_taken)}</strong></div><div><small><L>HEALING</L></small><strong>{fmtStat(player.player_healing)}</strong></div></div>
          </article>;
        })}</div>}
      </section>;
    })}</div>}
  </main>;
}
export default function MatchPage(props: Props) {
  return <AppShell active="Matches"><Suspense fallback={<main className="content-inner match-detail"><p className="api-message" role="status"><L>Loading match metadata…</L></p></main>}><Content {...props} /></Suspense></AppShell>;
}


