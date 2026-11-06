import { GUIDES } from "./guides";
import { WORDS, wordPath } from "./words";

export function sitemapPaths(): string[] {
  return ["/", "/es", "/compare/duolingo-three-languages", "/privacy", "/terms", "/support", "/research", ...GUIDES.map((g) => `/learn/${g.slug}`), "/word", ...WORDS.map(wordPath)];
}
