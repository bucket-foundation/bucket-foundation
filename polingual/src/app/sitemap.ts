import type { MetadataRoute } from "next";

const BASE = "https://www.polingual.com";
const BUILT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/compare/duolingo-three-languages", "/privacy", "/terms", "/support", "/research"].map((p) => ({ url: BASE + p, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.5, lastModified: BUILT }));
}
