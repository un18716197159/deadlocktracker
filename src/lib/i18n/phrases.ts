import type { Locale } from "./messages";
import ru from "./phrases/ru";
import uk from "./phrases/uk";
import es from "./phrases/es";
import pt from "./phrases/pt";
import de from "./phrases/de";
import fr from "./phrases/fr";
import tr from "./phrases/tr";
import pl from "./phrases/pl";
import zh from "./phrases/zh";
import ja from "./phrases/ja";
import ko from "./phrases/ko";

/**
 * Page captions translated by their English text: <L>Win rate</L> or p("Win rate").
 * The English phrase is the key, so the code stays readable and a missing translation
 * simply shows the English text. Lookup ignores case: "WIN RATE" uses the "Win rate"
 * entry and is shown in capitals.
 */
export type PhraseBook = Record<string, string>;
const BOOKS: Partial<Record<Locale, PhraseBook>> = { ru, uk, es, pt, de, fr, tr, pl, zh, ja, ko };

const indexed = new Map<Locale, Map<string, string>>();
function bookFor(locale: Locale) {
  let book = indexed.get(locale);
  if (!book) {
    book = new Map(Object.entries(BOOKS[locale] ?? {}).map(([english, text]) => [english.toLowerCase(), text]));
    indexed.set(locale, book);
  }
  return book;
}

/** Placeholders such as {n} are filled from vars after translating: p("Tier {n}", { n: 3 }). */
export function translatePhrase(locale: Locale, english: string, vars?: Record<string, string | number>): string {
  let text = locale === "en" ? english : bookFor(locale).get(english.trim().toLowerCase()) ?? english;
  if (text !== english && english === english.toUpperCase() && /[A-Z]/.test(english)) text = text.toLocaleUpperCase(locale);
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}
