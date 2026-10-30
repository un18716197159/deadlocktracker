"use client";

import Link from "next/link";
import AppShell from "../components/app-shell";

export default function MatchExplorerError({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Matches"><main className="content-inner match-explorer-page"><p className="eyebrow">MATCH EXPLORER / API STATUS</p><section className="panel match-empty" role="alert"><h1>Match feed unavailable<span>.</span></h1><p>{error.message}</p><button className="refresh-button" onClick={reset}>Try again ↻</button><Link className="match-back-link" href="/">Return to Overview</Link></section></main></AppShell>;
}
