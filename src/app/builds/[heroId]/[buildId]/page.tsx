import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import AppShell from "../../../components/app-shell";
import { apiLanguage, getRequestLocale } from "../../../../lib/i18n/server";
import { getCommunityBuild, ItemApiError } from "../../../../lib/items-api";
import { connection } from "next/server";
import ItemTile from "../../../components/item-tile";
import { L } from "../../../../lib/i18n/provider";

export async function generateMetadata({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  const { heroId, buildId } = await params;
  const fallback = { title: `Community Build ${buildId} | Deadlock Tracker` };
  if (!/^\d+$/.test(heroId) || !/^\d+$/.test(buildId)) return fallback;
  try {
    // Same cached call as the page itself, so the title costs no extra API request.
    const { build, hero } = await getCommunityBuild(Number(heroId), Number(buildId), apiLanguage(await getRequestLocale()));
    const name = build.hero_build.name?.trim();
    if (!name) return fallback;
    return {
      title: `${name}${hero?.name ? ` — ${hero.name} build` : ""} | Deadlock Tracker`,
      description: `Community Deadlock build "${name}"${hero?.name ? ` for ${hero.name}` : ""}: items by category, from the in-game build browser.`,
    };
  } catch {
    return fallback;
  }
}

async function Content({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  const { heroId, buildId } = await params;
  if (!/^\d+$/.test(heroId) || !/^\d+$/.test(buildId) || !Number.isSafeInteger(Number(heroId)) || !Number.isSafeInteger(Number(buildId))) notFound();
  await connection();
  let view;
  try { view = await getCommunityBuild(Number(heroId), Number(buildId), apiLanguage(await getRequestLocale())); } catch (error) {
    if (error instanceof ItemApiError && error.status === 404) notFound();
    return <main className="content-inner build-detail-page"><Link className="back-link" href="/builds"><L>← Community builds</L></Link><p className="api-message error-message" role="alert">Published build details are unavailable. {error instanceof Error ? error.message : "Could not load this build."}</p></main>;
  }
  const { build, hero, categories } = view;
  const heroBuild = build.hero_build;
  const count = (value?: number | null) => typeof value === "number" ? value.toLocaleString() : "Unavailable";
  return <main className="content-inner build-detail-page"><Link className="back-link" href="/builds"><L>← Community builds</L></Link><section className="panel build-detail-hero"><h1>{heroBuild.name}<span>.</span></h1><p className="muted"><Link href={`/heroes/${heroBuild.hero_id}`}>{hero?.name || `Hero ${heroBuild.hero_id}`}</Link> · Version {heroBuild.version} · Author <Link href={`/players/${heroBuild.author_account_id}`}>{heroBuild.author_account_id}</Link></p>{heroBuild.description && <p>{heroBuild.description}</p>}<div className="community-build-meta"><span>{count(build.num_favorites)} favorites</span><span>{count(build.num_weekly_favorites)} weekly favorites</span><span>Updated {typeof heroBuild.last_updated_timestamp === "number" ? new Date(heroBuild.last_updated_timestamp * 1000).toLocaleDateString() : "Date unavailable"}</span></div></section>{categories.length ? <div className="build-detail-categories">{categories.map((category) => <section className="panel build-detail-category" key={category.name}><div className="panel-heading"><div><p className="eyebrow"><L>BUILD CATEGORY</L></p><h2>{category.name}</h2></div></div>{category.description && <p>{category.description}</p>}{category.items.length ? <div className="build-category-items">{category.items.map((entry, index) => <div className="build-category-item" key={`${entry.item?.id ?? "unknown"}-${index}`}>{entry.item ? <Link href={`/items/${entry.item.id}`} className="build-category-item-link"><ItemTile item={entry.item} />{entry.item.name}</Link> : <span className="build-category-unresolved"><L>Removed item</L></span>}{entry.annotation && <small>{entry.annotation}</small>}{typeof entry.requiredFlexSlots === "number" && <small>Requires {entry.requiredFlexSlots} flex slots</small>}</div>)}</div> : <p className="profile-note"><L>No item entries in this category.</L></p>}</section>)}</div> : <section className="panel"><p className="profile-note"><L>This build contains no item categories.</L></p></section>}<div className="items-footer-links"><Link href="/items"><L>Item catalog ↗</L></Link><Link href="/matches"><L>Match Explorer ↗</L></Link></div></main>;
}

export default function Page({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  return <AppShell active="Builds"><Suspense fallback={<main className="content-inner build-detail-page"><p className="api-message" role="status"><L>Loading published build…</L></p></main>}><Content params={params} /></Suspense></AppShell>;
}
