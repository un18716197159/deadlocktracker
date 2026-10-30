import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { catalog } from "../../lib/heroes-api";
import Heroes from "./heroes";

export const metadata = { title: "Heroes | Deadlock Intelligence" };

async function CatalogContent() {
  const rows = await catalog();
  return <Heroes rows={rows} />;
}

export default function Page() {
  return (
    <AppShell active="Heroes">
      <Suspense fallback={<main className="content-inner heroes-page"><h1>Heroes<span>.</span></h1><p className="api-message" role="status">Loading hero data…</p></main>}>
        <CatalogContent />
      </Suspense>
    </AppShell>
  );
}
