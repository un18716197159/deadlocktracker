import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getLocalizedHeroes, getLocalizedShopItems } from "../../lib/localized";
import Items from "./items";
import { L } from "../../lib/i18n/provider";

export const metadata = { title: "Items | Deadlock Tracker" };
type Props = { searchParams: Promise<{ heroId?: string }> };

async function Catalog({ searchParams }: Props) {
  const [assets, heroes, query] = await Promise.all([getLocalizedShopItems(), getLocalizedHeroes(), searchParams]);
  const rawHero = query.heroId;
  const initialHeroId = rawHero && /^\d+$/.test(rawHero) && Number.isSafeInteger(Number(rawHero)) ? Number(rawHero) : null;
  return <Items assets={assets} heroes={heroes} initialHeroId={initialHeroId} />;
}

export default function Page(props: Props) {
  return <AppShell active="Items"><Suspense fallback={<main className="content-inner items-page"><h1><L>Items</L><span>.</span></h1><p className="api-message" role="status"><L>Loading items…</L></p></main>}><Catalog {...props} /></Suspense></AppShell>;
}
