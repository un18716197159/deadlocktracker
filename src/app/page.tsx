import type { Metadata } from "next";
import Link from "next/link";
import AppShell from "./components/app-shell";
import GlobalAnalyticsPanel from "./components/global-analytics-panel";
import HeroSearch from "./components/hero-search";
import "./home.css";

export const metadata: Metadata = {
  title: { absolute: "Deadlock Intelligence — Deadlock stats, heroes, items & builds" },
  description: "Search any Deadlock player for rank, matches and hero stats, plus live meta for heroes, items and builds.",
};

const hubs = [
  { tag: "01", name: "Heroes", href: "/heroes", text: "Win rates, pick rates and details for every hero." },
  { tag: "02", name: "Items", href: "/items", text: "Item win rates and how they perform in real matches." },
  { tag: "03", name: "Builds", href: "/builds", text: "The builds players actually run, ranked by results." },
  { tag: "04", name: "Matches", href: "/matches", text: "Browse recent matches and open full match details." },
  { tag: "05", name: "Leaderboards", href: "/leaderboards", text: "Top players by region and by hero." },
  { tag: "06", name: "Compare", href: "/compare", text: "Put two players side by side." },
];

export default function Home() {
  return (
    <AppShell active="Overview">
      <div className="content-inner">
        <section className="hero">
          <h1>
            Deadlock stats, <span>decoded.</span>
          </h1>
          <p className="hero-lede">Search any player for rank, matches and hero stats — plus live meta for heroes, items and builds.</p>
          <HeroSearch />
        </section>

        <nav className="hub-grid" aria-label="Explore">
          {hubs.map((hub) => (
            <Link key={hub.name} href={hub.href} className="hub-card">
              <em>{hub.tag}</em>
              <strong>{hub.name}</strong>
              <span>{hub.text}</span>
            </Link>
          ))}
        </nav>

        <GlobalAnalyticsPanel />

        <footer>
          DEADLOCK INTELLIGENCE <b>·</b> DATA WITH INTENT
        </footer>
      </div>
    </AppShell>
  );
}
