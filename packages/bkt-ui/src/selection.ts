export const SELECTION_KEY = "bucket.explore.selection";
export const MARK_CAP = 200;
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

export function readMarks(set: string, storage: MarkStorage | null = sessionMarks()): string[] {
  try {
    const raw = storage?.getItem(SELECTION_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as { set?: unknown; ids?: unknown } | null;
    if (!stored || stored.set !== set) return [];
    return cleanMarks(set, stored.ids);
  } catch {
    return [];
  }
}

export function writeMarks(set: string, ids: string[], storage: MarkStorage | null = sessionMarks()): string[] {
  const kept = cleanMarks(set, ids);
  try {
    if (kept.length === 0) storage?.removeItem(SELECTION_KEY);
    else storage?.setItem(SELECTION_KEY, JSON.stringify({ set, ids: kept }));
  } catch {
    return kept;
  }
  return kept;
}

export function toggleMark(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= MARK_CAP ? ids : [...ids, id];
}
