"use client";

import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";
import AccountMenu from "./account-menu";

type NavigationItem = { name: string; href: string; icon: string };
const navigation: NavigationItem[] = [
  { name: "Overview", href: "/", icon: "overview" },
  { name: "Heroes", href: "/heroes", icon: "heroes" },
  { name: "Items", href: "/items", icon: "items" },
  { name: "Builds", href: "/builds", icon: "builds" },
  { name: "Matches", href: "/matches", icon: "matches" },
  { name: "Leaderboards", href: "/leaderboards", icon: "leaderboards" },
  { name: "Compare", href: "/compare", icon: "compare" },
];

function NavIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    overview: <><path d="M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z" /></>,
    heroes: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6" /></>,
    items: <><path d="m12 2 9 5v10l-9 5-9-5V7z" /><path d="m3.5 7.5 8.5 5 8.5-5M12 12.5V22" /></>,
    builds: <><path d="M4 5h16M4 12h16M4 19h10" /><circle cx="7" cy="5" r="2" /><circle cx="17" cy="12" r="2" /><circle cx="7" cy="19" r="2" /></>,
    matches: <><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h8" /></>,
    leaderboards: <><path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7" /></>,
    compare: <><path d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" {...common}>{paths[name] || paths.overview}</svg>;
}

function Navigation({ active, onNavigate }: { active: string; onNavigate?: () => void }) {
  return <nav className="sidebar-nav" aria-label="Main navigation">
    <p className="sidebar-section-label">INTELLIGENCE</p>
    {navigation.map(({ name, href, icon }) => {
      const selected = active === name || (name === "Overview" && active === "Dashboard");
      return <Link key={name} href={href} className="sidebar-link" aria-current={selected ? "page" : undefined} onClick={onNavigate}>
        <NavIcon name={icon} /><span>{name}</span>{selected && <i className="sidebar-link-indicator" />}
      </Link>;
    })}
  </nav>;
}

function SidebarContent({ active, onNavigate }: { active: string; onNavigate?: () => void }) {
  return <>
    <Link href="/" className="brand" aria-label="Deadlock Intelligence home" onClick={onNavigate}>
      <span className="brand-sigil" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 3 34 11v18L20 37 6 29V11z" /><path d="M13 12h7a8 8 0 0 1 0 16h-7zM20 12v16M24 12l-8 16" /></svg></span>
      <span className="brand-copy"><strong>DEADLOCK</strong><small>INTELLIGENCE</small></span>
    </Link>
    <Navigation active={active} onNavigate={onNavigate} />
    <div className="sidebar-bottom">
      <div className="sidebar-data-status"><span className="sidebar-status-dot" /><span><b>GAME DATA</b><small>Patch-based assets</small></span></div>
      <p className="sidebar-version">GOTHIC INTELLIGENCE <span>·</span> BETA</p>
    </div>
  </>;
}

export default function AppShell({ active, children }: { active: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-shell gothic-shell">
    {mobileOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside
      className={`sidebar desktop-sidebar${mobileOpen ? " is-open" : ""}`}
      id="primary-navigation"
      aria-label="Primary navigation"
    >
      <SidebarContent active={active} onNavigate={() => setMobileOpen(false)} />
    </aside>
    <div className="content">
      <header className="topbar gothic-topbar">
        <button className="mobile-menu-button" type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="primary-navigation" onClick={() => setMobileOpen((open) => !open)}>
          <span /><span /><span />
        </button>
        <div className="topbar-context"><span>DEADLOCK INTELLIGENCE</span><b>/</b><strong>{active === "Dashboard" ? "Overview" : active}</strong></div>
        <div className="topbar-account"><Suspense fallback={<div className="account-menu" aria-hidden="true" />}><AccountMenu /></Suspense></div>
      </header>
      <main className="content-page">{children}</main>
    </div>
  </div>;
}
