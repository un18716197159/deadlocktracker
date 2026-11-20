import { NextResponse, type NextRequest } from "next/server";
import { getAllItemAssets } from "@/lib/items-api";

/**
 * Local-only diagnostics for item icons (disabled in production).
 *   /api/debug/item                 -> which image fields the API returns, and how often
 *   /api/debug/item?name=Extra Spirit -> all image URLs for matching items
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = (request.nextUrl.searchParams.get("name") ?? "").trim().toLowerCase();
  const items = await getAllItemAssets();
  const imageEntries = (item: object) =>
    Object.entries(item).filter(([key, value]) => typeof value === "string" && (key.includes("image") || /^https?:\/\//.test(value)));

  if (!name) {
    const counts: Record<string, number> = {};
    for (const item of items) for (const [key] of imageEntries(item)) counts[key] = (counts[key] ?? 0) + 1;
    return NextResponse.json({ totalItems: items.length, imageFieldCounts: counts }, { headers: { "Cache-Control": "no-store" } });
  }

  const matches = items.filter((item) => item.name.toLowerCase().includes(name)).slice(0, 5);
  return NextResponse.json(
    matches.map((item) => ({ id: item.id, name: item.name, class_name: item.class_name, images: Object.fromEntries(imageEntries(item)) })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
