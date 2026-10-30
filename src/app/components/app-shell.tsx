import Link from "next/link";
import type { ReactNode } from "react";

type IconName = "overview" | "players" | "matches" | "heroes" | "items" | "builds" | "leaderboards" | "compare";
type NavigationItem = { icon: IconName; name: string; href: string };

const navigation: NavigationItem[] = [
  { icon: "overview", name: "Overview", href: "/" },
  { icon: "players", name: "Players", href: "/#player-search" },
  { icon: "matches", name: "Matches", href: "/matches" },
  { icon: "heroes", name: "Heroes", href: "/heroes" },
  { icon: "items", name: "Items", href: "/items" },
  { icon: "builds", name: "Builds", href: "/builds" },
  { icon: "leaderboards", name: "Leaderboards", href: "/leaderboards" },
  { icon: "compare", name: "Compare", href: "/compare" },
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
    compare: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M2 20a6 6 0 0 1 12 0M12 20a5 5 0 0 1 10 0M12 11l1.5 2L12 15" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AppShell({ active, children }: { active: string; children: ReactNode }) {
  const primary = navigation.slice(0, 2);
  const analysis = navigation.slice(2);
  const links = (items: NavigationItem[], className = "") => items.map(({ icon, name, href }) => <Link key={name} href={href} aria-current={active === name ? "page" : undefined} aria-label={name} title={name} className={`nav-item ${active === name ? "active" : ""} ${className}`}><NavIcon name={icon} /><span>{name}</span></Link>);
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Deadlock Intelligence home"><div className="brand-mark"><span>D</span><i /><span>I</span></div><div><strong>DEADLOCK</strong><small>INTELLIGENCE</small></div></Link>
      <nav className="nav-list" aria-label="Main navigation">
        <div className="nav-group"><p className="workspace-label">DISCOVER</p>{links(primary)}</div>
        <div className="nav-group"><p className="workspace-label">INTELLIGENCE</p>{links(analysis)}</div>
      </nav>
      <div className="sidebar-bottom"><div className="source-card"><span className="source-mark" aria-hidden="true"><i /></span><span><small>DATA SOURCE</small><strong>Deadlock API</strong></span></div><div className="sidebar-footnote">MATCH INTELLIGENCE<br />BUILT FOR THE STREET</div></div>
    </aside>
    <section className="content"><header className="topbar"><div className="breadcrumb"><span>DEADLOCK INTELLIGENCE</span><b>/</b>{active.toUpperCase()}</div><div className="topbar-meta"><span className="api-status"><i /> DATA VIA <b>DEADLOCK API</b></span></div></header>{children}</section>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(({ icon, name, href }) => <Link key={name} href={href} aria-current={active === name ? "page" : undefined} aria-label={name} title={name} className={`mobile-nav-item ${active === name ? "active" : ""}`}><NavIcon name={icon} /><span>{name}</span></Link>)}</nav>
  </div>;
}

