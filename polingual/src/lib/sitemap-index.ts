import { SITE } from "./facts";
import { chunkUrls, sitemapPaths } from "./sitemap-paths";

export function sitemapChildUrls(): string[] {
  return chunkUrls(sitemapPaths().map((p) => SITE + p)).map((_, id) => `${SITE}/sitemap/${id}.xml`);
}

export function sitemapIndexXml(): string {
  const items = sitemapChildUrls().map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>\n`;
}
