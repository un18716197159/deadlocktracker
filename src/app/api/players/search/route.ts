import { NextRequest, NextResponse } from "next/server";
import { DeadlockApiError, searchPlayers } from "@/lib/deadlock-api";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: "Enter between 2 and 100 characters." }, { status: 400 });
  }

  try {
    return NextResponse.json({ players: await searchPlayers(query) });
  } catch (error) {
    const failure = error instanceof DeadlockApiError ? error : new DeadlockApiError("Player search failed.", 502);
    return NextResponse.json({ error: failure.message, retryAfter: failure.retryAfter }, { status: failure.status });
  }
}
