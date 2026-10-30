import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import AppShell from "../../../components/app-shell";
import { getCommunityBuild, ItemApiError } from "../../../../lib/items-api";
import { connection } from "next/server";

export async function generateMetadata({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  const { buildId } = await params;
  return { title: `Community Build ${buildId} | Deadlock Intelligence` };
}

async function Content({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  const { heroId, buildId } = await params;
  if (!/^\d+$/.test(heroId) || !/^\d+$/.test(buildId) || !Number.isSafeInteger(Number(heroId)) || !Number.isSafeInteger(Number(buildId))) notFound();
  await connection();
  let view;
  try { view = await getCommunityBuild(Number(heroId), Number(buildId)); } catch (error) {
    if (error instanceof ItemApiError && error.status === 404) notFound();
    return <main className="content-inner build-detail-page"><Link className="back-link" href="/builds">← Community builds</Link><p className="api-message error-message" role="alert">Published build details are unavailable. {error instanceof Error ? error.message : "Could not load this build."}</p></main>;
  }
  const { build, hero, categories } = view;
  const heroBuild = build.hero_build;
  const count = (value?: number | null) => typeof value === "number" ? value.toLocaleString() : "Unavailable";
  return <main className="content-inner build-detail-page"><Link className="back-link" href="/builds">← Community builds</Link><section className="panel build-detail-hero"><p className="eyebrow">PUBLISHED HERO BUILD / #{heroBuild.hero_build_id}</p><h1>{heroBuild.name}<span>.</span></h1><p className="muted"><Link href={`/heroes/${heroBuild.hero_id}`}>{hero?.name || `Hero ${heroBuild.hero_id}`}</Link> · Version {heroBuild.version} · Author <Link href={`/players/${heroBuild.author_account_id}`}>{heroBuild.author_account_id}</Link></p>{heroBuild.description && <p>{heroBuild.description}</p>}<div className="community-build-meta"><span>{count(build.num_favorites)} favorites</span><span>{count(build.num_weekly_favorites)} weekly favorites</span><span>Updated {typeof heroBuild.last_updated_timestamp === "number" ? new Date(heroBuild.last_updated_timestamp * 1000).toLocaleDateString() : "Date unavailable"}</span></div></section><p className="builds-source-note">Each category below and its item entries are returned by the published build endpoint.</p>{categories.length ? <div className="build-detail-categories">{categories.map((category) => <section className="panel build-detail-category" key={category.name}><div className="panel-heading"><div><p className="eyebrow">BUILD CATEGORY</p><h2>{category.name}</h2></div></div>{category.description && <p>{category.description}</p>}{category.items.length ? <div className="build-category-items">{category.items.map((entry, index) => <div className="build-category-item" key={`${entry.item?.id ?? "unknown"}-${index}`}>{entry.item ? <Link href={`/items/${entry.item.id}`} className="build-category-item-link"><span aria-hidden="true" style={entry.item.image_webp || entry.item.image ? { backgroundImage: `url("${entry.item.image_webp || entry.item.image}")` } : undefined} />{entry.item.name}</Link> : <span className="build-category-unresolved">Item ID {heroBuild.details.mod_categories.find((source) => source.name === category.name)?.mods?.[index]?.ability_id ?? "unavailable"} not present in current assets</span>}{entry.annotation && <small>{entry.annotation}</small>}{typeof entry.requiredFlexSlots === "number" && <small>Requires {entry.requiredFlexSlots} flex slots</small>}</div>)}</div> : <p className="profile-note">No item entries in this category.</p>}</section>)}</div> : <section className="panel"><p className="profile-note">This build contains no item categories.</p></section>}<div className="items-footer-links"><Link href="/items">Item catalog ↗</Link><Link href="/matches">Match Explorer ↗</Link></div><footer><span>DEADLOCK INTELLIGENCE · COMMUNITY BUILD</span><span>Source: Deadlock API <i /></span></footer></main>;
}

export default function Page({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  return <AppShell active="Builds"><Suspense fallback={<main className="content-inner build-detail-page"><p className="api-message" role="status">Loading published build…</p></main>}><Content params={params} /></Suspense></AppShell>;
}
