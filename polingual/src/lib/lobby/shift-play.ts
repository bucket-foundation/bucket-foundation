export function centerWord(columns: readonly string[][], offsets: readonly number[]): string {
  return columns.map((col, i) => col[((offsets[i] % col.length) + col.length) % col.length]).join("");
}

export function rotate(offsets: readonly number[], column: number, by: number): number[] {
  return offsets.map((o, i) => (i === column ? o + by : o));
}

export function hintFor(target: string, revealed: number): string {
  const letters = Array.from(target);
  return letters.map((ch, i) => (i < revealed ? ch : "_")).join(" ");
}

export function letterAt(col: readonly string[], offset: number): string {
  return col[((offset % col.length) + col.length) % col.length];
}

export function revealOne(targets: readonly { form: string }[], hints: Record<string, number>): Record<string, number> {
  const t = targets.find((x) => (hints[x.form] ?? 0) < Array.from(x.form).length);
  if (!t) return hints;
  const n = Array.from(t.form).length;
  return { ...hints, [t.form]: Math.min(n, (hints[t.form] ?? 0) + 1) };
}
