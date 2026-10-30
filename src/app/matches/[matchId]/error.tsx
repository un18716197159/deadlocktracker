"use client";
import AppShell from "../../components/app-shell";

export default function MatchError({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Matches"><main className="content-inner match-detail"><p className="eyebrow">MATCH DETAILS / API STATUS</p><section className="panel match-empty" role="alert"><h1>Match unavailable<span>.</span></h1><p>{error.message}</p><button className="refresh-button" onClick={reset}>Try again ↻</button></section></main></AppShell>;
}
