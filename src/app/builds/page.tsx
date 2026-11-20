import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getLocalizedHeroes } from "../../lib/localized";
import Builds from "./builds";
import { L } from "../../lib/i18n/provider";

export const metadata = { title: "Community Builds | Deadlock Tracker" };

async function BuildCatalog({ searchParams }: { searchParams: Promise<{ heroId?: string }> }) {
  const [heroes, query] = await Promise.all([getLocalizedHeroes(), searchParams]);
  const rawHeroId = query.heroId;
  const initialHeroId = rawHeroId && /^\d+$/.test(rawHeroId) && Number.isSafeInteger(Number(rawHeroId)) && heroes.some((hero) => hero.id === Number(rawHeroId))
    ? Number(rawHeroId)
    : null;
  return <Builds heroes={heroes} initialHeroId={initialHeroId} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ heroId?: string }> }) {
  return <AppShell active="Builds"><Suspense fallback={<main className="content-inner builds-page"><h1><L>Community builds</L><span>.</span></h1><p className="api-message" role="status"><L>Loading hero filters…</L></p></main>}><BuildCatalog searchParams={searchParams} /></Suspense></AppShell>;
}
