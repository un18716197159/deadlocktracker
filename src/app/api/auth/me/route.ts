import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";

/** Current signed-in user (or null). Never cached. */
export async function GET() {
  let user: { accountId: number } | null = null;
  try {
    const session = await readSession();
    if (session) user = { accountId: session.accountId };
  } catch {
    user = null;
  }
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
