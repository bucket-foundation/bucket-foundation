import type { LangCorpus, LangItem } from "@academy/lang-systems";
import { dailySeed, mixed, SeededRandom } from "./rng";

export const LANG_CODES = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ar", "hi", "ja", "zh", "ko", "he", "fa", "tr", "cs", "id", "vi", "th", "ta", "la", "grc", "sa", "ang"];

const STARTER_RANK = 3;
const HELD_RANK = 2;

export interface GameWord {
  itemId: string;
  lang: string;
  form: string;
  gloss: string;
  root: string;
  rank: number;
}

export const wordId = (w: Pick<GameWord, "lang" | "itemId">) => `${w.lang}:${w.itemId}`;

export function formOf(item: LangItem, lang: string): string | null {
  const f = item.forms[lang];
  return f ? f : null;
}

function usable(item: LangItem, root: string, lang: string): boolean {
  return formOf(item, root) !== null && formOf(item, lang) !== null;
}

export function starter(root: string, targets: readonly string[], corpus: LangCorpus, perLang = 12): GameWord[] {
  return targets.flatMap((l) => {
    const out: GameWord[] = [];
    for (const i of corpus.items) {
      if (out.length >= perLang) break;
      if ((i.kind !== "word" && i.kind !== "phrase") || !usable(i, root, l)) continue;
      const f = formOf(i, l)!;
      const g = formOf(i, root) ?? i.gloss;
      if (f !== g) out.push({ itemId: i.id, lang: l, form: f, gloss: g, root, rank: STARTER_RANK });
    }
    return out;
  });
}

export function balanced(words: readonly GameWord[]): GameWord[] {
  const langs: string[] = [];
  const queues = new Map<string, GameWord[]>();
  for (const w of words) {
    if (!queues.has(w.lang)) {
      langs.push(w.lang);
      queues.set(w.lang, []);
    }
    queues.get(w.lang)!.push(w);
  }
  const turns: GameWord[] = [];
  while (turns.length < words.length) for (const l of langs) {
    const w = queues.get(l)!.shift();
    if (w) turns.push(w);
  }
  return turns.map((w, i) => ({ w, i })).sort((a, b) => Math.min(a.w.rank, HELD_RANK) - Math.min(b.w.rank, HELD_RANK) || a.i - b.i).map((x) => x.w);
}

