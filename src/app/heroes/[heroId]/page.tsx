import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import AppShell from "../../components/app-shell";
import { abilities, catalog } from "../../../lib/heroes-api";
import { heroBackground, heroCardImage, heroPortrait } from "../../../lib/assets";
import { RichText } from "../../../lib/rich-text";
import { apiLanguage, getRequestLocale } from "../../../lib/i18n/server";
import { getHeroCounters, getHeroSynergies, getHeroes, getHeroesIn, type HeroMatchup } from "../../../lib/deadlock-api";
import { getAllItemAssets, getHeroItemPhases, getItemAnalytics } from "../../../lib/items-api";
import { T, L } from "../../../lib/i18n/provider";
import ItemTile from "../../components/item-tile";
import "./hero-detail.css";

export async function generateMetadata({ params }: { params: Promise<{ heroId: string }> }) {
  const { heroId } = await params;
  const id = Number(heroId);
  try {
    const row = Number.isSafeInteger(id) ? (await catalog()).find((entry) => entry.hero.id === id) : undefined;
    if (row?.hero.name) return { title: `${row.hero.name} — Deadlock hero stats, abilities & builds | Deadlock Tracker` };
  } catch {
    /* fall through */
  }
  return { title: `Hero ${heroId} | Deadlock Tracker` };
}

const STAT_LABELS: Record<string, string> = {
  max_health: "Health", base_health_regen: "Health regen", weapon_power: "Weapon power", spirit_power: "Spirit power",
  max_move_speed: "Move speed", sprint_speed: "Sprint speed", crouch_speed: "Crouch speed", light_melee_damage: "Light melee",
  heavy_melee_damage: "Heavy melee", stamina: "Stamina", stamina_regen_per_second: "Stamina regen", bullet_damage_pct: "Bullet damage",
  base_bullet_damage: "Bullet damage", clip_size: "Ammo", reload_time: "Reload time", fire_rate: "Fire rate", rounds_per_second: "Fire rate",
  bullet_resist: "Bullet resist", tech_resist: "Spirit resist", critical_damage_bonus: "Crit damage",
};
const label = (key: string) => STAT_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function readStats(source: unknown): Array<{ key: string; value: string }> {
  if (!source || typeof source !== "object") return [];
  const out: Array<{ key: string; value: string }> = [];
  for (const [key, raw] of Object.entries(source as Record<string, unknown>)) {
    let value: unknown = raw;
    if (raw && typeof raw === "object") value = (raw as Record<string, unknown>).value ?? (raw as Record<string, unknown>).display_value;
    if (typeof value === "number" && Number.isFinite(value)) out.push({ key, value: Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") });
    else if (typeof value === "string" && value.trim() && value.length < 20) out.push({ key, value });
  }
  return out.filter((entry) => entry.value !== "0").slice(0, 14);
}

function readProperties(source: unknown): Array<{ key: string; label: string; value: string }> {
  if (!source || typeof source !== "object") return [];
  return Object.entries(source as Record<string, unknown>).flatMap(([key, raw]) => {
    if (!raw || typeof raw !== "object") return [];
    const p = raw as Record<string, unknown>;
    const v = p.value;
    if (v === undefined || v === null || String(v).trim() === "" || String(v) === "0" || String(v) === "-1") return [];
    const prefix = typeof p.prefix === "string" && !p.prefix.includes("{") ? p.prefix : "";
    const postfix = typeof p.postfix === "string" ? p.postfix : "";
    const name = typeof p.label === "string" && p.label ? p.label : key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    return [{ key, label: name, value: `${prefix}${v}${postfix}` }];
  }).slice(0, 8);
}

function readUpgrades(source: unknown): string[] {
  if (!Array.isArray(source)) return [];
  return source.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      const d = typeof e.description === "string" ? e.description : typeof e.desc === "string" ? e.desc : "";
      return d ? [d] : [];
    }
    return [];
  });
}

