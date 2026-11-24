import type { DailyResult } from "./store";

type ResultWord = DailyResult["words"][number];
type Prompted = { lang: string; itemId: string; form: string; gloss: string };

export function hits(pattern: string): number {
  return [...pattern].filter((x) => x === "1").length;
}

export function mark(pattern: string, right: boolean): string {
  return pattern + (right ? "1" : "0");
}

export function patternWords(words: Prompted[], pattern: string): ResultWord[] {
  return words.map((w, k) => ({ lang: w.lang, itemId: w.itemId, form: w.form, gloss: w.gloss, right: pattern[k] === "1" }));
}

export function pickVariant(picked: string | null, choice: string, answer: string): "success" | "primary" | "secondary" {
  if (!picked) return "secondary";
  return choice === answer ? "success" : choice === picked ? "primary" : "secondary";
}
