import { connection } from "next/server";
import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getSteamProfiles, type SteamProfile } from "../../lib/deadlock-api";
import Compare from "./compare";

export const metadata = { title: "Player Comparison | Deadlock Intelligence" };
type Props = { searchParams: Promise<{ left?: string; right?: string }> };

async function ComparisonPage({ searchParams }: Props) {
  await connection();
  const query = await searchParams;
  const ids = [query.left, query.right].flatMap((value) => value && /^\d{1,10}$/.test(value) && Number.isSafeInteger(Number(value)) ? [Number(value)] : []);
  let profiles: SteamProfile[] = [];
  if (ids.length) {
    try { profiles = await getSteamProfiles(ids); } catch { profiles = []; }
  }
  const byId = new Map(profiles.flatMap((profile) => typeof profile.account_id === "number" ? [[profile.account_id, profile] as const] : []));
  const leftId = query.left ? Number(query.left) : NaN;
  const rightId = query.right ? Number(query.right) : NaN;
  return <Compare initialLeft={byId.get(leftId) ?? null} initialRight={byId.get(rightId) ?? null} />;
}

export default function Page(props: Props) {
  return <AppShell active="Compare"><Suspense fallback={<main className="content-inner compare-page"><p className="api-message" role="status">Loading player comparison…</p></main>}><ComparisonPage {...props} /></Suspense></AppShell>;
}
