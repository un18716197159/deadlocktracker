import Link from "next/link";
import { T } from "../../lib/i18n/provider";
import { heroPortrait } from "../../lib/assets";
import { getHeroStatsForRating } from "../../lib/deadlock-api";
import { getLocalizedHeroes } from "../../lib/localized";
import "./meta-snapshot.css";

/** Home-page strip: heroes with the best current win rate (enough matches only). */
export default async function MetaSnapshot() {
  const [statsResult, heroesResult] = await Promise.allSettled([getHeroStatsForRating("all"), getLocalizedHeroes()]);
  if (statsResult.status === "rejected" || heroesResult.status === "rejected") return null;
  const heroes = new Map(heroesResult.value.flatMap((hero) => typeof hero.id === "number" ? [[hero.id, hero] as const] : []));
  const rows = statsResult.value.filter((row) => heroes.has(row.hero_id) && row.wins + row.losses > 0);
  const maxMatches = Math.max(1, ...rows.map((row) => row.matches));
  const top = rows
    .filter((row) => row.matches >= maxMatches * 0.25)
    .map((row) => ({ hero: heroes.get(row.hero_id)!, win: (row.wins / (row.wins + row.losses)) * 100 }))
    .sort((a, b) => b.win - a.win)
    .slice(0, 8);
  if (!top.length) return null;
  return (
    <section className="meta-snapshot">
      <div className="meta-head"><h2><T k="home.meta" /></h2><Link href="/tier-list"><T k="nav.tier" /> →</Link></div>
      <div className="meta-row">
        {top.map(({ hero, win }) => (
          <Link href={`/heroes/${hero.id}`} className="meta-hero" key={hero.id}>
            <span style={heroPortrait(hero) ? { backgroundImage: `url("${heroPortrait(hero)}")` } : undefined} />
            <strong>{hero.name}</strong>
            <small>{win.toFixed(1)}%</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
