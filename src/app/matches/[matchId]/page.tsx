import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AppShell from "../../components/app-shell";
import { getHeroes, getMatchDetails, getMatchItems, getSteamProfiles } from "../../../lib/deadlock-api";

type Props = { params: Promise<{ matchId: string }>; searchParams: Promise<{ account_id?: string }> };
export async function generateMetadata({ params }: Props) {
  const { matchId } = await params;
  return { title: `Match ${matchId} | Deadlock Intelligence` };
}
const fmtDuration = (value?: number) => value === undefined ? "Unavailable" : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
const fmtStat = (value?: number) => value === undefined ? "—" : value.toLocaleString();

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
    <Link className="match-back-link" href={accountId ? `/?account_id=${accountId}#matches` : "/#matches"}>← Back to player profile</Link>
    <div className="page-heading match-heading"><div><p className="eyebrow">MATCH DETAILS / LIVE API DATA</p><h1>Match <span>#{match.match_id ?? matchId}</span></h1><p className="muted">Played {match.start_time === undefined ? "Unavailable" : new Date(match.start_time * 1000).toLocaleString()} · {fmtDuration(match.duration_s)}</p></div><span className="match-result-tag">{winner === undefined ? match.not_scored ? "NOT SCORED" : "RESULT UNAVAILABLE" : `TEAM ${winner + 1} VICTORY`}</span></div>
    {!match.players.length ? <section className="panel match-empty"><h2>Player data unavailable</h2><p>No player rows were returned in match metadata.</p></section> : <div className="match-teams">{[0, 1].map((team) => {
      const roster = match.players.filter((player) => player.team === team).sort((a, b) => (a.player_slot ?? 99) - (b.player_slot ?? 99));
      return <section className={`panel match-team ${winner === team ? "winning-team" : ""}`} key={team}>
        <header className="match-team-heading"><div><p className="eyebrow">TEAM {team + 1}</p><h2>{winner === undefined ? "Roster" : winner === team ? "Victory" : "Defeat"}</h2></div><span>{roster.length} players</span></header>
        {!roster.length ? <p className="profile-note">No players returned for this team.</p> : <div className="match-roster">{roster.map((player) => {
          const hero = player.hero_id === undefined ? undefined : heroById.get(player.hero_id);
          const profile = profileById.get(player.account_id);
          const name = profile?.personaname || `Account ID ${player.account_id}`;
          const portrait = hero?.images?.icon_image_small_webp || hero?.images?.icon_image_small;
          const recentItems = [...player.items].sort((a, b) => (a.game_time_s ?? 0) - (b.game_time_s ?? 0)).slice(-6);
          return <article className="match-player" key={player.account_id}>
            <div className="match-player-main"><span className="match-player-avatar" aria-hidden="true" style={profile?.avatar ? { backgroundImage: `url("${profile.avatar}")` } : {}}>{profile?.avatar ? "" : name.slice(0, 1)}</span><span className="match-player-hero" aria-hidden="true" style={portrait ? { backgroundImage: `url("${portrait}")` } : {}}>{portrait ? "" : "?"}</span><div className="match-player-name"><strong>{name}</strong><small>{hero?.name || (player.hero_id === undefined ? "Hero unavailable" : `Unknown hero (${player.hero_id})`)} · ID {player.account_id}</small></div>{profile?.profileurl && <a className="match-steam-link" href={profile.profileurl} target="_blank" rel="noreferrer">Steam ↗</a>}</div>
            <div className="match-player-stats"><div><small>K / D / A</small><strong>{fmtStat(player.kills)} / {fmtStat(player.deaths)} / {fmtStat(player.assists)}</strong></div><div><small>NET WORTH</small><strong>{fmtStat(player.net_worth)}</strong></div><div><small>LAST HITS</small><strong>{fmtStat(player.last_hits)}</strong></div><div><small>DENIES</small><strong>{fmtStat(player.denies)}</strong></div><div><small>LEVEL</small><strong>{fmtStat(player.level)}</strong></div><div><small>PLAYER DAMAGE</small><strong>{fmtStat(player.player_damage)}</strong></div><div><small>DAMAGE TAKEN</small><strong>{fmtStat(player.player_damage_taken)}</strong></div><div><small>HEALING</small><strong>{fmtStat(player.player_healing)}</strong></div></div>
            {recentItems.length > 0 && <div className="match-inventory"><small>RECENT ITEM EVENTS</small><div>{recentItems.map((event, index) => { const item = event.item_id === undefined ? undefined : itemById.get(event.item_id); return <span className="match-item" key={`${event.item_id}-${event.game_time_s}-${index}`} title={item?.name || "Unknown item"}><i style={item?.image_webp || item?.image ? { backgroundImage: `url("${item.image_webp || item.image}")` } : {}} />{item?.name || (event.item_id === undefined ? "Unknown item" : `Unknown item (${event.item_id})`)}<b>{fmtDuration(event.game_time_s)}</b>{event.sold_time_s ? <em>SOLD</em> : null}</span>; })}</div></div>}
          </article>;
        })}</div>}
      </section>;
    })}</div>}
    <p className="match-data-note">Damage, damage taken and healing use the latest available player stats snapshot; unavailable values are shown as —.</p>
    {heroResult.status === "rejected" && <p className="match-data-note">Hero assets unavailable; hero IDs are shown where available.</p>}
    {itemResult.status === "rejected" && <p className="match-data-note">Item assets unavailable; item IDs are shown where available.</p>}
    {profileResult.status === "rejected" && <p className="match-data-note">Steam names unavailable; account IDs are shown.</p>}
    <footer><span>DEADLOCK INTELLIGENCE · MATCH DATA</span><span>Metadata from Deadlock API <i /></span></footer>
  </main>;
}
export default function MatchPage(props: Props) {
  return <AppShell active="Matches"><Suspense fallback={<main className="content-inner match-detail"><p className="api-message" role="status">Loading match metadata…</p></main>}><Content {...props} /></Suspense></AppShell>;
}
