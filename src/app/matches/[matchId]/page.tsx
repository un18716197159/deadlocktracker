import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AppShell from "../../components/app-shell";
import LocalTime from "../../components/local-time";
import { TEAMS } from "../../../lib/teams";
import { getHeroes, getMatchDetails, getMatchItems, getSteamProfiles } from "../../../lib/deadlock-api";
import { heroPortrait, itemImage } from "../../../lib/assets";

type Props = { params: Promise<{ matchId: string }>; searchParams: Promise<{ account_id?: string }> };
export async function generateMetadata({ params }: Props) {
  const { matchId } = await params;
  return { title: `Match ${matchId} | Deadlock Intelligence` };
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
            <div className="ms-mid"><small>{row.label}</small><span className="ms-bar" aria-hidden="true"><i style={{ width: `${left}%`, background: TEAMS[0].color }} /><i style={{ width: `${100 - left}%`, background: TEAMS[1].color }} /></span></div>
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
  const ids = match.players.map((player) => player.account_id);
  const [heroResult, itemResult, profileResult] = await Promise.allSettled([getHeroes(), getMatchItems(), getSteamProfiles(ids)]);
  const heroes = heroResult.status === "fulfilled" ? heroResult.value : [];
  const items = itemResult.status === "fulfilled" ? itemResult.value : [];
  const profiles = profileResult.status === "fulfilled" ? profileResult.value : [];
  const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const profileById = new Map(profiles.map((profile) => [profile.account_id, profile]));
  const accountId = search.account_id && /^\d+$/.test(search.account_id) ? search.account_id : undefined;
  const winner = match.not_scored ? undefined : match.winning_team === 0 || match.winning_team === 1 ? match.winning_team : undefined;
  return <main className="content-inner match-detail">
    <Link className="match-back-link" href={accountId ? "/players/" + accountId : "/matches"}>{accountId ? "← Back to player profile" : "← Match Explorer"}</Link>
    <div className="page-heading match-heading"><div><p className="eyebrow">MATCH DETAILS</p><h1>Match <span>#{match.match_id ?? matchId}</span></h1><p className="muted">Played <LocalTime seconds={match.start_time} mode="full" /> · {fmtDuration(match.duration_s)}</p></div><span className="match-result-tag" style={winner === undefined ? undefined : { color: TEAMS[winner].color }}>{winner === undefined ? match.not_scored ? "NOT SCORED" : "RESULT UNAVAILABLE" : `${TEAMS[winner].name.toUpperCase()} WON`}</span></div>
    {match.players.length > 0 && <TeamSummary players={match.players} />}
    {!match.players.length ? <section className="panel match-empty"><h2>Player data unavailable</h2><p>No player rows were returned in match metadata.</p></section> : <div className="match-teams">{[0, 1].map((team) => {
      const roster = match.players.filter((player) => player.team === team).sort((a, b) => (a.player_slot ?? 99) - (b.player_slot ?? 99));
      return <section className={`panel match-team ${winner === team ? "winning-team" : ""}`} key={team}>
        <header className="match-team-heading"><div><p className="eyebrow" style={{ color: TEAMS[team].color }}>{TEAMS[team].name.toUpperCase()}</p><h2>{winner === undefined ? "Roster" : winner === team ? "Victory" : "Defeat"}</h2></div><span>{roster.length} players</span></header>
        {!roster.length ? <p className="profile-note">No players returned for this team.</p> : <div className="match-roster">{roster.map((player) => {
          const hero = player.hero_id === undefined ? undefined : heroById.get(player.hero_id);
          const profile = profileById.get(player.account_id);
          const name = profile?.personaname || `Account ID ${player.account_id}`;
          const heroName = hero?.name || (player.hero_id === undefined ? "Hero unavailable" : "Unknown hero (" + player.hero_id + ")");
          const heroHref = hero?.id === undefined ? undefined : "/heroes/" + hero.id;
          const portrait = hero ? heroPortrait(hero) : null;
          const recentItems = [...player.items].sort((a, b) => (a.game_time_s ?? 0) - (b.game_time_s ?? 0));
          return <article className="match-player" key={player.account_id}>
            <div className="match-player-main"><span className="match-player-avatar" aria-hidden="true" style={profile?.avatar ? { backgroundImage: `url("${profile.avatar}")` } : {}}>{profile?.avatar ? "" : name.slice(0, 1)}</span><span className="match-player-hero" aria-hidden="true" style={portrait ? { backgroundImage: `url("${portrait}")` } : {}}>{portrait ? "" : "?"}</span><div className="match-player-name"><strong><Link href={"/players/" + player.account_id}>{name}</Link></strong><small>{heroHref ? <Link href={heroHref}>{heroName}</Link> : heroName} · ID {player.account_id}</small></div>{profile?.profileurl && <a className="match-steam-link" href={profile.profileurl} target="_blank" rel="noreferrer">Steam ↗</a>}</div>
            <div className="match-player-stats"><div><small>K / D / A</small><strong>{fmtStat(player.kills)} / {fmtStat(player.deaths)} / {fmtStat(player.assists)}</strong></div><div><small>NET WORTH</small><strong>{fmtStat(player.net_worth)}</strong></div><div><small>LAST HITS</small><strong>{fmtStat(player.last_hits)}</strong></div><div><small>DENIES</small><strong>{fmtStat(player.denies)}</strong></div><div><small>LEVEL</small><strong>{fmtStat(player.level)}</strong></div><div><small>PLAYER DAMAGE</small><strong>{fmtStat(player.player_damage)}</strong></div><div><small>DAMAGE TAKEN</small><strong>{fmtStat(player.player_damage_taken)}</strong></div><div><small>HEALING</small><strong>{fmtStat(player.player_healing)}</strong></div></div>
            {recentItems.length > 0 && <div className="match-inventory"><small>ITEM HISTORY / PURCHASE AND SALE EVENTS</small><div>{recentItems.map((event, index) => { const item = event.item_id === undefined ? undefined : itemById.get(event.item_id); const label = item?.name || (event.item_id === undefined ? "Unknown item" : `Unknown item (${event.item_id})`); const image = item ? itemImage(item) : null; const content = <><i style={image ? { backgroundImage: `url("${image}")` } : {}} />{label}<b>{fmtDuration(event.game_time_s)}</b>{event.sold_time_s !== undefined ? <em>SOLD {fmtDuration(event.sold_time_s)}</em> : null}</>; return event.item_id !== undefined && item ? <Link className="match-item" href={`/items/${event.item_id}`} key={`${event.item_id}-${event.game_time_s}-${index}`} title={label}>{content}</Link> : <span className="match-item" key={`${event.item_id}-${event.game_time_s}-${index}`} title={label}>{content}</span>; })}</div></div>}
          </article>;
        })}</div>}
      </section>;
    })}</div>}
    <p className="match-data-note">Damage, damage taken and healing use the latest available player stats snapshot; unavailable values are shown as —.</p>
    {heroResult.status === "rejected" && <p className="match-data-note">Hero assets unavailable; hero IDs are shown where available.</p>}
    {itemResult.status === "rejected" && <p className="match-data-note">Item assets unavailable; item IDs are shown where available.</p>}
    {profileResult.status === "rejected" && <p className="match-data-note">Steam names unavailable; account IDs are shown.</p>}
    <footer>DEADLOCK INTELLIGENCE · MATCH DATA</footer>
  </main>;
}
export default function MatchPage(props: Props) {
  return <AppShell active="Matches"><Suspense fallback={<main className="content-inner match-detail"><p className="api-message" role="status">Loading match metadata…</p></main>}><Content {...props} /></Suspense></AppShell>;
}


