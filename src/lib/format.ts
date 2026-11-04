export function average(values: Array<number | undefined>): number | null {
  const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}

export function formatNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
}

export function formatDate(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toLocaleString() : "—";
}

export function formatDuration(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`
    : "—";
}
