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
