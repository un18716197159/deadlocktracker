"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroAsset } from "../../lib/deadlock-api";
import type { BuildView } from "../../lib/items-api";

type Props = { heroes: HeroAsset[] };
type Payload = { builds: BuildView[] };

export default function Builds({ heroes }: Props) {
  const [heroId, setHeroId] = useState("all");
  const [sort, setSort] = useState("weekly_favorites");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [rows, setRows] = useState<BuildView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "24", sort, ...(heroId === "all" ? {} : { heroId }), ...(submittedQuery ? { q: submittedQuery } : {}) });
    fetch("/api/builds?" + params, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load community builds."); return data as Payload; })
      .then((data) => setRows(data.builds))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load community builds."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [heroId, sort, submittedQuery]);
  const refresh = (action: () => void) => { setLoading(true); setError(""); action(); };
  const count = (value?: number | null) => typeof value === "number" ? value.toLocaleString() : "Unavailable";
  const formatDate = (value?: number | null) => typeof value === "number" ? new Date(value * 1000).toLocaleDateString() : "Date unavailable";
  return <main className="content-inner builds-page">
    <div className="page-heading"><div><p className="eyebrow">DEADLOCK API / PUBLISHED HERO BUILDS</p><h1>Community builds<span>.</span></h1><p className="muted">Published build guides and their real item categories from the API.</p></div><Link className="refresh-button" href="/items">Item catalog ↗</Link></div>
    <form className="builds-filters" onSubmit={(event) => { event.preventDefault(); refresh(() => setSubmittedQuery(query.trim())); }}><label><span>SEARCH NAME</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Build title…" /></label><label><span>HERO</span><select value={heroId} onChange={(event) => refresh(() => setHeroId(event.target.value))}><option value="all">All heroes</option>{heroes.map((hero) => typeof hero.id === "number" ? <option key={hero.id} value={hero.id}>{hero.name || `Hero ${hero.id}`}</option> : null)}</select></label><label><span>SORT BY</span><select value={sort} onChange={(event) => refresh(() => setSort(event.target.value))}><option value="weekly_favorites">Weekly favorites</option><option value="favorites">Favorites</option><option value="updated_at">Recently updated</option></select></label><button type="submit" className="refresh-button">Search</button></form>
    <p className="builds-source-note">Builds come from Deadlock API community build records. Their categories contain the author&apos;s real item recommendations; no generated builds are shown.</p>
    {loading && <div className="builds-skeleton" role="status" aria-label="Loading community builds" aria-busy="true">{[0, 1, 2, 3].map((index) => <div key={index} />)}</div>}
    {error && <p className="api-message error-message" role="alert">Community builds unavailable. {error}</p>}
    {!loading && !error && rows.length > 0 && <div className="builds-grid">{rows.map(({ build, hero, categories }) => {
      const heroBuild = build.hero_build;
      return <article className="community-build-card" key={`${heroBuild.hero_id}-${heroBuild.hero_build_id}`}><div className="community-build-top"><span className="community-build-hero-art" aria-hidden="true" style={hero?.images?.icon_image_small_webp || hero?.images?.icon_image_small ? { backgroundImage: `url("${hero.images.icon_image_small_webp || hero.images.icon_image_small}")` } : undefined} /><div><Link href={`/heroes/${heroBuild.hero_id}`} className="eyebrow">{hero?.name || `Hero ${heroBuild.hero_id}`}</Link><h2>{heroBuild.name}</h2><p>{heroBuild.description || "No build description provided."}</p></div></div><div className="community-build-meta"><span>{count(build.num_weekly_favorites)} weekly favorites</span><span>Version {heroBuild.version}</span><span>Updated {formatDate(heroBuild.last_updated_timestamp)}</span></div><div className="community-build-items">{categories.slice(0, 3).map((category) => <div key={category.name}><small>{category.name}</small><span>{category.items.slice(0, 4).map((entry) => entry.item?.name || `Item ${entry.item?.id ?? "unavailable"}`).join(" · ") || "No item entries"}</span></div>)}</div><Link className="build-details-link" href={`/builds/${heroBuild.hero_id}/${heroBuild.hero_build_id}`}>View build details ↗</Link></article>;
    })}</div>}
    {!loading && !error && rows.length === 0 && <p className="api-message">No published builds matched these filters.</p>}
    <footer><span>DEADLOCK INTELLIGENCE · COMMUNITY BUILDS</span><span>Source: Deadlock API <i /></span></footer>
  </main>;
}

