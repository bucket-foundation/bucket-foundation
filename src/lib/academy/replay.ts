import type { Rating } from "./fsrs";
import { buildEncompassingMap, grade, normalizeState, type Atom, type Depth, type EncEdge, type EngineState } from "./engine";

export interface ReviewRow {
  review_id: string;
  card_id: string;
  rating: Rating;
  level: Depth;
  reviewed_at: number;
  atoms_version: string;
  device_id: string;
  tz: string;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function compareReviewRows(a: ReviewRow, b: ReviewRow): number {
  return a.reviewed_at - b.reviewed_at || cmp(a.device_id, b.device_id) || cmp(a.review_id, b.review_id);
}

export function orderLog(log: readonly ReviewRow[]): ReviewRow[] {
  const byId = new Map<string, ReviewRow>();
  log.forEach((r) => {
    const prev = byId.get(r.review_id);
    if (!prev || compareReviewRows(r, prev) < 0) byId.set(r.review_id, r);
  });
  return Array.from(byId.values()).sort(compareReviewRows);
}

export function replay(baseline: EngineState | null, log: readonly ReviewRow[], atomsByVersion: Readonly<Record<string, Atom[]>>): EngineState {
  const maps = new Map<string, { atoms: Atom[]; enc: Record<string, EncEdge[]> }>();
  const pack = (v: string) => {
    let m = maps.get(v);
    if (!m) {
      const atoms = atomsByVersion[v];
      if (!atoms) throw new Error(`replay: no atoms for version ${v}`);
      m = { atoms, enc: buildEncompassingMap(atoms) };
      maps.set(v, m);
    }
    return m;
  };
  return orderLog(log).reduce((state, r) => {
    if (!r.tz) throw new Error(`replay: review ${r.review_id} has no tz`);
    const { atoms, enc } = pack(r.atoms_version);
    return grade(state, atoms, enc, r.card_id, r.rating, r.level, r.reviewed_at, r.tz);
  }, normalizeState(baseline));
}
