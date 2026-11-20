import Link from "next/link";
import { TEAMS } from "../../../lib/teams";
import { heroPortrait, itemImage } from "../../../lib/assets";
import type { HeroAsset, MatchItemAsset, MatchPlayerDetails } from "../../../lib/deadlock-api";
import "./match-charts.css";
import { L } from "../../../lib/i18n/provider";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
const compact = (value: number) => {
  const abs = Math.abs(value);
  return abs >= 1000 ? `${(value / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k` : String(Math.round(value));
};

/** Team souls advantage over time: above the middle line team 0 leads, below it team 1 leads. */
export function NetWorthChart({ players, duration }: { players: MatchPlayerDetails[]; duration?: number }) {
  const byTime = new Map<number, [number, number]>();
  for (const player of players) {
    if (player.team !== 0 && player.team !== 1) continue;
    // `?? []`: match details cached before this field existed do not have it.
    for (const { time_s, net_worth } of player.net_worth_timeline ?? []) {
      const totals = byTime.get(time_s) ?? [0, 0];
      totals[player.team] += net_worth;
      byTime.set(time_s, totals);
    }
  }
  const points = [{ time: 0, diff: 0 }, ...[...byTime].sort((a, b) => a[0] - b[0]).map(([time, [a, b]]) => ({ time, diff: a - b }))];
  if (points.length < 3) return null;

  const end = Math.max(duration ?? 0, points[points.length - 1].time);
  const maxAbs = Math.max(1000, ...points.map((point) => Math.abs(point.diff)));
  const x = (time: number) => (time / end) * 100;
  const y = (diff: number) => 50 - (diff / maxAbs) * 46;
  const line = points.map((point) => `${x(point.time)},${y(point.diff)}`).join(" ");
  const area = `0,50 ${line} ${x(points[points.length - 1].time)},50`;
  const final = points[points.length - 1];
  const peak = (team: 0 | 1) => points.reduce((best, point) => (team === 0 ? Math.max(best, point.diff) : Math.max(best, -point.diff)), 0);
  const ticks = Array.from({ length: Math.floor(end / 300) }, (_, index) => (index + 1) * 300).filter((time) => time < end);

  return (
    <section className="panel mc-panel">
      <div className="mc-head">
        <h2><L>Souls advantage</L></h2>
        <span>{final.diff === 0 ? <L>Even</L> : <><b style={{ color: TEAMS[final.diff > 0 ? 0 : 1].color }}>{TEAMS[final.diff > 0 ? 0 : 1].name}</b> <L vars={{ n: compact(Math.abs(final.diff)), time: clock(final.time) }}>{"+{n} at {time}"}</L></>}</span>
      </div>
      <div className="mc-nw">
        <span className="mc-nw-label" style={{ top: 6, color: TEAMS[0].color }}>{TEAMS[0].name} · <L vars={{ n: compact(peak(0)) }}>{"peak +{n}"}</L></span>
        <span className="mc-nw-label" style={{ bottom: 6, color: TEAMS[1].color }}>{TEAMS[1].name} · <L vars={{ n: compact(peak(1)) }}>{"peak +{n}"}</L></span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Team souls difference over time">
          <defs>
            <clipPath id="mc-top"><rect x="0" y="0" width="100" height="50" /></clipPath>
            <clipPath id="mc-bottom"><rect x="0" y="50" width="100" height="50" /></clipPath>
          </defs>
          {ticks.map((time) => <line key={time} x1={x(time)} x2={x(time)} y1="0" y2="100" stroke="#20242e" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <line x1="0" x2="100" y1="50" y2="50" stroke="#3a4050" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <polygon points={area} fill={TEAMS[0].color} fillOpacity="0.18" clipPath="url(#mc-top)" />
          <polygon points={area} fill={TEAMS[1].color} fillOpacity="0.18" clipPath="url(#mc-bottom)" />
          <polyline points={line} fill="none" stroke={TEAMS[0].color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" clipPath="url(#mc-top)" />
          <polyline points={line} fill="none" stroke={TEAMS[1].color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" clipPath="url(#mc-bottom)" />
        </svg>
        {points.slice(1).map((point) => (
          <i key={point.time} className="mc-nw-dot" style={{ left: `${x(point.time)}%`, top: `${y(point.diff)}%` }} title={`${clock(point.time)} · ${point.diff === 0 ? "even" : `${TEAMS[point.diff > 0 ? 0 : 1].name} +${Math.abs(point.diff).toLocaleString()}`}`} />
        ))}
      </div>
      <div className="mc-axis">{ticks.map((time) => <span key={time} style={{ left: `${x(time)}%` }}>{clock(time)}</span>)}</div>
    </section>
  );
}

/** Puts icons that would overlap (closer than `gap` percent) into a second lane. */
function placeInLanes(positions: number[], gap = 2.4): number[] {
  const lastInLane = [-Infinity, -Infinity];
  return positions.map((position) => {
    const lane = position - lastInLane[0] >= gap ? 0 : position - lastInLane[1] >= gap ? 1 : 0;
    lastInLane[lane] = position;
    return lane;
  });
}

/** When each player bought their shop items, on one shared time axis. */
export function ItemTimeline({ players, duration, heroes, items }: { players: MatchPlayerDetails[]; duration?: number; heroes: HeroAsset[]; items: MatchItemAsset[] }) {
  const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const rows = [0, 1].flatMap((team) => players
    .filter((player) => player.team === team)
    .sort((a, b) => (a.player_slot ?? 99) - (b.player_slot ?? 99))
    .map((player) => ({
      player,
      team,
      // Only shop items: the same list also contains ability unlocks and upgrades.
      buys: player.items
        .flatMap((event) => {
          const item = event.item_id === undefined ? undefined : itemById.get(event.item_id);
          return item && item.type === "upgrade" && typeof event.game_time_s === "number" ? [{ event, item, time: event.game_time_s }] : [];
        })
        .sort((a, b) => a.time - b.time),
    })))
    .filter((row) => row.buys.length > 0);
  if (!rows.length) return null;

  const end = Math.max(duration ?? 0, ...rows.flatMap((row) => row.buys.map((buy) => buy.time)), 1);
  const ticks = Array.from({ length: Math.floor(end / 300) }, (_, index) => (index + 1) * 300).filter((time) => time < end);

  return (
    <section className="panel mc-panel">
      <div className="mc-head"><h2><L>Item timeline</L></h2><span><L>Shop purchases · faded = sold later</L></span></div>
      <div className="mc-tl">
        {rows.map(({ player, team, buys }) => {
          const hero = player.hero_id === undefined ? undefined : heroById.get(player.hero_id);
          const portrait = hero ? heroPortrait(hero) : null;
          return (
            <div className="mc-tl-row" key={player.account_id} style={{ borderLeftColor: TEAMS[team as 0 | 1].color }}>
              <span className="mc-tl-hero" title={hero?.name} style={portrait ? { backgroundImage: `url("${portrait}")` } : undefined}>{portrait ? null : "?"}</span>
              <div className="mc-tl-track">
                {ticks.map((time) => <i key={time} className="mc-tl-tick" style={{ left: `${(time / end) * 100}%` }} />)}
                {placeInLanes(buys.map((buy) => (buy.time / end) * 100)).map((lane, index) => {
                  const { event, item, time } = buys[index];
                  const image = itemImage(item);
                  const sold = typeof event.sold_time_s === "number" && event.sold_time_s > 0;
                  return (
                    <Link
                      key={`${event.item_id}-${time}-${index}`}
                      href={`/items/${event.item_id}`}
                      className="mc-tl-item"
                      data-sold={sold}
                      data-lane={lane}
                      style={{ left: `${(time / end) * 100}%`, backgroundImage: image ? `url("${image}")` : undefined }}
                      title={`${item.name ?? "Item"} · ${clock(time)}${sold ? ` · sold ${clock(event.sold_time_s as number)}` : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mc-axis mc-axis-tl">{ticks.map((time) => <span key={time} style={{ left: `${(time / end) * 100}%` }}>{clock(time)}</span>)}</div>
    </section>
  );
}
