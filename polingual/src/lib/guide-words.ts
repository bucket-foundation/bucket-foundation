import type { Cell } from "./guides";
import { word, wordPath } from "./words";

export function wordForm(slug: string, lang: string): string {
  const form = word(slug)?.forms.find((f) => f.lang === lang)?.word;
  if (!form) throw new Error(`no ${lang} form for ${slug}`);
  return form;
}

export function wordHref(slug: string, locale = "en"): string {
  const w = word(slug);
  if (!w) throw new Error(`no word ${slug}`);
  return `${locale === "en" ? "" : `/${locale}`}${wordPath(w)}`;
}

export function wordRow(slug: string, langs: string[], locale = "en"): Cell[] {
  return [{ text: wordForm(slug, locale), href: wordHref(slug, locale) }, ...langs.map((l) => wordForm(slug, l))];
}

export function wordRows(slugs: string[], langs: string[], locale = "en"): Cell[][] {
  return slugs.map((s) => wordRow(s, langs, locale));
}
