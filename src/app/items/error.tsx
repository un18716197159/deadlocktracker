"use client";

import Link from "next/link";
import AppShell from "../components/app-shell";

export default function ItemsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell active="Items"><main className="content-inner items-page"><p className="api-message error-message" role="alert">Deadlock item data could not be loaded.</p><div className="items-footer-links"><button type="button" className="refresh-button" onClick={reset}>Try again</button><Link href="/">Overview</Link></div></main></AppShell>;
}
