import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import AccountMenu from "./account-menu";

const navigation = [
  { name: "Heroes", href: "/heroes" },
  { name: "Items", href: "/items" },
  { name: "Builds", href: "/builds" },
  { name: "Matches", href: "/matches" },
  { name: "Leaderboards", href: "/leaderboards" },
  { name: "Compare", href: "/compare" },
];

export default function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-inner">
          <Link href="/" className="brand" aria-label="Deadlock Intelligence home">
            <div className="brand-mark">
              <span>D</span>
              <i />
              <span>I</span>
            </div>
            <div>
              <strong>DEADLOCK</strong>
              <small>INTELLIGENCE</small>
            </div>
          </Link>
          <nav className="topnav-links" aria-label="Main navigation">
            {navigation.map(({ name, href }) => (
              <Link key={name} href={href} className="topnav-link" aria-current={active === name ? "page" : undefined}>
                {name}
              </Link>
            ))}
          </nav>
          <div className="topnav-spacer" />
          <Suspense fallback={<div className="account-menu" aria-hidden="true" />}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <section className="content">{children}</section>
    </div>
  );
}
