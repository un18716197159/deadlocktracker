"use client";
import AppShell from "../../components/app-shell";
import { L } from "../../../lib/i18n/provider";

export default function MatchError({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Matches"><main className="content-inner match-detail"><section className="panel match-empty" role="alert"><h1><L>Match unavailable</L><span>.</span></h1><p>{error.message}</p><button className="refresh-button" onClick={reset}><L>Try again ↻</L></button></section></main></AppShell>;
}
