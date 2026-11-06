import { GUIDES } from "./guides";
import { WORDS, wordPath } from "./words";
import SITE_LANGS from "./site-langs.json";

export function sitemapPaths(): string[] {
  return ["/", ...SITE_LANGS.map((l) => `/${l}`), "/compare/duolingo-three-languages", "/privacy", "/terms", "/support", "/research", ...GUIDES.map((g) => `/learn/${g.slug}`), "/word", ...WORDS.map(wordPath)];
}
