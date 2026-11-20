"use client";

import { L } from "../../../lib/i18n/provider";
export default function PlayerError({ reset }: { reset: () => void }) {
  return <main className="content-inner player-page"><section className="panel error-state"><h1><L>Player data unavailable</L><span>.</span></h1><p className="muted"><L>Could not load this player right now. Try again in a minute.</L></p><button className="refresh-button" onClick={reset}><L>Try again</L></button></section></main>;
}
