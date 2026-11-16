import type { RootCluster, Word } from "@/lib/words";

export type LearnEntry = { slug: string; roots: RootCluster[] };
export type LearnIndex = Record<string, LearnEntry>;

export const LEARN_FALLBACK = "/app?from=play";

function key(s: string) {
  return s.trim().toLowerCase();
}

export function buildLearnIndex(words: Pick<Word, "slug" | "en" | "gloss" | "forms" | "roots">[]): LearnIndex {
  const out: LearnIndex = {};
  for (const w of words) {
    const entry = { slug: w.slug, roots: w.roots ?? [] };
    for (const k of [w.en, w.gloss, ...w.forms.map((f) => `${f.lang}:${f.word}`)]) if (k && !out[key(k)]) out[key(k)] = entry;
  }
  return out;
}

export function learnEntry(index: LearnIndex | null, lang: string, word: string, meaning?: string): LearnEntry | null {
  if (!index) return null;
  return index[key(`${lang}:${word}`)] ?? (meaning ? index[key(meaning)] : undefined) ?? null;
}

export function rootFor(entry: LearnEntry | null, lang: string): string | null {
  return entry?.roots.find((r) => r.langs.includes(lang))?.root ?? null;
}

export function learnHref(entry: LearnEntry | null): string {
  return entry ? `/word/${entry.slug}?from=play` : LEARN_FALLBACK;
}
