import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AppShell from "./components/app-shell";
import HeroSearch from "./components/hero-search";
import RecentPlayers from "./components/recent-players";
import { FavoritePlayers } from "./components/favorites";
import MetaSnapshot from "./components/meta-snapshot";
import { T } from "../lib/i18n/provider";
import "./home.css";

export const metadata: Metadata = {
  title: { absolute: "Deadlock Tracker — Deadlock stats, heroes, items & builds" },
  description: "Search any Deadlock player for rank, matches and hero stats, plus live meta for heroes, items and builds.",
};

const hubs = [
  { tag: "01", name: "Heroes", href: "/heroes", key: "heroes" as const },
  { tag: "02", name: "Items", href: "/items", key: "items" as const },
  { tag: "03", name: "Builds", href: "/builds", key: "builds" as const },
  { tag: "04", name: "Matches", href: "/matches", key: "matches" as const },
  { tag: "05", name: "Leaderboards", href: "/leaderboards", key: "leaderboards" as const },
  { tag: "06", name: "Compare", href: "/compare", key: "compare" as const },
];

export default function Home() {
  return (
    <AppShell active="Overview">
      <div className="content-inner">
        <section className="hero">
          <h1><T k="home.title" /></h1>
          <p className="hero-lede"><T k="home.lede" /></p>
          <HeroSearch />
          <FavoritePlayers />
          <RecentPlayers />
        </section>

        <nav className="hub-grid" aria-label="Explore">
          {hubs.map((hub) => (
            <Link key={hub.name} href={hub.href} className="hub-card">
              <em>{hub.tag}</em>
              <strong><T k={`nav.${hub.key}`} /></strong>
              <span><T k={`home.hub.${hub.key}`} /></span>
            </Link>
          ))}
        </nav>

        <Suspense fallback={null}><MetaSnapshot /></Suspense>

      </div>
    </AppShell>
  );
}