interface Entry {
  itemId: string;
  form: string;
  gloss: string;
  category: string;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export class GameDeck {
  private pools = new Map<string, Entry[]>();
  private index = new Map<string, Map<string, Entry>>();

  constructor(
    corpus: LangCorpus,
    readonly root: string,
    readonly targets: readonly string[]
  ) {
    for (const l of targets) {
      const entries: Entry[] = [];
      for (const i of corpus.items) {
        if (i.kind !== "word" || !usable(i, root, l)) continue;
        const f = formOf(i, l)!;
        const g = formOf(i, root)!;
        if (f !== g) entries.push({ itemId: i.id, form: f, gloss: g, category: i.category });
      }
      this.pools.set(l, entries);
      const m = new Map<string, Entry>();
      for (const e of entries) if (!m.has(e.itemId)) m.set(e.itemId, e);
      this.index.set(l, m);
    }
  }

  pool(lang: string): Entry[] {
    return this.pools.get(lang) ?? [];
  }

  word(itemId: string, lang: string): GameWord | null {
    const e = this.index.get(lang)?.get(itemId);
    return e ? { itemId: e.itemId, lang, form: e.form, gloss: e.gloss, root: this.root, rank: HELD_RANK } : null;
  }

  foils(word: GameWord, rng: SeededRandom, also: string[] = [], count = 3): string[] {
    const pool = this.pool(word.lang);
    const category = this.index.get(word.lang)?.get(word.itemId)?.category;
    const form = word.form.toLowerCase();
    const gloss = word.gloss.toLowerCase();
    const size = word.form.length;
    const first = word.form[0];
    const close = pool
      .filter((e) => e.gloss.toLowerCase() !== gloss && e.form.toLowerCase() !== form)
      .map((e) => ({ rank: (e.category === category ? 0 : 4) + Math.min(3, Math.abs(e.form.length - size)) + (e.form[0] === first ? 0 : 1), e }))
      .sort((a, b) => a.rank - b.rank || cmp(a.e.itemId, b.e.itemId))
      .slice(0, 16)
      .map((x) => x.e);
    const taken = new Set([form, ...also.map((a) => a.toLowerCase())]);
    const out = also.filter((a) => a.toLowerCase() !== form);
    for (const e of mixed(close, rng)) {
      if (out.length >= count) break;
      const k = e.form.toLowerCase();
      if (!taken.has(k)) {
        taken.add(k);
        out.push(e.form);
      }
    }
    return out.slice(0, count);
  }

  daily(count: number, rng: SeededRandom): GameWord[] {
    const langs = [...this.targets].sort();
    if (!langs.length) return [];
    const used = new Set<string>();
    const out: GameWord[] = [];
    let i = 0;
    const common = langs.map((l) => mixed(this.pool(l).slice(0, DAILY_POOL), rng));
    const cursors = langs.map(() => 0);
    while (out.length < count && cursors.some((c, k) => c < common[k].length)) {
      const k = i % langs.length;
      i += 1;
      while (cursors[k] < common[k].length) {
        const e = common[k][cursors[k]];
        cursors[k] += 1;
        if (!used.has(e.itemId)) {
          used.add(e.itemId);
          out.push({ itemId: e.itemId, lang: langs[k], form: e.form, gloss: e.gloss, root: this.root, rank: HELD_RANK });
          break;
        }
      }
    }
    return out;
  }
}

const DAILY_LENGTH = 6;
const QUIZ_LENGTH = 10;
const DAILY_POOL = 400;

export type PromptMode = "form" | "flag" | "voice";

interface GamePrompt {
  id: number;
  mode: PromptMode;
  word: GameWord;
  choices: string[];
  answer: string;
}

export function dailySet(deck: GameDeck, day: string): GamePrompt[] {
  const rng = new SeededRandom(dailySeed(day, deck.root, deck.targets));
  return deck.daily(DAILY_LENGTH, rng).map((w, i) => {
    const foils = deck.foils(w, rng);
    return { id: i, mode: "form" as const, word: w, choices: mixed([w.form, ...foils], rng), answer: w.form };
  });
}

const FAMILIES = [
  ["es", "pt", "it", "fr", "en", "de", "nl", "sv", "pl", "cs", "fi", "tr", "id", "vi", "la", "ang"],
  ["ru", "el", "grc"],
  ["ar", "fa", "he"],
  ["hi", "sa", "ta", "th"],
  ["ja", "zh", "ko"],
];
const CLASSICAL = ["la", "ang", "grc", "sa"];

export function distractors(lang: string, own: readonly string[], rng: SeededRandom, excluding: ReadonlySet<string> = new Set(), count = 3): string[] {
  const blocked = new Set([...excluding, lang, ...CLASSICAL.filter((c) => !own.includes(c))]);
  const kin = (FAMILIES.find((f) => f.includes(lang)) ?? [lang]).filter((l) => !blocked.has(l));
  const near = [...mixed(kin.filter((l) => own.includes(l)), rng), ...mixed(kin.filter((l) => !own.includes(l)), rng)];
  if (near.length >= 2) return near.slice(0, count);
  const far = [...mixed(own.filter((l) => !blocked.has(l) && !near.includes(l)), rng), ...mixed(LANG_CODES.filter((l) => !blocked.has(l) && !near.includes(l) && !own.includes(l)), rng)];
  return [...near, ...far].slice(0, count);
}

export function flags(words: readonly GameWord[], own: readonly string[], mode: PromptMode, rng: SeededRandom, sameForm: (w: GameWord, lang: string) => boolean = () => false, count = QUIZ_LENGTH): GamePrompt[] {
  const seen = new Set<string>();
  const unique = balanced(words).filter((w) => {
    const k = w.form.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique.slice(0, count).map((w, i) => {
    const clash = new Set(LANG_CODES.filter((l) => sameForm(w, l)));
    const wrong = distractors(w.lang, own, rng, clash);
    return { id: i, mode, word: w, choices: mixed([w.lang, ...wrong], rng), answer: w.lang };
  });
}
