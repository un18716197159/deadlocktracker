"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroAsset, LeaderboardPlayer, LeaderboardRegion, RankedSeasonAsset } from "../../lib/deadlock-api";
import RankBadge from "../components/rank-badge";
import { useI18n } from "../../lib/i18n/provider";

type Props = { heroes: HeroAsset[]; seasons: RankedSeasonAsset[]; assetsUnavailable: boolean };
type Payload = { players: LeaderboardPlayer[]; region: string; apiLimit: number; error?: string };
const regions: Array<{ value: LeaderboardRegion; label: string }> = [
  { value: "Europe", label: "Europe" }, { value: "Asia", label: "Asia" }, { value: "NAmerica", label: "North America" }, { value: "SAmerica", label: "South America" }, { value: "Oceania", label: "Oceania" },
];

export default function Leaderboards({ heroes, seasons, assetsUnavailable }: Props) {
  const { t } = useI18n();
  const [region, setRegion] = useState<LeaderboardRegion>("Europe");
  const [heroId, setHeroId] = useState("all");
  const [season, setSeason] = useState("current");
  const [period, setPeriod] = useState("30d");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("place");
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedInterval = season === "current" ? undefined : seasons.flatMap((entry) => entry.intervals.map((interval) => ({ ...interval, seasonName: entry.name }))).find((interval) => interval.leaderboard_id === Number(season));
  const selectedLeaderboardId = selectedInterval?.leaderboard_id;

  useEffect(() => {
    const params = new URLSearchParams({ region, period });
    if (heroId !== "all") params.set("heroId", heroId);
    if (selectedLeaderboardId !== undefined) params.set("leaderboardId", String(selectedLeaderboardId));
    const controller = new AbortController();
    fetch(`/api/leaderboards?${params}`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load leaderboard."); return data as Payload; })
      .then(setPayload)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load leaderboard."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [region, heroId, season, period, selectedLeaderboardId]);

  const term = search.trim().toLocaleLowerCase();
  const visiblePlayers = (payload?.players ?? []).filter((player) => !term || player.name.toLocaleLowerCase().includes(term));
  const metric = (player: LeaderboardPlayer) => {
    if (sort === "winrate") return player.stats?.winRate ?? null;
    if (sort === "matches") return player.stats?.matches ?? null;
    if (sort === "kills") return player.stats?.kills ?? null;
    return player.place;
  };
  visiblePlayers.sort((left, right) => sort === "name" ? left.name.localeCompare(right.name) : sort === "place" ? left.place - right.place : (metric(right) ?? -1) - (metric(left) ?? -1));

  const pageSize = 25;
  const pageCount = Math.ceil(visiblePlayers.length / pageSize);
  const pageRows = visiblePlayers.slice(page * pageSize, (page + 1) * pageSize);
  const refreshFilter = (update: () => void) => { setLoading(true); setError(""); setPage(0); update(); };
  const format = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? Math.round(value).toLocaleString() : "—";
  const percent = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
  const heroName = (id: number) => heroes.find((hero) => hero.id === id)?.name || `Hero ${id}`;

  return <main className="content-inner leaderboard-page">
    <div className="page-heading"><div><h1>{t("lb.title")}</h1><p className="muted">{t("lb.subtitle")}</p></div><Link className="refresh-button" href="/compare">{t("nav.compare")} ↗</Link></div>
    <div className="leaderboard-filters">
      <label><span>{t("lb.region")}</span><select value={region} onChange={(event) => refreshFilter(() => setRegion(event.target.value as LeaderboardRegion))}>{regions.map((entry) => <option value={entry.value} key={entry.value}>{entry.label}</option>)}</select></label>
      <label><span>{t("lb.hero")}</span><select value={heroId} onChange={(event) => refreshFilter(() => setHeroId(event.target.value))}><option value="all">{t("lb.allHeroes")}</option>{heroes.map((hero) => typeof hero.id === "number" ? <option value={hero.id} key={hero.id}>{hero.name || `Hero ${hero.id}`}</option> : null)}</select></label>
      <label><span>SEASON / INTERVAL</span><select value={season} onChange={(event) => refreshFilter(() => setSeason(event.target.value))}><option value="current">Current leaderboard</option>{seasons.flatMap((entry) => entry.intervals.map((interval) => <option value={interval.leaderboard_id} key={`${entry.class_name}-${interval.leaderboard_id}`}>{entry.name} · Interval {interval.interval}</option>))}</select></label>
      <label><span>{t("lb.window")}</span><select value={period} onChange={(event) => refreshFilter(() => setPeriod(event.target.value))}><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All available</option></select></label>
      <label className="leaderboard-search"><span>{t("lb.search")}</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder={t("lb.searchPlaceholder")} /></label>
      <label><span>{t("lb.sort")}</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }}><option value="place">Leaderboard place</option><option value="winrate">Win rate</option><option value="matches">Matches</option><option value="kills">Avg kills</option><option value="name">Player name</option></select></label>
    </div>
    {selectedInterval && <p className="leaderboard-note">Season interval: {new Date(selectedInterval.start_timestamp * 1000).toLocaleDateString()} – {new Date(selectedInterval.end_timestamp * 1000).toLocaleDateString()}. The API ranks are returned directly for this interval.</p>}
    {assetsUnavailable && <p className="api-message error-message" role="status">Hero or ranked-season metadata is unavailable; the current regional leaderboard can still be loaded.</p>}
    <p className="leaderboard-note">The API supplies up to {payload?.apiLimit ?? 1000} entries for each selected leaderboard; pagination below moves through that returned list. Player statistics are global normal ranked and unranked data for {period === "all" ? "all available history" : `the last ${period === "30d" ? "30" : "90"} days`}, not region-scoped. The rank badge is each player&apos;s latest rank; the place comes from the selected leaderboard season. Some rows have no extra statistics because the API cannot unambiguously map their name to one account.</p>
    {loading && <div className="leaderboard-skeleton" role="status" aria-label="Loading leaderboard" aria-busy="true">{[0, 1, 2, 3, 4, 5, 6].map((row) => <div key={row} />)}</div>}
    {error && <p className="api-message error-message" role="alert">Leaderboard unavailable. {error}</p>}
    {!loading && !error && payload && <>
      <div className="leaderboard-summary"><span>{visiblePlayers.length.toLocaleString()} players returned by API</span><span>{regions.find((entry) => entry.value === region)?.label}{heroId !== "all" ? ` · ${heroName(Number(heroId))}` : " · All heroes"}</span></div>
      {pageRows.length ? <div className="leaderboard-table-wrap"><div className="leaderboard-table"><div className="leaderboard-table-head"><span>{t("lb.place")}</span><span>{t("lb.player")}</span><span>{t("lb.rank")}</span><span>{t("lb.matches")}</span><span>{t("lb.wl")}</span><span>{t("lb.winRate")}</span><span>{t("lb.kda")}</span><span>{t("lb.topHeroes")}</span></div>
        {pageRows.map((player, index) => <div className={`leaderboard-row ${player.place <= 3 ? `leaderboard-top-${player.place}` : ""}`} key={`${player.place}-${player.name}-${index}`}>
          <strong className="leaderboard-place">#{player.place}</strong>
          <span className="leaderboard-player-cell">{player.accountId !== null ? <Link href={`/players/${player.accountId}`} className="leaderboard-player"><span className="leaderboard-avatar" aria-hidden="true" style={player.avatar ? { backgroundImage: `url("${player.avatar}")` } : undefined}>{!player.avatar && player.name.slice(0, 1)}</span><b>{player.name}</b></Link> : <span className="leaderboard-player"><span className="leaderboard-avatar" aria-hidden="true">{player.name.slice(0, 1)}</span><b>{player.name}</b></span>}</span>
          <span className="leaderboard-rank-cell">{player.rankTier !== null && player.rankTier !== undefined ? <RankBadge tier={player.rankTier} subrank={player.rankSubrank} name={player.rank} image={player.rankImage} size="sm" /> : null}<span>{player.rank || "—"}</span></span><span>{format(player.stats?.matches)}</span><span>{player.stats?.wins === null || player.stats?.wins === undefined ? "—" : `${format(player.stats.wins)} / ${format(player.stats.losses)}`}</span><span>{percent(player.stats?.winRate)}</span><span>{player.stats ? [player.stats.kills, player.stats.deaths, player.stats.assists].map((value) => value === null ? "—" : value.toFixed(1)).join(" / ") : "—"}</span>
          <span className="leaderboard-top-heroes">{player.topHeroIds.length ? player.topHeroIds.slice(0, 3).map((id) => <Link href={`/heroes/${id}`} title={heroName(id)} key={id}>{heroName(id)}</Link>) : "—"}</span>
        </div>)}
      </div></div> : <p className="api-message">No leaderboard entries match this search.</p>}
      {pageCount > 1 && <div className="leaderboard-pagination"><button type="button" className="refresh-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>{t("lb.prev")}</button><span>{t("lb.page", { n: page + 1, total: pageCount })}</span><button type="button" className="refresh-button" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>{t("lb.next")}</button></div>}
    </>}
    <footer>DEADLOCK INTELLIGENCE · LEADERBOARDS</footer>
  </main>;
}
