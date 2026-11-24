import type { Word } from "../words";
import FROZEN from "./order.json";

export const TARGETS = ["es", "fr", "de", "it", "pt", "nl", "sv", "pl", "tr", "fi", "cs", "id", "en"] as const;
export type Target = (typeof TARGETS)[number];

export const REVEAL_ORDER = ["en", "es", "fr", "de", "ja", "it", "ru", "zh", "pt", "ar", "ko", "hi", "el", "nl", "sv", "tr"] as const;

const LENGTHS = [5, 6];

export type HintForm = { word: string; roman?: string };
interface BankWord {
  gloss: string;
  forms: Record<string, HintForm>;
}
export interface Bank {
  langs: Record<string, string[]>;
  words: Record<string, BankWord>;
}

export function fold(raw: string): string {
  return raw.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function playable(word: string): boolean {
  const f = fold(word);
  return /^[a-z]+$/.test(f) && LENGTHS.includes(f.length);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const r = rng(hash(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const KEEP = new Set<string>([...TARGETS, ...REVEAL_ORDER]);

export function ordered(frozen: readonly string[], current: readonly string[]): string[] {
  const have = new Set(current);
  const fresh = current.filter((s) => !frozen.includes(s));
  const out: string[] = [];
  for (const slug of frozen) {
    if (have.has(slug)) out.push(slug);
    else if (fresh.length) out.push(fresh.shift() as string);
    else if (current.length) out.push(current[hash(slug) % current.length]);
  }
  return [...out, ...fresh];
}

export function buildBank(words: readonly Word[], frozen: Record<string, string[]> = FROZEN): Bank {
  const langs: Record<string, string[]> = {};
  const used = new Set<string>();
  for (const lang of TARGETS) {
    const seen = new Set<string>();
    const picks: string[] = [];
    for (const w of [...words].sort((a, b) => a.slug.localeCompare(b.slug))) {
      const form = w.forms.find((f) => f.lang === lang);
      if (!form || !playable(form.word)) continue;
      const key = fold(form.word);
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push(w.slug);
      used.add(w.slug);
    }
    langs[lang] = ordered(frozen[lang] ?? [], shuffled(picks, `polyword:${lang}`));
  }
  const out: Record<string, BankWord> = {};
  for (const w of words) {
    if (!used.has(w.slug)) continue;
    const forms: Record<string, HintForm> = {};
    for (const f of w.forms) {
      if (!KEEP.has(f.lang) || forms[f.lang]) continue;
      const roman = f.roman ?? f.kana;
      forms[f.lang] = roman ? { word: f.word, roman } : { word: f.word };
    }
    out[w.slug] = { gloss: w.gloss || w.en, forms };
  }
  return { langs, words: out };
}
