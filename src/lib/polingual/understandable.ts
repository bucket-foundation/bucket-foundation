import { editDistance, type LangCorpus, type LangItem } from "../academy/lang-systems";

export const FORM_THRESHOLD = 0.6;

export type FormChannel = "spelling" | "sound";

export interface FormMatch {
  channel: FormChannel;
  similarity: number;
}

export interface Understood {
  itemId: string;
  gloss: string;
  word: string;
  via: { lang: string; word: string };
  channel: FormChannel;
  similarity: number;
  sharedRoot: string | null;
}

export interface PairCoverage {
  known: string[];
  target: string;
  understood: number;
  total: number;
  share: number;
}

const MARKS = /[\u0300-\u036f]/g;
const NON_LETTERS = /[\s\d!-/:-@[-`{-~¿¡«»·’‘]/g;
const IPA_MODIFIERS = /[ˈˌːˑ.‿ʰʲʷˠˤ˞ⁿˡ()[\]/\s]/g;

export function spellingKey(item: LangItem, lang: string): string {
  const raw = item.readings[lang]?.roman || item.forms[lang] || "";
  return raw.normalize("NFD").replace(MARKS, "").toLowerCase().replace(NON_LETTERS, "");
}

export function soundKey(item: LangItem, lang: string): string {
  const ipa = item.readings[lang]?.ipa ?? "";
  return ipa.normalize("NFD").replace(MARKS, "").replace(IPA_MODIFIERS, "");
}

export function levenshteinSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0 || a.length === 0 || b.length === 0) return 0;
  return 1 - editDistance(a, b) / longest;
}

export function formMatch(item: LangItem, known: string, target: string): FormMatch {
  const spelling = levenshteinSimilarity(spellingKey(item, known), spellingKey(item, target));
  const sound = levenshteinSimilarity(soundKey(item, known), soundKey(item, target));
  return sound > spelling ? { channel: "sound", similarity: sound } : { channel: "spelling", similarity: spelling };
}

export function targetLexicon(corpus: LangCorpus, target: string): LangItem[] {
  return corpus.items.filter((i) => i.kind === "word" && !!i.forms[target]);
}

export function understandableSet(
  knownLanguages: string[],
  targetLanguage: string,
  corpus: LangCorpus,
  threshold: number = FORM_THRESHOLD
): Understood[] {
  const known = Array.from(new Set(knownLanguages)).filter((l) => l !== targetLanguage);
  const out: Understood[] = [];
  for (const item of targetLexicon(corpus, targetLanguage)) {
    let best: { lang: string; match: FormMatch } | null = null;
    for (const lang of known) {
      if (!item.forms[lang]) continue;
      const match = formMatch(item, lang, targetLanguage);
      if (!best || match.similarity > best.match.similarity) best = { lang, match };
    }
    if (!best || best.match.similarity < threshold) continue;
    const shared = item.root && item.cognateLangs.includes(best.lang) && item.cognateLangs.includes(targetLanguage);
    out.push({
      itemId: item.id,
      gloss: item.gloss,
      word: item.forms[targetLanguage],
      via: { lang: best.lang, word: item.forms[best.lang] },
      channel: best.match.channel,
      similarity: Math.round(best.match.similarity * 1000) / 1000,
      sharedRoot: shared ? item.root : null,
    });
  }
  return out;
}

export function pairCoverage(knownLanguages: string[], targetLanguage: string, corpus: LangCorpus, threshold: number = FORM_THRESHOLD): PairCoverage {
  const total = targetLexicon(corpus, targetLanguage).length;
  const understood = understandableSet(knownLanguages, targetLanguage, corpus, threshold).length;
  return { known: knownLanguages, target: targetLanguage, understood, total, share: total === 0 ? 0 : Math.round((understood / total) * 1000) / 1000 };
}
