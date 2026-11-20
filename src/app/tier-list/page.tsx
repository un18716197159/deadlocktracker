import Link from "next/link";
import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { T, L } from "../../lib/i18n/provider";
import { heroPortrait } from "../../lib/assets";
import { getLocalizedHeroes } from "../../lib/localized";
import { getHeroStatsForRating, getRanks, type HeroAsset, type HeroRatingFilter, type RankAsset } from "../../lib/deadlock-api";
import "./tier-list.css";

export const metadata = {
  title: "Deadlock Tier List — best heroes right now | Deadlock Tracker",
  description: "Live Deadlock hero tier list from win rate and pick rate, filterable by rank group.",
};

type Props = { searchParams: Promise<{ rating?: string }> };
const GROUPS: Array<{ value: HeroRatingFilter; tiers?: [number, number] }> = [
  { value: "all" }, { value: "0-29", tiers: [1, 2] }, { value: "30-59", tiers: [3, 5] }, { value: "60-89", tiers: [6, 8] }, { value: "90-116", tiers: [9, 11] },
];
const TIERS = [
  { name: "S", share: 0.1 }, { name: "A", share: 0.2 }, { name: "B", share: 0.3 }, { name: "C", share: 0.25 }, { name: "D", share: 0.15 },
];

function groupLabel(group: (typeof GROUPS)[number], ranks: RankAsset[]) {
  if (!group.tiers) return null;
  const name = (tier: number) => ranks.find((rank) => rank.tier === tier)?.name ?? `T${tier}`;
  return `${name(group.tiers[0])} – ${name(group.tiers[1])}`;
}

type Row = { hero: HeroAsset; win: number; pick: number; matches: number; score: number };

async function TierContent({ searchParams }: Props) {
  const query = await searchParams;
  const rating = (GROUPS.find((group) => group.value === query.rating)?.value ?? "all") as HeroRatingFilter;
  const [statsResult, heroesResult, ranksResult] = await Promise.allSettled([getHeroStatsForRating(rating), getLocalizedHeroes(), getRanks()]);
  const ranks = ranksResult.status === "fulfilled" ? ranksResult.value : [];
  if (statsResult.status === "rejected" || heroesResult.status === "rejected") {
    return <main className="content-inner tl-page"><p className="api-message error-message" role="alert">Tier list unavailable right now. Try again in a minute.</p></main>;
  }
  const heroes = new Map(heroesResult.value.flatMap((hero) => typeof hero.id === "number" ? [[hero.id, hero] as const] : []));
  const stats = statsResult.value.filter((row) => heroes.has(row.hero_id) && row.wins + row.losses > 0);
  const totalMatches = stats.reduce((sum, row) => sum + row.matches, 0);
  const maxMatches = Math.max(1, ...stats.map((row) => row.matches));
  const eligible = stats.filter((row) => row.matches >= maxMatches * 0.05);
  const meanPick = eligible.length ? 100 / eligible.length : 0;
  const rows: Row[] = eligible.map((row) => {
    const win = (row.wins / (row.wins + row.losses)) * 100;
    const pick = totalMatches ? (row.matches / totalMatches) * 100 : 0;
    return { hero: heroes.get(row.hero_id) as HeroAsset, win, pick, matches: row.matches, score: win + 0.3 * (pick - meanPick) };
  }).sort((a, b) => b.score - a.score);

  // Each tier takes its share of the sorted heroes; the last tier takes whatever is left.
  const sizes = TIERS.map((tier) => Math.round(rows.length * tier.share));
  const grouped = TIERS.map((tier, index) => {
    const start = sizes.slice(0, index).reduce((sum, size) => sum + size, 0);
    const end = index === TIERS.length - 1 ? rows.length : start + sizes[index];
    return { ...tier, rows: rows.slice(start, end) };
  });

  return (
    <main className="content-inner tl-page">
      <div className="tl-heading"><h1><T k="tier.title" /></h1><p><T k="tier.subtitle" /></p></div>
      <nav className="tl-filters" aria-label="Rank group">
        {GROUPS.map((group) => (
          <Link key={group.value} href={group.value === "all" ? "/tier-list" : `/tier-list?rating=${group.value}`} data-active={group.value === rating} scroll={false}>
            {group.value === "all" ? <T k="tier.all" /> : groupLabel(group, ranks)}
          </Link>
        ))}
      </nav>

      <section className="tl-tiers">
        {grouped.map((tier) => tier.rows.length > 0 && (
          <div className="tl-tier" data-tier={tier.name} key={tier.name}>
            <div className="tl-label">{tier.name}</div>
            <div className="tl-heroes">
              {tier.rows.map((row) => {
                const image = heroPortrait(row.hero);
                return (
                  <Link className="tl-hero" href={`/heroes/${row.hero.id}`} key={row.hero.id} title={`${row.hero.name} — ${row.win.toFixed(1)}% / ${row.pick.toFixed(1)}%`}>
                    <span className="tl-portrait" style={image ? { backgroundImage: `url("${image}")` } : undefined} />
                    <strong>{row.hero.name}</strong>
                    <small>{row.win.toFixed(1)}%</small>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="tl-table-wrap">
        <table className="tl-table">
          <thead><tr><th>#</th><th><T k="tier.hero" /></th><th><T k="tier.win" /></th><th><T k="tier.pick" /></th><th><T k="tier.matches" /></th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.hero.id}>
                <td>{index + 1}</td>
                <td><Link href={`/heroes/${row.hero.id}`} className="tl-name"><span className="tl-mini" style={heroPortrait(row.hero) ? { backgroundImage: `url("${heroPortrait(row.hero)}")` } : undefined} />{row.hero.name}</Link></td>
                <td data-good={row.win >= 50}>{row.win.toFixed(1)}%</td>
                <td>{row.pick.toFixed(1)}%</td>
                <td>{row.matches.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="tl-note"><T k="tier.how" /></p>
    </main>
  );
}

export default function Page(props: Props) {
  return (
    <AppShell active="Tier list">
      <Suspense fallback={<main className="content-inner tl-page"><p className="api-message" role="status"><L>Loading…</L></p></main>}>
        <TierContent {...props} />
      </Suspense>
    </AppShell>
  );
}
