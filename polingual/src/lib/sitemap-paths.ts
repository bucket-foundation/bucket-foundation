import { GUIDES } from "./guides";
import { WORDS, wordPath } from "./words";
import SITE_LANGS from "./site-langs.json";
import { localWordPaths } from "./word-i18n";

export function sitemapPaths(): string[] {
  return ["/", ...SITE_LANGS.map((l) => `/${l}`), "/compare/duolingo-three-languages", "/privacy", "/terms", "/support", "/research", ...GUIDES.map((g) => `/learn/${g.slug}`), "/word", ...WORDS.map(wordPath), ...localWordPaths()];
}

export const SITEMAP_MAX_URLS = 45_000;
export const SITEMAP_MAX_BYTES = 45_000_000;
const URLSET_OVERHEAD = 200;
const ENTRY_OVERHEAD = 160;

export function entryBytes(url: string): number {
  return Buffer.byteLength(url, "utf8") + ENTRY_OVERHEAD;
}

export function chunkUrls(urls: string[], maxUrls = SITEMAP_MAX_URLS, maxBytes = SITEMAP_MAX_BYTES): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let bytes = URLSET_OVERHEAD;
  for (const url of urls) {
    const size = entryBytes(url);
    if (current.length > 0 && (current.length >= maxUrls || bytes + size > maxBytes)) {
      chunks.push(current);
      current = [];
      bytes = URLSET_OVERHEAD;
    }
    current.push(url);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
