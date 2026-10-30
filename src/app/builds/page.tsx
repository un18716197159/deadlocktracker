import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getHeroes } from "../../lib/deadlock-api";
import Builds from "./builds";

export const metadata = { title: "Community Builds | Deadlock Intelligence" };

async function BuildCatalog({ searchParams }: { searchParams: Promise<{ heroId?: string }> }) {
  const [heroes, query] = await Promise.all([getHeroes(), searchParams]);
  const rawHeroId = query.heroId;
  const initialHeroId = rawHeroId && /^\d+$/.test(rawHeroId) && Number.isSafeInteger(Number(rawHeroId)) && heroes.some((hero) => hero.id === Number(rawHeroId))
    ? Number(rawHeroId)
    : null;
  return <Builds heroes={heroes} initialHeroId={initialHeroId} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ heroId?: string }> }) {
  return <AppShell active="Builds"><Suspense fallback={<main className="content-inner builds-page"><h1>Community builds<span>.</span></h1><p className="api-message" role="status">Loading hero filters…</p></main>}><BuildCatalog searchParams={searchParams} /></Suspense></AppShell>;
}
