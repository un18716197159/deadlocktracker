import { connection } from "next/server";
import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getHeroes, getRankedSeasons } from "../../lib/deadlock-api";
import Leaderboards from "./leaderboards";

export const metadata = { title: "Leaderboards | Deadlock Intelligence" };

async function LeaderboardContent() {
  await connection();
  const [heroResult, seasonResult] = await Promise.allSettled([getHeroes(), getRankedSeasons()]);
  return <Leaderboards heroes={heroResult.status === "fulfilled" ? heroResult.value : []} seasons={seasonResult.status === "fulfilled" ? seasonResult.value : []} assetsUnavailable={heroResult.status === "rejected" || seasonResult.status === "rejected"} />;
}

export default function Page() {
  return <AppShell active="Leaderboards"><Suspense fallback={<main className="content-inner leaderboard-page"><p className="api-message" role="status">Loading leaderboard filters…</p></main>}><LeaderboardContent /></Suspense></AppShell>;
}
