import Link from "next/link";
import type { HeroAsset, MatchListEntry } from "../../lib/deadlock-api";

type Filters = { heroId: string; period: string; duration: string; gameMode: string; matchMode: string; sort: string };
type Props = { rows: MatchListEntry[]; heroes: HeroAsset[]; filters: Filters; matchError?: string; invalidMatchId: boolean; nextHref?: string };

function date(value?: number) {
  return typeof value === "number" ? new Date(value * 1000).toLocaleString() : "Unavailable";
}
function duration(value?: number) {
  return typeof value === "number" ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}` : "Unavailable";
}

export default function MatchExplorer({ rows, heroes, filters, matchError, invalidMatchId, nextHref }: Props) {
  return <main className="content-inner match-explorer-page">
    <div className="page-heading"><div><p className="eyebrow">MATCH DATABASE / LIVE API DATA</p><h1>Match Explorer<span>.</span></h1><p className="muted">Browse the global match feed or open a match directly by ID.</p></div></div>
    <form className="match-id-search" action="/matches" method="get">
      <label htmlFor="match-id">MATCH ID</label><input id="match-id" name="match_id" inputMode="numeric" pattern="[0-9]+" placeholder="Enter a match ID" />
      <button type="submit" className="refresh-button">Open match</button>
    </form>
    {invalidMatchId && <p className="api-message error-message" role="alert">Enter a numeric match ID within the API range.</p>}
    <form className="match-filters" action="/matches" method="get">
      <label>HERO<select name="hero_id" defaultValue={filters.heroId} aria-label="Filter by hero">
        <option value="all">All heroes</option>{heroes.map((hero) => <option value={hero.id} key={hero.id}>{hero.name}</option>)}
      </select></label>
      <label>TIME PERIOD<select name="period" defaultValue={filters.period}><option value="1d">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All available</option></select></label>
      <label>DURATION<select name="duration" defaultValue={filters.duration}><option value="all">Any duration</option><option value="short">Up to 15 minutes</option><option value="medium">15–30 minutes</option><option value="long">Over 30 minutes</option></select></label>
      <label>GAME MODE<select name="game_mode" defaultValue={filters.gameMode}><option value="all">All modes</option><option value="normal">Normal</option><option value="street_brawl">Street Brawl</option></select></label>
      <label>MATCH TYPE<select name="match_mode" defaultValue={filters.matchMode}><option value="all">All types</option><option value="ranked,unranked">Ranked + Unranked</option><option value="ranked">Ranked</option><option value="unranked">Unranked</option></select></label>
      <label>SORT<select name="sort" defaultValue={filters.sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      <button type="submit" className="refresh-button">Apply filters</button>
    </form>
    <p className="match-explorer-note">Filters and sort are sent to Deadlock API. Results are paged by match ID; the API does not expose a total count or offset.</p>
    {matchError && <section className="panel match-empty" role="alert"><h2>Match feed unavailable</h2><p>Deadlock API could not load the global match list. {matchError}</p><Link className="match-back-link" href="/matches">Retry</Link></section>}
    {!matchError && rows.length > 0 && <>
      <div className="section-title"><h2>Matches</h2><span className="live-tag">{rows.length} RESULTS</span><span className="line" /></div>
      <div className="match-explorer-table" role="table" aria-label="Matches">
        <div className="match-explorer-head" role="row"><span role="columnheader">MATCH</span><span role="columnheader">PLAYED</span><span role="columnheader">MODES</span><span role="columnheader">DURATION</span><span role="columnheader">RATING</span><span role="columnheader">RESULT</span></div>
        {rows.map((match) => {
          const result = match.not_scored ? "Not scored" : match.winning_team === undefined ? "Unavailable" : `Team ${match.winning_team + 1} victory`;
          const resultClass = match.winning_team === undefined || match.not_scored ? "" : "match-explorer-result-win";
          return <Link className="match-explorer-row" role="row" href={`/matches/${match.match_id}`} key={match.match_id}>
            <strong role="cell">#{match.match_id}</strong><span role="cell">{date(match.start_time)}</span><span role="cell">{[match.game_mode, match.match_mode].filter(Boolean).join(" · ") || "Mode unavailable"}</span><span role="cell">{duration(match.duration_s)}</span><span role="cell">{typeof match.average_badge === "number" ? match.average_badge : "Unavailable"}</span><span role="cell" className={resultClass}>{result}</span>
          </Link>;
        })}
      </div>
      {nextHref && <div className="match-load-more"><Link href={nextHref} className="refresh-button">Load next {rows.length} matches</Link></div>}
    </>}
    {!matchError && rows.length === 0 && <section className="panel match-empty"><h2>No matches found</h2><p>The API returned no matches for these filters. Try a wider time period or remove a filter.</p></section>}
    {heroes.length === 0 && <p className="match-explorer-note">Hero names are unavailable from the assets endpoint; match search and ID lookup remain available.</p>}
    <footer><span>DEADLOCK INTELLIGENCE · MATCH EXPLORER</span><span>Global match metadata from Deadlock API <i /></span></footer>
  </main>;
}


