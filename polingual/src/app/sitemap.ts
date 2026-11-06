import type { MetadataRoute } from "next";
import { sitemapPaths } from "@/lib/sitemap-paths";

const BASE = "https://www.polingual.com";
const BUILT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPaths().map((p) => ({ url: BASE + p, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.5, lastModified: BUILT }));
}
