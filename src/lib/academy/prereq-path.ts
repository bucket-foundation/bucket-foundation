export type PrereqGraph = ReadonlyMap<string, readonly string[]>;

export type PathError =
  | { kind: "MissingNode"; id: string; requiredBy: string | null }
  | { kind: "Cycle"; nodes: string[] }
  | { kind: "MasteryConflict"; conflicts: { id: string; missing: string[] }[] };

export type PathResult =
  | { ok: true; target: string; closure: string[]; mastered: string[]; steps: string[] }
  | { ok: false; error: PathError };

export function graphFromAtoms(atoms: readonly { id: string; requires?: readonly string[] | null }[]): Map<string, string[]> {
  const g = new Map<string, string[]>();
  for (const a of atoms) g.set(a.id, Array.from(new Set(a.requires ?? [])));
  return g;
}

export function closureOf(graph: PrereqGraph, target: string): { nodes: string[] } | { error: PathError } {
  if (!graph.has(target)) return { error: { kind: "MissingNode", id: target, requiredBy: null } };
  const seen = new Set<string>([target]);
  const stack = [target];
  while (stack.length) {
    const v = stack.pop()!;
    for (const p of graph.get(v) ?? []) {
      if (!graph.has(p)) return { error: { kind: "MissingNode", id: p, requiredBy: v } };
      if (!seen.has(p)) {
        seen.add(p);
        stack.push(p);
      }
    }
  }
  return { nodes: Array.from(seen).sort() };
}

function topoOrder(graph: PrereqGraph, nodes: readonly string[], rank: (id: string) => number): { order: string[] } | { error: PathError } {
  const inSet = new Set(nodes);
  const indeg = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const v of nodes) {
    const ps = (graph.get(v) ?? []).filter((p) => inSet.has(p));
    indeg.set(v, ps.length);
    for (const p of ps) (children.get(p) ?? children.set(p, []).get(p)!).push(v);
  }
  const cmp = (a: string, b: string) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);
  const ready = nodes.filter((v) => indeg.get(v) === 0).sort(cmp);
  const order: string[] = [];
  while (ready.length) {
    const v = ready.shift()!;
    order.push(v);
    for (const c of children.get(v) ?? []) {
      const d = indeg.get(c)! - 1;
      indeg.set(c, d);
      if (d === 0) {
        ready.push(c);
        ready.sort(cmp);
      }
    }
  }
  if (order.length < nodes.length) {
    return { error: { kind: "Cycle", nodes: nodes.filter((v) => indeg.get(v)! > 0).sort() } };
  }
  return { order };
}

export function masteryConflicts(graph: PrereqGraph, closure: readonly string[], mastered: ReadonlySet<string>): { id: string; missing: string[] }[] {
  const out: { id: string; missing: string[] }[] = [];
  for (const v of closure) {
    if (!mastered.has(v)) continue;
    const missing = (graph.get(v) ?? []).filter((p) => !mastered.has(p));
    if (missing.length) out.push({ id: v, missing: Array.from(missing).sort() });
  }
  return out;
}

export function planPath(
  graph: PrereqGraph,
  target: string,
  mastered: ReadonlySet<string>,
  rank: (id: string) => number = () => 0,
): PathResult {
  const c = closureOf(graph, target);
  if ("error" in c) return { ok: false, error: c.error };
  const t = topoOrder(graph, c.nodes, rank);
  if ("error" in t) return { ok: false, error: t.error };
  const conflicts = masteryConflicts(graph, c.nodes, mastered);
  if (conflicts.length) return { ok: false, error: { kind: "MasteryConflict", conflicts } };
  return {
    ok: true,
    target,
    closure: t.order,
    mastered: t.order.filter((v) => mastered.has(v)),
    steps: t.order.filter((v) => !mastered.has(v)),
  };
}

export function repairMastery(graph: PrereqGraph, target: string, mastered: ReadonlySet<string>): { mastered: Set<string>; demoted: string[] } {
  const next = new Set(mastered);
  const c = closureOf(graph, target);
  if ("error" in c) return { mastered: next, demoted: [] };
  const demoted: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const { id } of masteryConflicts(graph, c.nodes, next)) {
      next.delete(id);
      demoted.push(id);
      changed = true;
    }
  }
  return { mastered: next, demoted: demoted.sort() };
}
