import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./messages";

/** Language names accepted by the Deadlock API asset endpoints (Steam-style names). */
const API_LANGUAGE: Record<Locale, string> = {
  en: "english", ru: "russian", uk: "ukrainian", es: "spanish", pt: "brazilian", de: "german",
  fr: "french", tr: "turkish", pl: "polish", zh: "schinese", ja: "japanese", ko: "koreana",
};

/** Visitor language from the dt_lang cookie (set by the language switcher). Call inside a Suspense boundary. */
export async function getRequestLocale(): Promise<Locale> {
  try {
    const value = (await cookies()).get("dt_lang")?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function apiLanguage(locale: Locale): string {
  return API_LANGUAGE[locale];
}
