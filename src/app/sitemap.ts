import type { MetadataRoute } from "next";
import { BRANCHES } from "@/lib/canon";

const BASE = "https://www.bucket.foundation";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/canon",
    "/manifesto",
    "/protocol",
    "/governance",
    "/about",
    "/join",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const branchRoutes = BRANCHES.map((b) => ({
    url: `${BASE}/canon/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const figureRoutes = BRANCHES.flatMap((b) =>
    b.figures.map((f) => ({
      url: `${BASE}/canon/${b.slug}/figures/${f.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...staticRoutes, ...branchRoutes, ...figureRoutes];
}
