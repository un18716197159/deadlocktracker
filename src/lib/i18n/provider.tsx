"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, matchLocale, translate, type Locale, type MessageKey } from "./messages";

type Vars = Record<string, string | number>;
type Context = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey, vars?: Vars) => string };
const I18nContext = createContext<Context>({ locale: DEFAULT_LOCALE, setLocale: () => undefined, t: (key, vars) => translate(DEFAULT_LOCALE, key, vars) });
const STORAGE_KEY = "dt_lang";
function writeCookie(value: Locale) {
  try {
    document.cookie = `dt_lang=${value}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* cookies can be blocked */
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start in English so server HTML and first client render match; switch after mount.
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let next: Locale = DEFAULT_LOCALE;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      next = isLocale(stored) ? stored : matchLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
    } catch {
      next = matchLocale([navigator.language]);
    }
    setLocaleState(next);
    const hadCookie = document.cookie.includes("dt_lang=");
    writeCookie(next);
    if (!hadCookie && next !== DEFAULT_LOCALE) router.refresh(); // first visit: re-render server text in the detected language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
    writeCookie(value);
    router.refresh(); // re-render server components (hero / item texts) in the new language
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage can be unavailable */
    }
  }, [router]);

  const t = useCallback((key: MessageKey, vars?: Vars) => translate(locale, key, vars), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Translated text usable from server components: <T k="nav.heroes" /> */
export function T({ k, vars }: { k: MessageKey; vars?: Vars }) {
  const { t } = useI18n();
  return <>{t(k, vars)}</>;
}
