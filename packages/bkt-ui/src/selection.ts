export const SELECTION_KEY = "bucket.explore.selection";
export const MARK_CAP = 200;
export const MARK_SETS = 8;
export const MARK_CAP_LINE = "200 rows are marked, which is the most a set holds. Unmark one to mark another.";

const SET = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ROW = /^row:([a-z0-9-]{1,64}):[A-Za-z0-9._-]{1,160}$/;

export type MarkStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function sessionMarks(): MarkStorage | null {
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function cleanMarks(set: string, ids: unknown): string[] {
  if (!SET.test(set) || !Array.isArray(ids)) return [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.size >= MARK_CAP) break;
    if (typeof id === "string" && ROW.exec(id)?.[1] === set) seen.add(id);
  }
  return [...seen];
}

function readAll(storage: MarkStorage | null): [string, string[]][] {
  try {
    const raw = storage?.getItem(SELECTION_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as { sets?: unknown } | null;
    if (!stored || !Array.isArray(stored.sets)) return [];
    const out: [string, string[]][] = [];
    for (const entry of stored.sets) {
      if (out.length >= MARK_SETS) break;
      const [set, ids] = Array.isArray(entry) ? (entry as unknown[]) : [];
      if (typeof set !== "string" || out.some(([s]) => s === set)) continue;
      const kept = cleanMarks(set, ids);
      if (kept.length) out.push([set, kept]);
    }
    return out;
  } catch {
    return [];
  }
}

export function readMarks(set: string, storage: MarkStorage | null = sessionMarks()): string[] {
  return readAll(storage).find(([s]) => s === set)?.[1] ?? [];
}

export function writeMarks(set: string, ids: string[], storage: MarkStorage | null = sessionMarks()): string[] {
  const kept = cleanMarks(set, ids);
  const rest = readAll(storage).filter(([s]) => s !== set);
  const sets = (kept.length ? [[set, kept] as [string, string[]], ...rest] : rest).slice(0, MARK_SETS);
  try {
    if (sets.length === 0) storage?.removeItem(SELECTION_KEY);
    else storage?.setItem(SELECTION_KEY, JSON.stringify({ sets }));
  } catch {
    return kept;
  }
  return kept;
}

export function aliasRow(id: string, aliases: Readonly<Record<string, string>>): string {
  return Object.hasOwn(aliases, id) ? aliases[id] : id;
}

export function aliasMarks(aliases: Readonly<Record<string, string>>, storage: MarkStorage | null = sessionMarks()): void {
  for (const [set, ids] of readAll(storage)) {
    const moved = ids.map((id) => aliasRow(id, aliases));
    if (moved.some((id, i) => id !== ids[i])) writeMarks(set, [...new Set(moved)], storage);
  }
}

export function toggleMark(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= MARK_CAP ? ids : [...ids, id];
}
