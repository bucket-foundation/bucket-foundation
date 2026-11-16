import { cellKey, cells, type MiniEntry, type MiniPuzzle } from "./mini";

export type MiniFill = Record<string, string>;

export function tapCell(p: MiniPuzzle, active: number, r: number, c: number): { active: number; cursor: number } {
  const entry = p.entries[active];
  const inWord = new Set(cells(entry).map(([er, ec]) => cellKey(er, ec)));
  const k = cellKey(r, c);
  const idx = p.entries.findIndex((e) => cells(e).some(([er, ec]) => er === r && ec === c) && (e === entry || !inWord.has(k)));
  const at = Math.max(0, idx);
  return { active: at, cursor: cells(p.entries[at]).findIndex(([er, ec]) => er === r && ec === c) };
}

export function writeAt(fill: MiniFill, entry: MiniEntry, cursor: number, letter: string): MiniFill {
  const [r, c] = cells(entry)[cursor];
  return { ...fill, [cellKey(r, c)]: letter };
}

export function miniRight(p: MiniPuzzle, fill: MiniFill): boolean[] {
  return p.entries.map((e) => cells(e).every(([r, c], i) => fill[cellKey(r, c)] === e.letters[i]));
}
