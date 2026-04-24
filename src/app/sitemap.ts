import type { MetadataRoute } from "next";
import { BRANCHES } from "@/lib/canon";

const BASE = "https://www.bucket.foundation";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const top = [
    { p: "", pri: 1.0, freq: "weekly" as const },
    { p: "/canon", pri: 0.95, freq: "weekly" as const },
    { p: "/manifesto", pri: 0.9, freq: "monthly" as const },
    { p: "/protocol", pri: 0.9, freq: "weekly" as const },
    { p: "/protocol/envelope", pri: 0.85, freq: "weekly" as const },
    { p: "/build", pri: 0.85, freq: "weekly" as const },
    { p: "/cite-forever/v0.1", pri: 0.8, freq: "yearly" as const },
    { p: "/governance", pri: 0.7, freq: "monthly" as const },
    { p: "/about", pri: 0.7, freq: "monthly" as const },
    { p: "/join", pri: 0.7, freq: "monthly" as const },
    { p: "/knowledge", pri: 0.6, freq: "weekly" as const },
    { p: "/research", pri: 0.6, freq: "weekly" as const },
    { p: "/kruse", pri: 0.5, freq: "weekly" as const },
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
    priority: 0.75,
  }));

  const figureRoutes = BRANCHES.flatMap((b) =>
    b.figures.map((f) => ({
      url: `${BASE}/canon/${b.slug}/figures/${f.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...top, ...branchRoutes, ...figureRoutes];
}
