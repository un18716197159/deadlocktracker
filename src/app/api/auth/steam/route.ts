import { NextResponse, type NextRequest } from "next/server";
import { safeNext, steamLoginUrl } from "@/lib/auth/steam";

/** Starts the Steam OpenID login by redirecting to Steam. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return NextResponse.redirect(steamLoginUrl(url.origin, safeNext(url.searchParams.get("next"))));
}
