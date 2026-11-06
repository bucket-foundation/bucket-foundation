import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import SITE_LANGS from "@/lib/site-langs.json";

const BASE = "https://www.polingual.com";
const BUILT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", ...SITE_LANGS.map((l) => `/${l}`), "/compare/duolingo-three-languages", "/privacy", "/terms", "/support", "/research", ...GUIDES.map((g) => `/learn/${g.slug}`)].map((p) => ({ url: BASE + p, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.5, lastModified: BUILT }));
}
