/**
 * Current in-game item icons live in public/item-icons/<slug>.webp (see `npm run icons:sync`).
 * We no longer keep a list of which files exist (a stale list made icons silently fall back to the old
 * API glyphs); the <ItemArt> component falls back to the API image if a file is missing.
 */
export function slugifyItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Path of the current in-game icon for an item name. */
export function localItemIcon(name: string | null | undefined): string | null {
  if (!name) return null;
  const slug = slugifyItemName(name);
  return slug ? `/item-icons/${slug}.webp` : null;
}
