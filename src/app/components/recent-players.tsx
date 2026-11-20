"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useI18n } from "../../lib/i18n/provider";

type Recent = { id: number; name: string; avatar?: string };
const KEY = "dt_recent_players";

function parse(raw: string): Recent[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is Recent => entry && typeof entry.id === "number" && typeof entry.name === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function read(): Recent[] {
  return parse(readRaw());
}

/** Lets React read localStorage directly: "" on the server, the stored list in the browser, updated across tabs. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Remembers a visited profile in this browser (used by the home page's "Recent players"). */
export function RecordVisit({ id, name, avatar }: Recent) {
  useEffect(() => {
    try {
      const next = [{ id, name, avatar }, ...read().filter((entry) => entry.id !== id)].slice(0, 6);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, [id, name, avatar]);
  return null;
}

export default function RecentPlayers() {
  const { t } = useI18n();
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const players = useMemo(() => parse(raw), [raw]);
  if (!players.length) return null;
  return (
    <div className="recent-players">
      <span>{t("home.recent")}</span>
      {players.map((player) => (
        <Link key={player.id} href={`/players/${player.id}`} className="recent-chip">
          <i style={player.avatar ? { backgroundImage: `url("${player.avatar}")` } : undefined} />
          {player.name}
        </Link>
      ))}
    </div>
  );
}
