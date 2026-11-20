import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { readSession } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { parseAccountId } from "@/lib/validation";

const headers = { "Cache-Control": "no-store" };
const MAX_FAVORITES = 50;

async function owner() {
  try {
    return (await readSession())?.accountId ?? null;
  } catch {
    return null;
  }
}

/** The signed-in user's saved players. Guests get an empty list (not a 401), so pages log no errors. */
export async function GET() {
  const me = await owner();
  if (me === null) return NextResponse.json({ signedIn: false, favorites: [] }, { headers });
  try {
    const rows = await getDb().select().from(schema.favorites).where(eq(schema.favorites.ownerAccountId, me)).orderBy(desc(schema.favorites.createdAt));
    return NextResponse.json({ favorites: rows.map((row) => ({ accountId: row.playerAccountId, name: row.name, avatar: row.avatar })) }, { headers });
  } catch {
    return NextResponse.json({ error: "Favorites are unavailable." }, { status: 503, headers });
  }
}

/** Save a player: { accountId, name, avatar? } */
export async function POST(request: NextRequest) {
  const me = await owner();
  if (me === null) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  const body = (await request.json().catch(() => null)) as { accountId?: unknown; name?: unknown; avatar?: unknown } | null;
  const accountId = parseAccountId(String(body?.accountId ?? ""));
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  const avatar = typeof body?.avatar === "string" && /^https:\/\//.test(body.avatar) ? body.avatar.slice(0, 500) : null;
  if (accountId === null || !name) return NextResponse.json({ error: "Invalid player." }, { status: 400, headers });
  try {
    const db = getDb();
    const existing = await db.select({ id: schema.favorites.id }).from(schema.favorites).where(eq(schema.favorites.ownerAccountId, me));
    if (existing.length >= MAX_FAVORITES) return NextResponse.json({ error: "Favorite limit reached." }, { status: 409, headers });
    await db.insert(schema.favorites).values({ ownerAccountId: me, playerAccountId: accountId, name, avatar }).onConflictDoNothing();
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "Favorites are unavailable." }, { status: 503, headers });
  }
}

/** Remove a saved player: DELETE /api/favorites?accountId=123 */
export async function DELETE(request: NextRequest) {
  const me = await owner();
  if (me === null) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  const accountId = parseAccountId(request.nextUrl.searchParams.get("accountId"));
  if (accountId === null) return NextResponse.json({ error: "Invalid player." }, { status: 400, headers });
  try {
    await getDb().delete(schema.favorites).where(and(eq(schema.favorites.ownerAccountId, me), eq(schema.favorites.playerAccountId, accountId)));
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "Favorites are unavailable." }, { status: 503, headers });
  }
}
