"use client";

import Link from "next/link";
import AppShell from "../components/app-shell";
import { L } from "../../lib/i18n/provider";

export default function MatchExplorerError({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Matches"><main className="content-inner match-explorer-page"><section className="panel match-empty" role="alert"><h1><L>Match feed unavailable</L><span>.</span></h1><p>{error.message}</p><button className="refresh-button" onClick={reset}><L>Try again ↻</L></button><Link className="match-back-link" href="/"><L>Return to Overview</L></Link></section></main></AppShell>;
}
