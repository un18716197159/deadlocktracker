import Link from "next/link";
import type { HeroAsset, MatchListEntry, RankAsset } from "../../lib/deadlock-api";
import { rankImage } from "../../lib/assets";
import { T } from "../../lib/i18n/provider";
import { teamName } from "../../lib/teams";
import LocalTime from "../components/local-time";
import RankBadge from "../components/rank-badge";
import "./match-explorer.css";

type Filters = { heroId: string; period: string; duration: string; gameMode: string; matchMode: string; sort: string };
type Props = { rows: MatchListEntry[]; heroes: HeroAsset[]; ranks: RankAsset[]; filters: Filters; matchError?: string; invalidMatchId: boolean; nextHref?: string };

function duration(value?: number) {
  return typeof value === "number" ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}` : "—";
}
const pretty = (value?: string) => (value ? value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "");

function AverageRank({ badge, ranks }: { badge?: number; ranks: RankAsset[] }) {
  if (typeof badge !== "number" || badge <= 0) return <span className="mx-muted">—</span>;
  const tier = Math.floor(badge / 10);
  const sub = badge % 10;
  const asset = ranks.find((rank) => rank.tier === tier);
  return (
    <span className="mx-rank">
      <RankBadge tier={tier} subrank={sub} name={asset?.name} image={rankImage(asset)} size="sm" />
      <span>{asset?.name ?? `Tier ${tier}`}{sub ? ` ${sub}` : ""}</span>
    </span>
  );
}

export default function MatchExplorer({ rows, heroes, ranks, filters, matchError, invalidMatchId, nextHref }: Props) {
  return <main className="content-inner mx-page">
    <div className="mx-heading"><h1><T k="matches.title" /></h1><p><T k="matches.subtitle" /></p></div>

    <section className="mx-toolbar">
      <form className="mx-id" action="/matches" method="get">
        <label htmlFor="match-id"><T k="matches.matchId" /></label>
        <div><input id="match-id" name="match_id" inputMode="numeric" pattern="[0-9]+" placeholder="1234567" /><button type="submit"><T k="matches.open" /></button></div>
      </form>
      <form className="mx-filters" action="/matches" method="get">
        <label><span><T k="matches.hero" /></span><select name="hero_id" defaultValue={filters.heroId}><option value="all">All</option>{heroes.map((hero) => <option value={hero.id} key={hero.id}>{hero.name}</option>)}</select></label>
        <label><span><T k="matches.period" /></span><select name="period" defaultValue={filters.period}><option value="1d">24h</option><option value="7d">7d</option><option value="30d">30d</option><option value="90d">90d</option><option value="all">All</option></select></label>
        <label><span><T k="matches.duration" /></span><select name="duration" defaultValue={filters.duration}><option value="all">Any</option><option value="short">&lt; 15 min</option><option value="medium">15–30 min</option><option value="long">&gt; 30 min</option></select></label>
        <label><span><T k="matches.mode" /></span><select name="game_mode" defaultValue={filters.gameMode}><option value="all">All</option><option value="normal">Normal</option><option value="street_brawl">Street Brawl</option></select></label>
        <label><span><T k="matches.type" /></span><select name="match_mode" defaultValue={filters.matchMode}><option value="all">All</option><option value="ranked,unranked">Ranked + Unranked</option><option value="ranked">Ranked</option><option value="unranked">Unranked</option></select></label>
        <label><span><T k="matches.sort" /></span><select name="sort" defaultValue={filters.sort}><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label>
        <button type="submit"><T k="common.apply" /></button>
      </form>
    </section>

    {invalidMatchId && <p className="api-message error-message" role="alert">Match ID must be numeric.</p>}
    {matchError && <section className="mx-empty" role="alert"><h2>Match feed unavailable</h2><p>{matchError}</p><Link href="/matches"><T k="common.retry" /></Link></section>}

    {!matchError && rows.length > 0 && <>
      <div className="mx-count"><T k="matches.results" vars={{ n: rows.length }} /></div>
      <div className="mx-list">
        <div className="mx-row mx-head"><span><T k="matches.played" /></span><span><T k="matches.mode" /></span><span><T k="matches.rating" /></span><span><T k="matches.duration" /></span><span><T k="matches.result" /></span></div>
        {rows.map((match) => {
          const scored = !match.not_scored && match.winning_team !== undefined;
          return <Link className="mx-row" href={`/matches/${match.match_id}`} key={match.match_id}>
            <span className="mx-when"><b><LocalTime seconds={match.start_time} /></b><small>#{match.match_id}</small></span>
            <span className="mx-chips">{match.match_mode && <i data-kind={match.match_mode}>{pretty(match.match_mode)}</i>}{match.game_mode && match.game_mode !== "normal" && <i>{pretty(match.game_mode)}</i>}</span>
            <AverageRank badge={match.average_badge} ranks={ranks} />
            <span className="mx-dur">{duration(match.duration_s)}</span>
            <span className="mx-result" data-team={scored ? match.winning_team : "none"}>{scored ? <T k="matches.team" vars={{ team: teamName(match.winning_team) }} /> : <T k="matches.notScored" />}</span>
          </Link>;
        })}
      </div>
      {nextHref && <div className="mx-more"><Link href={nextHref}><T k="matches.next" /></Link></div>}
    </>}
    {!matchError && rows.length === 0 && <section className="mx-empty"><h2>No matches found</h2><p>Try a wider time period or remove a filter.</p></section>}
  </main>;
}
