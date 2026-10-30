"use client";
import AppShell from "../components/app-shell";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Heroes"><main className="content-inner heroes-page"><h1>Heroes<span>.</span></h1><section className="panel heroes-state" role="alert"><h2>Catalog unavailable</h2><p>{error.message}</p><button className="refresh-button" onClick={reset}>Try again ↻</button></section></main></AppShell>;
}
