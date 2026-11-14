import type { LangItem } from "./lang-systems";

const LANG = /^[a-z]{2,3}$/;

export function deckRoot(raw: string | null, items: readonly LangItem[], min = 200): string {
  if (!raw || !LANG.test(raw)) return "en";
  return items.filter((i) => i.kind === "word" && i.forms[raw]).length >= min ? raw : "en";
}

export function canonicalDeckUrl(url: URL): URL {
  const out = new URL(url.pathname, url.origin);
  for (const k of ["date", "root"]) {
    const v = url.searchParams.get(k);
    if (v) out.searchParams.set(k, v);
  }
  return out;
}
