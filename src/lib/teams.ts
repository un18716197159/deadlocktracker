/** In-game side names. Match data uses team 0 / team 1. */
export const TEAMS = [
  { name: "The Hidden King", faction: "Amber Hand", color: "#f0b254" },
  { name: "The Archmother", faction: "Sapphire Flame", color: "#6fb5ff" },
] as const;

export function teamName(team: number | undefined | null): string {
  return team === 0 || team === 1 ? TEAMS[team].name : "—";
}
