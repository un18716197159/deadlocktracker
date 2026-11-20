"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";

type Favorite = { accountId: number; name: string; avatar?: string | null };
type State = { status: "loading" } | { status: "anon" } | { status: "error" } | { status: "ready"; favorites: Favorite[] };

function useFavorites() {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    fetch("/api/favorites", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return { status: "anon" } as State;
        if (!response.ok) return { status: "error" } as State;
        const data = await response.json();
        if (data.signedIn === false) return { status: "anon" } as State;
        return { status: "ready", favorites: Array.isArray(data.favorites) ? data.favorites : [] } as State;
      })
      .catch(() => ({ status: "error" }) as State)
      .then((next) => { if (alive) setState(next); });
    return () => { alive = false; };
  }, []);
  return [state, setState] as const;
}

/** Star button on a player profile: save / remove this player. */
export function FavoriteButton({ accountId, name, avatar }: { accountId: number; name: string; avatar?: string }) {
  const { t } = useI18n();
  const [state, setState] = useFavorites();
  const [busy, setBusy] = useState(false);
  if (state.status === "loading" || state.status === "error") return null;
  if (state.status === "anon") return <a className="fav-button" href={`/api/auth/steam?next=${encodeURIComponent(`/players/${accountId}`)}`}>☆ {t("fav.signIn")}</a>;
  const saved = state.favorites.some((favorite) => favorite.accountId === accountId);
  async function toggle() {
    if (state.status !== "ready") return;
    setBusy(true);
    try {
      const response = saved
        ? await fetch(`/api/favorites?accountId=${accountId}`, { method: "DELETE" })
        : await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, name, avatar }) });
      if (response.ok) {
        setState({ status: "ready", favorites: saved ? state.favorites.filter((favorite) => favorite.accountId !== accountId) : [{ accountId, name, avatar }, ...state.favorites] });
      }
    } finally {
      setBusy(false);
    }
  }
  return <button type="button" className="fav-button" data-saved={saved} disabled={busy} onClick={toggle}>{saved ? "★" : "☆"} {saved ? t("fav.saved") : t("fav.add")}</button>;
}

/** Home-page chips with the signed-in user's saved players. */
export function FavoritePlayers() {
  const { t } = useI18n();
  const [state] = useFavorites();
  if (state.status !== "ready" || !state.favorites.length) return null;
  return (
    <div className="recent-players">
      <span>★ {t("home.favorites")}</span>
      {state.favorites.slice(0, 8).map((favorite) => (
        <Link key={favorite.accountId} href={`/players/${favorite.accountId}`} className="recent-chip">
          <i style={favorite.avatar ? { backgroundImage: `url("${favorite.avatar}")` } : undefined} />
          {favorite.name}
        </Link>
      ))}
    </div>
  );
}
