import type { MetadataRoute } from "next";
import { chunkUrls, sitemapPaths } from "@/lib/sitemap-paths";
import { SITE } from "@/lib/facts";
import { isWordPath, wordsLastModified } from "@/lib/words-date";

const WORDS_DATE = wordsLastModified();

function sitemapChunks(): string[][] {
  return chunkUrls(sitemapPaths().map((p) => SITE + p));
}

export async function generateSitemaps() {
  return sitemapChunks().map((_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  const urls = sitemapChunks()[Number(await id)] ?? [];
  return urls.map((url) => {
    const path = url.slice(SITE.length) || "/";
    const lastModified = isWordPath(path) ? WORDS_DATE : undefined;
    return { url, changeFrequency: "weekly", priority: path === "/" ? 1 : 0.5, ...(lastModified ? { lastModified } : {}) };
  });
}
