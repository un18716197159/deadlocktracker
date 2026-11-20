import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { T } from "../../lib/i18n/provider";
import LanguageSwitcher from "./language-switcher";
import LogoMark from "./logo-mark";
import AccountMenu from "./account-menu";

const navigation = [
  { name: "Heroes", key: "nav.heroes" as const, href: "/heroes" },
  { name: "Tier list", key: "nav.tier" as const, href: "/tier-list" },
  { name: "Items", key: "nav.items" as const, href: "/items" },
  { name: "Builds", key: "nav.builds" as const, href: "/builds" },
  { name: "Matches", key: "nav.matches" as const, href: "/matches" },
  { name: "Leaderboards", key: "nav.leaderboards" as const, href: "/leaderboards" },
  { name: "Compare", key: "nav.compare" as const, href: "/compare" },
];

export default function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="topnav-inner">
          <Link href="/" className="brand" aria-label="Deadlock Tracker home">
            <LogoMark />
            <span className="brand-name">DEADLOCK<b>TRACKER</b></span>
          </Link>
          <nav className="topnav-links" aria-label="Main navigation">
            {navigation.map(({ name, key, href }) => (
              <Link key={name} href={href} className="topnav-link" aria-current={active === name ? "page" : undefined}>
                <T k={key} />
              </Link>
            ))}
          </nav>
          <div className="topnav-spacer" />
          <LanguageSwitcher />
          {/* AccountMenu reads the URL (usePathname), so it must stream in after prerendering. */}
          <Suspense fallback={<div className="account-menu account-placeholder" aria-hidden="true" />}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <section className="content">
        {children}
      </section>
    </div>
  );
}
