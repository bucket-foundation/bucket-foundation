import type { Metadata } from "next";
import { pageMeta } from "./meta";
import { teachersAlternates, teachersCopy, teachersPath, type TeachersLang, type TeachersPage } from "./teachers";

export function teachersMeta(lang: TeachersLang, page: TeachersPage): Metadata {
  const c = teachersCopy(lang);
  const part = page === "/lesson-plan" ? c.plan : page === "/handout" ? c.handout : c;
  return pageMeta({
    path: teachersPath(lang, page),
    title: part.metaTitle,
    documentTitle: `${part.metaTitle} | Polingual`,
    description: part.description,
    locale: lang === "es" ? "es_US" : "en_US",
    languages: teachersAlternates(page),
  });
}
