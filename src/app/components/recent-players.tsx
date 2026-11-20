"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";

type Recent = { id: number; name: string; avatar?: string };
const KEY = "dt_recent_players";

function read(): Recent[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is Recent => entry && typeof entry.id === "number" && typeof entry.name === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
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
  const [players, setPlayers] = useState<Recent[]>([]);
  useEffect(() => { setPlayers(read()); }, []);
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
