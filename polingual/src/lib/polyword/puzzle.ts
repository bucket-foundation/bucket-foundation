import { fold, REVEAL_ORDER, type Bank, type HintForm } from "./bank";

export const MAX_GUESSES = 6;
const EPOCH = { y: 2026, m: 11, d: 1 };
const DAY_MS = 86_400_000;

export type Mark = "hit" | "near" | "miss";
export interface Hint {
  lang: string;
  word: string;
  roman?: string;
}

export interface Puzzle {
  lang: string;
  day: number;
  slug: string;
  word: string;
  answer: string;
  gloss: string;
  roman?: string;
  hints: Hint[];
}

export function dayNumber(date: Date): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d);
  return Math.floor((local - start) / DAY_MS) + 1;
}

export function dateOfDay(day: number): Date {
  return new Date(Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d) + (day - 1) * DAY_MS);
}

function hintsFor(forms: Record<string, HintForm>, lang: string, count = MAX_GUESSES - 1): Hint[] {
  const out: Hint[] = [];
  for (const l of REVEAL_ORDER) {
    if (l === lang || !forms[l]) continue;
    const f = forms[l];
    out.push(f.roman ? { lang: l, word: f.word, roman: f.roman } : { lang: l, word: f.word });
    if (out.length === count) break;
  }
  return out;
}

export function puzzleFor(bank: Bank, lang: string, day: number): Puzzle | null {
  const list = bank.langs[lang];
  if (!list?.length || day < 1) return null;
  const slug = list[(day - 1) % list.length];
  const entry = bank.words[slug];
  const form = entry?.forms[lang];
  if (!form) return null;
  return { lang, day, slug, word: form.word, answer: fold(form.word), gloss: entry.gloss, roman: form.roman, hints: hintsFor(entry.forms, lang) };
}

export function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: answer.length }, () => "miss");
  const left = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = "hit";
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < answer.length; i++) {
    if (marks[i] === "hit") continue;
    const n = left.get(guess[i]) ?? 0;
    if (n > 0) {
      marks[i] = "near";
      left.set(guess[i], n - 1);
    }
  }
  return marks;
}

const RANK: Record<Mark, number> = { miss: 1, near: 2, hit: 3 };

export function keyMarks(guesses: readonly string[], answer: string): Record<string, Mark> {
  const out: Record<string, Mark> = {};
  for (const g of guesses) {
    score(g, answer).forEach((m, i) => {
      const k = g[i];
      if (!out[k] || RANK[m] > RANK[out[k]]) out[k] = m;
    });
  }
  return out;
}

type GuessCheck = { ok: true; guess: string } | { ok: false; reason: "short" | "letters" | "repeat" };

export function checkGuess(raw: string, answer: string, previous: readonly string[]): GuessCheck {
  const guess = fold(raw.trim());
  if (!/^[a-z]*$/.test(guess)) return { ok: false, reason: "letters" };
  if (guess.length !== answer.length) return { ok: false, reason: "short" };
  if (previous.includes(guess)) return { ok: false, reason: "repeat" };
  return { ok: true, guess };
}

export function solved(guesses: readonly string[], answer: string): boolean {
  return guesses.includes(answer);
}

export function finished(guesses: readonly string[], answer: string): boolean {
  return solved(guesses, answer) || guesses.length >= MAX_GUESSES;
}

export function revealedHints(puzzle: Pick<Puzzle, "hints" | "answer">, guesses: readonly string[]): Hint[] {
  const misses = guesses.filter((g) => g !== puzzle.answer).length;
  return finished(guesses, puzzle.answer) ? puzzle.hints : puzzle.hints.slice(0, misses);
}

export function meaningIn(bank: Bank, puzzle: Pick<Puzzle, "slug" | "gloss">, root: string): { lang: string; text: string } {
  const f = root === "en" ? undefined : bank.words[puzzle.slug]?.forms[root];
  return f ? { lang: root, text: f.word } : { lang: "en", text: puzzle.gloss };
}
