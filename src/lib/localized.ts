import { getHeroes, getHeroesIn, type HeroAsset } from "./deadlock-api";
import { getAllItemAssetsIn, getItemAssets, type ItemAsset } from "./items-api";
import { apiLanguage, getRequestLocale } from "./i18n/server";

/** Hero assets in the visitor's language (falls back to English). Call inside a Suspense boundary. */
export async function getLocalizedHeroes(): Promise<HeroAsset[]> {
  const language = apiLanguage(await getRequestLocale());
  if (language !== "english") {
    try {
      const localized = await getHeroesIn(language);
      if (localized.length) return localized;
    } catch {
      /* use English */
    }
  }
  return getHeroes();
}

/** Shop items in the visitor's language (falls back to English). */
export async function getLocalizedShopItems(): Promise<ItemAsset[]> {
  const language = apiLanguage(await getRequestLocale());
  if (language !== "english") {
    try {
      const localized = (await getAllItemAssetsIn(language)).filter((item) => item.type === "upgrade" && item.shopable === true);
      if (localized.length) return localized;
    } catch {
      /* use English */
    }
  }
  return getItemAssets();
}
