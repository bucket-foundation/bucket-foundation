import type { LangItem } from "./lang-systems";
import { unit } from "./lobby-bots";
import { seededRandom } from "./lobbies";

export const SHIFT_LANGS = ["es", "fr", "it", "pt", "de", "nl", "sv"] as const;
export const SHIFT_LENGTH = 4;
export const SHIFT_PER_LANG = 3;

export interface ShiftTarget {
  lang: string;
  form: string;
  meaning: string;
}

export interface ShiftBoard {
  date: string;
  langs: string[];
  length: number;
  columns: string[][];
  targets: ShiftTarget[];
  valid: Record<string, string[]>;
}

const LETTERS = new RegExp("^\\p{Ll}+$", "u");

function seedOf(key: string): string {
  return String(Math.floor(unit(key) * 2 ** 52) + 1);
}

function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clean(form: string | undefined, length: number): string | null {
  if (!form) return null;
  const f = form.normalize("NFC").toLowerCase();
  return Array.from(f).length === length && LETTERS.test(f) ? f : null;
}

export function spellable(word: string, columns: readonly string[][]): boolean {
  const letters = Array.from(word);
  return letters.length === columns.length && letters.every((ch, i) => columns[i].includes(ch));
}

export function shiftBoard(items: readonly LangItem[], date: string, root = "en", length = SHIFT_LENGTH): ShiftBoard | null {
  const rand = seededRandom(seedOf(`shift:${date}`));
  const words = items.filter((i) => i.kind === "word" && i.forms[root]);
  const pool = SHIFT_LANGS.filter((l) => l !== root);
  const pairs = shuffled(pool.flatMap((a, i) => pool.slice(i + 1).map((b) => [a, b])), rand);
  for (const langs of pairs) {
    const targets: ShiftTarget[] = [];
    const seen = new Set<string>();
    for (const lang of langs) {
      const pool = shuffled(words.filter((w) => clean(w.forms[lang], length)), rand);
      for (const w of pool) {
        if (targets.filter((t) => t.lang === lang).length >= SHIFT_PER_LANG) break;
        const f = clean(w.forms[lang], length) as string;
        if (seen.has(f)) continue;
        seen.add(f);
        targets.push({ lang, form: f, meaning: w.forms[root] });
      }
    }
    if (targets.length < SHIFT_PER_LANG * 2) continue;
    const columns = Array.from({ length }, (_, i) => shuffled(Array.from(new Set(targets.map((t) => Array.from(t.form)[i]))), rand));
    const valid: Record<string, string[]> = {};
    for (const w of words) {
      for (const lang of langs) {
        const f = clean(w.forms[lang], length);
        if (f && spellable(f, columns)) valid[f] = Array.from(new Set([...(valid[f] ?? []), lang]));
      }
    }
    return { date, langs: [...langs], length, columns, targets, valid };
  }
  return null;
}
