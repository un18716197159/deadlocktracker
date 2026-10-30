import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { getHeroes } from "../../lib/deadlock-api";
import Builds from "./builds";

export const metadata = { title: "Community Builds | Deadlock Intelligence" };

async function BuildCatalog() { return <Builds heroes={await getHeroes()} />; }

export default function Page() {
  return <AppShell active="Items"><Suspense fallback={<main className="content-inner builds-page"><h1>Community builds<span>.</span></h1><p className="api-message" role="status">Loading hero filters…</p></main>}><BuildCatalog /></Suspense></AppShell>;
}
