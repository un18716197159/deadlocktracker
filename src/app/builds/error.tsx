"use client";

import Link from "next/link";
import AppShell from "../components/app-shell";

export default function BuildsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell active="Builds"><main className="content-inner builds-page"><p className="api-message error-message" role="alert">Community builds are temporarily unavailable.</p><div className="items-footer-links"><button type="button" className="refresh-button" onClick={reset}>Try again</button><Link href="/items">Browse items</Link></div></main></AppShell>;
}
