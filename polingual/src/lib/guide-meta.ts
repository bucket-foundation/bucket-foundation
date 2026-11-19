import type { Metadata } from "next";
import { guideAlternates, guidePath, type Guide } from "./guides";
import { pageMeta } from "./meta";

export function guideMeta(g: Guide): Metadata {
  return pageMeta({
    path: guidePath(g),
    title: g.title,
    documentTitle: `${g.title} | Polingual`,
    description: g.description,
    type: "article",
    locale: g.lang === "es" ? "es_US" : "en_US",
    languages: guideAlternates(g),
  });
}
