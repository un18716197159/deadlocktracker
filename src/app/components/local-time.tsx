"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "../../lib/i18n/provider";

// "Now" is read once in the browser (null on the server, so server and browser HTML match).
let browserNow = 0;
const readNow = () => (browserNow ||= Date.now());
const noSubscribe = () => () => {};

/** Time shown in the visitor's own time zone and language: "5 min ago" for recent, full date otherwise. */
export default function LocalTime({ seconds, mode = "relative" }: { seconds?: number | null; mode?: "relative" | "full" }) {
  const { locale } = useI18n();
  const now = useSyncExternalStore(noSubscribe, readNow, () => null);
  if (typeof seconds !== "number") return <span>—</span>;
  const date = new Date(seconds * 1000);
  const full = date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  if (mode === "full" || now === null) return <time dateTime={date.toISOString()} title={full} suppressHydrationWarning>{full}</time>;
  const diff = (seconds * 1000 - now) / 1000;
  const abs = Math.abs(diff);
  let text = full;
  if (abs < 172800) {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    text = abs < 3600 ? formatter.format(Math.round(diff / 60), "minute") : formatter.format(Math.round(diff / 3600), "hour");
  } else if (abs < 86400 * 30) {
    text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(diff / 86400), "day");
  }
  return <time dateTime={date.toISOString()} title={full} suppressHydrationWarning>{text}</time>;
}
