import { T } from "../../../lib/i18n/provider";
import type { MatchHistoryEntry } from "../../../lib/deadlock-api";

type Props = { matches: MatchHistoryEntry[]; heroNames: Record<string, string> };

const won = (match: MatchHistoryEntry) => match.player_match_outcome === 1;
const lost = (match: MatchHistoryEntry) => match.player_match_outcome === 2;
const kdaOf = (match: MatchHistoryEntry) => ((match.player_kills ?? 0) + (match.player_assists ?? 0)) / Math.max(match.player_deaths ?? 0, 1);

/** Recent form, K/D/A trend and a few headline numbers computed from the returned match history. */
export default function FormCharts({ matches, heroNames }: Props) {
  const scored = matches.filter((match) => won(match) || lost(match));
  if (scored.length < 3) return null;

  // History is newest-first; charts read oldest → newest.
  const recent = scored.slice(0, 20).reverse();
  const bars = recent.map((match) => ({ match, value: Math.min(kdaOf(match), 8) }));
  const width = 400;
  const height = 110;
  const step = width / bars.length;

  let streak = 0;
  const latest = scored[0];
  for (const match of scored) {
    if (won(match) === won(latest)) streak++;
    else break;
  }

  const durations = scored.map((match) => match.match_duration_s).filter((value): value is number => typeof value === "number" && value > 0);
  const avgMinutes = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length / 60) : null;
  const best = [...scored].sort((a, b) => kdaOf(b) - kdaOf(a))[0];

  const byHero = new Map<number, { games: number; wins: number }>();
  for (const match of scored) {
    if (typeof match.hero_id !== "number") continue;
    const entry = byHero.get(match.hero_id) ?? { games: 0, wins: 0 };
    entry.games++;
    if (won(match)) entry.wins++;
    byHero.set(match.hero_id, entry);
  }
  const main = [...byHero].sort((a, b) => b[1].games - a[1].games)[0];

  const recentWins = recent.filter(won).length;

  return (
    <section className="pp-panel pp-form">
      <div className="pp-form-head">
        <h2><T k="profile.form" /></h2>
        <span>{recentWins}W {recent.length - recentWins}L · <T k="profile.last" vars={{ n: recent.length }} /></span>
      </div>
      <div className="pp-form-strip" role="img" aria-label={`${recentWins} wins of last ${recent.length}`}>
        {recent.map((match, index) => <i key={match.match_id ?? index} data-win={won(match)} title={`${won(match) ? "W" : "L"} · ${match.hero_id !== undefined ? heroNames[String(match.hero_id)] ?? "" : ""}`} />)}
      </div>

      <h3><T k="profile.kdaTrend" /></h3>
      <svg className="pp-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="KDA ratio of recent matches">
        {[2, 4, 6].map((line) => <line key={line} x1="0" x2={width} y1={height - (line / 8) * (height - 8)} y2={height - (line / 8) * (height - 8)} stroke="#2a2f3b" strokeWidth="1" />)}
        {bars.map(({ match, value }, index) => {
          const h = Math.max(3, (value / 8) * (height - 8));
          return <rect key={match.match_id ?? index} x={index * step + 2} y={height - h} width={Math.max(2, step - 4)} height={h} rx="2" fill={won(match) ? "#4caf7a" : "#d9534f"}><title>{`KDA ${kdaOf(match).toFixed(1)} · ${match.player_kills ?? 0}/${match.player_deaths ?? 0}/${match.player_assists ?? 0}`}</title></rect>;
        })}
      </svg>

      <dl className="pp-facts">
        <div><dt><T k="profile.streak" /></dt><dd data-win={won(latest)}>{streak}{won(latest) ? "W" : "L"}</dd></div>
        {avgMinutes !== null && <div><dt><T k="profile.avgLength" /></dt><dd>{avgMinutes} min</dd></div>}
        {best && <div><dt><T k="profile.bestKda" /></dt><dd>{(best.player_kills ?? 0)}/{(best.player_deaths ?? 0)}/{(best.player_assists ?? 0)}</dd></div>}
        {main && <div><dt><T k="profile.mostPlayed" /></dt><dd>{heroNames[String(main[0])] ?? `#${main[0]}`}</dd></div>}
      </dl>
    </section>
  );
}
