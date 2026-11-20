import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { getSteamProfiles } from "@/lib/deadlock-api";

/** Current signed-in user (or null) with Steam name and avatar when available. Never cached. */
export async function GET() {
  let user: { accountId: number; name?: string; avatar?: string } | null = null;
  try {
    const session = await readSession();
    if (session) {
      user = { accountId: session.accountId };
      try {
        const [profile] = await getSteamProfiles([session.accountId]);
        if (profile) user = { accountId: session.accountId, name: profile.personaname, avatar: profile.avatarfull || profile.avatar };
      } catch {
        /* profile is optional */
      }
    }
  } catch {
    user = null;
  }
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
