export const GRIP_BRANCHES = ["01-mathematics", "02-physics", "03-chemistry", "04-information", "05-biophysics", "06-cosmology", "07-mind"] as const;
export const MISSING_PER_AXIS = 5;

export interface GripNode {
  id: string;
  slug: string;
  title: string;
  branch: string;
  atomKey: string;
  learnHref: string | null;
}

export interface GripEdge {
  fromId: string;
  toId: string;
}

export interface AssessVerdict {
  atomKey: string;
  correct: boolean;
  autoGraded: boolean;
  at: string;
  order: number;
}

export interface GripAxis {
  branch: string;
  total: number;
  demonstrated: number;
  coverage: number;
  maxDepth: number;
  groundedDepth: number | null;
  radius: number;
  missing: { id: string; slug: string; title: string; depth: number; learnHref: string | null }[];
}

export interface Grip {
  axes: GripAxis[];
  grip: number;
  demonstratedTotal: number;
  catalogTotal: number;
}

export function demonstratedKeys(verdicts: readonly AssessVerdict[]): Set<string> {
  const latest = new Map<string, AssessVerdict>();
  for (const v of verdicts) {
    if (!v.autoGraded) continue;
    const prev = latest.get(v.atomKey);
    if (!prev || v.at > prev.at || (v.at === prev.at && v.order > prev.order)) latest.set(v.atomKey, v);
  }
  return new Set(Array.from(latest.values()).filter((v) => v.correct).map((v) => v.atomKey));
}

export function branchDepths(nodes: readonly GripNode[], edges: readonly GripEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    if (!ids.has(e.fromId) || !ids.has(e.toId)) continue;
    parents.set(e.toId, [...(parents.get(e.toId) ?? []), e.fromId]);
  }
  const depth = new Map<string, number>();
  const onStack = new Set<string>();
  const visit = (start: string) => {
    const stack: { id: string; i: number }[] = [{ id: start, i: 0 }];
    onStack.add(start);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const ps = parents.get(top.id) ?? [];
      if (top.i < ps.length) {
        const p = ps[top.i++];
        if (depth.has(p) || onStack.has(p)) continue;
        onStack.add(p);
        stack.push({ id: p, i: 0 });
        continue;
      }
      stack.pop();
      onStack.delete(top.id);
      const known = ps.map((p) => depth.get(p)).filter((d): d is number => d !== undefined);
      depth.set(top.id, known.length ? 1 + Math.max(...known) : 0);
    }
  };
  for (const n of nodes) if (!depth.has(n.id)) visit(n.id);
  return depth;
}

function ancestorsWithin(id: string, parents: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    for (const p of parents.get(stack.pop()!) ?? []) {
      if (!seen.has(p)) {
        seen.add(p);
        stack.push(p);
      }
    }
  }
  return seen;
}

export function gripFor(nodes: readonly GripNode[], edges: readonly GripEdge[], demonstrated: ReadonlySet<string>, branches: readonly string[] = GRIP_BRANCHES): Grip {
  const axes: GripAxis[] = [];
  for (const branch of branches) {
    const inBranch = nodes.filter((n) => n.branch === branch);
    const ids = new Set(inBranch.map((n) => n.id));
    const local = edges.filter((e) => ids.has(e.fromId) && ids.has(e.toId));
    const parents = new Map<string, string[]>();
    for (const e of local) parents.set(e.toId, [...(parents.get(e.toId) ?? []), e.fromId]);
    const depth = branchDepths(inBranch, local);
    const shown = new Set(inBranch.filter((n) => demonstrated.has(n.atomKey)).map((n) => n.id));
    const maxDepth = inBranch.length ? Math.max(...inBranch.map((n) => depth.get(n.id) ?? 0)) : 0;
    let grounded: number | null = null;
    for (const id of Array.from(shown)) {
      if (!Array.from(ancestorsWithin(id, parents)).every((a) => shown.has(a))) continue;
      const d = depth.get(id) ?? 0;
      grounded = grounded === null ? d : Math.max(grounded, d);
    }
    const missing = inBranch
      .filter((n) => !shown.has(n.id) && (parents.get(n.id) ?? []).every((p) => shown.has(p)))
      .map((n) => ({ id: n.id, slug: n.slug, title: n.title, depth: depth.get(n.id) ?? 0, learnHref: n.learnHref }))
      .sort((a, b) => a.depth - b.depth || a.slug.localeCompare(b.slug))
      .slice(0, MISSING_PER_AXIS);
    axes.push({
      branch,
      total: inBranch.length,
      demonstrated: shown.size,
      coverage: inBranch.length ? shown.size / inBranch.length : 0,
      maxDepth,
      groundedDepth: grounded,
      radius: grounded === null ? 0 : (1 + grounded) / (1 + maxDepth),
      missing,
    });
  }
  const grip = axes.length ? axes.reduce((s, a) => s + a.radius ** 3, 0) / axes.length : 0;
  return { axes, grip, demonstratedTotal: axes.reduce((s, a) => s + a.demonstrated, 0), catalogTotal: axes.reduce((s, a) => s + a.total, 0) };
}
