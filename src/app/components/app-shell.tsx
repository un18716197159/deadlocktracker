import Link from "next/link";
import type { ReactNode } from "react";

type IconName = "overview" | "players" | "matches" | "heroes" | "items" | "builds" | "leaderboards";
type NavigationItem = { icon: IconName; name: string; href: string };

const navigation: NavigationItem[] = [
  { icon: "overview", name: "Overview", href: "/" },
  { icon: "players", name: "Players", href: "/#player-search" },
  { icon: "matches", name: "Matches", href: "/matches" },
  { icon: "heroes", name: "Heroes", href: "/heroes" },
  { icon: "items", name: "Items", href: "/items" },
];

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    players: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.7M18 14a5.8 5.8 0 0 1 3.5 5.3" /></>,
    matches: <><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h5M8 16h8" /></>,
    heroes: <><path d="m12 2 2.2 6.4L21 10l-5.5 3.8L16.8 21 12 17.2 7.2 21l1.3-7.2L3 10l6.8-1.6L12 2Z" /></>,
    items: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M8 12h8" /></>,
    builds: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="8" cy="7" r="1.5" /><circle cx="16" cy="12" r="1.5" /><circle cx="10" cy="17" r="1.5" /></>,
    leaderboards: <><path d="M4 19h16M6 16V9h4v7M14 16V5h4v11" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><div className="brand-mark">D<span aria-hidden="true">·</span>I</div><div><strong>DEADLOCK</strong><small>INTELLIGENCE</small></div></Link>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navigation.map(({ icon, name, href }) => <Link key={name} href={href} className={`nav-item ${active === name ? "active" : ""}`}><NavIcon name={icon} />{name}{name === "Overview" && <span className="nav-live">LIVE</span>}</Link>)}
        <span className="nav-item nav-disabled"><NavIcon name="builds" />Builds</span>
        <span className="nav-item nav-disabled"><NavIcon name="leaderboards" />Leaderboards</span>
      </nav>
      <div className="sidebar-bottom"><div className="patch-card"><i className="status-dot" />CURRENT PATCH <b>LIVE</b></div><div className="profile-chip"><span className="avatar">N</span><span><strong>Nazar</strong><small>Explorer</small></span></div></div>
    </aside>
    <section className="content"><header className="topbar"><div className="breadcrumb">ANALYTICS <b>/</b> {active.toUpperCase()}</div><span className="api-status"><i /> DEADLOCK API: <b>LIVE DATA</b></span></header>{children}</section>
  </div>;
}

