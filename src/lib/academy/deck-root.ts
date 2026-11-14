import type { LangItem } from "./lang-systems";

const LANG = /^[a-z]{2,3}$/;

export function deckRoot(raw: string | null, items: readonly LangItem[], min = 200): string {
  if (!raw || !LANG.test(raw)) return "en";
  return items.filter((i) => i.kind === "word" && i.forms[raw]).length >= min ? raw : "en";
}

export function hasExtraParams(url: URL, keys: readonly string[] = ["date", "root"]): boolean {
  return Array.from(url.searchParams.keys()).some((k) => !keys.includes(k));
}

export function canonicalDeckUrl(url: URL, keys: readonly string[] = ["date", "root"]): URL {
  const out = new URL(url.pathname, url.origin);
  for (const k of keys) {
    const v = url.searchParams.get(k);
    if (v) out.searchParams.set(k, v);
  }
  return out;
}

export function langsWithoutRoot(langs: readonly string[] | null, root: string, min = 2, max = 4): string[] | null {
  if (!langs) return null;
  const out = langs.filter((l) => l !== root);
  return out.length >= min && out.length <= max ? out : null;
}