async function HeroItems({ heroId }: { heroId: number }) {
  const [analytics, assets] = await Promise.allSettled([
    getItemAnalytics({ period: "30d", gameMode: "normal", matchMode: "ranked,unranked", rating: "all" }, heroId),
    getAllItemAssets(),
  ]);
  if (analytics.status === "rejected" || assets.status === "rejected") return null;
  const byId = new Map(assets.value.map((item) => [item.id, item]));
  const entries = Object.entries(analytics.value.stats).flatMap(([id, stat]) => {
    const item = byId.get(Number(id));
    return item && item.type === "upgrade" && item.shopable && stat.winRate !== null && stat.pickRate !== null ? [{ item, stat }] : [];
  });
  const maxMatches = Math.max(1, ...entries.map((entry) => entry.stat.matches));
  const top = entries.filter((entry) => entry.stat.matches >= maxMatches * 0.1).sort((a, b) => (b.stat.winRate ?? 0) - (a.stat.winRate ?? 0)).slice(0, 12);
  if (!top.length) return null;
  return (
    <section className="hp-panel">
      <h2><T k="hero.bestItems" /></h2>
      <p className="muted hp-note"><T k="hero.bestItemsNote" /></p>
      <div className="hp-items">
        {top.map(({ item, stat }) => (
          <Link href={`/items/${item.id}`} className="hp-item" key={item.id}>
            <ItemTile item={item} size="md" />
            <span><strong>{item.name}</strong><small>{(stat.winRate ?? 0).toFixed(1)}% · {(stat.pickRate ?? 0).toFixed(1)}% <T k="hero.pickRate" /></small></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Build order helper: for each game phase, the items with the best win rate when bought in that phase.
 * Only items with a real sample (at least 15% of the phase's most bought item) count, and an item shown
 * in an earlier phase is not repeated, so the three rows read as a buy order.
 */
async function HeroBuildOrder({ heroId, heroName }: { heroId: number; heroName: string }) {
  const [phases, assets] = await Promise.allSettled([getHeroItemPhases(heroId), getAllItemAssets()]);
  if (phases.status === "rejected" || assets.status === "rejected") return null;
  const byId = new Map(assets.value.map((item) => [item.id, item]));
  const shown = new Set<number>();
  const rows = phases.value.map((phase) => {
    const candidates = phase.items.flatMap((row) => {
      const item = byId.get(row.itemId);
      return item && item.type === "upgrade" && item.shopable ? [{ item, row, winRate: (row.wins / (row.wins + row.losses)) * 100 }] : [];
    });
    const maxMatches = Math.max(1, ...candidates.map((entry) => entry.row.matches));
    const picks = candidates
      .filter((entry) => entry.row.matches >= Math.max(30, maxMatches * 0.15) && !shown.has(entry.item.id))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 6);
    picks.forEach((entry) => shown.add(entry.item.id));
    const souls = picks.reduce((sum, entry) => sum + (entry.item.cost ?? 0), 0);
    return { phase, picks, souls };
  });
  if (!rows.some((row) => row.picks.length)) return null;
  const phaseKey = { early: "hero.phaseEarly", mid: "hero.phaseMid", late: "hero.phaseLate" } as const;
  return (
    <section className="hp-panel hp-build-order">
      <h2><T k="hero.buildOrder" /></h2>
      <p className="muted hp-note"><T k="hero.buildOrderNote" vars={{ hero: heroName }} /></p>
      <ol className="hp-bo">
        {rows.map(({ phase, picks, souls }) => picks.length > 0 && (
          <li key={phase.key} className="hp-bo-phase">
            <div className="hp-bo-label">
              <strong><T k={phaseKey[phase.key]} /></strong>
              <small>{phase.to === null ? <L vars={{ n: phase.from / 60 }}>{"{n}+ min"}</L> : <L vars={{ a: phase.from / 60, b: phase.to / 60 }}>{"{a}–{b} min"}</L>}{souls > 0 && <> · <L vars={{ n: souls.toLocaleString() }}>{"{n} souls"}</L></>}</small>
            </div>
            <div className="hp-bo-items">
              {picks.map(({ item, row, winRate }) => (
                <Link href={`/items/${item.id}`} className="hp-bo-item" key={item.id} title={`${item.name} · ${winRate.toFixed(1)}% · ${row.matches.toLocaleString()} matches`}>
                  <ItemTile item={item} size="md" />
                  <b data-good={winRate >= 50}>{winRate.toFixed(0)}%</b>
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MatchupList({ rows, names, images, label }: { rows: HeroMatchup[]; names: Map<number, string>; images: Map<number, string>; label: ReactNode }) {
  if (!rows.length) return null;
  return (
    <div className="hp-matchups">
      <h3>{label}</h3>
      {rows.map((row) => (
        <Link href={`/heroes/${row.heroId}`} className="hp-matchup" key={row.heroId}>
          <span className="hp-mu-img" style={images.get(row.heroId) ? { backgroundImage: `url("${images.get(row.heroId)}")` } : undefined} />
          <strong>{names.get(row.heroId) ?? `#${row.heroId}`}</strong>
          <b data-good={row.winRate >= 50}>{row.winRate.toFixed(1)}%</b>
        </Link>
      ))}
    </div>
  );
}

async function HeroMatchups({ heroId }: { heroId: number }) {
  const [counters, synergies, heroes] = await Promise.allSettled([getHeroCounters(heroId), getHeroSynergies(heroId), getHeroes()]);
  if (heroes.status === "rejected") return null;
  const names = new Map(heroes.value.flatMap((hero) => typeof hero.id === "number" && hero.name ? [[hero.id, hero.name] as const] : []));
  const images = new Map(heroes.value.flatMap((hero) => { const image = typeof hero.id === "number" ? heroPortrait(hero) : null; return image ? [[hero.id as number, image] as const] : []; }));
  const enough = (rows: HeroMatchup[]) => { const max = Math.max(1, ...rows.map((row) => row.matches)); return rows.filter((row) => row.matches >= max * 0.1); };
  const c = counters.status === "fulfilled" ? enough(counters.value) : [];
  const s = synergies.status === "fulfilled" ? enough(synergies.value) : [];
  const strong = [...c].sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  const weak = [...c].sort((a, b) => a.winRate - b.winRate).slice(0, 5);
  const best = [...s].sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  if (!strong.length && !best.length) return null;
  return (
    <section className="hp-panel">
      <h2><T k="hero.counters" /></h2>
      <MatchupList rows={strong} names={names} images={images} label={<T k="hero.strongVs" />} />
      <MatchupList rows={weak} names={names} images={images} label={<T k="hero.weakVs" />} />
      <MatchupList rows={best} names={names} images={images} label={<T k="hero.synergies" />} />
    </section>
  );
}

async function HeroContent({ params }: { params: Promise<{ heroId: string }> }) {
  const { heroId } = await params;
  const id = Number(heroId);
  if (!Number.isSafeInteger(id) || id < 0) notFound();
  const rows = await catalog();
  const row = rows.find((entry) => entry.hero.id === id);
  if (!row) notFound();
  const { stat, win, pick } = row;
  const language = apiLanguage(await getRequestLocale());
  let hero = row.hero;
  let rawList = await abilities(id, language).catch(() => null);
  if (language !== "english") {
    const localizedHero = (await getHeroesIn(language).catch(() => [])).find((entry) => entry.id === id);
    if (localizedHero) hero = { ...hero, name: localizedHero.name ?? hero.name, description: localizedHero.description ?? hero.description };
  }
  if (!rawList || !rawList.length) rawList = await abilities(id).catch(() => []);
  const list = rawList.filter((ability) => {
    const key = `${ability.name ?? ""} ${String((ability as Record<string, unknown>).class_name ?? "")}`;
    return !/melee/i.test(key);
  });
  const banner = heroBackground(hero);
  const card = heroCardImage(hero);
  const stats = readStats((hero as Record<string, unknown>).starting_stats ?? (hero as Record<string, unknown>).base_stats);
  const slotWins = rows.filter((entry) => entry.win !== null).sort((a, b) => (b.win ?? 0) - (a.win ?? 0));
  const winRank = slotWins.findIndex((entry) => entry.hero.id === id) + 1;

  return (
    <main className="content-inner hero-page">
      <Link className="back-link" href="/heroes"><L>← All heroes</L></Link>

      <section className="hp-header" style={banner ? { backgroundImage: `linear-gradient(90deg, #0d0f14 8%, #0d0f14cc 45%, #0d0f1466), url("${banner}")` } : undefined}>
        {card && <span className="hp-portrait" style={{ backgroundImage: `url("${card}")` }} aria-hidden="true" />}
        <div className="hp-intro">
          {hero.description?.role && <span className="hp-role">{hero.description.role}</span>}
          <h1>{hero.name}</h1>
          {hero.description?.playstyle && <RichText text={hero.description.playstyle} className="hp-playstyle" />}
          <div className="hp-links">
            <Link href={`/builds?heroId=${id}`}><L>Community builds</L></Link>
            <Link href={`/items?heroId=${id}`}><L>Item stats</L></Link>
          </div>
        </div>
        <div className="hp-kpis">
          <div><small><L>Win rate</L></small><strong>{win === null ? "—" : `${win.toFixed(1)}%`}</strong>{winRank > 0 && <span>#{winRank} of {slotWins.length}</span>}</div>
          <div><small><L>Pick rate</L></small><strong>{pick === null ? "—" : `${pick.toFixed(1)}%`}</strong></div>
          <div><small><L>Matches</L></small><strong>{stat?.matches.toLocaleString() ?? "—"}</strong></div>
        </div>
      </section>

      <div className="hp-columns">
        <div className="hp-main">
          <section className="hp-panel">
            <h2><L>Abilities</L></h2>
            {!list.length ? <p className="muted"><L>Abilities are not available right now.</L></p> : (
              <ol className="hp-abilities">
                {list.map((ability, index) => {
                  const image = ability.image_webp || ability.image;
                  const props = readProperties(ability.properties);
                  const upgrades = readUpgrades(ability.upgrades);
                  return (
                    <li className="hp-ability" key={ability.id ?? index}>
                      <span className="hp-ability-icon" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{image ? "" : index + 1}</span>
                      <div className="hp-ability-body">
                        <h3><span>{index + 1}</span>{ability.name || "Unnamed ability"}</h3>
                        <RichText text={ability.description?.desc} />
                        {ability.description?.active && <div className="hp-effect"><b><L>Active</L></b><RichText text={ability.description.active} /></div>}
                        {ability.description?.passive && <div className="hp-effect"><b><L>Passive</L></b><RichText text={ability.description.passive} /></div>}
                        {props.length > 0 && <dl className="hp-props">{props.map((p) => <div key={p.key}><dt>{p.label}</dt><dd>{p.value}</dd></div>)}</dl>}
                        {upgrades.length > 0 && <ul className="hp-upgrades">{upgrades.slice(0, 3).map((u, i) => <li key={i}><b>T{i + 1}</b><RichText text={u} /></li>)}</ul>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          <Suspense fallback={null}><HeroBuildOrder heroId={id} heroName={hero.name ?? "this hero"} /></Suspense>
          <Suspense fallback={null}><HeroItems heroId={id} /></Suspense>
        </div>

        <aside className="hp-side">
          <Suspense fallback={null}><HeroMatchups heroId={id} /></Suspense>
          {stats.length > 0 && (
            <section className="hp-panel">
              <h2><L>Base stats</L></h2>
              <dl className="hp-stats">{stats.map((s) => <div key={s.key}><dt><L>{label(s.key)}</L></dt><dd>{s.value}</dd></div>)}</dl>
            </section>
          )}
          {hero.description?.lore && (
            <section className="hp-panel">
              <h2><L>Lore</L></h2>
              <RichText text={hero.description.lore} className="hp-lore" />
            </section>
          )}
          <section className="hp-panel">
            <h2><L>Explore</L></h2>
            <div className="hp-explore">
              <Link href={`/items?heroId=${id}`}><L vars={{ hero: hero.name ?? "" }}>{"Best items for {hero} →"}</L></Link>
              <Link href={`/builds?heroId=${id}`}><L>Community builds →</L></Link>
              <Link href="/leaderboards"><L>Leaderboards →</L></Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default async function Page({ params }: { params: Promise<{ heroId: string }> }) {
  return <AppShell active="Heroes"><Suspense fallback={<main className="content-inner hero-page"><p className="api-message" role="status"><L>Loading hero data…</L></p></main>}><HeroContent params={params} /></Suspense></AppShell>;
}
