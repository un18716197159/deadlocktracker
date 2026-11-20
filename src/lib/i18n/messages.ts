import en, { type MessageKey } from "./en";
import ru from "./ru";
import uk from "./uk";
import es from "./es";
import pt from "./pt";
import de from "./de";
import fr from "./fr";
import tr from "./tr";
import pl from "./pl";
import zh from "./zh";
import ja from "./ja";
import ko from "./ko";

export type { MessageKey };
export const LOCALES = [
  { code: "en", name: "English" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "tr", name: "Türkçe" },
  { code: "pl", name: "Polski" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
] as const;
export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Partial<Record<MessageKey, string>>> = { en, ru, uk, es, pt, de, fr, tr, pl, zh, ja, ko };

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((locale) => locale.code === value);
}

/** Picks the first supported language from a browser language list such as ["pt-BR", "en"]. */
export function matchLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[locale][key] ?? en[key] ?? key;
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}
