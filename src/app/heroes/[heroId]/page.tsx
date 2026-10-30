import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AppShell from "../../components/app-shell";
import { abilities, catalog } from "../../../lib/heroes-api";

export async function generateMetadata({ params }: { params: Promise<{ heroId: string }> }) {
  const { heroId } = await params;
  return { title: `Hero ${heroId} | Deadlock Intelligence` };
}

async function HeroContent({ params }: { params: Promise<{ heroId: string }> }) {
  const { heroId } = await params;
  const id = Number(heroId);
  if (!Number.isSafeInteger(id) || id < 0) notFound();
  const row = (await catalog()).find((entry) => entry.hero.id === id);
  if (!row) notFound();
  const { hero, stat, win, pick } = row;
  const list = await abilities(id);
  const art = hero.images?.background_image_webp || hero.images?.background_image || hero.images?.hero_card_critical;
  return (
    <main className="content-inner hero-detail">
      <Link className="back-link" href="/heroes">← All heroes</Link>
      <section className="hero-detail-cover" style={art ? { backgroundImage: `linear-gradient(90deg,#101213f5,#10121330),url("${art}")` } : {}}>
        <div><p className="eyebrow">{hero.description?.role || "HERO"} / #{id}</p><h1>{hero.name}<span>.</span></h1>
          {hero.description?.playstyle && <p>{hero.description.playstyle}</p>}
          {hero.description?.lore && <p>{hero.description.lore}</p>}
        </div>
      </section>
      <div className="hero-detail-metrics">
        <div className="profile-metric"><small>WIN RATE</small><strong>{win === null ? "—" : `${win.toFixed(1)}%`}</strong><span>Wins / wins and losses</span></div>
        <div className="profile-metric"><small>PICK RATE</small><strong>{pick === null ? "—" : `${pick.toFixed(1)}%`}</strong><span>Share of hero picks</span></div>
        <div className="profile-metric"><small>MATCHES</small><strong>{stat?.matches.toLocaleString() ?? "—"}</strong><span>Recent normal mode</span></div>
      </div>
      <section className="panel hero-abilities"><p className="eyebrow">HERO ASSETS</p><h2>Abilities</h2>
        {!list.length ? <p>No ability data returned.</p> : <div className="ability-grid">{list.map((ability, index) => <article className="ability-card" key={ability.id ?? index}>
          <span className="ability-image" style={ability.image_webp || ability.image ? { backgroundImage: `url("${ability.image_webp || ability.image}")` } : {}}>{ability.image_webp || ability.image ? "" : index + 1}</span>
          <div><p className="eyebrow">ABILITY {index + 1}</p><h3>{ability.name || "Unnamed ability"}</h3>
            {ability.description?.desc && <p>{ability.description.desc}</p>}
            {ability.description?.active && <p>{ability.description.active}</p>}
            {ability.description?.passive && <p>{ability.description.passive}</p>}
          </div>
        </article>)}</div>}
      </section>
      <section className="panel hero-abilities"><h2>Items & builds</h2><p>Browse item performance for this hero or open published community builds.</p><p><Link href={`/items?heroId=${id}`}>Item statistics for {hero.name} ↗</Link> · <Link href={`/builds?heroId=${id}`}>Community builds ↗</Link></p></section>
    </main>
  );
}

export default async function Page({ params }: { params: Promise<{ heroId: string }> }) {
  return <AppShell active="Heroes"><Suspense fallback={<main className="content-inner hero-detail"><p className="api-message" role="status">Loading hero data…</p></main>}><HeroContent params={params} /></Suspense></AppShell>;
}

