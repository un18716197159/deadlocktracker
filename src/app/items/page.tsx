import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getHeroes } from "../../lib/deadlock-api";
import { getItemAssets } from "../../lib/items-api";
import Items from "./items";

export const metadata = { title: "Items | Deadlock Intelligence" };
type Props = { searchParams: Promise<{ heroId?: string }> };

async function Catalog({ searchParams }: Props) {
  const [assets, heroes, query] = await Promise.all([getItemAssets(), getHeroes(), searchParams]);
  const rawHero = query.heroId;
  const initialHeroId = rawHero && /^\d+$/.test(rawHero) && Number.isSafeInteger(Number(rawHero)) ? Number(rawHero) : null;
  return <Items assets={assets} heroes={heroes} initialHeroId={initialHeroId} />;
}

export default function Page(props: Props) {
  return <AppShell active="Items"><Suspense fallback={<main className="content-inner items-page"><h1>Items<span>.</span></h1><p className="api-message" role="status">Loading item assets…</p></main>}><Catalog {...props} /></Suspense></AppShell>;
}
