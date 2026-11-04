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

export type ItemAssetLike = { image_webp?: string | null; image?: string | null };
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

export function itemImage(item: ItemAssetLike) {
  return firstAsset(item.image_webp, item.image);
}

export function rankImage(rank: RankAssetLike | undefined, size: "small" | "large" = "small") {
  return firstAsset(
    rank?.images?.[`${size}_webp`],
    rank?.images?.[size],
    rank?.images?.large_webp,
    rank?.images?.large,
  );
}
