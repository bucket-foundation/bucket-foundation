import type { MetadataRoute } from "next";
import { chunkUrls, sitemapPaths } from "@/lib/sitemap-paths";
import { SITE } from "@/lib/facts";

const BUILT = new Date();

function sitemapChunks(): string[][] {
  return chunkUrls(sitemapPaths().map((p) => SITE + p));
}

export async function generateSitemaps() {
  return sitemapChunks().map((_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number | Promise<number | string> }): Promise<MetadataRoute.Sitemap> {
  const urls = sitemapChunks()[Number(await id)] ?? [];
  return urls.map((url) => ({ url, changeFrequency: "weekly", priority: url === `${SITE}/` ? 1 : 0.5, lastModified: BUILT }));
}
