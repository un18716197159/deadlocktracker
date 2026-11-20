"use client";

import Link from "next/link";
import AppShell from "../components/app-shell";
import { L } from "../../lib/i18n/provider";

export default function BuildsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell active="Builds"><main className="content-inner builds-page"><p className="api-message error-message" role="alert"><L>Community builds are temporarily unavailable.</L></p><div className="items-footer-links"><button type="button" className="refresh-button" onClick={reset}><L>Try again</L></button><Link href="/items"><L>Browse items</L></Link></div></main></AppShell>;
}
