"use client";

export default function PlayerError({ reset }: { reset: () => void }) {
  return <main className="content-inner player-page"><section className="panel error-state"><p className="eyebrow">PLAYER PROFILE</p><h1>Player data unavailable<span>.</span></h1><p className="muted">The Deadlock API did not return a usable profile response.</p><button className="refresh-button" onClick={reset}>Try again</button></section></main>;
}
