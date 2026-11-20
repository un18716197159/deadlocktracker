import { localItemIcon } from "./item-icons";

export type HeroAssetLike = {
  images?: {
    icon_image_small_webp?: string | null;
    icon_image_small?: string | null;
    icon_hero_card_webp?: string | null;
    icon_hero_card?: string | null;
    background_image_webp?: string | null;
    background_image?: string | null;
  } | null;
};

export type ItemAssetLike = { name?: string | null; image_webp?: string | null; image?: string | null; disabled?: boolean | null };
export type RankAssetLike = { images?: Record<string, string | null> };

function firstAsset(...values: Array<string | null | undefined>) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

export function heroPortrait(hero: HeroAssetLike) {
  return firstAsset(hero.images?.icon_image_small_webp, hero.images?.icon_image_small);
}

export function heroCardImage(hero: HeroAssetLike) {
  return firstAsset(hero.images?.icon_hero_card_webp, hero.images?.icon_hero_card, heroPortrait(hero));
}

export function heroBackground(hero: HeroAssetLike) {
  return firstAsset(hero.images?.background_image_webp, hero.images?.background_image, heroCardImage(hero));
}

/**
 * Prefers the current in-game icon we host ourselves; falls back to the Deadlock API image.
 * Items removed from the game (disabled) have no local icon, so they use the API image directly
 * instead of requesting a file that does not exist (old community builds still list them).
 */
export function itemImage(item: ItemAssetLike) {
  if (item.disabled === true) return firstAsset(item.image_webp, item.image);
  return localItemIcon(item.name) ?? firstAsset(item.image_webp, item.image);
}

/** True for the painted in-game icons (as opposed to the old white glyph silhouettes). */
export function isColorItemIcon(src: string | null | undefined) {
  return typeof src === "string" && src.startsWith("/item-icons/");
}

export function rankImage(rank: RankAssetLike | undefined, size: "small" | "large" = "small") {
  return firstAsset(
    rank?.images?.[`${size}_webp`],
    rank?.images?.[size],
    rank?.images?.large_webp,
    rank?.images?.large,
  );
}
