/** Parses a Deadlock/Steam32 account id from user input. Returns null if invalid. */
export function parseAccountId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= 0 && id <= 2_147_483_647 ? id : null;
}
