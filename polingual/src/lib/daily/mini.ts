import { fnv, SeededRandom } from "./rng";
import { wordId, type GameWord } from "./words";

export const MINI_SIDE = 6;
export const MINI_WANTED = 5;

export interface MiniEntry {
  word: GameWord;
  letters: string[];
  row: number;
  col: number;
  across: boolean;
  number: number;
}

export interface MiniPuzzle {
  lang: string;
  entries: MiniEntry[];
  keys: string[];
}

export const cellKey = (row: number, col: number) => `${row},${col}`;

export function cells(e: Pick<MiniEntry, "letters" | "row" | "col" | "across">): [number, number][] {
  return e.letters.map((_, i) => (e.across ? [e.row, e.col + i] : [e.row + i, e.col]));
}

export function miniLetters(form: string): string[] | null {
  const chars = Array.from(form);
  if (chars.length < 3 || chars.length > MINI_SIDE || !chars.every((c) => /\p{L}/u.test(c))) return null;
  return chars.map((c) => {
    const up = c.toUpperCase();
    return Array.from(up).length === 1 ? up : c;
  });
}

export function miniAnswers(p: MiniPuzzle): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of p.entries) cells(e).forEach(([r, c], i) => out.set(cellKey(r, c), e.letters[i]));
  return out;
}

export function miniSize(p: MiniPuzzle): { rows: number; cols: number } {
  const all = p.entries.flatMap(cells);
  return { rows: Math.max(-1, ...all.map((c) => c[0])) + 1, cols: Math.max(-1, ...all.map((c) => c[1])) + 1 };
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function dailyMini(words: readonly GameWord[], day: string, root: string, targets: readonly string[]): MiniPuzzle | null {
  const sorted = [...targets].sort();
  const rng = new SeededRandom(fnv(`mini|${day}|${root}|${sorted.join(",")}`));
  const langs = rng.shuffled(sorted.filter((l) => words.filter((w) => w.lang === l && miniLetters(w.form) !== null).length >= 8));
  for (const lang of langs) {
    const p = build(words.filter((w) => w.lang === lang), lang, rng);
    if (p) return p;
  }
  return null;
}

function build(words: readonly GameWord[], lang: string, rng: SeededRandom): MiniPuzzle | null {
  const seen = new Set<string>();
  const pool: [GameWord, string[]][] = [];
  for (const w of [...words].sort((a, b) => cmp(wordId(a), wordId(b)))) {
    const l = miniLetters(w.form);
    if (!l || seen.has(l.join(""))) continue;
    seen.add(l.join(""));
    pool.push([w, l]);
  }
  let best: MiniEntry[] = [];
  for (let n = 0; n < 30 && best.length < MINI_WANTED; n++) {
    const placed = attempt(rng.shuffled(pool), rng);
    if (placed.length > best.length) best = placed;
  }
  if (best.length < 3) return null;
  const top = Math.min(...best.map((e) => e.row));
  const left = Math.min(...best.map((e) => e.col));
  const shifted = best.map((e) => ({ ...e, row: e.row - top, col: e.col - left }));
  const starts = [...new Set(shifted.map((e) => cellKey(e.row, e.col)))].map((k) => k.split(",").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([r, c]) => cellKey(r, c));
  const numbered = shifted.map((e) => ({ ...e, number: starts.indexOf(cellKey(e.row, e.col)) + 1 })).sort((a, b) => a.number - b.number || (a.across ? 0 : 1) - (b.across ? 0 : 1));
  const keys = new Set(numbered.flatMap((e) => e.letters));
  for (const l of rng.shuffled(pool.flatMap((p) => p[1]))) if (keys.size < 18) keys.add(l);
  return { lang, entries: numbered, keys: [...keys].sort(cmp) };
}

function attempt(pool: [GameWord, string[]][], rng: SeededRandom): MiniEntry[] {
  if (!pool.length) return [];
  const placed: MiniEntry[] = [{ word: pool[0][0], letters: pool[0][1], row: 0, col: 0, across: true, number: 0 }];
  for (const [word, letters] of pool.slice(1)) {
    if (placed.length >= MINI_WANTED) break;
    const spots: MiniEntry[] = [];
    for (const e of placed) {
      const ec = cells(e);
      e.letters.forEach((a, i) =>
        letters.forEach((b, j) => {
          if (a !== b) return;
          const [r, c] = ec[i];
          const spot = { word, letters, row: e.across ? r - j : r, col: e.across ? c : c - j, across: !e.across, number: 0 };
          if (fits(spot, placed)) spots.push(spot);
        })
      );
    }
    const s = rng.element(spots);
    if (s) placed.push(s);
  }
  return placed;
}

function fits(e: MiniEntry, placed: MiniEntry[]): boolean {
  const all = [...placed.flatMap(cells), ...cells(e)];
  const rows = all.map((c) => c[0]);
  const cols = all.map((c) => c[1]);
  if (Math.max(...rows) - Math.min(...rows) >= MINI_SIDE || Math.max(...cols) - Math.min(...cols) >= MINI_SIDE) return false;
  const letter = new Map<string, string>();
  const sameWay = new Set<string>();
  for (const p of placed)
    cells(p).forEach(([r, c], i) => {
      letter.set(cellKey(r, c), p.letters[i]);
      if (p.across === e.across) sameWay.add(cellKey(r, c));
    });
  const ec = cells(e);
  const [er, ecol] = ec[ec.length - 1];
  const before = e.across ? cellKey(e.row, e.col - 1) : cellKey(e.row - 1, e.col);
  const after = e.across ? cellKey(er, ecol + 1) : cellKey(er + 1, ecol);
  if (letter.has(before) || letter.has(after)) return false;
  for (let i = 0; i < ec.length; i++) {
    const [r, c] = ec[i];
    const k = cellKey(r, c);
    if (sameWay.has(k)) return false;
    const there = letter.get(k);
    if (there !== undefined) {
      if (there !== e.letters[i]) return false;
      continue;
    }
    const sides = e.across ? [cellKey(r - 1, c), cellKey(r + 1, c)] : [cellKey(r, c - 1), cellKey(r, c + 1)];
    if (sides.some((s) => letter.has(s))) return false;
  }
  return true;
}
