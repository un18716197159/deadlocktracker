import { redirect } from "next/navigation";
import { connection } from "next/server";
import AppShell from "../components/app-shell";
import { getHeroes, getMatchList, type MatchListFilters } from "../../lib/deadlock-api";
import MatchExplorer from "./match-explorer";

export const metadata = { title: "Match Explorer | Deadlock Intelligence" };

type Search = {
  match_id?: string | string[];
  hero_id?: string | string[];
  period?: string | string[];
  duration?: string | string[];
  game_mode?: string | string[];
  match_mode?: string | string[];
  sort?: string | string[];
  cursor?: string | string[];
};
type Props = { searchParams: Promise<Search> };
const PAGE_SIZE = 20;
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] : input;

function validMatchId(input: string) {
  return /^\d{1,19}$/.test(input) && (input.length < 19 || input <= "9223372036854775807");
}

export default async function MatchesPage({ searchParams }: Props) {
  await connection();
  const search = await searchParams;
  const requestedId = value(search.match_id)?.trim();
  if (requestedId && validMatchId(requestedId)) redirect(`/matches/${requestedId}`);

  const heroRaw = value(search.hero_id);
  const heroId = heroRaw && /^\d{1,10}$/.test(heroRaw) ? Number(heroRaw) : undefined;
  const periodRaw = value(search.period);
  const period: "1d" | "7d" | "30d" | "90d" | "all" = periodRaw === "1d" || periodRaw === "30d" || periodRaw === "90d" || periodRaw === "all" ? periodRaw : "7d";
  const durationRaw = value(search.duration);
  const duration: "all" | "short" | "medium" | "long" = durationRaw === "short" || durationRaw === "medium" || durationRaw === "long" ? durationRaw : "all";
  const gameModeRaw = value(search.game_mode);
  const gameMode: "all" | "normal" | "street_brawl" = gameModeRaw === "normal" || gameModeRaw === "street_brawl" ? gameModeRaw : "all";
  const matchModeRaw = value(search.match_mode);
  const matchMode: "all" | "ranked" | "unranked" | "ranked,unranked" = matchModeRaw === "ranked" || matchModeRaw === "unranked" || matchModeRaw === "ranked,unranked" ? matchModeRaw : "all";
  const direction = value(search.sort) === "oldest" ? "asc" : "desc";
  const cursorRaw = value(search.cursor);
  const cursorValue = cursorRaw && /^\d{1,19}$/.test(cursorRaw) ? Number(cursorRaw) : undefined;
  const cursor = cursorValue !== undefined && Number.isSafeInteger(cursorValue) ? cursorValue : undefined;
  const durationRanges: Record<string, { minDurationS?: number; maxDurationS?: number }> = {
    short: { maxDurationS: 900 }, medium: { minDurationS: 901, maxDurationS: 1800 }, long: { minDurationS: 1801, maxDurationS: 7000 },
  };
  const periodDays = period === "all" ? undefined : period === "1d" ? 1 : Number(period.slice(0, -1));
  const filters: MatchListFilters = {
    heroId,
    periodDays,
    ...durationRanges[duration],
    gameMode: gameMode === "all" ? undefined : gameMode,
    matchMode: matchMode === "all" ? undefined : matchMode,
    direction,
    cursor,
    limit: PAGE_SIZE,
  };
  const [matchResult, heroResult] = await Promise.allSettled([getMatchList(filters), getHeroes()]);
  const rows = matchResult.status === "fulfilled" ? matchResult.value : [];
  const heroes = heroResult.status === "fulfilled" ? heroResult.value.filter((hero) => Number.isInteger(hero.id) && typeof hero.name === "string") : [];
  const hasMore = rows.length === PAGE_SIZE;
  const lastId = rows.at(-1)?.match_id;
  const nextCursor = hasMore && lastId !== undefined ? direction === "desc" ? lastId - 1 : lastId + 1 : undefined;
  const filtersForUi = { heroId: heroRaw ?? "all", period, duration, gameMode, matchMode, sort: direction === "desc" ? "newest" : "oldest" };
  const nextSearch = new URLSearchParams();
  if (heroRaw && heroId !== undefined) nextSearch.set("hero_id", String(heroId));
  if (period !== "7d") nextSearch.set("period", period);
  if (duration !== "all") nextSearch.set("duration", duration);
  if (gameMode !== "all") nextSearch.set("game_mode", gameMode);
  if (matchMode !== "all") nextSearch.set("match_mode", matchMode);
  if (direction === "asc") nextSearch.set("sort", "oldest");
  if (nextCursor !== undefined) nextSearch.set("cursor", String(nextCursor));
  const nextHref = nextCursor === undefined ? undefined : `/matches?${nextSearch.toString()}`;
  const matchError = matchResult.status === "rejected" ? matchResult.reason instanceof Error ? matchResult.reason.message : "Deadlock API could not load matches." : undefined;

  return <AppShell active="Matches"><MatchExplorer rows={rows} heroes={heroes} filters={filtersForUi} matchError={matchError} invalidMatchId={Boolean(requestedId && !validMatchId(requestedId))} nextHref={nextHref} /></AppShell>;
}
