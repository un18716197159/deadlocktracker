"use client";
import AppShell from "../components/app-shell";
import { L } from "../../lib/i18n/provider";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <AppShell active="Heroes"><main className="content-inner heroes-page"><h1><L>Heroes</L><span>.</span></h1><section className="panel heroes-state" role="alert"><h2><L>Catalog unavailable</L></h2><p>{error.message}</p><button className="refresh-button" onClick={reset}><L>Try again ↻</L></button></section></main></AppShell>;
}
