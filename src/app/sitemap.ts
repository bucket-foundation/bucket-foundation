import type { MetadataRoute } from "next";
import { BRANCHES } from "@/lib/canon";

const BASE = "https://www.bucket.foundation";

/**
 * Unified sitemap. Every real Next.js page under src/app/**\/page.tsx is
 * included here. Priority / changeFrequency chosen per-page:
 *   1.0  homepage
 *   0.9  canon · learn · build · protocol (top discovery surfaces)
 *   0.8  manifesto · envelope · cite-forever license
 *   0.7  governance · about · join · contributors
 *   0.6  knowledge · research · library · kruse · assets · whats-new
 *
 * Keep in sync with /api/indexnow/ping and scripts/archive-org-ping.sh.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const top = [
    { p: "",                    pri: 1.0,  freq: "weekly"  as const },
    { p: "/canon",              pri: 0.9,  freq: "weekly"  as const },
    { p: "/learn",              pri: 0.9,  freq: "weekly"  as const },
    { p: "/build",              pri: 0.9,  freq: "weekly"  as const },
    { p: "/protocol",           pri: 0.9,  freq: "weekly"  as const },
    { p: "/manifesto",          pri: 0.8,  freq: "monthly" as const },
    { p: "/protocol/envelope",  pri: 0.8,  freq: "weekly"  as const },
    { p: "/cite-forever/v0.1",  pri: 0.8,  freq: "yearly"  as const },
    { p: "/governance",         pri: 0.7,  freq: "monthly" as const },
    { p: "/about",              pri: 0.7,  freq: "monthly" as const },
    { p: "/join",               pri: 0.7,  freq: "monthly" as const },
    { p: "/contributors",       pri: 0.7,  freq: "weekly"  as const },
    { p: "/knowledge",          pri: 0.6,  freq: "weekly"  as const },
    { p: "/research",           pri: 0.6,  freq: "weekly"  as const },
    { p: "/library",            pri: 0.6,  freq: "weekly"  as const },
    { p: "/assets",             pri: 0.6,  freq: "monthly" as const },
    { p: "/whats-new",          pri: 0.6,  freq: "daily"   as const },
    { p: "/kruse",              pri: 0.6,  freq: "weekly"  as const },
    { p: "/kruse/search",       pri: 0.5,  freq: "weekly"  as const },
  ].map(({ p, pri, freq }) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: freq,
    priority: pri,
  }));

  const branchRoutes = BRANCHES.map((b) => ({
    url: `${BASE}/canon/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const figureRoutes = BRANCHES.flatMap((b) =>
    b.figures.map((f) => ({
      url: `${BASE}/canon/${b.slug}/figures/${f.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }))
  );

  return [...top, ...branchRoutes, ...figureRoutes];
}
