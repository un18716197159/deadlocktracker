"use client";

import Link from "next/link";
import AppShell from "../components/app-shell";
import { L } from "../../lib/i18n/provider";

export default function ItemsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell active="Items"><main className="content-inner items-page"><p className="api-message error-message" role="alert"><L>Deadlock item data could not be loaded.</L></p><div className="items-footer-links"><button type="button" className="refresh-button" onClick={reset}><L>Try again</L></button><Link href="/"><L>Overview</L></Link></div></main></AppShell>;
}
