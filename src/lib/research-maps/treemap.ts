export type Rect = { x: number; y: number; w: number; h: number };

function worst(row: number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

export function squarify<T>(items: T[], value: (item: T) => number, bounds: Rect): { item: T; rect: Rect }[] {
  const live = items.filter((i) => value(i) > 0).sort((a, b) => value(b) - value(a));
  const total = live.reduce((a, i) => a + value(i), 0);
  if (total === 0 || bounds.w <= 0 || bounds.h <= 0) return [];
  const scale = (bounds.w * bounds.h) / total;
  const out: { item: T; rect: Rect }[] = [];
  let { x, y, w, h } = bounds;
  let start = 0;
  while (start < live.length) {
    const side = Math.min(w, h);
    let end = start + 1;
    let row = [value(live[start]) * scale];
    while (end < live.length) {
      const next = [...row, value(live[end]) * scale];
      if (worst(next, side) > worst(row, side)) break;
      row = next;
      end += 1;
    }
    const sum = row.reduce((a, b) => a + b, 0);
    const thick = sum / side;
    let offset = 0;
    row.forEach((area, i) => {
      const len = area / thick;
      out.push({ item: live[start + i], rect: w >= h ? { x, y: y + offset, w: thick, h: len } : { x: x + offset, y, w: len, h: thick } });
      offset += len;
    });
    if (w >= h) {
      x += thick;
      w -= thick;
    } else {
      y += thick;
      h -= thick;
    }
    start = end;
  }
  return out;
}
