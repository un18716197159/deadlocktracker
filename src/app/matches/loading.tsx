import { T } from "../../lib/i18n/provider";
import AppShell from "../components/app-shell";

export default function LoadingMatches() {
  return <AppShell active="Matches"><main className="content-inner match-explorer-page" aria-busy="true" aria-label="Loading matches">
    <div className="page-heading"><div><h1><T k="matches.title" /></h1><p className="muted"><T k="common.loading" /></p></div></div>
    <div className="match-list-skeleton">{Array.from({ length: 8 }, (_, index) => <div className="match-skeleton-row" key={index}><span /><span /><span /></div>)}</div>
  </main></AppShell>;
}
