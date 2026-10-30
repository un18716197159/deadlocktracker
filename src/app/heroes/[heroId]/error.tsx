"use client";
import AppShell from "../../components/app-shell";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Heroes"><main className="content-inner heroes-page"><h1>Hero<span>.</span></h1><section className="panel heroes-state" role="alert"><h2>Could not load this hero</h2><p>{error.message}</p><button className="refresh-button" onClick={reset}>Try again ↻</button></section></main></AppShell>;
}
