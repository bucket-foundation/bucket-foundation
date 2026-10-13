export const DIFF_BYTES = 2 * 1024 * 1024;
export const DIFF_EDIT_CAP = 2000;
export const CONTEXT_LINES = 3;

export interface DiffLine {
  op: " " | "+" | "-";
  text: string;
  eol: boolean;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface LineDiff {
  hunks: Hunk[];
  added: number;
  removed: number;
}

interface Line {
  text: string;
  eol: boolean;
}

export function splitLines(text: string): Line[] {
  if (text === "") return [];
  const parts = text.split("\n");
  const tail = parts.pop() as string;
  const out = parts.map((p) => ({ text: p, eol: true }));
  if (tail !== "") out.push({ text: tail, eol: false });
  return out;
}

type Op = { op: " " | "+" | "-"; a: number; b: number };

function myers(a: number[], b: number[], cap: number): Op[] | null {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, cap);
  const offset = max + 1;
  const trace: Int32Array[] = [];
  const v = new Int32Array(2 * max + 3);
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
  }
  if (found < 0) return null;
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const prev = trace[d];
    const k = x - y;
    const at = (diagonal: number) => prev[diagonal + d + 1];
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const pk = down ? k + 1 : k - 1;
    const px = at(pk);
    const py = px - pk;
    while (x > px && y > py) {
      x -= 1;
      y -= 1;
      ops.push({ op: " ", a: x, b: y });
    }
    if (down) {
      y -= 1;
      ops.push({ op: "+", a: x, b: y });
    } else {
      x -= 1;
      ops.push({ op: "-", a: x, b: y });
    }
  }
  while (x > 0 && y > 0) {
    x -= 1;
    y -= 1;
    ops.push({ op: " ", a: x, b: y });
  }
  return ops.reverse();
}

function edits(a: Line[], b: Line[]): Op[] {
  const ids = new Map<string, number>();
  const id = (l: Line) => {
    const key = `${l.eol ? "1" : "0"}${l.text}`;
    let got = ids.get(key);
    if (got === undefined) {
      got = ids.size;
      ids.set(key, got);
    }
    return got;
  };
  const x = a.map(id);
  const y = b.map(id);
  let head = 0;
  while (head < x.length && head < y.length && x[head] === y[head]) head += 1;
  let tail = 0;
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail += 1;
  const midA = x.slice(head, x.length - tail);
  const midB = y.slice(head, y.length - tail);
  const core =
    myers(midA, midB, DIFF_EDIT_CAP) ??
    [...midA.map((_, i): Op => ({ op: "-", a: i, b: 0 })), ...midB.map((_, i): Op => ({ op: "+", a: midA.length, b: i }))];
  const ops: Op[] = [];
  for (let i = 0; i < head; i++) ops.push({ op: " ", a: i, b: i });
  for (const o of core) ops.push({ op: o.op, a: o.a + head, b: o.b + head });
  for (let i = 0; i < tail; i++) ops.push({ op: " ", a: x.length - tail + i, b: y.length - tail + i });
  return ops;
}

export function diffLines(before: string, after: string, context = CONTEXT_LINES): LineDiff {
  const a = splitLines(before);
  const b = splitLines(after);
  const ops = edits(a, b);
  const hunks: Hunk[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  while (i < ops.length) {
    if (ops[i].op === " ") {
      i += 1;
      continue;
    }
    const start = Math.max(0, i - context);
    let end = i;
    let quiet = 0;
    let j = i;
    while (j < ops.length && quiet <= 2 * context) {
      if (ops[j].op === " ") quiet += 1;
      else {
        quiet = 0;
        end = j;
      }
      j += 1;
    }
    const stop = Math.min(ops.length, end + 1 + context);
    const slice = ops.slice(start, stop);
    const lines: DiffLine[] = slice.map((o) => (o.op === "+" ? { op: "+", ...b[o.b] } : { op: o.op, ...a[o.a] }));
    const oldLines = slice.filter((o) => o.op !== "+").length;
    const newLines = slice.filter((o) => o.op !== "-").length;
    const first = slice[0];
    hunks.push({ oldStart: oldLines === 0 ? first.a : first.a + 1, oldLines, newStart: newLines === 0 ? first.b : first.b + 1, newLines, lines });
    added += slice.filter((o) => o.op === "+").length;
    removed += slice.filter((o) => o.op === "-").length;
    i = stop;
  }
  return { hunks, added, removed };
}

export function unifiedPatch(path: string, diff: LineDiff): string {
  if (diff.hunks.length === 0) return "";
  const out = [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`];
  for (const h of diff.hunks) {
    out.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`);
    for (const l of h.lines) {
      out.push(`${l.op}${l.text}`);
      if (!l.eol) out.push("\\ No newline at end of file");
    }
  }
  return `${out.join("\n")}\n`;
}
