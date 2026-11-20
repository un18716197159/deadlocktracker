import { Suspense } from "react";
import AppShell from "../components/app-shell";
import { catalog } from "../../lib/heroes-api";
import Heroes from "./heroes";
import { L } from "../../lib/i18n/provider";

export const metadata = { title: "Heroes | Deadlock Tracker" };

async function CatalogContent() {
  const rows = await catalog();
  return <Heroes rows={rows} />;
}

export default function Page() {
  return (
    <AppShell active="Heroes">
      <Suspense fallback={<main className="content-inner heroes-page"><h1><L>Heroes</L><span>.</span></h1><p className="api-message" role="status"><L>Loading hero data…</L></p></main>}>
        <CatalogContent />
      </Suspense>
    </AppShell>
  );
}
