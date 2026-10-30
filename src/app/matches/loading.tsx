import AppShell from "../components/app-shell";

export default function LoadingMatches() {
  return <AppShell active="Matches"><main className="content-inner match-explorer-page" aria-busy="true" aria-label="Loading matches">
    <div className="page-heading"><div><p className="eyebrow">MATCH DATABASE</p><h1>Match Explorer<span>.</span></h1><p className="muted">Loading live match data…</p></div></div>
    <div className="match-list-skeleton">{Array.from({ length: 8 }, (_, index) => <div className="match-skeleton-row" key={index}><span /><span /><span /></div>)}</div>
  </main></AppShell>;
}
