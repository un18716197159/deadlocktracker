"use client";

import { LOCALES, isLocale } from "../../lib/i18n/messages";
import { useI18n } from "../../lib/i18n/provider";
import "./language-switcher.css";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="lang-switch">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
      </svg>
      <select value={locale} aria-label={t("common.language")} onChange={(event) => { if (isLocale(event.target.value)) setLocale(event.target.value); }}>
        {LOCALES.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}
      </select>
    </label>
  );
}
