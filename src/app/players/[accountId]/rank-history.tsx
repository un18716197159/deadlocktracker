import { T } from "../../../lib/i18n/provider";
import { rankImage } from "../../../lib/assets";
import RankBadge from "../../components/rank-badge";
import type { MatchHistoryEntry, RankAsset } from "../../../lib/deadlock-api";

type Props = { matches: MatchHistoryEntry[]; ranks: RankAsset[] };
type RankedMatch = MatchHistoryEntry & { ranked_display_badge: number };

const MAX_MATCHES = 60;
const tierOf = (badge: number) => Math.floor(badge / 10);
const subOf = (badge: number) => badge % 10;
/** Continuous scale: 6 divisions per tier, so the gap between tiers is not inflated (96 → 101 is one step). */
const levelOf = (badge: number) => tierOf(badge) * 6 + Math.min(Math.max(subOf(badge), 1), 6) - 1;
const won = (match: MatchHistoryEntry) => match.player_match_outcome === 1;
const lost = (match: MatchHistoryEntry) => match.player_match_outcome === 2;

/** Rank after each recent ranked match, read from the match history (ranked_display_badge). */
export default function RankHistory({ matches, ranks }: Props) {
  // History is newest-first; the chart reads oldest → newest.
  const ranked = matches
    .filter((match): match is RankedMatch => typeof match.ranked_display_badge === "number" && match.ranked_display_badge > 0)
    .slice(0, MAX_MATCHES)
    .reverse();
  if (ranked.length < 2) return null;

  const rankName = (badge: number) => ranks.find((rank) => rank.tier === tierOf(badge))?.name ?? `Tier ${tierOf(badge)}`;
  const label = (badge: number) => `${rankName(badge)} ${subOf(badge)}`;

  const levels = ranked.map((match) => levelOf(match.ranked_display_badge));
  const low = Math.min(...levels) - 1;
  const high = Math.max(...levels) + 1;
  const x = (index: number) => (ranked.length === 1 ? 50 : (index / (ranked.length - 1)) * 100);
  const y = (level: number) => ((high - level) / (high - low)) * 100;

  const first = ranked[0];
  const latest = ranked[ranked.length - 1];
  const change = levelOf(latest.ranked_display_badge) - levelOf(first.ranked_display_badge);
  const peak = ranked.reduce((best, match) => (levelOf(match.ranked_display_badge) > levelOf(best.ranked_display_badge) ? match : best), first);
  const wins = ranked.filter(won).length;
  const losses = ranked.filter(lost).length;

  // A band per tier that is visible on the chart, labelled with the tier name.
  const tiers: Array<{ tier: number; top: number; bottom: number }> = [];
  for (let tier = Math.floor(low / 6); tier <= Math.floor(high / 6); tier++) {
    const top = y(Math.min(high, tier * 6 + 5.5));
    const bottom = y(Math.max(low, tier * 6 - 0.5));
    if (bottom - top > 0) tiers.push({ tier, top, bottom });
  }

  const latestRank = ranks.find((rank) => rank.tier === tierOf(latest.ranked_display_badge));
  const latestImage = rankImage(latestRank);
  const points = ranked.map((match, index) => `${x(index)},${y(levelOf(match.ranked_display_badge))}`).join(" ");

  return (
    <section className="pp-panel pp-rank-history">
      <div className="pp-form-head">
        <h2><T k="profile.rankHistory" /></h2>
        <span><T k="profile.rankLast" vars={{ n: ranked.length }} /></span>
      </div>

      <div className="pp-rh-chart">
        <div className="pp-rh-plot"><div className="pp-rh-area">
          {tiers.map(({ tier, top, bottom }) => (
            <div key={tier} className="pp-rh-band" style={{ top: `${top}%`, height: `${bottom - top}%` }} data-odd={tier % 2 === 1}>
              {/* Thin bands are only chart padding; their label would overlap the next one. */}
              {bottom - top >= 14 && <span>{ranks.find((rank) => rank.tier === tier)?.name ?? `Tier ${tier}`}</span>}
            </div>
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={points} fill="none" stroke="#7c6cf0" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          {ranked.map((match, index) => {
            const delta = typeof match.ranked_delta === "number" ? match.ranked_delta : null;
            const title = `${label(match.ranked_display_badge)}${delta === null ? "" : ` · ${delta > 0 ? "+" : ""}${delta}`}${match.ranked_calibration_match ? " · calibration" : ""}`;
            return (
              <i
                key={match.match_id ?? index}
                className="pp-rh-dot"
                data-result={won(match) ? "win" : lost(match) ? "loss" : "other"}
                data-calibration={Boolean(match.ranked_calibration_match)}
                style={{ left: `${x(index)}%`, top: `${y(levelOf(match.ranked_display_badge))}%` }}
                title={title}
              />
            );
          })}
        </div></div>
      </div>

      <dl className="pp-facts">
        <div>
          <dt><T k="profile.currentRank" /></dt>
          <dd className="pp-rh-current"><RankBadge tier={tierOf(latest.ranked_display_badge)} subrank={subOf(latest.ranked_display_badge)} name={latestRank?.name} image={latestImage} size="sm" />{label(latest.ranked_display_badge)}</dd>
        </div>
        <div>
          <dt><T k="profile.rankChange" /></dt>
          <dd data-win={change === 0 ? undefined : change > 0}>{change > 0 ? "+" : ""}{change} <T k="profile.divisionsShort" /></dd>
        </div>
        <div><dt><T k="profile.rankPeak" /></dt><dd>{label(peak.ranked_display_badge)}</dd></div>
        <div><dt><T k="profile.rankRecord" /></dt><dd>{wins}W {losses}L</dd></div>
      </dl>
    </section>
  );
}
