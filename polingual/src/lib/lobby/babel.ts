export interface Meaning {
  id: string;
  meaning: string;
  forms: Record<string, string>;
}

export interface Cell {
  key: number;
  meaning: string;
  lang: string;
}

export type Board = Cell[];

export const SIZE = 6;
export const MATCH = 3;

export function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}

export interface Deal {
  next: () => Cell;
}

export function dealer(meanings: readonly Meaning[], langs: readonly string[], rand: () => number, start = 0): Deal {
  let key = start;
  return {
    next: () => {
      const m = meanings[Math.floor(rand() * meanings.length)];
      const options = langs.filter((l) => m.forms[l]);
      return { key: key++, meaning: m.id, lang: options[Math.floor(rand() * options.length)] };
    },
  };
}

export function at(board: Board, r: number, c: number): Cell | null {
  return r >= 0 && c >= 0 && r < SIZE && c < SIZE ? board[r * SIZE + c] : null;
}

export function matches(board: Board): Set<number> {
  const out = new Set<number>();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const run = [r * SIZE + c];
        for (;;) {
          const prev = board[run[run.length - 1]];
          const nr = Math.floor(run[run.length - 1] / SIZE) + dr;
          const nc = (run[run.length - 1] % SIZE) + dc;
          const next = at(board, nr, nc);
          if (!next || next.meaning !== prev.meaning) break;
          run.push(nr * SIZE + nc);
        }
        if (run.length >= MATCH) for (const i of run) out.add(i);
      }
    }
  }
  return out;
}

export function fresh(deal: Deal): Board {
  const board: Board = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    let cell = deal.next();
    for (let tries = 0; tries < 20; tries++) {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      const left = c >= 2 && board[i - 1].meaning === cell.meaning && board[i - 2].meaning === cell.meaning;
      const up = r >= 2 && board[i - SIZE].meaning === cell.meaning && board[i - 2 * SIZE].meaning === cell.meaning;
      if (!left && !up) break;
      cell = deal.next();
    }
    board.push(cell);
  }
  return board;
}

export function adjacent(a: number, b: number): boolean {
  const ra = Math.floor(a / SIZE);
  const rb = Math.floor(b / SIZE);
  return (ra === rb && Math.abs(a - b) === 1) || Math.abs(a - b) === SIZE;
}

export function swapped(board: Board, a: number, b: number): Board {
  const out = board.slice();
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

export function collapse(board: Board, gone: ReadonlySet<number>, deal: Deal): Board {
  const out: Board = board.slice();
  for (let c = 0; c < SIZE; c++) {
    const keep: Cell[] = [];
    for (let r = SIZE - 1; r >= 0; r--) if (!gone.has(r * SIZE + c)) keep.push(board[r * SIZE + c]);
    for (let r = SIZE - 1, k = 0; r >= 0; r--, k++) out[r * SIZE + c] = keep[k] ?? deal.next();
  }
  return out;
}

export interface Resolve {
  board: Board;
  cleared: Cell[];
  cascades: number;
}

export function resolve(board: Board, deal: Deal): Resolve {
  let current = board;
  const cleared: Cell[] = [];
  let cascades = 0;
  for (let found = matches(current); found.size; found = matches(current)) {
    cascades++;
    for (const i of found) cleared.push(current[i]);
    current = collapse(current, found, deal);
    if (cascades > 30) break;
  }
  return { board: current, cleared, cascades };
}

export function hasMove(board: Board): boolean {
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (const j of [i + 1, i + SIZE]) {
      if (j >= SIZE * SIZE || !adjacent(i, j)) continue;
      if (matches(swapped(board, i, j)).size) return true;
    }
  }
  return false;
}

export function playable(deal: Deal, start?: Board): Board {
  let board = start ?? fresh(deal);
  for (let tries = 0; tries < 50; tries++) {
    if (matches(board).size) board = resolve(board, deal).board;
    if (hasMove(board) && !matches(board).size) return board;
    board = fresh(deal);
  }
  return board;
}

export interface Level {
  number: number;
  goal: number;
  moves: number;
}

export function level(n: number): Level {
  return { number: n, goal: 12 + n * 3, moves: Math.max(12, 22 - Math.floor(n / 2)) };
}

export function points(cleared: number, cascades: number): number {
  return cleared * 10 * Math.max(1, cascades);
}
