import type { MetadataRoute } from "next";

const BASE = "https://www.polingual.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/privacy", "/terms", "/support", "/research"].map((p) => ({ url: BASE + p, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.5 }));
}
