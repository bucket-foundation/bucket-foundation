import type { LangItem } from "./lang-systems";

const LANG = /^[a-z]{2,3}$/;

export function deckRoot(raw: string | null, items: readonly LangItem[], min = 200): string {
  if (!raw || !LANG.test(raw)) return "en";
  return items.filter((i) => i.kind === "word" && i.forms[raw]).length >= min ? raw : "en";
}
