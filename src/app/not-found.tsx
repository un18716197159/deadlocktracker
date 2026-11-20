import Link from "next/link";
import AppShell from "./components/app-shell";
import { L } from "../lib/i18n/provider";

export const metadata = { title: "Page not found | Deadlock Tracker" };

/** Shown for any address that does not exist (and when a page calls notFound()). */
export default function NotFound() {
  return (
    <AppShell active="">
      <main className="content-inner not-found-page">
        <section className="panel not-found">
          <p className="not-found-code">404</p>
          <h1><L>Page not found</L></h1>
          <p className="muted"><L>This player, match or page does not exist, or the link is out of date.</L></p>
          <div className="not-found-links">
            <Link className="refresh-button" href="/"><L>Search a player</L></Link>
            <Link href="/heroes"><L>Heroes</L></Link>
            <Link href="/matches"><L>Matches</L></Link>
            <Link href="/leaderboards"><L>Leaderboards</L></Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
