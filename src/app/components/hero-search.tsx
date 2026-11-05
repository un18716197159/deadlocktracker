"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import "./hero-search.css";

type Player = { account_id?: number; personaname?: string; avatar?: string; matches_played_last_30d?: number };
type Status = "idle" | "loading" | "done" | "error";

export default function HeroSearch() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length >= 2) {
      setStatus("loading");
      setError("");
    } else {
      setPlayers([]);
      setStatus("idle");
      setError("");
    }
  }

  // Live search, debounced.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/players/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Player search failed.");
          return data;
        })
        .then((data) => {
          const found: Player[] = Array.isArray(data.players) ? data.players : [];
          setPlayers(found.filter((player) => typeof player.account_id === "number").slice(0, 8));
          setStatus("done");
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : "Player search failed.");
          setStatus("error");
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Ctrl/Cmd+K focuses the search box.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (/^\d{3,10}$/.test(term)) {
      router.push(`/players/${term}`);
      return;
    }
    const first = players[0];
    if (first && typeof first.account_id === "number") router.push(`/players/${first.account_id}`);
  }

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="hero-search" id="player-search">
      <form onSubmit={onSubmit} role="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          ref={input}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a Steam name or account ID…"
          aria-label="Search a Steam name or account ID"
          autoComplete="off"
        />
        <kbd>Ctrl K</kbd>
        <button type="submit">Search</button>
      </form>
      {showPanel && (
        <div className="hero-results" role="listbox" aria-label="Player search results">
          {status === "loading" && <p className="hero-results-note">Searching…</p>}
          {status === "error" && <p className="hero-results-note">{error}</p>}
          {status === "done" && players.length === 0 && <p className="hero-results-note">No players found. Try another name or account ID.</p>}
          {status === "done" &&
            players.map((player) => (
              <Link key={player.account_id} className="hero-result" href={`/players/${player.account_id}`} role="option" aria-selected={false}>
                <span className="hero-result-avatar" aria-hidden="true" style={player.avatar ? { backgroundImage: `url("${player.avatar}")` } : undefined}>
                  {player.avatar ? null : (player.personaname?.slice(0, 1) ?? "?")}
                </span>
                <span>
                  <strong>{player.personaname || "Unknown Steam player"}</strong>
                  <small>
                    Account ID {player.account_id}
                    {typeof player.matches_played_last_30d === "number" ? ` · ${player.matches_played_last_30d} matches in 30 days` : ""}
                  </small>
                </span>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
