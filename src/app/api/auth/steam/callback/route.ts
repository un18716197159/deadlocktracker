import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/lib/auth/session";
import { safeNext, steamIdToAccountId, verifySteamLogin } from "@/lib/auth/steam";
import { getDb, schema } from "@/lib/db";

/** Steam sends the user back here. We verify the assertion, store the user and start a session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const failed = NextResponse.redirect(new URL("/?login=failed", url.origin));

  const steamId = await verifySteamLogin(url);
  const accountId = steamId ? steamIdToAccountId(steamId) : null;
  if (!steamId || accountId === null) return failed;

  // Signing in must keep working even if the database is briefly unavailable.
  try {
    await getDb()
      .insert(schema.users)
      .values({ steamId, accountId })
      .onConflictDoUpdate({ target: schema.users.steamId, set: { lastLoginAt: new Date() } });
  } catch (error) {
    console.error("Failed to save user", error);
  }

  try {
    await createSession({ steamId, accountId });
  } catch (error) {
    console.error("Failed to create session", error);
    return failed;
  }

  return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), url.origin));
}
