import "server-only";
import { parseAccountId } from "../validation";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const STEAM64_BASE = BigInt("76561197960265728");
export const STEAM_CALLBACK_PATH = "/api/auth/steam/callback";

/** Only allow same-site relative paths as post-login redirect targets. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export function steamLoginUrl(origin: string, next: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}${STEAM_CALLBACK_PATH}?next=${encodeURIComponent(safeNext(next))}`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID}?${params}`;
}

export function steamIdToAccountId(steamId: string): number | null {
  if (!/^\d{17}$/.test(steamId)) return null;
  return parseAccountId(String(BigInt(steamId) - STEAM64_BASE));
}

/**
 * Verifies the OpenID response Steam sent to our callback.
 * Returns the SteamID64 on success, null on any failure.
 */
export async function verifySteamLogin(callbackUrl: URL): Promise<string | null> {
  const query = callbackUrl.searchParams;
  if (query.get("openid.mode") !== "id_res") return null;
  if (query.get("openid.op_endpoint") !== STEAM_OPENID) return null;

  // The assertion must have been issued for *this* site's callback.
  const returnTo = query.get("openid.return_to");
  if (!returnTo) return null;
  let returnUrl: URL;
  try {
    returnUrl = new URL(returnTo);
  } catch {
    return null;
  }
  if (returnUrl.origin !== callbackUrl.origin || returnUrl.pathname !== STEAM_CALLBACK_PATH) return null;

  const match = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(query.get("openid.claimed_id") ?? "");
  if (!match) return null;

  // Ask Steam to confirm the signature.
  const body = new URLSearchParams();
  for (const [key, value] of query) if (key.startsWith("openid.")) body.set(key, value);
  body.set("openid.mode", "check_authentication");

  try {
    const response = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return /^is_valid:true$/m.test(text) ? match[1] : null;
  } catch {
    return null;
  }
}
